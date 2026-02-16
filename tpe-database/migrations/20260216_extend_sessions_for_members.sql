-- ================================================================
-- Migration: Add member_id to AI Concierge Sessions + Conversations
-- Date: February 16, 2026
-- Purpose: Allow Inner Circle members to have concierge sessions
--          alongside existing contractor sessions.
-- Note: ai_concierge_conversations is the actual table name
--        (NOT ai_concierge_messages — verified in pre-flight)
-- Phase: Inner Circle Concierge Phase 1
-- ================================================================

-- Add member_id column to sessions (nullable — existing sessions have contractor_id only)
ALTER TABLE ai_concierge_sessions
  ADD COLUMN IF NOT EXISTS member_id INTEGER REFERENCES inner_circle_members(id) ON DELETE SET NULL;

-- Index for member session lookups
CREATE INDEX IF NOT EXISTS idx_acs_member_id ON ai_concierge_sessions(member_id);

-- Add member_id column to conversations
-- Note: contractor_id in this table is VARCHAR, not INTEGER (verified in pre-flight)
ALTER TABLE ai_concierge_conversations
  ADD COLUMN IF NOT EXISTS member_id INTEGER REFERENCES inner_circle_members(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_acc_member_id ON ai_concierge_conversations(member_id);
