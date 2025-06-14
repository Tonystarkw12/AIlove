const express = require('express');
const { pool } = require('../server');
const authenticateToken = require('../middleware/authenticateToken');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// GET /api/chat/{chatPartnerId}/messages - Get chat history
router.get('/:chatPartnerId/messages', authenticateToken, async (req, res) => {
    const userId = req.user.userId; // Authenticated user's ID
    const chatPartnerId = req.params.chatPartnerId;
    const limit = parseInt(req.query.limit) || 50;
    const beforeTimestamp = req.query.beforeTimestamp; // For pagination

    try {
        // Validate chatPartnerId (optional, depends on if you want to check existence)
        // const partnerExists = await pool.query("SELECT 1 FROM users WHERE user_id = $1", [chatPartnerId]);
        // if (partnerExists.rows.length === 0) {
        //     return res.status(404).json({ error: { code: "NOT_FOUND", message: "Chat partner not found." } });
        // }

        let query = `
            SELECT message_id, sender_id, receiver_id, content, timestamp, status
            FROM chat_messages
            WHERE (sender_id = $1 AND receiver_id = $2) OR (sender_id = $2 AND receiver_id = $1)
        `;
        const queryParams = [userId, chatPartnerId];
        let paramIndex = 3;

        if (beforeTimestamp) {
            query += ` AND timestamp < $${paramIndex++}`;
            queryParams.push(beforeTimestamp);
        }

        query += ` ORDER BY timestamp DESC LIMIT $${paramIndex++}`;
        queryParams.push(limit);

        const result = await pool.query(query, queryParams);
        
        // Map to API response format
        const messages = result.rows.map(msg => ({
            messageId: msg.message_id,
            senderId: msg.sender_id,
            receiverId: msg.receiver_id,
            content: msg.content,
            timestamp: msg.timestamp.toISOString(),
            status: msg.status
        }));

        res.status(200).json({ messages });

    } catch (error) {
        console.error("Get chat history error:", error);
        res.status(500).json({ error: { code: "INTERNAL_SERVER_ERROR", message: "An error occurred while fetching chat history." } });
    }
});

// POST /api/chat/{chatPartnerId}/messages - Send a message
router.post('/:chatPartnerId/messages', authenticateToken, async (req, res) => {
    const senderId = req.user.userId;
    const receiverId = req.params.chatPartnerId;
    const { content } = req.body;

    if (!content || content.trim() === "") {
        return res.status(400).json({ error: { code: "INVALID_INPUT", message: "Message content cannot be empty." } });
    }

    if (senderId === receiverId) {
        return res.status(400).json({ error: { code: "INVALID_INPUT", message: "Cannot send message to yourself." } });
    }

    try {
        // Optional: Check if receiverId exists
        const partnerExists = await pool.query("SELECT 1 FROM users WHERE user_id = $1", [receiverId]);
        if (partnerExists.rows.length === 0) {
            return res.status(404).json({ error: { code: "NOT_FOUND", message: "Recipient not found." } });
        }

        // Optional: Implement blocking logic here if needed
        // For example, check if senderId is blocked by receiverId or vice-versa

        const messageId = uuidv4();
        const timestamp = new Date();
        const status = 'sent'; // Default status

        const insertQuery = `
            INSERT INTO chat_messages (message_id, sender_id, receiver_id, content, timestamp, status)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING message_id, sender_id, receiver_id, content, timestamp, status;
        `;
        const result = await pool.query(insertQuery, [messageId, senderId, receiverId, content, timestamp, status]);
        const newMessage = result.rows[0];

        // Attempt to send message via WebSocket if receiver is connected
        const sendMessageToUser = req.app.get('sendMessageToUser');
        if (sendMessageToUser) {
            const wsMessagePayload = {
                type: 'newMessage',
                payload: {
                    messageId: newMessage.message_id,
                    senderId: newMessage.sender_id,
                    receiverId: newMessage.receiver_id,
                    content: newMessage.content,
                    timestamp: newMessage.timestamp.toISOString(),
                    status: newMessage.status // Initially 'sent'
                }
            };
            const deliveredViaWS = sendMessageToUser(receiverId, wsMessagePayload);
            // Optionally update status to 'delivered' in DB if deliveredViaWS is true
            // For simplicity, we'll let the WebSocket service handle 'delivered' status if needed upon client ack.
        }


        res.status(201).json({
            messageId: newMessage.message_id,
            senderId: newMessage.sender_id,
            receiverId: newMessage.receiver_id,
            content: newMessage.content,
            timestamp: newMessage.timestamp.toISOString(),
            status: newMessage.status
        });

    } catch (error) {
        console.error("Send message error:", error);
        res.status(500).json({ error: { code: "INTERNAL_SERVER_ERROR", message: "An error occurred while sending the message." } });
    }
});

module.exports = router;
