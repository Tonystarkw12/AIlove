-- AIlove 用户资料字段扩展迁移脚本
-- 执行时间: 2026-01-13
-- 目的: 支持详细用户资料和宝可梦风格功能

BEGIN;

-- 1. 添加基础信息字段
ALTER TABLE users ADD COLUMN IF NOT EXISTS constellation VARCHAR(20); -- 星座
ALTER TABLE users ADD COLUMN IF NOT EXISTS height INT; -- 身高(cm)
ALTER TABLE users ADD COLUMN IF NOT EXISTS weight INT; -- 体重(kg)
ALTER TABLE users ADD COLUMN IF NOT EXISTS monthly_income INT; -- 月收入
ALTER TABLE users ADD COLUMN IF NOT EXISTS occupation VARCHAR(100); -- 职业
ALTER TABLE users ADD COLUMN IF NOT EXISTS family_status VARCHAR(50); -- 家庭情况

-- 2. 修改gender字段为枚举类型（先删除旧数据，重建）
-- 注意：如果有现有数据，需要先备份
ALTER TABLE users ALTER COLUMN gender DROP DEFAULT;
ALTER TABLE users ADD CONSTRAINT check_gender CHECK (gender IN ('Male', 'Female', 'Gay', 'Lesbian'));

-- 3. 添加VIP等级字段
ALTER TABLE users ADD COLUMN IF NOT EXISTS vip_level VARCHAR(50) DEFAULT '普通训练师'; -- VIP等级
ALTER TABLE users ADD COLUMN IF NOT EXISTS vip_expires_at TIMESTAMPTZ; -- VIP过期时间

-- 4. 添加资料完整度字段（用于判断是否可以匹配）
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_completeness INT DEFAULT 0; -- 资料完整度(0-100)

-- 5. 添加今日匹配次数（用于HP/精力值系统）
ALTER TABLE users ADD COLUMN IF NOT EXISTS daily_match_count INT DEFAULT 0; -- 今日匹配次数
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_match_date DATE DEFAULT CURRENT_DATE; -- 最后匹配日期

-- 6. 添加宝可梦头像ID（用于第二阶段）
ALTER TABLE users ADD COLUMN IF NOT EXISTS pokemon_avatar_id VARCHAR(50); -- 宝可梦头像ID

-- 7. 添加照片数组字段（存储多个照片URL）
ALTER TABLE users ADD COLUMN IF NOT EXISTS photos JSONB DEFAULT '[]'::jsonb; -- 用户照片数组

-- 8. 添加字段注释
COMMENT ON COLUMN users.constellation IS '星座（12星座）';
COMMENT ON COLUMN users.height IS '身高（厘米）';
COMMENT ON COLUMN users.weight IS '体重（公斤）';
COMMENT ON COLUMN users.monthly_income IS '月收入（元）';
COMMENT ON COLUMN users.occupation IS '职业';
COMMENT ON COLUMN users.family_status IS '家庭情况';
COMMENT ON COLUMN users.gender IS '性别：Male(男), Female(女), Gay(男同), Lesbian(女同)';
COMMENT ON COLUMN users.vip_level IS 'VIP等级：普通训练师、黄金训练师、大师球级';
COMMENT ON COLUMN users.vip_expires_at IS 'VIP会员过期时间';
COMMENT ON COLUMN users.profile_completeness IS '资料完整度百分比（0-100）';
COMMENT ON COLUMN users.daily_match_count IS '今日已匹配次数';
COMMENT ON COLUMN users.last_match_date IS '最后匹配日期';
COMMENT ON COLUMN users.pokemon_avatar_id IS '宝可梦头像ID（用于个性映射）';
COMMENT ON COLUMN users.photos IS '用户生活照URL数组';

-- 9. 创建更新资料完整度的触发器
CREATE OR REPLACE FUNCTION update_profile_completeness()
RETURNS TRIGGER AS $$
BEGIN
    NEW.profile_completeness = 0;

    -- 基础信息（40%）
    IF NEW.nickname IS NOT NULL THEN NEW.profile_completeness = NEW.profile_completeness + 5; END IF;
    IF NEW.gender IS NOT NULL THEN NEW.profile_completeness = NEW.profile_completeness + 5; END IF;
    IF NEW.birth_date IS NOT NULL THEN NEW.profile_completeness = NEW.profile_completeness + 10; END IF; -- 可以计算年龄
    IF NEW.constellation IS NOT NULL THEN NEW.profile_completeness = NEW.profile_completeness + 5; END IF;
    IF NEW.occupation IS NOT NULL THEN NEW.profile_completeness = NEW.profile_completeness + 10; END IF;

    -- 外貌信息（20%）
    IF NEW.height IS NOT NULL THEN NEW.profile_completeness = NEW.profile_completeness + 10; END IF;
    IF NEW.weight IS NOT NULL THEN NEW.profile_completeness = NEW.profile_completeness + 10; END IF;

    -- 兴趣和价值观（30%）
    IF NEW.tags IS NOT NULL AND array_length(NEW.tags, 1) > 0 THEN NEW.profile_completeness = NEW.profile_completeness + 15; END IF;
    IF NEW.values_description IS NOT NULL AND length(NEW.values_description) > 10 THEN NEW.profile_completeness = NEW.profile_completeness + 15; END IF;

    -- 多媒体（10%）
    IF NEW.photos IS NOT NULL AND jsonb_array_length(NEW.photos) > 0 THEN NEW.profile_completeness = NEW.profile_completeness + 10; END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_profile_completeness ON users;
CREATE TRIGGER trigger_update_profile_completeness
    BEFORE INSERT OR UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_profile_completeness();

-- 10. 更新现有用户的资料完整度
UPDATE users SET profile_completeness = 0; -- 触发器会自动计算

COMMIT;

-- 验证修改
\d users
SELECT user_id, nickname, gender, profile_completeness, vip_level, daily_match_count FROM users LIMIT 5;
