# AIlove - 宝可梦主题约会平台 🎮💕

<div align="center">

![Version](https://img.shields.io/badge/version-2.1.0-blue)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-green)
![Vue](https://img.shields.io/badge/vue-3.4+-brightgreen)
![License](https://img.shields.io/badge/license-MIT-yellow)

一个基于宝可梦 GameBoy 复古风格的现代化约会应用，通过 AI 算法进行智能匹配，结合游戏化体验让交友更有趣。

[特性介绍](#-核心特性) • [快速开始](#-快速开始) • [API文档](#-api文档) • [技术栈](#-技术架构)

</div>

## 🌟 项目简介

AIlove 是一个创新的约会平台，采用 **宝可梦 GameBoy 复古风格** 设计，通过 AI 智能匹配算法、地理位置服务和游戏化体验，为用户提供独特有趣的交友体验。项目已完成 Phase 1-3 的开发，实现了核心流程、宝可梦主题 UI 和社区功能。

### ✨ 核心亮点

- 🎮 **GameBoy 复古风格**: 独特的 4px 黑色边框、像素字体、复古配色
- 🐾 **宝可梦头像系统**: 根据用户性格自动匹配宝可梦形象
- 📸 **甜蜜照片墙**: 拍立得风格的情侣照片展示
- 🎯 **HP/EXP 游戏化**: 每日匹配次数和经验值可视化
- 🤖 **AI 智能匹配**: 多维度用户画像分析和推荐算法
- 💬 **实时聊天**: WebSocket 实时通信
- 🎁 **积分奖励系统**: 完成任务获得积分，审核通过获得奖励

---

## 🎮 Phase 2 & 3 新功能

### 宝可梦主题 UI

- **GameBoy 复古样式**
  - 4px 黑色边框 + box-shadow 阴影
  - 按钮按压动画效果
  - GameBoy 配色方案（绿、深绿、浅绿）

- **宝可梦组件库**
  - `HpExpBar.vue` - HP/EXP 状态条组件
  - `GameboyButton.vue` - GameBoy 风格按钮
  - `PokemonTypeBadge.vue` - 宝可梦类型徽章（18 种类型）

- **主题配色**
  ```javascript
  'poke-red': '#ffcb05'      // 宝可梦红
  'poke-blue': '#3b4cca'     // 宝可梦蓝
  'gameboy-bg': '#9BBC0F'    // GameBoy 背景绿
  'hp-red': '#FF5A5A'        // HP 条颜色
  'exp-blue': '#4A90E2'      // EXP 条颜色
  ```

### 性格映射宝可梦

- **11 种性格类型映射**
  - 热情 → 火系（小火龙、六尾）
  - 温柔 → 水系（杰尼龟、可达鸭）
  - 幽默 → 电系（皮卡丘、电击兽）
  - 坚韧 → 草系（妙蛙种子、走路草）
  - 浪漫 → 妖精系（皮皮、胖丁）
  - 理性 → 超能系（凯西、超梦）
  - 勇敢 → 格斗系（腕力、飞腿郎）
  - 神秘 → 幽灵系（鬼斯、耿鬼）
  - 自由 → 飞行系（波波、飞天螳螂）
  - 稳重 → 岩石系（小拳石、大岩蛇）
  - 忠诚 → 一般系（伊布、卡比兽）

- **API 端点**
  ```
  POST /api/users/me/assign-pokemon
  ```

### 社区甜蜜照片墙

- **瀑布流布局**: 2 列自适应展示
- **拍立得风格**: 白色边框、手写体日期、-2deg 旋转
- **照片上传**: 纪念日、情侣昵称、甜蜜寄语
- **积分奖励**: 审核通过获得 500 积分
- **点赞互动**: 支持点赞/取消点赞

---

## 🏗️ 技术架构

### 前端技术栈

| 技术 | 版本 | 说明 |
|------|------|------|
| Vue | 3.4+ | 渐进式框架 |
| Uniapp | 3.0+ | 跨平台开发框架 |
| Vite | 5.2+ | 构建工具 |
| TailwindCSS | 4.1+ | 实用优先的 CSS 框架 |
| PostCSS | 8.5+ | CSS 转换工具 |

### 后端技术栈

| 技术 | 版本 | 说明 |
|------|------|------|
| Node.js | 18+ | 运行时环境 |
| Express.js | 4.x | Web 框架 |
| PostgreSQL | 14+ | 关系型数据库 |
| PostGIS | 3.3+ | 地理空间扩展 |
| Redis | 6.0+ | 缓存服务 (可选) |
| JWT | - | 身份认证 |
| Multer | - | 文件上传 |
| WebSocket | - | 实时通信 |
| 智谱AI | GLM-4.7 | AI智能匹配 |

### 数据库设计

**核心表结构：**
- `users` - 用户表（含宝可梦头像字段）
- `community_photos` - 社区照片表
- `photo_likes` - 照片点赞表
- `user_photos` - 用户照片表
- `chat_messages` - 聊天消息表
- `point_history` - 积分历史表

---

## 🚀 快速开始

### 环境要求

- Node.js >= 18.0.0
- PostgreSQL >= 14 (with PostGIS extension)
- Redis >= 6.0 (可选，用于缓存)
- npm 或 yarn 或 pnpm

### 1. 克隆项目

```bash
git clone https://github.com/your-username/AIlove.git
cd AIlove
```

### 2. 安装依赖

#### 后端
```bash
cd backend
npm install
```

#### 前端
```bash
cd frontend
npm install
```

### 3. 配置环境变量

在 `backend/.env` 文件中配置：

```env
# ===========================================
# AI月老 Backend Configuration
# ===========================================

# 服务器配置
PORT=3052
NODE_ENV=development

# 数据库配置 (PostGIS-enabled PostgreSQL)
DATABASE_URL="postgresql://aiyueuser:aiyuepass123@localhost:5434/aiyuelaodb"
DB_SSL=false

# JWT 配置
JWT_SECRET="your-very-strong-jwt-secret-key"

# Redis 配置 (可选，用于缓存)
REDIS_URL="redis://localhost:6379"

# 智谱AI API 配置 (用于智能匹配)
OPENAI_API_KEY=your_api_key_here
OPENAI_BASE_URL=https://open.bigmodel.cn/api/coding/paas/v4
OPENAI_MODEL=glm-4.7
```

### 4. 数据库初始化

#### 方式一：使用 Docker 启动 PostGIS (推荐)

```bash
# 启动 PostgreSQL + PostGIS 容器
docker run -d --name ailove-postgres \
  -e POSTGRES_USER=aiyueuser \
  -e POSTGRES_PASSWORD=aiyuepass123 \
  -e POSTGRES_DB=aiyuelaodb \
  -p 5434:5432 \
  postgis/postgis:15-3.3-alpine

# 等待数据库启动
sleep 5

# 初始化数据库表
cd backend
docker exec -i ailove-postgres psql -U aiyueuser -d aiyuelaodb < schema.sql
```

#### 方式二：使用现有 PostgreSQL

```bash
cd backend

# 确保 PostGIS 扩展已启用
psql -U username -d database -c "CREATE EXTENSION IF NOT EXISTS postgis;"

# 执行数据库初始化
psql -U username -d database -f schema.sql

# Phase 3: 社区功能表 (如果使用迁移文件)
psql -U username -d database -f migrations/create_community_tables.sql
```

### 5. 启动服务

#### 后端启动
```bash
cd backend
npm run dev
# 或生产环境
npm start
```

#### 前端启动
```bash
cd frontend

# H5 开发
npm run dev:h5

# 微信小程序开发
npm run dev:mp-weixin

# 构建生产版本
npm run build:h5
```

### 6. 访问应用

- **前端应用**: http://localhost:5173 (H5)
- **后端 API**: http://localhost:3052
- **API 健康检查**: http://localhost:3052/

---

## 📁 项目结构

```
AIlove/
├── README.md                          # 项目说明
├── .gitignore                         # Git 忽略文件
├── docker-compose.yml                 # Docker 编排
├── PHASE_1_IMPLEMENTATION_REPORT.md   # Phase 1 实施报告
├── PHASE_2_3_COMPLETION_REPORT.md     # Phase 2&3 完成报告
├── TESTING_GUIDE.md                   # 测试指南
├── PROFILE_EDIT_IMPLEMENTATION_GUIDE.md  # 个人资料编辑指南
├── TABBAR_ICONS_GUIDE.md              # TabBar 图标指南
│
├── backend/                           # 后端代码
│   ├── server.js                      # 主服务器文件
│   ├── db.js                          # 数据库连接
│   ├── package.json                   # 后端依赖
│   ├── .env                           # 环境变量
│   ├── middleware/                    # 中间件
│   │   └── authenticateToken.js      # JWT 认证
│   ├── routes/                        # 路由
│   │   ├── auth.js                    # 认证路由
│   │   ├── users.js                   # 用户路由（含宝可梦 API）
│   │   ├── recommendations.js         # 推荐路由
│   │   ├── chat.js                    # 聊天路由
│   │   ├── map.js                     # 地理位置路由
│   │   ├── community.js               # 社区照片墙路由 ✨
│   │   └── ...                        # 其他路由
│   ├── services/                      # 服务层
│   │   ├── recommendationService.js   # 推荐服务
│   │   ├── websocketService.js        # WebSocket 服务
│   │   ├── pokemonMapper.js           # 宝可梦映射服务 ✨
│   │   └── logger.js                  # 日志服务
│   ├── migrations/                    # 数据库迁移
│   │   ├── add_user_profile_fields_v2.sql  # 用户表扩展
│   │   └── create_community_tables.sql     # 社区表创建 ✨
│   └── uploads/                       # 文件上传目录
│       └── community/                 # 社区照片 ✨
│
└── frontend/                          # 前端代码
    ├── package.json                   # 前端依赖
    ├── tailwind.config.js             # TailwindCSS 配置 ✨
    ├── postcss.config.js              # PostCSS 配置 ✨
    ├── vite.config.js                 # Vite 配置
    ├── index.html                     # 入口 HTML
    ├── manifest.json                  # 应用清单
    │
    └── src/
        ├── main.js                    # 入口文件
        ├── App.vue                    # 根组件
        ├── pages.json                 # 页面配置
        ├── config.js                  # 配置文件
        │
        ├── styles/                    # 样式文件
        │   └── tailwind.css           # 全局宝可梦样式 ✨
        │
        ├── components/                # 组件库 ✨
        │   ├── HpExpBar.vue           # HP/EXP 状态条
        │   ├── GameboyButton.vue      # GameBoy 按钮
        │   └── PokemonTypeBadge.vue   # 宝可梦类型徽章
        │
        ├── pages/                     # 页面
        │   ├── index/                 # 首页（含地图）✨
        │   ├── login/                 # 登录页
        │   │   ├── login.vue
        │   │   └── register.vue
        │   ├── map/                   # 地图页
        │   ├── profile/               # 个人资料
        │   ├── chat/                  # 聊天页
        │   ├── user/                  # 用户中心
        │   └── community/             # 社区页面 ✨
        │       └── love-wall.vue      # 甜蜜照片墙
        │
        ├── utils/                     # 工具函数
        │   └── request.js             # 网络请求封装
        │
        └── static/                    # 静态资源
            ├── tabbar/                # TabBar 图标 ✨
            │   ├── love.svg
            │   └── love_active.svg
            └── logo.png
```

---

## 📱 核心功能

### Phase 1: 核心用户流程 ✅

- ✅ 全局路由守卫（Token 验证）
- ✅ 简化注册页（自动登录）
- ✅ 首页全屏地图 + 匹配按钮
- ✅ 个人资料编辑（12 个新字段）
- ✅ 性别枚举（Male/Female/Gay/Lesbian）
- ✅ 资料完整度检查（>=60%）
- ✅ 匹配积分系统（50 积分/次）

### Phase 2: 宝可梦主题 UI ✅

- ✅ TailwindCSS 集成
- ✅ GameBoy 复古样式库
- ✅ 宝可梦组件库（3 个核心组件）
- ✅ 性格映射宝可梦功能
- ✅ 18 种宝可梦类型颜色
- ✅ HP/EXP 游戏化显示
- ✅ 拍立得照片风格

### Phase 3: 社区照片墙 ✅

- ✅ 甜蜜照片墙页面
- ✅ 瀑布流布局展示
- ✅ 照片上传功能
- ✅ 拍立得风格卡片
- ✅ 点赞互动系统
- ✅ 管理员审核流程
- ✅ 500 积分奖励机制
- ✅ 6 个社区 API 端点

---

## 📡 API 文档

### 认证相关

```http
POST   /api/auth/register        # 用户注册
POST   /api/auth/login           # 用户登录
```

### 用户管理

```http
GET    /api/users/me/status      # 获取用户状态
POST   /api/users/me/match       # 执行匹配操作
POST   /api/users/me/assign-pokemon  # 分配宝可梦头像 ✨
PUT    /api/users/me/profile     # 更新个人资料
```

### 社区照片墙 ✨

```http
GET    /api/community/photos                    # 获取照片列表
POST   /api/community/upload-photo              # 上传照片文件
POST   /api/community/submit-couple-photo       # 提交照片信息
POST   /api/community/photos/:photoId/like      # 点赞照片
GET    /api/community/my-submissions            # 我的提交记录
PUT    /api/community/admin/photos/:photoId/review  # 管理员审核
```

### 推荐 & 匹配

```http
GET    /api/recommendations       # 获取推荐列表
GET    /api/map/nearby           # 获取附近用户
POST   /api/map/update-location  # 更新位置
```

### 聊天

```http
GET    /api/chat/:userId/messages  # 获取聊天记录
POST   /api/chat/:userId/messages  # 发送消息
WS     /ws/chat                    # WebSocket 连接
```

### API 响应示例

#### 获取用户状态
```json
{
  "profileCompleteness": 75,
  "isProfileComplete": true,
  "points": 350,
  "hasEnoughPoints": true,
  "pointsPerMatch": 50,
  "dailyMatchCount": 5,
  "maxDailyMatches": 10,
  "vipLevel": "黄金训练师",
  "isVip": true,
  "pokemonAvatarId": "025"
}
```

#### 分配宝可梦头像
```json
{
  "message": "宝可梦头像分配成功",
  "pokemon": {
    "id": "025",
    "name": "皮卡丘",
    "type": "electric",
    "avatarUrl": "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/025.png",
    "matchedTag": "幽默"
  }
}
```

---

## 🎨 UI 设计规范

### GameBoy 复古风格

**边框样式：**
```css
.gameboy-border {
  border: 4px solid #000000;
  box-shadow: 4px 4px 0px 0px #000000;
}
```

**按钮按压效果：**
```css
.gameboy-btn:active {
  transform: translate(2px, 2px);
  box-shadow: 2px 2px 0px 0px #000000;
}
```

**拍立得照片：**
```css
.polaroid {
  background: #ffffff;
  padding: 15rpx 15rpx 80rpx 15rpx;
  transform: rotate(-2deg);
}
```

### 宝可梦类型颜色

| 类型 | 颜色代码 | 类型 | 颜色代码 |
|------|---------|------|---------|
| 一般 | #A8A878 | 火 | #F08030 |
| 水 | #6890F0 | 电 | #F8D030 |
| 草 | #78C850 | 冰 | #98D8D8 |
| 格斗 | #C03028 | 毒 | #A040A0 |
| 地面 | #E0C068 | 飞行 | #A890F0 |
| 超能 | #F85888 | 虫 | #A8B820 |
| 岩石 | #B8A038 | 幽灵 | #705898 |
| 龙 | #7038F8 | 恶 | #705848 |
| 钢 | #B8B8D0 | 妖精 | #EE99AC |

---

## 🔒 安全特性

- ✅ JWT Token 身份验证
- ✅ 密码 bcrypt 加密
- ✅ 文件类型和大小验证
- ✅ SQL 注入防护
- ✅ XSS 攻击防护
- ✅ CORS 跨域配置
- ✅ 请求日志记录（Winston）
- ✅ 环境变量保护

---

## 📈 性能优化

- ✅ 数据库索引优化
- ✅ Redis 缓存（可选）
- ✅ 地理位置 Geohash 索引
- ✅ WebSocket 连接池
- ✅ 图片懒加载
- ✅ 组件按需加载
- ✅ Vite HMR 快速热更新

---

## 🧪 测试

### 功能测试

详细测试步骤请查看 [TESTING_GUIDE.md](./TESTING_GUIDE.md)

```bash
# 后端健康检查
curl http://localhost:3052/

# 前端访问
# 浏览器打开 http://localhost:5173
```

### 测试覆盖

- ✅ 后端 API 测试
- ✅ 前端组件测试
- ✅ 数据库迁移测试
- ✅ 集成测试

---

## 🐛 常见问题

### Q: 数据库连接失败？
**A:** 检查 `backend/.env` 中的 `DATABASE_URL` 配置是否正确，确认 PostgreSQL 服务正在运行。

### Q: 前端组件导入错误？
**A:** 确保 `main.js` 导入了 TailwindCSS 样式：
```javascript
import "./styles/tailwind.css";
```

### Q: 宝可梦头像不显示？
**A:**
1. 检查用户是否有 `pokemon_avatar_id` 字段
2. 调用 `POST /api/users/me/assign-pokemon` API
3. 确保网络可以访问 PokeAPI

### Q: 照片上传失败？
**A:**
1. 检查 `backend/uploads/community` 目录权限
2. 确认文件大小不超过 10MB
3. 验证文件格式为 jpg/jpeg/png/gif

### Q: 积分没有到账？
**A:**
1. 确认照片状态为 `approved`
2. 检查 `point_history` 表记录
3. 验证 `users` 表的 `points` 字段

---

## 🚢 部署

### Docker 部署

```bash
# 构建并启动
docker-compose up --build

# 后台运行
docker-compose up -d

# 查看日志
docker-compose logs -f
```

### 生产环境配置

1. 配置 SSL 证书
2. 设置环境变量
3. 配置域名和 DNS
4. 设置云存储（文件上传）
5. 配置 CDN（静态资源）

---

## 🤝 贡献指南

欢迎贡献代码！请遵循以下步骤：

1. Fork 项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 提交 Pull Request

### 开发规范

- 遵循 ESLint 规则
- 编写清晰的提交信息
- 添加必要的注释
- 更新相关文档

---

## 📄 许可证

MIT License - 详见 [LICENSE](./LICENSE) 文件

---

## 📞 联系方式

- **GitHub Issues**: [提交问题](https://github.com/your-username/AIlove/issues)
- **项目文档**: [详细文档](./docs/)
- **测试指南**: [TESTING_GUIDE.md](./TESTING_GUIDE.md)

---

## 🎯 路线图

### Phase 4: 即将推出 🚧

- [ ] 全局广播通知系统
- [ ] VIP 会员特权功能
- [ ] 每日任务系统
- [ ] 约会地点推荐
- [ ] 管理员后台界面
- [ ] 数据统计看板

### Phase 5: 未来规划 🔮

- [ ] AI 视频相亲
- [ ] 语音聊天功能
- [ ] 虚拟礼物系统
- [ ] 线下活动组织
- [ ] 多语言国际化

---

<div align="center">

**AIlove** - 让科技成就美好姻缘 🎮💕

Made with ❤️ by [Your Name]

⭐ 如果觉得这个项目不错，请点个 Star 支持！

</div>
