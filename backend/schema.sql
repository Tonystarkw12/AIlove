-- Drop tables if they exist to ensure a clean setup (in dependency order)
DROP TABLE IF EXISTS chat_messages CASCADE;
DROP TABLE IF EXISTS recommendations CASCADE;
DROP TABLE IF EXISTS user_photos CASCADE;
DROP TABLE IF EXISTS dating_tasks CASCADE;
DROP TABLE IF EXISTS dating_spots CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Enable PostGIS extension for geospatial queries
CREATE EXTENSION IF NOT EXISTS postgis;

-- Users Table
CREATE TABLE users (
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nickname VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    gender VARCHAR(20),
    birth_date DATE,
    height_cm INT,
    weight_kg INT,
    occupation VARCHAR(100),
    salary_range VARCHAR(50), -- e.g., "0-5k", "5k-10k"
    orientation VARCHAR(50),
    bio TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Gamification System (Phase 4)
    points INT DEFAULT 0, -- 恋爱积分
    level INT DEFAULT 1, -- 用户等级
    last_login_date DATE, -- 上次登录日期（用于每日登录奖励）

    -- Geolocation (Phase 1 - PostGIS)
    location GEOGRAPHY(POINT, 4326), -- PostGIS 地理位置字段 (经纬度)

    -- Fields for AI Recommendation (as per project description)
    -- For Geo-query (粗筛)
    location_geohash VARCHAR(20), -- Geohash for location
    location_latitude DOUBLE PRECISION,
    location_longitude DOUBLE PRECISION,

    -- For Basic Preference (粗筛)
    preferred_age_min INT,
    preferred_age_max INT,
    preferred_gender VARCHAR(20),

    -- For Interest Tags (粗筛)
    tags TEXT[], -- Array of strings

    -- For AI Fine-tuning (精筛)
    values_description TEXT, -- "我认为最重要的是真诚和共同成长。"
    q_and_a JSONB -- {"ideal_weekend": "...", "about_pets": "..."}
);

-- User Photos Table
CREATE TABLE user_photos (
    photo_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    is_avatar BOOLEAN DEFAULT FALSE,
    is_unlocked BOOLEAN DEFAULT FALSE, -- Phase 4: 照片是否已解锁（默认需要积分查看）
    uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Dating Spots Table (Phase 2 - 约会地点，类似 Pokestops)
CREATE TABLE dating_spots (
    spot_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL, -- 地点名称，如"星巴克（科技园店）"
    location GEOGRAPHY(POINT, 4326) NOT NULL, -- PostGIS 地理位置字段
    type VARCHAR(50) NOT NULL, -- 地点类型：cafe, park, restaurant, cinema, etc.
    address TEXT, -- 详细地址
    reward_points INT DEFAULT 50, -- 打卡奖励积分
    description TEXT, -- 地点描述
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Dating Tasks Table (Phase 2 - 约会邀请/任务)
CREATE TABLE dating_tasks (
    task_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    initiator_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE, -- 发起人
    receiver_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE, -- 接收人
    spot_id UUID NOT NULL REFERENCES dating_spots(spot_id) ON DELETE CASCADE, -- 约会地点
    status VARCHAR(20) DEFAULT 'pending', -- pending, accepted, completed, cancelled
    scheduled_time TIMESTAMPTZ, -- 预约时间
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ -- 完成时间
);

-- Recommendations Table (Storing AI match results)
-- users/{userId}/recommendations/{candidateId} equivalent
CREATE TABLE recommendations (
    recommendation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recommending_user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE, -- The user for whom recommendations are generated
    recommended_user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE, -- The user being recommended
    match_score INT NOT NULL, -- 0-100
    match_reason TEXT,
    icebreakers JSONB, -- Array of icebreaker questions stored as JSONB
    last_calculated TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (recommending_user_id, recommended_user_id) -- Ensure no duplicate recommendations
);

-- Chat Messages Table
CREATE TABLE chat_messages (
    message_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    status VARCHAR(20) DEFAULT 'sent' -- e.g., "sent", "delivered", "read"
);

-- Indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_nickname ON users(nickname);
CREATE INDEX idx_users_location_geohash ON users(location_geohash); -- For geo-queries

-- PostGIS GiST index for location-based queries (Phase 1)
CREATE INDEX idx_users_location ON users USING GIST (location);

CREATE INDEX idx_recommendations_recommending_user_id ON recommendations(recommending_user_id);
CREATE INDEX idx_recommendations_score ON recommendations(match_score DESC);
CREATE INDEX idx_chat_messages_sender_receiver ON chat_messages(sender_id, receiver_id, timestamp DESC);
CREATE INDEX idx_chat_messages_receiver_sender ON chat_messages(receiver_id, sender_id, timestamp DESC);

-- Dating spots indexes (Phase 2)
CREATE INDEX idx_dating_spots_location ON dating_spots USING GIST (location);
CREATE INDEX idx_dating_spots_type ON dating_spots(type);

-- Dating tasks indexes (Phase 2)
CREATE INDEX idx_dating_tasks_initiator ON dating_tasks(initiator_id);
CREATE INDEX idx_dating_tasks_receiver ON dating_tasks(receiver_id);
CREATE INDEX idx_dating_tasks_status ON dating_tasks(status);
CREATE INDEX idx_dating_tasks_spot ON dating_tasks(spot_id);

-- Trigger function to update 'updated_at' timestamp
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_timestamp_users
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER set_timestamp_dating_tasks
BEFORE UPDATE ON dating_tasks
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

-- You might need to install the pgcrypto extension for gen_random_uuid() if not already enabled
-- CREATE EXTENSION IF NOT EXISTS "pgcrypto";
-- However, gen_random_uuid() is a standard SQL function in PostgreSQL 13+
-- If using an older version, you might need to use uuid-ossp's uuid_generate_v4()
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp"; and use uuid_generate_v4() in DEFAULT

COMMENT ON COLUMN users.location_geohash IS 'Geohash for efficient proximity searches. Consider libraries like "ngeohash" in Node.js to generate this.';
COMMENT ON COLUMN users.tags IS 'Array of user interests, e.g., {"徒步", "科幻电影", "撸猫"}';
COMMENT ON COLUMN users.q_and_a IS 'Open-ended questions and answers in JSON format, e.g., {"ideal_weekend": "...", "about_pets": "..."}';
COMMENT ON TABLE recommendations IS 'Stores the AI-calculated match scores and reasons between users.';
