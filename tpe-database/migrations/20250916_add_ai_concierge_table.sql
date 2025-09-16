-- Migration: Add AI Concierge Conversations Table
-- Date: 2025-09-16
-- Purpose: Create table for storing AI Concierge chat conversations

-- Create the ai_concierge_conversations table
CREATE TABLE IF NOT EXISTS ai_concierge_conversations (
    id SERIAL PRIMARY KEY,
    contractor_id VARCHAR(255),
    message_type VARCHAR(50), -- 'user' or 'ai'
    content TEXT, -- Message content (including processed file descriptions)
    media_type VARCHAR(50), -- 'text', 'image', 'audio', 'document', 'video'
    media_url TEXT, -- NULL since we don't store files anymore
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster queries by contractor
CREATE INDEX IF NOT EXISTS idx_ai_concierge_contractor
ON ai_concierge_conversations(contractor_id);

-- Create index for chronological queries
CREATE INDEX IF NOT EXISTS idx_ai_concierge_created
ON ai_concierge_conversations(created_at DESC);

-- Add comment explaining the table's purpose
COMMENT ON TABLE ai_concierge_conversations IS
'Stores AI Concierge chat history. Files are processed but not stored - only text descriptions are kept in content field.';

COMMENT ON COLUMN ai_concierge_conversations.media_url IS
'Currently unused - kept for backwards compatibility. Files are processed in memory only.';

-- Grant permissions (if needed)
-- GRANT ALL ON ai_concierge_conversations TO tpeadmin;
-- GRANT ALL ON SEQUENCE ai_concierge_conversations_id_seq TO tpeadmin;

-- Verification query
-- SELECT COUNT(*) FROM ai_concierge_conversations;