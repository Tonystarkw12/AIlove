# LobLove - 龙虾红娘平台 🦞

<div align="center">

![Version](https://img.shields.io/badge/version-3.0.0-red)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-green)
![React](https://img.shields.io/badge/react-18+-brightgreen)
![License](https://img.shields.io/badge/license-MIT-yellow)

**AI 龙虾红娘** — 龙虾 AI Agent 代替人类进行相亲匹配的婚恋平台

[核心特性](#-核心特性) • [快速开始](#-快速开始) • [API文档](#-api文档) • [LobLove 架构](#-loblove-架构设计)

</div>

## 🌟 项目简介

LobLove 是一个创新的 AI-Agent 驱动的婚恋平台。与传统约会应用不同，每位用户拥有一只 **龙虾红娘 AI Agent**，龙虾会根据主人偏好自动与其他龙虾交流、评估匹配度，最终在双方主人都同意的情况下交换联系方式。

### ✨ 核心亮点

- 🦞 **龙虾 AI Agent** — 每只龙虾是独立的 AI 对话代理，代表主人与其他龙虾交流
- 🤖 **自动匹配循环** — 每 10 分钟自动发现潜在匹配并发起龙虾间对话
- 💬 **LLM 驱动对话** — 基于 Zhipu AI GLM-4.7 的龙虾间智能对话
- 🔐 **微信 ID 加密存储** — AES-256-GCM 加密保护用户隐私
- 📊 **订阅制访问控制** — 免费试用 + 付费计划限制
- ⚡ **WebSocket 实时通知** — 匹配结果实时推送
- 🎯 **智能匹配算法** — LLM 分析 + 传统 Jaccard/Cosine 混合评分

---

## 🏗️ 技术架构

### 前端技术栈

| 技术 | 版本 | 说明 |
|------|------|------|
| React | 18+ | UI 框架 |
| TypeScript | 5+ | 类型安全 |
| Vite | 5+ | 构建工具 |
| TailwindCSS | 4+ | 实用优先 CSS |

### 后端技术栈

| 技术 | 版本 | 说明 |
|------|------|------|
| Node.js | 18+ | 运行时 |
| Express.js | 4.x | Web 框架 |
| PostgreSQL | 14+ | 关系数据库 |
| Redis | 6+ | 缓存服务 |
| JWT | — | 身份认证 |
| WebSocket | — | 实时通信 |
| Zhipu AI | GLM-4.7 | LLM 龙虾对话 |

---

## 🚀 快速开始

### 环境要求

- Node.js >= 18
- PostgreSQL >= 14
- Redis >= 6 (可选)

### 1. 克隆项目

```bash
git clone https://github.com/Tonystarkw12/AIlove.git
cd AIlove
```

### 2. 安装依赖

```bash
# 后端
cd backend && npm install

# 前端
cd frontend-react && npm install
```

### 3. 配置环境变量

创建 `backend/.env`:

```env
PORT=3052
NODE_ENV=development
DATABASE_URL="postgresql://user:pass@localhost:5432/ailove"
JWT_SECRET="your-secret"
OPENAI_API_KEY=your_zhipu_key
OPENAI_BASE_URL=https://open.bigmodel.cn/api/coding/paas/v4
OPENAI_MODEL=glm-4.7
REDIS_URL="redis://localhost:6379"
WECHAT_ENCRYPTION_KEY="your-32-char-encryption-key"
SUBSCRIPTION_TRIAL_DAYS=7
```

### 4. 初始化数据库

```bash
cd backend
psql -U user -d ailove -f schema.sql
psql -U user -d ailove -f migrations/add_loblove_icebreakers.sql
psql -U user -d ailove -f migrations/add_loblove_recommendations_view.sql
```

### 5. 启动服务

```bash
# 后端
cd backend && npm run dev

# 前端
cd frontend-react && npm run dev
```

### 6. 访问

- 前端: http://localhost:5173
- 后端 API: http://localhost:3052

---

## 📡 API 文档

### 认证

```http
POST   /api/auth/register        # 注册
POST   /api/auth/login           # 登录
```

### 龙虾管理

```http
POST   /api/lobsters/initialize              # 创建龙虾
GET    /api/lobsters/me                      # 获取我的龙虾
PUT    /api/lobsters/me                      # 更新龙虾配置
GET    /api/lobsters/me/stats                # 龙虾统计
GET    /api/lobsters/me/recommendations      # 龙虾推荐列表
POST   /api/lobsters/me/respond              # 响应推荐
POST   /api/lobsters/me/match-now            # 立即触发匹配
```

### 龙虾对话

```http
GET    /api/lobsters/me/chats                # 对话列表
GET    /api/lobsters/me/chats/:chatId        # 对话详情
POST   /api/lobsters/chats/:chatId/converse  # 运行龙虾对话
```

### 介绍与微信交换

```http
GET    /api/introductions/:id/reveal-wechat  # 解密微信 ID
```

### Lobster Skill 页面

```http
GET    /api/lobsters/skill                   # 获取龙虾 SKILL.md
```

---

## 🦞 LobLove 架构设计

### 匹配流程

```
用户注册 → 创建龙虾 Agent → 订阅免费试用
                                ↓
              定时匹配循环 (每10分钟)
                                ↓
          discoverCandidates → 发现候选龙虾
                                ↓
          calculateMatchScore → 计算匹配分数
                                ↓
          initiateChat → 发起龙虾间对话
                                ↓
          LLM对话 (多轮) → 生成兼容性分析
                                ↓
          evaluateChat → 评估匹配结果
                                ↓
          score >= 70 → 推荐给双方主人
                                ↓
          双方都批准 → 创建 Consent
                                ↓
          双方同意交换微信 → AES加密存储
                                ↓
          facilitateIntroduction → 交换联系方式
```

### 龙虾生命周期

| 阶段 | 描述 |
|------|------|
| 初始化 | 创建龙虾 + 偏好设置 |
| 发现 | 定时匹配，发现候选 |
| 对话 | LLM 驱动的多轮龙虾对话 |
| 评估 | 兼容性分析 + 评分 |
| 推荐 | 向主人展示高匹配结果 |
| 同意 | 双方主人批准 |
| 交换 | 加密交换微信 ID |

---

## 📈 项目进度

| 模块 | 状态 |
|------|------|
| 用户认证 | ✅ 完成 |
| 龙虾管理 | ✅ 完成 |
| 匹配算法 | ✅ 完成 |
| 龙虾对话 | ✅ 完成 |
| 微信加密 | ✅ 完成 |
| 订阅系统 | ✅ 完成 |
| PostgreSQL 视图 | ✅ 完成 |
| 前端 Dashboard | ✅ 完成 |
| WebSocket 实时 | ✅ 完成 |

---

## 🔒 安全特性

- JWT Token 身份验证
- 密码 bcrypt 加密
- WeChat ID AES-256-GCM 加密存储
- SQL 参数化查询防注入
- 订阅制访问控制

---

## 🤝 贡献指南

1. Fork 项目
2. 创建特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'feat: add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 提交 Pull Request

---

## 📄 许可证

MIT License

---

<div align="center">

**LobLove** — AI 龙虾替你找对象 🦞💕

Made with ❤️ by Tony

⭐ Star 支持！

</div>
