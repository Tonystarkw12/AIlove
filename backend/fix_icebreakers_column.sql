-- 修复icebreakers列类型：从TEXT[]改为JSONB
-- 执行时间: 2026-01-13
-- 作者: Claude (AI Assistant)

BEGIN;

-- 1. 备份现有数据（如果有的话）
CREATE TABLE IF NOT EXISTS recommendations_backup AS
SELECT * FROM recommendations;

-- 2. 删除旧的icebreakers列
ALTER TABLE recommendations DROP COLUMN IF EXISTS icebreakers;

-- 3. 添加新的icebreakers列（JSONB类型）
ALTER TABLE recommendations ADD COLUMN icebreakers JSONB;

-- 4. 添加注释
COMMENT ON COLUMN recommendations.icebreakers IS 'Array of icebreaker questions stored as JSONB';

COMMIT;

-- 验证修改
\d recommendations

SELECT COUNT(*) as total_records FROM recommendations;
