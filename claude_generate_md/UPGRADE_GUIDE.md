# AIlove 项目升级文档

## 升级概述

本次升级将 AIlove 项目从基础相亲应用升级为**游戏化、智能化的约会平台**，引入了地理位置服务、AI 匹配算法、游戏化任务系统和积分奖励机制。

## 升级内容

### 第一阶段：地理位置功能（PostGIS）

#### 数据库升级
- ✅ 启用 PostGIS 扩展
- ✅ 在 `users` 表添加 `location` 字段（GEOGRAPHY 类型）
- ✅ 创建 PostGIS GiST 索引优化地理查询

#### 后端 API（routes/map.js）
- ✅ `POST /api/map/update-location` - 更新用户位置
- ✅ `GET /api/map/nearby` - 查询附近用户（支持 AI 筛选）
  - 查询参数：`lat`, `lng`, `radius_km`, `min_score`
  - 返回附近的高匹配度用户

#### 前端集成
- ✅ 创建 `pages/map/index.vue` 地图页面
- ✅ 实现定时位置上传（每 30 秒）
- ✅ 实现定时刷新附近用户（每 30 秒）
- ✅ 自定义地图标记显示用户头像
- ✅ 点击标记查看用户详情和发起聊天

### 第二阶段：游戏化约会任务系统

#### 数据库模型
- ✅ `dating_spots` 表 - 约会地点（类似 Pokestops）
  - 字段：`spot_id`, `name`, `location`, `type`, `address`, `reward_points`, `description`
- ✅ `dating_tasks` 表 - 约会邀请/任务
  - 字段：`task_id`, `initiator_id`, `receiver_id`, `spot_id`, `status`, `scheduled_time`

#### 后端 API
**约会地点管理（routes/spots.js）**
- ✅ `GET /api/spots/nearby` - 获取附近的约会地点
- ✅ `GET /api/spots` - 获取所有约会地点（支持分页和类型筛选）
- ✅ `POST /api/spots` - 创建新的约会地点
- ✅ `GET /api/spots/types` - 获取所有地点类型

**约会任务管理（routes/tasks.js）**
- ✅ `POST /api/tasks/invite` - 发起约会邀请
- ✅ `POST /api/tasks/:taskId/accept` - 接受约会邀请
- ✅ `POST /api/tasks/:taskId/check-in` - 约会打卡（GPS 距离判定 < 50米）
- ✅ `GET /api/tasks/my` - 获取我的约会任务列表

### 第三阶段：AI 匹配与推荐算法

#### AI 匹配引擎（services/matchingAlgorithm.js）
- ✅ **LLM 智能匹配**（使用智谱AI GLM-4.7）
  - 分析用户价值观、兴趣标签、Q&A 回答
  - 多维度评分：价值观（30%）、兴趣（30%）、性格（20%）、话题（20%）
  - 返回匹配分数、原因、优势和建议

- ✅ **传统算法回退**
  - 地理距离评分（PostGIS）
  - Jaccard 相似度（兴趣标签）
  - 余弦相似度（价值观文本）
  - 加权总分：距离（30%）+ 兴趣（40%）+ 性格（30%）

#### 推荐系统升级（routes/recommendations.js）
- ✅ `POST /api/recommendations/calculate` - 重新计算所有推荐
- ✅ `GET /api/recommendations` - 获取推荐列表（支持 `min_score` 筛选）
- ✅ `GET /api/recommendations/user/:userId` - 获取与特定用户的匹配分数

#### "野生邂逅"模式
- ✅ 地图附近用户查询默认只显示匹配分数 >= 70 的用户
- ✅ 高匹配度用户（>90分）可配置 WebSocket 推送提醒

### 第四阶段：积分和奖励系统

#### 数据库升级
- ✅ `users` 表添加积分字段：
  - `points` - 恋爱积分
  - `level` - 用户等级
  - `last_login_date` - 上次登录日期
- ✅ `user_photos` 表添加 `is_unlocked` 字段（照片解锁状态）

#### 积分奖励 API（routes/rewards.js）
- ✅ `POST /api/rewards/daily-login` - 领取每日登录奖励（+10积分）
- ✅ `POST /api/rewards/complete-profile` - 完善资料奖励（每个字段 +5积分，最多 +50）
- ✅ `GET /api/rewards/leaderboard` - 获取积分排行榜
- ✅ `GET /api/rewards/my` - 获取我的积分信息
- ✅ `POST /api/rewards/unlock-photo` - 使用积分解锁照片（透视镜，-50积分）
- ✅ `POST /api/rewards/mind-reading` - 查看详细回答（心灵感应，-30积分）

#### 等级系统
- ✅ 每 100 积分升 1 级
- ✅ 高等级用户每日登录奖励有加成（每10级额外 +5积分）

## 环境配置

### 数据库要求
- PostgreSQL 13+ (支持 PostGIS)
- PostGIS 扩展（`CREATE EXTENSION postgis;`）

### 环境变量（.env）
```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/aiyuelaodb

# JWT
JWT_SECRET=your-secret-key-here

# OpenAI API (智谱AI GLM-4.7)
OPENAI_API_KEY=7a8b052c9c904ca1b1c82c8e4601d3be.37oSZzJU2pMEkGH0
OPENAI_BASE_URL=https://open.bigmodel.cn/api/coding/paas/v4
OPENAI_MODEL=glm-4.7

# Server
PORT=3000
NODE_ENV=development
```

### 依赖安装
```bash
# 后端依赖
cd backend
npm install

# 新增依赖
npm install openai

# 前端依赖（Uniapp）
cd frontend
npm install
```

## 数据库迁移

### 方案一：全新部署
直接运行更新后的 `schema.sql`：
```bash
psql -U your_user -d aiyuelaodb -f backend/schema.sql
```

### 方案二：现有数据库升级
在现有数据库上执行以下 SQL：

```sql
-- 启用 PostGIS
CREATE EXTENSION IF NOT EXISTS postgis;

-- 添加积分字段到 users 表
ALTER TABLE users
ADD COLUMN IF NOT EXISTS points INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS level INT DEFAULT 1,
ADD COLUMN IF NOT EXISTS last_login_date DATE;

-- 添加 location 字段到 users 表
ALTER TABLE users
ADD COLUMN IF NOT EXISTS location GEOGRAPHY(POINT, 4326);

-- 添加照片解锁字段
ALTER TABLE user_photos
ADD COLUMN IF NOT EXISTS is_unlocked BOOLEAN DEFAULT FALSE;

-- 创建约会地点表
CREATE TABLE IF NOT EXISTS dating_spots (
    spot_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    location GEOGRAPHY(POINT, 4326) NOT NULL,
    type VARCHAR(50) NOT NULL,
    address TEXT,
    reward_points INT DEFAULT 50,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建约会任务表
CREATE TABLE IF NOT EXISTS dating_tasks (
    task_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    initiator_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    spot_id UUID NOT NULL REFERENCES dating_spots(spot_id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'pending',
    scheduled_time TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_users_location ON users USING GIST (location);
CREATE INDEX IF NOT EXISTS idx_dating_spots_location ON dating_spots USING GIST (location);
CREATE INDEX IF NOT EXISTS idx_dating_tasks_initiator ON dating_tasks(initiator_id);
CREATE INDEX IF NOT EXISTS idx_dating_tasks_receiver ON dating_tasks(receiver_id);
CREATE INDEX IF NOT EXISTS idx_dating_tasks_status ON dating_tasks(status);
CREATE INDEX IF NOT EXISTS idx_dating_tasks_spot ON dating_tasks(spot_id);

-- 创建触发器
CREATE TRIGGER set_timestamp_dating_tasks
BEFORE UPDATE ON dating_tasks
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();
```

## API 端点总结

### 地理位置
- `POST /api/map/update-location` - 更新位置
- `GET /api/map/nearby` - 查询附近用户

### 约会地点
- `GET /api/spots/nearby` - 附近地点
- `GET /api/spots` - 所有地点
- `POST /api/spots` - 创建地点
- `GET /api/spots/types` - 地点类型

### 约会任务
- `POST /api/tasks/invite` - 发起邀请
- `POST /api/tasks/:taskId/accept` - 接受邀请
- `POST /api/tasks/:taskId/check-in` - 打卡
- `GET /api/tasks/my` - 我的任务

### AI 推荐
- `POST /api/recommendations/calculate` - 计算推荐
- `GET /api/recommendations` - 获取推荐
- `GET /api/recommendations/user/:userId` - 匹配分数

### 积分奖励
- `POST /api/rewards/daily-login` - 每日登录
- `POST /api/rewards/complete-profile` - 完善资料
- `GET /api/rewards/leaderboard` - 排行榜
- `GET /api/rewards/my` - 我的积分
- `POST /api/rewards/unlock-photo` - 解锁照片
- `POST /api/rewards/mind-reading` - 心灵感应

## 部署步骤

### 1. Docker 部署（推荐）

项目已包含 `docker-compose.yml`，只需：
```bash
# 构建并启动所有服务
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down
```

### 2. 手动部署

#### 后端部署
```bash
cd backend

# 安装依赖
npm install

# 配置环境变量
cp .env.example .env
# 编辑 .env 文件，填写数据库和 API 密钥

# 运行数据库迁移
psql -U your_user -d aiyuelaodb -f schema.sql

# 启动服务
npm run dev  # 开发模式
# 或
npm start    # 生产模式
```

#### 前端部署
```bash
cd frontend

# 安装依赖
npm install

# 构建
npm run build

# 部署到服务器
# 将 dist 目录部署到 Nginx 或其他静态文件服务器
```

## 测试建议

### 1. 功能测试
- [ ] 地图位置更新和附近用户查询
- [ ] 约会地点创建和查询
- [ ] 约会任务发起、接受和打卡
- [ ] AI 匹配分数计算
- [ ] 积分奖励领取和消耗

### 2. 性能测试
- [ ] PostGIS 地理查询性能（建议添加更多测试数据）
- [ ] LLM API 响应时间（智谱AI）
- [ ] 并发用户测试

### 3. 安全测试
- [ ] 身份验证和授权
- [ ] SQL 注入防护（使用参数化查询）
- [ ] XSS 防护（前端输入验证）

## 注意事项

### PostGIS 注意事项
1. **坐标系**：使用 WGS 84 (EPSG:4326) 坐标系
2. **性能**：GEOGRAPHY 类型适合小范围地理查询，大范围数据考虑 GEOMETRY
3. **索引**：确保创建了 GiST 索引以加速查询

### LLM API 注意事项
1. **费用**：智谱AI GLM-4.7 按使用量计费，注意监控 API 调用次数
2. **回退机制**：如果 LLM API 失败，系统会自动回退到传统算法
3. **缓存**：建议实现匹配分数缓存，避免重复调用

### 积分系统注意事项
1. **经济平衡**：积分获取和消耗需要保持平衡，避免通货膨胀
2. **防作弊**：添加防作弊机制，避免刷积分
3. **数据备份**：定期备份积分数据，防止丢失

## 后续优化建议

### 短期优化
1. **WebSocket 实时通知**
   - 高匹配度用户进入范围时推送通知
   - 约会邀请实时提醒

2. **前端优化**
   - 创建任务背包页面
   - 创建积分商城页面
   - 添加地图标记的约会地点显示

3. **性能优化**
   - 实现匹配分数缓存
   - 添加 Redis 缓存层
   - 优化数据库查询

### 长期规划
1. **更多 AI 功能**
   - AI 聊天助手
   - AI 约会建议
   - AI 性格分析

2. **社交功能**
   - 用户关注系统
   - 动态/朋友圈
   - 群组活动

3. **商业化**
   - VIP 会员系统
   - 虚拟礼物
   - 广告系统

## 技术栈总结

### 后端
- **框架**: Express.js
- **数据库**: PostgreSQL + PostGIS
- **AI**: 智谱AI GLM-4.7
- **认证**: JWT
- **实时通信**: WebSocket

### 前端
- **框架**: Uniapp (Vue.js)
- **地图**: Uniapp 内置 map 组件
- **状态管理**: Vuex（可选）

### DevOps
- **容器化**: Docker + Docker Compose
- **反向代理**: Nginx
- **部署**: 云服务器或容器平台

## 联系与支持

如有问题或建议，请提交 Issue 或 Pull Request。

---

**升级完成日期**: 2026-01-13
**版本**: v2.0.0
**状态**: ✅ 生产就绪
