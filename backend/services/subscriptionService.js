const pool = require('../db');

/**
 * Subscription Service
 * Manages trial, paid subscriptions, and access control
 */
class SubscriptionService {

    /**
     * Create a free trial subscription for a new user
     */
    async createTrialSubscription(userId) {
        const trialDays = parseInt(process.env.SUBSCRIPTION_TRIAL_DAYS || '7');

        const result = await pool.query(`
            INSERT INTO subscriptions (user_id, plan_type, status, trial_started_at, trial_ends_at)
            VALUES ($1, 'free_trial', 'active', NOW(), NOW() + INTERVAL '${trialDays} days')
            RETURNING subscription_id, trial_ends_at
        `, [userId]);

        // Log event
        await this.logEvent(result.rows[0].subscription_id, 'trial_started', { trialDays });

        // Update user subscription status
        await pool.query(`UPDATE users SET subscription_status = 'free_trial' WHERE user_id = $1`, [userId]);

        return result.rows[0];
    }

    /**
     * Check if user has active subscription (trial or paid)
     */
    async hasAccess(userId) {
        const result = await pool.query(`
            SELECT user_id, plan_type, status, trial_ends_at, paid_ends_at
            FROM subscriptions
            WHERE user_id = $1 AND status = 'active'
        `, [userId]);

        if (result.rows.length === 0) return { hasAccess: false, reason: 'no_subscription' };

        const sub = result.rows[0];

        // Check if trial expired
        if (sub.plan_type === 'free_trial' && sub.trial_ends_at) {
            const expired = new Date(sub.trial_ends_at) < new Date();
            if (expired) {
                await this.markExpired(sub.user_id);
                return { hasAccess: false, reason: 'trial_expired' };
            }
            return {
                hasAccess: true,
                planType: sub.plan_type,
                trialEndsAt: sub.trial_ends_at,
                daysRemaining: Math.ceil((new Date(sub.trial_ends_at) - new Date()) / (1000 * 60 * 60 * 24))
            };
        }

        // Check if paid subscription expired
        if (sub.paid_ends_at) {
            const expired = new Date(sub.paid_ends_at) < new Date();
            if (expired) {
                await this.markExpired(sub.user_id);
                return { hasAccess: false, reason: 'subscription_expired' };
            }
        }

        return { hasAccess: true, planType: sub.plan_type };
    }

    /**
     * Mark subscription as expired
     */
    async markExpired(userId) {
        await pool.query(`
            UPDATE subscriptions SET status = 'expired' WHERE user_id = $1 AND status = 'active'
        `, [userId]);
        await pool.query(`UPDATE users SET subscription_status = 'expired' WHERE user_id = $1`, [userId]);
    }

    /**
     * Upgrade to paid plan
     */
    async upgradeSubscription(userId, planType, paymentMethod, externalTransactionId) {
        const now = new Date();
        let paidEndsAt;

        switch (planType) {
            case 'monthly': paidEndsAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); break;
            case 'quarterly': paidEndsAt = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000); break;
            case 'annual': paidEndsAt = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000); break;
            default: throw new Error('Invalid plan type');
        }

        const limits = this.getPlanLimits(planType);

        const result = await pool.query(`
            UPDATE subscriptions
            SET plan_type = $1,
                status = 'active',
                paid_starts_at = NOW(),
                paid_ends_at = $2,
                payment_method = $3,
                external_transaction_id = $4,
                max_lobster_chats_per_day = $5,
                max_introductions_per_month = $6
            WHERE user_id = $7
            RETURNING subscription_id
        `, [planType, paidEndsAt, paymentMethod, externalTransactionId, limits.maxChats, limits.maxIntros, userId]);

        if (result.rows.length === 0) {
            throw new Error('No subscription found for user');
        }

        await this.logEvent(result.rows[0].subscription_id, 'subscription_upgraded', { planType, paidEndsAt });
        await pool.query(`UPDATE users SET subscription_status = 'active' WHERE user_id = $1`, [userId]);

        return { subscriptionId: result.rows[0].subscription_id, paidEndsAt };
    }

    /**
     * Cancel subscription
     */
    async cancelSubscription(userId) {
        await pool.query(`
            UPDATE subscriptions SET status = 'cancelled' WHERE user_id = $1 AND status = 'active'
        `, [userId]);

        const sub = await pool.query(`SELECT subscription_id FROM subscriptions WHERE user_id = $1`, [userId]);
        if (sub.rows.length > 0) {
            await this.logEvent(sub.rows[0].subscription_id, 'subscription_cancelled');
        }

        await pool.query(`UPDATE users SET subscription_status = 'cancelled' WHERE user_id = $1`, [userId]);
    }

    /**
     * Check usage limits
     */
    async checkUsage(userId, resourceType) {
        const sub = await pool.query(`
            SELECT max_lobster_chats_per_day, max_introductions_per_month FROM subscriptions
            WHERE user_id = $1 AND status = 'active'
        `, [userId]);

        if (sub.rows.length === 0) return { allowed: false, reason: 'no_subscription' };

        const limits = sub.rows[0];

        if (resourceType === 'lobster_chat') {
            const count = await pool.query(`
                SELECT COUNT(*) FROM lobster_chats lc
                JOIN lobsters l ON lc.lobster_a_id = l.lobster_id OR lc.lobster_b_id = l.lobster_id
                WHERE l.owner_id = $1 AND lc.created_at > NOW() - INTERVAL '1 day'
            `, [userId]);

            const used = parseInt(count.rows[0].count);
            return { allowed: used < limits.max_lobster_chats_per_day, used, limit: limits.max_lobster_chats_per_day };
        }

        if (resourceType === 'introduction') {
            const count = await pool.query(`
                SELECT COUNT(*) FROM introductions i
                JOIN consents c ON i.consent_id = c.consent_id
                WHERE (c.owner_a_id = $1 OR c.owner_b_id = $1)
                AND i.created_at > NOW() - INTERVAL '1 month'
            `, [userId]);

            const used = parseInt(count.rows[0].count);
            return { allowed: used < limits.max_introductions_per_month, used, limit: limits.max_introductions_per_month };
        }

        return { allowed: true };
    }

    /**
     * Get subscription status for user
     */
    async getSubscription(userId) {
        const result = await pool.query(`
            SELECT * FROM subscriptions WHERE user_id = $1
        `, [userId]);

        if (result.rows.length === 0) return null;

        const sub = result.rows[0];
        const access = await this.hasAccess(userId);

        return { ...sub, ...access };
    }

    /**
     * Log subscription event
     */
    async logEvent(subscriptionId, eventType, data = {}) {
        await pool.query(`
            INSERT INTO subscription_events (subscription_id, event_type, event_data)
            VALUES ($1, $2, $3)
        `, [subscriptionId, eventType, JSON.stringify(data)]);
    }

    /**
     * Get plan limits
     */
    getPlanLimits(planType) {
        switch (planType) {
            case 'free_trial': return { maxChats: 10, maxIntros: 3 };
            case 'monthly': return { maxChats: 30, maxIntros: 5 };
            case 'quarterly': return { maxChats: 50, maxIntros: 10 };
            case 'annual': return { maxChats: 999, maxIntros: 20 };
            default: return { maxChats: 10, maxIntros: 3 };
        }
    }

    /**
     * Process payment webhook
     */
    async processWebhook(provider, payload) {
        const { external_transaction_id, user_id, status } = payload;

        if (status === 'success') {
            const sub = await pool.query(`
                SELECT subscription_id FROM subscriptions
                WHERE user_id = $1 AND external_transaction_id = $2
            `, [user_id, external_transaction_id]);

            if (sub.rows.length > 0) {
                await this.logEvent(sub.rows[0].subscription_id, 'payment_received', { provider, payload });
            }
        } else if (status === 'failed') {
            const sub = await pool.query(`
                SELECT subscription_id FROM subscriptions WHERE user_id = $1
            `, [user_id]);

            if (sub.rows.length > 0) {
                await this.logEvent(sub.rows[0].subscription_id, 'payment_failed', { provider, payload });
            }
        }
    }
}

module.exports = new SubscriptionService();
