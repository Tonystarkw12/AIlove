本文档针对 AIlove 项目的当前架构进行生产就绪性评估，识别关键风险点并提供分级优化方案。评估覆盖**安全加固**、**容器编排**、**反向代理**、**数据库性能**、**服务弹性**和**可观测性**六大维度，所有建议均基于代码库中可验证的实现模式。

## 一、生产就绪性评估总览

基于对当前代码库的系统性审查，项目在生产部署方面存在以下关键差距：

| 维度 | 当前状态 | 生产风险等级 | 优先级 |
|------|----------|-------------|--------|
| 容器编排 | docker-compose 使用开发卷挂载，缺少前端 Dockerfile | 🔴 高 | P0 |
| 安全加固 | CORS 全开放、无速率限制、无 Helmet、JWT 过期仅 1 小时 | 🔴 高 | P0 |
| 反向代理 | Nginx 缺少 WebSocket 代理、无 Gzip、无安全头 | 🟡 中 | P1 |
| 数据库连接 | 连接池使用默认配置、无健康检查 | 🟡 中 | P1 |
| 服务弹性 | 无优雅关闭、无 PM2 进程管理、AI 调用无并发控制 | 🟡 中 | P1 |
| 可观测性 | Winston 日志已实现，缺少健康检查端点和 metrics | 🟢 低 | P2 |

Sources: [docker-compose.yml](docker-compose.yml#L1-L40), [nginx.conf](nginx.conf#L1-L31), [backend/server.js](backend/server.js#L1-L84), [backend/.env.example](backend/.env.example#L1-L25)

## 二、容器编排优化（P0）

### 2.1 Docker Compose 生产配置重构

当前 `docker-compose.yml` 存在三个生产风险：**开发卷挂载暴露源码**、**缺少前端构建阶段**、**无资源限制和健康检查**。

**问题代码**：[docker-compose.yml](docker-compose.yml#L8-L10) 中 `volumes: - ./backend:/usr/src/app/backend` 将宿主机源码直接挂载到容器中，这在生产环境中会导致：
- 容器内 `node_modules` 与宿主机环境不兼容（尤其 Alpine vs glibc 差异）
- 源码暴露增加攻击面
- 文件系统 I/O 性能下降

**生产环境 docker-compose.yml 参考配置**：

```yaml
version: '3.8'

services:
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
      target: production  # 使用多阶段构建的 production 阶段
    expose:
      - "3000"  # 仅对内部网络暴露，不映射到宿主机端口
    env_file:
      - ./backend/.env
    restart: always
    healthcheck:
      test: ["CMD", "wget", "--spider", "-q", "http://localhost:3000/"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 256M
    networks:
      - app-network

  frontend:
    build:
      context: ./frontend-react
      dockerfile: Dockerfile
    expose:
      - "80"
    depends_on:
      backend:
        condition: service_healthy
    volumes:
      - ./nginx.conf:/etc/nginx/conf.d/default.conf:ro
    restart: always
    networks:
      - app-network

  redis:
    image: redis:7-alpine
    command: redis-server --requirepass ${REDIS_PASSWORD} --maxmemory 256mb --maxmemory-policy allkeys-lru
    expose:
      - "6379"
    volumes:
      - redis-data:/data
    restart: always
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 30s
      timeout: 10s
      retries: 3
    networks:
      - app-network

networks:
  app-network:
    driver: bridge

volumes:
  redis-data:
    driver: local
```

**关键变更说明**：
- 移除所有 `ports` 映射，端口仅通过 Nginx 暴露到外部
- 添加 `healthcheck` 实现服务间依赖的健康感知
- 引入 `deploy.resources` 限制资源消耗，防止单容器耗尽宿主机资源
- 添加 Redis 服务，配置内存淘汰策略 `allkeys-lru`
- 使用 `restart: always` 替代 `unless-stopped`，配合 Docker 守护进程实现自动恢复

Sources: [docker-compose.yml](docker-compose.yml#L1-L40), [backend/Dockerfile](backend/Dockerfile#L1-L26)

### 2.2 后端 Dockerfile 多阶段构建

当前 Dockerfile 使用单层构建，镜像体积大且包含开发依赖：[backend/Dockerfile](backend/Dockerfile#L1-L26)。

**生产级 Dockerfile**：

```dockerfile
# 阶段 1：依赖安装
FROM node:18-alpine AS dependencies
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# 阶段 2：构建
FROM node:18-alpine AS build
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm ci
COPY . .

# 阶段 3：生产运行
FROM node:18-alpine AS production
WORKDIR /usr/src/app

# 创建非 root 用户
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodeuser -u 1001 -G nodejs

# 仅复制生产依赖和应用代码
COPY --from=dependencies /usr/src/app/node_modules ./node_modules
COPY --from=build /usr/src/app ./

# 创建日志目录
RUN mkdir -p /usr/src/app/logs && chown -R nodeuser:nodejs /usr/src/app

USER nodeuser

EXPOSE 3000

ENV NODE_ENV=production
CMD ["node", "server.js"]
```

**优化效果**：
- 最终镜像仅包含 `production` 依赖，体积减少约 60%
- 使用 `npm ci` 替代 `npm install`，确保依赖锁定和可重现构建
- 以非 root 用户运行，降低容器逃逸风险
- 设置 `NODE_ENV=production` 触发 Express 生产模式优化

Sources: [backend/Dockerfile](backend/Dockerfile#L1-L26), [backend/package.json](backend/package.json#L1-L31)

### 2.3 前端 Dockerfile 创建

当前项目中**不存在前端 Dockerfile**，但 `docker-compose.yml` 中引用了 `frontend/Dockerfile`（且上下文指向 `./frontend` 而非 `./frontend-react`）。这是部署阻断性问题。

**frontend-react/Dockerfile**：

```dockerfile
# 阶段 1：构建
FROM node:18-alpine AS builder
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# 阶段 2：Nginx 服务
FROM nginx:alpine AS production
COPY --from=builder /usr/src/app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

Sources: [docker-compose.yml](docker-compose.yml#L16-L17)

## 三、安全加固（P0）

### 3.1 速率限制

当前认证路由 [backend/routes/auth.js](backend/routes/auth.js#L1-L119) **完全没有速率限制**，攻击者可以对 `/api/auth/login` 和 `/api/auth/register` 发起无限次暴力破解请求。

**实现方案**：

```javascript
// backend/middleware/rateLimiter.js
const rateLimit = require('express-rate-limit');

// 登录接口：5 分钟最多 20 次尝试
const loginLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 20,
  message: { error: { code: "TOO_MANY_REQUESTS", message: "登录尝试次数过多，请稍后再试" } },
  standardHeaders: true,
  legacyHeaders: false,
});

// 注册接口：每小时最多 10 次注册
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: { error: { code: "TOO_MANY_REQUESTS", message: "注册次数过多，请稍后再试" } },
});

// API 全局限流：15 分钟最多 100 次
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: { code: "TOO_MANY_REQUESTS", message: "请求过于频繁" } },
});

module.exports = { loginLimiter, registerLimiter, apiLimiter };
```

在 [backend/server.js](backend/server.js#L17-L18) 中间件链中应用：

```javascript
const { apiLimiter } = require('./middleware/rateLimiter');
app.use('/api', apiLimiter);  // 全局 API 限流
```

在 [backend/routes/auth.js](backend/routes/auth.js#L10-L11) 路由级别应用：

```javascript
const { loginLimiter, registerLimiter } = require('../middleware/rateLimiter');
router.post('/login', loginLimiter, async (req, res) => { ... });
router.post('/register', registerLimiter, async (req, res) => { ... });
```

### 3.2 Helmet 安全头

当前 [backend/server.js](backend/server.js#L1-L84) 未配置任何 HTTP 安全响应头。

```javascript
// 在 server.js 中间件链中添加
const helmet = require('helmet');
app.use(helmet());

// 自定义 CSP（允许内联样式用于 Tailwind，但限制脚本来源）
app.use(helmet.contentSecurityPolicy({
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'"],
    styleSrc: ["'self'", "'unsafe-inline'"],
    imgSrc: ["'self'", "data:", "https:"],
    connectSrc: ["'self'"],
  }
}));
```

### 3.3 CORS 精细化配置

当前 [backend/server.js](backend/server.js#L15) 使用 `app.use(cors())` 允许**所有来源**访问。生产环境必须限定允许的来源列表：

```javascript
const cors = require('cors');
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['https://yourdomain.com'];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400 // 预检请求缓存 24 小时
}));
```

环境变量配置：

```env
ALLOWED_ORIGINS=https://loveai.201014.xyz,https://api.loveai.201014.xyz
```

Sources: [backend/server.js](backend/server.js#L15), [backend/routes/auth.js](backend/routes/auth.js#L1-L119), [backend/middleware/authenticateToken.js](backend/middleware/authenticateToken.js#L1-L26)

### 3.4 JWT 安全增强

当前 JWT 配置存在两个问题：
1. **过期时间仅 1 小时**且无刷新机制，用户体验差
2. **密钥直接从环境变量读取**，缺少密钥轮换策略

**生产级 JWT 配置**：

```env
# .env
JWT_SECRET=<通过 openssl rand -base64 64 生成的强密钥>
JWT_REFRESH_SECRET=<独立的刷新密钥>
JWT_ACCESS_EXPIRY=15m    # 访问令牌缩短为 15 分钟
JWT_REFRESH_EXPIRY=7d     # 刷新令牌 7 天
```

在 [backend/middleware/authenticateToken.js](backend/middleware/authenticateToken.js#L1-L26) 中增加密钥版本支持：

```javascript
// 支持密钥轮换：JWT_SECRET_V1, JWT_SECRET_V2
const JWT_SECRETS = [
  process.env.JWT_SECRET,
  process.env.JWT_SECRET_V1, // 旧密钥，用于验证尚未过期的令牌
].filter(Boolean);

// verify 时遍历所有有效密钥
let verified = false;
for (const secret of JWT_SECRETS) {
  try {
    user = jwt.verify(token, secret);
    verified = true;
    break;
  } catch (e) { /* try next */ }
}
```

Sources: [backend/.env.example](backend/.env.example#L15-L16), [backend/middleware/authenticateToken.js](backend/middleware/authenticateToken.js#L1-L26)

## 四、Nginx 生产配置优化（P1）

### 4.1 完整生产级 Nginx 配置

当前 [nginx.conf](nginx.conf#L1-L31) 缺少 WebSocket 代理、Gzip 压缩、缓存控制和安全头。

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    # 安全头
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Gzip 压缩
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_min_length 1000;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript image/svg+xml;

    # 静态资源缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        root /usr/share/nginx/html;
        expires 1y;
        add_header Cache-Control "public, immutable";
        try_files $uri $uri/ =404;
    }

    # 前端 SPA 路由
    location / {
        root /usr/share/nginx/html;
        try_files $uri $uri/ /index.html;
        add_header Cache-Control "no-cache";
    }

    # API 反向代理
    location /api/ {
        proxy_pass http://backend:3000/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # 请求体大小限制（防止大文件上传攻击）
        client_max_body_size 10m;

        # 超时配置
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # WebSocket 代理
    location /ws/ {
        proxy_pass http://backend:3000/ws/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket 超时（保持长连接）
        proxy_connect_timeout 7d;
        proxy_send_timeout 7d;
        proxy_read_timeout 7d;
    }

    # 健康检查端点（Nginx 自身）
    location /nginx-health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }

    error_page 500 502 503 504 /50x.html;
    location = /50x.html {
        root /usr/share/nginx/html;
    }
}
```

**关键改进**：
- **WebSocket 代理**：启用 `Upgrade` 和 `Connection` 头转发，这是当前 [nginx.conf](nginx.conf#L21-L23) 中被注释掉的关键功能，直接影响 [backend/services/websocketService.js](backend/services/websocketService.js#L10) 中 `/ws/chat` 路径在生产环境的可用性
- **Gzip 压缩**：减少前端资源传输体积 60-80%
- **静态资源缓存**：JS/CSS 等构建产物使用 `immutable` 策略，浏览器缓存 1 年
- **请求体限制**：`client_max_body_size 10m` 防止恶意大文件上传

Sources: [nginx.conf](nginx.conf#L1-L31), [backend/services/websocketService.js](backend/services/websocketService.js#L10-L11)

## 五、数据库连接池优化（P1）

### 5.1 PostgreSQL 连接池配置

当前 [backend/db.js](backend/db.js#L1-L29) 使用 `pg.Pool` 默认配置，未显式设置连接池参数。在高并发场景下可能导致连接耗尽。

```javascript
// backend/db.js 生产配置
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  max: 20,                    // 最大连接数（根据 PostgreSQL max_connections 调整）
  idleTimeoutMillis: 30000,   // 空闲连接 30 秒后释放
  connectionTimeoutMillis: 5000, // 连接超时 5 秒
  maxUses: 7500,              // 连接使用 7500 次后回收（防止内存泄漏）
});

// 连接池事件监控
pool.on('error', (err, client) => {
  logger.error('Unexpected error on idle client', { error: err.message });
});

pool.on('connect', (client) => {
  logger.debug('New database connection established');
});

pool.on('acquire', () => {
  logger.debug('Client acquired from pool');
});

pool.on('remove', () => {
  logger.debug('Client removed from pool');
});
```

**连接池大小计算参考**：

| 场景 | 公式 | 推荐值 |
|------|------|--------|
| 低并发（< 100 用户） | `cores * 2 + 1` | 5-9 |
| 中并发（100-1000 用户） | `cores * 3 + spool_disk` | 15-25 |
| 高并发（> 1000 用户） | 连接池 + PgBouncer | 20 + 代理层 |

对于 AI 匹配场景，每次推荐计算需要遍历候选用户并调用 AI API，连接占用时间较长，建议设置为 **15-20**。

Sources: [backend/db.js](backend/db.js#L1-L29)

### 5.2 数据库索引补充

审查 [backend/schema.sql](backend/schema.sql#L114-L141) 中的索引定义，发现以下缺失：

```sql
-- 缺失的复合索引（用于推荐查询的粗筛阶段）
CREATE INDEX idx_users_preference_composite ON users(
  preferred_gender,
  preferred_age_min,
  preferred_age_max
) WHERE preferred_gender IS NOT NULL;

-- chat_messages 的未读消息查询优化
CREATE INDEX idx_chat_messages_unread ON chat_messages(receiver_id, timestamp DESC)
  WHERE status = 'sent';

-- community_photos 审核队列查询优化
CREATE INDEX idx_community_photos_review_queue ON community_photos(status, created_at ASC)
  WHERE status = 'pending';
```

Sources: [backend/schema.sql](backend/schema.sql#L114-L141)

## 六、服务弹性与进程管理（P1）

### 6.1 优雅关闭

当前 [backend/server.js](backend/server.js#L77-L80) 直接启动服务器，未处理进程信号。在容器重启或部署更新时，正在处理的请求会被强制中断。

```javascript
// 在 server.js 末尾添加优雅关闭逻辑
const gracefulShutdown = async (signal) => {
  logger.info(`${signal} received. Starting graceful shutdown...`);

  server.close(async () => {
    logger.info('HTTP server closed.');

    // 关闭 WebSocket 连接
    const { clients } = require('./services/websocketService');
    clients.forEach((ws, userId) => {
      ws.close(1001, 'Server shutting down');
      logger.info(`WebSocket client ${userId} closed.`);
    });

    // 关闭数据库连接池
    await pool.end();
    logger.info('Database pool closed.');

    // 关闭 Redis 连接
    const { getRedisClient } = require('./services/redisClient');
    const redisClient = getRedisClient();
    if (redisClient) {
      await redisClient.quit();
      logger.info('Redis connection closed.');
    }

    logger.info('Graceful shutdown complete.');
    process.exit(0);
  });

  // 强制退出超时（10 秒）
  setTimeout(() => {
    logger.error('Forced shutdown after timeout.');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
```

### 6.2 Express 请求体与安全限制

当前 [backend/server.js](backend/server.js#L15-L16) 的 `express.json()` 未设置大小限制：

```javascript
// 生产环境配置
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// 请求超时
const timeout = require('connect-timeout');
app.use(timeout('30s'));
```

### 6.3 AI 调用并发控制

[backend/services/recommendationService.js](backend/services/recommendationService.js#L131-L176) 中对候选用户**串行**调用 AI API，当候选列表有 50 人时，总耗时 = 50 × 单次 API 延迟。

**并发优化方案**：

```javascript
// 使用 P-limit 控制并发度
const pLimit = require('p-limit');
const limit = pLimit(5); // 最多 5 个并发 AI 调用

const aiPromises = candidates.map(candidate =>
  limit(async () => {
    // 原有 AI 调用逻辑
    const openAIResponse = await axios.post(...);
    // ...
  })
);

await Promise.allSettled(aiPromises); // 使用 allSettled 避免单个失败导致全部中断
```

`package.json` 新增依赖：
```json
"p-limit": "^5.0.0"
```

Sources: [backend/server.js](backend/server.js#L15-L16), [backend/services/recommendationService.js](backend/services/recommendationService.js#L131-L176)

## 七、可观测性完善（P2）

### 7.1 健康检查端点

当前项目在 [backend/server.js](backend/server.js#L32-L34) 中仅有一个简单的 `GET /` 路由返回运行状态文本，缺少生产级健康检查。

```javascript
// backend/routes/health.js
const express = require('express');
const pool = require('../db');
const { getRedisClient } = require('../services/redisClient');

const router = express.Router();

// 简单就绪检查（负载均衡器使用）
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
  });
});

// 深度就绪检查（编排系统使用）
router.get('/health/ready', async (req, res) => {
  const checks = {
    database: false,
    redis: false,
  };

  try {
    await pool.query('SELECT 1');
    checks.database = true;
  } catch (e) {
    checks.database = false;
  }

  try {
    const redisClient = getRedisClient();
    if (redisClient && redisClient.isOpen) {
      await redisClient.ping();
      checks.redis = true;
    }
  } catch (e) {
    checks.redis = false;
  }

  const allHealthy = Object.values(checks).every(v => v);
  res.status(allHealthy ? 200 : 503).json({
    status: allHealthy ? 'ready' : 'degraded',
    checks,
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
```

在 [backend/server.js](backend/server.js#L40-L51) 路由注册中添加：

```javascript
const healthRoutes = require('./routes/health');
app.use('/api/health', healthRoutes);
```

### 7.2 日志目录持久化

当前 Winston 日志配置写入 `backend/logs/` 目录（[backend/services/logger.js](backend/services/logger.js#L10)），但该目录未被 Docker 卷持久化，容器重建后日志丢失。

在 `docker-compose.yml` 中添加日志卷：

```yaml
backend:
  volumes:
    - app-logs:/usr/src/app/logs

volumes:
  app-logs:
    driver: local
```

### 7.3 Redis 缓存服务去重

代码库中存在**两个 Redis 客户端初始化模块**：
- [backend/services/redisClient.js](backend/services/redisClient.js#L1-L96) — 用于推荐和附近用户缓存
- [backend/services/cacheService.js](backend/services/cacheService.js#L1-L228) — 用于匹配分数缓存

这两个模块各自创建独立的 Redis 连接，浪费资源且增加连接数。建议统一为单例模式：

```javascript
// 统一使用 redisClient.js 作为唯一入口
// cacheService.js 应重构为：
const { getRedisClient } = require('./redisClient');

async function cacheMatchScore(userIdA, userIdB, matchData) {
  const client = getRedisClient();
  if (!client) return false;
  // ... 使用统一 client
}
```

Sources: [backend/services/redisClient.js](backend/services/redisClient.js#L1-L96), [backend/services/cacheService.js](backend/services/cacheService.js#L1-L30), [backend/services/logger.js](backend/services/logger.js#L10)

## 八、环境配置清单

生产部署前必须完成的 `.env` 配置项：

```env
# === 服务器 ===
NODE_ENV=production
PORT=3000
ALLOWED_ORIGINS=https://yourdomain.com

# === 数据库 ===
DATABASE_URL=postgresql://user:password@db-host:5432/aiyuelaodb
DB_SSL=true

# === JWT ===
JWT_SECRET=<openssl rand -base64 64>
JWT_REFRESH_SECRET=<独立的刷新密钥>

# === AI API ===
OPENAI_API_KEY=<智谱 AI 密钥>
OPENAI_BASE_URL=https://open.bigmodel.cn/api/coding/paas/v4
OPENAI_MODEL=glm-4.7

# === Redis ===
REDIS_URL=redis://:password@redis:6379
REDIS_PASSWORD=<强密码>

# === 日志 ===
LOG_LEVEL=info
```

**密钥生成命令**：
```bash
openssl rand -base64 64   # JWT 密钥
openssl rand -hex 32      # Redis 密码
```

Sources: [backend/.env.example](backend/.env.example#L1-L25)

## 九、优化实施路线图

```mermaid
gantt
    title 生产环境优化实施路线图
    dateFormat  YYYY-MM-DD
    section P0 - 阻断性问题
    创建前端 Dockerfile           :p0-1, 2026-01-01, 1d
    重构 docker-compose 生产配置   :p0-2, after p0-1, 2d
    添加速率限制中间件             :p0-3, after p0-2, 1d
    CORS 精细化配置               :p0-4, after p0-2, 1d
    section P1 - 重要优化
    Nginx 生产配置升级            :p1-1, after p0-4, 2d
    数据库连接池调优              :p1-2, after p0-4, 1d
    优雅关闭实现                  :p1-3, after p0-4, 1d
    AI 调用并发控制              :p1-4, after p0-4, 2d
    补充数据库索引               :p1-5, after p0-4, 1d
    统一 Redis 客户端            :p1-6, after p0-4, 1d
    section P2 - 完善性改进
    健康检查端点                 :p2-1, after p1-1, 1d
    日志目录持久化               :p2-2, after p1-1, 1d
    PM2 进程管理                 :p2-3, after p1-3, 1d
```

## 十、后续阅读

完成本页面优化后，建议按以下顺序深入相关主题：

1. [Docker 容器化部署](39-docker-rong-qi-hua-bu-shu) — 理解当前 Dockerfile 的构建细节
2. [Docker Compose 编排](40-docker-compose-bian-pai) — 了解多服务编排的完整配置
3. [Nginx 反向代理配置](41-nginx-fan-xiang-dai-li-pei-zhi) — 深入学习 Nginx 配置原理
4. [Redis 缓存策略](10-redis-huan-cun-ce-lue) — 缓存架构的设计与优化
5. [WebSocket 实时通信](9-websocket-shi-shi-tong-xin) — 实时通信的生产级配置