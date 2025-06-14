const express = require('express');
const { pool } = require('../server');
const authenticateToken = require('../middleware/authenticateToken');

const router = express.Router();

// GET /api/recommendations - Fetches a list of recommended users
router.get('/', authenticateToken, async (req, res) => {
    const userId = req.user.userId; // Authenticated user
    const limit = parseInt(req.query.limit) || 10;
    const offset = parseInt(req.query.offset) || 0;
    // const filters = req.query.filters ? JSON.parse(req.query.filters) : {}; // Placeholder for future advanced filters

    try {
        // Fetch recommendations from the 'recommendations' table, ordered by match_score
        // Join with 'users' table to get profile details of the recommended user
        const recommendationsQuery = `
            SELECT 
                r.recommended_user_id as "userId",
                u.nickname as "name", 
                EXTRACT(YEAR FROM AGE(u.birth_date)) as age,
                u.occupation,
                u.bio,
                u.avatar_url as "imageUrl",
                r.match_score as "recommendationScore",
                r.match_reason, -- Include match_reason
                r.icebreakers   -- Include icebreakers
            FROM recommendations r
            JOIN users u ON r.recommended_user_id = u.user_id
            WHERE r.recommending_user_id = $1
            ORDER BY r.match_score DESC, r.last_calculated DESC
            LIMIT $2 OFFSET $3;
        `;

        const result = await pool.query(recommendationsQuery, [userId, limit, offset]);
        const recommendations = result.rows;

        // Get total count of recommendations for pagination
        const totalCountResult = await pool.query(
            "SELECT COUNT(*) FROM recommendations WHERE recommending_user_id = $1",
            [userId]
        );
        const totalCount = parseInt(totalCountResult.rows[0].count, 10);
        const nextOffset = (offset + limit < totalCount) ? offset + limit : null;

        res.status(200).json({
            recommendations: recommendations,
            totalCount: totalCount,
            nextOffset: nextOffset
        });

    } catch (error) {
        console.error("Get recommendations error:", error);
        // if (error instanceof SyntaxError) { // Check if error is due to JSON.parse on filters
        //     return res.status(400).json({ error: { code: "INVALID_INPUT", message: "Invalid filters format. Must be a valid JSON string." } });
        // }
        res.status(500).json({ error: { code: "INTERNAL_SERVER_ERROR", message: "An error occurred while fetching recommendations." } });
    }
});

module.exports = router;
