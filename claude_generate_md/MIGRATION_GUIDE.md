# AIlove 精灵球系统部署指南

## 数据库迁移说明

由于需要数据库表的所有者权限，请手动执行以下SQL命令：

### 方法1：使用psql命令行

```bash
psql -U postgres -d aiyuelaodb
```

然后执行：

```sql
-- 添加精灵球字段到users表
ALTER TABLE users ADD COLUMN IF NOT EXISTS pokeball_count INTEGER NOT NULL DEFAULT 2;
ALTER TABLE users ADD COLUMN IF NOT EXISTS matched_count INTEGER NOT NULL DEFAULT 0;

-- 更新现有用户
UPDATE users SET pokeball_count = 2 WHERE pokeball_count IS NULL;
UPDATE users SET matched_count = 0 WHERE matched_count IS NULL;

-- 添加注释
COMMENT ON COLUMN users.pokeball_count IS '用户当前拥有的精灵球数量，初始默认2个';
COMMENT ON COLUMN users.matched_count IS '用户配对成功的总次数';
```

### 方法2：使用pgAdmin

1. 打开pgAdmin
2. 连接到数据库 `aiyuelaodb`
3. 点击Query工具
4. 粘贴上述SQL并执行

## 已自动创建的表

以下表已经成功创建，无需手动操作：

- ✅ `pokeball_transactions` - 精灵球交易记录表
- ✅ `user_matches` - 用户配对记录表

## 验证迁移

执行以下命令验证迁移是否成功：

```sql
-- 检查新字段是否添加成功
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'users'
AND column_name IN ('pokeball_count', 'matched_count');

-- 检查新表是否创建成功
SELECT table_name
FROM information_schema.tables
WHERE table_name IN ('pokeball_transactions', 'user_matches');

-- 检查用户数据
SELECT nickname, pokeball_count, matched_count
FROM users
LIMIT 5;
```

## 后端配置

后端已经配置好以下API路由：

### 精灵球系统 API

- `GET /api/pokeball/history` - 获取精灵球交易历史
- `POST /api/pokeball/recharge` - 精灵球充值
- `POST /api/pokeball/consume` - 精灵球消费
- `GET /api/pokeball/balance` - 获取精灵球余额

### 用户匹配记录 API

- `GET /api/users/me/matches` - 获取当前用户的配对记录
- `POST /api/users/me/matches` - 创建配对记录
- `GET /api/users/:id/matches` - 获取指定用户的配对记录

## 前端页面

前端已创建以下页面：

- ✅ `/pages/settings/settings.vue` - 设置页面（明暗主题切换）
- ✅ `/pages/pokemon/my-pokemon.vue` - 我的宝可梦（配对记录）
- ✅ `/pages/pokeball/pokeball-history.vue` - 精灵球记录
- ✅ `/pages/pokeball/buy-pokeball.vue` - 购买精灵球
- ✅ 更新 `/pages/user/user.vue` - 用户中心（新菜单项）
- ✅ 更新 `/pages/login/login.vue` - 登录页面（GameBoy风格）

## 系统功能说明

### 1. 精灵球系统
- 新用户注册默认赠送2个精灵球
- 每次匹配消耗1个精灵球
- 1元 = 1个精灵球
- 支持微信扫码充值

### 2. 主题系统
- 亮色主题：GameBoy经典绿色
- 暗色主题：GameBoy Advance风格
- 设置中可自由切换

### 3. 配对记录
- 记录所有成功配对过的用户
- 显示配对时间、宝可梦信息
- 支持查看对方资料

## 启动服务

### 后端
```bash
cd /mnt/f/AIlove/backend
npm start
```

### 前端
```bash
cd /mnt/f/AIlove/frontend
npm run dev:h5
```

## 测试流程

1. **注册新用户**
   - 访问注册页面
   - 填写信息注册
   - 自动获得2个精灵球

2. **登录系统**
   - 使用GameBoy风格登录页
   - 进入首页

3. **查看精灵球**
   - 进入"我的"页面
   - 查看精灵球数量（应显示2个）

4. **购买精灵球**
   - 点击"购买精灵球"
   - 扫描二维码支付
   - 点击"我已支付"

5. **切换主题**
   - 进入"设置"
   - 切换明暗主题
   - 查看所有页面主题变化

6. **查看配对记录**
   - 点击"我的宝可梦"
   - 查看配对历史（如无配对则显示空状态）

## 注意事项

1. **数据库权限**：确保数据库用户有ALTER TABLE权限
2. **二维码图片**：确保 `/mnt/f/AIlove/frontend/src/static/qrcode.jpg` 存在
3. **API响应格式**：所有API返回格式统一为 `{ success: true/false, data/records: ..., error: {...} }`
4. **主题存储**：主题设置保存在本地存储中，key为 `ailove_theme`

## 常见问题

### Q: 精灵球数量显示为0？
A: 检查数据库users表是否已添加pokeball_count字段，并确保默认值为2

### Q: 主题切换不生效？
A: 清除浏览器缓存，检查控制台是否有JavaScript错误

### Q: 配对记录页面为空？
A: 正常现象，需要先进行匹配才能看到记录

### Q: 购买精灵球后余额没变化？
A: 检查后端API是否正常运行，查看浏览器Network面板

## 技术栈

- **前端**：Uniapp + Vue 3 + TailwindCSS
- **后端**：Node.js + Express + PostgreSQL
- **主题**：CSS变量 + Vue Composition API
- **支付**：微信扫码支付（手动确认）

## 文件清单

### 新增文件
```
/mnt/f/AIlove/frontend/src/
├── composables/useTheme.js              # 主题composable
├── styles/theme.css                     # 主题样式
├── pages/
│   ├── settings/settings.vue            # 设置页面
│   ├── pokemon/my-pokemon.vue           # 我的宝可梦
│   └── pokeball/
│       ├── pokeball-history.vue         # 精灵球记录
│       └── buy-pokeball.vue             # 购买精灵球

/mnt/f/AIlove/backend/
├── routes/
│   ├── pokeball.js                      # 精灵球API
│   └── matches.js                       # 匹配记录API
└── migrations/
    └── add_pokeball_system.sql          # 数据库迁移脚本
```

### 修改文件
```
/mnt/f/AIlove/frontend/src/
├── main.js                              # 导入主题样式
├── pages.json                           # 注册新页面
├── pages/
│   ├── login/login.vue                  # GameBoy风格登录
│   └── user/user.vue                    # 更新菜单项

/mnt/f/AIlove/backend/
├── server.js                            # 注册新路由
└── routes/users.js                      # 更新用户状态API
```

## 完成状态

- ✅ 登录页面GameBoy化
- ✅ 主题切换系统（明暗双主题）
- ✅ 我的宝可梦页面（配对记录）
- ✅ 精灵球记录页面
- ✅ 购买精灵球页面
- ✅ 用户页面菜单更新
- ✅ 后端API（精灵球系统）
- ✅ 后端API（配对记录）
- ✅ 数据库表结构（pokeball_transactions, user_matches）
- ⚠️ 数据库字段（pokeball_count, matched_count）- 需要手动添加

## 下一步

请按照上述说明手动添加数据库字段，然后重启后端服务即可开始使用！
