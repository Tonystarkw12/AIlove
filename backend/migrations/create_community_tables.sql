-- 社区功能数据库表创建脚本

-- 社区照片表
CREATE TABLE IF NOT EXISTS community_photos (
    photo_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submitter_user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    partner_user_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
    photo_url TEXT NOT NULL,
    anniversary_date DATE NOT NULL,
    couple_names VARCHAR(100),
    message TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    like_count INT DEFAULT 0,
    reject_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TIMESTAMPTZ
);

-- 照片点赞表
CREATE TABLE IF NOT EXISTS photo_likes (
    like_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    photo_id UUID NOT NULL REFERENCES community_photos(photo_id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(photo_id, user_id)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_community_photos_submitter ON community_photos(submitter_user_id);
CREATE INDEX IF NOT EXISTS idx_community_photos_status ON community_photos(status);
CREATE INDEX IF NOT EXISTS idx_community_photos_created ON community_photos(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_photo_likes_photo ON photo_likes(photo_id);
CREATE INDEX IF NOT EXISTS idx_photo_likes_user ON photo_likes(user_id);

-- 添加注释
COMMENT ON TABLE community_photos IS '社区情侣照片墙';
COMMENT ON COLUMN community_photos.status IS '审核状态: pending=待审核, approved=已通过, rejected=已拒绝';
COMMENT ON COLUMN community_photos.like_count IS '点赞数';
COMMENT ON TABLE photo_likes IS '照片点赞记录';
