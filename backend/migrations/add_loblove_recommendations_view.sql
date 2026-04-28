-- LobLove Recommendations View (ISC-61)
-- Date: 2026-04-28
-- Creates a view that adapts lobster_chats for lobster-perspective recommendations

CREATE OR REPLACE VIEW lobster_recommendations AS
SELECT
    lc.chat_id AS recommendation_id,
    la.owner_id AS recommending_owner_id,
    lb.owner_id AS recommended_owner_id,
    la.lobster_id AS recommending_lobster_id,
    lb.lobster_id AS recommended_lobster_id,
    lc.compatibility_score AS match_score,
    lc.compatibility_analysis AS match_reason,
    lc.icebreaker_messages AS icebreakers,
    lc.recommended_at AS last_calculated,
    ua.nickname AS recommended_owner_name,
    ua.avatar_url AS recommended_owner_avatar,
    lb.name AS recommended_lobster_name,
    lb.conversation_style AS recommended_lobster_style
FROM lobster_chats lc
JOIN lobsters la ON lc.lobster_a_id = la.lobster_id
JOIN lobsters lb ON lc.lobster_b_id = lb.lobster_id
JOIN users ua ON lb.owner_id = ua.user_id
WHERE lc.outcome = 'recommended'
AND lc.session_status = 'completed';

COMMENT ON VIEW lobster_recommendations IS 'Lobster-perspective recommendations derived from completed, high-scoring lobster chats (ISC-61)';
