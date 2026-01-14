-- ============================================
-- AIlove 微信登录字段数据库迁移
-- ============================================

-- 为users表添加微信相关字段
ALTER TABLE users
ADD COLUMN IF NOT EXISTS wechat_openid VARCHAR(100) UNIQUE,
ADD COLUMN IF NOT EXISTS wechat_nickname VARCHAR(100),
ADD COLUMN IF NOT EXISTS wechat_avatar_url TEXT;

-- 添加注释
COMMENT ON COLUMN users.wechat_openid IS '微信OpenID，用于微信登录';
COMMENT ON COLUMN users.wechat_nickname IS '微信昵称';
COMMENT ON COLUMN users.wechat_avatar_url IS '微信头像URL';

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_users_wechat_openid ON users(wechat_openid);

-- 迁移完成
-- 验证命令：
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'users'
-- AND column_name IN ('wechat_openid', 'wechat_nickname', 'wechat_avatar_url');
