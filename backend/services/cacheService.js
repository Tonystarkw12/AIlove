/**
 * Redis缓存服务
 * 用于缓存匹配分数、推荐结果等数据，减少数据库查询和AI API调用
 */

const redis = require('redis');

// Redis客户端配置
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const CACHE_TTL = 24 * 60 * 60; // 24小时（秒）

// 创建Redis客户端
const redisClient = redis.createClient({
    url: REDIS_URL,
    socket: {
        reconnectStrategy: (retries) => {
            if (retries > 10) {
                console.error('Redis: 重连次数过多，停止重连');
                return new Error('重连次数过多');
            }
            return retries * 100; // 指数退避
        }
    }
});

// 连接Redis
redisClient.connect()
    .then(() => {
        console.log('✅ Redis缓存服务已连接');
    })
    .catch((err) => {
        console.error('❌ Redis连接失败:', err.message);
        // 缓存服务降级，不影响主功能
    });

// 错误处理
redisClient.on('error', (err) => {
    console.error('Redis错误:', err.message);
});

/**
 * 生成匹配分数缓存键
 * @param {string} userIdA - 用户A的ID
 * @param {string} userIdB - 用户B的ID
 * @returns {string} 缓存键
 */
function getMatchScoreKey(userIdA, userIdB) {
    // 确保键的顺序一致（避免A-B和B-A重复缓存）
    const sortedIds = [userIdA, userIdB].sort();
    return `match_score:${sortedIds[0]}:${sortedIds[1]}`;
}

/**
 * 缓存匹配分数
 * @param {string} userIdA - 用户A的ID
 * @param {string} userIdB - 用户B的ID
 * @param {object} matchData - 匹配数据
 * @returns {Promise<boolean>}
 */
async function cacheMatchScore(userIdA, userIdB, matchData) {
    try {
        const key = getMatchScoreKey(userIdA, userIdB);
        const value = JSON.stringify(matchData);

        await redisClient.setEx(key, CACHE_TTL, value);
        console.log(`✅ 缓存匹配分数: ${key}`);
        return true;
    } catch (err) {
        console.error('❌ 缓存匹配分数失败:', err.message);
        return false;
    }
}

/**
 * 获取缓存的匹配分数
 * @param {string} userIdA - 用户A的ID
 * @param {string} userIdB - 用户B的ID
 * @returns {Promise<object|null>} 匹配数据或null
 */
async function getCachedMatchScore(userIdA, userIdB) {
    try {
        const key = getMatchScoreKey(userIdA, userIdB);
        const data = await redisClient.get(key);

        if (data) {
            console.log(`✅ 命中缓存: ${key}`);
            return JSON.parse(data);
        }

        console.log(`⏭️  缓存未命中: ${key}`);
        return null;
    } catch (err) {
        console.error('❌ 获取缓存失败:', err.message);
        return null;
    }
}

/**
 * 删除匹配分数缓存（当用户资料更新时调用）
 * @param {string} userId - 用户ID
 * @returns {Promise<number>} 删除的键数量
 */
async function invalidateUserMatchScores(userId) {
    try {
        const pattern = `match_score:*:${userId}`;
        const pattern2 = `match_score:${userId}:*`;

        // 获取所有匹配的键
        const keys1 = await redisClient.keys(pattern);
        const keys2 = await redisClient.keys(pattern2);
        const allKeys = [...new Set([...keys1, ...keys2])];

        if (allKeys.length > 0) {
            await redisClient.del(allKeys);
            console.log(`✅ 删除用户缓存: ${userId}, 数量: ${allKeys.length}`);
        }

        return allKeys.length;
    } catch (err) {
        console.error('❌ 删除缓存失败:', err.message);
        return 0;
    }
}

/**
 * 缓存推荐列表
 * @param {string} userId - 用户ID
 * @param {array} recommendations - 推荐列表
 * @returns {Promise<boolean>}
 */
async function cacheRecommendations(userId, recommendations) {
    try {
        const key = `recommendations:${userId}`;
        const value = JSON.stringify(recommendations);

        await redisClient.setEx(key, CACHE_TTL, value);
        console.log(`✅ 缓存推荐列表: ${key}, 数量: ${recommendations.length}`);
        return true;
    } catch (err) {
        console.error('❌ 缓存推荐列表失败:', err.message);
        return false;
    }
}

/**
 * 获取缓存的推荐列表
 * @param {string} userId - 用户ID
 * @returns {Promise<array|null>} 推荐列表或null
 */
async function getCachedRecommendations(userId) {
    try {
        const key = `recommendations:${userId}`;
        const data = await redisClient.get(key);

        if (data) {
            console.log(`✅ 命中推荐缓存: ${key}`);
            return JSON.parse(data);
        }

        return null;
    } catch (err) {
        console.error('❌ 获取推荐缓存失败:', err.message);
        return null;
    }
}

/**
 * 清空所有缓存（慎用）
 * @returns {Promise<boolean>}
 */
async function flushAll() {
    try {
        await redisClient.flushAll();
        console.log('✅ 已清空所有缓存');
        return true;
    } catch (err) {
        console.error('❌ 清空缓存失败:', err.message);
        return false;
    }
}

/**
 * 获取缓存统计信息
 * @returns {Promise<object>}
 */
async function getCacheStats() {
    try {
        const info = await redisClient.info('stats');
        const dbSize = await redisClient.dbSize();

        return {
            totalKeys: dbSize,
            info: info
        };
    } catch (err) {
        console.error('❌ 获取缓存统计失败:', err.message);
        return { totalKeys: 0, info: '' };
    }
}

/**
 * 关闭Redis连接（优雅关闭）
 */
async function closeRedis() {
    try {
        await redisClient.quit();
        console.log('✅ Redis连接已关闭');
    } catch (err) {
        console.error('❌ 关闭Redis连接失败:', err.message);
    }
}

// 进程退出时关闭连接
process.on('SIGINT', closeRedis);
process.on('SIGTERM', closeRedis);

module.exports = {
    cacheMatchScore,
    getCachedMatchScore,
    invalidateUserMatchScores,
    cacheRecommendations,
    getCachedRecommendations,
    flushAll,
    getCacheStats,
    closeRedis,
    redisClient
};
