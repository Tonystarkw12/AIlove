# CLAUDE.md — LobLove 🦞

## Project Overview

LobLove 是一个 AI Agent 驱动的婚恋平台。每位用户拥有一只**龙虾红娘 AI Agent**，龙虾代表主人与其他龙虾自动交流、评估匹配度，双方同意后交换微信联系方式。

- 域名: `loveai.201014.xyz` (Cloudflare Tunnel → Nginx → 后端)
- 服务器: `192.168.0.14`，后端端口 `3052`

## Architecture

```
┌─────────────────────────────────────────────────────┐
│  landingpage/   — 营销落地页 (React + Vite + Cloudflare Workers)
├─────────────────────────────────────────────────────┤
│  frontend-react/ — SPA 前端 (React 19 + TS + Vite 7 + TailwindCSS 4)
│    src/pages/     — 14 个页面组件 (PascalCase 导出)
│    src/components/ — 共享组件 (GameboyButton, HpExpBar, MusicPlayer, TabBar)
│    src/contexts/  — AuthContext (JWT token 管理)
│    src/services/  — api.ts (API 配置 + endpoint 常量)
│    src/config.ts  — 环境检测，dev/prod API 地址切换
├─────────────────────────────────────────────────────┤
│  backend/         — API 服务 (Node.js + Express 4 + CommonJS)
│    server.js      — 入口，挂载路由 + WebSocket
│    db.js          — pg pool 连接
│    routes/        — 17 个路由模块 (auth, lobsters, chat, matches...)
│    services/      — 核心业务逻辑
│      lobsterOrchestrator.js    — 龙虾匹配编排器 (核心)
│      lobsterConversationService.js — LLM 龙虾对话
│      lobsterScheduler.js       — 定时匹配调度
│      matchingAlgorithm.js      — Jaccard/Cosine + LLM 混合评分
│      recommendationService.js  — 推荐服务
│      websocketService.js       — WebSocket 实时推送
│      crypto.js                 — AES-256-GCM 微信加密
│      subscriptionService.js    — 订阅制访问控制
│      cacheService.js           — Redis 缓存层
│    middleware/    — authenticateToken (JWT), rateLimiter
│    migrations/    — SQL 迁移脚本
│    schema.sql     — 数据库 DDL (PostgreSQL + PostGIS)
├─────────────────────────────────────────────────────┤
│  nginx.conf       — Nginx 反向代理 (HTTPS + 静态文件 + API/WS 代理)
│  docker-compose.yml — Docker 部署配置
└─────────────────────────────────────────────────────┘
```

## Tech Stack

| Layer | Stack |
|-------|-------|
| Frontend | React 19, TypeScript 5.9, Vite 7, TailwindCSS 4, react-router-dom 7 |
| Backend | Node.js 18+, Express 4, CommonJS (`require`) |
| Database | PostgreSQL 14+ (PostGIS), Redis 6+ |
| LLM | Zhipu AI GLM-4.7 (via OpenAI SDK) |
| Auth | JWT (jsonwebtoken), bcrypt (bcryptjs) |
| Realtime | WebSocket (ws) |
| Deploy | Nginx reverse proxy, Cloudflare Tunnel, Docker |
| Landing | React + Vite + wrangler (Cloudflare Workers) |

## Development Commands

```bash
# Backend
cd backend && npm run dev          # nodemon 热重载 (port 3052)
cd backend && npm start            # 生产启动

# Frontend
cd frontend-react && npm run dev   # Vite dev server (port 5175)
cd frontend-react && npm run build # tsc + vite build → dist/
cd frontend-react && npm run lint  # ESLint

# Landing page
cd landingpage && npm run dev      # Vite dev server
cd landingpage && npm run build    # 构建

# Database
psql -U user -d ailove -f backend/schema.sql
psql -U user -d ailove -f backend/migrations/add_loblove_system.sql
```

## Code Conventions

- **Backend**: CommonJS (`require`/`module.exports`)，不是 ESM
- **Frontend**: ESM + TypeScript，组件用 PascalCase 命名并命名导出 (`export function LoginPage`)
- **SQL**: 表名复数形式 (`users`, `lobsters`, `lobster_chats`)，字段蛇形命名
- **API 路径**: `/api/{module}/{action}`，RESTful 风格
- **Git 分支**: `frontend-react` (主开发分支)
- **Commit 风格**: Conventional Commits (`feat:`, `fix:`, `refactor:`, `chore:`)
- **语言**: 代码注释和 commit message 中英混用

## Core Domain: Lobster System

龙虾匹配的核心流程：

1. **初始化** — 用户创建龙虾 Agent，设置偏好
2. **调度** — `lobsterScheduler.js` 每 10 分钟触发匹配循环
3. **发现** — `lobsterOrchestrator.discoverCandidates()` 寻找候选龙虾
4. **评分** — `matchingAlgorithm.calculateMatchScore()` 混合评分
5. **对话** — `lobsterConversationService` LLM 驱动龙虾间多轮对话
6. **评估** — 对话后评估兼容性，score ≥ 70 推荐给主人
7. **同意** — 双方主人都批准后创建 consent
8. **交换** — 双方同意交换微信，AES-256-GCM 加密存储

## Key Database Tables

- `users` — 用户 (含 PostGIS 地理位置, 积分系统, 偏好设置)
- `lobsters` — 龙虾 Agent (owner_id, 偏好, 状态)
- `lobster_chats` — 龙虾间对话记录
- `lobster_chats_messages` — 对话消息
- `recommendations` — AI 匹配推荐
- `consents` — 双方同意记录
- `introductions` — 微信交换记录
- `subscriptions` — 订阅计划
- `dating_spots` / `dating_tasks` — 约会地点/任务 (PokéStop 风格)
- `pokeball_transactions` — 精灵球交易系统

## Environment Variables

后端 `.env` 关键配置：

```
PORT=3052
DATABASE_URL=postgresql://user:pass@localhost:5432/ailove
JWT_SECRET=...
OPENAI_API_KEY=...           # Zhipu AI key
OPENAI_BASE_URL=https://open.bigmodel.cn/api/coding/paas/v4
OPENAI_MODEL=glm-4.7
REDIS_URL=redis://localhost:6379
WECHAT_ENCRYPTION_KEY=...    # 32 字符 AES key
SUBSCRIPTION_TRIAL_DAYS=7
```

## Frontend Routing

| Path | Page | Layout |
|------|------|--------|
| `/login`, `/register` | 登录/注册 | 无 TabBar |
| `/` | HomePage | AppLayout (TabBar + MusicPlayer) |
| `/map` | MapPage (PostGIS 地图) | AppLayout |
| `/chat` | ChatPage | AppLayout |
| `/community` | CommunityPage (照片墙) | AppLayout |
| `/profile` | ProfilePage | AppLayout |
| `/pokeball` | PokeballPage (精灵球) | AppLayout |
| `/lobster` | LobsterPage (龙虾主页) | 无 AppLayout |
| `/lobster/chat` | LobsterChatPage | 无 AppLayout |
| `/lobster/skill` | LobsterSkillPage | 无 AppLayout |
| `/subscription` | SubscriptionPage | 无 AppLayout |
| `/consents` | ConsentPage | 无 AppLayout |
| `/introductions` | IntroductionPage | 无 AppLayout |

## Production Notes

- Nginx 监听 443 (HTTPS) + 80，Cloudflare Full SSL 模式
- 前端构建产物: `/home/tony/ailove-realtime/frontend-react/dist/`
- 静态资源代理: `/uploads/`, `/music/`, `/pictures/` → 后端 3052
- WebSocket: `/ws/` → 后端 3052
- 前端 `config.ts` 根据 hostname 自动切换 dev/prod API 地址
