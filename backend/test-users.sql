-- 测试数据创建脚本（简化版）
-- 为 AIlove 项目创建测试用户和约会地点

-- 插入测试用户（使用简单的密码哈希）
INSERT INTO users (nickname, email, password_hash, gender, birth_date, occupation, bio, avatar_url, location, location_latitude, location_longitude, tags, values_description, points, level, q_and_a) VALUES
(
    '张伟',
    'zhangwei@example.com',
    '$2a$10$ukM.fNv02toELJLSUSp9jOwFkTYcYc11ILn0huQKqRPgZXGKkzioi',
    '男',
    '1995-05-15',
    '软件工程师',
    '热爱编程，喜欢旅行和摄影',
    'https://example.com/avatar1.jpg',
    ST_SetSRID(ST_MakePoint(116.4074, 39.9042), 4326)::GEOGRAPHY,
    39.9042,
    116.4074,
    ARRAY['编程', '旅行', '摄影', '科幻电影', '徒步'],
    '我认为最重要的是真诚和共同成长。生活就像代码，需要不断优化。',
    150,
    2,
    '{"ideal_weekend": "写代码、看技术博客", "about_pets": "喜欢狗"}'::jsonb
),
(
    '李娜',
    'lina@example.com',
    '$2a$10$ukM.fNv02toELJLSUSp9jOwFkTYcYc11ILn0huQKqRPgZXGKkzioi',
    '女',
    '1998-08-22',
    'UI设计师',
    '喜欢艺术、咖啡和猫咪',
    'https://example.com/avatar2.jpg',
    ST_SetSRID(ST_MakePoint(116.3974, 39.9093), 4326)::GEOGRAPHY,
    39.9093,
    116.3974,
    ARRAY['艺术', '咖啡', '猫咪', '设计', '绘画', '音乐'],
    '希望找到一个能一起探索世界的人。生活需要仪式感。',
    280,
    3,
    '{"ideal_weekend": "逛画展、喝咖啡", "about_pets": "有两只猫"}'::jsonb
),
(
    '王强',
    'wangqiang@example.com',
    '$2a$10$ukM.fNv02toELJLSUSp9jOwFkTYcYc11ILn0huQKqRPgZXGKkzioi',
    '男',
    '1992-03-10',
    '产品经理',
    '喜欢运动、阅读和思考',
    'https://example.com/avatar3.jpg',
    ST_SetSRID(ST_MakePoint(116.4174, 39.9142), 4326)::GEOGRAPHY,
    39.9142,
    116.4174,
    ARRAY['运动', '阅读', '思考', '科技', '创业'],
    '人生就像一场马拉松，重要的不是速度，而是坚持。',
    50,
    1,
    '{"ideal_weekend": "跑步、看书", "about_pets": "不喜欢宠物"}'::jsonb
),
(
    '刘芳',
    'liufang@example.com',
    '$2a$10$ukM.fNv02toELJLSUSp9jOwFkTYcYc11ILn0huQKqRPgZXGKkzioi',
    '女',
    '1996-11-28',
    '教师',
    '喜欢文学、园艺和烹饪',
    'https://example.com/avatar4.jpg',
    ST_SetSRID(ST_MakePoint(116.3874, 39.8992), 4326)::GEOGRAPHY,
    39.8992,
    116.3874,
    ARRAY['文学', '园艺', '烹饪', '电影', '瑜伽'],
    '平淡的生活中藏着诗意。希望能找到懂我的人。',
    420,
    5,
    '{"ideal_weekend": "在家看书、做饭", "about_pets": "喜欢植物"}'::jsonb
),
(
    '陈明',
    'chenming@example.com',
    '$2a$10$ukM.fNv02toELJLSUSp9jOwFkTYcYc11ILn0huQKqRPgZXGKkzioi',
    '男',
    '1994-07-05',
    '医生',
    '喜欢音乐、旅行和摄影',
    'https://example.com/avatar5.jpg',
    ST_SetSRID(ST_MakePoint(116.4274, 39.9192), 4326)::GEOGRAPHY,
    39.9192,
    116.4274,
    ARRAY['音乐', '旅行', '摄影', '电影', '健身'],
    '用音乐治愈心灵，用镜头记录美好。',
    100,
    2,
    '{"ideal_weekend": "听音乐会、旅行", "about_pets": "没有特别的偏好"}'::jsonb
),
(
    '赵丽',
    'zhaoli@example.com',
    '$2a$10$ukM.fNv02toELJLSUSp9jOwFkTYcYc11ILn0huQKqRPgZXGKkzioi',
    '女',
    '1997-02-14',
    '市场专员',
    '喜欢购物、美食和聚会',
    'https://example.com/avatar6.jpg',
    ST_SetSRID(ST_MakePoint(116.4074, 39.9242), 4326)::GEOGRAPHY,
    39.9242,
    116.4074,
    ARRAY['购物', '美食', '聚会', '时尚', '旅游'],
    '生活需要激情和精彩！',
    80,
    2,
    '{"ideal_weekend": "逛街、和朋友聚会", "about_pets": "害怕动物"}'::jsonb
)
ON CONFLICT (email) DO NOTHING;

-- 查询插入的用户
SELECT
    user_id,
    nickname,
    gender,
    occupation,
    points,
    level
FROM users
ORDER BY created_at;
