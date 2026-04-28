const express = require('express');
const router = express.Router();
const pool = require('../db');
const crypto = require('../services/crypto');

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

        // Decrypt and mask WeChat IDs
        const masked = result.rows.map(r => {
            const decryptedA = r.owner_a_wechat_id ? crypto.decrypt(r.owner_a_wechat_id) : null;
            const decryptedB = r.owner_b_wechat_id ? crypto.decrypt(r.owner_b_wechat_id) : null;
            return {
                ...r,
                owner_a_wechat_id: decryptedA ? maskWeChat(decryptedA) : null,
                owner_b_wechat_id: decryptedB ? maskWeChat(decryptedB) : null
            };
        });

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

// POST /api/introductions/:id/reveal-wechat - Reveal decrypted WeChat ID
router.post('/:id/reveal-wechat', authenticate, async (req, res) => {
    try {
        const intro = await pool.query(`
            SELECT i.*, c.owner_a_id, c.owner_b_id
            FROM introductions i
            JOIN consents c ON i.consent_id = c.consent_id
            WHERE i.introduction_id = $1
        `, [req.params.id]);

        if (intro.rows.length === 0) return res.status(404).json({ error: 'Introduction not found' });

        const i = intro.rows[0];
        const isOwnerA = i.owner_a_id === req.userId;

        if (!isOwnerA && i.owner_b_id !== req.userId) {
            return res.status(403).json({ error: 'Access denied' });
        }

        // Decrypt the OTHER party's WeChat ID for this user
        const otherWechat = isOwnerA
            ? (i.owner_b_wechat_id ? crypto.decrypt(i.owner_b_wechat_id) : null)
            : (i.owner_a_wechat_id ? crypto.decrypt(i.owner_a_wechat_id) : null);

        res.json({ wechatId: otherWechat });
    } catch (err) {
        console.error('Error revealing WeChat ID:', err);
        res.status(500).json({ error: 'Failed to reveal WeChat ID' });
    }
});

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
