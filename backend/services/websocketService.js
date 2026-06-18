const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const url = require('url');
const pool = require('../db');
const { v4: uuidv4 } = require('uuid');
const lobsterOrchestrator = require('./lobsterOrchestrator');

// Connected user-to-UI clients: { userId: Set<WebSocket> }
const ownerClients = new Map();

// Connected lobster agent clients: { lobsterId: WebSocket }
const lobsterClients = new Map();

// Active chat rooms: { chatId: { lobsterA: lobsterId, lobsterB: lobsterId, ownerA: userId, ownerB: userId, status } }
const chatRooms = new Map();

/**
 * Initialize the WebSocket server with two connection paths:
 * - /ws/lobster?token=<lobster_token> — OpenClaw agent connections
 * - /ws/owner?token=<user_jwt>        — Owner UI connections
 */
function initializeWebSocketServer(httpServer) {
    const wss = new WebSocket.Server({ noServer: true });

    // Handle upgrade requests with path routing
    httpServer.on('upgrade', (request, socket, head) => {
        const pathname = url.parse(request.url, true).pathname;

        if (pathname === '/ws/lobster' || pathname === '/ws/owner') {
            wss.handleUpgrade(request, socket, head, (ws) => {
                wss.emit('connection', ws, request);
            });
        } else if (pathname === '/ws/chat') {
            // Legacy user-to-user chat — still supported
            wss.handleUpgrade(request, socket, head, (ws) => {
                wss.emit('connection', ws, request, 'legacy');
            });
        } else {
            socket.destroy();
        }
    });

    wss.on('connection', async (ws, req, mode) => {
        const parameters = url.parse(req.url, true);
        const pathname = url.parse(req.url, true).pathname;
        const token = parameters.query.token;
        const effectivePath = mode === 'legacy' ? '/ws/chat' : pathname;

        if (!token) {
            ws.send(JSON.stringify({ type: 'error', message: 'Token required' }));
            ws.close(1008, 'Token required');
            return;
        }

        if (effectivePath === '/ws/lobster') {
            await handleLobsterConnection(ws, token);
        } else if (effectivePath === '/ws/owner') {
            await handleOwnerConnection(ws, token);
        } else {
            await handleLegacyConnection(ws, token);
        }
    });

    console.log('WebSocket server initialized: /ws/lobster (agents), /ws/owner (UI), /ws/chat (legacy)');
    return wss;
}

/**
 * Handle OpenClaw agent (lobster) WebSocket connections
 */
async function handleLobsterConnection(ws, lobsterToken) {
    let lobster;
    try {
        const result = await pool.query(
            `SELECT lobster_id, owner_id, name, conversation_style, status
             FROM lobsters WHERE lobster_token = $1`,
            [lobsterToken]
        );
        if (result.rows.length === 0) {
            ws.send(JSON.stringify({ type: 'error', message: 'Invalid lobster token' }));
            ws.close(1008, 'Invalid lobster token');
            return;
        }
        lobster = result.rows[0];
    } catch (err) {
        console.error('[WS/Lobster] Auth query failed:', err.message);
        ws.close(1011, 'Internal error');
        return;
    }

    const lobsterId = lobster.lobster_id;

    // Prevent duplicate connections
    if (lobsterClients.has(lobsterId)) {
        const existing = lobsterClients.get(lobsterId);
        existing.send(JSON.stringify({ type: 'kicked', reason: 'Reconnected from elsewhere' }));
        existing.close(1000, 'Kicked');
    }

    lobsterClients.set(lobsterId, ws);
    console.log(`[WS/Lobster] Agent ${lobster.name} (${lobsterId}) connected`);

    ws.send(JSON.stringify({
        type: 'authenticated',
        lobster_id: lobsterId,
        name: lobster.name
    }));

    // Try to auto-pair if lobster is active and has no active chat
    if (lobster.status === 'active') {
        tryPairLobster(lobsterId).catch(err =>
            console.error(`[WS/Lobster] Auto-pair failed for ${lobsterId}:`, err.message)
        );
    }

    ws.on('message', async (raw) => {
        let msg;
        try {
            msg = JSON.parse(raw);
        } catch {
            ws.send(JSON.stringify({ type: 'error', message: 'Invalid JSON' }));
            return;
        }
        await handleLobsterMessage(ws, lobsterId, lobster.owner_id, msg);
    });

    ws.on('close', () => {
        lobsterClients.delete(lobsterId);
        console.log(`[WS/Lobster] Agent ${lobsterId} disconnected`);
    });

    ws.on('error', (err) => {
        console.error(`[WS/Lobster] Error for ${lobsterId}:`, err.message);
    });
}

/**
 * Handle lobster agent protocol messages
 */
async function handleLobsterMessage(ws, lobsterId, ownerId, msg) {
    const { type, chat_id, content, summary } = msg;

    if (type === 'message') {
        if (!chat_id || !content) {
            ws.send(JSON.stringify({ type: 'error', message: 'message requires chat_id and content' }));
            return;
        }

        const room = chatRooms.get(chat_id);
        if (!room) {
            ws.send(JSON.stringify({ type: 'error', message: 'Chat room not found or expired' }));
            return;
        }

        // Verify lobster is participant
        if (room.lobsterA !== lobsterId && room.lobsterB !== lobsterId) {
            ws.send(JSON.stringify({ type: 'error', message: 'Not a participant in this chat' }));
            return;
        }

        const sender = room.lobsterA === lobsterId ? 'a' : 'b';

        // Store message in DB
        const messageObj = {
            sender,
            content,
            timestamp: new Date().toISOString()
        };

        try {
            await pool.query(`
                UPDATE lobster_chats
                SET messages = messages || $1::jsonb, updated_at = NOW()
                WHERE chat_id = $2
            `, [JSON.stringify(messageObj), chat_id]);
        } catch (err) {
            console.error('[WS/Lobster] DB store failed:', err.message);
        }

        // Relay to partner lobster
        const partnerId = room.lobsterA === lobsterId ? room.lobsterB : room.lobsterA;
        const partnerWs = lobsterClients.get(partnerId);
        if (partnerWs && partnerWs.readyState === WebSocket.OPEN) {
            partnerWs.send(JSON.stringify({ type: 'message', chat_id, sender, content }));
        }

        // Push to connected owner UIs
        broadcastToOwner(room.ownerA, {
            type: 'lobster:message',
            chat_id,
            sender,
            content,
            timestamp: messageObj.timestamp
        });
        broadcastToOwner(room.ownerB, {
            type: 'lobster:message',
            chat_id,
            sender,
            content,
            timestamp: messageObj.timestamp
        });

    } else if (type === 'end_chat') {
        if (!chat_id) {
            ws.send(JSON.stringify({ type: 'error', message: 'end_chat requires chat_id' }));
            return;
        }

        const room = chatRooms.get(chat_id);
        if (!room) return;

        if (room.lobsterA !== lobsterId && room.lobsterB !== lobsterId) {
            ws.send(JSON.stringify({ type: 'error', message: 'Not a participant' }));
            return;
        }

        // Mark chat as completed in DB
        try {
            await pool.query(`
                UPDATE lobster_chats
                SET session_status = 'completed',
                    updated_at = NOW()
                WHERE chat_id = $1
            `, [chat_id]);
        } catch (err) {
            console.error('[WS/Lobster] end_chat DB update failed:', err.message);
        }

        // Notify partner lobster
        const partnerId = room.lobsterA === lobsterId ? room.lobsterB : room.lobsterA;
        const partnerWs = lobsterClients.get(partnerId);
        if (partnerWs && partnerWs.readyState === WebSocket.OPEN) {
            partnerWs.send(JSON.stringify({ type: 'chat_ended', chat_id, summary: summary || null }));
        }

        // Notify owners
        broadcastToOwner(room.ownerA, {
            type: 'lobster:chat_ended',
            chat_id,
            summary: summary || null
        });
        broadcastToOwner(room.ownerB, {
            type: 'lobster:chat_ended',
            chat_id,
            summary: summary || null
        });

        chatRooms.delete(chat_id);

    } else if (type === 'find_match') {
        // Agent requests a new pairing
        try {
            await tryPairLobster(lobsterId);
        } catch (err) {
            console.error('[WS/Lobster] find_match failed:', err.message);
            ws.send(JSON.stringify({ type: 'error', message: 'Matching failed' }));
        }

    } else {
        ws.send(JSON.stringify({ type: 'error', message: `Unknown message type: ${type}` }));
    }
}

/**
 * Try to pair a lobster with an available candidate
 */
async function tryPairLobster(lobsterId) {
    const candidates = await lobsterOrchestrator.discoverCandidates(lobsterId, 10);
    if (candidates.length === 0) {
        const ws = lobsterClients.get(lobsterId);
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'no_matches', message: 'No available candidates right now' }));
        }
        return;
    }

    // Find first candidate that is also connected
    let partner = null;
    for (const c of candidates) {
        if (lobsterClients.has(c.lobster_id)) {
            partner = c;
            break;
        }
    }

    if (!partner) {
        const ws = lobsterClients.get(lobsterId);
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'waiting', message: 'No candidates online yet. Will notify when matched.' }));
        }
        return;
    }

    // Create chat room
    const chatId = await lobsterOrchestrator.initiateChat(lobsterId, partner.lobster_id);

    // Fetch lobster details for both
    const [lobsterARow, lobsterBRow] = await Promise.all([
        pool.query(`SELECT l.*, u.user_id as owner_id FROM lobsters l JOIN users u ON l.owner_id = u.user_id WHERE l.lobster_id = $1`, [lobsterId]),
        pool.query(`SELECT l.*, u.user_id as owner_id FROM lobsters l JOIN users u ON l.owner_id = u.user_id WHERE l.lobster_id = $1`, [partner.lobster_id])
    ]);

    const a = lobsterARow.rows[0];
    const b = lobsterBRow.rows[0];

    chatRooms.set(chatId, {
        lobsterA: a.lobster_id,
        lobsterB: b.lobster_id,
        ownerA: a.owner_id,
        ownerB: b.owner_id,
        status: 'active'
    });

    // Notify both agents
    const wsA = lobsterClients.get(a.lobster_id);
    const wsB = lobsterClients.get(b.lobster_id);

    if (wsA && wsA.readyState === WebSocket.OPEN) {
        wsA.send(JSON.stringify({
            type: 'room_ready',
            chat_id: chatId,
            partner: { name: b.name, conversation_style: b.conversation_style }
        }));
    }
    if (wsB && wsB.readyState === WebSocket.OPEN) {
        wsB.send(JSON.stringify({
            type: 'room_ready',
            chat_id: chatId,
            partner: { name: a.name, conversation_style: a.conversation_style }
        }));
    }

    // Notify owner UIs
    broadcastToOwner(a.owner_id, {
        type: 'lobster:chat_started',
        chat_id: chatId,
        partner_name: b.name,
        partner_owner: (await pool.query(`SELECT nickname FROM users WHERE user_id = $1`, [b.owner_id])).rows[0]?.nickname
    });
    broadcastToOwner(b.owner_id, {
        type: 'lobster:chat_started',
        chat_id: chatId,
        partner_name: a.name,
        partner_owner: (await pool.query(`SELECT nickname FROM users WHERE user_id = $1`, [a.owner_id])).rows[0]?.nickname
    });

    console.log(`[WS] Chat room ${chatId} created: ${a.name} <-> ${b.name}`);
}

/**
 * Handle owner UI WebSocket connections
 */
async function handleOwnerConnection(ws, userJwt) {
    let userId;
    try {
        const decoded = jwt.verify(userJwt, process.env.JWT_SECRET);
        userId = decoded.userId;
    } catch (err) {
        ws.send(JSON.stringify({ type: 'error', message: 'Invalid JWT' }));
        ws.close(1008, 'Invalid JWT');
        return;
    }

    if (!ownerClients.has(userId)) {
        ownerClients.set(userId, new Set());
    }
    ownerClients.get(userId).add(ws);

    console.log(`[WS/Owner] User ${userId} connected`);

    ws.send(JSON.stringify({ type: 'authenticated', user_id: userId }));

    // Send any active chat rooms for this user's lobster
    try {
        const lobsterRes = await pool.query(`SELECT lobster_id FROM lobsters WHERE owner_id = $1`, [userId]);
        if (lobsterRes.rows.length > 0) {
            const lobsterId = lobsterRes.rows[0].lobster_id;
            const activeChats = [];
            for (const [chatId, room] of chatRooms.entries()) {
                if (room.lobsterA === lobsterId || room.lobsterB === lobsterId) {
                    activeChats.push({ chat_id: chatId, status: room.status });
                }
            }
            ws.send(JSON.stringify({ type: 'active_chats', chats: activeChats }));
        }
    } catch (err) {
        console.error('[WS/Owner] Active chat query failed:', err.message);
    }

    ws.on('message', async (raw) => {
        let msg;
        try {
            msg = JSON.parse(raw);
        } catch {
            ws.send(JSON.stringify({ type: 'error', message: 'Invalid JSON' }));
            return;
        }

        if (msg.type === 'subscribe_chat') {
            // Owner subscribing to a specific chat — verify ownership
            const chatId = msg.chat_id;
            if (!chatId) return;

            try {
                const res = await pool.query(`
                    SELECT lc.chat_id FROM lobster_chats lc
                    JOIN lobsters la ON lc.lobster_a_id = la.lobster_id
                    JOIN lobsters lb ON lc.lobster_b_id = lb.lobster_id
                    WHERE lc.chat_id = $1 AND (la.owner_id = $2 OR lb.owner_id = $2)
                `, [chatId, userId]);

                if (res.rows.length > 0) {
                    ws.send(JSON.stringify({ type: 'subscribed', chat_id: chatId }));
                } else {
                    ws.send(JSON.stringify({ type: 'error', message: 'Access denied for this chat' }));
                }
            } catch (err) {
                console.error('[WS/Owner] subscribe_chat failed:', err.message);
            }
        }
    });

    ws.on('close', () => {
        const set = ownerClients.get(userId);
        if (set) {
            set.delete(ws);
            if (set.size === 0) ownerClients.delete(userId);
        }
        console.log(`[WS/Owner] User ${userId} disconnected`);
    });

    ws.on('error', (err) => {
        console.error(`[WS/Owner] Error for ${userId}:`, err.message);
    });
}

/**
 * Legacy user-to-user chat handler (preserved for backward compatibility)
 */
async function handleLegacyConnection(ws, token) {
    let userId;
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        userId = decoded.userId;
    } catch (err) {
        ws.close(1008, 'Invalid token');
        return;
    }

    if (!ownerClients.has(userId)) {
        ownerClients.set(userId, new Set());
    }
    ownerClients.get(userId).add(ws);

    ws.on('close', () => {
        const set = ownerClients.get(userId);
        if (set) {
            set.delete(ws);
            if (set.size === 0) ownerClients.delete(userId);
        }
    });
}

/**
 * Broadcast a message to all connected UI sessions for a user
 */
function broadcastToOwner(userId, messageObject) {
    const set = ownerClients.get(userId);
    if (!set) return false;

    const payload = JSON.stringify(messageObject);
    let sent = false;
    for (const ws of set) {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(payload);
            sent = true;
        }
    }
    return sent;
}

/**
 * Send message to a specific user (legacy API compat)
 */
function sendMessageToUser(userId, messageObject) {
    return broadcastToOwner(userId, messageObject);
}

module.exports = {
    initializeWebSocketServer,
    sendMessageToUser,
    broadcastToOwner,
    // Expose for testing/introspection
    _getOwnerClients: () => ownerClients,
    _getLobsterClients: () => lobsterClients,
    _getChatRooms: () => chatRooms
};
