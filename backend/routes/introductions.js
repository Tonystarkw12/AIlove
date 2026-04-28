const express = require('express');
const router = express.Router();
const pool = require('../db');

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

// GET /api/introductions/me - List user's introductions
router.get('/me', authenticate, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT i.*, c.chat_id, ua.nickname as other_owner_name,
                   ua.avatar_url as other_owner_avatar
            FROM introductions i
            JOIN consents c ON i.consent_id = c.consent_id
            JOIN users ua ON (ua.user_id = c.owner_a_id OR ua.user_id = c.owner_b_id)
                AND ua.user_id != $1
            WHERE c.owner_a_id = $1 OR c.owner_b_id = $1
            ORDER BY i.created_at DESC
        `, [req.userId]);

        // Mask WeChat IDs (show only partial)
        const masked = result.rows.map(r => ({
            ...r,
            owner_a_wechat_id: r.owner_a_wechat_id ? maskWeChat(r.owner_a_wechat_id) : null,
            owner_b_wechat_id: r.owner_b_wechat_id ? maskWeChat(r.owner_b_wechat_id) : null
        }));

        res.json({ introductions: masked });
    } catch (err) {
        console.error('Error fetching introductions:', err);
        res.status(500).json({ error: 'Failed to fetch introductions' });
    }
});

function maskWeChat(wechatId) {
    if (wechatId.length <= 4) return wechatId;
    return wechatId.substring(0, 2) + '***' + wechatId.substring(wechatId.length - 2);
}

// POST /api/introductions/:id/feedback - Submit post-introduction feedback
router.post('/:id/feedback', authenticate, async (req, res) => {
    try {
        const { feedback } = req.body;

        const intro = await pool.query(`
            SELECT i.*, c.owner_a_id, c.owner_b_id
            FROM introductions i
            JOIN consents c ON i.consent_id = c.consent_id
            WHERE i.introduction_id = $1
        `, [req.params.id]);

        if (intro.rows.length === 0) return res.status(404).json({ error: 'Introduction not found' });

        const i = intro.rows[0];
        const isOwnerA = i.owner_a_id === req.userId;

        if (isOwnerA) {
            await pool.query(`
                UPDATE introductions SET owner_a_feedback = $1, feedback_submitted_at = NOW()
                WHERE introduction_id = $2
            `, [feedback, req.params.id]);
        } else {
            await pool.query(`
                UPDATE introductions SET owner_b_feedback = $1, feedback_submitted_at = NOW()
                WHERE introduction_id = $2
            `, [feedback, req.params.id]);
        }

        res.json({ feedbackSubmitted: true });
    } catch (err) {
        console.error('Error submitting feedback:', err);
        res.status(500).json({ error: 'Failed to submit feedback' });
    }
});

module.exports = router;
