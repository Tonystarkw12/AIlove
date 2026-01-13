const express = require('express');
const router = express.Router();
const pool = require('../db');
const authenticateToken = require('../middleware/authenticateToken');
const {
    calculateMatchScore,
    generateMatchReason,
    generateIcebreakers
} = require('../services/matchingAlgorithm');

/**
 * POST /api/recommendations/calculate
 * 为当前用户重新计算所有推荐
 * Body: { limit: number (optional) }
 */
router.post('/calculate', authenticateToken, async (req, res) => {
    const userId = req.user.userId;
    const { limit = 50 } = req.body;

    try {
        // 获取当前用户信息
        const currentUserQuery = `
            SELECT
                user_id,
                gender,
                preferred_gender,
                preferred_age_min,
                preferred_age_max,
                location
            FROM users
            WHERE user_id = $1
        `;

        const currentUserResult = await pool.query(currentUserQuery, [userId]);

        if (currentUserResult.rows.length === 0) {
            return res.status(404).json({
                error: {
                    code: 'USER_NOT_FOUND',
                    message: '用户不存在'
                }
            });
        }

        const currentUser = currentUserResult.rows[0];

        // 构建候选用户查询条件
        let whereConditions = [
            'u.user_id != $1', // 排除自己
        ];

        let queryParams = [userId];
        let paramIndex = 2;

        // 性别筛选
        if (currentUser.preferred_gender) {
            whereConditions.push(`u.gender = $${paramIndex}`);
            queryParams.push(currentUser.preferred_gender);
            paramIndex++;
        } else if (currentUser.gender) {
            // 默认显示异性
            whereConditions.push(`u.gender != $${paramIndex}`);
            queryParams.push(currentUser.gender);
            paramIndex++;
        }

        // 年龄筛选
        if (currentUser.preferred_age_min || currentUser.preferred_age_max) {
            const ageConditions = [];
            if (currentUser.preferred_age_min) {
                ageConditions.push(`EXTRACT(YEAR FROM AGE(u.birth_date)) >= $${paramIndex}`);
                queryParams.push(currentUser.preferred_age_min);
                paramIndex++;
            }
            if (currentUser.preferred_age_max) {
                ageConditions.push(`EXTRACT(YEAR FROM AGE(u.birth_date)) <= $${paramIndex}`);
                queryParams.push(currentUser.preferred_age_max);
                paramIndex++;
            }
            whereConditions.push(`(${ageConditions.join(' AND ')})`);
        }

        // 查询候选用户
        const candidatesQuery = `
            SELECT
                u.user_id,
                u.gender,
                u.birth_date,
                u.location,
                u.location_latitude,
                u.location_longitude,
                u.tags,
                u.values_description,
                u.q_and_a
            FROM users u
            WHERE ${whereConditions.join(' AND ')}
            LIMIT $${paramIndex}
        `;

        queryParams.push(parseInt(limit));

        const candidatesResult = await pool.query(candidatesQuery, queryParams);
        const candidates = candidatesResult.rows;

        if (candidates.length === 0) {
            return res.status(200).json({
                message: '没有找到匹配的用户',
                calculated: 0
            });
        }

        // 计算每个候选用户的匹配分数
        const calculations = candidates.map(async (candidate) => {
            const matchScore = await calculateMatchScore(userId, candidate.user_id);
            const matchReason = await generateMatchReason(matchScore, currentUser, candidate);
            const icebreakers = generateIcebreakers(currentUser, candidate);

            return {
                userId: candidate.user_id,
                matchScore,
                matchReason,
                icebreakers
            };
        });

        const results = await Promise.all(calculations);

        // 删除旧的推荐记录
        await pool.query(
            'DELETE FROM recommendations WHERE recommending_user_id = $1',
            [userId]
        );

        // 批量插入新的推荐记录
        const insertQuery = `
            INSERT INTO recommendations (
                recommending_user_id,
                recommended_user_id,
                match_score,
                match_reason,
                icebreakers
            )
            VALUES ${results.map((_, i) => `($1, $${i * 4 + 2}, $${i * 4 + 3}, $${i * 4 + 4}, $${i * 4 + 5})`).join(', ')}
        `;

        const insertParams = [userId];
        results.forEach(result => {
            insertParams.push(result.userId);
            insertParams.push(result.matchScore);
            insertParams.push(result.matchReason);
            insertParams.push(JSON.stringify(result.icebreakers));
        });

        await pool.query(insertQuery, insertParams);

        res.status(200).json({
            message: '推荐计算完成',
            calculated: results.length,
            results: results
        });

    } catch (error) {
        console.error('Calculate recommendations error:', error);
        res.status(500).json({
            error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: '计算推荐时发生错误'
            }
        });
    }
});

/**
 * GET /api/recommendations - Fetches a list of recommended users
 */
router.get('/', authenticateToken, async (req, res) => {
    const userId = req.user.userId;
    const limit = parseInt(req.query.limit) || 10;
    const offset = parseInt(req.query.offset) || 0;
    const minScore = parseInt(req.query.min_score) || 0; // Phase 3: 最低分数筛选

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
            AND r.match_score >= $2
            ORDER BY r.match_score DESC, r.last_calculated DESC
            LIMIT $3 OFFSET $4;
        `;

        const result = await pool.query(recommendationsQuery, [userId, minScore, limit, offset]);
        const recommendations = result.rows;

        // Get total count of recommendations for pagination
        const totalCountResult = await pool.query(
            "SELECT COUNT(*) FROM recommendations WHERE recommending_user_id = $1 AND match_score >= $2",
            [userId, minScore]
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
        res.status(500).json({ error: { code: "INTERNAL_SERVER_ERROR", message: "An error occurred while fetching recommendations." } });
    }
});

/**
 * GET /api/recommendations/user/:userId
 * 获取与特定用户的匹配分数
 */
router.get('/user/:userId', authenticateToken, async (req, res) => {
    const currentUserId = req.user.userId;
    const targetUserId = req.params.userId;

    try {
        // 检查是否已有计算好的推荐
        const existingQuery = `
            SELECT
                match_score as "matchScore",
                match_reason as "matchReason",
                icebreakers
            FROM recommendations
            WHERE recommending_user_id = $1 AND recommended_user_id = $2
        `;

        const existingResult = await pool.query(existingQuery, [currentUserId, targetUserId]);

        if (existingResult.rows.length > 0) {
            return res.status(200).json({
                matchScore: existingResult.rows[0].matchScore,
                matchReason: existingResult.rows[0].matchReason,
                icebreakers: existingResult.rows[0].icebreakers
            });
        }

        // 如果没有，实时计算
        const matchScore = await calculateMatchScore(currentUserId, targetUserId);

        // 获取用户信息用于生成原因和话题
        const usersQuery = `
            SELECT user_id, tags, values_description, q_and_a
            FROM users
            WHERE user_id IN ($1, $2)
        `;

        const usersResult = await pool.query(usersQuery, [currentUserId, targetUserId]);
        const users = usersResult.rows;
        const currentUser = users.find(u => u.user_id === currentUserId);
        const targetUser = users.find(u => u.user_id === targetUserId);

        const matchReason = await generateMatchReason(matchScore, currentUser, targetUser);
        const icebreakers = generateIcebreakers(currentUser, targetUser);

        // 保存到数据库
        await pool.query(
            `INSERT INTO recommendations (recommending_user_id, recommended_user_id, match_score, match_reason, icebreakers)
             VALUES ($1, $2, $3, $4, $5)`,
            [currentUserId, targetUserId, matchScore, matchReason, JSON.stringify(icebreakers)]
        );

        res.status(200).json({
            matchScore,
            matchReason,
            icebreakers
        });

    } catch (error) {
        console.error('Get user match score error:', error);
        res.status(500).json({
            error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: '获取匹配分数时发生错误'
            }
        });
    }
});

module.exports = router;
