-- 测试数据创建脚本
-- 为 AIlove 项目创建测试用户和约会地点

-- 插入测试用户
INSERT INTO users (nickname, email, password_hash, gender, birth_date, occupation, bio, avatar_url, location, location_latitude, location_longitude, tags, values_description, points, level) VALUES
(
    '张伟',
    'zhangwei@example.com',
    '$2a$10$ukM.fNv02toELJLSUSp9jOwFkTYcYc11ILn0huQKqRPgZXGKkzioi',
    '男',
    '1995-05-15',
    '软件工程师',
    '热爱编程，喜欢旅行和摄影',
    'https://example.com/avatar1.jpg',
    ST_SetSRID(ST_MakePoint(116.4074, 39.9042), 4326)::GEOGRAPHY, -- 北京天安门
    39.9042,
    116.4074,
    ARRAY['编程', '旅行', '摄影', '科幻电影', '徒步'],
    '我认为最重要的是真诚和共同成长。生活就像代码，需要不断优化。',
    150,
    2
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
    ST_SetSRID(ST_MakePoint(116.3974, 39.9093), 4326)::GEOGRAPHY, -- 北京西单
    39.9093,
    116.3974,
    ARRAY['艺术', '咖啡', '猫咪', '设计', '绘画', '音乐'],
    '希望找到一个能一起探索世界的人。生活需要仪式感。',
    280,
    3
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
    ST_SetSRID(ST_MakePoint(116.4174, 39.9142), 4326)::GEOGRAPHY, -- 北京王府井
    39.9142,
    116.4174,
    ARRAY['运动', '阅读', '思考', '科技', '创业'],
    '人生就像一场马拉松，重要的不是速度，而是坚持。',
    50,
    1
),
(
    '刘芳',
    'liufang@example.com',
    $2a$10$ukM.fNv02toELJLSUSp9jOwFkTYcYc11ILn0huQKqRPgZXGKkzioi,
    '女',
    '1996-11-28',
    '教师',
    '喜欢文学、园艺和烹饪',
    'https://example.com/avatar4.jpg',
    ST_SetSRID(ST_MakePoint(116.3874, 39.8992), 4326)::GEOGRAPHY, -- 北京西站
    39.8992,
    116.3874,
    ARRAY['文学', '园艺', '烹饪', '电影', '瑜伽'],
    '平淡的生活中藏着诗意。希望能找到懂我的人。',
    420,
    5
),
(
    '陈明',
    'chenming@example.com',
    $2a$10$ukM.fNv02toELJLSUSp9jOwFkTYcYc11ILn0huQKqRPgZXGKkzioi,
    '男',
    '1994-07-05',
    '医生',
    '喜欢音乐、旅行和摄影',
    'https://example.com/avatar5.jpg',
    ST_SetSRID(ST_MakePoint(116.4274, 39.9192), 4326)::GEOGRAPHY, -- 北京国贸
    39.9192,
    116.4274,
    ARRAY['音乐', '旅行', '摄影', '电影', '健身'],
    '用音乐治愈心灵，用镜头记录美好。',
    100,
    2
),
(
    '赵丽',
    'zhaoli@example.com',
    $2a$10$ukM.fNv02toELJLSUSp9jOwFkTYcYc11ILn0huQKqRPgZXGKkzioi,
    '女',
    '1997-02-14',
    '市场专员',
    '喜欢购物、美食和聚会',
    'https://example.com/avatar6.jpg',
    ST_SetSRID(ST_MakePoint(116.4074, 39.9242), 4326)::GEOGRAPHY, -- 北京南锣鼓巷
    39.9242,
    116.4074,
    ARRAY['购物', '美食', '聚会', '时尚', '旅游'],
    '生活需要激情和精彩！',
    80,
    2
)
ON CONFLICT (email) DO NOTHING;

-- 插入约会地点
INSERT INTO dating_spots (name, location, type, address, reward_points, description) VALUES
(
    '星巴克（北京国贸店）',
    ST_SetSRID(ST_MakePoint(116.4274, 39.9192), 4326)::GEOGRAPHY,
    'cafe',
    '北京市朝阳区建国门外大街1号国贸商城',
    50,
    '环境优雅，适合初次约会'
),
(
    '三里屯太古里',
    ST_SetSRID(ST_MakePoint(116.4554, 39.9389), 4326)::GEOGRAPHY,
    'mall',
    '北京市朝阳区三里屯路11号',
    30,
    '购物娱乐一体化，潮流聚集地'
),
(
    '朝阳公园',
    ST_SetSRID(ST_MakePoint(116.4774, 39.9442), 4326)::GEOGRAPHY,
    'park',
    '北京市朝阳区朝阳公园南路1号',
    100,
    '自然风光，适合散步聊天'
),
(
    '故宫博物院',
    ST_SetSRID(ST_MakePoint(116.3972, 39.9183), 4326)::GEOGRAPHY,
    'museum',
    '北京市东城区景山前街4号',
    200,
    '历史文化深厚，适合文艺青年'
),
(
    '王府井小吃街',
    ST_SetSRID(ST_MakePoint(116.4174, 39.9142), 4326)::GEOGRAPHY,
    'restaurant',
    '北京市东城区王府井大街',
    50,
    '美食天堂，边逛边吃'
),
(
    '北京海洋馆',
    ST_SetSRID(ST_MakePoint(116.2283, 39.9489), 4326)::GEOGRAPHY,
    'cinema',
    '北京市海淀区高梁桥斜街乙18号',
    150,
    '浪漫的海洋世界之旅'
),
(
    '西单图书大厦',
    ST_SetSRID(ST_MakePoint(116.3774, 39.9142), 4326)::GEOGRAPHY,
    'bookstore',
    '北京市西城区西单北大街17号',
    60,
    '安静的文化场所，适合知性男女'
),
(
    '工体酒吧街',
    ST_SetSRID(ST_MakePoint(116.4474, 39.9342), 4326)::GEOGRAPHY,
    'bar',
    '北京市朝阳区工人体育场北路',
    40,
    '夜生活丰富，适合放松聚会'
)
ON CONFLICT DO NOTHING;

-- 显示插入的用户
SELECT
    nickname,
    gender,
    occupation,
    points,
    level,
    ROUND(CAST(ST_Y(location::geometry) AS numeric), 4) as latitude,
    ROUND(CAST(ST_X(location::geometry) AS numeric), 4) as longitude
FROM users
ORDER BY created_at;

-- 显示插入的约会地点
SELECT
    name,
    type,
    address,
    reward_points,
    ROUND(CAST(ST_Y(location::geometry) AS numeric), 4) as latitude,
    ROUND(CAST(ST_X(location::geometry) AS numeric), 4) as longitude
FROM dating_spots
ORDER BY created_at;
