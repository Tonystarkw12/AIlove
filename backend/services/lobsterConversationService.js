const pool = require('../db');

/**
 * Lobster Message Store
 * Thin helper for message storage and retrieval.
 * LLM calls removed — agents (OpenClaw) generate all messages themselves.
 */
class LobsterMessageStore {

    /**
     * Append a message to a chat's message array in DB
     */
    async appendMessage(chatId, sender, content) {
        const messageObj = {
            sender,
            content,
            timestamp: new Date().toISOString()
        };

        const result = await pool.query(`
            UPDATE lobster_chats
            SET messages = messages || $1::jsonb, updated_at = NOW()
            WHERE chat_id = $2
            RETURNING messages
        `, [JSON.stringify(messageObj), chatId]);

        return result.rows[0]?.messages || [];
    }

    /**
     * Get all messages for a chat
     */
    async getMessages(chatId) {
        const result = await pool.query(`
            SELECT messages FROM lobster_chats WHERE chat_id = $1
        `, [chatId]);

        return result.rows[0]?.messages || [];
    }

    /**
     * Mark a chat as completed (no LLM evaluation — agents decide when to end)
     */
    async markCompleted(chatId) {
        await pool.query(`
            UPDATE lobster_chats
            SET session_status = 'completed', updated_at = NOW()
            WHERE chat_id = $1
        `, [chatId]);
    }
}

module.exports = new LobsterMessageStore();
