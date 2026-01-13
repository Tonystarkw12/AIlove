const express = require('express');
const pool = require('../db');
const authenticateToken = require('../middleware/authenticateToken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// --- Multer Configuration for Photo Uploads ---
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads', 'community');
if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, UPLOADS_DIR);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'couple-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const fileFilter = (req, file, cb) => {
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/i)) {
        return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
};

const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: fileFilter
}).single('photo');

// --- Community Routes ---

// GET /api/community/photos - 获取照片墙列表（分页）
router.get('/photos', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const pageSize = parseInt(req.query.pageSize) || 10;
        const offset = (page - 1) * pageSize;

        const result = await pool.query(
            `SELECT
                cp.photo_id,
                cp.photo_url,
                cp.anniversary_date,
                cp.couple_names,
                cp.message,
                cp.like_count,
                cp.created_at,
                u1.nickname as submitter_name,
                u2.nickname as partner_name
            FROM community_photos cp
            LEFT JOIN users u1 ON cp.submitter_user_id = u1.user_id
            LEFT JOIN users u2 ON cp.partner_user_id = u2.user_id
            WHERE cp.status = 'approved'
            ORDER BY cp.created_at DESC
            LIMIT $1 OFFSET $2`,
            [pageSize, offset]
        );

        const photos = result.rows.map(photo => ({
            id: photo.photo_id,
            url: photo.photo_url,
            displayDate: formatDate(photo.anniversary_date),
            coupleNames: photo.couple_names || `${photo.submitter_name} & ${photo.partner_name}`,
            message: photo.message,
            likeCount: photo.like_count,
            createdAt: photo.created_at
        }));

        res.status(200).json({
            photos,
            page,
            pageSize,
            hasMore: photos.length === pageSize
        });

    } catch (error) {
        console.error('Get community photos error:', error);
        res.status(500).json({
            error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: '获取照片墙失败'
            }
        });
    }
});

// POST /api/community/upload-photo - 上传照片文件
router.post('/upload-photo', authenticateToken, (req, res) => {
    upload(req, res, function (err) {
        if (err instanceof multer.MulterError) {
            return res.status(400).json({
                error: {
                    code: 'UPLOAD_ERROR',
                    message: err.message
                }
            });
        } else if (err) {
            return res.status(400).json({
                error: {
                    code: 'UPLOAD_ERROR',
                    message: err.message
                }
            });
        }

        if (!req.file) {
            return res.status(400).json({
                error: {
                    code: 'NO_FILE',
                    message: '请选择照片'
                }
            });
        }

        // 返回照片URL
        const photoUrl = `/uploads/community/${req.file.filename}`;
        res.status(200).json({
            url: photoUrl,
            filename: req.file.filename
        });
    });
});

// POST /api/community/submit-couple-photo - 提交情侣照片信息
router.post('/submit-couple-photo', authenticateToken, async (req, res) => {
    const client = await pool.connect();
    try {
        const userId = req.user.userId;
        const { photoUrl, date, names, message, partnerUserId } = req.body;

        // 验证必填字段
        if (!photoUrl || !date) {
            return res.status(400).json({
                error: {
                    code: 'INVALID_INPUT',
                    message: '照片和纪念日不能为空'
                }
            });
        }

        await client.query('BEGIN');

        // 检查是否已经提交过（pending状态）
        const existingCheck = await client.query(
            `SELECT photo_id FROM community_photos
             WHERE submitter_user_id = $1 AND status = 'pending'`,
            [userId]
        );

        if (existingCheck.rows.length > 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({
                error: {
                    code: 'PENDING_SUBMISSION',
                    message: '您已有待审核的提交，请等待审核结果'
                }
            });
        }

        // 插入照片记录
        const insertResult = await client.query(
            `INSERT INTO community_photos
                (photo_id, submitter_user_id, partner_user_id, photo_url, anniversary_date, couple_names, message, status)
             VALUES
                ($1, $2, $3, $4, $5, $6, $7, 'pending')
             RETURNING photo_id`,
            [uuidv4(), userId, partnerUserId || null, photoUrl, date, names, message]
        );

        const photoId = insertResult.rows[0].photo_id;

        await client.query('COMMIT');

        res.status(201).json({
            message: '提交成功，审核通过后将获得 500 积分奖励',
            photoId,
            rewardPoints: 500
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Submit couple photo error:', error);
        res.status(500).json({
            error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: '提交失败'
            }
        });
    } finally {
        client.release();
    }
});

// POST /api/community/photos/:photoId/like - 点赞照片
router.post('/photos/:photoId/like', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const photoId = req.params.photoId;

        // 检查是否已点赞
        const existingLike = await pool.query(
            `SELECT like_id FROM photo_likes
             WHERE photo_id = $1 AND user_id = $2`,
            [photoId, userId]
        );

        if (existingLike.rows.length > 0) {
            // 取消点赞
            await pool.query(
                `DELETE FROM photo_likes WHERE photo_id = $1 AND user_id = $2`,
                [photoId, userId]
            );

            await pool.query(
                `UPDATE community_photos SET like_count = like_count - 1 WHERE photo_id = $1`,
                [photoId]
            );

            return res.status(200).json({
                message: '取消点赞',
                liked: false
            });
        }

        // 添加点赞
        await pool.query(
            `INSERT INTO photo_likes (like_id, photo_id, user_id)
             VALUES ($1, $2, $3)`,
            [uuidv4(), photoId, userId]
        );

        await pool.query(
            `UPDATE community_photos SET like_count = like_count + 1 WHERE photo_id = $1`,
            [photoId]
        );

        res.status(201).json({
            message: '点赞成功',
            liked: true
        });

    } catch (error) {
        console.error('Like photo error:', error);
        res.status(500).json({
            error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: '操作失败'
            }
        });
    }
});

// GET /api/community/my-submissions - 获取我的提交记录
router.get('/my-submissions', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;

        const result = await pool.query(
            `SELECT photo_id, photo_url, anniversary_date, couple_names,
                    message, status, like_count, created_at, reviewed_at
             FROM community_photos
             WHERE submitter_user_id = $1
             ORDER BY created_at DESC`,
            [userId]
        );

        res.status(200).json({
            submissions: result.rows
        });

    } catch (error) {
        console.error('Get my submissions error:', error);
        res.status(500).json({
            error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: '获取提交记录失败'
            }
        });
    }
});

// --- 管理员审核接口（可选）---

// PUT /api/community/admin/photos/:photoId/review - 审核照片
router.put('/admin/photos/:photoId/review', authenticateToken, async (req, res) => {
    // TODO: 添加管理员权限检查
    const client = await pool.connect();
    try {
        const { status, rejectReason } = req.body; // status: 'approved' | 'rejected'
        const photoId = req.params.photoId;

        if (!['approved', 'rejected'].includes(status)) {
            return res.status(400).json({
                error: {
                    code: 'INVALID_STATUS',
                    message: 'Invalid status'
                }
            });
        }

        await client.query('BEGIN');

        // 获取照片信息
        const photoResult = await client.query(
            `SELECT submitter_user_id FROM community_photos WHERE photo_id = $1`,
            [photoId]
        );

        if (photoResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({
                error: {
                    code: 'NOT_FOUND',
                    message: 'Photo not found'
                }
            });
        }

        const submitterUserId = photoResult.rows[0].submitter_user_id;

        // 更新照片状态
        await client.query(
            `UPDATE community_photos
             SET status = $1, reviewed_at = CURRENT_TIMESTAMP, reject_reason = $2
             WHERE photo_id = $3`,
            [status, rejectReason, photoId]
        );

        // 如果审核通过，奖励积分
        if (status === 'approved') {
            const REWARD_POINTS = 500;
            await client.query(
                `UPDATE users
                 SET points = points + $1,
                     total_points_earned = total_points_earned + $1
                 WHERE user_id = $2`,
                [REWARD_POINTS, submitterUserId]
            );

            // 记录奖励历史
            await client.query(
                `INSERT INTO point_history (history_id, user_id, amount, type, description)
                 VALUES ($1, $2, $3, 'community_reward', '情侣照片审核通过奖励')`,
                [uuidv4(), submitterUserId, REWARD_POINTS]
            );
        }

        await client.query('COMMIT');

        res.status(200).json({
            message: status === 'approved' ? '审核通过，已奖励积分' : '审核拒绝',
            status
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Review photo error:', error);
        res.status(500).json({
            error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: '审核失败'
            }
        });
    } finally {
        client.release();
    }
});

// 辅助函数：格式化日期
function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}.${month}.${day}`;
}

module.exports = router;
