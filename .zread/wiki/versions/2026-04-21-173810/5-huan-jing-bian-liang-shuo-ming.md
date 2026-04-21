本文档系统性地介绍 AI月老（AIlove）项目中所有环境变量的用途、配置方式与最佳实践。环境变量是应用程序在不同部署环境（开发、测试、生产）中保持行为一致的核心机制，正确配置它们是项目成功运行的第一步。

## 环境变量架构概览

AI月老项目采用 **分层配置架构**，环境变量主要分布在后端服务中，前端配置则通过 TypeScript 常量管理。理解这个架构有助于你快速定位需要修改的配置项。

```mermaid
graph TD
    A[".env 文件"] -->|dotenv 加载| B[Node.js process.env]
    B --> C[server.js - 端口/环境]
    B --> D[db.js - 数据库连接]
    B --> E[redisClient.js - 缓存服务]
    B --> F[matchingAlgorithm.js - AI匹配]
    B --> G[recommendationService.js - 推荐引擎]
    B --> H[logger.js - 日志级别]
    B --> I[auth.js - JWT签名]
    
    J["config.ts"] --> K[前端 API 地址]
    J --> L[WebSocket 地址]
    J --> M[静态资源地址]
    
    N[docker-compose.yml] -->|env_file| A
    
    style A fill:#e1f5fe
    style B fill:#fff3e0
    style J fill:#f3e5f5
    style N fill:#e8f5e9
```

**配置加载链路**：项目启动时，`dotenv` 库读取 `backend/.env` 文件，将所有键值对注入到 `process.env` 对象中，各模块随后通过 `process.env.VARIABLE_NAME` 访问对应配置。

Sources: [backend/.env.example](backend/.env.example#L1-L25), [backend/server.js](backend/server.js#L1-L10), [backend/db.js](backend/db.js#L1-L5), [docker-compose.yml](docker-compose.yml#L10-L12)

## 后端环境变量详解

### 1. 服务器配置

| 变量名 | 默认值 | 必填 | 说明 |
|--------|--------|------|------|
| `PORT` | `3000` | 否 | HTTP 服务器监听端口，Docker 部署时默认映射到宿主机的 3050 端口 |
| `NODE_ENV` | `development` | 否 | 运行环境标识，影响日志输出级别和错误详情展示 |

`PORT` 决定了后端服务在网络上的入口点。开发环境下通常使用 3000 或 3052，生产环境建议通过反向代理（Nginx）统一暴露 80/443 端口。`NODE_ENV` 在设为 `production` 时会抑制详细错误堆栈输出，提升安全性。

Sources: [backend/server.js](backend/server.js#L11), [backend/.env.example](backend/.env.example#L5-L7)

### 2. 数据库配置

| 变量名 | 示例值 | 必填 | 说明 |
|--------|--------|------|------|
| `DATABASE_URL` | `postgresql://user:pass@host:5432/dbname` | 是 | PostgreSQL 连接字符串，需包含 PostGIS 扩展 |
| `DB_SSL` | `false` / `true` | 否 | 是否启用 SSL 加密连接，云服务部署时建议设为 `true` |

连接字符串遵循标准 URI 格式：`postgresql://用户名:密码@主机地址:端口/数据库名`。项目使用 `pg` 连接池管理数据库连接，SSL 配置通过 `rejectUnauthorized: false` 处理自签名证书场景，适合内网或开发环境。

Sources: [backend/.env.example](backend/.env.example#L9-L11), [backend/db.js](backend/db.js#L5-L12)

### 3. JWT 认证配置

| 变量名 | 示例值 | 必填 | 说明 |
|--------|--------|------|------|
| `JWT_SECRET` | 随机生成的 32+ 字节字符串 | 是 | JWT Token 签名密钥，直接决定认证系统安全性 |

JWT（JSON Web Token）用于用户身份认证。所有需要登录的 API 请求都会携带 Token，中间件通过 `JWT_SECRET` 验证其合法性。**生成强密钥的方法**：在终端执行 `openssl rand -base64 32`，将输出结果填入该变量。切勿在代码中硬编码或使用弱密钥（如 `123456`）。

Sources: [backend/.env.example](backend/.env.example#L13-L15), [backend/routes/auth.js](backend/routes/auth.js#L51-L55), [backend/middleware/authenticateToken.js](backend/middleware/authenticateToken.js#L10)

### 4. Redis 缓存配置

| 变量名 | 示例值 | 必填 | 说明 |
|--------|--------|------|------|
| `REDIS_URL` | `redis://localhost:6379` | 否 | Redis 连接地址，未配置时缓存功能自动降级 |

Redis 用于缓存用户推荐列表和附近用户查询结果，显著提升响应速度。配置为可选——如果 Redis 服务不可用，系统会优雅降级到直接查询数据库模式，仅影响性能而不影响功能。缓存键采用 `recommendations:{userId}` 和 `nearby:{userId}:{lat}:{lng}:{radius}` 格式。

Sources: [backend/.env.example](backend/.env.example#L17-L18), [backend/services/redisClient.js](backend/services/redisClient.js#L4-L5), [backend/services/redisClient.js](backend/services/redisClient.js#L42-L72)

### 5. AI 匹配引擎配置

| 变量名 | 示例值 | 必填 | 说明 |
|--------|--------|------|------|
| `OPENAI_API_KEY` | `sk-xxx...` | 否* | 智谱 AI / 通义千问 API 密钥 |
| `OPENAI_BASE_URL` | `https://coding.dashscope.aliyuncs.com/v1` | 否 | API 端点地址 |
| `OPENAI_MODEL` | `qwen3.5-plus` | 否 | 用于匹配分析的模型名称 |

这三项变量控制 LLM 智能匹配功能。当 `OPENAI_API_KEY` 未配置时，系统自动回退到传统匹配算法（基于兴趣标签 Jaccard 相似度、性格向量余弦相似度、地理距离加权计算）。配置后，匹配引擎采用 **60% LLM 分析 + 40% 地理距离** 的加权策略，提供更精准的匹配建议。

Sources: [backend/.env.example](backend/.env.example#L20-L23), [backend/services/matchingAlgorithm.js](backend/services/matchingAlgorithm.js#L7-L12), [backend/services/matchingAlgorithm.js](backend/services/matchingAlgorithm.js#L63-L78)

### 6. 推荐服务配置

| 变量名 | 示例值 | 必填 | 说明 |
|--------|--------|------|------|
| `GEMINI_API_BASE_URL` | `https://coding.dashscope.aliyuncs.com/v1` | 否* | 推荐引擎 API 端点 |
| `GEMINI_API_KEY` | `sk-xxx...` | 否* | 推荐引擎 API 密钥 |
| `GEMINI_MODEL` | `qwen3.5-plus` | 否 | 用于推荐分析的模型名称 |

推荐服务在用户注册或资料更新时自动触发，执行"粗筛 → 精筛 → 存储"三阶段流程。粗筛阶段通过性别、年龄、地理位置和兴趣标签过滤候选用户（最多 200 人），精筛阶段调用 AI API 逐一对候选人生成匹配分数、匹配理由和破冰话题。

Sources: [backend/.env](backend/.env#L18-L21), [backend/services/recommendationService.js](backend/services/recommendationService.js#L3-L5), [backend/services/recommendationService.js](backend/services/recommendationService.js#L94-L125)

### 7. 日志系统配置

| 变量名 | 默认值 | 必填 | 说明 |
|--------|--------|------|------|
| `LOG_LEVEL` | `info` | 否 | Winston 日志级别：`error` → `warn` → `info` → `http` → `debug` |

日志系统采用 Winston 框架，按日志级别分流到不同文件：错误日志保留 14 天、应用日志保留 30 天、API 访问日志保留 7 天。开发环境下建议设为 `debug` 以获取完整调试信息，生产环境建议设为 `warn` 或 `error` 减少磁盘占用。系统还会自动记录超过 1 秒的慢请求和超过 100ms 的慢数据库查询。

Sources: [backend/services/logger.js](backend/services/logger.js#L33-L36), [backend/services/logger.js](backend/services/logger.js#L52-L67), [backend/services/logger.js](backend/services/logger.js#L71-L74)

## 前端配置说明

前端项目不使用环境变量文件，而是通过 [config.ts](frontend-react/src/config.ts) 集中管理所有 API 地址。这种设计简化了构建流程，但意味着每次切换部署环境时需要手动修改该文件。

| 常量名 | 类型 | 说明 |
|--------|------|------|
| `API_BASE_URL` | 字符串 | 后端 REST API 基础地址 |
| `UPLOAD_BASE_URL` | 字符串 | 文件上传资源基础地址 |
| `WS_URL` | 字符串 | WebSocket 实时通信地址 |
| `MUSIC_BASE_URL` | 字符串 | 音乐资源基础地址 |
| `PICTURES_BASE_URL` | 字符串 | 图片资源基础地址 |

`API_ENDPOINTS` 对象采用常量映射方式定义所有 API 端点路径，避免在组件中硬编码 URL 字符串。`QR_CODE_IMAGES` 对象将充值金额映射到对应的二维码图片哈希文件名，支撑精灵球积分系统的充值功能。

Sources: [frontend-react/src/config.ts](frontend-react/src/config.ts#L1-L53)

## Docker Compose 环境变量注入

Docker Compose 通过 `env_file` 指令将 `backend/.env` 文件中的变量注入到后端容器中，实现配置与代码分离。

```mermaid
graph LR
    A[backend/.env] -->|env_file 指令| B[docker-compose.yml]
    B -->|环境变量注入| C[backend 容器]
    D[nginx.conf] -->|挂载配置| E[frontend 容器]
    
    C --> F[process.env]
    E --> G[/usr/share/nginx/html]
    
    style A fill:#e1f5fe
    style B fill:#fff3e0
    style C fill:#e8f5e9
```

注意 `docker-compose.yml` 中的端口映射：`"3050:3000"` 表示容器内部端口 3000 映射到宿主机端口 3050，这与 `backend/.env` 中 `PORT=3052` 的配置需要保持一致或理解其差异——Docker 映射优先级高于容器内环境变量。

Sources: [docker-compose.yml](docker-compose.yml#L6-L16), [docker-compose.yml](docker-compose.yml#L18-L30)

## 环境配置检查清单

在启动项目之前，请按以下步骤验证环境变量配置：

| 步骤 | 操作 | 验证方法 |
|------|------|----------|
| 1 | 复制 `.env.example` 为 `.env` | `ls backend/.env` |
| 2 | 修改 `DATABASE_URL` 为实际数据库地址 | 确认 PostgreSQL 服务运行中 |
| 3 | 生成并设置 `JWT_SECRET` | `openssl rand -base64 32` |
| 4 | 设置 `REDIS_URL`（可选） | `redis-cli ping` 返回 `PONG` |
| 5 | 填写 AI API 配置（可选） | 确认 API Key 有效 |
| 6 | 修改前端 `config.ts` 中的地址 | 确认与后端端口匹配 |
| 7 | 启动服务并观察日志 | 无数据库/Redis 连接错误 |

## 安全注意事项

**永远不要将 `.env` 文件提交到版本控制系统**。该文件包含数据库密码、API 密钥等敏感信息，泄露可能导致数据被篡改或服务被滥用。项目当前的 `.gitignore` 仅忽略了 `node_modules`，**建议在根目录和 `backend/` 目录的 `.gitignore` 中分别添加 `.env` 条目**。

生产环境部署时，建议使用 secrets 管理工具（如 Docker Secrets、AWS Secrets Manager 或 HashiCorp Vault）替代明文 `.env` 文件，并通过 CI/CD 管道安全注入配置。

Sources: [backend/.gitignore](backend/.gitignore#L1), [backend/.env](backend/.env#L1-L28)

## 下一步

完成环境变量配置后，你可以继续了解数据库的初始化与表结构：

- [数据库初始化与迁移](6-shu-ju-ku-chu-shi-hua-yu-qian-yi) — 了解如何创建数据库、执行迁移脚本
- [快速开始](2-kuai-su-kai-shi) — 完整的本地开发环境搭建指南
- [Docker Compose 编排](40-docker-compose-bian-pai) — 使用容器化方式一键启动所有服务