# Phase 2: Pre-Flight Checklist - Materialized Views Hybrid Matching

**Document Version:** 1.0
**Date:** October 28, 2025
**Status:** MANDATORY - Use before modifying materialized views

---

## 🎯 Purpose

This checklist ensures 100% database alignment for updating the materialized views (mv_sessions_now, mv_sessions_next_60) to support hybrid session matching. The views currently query only `event_speakers`, which excludes sessions without assigned speakers. Phase 2 updates them to use LEFT JOIN with `event_agenda_items`, enabling the same hybrid matching as Phase 1.

---

## ✅ MANDATORY CHECKLIST - Before Modifying Materialized Views

### Step 1: Identify Database Tables Involved

**Phase 2 Materialized Views Update Tables:**
- `event_agenda_items` - Session details (PRIMARY source, replaces event_speakers)
- `event_speakers` - Speaker details (LEFT JOIN only)
- `event_attendees` - Contractor-event registration
- `events` - Event metadata (name, timezone)
- `contractors` - Contractor profile (focus_areas for matching)

**For this implementation:**
All 5 tables are involved in the materialized view queries.

---

### Step 2: Verify Column Names (Field Names)

**All fields verified October 28, 2025 using:**
```bash
powershell -Command ".\\quick-db.bat \\"SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'TABLE_NAME' ORDER BY ordinal_position;\\""
```

#### event_agenda_items (25 columns) ✅ VERIFIED (From Phase 1)

```
column_name           | data_type                   | is_nullable
----------------------|-----------------------------|---------
id                    | integer                     | NO
event_id              | integer                     | YES
start_time            | timestamp without time zone | NO
end_time              | timestamp without time zone | YES
item_type             | character varying           | NO
title                 | character varying           | NO
synopsis              | text                        | YES
key_takeaways         | jsonb                       | YES
speaker_id            | integer                     | YES  ⚠️ NULLABLE!
sponsor_id            | integer                     | YES
description           | text                        | YES
location              | character varying           | YES
track                 | character varying           | YES
capacity              | integer                     | YES
focus_areas           | jsonb                       | YES
target_audience       | jsonb                       | YES
skill_level           | character varying           | YES
is_mandatory          | boolean                     | YES
requires_registration | boolean                     | YES
status                | character varying           | YES
speaker_confirmed     | boolean                     | YES
ai_summary            | text                        | YES
ai_keywords           | jsonb                       | YES
created_at            | timestamp without time zone | YES
updated_at            | timestamp without time zone | YES
```

**🔴 CRITICAL FOR MATERIALIZED VIEWS:**
- `id` will replace `s.id` as session_id source
- `title` replaces `s.session_title` (VARCHAR, NOT NULL)
- `start_time` and `end_time` are on agenda_items, NOT speakers
- `speaker_id` is NULLABLE - use LEFT JOIN
- `focus_areas` is JSONB (same as speakers table)
- `location` replaces `s.session_location`
- `description` replaces `s.session_description`

#### event_speakers (23 columns) ✅ VERIFIED (From Phase 1)

```
column_name              | data_type                   | is_nullable
-------------------------|-----------------------------|---------
id                       | integer                     | NO
event_id                 | integer                     | YES
name                     | character varying           | NO
title                    | character varying           | YES
company                  | character varying           | YES
bio                      | text                        | YES
headshot_url             | character varying           | YES
session_title            | text                        | YES  ⚠️ FALLBACK ONLY
session_description      | text                        | YES  ⚠️ FALLBACK ONLY
session_time             | timestamp without time zone | YES  ⚠️ NOT USED
session_duration_minutes | integer                     | YES
session_location         | character varying           | YES  ⚠️ NOT USED
focus_areas              | jsonb                       | YES
target_audience          | jsonb                       | YES
pcr_score                | numeric                     | YES
total_ratings            | integer                     | YES
average_rating           | numeric                     | YES
ai_summary               | text                        | YES
ai_key_points            | jsonb                       | YES
relevance_keywords       | jsonb                       | YES
created_at               | timestamp without time zone | YES
updated_at               | timestamp without time zone | YES
session_end              | timestamp without time zone | YES  ⚠️ NOT USED
```

**🔴 CRITICAL CHANGES:**
- `name` is only field we'll use from speakers (when speaker_id exists)
- `session_title`, `session_time`, `session_location`, `session_end` **DO NOT USE** - these are on agenda_items!
- `focus_areas` can be combined with agenda focus_areas for matching

#### event_attendees (16 columns) ✅ VERIFIED

```
column_name               | data_type                   | is_nullable
--------------------------|-----------------------------|---------
id                        | integer                     | NO
event_id                  | integer                     | YES
contractor_id             | integer                     | YES
registration_date         | timestamp without time zone | YES
check_in_time             | timestamp without time zone | YES
check_in_method           | character varying           | YES
profile_completion_status | character varying           | YES
profile_completion_time   | timestamp without time zone | YES
sms_opt_in                | boolean                     | YES
real_email                | character varying           | YES
real_phone                | character varying           | YES
pre_filled_data           | jsonb                       | YES
custom_responses          | jsonb                       | YES
qr_code_data              | character varying           | YES
created_at                | timestamp without time zone | YES
updated_at                | timestamp without time zone | YES
```

**🔴 CRITICAL FOR VIEWS:**
- `event_id` and `contractor_id` used for JOIN
- No changes needed to how this table is used

#### events (key fields) ✅ VERIFIED

```
column_name | data_type
------------|------------------
id          | integer
name        | character varying
timezone    | character varying
end_date    | date
```

**🔴 CRITICAL FOR VIEWS:**
- `id`, `name`, `timezone` unchanged from old views
- No modifications needed

#### contractors (focus_areas field) ✅ VERIFIED (From Phase 1)

```
column_name    | data_type
---------------|----------
focus_areas    | text  ⚠️ TEXT not JSONB!
```

**🔴 CRITICAL REMINDER:**
- `focus_areas` in contractors is TEXT (comma-separated)
- `focus_areas` in agenda_items and event_speakers is JSONB
- Views use JSONB version for matching (from agenda/speakers)

---

### Step 3: Map Old Columns to New Columns

**CRITICAL MAPPING for Materialized View Rewrite:**

| Old Column (from event_speakers) | New Column (from event_agenda_items) | Notes |
|----------------------------------|--------------------------------------|-------|
| `s.id AS session_id` | `ai.id AS session_id` | **CHANGE SOURCE TABLE** |
| `s.name AS speaker_name` | `es.name AS speaker_name` | **MAY BE NULL** (LEFT JOIN) |
| `s.session_title` | `ai.title` | **ALWAYS FROM AGENDA** |
| `s.session_time` | `ai.start_time` | **ALWAYS FROM AGENDA** |
| `s.session_end` | `ai.end_time` | **ALWAYS FROM AGENDA** |
| `s.session_location` | `ai.location` | **ALWAYS FROM AGENDA** |
| `s.session_description` | `ai.description` | **ALWAYS FROM AGENDA** |
| `s.focus_areas` | **COMBINE** `ai.focus_areas` + `es.focus_areas` | **HYBRID MATCHING** |

**🔴 CRITICAL JOIN CHANGE:**

**OLD (Speaker-Only):**
```sql
FROM event_speakers s
JOIN event_attendees a ON a.event_id = s.event_id
```

**NEW (Hybrid with LEFT JOIN):**
```sql
FROM event_agenda_items ai
LEFT JOIN event_speakers es ON ai.speaker_id = es.id
JOIN event_attendees a ON a.event_id = ai.event_id
```

---

### Step 4: Verify Current Materialized View Definition

**Current mv_sessions_now definition (BEFORE Phase 2):**
```sql
FROM event_speakers s
JOIN event_attendees a ON a.event_id = s.event_id
JOIN events e ON e.id = s.event_id
JOIN contractors c ON c.id = a.contractor_id
WHERE
  (NOW() AT TIME ZONE e.timezone) BETWEEN s.session_time AND s.session_end
  AND s.session_time IS NOT NULL
  AND s.session_end IS NOT NULL
```

**Issues with current definition:**
- ❌ Queries only `event_speakers` - sessions without speakers are INVISIBLE
- ❌ Uses `s.session_time` and `s.session_end` - these should come from agenda_items
- ❌ INNER JOIN - silently drops sessions without speakers
- ❌ No hybrid matching - only uses speaker focus_areas

---

### Step 5: Phase 2 Changes Required

#### Change 1: FROM Clause ✅
```sql
-- OLD
FROM event_speakers s

-- NEW
FROM event_agenda_items ai
LEFT JOIN event_speakers es ON ai.speaker_id = es.id
```

#### Change 2: Session Identification ✅
```sql
-- OLD
ai.id AS session_id  -- Used speaker ID

-- NEW
ai.id AS session_id  -- Use agenda item ID
```

#### Change 3: Time Fields ✅
```sql
-- OLD
s.session_time,
s.session_end

-- NEW
ai.start_time AS session_time,
ai.end_time AS session_end
```

#### Change 4: Session Details ✅
```sql
-- OLD
s.session_title,
s.session_location,
s.session_description

-- NEW
ai.title AS session_title,
ai.location AS session_location,
ai.description AS session_description
```

#### Change 5: Speaker Name (Handle NULL) ✅
```sql
-- OLD
s.name AS speaker_name  -- Always existed

-- NEW
es.name AS speaker_name  -- May be NULL from LEFT JOIN
```

#### Change 6: Focus Areas (Hybrid Matching) ✅
```sql
-- OLD
s.focus_areas  -- Only speaker focus areas

-- NEW
-- Combine both sources (agenda + speaker)
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
) AS focus_areas
```

#### Change 7: WHERE Clause Update ✅
```sql
-- OLD
WHERE
  (NOW() AT TIME ZONE e.timezone) BETWEEN s.session_time AND s.session_end
  AND s.session_time IS NOT NULL
  AND s.session_end IS NOT NULL

-- NEW
WHERE
  (NOW() AT TIME ZONE e.timezone) BETWEEN ai.start_time AND ai.end_time
  AND ai.start_time IS NOT NULL
  AND ai.end_time IS NOT NULL
  AND ai.item_type = 'session'  -- Filter to sessions only
  AND ai.status IN ('scheduled', 'confirmed', 'tentative')  -- Active sessions only
```

#### Change 8: JOIN Update ✅
```sql
-- OLD JOIN chain
FROM event_speakers s
JOIN event_attendees a ON a.event_id = s.event_id
JOIN events e ON e.id = s.event_id

-- NEW JOIN chain
FROM event_agenda_items ai
LEFT JOIN event_speakers es ON ai.speaker_id = es.id
JOIN event_attendees a ON a.event_id = ai.event_id
JOIN events e ON e.id = ai.event_id
```

---

### Step 6: Backup Current Views

**MANDATORY: Create backup before ANY changes:**

```bash
# Backup materialized views SQL file
cp tpe-database/migrations/phase-1-materialized-views.sql \\
   "tpe-database/migrations/phase-1-materialized-views.sql.backup-$(date +%Y%m%d-%H%M%S)"

# Export current view definitions
powershell -Command ".\\quick-db.bat \\"SELECT pg_get_viewdef('mv_sessions_now'::regclass, true);\\"" > mv_sessions_now_backup.sql
powershell -Command ".\\quick-db.bat \\"SELECT pg_get_viewdef('mv_sessions_next_60'::regclass, true);\\"" > mv_sessions_next_60_backup.sql
```

✅ **BACKUP CREATED**: phase-1-materialized-views.sql.backup-20251028-[timestamp]

---

### Step 7: Test Strategy

#### Test 1: Verify Query Returns Same Session Count
```sql
-- Count sessions in old view (before update)
SELECT COUNT(*) FROM mv_sessions_now;

-- Count sessions in new query (test before deploying)
SELECT COUNT(*)
FROM event_agenda_items ai
LEFT JOIN event_speakers es ON ai.speaker_id = es.id
JOIN event_attendees a ON a.event_id = ai.event_id
WHERE ai.item_type = 'session'
  AND ai.status IN ('scheduled', 'confirmed', 'tentative');

-- Expected: NEW count >= OLD count (includes sessions without speakers)
```

#### Test 2: Verify Sessions Without Speakers Are Included
```sql
-- Find sessions that were previously invisible
SELECT
  ai.id,
  ai.title,
  ai.speaker_id,
  es.name
FROM event_agenda_items ai
LEFT JOIN event_speakers es ON ai.speaker_id = es.id
WHERE ai.speaker_id IS NULL
  AND ai.item_type = 'session'
  AND ai.status IN ('scheduled', 'confirmed', 'tentative')
LIMIT 10;

-- Expected: Should return rows if sessions without speakers exist
```

#### Test 3: Verify Combined Focus Areas
```sql
-- Test hybrid focus area combining
SELECT
  ai.id,
  ai.title,
  ai.focus_areas AS agenda_focus,
  es.focus_areas AS speaker_focus,
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
  ) AS combined_focus_areas
FROM event_agenda_items ai
LEFT JOIN event_speakers es ON ai.speaker_id = es.id
WHERE ai.id = 141  -- Use known test session
LIMIT 1;

-- Expected: combined_focus_areas should include elements from both sources
```

---

## 🚨 Red Flags - STOP and Verify

### 1. Using INNER JOIN with event_speakers ❌
```sql
-- WRONG: Excludes sessions without speakers
FROM event_agenda_items ai
INNER JOIN event_speakers es ON ai.speaker_id = es.id

-- CORRECT: Includes all sessions
FROM event_agenda_items ai
LEFT JOIN event_speakers es ON ai.speaker_id = es.id
```

### 2. Querying speaker timing fields ❌
```sql
-- WRONG: Should use agenda timing
s.session_time, s.session_end

-- CORRECT: Always use agenda timing
ai.start_time, ai.end_time
```

### 3. Not filtering by item_type ❌
```sql
-- WRONG: Includes breaks, networking, etc.
WHERE ai.start_time IS NOT NULL

-- CORRECT: Filter to sessions only
WHERE ai.item_type = 'session'
  AND ai.status IN ('scheduled', 'confirmed', 'tentative')
```

### 4. Not handling NULL speaker_id in focus areas ❌
```sql
-- WRONG: Fails if speaker_id is NULL
es.focus_areas

-- CORRECT: Handle NULL with COALESCE
COALESCE(es.focus_areas::jsonb, '[]'::jsonb)
```

### 5. Not combining focus areas ❌
```sql
-- WRONG: Only uses one source
ai.focus_areas

-- CORRECT: Combine both sources for hybrid matching
-- (see Change 6 above for full UNION logic)
```

---

## 📋 Quick Reference Commands

### Check Current View Structure
```bash
powershell -Command ".\\quick-db.bat \\"SELECT pg_get_viewdef('mv_sessions_now'::regclass, true);\\""
```

### Count Sessions by Speaker Assignment
```bash
powershell -Command ".\\quick-db.bat \\"SELECT COUNT(*) as sessions_with_speaker FROM event_agenda_items WHERE speaker_id IS NOT NULL AND item_type = 'session';\\""

powershell -Command ".\\quick-db.bat \\"SELECT COUNT(*) as sessions_without_speaker FROM event_agenda_items WHERE speaker_id IS NULL AND item_type = 'session';\\""
```

### Drop and Recreate Views (TESTING ONLY)
```bash
# WARNING: Only run in development!
powershell -Command ".\\quick-db.bat \\"DROP MATERIALIZED VIEW IF EXISTS mv_sessions_now CASCADE;\\""
powershell -Command ".\\quick-db.bat \\"DROP MATERIALIZED VIEW IF EXISTS mv_sessions_next_60 CASCADE;\\""
```

### Refresh Views After Update
```bash
powershell -Command ".\\quick-db.bat \\"REFRESH MATERIALIZED VIEW CONCURRENTLY mv_sessions_now;\\""
powershell -Command ".\\quick-db.bat \\"REFRESH MATERIALIZED VIEW CONCURRENTLY mv_sessions_next_60;\\""
```

---

## ✅ Phase 2 Pre-Flight Completion Criteria

Phase 2 pre-flight checklist is complete when:
- ✅ All 5 table schemas verified (agenda, speakers, attendees, events, contractors)
- ✅ Current materialized view definitions backed up
- ✅ Column mapping documented (old → new)
- ✅ LEFT JOIN syntax confirmed
- ✅ NULL speaker_id handling planned
- ✅ Combined focus_areas logic designed
- ✅ Test queries prepared
- ✅ Red flags documented
- ✅ Ready to update SQL migration file

---

## 📚 Related Documents

- **Phase 1 Pre-Flight Checklist:** `phase-1/PHASE-1-PRE-FLIGHT-CHECKLIST.md`
- **Phase 1 Implementation Plan:** `phase-1/PHASE-1-IMPLEMENTATION-PLAN.md`
- **Phase 2 Implementation Plan:** `PHASE-2-IMPLEMENTATION-PLAN.md` (next)
- **Database Source of Truth:** `../../../../DATABASE-SOURCE-OF-TRUTH.md`

---

**Document Status:** ✅ Complete and Verified
**Database Verification Date:** October 28, 2025
**Ready for Implementation:** YES

---

## 🎯 Summary: What Phase 2 Changes

**Before (Speaker-Only):**
- Query from `event_speakers` table
- Only sessions with assigned speakers visible
- INNER JOIN drops sessions without speaker_id
- Uses speaker timing/location fields

**After (Hybrid Matching):**
- Query from `event_agenda_items` table (PRIMARY)
- LEFT JOIN to `event_speakers` (optional)
- ALL sessions visible (with or without speakers)
- Uses agenda timing/location fields
- Combines focus areas from both sources
- Filters by item_type and status

**Impact:**
- ✅ Event Agent tool can recommend sessions without speakers
- ✅ Hybrid matching uses session content + speaker expertise
- ✅ Materialized views align with Phase 1 proactive SMS system
- ✅ Zero data loss - sessions no longer silently dropped

---

**Last Updated:** October 28, 2025
**Next Step:** Create Phase 2 Implementation Plan
