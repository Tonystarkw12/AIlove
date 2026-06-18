const pool = require('../db');
const crypto = require('./crypto');

/**
 * Lobster Agent Orchestrator
 * Central agent coordination for lobster-to-lobster matching
 */
class LobsterOrchestrator {

    /**
     * Initiate a lobster-to-lobster chat (DB record only, no scoring).
     * Used by decentralized matching — agents decide via lobby, platform just creates the room.
     */
    async initiateChat(lobsterAId, lobsterBId) {
        const existing = await pool.query(`
            SELECT chat_id FROM lobster_chats
            WHERE ((lobster_a_id = $1 AND lobster_b_id = $2)
                OR (lobster_a_id = $2 AND lobster_b_id = $1))
            AND session_status = 'active'
        `, [lobsterAId, lobsterBId]);

        if (existing.rows.length > 0) return existing.rows[0].chat_id;

        const result = await pool.query(`
            INSERT INTO lobster_chats (lobster_a_id, lobster_b_id)
            VALUES ($1, $2)
            RETURNING chat_id
        `, [lobsterAId, lobsterBId]);

        return result.rows[0].chat_id;
    }

    /**
     * Push recommendation to owner (via WebSocket)
     */
    async recommendToOwner(chatId) {
        const chat = await pool.query(`
            SELECT lc.*, l.owner_id as owner_a_id, l2.owner_id as owner_b_id
            FROM lobster_chats lc
            JOIN lobsters l ON lc.lobster_a_id = l.lobster_id
            JOIN lobsters l2 ON lc.lobster_b_id = l2.lobster_id
            WHERE lc.chat_id = $1
        `, [chatId]);

        if (chat.rows.length === 0) return;

        const c = chat.rows[0];

        // Update recommended_at
        await pool.query(`
            UPDATE lobster_chats SET recommended_at = NOW() WHERE chat_id = $1
        `, [chatId]);

        // Push via WebSocket if available
        try {
            const { sendMessageToUser } = require('./websocketService');
            sendMessageToUser(c.owner_a_id, {
                type: 'lobster:recommendation',
                payload: {
                    chatId,
                    summary: c.compatibility_analysis || 'Your lobster found a potential match!',
                    score: c.compatibility_score,
                    recommendedLobster: c.lobster_b_id
                }
            });
            sendMessageToUser(c.owner_b_id, {
                type: 'lobster:recommendation',
                payload: {
                    chatId,
                    summary: c.compatibility_analysis || 'Your lobster found a potential match!',
                    score: c.compatibility_score,
                    recommendedLobster: c.lobster_a_id
                }
            });
        } catch (err) {
            console.log('[LobsterOrchestrator] WebSocket not available, recommendation queued');
        }
    }

    /**
     * Process owner response to a recommendation
     */
    async processOwnerResponse(chatId, ownerId, response) {
        const chat = await pool.query(`
            SELECT * FROM lobster_chats WHERE chat_id = $1
        `, [chatId]);

        if (chat.rows.length === 0) return { error: 'Chat not found' };

        const c = chat.rows[0];
        const isOwnerA = (await pool.query(`SELECT owner_id FROM lobsters WHERE lobster_id = $1`, [c.lobster_a_id])).rows[0]?.owner_id === ownerId;

        if (isOwnerA) {
            await pool.query(`UPDATE lobster_chats SET owner_a_response = $1 WHERE chat_id = $2`, [response, chatId]);
        } else {
            await pool.query(`UPDATE lobster_chats SET owner_b_response = $1 WHERE chat_id = $2`, [response, chatId]);
        }

        // If both approved, create consent record
        if (response === 'approved') {
            const updated = await pool.query(`SELECT * FROM lobster_chats WHERE chat_id = $1`, [chatId]);
            if (updated.rows[0].owner_a_response === 'approved' && updated.rows[0].owner_b_response === 'approved') {
                return await this.createConsent(chatId, c.lobster_a_id, c.lobster_b_id);
            }
        }

        return { response };
    }

    /**
     * Create consent record after both owners approve
     */
    async createConsent(chatId, lobsterAId, lobsterBId) {
        const chat = await pool.query(`SELECT * FROM lobster_chats WHERE chat_id = $1`, [chatId]);
        if (chat.rows.length === 0) return { error: 'Chat not found' };

        const c = chat.rows[0];
        const ownerA = await pool.query(`SELECT owner_id FROM lobsters WHERE lobster_id = $1`, [c.lobster_a_id]);
        const ownerB = await pool.query(`SELECT owner_id FROM lobsters WHERE lobster_id = $1`, [c.lobster_b_id]);

        const consent = await pool.query(`
            INSERT INTO consents (chat_id, owner_a_id, owner_b_id)
            VALUES ($1, $2, $3)
            RETURNING consent_id
        `, [chatId, ownerA.rows[0].owner_id, ownerB.rows[0].owner_id]);

        await pool.query(`UPDATE lobster_chats SET outcome = 'recommended' WHERE chat_id = $1`, [chatId]);

        return { consentId: consent.rows[0].consent_id, status: 'pending_exchange' };
    }

    /**
     * Facilitate WeChat ID exchange after double consent
     */
    async facilitateIntroduction(consentId) {
        const consent = await pool.query(`SELECT * FROM consents WHERE consent_id = $1`, [consentId]);
        if (consent.rows.length === 0) return { error: 'Consent not found' };

        const c = consent.rows[0];
        if (!c.owner_a_wechat_consent || !c.owner_b_wechat_consent) {
            return { error: 'Both owners must consent before exchange' };
        }

        // Get WeChat IDs
        const users = await pool.query(`
            SELECT user_id, wechat_id FROM users WHERE user_id IN ($1, $2)
        `, [c.owner_a_id, c.owner_b_id]);

        const userAMatch = users.rows.find(u => u.user_id === c.owner_a_id);
        const userBMatch = users.rows.find(u => u.user_id === c.owner_b_id);

        if (!userAMatch?.wechat_id || !userBMatch?.wechat_id) {
            return { error: 'One or both users have not set their WeChat ID' };
        }

        const chat = await pool.query(`SELECT * FROM lobster_chats WHERE chat_id = $1`, [c.chat_id]);
        const c_chat = chat.rows[0];

        // Encrypt WeChat IDs at rest (ISC-26, ISC-33)
        const encryptedWechatA = crypto.encrypt(userAMatch.wechat_id);
        const encryptedWechatB = crypto.encrypt(userBMatch.wechat_id);

        // Create introduction record with encrypted WeChat IDs
        const intro = await pool.query(`
            INSERT INTO introductions (consent_id, lobster_a_id, lobster_b_id, owner_a_wechat_id, owner_b_wechat_id)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING introduction_id
        `, [consentId, c_chat.lobster_a_id, c_chat.lobster_b_id, encryptedWechatA, encryptedWechatB]);

        // Update consent
        await pool.query(`
            UPDATE consents SET wechat_exchanged = TRUE, wechat_exchange_at = NOW() WHERE consent_id = $1
        `, [consentId]);

        // Update lobster stats
        await pool.query(`
            UPDATE lobsters SET total_introductions_facilitated = total_introductions_facilitated + 1
            WHERE lobster_id IN ($1, $2)
        `, [c_chat.lobster_a_id, c_chat.lobster_b_id]);

        return { introductionId: intro.rows[0].introduction_id, status: 'exchanged' };
    }
}

module.exports = new LobsterOrchestrator();
