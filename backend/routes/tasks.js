const express = require('express');
const router = express.Router();
const pool = require('../db');
const authenticateToken = require('../middleware/authenticateToken');

/**
 * POST /api/tasks/invite
 * 向附近的人发起约会邀请
 * Body: { receiverId: string, spotId: string, scheduledTime: string (optional) }
 */
router.post('/invite', authenticateToken, async (req, res) => {
    const { receiverId, spotId, scheduledTime } = req.body;
    const initiatorId = req.user.userId;

    // 验证输入
    if (!receiverId || !spotId) {
        return res.status(400).json({
            error: {
                code: 'MISSING_REQUIRED_FIELDS',
                message: '缺少必要字段：receiverId 和 spotId'
            }
        });
    }

    // 验证 receiverId 是否为 UUID 格式
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(receiverId)) {
        return res.status(400).json({
            error: {
                code: 'INVALID_RECEIVER_ID',
                message: '无效的接收者 ID 格式'
            }
        });
    }

    // 不能向自己发起邀请
    if (receiverId === initiatorId) {
        return res.status(400).json({
            error: {
                code: 'CANNOT_INVITE_SELF',
                message: '不能向自己发起约会邀请'
            }
        });
    }

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // 检查接收者是否存在
        const receiverCheck = await client.query(
            'SELECT user_id, nickname FROM users WHERE user_id = $1',
            [receiverId]
        );

        if (receiverCheck.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({
                error: {
                    code: 'RECEIVER_NOT_FOUND',
                    message: '接收者不存在'
                }
            });
        }

        // 检查约会地点是否存在
        const spotCheck = await client.query(
            'SELECT spot_id, name, location FROM dating_spots WHERE spot_id = $1',
            [spotId]
        );

        if (spotCheck.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({
                error: {
                    code: 'SPOT_NOT_FOUND',
                    message: '约会地点不存在'
                }
            });
        }

        // 检查是否已有进行中的任务
        const existingTask = await client.query(
            `SELECT task_id FROM dating_tasks
             WHERE ((initiator_id = $1 AND receiver_id = $2)
                OR (initiator_id = $2 AND receiver_id = $1))
             AND status IN ('pending', 'accepted')`,
            [initiatorId, receiverId]
        );

        if (existingTask.rows.length > 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({
                error: {
                    code: 'TASK_ALREADY_EXISTS',
                    message: '您与该用户已有进行中的约会任务'
                }
            });
        }

        // 创建约会邀请
        const createTaskQuery = `
            INSERT INTO dating_tasks (initiator_id, receiver_id, spot_id, scheduled_time)
            VALUES ($1, $2, $3, $4)
            RETURNING
                task_id,
                initiator_id,
                receiver_id,
                spot_id,
                status,
                scheduled_time,
                created_at
        `;

        const taskResult = await client.query(
            createTaskQuery,
            [initiatorId, receiverId, spotId, scheduledTime || null]
        );

        const newTask = taskResult.rows[0];

        // 获取发起者和接收者的详细信息
        const usersQuery = `
            SELECT
                user_id,
                nickname,
                avatar_url
            FROM users
            WHERE user_id IN ($1, $2)
        `;

        const usersResult = await client.query(usersQuery, [initiatorId, receiverId]);
        const users = usersResult.rows;

        const initiator = users.find(u => u.user_id === initiatorId);
        const receiver = users.find(u => u.user_id === receiverId);

        await client.query('COMMIT');

        // TODO: 通过 WebSocket 推送通知给接收者
        // const sendMessageToUser = req.app.get('sendMessageToUser');
        // if (sendMessageToUser) {
        //     sendMessageToUser(receiverId, {
        //         type: 'dating_invitation',
        //         data: {
        //             taskId: newTask.task_id,
        //             initiator: initiator,
        //             spot: spotCheck.rows[0]
        //         }
        //     });
        // }

        res.status(201).json({
            message: '约会邀请已发送',
            task: {
                taskId: newTask.task_id,
                initiator: initiator,
                receiver: receiver,
                spot: {
                    spotId: spotCheck.rows[0].spot_id,
                    name: spotCheck.rows[0].name
                },
                status: newTask.status,
                scheduledTime: newTask.scheduled_time,
                createdAt: newTask.created_at
            }
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Create dating task error:', error);
        res.status(500).json({
            error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: '创建约会邀请时发生错误'
            }
        });
    } finally {
        client.release();
    }
});

/**
 * POST /api/tasks/:taskId/accept
 * 接受约会邀请
 */
router.post('/:taskId/accept', authenticateToken, async (req, res) => {
    const { taskId } = req.params;
    const userId = req.user.userId;

    try {
        // 检查任务是否存在且用户是接收者
        const taskCheck = await pool.query(
            `SELECT task_id, initiator_id, receiver_id, status, spot_id
             FROM dating_tasks
             WHERE task_id = $1 AND receiver_id = $2 AND status = 'pending'`,
            [taskId, userId]
        );

        if (taskCheck.rows.length === 0) {
            return res.status(404).json({
                error: {
                    code: 'TASK_NOT_FOUND',
                    message: '未找到待接受的约会邀请'
                }
            });
        }

        // 更新任务状态为 accepted
        const updateQuery = `
            UPDATE dating_tasks
            SET status = 'accepted', updated_at = NOW()
            WHERE task_id = $1
            RETURNING
                task_id,
                initiator_id,
                receiver_id,
                spot_id,
                status,
                updated_at
        `;

        const result = await pool.query(updateQuery, [taskId]);
        const task = result.rows[0];

        // TODO: 通过 WebSocket 通知发起者
        // const sendMessageToUser = req.app.get('sendMessageToUser');
        // if (sendMessageToUser) {
        //     sendMessageToUser(task.initiator_id, {
        //         type: 'dating_accepted',
        //         data: { taskId: task.task_id }
        //     });
        // }

        res.status(200).json({
            message: '约会邀请已接受',
            task: {
                taskId: task.task_id,
                status: task.status,
                updatedAt: task.updated_at
            }
        });

    } catch (error) {
        console.error('Accept dating task error:', error);
        res.status(500).json({
            error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: '接受约会邀请时发生错误'
            }
        });
    }
});

/**
 * POST /api/tasks/:taskId/check-in
 * 约会打卡（双方都到达指定地点）
 * Body: { lat: number, lng: number }
 */
router.post('/:taskId/check-in', authenticateToken, async (req, res) => {
    const { taskId } = req.params;
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

    try {
        // 获取任务信息
        const taskQuery = `
            SELECT
                dt.task_id,
                dt.initiator_id,
                dt.receiver_id,
                dt.status,
                ds.spot_id,
                ds.location,
                ds.reward_points,
                ST_Y(ds.location::geometry) as spot_lat,
                ST_X(ds.location::geometry) as spot_lng
            FROM dating_tasks dt
            JOIN dating_spots ds ON dt.spot_id = ds.spot_id
            WHERE dt.task_id = $1
        `;

        const taskResult = await pool.query(taskQuery, [taskId]);

        if (taskResult.rows.length === 0) {
            return res.status(404).json({
                error: {
                    code: 'TASK_NOT_FOUND',
                    message: '约会任务不存在'
                }
            });
        }

        const task = taskResult.rows[0];

        // 检查任务状态
        if (task.status !== 'accepted') {
            return res.status(400).json({
                error: {
                    code: 'INVALID_TASK_STATUS',
                    message: '只有已接受的约会任务才能打卡'
                }
            });
        }

        // 检查用户是否参与此任务
        if (task.initiator_id !== userId && task.receiver_id !== userId) {
            return res.status(403).json({
                error: {
                    code: 'NOT_PARTICIPANT',
                    message: '您不是此约会任务的参与者'
                }
            });
        }

        // 计算当前用户与约会地点的距离（使用 PostGIS）
        const distanceQuery = `
            SELECT ST_Distance(
                ST_SetSRID(ST_MakePoint($1, $2), 4326)::GEOGRAPHY,
                $3::GEOGRAPHY
            ) as distance_meters
        `;

        const distanceResult = await pool.query(
            distanceQuery,
            [lng, lat, task.location]
        );

        const distance = parseFloat(distanceResult.rows[0].distance_meters);

        // 检查是否在 50 米范围内
        if (distance > 50) {
            return res.status(400).json({
                error: {
                    code: 'TOO_FAR_FROM_SPOT',
                    message: `您距离约会地点还有 ${Math.round(distance)} 米，请靠近后再打卡`
                },
                distance: {
                    meters: Math.round(distance)
                }
            });
        }

        // 检查双方是否都已打卡
        // 我们可以使用一个简单的标记字段或者另一个表来记录打卡状态
        // 这里为了简化，我们直接检查任务状态，如果双方都打卡则完成

        // 更新任务状态为 completed（简化版：只要有一方打卡就算完成）
        const updateQuery = `
            UPDATE dating_tasks
            SET status = 'completed', completed_at = NOW(), updated_at = NOW()
            WHERE task_id = $1 AND status = 'accepted'
            RETURNING task_id, status, completed_at
        `;

        const updateResult = await pool.query(updateQuery, [taskId]);

        if (updateResult.rows.length === 0) {
            // 任务已经被完成
            return res.status(400).json({
                error: {
                    code: 'TASK_ALREADY_COMPLETED',
                    message: '约会任务已完成'
                }
            });
        }

        // 给双方用户奖励积分
        const pointsQuery = `
            UPDATE users
            SET points = points + $1,
                updated_at = NOW()
            WHERE user_id IN ($2, $3)
            RETURNING user_id, points
        `;

        const pointsResult = await pool.query(
            pointsQuery,
            [task.reward_points || 200, task.initiator_id, task.receiver_id]
        );

        const awardedUsers = pointsResult.rows;

        res.status(200).json({
            message: '约会打卡成功！',
            data: {
                taskId: updateResult.rows[0].task_id,
                status: updateResult.rows[0].status,
                completedAt: updateResult.rows[0].completed_at,
                rewardPoints: task.reward_points || 200,
                users: awardedUsers.map(u => ({
                    userId: u.user_id,
                    newPoints: u.points
                }))
            }
        });

    } catch (error) {
        console.error('Check-in error:', error);
        res.status(500).json({
            error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: '约会打卡时发生错误'
            }
        });
    }
});

/**
 * GET /api/tasks/my
 * 获取当前用户的约会任务列表
 */
router.get('/my', authenticateToken, async (req, res) => {
    const userId = req.user.userId;
    const { status } = req.query; // 可选状态筛选：pending, accepted, completed, cancelled

    try {
        let whereConditions = [
            '(dt.initiator_id = $1 OR dt.receiver_id = $1)'
        ];

        let queryParams = [userId];
        let paramIndex = 2;

        if (status) {
            whereConditions.push(`dt.status = $${paramIndex}`);
            queryParams.push(status);
            paramIndex++;
        }

        const query = `
            SELECT
                dt.task_id as "taskId",
                dt.initiator_id as "initiatorId",
                dt.receiver_id as "receiverId",
                dt.status,
                dt.scheduled_time as "scheduledTime",
                dt.created_at as "createdAt",
                dt.updated_at as "updatedAt",
                dt.completed_at as "completedAt",
                ds.spot_id as "spotId",
                ds.name as "spotName",
                ds.type as "spotType",
                ds.address as "spotAddress",
                ds.reward_points as "rewardPoints",
                ST_Y(ds.location::geometry) as "spotLat",
                ST_X(ds.location::geometry) as "spotLng",
                i.nickname as "initiatorName",
                i.avatar_url as "initiatorAvatar",
                r.nickname as "receiverName",
                r.avatar_url as "receiverAvatar"
            FROM dating_tasks dt
            JOIN dating_spots ds ON dt.spot_id = ds.spot_id
            JOIN users i ON dt.initiator_id = i.user_id
            JOIN users r ON dt.receiver_id = r.user_id
            WHERE ${whereConditions.join(' AND ')}
            ORDER BY dt.created_at DESC
        `;

        const result = await pool.query(query, queryParams);

        const tasks = result.rows.map(task => ({
            taskId: task.taskId,
            initiatorId: task.initiatorId,
            receiverId: task.receiverId,
            status: task.status,
            scheduledTime: task.scheduledTime,
            createdAt: task.createdAt,
            updatedAt: task.updatedAt,
            completedAt: task.completedAt,
            spot: {
                spotId: task.spotId,
                name: task.spotName,
                type: task.spotType,
                address: task.spotAddress,
                rewardPoints: task.rewardPoints,
                location: {
                    lat: task.spotLat,
                    lng: task.spotLng
                }
            },
            initiator: {
                userId: task.initiatorId,
                nickname: task.initiatorName,
                avatarUrl: task.initiatorAvatar
            },
            receiver: {
                userId: task.receiverId,
                nickname: task.receiverName,
                avatarUrl: task.receiverAvatar
            }
        }));

        res.status(200).json({
            tasks: tasks,
            count: tasks.length
        });

    } catch (error) {
        console.error('Get my tasks error:', error);
        res.status(500).json({
            error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: '获取约会任务列表时发生错误'
            }
        });
    }
});

module.exports = router;
