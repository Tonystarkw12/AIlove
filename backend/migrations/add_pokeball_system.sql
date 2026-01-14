-- ============================================
-- AIlove 精灵球系统数据库迁移
-- ============================================

-- 1. 为用户表添加精灵球字段
ALTER TABLE users
ADD COLUMN IF NOT EXISTS pokeball_count INTEGER NOT NULL DEFAULT 2,
ADD COLUMN IF NOT EXISTS matched_count INTEGER NOT NULL DEFAULT 0;

COMMENT ON COLUMN users.pokeball_count IS '用户当前拥有的精灵球数量，初始默认2个';
COMMENT ON COLUMN users.matched_count IS '用户配对成功的总次数';

-- 2. 创建精灵球交易记录表
CREATE TABLE IF NOT EXISTS pokeball_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,

  -- 交易类型：recharge(充值) | consume(消耗)
  transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('recharge', 'consume')),

  -- 交易数量（正数）
  amount INTEGER NOT NULL CHECK (amount > 0),

  -- 交易描述
  description TEXT NOT NULL,

  -- 交易后余额
  balance_after INTEGER NOT NULL,

  -- 关联ID（可选，比如匹配ID、充值订单ID等）
  reference_id UUID,

  -- 创建时间
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  -- 索引
  CONSTRAINT valid_pokeball_amount CHECK (amount > 0)
);

CREATE INDEX IF NOT EXISTS idx_pokeball_transactions_user_id ON pokeball_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_pokeball_transactions_created_at ON pokeball_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pokeball_transactions_type ON pokeball_transactions(transaction_type);

COMMENT ON TABLE pokeball_transactions IS '精灵球交易记录表';
COMMENT ON COLUMN pokeball_transactions.transaction_type IS '交易类型：recharge(充值)、consume(消耗)';
COMMENT ON COLUMN pokeball_transactions.amount IS '交易数量（正数）';
COMMENT ON COLUMN pokeball_transactions.balance_after IS '交易后的精灵球余额';
COMMENT ON COLUMN pokeball_transactions.reference_id IS '关联业务ID（可选）';

-- 3. 创建配对记录表
CREATE TABLE IF NOT EXISTS user_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 配对用户（谁和谁配对）
  user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  matched_user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,

  -- 配对时的宝可梦信息
  user_pokemon_type VARCHAR(50),
  user_pokemon_name VARCHAR(100),
  user_pokemon_sprite TEXT,

  matched_pokemon_type VARCHAR(50),
  matched_pokemon_name VARCHAR(100),
  matched_pokemon_sprite TEXT,

  -- 配对时的相容度分数
  compatibility_score DECIMAL(5,2),

  -- 创建时间
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  -- 唯一约束：同一对用户只能有一条配对记录
  UNIQUE(user_id, matched_user_id)
);

CREATE INDEX IF NOT EXISTS idx_user_matches_user_id ON user_matches(user_id);
CREATE INDEX IF NOT EXISTS idx_user_matches_created_at ON user_matches(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_matches_compatibility ON user_matches(compatibility_score DESC);

COMMENT ON TABLE user_matches IS '用户配对记录表';
COMMENT ON COLUMN user_matches.user_id IS '发起匹配的用户ID';
COMMENT ON COLUMN user_matches.matched_user_id IS '被配对的用户ID';
COMMENT ON COLUMN user_matches.compatibility_score IS '配对相容度分数（0-100）';

-- 4. 更新现有用户的初始精灵球数量
UPDATE users
SET pokeball_count = 2
WHERE pokeball_count IS NULL OR pokeball_count = 0;

-- 5. 创建触发器：确保新用户默认有2个精灵球
CREATE OR REPLACE FUNCTION ensure_default_pokeball()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.pokeball_count IS NULL THEN
    NEW.pokeball_count := 2;
  END IF;
  IF NEW.matched_count IS NULL THEN
    NEW.matched_count := 0;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_ensure_default_pokeball ON users;
CREATE TRIGGER trigger_ensure_default_pokeball
  BEFORE INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION ensure_default_pokeball();

-- 6. 创建统计视图（可选）
CREATE OR REPLACE VIEW user_pokeball_stats AS
SELECT
  u.id AS user_id,
  u.nickname,
  u.pokeball_count,
  u.matched_count,
  COUNT(DISTINCT um.id) AS total_matches,
  SUM(CASE WHEN pt.transaction_type = 'recharge' THEN pt.amount ELSE 0 END) AS total_recharged,
  SUM(CASE WHEN pt.transaction_type = 'consume' THEN pt.amount ELSE 0 END) AS total_consumed
FROM users u
LEFT JOIN user_matches um ON (u.id = um.user_id)
LEFT JOIN pokeball_transactions pt ON (u.id = pt.user_id)
GROUP BY u.id, u.nickname, u.pokeball_count, u.matched_count;

COMMENT ON VIEW user_pokeball_stats IS '用户精灵球统计视图';

-- 迁移完成
-- 执行完成后请运行以下命令验证：
-- SELECT COUNT(*) FROM pokeball_transactions;
-- SELECT COUNT(*) FROM user_matches;
-- SELECT nickname, pokeball_count, matched_count FROM users LIMIT 5;
