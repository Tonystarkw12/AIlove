// const pool = require('../db'); // We will re-require it inside the function for testing
const axios = require('axios');
const geolib = require('geolib'); // For geo-distance calculations if needed beyond geohash

const GEMINI_API_BASE_URL = process.env.GEMINI_API_BASE_URL;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL;

/**
 * Updates recommendations for a given user.
 * This function will be triggered on new user registration or profile update.
 * @param {string} userId - The ID of the user for whom to update recommendations.
 */
async function updateRecommendationsForUser(userId) {
    const pool = require('../db'); // Re-require pool here for testing
    console.log(`Starting recommendation update for user: ${userId}`);
    let client;

    try {
        if (!pool || typeof pool.connect !== 'function') {
            console.error('CRITICAL: pool is not available or not a Pool object in recommendationService!', pool);
            throw new Error('Database pool is not configured correctly in recommendationService.');
        }
        client = await pool.connect();
        await client.query('BEGIN');

        // 1. Get the current user's profile and preferences
        const userResult = await client.query(
            `SELECT user_id, nickname, bio, tags, values_description, q_and_a,
                    location_latitude, location_longitude, location_geohash,
                    preferred_age_min, preferred_age_max, preferred_gender, gender
             FROM users WHERE user_id = $1`,
            [userId]
        );

        if (userResult.rows.length === 0) {
            console.error(`User ${userId} not found for recommendation update.`);
            await client.query('ROLLBACK');
            return;
        }
        const currentUser = userResult.rows[0];

        // --- 2. Coarse Filtering (粗筛) ---
        let candidatesQuery = "SELECT user_id, nickname, bio, tags, values_description, q_and_a, gender, birth_date, location_latitude, location_longitude FROM users WHERE user_id != $1";
        const queryParams = [userId];
        let paramIndex = 2;

        // Gender preference filter (user's gender preference for others)
        if (currentUser.preferred_gender) {
            candidatesQuery += ` AND gender = $${paramIndex++}`;
            queryParams.push(currentUser.preferred_gender);
        }
        // Filter by users who would prefer current user's gender
        if (currentUser.gender) {
             candidatesQuery += ` AND (preferred_gender IS NULL OR preferred_gender = $${paramIndex++})`;
             queryParams.push(currentUser.gender);
        }


        // Age preference filter (user's preferred age range for others)
        if (currentUser.preferred_age_min && currentUser.preferred_age_max) {
            // This requires calculating age from birth_date
            candidatesQuery += ` AND EXTRACT(YEAR FROM AGE(birth_date)) BETWEEN $${paramIndex++} AND $${paramIndex++}`;
            queryParams.push(currentUser.preferred_age_min, currentUser.preferred_age_max);
        }
        // Filter by users whose age preference includes current user's age
        if (currentUser.birth_date) {
            const currentUserAge = new Date().getFullYear() - new Date(currentUser.birth_date).getFullYear();
             candidatesQuery += ` AND (preferred_age_min IS NULL OR preferred_age_min <= $${paramIndex++})`;
             queryParams.push(currentUserAge);
             candidatesQuery += ` AND (preferred_age_max IS NULL OR preferred_age_max >= $${paramIndex++})`;
             queryParams.push(currentUserAge);
        }


        // Geo-location filter (e.g., within 50km)
        // This is a simplified example. Geohash prefix matching is more efficient for DB.
        // For more accuracy with distance, fetch more users by geohash prefix then filter by precise distance.
        const MAX_DISTANCE_KM = 50; // 50 km
        if (currentUser.location_latitude && currentUser.location_longitude) {
            // This part is illustrative. A real geo-query would be more complex or use PostGIS.
            // For now, we'll fetch all and filter in application layer if not too many users.
            // A better approach is to query by geohash prefixes of certain length.
            // Example: WHERE location_geohash LIKE 'prefix%'
            // For simplicity in this step, we might fetch more and then filter, or rely on a simpler geohash match.
        }

        // Add a limit to the number of candidates from coarse filtering to avoid overwhelming Gemini
        candidatesQuery += " LIMIT 200"; // Limit to 200 candidates for fine-tuning

        const candidatesResult = await client.query(candidatesQuery, queryParams);
        let candidates = candidatesResult.rows;
        console.log(`Coarse filtering found ${candidates.length} potential candidates for user ${userId}.`);

        // Further filter by distance if location is available (application-level filtering after DB query)
        if (currentUser.location_latitude && currentUser.location_longitude && candidates.length > 0) {
            candidates = candidates.filter(candidate => {
                if (candidate.location_latitude && candidate.location_longitude) {
                    const distance = geolib.getDistance(
                        { latitude: currentUser.location_latitude, longitude: currentUser.location_longitude },
                        { latitude: candidate.location_latitude, longitude: candidate.location_longitude }
                    );
                    return distance <= MAX_DISTANCE_KM * 1000; // geolib.getDistance returns meters
                }
                return false; // If candidate has no location, exclude
            });
            console.log(`After distance filtering (<= ${MAX_DISTANCE_KM}km), ${candidates.length} candidates remain.`);
        }
        
        // Interest tags filter (at least one common tag) - Optional, can be done here or in DB
        if (currentUser.tags && currentUser.tags.length > 0 && candidates.length > 0) {
            candidates = candidates.filter(candidate => {
                if (candidate.tags && candidate.tags.length > 0) {
                    return currentUser.tags.some(tag => candidate.tags.includes(tag));
                }
                return false;
            });
            console.log(`After interest tag filtering, ${candidates.length} candidates remain.`);
        }


        // --- 3. Fine-tuning with AI (精筛) ---
        if (candidates.length === 0) {
            console.log(`No candidates left for user ${userId} after coarse filtering. Skipping AI fine-tuning.`);
            await client.query('DELETE FROM recommendations WHERE recommending_user_id = $1', [userId]); // Clear old recommendations
            await client.query('COMMIT');
            return;
        }
        
        const newRecommendations = [];

        for (const candidate of candidates) {
            if (candidate.user_id === userId) continue; // Should be filtered by query, but double check

            const systemPrompt = "你是一位顶尖的婚恋匹配专家。请基于两位用户的资料进行深度匹配分析，并以JSON格式返回结果。结果必须包含字段：'matchScore' (0-100整数), 'matchReason' (50字内字符串), 'icebreakers' (3个字符串数组的破冰话题)。";
            const userPrompt = constructOpenAIUserPrompt(currentUser, candidate);
            // console.log(`User prompt for candidate ${candidate.user_id}:\n${userPrompt}`); // For debugging

            try {
                const openAIResponse = await axios.post(
                    `${GEMINI_API_BASE_URL}/v1/chat/completions`, // Corrected URL
                    {
                        model: GEMINI_MODEL, // Your specified model name
                        messages: [
                            { role: "system", content: systemPrompt },
                            { role: "user", content: userPrompt }
                        ],
                        response_format: { type: "json_object" } // Request JSON output
                    },
                    {
                        headers: {
                            'Authorization': `Bearer ${GEMINI_API_KEY}`,
                            'Content-Type': 'application/json'
                        }
                    }
                );
                
                // console.log("Raw OpenAI Response:", JSON.stringify(openAIResponse.data, null, 2));

                if (openAIResponse.data && openAIResponse.data.choices && openAIResponse.data.choices[0].message && openAIResponse.data.choices[0].message.content) {
                    const rawJson = openAIResponse.data.choices[0].message.content;
                    // console.log("Raw JSON from OpenAI:", rawJson);
                    
                    let matchData;
                    try {
                        matchData = JSON.parse(rawJson);
                    } catch (parseError) {
                        console.error(`Error parsing JSON from AI for candidate ${candidate.user_id}: ${parseError.message}. Raw text: ${rawJson}`);
                        continue; // Skip this candidate
                    }

                    if (matchData && typeof matchData.matchScore === 'number' && matchData.matchReason && Array.isArray(matchData.icebreakers)) {
                        newRecommendations.push({
                            recommending_user_id: userId,
                            recommended_user_id: candidate.user_id,
                            match_score: parseInt(matchData.matchScore, 10),
                            match_reason: matchData.matchReason,
                            icebreakers: matchData.icebreakers,
                            last_calculated: new Date()
                        });
                        console.log(`Successfully processed AI match for candidate ${candidate.user_id}. Score: ${matchData.matchScore}`);
                    } else {
                        console.warn(`AI response for candidate ${candidate.user_id} did not have the expected structure. Data:`, matchData);
                    }
                } else {
                     console.warn(`No valid content in AI response for candidate ${candidate.user_id}. Response:`, JSON.stringify(openAIResponse.data, null, 2));
                }
            } catch (aiError) {
                if (aiError.response) {
                    console.error(`Error calling AI API for candidate ${candidate.user_id}: ${aiError.response.status}`, aiError.response.data);
                } else {
                    console.error(`Error calling AI API for candidate ${candidate.user_id}: ${aiError.message}`);
                }
                // Continue to next candidate even if one AI call fails
            }
            // Optional: Add a small delay to avoid hitting API rate limits if any
            // await new Promise(resolve => setTimeout(resolve, 200)); 
        }

        // --- 4. Store Recommendation Results ---
        if (newRecommendations.length > 0) {
            // Clear old recommendations for this user before inserting new ones
            await client.query('DELETE FROM recommendations WHERE recommending_user_id = $1', [userId]);

            const insertPromises = newRecommendations.map(rec => {
                const query = `
                    INSERT INTO recommendations (recommending_user_id, recommended_user_id, match_score, match_reason, icebreakers, last_calculated)
                    VALUES ($1, $2, $3, $4, $5, $6)
                    ON CONFLICT (recommending_user_id, recommended_user_id) 
                    DO UPDATE SET 
                        match_score = EXCLUDED.match_score,
                        match_reason = EXCLUDED.match_reason,
                        icebreakers = EXCLUDED.icebreakers,
                        last_calculated = EXCLUDED.last_calculated;
                `;
                return client.query(query, [
                    rec.recommending_user_id, rec.recommended_user_id, rec.match_score,
                    rec.match_reason, rec.icebreakers, rec.last_calculated
                ]);
            });
            await Promise.all(insertPromises);
            console.log(`Stored ${newRecommendations.length} new recommendations for user ${userId}.`);
        } else {
            console.log(`No new recommendations generated by AI for user ${userId}. Clearing old ones.`);
            await client.query('DELETE FROM recommendations WHERE recommending_user_id = $1', [userId]);
        }

        await client.query('COMMIT');
        console.log(`Recommendation update completed successfully for user: ${userId}`);

    } catch (error) {
        if (client) {
            await client.query('ROLLBACK');
        }
        console.error(`Error in updateRecommendationsForUser (${userId}):`, error);
        throw error; // Re-throw to be caught by caller if necessary
    } finally {
        if (client) {
            client.release();
        }
    }
}

/**
 * Constructs the prompt for Gemini API.
 * @param {object} currentUser - The profile of the user requesting recommendations.
 * @param {object} candidateUser - The profile of the candidate user.
 * @returns {string} The prompt string.
 */
function constructOpenAIUserPrompt(currentUser, candidateUser) {
    // Helper to safely access and format Q&A
    const getQA = (q_and_a, key, defaultVal = "未提供") => {
        if (q_and_a && typeof q_and_a === 'object' && q_and_a[key]) {
            return q_and_a[key];
        }
        // If q_and_a is a string (from older DB entries perhaps), try to parse
        if (q_and_a && typeof q_and_a === 'string') {
            try {
                const parsed = JSON.parse(q_and_a);
                return parsed[key] || defaultVal;
            } catch {
                return defaultVal; // Not valid JSON
            }
        }
        return defaultVal;
    };
    
    const currentUserTags = Array.isArray(currentUser.tags) ? currentUser.tags.join(', ') : "未提供";
    const candidateUserTags = Array.isArray(candidateUser.tags) ? candidateUser.tags.join(', ') : "未提供";

    return `你是一位顶尖的婚恋匹配专家，请基于以下两位用户的多维度资料，进行深度匹配分析。

# 用户A (我 - ${currentUser.nickname || '用户A'})
- 简介: ${currentUser.bio || "未提供"}
- 兴趣标签: ${currentUserTags}
- 价值观: ${currentUser.values_description || "未提供"}
- 理想的周末: ${getQA(currentUser.q_and_a, 'ideal_weekend')}
- 关于宠物: ${getQA(currentUser.q_and_a, 'about_pets')}

# 用户B (候选人 - ${candidateUser.nickname || '用户B'})
- 简介: ${candidateUser.bio || "未提供"}
- 兴趣标签: ${candidateUserTags}
- 价值观: ${candidateUser.values_description || "未提供"}
- 理想的周末: ${getQA(candidateUser.q_and_a, 'ideal_weekend')}
- 关于宠物: ${getQA(candidateUser.q_and_a, 'about_pets')}

请严格按照之前系统提示中描述的JSON格式返回你的分析。`;
}

module.exports = {
    updateRecommendationsForUser,
    // Potentially export constructOpenAIUserPrompt if needed for testing
};
