-- AIlove 精灵球交易系统表
-- 用于记录用户精灵球的充值和消费记录

-- 创建精灵球交易记录表
CREATE TABLE IF NOT EXISTS pokeball_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('recharge', 'consume')),
    amount INT NOT NULL,
    description TEXT,
    balance_after INT NOT NULL,
    reference_id UUID, -- 关联业务 ID（如匹配 ID、任务 ID 等）
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 为用户精灵球交易添加索引
CREATE INDEX IF NOT EXISTS idx_pokeball_transactions_user_id ON pokeball_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_pokeball_transactions_type ON pokeball_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_pokeball_transactions_created_at ON pokeball_transactions(created_at DESC);

-- 为 users 表添加 pokeball_count 字段（如果不存在）
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'pokeball_count'
    ) THEN
        ALTER TABLE users ADD COLUMN pokeball_count INT DEFAULT 0;
    END IF;
END $$;

-- 添加注释
COMMENT ON TABLE pokeball_transactions IS '精灵球交易记录表，记录充值和消费';
COMMENT ON COLUMN pokeball_transactions.transaction_type IS '交易类型：recharge-充值，consume-消费';
COMMENT ON COLUMN pokeball_transactions.amount IS '交易数量（精灵球个数）';
COMMENT ON COLUMN pokeball_transactions.balance_after IS '交易后的余额';
COMMENT ON COLUMN pokeball_transactions.reference_id IS '关联业务 ID，如匹配 ID、约会任务 ID 等';
