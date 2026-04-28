const express = require('express');
const router = express.Router();
const pool = require('../db');
const lobsterOrchestrator = require('../services/lobsterOrchestrator');

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

// GET /api/consents/pending - List pending consent requests
router.get('/pending', authenticate, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT c.*, lc.compatibility_score, lc.compatibility_analysis,
                   u.nickname as other_owner_name
            FROM consents c
            JOIN lobster_chats lc ON c.chat_id = lc.chat_id
            JOIN users u ON (u.user_id = c.owner_a_id OR u.user_id = c.owner_b_id) AND u.user_id != $1
            WHERE (c.owner_a_id = $1 OR c.owner_b_id = $1)
            AND (c.owner_a_wechat_consent IS NULL OR c.owner_b_wechat_consent IS NULL)
            AND c.owner_a_revoked = FALSE AND c.owner_b_revoked = FALSE
            ORDER BY c.created_at DESC
        `, [req.userId]);

        res.json({ consents: result.rows });
    } catch (err) {
        console.error('Error fetching pending consents:', err);
        res.status(500).json({ error: 'Failed to fetch pending consents' });
    }
});

// POST /api/consents/:consentId/respond - Respond to consent request
router.post('/:consentId/respond', authenticate, async (req, res) => {
    try {
        const { response } = req.body;
        if (!['approved', 'declined'].includes(response)) {
            return res.status(400).json({ error: 'Response must be "approved" or "declined"' });
        }

        const consent = await pool.query(`SELECT * FROM consents WHERE consent_id = $1`, [req.params.consentId]);
        if (consent.rows.length === 0) return res.status(404).json({ error: 'Consent not found' });

        const c = consent.rows[0];
        const isOwnerA = c.owner_a_id === req.userId;

        const consentAt = new Date();
        if (isOwnerA) {
            await pool.query(`
                UPDATE consents SET owner_a_wechat_consent = $1, owner_a_consent_at = $2
                WHERE consent_id = $3
            `, [response === 'approved', consentAt, req.params.consentId]);
        } else {
            await pool.query(`
                UPDATE consents SET owner_b_wechat_consent = $1, owner_b_consent_at = $2
                WHERE consent_id = $3
            `, [response === 'approved', consentAt, req.params.consentId]);
        }

        // If both approved, facilitate introduction
        if (response === 'approved') {
            const updated = await pool.query(`SELECT * FROM consents WHERE consent_id = $1`, [req.params.consentId]);
            const u = updated.rows[0];
            if (u.owner_a_wechat_consent && u.owner_b_wechat_consent && !u.wechat_exchanged) {
                const intro = await lobsterOrchestrator.facilitateIntroduction(req.params.consentId);
                return res.json({ consented: true, introduction: intro });
            }
        }

        res.json({ consented: response === 'approved', waitingForOther: true });
    } catch (err) {
        console.error('Error responding to consent:', err);
        res.status(500).json({ error: 'Failed to respond to consent' });
    }
});

// POST /api/consents/:consentId/revoke - Revoke consent
router.post('/:consentId/revoke', authenticate, async (req, res) => {
    try {
        const consent = await pool.query(`SELECT * FROM consents WHERE consent_id = $1`, [req.params.consentId]);
        if (consent.rows.length === 0) return res.status(404).json({ error: 'Consent not found' });

        const c = consent.rows[0];
        const isOwnerA = c.owner_a_id === req.userId;
        const revokedAt = new Date();

        if (isOwnerA) {
            await pool.query(`
                UPDATE consents SET owner_a_revoked = TRUE, owner_a_revoked_at = $1
                WHERE consent_id = $2
            `, [revokedAt, req.params.consentId]);
        } else {
            await pool.query(`
                UPDATE consents SET owner_b_revoked = TRUE, owner_b_revoked_at = $1
                WHERE consent_id = $2
            `, [revokedAt, req.params.consentId]);
        }

        res.json({ revoked: true });
    } catch (err) {
        console.error('Error revoking consent:', err);
        res.status(500).json({ error: 'Failed to revoke consent' });
    }
});

// GET /api/consents/history - Get consent history
router.get('/history', authenticate, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT c.*, lc.compatibility_score,
                   ua.nickname as owner_a_name, ub.nickname as owner_b_name
            FROM consents c
            JOIN lobster_chats lc ON c.chat_id = lc.chat_id
            JOIN users ua ON c.owner_a_id = ua.user_id
            JOIN users ub ON c.owner_b_id = ub.user_id
            WHERE c.owner_a_id = $1 OR c.owner_b_id = $1
            ORDER BY c.created_at DESC
        `, [req.userId]);

        res.json({ consents: result.rows });
    } catch (err) {
        console.error('Error fetching consent history:', err);
        res.status(500).json({ error: 'Failed to fetch consent history' });
    }
});

module.exports = router;
