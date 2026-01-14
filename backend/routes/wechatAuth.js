/**
 * AIlove 微信登录 API
 *
 * 功能：
 * - 微信小程序一键登录
 * - 自动创建用户
 * - 使用微信昵称作为默认用户名
 */

const express = require('express');
const router = express.Router();
const pool = require('../db');
const authenticateToken = require('../middleware/authenticateToken');

/**
 * POST /api/auth/wechat-login
 * 微信小程序一键登录
 *
 * Body参数：
 * - code: 微信登录code
 * - userInfo: 用户信息对象
 * - encryptedData: 加密数据
 * - iv: 加密向量
 */
router.post('/wechat-login', async (req, res) => {
  const { code, userInfo, encryptedData, iv } = req.body;

  // 参数验证
  if (!code) {
    return res.status(400).json({
      success: false,
      error: {
        message: '缺少微信登录code'
      }
    });
  }

  if (!userInfo || !userInfo.nickName) {
    return res.status(400).json({
      success: false,
      error: {
        message: '缺少用户信息'
      }
    });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // TODO: 在实际生产环境中，需要：
    // 1. 使用code调用微信API获取openid和session_key
    // 2. 使用session_key解密encryptedData获取完整的用户信息
    // 3. 验证签名确保数据完整性

    // 模拟：使用code生成openid（实际应该调用微信API）
    // 在真实环境中，应该这样：
    // const axios = require('axios');
    // const wechatResponse = await axios.get(`https://api.weixin.qq.com/sns/jscode2session?appid=${appid}&secret=${secret}&js_code=${code}&grant_type=authorization_code`);
    // const { openid, session_key } = wechatResponse.data;

    // 这里我们临时使用code作为openid的模拟
    const openid = `wx_${code.substring(0, 20)}`;

    // 检查用户是否已存在
    const userResult = await client.query(
      'SELECT * FROM users WHERE wechat_openid = $1',
      [openid]
    );

    let user;
    let token;

    if (userResult.rows.length > 0) {
      // 用户已存在，直接登录
      user = userResult.rows[0];

      // 生成JWT token
      const jwt = require('jsonwebtoken');
      token = jwt.sign(
        { userId: user.user_id, email: user.email },
        process.env.JWT_SECRET || 'YOUR_VERY_STRONG_JWT_SECRET_KEY',
        { expiresIn: '30d' }
      );

    } else {
      // 新用户，创建账号
      // 使用微信昵称作为默认昵称
      const nickname = userInfo.nickName || '微信训练师';
      const email = `wx_${openid}@wechat.temp`; // 临时邮箱，实际不需要

      // 生成随机密码
      const crypto = require('crypto');
      const randomPassword = crypto.randomBytes(32).toString('hex');
      const bcrypt = require('bcrypt');
      const passwordHash = await bcrypt.hash(randomPassword, 10);

      // 创建用户
      const insertResult = await client.query(
        `INSERT INTO users (
          nickname,
          email,
          password_hash,
          wechat_openid,
          wechat_nickname,
          wechat_avatar_url,
          points,
          level,
          vip_level,
          pokeball_count,
          matched_count,
          profile_completeness
        ) VALUES ($1, $2, $3, $4, $5, $6, 7, 8, 9, 10, 11, 12)
        RETURNING *`,
        [
          nickname,
          email,
          passwordHash,
          openid,
          userInfo.nickName,
          userInfo.avatarUrl || '',
          0,          // 初始积分
          1,          // 初始等级
          '普通训练师', // VIP等级
          2,          // 初始精灵球数量
          0,          // 初始配对数量
          30          // 初始资料完整度（有昵称和头像）
        ]
      );

      user = insertResult.rows[0];

      // 生成JWT token
      const jwt = require('jsonwebtoken');
      token = jwt.sign(
        { userId: user.user_id, email: user.email },
        process.env.JWT_SECRET || 'YOUR_VERY_STRONG_JWT_SECRET_KEY',
        { expiresIn: '30d' }
      );
    }

    await client.query('COMMIT');

    res.json({
      success: true,
      message: '微信登录成功',
      token: token,
      user: {
        userId: user.user_id,
        nickname: user.nickname,
        email: user.email,
        avatar: user.wechat_avatar_url || user.avatar_url,
        vipLevel: user.vip_level,
        points: user.points,
        level: user.level,
        pokeballCount: user.pokeball_count,
        matchedCount: user.matched_count
      }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('微信登录失败:', error);

    res.status(500).json({
      success: false,
      error: {
        message: '微信登录失败',
        details: error.message
      }
    });

  } finally {
    client.release();
  }
});

/**
 * GET /api/auth/wechat-user-info
 * 获取微信用户信息（需要登录）
 */
router.get('/wechat-user-info', authenticateToken, async (req, res) => {
  const userId = req.user.userId;

  try {
    const result = await pool.query(
      `SELECT
        user_id,
        nickname,
        wechat_nickname,
        wechat_openid,
        wechat_avatar_url,
        avatar_url,
        vip_level,
        points,
        pokeball_count,
        matched_count
      FROM users
      WHERE user_id = $1`,
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

    const user = result.rows[0];

    res.json({
      success: true,
      user: user
    });

  } catch (error) {
    console.error('获取微信用户信息失败:', error);

    res.status(500).json({
      success: false,
      error: {
        message: '获取用户信息失败',
        details: error.message
      }
    });
  }
});

module.exports = router;
