const express = require('express');
const router = express.Router();
const pool = require('../db');
const path = require('path');
const fs = require('fs');

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

// PUBLIC: GET /api/openclaw/skill/download - Download the OpenClaw skill package
router.get('/skill/download', (req, res) => {
    try {
        const skillPath = path.join(__dirname, '../../openclaw-skill/mollove-lobster');
        if (!fs.existsSync(skillPath)) {
            return res.status(404).json({ error: 'Skill package not found' });
        }

        // Read SKILL.md
        const skillContent = fs.readFileSync(path.join(skillPath, 'SKILL.md'), 'utf-8');

        // Parse frontmatter for metadata
        const frontmatterMatch = skillContent.match(/^---\n([\s\S]*?)\n---/);
        let metadata = {};
        if (frontmatterMatch) {
            const frontmatter = frontmatterMatch[1];
            const nameMatch = frontmatter.match(/name:\s*(.+)/);
            const versionMatch = frontmatter.match(/version:\s*(.+)/);
            const descMatch = frontmatter.match(/description:\s*(.+)/);
            if (nameMatch) metadata.name = nameMatch[1].trim();
            if (versionMatch) metadata.version = versionMatch[1].trim();
            if (descMatch) metadata.description = descMatch[1].trim();
        }

        // Generate the API URL from environment
        const apiUrl = process.env.MOLLOVE_API_URL || process.env.FRONTEND_URL || 'http://localhost:5173';
        const backendUrl = process.env.BACKEND_URL || 'http://localhost:3052';

        // Return skill info for the install page
        res.json({
            name: metadata.name || 'mollove_lobster',
            version: metadata.version || '1.0.0',
            description: metadata.description || 'MolLove Lobster AI agent skill',
            install_command: `curl -L ${backendUrl}/api/openclaw/skill/raw -o SKILL.md`,
            manual_url: `${backendUrl}/api/openclaw/skill/raw`,
            platform_url: apiUrl,
            setup_steps: [
                '1. Open your OpenClaw terminal',
                `2. Run: openclaw skills install mollove-lobster --source ${backendUrl}/api/openclaw/skill/raw`,
                '3. Or manually: Copy the SKILL.md content to ~/.openclaw/skills/mollove-lobster/',
                '4. Run /lobster-setup to start preference collection',
            ]
        });
    } catch (err) {
        console.error('Error fetching skill info:', err);
        res.status(500).json({ error: 'Failed to fetch skill package' });
    }
});

// PUBLIC: GET /api/openclaw/skill/raw - Download raw SKILL.md file
router.get('/skill/raw', (req, res) => {
    try {
        const skillPath = path.join(__dirname, '../../openclaw-skill/mollove-lobster/SKILL.md');
        if (!fs.existsSync(skillPath)) {
            return res.status(404).json({ error: 'Skill file not found' });
        }

        res.setHeader('Content-Type', 'text/markdown');
        res.setHeader('Content-Disposition', 'attachment; filename=SKILL.md');
        res.sendFile(skillPath);
    } catch (err) {
        console.error('Error serving skill file:', err);
        res.status(500).json({ error: 'Failed to serve skill file' });
    }
});

// POST /api/openclaw/collect-preferences - Submit preference collection results
router.post('/collect-preferences', authenticate, async (req, res) => {
    try {
        const {
            owner_values,
            owner_communication_style,
            owner_dating_goals,
            owner_lifestyle,
            owner_ideal_partner,
            dealbreaker_list
        } = req.body;

        // Get user's lobster
        const lobster = await pool.query(`SELECT lobster_id FROM lobsters WHERE owner_id = $1`, [req.userId]);
        if (lobster.rows.length === 0) {
            return res.status(404).json({ error: 'Lobster not found. Initialize first.' });
        }

        const lobsterId = lobster.rows[0].lobster_id;

        // Upsert preferences
        const result = await pool.query(`
            INSERT INTO lobster_preferences (
                lobster_id, owner_values, owner_communication_style,
                owner_dating_goals, owner_lifestyle, owner_ideal_partner,
                dealbreaker_list, last_updated_by, conversation_count, confidence_score
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, 'openclaw_skill',
                COALESCE((SELECT conversation_count + 1 FROM lobster_preferences WHERE lobster_id = $1), 1),
                LEAST(COALESCE((SELECT confidence_score FROM lobster_preferences WHERE lobster_id = $1), 0) + 0.2, 1.0)
            )
            ON CONFLICT (lobster_id) DO UPDATE SET
                owner_values = COALESCE(EXCLUDED.owner_values, lobster_preferences.owner_values),
                owner_communication_style = COALESCE(EXCLUDED.owner_communication_style, lobster_preferences.owner_communication_style),
                owner_dating_goals = COALESCE(EXCLUDED.owner_dating_goals, lobster_preferences.owner_dating_goals),
                owner_lifestyle = COALESCE(EXCLUDED.owner_lifestyle, lobster_preferences.owner_lifestyle),
                owner_ideal_partner = COALESCE(EXCLUDED.owner_ideal_partner, lobster_preferences.owner_ideal_partner),
                dealbreaker_list = COALESCE(EXCLUDED.dealbreaker_list, lobster_preferences.dealbreaker_list),
                last_updated_by = 'openclaw_skill',
                conversation_count = lobster_preferences.conversation_count + 1,
                confidence_score = LEAST(lobster_preferences.confidence_score + 0.2, 1.0),
                updated_at = NOW()
            RETURNING *
        `, [
            lobsterId,
            owner_values ? JSON.stringify(owner_values) : null,
            owner_communication_style ? JSON.stringify(owner_communication_style) : null,
            owner_dating_goals,
            owner_lifestyle ? JSON.stringify(owner_lifestyle) : null,
            owner_ideal_partner ? JSON.stringify(owner_ideal_partner) : null,
            dealbreaker_list
        ]);

        // Update lobster matching criteria from preferences
        if (result.rows[0].owner_values || result.rows[0].owner_ideal_partner) {
            await pool.query(`
                UPDATE lobsters SET matching_criteria = $1
                WHERE lobster_id = $2
            `, [JSON.stringify({
                dating_goals: result.rows[0].owner_dating_goals,
                values: result.rows[0].owner_values,
                dealbreakers: result.rows[0].dealbreaker_list
            }), lobsterId]);
        }

        res.json({ preferences: result.rows[0] });
    } catch (err) {
        console.error('Error collecting preferences:', err);
        res.status(500).json({ error: 'Failed to collect preferences' });
    }
});

// GET /api/openclaw/preferences - Get collected preferences
router.get('/preferences', authenticate, async (req, res) => {
    try {
        const lobster = await pool.query(`SELECT lobster_id FROM lobsters WHERE owner_id = $1`, [req.userId]);
        if (lobster.rows.length === 0) {
            return res.status(404).json({ error: 'Lobster not found' });
        }

        const result = await pool.query(`
            SELECT * FROM lobster_preferences WHERE lobster_id = $1
        `, [lobster.rows[0].lobster_id]);

        if (result.rows.length === 0) {
            return res.json({ preferences: null, message: 'No preferences collected yet' });
        }

        res.json({ preferences: result.rows[0] });
    } catch (err) {
        console.error('Error fetching preferences:', err);
        res.status(500).json({ error: 'Failed to fetch preferences' });
    }
});

// PUT /api/openclaw/preferences - Update preferences manually
router.put('/preferences', authenticate, async (req, res) => {
    try {
        const lobster = await pool.query(`SELECT lobster_id FROM lobsters WHERE owner_id = $1`, [req.userId]);
        if (lobster.rows.length === 0) {
            return res.status(404).json({ error: 'Lobster not found' });
        }

        const { owner_values, owner_communication_style, owner_dating_goals, owner_lifestyle, owner_ideal_partner, dealbreaker_list } = req.body;

        const result = await pool.query(`
            UPDATE lobster_preferences SET
                owner_values = COALESCE($2, owner_values),
                owner_communication_style = COALESCE($3, owner_communication_style),
                owner_dating_goals = COALESCE($4, owner_dating_goals),
                owner_lifestyle = COALESCE($5, owner_lifestyle),
                owner_ideal_partner = COALESCE($6, owner_ideal_partner),
                dealbreaker_list = COALESCE($7, dealbreaker_list),
                last_updated_by = 'manual',
                updated_at = NOW()
            WHERE lobster_id = $1
            RETURNING *
        `, [lobster.rows[0].lobster_id,
            owner_values ? JSON.stringify(owner_values) : null,
            owner_communication_style ? JSON.stringify(owner_communication_style) : null,
            owner_dating_goals,
            owner_lifestyle ? JSON.stringify(owner_lifestyle) : null,
            owner_ideal_partner ? JSON.stringify(owner_ideal_partner) : null,
            dealbreaker_list
        ]);

        res.json({ preferences: result.rows[0] });
    } catch (err) {
        console.error('Error updating preferences:', err);
        res.status(500).json({ error: 'Failed to update preferences' });
    }
});

// POST /api/openclaw/conversation - Start/continue preference collection session
router.post('/conversation', authenticate, async (req, res) => {
    try {
        const { user_message, session_id } = req.body;

        // Get lobster preferences context
        const lobster = await pool.query(`SELECT lobster_id FROM lobsters WHERE owner_id = $1`, [req.userId]);
        if (lobster.rows.length === 0) {
            return res.status(404).json({ error: 'Lobster not found' });
        }

        const prefs = await pool.query(`SELECT * FROM lobster_preferences WHERE lobster_id = $1`, [lobster.rows[0].lobster_id]);

        // Determine next question to ask based on collected preferences
        const p = prefs.rows[0] || {};
        const missingFields = [];
        if (!p.owner_dating_goals) missingFields.push('dating_goals');
        if (!p.owner_values) missingFields.push('values');
        if (!p.owner_lifestyle) missingFields.push('lifestyle');
        if (!p.owner_ideal_partner) missingFields.push('ideal_partner');
        if (!p.dealbreaker_list || p.dealbreaker_list.length === 0) missingFields.push('dealbreakers');

        // Generate next question via LLM or use template
        const nextQuestion = generateNextQuestion(missingFields, p);

        res.json({
            session_id: session_id || `sess_${Date.now()}`,
            next_question: nextQuestion,
            missing_fields: missingFields,
            completeness: Math.round(((5 - missingFields.length) / 5) * 100)
        });
    } catch (err) {
        console.error('Error in conversation:', err);
        res.status(500).json({ error: 'Conversation failed' });
    }
});

function generateNextQuestion(missingFields, prefs) {
    const questions = {
        dating_goals: '你对恋爱的期望是什么？是认真寻找长期关系，还是先随缘认识朋友？',
        values: '你认为在一段关系中最重要的是什么？比如真诚、共同成长、独立空间等？',
        lifestyle: '你理想的周末是什么样的？平时有什么爱好？',
        ideal_partner: '你理想中的另一半是什么样的？有哪些特质最吸引你？',
        dealbreakers: '有什么是你绝对不能接受的？比如抽烟、不诚实等？'
    };

    if (missingFields.length === 0) {
        return '你的偏好已经收集完整了！如果想更新，随时告诉我。';
    }

    return questions[missingFields[0]];
}

module.exports = router;
