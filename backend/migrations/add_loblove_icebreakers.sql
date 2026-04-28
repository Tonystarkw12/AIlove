-- LobLove System Enhancement
-- Date: 2026-04-28
-- Adds: icebreaker_messages column to lobster_chats

ALTER TABLE lobster_chats
ADD COLUMN IF NOT EXISTS icebreaker_messages JSONB DEFAULT NULL;

COMMENT ON COLUMN lobster_chats.icebreaker_messages IS 'Personalized icebreaker messages generated from preference overlap (ISC-30)';
