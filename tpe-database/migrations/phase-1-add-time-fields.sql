-- ================================================================
-- Phase 1: Add Missing Time Fields for Event Management
-- ================================================================
-- Purpose: Add session_end (computed) and timezone fields for event orchestration
-- Date: October 13, 2025
-- ================================================================

-- Add timezone to events table
ALTER TABLE events
ADD COLUMN IF NOT EXISTS timezone VARCHAR(50) DEFAULT 'America/New_York';

COMMENT ON COLUMN events.timezone IS 'Event timezone for accurate session time calculations (e.g., America/New_York, America/Chicago)';

-- Add session_end as a generated column to event_speakers
-- This auto-calculates based on session_time + session_duration_minutes
ALTER TABLE event_speakers
ADD COLUMN IF NOT EXISTS session_end TIMESTAMP
GENERATED ALWAYS AS (
  session_time + (session_duration_minutes || ' minutes')::INTERVAL
) STORED;

COMMENT ON COLUMN event_speakers.session_end IS 'Auto-calculated end time based on session_time + session_duration_minutes';

-- Update existing events to have timezone
UPDATE events
SET timezone = 'America/New_York'
WHERE timezone IS NULL;

-- Verify the changes
SELECT
  'events' AS table_name,
  column_name,
  data_type,
  column_default
FROM information_schema.columns
WHERE table_name = 'events' AND column_name = 'timezone'

UNION ALL

SELECT
  'event_speakers' AS table_name,
  column_name,
  data_type,
  column_default
FROM information_schema.columns
WHERE table_name = 'event_speakers' AND column_name = 'session_end';

-- Test the generated column with sample data
SELECT
  id,
  name AS speaker_name,
  session_title,
  session_time,
  session_duration_minutes,
  session_end,
  (session_end - session_time) AS calculated_duration
FROM event_speakers
WHERE session_time IS NOT NULL
LIMIT 5;

-- ================================================================
-- Migration complete
-- ================================================================
