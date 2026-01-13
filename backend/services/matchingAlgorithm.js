const pool = require('../db');
const OpenAI = require('openai');
const { getCachedMatchScore, cacheMatchScore } = require('./cacheService');

// 初始化 OpenAI 客户端（如果配置了 API Key）
let openaiClient = null;

if (process.env.OPENAI_API_KEY) {
    openaiClient = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
        baseURL: process.env.OPENAI_BASE_URL || 'https://open.bigmodel.cn/api/coding/paas/v4'
    });
}

/**
 * 计算两个用户的匹配分数（0-100）
 * 使用 LLM 进行智能分析（如果配置了 OpenAI API），否则使用传统算法
 * @param {UUID} userAId - 用户 A 的 ID
 * @param {UUID} userBId - 用户 B 的 ID
 * @returns {Promise<number>} 匹配分数
 */
async function calculateMatchScore(userAId, userBId) {
    try {
        // 1. 尝试从缓存获取匹配分数
        const cachedScore = await getCachedMatchScore(userAId, userBId);
        if (cachedScore !== null) {
            return cachedScore.score; // 返回缓存的分数
        }

        // 2. 缓存未命中，计算匹配分数
        // 获取两个用户的详细信息
        const usersQuery = `
            SELECT
                user_id,
                gender,
                birth_date,
                location,
                location_latitude,
                location_longitude,
                tags,
                values_description,
                q_and_a,
                preferred_age_min,
                preferred_age_max,
                preferred_gender
            FROM users
            WHERE user_id IN ($1, $2)
        `;

        const result = await pool.query(usersQuery, [userAId, userBId]);

        if (result.rows.length < 2) {
            return 0; // 用户不存在，匹配分数为 0
        }

        const userA = result.rows.find(u => u.user_id === userAId);
        const userB = result.rows.find(u => u.user_id === userBId);

        if (!userA || !userB) {
            return 0;
        }

        // 如果配置了 OpenAI API，使用 LLM 进行智能匹配分析
        if (openaiClient && userA.values_description && userB.values_description) {
            try {
                const llmScore = await calculateLLMMatchScore(userA, userB);

                // 计算地理距离分数（LLM 不擅长判断距离）
                const distanceScore = await calculateDistanceScore(userA, userB);

                // 加权：LLM 分析 (60%) + 地理距离 (40%)
                const totalScore = Math.round(llmScore * 0.6 + distanceScore * 0.4);
                const finalScore = Math.min(100, Math.max(0, totalScore));

                // 3. 缓存计算结果
                await cacheMatchScore(userAId, userBId, {
                    score: finalScore,
                    algorithm: 'AI (智谱AI GLM-4.7)',
                    calculatedAt: new Date().toISOString()
                });

                return finalScore;

            } catch (llmError) {
                console.error('LLM match calculation failed, falling back to traditional algorithm:', llmError);
                // LLM 失败时回退到传统算法
            }
        }

        // 传统算法：计算各项分数
        const distanceScore = await calculateDistanceScore(userA, userB);
        const interestScore = calculateInterestScore(userA, userB);
        const personalityScore = calculatePersonalityScore(userA, userB);

        // 加权总分
        // 地理距离 (30%) + 兴趣重叠 (40%) + 性格匹配 (30%)
        const totalScore = Math.round(
            distanceScore * 0.3 +
            interestScore * 0.4 +
            personalityScore * 0.3
        );
        const finalScore = Math.min(100, Math.max(0, totalScore)); // 确保在 0-100 范围内

        // 3. 缓存计算结果
        await cacheMatchScore(userAId, userBId, {
            score: finalScore,
            algorithm: 'Traditional (Jaccard + Cosine)',
            calculatedAt: new Date().toISOString()
        });

        return finalScore;

    } catch (error) {
        console.error('Calculate match score error:', error);
        return 0;
    }
}

/**
 * 使用 LLM 计算两个用户的匹配分数
 * @param {Object} userA - 用户 A
 * @param {Object} userB - 用户 B
 * @returns {Promise<number>} LLM 评估的匹配分数 (0-100)
 */
async function calculateLLMMatchScore(userA, userB) {
    if (!openaiClient) {
        throw new Error('OpenAI client not configured');
    }

    // 构建 LLM Prompt
    const prompt = buildMatchAnalysisPrompt(userA, userB);

    try {
        const response = await openaiClient.chat.completions.create({
            model: process.env.OPENAI_MODEL || 'glm-4.7',
            messages: [
                {
                    role: 'system',
                    content: '你是一位专业的情感匹配专家。你的任务是基于两个用户的资料，客观评估他们的契合度，并给出 0-100 分的匹配分数。请只返回 JSON 格式的结果。'
                },
                {
                    role: 'user',
                    content: prompt
                }
            ],
            temperature: 0.3, // 降低随机性，确保稳定性
            response_format: { type: "json_object" }
        });

        const content = response.choices[0].message.content;
        const result = JSON.parse(content);

        // 验证返回的分数是否有效
        if (typeof result.score === 'number' && result.score >= 0 && result.score <= 100) {
            return result.score;
        } else {
            console.warn('LLM returned invalid score:', result);
            return 50; // 默认中等分数
        }

    } catch (error) {
        console.error('OpenAI API error:', error);
        throw error;
    }
}

/**
 * 构建匹配分析的 Prompt
 * @param {Object} userA - 用户 A
 * @param {Object} userB - 用户 B
 * @returns {string} Prompt 文本
 */
function buildMatchAnalysisPrompt(userA, userB) {
    const tagsA = (userA.tags || []).join('、');
    const tagsB = (userB.tags || []).join('、');

    const qaaA = userA.q_and_a || {};
    const qaaB = userB.q_and_a || {};

    const qaTextA = Object.entries(qaaA)
        .map(([key, value]) => `${key}: ${value}`)
        .join('\n');

    const qaTextB = Object.entries(qaaB)
        .map(([key, value]) => `${key}: ${value}`)
        .join('\n');

    return `
请分析以下两位用户的契合度：

【用户 A】
价值观描述：${userA.values_description || '未填写'}
兴趣标签：${tagsA || '无'}
问答：
${qaTextA || '无'}

【用户 B】
价值观描述：${userB.values_description || '未填写'}
兴趣标签：${tagsB || '无'}
问答：
${qaTextB || '无'}

请从以下几个维度进行评估：
1. 价值观契合度（30%）：两人的价值观是否一致或互补？
2. 兴趣重叠度（30%）：共同的兴趣爱好有多少？
3. 性格匹配度（20%）：从问答中推测的性格是否合适？
4. 潜在话题（20%）：是否有足够的共同话题？

请返回 JSON 格式：
{
  "score": 0-100的匹配分数,
  "reason": "简短的匹配原因说明（不超过50字）",
  "strengths": ["优势1", "优势2"],
  "suggestions": ["建议1", "建议2"]
}
`;
}

/**
 * 计算地理距离分数 (0-100)
 * 距离越近分数越高
 * @param {Object} userA - 用户 A
 * @param {Object} userB - 用户 B
 * @returns {Promise<number>} 距离分数
 */
async function calculateDistanceScore(userA, userB) {
    // 如果任一用户没有位置信息，返回 0 分
    if (!userA.location || !userB.location) {
        return 0;
    }

    try {
        // 使用 PostGIS 计算距离（米）
        const distanceQuery = `
            SELECT ST_Distance(
                ST_SetSRID(ST_MakePoint($1, $2), 4326)::GEOGRAPHY,
                ST_SetSRID(ST_MakePoint($3, $4), 4326)::GEOGRAPHY
            ) as distance_meters
        `;

        const result = await pool.query(distanceQuery, [
            userA.location_longitude,
            userA.location_latitude,
            userB.location_longitude,
            userB.location_latitude
        ]);

        const distance = parseFloat(result.rows[0].distance_meters);

        // 距离评分规则（可根据实际需求调整）：
        // 0-500m: 100分
        // 500m-1km: 90分
        // 1km-3km: 70分
        // 3km-5km: 50分
        // 5km-10km: 30分
        // >10km: 10分

        if (distance < 500) return 100;
        if (distance < 1000) return 90;
        if (distance < 3000) return 70;
        if (distance < 5000) return 50;
        if (distance < 10000) return 30;
        return 10;

    } catch (error) {
        console.error('Calculate distance score error:', error);
        return 0;
    }
}

/**
 * 计算兴趣重叠分数 (0-100)
 * 基于标签数组的交集大小
 * @param {Object} userA - 用户 A
 * @param {Object} userB - 用户 B
 * @returns {number} 兴趣分数
 */
function calculateInterestScore(userA, userB) {
    const tagsA = userA.tags || [];
    const tagsB = userB.tags || [];

    // 如果任一用户没有标签，返回 0 分
    if (tagsA.length === 0 || tagsB.length === 0) {
        return 0;
    }

    // 计算交集
    const intersection = tagsA.filter(tag => tagsB.includes(tag));
    const union = [...new Set([...tagsA, ...tagsB])];

    // 使用 Jaccard 相似度：交集 / 并集
    const jaccardSimilarity = intersection.length / union.length;

    // 转换为 0-100 分数
    return Math.round(jaccardSimilarity * 100);
}

/**
 * 计算性格匹配分数 (0-100)
 * 基于价值观描述的文本相似度
 * @param {Object} userA - 用户 A
 * @param {Object} userB - 用户 B
 * @returns {number} 性格分数
 */
function calculatePersonalityScore(userA, userB) {
    const valuesA = userA.values_description || '';
    const valuesB = userB.values_description || '';

    // 如果任一用户没有价值观描述，返回 50 分（中等）
    if (!valuesA || !valuesB) {
        return 50;
    }

    // 简单的文本相似度计算（余弦相似度的简化版）
    // 在生产环境中，可以使用更复杂的算法或调用 Embedding API
    const similarity = calculateTextSimilarity(valuesA, valuesB);

    return Math.round(similarity * 100);
}

/**
 * 计算两个文本的相似度 (0-1)
 * 使用简单的词袋模型 + 余弦相似度
 * @param {string} textA - 文本 A
 * @param {string} textB - 文本 B
 * @returns {number} 相似度
 */
function calculateTextSimilarity(textA, textB) {
    // 简单的中文分词（按字符分割）
    const wordsA = textA.toLowerCase().split('').filter(w => w.trim() !== '');
    const wordsB = textB.toLowerCase().split('').filter(w => w.trim() !== '');

    // 统计词频
    const freqA = getWordFrequency(wordsA);
    const freqB = getWordFrequency(wordsB);

    // 计算余弦相似度
    return cosineSimilarity(freqA, freqB);
}

/**
 * 统计词频
 * @param {Array<string>} words - 词数组
 * @returns {Object} 词频对象
 */
function getWordFrequency(words) {
    const freq = {};
    words.forEach(word => {
        freq[word] = (freq[word] || 0) + 1;
    });
    return freq;
}

/**
 * 计算余弦相似度
 * @param {Object} vecA - 向量 A
 * @param {Object} vecB - 向量 B
 * @returns {number} 余弦相似度
 */
function cosineSimilarity(vecA, vecB) {
    // 获取所有唯一词
    const allWords = new Set([...Object.keys(vecA), ...Object.keys(vecB)]);

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    allWords.forEach(word => {
        const a = vecA[word] || 0;
        const b = vecB[word] || 0;

        dotProduct += a * b;
        normA += a * a;
        normB += b * b;
    });

    if (normA === 0 || normB === 0) {
        return 0;
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * 生成匹配原因说明
 * @param {number} matchScore - 匹配分数
 * @param {Object} userA - 用户 A
 * @param {Object} userB - 用户 B
 * @returns {string} 匹配原因
 */
async function generateMatchReason(matchScore, userA, userB) {
    const reasons = [];

    if (matchScore >= 90) {
        reasons.push('你们是灵魂伴侣！');
    } else if (matchScore >= 70) {
        reasons.push('你们非常契合。');
    } else if (matchScore >= 50) {
        reasons.push('你们有不少共同点。');
    } else {
        reasons.push('试试看，也许会有惊喜。');
    }

    // 具体分析
    const tagsA = userA.tags || [];
    const tagsB = userB.tags || [];
    const commonTags = tagsA.filter(tag => tagsB.includes(tag));

    if (commonTags.length > 0) {
        reasons.push(`共同兴趣：${commonTags.slice(0, 3).join('、')}`);
    }

    // 距离分析
    if (userA.location && userB.location) {
        const distanceQuery = `
            SELECT ST_Distance(
                ST_SetSRID(ST_MakePoint($1, $2), 4326)::GEOGRAPHY,
                ST_SetSRID(ST_MakePoint($3, $4), 4326)::GEOGRAPHY
            ) as distance_meters
        `;

        const result = await pool.query(distanceQuery, [
            userA.location_longitude,
            userA.location_latitude,
            userB.location_longitude,
            userB.location_latitude
        ]);

        const distance = parseFloat(result.rows[0].distance_meters);

        if (distance < 1000) {
            reasons.push('就在附近');
        }
    }

    return reasons.join(' | ');
}

/**
 * 生成破冰话题
 * @param {Object} userA - 用户 A
 * @param {Object} userB - 用户 B
 * @returns {Array<string>} 破冰话题数组
 */
function generateIcebreakers(userA, userB) {
    const icebreakers = [];

    const tagsA = userA.tags || [];
    const tagsB = userB.tags || [];
    const commonTags = tagsA.filter(tag => tagsB.includes(tag));

    if (commonTags.length > 0) {
        icebreakers.push(`听说你也喜欢${commonTags[0]}？`);
        icebreakers.push(`一起${commonTags[0]}怎么样？`);
    }

    // 从 Q&A 中生成话题
    const qaa = userA.q_and_a || {};
    const qab = userB.q_and_a || {};

    if (qaa.ideal_weekend && qab.ideal_weekend) {
        icebreakers.push('你理想中的周末是怎么度过的？');
    }

    // 默认话题
    if (icebreakers.length === 0) {
        icebreakers.push('你好！很高兴认识你');
        icebreakers.push('最近在看什么有趣的东西吗？');
    }

    return icebreakers.slice(0, 3); // 最多返回 3 个
}

module.exports = {
    calculateMatchScore,
    calculateDistanceScore,
    calculateInterestScore,
    calculatePersonalityScore,
    generateMatchReason,
    generateIcebreakers
};
