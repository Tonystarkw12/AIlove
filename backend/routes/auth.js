const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../server'); // Assuming server.js exports pool
const { v4: uuidv4 } = require('uuid'); // For generating user_id if not handled by DB default
const { updateRecommendationsForUser } = require('../services/recommendationService');

const router = express.Router();

// POST /api/auth/register
router.post('/register', async (req, res) => {
    const { nickname, email, password } = req.body;

    if (!nickname || !email || !password) {
        return res.status(400).json({ error: { code: "INVALID_INPUT", message: "Nickname, email, and password are required." } });
    }
    if (password.length < 8) {
        return res.status(400).json({ error: { code: "INVALID_INPUT", message: "Password must be at least 8 characters long." } });
    }
    // Basic email validation
    if (!/\S+@\S+\.\S+/.test(email)) {
        return res.status(400).json({ error: { code: "INVALID_INPUT", message: "Invalid email format." } });
    }

    try {
        // Check if email or nickname already exists
        const existingUser = await pool.query(
            "SELECT * FROM users WHERE email = $1 OR nickname = $2",
            [email, nickname]
        );
        if (existingUser.rows.length > 0) {
            const conflictField = existingUser.rows[0].email === email ? "Email" : "Nickname";
            return res.status(409).json({ error: { code: "CONFLICT", message: `${conflictField} already exists.` } });
        }

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);
        const userId = uuidv4(); // Generate UUID for user_id

        const newUserQuery = `
            INSERT INTO users (user_id, nickname, email, password_hash, created_at, updated_at)
            VALUES ($1, $2, $3, $4, NOW(), NOW())
            RETURNING user_id, nickname, email, created_at;
        `;
        // Note: schema.sql uses gen_random_uuid() as default for user_id,
        // so explicitly providing user_id might be optional if DB handles it.
        // For consistency and to return it immediately, we generate and insert it.
        // If gen_random_uuid() is preferred, adjust query to not insert user_id and retrieve it.

        const result = await pool.query(newUserQuery, [userId, nickname, email, passwordHash]);
        const newUser = result.rows[0];

        // Generate JWT token
        const token = jwt.sign(
            { userId: newUser.user_id, email: newUser.email },
            process.env.JWT_SECRET,
            { expiresIn: '1h' } // Token expires in 1 hour, adjust as needed
        );

        res.status(201).json({
            userId: newUser.user_id,
            token: token,
            message: "User registered successfully"
        });

        // Trigger recommendation update asynchronously
        updateRecommendationsForUser(newUser.user_id).catch(err => {
            console.error(`Failed to trigger recommendation update for new user ${newUser.user_id}:`, err);
            // Decide if this failure should be communicated or just logged
        });

    } catch (error) {
        console.error("Registration error:", error);
        res.status(500).json({ error: { code: "INTERNAL_SERVER_ERROR", message: "An error occurred during registration." } });
    }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: { code: "INVALID_INPUT", message: "Email and password are required." } });
    }

    try {
        const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
        if (result.rows.length === 0) {
            return res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Invalid credentials." } });
        }

        const user = result.rows[0];
        const isMatch = await bcrypt.compare(password, user.password_hash);

        if (!isMatch) {
            return res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Invalid credentials." } });
        }

        const token = jwt.sign(
            { userId: user.user_id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        res.status(200).json({
            token: token,
            userId: user.user_id,
            nickname: user.nickname,
            message: "Login successful"
        });

    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ error: { code: "INTERNAL_SERVER_ERROR", message: "An error occurred during login." } });
    }
});

module.exports = router;
