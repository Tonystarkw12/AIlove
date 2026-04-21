本篇文档引导初学者在本地环境中快速启动 **AIlove** 项目——一个基于宝可梦 GameBoy 复古风格的 AI 智能约会平台。通过逐步指导，你将完成从环境准备到项目运行的完整流程，并理解项目的整体结构。

## 项目概览

AIlove 是一个融合了 **宝可梦主题 UI**、**AI 智能匹配** 和 **游戏化体验** 的现代化约会应用。项目采用前后端分离架构，后端提供 RESTful API 与 WebSocket 实时通信，前端以 React + TypeScript 构建移动端优先的界面。

```mermaid
flowchart TD
    subgraph Client["前端 (React + TypeScript)"]
        A[LoginPage] --> B[HomePage]
        B --> C[MapPage]
        B --> D[ChatPage]
        B --> E[CommunityPage]
        B --> F[ProfilePage]
        B --> G[PokeballPage]
    end

    subgraph Server["后端 (Node.js + Express)"]
        H[auth.js] --> I[users.js]
        H --> J[recommendations.js]
        I --> K[chat.js]
        I --> L[community.js]
        I --> M[pokeball.js]
        I --> N[map.js]
    end

    subgraph Data["数据层"]
        O[(PostgreSQL + PostGIS)]
        P[(Redis)]
    end

    Client -- "HTTP / WebSocket" --> Server
    Server -- "查询 / 缓存" --> O
    Server -- "会话缓存" --> P
```

**核心数据流**：用户通过前端发起请求 → Nginx 反向代理路由到后端 → Express 处理业务逻辑 → PostgreSQL 持久化数据 / Redis 缓存加速 → 响应返回前端渲染。

Sources: [README.md](README.md#L1-L50), [backend/server.js](backend/server.js#L1-L84), [frontend-react/src/App.tsx](frontend-react/src/App.tsx#L1-L123)

## 环境准备

在开始之前，请确保你的开发环境满足以下要求：

| 组件 | 最低版本 | 用途 | 安装指引 |
|------|---------|------|---------|
| Node.js | 18.x | 后端运行时 & 前端构建工具 | [nodejs.org](https://nodejs.org/) |
| PostgreSQL | 14.x + PostGIS 3.3 | 关系型数据库 & 地理空间查询 | [postgis.net](https://postgis.net/) |
| Redis | 6.x | 会话缓存与推荐加速（可选） | [redis.io](https://redis.io/) |
| Docker | 20.x+ | 容器化一键部署（推荐方式） | [docker.com](https://docker.com/) |
| npm | 9.x+ | 包管理器 | 随 Node.js 一起安装 |

> **新手提示**：如果你首次接触此类项目，推荐使用 **Docker 方式**启动，可以自动处理 PostgreSQL 和 Redis 的环境配置。

Sources: [backend/package.json](backend/package.json#L1-L31), [frontend-react/package.json](frontend-react/package.json#L1-L36), [backend/.env.example](backend/.env.example#L1-L25)

## 方式一：Docker Compose 一键启动（推荐）

这是最快捷的启动方式，适合希望快速体验项目的开发者。

### 第一步：克隆项目

```bash
git clone https://github.com/your-username/AIlove.git
cd AIlove
```

### 第二步：配置环境变量

在后端目录中创建 `.env` 文件：

```bash
cp backend/.env.example backend/.env
```

编辑 `backend/.env`，至少修改以下关键配置：

```env
PORT=3000
NODE_ENV=development
DATABASE_URL="postgresql://aiyueuser:aiyuepass123@db:5432/aiyuelaodb"
JWT_SECRET="your-very-strong-jwt-secret-key-here"
```

> **注意**：Docker 模式下，数据库主机名应使用 `db`（容器服务名），而非 `localhost`。

### 第三步：启动服务

```bash
docker-compose up -d
```

该命令将并行构建并启动以下容器：

```mermaid
flowchart LR
    subgraph Docker["Docker Compose 服务"]
        A[frontend:8085] -- "Nginx 代理" --> B[backend:3050]
        B -- "数据库连接" --> C[(PostgreSQL:5434)]
        B -- "缓存" --> D[(Redis:6379)]
    end
    
    User["浏览器"] -- "localhost:8085" --> A
```

| 服务 | 容器端口 | 宿主机端口 | 说明 |
|------|---------|-----------|------|
| frontend | 80 | 8085 | React 应用通过 Nginx 提供服务 |
| backend | 3000 | 3050 | Express API 服务 |
| postgresql | 5432 | 5434 | 需单独启动（见下方） |

Sources: [docker-compose.yml](docker-compose.yml#L1-L40), [nginx.conf](nginx.conf#L1-L31)

## 方式二：手动本地开发模式

如果你需要对代码进行实时调试和修改，推荐使用手动模式。

### 第一步：启动数据库

使用 Docker 快速启动 PostgreSQL（含 PostGIS 扩展）：

```bash
docker run -d --name ailove-postgres \
  -e POSTGRES_USER=aiyueuser \
  -e POSTGRES_PASSWORD=aiyuepass123 \
  -e POSTGRES_DB=aiyuelaodb \
  -p 5434:5432 \
  postgis/postgis:15-3.3-alpine
```

等待约 5 秒后，初始化数据库表结构：

```bash
cd backend
docker exec -i ailove-postgres psql -U aiyueuser -d aiyuelaodb < schema.sql
```

### 第二步：启动 Redis（可选）

```bash
docker run -d --name ailove-redis -p 6379:6379 redis:7-alpine
```

### 第三步：配置后端

```bash
cd backend
cp .env.example .env
```

编辑 `.env` 文件：

```env
PORT=3052
NODE_ENV=development
DATABASE_URL="postgresql://aiyueuser:aiyuepass123@localhost:5434/aiyuelaodb"
DB_SSL=false
JWT_SECRET="your-very-strong-jwt-secret-key-here"
REDIS_URL="redis://localhost:6379"
OPENAI_API_KEY=your_zhipu_ai_api_key
OPENAI_BASE_URL=https://open.bigmodel.cn/api/coding/paas/v4
OPENAI_MODEL=glm-4.7
```

### 第四步：安装依赖并启动后端

```bash
cd backend
npm install
npm run dev
```

后端服务将在 `http://localhost:3052` 启动。访问根路径可验证服务状态。

### 第五步：配置并启动前端

打开新终端窗口：

```bash
cd frontend-react
npm install
npm run dev
```

前端开发服务器默认在 `http://localhost:5173` 运行。

Sources: [backend/schema.sql](backend/schema.sql#L1-L80), [frontend-react/src/config.ts](frontend-react/src/config.ts#L1-L53), [backend/Dockerfile](backend/Dockerfile#L1-L26)

## 项目结构导览

理解项目目录组织有助于高效开发：

```
AIlove/
├── backend/                    # 后端服务
│   ├── server.js              # 入口文件：Express + WebSocket 初始化
│   ├── db.js                  # PostgreSQL 连接池配置
│   ├── routes/                # API 路由（认证、用户、聊天、社区等）
│   ├── services/              # 业务逻辑层（缓存、日志、匹配算法、WebSocket）
│   ├── migrations/            # 数据库迁移脚本
│   ├── schema.sql             # 数据库完整表结构定义
│   └── package.json           # 后端依赖清单
│
├── frontend-react/             # 前端应用
│   ├── src/
│   │   ├── App.tsx            # 路由定义与受保护路由
│   │   ├── main.tsx           # React 应用入口
│   │   ├── config.ts          # API 地址与端点常量
│   │   ├── contexts/          # React Context（认证状态）
│   │   ├── pages/             # 页面组件（登录、首页、地图、聊天等）
│   │   ├── components/        # 可复用 UI 组件（GameBoy 按钮、HP/EXP 条等）
│   │   ├── services/          # API 请求封装
│   │   └── types/             # TypeScript 类型定义
│   └── package.json           # 前端依赖清单
│
├── docker-compose.yml          # Docker 编排配置
├── nginx.conf                  # Nginx 反向代理配置
└── music/ & pictures/          # 静态资源（背景音乐、充值二维码图片）
```

Sources: [backend/server.js](backend/server.js#L30-L58), [frontend-react/src/App.tsx](frontend-react/src/App.tsx#L42-L110)

## 验证启动状态

项目启动后，通过以下方式验证各组件是否正常：

| 检查项 | 方法 | 预期结果 |
|--------|------|---------|
| 后端 API | `curl http://localhost:3052/` | 返回 "AI Yue Lao Backend is running!" |
| 前端页面 | 浏览器访问 `http://localhost:5173` | 显示 GameBoy 风格登录页 |
| 数据库连接 | 查看后端终端日志 | 无 "数据库连接失败" 错误 |
| WebSocket | 前端登录后进入聊天页 | 消息实时收发正常 |
| Redis 缓存 | 查看后端日志 | 无 "Redis初始化失败" 警告（如未配置可忽略） |

### 前端关键配置校验

打开 [frontend-react/src/config.ts](frontend-react/src/config.ts#L1-L6)，确认以下地址与你的后端服务地址一致：

```typescript
export const API_BASE_URL = 'http://192.168.0.14:3052/api';
export const WS_URL = 'ws://192.168.0.14:3052/ws/chat';
```

> **注意**：如果你的后端运行在 `localhost`，需将 `192.168.0.14` 修改为 `localhost` 或 `127.0.0.1`。

## API 端点速查

后端提供以下核心 API 模块：

| 路由前缀 | 功能 | 关键文件 |
|---------|------|---------|
| `/api/auth` | 用户注册、登录、微信登录 | [auth.js](backend/routes/auth.js), [wechatAuth.js](backend/routes/wechatAuth.js) |
| `/api/users` | 用户资料、头像、匹配记录 | [users.js](backend/routes/users.js), [matches.js](backend/routes/matches.js) |
| `/api/recommendations` | AI 智能推荐列表 | [recommendations.js](backend/routes/recommendations.js) |
| `/api/chat` | 聊天消息发送与历史 | [chat.js](backend/routes/chat.js) |
| `/api/map` | 附近用户、位置更新 | [map.js](backend/routes/map.js) |
| `/api/community` | 照片墙上传、浏览、点赞 | [community.js](backend/routes/community.js) |
| `/api/pokeball` | 精灵球积分系统 | [pokeball.js](backend/routes/pokeball.js) |
| `/api/tasks` | 约会任务 | [tasks.js](backend/routes/tasks.js) |
| `/api/spots` | 约会地点 | [spots.js](backend/routes/spots.js) |
| `/api/rewards` | 积分奖励 | [rewards.js](backend/routes/rewards.js) |

Sources: [backend/server.js](backend/server.js#L34-L58)

## 下一步学习路径

完成环境搭建后，建议按照以下顺序深入学习：

1. **[项目概述](1-xiang-mu-gai-shu)** — 了解产品愿景、功能规划和设计哲学
2. **[技术栈与依赖](3-ji-zhu-zhan-yu-yi-lai)** — 深入了解各技术选型的原因与版本
3. **[核心功能导览](4-he-xin-gong-neng-dao-lan)** — 浏览主要功能模块的使用流程
4. **[环境变量说明](5-huan-jing-bian-liang-shuo-ming)** — 掌握所有配置项的含义
5. **[数据库初始化与迁移](6-shu-ju-ku-chu-shi-hua-yu-qian-yi)** — 学习数据库管理与数据迁移流程

当你对整体结构有了初步认识后，可以进入 **[系统整体架构](7-xi-tong-zheng-ti-jia-gou)** 深入理解系统各组件的协作方式。

## 常见问题

**Q: 前端无法连接后端 API？**
检查 `frontend-react/src/config.ts` 中的 `API_BASE_URL` 是否与后端实际运行地址一致。

**Q: 数据库连接失败？**
确认 PostgreSQL 容器已启动（`docker ps`），且 `.env` 中 `DATABASE_URL` 的主机名正确（Docker 模式用 `db`，本地模式用 `localhost`）。

**Q: `schema.sql` 导入报错？**
确保使用的是包含 PostGIS 扩展的 PostgreSQL 镜像（`postgis/postgis`），普通 `postgres` 镜像缺少 `CREATE EXTENSION postgis` 支持。

**Q: WebSocket 连接断开？**
检查 `WS_URL` 配置，确保 WebSocket 路径 `/ws/chat` 未被 Nginx 拦截。Docker 模式下需要额外配置 WebSocket 代理头。