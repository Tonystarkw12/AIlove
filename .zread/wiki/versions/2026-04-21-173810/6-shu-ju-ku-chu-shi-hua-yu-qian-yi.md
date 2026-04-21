本文档说明 AIlove 项目的数据库初始化流程、模式结构设计以及增量迁移策略。项目采用 **PostgreSQL + PostGIS** 作为核心数据存储，通过 `schema.sql` 完成全量初始化，通过 `migrations/` 目录下的 SQL 脚本实现增量演进。

## 数据库架构概览

```mermaid
flowchart TD
    A[.env.example<br/>环境变量配置] --> B[DATABASE_URL<br/>连接字符串]
    B --> C[db.js<br/>pg.Pool 连接池]
    C --> D{PostgreSQL 数据库}
    D --> E[schema.sql<br/>全量初始化]
    D --> F[migrations/*.sql<br/>增量迁移]
    F --> F1[add_pokeball_system]
    F --> F2[add_user_profile_fields_v2]
    F --> F3[add_wechat_fields]
    F --> F4[create_community_tables]
    F --> F5[create_pokeball_transactions_table]
    F --> F6[fix_icebreakers_column]
    E --> G[核心表: users<br/>recommendations<br/>chat_messages<br/>dating_spots<br/>dating_tasks]
    F --> H[扩展表: community_photos<br/>photo_likes<br/>pokeball_transactions<br/>user_matches]
```

## 连接池配置

数据库连接通过 `node-pg` 连接池管理，配置集中在 [db.js](backend/db.js#L1-L29) 中。连接池支持 SSL 可选配置，并通过启动时的 `SELECT NOW()` 探测验证连通性：

| 配置项 | 来源 | 说明 |
|--------|------|------|
| `connectionString` | `process.env.DATABASE_URL` | 完整 PostgreSQL 连接字符串 |
| `ssl` | `process.env.DB_SSL === 'true'` | 本地开发关闭，生产环境启用 |
| 连接测试 | `pool.connect()` + `SELECT NOW()` | 启动时自动验证 |

**环境变量格式**（参考 [.env.example](backend/.env.example#L8)）：
```
DATABASE_URL="postgresql://username:password@localhost:5432/aiyuelaodb"
```

## 全量初始化 schema.sql

[schema.sql](backend/schema.sql#L1-L167) 是数据库的"零号状态"文件，定义了所有核心表、索引和触发器。执行顺序严格遵循依赖关系：

**前置操作**：先按依赖逆序 DROP 所有表（chat_messages → recommendations → user_photos → dating_tasks → dating_spots → users），确保干净重建。

**扩展启用**：`CREATE EXTENSION IF NOT EXISTS postgis;` 启用 PostGIS 地理空间扩展。

**核心表结构**：

| 表名 | 主键 | 核心职责 | 外键依赖 |
|------|------|----------|----------|
| `users` | `user_id UUID` | 用户资料、地理位置、游戏化积分 | 无 |
| `user_photos` | `photo_id UUID` | 用户上传照片，支持解锁机制 | `users.user_id` |
| `dating_spots` | `spot_id UUID` | 约会地点（Pokestop 模式） | 无 |
| `dating_tasks` | `task_id UUID` | 约会邀请/任务流转 | `users`, `dating_spots` |
| `recommendations` | `recommendation_id UUID` | AI 匹配结果缓存 | `users.user_id` (双向) |
| `chat_messages` | `message_id UUID` | 聊天消息存储 | `users.user_id` (双向) |

**地理空间索引**：对用户位置和约会地点使用 GIST 索引（`idx_users_location`, `idx_dating_spots_location`），支撑 PostGIS 邻近查询。

**自动更新时间戳触发器**：`trigger_set_timestamp()` 函数绑定到 `users` 和 `dating_tasks` 表，在每次 `UPDATE` 时自动刷新 `updated_at` 字段。

## 增量迁移策略

`migrations/` 目录包含 6 个增量迁移脚本，按功能域划分：

```mermaid
flowchart LR
    A[schema.sql<br/>基线] --> B[add_user_profile_fields_v2<br/>资料扩展]
    A --> C[add_wechat_fields<br/>微信登录]
    A --> D[add_pokeball_system<br/>精灵球系统]
    A --> E[create_community_tables<br/>社区照片墙]
    A --> F[create_pokeball_transactions_table<br/>精灵球交易]
    A --> G[fix_icebreakers_column<br/>列类型修复]
```

**迁移执行注意事项**：所有迁移脚本均采用幂等设计，使用 `IF NOT EXISTS`、`ADD COLUMN IF NOT EXISTS` 和 `DO $$` 块避免重复执行错误。

### 迁移脚本清单

| 脚本文件 | 功能域 | 关键变更 | 幂等保护 |
|----------|--------|----------|----------|
| [add_user_profile_fields_v2.sql](backend/migrations/add_user_profile_fields_v2.sql#L1-L101) | 用户资料 | 添加星座/身高/收入/VIP 等字段，创建 `profile_completeness` 自动计算触发器 | `ADD COLUMN IF NOT EXISTS`, 数据迁移清理 gender |
| [add_wechat_fields.sql](backend/migrations/add_wechat_fields.sql#L1-L25) | 认证集成 | 添加 `wechat_openid`, `wechat_nickname`, `wechat_avatar_url` | `ADD COLUMN IF NOT EXISTS`, UNIQUE 约束 |
| [add_pokeball_system.sql](backend/migrations/add_pokeball_system.sql#L1-L133) | 游戏化 | 添加 `pokeball_count`, `matched_count`，创建 `pokeball_transactions`, `user_matches` 表，`user_pokeball_stats` 视图 | `ADD COLUMN IF NOT EXISTS`, `CREATE TABLE IF NOT EXISTS` |
| [create_community_tables.sql](backend/migrations/create_community_tables.sql#L1-L40) | 社区 | 创建 `community_photos`, `photo_likes` 表，审核状态机 (pending/approved/rejected) | `CREATE TABLE IF NOT EXISTS`, UNIQUE 约束 |
| [create_pokeball_transactions_table.sql](backend/migrations/create_pokeball_transactions_table.sql#L1-L38) | 游戏化 | 精灵球交易记录表，`DO $$` 块动态检查列存在性 | `CREATE TABLE IF NOT EXISTS`, `DO $$` 动态检查 |
| [fix_icebreakers_column.sql](backend/fix_icebreakers_column.sql#L1-L26) | 数据修复 | 将 `recommendations.icebreakers` 从 `TEXT[]` 改为 `JSONB` | 备份表机制 + `DROP COLUMN IF EXISTS` |

### 迁移执行顺序建议

对于新建数据库，按以下顺序执行：

```mermaid
flowchart TD
    S1["1. 执行 schema.sql\n(创建核心表和索引)"] --> S2["2. 执行 add_user_profile_fields_v2.sql\n(扩展用户资料字段)"]
    S2 --> S3["3. 执行 add_wechat_fields.sql\n(添加微信登录字段)"]
    S3 --> S4["4. 执行 add_pokeball_system.sql\n(精灵球+匹配系统)"]
    S4 --> S5["5. 执行 create_community_tables.sql\n(社区照片墙)"]
    S5 --> S6["6. 执行 create_pokeball_transactions_table.sql\n(精灵球交易记录)"]
    S6 --> S7["7. 执行 fix_icebreakers_column.sql\n(修复 icebreakers 列类型)"]
```

## 测试数据初始化

项目提供两套测试数据脚本用于开发环境：

| 文件 | 数据范围 | 特点 |
|------|----------|------|
| [test-data.sql](backend/test-data.sql#L1-L200) | 6 个用户 + 8 个约会地点 | 包含 PostGIS 地理坐标（北京地标），使用 `ON CONFLICT DO NOTHING` |
| [test-users.sql](backend/test-users.sql#L1-L126) | 6 个用户（含 `q_and_a` JSONB 字段） | 简化版，适合快速验证匹配算法 |

测试数据的密码哈希统一为 `$2a$10$ukM.fNv02toELJLSUSp9jOwFkTYcYc11ILn0huQKqRPgZXGKkzioi`（bcrypt 加密的 `password123`）。

## 部署集成

[docker-compose.yml](docker-compose.yml#L1-L40) 未直接包含 PostgreSQL 服务定义，这意味着数据库需要预先在 Docker 外部或通过其他编排方式提供。后端容器通过 `env_file: ./backend/.env` 加载 `DATABASE_URL` 连接字符串。

**生产环境初始化检查清单**：
1. 确认 PostgreSQL 实例运行且 PostGIS 扩展可用
2. 设置 `DATABASE_URL` 环境变量（含用户名、密码、主机、端口、数据库名）
3. 按顺序执行 `schema.sql` 和所有迁移脚本
4. （可选）导入测试数据用于开发环境验证
5. 启动后端服务，观察 `db.js` 中的连接测试日志输出

## 下一步

完成数据库初始化后，可继续阅读：
- [数据库模式概览](34-shu-ju-ku-mo-shi-gai-lan) — 深入了解各表结构和字段设计
- [PostGIS 地理位置查询](36-postgis-di-li-wei-zhi-cha-xun) — 学习基于地理空间的匹配和推荐查询
- [Docker Compose 编排](40-docker-compose-bian-pai) — 了解完整的服务编排配置
- [系统整体架构](7-xi-tong-zheng-ti-jia-gou) — 理解数据库在整体架构中的位置