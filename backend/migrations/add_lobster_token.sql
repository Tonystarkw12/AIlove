-- Migration: Add lobster_token for WebSocket authentication
-- Date: 2026-06-18
-- Purpose: Enable OpenClaw agents to connect via WebSocket using secure tokens

-- Add lobster_token column to lobsters table
DO $$ BEGIN
  ALTER TABLE lobsters ADD COLUMN IF NOT EXISTS lobster_token VARCHAR(64) UNIQUE;
EXCEPTION WHEN insufficient_privilege THEN
  RAISE NOTICE 'Skipping lobsters table alteration: insufficient privileges.';
END $$;

-- Index for token lookups (WebSocket authentication)
CREATE INDEX IF NOT EXISTS idx_lobsters_token ON lobsters(lobster_token) WHERE lobster_token IS NOT NULL;

COMMENT ON COLUMN lobsters.lobster_token IS 'Secure token for OpenClaw agent WebSocket authentication. Generated on lobster initialization.';
