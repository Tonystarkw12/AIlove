# AIlove 项目测试指南

## 🚀 服务器状态

### 后端服务器
- **状态：** ✅ 运行中
- **PID：** 18784
- **地址：** http://localhost:3000
- **日志：** `/tmp/backend-output.log`

### 前端开发服务器
- **状态：** ✅ 运行中
- **PID：** 19115
- **地址：** http://localhost:5173
- **日志：** `/tmp/frontend-output.log`

## 🧪 功能测试清单

### 1. 后端 API 测试

#### 健康检查
```bash
curl http://localhost:3000/
# 预期输出：AI Yue Lao Backend is running!
```

#### 用户状态 API（需要 Token）
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/api/users/me/status
```

**预期响应：**
```json
{
  "profileCompleteness": 60,
  "isProfileComplete": true,
  "points": 100,
  "hasEnoughPoints": true,
  "pointsPerMatch": 50,
  "dailyMatchCount": 3,
  "maxDailyMatches": 10,
  "vipLevel": "普通训练师",
  "isVip": false,
  "pokemonAvatarId": "025"
}
```

#### 宝可梦头像分配 API
```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/api/users/me/assign-pokemon
```

**预期响应：**
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

#### 社区照片墙 API
```bash
# 获取照片列表
curl http://localhost:3000/api/community/photos?page=1&pageSize=10

# 获取我的提交
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/api/community/my-submissions
```

### 2. 前端页面测试

#### 访问地址
```
http://localhost:5173
```

#### 浏览器测试步骤

**1. 注册/登录测试**
- 访问 http://localhost:5173
- 应自动跳转到注册页（无 Token）
- 填写昵称、邮箱、密码
- 点击注册并自动登录

**2. 首页测试**
- 检查顶部训练师雷达卡片
- 验证 HP/EXP 状态条显示
- 查看附近训练师数量
- 检查 GameBoy 风格匹配按钮
- 点击匹配按钮：
  - 检查积分不足提示
  - 或资料不完整提示
  - 或开始雷达扫描动画（3 秒）
  - 显示匹配结果弹窗
  - 检查宝可梦头像和类型徽章

**3. 甜蜜墙页面测试**
- 点击底部 TabBar "甜蜜墙"
- 检查拍立得风格照片展示
- 验证瀑布流布局
- 点击上传按钮
- 测试照片上传功能
- 填写纪念日、情侣昵称、甜蜜寄语
- 提交并查看成功提示

**4. 个人中心测试**
- 点击"我的" Tab
- 查看训练师信息
- 检查 VIP 等级显示
- 查看积分和经验值
- 编辑个人资料

### 3. 组件测试

#### HP/EXP 状态条组件
**文件位置：** `/src/components/HpExpBar.vue`

**测试点：**
- HP 条显示当前匹配次数 / 最大匹配次数
- EXP 条显示当前积分 / 升级所需积分
- 条形宽度百分比正确
- 光泽动画效果正常
- 颜色正确（HP：红色，EXP：蓝色）

#### GameBoy 按钮组件
**文件位置：** `/src/components/GameboyButton.vue`

**测试点：**
- 4px 黑色边框显示
- 点击时有按压动画效果
- 不同类型颜色正确（primary, secondary, danger, success）
- 加载状态动画正常
- 禁用状态样式正确

#### 宝可梦类型徽章组件
**文件位置：** `/src/components/PokemonTypeBadge.vue`

**测试点：**
- 18 种类型颜色正确
- 黑色边框和阴影效果
- 自定义标签文字功能
- 类型名称映射正确

### 4. 样式测试

#### GameBoy 复古风格
- 检查 4px 黑色边框
- 验证 box-shadow 效果
- 确认按压动画（translate + box-shadow 变化）

#### 宝可梦主题颜色
- 训练师雷达卡片：`#9BBC0F` 背景
- VIP 等级颜色：
  - 普通训练师：`#CD7F32`
  - 黄金训练师：`FFD700`
  - 大师球级：`#B9F2FF`
- 匹配度标签：`#FFCB05`（宝可梦黄）

#### 拍立得照片风格
- 白色边框
- 手写体日期显示
- -2deg 旋转效果
- 底部留白空间

### 5. 数据库测试

#### 连接数据库
```bash
PGPASSWORD=aiyuepass123 psql -h localhost -U aiyueuser -d aiyuelaodb
```

#### 检查表结构
```sql
-- 查看社区照片表
\d community_photos

-- 查看照片点赞表
\d photo_likes

-- 查看用户表新字段
\d users
```

#### 测试查询
```sql
-- 查看已审核的照片
SELECT * FROM community_photos WHERE status = 'approved' LIMIT 10;

-- 统计照片点赞数
SELECT photo_id, COUNT(*) as likes
FROM photo_likes
GROUP BY photo_id;

-- 查看用户宝可梦头像
SELECT user_id, nickname, pokemon_avatar_id
FROM users
WHERE pokemon_avatar_id IS NOT NULL
LIMIT 10;
```

### 6. 集成测试

#### 完整匹配流程
1. 用户登录
2. 完善个人资料（添加性格标签）
3. 调用宝可梦头像分配 API
4. 查看首页显示宝可梦头像
5. 点击匹配按钮
6. 验证资料完整度检查
7. 验证积分充足检查
8. 查看雷达扫描动画
9. 查看匹配结果弹窗
10. 验证匹配用户宝可梦类型徽章

#### 社区照片上传流程
1. 访问甜蜜墙页面
2. 点击上传按钮
3. 选择照片（相册/相机）
4. 填写纪念日
5. 填写情侣昵称
6. 填写甜蜜寄语
7. 提交审核
8. 查看"待审核"状态
9. 模拟管理员审核通过
10. 验证 500 积分到账

## 🔧 常见问题排查

### 后端问题

**端口占用**
```bash
# 查找并杀掉占用 3000 端口的进程
lsof -ti:3000 | xargs kill -9
```

**数据库连接失败**
```bash
# 检查 PostgreSQL 是否运行
sudo systemctl status postgresql

# 重启 PostgreSQL
sudo systemctl restart postgresql
```

**查看后端日志**
```bash
tail -f /tmp/backend-output.log
```

### 前端问题

**端口 5173 被占用**
```bash
# 查找并杀掉占用 5173 端口的进程
lsof -ti:5173 | xargs kill -9
```

**组件导入错误**
- 检查 `main.js` 是否导入 TailwindCSS
- 检查组件路径是否正确
- 清除缓存：`rm -rf node_modules/.vite`

**样式不生效**
- 检查 `tailwind.config.js` 配置
- 确认 `postcss.config.js` 存在
- 重启开发服务器

### 数据库问题

**UUID 类型不兼容**
```sql
-- 检查 user_id 类型
SELECT user_id, pg_typeof(user_id) FROM users LIMIT 1;

-- 应该显示 UUID 类型
```

**外键约束错误**
```sql
-- 检查外键是否正确创建
SELECT
    conname AS constraint_name,
    conrelid::regclass AS table_name,
    confrelid::regclass AS foreign_table_name
FROM pg_constraint
WHERE conrelid = 'community_photos'::regclass;
```

## 📊 性能测试

### 后端性能

#### 使用 Apache Bench
```bash
# 测试用户状态 API（需要替换 TOKEN）
ab -n 1000 -c 10 \
  -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/api/users/me/status
```

#### 检查响应时间
```bash
time curl http://localhost:3000/
```

### 前端性能

#### 检查编译时间
查看日志中的 "ready in" 时间
- 首次编译：< 40 秒（正常）
- 热更新：< 2 秒（正常）

#### 检查包大小
```bash
cd /mnt/f/AIlove/frontend
npm run build:h5
# 查看 dist 目录大小
du -sh dist/
```

## ✅ 测试完成标准

- [ ] 后端服务器正常启动（PID 18784）
- [ ] 前端开发服务器正常启动（PID 19115）
- [ ] 健康检查 API 返回正确
- [ ] 用户状态 API 返回正确（带 Token）
- [ ] 宝可梦头像分配 API 返回正确
- [ ] 社区照片 API 返回正确
- [ ] 首页加载正常，显示 GameBoy 风格
- [ ] HP/EXP 状态条显示正确
- [ ] 匹配按钮样式和动画正常
- [ ] 甜蜜墙页面加载正常
- [ ] 拍立得照片样式正确
- [ ] TabBar 切换正常
- [ ] 数据库表创建成功
- [ ] 索引创建成功
- [ ] 所有组件渲染正常

## 🎯 下一步优化建议

1. **生产环境配置**
   - 配置 PM2 进程管理
   - 设置环境变量
   - 配置 Nginx 反向代理

2. **性能优化**
   - 启用 Redis 缓存
   - 优化数据库查询
   - 压缩前端资源

3. **功能完善**
   - 添加管理员审核界面
   - 实现全局广播通知
   - 添加照片点赞 WebSocket

4. **测试覆盖**
   - 编写单元测试
   - 添加 E2E 测试
   - 性能压测

---

**测试时间：** 2026-01-13
**服务器：**
- 后端 PID: 18784
- 前端 PID: 19115
**访问地址：**
- 前端：http://localhost:5173
- 后端：http://localhost:3000
