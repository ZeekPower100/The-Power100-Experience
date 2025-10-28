# Phase 1: Pre-Flight Checklist - Hybrid Session Matching

**Document Version:** 1.0
**Date:** October 28, 2025
**Status:** MANDATORY - Use before creating or modifying ANY file

---

## 🎯 Purpose

This checklist ensures 100% database alignment for implementing the Hybrid Session Matching system. This system matches contractors to event sessions using BOTH agenda item content AND speaker data (whichever is available). Following this prevents field name mismatches and ensures graceful handling of NULL speaker_id values.

---

## ✅ MANDATORY CHECKLIST - Before Creating/Modifying ANY File

### Step 1: Identify Database Tables Involved

**Phase 1 Hybrid Session Matching Tables:**
- `event_agenda_items` - Session details (title, synopsis, focus_areas, speaker_id)
- `event_speakers` - Speaker details (bio, expertise, company)
- `event_messages` - Stores recommendations (personalization_data)
- `contractors` - Contractor profile (focus_areas, business_goals)

**For this implementation:**
All 4 tables are involved in the hybrid matching logic.

---

### Step 2: Verify Column Names (Field Names)

**All fields verified October 28, 2025 using:**
```bash
powershell -Command ".\quick-db.bat \"SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'TABLE_NAME' ORDER BY ordinal_position;\""
```

#### event_agenda_items (25 columns) ✅ VERIFIED

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

**🔴 CRITICAL FINDINGS:**
- `speaker_id` is **NULLABLE** - Must handle NULL in LEFT JOIN
- `focus_areas` is **JSONB** (not TEXT array)
- `key_takeaways` is **JSONB** (not TEXT array)
- `ai_keywords` is **JSONB** (not TEXT array)
- `synopsis` is **TEXT** (may be NULL)
- `title` is **VARCHAR** and **NOT NULL** (always available)

#### event_speakers (23 columns) ✅ VERIFIED

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
session_title            | text                        | YES
session_description      | text                        | YES
session_time             | timestamp without time zone | YES
session_duration_minutes | integer                     | YES
session_location         | character varying           | YES
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
session_end              | timestamp without time zone | YES
```

**🔴 CRITICAL FINDINGS:**
- ALL fields except `id`, `event_id`, and `name` are **NULLABLE**
- `focus_areas` is **JSONB** (same as agenda items)
- `ai_key_points` is **JSONB** (not array)
- `relevance_keywords` is **JSONB** (not array)
- May have speaker without `bio`, `title`, or `company`

#### event_messages (28 columns) ✅ VERIFIED

```
column_name          | data_type                   | is_nullable
---------------------|-----------------------------|---------
id                   | integer                     | NO
event_id             | integer                     | YES
contractor_id        | integer                     | YES
message_type         | character varying           | NO
message_category     | character varying           | YES
scheduled_time       | timestamp without time zone | YES
actual_send_time     | timestamp without time zone | YES
message_content      | text                        | NO
personalization_data | jsonb                       | YES  ⚠️ STORES RECOMMENDATIONS
response_received    | text                        | YES
response_time        | timestamp without time zone | YES
sentiment_score      | numeric                     | YES
pcr_score            | numeric                     | YES
action_taken         | character varying           | YES
delay_minutes        | integer                     | YES
status               | character varying           | YES
error_message        | text                        | YES
created_at           | timestamp without time zone | YES
updated_at           | timestamp without time zone | YES
ghl_contact_id       | character varying           | YES
ghl_message_id       | character varying           | YES
phone                | character varying           | YES
direction            | character varying           | YES
ghl_location_id      | character varying           | YES
channel              | character varying           | YES
from_email           | character varying           | YES
to_email             | character varying           | YES
subject              | text                        | YES
```

**🔴 CRITICAL FINDINGS:**
- `personalization_data` is **JSONB** (stores recommendation structure)
- `message_type` will be 'session_recommendation' (new type)
- `message_content` is **TEXT** and **NOT NULL** (must always have message)

#### contractors (relevant fields) ✅ VERIFIED

```
column_name          | data_type
---------------------|----------
focus_areas          | text  ⚠️ TEXT not JSONB!
primary_focus_area   | character varying
business_goals       | jsonb
current_challenges   | jsonb
```

**🔴 CRITICAL FINDINGS:**
- `focus_areas` is **TEXT** (comma-separated), NOT JSONB like agenda/speaker tables
- Must split by comma and trim: `focus_areas.split(',').map(f => f.trim())`
- `business_goals` is **JSONB**
- `current_challenges` is **JSONB**

---

### Step 3: Verify CHECK Constraints

```bash
powershell -Command ".\quick-db.bat \"SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'event_agenda_items'::regclass AND contype = 'c';\""
```

**Result:**
```
conname | pg_get_constraintdef
--------|----------------------
(0 rows)
```

**Finding**: ✅ NO CHECK constraints on `event_agenda_items`
- `status` field has no constraint (can be any VARCHAR value)
- `item_type` field has no constraint (can be any VARCHAR value)
- Common values observed: status = 'scheduled', 'confirmed', 'tentative'
- Common values observed: item_type = 'session', 'break', 'networking'

**Recommendation**: Use `item_type = 'session'` in WHERE clause to filter sessions only.

---

### Step 4: Verify Foreign Key Constraints

```bash
powershell -Command ".\quick-db.bat \"SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'event_agenda_items'::regclass AND contype = 'f';\""
```

**Expected Foreign Keys:**
- `event_agenda_items.event_id` → `events(id)`
- `event_agenda_items.speaker_id` → `event_speakers(id)` ⚠️ **NULLABLE**
- `event_messages.event_id` → `events(id)`
- `event_messages.contractor_id` → `contractors(id)`

**🔴 CRITICAL FOR LEFT JOIN:**
```sql
-- CORRECT: Handles NULL speaker_id
FROM event_agenda_items ai
LEFT JOIN event_speakers es ON ai.speaker_id = es.id

-- WRONG: INNER JOIN will exclude sessions without speakers
FROM event_agenda_items ai
INNER JOIN event_speakers es ON ai.speaker_id = es.id
```

---

### Step 5: Check Data Types (JSONB Fields)

**Phase 1 Critical Data Types:**

| Field                            | Type      | Notes                                    |
|----------------------------------|-----------|------------------------------------------|
| `event_agenda_items.focus_areas` | JSONB     | Array of strings: `["sales", "marketing"]` |
| `event_agenda_items.key_takeaways` | JSONB   | Array of strings: `["tip1", "tip2"]`     |
| `event_agenda_items.ai_keywords` | JSONB     | Array of strings: `["keyword1", "keyword2"]` |
| `event_speakers.focus_areas`     | JSONB     | Array of strings (same as agenda)        |
| `event_speakers.ai_key_points`   | JSONB     | Array of strings                         |
| `event_speakers.relevance_keywords` | JSONB  | Array of strings                         |
| `event_messages.personalization_data` | JSONB | Object with recommendation structure   |
| `contractors.focus_areas`        | **TEXT**  | ⚠️ Comma-separated string, NOT JSONB!   |
| `contractors.business_goals`     | JSONB     | Object or array                          |
| `contractors.current_challenges` | JSONB     | Object or array                          |

**🔴 CRITICAL: JSONB Handling**
```javascript
// ✅ CORRECT: Parse JSONB arrays
const agendaFocusAreas = safeJsonParse(row.agenda_focus_areas, []);

// ✅ CORRECT: Handle TEXT focus_areas (contractors table)
const contractorFocusAreas = contractor.focus_areas ?
  contractor.focus_areas.split(',').map(f => f.trim()) : [];

// ❌ WRONG: Treating TEXT as JSONB
const contractorFocusAreas = safeJsonParse(contractor.focus_areas, []); // WRONG!

// ✅ CORRECT: Storing JSONB in personalization_data
personalization_data: safeJsonStringify({ recommended_sessions: [...] })
```

---

### Step 6: Document Findings BEFORE Coding

**Session Data Service Verification Block:**
```javascript
// DATABASE-CHECKED: event_agenda_items, event_speakers columns verified October 28, 2025
// ================================================================
// VERIFIED FIELD NAMES:
// event_agenda_items: id, event_id, title, synopsis (TEXT nullable),
//                     focus_areas (JSONB), key_takeaways (JSONB),
//                     speaker_id (INTEGER nullable), start_time, end_time,
//                     location, ai_summary (TEXT), ai_keywords (JSONB)
// event_speakers: id, name, bio (TEXT nullable), session_title (TEXT nullable),
//                 focus_areas (JSONB), ai_summary (TEXT), ai_key_points (JSONB)
// ================================================================
// VERIFIED DATA TYPES:
// - focus_areas: JSONB array (NOT TEXT array)
// - key_takeaways: JSONB array (NOT TEXT array)
// - ai_keywords: JSONB array (NOT TEXT array)
// - speaker_id: INTEGER nullable (use LEFT JOIN)
// - synopsis: TEXT nullable (may not exist)
// ================================================================
// CRITICAL LEFT JOIN:
// - Use LEFT JOIN to handle NULL speaker_id
// - Check IF row.speaker_id before accessing speaker fields
// - Never assume speaker data exists
// ================================================================
```

**Recommendation Service Verification Block:**
```javascript
// DATABASE-CHECKED: contractors columns verified October 28, 2025
// ================================================================
// VERIFIED FIELD NAMES:
// contractors: focus_areas (TEXT!), primary_focus_area (VARCHAR),
//              business_goals (JSONB), current_challenges (JSONB)
// ================================================================
// CRITICAL DATA TYPE DIFFERENCES:
// - contractors.focus_areas: TEXT (comma-separated) NOT JSONB!
// - agenda/speaker.focus_areas: JSONB arrays
// - Must split TEXT before comparison: .split(',').map(f => f.trim())
// ================================================================
```

**Message Service Verification Block:**
```javascript
// DATABASE-CHECKED: event_messages columns verified October 28, 2025
// ================================================================
// VERIFIED FIELD NAMES:
// - personalization_data (JSONB) - stores recommendation structure
// - message_type (VARCHAR) - use 'session_recommendation'
// - message_content (TEXT NOT NULL) - always required
// ================================================================
// PERSONALIZATION_DATA STRUCTURE:
// {
//   recommended_sessions: [{
//     agenda_item_id: NUMBER (always present),
//     speaker_id: NUMBER or NULL (may not exist),
//     session_title: STRING,
//     match_score: NUMBER,
//     match_reasons: ARRAY,
//     data_source: STRING ('session_content' | 'speaker_data' | 'both')
//   }]
// }
// ================================================================
```

---

## 🚨 Red Flags - STOP and Verify

If you see ANY of these in Phase 1, STOP and run verification queries:

1. **Using INNER JOIN with event_speakers** ❌
   ```javascript
   // WRONG: Excludes sessions without speakers
   FROM event_agenda_items ai
   INNER JOIN event_speakers es ON ai.speaker_id = es.id
   ```
   **Fix**: Use LEFT JOIN

2. **Accessing speaker fields without NULL check** ❌
   ```javascript
   // WRONG: Crashes if speaker_id is NULL
   const speakerName = row.speaker_name;
   ```
   **Fix**: `const speakerName = row.speaker_id ? row.speaker_name : null;`

3. **Treating contractors.focus_areas as JSONB** ❌
   ```javascript
   // WRONG: It's TEXT, not JSONB!
   const contractorFocusAreas = safeJsonParse(contractor.focus_areas, []);
   ```
   **Fix**: `contractor.focus_areas.split(',').map(f => f.trim())`

4. **Not parsing JSONB arrays** ❌
   ```javascript
   // WRONG: JSONB needs parsing
   const focusAreas = row.agenda_focus_areas;
   ```
   **Fix**: `const focusAreas = safeJsonParse(row.agenda_focus_areas, []);`

5. **Using old speaker_id-only logic** ❌
   ```javascript
   // WRONG: Old speaker-only approach
   WHERE speaker_id = $1
   ```
   **Fix**: Query by agenda_item_id instead

6. **Not handling NULL synopsis/description** ❌
   ```javascript
   // WRONG: May be NULL
   const content = row.synopsis + row.description;
   ```
   **Fix**: `const content = row.synopsis || row.description || 'No description';`

---

## 📋 Quick Reference Commands

### Verify All Columns
```bash
# event_agenda_items
powershell -Command ".\quick-db.bat \"SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'event_agenda_items' ORDER BY ordinal_position;\""

# event_speakers
powershell -Command ".\quick-db.bat \"SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'event_speakers' ORDER BY ordinal_position;\""

# event_messages
powershell -Command ".\quick-db.bat \"SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'event_messages' ORDER BY ordinal_position;\""

# contractors (focus/goals fields)
powershell -Command ".\quick-db.bat \"SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'contractors' AND (column_name LIKE '%focus%' OR column_name LIKE '%goal%' OR column_name LIKE '%challenge%');\""
```

### Check Constraints
```bash
powershell -Command ".\quick-db.bat \"SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'event_agenda_items'::regclass;\""
```

### Test LEFT JOIN Query
```bash
powershell -Command ".\quick-db.bat \"SELECT ai.id, ai.title, ai.speaker_id, es.name FROM event_agenda_items ai LEFT JOIN event_speakers es ON ai.speaker_id = es.id WHERE ai.event_id = 1 LIMIT 5;\""
```

### Find Sessions Without Speakers
```bash
powershell -Command ".\quick-db.bat \"SELECT id, title, synopsis FROM event_agenda_items WHERE speaker_id IS NULL AND item_type = 'session' LIMIT 10;\""
```

### Check Existing personalization_data Structure
```bash
powershell -Command ".\quick-db.bat \"SELECT message_type, personalization_data FROM event_messages WHERE message_type LIKE '%recommendation%' LIMIT 3;\""
```

---

## ✅ Example: Creating sessionDataService.js

### Pre-Flight Verification Complete ✅

**1. Tables Involved:**
- `event_agenda_items` ✅
- `event_speakers` ✅

**2. Column Names Verified:**
```
event_agenda_items: id, event_id, title, synopsis, description, focus_areas (JSONB),
                    key_takeaways (JSONB), speaker_id (nullable), start_time, end_time,
                    location, track, item_type, status, ai_summary, ai_keywords (JSONB)

event_speakers: id, name, title, company, bio, session_title, session_description,
                focus_areas (JSONB), ai_summary, ai_key_points (JSONB),
                relevance_keywords (JSONB), pcr_score
```

**3. Critical Constraints:**
- NO CHECK constraints
- `speaker_id` is **NULLABLE** (use LEFT JOIN)
- `item_type = 'session'` to filter sessions

**4. Foreign Keys:**
- `event_agenda_items.speaker_id` → `event_speakers.id` (nullable)

**5. Data Types:**
- `focus_areas`: JSONB (parse with safeJsonParse)
- `key_takeaways`: JSONB (parse with safeJsonParse)
- `ai_keywords`: JSONB (parse with safeJsonParse)
- `speaker_id`: INTEGER (check for NULL before accessing speaker fields)
- `synopsis`, `description`: TEXT (may be NULL)

**6. Documentation Block:**
```javascript
// DATABASE-CHECKED: event_agenda_items, event_speakers columns verified October 28, 2025
// ================================================================
// VERIFIED FIELD NAMES:
// event_agenda_items: id, event_id, title (NOT NULL), synopsis (nullable),
//                     focus_areas (JSONB), speaker_id (INTEGER nullable)
// event_speakers: id, name (NOT NULL), bio (nullable), company (nullable)
// ================================================================
// CRITICAL DATA TYPES:
// - focus_areas: JSONB array (use safeJsonParse)
// - speaker_id: INTEGER nullable (use LEFT JOIN, check for NULL)
// - synopsis: TEXT nullable (may not exist)
// ================================================================
// LEFT JOIN REQUIREMENT:
// FROM event_agenda_items ai
// LEFT JOIN event_speakers es ON ai.speaker_id = es.id
// Always check: if (row.speaker_id) { ... }
// ================================================================
```

**NOW WE CAN CODE SAFELY!**

---

## 📚 Phase 1 Specific Verification Notes

### Hybrid Matching Implementation Checklist
- [ ] Verify `speaker_id` is nullable in event_agenda_items
- [ ] Verify LEFT JOIN syntax handles NULL speaker_id
- [ ] Verify contractors.focus_areas is TEXT (not JSONB)
- [ ] Verify agenda/speaker.focus_areas are JSONB
- [ ] Verify personalization_data structure includes agenda_item_id
- [ ] Verify all JSONB fields parsed with safeJsonParse
- [ ] Verify NULL checks before accessing speaker fields

### Session Query Checklist
- [ ] Uses LEFT JOIN (not INNER JOIN)
- [ ] Filters by `item_type = 'session'`
- [ ] Handles NULL speaker_id gracefully
- [ ] Parses all JSONB fields
- [ ] Returns unified session object with both sources

### Recommendation Logic Checklist
- [ ] Analyzes session content (title, synopsis, focus_areas)
- [ ] Analyzes speaker data when available
- [ ] Works when speaker_id is NULL
- [ ] Splits contractors.focus_areas by comma
- [ ] Stores both agenda_item_id and speaker_id in personalization_data

### Message Storage Checklist
- [ ] message_type = 'session_recommendation'
- [ ] personalization_data includes agenda_item_id
- [ ] speaker_id stored as NULL when not available
- [ ] data_source indicates what data was used
- [ ] Backward compatible with old speaker-based messages

---

## 🚨 Phase 1 Critical Gotchas

### 1. LEFT JOIN vs INNER JOIN
```javascript
// ❌ WRONG: Excludes sessions without speakers
FROM event_agenda_items ai
INNER JOIN event_speakers es ON ai.speaker_id = es.id

// ✅ CORRECT: Includes all sessions
FROM event_agenda_items ai
LEFT JOIN event_speakers es ON ai.speaker_id = es.id
```

### 2. NULL Speaker Fields
```javascript
// ❌ WRONG: Crashes if speaker_id is NULL
const speakerName = row.speaker_name;
const speakerBio = row.speaker_bio;

// ✅ CORRECT: Check for NULL first
const speaker = row.speaker_id ? {
  id: row.speaker_id,
  name: row.speaker_name,
  bio: row.speaker_bio
} : null;
```

### 3. contractors.focus_areas (TEXT not JSONB)
```javascript
// ❌ WRONG: Treating TEXT as JSONB
const contractorFocusAreas = safeJsonParse(contractor.focus_areas, []);

// ✅ CORRECT: Split TEXT by comma
const contractorFocusAreas = contractor.focus_areas ?
  contractor.focus_areas.split(',').map(f => f.trim()) : [];
```

### 4. JSONB Field Parsing
```javascript
// ❌ WRONG: Not parsing JSONB
const focusAreas = row.agenda_focus_areas;

// ✅ CORRECT: Parse JSONB fields
const focusAreas = safeJsonParse(row.agenda_focus_areas, []);
```

### 5. Query by agenda_item_id (not speaker_id)
```javascript
// ❌ WRONG: Old speaker-only approach
WHERE es.id = $1

// ✅ CORRECT: Query by agenda item
WHERE ai.id = $1
```

---

## 📚 Related Documents

- **Database Source of Truth:** `DATABASE-SOURCE-OF-TRUTH.md` (project root)
- **Phase 1 Implementation Plan:** `PHASE-1-IMPLEMENTATION-PLAN.md` (this directory)
- **Event Orchestration Overview:** `docs/features/event-orchestrator/` (if exists)
- **AI Field Naming Conventions:** `docs/AI-FIELD-NAMING-CONVENTIONS.md`

---

## 🎯 Quick Start for Phase 1

**Before creating ANY file, run these 4 commands:**

```bash
# 1. Check event_agenda_items structure
powershell -Command ".\quick-db.bat \"SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'event_agenda_items' ORDER BY ordinal_position;\""

# 2. Check event_speakers structure
powershell -Command ".\quick-db.bat \"SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'event_speakers' ORDER BY ordinal_position;\""

# 3. Test LEFT JOIN query
powershell -Command ".\quick-db.bat \"SELECT ai.id, ai.title, ai.speaker_id, es.name FROM event_agenda_items ai LEFT JOIN event_speakers es ON ai.speaker_id = es.id LIMIT 5;\""

# 4. Find sessions without speakers (verify this exists!)
powershell -Command ".\quick-db.bat \"SELECT COUNT(*) as sessions_without_speakers FROM event_agenda_items WHERE speaker_id IS NULL AND item_type = 'session';\""
```

**Document results, then code safely!**

---

**Last Updated:** October 28, 2025
**Next Review:** Before each file creation in Phase 1 Tasks 1-5
**Status:** MANDATORY - Use this checklist religiously

---

## 🎉 Phase 1 Completion Criteria

Phase 1 pre-flight checklist is complete when:
- ✅ All 4 table schemas verified
- ✅ LEFT JOIN syntax confirmed
- ✅ NULL speaker_id handling documented
- ✅ contractors.focus_areas TEXT format noted
- ✅ JSONB field parsing requirements clear
- ✅ All verification commands tested
- ✅ Red flags documented
- ✅ Ready to implement Task 1

---

**Document Status:** ✅ Complete and Verified
**Database Verification Date:** October 28, 2025
**Ready for Implementation:** YES
