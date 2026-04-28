const express = require('express');
const router = express.Router();
const pool = require('../db');
const lobsterOrchestrator = require('../services/lobsterOrchestrator');
const subscriptionService = require('../services/subscriptionService');

// Middleware to verify authentication
const authenticate = (req, res, next) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'Authentication required' });

    try {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.userId = decoded.userId;
        next();
    } catch (err) {
        res.status(401).json({ error: 'Invalid token' });
    }
};

// Subscription gate middleware
const requireSubscription = async (req, res, next) => {
    const access = await subscriptionService.hasAccess(req.userId);
    if (!access.hasAccess) {
        return res.status(402).json({ error: 'Subscription required', reason: access.reason });
    }
    req.subscription = access;
    next();
};

// POST /api/lobsters/initialize - Create lobster for current user
router.post('/initialize', authenticate, async (req, res) => {
    try {
        // Check if lobster already exists
        const existing = await pool.query(`SELECT * FROM lobsters WHERE owner_id = $1`, [req.userId]);
        if (existing.rows.length > 0) {
            return res.json({ lobster: existing.rows[0], created: false });
        }

        // Create lobster with default personality
        const lobster = await pool.query(`
            INSERT INTO lobsters (owner_id, name, conversation_style)
            VALUES ($1, $2, $3)
            RETURNING *
        `, [req.userId, `龙虾${Math.floor(Math.random() * 9000 + 1000)}`, 'friendly']);

        // Create empty preferences
        await pool.query(`
            INSERT INTO lobster_preferences (lobster_id)
            VALUES ($1)
        `, [lobster.rows[0].lobster_id]);

        // Start free trial
        await subscriptionService.createTrialSubscription(req.userId);

        res.status(201).json({ lobster: lobster.rows[0], created: true });
    } catch (err) {
        console.error('Error initializing lobster:', err);
        res.status(500).json({ error: 'Failed to initialize lobster' });
    }
});

// GET /api/lobsters/me - Get current user's lobster profile
router.get('/me', authenticate, requireSubscription, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT l.*, u.nickname as owner_nickname
            FROM lobsters l
            JOIN users u ON l.owner_id = u.user_id
            WHERE l.owner_id = $1
        `, [req.userId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Lobster not found. Call /initialize first.' });
        }

        res.json({ lobster: result.rows[0] });
    } catch (err) {
        console.error('Error fetching lobster:', err);
        res.status(500).json({ error: 'Failed to fetch lobster' });
    }
});

// PUT /api/lobsters/me - Update lobster personality/name
router.put('/me', authenticate, requireSubscription, async (req, res) => {
    try {
        const { name, conversation_style, matching_criteria, dealbreakers } = req.body;

        const result = await pool.query(`
            UPDATE lobsters
            SET name = COALESCE($1, name),
                conversation_style = COALESCE($2, conversation_style),
                matching_criteria = COALESCE($3, matching_criteria),
                dealbreakers = COALESCE($4, dealbreakers),
                updated_at = NOW()
            WHERE owner_id = $5
            RETURNING *
        `, [name, conversation_style, matching_criteria ? JSON.stringify(matching_criteria) : null, dealbreakers, req.userId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Lobster not found' });
        }

        res.json({ lobster: result.rows[0] });
    } catch (err) {
        console.error('Error updating lobster:', err);
        res.status(500).json({ error: 'Failed to update lobster' });
    }
});

// GET /api/lobsters/me/chats - List lobster's conversations
router.get('/me/chats', authenticate, requireSubscription, async (req, res) => {
    try {
        const { status, limit = 20, offset = 0 } = req.query;

        let query = `
            SELECT lc.*, l.name as other_lobster_name, u.nickname as other_owner_name
            FROM lobster_chats lc
            JOIN lobsters la ON lc.lobster_a_id = la.lobster_id
            JOIN lobsters lb ON lc.lobster_b_id = lb.lobster_id
            JOIN users ua ON la.owner_id = ua.user_id
            JOIN users ub ON lb.owner_id = ub.user_id
            WHERE la.owner_id = $1 OR lb.owner_id = $1
        `;

        const params = [req.userId];

        if (status) {
            params.push(status);
            query += ` AND lc.session_status = $${params.length}`;
        }

        query += ` ORDER BY lc.updated_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        params.push(parseInt(limit), parseInt(offset));

        const result = await pool.query(query, params);

        // Anonymize other party info based on who is the current user
        const chats = result.rows.map(c => ({
            ...c,
            other_lobster_name: c.lobster_a_id === c.lobster_a_id ? c.other_lobster_name : c.other_lobster_name,
            other_owner_name: c.lobster_a_id === c.lobster_a_id ? c.other_owner_name : c.other_owner_name
        }));

        res.json({ chats, total: result.rows.length });
    } catch (err) {
        console.error('Error fetching chats:', err);
        res.status(500).json({ error: 'Failed to fetch chats' });
    }
});

// GET /api/lobsters/me/chats/:chatId - Get specific chat details
router.get('/me/chats/:chatId', authenticate, requireSubscription, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT lc.*
            FROM lobster_chats lc
            JOIN lobsters l ON lc.lobster_a_id = l.lobster_id
            WHERE l.owner_id = $1 AND lc.chat_id = $2
        `, [req.userId, req.params.chatId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Chat not found' });
        }

        res.json({ chat: result.rows[0] });
    } catch (err) {
        console.error('Error fetching chat:', err);
        res.status(500).json({ error: 'Failed to fetch chat' });
    }
});

// GET /api/lobsters/me/stats - Get lobster activity statistics
router.get('/me/stats', authenticate, requireSubscription, async (req, res) => {
    try {
        const lobster = await pool.query(`SELECT * FROM lobsters WHERE owner_id = $1`, [req.userId]);
        if (lobster.rows.length === 0) {
            return res.status(404).json({ error: 'Lobster not found' });
        }

        const activeChats = await pool.query(`
            SELECT COUNT(*) FROM lobster_chats lc
            JOIN lobsters l ON lc.lobster_a_id = l.lobster_id OR lc.lobster_b_id = l.lobster_id
            WHERE l.owner_id = $1 AND lc.session_status = 'active'
        `, [req.userId]);

        const completedChats = await pool.query(`
            SELECT COUNT(*) FROM lobster_chats lc
            JOIN lobsters l ON lc.lobster_a_id = l.lobster_id OR lc.lobster_b_id = l.lobster_id
            WHERE l.owner_id = $1 AND lc.session_status = 'completed'
        `, [req.userId]);

        const pendingConsents = await pool.query(`
            SELECT COUNT(*) FROM consents c
            WHERE (c.owner_a_id = $1 OR c.owner_b_id = $1)
            AND (c.owner_a_wechat_consent IS NULL OR c.owner_b_wechat_consent IS NULL)
        `, [req.userId]);

        res.json({
            lobster: lobster.rows[0],
            activeChats: parseInt(activeChats.rows[0].count),
            completedChats: parseInt(completedChats.rows[0].count),
            pendingConsents: parseInt(pendingConsents.rows[0].count)
        });
    } catch (err) {
        console.error('Error fetching stats:', err);
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});

// POST /api/lobsters/me/pause - Pause lobster activity
router.post('/me/pause', authenticate, async (req, res) => {
    try {
        await pool.query(`UPDATE lobsters SET status = 'paused' WHERE owner_id = $1`, [req.userId]);
        res.json({ status: 'paused' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to pause lobster' });
    }
});

// POST /api/lobsters/me/resume - Resume lobster activity
router.post('/me/resume', authenticate, async (req, res) => {
    try {
        await pool.query(`UPDATE lobsters SET status = 'active', last_active_at = NOW() WHERE owner_id = $1`, [req.userId]);
        res.json({ status: 'active' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to resume lobster' });
    }
});

// GET /api/lobsters/me/recommendations - Get lobster-curated recommendations
router.get('/me/recommendations', authenticate, requireSubscription, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT lc.*, u.nickname as other_owner_name, u.avatar_url as other_owner_avatar
            FROM lobster_chats lc
            JOIN lobsters la ON lc.lobster_a_id = la.lobster_id
            JOIN lobsters lb ON lc.lobster_b_id = lb.lobster_id
            JOIN users ua ON la.owner_id = ua.user_id
            JOIN users ub ON lb.owner_id = ub.user_id
            WHERE (la.owner_id = $1 OR lb.owner_id = $1)
            AND lc.outcome = 'recommended'
            AND lc.compatibility_score IS NOT NULL
            ORDER BY lc.compatibility_score DESC
            LIMIT 20
        `, [req.userId]);

        res.json({ recommendations: result.rows });
    } catch (err) {
        console.error('Error fetching recommendations:', err);
        res.status(500).json({ error: 'Failed to fetch recommendations' });
    }
});

// POST /api/lobsters/me/respond - Respond to a recommendation
router.post('/me/respond', authenticate, requireSubscription, async (req, res) => {
    try {
        const { chatId, response } = req.body;
        if (!['approved', 'rejected'].includes(response)) {
            return res.status(400).json({ error: 'Response must be "approved" or "rejected"' });
        }

        const result = await lobsterOrchestrator.processOwnerResponse(chatId, req.userId, response);
        res.json(result);
    } catch (err) {
        console.error('Error processing response:', err);
        res.status(500).json({ error: 'Failed to process response' });
    }
});

// POST /api/lobsters/me/match-now - Trigger immediate matching cycle
router.post('/me/match-now', authenticate, requireSubscription, async (req, res) => {
    try {
        const lobster = await pool.query(`SELECT lobster_id FROM lobsters WHERE owner_id = $1`, [req.userId]);
        if (lobster.rows.length === 0) {
            return res.status(404).json({ error: 'Lobster not found' });
        }

        await lobsterOrchestrator.runMatchingCycle();
        res.json({ message: 'Matching cycle triggered' });
    } catch (err) {
        console.error('Error triggering match:', err);
        res.status(500).json({ error: 'Failed to trigger matching' });
    }
});

module.exports = router;
