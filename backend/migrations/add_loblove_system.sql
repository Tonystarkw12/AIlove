-- LobLove System Migration
-- Date: 2026-04-28
-- Adds: lobsters, lobster_chats, consents, introductions, subscriptions,
--        subscription_events, lobster_preferences tables
-- Modifies: users (adds wechat_id, subscription_status, trial_started_at)

-- ============================================
-- 1. Lobsters Table
-- ============================================
CREATE TABLE IF NOT EXISTS lobsters (
    lobster_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL UNIQUE REFERENCES users(user_id) ON DELETE CASCADE,

    -- Identity
    name VARCHAR(50) NOT NULL DEFAULT '',
    personality_profile JSONB,
    avatar_url TEXT,

    -- State
    status VARCHAR(20) DEFAULT 'active',
    total_matches_evaluated INT DEFAULT 0,
    total_introductions_facilitated INT DEFAULT 0,
    last_active_at TIMESTAMPTZ DEFAULT NOW(),

    -- Preferences
    matching_criteria JSONB,
    dealbreakers TEXT[],
    conversation_style VARCHAR(30) DEFAULT 'friendly',

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lobsters_owner ON lobsters(owner_id);
CREATE INDEX IF NOT EXISTS idx_lobsters_status ON lobsters(status);

COMMENT ON TABLE lobsters IS 'AI lobster agents representing human owners in the dating platform';

-- ============================================
-- 2. Lobster Chats Table
-- ============================================
CREATE TABLE IF NOT EXISTS lobster_chats (
    chat_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lobster_a_id UUID NOT NULL REFERENCES lobsters(lobster_id) ON DELETE CASCADE,
    lobster_b_id UUID NOT NULL REFERENCES lobsters(lobster_id) ON DELETE CASCADE,

    -- Conversation
    messages JSONB NOT NULL DEFAULT '[]',
    session_status VARCHAR(20) DEFAULT 'active',
    compatibility_score INT,
    compatibility_analysis TEXT,

    -- Outcome
    outcome VARCHAR(30) DEFAULT 'pending',
    recommended_at TIMESTAMPTZ,
    owner_a_response VARCHAR(20),
    owner_b_response VARCHAR(20),

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT no_self_chat CHECK (lobster_a_id != lobster_b_id)
);

CREATE INDEX IF NOT EXISTS idx_lobster_chats_participant_a ON lobster_chats(lobster_a_id);
CREATE INDEX IF NOT EXISTS idx_lobster_chats_participant_b ON lobster_chats(lobster_b_id);
CREATE INDEX IF NOT EXISTS idx_lobster_chats_status ON lobster_chats(session_status);
CREATE INDEX IF NOT EXISTS idx_lobster_chats_outcome ON lobster_chats(outcome);
CREATE INDEX IF NOT EXISTS idx_lobster_chats_score ON lobster_chats(compatibility_score DESC);
CREATE INDEX IF NOT EXISTS idx_lobster_chats_created ON lobster_chats(created_at DESC);

COMMENT ON TABLE lobster_chats IS 'Agent-to-agent conversations with compatibility evaluation';

-- ============================================
-- 3. Consents Table
-- ============================================
CREATE TABLE IF NOT EXISTS consents (
    consent_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chat_id UUID NOT NULL REFERENCES lobster_chats(chat_id) ON DELETE CASCADE,

    owner_a_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    owner_b_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,

    -- Consent state
    owner_a_wechat_consent BOOLEAN DEFAULT NULL,
    owner_b_wechat_consent BOOLEAN DEFAULT NULL,
    owner_a_consent_at TIMESTAMPTZ,
    owner_b_consent_at TIMESTAMPTZ,

    -- Execution
    wechat_exchanged BOOLEAN DEFAULT FALSE,
    wechat_exchange_at TIMESTAMPTZ,

    -- Revocation
    owner_a_revoked BOOLEAN DEFAULT FALSE,
    owner_b_revoked BOOLEAN DEFAULT FALSE,
    owner_a_revoked_at TIMESTAMPTZ,
    owner_b_revoked_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT unique_consent_per_chat UNIQUE (chat_id)
);

CREATE INDEX IF NOT EXISTS idx_consents_owner_a ON consents(owner_a_id);
CREATE INDEX IF NOT EXISTS idx_consents_owner_b ON consents(owner_b_id);

COMMENT ON TABLE consents IS 'Explicit owner consent for WeChat ID exchange after lobster matching';

-- ============================================
-- 4. Introductions Table
-- ============================================
CREATE TABLE IF NOT EXISTS introductions (
    introduction_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    consent_id UUID NOT NULL REFERENCES consents(consent_id) ON DELETE CASCADE,
    lobster_a_id UUID NOT NULL REFERENCES lobsters(lobster_id) ON DELETE CASCADE,
    lobster_b_id UUID NOT NULL REFERENCES lobsters(lobster_id) ON DELETE CASCADE,

    -- Exchanged data
    owner_a_wechat_id VARCHAR(100),
    owner_b_wechat_id VARCHAR(100),

    -- Follow-up
    status VARCHAR(20) DEFAULT 'exchanged',
    owner_a_feedback TEXT,
    owner_b_feedback TEXT,
    feedback_submitted_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_introductions_consent ON introductions(consent_id);
CREATE INDEX IF NOT EXISTS idx_introductions_status ON introductions(status);

COMMENT ON TABLE introductions IS 'Records of actual WeChat introductions and their outcomes';

-- ============================================
-- 5. Subscriptions Table
-- ============================================
CREATE TABLE IF NOT EXISTS subscriptions (
    subscription_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(user_id) ON DELETE CASCADE,

    -- Plan
    plan_type VARCHAR(20) DEFAULT 'free_trial',
    status VARCHAR(20) DEFAULT 'active',

    -- Trial
    trial_started_at TIMESTAMPTZ,
    trial_ends_at TIMESTAMPTZ,

    -- Paid subscription
    paid_starts_at TIMESTAMPTZ,
    paid_ends_at TIMESTAMPTZ,
    payment_method VARCHAR(30),
    external_transaction_id VARCHAR(100),

    -- Limits
    max_lobster_chats_per_day INT DEFAULT 10,
    max_introductions_per_month INT DEFAULT 3,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_trial_end ON subscriptions(trial_ends_at);

COMMENT ON TABLE subscriptions IS 'User subscription management with 7-day free trial';

-- ============================================
-- 6. Subscription Events Table
-- ============================================
CREATE TABLE IF NOT EXISTS subscription_events (
    event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_id UUID NOT NULL REFERENCES subscriptions(subscription_id) ON DELETE CASCADE,
    event_type VARCHAR(30) NOT NULL,
    event_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscription_events_sub ON subscription_events(subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscription_events_type ON subscription_events(event_type);

COMMENT ON TABLE subscription_events IS 'Audit trail for subscription lifecycle events';

-- ============================================
-- 7. Lobster Preferences Table
-- ============================================
CREATE TABLE IF NOT EXISTS lobster_preferences (
    pref_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lobster_id UUID NOT NULL UNIQUE REFERENCES lobsters(lobster_id) ON DELETE CASCADE,

    -- Collected preferences
    owner_values JSONB,
    owner_communication_style JSONB,
    owner_dating_goals VARCHAR(30),
    owner_lifestyle JSONB,
    owner_ideal_partner JSONB,
    dealbreaker_list TEXT[],

    -- Metadata
    last_updated_by VARCHAR(20) DEFAULT 'manual',
    conversation_count INT DEFAULT 0,
    confidence_score FLOAT DEFAULT 0.0,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lobster_prefs_lobster ON lobster_preferences(lobster_id);

COMMENT ON TABLE lobster_preferences IS 'Deep preference data collected via OpenClaw skill conversations';

-- ============================================
-- 8. Trigger Function (if not exists from schema.sql)
-- ============================================
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 9. Users Table Extensions (run with superuser)
-- ============================================
DO $$ BEGIN
  ALTER TABLE users ADD COLUMN IF NOT EXISTS wechat_id VARCHAR(100);
EXCEPTION WHEN insufficient_privilege THEN
  RAISE NOTICE 'Skipping users table alteration: insufficient privileges. Run manually as superuser.';
END $$;

DO $$ BEGIN
  ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(20) DEFAULT 'none';
EXCEPTION WHEN insufficient_privilege THEN
  RAISE NOTICE 'Skipping users table alteration: insufficient privileges. Run manually as superuser.';
END $$;

DO $$ BEGIN
  ALTER TABLE users ADD COLUMN IF NOT EXISTS trial_started_at TIMESTAMPTZ;
EXCEPTION WHEN insufficient_privilege THEN
  RAISE NOTICE 'Skipping users table alteration: insufficient privileges. Run manually as superuser.';
END $$;

-- ============================================
-- 10. Updated_at Triggers for New Tables
-- ============================================
CREATE TRIGGER set_timestamp_lobsters
BEFORE UPDATE ON lobsters
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER set_timestamp_lobster_chats
BEFORE UPDATE ON lobster_chats
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER set_timestamp_consents
BEFORE UPDATE ON consents
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER set_timestamp_introductions
BEFORE UPDATE ON introductions
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER set_timestamp_subscriptions
BEFORE UPDATE ON subscriptions
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER set_timestamp_lobster_preferences
BEFORE UPDATE ON lobster_preferences
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

DO $$ BEGIN
  COMMENT ON COLUMN users.wechat_id IS 'User WeChat ID for introduction exchange (encrypted at rest)';
EXCEPTION WHEN undefined_column THEN NULL;
END $$;

DO $$ BEGIN
  COMMENT ON COLUMN users.subscription_status IS 'none, free_trial, active, expired, cancelled';
EXCEPTION WHEN undefined_column THEN NULL;
END $$;
