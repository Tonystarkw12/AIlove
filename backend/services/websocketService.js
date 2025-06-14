const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const url = require('url');
const { pool } = require('../server'); // To access DB for message saving or user validation
const { v4: uuidv4 } = require('uuid');

// Map to store connected clients: { userId: WebSocket_client }
const clients = new Map();

function initializeWebSocketServer(httpServer) {
    const wss = new WebSocket.Server({ server: httpServer, path: '/ws/chat' });

    wss.on('connection', (ws, req) => {
        const parameters = url.parse(req.url, true);
        const token = parameters.query.token;

        if (!token) {
            console.log('WebSocket: No token provided, closing connection.');
            ws.close(1008, "Token required");
            return;
        }

        let decodedToken;
        try {
            decodedToken = jwt.verify(token, process.env.JWT_SECRET);
        } catch (err) {
            console.log('WebSocket: Invalid token, closing connection.', err.message);
            ws.close(1008, "Invalid token");
            return;
        }

        const userId = decodedToken.userId;
        clients.set(userId, ws); // Store the authenticated client
        console.log(`WebSocket: Client ${userId} connected.`);

        ws.on('message', async (message) => {
            try {
                const parsedMessage = JSON.parse(message);
                console.log(`WebSocket: Received message from ${userId}:`, parsedMessage);

                if (parsedMessage.type === 'sendMessage' && parsedMessage.payload) {
                    const { receiverId, content } = parsedMessage.payload;

                    if (!receiverId || !content) {
                        ws.send(JSON.stringify({ type: 'error', payload: { message: 'Missing receiverId or content.' } }));
                        return;
                    }
                    if (userId === receiverId) {
                        ws.send(JSON.stringify({ type: 'error', payload: { message: 'Cannot send message to yourself via WebSocket.' } }));
                        return;
                    }

                    // Save message to database
                    const messageId = uuidv4();
                    const timestamp = new Date();
                    const dbQuery = `
                        INSERT INTO chat_messages (message_id, sender_id, receiver_id, content, timestamp, status)
                        VALUES ($1, $2, $3, $4, $5, $6)
                        RETURNING message_id, sender_id, receiver_id, content, timestamp, status;
                    `;
                    const dbResult = await pool.query(dbQuery, [messageId, userId, receiverId, content, timestamp, 'sent']);
                    const savedMessage = dbResult.rows[0];
                    
                    const outgoingMessage = {
                        type: 'newMessage',
                        payload: {
                            messageId: savedMessage.message_id,
                            senderId: savedMessage.sender_id,
                            receiverId: savedMessage.receiver_id,
                            content: savedMessage.content,
                            timestamp: savedMessage.timestamp.toISOString()
                        }
                    };

                    // Send to recipient if they are connected
                    const recipientWs = clients.get(receiverId);
                    if (recipientWs && recipientWs.readyState === WebSocket.OPEN) {
                        recipientWs.send(JSON.stringify(outgoingMessage));
                        // Optionally, update status to 'delivered' if recipientWs is active
                        // await pool.query("UPDATE chat_messages SET status = 'delivered' WHERE message_id = $1", [savedMessage.message_id]);
                        // outgoingMessage.payload.status = 'delivered'; // Reflect in sender's confirmation if needed
                    } else {
                        console.log(`WebSocket: Recipient ${receiverId} not connected. Message saved to DB.`);
                    }

                    // Confirm message sent back to sender (optional, or could be part of REST API response if hybrid)
                    // ws.send(JSON.stringify({ type: 'messageSentConfirmation', payload: outgoingMessage.payload }));

                } else if (parsedMessage.type === 'markAsRead' && parsedMessage.payload) {
                    // Example: Client sends a message when chat is opened or message is read
                    const { messageIdToMark } = parsedMessage.payload;
                    if (messageIdToMark) {
                        // Update DB: SET status = 'read' WHERE message_id = messageIdToMark AND receiver_id = userId
                        // Then, notify the sender of messageIdToMark that it has been read
                        // const updateRes = await pool.query("UPDATE chat_messages SET status = 'read' WHERE message_id = $1 AND receiver_id = $2 RETURNING sender_id", [messageIdToMark, userId]);
                        // if (updateRes.rows.length > 0) {
                        //    const originalSenderId = updateRes.rows[0].sender_id;
                        //    const originalSenderWs = clients.get(originalSenderId);
                        //    if (originalSenderWs && originalSenderWs.readyState === WebSocket.OPEN) {
                        //        originalSenderWs.send(JSON.stringify({ type: 'messageStatusUpdate', payload: { messageId: messageIdToMark, status: 'read' } }));
                        //    }
                        // }
                    }
                } else {
                    ws.send(JSON.stringify({ type: 'error', payload: { message: 'Invalid message type or payload.' } }));
                }
            } catch (e) {
                console.error(`WebSocket: Error processing message from ${userId}:`, e);
                ws.send(JSON.stringify({ type: 'error', payload: { message: 'Error processing your message.' } }));
            }
        });

        ws.on('close', () => {
            clients.delete(userId);
            console.log(`WebSocket: Client ${userId} disconnected.`);
        });

        ws.on('error', (error) => {
            console.error(`WebSocket: Error for client ${userId}:`, error);
            // No need to delete from clients here, 'close' event will handle it.
        });
    });

    console.log('WebSocket server initialized and listening on /ws/chat');
    return wss; // Return the WebSocket server instance
}

// Function to send message to a specific user (can be called from REST API handlers)
function sendMessageToUser(userId, messageObject) {
    const clientWs = clients.get(userId);
    if (clientWs && clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(JSON.stringify(messageObject));
        return true;
    }
    console.log(`WebSocket: Attempted to send message to offline user ${userId}`);
    return false;
}

module.exports = {
    initializeWebSocketServer,
    sendMessageToUser,
    clients // Exporting clients map might be useful for advanced scenarios or testing
};
