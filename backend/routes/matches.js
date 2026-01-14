/**
 * AIlove 用户匹配记录 API 路由
 *
 * 功能：
 * - 获取配对记录列表
 * - 创建配对记录（匹配成功时调用）
 */

const express = require('express');
const router = express.Router();
const pool = require('../db');
const authenticateToken = require('../middleware/authenticateToken');

/**
 * GET /api/users/me/matches
 * 获取当前用户的配对记录
 *
 * Query参数：
 * - limit: 返回记录数量（默认20）
 * - offset: 偏移量（默认0）
 */
router.get('/me/matches', authenticateToken, async (req, res) => {
  const { limit = 20, offset = 0 } = req.query;
  const userId = req.user.userId;

  try {
    const query = `
      SELECT
        um.id,
        um.matched_user_id AS id,
        u.nickname,
        u.avatar,
        um.user_pokemon_type AS pokemon_type,
        um.user_pokemon_name AS pokemon_name,
        um.user_pokemon_sprite AS pokemon_sprite,
        um.compatibility_score,
        um.created_at AS matched_at
      FROM user_matches um
      JOIN users u ON um.matched_user_id = u.id
      WHERE um.user_id = $1
      ORDER BY um.created_at DESC
      LIMIT $2 OFFSET $3
    `;

    const result = await pool.query(query, [userId, limit, offset]);

    // 获取总配对数
    const countResult = await pool.query(
      'SELECT COUNT(*) FROM user_matches WHERE user_id = $1',
      [userId]
    );

    res.json({
      success: true,
      matches: result.rows,
      total: parseInt(countResult.rows[0].count),
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

  } catch (error) {
    console.error('获取配对记录失败:', error);
    res.status(500).json({
      success: false,
      error: {
        message: '获取配对记录失败',
        details: error.message
      }
    });
  }
});

/**
 * POST /api/users/me/matches
 * 创建配对记录（匹配成功时调用）
 *
 * Body参数：
 * - matchedUserId: 被配对用户ID
 * - compatibilityScore: 相容度分数
 * - userPokemonType: 用户宝可梦类型
 * - userPokemonName: 用户宝可梦名称
 * - userPokemonSprite: 用户宝可梦图片
 * - matchedPokemonType: 对方宝可梦类型
 * - matchedPokemonName: 对方宝可梦名称
 * - matchedPokemonSprite: 对方宝可梦图片
 */
router.post('/me/matches', authenticateToken, async (req, res) => {
  const {
    matchedUserId,
    compatibilityScore,
    userPokemonType,
    userPokemonName,
    userPokemonSprite,
    matchedPokemonType,
    matchedPokemonName,
    matchedPokemonSprite
  } = req.body;

  const userId = req.user.userId;

  // 参数验证
  if (!matchedUserId) {
    return res.status(400).json({
      success: false,
      error: {
        message: '缺少必要参数：matchedUserId'
      }
    });
  }

  if (matchedUserId === userId) {
    return res.status(400).json({
      success: false,
      error: {
        message: '不能与自己配对'
      }
    });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 检查是否已经配对过
    const existingMatch = await client.query(
      `SELECT id FROM user_matches
       WHERE user_id = $1 AND matched_user_id = $2`,
      [userId, matchedUserId]
    );

    if (existingMatch.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        error: {
          message: '已经与该用户配对过'
        }
      });
    }

    // 创建双向配对记录
    await client.query(
      `INSERT INTO user_matches (
        user_id, matched_user_id,
        user_pokemon_type, user_pokemon_name, user_pokemon_sprite,
        matched_pokemon_type, matched_pokemon_name, matched_pokemon_sprite,
        compatibility_score
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        userId, matchedUserId,
        userPokemonType, userPokemonName, userPokemonSprite,
        matchedPokemonType, matchedPokemonName, matchedPokemonSprite,
        compatibilityScore
      ]
    );

    // 更新双方配对计数
    await client.query(
      'UPDATE users SET matched_count = matched_count + 1 WHERE id = $1',
      [userId]
    );

    await client.query(
      'UPDATE users SET matched_count = matched_count + 1 WHERE id = $1',
      [matchedUserId]
    );

    await client.query('COMMIT');

    res.json({
      success: true,
      message: '配对记录创建成功',
      data: {
        userId,
        matchedUserId,
        compatibilityScore
      }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('创建配对记录失败:', error);
    res.status(500).json({
      success: false,
      error: {
        message: '创建配对记录失败',
        details: error.message
      }
    });
  } finally {
    client.release();
  }
});

/**
 * GET /api/users/:id/matches
 * 获取指定用户的配对记录（公开接口）
 */
router.get('/:id/matches', async (req, res) => {
  const { id } = req.params;
  const { limit = 10, offset = 0 } = req.query;

  try {
    const query = `
      SELECT
        um.id,
        um.matched_user_id AS id,
        u.nickname,
        u.avatar,
        um.user_pokemon_type AS pokemon_type,
        um.user_pokemon_name AS pokemon_name,
        um.user_pokemon_sprite AS pokemon_sprite,
        um.compatibility_score,
        um.created_at AS matched_at
      FROM user_matches um
      JOIN users u ON um.matched_user_id = u.id
      WHERE um.user_id = $1
      ORDER BY um.created_at DESC
      LIMIT $2 OFFSET $3
    `;

    const result = await pool.query(query, [id, limit, offset]);

    res.json({
      success: true,
      matches: result.rows,
      total: result.rowCount
    });

  } catch (error) {
    console.error('获取用户配对记录失败:', error);
    res.status(500).json({
      success: false,
      error: {
        message: '获取用户配对记录失败',
        details: error.message
      }
    });
  }
});

module.exports = router;
