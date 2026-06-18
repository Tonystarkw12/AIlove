const pool = require('../db');
const { calculateMatchScore, generateIcebreakers } = require('./matchingAlgorithm');
const conversationService = require('./lobsterConversationService');
const crypto = require('./crypto');

/**
 * Lobster Agent Orchestrator
 * Central agent coordination for lobster-to-lobster matching
 */
class LobsterOrchestrator {

    /**
     * Get all active lobsters that need matching
     */
    async getActiveLobsters(limit = 50) {
        const result = await pool.query(`
            SELECT l.*, u.nickname as owner_nickname
            FROM lobsters l
            JOIN users u ON l.owner_id = u.user_id
            WHERE l.status = 'active'
            AND (l.last_active_at < NOW() - INTERVAL '10 minutes' OR l.last_active_at IS NULL)
            ORDER BY l.last_active_at ASC NULLS FIRST
            LIMIT $1
        `, [limit]);
        return result.rows;
    }

    /**
     * Discover candidates for a lobster using existing matching algorithm
     */
    async discoverCandidates(lobsterId, limit = 20) {
        const lobster = await pool.query(`
            SELECT l.owner_id FROM lobsters l WHERE l.lobster_id = $1
        `, [lobsterId]);

        if (lobster.rows.length === 0) return [];

        const ownerId = lobster.rows[0].owner_id;

        // Get users who are NOT the owner and have active lobsters
        const candidates = await pool.query(`
            SELECT u.user_id, l.lobster_id
            FROM users u
            JOIN lobsters l ON u.user_id = l.owner_id
            WHERE u.user_id != $1
            AND l.status = 'active'
            AND NOT EXISTS (
                SELECT 1 FROM lobster_chats lc
                WHERE (lc.lobster_a_id = $2 AND lc.lobster_b_id = l.lobster_id)
                   OR (lc.lobster_a_id = l.lobster_id AND lc.lobster_b_id = $2)
                AND lc.session_status = 'active'
            )
            LIMIT $3
        `, [ownerId, lobsterId, limit]);

        // Score candidates using existing algorithm
        const scored = [];
        for (const c of candidates.rows) {
            const score = await calculateMatchScore(ownerId, c.user_id);
            scored.push({ ...c, matchScore: score });
        }

        return scored.sort((a, b) => b.matchScore - a.matchScore);
    }

    /**
     * Initiate a lobster-to-lobster chat
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
     * Run a single matching cycle: discover -> initiate -> evaluate
     */
    async runMatchingCycle() {
        console.log('[LobsterOrchestrator] Starting matching cycle...');
        const lobsters = await this.getActiveLobsters();

        for (const lobster of lobsters) {
            try {
                const candidates = await this.discoverCandidates(lobster.lobster_id);
                const topCandidate = candidates[0];

                if (topCandidate && topCandidate.matchScore > 50) {
                    const chatId = await this.initiateChat(lobster.lobster_id, topCandidate.lobster_id);
                    console.log(`[LobsterOrchestrator] Initiated chat ${chatId} between ${lobster.lobster_id} and ${topCandidate.lobster_id}`);
                }

                // Update last active
                await pool.query(`
                    UPDATE lobsters SET last_active_at = NOW()
                    WHERE lobster_id = $1
                `, [lobster.lobster_id]);
            } catch (err) {
                console.error(`[LobsterOrchestrator] Error processing lobster ${lobster.lobster_id}:`, err.message);
            }
        }
    }

    /**
     * Evaluate a completed chat and update compatibility score
     */
    async evaluateChat(chatId) {
        const chat = await pool.query(`
            SELECT * FROM lobster_chats WHERE chat_id = $1
        `, [chatId]);

        if (chat.rows.length === 0) return null;

        const c = chat.rows[0];

        // Get lobster details for analysis
        const lobsterA = await pool.query(`SELECT * FROM lobsters WHERE lobster_id = $1`, [c.lobster_a_id]);
        const lobsterB = await pool.query(`SELECT * FROM lobsters WHERE lobster_id = $1`, [c.lobster_b_id]);

        if (lobsterA.rows.length === 0 || lobsterB.rows.length === 0) return null;

        // Get preferences for icebreaker generation (ISC-30)
        const [prefsA, prefsB] = await Promise.all([
            pool.query(`SELECT * FROM lobster_preferences WHERE lobster_id = $1`, [c.lobster_a_id]),
            pool.query(`SELECT * FROM lobster_preferences WHERE lobster_id = $1`, [c.lobster_b_id])
        ]);

        // Generate LLM-based compatibility analysis from conversation messages
        const messages = c.messages || [];
        let analysis = null;
        let score = c.compatibility_score;
        let icebreakers = null;

        if (messages.length >= 2) {
            try {
                const evalResult = await conversationService.evaluateConversation(
                    messages,
                    { name: lobsterA.rows[0].name, conversation_style: lobsterA.rows[0].conversation_style },
                    { name: lobsterB.rows[0].name, conversation_style: lobsterB.rows[0].conversation_style }
                );
                score = evalResult.score;
                analysis = evalResult.analysis;

                // Generate icebreakers from preference overlap
                icebreakers = await conversationService.generateIcebreakers(
                    prefsA.rows[0] || null,
                    prefsB.rows[0] || null,
                    lobsterA.rows[0].name,
                    lobsterB.rows[0].name
                );
            } catch (err) {
                console.error('[LobsterOrchestrator] LLM evaluation failed:', err.message);
            }
        }

        // Fallback: use existing algorithm if no LLM analysis
        if (score === null || score === undefined) {
            const ownerA = await pool.query(`SELECT owner_id FROM lobsters WHERE lobster_id = $1`, [c.lobster_a_id]);
            const ownerB = await pool.query(`SELECT owner_id FROM lobsters WHERE lobster_id = $1`, [c.lobster_b_id]);
            score = await calculateMatchScore(ownerA.rows[0].owner_id, ownerB.rows[0].owner_id);
        }

        await pool.query(`
            UPDATE lobster_chats
            SET compatibility_score = $1,
                compatibility_analysis = $2,
                icebreaker_messages = $3,
                session_status = 'completed',
                outcome = CASE WHEN $1 >= 70 THEN 'recommended' ELSE 'rejected' END
            WHERE chat_id = $4
        `, [score, analysis, icebreakers ? JSON.stringify(icebreakers) : null, chatId]);

        // If score is high enough, recommend to owner (ISC-29: threshold >70)
        if (score >= 70) {
            await this.recommendToOwner(chatId);
        }

        return { chatId, score, analysis, icebreakers, outcome: score >= 70 ? 'recommended' : 'rejected' };
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
