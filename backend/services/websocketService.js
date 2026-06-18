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

// Lobby: Map<lobsterId, { lobster, publicProfile }>
// publicProfile = { id, name, conversation_style, summary }
const lobby = new Map();

// Pending chat requests: { requestId: { from, target, intro } }
const pendingRequests = new Map();

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
 * Build a human-readable Chinese summary from lobster preferences + lobster row.
 * Example: "主人寻找长期关系，喜欢徒步/科幻/音乐，在北京海淀，理想对象温柔有主见，不接受抽烟。"
 */
async function buildPublicProfile(lobsterId) {
    // Fetch lobster base info + owner location
    const lobsterRes = await pool.query(`
        SELECT l.lobster_id, l.name, l.conversation_style, l.owner_id,
               u.location
        FROM lobsters l
        JOIN users u ON l.owner_id = u.user_id
        WHERE l.lobster_id = $1
    `, [lobsterId]);

    if (lobsterRes.rows.length === 0) return null;
    const l = lobsterRes.rows[0];

    // Fetch preferences
    const prefsRes = await pool.query(`
        SELECT owner_dating_goals, owner_values, owner_lifestyle,
               owner_ideal_partner, dealbreaker_list
        FROM lobster_preferences
        WHERE lobster_id = $1
    `, [lobsterId]);

    const prefs = prefsRes.rows[0] || {};

    // Build summary parts
    const parts = [];

    // Dating goals
    if (prefs.owner_dating_goals) {
        parts.push(`主人寻找${prefs.owner_dating_goals}`);
    }

    // Lifestyle / interests
    if (prefs.owner_lifestyle) {
        const lifestyle = prefs.owner_lifestyle;
        let lifestyleStr = '';
        if (typeof lifestyle === 'object') {
            // Extract interests/hobbies from JSONB
            const interests = lifestyle.interests || lifestyle.hobbies || lifestyle.weekend || [];
            if (Array.isArray(interests) && interests.length > 0) {
                lifestyleStr = interests.slice(0, 4).join('/');
            } else if (typeof lifestyle === 'string') {
                lifestyleStr = lifestyle;
            } else {
                // Flatten object values
                const vals = Object.values(lifestyle).filter(v => typeof v === 'string' && v.length > 0);
                lifestyleStr = vals.slice(0, 3).join('/');
            }
        } else if (typeof lifestyle === 'string') {
            lifestyleStr = lifestyle;
        }
        if (lifestyleStr) {
            parts.push(`喜欢${lifestyleStr}`);
        }
    }

    // Location
    if (l.location) {
        parts.push(`在${l.location}`);
    }

    // Ideal partner
    if (prefs.owner_ideal_partner) {
        const ideal = prefs.owner_ideal_partner;
        let idealStr = '';
        if (typeof ideal === 'object') {
            const traits = ideal.traits || ideal.qualities || [];
            if (Array.isArray(traits) && traits.length > 0) {
                idealStr = traits.slice(0, 3).join('、');
            } else {
                const vals = Object.values(ideal).filter(v => typeof v === 'string' && v.length > 0);
                idealStr = vals.slice(0, 2).join('、');
            }
        } else if (typeof ideal === 'string') {
            idealStr = ideal;
        }
        if (idealStr) {
            parts.push(`理想对象${idealStr}`);
        }
    }

    // Dealbreakers
    if (prefs.dealbreaker_list && prefs.dealbreaker_list.length > 0) {
        parts.push(`不接受${prefs.dealbreaker_list.slice(0, 3).join('/')}`);
    }

    const summary = parts.length > 0
        ? parts.join('，') + '。'
        : '主人暂未填写详细偏好。';

    return {
        id: l.lobster_id,
        name: l.name,
        conversation_style: l.conversation_style,
        owner_id: l.owner_id,
        summary
    };
}

/**
 * Broadcast lobby_update to all connected lobsters except the specified one
 */
function broadcastLobbyUpdate(action, lobsterEntry, excludeLobsterId = null) {
    const payload = JSON.stringify({
        type: 'lobby_update',
        action,
        lobster: { id: lobsterEntry.id, name: lobsterEntry.name, summary: lobsterEntry.summary }
    });

    for (const [lid, ws] of lobsterClients.entries()) {
        if (lid === excludeLobsterId) continue;
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(payload);
        }
    }
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

    // Build public profile and add to lobby (for active lobsters)
    if (lobster.status === 'active') {
        try {
            const profile = await buildPublicProfile(lobsterId);
            if (profile) {
                lobby.set(lobsterId, { lobster, publicProfile: profile });

                // Send current lobby (excluding self) to newly connected lobster
                const lobbyList = [];
                for (const [lid, entry] of lobby.entries()) {
                    if (lid === lobsterId) continue;
                    const p = entry.publicProfile;
                    lobbyList.push({ id: p.id, name: p.name, summary: p.summary });
                }
                ws.send(JSON.stringify({ type: 'lobby', lobsters: lobbyList }));

                // Broadcast join to all other connected lobsters
                broadcastLobbyUpdate('join', profile, lobsterId);

                console.log(`[WS/Lobster] ${lobster.name} joined lobby (${lobby.size} online)`);
            }
        } catch (err) {
            console.error(`[WS/Lobster] Lobby join failed for ${lobsterId}:`, err.message);
        }
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

        // Remove from lobby and broadcast leave
        if (lobby.has(lobsterId)) {
            const entry = lobby.get(lobsterId);
            lobby.delete(lobsterId);
            broadcastLobbyUpdate('leave', entry.publicProfile, null);
            console.log(`[WS/Lobster] Agent ${lobsterId} left lobby (${lobby.size} online)`);
        }

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

    } else if (type === 'request_chat') {
        // Agent wants to chat with a specific lobster from the lobby
        const { target_lobster_id, intro } = msg;
        if (!target_lobster_id) {
            ws.send(JSON.stringify({ type: 'error', message: 'request_chat requires target_lobster_id' }));
            return;
        }

        // Validate target is in lobby
        if (!lobby.has(target_lobster_id)) {
            ws.send(JSON.stringify({ type: 'error', message: 'Target lobster not in lobby (may have disconnected)' }));
            return;
        }

        // Validate target is not self
        if (target_lobster_id === lobsterId) {
            ws.send(JSON.stringify({ type: 'error', message: 'Cannot request chat with yourself' }));
            return;
        }

        const requestId = uuidv4();
        const requesterProfile = lobby.get(lobsterId)?.publicProfile;

        // Store pending request
        pendingRequests.set(requestId, {
            from: lobsterId,
            target: target_lobster_id,
            intro: intro || ''
        });

        // Relay to target
        const targetWs = lobsterClients.get(target_lobster_id);
        if (targetWs && targetWs.readyState === WebSocket.OPEN) {
            targetWs.send(JSON.stringify({
                type: 'chat_request',
                request_id: requestId,
                from: {
                    id: lobsterId,
                    name: requesterProfile?.name || 'Unknown',
                    summary: requesterProfile?.summary || ''
                },
                intro: intro || ''
            }));
        } else {
            // Target disconnected between lobby check and send
            pendingRequests.delete(requestId);
            ws.send(JSON.stringify({ type: 'error', message: 'Target lobster disconnected' }));
        }

    } else if (type === 'accept_chat') {
        // Agent accepted a chat request
        const { request_id } = msg;
        if (!request_id) {
            ws.send(JSON.stringify({ type: 'error', message: 'accept_chat requires request_id' }));
            return;
        }

        const pending = pendingRequests.get(request_id);
        if (!pending) {
            ws.send(JSON.stringify({ type: 'error', message: 'Request not found or expired' }));
            return;
        }

        // Validate requester still online
        if (!lobsterClients.has(pending.from)) {
            pendingRequests.delete(request_id);
            ws.send(JSON.stringify({ type: 'error', message: 'Requester is no longer online' }));
            return;
        }

        pendingRequests.delete(request_id);

        // Create chat room via orchestrator (DB record only, no scoring)
        try {
            const chatId = await lobsterOrchestrator.initiateChat(pending.from, lobsterId);

            // Fetch lobster details for both
            const [lobsterARow, lobsterBRow] = await Promise.all([
                pool.query(`SELECT l.lobster_id, l.name, l.conversation_style, l.owner_id FROM lobsters l WHERE l.lobster_id = $1`, [pending.from]),
                pool.query(`SELECT l.lobster_id, l.name, l.conversation_style, l.owner_id FROM lobsters l WHERE l.lobster_id = $1`, [lobsterId])
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

            console.log(`[WS] Chat room ${chatId} created: ${a.name} <-> ${b.name} (decentralized)`);
        } catch (err) {
            console.error('[WS/Lobster] accept_chat room creation failed:', err.message);
            ws.send(JSON.stringify({ type: 'error', message: 'Failed to create chat room' }));
        }

    } else if (type === 'reject_chat') {
        // Agent rejected a chat request
        const { request_id, reason } = msg;
        if (!request_id) {
            ws.send(JSON.stringify({ type: 'error', message: 'reject_chat requires request_id' }));
            return;
        }

        const pending = pendingRequests.get(request_id);
        if (!pending) {
            ws.send(JSON.stringify({ type: 'error', message: 'Request not found or expired' }));
            return;
        }

        pendingRequests.delete(request_id);

        // Get target name for the rejection message
        const targetEntry = lobby.get(lobsterId);
        const targetName = targetEntry?.publicProfile?.name || 'Unknown';

        // Relay rejection to requester
        const requesterWs = lobsterClients.get(pending.from);
        if (requesterWs && requesterWs.readyState === WebSocket.OPEN) {
            requesterWs.send(JSON.stringify({
                type: 'request_rejected',
                request_id,
                target_id: lobsterId,
                target_name: targetName,
                reason: reason || ''
            }));
        }

    } else if (type === 'find_match') {
        // Agent requests lobby refresh (deprecated auto-pair, now just sends current lobby)
        try {
            const lobbyList = [];
            for (const [lid, entry] of lobby.entries()) {
                if (lid === lobsterId) continue;
                const p = entry.publicProfile;
                lobbyList.push({ id: p.id, name: p.name, summary: p.summary });
            }
            ws.send(JSON.stringify({ type: 'lobby', lobsters: lobbyList }));
        } catch (err) {
            console.error('[WS/Lobster] find_match failed:', err.message);
            ws.send(JSON.stringify({ type: 'error', message: 'Lobby refresh failed' }));
        }

    } else {
        ws.send(JSON.stringify({ type: 'error', message: `Unknown message type: ${type}` }));
    }
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
    _getChatRooms: () => chatRooms,
    _getLobby: () => lobby,
    _getPendingRequests: () => pendingRequests
};
