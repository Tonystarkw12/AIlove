const cron = require('node-cron');
const lobsterOrchestrator = require('./lobsterOrchestrator');
const subscriptionService = require('./subscriptionService');
const pool = require('../db');

/**
 * Lobster Scheduler
 * Cron-driven job manager for lobster agent lifecycle
 */
class LobsterScheduler {

    start() {
        console.log('[LobsterScheduler] Starting scheduler jobs...');

        // Main matching loop - every 10 minutes
        cron.schedule('*/10 * * * *', async () => {
            try {
                await lobsterOrchestrator.runMatchingCycle();
            } catch (err) {
                console.error('[Scheduler] Matching cycle failed:', err);
            }
        });

        // Chat archival - every 5 minutes (archive stale chats with no WebSocket activity)
        // No more LLM evaluation — agents handle chat lifecycle via WebSocket
        cron.schedule('*/5 * * * *', async () => {
            try {
                // Archive chats that have been active for >1 hour with no new messages
                // (agents should end chats themselves, but this catches stale ones)
                const staleChats = await pool.query(`
                    SELECT chat_id FROM lobster_chats
                    WHERE session_status = 'active'
                    AND updated_at < NOW() - INTERVAL '1 hour'
                    LIMIT 10
                `);

                for (const chat of staleChats.rows) {
                    await pool.query(`
                        UPDATE lobster_chats
                        SET session_status = 'completed', updated_at = NOW()
                        WHERE chat_id = $1
                    `, [chat.chat_id]);
                    console.log(`[Scheduler] Archived stale chat ${chat.chat_id}`);
                }
            } catch (err) {
                console.error('[Scheduler] Chat archival failed:', err);
            }
        });

        // Subscription expiration checks - every hour
        cron.schedule('0 * * * *', async () => {
            try {
                await subscriptionService.checkExpirations?.();
            } catch (err) {
                console.error('[Scheduler] Subscription check failed:', err);
            }
        });

        // Notify users whose trial is expiring soon (within 2 days) - daily at 9 AM
        cron.schedule('0 9 * * *', async () => {
            try {
                const expiringTrials = await pool.query(`
                    SELECT s.user_id, s.trial_ends_at, u.nickname, u.email
                    FROM subscriptions s
                    JOIN users u ON s.user_id = u.user_id
                    WHERE s.plan_type = 'free_trial'
                    AND s.status = 'active'
                    AND s.trial_ends_at BETWEEN NOW() AND NOW() + INTERVAL '2 days'
                `);

                for (const user of expiringTrials.rows) {
                    console.log(`[Scheduler] Trial expiring for ${user.nickname} at ${user.trial_ends_at}`);
                    // TODO: Send email/WeChat notification
                }
            } catch (err) {
                console.error('[Scheduler] Trial notification failed:', err);
            }
        });

        // Daily cleanup - at 3 AM
        cron.schedule('0 3 * * *', async () => {
            try {
                // Archive stale chats (no activity for 30 days)
                await pool.query(`
                    UPDATE lobster_chats SET session_status = 'abandoned'
                    WHERE session_status = 'active'
                    AND updated_at < NOW() - INTERVAL '30 days'
                `);

                // Clean up expired recommendations
                await pool.query(`
                    DELETE FROM recommendations
                    WHERE last_calculated < NOW() - INTERVAL '7 days'
                `);

                console.log('[Scheduler] Daily cleanup completed');
            } catch (err) {
                console.error('[Scheduler] Daily cleanup failed:', err);
            }
        });

        console.log('[LobsterScheduler] All scheduler jobs registered');
    }
}

module.exports = new LobsterScheduler();
