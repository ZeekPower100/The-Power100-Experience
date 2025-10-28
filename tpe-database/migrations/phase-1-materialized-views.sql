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
-- PHASE 2 UPDATE: Hybrid Session Matching (October 28, 2025)
-- Changed from event_speakers to event_agenda_items with LEFT JOIN
-- Enables matching on session content + speaker data (whichever available)
-- ================================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_sessions_now AS
SELECT
  -- Core identifiers (from agenda_items)
  ai.id AS session_id,
  ai.event_id,

  -- Speaker info (may be NULL from LEFT JOIN)
  es.name AS speaker_name,

  -- Session details (ALWAYS from agenda_items)
  ai.title AS session_title,
  ai.start_time AS session_time,
  ai.end_time AS session_end,
  ai.location AS session_location,
  ai.description AS session_description,

  -- Combined focus areas for hybrid matching (agenda + speaker)
  COALESCE(
    (
      SELECT jsonb_agg(DISTINCT value)
      FROM (
        SELECT value FROM jsonb_array_elements_text(ai.focus_areas::jsonb)
        UNION
        SELECT value FROM jsonb_array_elements_text(COALESCE(es.focus_areas::jsonb, '[]'::jsonb))
      ) combined
    ),
    ai.focus_areas::jsonb,
    '[]'::jsonb
  ) AS focus_areas,

  -- Contractor matching context
  a.contractor_id,
  e.name AS event_name,
  e.timezone AS event_timezone,

  -- Pre-compute relevance score based on focus area matching (using combined focus areas)
  CASE
    WHEN COALESCE(
      (
        SELECT jsonb_agg(DISTINCT value)
        FROM (
          SELECT value FROM jsonb_array_elements_text(ai.focus_areas::jsonb)
          UNION
          SELECT value FROM jsonb_array_elements_text(COALESCE(es.focus_areas::jsonb, '[]'::jsonb))
        ) combined
      ),
      ai.focus_areas::jsonb,
      '[]'::jsonb
    )::jsonb ?| (
      SELECT array_agg(fa::text)
      FROM jsonb_array_elements_text(c.focus_areas::jsonb) fa
    )
    THEN 100
    ELSE 50
  END AS relevance_score,

  -- Count how many focus areas match (using combined focus areas)
  (
    SELECT COUNT(*)
    FROM jsonb_array_elements_text(
      COALESCE(
        (
          SELECT jsonb_agg(DISTINCT value)
          FROM (
            SELECT value FROM jsonb_array_elements_text(ai.focus_areas::jsonb)
            UNION
            SELECT value FROM jsonb_array_elements_text(COALESCE(es.focus_areas::jsonb, '[]'::jsonb))
          ) combined
        ),
        ai.focus_areas::jsonb,
        '[]'::jsonb
      )
    ) AS session_fa
    WHERE session_fa::text = ANY(
      SELECT jsonb_array_elements_text(c.focus_areas::jsonb)::text
    )
  ) AS focus_area_match_count

FROM event_agenda_items ai
LEFT JOIN event_speakers es ON ai.speaker_id = es.id
JOIN event_attendees a ON a.event_id = ai.event_id
JOIN events e ON e.id = ai.event_id
JOIN contractors c ON c.id = a.contractor_id
WHERE
  -- Only sessions happening RIGHT NOW based on event timezone
  (NOW() AT TIME ZONE e.timezone) BETWEEN ai.start_time AND ai.end_time
  AND ai.start_time IS NOT NULL
  AND ai.end_time IS NOT NULL
  -- Filter to active sessions only (PHASE 2 addition)
  AND ai.item_type = 'session'
  AND ai.status IN ('scheduled', 'confirmed', 'tentative');

-- Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_mv_sessions_now_contractor
ON mv_sessions_now (contractor_id);

CREATE INDEX IF NOT EXISTS idx_mv_sessions_now_event
ON mv_sessions_now (event_id);

CREATE INDEX IF NOT EXISTS idx_mv_sessions_now_relevance
ON mv_sessions_now (contractor_id, relevance_score DESC);

-- Create unique index (required for CONCURRENT refresh)
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_sessions_now_unique
ON mv_sessions_now (session_id, contractor_id);

COMMENT ON MATERIALIZED VIEW mv_sessions_now IS 'Pre-computed sessions happening right now for each contractor';

-- ================================================================
-- Materialized View 2: Upcoming Sessions (Next 60 Minutes)
-- ================================================================
-- PHASE 2 UPDATE: Hybrid Session Matching (October 28, 2025)
-- Changed from event_speakers to event_agenda_items with LEFT JOIN
-- Enables matching on session content + speaker data (whichever available)
-- ================================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_sessions_next_60 AS
SELECT
  -- Core identifiers (from agenda_items)
  ai.id AS session_id,
  ai.event_id,

  -- Speaker info (may be NULL from LEFT JOIN)
  es.name AS speaker_name,

  -- Session details (ALWAYS from agenda_items)
  ai.title AS session_title,
  ai.start_time AS session_time,
  ai.end_time AS session_end,
  ai.location AS session_location,
  ai.description AS session_description,

  -- Combined focus areas for hybrid matching (agenda + speaker)
  COALESCE(
    (
      SELECT jsonb_agg(DISTINCT value)
      FROM (
        SELECT value FROM jsonb_array_elements_text(ai.focus_areas::jsonb)
        UNION
        SELECT value FROM jsonb_array_elements_text(COALESCE(es.focus_areas::jsonb, '[]'::jsonb))
      ) combined
    ),
    ai.focus_areas::jsonb,
    '[]'::jsonb
  ) AS focus_areas,

  -- Contractor matching context
  a.contractor_id,
  e.name AS event_name,
  e.timezone AS event_timezone,

  -- Calculate minutes until session starts (using agenda start_time)
  EXTRACT(EPOCH FROM (ai.start_time - (NOW() AT TIME ZONE e.timezone))) / 60 AS minutes_until_start,

  -- Count matching focus areas (using combined focus areas)
  (
    SELECT COUNT(*)
    FROM jsonb_array_elements_text(
      COALESCE(
        (
          SELECT jsonb_agg(DISTINCT value)
          FROM (
            SELECT value FROM jsonb_array_elements_text(ai.focus_areas::jsonb)
            UNION
            SELECT value FROM jsonb_array_elements_text(COALESCE(es.focus_areas::jsonb, '[]'::jsonb))
          ) combined
        ),
        ai.focus_areas::jsonb,
        '[]'::jsonb
      )
    ) AS session_fa
    WHERE session_fa::text = ANY(
      SELECT jsonb_array_elements_text(c.focus_areas::jsonb)::text
    )
  ) AS match_count,

  -- Priority score: sooner + more relevant = higher priority (using agenda start_time and combined focus areas)
  CASE
    WHEN EXTRACT(EPOCH FROM (ai.start_time - (NOW() AT TIME ZONE e.timezone))) / 60 < 15 THEN 100
    WHEN EXTRACT(EPOCH FROM (ai.start_time - (NOW() AT TIME ZONE e.timezone))) / 60 < 30 THEN 75
    ELSE 50
  END +
  (
    SELECT COUNT(*) * 10
    FROM jsonb_array_elements_text(
      COALESCE(
        (
          SELECT jsonb_agg(DISTINCT value)
          FROM (
            SELECT value FROM jsonb_array_elements_text(ai.focus_areas::jsonb)
            UNION
            SELECT value FROM jsonb_array_elements_text(COALESCE(es.focus_areas::jsonb, '[]'::jsonb))
          ) combined
        ),
        ai.focus_areas::jsonb,
        '[]'::jsonb
      )
    ) AS session_fa
    WHERE session_fa::text = ANY(
      SELECT jsonb_array_elements_text(c.focus_areas::jsonb)::text
    )
  ) AS priority_score

FROM event_agenda_items ai
LEFT JOIN event_speakers es ON ai.speaker_id = es.id
JOIN event_attendees a ON a.event_id = ai.event_id
JOIN events e ON e.id = ai.event_id
JOIN contractors c ON c.id = a.contractor_id
WHERE
  -- Only sessions starting in next 60 minutes (using agenda start_time)
  ai.start_time BETWEEN
    (NOW() AT TIME ZONE e.timezone) AND
    (NOW() AT TIME ZONE e.timezone) + INTERVAL '60 minutes'
  AND ai.start_time IS NOT NULL
  AND ai.end_time IS NOT NULL
  -- Filter to active sessions only (PHASE 2 addition)
  AND ai.item_type = 'session'
  AND ai.status IN ('scheduled', 'confirmed', 'tentative');

-- Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_mv_sessions_next_60_contractor
ON mv_sessions_next_60 (contractor_id);

CREATE INDEX IF NOT EXISTS idx_mv_sessions_next_60_event
ON mv_sessions_next_60 (event_id);

CREATE INDEX IF NOT EXISTS idx_mv_sessions_next_60_priority
ON mv_sessions_next_60 (contractor_id, priority_score DESC);

CREATE INDEX IF NOT EXISTS idx_mv_sessions_next_60_timing
ON mv_sessions_next_60 (contractor_id, minutes_until_start);

-- Create unique index (required for CONCURRENT refresh)
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_sessions_next_60_unique
ON mv_sessions_next_60 (session_id, contractor_id);

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
-- PHASE 2: Triggers on event_agenda_items
-- ================================================================

DROP TRIGGER IF EXISTS trigger_event_agenda_items_refresh ON event_agenda_items;
CREATE TRIGGER trigger_event_agenda_items_refresh
AFTER INSERT OR UPDATE OR DELETE ON event_agenda_items
FOR EACH ROW
EXECUTE FUNCTION notify_event_refresh();

COMMENT ON TRIGGER trigger_event_agenda_items_refresh ON event_agenda_items IS 'Triggers view refresh when agenda item/session data changes (Phase 2)';

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
