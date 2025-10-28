# Phase 2: Hybrid Session Matching - Materialized Views Update

**Phase Name:** Materialized Views Hybrid Matching (Event Agent Support)
**Timeline:** 2-3 hours
**Status:** Ready for Implementation
**Database Schema:** Verified October 28, 2025
**Backup Created:** ✅ phase-1-materialized-views.sql.backup-[timestamp]

---

## 🎯 Phase 2 Overview

**Goal:** "Update materialized views (mv_sessions_now, mv_sessions_next_60) to support hybrid session matching for the AI Concierge Event Agent"

Phase 2 extends the hybrid matching capability from Phase 1's proactive SMS system to the conversational Event Agent tool. Currently, when contractors in Event Mode ask "What sessions should I attend?", they only see sessions with assigned speakers. Phase 2 fixes this by updating the materialized views to query from `event_agenda_items` (with LEFT JOIN to speakers), enabling the same intelligent hybrid matching used in Phase 1.

### Primary Objectives
1. **Update mv_sessions_now** to query from event_agenda_items with LEFT JOIN
2. **Update mv_sessions_next_60** to use hybrid session matching
3. **Combine focus areas** from agenda items AND speakers for better matching
4. **Test materialized view refresh** and verify performance
5. **Validate Event Agent tool** works with updated views

### Success Metrics
- ✅ Materialized views include sessions WITHOUT speaker_id
- ✅ Combined focus_areas from session content + speaker expertise
- ✅ Event Agent tool returns ALL relevant sessions
- ✅ View refresh performance remains acceptable (<5 seconds)
- ✅ Backward compatible with existing Event Agent queries

---

## 📅 Implementation Tasks

### Task 1: Update mv_sessions_now Definition (45 minutes)

#### Objectives
- Change FROM clause from event_speakers to event_agenda_items
- Add LEFT JOIN to event_speakers
- Update all column references to use agenda_items as source
- Implement hybrid focus_areas combining

#### Implementation

**File**: `tpe-database/migrations/phase-1-materialized-views.sql` (UPDATE)

**Current Definition (lines 13-52):**
```sql
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_sessions_now AS
SELECT
  s.id AS session_id,          -- ❌ FROM SPEAKER
  s.event_id,
  s.name AS speaker_name,
  s.session_title,             -- ❌ WRONG SOURCE
  s.session_time,              -- ❌ WRONG SOURCE
  s.session_end,               -- ❌ WRONG SOURCE
  s.focus_areas,               -- ❌ ONLY SPEAKER
  s.session_location,          -- ❌ WRONG SOURCE
  s.session_description,       -- ❌ WRONG SOURCE
  ...
FROM event_speakers s          -- ❌ SPEAKER-ONLY
JOIN event_attendees a ...
```

**New Definition:**
```sql
-- ================================================================
-- PHASE 2 UPDATE: Hybrid Session Matching for Materialized View
-- ================================================================
-- DATE: October 28, 2025
-- CHANGE: Query from event_agenda_items with LEFT JOIN to event_speakers
-- REASON: Enable hybrid matching (session content + speaker data)
-- ================================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_sessions_now AS
SELECT
  -- Core identifiers (from agenda_items)
  ai.id AS session_id,                    -- ✅ FROM AGENDA
  ai.event_id,

  -- Speaker info (may be NULL from LEFT JOIN)
  es.name AS speaker_name,                -- ⚠️ MAY BE NULL

  -- Session details (ALWAYS from agenda_items)
  ai.title AS session_title,              -- ✅ FROM AGENDA
  ai.start_time AS session_time,          -- ✅ FROM AGENDA
  ai.end_time AS session_end,             -- ✅ FROM AGENDA
  ai.location AS session_location,        -- ✅ FROM AGENDA
  ai.description AS session_description,  -- ✅ FROM AGENDA

  -- Combined focus areas for hybrid matching
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
  ) AS focus_areas,                       -- ✅ HYBRID (BOTH SOURCES)

  -- Contractor matching context
  a.contractor_id,
  e.name AS event_name,
  e.timezone AS event_timezone,

  -- Pre-compute relevance score based on focus area matching
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

FROM event_agenda_items ai                      -- ✅ PRIMARY SOURCE
LEFT JOIN event_speakers es ON ai.speaker_id = es.id  -- ✅ LEFT JOIN (handles NULL)
JOIN event_attendees a ON a.event_id = ai.event_id
JOIN events e ON e.id = ai.event_id
JOIN contractors c ON c.id = a.contractor_id

WHERE
  -- Only sessions happening RIGHT NOW based on event timezone
  (NOW() AT TIME ZONE e.timezone) BETWEEN ai.start_time AND ai.end_time
  AND ai.start_time IS NOT NULL
  AND ai.end_time IS NOT NULL
  -- NEW: Filter by item type and status
  AND ai.item_type = 'session'
  AND ai.status IN ('scheduled', 'confirmed', 'tentative');
```

#### Database Fields Used (Verified October 28, 2025)
**event_agenda_items (PRIMARY):**
- `id`, `event_id`, `title`, `description`, `location`
- `start_time`, `end_time` (TIMESTAMP)
- `focus_areas` (JSONB), `item_type`, `status`
- `speaker_id` (INTEGER, nullable)

**event_speakers (LEFT JOIN):**
- `id`, `name`, `focus_areas` (JSONB)

**event_attendees:**
- `event_id`, `contractor_id`

**events:**
- `id`, `name`, `timezone`

**contractors:**
- `id`, `focus_areas` (TEXT - converted to JSONB in query)

#### Success Criteria
- [ ] View definition queries from event_agenda_items
- [ ] LEFT JOIN to event_speakers handles NULL speaker_id
- [ ] Combined focus_areas includes both agenda + speaker
- [ ] Filters by item_type = 'session'
- [ ] Uses agenda timing fields (start_time, end_time)

---

### Task 2: Update mv_sessions_next_60 Definition (45 minutes)

#### Objectives
- Apply same hybrid matching logic to upcoming sessions view
- Update time window calculations to use agenda start_time
- Maintain priority scoring with combined focus areas

#### Implementation

**File**: `tpe-database/migrations/phase-1-materialized-views.sql` (UPDATE lines 70-117)

**New Definition:**
```sql
-- ================================================================
-- PHASE 2 UPDATE: Hybrid Session Matching for Next 60 Minutes View
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

  -- Combined focus areas
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

  -- Priority score: sooner + more relevant = higher priority
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
  -- NEW: Filter by item type and status
  AND ai.item_type = 'session'
  AND ai.status IN ('scheduled', 'confirmed', 'tentative');
```

#### Success Criteria
- [ ] View uses agenda start_time for time window
- [ ] Priority scoring uses combined focus_areas
- [ ] LEFT JOIN handles NULL speaker_id
- [ ] minutes_until_start calculated from agenda start_time

---

### Task 3: Update Triggers to Include event_agenda_items (15 minutes)

#### Objectives
- Add triggers on event_agenda_items to refresh views when sessions change
- Ensure triggers fire when agenda items are added/updated/deleted

#### Implementation

**File**: `tpe-database/migrations/phase-1-materialized-views.sql` (ADD after line 171)

```sql
-- ================================================================
-- PHASE 2: Add Triggers on event_agenda_items
-- ================================================================
-- Triggers on event_agenda_items table to refresh views when session data changes

DROP TRIGGER IF EXISTS trigger_event_agenda_items_refresh ON event_agenda_items;
CREATE TRIGGER trigger_event_agenda_items_refresh
AFTER INSERT OR UPDATE OR DELETE ON event_agenda_items
FOR EACH ROW
EXECUTE FUNCTION notify_event_refresh();

COMMENT ON TRIGGER trigger_event_agenda_items_refresh ON event_agenda_items IS 'Triggers view refresh when agenda item/session data changes (Phase 2)';
```

#### Success Criteria
- [ ] Trigger created on event_agenda_items
- [ ] Trigger fires on INSERT, UPDATE, DELETE
- [ ] notify_event_refresh() function called correctly

---

### Task 4: Testing and Validation (30 minutes)

#### Test Scenarios

**Test 1: View Row Count Comparison**
```sql
-- Count rows BEFORE update
SELECT 'BEFORE UPDATE' AS stage, COUNT(*) as row_count
FROM mv_sessions_now;

-- After updating and refreshing view
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_sessions_now;

SELECT 'AFTER UPDATE' AS stage, COUNT(*) as row_count
FROM mv_sessions_now;

-- Expected: AFTER >= BEFORE (includes sessions without speakers)
```

**Test 2: Sessions Without Speakers Are Visible**
```sql
-- Find sessions that NOW appear in view (were previously hidden)
SELECT
  session_id,
  session_title,
  speaker_name,  -- Should be NULL for some rows
  focus_areas,
  relevance_score
FROM mv_sessions_now
WHERE speaker_name IS NULL
LIMIT 5;

-- Expected: Rows with NULL speaker_name should exist
```

**Test 3: Combined Focus Areas Work**
```sql
-- Verify focus_areas combines both sources
SELECT
  ai.id,
  ai.title,
  ai.focus_areas AS agenda_focus,
  es.focus_areas AS speaker_focus,
  mv.focus_areas AS combined_focus
FROM event_agenda_items ai
LEFT JOIN event_speakers es ON ai.speaker_id = es.id
JOIN mv_sessions_now mv ON mv.session_id = ai.id
WHERE ai.id = 141  -- Test session ID
LIMIT 1;

-- Expected: combined_focus should include elements from BOTH sources
```

**Test 4: Event Agent Tool Query**
```bash
# Test eventSessionsTool.js still works with updated views
curl -X POST http://localhost:5000/api/ai-concierge/test-event-tool \\
  -H "Content-Type: application/json" \\
  -d '{
    "contractorId": 10,
    "eventId": 54,
    "timeWindow": "now"
  }'

# Expected: Returns sessions including those without speakers
```

**Test 5: Performance Check**
```sql
-- Measure refresh time
\\timing on
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_sessions_now;
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_sessions_next_60;
\\timing off

-- Expected: Both complete in < 5 seconds
```

#### Manual Testing Checklist
- [ ] View refresh completes without errors
- [ ] Sessions without speakers appear in results
- [ ] Combined focus_areas include both sources
- [ ] Event Agent tool returns correct sessions
- [ ] Performance acceptable (< 5 sec refresh)

---

### Task 5: Deploy to Production (15 minutes)

#### Pre-Deployment Checklist
- [ ] Backup SQL file created ✅
- [ ] All test queries passing in development
- [ ] View refresh performance measured
- [ ] Rollback procedure documented

#### Deployment Steps

**Step 1: Connect to Production Database**
```bash
# Use MCP tool for production database
mcp__aws-production__exec "SELECT COUNT(*) FROM mv_sessions_now;"
```

**Step 2: Drop Existing Views**
```bash
mcp__aws-production__exec "DROP MATERIALIZED VIEW IF EXISTS mv_sessions_now CASCADE;"
mcp__aws-production__exec "DROP MATERIALIZED VIEW IF EXISTS mv_sessions_next_60 CASCADE;"
```

**Step 3: Execute Updated SQL**
```bash
# Run the FULL updated SQL file (includes CREATE statements + indexes + triggers)
mcp__aws-production__exec "$(cat tpe-database/migrations/phase-1-materialized-views.sql)"
```

**Step 4: Verify Deployment**
```bash
# Check row counts
mcp__aws-production__exec "SELECT COUNT(*) as now_count FROM mv_sessions_now; SELECT COUNT(*) as next_60_count FROM mv_sessions_next_60;"

# Check for NULL speaker_name rows
mcp__aws-production__exec "SELECT COUNT(*) as sessions_without_speakers FROM mv_sessions_now WHERE speaker_name IS NULL;"
```

**Step 5: Test Event Agent Tool**
```bash
# Test production Event Agent endpoint
curl -X POST https://tpx.power100.io/api/ai-concierge/event-sessions \\
  -H "Content-Type: application/json" \\
  -d '{
    "contractorId": 10,
    "eventId": 54,
    "timeWindow": "now"
  }'
```

---

## 🔄 Rollback Procedure

### If Issues Occur During Deployment

**Step 1: Drop New Views**
```bash
mcp__aws-production__exec "DROP MATERIALIZED VIEW IF EXISTS mv_sessions_now CASCADE;"
mcp__aws-production__exec "DROP MATERIALIZED VIEW IF EXISTS mv_sessions_next_60 CASCADE;"
```

**Step 2: Restore from Backup**
```bash
# Use backup SQL file created before Phase 2
mcp__aws-production__exec "$(cat tpe-database/migrations/phase-1-materialized-views.sql.backup-[timestamp])"
```

**Step 3: Verify Rollback**
```bash
mcp__aws-production__exec "SELECT COUNT(*) FROM mv_sessions_now; SELECT COUNT(*) FROM mv_sessions_next_60;"
```

**Step 4: Refresh Old Views**
```bash
mcp__aws-production__exec "REFRESH MATERIALIZED VIEW CONCURRENTLY mv_sessions_now;"
mcp__aws-production__exec "REFRESH MATERIALIZED VIEW CONCURRENTLY mv_sessions_next_60;"
```

---

## 🏗️ Architecture Changes

### Before Phase 2 (Speaker-Only):
```
AI Concierge Event Agent → eventSessionsTool.js
                              ↓
                          Query: mv_sessions_now
                              ↓
                          FROM event_speakers (INNER JOIN)
                              ↓
                          Result: Only sessions with speakers
```

### After Phase 2 (Hybrid Matching):
```
AI Concierge Event Agent → eventSessionsTool.js
                              ↓
                          Query: mv_sessions_now
                              ↓
                          FROM event_agenda_items (PRIMARY)
                          LEFT JOIN event_speakers (OPTIONAL)
                              ↓
                          Result: ALL sessions (with or without speakers)
                              + Combined focus_areas for better matching
```

---

## 📊 Performance Considerations

### View Refresh Time
**Current (Speaker-Only):**
- mv_sessions_now: ~500ms
- mv_sessions_next_60: ~600ms

**Expected (Hybrid):**
- mv_sessions_now: ~800ms-1.5s (more complex query)
- mv_sessions_next_60: ~900ms-1.8s (more complex query)

**Mitigation:**
- Indexed on contractor_id, event_id, relevance_score
- CONCURRENTLY refresh prevents locking
- 30-second refresh interval remains acceptable

### Storage Impact
- Slightly larger view size (combined focus_areas)
- Minimal impact: ~10-20% size increase
- Still well within PostgreSQL materialized view limits

---

## 📝 Files Modified

### Modified
1. `tpe-database/migrations/phase-1-materialized-views.sql`
   - Updated mv_sessions_now definition (lines 13-64)
   - Updated mv_sessions_next_60 definition (lines 70-132)
   - Added event_agenda_items trigger (after line 171)

### Backup Created
1. `tpe-database/migrations/phase-1-materialized-views.sql.backup-[timestamp]`

---

## 🎯 Success Criteria Summary

Phase 2 is COMPLETE when:
- ✅ Both materialized views query from event_agenda_items
- ✅ LEFT JOIN to event_speakers handles NULL speaker_id
- ✅ Combined focus_areas implemented for hybrid matching
- ✅ Triggers on event_agenda_items refresh views
- ✅ All 5 test scenarios pass
- ✅ Event Agent tool works with updated views
- ✅ Performance remains acceptable (< 5 sec refresh)
- ✅ Production deployment verified

---

## 🔗 Integration Points

### Event Agent Tool (eventSessionsTool.js)
**No code changes required** - tool queries materialized views by contract:
```javascript
const sessionsQuery = `
  SELECT * FROM ${viewName}
  WHERE event_id = $1 AND contractor_id = $2
  ORDER BY relevance_score DESC
  LIMIT 5
`;
```

**Automatic benefits:**
- Now sees sessions without speakers
- Gets combined focus_areas for matching
- Same query, better results

### View Refresh Service (eventViewRefresher.js)
**No changes needed** - refresh logic unchanged:
```javascript
await query('REFRESH MATERIALIZED VIEW CONCURRENTLY mv_sessions_now');
await query('REFRESH MATERIALIZED VIEW CONCURRENTLY mv_sessions_next_60');
```

---

## 📚 Related Documentation

- **Phase 2 Pre-Flight Checklist:** `PHASE-2-PRE-FLIGHT-CHECKLIST.md` (this directory)
- **Phase 1 Implementation Plan:** `../phase-1/PHASE-1-IMPLEMENTATION-PLAN.md`
- **Phase 1 Completion Summary:** `../phase-1/PHASE-1-COMPLETION-SUMMARY.md`
- **Event Agent Tool:** `tpe-backend/src/services/agents/tools/eventSessionsTool.js`

---

**Phase 2 Timeline:** 2-3 hours
**Status:** Ready for Implementation
**Database Schema:** Verified October 28, 2025
**Backup:** ✅ Created
**Next Review:** After Task 1 completion

---

**Last Updated:** October 28, 2025
**Created By:** TPX Development Team
**Status:** ✅ Ready for Implementation
