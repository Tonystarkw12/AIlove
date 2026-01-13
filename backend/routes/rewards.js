const express = require('express');
const router = express.Router();
const pool = require('../db');
const authenticateToken = require('../middleware/authenticateToken');

/**
 * POST /api/rewards/daily-login
 * 领取每日登录奖励
 */
router.post('/daily-login', authenticateToken, async (req, res) => {
    const userId = req.user.userId;
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    try {
        // 检查今天是否已经领取过
        const userQuery = `
            SELECT last_login_date, points, level
            FROM users
            WHERE user_id = $1
        `;

        const userResult = await pool.query(userQuery, [userId]);

        if (userResult.rows.length === 0) {
            return res.status(404).json({
                error: {
                    code: 'USER_NOT_FOUND',
                    message: '用户不存在'
                }
            });
        }

        const user = userResult.rows[0];

        // 检查是否已经领取过今天的奖励
        if (user.last_login_date === today) {
            return res.status(400).json({
                error: {
                    code: 'ALREADY_CLAIMED',
                    message: '今天已经领取过登录奖励了'
                }
            });
        }

        // 计算奖励（根据等级有不同的奖励倍率）
        const baseReward = 10;
        const levelBonus = Math.floor(user.level / 10) * 5; // 每10级额外奖励5积分
        const totalReward = baseReward + levelBonus;

        // 更新用户积分和最后登录日期
        const updateQuery = `
            UPDATE users
            SET
                points = points + $1,
                last_login_date = $2,
                updated_at = NOW()
            WHERE user_id = $3
            RETURNING points, level, last_login_date
        `;

        const updateResult = await pool.query(updateQuery, [totalReward, today, userId]);
        const updatedUser = updateResult.rows[0];

        // 检查是否升级
        const newLevel = calculateLevel(updatedUser.points);
        let leveledUp = false;

        if (newLevel > updatedUser.level) {
            // 更新等级
            await pool.query(
                'UPDATE users SET level = $1 WHERE user_id = $2',
                [newLevel, userId]
            );
            updatedUser.level = newLevel;
            leveledUp = true;
        }

        res.status(200).json({
            message: '登录奖励领取成功！',
            reward: {
                points: totalReward,
                baseReward: baseReward,
                levelBonus: levelBonus
            },
            user: {
                points: updatedUser.points,
                level: updatedUser.level,
                lastLoginDate: updatedUser.last_login_date
            },
            leveledUp: leveledUp
        });

    } catch (error) {
        console.error('Daily login reward error:', error);
        res.status(500).json({
            error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: '领取登录奖励时发生错误'
            }
        });
    }
});

/**
 * POST /api/rewards/complete-profile
 * 完善资料奖励
 * Body: { completedFields: string[] }
 */
router.post('/complete-profile', authenticateToken, async (req, res) => {
    const userId = req.user.userId;
    const { completedFields } = req.body;

    // 验证输入
    if (!Array.isArray(completedFields) || completedFields.length === 0) {
        return res.status(400).json({
            error: {
                code: 'INVALID_FIELDS',
                message: '必须提供完善的字段列表'
            }
        });
    }

    try {
        // 计算奖励积分（每个字段 5 积分，最多 50 积分）
        const baseReward = Math.min(completedFields.length * 5, 50);

        // 更新用户积分
        const updateQuery = `
            UPDATE users
            SET points = points + $1, updated_at = NOW()
            WHERE user_id = $2
            RETURNING points, level
        `;

        const result = await pool.query(updateQuery, [baseReward, userId]);
        const user = result.rows[0];

        // 检查是否升级
        const newLevel = calculateLevel(user.points);
        let leveledUp = false;

        if (newLevel > user.level) {
            await pool.query(
                'UPDATE users SET level = $1 WHERE user_id = $2',
                [newLevel, userId]
            );
            leveledUp = true;
        }

        res.status(200).json({
            message: '资料完善奖励领取成功！',
            reward: {
                points: baseReward,
                fieldsCompleted: completedFields.length
            },
            user: {
                points: user.points,
                level: newLevel
            },
            leveledUp: leveledUp
        });

    } catch (error) {
        console.error('Complete profile reward error:', error);
        res.status(500).json({
            error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: '领取资料完善奖励时发生错误'
            }
        });
    }
});

/**
 * GET /api/rewards/leaderboard
 * 获取积分排行榜
 * Query: { limit: number (optional), offset: number (optional) }
 */
router.get('/leaderboard', authenticateToken, async (req, res) => {
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;

    try {
        const query = `
            SELECT
                user_id as "userId",
                nickname,
                avatar_url as "avatarUrl",
                points,
                level,
                EXTRACT(YEAR FROM AGE(birth_date)) as age
            FROM users
            ORDER BY points DESC, level DESC
            LIMIT $1 OFFSET $2
        `;

        const result = await pool.query(query, [limit, offset]);
        const leaderboard = result.rows;

        // 获取当前用户的排名
        const userId = req.user.userId;
        const rankQuery = `
            SELECT COUNT(*) + 1 as rank
            FROM users
            WHERE points > (SELECT points FROM users WHERE user_id = $1)
        `;

        const rankResult = await pool.query(rankQuery, [userId]);
        const currentRank = parseInt(rankResult.rows[0].rank, 10);

        res.status(200).json({
            leaderboard: leaderboard,
            pagination: {
                limit: limit,
                offset: offset,
                hasMore: leaderboard.length === limit
            },
            currentUser: {
                rank: currentRank
            }
        });

    } catch (error) {
        console.error('Get leaderboard error:', error);
        res.status(500).json({
            error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: '获取排行榜时发生错误'
            }
        });
    }
});

/**
 * GET /api/rewards/my
 * 获取当前用户的积分信息
 */
router.get('/my', authenticateToken, async (req, res) => {
    const userId = req.user.userId;

    try {
        const query = `
            SELECT
                user_id as "userId",
                nickname,
                points,
                level,
                last_login_date as "lastLoginDate",
                created_at as "joinedAt"
            FROM users
            WHERE user_id = $1
        `;

        const result = await pool.query(query, [userId]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: {
                    code: 'USER_NOT_FOUND',
                    message: '用户不存在'
                }
            });
        }

        const user = result.rows[0];

        // 计算下一等级所需的积分
        const nextLevelPoints = calculateLevelRequirements(user.level + 1);
        const currentLevelPoints = calculateLevelRequirements(user.level);
        const progress = user.points - currentLevelPoints;
        const needed = nextLevelPoints - user.points;
        const progressPercentage = Math.round((progress / (nextLevelPoints - currentLevelPoints)) * 100);

        // 检查今天是否已领取登录奖励
        const today = new Date().toISOString().split('T')[0];
        const canClaimDaily = user.lastLoginDate !== today;

        res.status(200).json({
            user: user,
            level: {
                current: user.level,
                nextLevel: user.level + 1,
                progress: {
                    points: progress,
                    needed: needed,
                    percentage: progressPercentage
                }
            },
            rewards: {
                canClaimDaily: canClaimDaily
            }
        });

    } catch (error) {
        console.error('Get user rewards error:', error);
        res.status(500).json({
            error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: '获取用户积分信息时发生错误'
            }
        });
    }
});

/**
 * POST /api/rewards/unlock-photo
 * 使用积分解锁用户照片（透视镜道具）
 * Body: { targetUserId: string }
 */
router.post('/unlock-photo', authenticateToken, async (req, res) => {
    const userId = req.user.userId;
    const { targetUserId } = req.body;

    // 验证输入
    if (!targetUserId) {
        return res.status(400).json({
            error: {
                code: 'MISSING_TARGET_USER',
                message: '必须提供目标用户 ID'
            }
        });
    }

    const COST = 50; // 解锁照片消耗 50 积分

    try {
        // 检查当前用户积分是否足够
        const userQuery = `
            SELECT points
            FROM users
            WHERE user_id = $1
        `;

        const userResult = await pool.query(userQuery, [userId]);

        if (userResult.rows.length === 0) {
            return res.status(404).json({
                error: {
                    code: 'USER_NOT_FOUND',
                    message: '用户不存在'
                }
            });
        }

        const currentPoints = userResult.rows[0].points;

        if (currentPoints < COST) {
            return res.status(400).json({
                error: {
                    code: 'INSUFFICIENT_POINTS',
                    message: `积分不足，需要 ${COST} 积分`
                },
                required: COST,
                current: currentPoints
            });
        }

        // 扣除积分
        await pool.query(
            'UPDATE users SET points = points - $1 WHERE user_id = $2',
            [COST, userId]
        );

        // 获取目标用户的照片
        const photosQuery = `
            SELECT url, is_unlocked
            FROM user_photos
            WHERE user_id = $1
            ORDER BY uploaded_at DESC
        `;

        const photosResult = await pool.query(photosQuery, [targetUserId]);
        const photos = photosResult.rows;

        // TODO: 这里可以添加记录解锁历史的功能
        // 或者实现一次性解锁，之后永久可见

        res.status(200).json({
            message: '照片解锁成功！',
            cost: COST,
            remainingPoints: currentPoints - COST,
            photos: photos
        });

    } catch (error) {
        console.error('Unlock photo error:', error);
        res.status(500).json({
            error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: '解锁照片时发生错误'
            }
        });
    }
});

/**
 * POST /api/rewards/mind-reading
 * 使用积分查看用户的详细回答（心灵感应道具）
 * Body: { targetUserId: string }
 */
router.post('/mind-reading', authenticateToken, async (req, res) => {
    const userId = req.user.userId;
    const { targetUserId } = req.body;

    // 验证输入
    if (!targetUserId) {
        return res.status(400).json({
            error: {
                code: 'MISSING_TARGET_USER',
                message: '必须提供目标用户 ID'
            }
        });
    }

    const COST = 30; // 心灵感应消耗 30 积分

    try {
        // 检查当前用户积分是否足够
        const userQuery = `
            SELECT points
            FROM users
            WHERE user_id = $1
        `;

        const userResult = await pool.query(userQuery, [userId]);

        if (userResult.rows.length === 0) {
            return res.status(404).json({
                error: {
                    code: 'USER_NOT_FOUND',
                    message: '用户不存在'
                }
            });
        }

        const currentPoints = userResult.rows[0].points;

        if (currentPoints < COST) {
            return res.status(400).json({
                error: {
                    code: 'INSUFFICIENT_POINTS',
                    message: `积分不足，需要 ${COST} 积分`
                },
                required: COST,
                current: currentPoints
            });
        }

        // 扣除积分
        await pool.query(
            'UPDATE users SET points = points - $1 WHERE user_id = $2',
            [COST, userId]
        );

        // 获取目标用户的 Q&A
        const qaQuery = `
            SELECT q_and_a
            FROM users
            WHERE user_id = $1
        `;

        const qaResult = await pool.query(qaQuery, [targetUserId]);

        if (qaResult.rows.length === 0) {
            return res.status(404).json({
                error: {
                    code: 'TARGET_USER_NOT_FOUND',
                    message: '目标用户不存在'
                }
            });
        }

        const qAndA = qaResult.rows[0].q_and_a || {};

        res.status(200).json({
            message: '心灵感应成功！',
            cost: COST,
            remainingPoints: currentPoints - COST,
            qAndA: qAndA
        });

    } catch (error) {
        console.error('Mind reading error:', error);
        res.status(500).json({
            error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: '心灵感应时发生错误'
            }
        });
    }
});

/**
 * 计算等级
 * @param {number} points - 积分
 * @returns {number} 等级
 */
function calculateLevel(points) {
    // 等级计算公式：每 100 积分升 1 级
    return Math.floor(points / 100) + 1;
}

/**
 * 计算达到指定等级所需的积分
 * @param {number} level - 等级
 * @returns {number} 所需积分
 */
function calculateLevelRequirements(level) {
    // 等级 1 需要 0 积分，等级 2 需要 100 积分，以此类推
    return (level - 1) * 100;
}

module.exports = router;
