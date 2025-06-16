# AI 姻缘坊 (AI 月老) 📱💕

一个基于人工智能的智能婚恋匹配平台，通过AI算法进行精准匹配推荐，帮助用户找到理想的伴侣。

## 🌟 项目简介

AI 姻缘坊是一个现代化的婚恋交友平台，结合了人工智能、地理位置服务和实时通信技术，为用户提供个性化的配对服务。项目采用前后端分离架构，支持微信小程序、H5等多端部署。

### 核心功能

- 🤖 **AI智能匹配**: 基于用户画像、兴趣标签、价值观等多维度数据进行智能推荐
- 📍 **地理位置匹配**: 支持基于地理位置的就近匹配
- 💬 **实时聊天**: WebSocket实现的实时通信功能
- 📸 **个人资料管理**: 完善的用户资料编辑和照片管理
- 🔐 **安全认证**: JWT token身份验证和数据加密
- 📱 **多端支持**: 微信小程序、H5、App等跨平台支持

## 🏗️ 技术架构

### 前端技术栈

- **框架**: Vue 3 + uni-app
- **构建工具**: Vite
- **UI框架**: uni-app 组件库
- **样式**: SCSS
- **平台支持**: 微信小程序、支付宝小程序、H5、App等

### 后端技术栈

- **运行时**: Node.js
- **框架**: Express.js
- **数据库**: PostgreSQL (Neon云数据库)
- **认证**: JWT (JSON Web Tokens)
- **文件上传**: Multer
- **实时通信**: WebSocket (ws)
- **地理服务**: Geolib
- **密码加密**: bcryptjs

### 基础设施

- **容器化**: Docker + Docker Compose
- **反向代理**: Nginx
- **云数据库**: Neon PostgreSQL
- **部署平台**: 支持各种云平台部署

## 📁 项目结构

`AIlove/ ├── README.md                    # 项目说明文档 ├── docker-compose.yml          # Docker编排文件 ├── nginx.conf                  # Nginx配置文件 ├── package-lock.json           # 项目依赖锁定文件 ├── neon.session.sql            # 数据库会话文件 ├── backend/                    # 后端代码目录 │   ├── Dockerfile              # 后端Docker配置 │   ├── .dockerignore           # Docker忽略文件 │   ├── .env                    # 环境变量配置 │   ├── .gitignore              # Git忽略文件 │   ├── api.md                  # API文档 │   ├── db.js                   # 数据库连接配置 │   ├── entrypoint.sh           # Docker入口脚本 │   ├── hello.js                # 测试文件 │   ├── package.json            # 后端依赖配置 │   ├── package-lock.json       # 后端依赖锁定 │   ├── schema.sql              # 数据库结构 │   ├── server.js               # 主服务器文件 │   ├── middleware/             # 中间件目录 │   │   └── authenticateToken.js # JWT认证中间件 │   ├── routes/                 # 路由目录 │   │   ├── auth.js             # 认证路由 │   │   ├── chat.js             # 聊天路由 │   │   ├── recommendations.js  # 推荐路由 │   │   └── users.js            # 用户路由 │   ├── services/               # 服务层目录 │   │   ├── recommendationService.js # 推荐服务 │   │   └── websocketService.js      # WebSocket服务 │   └── uploads/                # 文件上传目录 └── frontend/                   # 前端代码目录     ├── Dockerfile              # 前端Docker配置     ├── .dockerignore           # Docker忽略文件     ├── .npmrc                  # npm配置     ├── backend_api_specifications.md # API规范     ├── docker-compose.yml      # 前端Docker编排     ├── index.html              # 入口HTML     ├── login_prototype.html    # 登录原型     ├── register_prototype.html # 注册原型     ├── package.json            # 前端依赖配置     ├── package-lock.json       # 前端依赖锁定     ├── shims-uni.d.ts          # uni-app类型定义     ├── vite.config.js          # Vite配置     └── src/                    # 源代码目录         ├── App.vue             # 根组件         ├── config.js           # 配置文件         ├── main.js             # 入口文件         ├── manifest.json       # 应用清单         ├── pages.json          # 页面配置         ├── shime-uni.d.ts      # 类型定义         ├── uni.scss            # 全局样式         ├── pages/              # 页面目录         │   ├── chat/           # 聊天页面         │   ├── index/          # 首页         │   ├── login/          # 登录页面         │   ├── profile/        # 个人资料页面         │   └── register/       # 注册页面         ├── static/             # 静态资源         │   └── logo.png        # 应用图标         └── utils/              # 工具函数             └── request.js      # 网络请求封装`

## 🚀 快速开始

### 环境要求

- Node.js 18+
- Docker & Docker Compose
- Git

### 1. 克隆项目

`ash git clone <repository-url> cd AIlove `

### 2. 环境配置

在 ackend/ 目录下创建 .env 文件：

`nv

# 数据库配置

DB_HOST=your-neon-db-host
DB_PORT=5432
DB_NAME=your-database-name
DB_USER=your-username
DB_PASSWORD=your-password
DB_SSL=true

# JWT配置

JWT_SECRET=your-jwt-secret-key
JWT_EXPIRES_IN=7d

# 服务器配置

PORT=3000
NODE_ENV=production

# 文件上传配置

UPLOAD_MAX_SIZE=5242880
UPLOAD_ALLOWED_TYPES=jpg,jpeg,png,gif
`

### 3. 使用Docker启动

`ash

# 构建并启动所有服务

docker-compose up --build

# 后台运行

docker-compose up -d --build
`

### 4. 手动启动（开发模式）

#### 后端启动

`ash cd backend npm install npm run dev `

#### 前端启动

`ash
cd frontend
npm install

# 微信小程序开发

npm run dev:mp-weixin

# H5开发

npm run dev:h5

# 构建生产版本

npm run build:mp-weixin
`

### 5. 数据库初始化

`ash

# 连接到PostgreSQL数据库并执行schema.sql

psql -h your-host -U your-username -d your-database -f backend/schema.sql
`

## 📱 应用功能

### 用户认证

- 用户注册/登录
- JWT token认证
- 密码加密存储

### 个人资料

- 详细资料编辑
- 多张照片上传
- 头像设置
- 兴趣标签管理

### AI匹配推荐

- 基于地理位置的粗筛
- 年龄、性别偏好筛选
- 兴趣标签匹配
- AI价值观分析
- 个性化破冰话题推荐

### 实时聊天

- WebSocket实时通信
- 消息状态跟踪
- 聊天记录持久化
- 多媒体消息支持

## 📡 API文档

详细的API文档请查看 ackend/api.md 文件，包含：

- 认证接口
- 用户资料管理
- AI推荐系统
- 实时聊天功能
- 文件上传接口

### 主要API端点

`POST /auth/register        # 用户注册 POST /auth/login          # 用户登录 GET  /users/me/profile    # 获取个人资料 PUT  /users/me/profile    # 更新个人资料 POST /users/me/photos     # 上传照片 GET  /recommendations     # 获取推荐列表 GET  /chat/{userId}/messages # 获取聊天记录 POST /chat/{userId}/messages # 发送消息 WS   /ws/chat            # WebSocket聊天连接`

## 🔧 部署配置

### Docker部署

项目完全支持Docker容器化部署：

1. **后端服务**: Node.js + Express
2. **前端服务**: Nginx静态文件服务
3. **数据库**: 外部Neon PostgreSQL
4. **反向代理**: Nginx

### 生产环境配置

1. 配置SSL证书
2. 设置环境变量
3. 配置域名和DNS
4. 设置数据库连接
5. 配置文件存储（云存储）

## 🔒 安全特性

- JWT token身份验证
- 密码bcrypt加密
- 文件类型和大小验证
- SQL注入防护
- XSS攻击防护
- CORS跨域配置

## 🤝 开发指南

### 前端开发

`ash

# 开发微信小程序

npm run dev:mp-weixin

# 开发H5版本

npm run dev:h5

# 开发支付宝小程序

npm run dev:mp-alipay
`

### 后端开发

`ash

# 开发模式（热重载）

npm run dev

# 生产模式

npm start
`

### 数据库操作

项目使用PostgreSQL作为主数据库，支持：

- 用户信息存储
- 聊天记录持久化
- AI推荐结果缓存
- 地理位置索引

## 📈 性能优化

- 数据库索引优化
- 图片压缩和CDN
- WebSocket连接池
- Redis缓存（可选）
- 地理位置Geohash索引

## 🐛 常见问题

### 部署问题

1. **数据库连接失败**: 检查Neon数据库配置和网络连接
2. **文件上传失败**: 确认uploads目录权限和磁盘空间
3. **WebSocket连接失败**: 检查防火墙和代理配置

### 开发问题

1. **uni-app编译错误**: 检查Node.js版本和依赖安装
2. **JWT验证失败**: 确认JWT_SECRET配置正确
3. **跨域问题**: 检查CORS配置

## 📄 许可证

MIT License

## 👥 贡献

欢迎提交Issue和Pull Request来改进项目。

## 📞 联系方式

如有问题或建议，请通过以下方式联系：

- 项目Issue: [GitHub Issues]
- 邮箱: [项目邮箱]

---

**AI 姻缘坊** - 让科技成就美好姻缘 💕
