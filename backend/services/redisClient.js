const redis = require('redis');
require('dotenv').config();

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

let redisClient = null;
const MAX_RECONNECT_ATTEMPTS = 10;

async function initializeRedisClient() {
  if (redisClient) return redisClient;

  redisClient = redis.createClient({
    url: REDIS_URL,
    socket: {
      reconnectStrategy: (retries) => {
        if (retries > MAX_RECONNECT_ATTEMPTS) {
          console.error('Redis: 重连次数过多，停止重连');
          return new Error('Redis连接失败: 重连次数过多');
        }
        const delay = Math.min(retries * 100, 3000);
        console.log(`Redis重连中... 尝试 ${retries}`);
        return delay;
      },
    },
  });

  redisClient.on('error', (err) => console.error('Redis错误:', err.message));
  redisClient.on('connect', () => console.log('Redis连接成功'));

  try {
    await redisClient.connect();
    return redisClient;
  } catch (error) {
    console.error('Redis连接失败:', error.message);
    return null;
  }
}

function getRedisClient() {
  return redisClient;
}

async function cacheRecommendations(userId, recommendations, ttl = 3600) {
  if (!redisClient) return;
  try {
    await redisClient.setEx(`recommendations:${userId}`, ttl, JSON.stringify(recommendations));
  } catch (error) {
    console.error('Redis缓存推荐失败:', error.message);
  }
}

async function getCachedRecommendations(userId) {
  if (!redisClient) return null;
  try {
    const data = await redisClient.get(`recommendations:${userId}`);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    return null;
  }
}

async function cacheNearbyUsers(userId, lat, lng, radius, users, ttl = 300) {
  if (!redisClient) return;
  try {
    const key = `nearby:${userId}:${lat.toFixed(2)}:${lng.toFixed(2)}:${radius}`;
    await redisClient.setEx(key, ttl, JSON.stringify(users));
  } catch (error) {}
}

async function getCachedNearbyUsers(userId, lat, lng, radius) {
  if (!redisClient) return null;
  try {
    const key = `nearby:${userId}:${lat.toFixed(2)}:${lng.toFixed(2)}:${radius}`;
    const data = await redisClient.get(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    return null;
  }
}

async function invalidateUserCache(userId) {
  if (!redisClient) return;
  try {
    await redisClient.del(`recommendations:${userId}`);
  } catch (error) {}
}

module.exports = {
  initializeRedisClient,
  getRedisClient,
  cacheRecommendations,
  getCachedRecommendations,
  cacheNearbyUsers,
  getCachedNearbyUsers,
  invalidateUserCache,
};