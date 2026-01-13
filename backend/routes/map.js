const express = require('express');
const router = express.Router();
const pool = require('../db');
const authenticateToken = require('../middleware/authenticateToken');
const { calculateMatchScore } = require('../services/matchingAlgorithm'); // Phase 3: AI 匹配算法

/**
 * POST /api/map/update-location
 * 更新当前用户的地理位置
 * Body: { lat: number, lng: number }
 */
router.post('/update-location', authenticateToken, async (req, res) => {
    const { lat, lng } = req.body;
    const userId = req.user.userId;

    // 验证输入
    if (typeof lat !== 'number' || typeof lng !== 'number') {
        return res.status(400).json({
            error: {
                code: 'INVALID_COORDINATES',
                message: '经纬度必须是数字'
            }
        });
    }

    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        return res.status(400).json({
            error: {
                code: 'COORDINATES_OUT_OF_RANGE',
                message: '纬度范围 -90 到 90，经度范围 -180 到 180'
            }
        });
    }

    try {
        // 使用 PostGIS ST_SetSRDI 和 ST_MakePoint 更新位置
        const query = `
            UPDATE users
            SET
                location = ST_SetSRID(ST_MakePoint($1, $2), 4326)::GEOGRAPHY,
                location_latitude = $2,
                location_longitude = $1,
                updated_at = NOW()
            WHERE user_id = $3
            RETURNING
                location_latitude,
                location_longitude,
                updated_at
        `;

        const result = await pool.query(query, [lng, lat, userId]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: {
                    code: 'USER_NOT_FOUND',
                    message: '用户不存在'
                }
            });
        }

        res.status(200).json({
            message: '位置更新成功',
            data: {
                latitude: result.rows[0].location_latitude,
                longitude: result.rows[0].location_longitude,
                updatedAt: result.rows[0].updated_at
            }
        });

    } catch (error) {
        console.error('Update location error:', error);
        res.status(500).json({
            error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: '更新位置时发生错误'
            }
        });
    }
});

/**
 * GET /api/map/nearby
 * 查询半径内的异性用户（Phase 3: 只显示匹配分数 > 70 的用户）
 * Query: { lat: number, lng: number, radius_km: number (optional, default 5), min_score: number (optional, default 70) }
 */
router.get('/nearby', authenticateToken, async (req, res) => {
    const userId = req.user.userId;
    const { lat, lng, radius_km = 5, min_score = 70 } = req.query;

    // 验证输入
    if (!lat || !lng) {
        return res.status(400).json({
            error: {
                code: 'MISSING_COORDINATES',
                message: '必须提供经纬度参数'
            }
        });
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);
    const radius = parseFloat(radius_km);

    if (isNaN(latitude) || isNaN(longitude) || isNaN(radius)) {
        return res.status(400).json({
            error: {
                code: 'INVALID_PARAMETERS',
                message: '经纬度和半径必须是有效数字'
            }
        });
    }

    try {
        // 首先获取当前用户的性别，用于筛选异性
        const userQuery = `
            SELECT gender, preferred_age_min, preferred_age_max, preferred_gender
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

        const currentUser = userResult.rows[0];

        // 构建查询条件
        let whereConditions = [
            'u.user_id != $1', // 排除自己
            'u.location IS NOT NULL', // 必须有位置信息
            "u.gender != $2", // 异性（如果当前用户有性别信息）
            'ST_DWithin(u.location, ST_SetSRID(ST_MakePoint($3, $4), 4326)::GEOGRAPHY, $5)' // 距离筛选
        ];

        let queryParams = [userId, currentUser.gender || '', longitude, latitude, radius * 1000]; // radius_km 转换为米

        // 添加性别偏好筛选
        let paramIndex = 6;
        if (currentUser.preferred_gender) {
            whereConditions.push(`u.gender = $${paramIndex}`);
            queryParams.push(currentUser.preferred_gender);
            paramIndex++;
        }

        // 添加年龄偏好筛选
        if (currentUser.preferred_age_min || currentUser.preferred_age_max) {
            const ageCondition = [];
            if (currentUser.preferred_age_min) {
                ageCondition.push(`EXTRACT(YEAR FROM AGE(u.birth_date)) >= $${paramIndex}`);
                queryParams.push(currentUser.preferred_age_min);
                paramIndex++;
            }
            if (currentUser.preferred_age_max) {
                ageCondition.push(`EXTRACT(YEAR FROM AGE(u.birth_date)) <= $${paramIndex}`);
                queryParams.push(currentUser.preferred_age_max);
                paramIndex++;
            }
            whereConditions.push(`(${ageCondition.join(' AND ')})`);
        }

        // 主查询：获取附近用户
        const nearbyQuery = `
            SELECT
                u.user_id as "userId",
                u.nickname,
                EXTRACT(YEAR FROM AGE(u.birth_date)) as age,
                u.gender,
                u.occupation,
                u.bio,
                u.avatar_url as "imageUrl",
                u.tags,
                u.location,
                ST_Distance(
                    u.location,
                    ST_SetSRID(ST_MakePoint($3, $4), 4326)::GEOGRAPHY
                ) as distance_meters,
                u.level,
                u.points
            FROM users u
            WHERE ${whereConditions.join(' AND ')}
            ORDER BY u.location <-> ST_SetSRID(ST_MakePoint($3, $4), 4326)::GEOGRAPHY
            LIMIT 50;
        `;

        const nearbyResult = await pool.query(nearbyQuery, queryParams);

        // Phase 3: 计算每个附近用户的匹配分数，并筛选
        const usersWithScores = await Promise.all(
            nearbyResult.rows.map(async (user) => {
                const matchScore = await calculateMatchScore(userId, user.userId);
                return {
                    ...user,
                    matchScore
                };
            })
        );

        // 筛选匹配分数 >= min_score 的用户
        const filteredUsers = usersWithScores.filter(user => user.matchScore >= parseInt(min_score));

        // 格式化返回结果
        const nearbyUsers = filteredUsers.map(user => ({
            userId: user.userId,
            nickname: user.nickname,
            age: Math.floor(user.age) || null,
            gender: user.gender,
            occupation: user.occupation,
            bio: user.bio,
            imageUrl: user.imageUrl,
            tags: user.tags || [],
            location: {
                lat: user.latitude,
                lng: user.longitude
            },
            distance: {
                meters: Math.round(user.distance_meters),
                kilometers: Math.round(user.distance_meters / 100) / 10, // 保留一位小数
                text: formatDistance(user.distance_meters)
            },
            level: user.level || 1,
            points: user.points || 0,
            matchScore: user.matchScore // Phase 3: 添加匹配分数
        }));

        res.status(200).json({
            nearbyUsers: nearbyUsers,
            count: nearbyUsers.length,
            searchRadius: {
                kilometers: radius,
                center: {
                    lat: latitude,
                    lng: longitude
                }
            },
            filter: {
                minScore: parseInt(min_score),
                description: `只显示匹配分数 >= ${min_score} 分的用户`
            }
        });

    } catch (error) {
        console.error('Get nearby users error:', error);
        res.status(500).json({
            error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: '获取附近用户时发生错误'
            }
        });
    }
});

/**
 * 格式化距离显示文本
 * @param {number} meters - 距离（米）
 * @returns {string} 格式化后的距离文本
 */
function formatDistance(meters) {
    if (meters < 1000) {
        return `${Math.round(meters)}m`;
    } else {
        return `${(meters / 1000).toFixed(1)}km`;
    }
}

module.exports = router;
