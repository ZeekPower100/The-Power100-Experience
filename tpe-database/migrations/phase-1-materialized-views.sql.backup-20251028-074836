-- ================================================================
-- Phase 1: Materialized Views for Event Truth Management
-- ================================================================
-- Purpose: Create single source of truth for event context
-- Date: October 13, 2025
-- Database: PostgreSQL with pgvector
-- ================================================================

-- ================================================================
-- Materialized View 1: Sessions Happening Right Now
-- ================================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_sessions_now AS
SELECT
  s.id AS session_id,
  s.event_id,
  s.name AS speaker_name,
  s.session_title,
  s.session_time,
  s.session_end,
  s.focus_areas,
  s.session_location,
  s.session_description,
  a.contractor_id,
  e.name AS event_name,
  e.timezone AS event_timezone,
  -- Pre-compute relevance score based on focus area matching
  CASE
    WHEN s.focus_areas::jsonb ?| (
      SELECT array_agg(fa::text)
      FROM jsonb_array_elements_text(c.focus_areas::jsonb) fa
    )
    THEN 100
    ELSE 50
  END AS relevance_score,
  -- Count how many focus areas match
  (
    SELECT COUNT(*)
    FROM jsonb_array_elements_text(s.focus_areas::jsonb) AS session_fa
    WHERE session_fa::text = ANY(
      SELECT jsonb_array_elements_text(c.focus_areas::jsonb)::text
    )
  ) AS focus_area_match_count
FROM event_speakers s
JOIN event_attendees a ON a.event_id = s.event_id
JOIN events e ON e.id = s.event_id
JOIN contractors c ON c.id = a.contractor_id
WHERE
  -- Only sessions happening RIGHT NOW based on event timezone
  (NOW() AT TIME ZONE e.timezone) BETWEEN s.session_time AND s.session_end
  AND s.session_time IS NOT NULL
  AND s.session_end IS NOT NULL;

-- Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_mv_sessions_now_contractor
ON mv_sessions_now (contractor_id);

CREATE INDEX IF NOT EXISTS idx_mv_sessions_now_event
ON mv_sessions_now (event_id);

CREATE INDEX IF NOT EXISTS idx_mv_sessions_now_relevance
ON mv_sessions_now (contractor_id, relevance_score DESC);

COMMENT ON MATERIALIZED VIEW mv_sessions_now IS 'Pre-computed sessions happening right now for each contractor';

-- ================================================================
-- Materialized View 2: Upcoming Sessions (Next 60 Minutes)
-- ================================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_sessions_next_60 AS
SELECT
  s.id AS session_id,
  s.event_id,
  s.name AS speaker_name,
  s.session_title,
  s.session_time,
  s.session_end,
  s.focus_areas,
  s.session_location,
  s.session_description,
  a.contractor_id,
  e.name AS event_name,
  e.timezone AS event_timezone,
  -- Calculate minutes until session starts
  EXTRACT(EPOCH FROM (s.session_time - (NOW() AT TIME ZONE e.timezone))) / 60 AS minutes_until_start,
  -- Count matching focus areas
  (
    SELECT COUNT(*)
    FROM jsonb_array_elements_text(s.focus_areas::jsonb) AS session_fa
    WHERE session_fa::text = ANY(
      SELECT jsonb_array_elements_text(c.focus_areas::jsonb)::text
    )
  ) AS match_count,
  -- Priority score: sooner + more relevant = higher priority
  CASE
    WHEN EXTRACT(EPOCH FROM (s.session_time - (NOW() AT TIME ZONE e.timezone))) / 60 < 15 THEN 100
    WHEN EXTRACT(EPOCH FROM (s.session_time - (NOW() AT TIME ZONE e.timezone))) / 60 < 30 THEN 75
    ELSE 50
  END +
  (
    SELECT COUNT(*) * 10
    FROM jsonb_array_elements_text(s.focus_areas::jsonb) AS session_fa
    WHERE session_fa::text = ANY(
      SELECT jsonb_array_elements_text(c.focus_areas::jsonb)::text
    )
  ) AS priority_score
FROM event_speakers s
JOIN event_attendees a ON a.event_id = s.event_id
JOIN events e ON e.id = s.event_id
JOIN contractors c ON c.id = a.contractor_id
WHERE
  -- Only sessions starting in next 60 minutes
  s.session_time BETWEEN
    (NOW() AT TIME ZONE e.timezone) AND
    (NOW() AT TIME ZONE e.timezone) + INTERVAL '60 minutes'
  AND s.session_time IS NOT NULL
  AND s.session_end IS NOT NULL;

-- Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_mv_sessions_next_60_contractor
ON mv_sessions_next_60 (contractor_id);

CREATE INDEX IF NOT EXISTS idx_mv_sessions_next_60_event
ON mv_sessions_next_60 (event_id);

CREATE INDEX IF NOT EXISTS idx_mv_sessions_next_60_priority
ON mv_sessions_next_60 (contractor_id, priority_score DESC);

CREATE INDEX IF NOT EXISTS idx_mv_sessions_next_60_timing
ON mv_sessions_next_60 (contractor_id, minutes_until_start);

COMMENT ON MATERIALIZED VIEW mv_sessions_next_60 IS 'Pre-computed upcoming sessions in next 60 minutes for each contractor';

-- ================================================================
-- LISTEN/NOTIFY Trigger Function
-- ================================================================

CREATE OR REPLACE FUNCTION notify_event_refresh()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM pg_notify('event_refresh', COALESCE(NEW.event_id::text, OLD.event_id::text));
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION notify_event_refresh IS 'Sends notification when event data changes to trigger view refresh';

-- ================================================================
-- Triggers on event_speakers
-- ================================================================

DROP TRIGGER IF EXISTS trigger_event_speakers_refresh ON event_speakers;
CREATE TRIGGER trigger_event_speakers_refresh
AFTER INSERT OR UPDATE OR DELETE ON event_speakers
FOR EACH ROW
EXECUTE FUNCTION notify_event_refresh();

COMMENT ON TRIGGER trigger_event_speakers_refresh ON event_speakers IS 'Triggers view refresh when speaker/session data changes';

-- ================================================================
-- Triggers on event_attendees
-- ================================================================

DROP TRIGGER IF EXISTS trigger_event_attendees_refresh ON event_attendees;
CREATE TRIGGER trigger_event_attendees_refresh
AFTER INSERT OR UPDATE OR DELETE ON event_attendees
FOR EACH ROW
EXECUTE FUNCTION notify_event_refresh();

COMMENT ON TRIGGER trigger_event_attendees_refresh ON event_attendees IS 'Triggers view refresh when contractor check-in status changes';

-- ================================================================
-- Initial View Population
-- ================================================================

-- Refresh both views with initial data
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_sessions_now;
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_sessions_next_60;

-- ================================================================
-- Verification Queries
-- ================================================================

-- Check view row counts
SELECT
  'mv_sessions_now' AS view_name,
  COUNT(*) AS row_count,
  COUNT(DISTINCT contractor_id) AS unique_contractors,
  COUNT(DISTINCT event_id) AS unique_events
FROM mv_sessions_now

UNION ALL

SELECT
  'mv_sessions_next_60' AS view_name,
  COUNT(*) AS row_count,
  COUNT(DISTINCT contractor_id) AS unique_contractors,
  COUNT(DISTINCT event_id) AS unique_events
FROM mv_sessions_next_60;

-- Sample data from mv_sessions_now
SELECT
  session_title,
  speaker_name,
  session_time,
  session_end,
  relevance_score
FROM mv_sessions_now
LIMIT 5;

-- Sample data from mv_sessions_next_60
SELECT
  session_title,
  speaker_name,
  minutes_until_start,
  priority_score
FROM mv_sessions_next_60
LIMIT 5;

-- ================================================================
-- Migration Complete
-- ================================================================
-- Next Steps:
-- 1. Configure pg_cron for scheduled refresh (requires RDS setup)
-- 2. Start eventViewRefresher.js service in Node.js
-- 3. Test LISTEN/NOTIFY by inserting/updating event data
-- ================================================================
