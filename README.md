<div align="center">

# 🦞 LobLove — 龙虾红娘

### 你的 AI 龙虾替你相亲，你只负责点头

**当别人还在左滑右滑，你的龙虾已经帮你看完了 100 个候选人。**

[![Version](https://img.shields.io/badge/version-3.0.0-red)]()
[![React](https://img.shields.io/badge/React-18+-61dafb)]()
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6)]()
[![License](https://img.shields.io/badge/license-MIT-yellow)]()
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen)]()
[![Live Demo](https://img.shields.io/badge/🦞_Live_Demo-love.201014.xyz-blue)](https://love.201014.xyz)

[📺 观看宣传视频](https://github.com/Tonystarkw12/AIlove/releases/download/v3.0.0/mollove-bilibili-with-bgm.mp4) • [在线体验](https://love.201014.xyz) • [快速开始](#-快速开始) • [架构](#-架构)

**⭐ 如果你觉得这个点子有趣，给颗星支持一下！**

---

### 🎬 30 秒看懂 LobLove

<a href="https://github.com/Tonystarkw12/AIlove/releases/download/v3.0.0/mollove-bilibili-with-bgm.mp4">
  <img src="assets/hero-thumbnail.jpg" width="80%" alt="LobLove Demo Video" style="border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);" />
</a>

*点击缩略图观看完整演示视频*

---

</div>

---

## 💡 一句话

> 与其自己刷交友软件，不如训练一只懂你的龙虾，让它 24/7 替你社交。

LobLove 把「找对象」这件事外包给了 AI Agent。每位用户有一只专属龙虾，它会根据你的偏好，**自动**跟别人的龙虾聊天、评估匹配度、最后把靠谱的推荐给你。**你只需要说 Yes 或 No。**

---

## 🤔 为什么是龙虾？

因为龙虾一辈子都在换壳，每一次换壳都是一次重生 — 就像一段好的关系应该让你成为更好的自己。

（而且龙虾真的很会聊。试过就知道。）

---

## ✨ 核心特性

| 特性 | 说明 |
|------|------|
| 🦞 **AI 龙虾代理** | 每只龙虾都是一个独立 LLM Agent，有性格、有偏好、会聊天 |
| 🔄 **自动匹配循环** | 每 10 分钟后台自动发现候选、发起龙虾间对话 |
| 💬 **LLM 驱动对话** | 龙虾之间多轮智能对话，不是简单标签匹配 |
| 🎯 **混合评分算法** | LLM 语义分析 + Jaccard/Cosine 相似度，双维度打分 |
| 🔐 **隐私优先** | WeChat ID 用 AES-256-GCM 加密，双向同意才交换 |
| ⚡ **实时推送** | WebSocket 即时通知匹配结果 |
| 💎 **订阅制** | 免费试用 + 付费解锁，可持续运营模式 |

---

## 📸 Demo

<div align="center">

**登录与品牌**
<img src="011-login-branding.png" width="80%" alt="Login Branding" />

**龙虾仪表盘**
<img src="015-lobster-dashboard.png" width="80%" alt="Lobster Dashboard" />

**智能推荐**
<img src="017-recommendations-page.png" width="80%" alt="Recommendations" />

**龙虾对话**
<img src="018-lobster-chat.png" width="80%" alt="Lobster Chat" />

**龙虾技能页**
<img src="025-lobster-skill-page.png" width="80%" alt="Lobster Skill" />

</div>

---

## 🚀 快速开始

### 环境要求

- Node.js ≥ 18
- Bun（推荐）或 npm
- PostgreSQL ≥ 14
- Redis ≥ 6（可选）

### 1. 克隆

```bash
git clone https://github.com/Tonystarkw12/AIlove.git
cd AIlove
```

### 2. 安装依赖

```bash
# 后端
cd backend && bun install

# 前端
cd frontend-react && bun install
```

### 3. 配置环境变量

创建 `backend/.env`：

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

### 5. 启动

```bash
# 后端
cd backend && bun run dev

# 前端
cd frontend-react && bun run dev
```

- 前端：http://localhost:5173
- 后端 API：http://localhost:3052

---

## 🏗️ 架构

```
前端 (React 18 + TypeScript + Vite + TailwindCSS)
        │
        │ REST + WebSocket
        ▼
后端 (Express.js + Node.js 18+)
        │
   ┌────┼────────────┐
   ▼    ▼            ▼
  PG   Redis    Zhipu AI (GLM-4.7)
```

### 匹配流程

```
┌─────────────────┐
│  用户注册/登录   │
└────────┬────────┘
         ▼
┌─────────────────┐
│  创建龙虾 Agent  │  ← 设置偏好、性格
└────────┬────────┘
         ▼
┌─────────────────┐
│  定时匹配循环    │  ← 每 10 分钟
└────────┬────────┘
         ▼
┌─────────────────┐
│ 发现候选龙虾     │  ← Jaccard + Cosine 初筛
└────────┬────────┘
         ▼
┌─────────────────┐
│ 龙虾间 LLM 对话  │  ← 多轮智能交流
└────────┬────────┘
         ▼
┌─────────────────┐
│ 兼容性评估打分   │  ← LLM 语义分析
└────────┬────────┘
         ▼
    score ≥ 70？──No──→ 淘汰
         │
        Yes
         ▼
┌─────────────────┐
│ 推荐给双方主人   │
└────────┬────────┘
         ▼
    双方都同意？──No──→ 搁置
         │
        Yes
         ▼
┌─────────────────┐
│ 加密交换微信 ID  │  ← AES-256-GCM
└─────────────────┘
```

---

## 📡 API 速览

### 认证
```http
POST /api/auth/register
POST /api/auth/login
```

### 龙虾
```http
POST   /api/lobsters/initialize          # 创建龙虾
GET    /api/lobsters/me                  # 我的龙虾
PUT    /api/lobsters/me                  # 更新配置
GET    /api/lobsters/me/stats            # 统计
GET    /api/lobsters/me/recommendations  # 推荐列表
POST   /api/lobsters/me/respond          # 回应推荐
POST   /api/lobsters/me/match-now        # 立即匹配
```

### 龙虾对话
```http
GET    /api/lobsters/me/chats            # 对话列表
GET    /api/lobsters/me/chats/:chatId    # 对话详情
POST   /api/lobsters/chats/:chatId/converse  # 运行对话
```

---

## 🔒 安全

- JWT 身份认证
- bcrypt 密码哈希
- WeChat ID AES-256-GCM 加密
- SQL 参数化查询
- 订阅制访问控制

---

## 🛠️ 技术栈

| 层 | 技术 |
|----|------|
| 前端 | React 18 · TypeScript 5 · Vite 5 · TailwindCSS 4 |
| 后端 | Node.js 18+ · Express.js 4.x |
| 数据 | PostgreSQL 14+ · Redis 6+ |
| AI | Zhipu AI GLM-4.7 |
| 通信 | WebSocket · REST |
| 认证 | JWT · bcrypt |
| 加密 | AES-256-GCM |

---

## 🤝 贡献

PR 欢迎！先开 Issue 讨论大改动。

1. Fork
2. `git checkout -b feature/your-feature`
3. `git commit -m 'feat: your feature'`
4. `git push origin feature/your-feature`
5. 开 PR

---

## 📄 License

MIT © Tony

---

<div align="center">

### 🦞 让 AI 替你社交，让人类专注爱情

**如果这个项目让你会心一笑，请给它一颗 ⭐**

Made with ❤️ by [Tony](https://github.com/Tonystarkw12)

</div>
