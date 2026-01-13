const express = require('express');
const router = express.Router();
const pool = require('../db');
const authenticateToken = require('../middleware/authenticateToken');

/**
 * GET /api/spots/nearby
 * 获取附近的约会地点
 * Query: { lat: number, lng: number, radius_km: number (optional, default 10) }
 */
router.get('/nearby', authenticateToken, async (req, res) => {
    const { lat, lng, radius_km = 10 } = req.query;

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
        // 查询附近的约会地点
        const spotsQuery = `
            SELECT
                spot_id as "spotId",
                name,
                type,
                address,
                reward_points as "rewardPoints",
                description,
                ST_Y(location::geometry) as "lat",
                ST_X(location::geometry) as "lng",
                ST_Distance(
                    location,
                    ST_SetSRID(ST_MakePoint($1, $2), 4326)::GEOGRAPHY
                ) as distance_meters
            FROM dating_spots
            WHERE ST_DWithin(
                location,
                ST_SetSRID(ST_MakePoint($1, $2), 4326)::GEOGRAPHY,
                $3
            )
            ORDER BY location <-> ST_SetSRID(ST_MakePoint($1, $2), 4326)::GEOGRAPHY
            LIMIT 50;
        `;

        const result = await pool.query(
            spotsQuery,
            [longitude, latitude, radius * 1000]
        );

        const spots = result.rows.map(spot => ({
            spotId: spot.spotId,
            name: spot.name,
            type: spot.type,
            address: spot.address,
            rewardPoints: spot.rewardPoints,
            description: spot.description,
            location: {
                lat: spot.lat,
                lng: spot.lng
            },
            distance: {
                meters: Math.round(spot.distance_meters),
                kilometers: Math.round(spot.distance_meters / 100) / 10,
                text: formatDistance(spot.distance_meters)
            }
        }));

        res.status(200).json({
            spots: spots,
            count: spots.length,
            searchCenter: {
                lat: latitude,
                lng: longitude
            },
            searchRadius: {
                kilometers: radius
            }
        });

    } catch (error) {
        console.error('Get nearby spots error:', error);
        res.status(500).json({
            error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: '获取附近约会地点时发生错误'
            }
        });
    }
});

/**
 * GET /api/spots
 * 获取所有约会地点（支持分页和类型筛选）
 * Query: { type: string (optional), limit: number (optional), offset: number (optional) }
 */
router.get('/', authenticateToken, async (req, res) => {
    const { type, limit = 20, offset = 0 } = req.query;

    try {
        let whereClause = '';
        let queryParams = [];
        let paramIndex = 1;

        if (type) {
            whereClause = `WHERE type = $${paramIndex}`;
            queryParams.push(type);
            paramIndex++;
        }

        const spotsQuery = `
            SELECT
                spot_id as "spotId",
                name,
                type,
                address,
                reward_points as "rewardPoints",
                description,
                ST_Y(location::geometry) as "lat",
                ST_X(location::geometry) as "lng",
                created_at as "createdAt"
            FROM dating_spots
            ${whereClause}
            ORDER BY created_at DESC
            LIMIT $${paramIndex} OFFSET $${paramIndex + 1};
        `;

        queryParams.push(parseInt(limit), parseInt(offset));

        const result = await pool.query(spotsQuery, queryParams);

        const spots = result.rows.map(spot => ({
            spotId: spot.spotId,
            name: spot.name,
            type: spot.type,
            address: spot.address,
            rewardPoints: spot.rewardPoints,
            description: spot.description,
            location: {
                lat: spot.lat,
                lng: spot.lng
            },
            createdAt: spot.createdAt
        }));

        // 获取总数
        const countQuery = `
            SELECT COUNT(*) as total
            FROM dating_spots
            ${whereClause}
        `;

        const countResult = await pool.query(
            countQuery,
            type ? [type] : []
        );

        const total = parseInt(countResult.rows[0].total, 10);

        res.status(200).json({
            spots: spots,
            pagination: {
                total: total,
                limit: parseInt(limit),
                offset: parseInt(offset),
                hasMore: (parseInt(offset) + spots.length) < total
            }
        });

    } catch (error) {
        console.error('Get spots error:', error);
        res.status(500).json({
            error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: '获取约会地点列表时发生错误'
            }
        });
    }
});

/**
 * POST /api/spots
 * 创建新的约会地点（仅管理员可用，或者允许用户提交推荐）
 * Body: { name: string, lat: number, lng: number, type: string, address: string, rewardPoints: number, description: string }
 */
router.post('/', authenticateToken, async (req, res) => {
    const { name, lat, lng, type, address, rewardPoints, description } = req.body;

    // 验证输入
    if (!name || !lat || !lng || !type) {
        return res.status(400).json({
            error: {
                code: 'MISSING_REQUIRED_FIELDS',
                message: '缺少必要字段：name, lat, lng, type'
            }
        });
    }

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
        const createQuery = `
            INSERT INTO dating_spots (name, location, type, address, reward_points, description)
            VALUES (
                $1,
                ST_SetSRID(ST_MakePoint($2, $3), 4326)::GEOGRAPHY,
                $4,
                $5,
                $6,
                $7
            )
            RETURNING
                spot_id as "spotId",
                name,
                type,
                address,
                reward_points as "rewardPoints",
                description,
                ST_Y(location::geometry) as "lat",
                ST_X(location::geometry) as "lng",
                created_at as "createdAt"
        `;

        const result = await pool.query(
            createQuery,
            [
                name,
                lng,
                lat,
                type,
                address || null,
                rewardPoints || 50,
                description || null
            ]
        );

        const newSpot = result.rows[0];

        res.status(201).json({
            message: '约会地点创建成功',
            spot: {
                spotId: newSpot.spotId,
                name: newSpot.name,
                type: newSpot.type,
                address: newSpot.address,
                rewardPoints: newSpot.rewardPoints,
                description: newSpot.description,
                location: {
                    lat: newSpot.lat,
                    lng: newSpot.lng
                },
                createdAt: newSpot.createdAt
            }
        });

    } catch (error) {
        console.error('Create spot error:', error);
        res.status(500).json({
            error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: '创建约会地点时发生错误'
            }
        });
    }
});

/**
 * GET /api/spots/types
 * 获取所有约会地点类型
 */
router.get('/types', authenticateToken, async (req, res) => {
    try {
        // 返回预定义的地点类型列表
        const types = [
            { value: 'cafe', label: '咖啡馆', icon: '☕' },
            { value: 'restaurant', label: '餐厅', icon: '🍽️' },
            { value: 'park', label: '公园', icon: '🌳' },
            { value: 'cinema', label: '电影院', icon: '🎬' },
            { value: 'museum', label: '博物馆', icon: '🏛️' },
            { value: 'bookstore', label: '书店', icon: '📚' },
            { value: 'bar', label: '酒吧', icon: '🍺' },
            { value: 'gym', label: '健身房', icon: '💪' },
            { value: 'mall', label: '购物中心', icon: '🛍️' },
            { value: 'beach', label: '海滩', icon: '🏖️' },
            { value: 'arcade', label: '游戏厅', icon: '🎮' },
            { value: 'karaoke', label: 'KTV', icon: '🎤' }
        ];

        res.status(200).json({
            types: types
        });

    } catch (error) {
        console.error('Get spot types error:', error);
        res.status(500).json({
            error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: '获取地点类型时发生错误'
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
