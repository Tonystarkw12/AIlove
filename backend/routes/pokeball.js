/**
 * AIlove 精灵球系统 API 路由
 *
 * 功能：
 * - 精灵球历史记录查询
 * - 精灵球充值
 * - 精灵球消费
 */

const express = require('express');
const router = express.Router();
const pool = require('../db');
const authenticateToken = require('../middleware/authenticateToken');

/**
 * GET /api/pokeball/history
 * 获取精灵球交易历史记录
 *
 * Query参数：
 * - limit: 返回记录数量（默认50）
 * - offset: 偏移量（默认0）
 * - type: 交易类型过滤（recharge/consume，可选）
 */
router.get('/history', authenticateToken, async (req, res) => {
  const { limit = 50, offset = 0, type } = req.query;
  const userId = req.user.userId;

  try {
    let query = `
      SELECT
        id,
        transaction_type AS type,
        amount,
        description,
        balance_after,
        reference_id,
        created_at
      FROM pokeball_transactions
      WHERE user_id = $1
    `;
    const params = [userId];

    // 添加类型过滤
    if (type && ['recharge', 'consume'].includes(type)) {
      query += ` AND transaction_type = $2`;
      params.push(type);
      query += ` ORDER BY created_at DESC LIMIT $3 OFFSET $4`;
      params.push(limit, offset);
    } else {
      query += ` ORDER BY created_at DESC LIMIT $2 OFFSET $3`;
      params.push(limit, offset);
    }

    const result = await pool.query(query, params);

    res.json({
      success: true,
      records: result.rows,
      total: result.rowCount
    });

  } catch (error) {
    console.error('获取精灵球历史失败:', error);
    res.status(500).json({
      success: false,
      error: {
        message: '获取精灵球历史失败',
        details: error.message
      }
    });
  }
});

/**
 * POST /api/pokeball/recharge
 * 精灵球充值
 *
 * Body参数：
 * - amount: 充值金额（元）
 * - pokeballCount: 充值精灵球数量
 */
router.post('/recharge', authenticateToken, async (req, res) => {
  const { amount, pokeballCount } = req.body;
  const userId = req.user.userId;

  // 参数验证
  if (!amount || amount <= 0) {
    return res.status(400).json({
      success: false,
      error: {
        message: '充值金额必须大于0'
      }
    });
  }

  if (!pokeballCount || pokeballCount <= 0) {
    return res.status(400).json({
      success: false,
      error: {
        message: '精灵球数量必须大于0'
      }
    });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 获取当前用户精灵球数量
    const userResult = await client.query(
      'SELECT pokeball_count FROM users WHERE id = $1 FOR UPDATE',
      [userId]
    );

    if (userResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        error: {
          message: '用户不存在'
        }
      });
    }

    const currentBalance = userResult.rows[0].pokeball_count;
    const newBalance = currentBalance + pokeballCount;

    // 更新用户精灵球数量
    await client.query(
      'UPDATE users SET pokeball_count = $1 WHERE id = $2',
      [newBalance, userId]
    );

    // 创建交易记录
    await client.query(
      `INSERT INTO pokeball_transactions (
        user_id, transaction_type, amount, description, balance_after
      ) VALUES ($1, $2, $3, $4, $5)`,
      [
        userId,
        'recharge',
        pokeballCount,
        `微信充值 ${amount} 元`,
        newBalance
      ]
    );

    await client.query('COMMIT');

    res.json({
      success: true,
      message: `成功充值 ${pokeballCount} 个精灵球`,
      data: {
        previousBalance: currentBalance,
        recharged: pokeballCount,
        newBalance: newBalance
      }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('精灵球充值失败:', error);
    res.status(500).json({
      success: false,
      error: {
        message: '精灵球充值失败',
        details: error.message
      }
    });
  } finally {
    client.release();
  }
});

/**
 * POST /api/pokeball/consume
 * 精灵球消费（内部API，用于匹配时扣除）
 *
 * Body参数：
 * - userId: 用户ID
 * - amount: 消费数量（默认1）
 * - referenceId: 关联业务ID（匹配ID）
 * - description: 消费描述
 */
router.post('/consume', authenticateToken, async (req, res) => {
  const { amount = 1, referenceId, description = '匹配消耗' } = req.body;
  const userId = req.user.userId;

  if (amount <= 0) {
    return res.status(400).json({
      success: false,
      error: {
        message: '消费数量必须大于0'
      }
    });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 获取当前用户精灵球数量
    const userResult = await client.query(
      'SELECT pokeball_count FROM users WHERE id = $1 FOR UPDATE',
      [userId]
    );

    if (userResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        error: {
          message: '用户不存在'
        }
      });
    }

    const currentBalance = userResult.rows[0].pokeball_count;

    // 检查余额是否足够
    if (currentBalance < amount) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        error: {
          message: `精灵球不足，当前剩余 ${currentBalance} 个，需要 ${amount} 个`
        }
      });
    }

    const newBalance = currentBalance - amount;

    // 更新用户精灵球数量
    await client.query(
      'UPDATE users SET pokeball_count = $1 WHERE id = $2',
      [newBalance, userId]
    );

    // 创建交易记录
    await client.query(
      `INSERT INTO pokeball_transactions (
        user_id, transaction_type, amount, description, balance_after, reference_id
      ) VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId, 'consume', amount, description, newBalance, referenceId]
    );

    await client.query('COMMIT');

    res.json({
      success: true,
      message: `成功消耗 ${amount} 个精灵球`,
      data: {
        previousBalance: currentBalance,
        consumed: amount,
        newBalance: newBalance
      }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('精灵球消费失败:', error);
    res.status(500).json({
      success: false,
      error: {
        message: '精灵球消费失败',
        details: error.message
      }
    });
  } finally {
    client.release();
  }
});

/**
 * GET /api/pokeball/balance
 * 获取当前精灵球余额
 */
router.get('/balance', authenticateToken, async (req, res) => {
  const userId = req.user.userId;

  try {
    const result = await pool.query(
      'SELECT pokeball_count FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          message: '用户不存在'
        }
      });
    }

    res.json({
      success: true,
      balance: result.rows[0].pokeball_count
    });

  } catch (error) {
    console.error('获取精灵球余额失败:', error);
    res.status(500).json({
      success: false,
      error: {
        message: '获取精灵球余额失败',
        details: error.message
      }
    });
  }
});

module.exports = router;
