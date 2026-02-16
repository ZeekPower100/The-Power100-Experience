# Phase 1 Pre-Flight Checklist — Inner Circle AI Concierge

**Date:** February 15, 2026
**Purpose:** Verify database schema, existing infrastructure, and dependencies before implementing Phase 1
**Status:** MANDATORY — Must complete before any code changes
**Estimated Time:** 15-20 minutes

---

## CRITICAL: This Checklist is MANDATORY

**DO NOT SKIP THIS STEP**

This checklist prevents hours of debugging by ensuring:
1. All existing database tables and fields are verified
2. New tables won't conflict with existing schema
3. Required infrastructure (pgvector, Redis, LangGraph) is operational
4. XState routing and agent system are in expected state
5. No naming conflicts with planned new files

**Consequence of Skipping:** Hours of debugging field name mismatches, migration failures, and broken routing

---

## Pre-Flight Checklist

### Step 1: Verify `ai_concierge_sessions` Table (Will Be Extended)

We're adding a `member_id` column to this table. Verify current schema first.

```bash
powershell -Command ".\quick-db.bat \"SELECT column_name, data_type, column_default FROM information_schema.columns WHERE table_name = 'ai_concierge_sessions' ORDER BY ordinal_position;\""
```

**Expected Output:**
```
 id               | integer                     | nextval('ai_coach_sessions_id_seq'::regclass)
 contractor_id    | integer                     |
 session_id       | character varying           |
 session_type     | character varying           |
 session_status   | character varying           |
 session_data     | text                        |
 started_at       | timestamp without time zone | CURRENT_TIMESTAMP
 ended_at         | timestamp without time zone |
 duration_minutes | integer                     |
```

**Verification:**
- [ ] Table exists with 9 columns
- [ ] `contractor_id` is INTEGER (we'll add `member_id` as same type)
- [ ] `session_type` is VARCHAR with NO CHECK constraint (confirmed Oct 15, 2025 — we can use 'inner_circle')
- [ ] `session_status` is VARCHAR with NO CHECK constraint
- [ ] `member_id` column does NOT exist yet (confirm we haven't already run migration)

---

### Step 2: Verify `ai_concierge_conversations` Table (Will Be Extended)

We're adding a `member_id` column to this table for message history.

```bash
powershell -Command ".\quick-db.bat \"SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'ai_concierge_conversations' ORDER BY ordinal_position;\""
```

**Expected Output:**
```
 id            | integer
 contractor_id | character varying
 message_type  | character varying
 content       | text
 media_type    | character varying
 media_url     | text
 created_at    | timestamp without time zone
```

**Verification:**
- [ ] Table exists with 7 columns
- [ ] `contractor_id` is CHARACTER VARYING (note: VARCHAR, not INTEGER — migration must match)
- [ ] `member_id` column does NOT exist yet
- [ ] Note: Table name is `ai_concierge_conversations` (not `ai_concierge_messages`)

**IMPORTANT:** The migration in the implementation plan references `ai_concierge_messages`. The actual table is `ai_concierge_conversations`. Update the migration SQL to use the correct table name.

---

### Step 3: Verify No Conflicting Tables Exist

Our migrations create `inner_circle_members` and `skill_definitions`. Confirm they don't already exist.

```bash
powershell -Command ".\quick-db.bat \"SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND (table_name LIKE '%inner%' OR table_name LIKE '%skill%' OR table_name LIKE '%member%' OR table_name LIKE '%power_move%') ORDER BY table_name;\""
```

**Expected Output:**
```
(0 rows)
```

**Verification:**
- [ ] No `inner_circle_members` table exists
- [ ] No `skill_definitions` table exists
- [ ] No `power_moves` table exists (Phase 2 — shouldn't be here yet)
- [ ] No `member_power_move_progress` table exists (Phase 2)

---

### Step 4: Verify `contractors` Table (Conversion Reference)

Inner Circle members can convert to contractors. Verify the fields we reference for conversion mapping.

```bash
powershell -Command ".\quick-db.bat \"SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'contractors' AND column_name IN ('id', 'email', 'first_name', 'last_name', 'focus_areas', 'revenue_tier', 'team_size', 'business_goals', 'completed_at', 'current_stage') ORDER BY column_name;\""
```

**Expected Output:**
```
 business_goals | jsonb
 completed_at   | timestamp without time zone
 current_stage  | character varying
 email          | character varying
 first_name     | character varying
 focus_areas    | text
 id             | integer
 last_name      | character varying
 revenue_tier   | character varying
 team_size      | character varying
```

**Verification:**
- [ ] `id` is INTEGER (our FK reference target)
- [ ] `focus_areas` is TEXT (stored as JSON string — same taxonomy we'll use for members)
- [ ] `revenue_tier` is VARCHAR (same values we'll collect conversationally)
- [ ] `team_size` is VARCHAR (same values we'll collect conversationally)
- [ ] `business_goals` is JSONB
- [ ] `email` is VARCHAR (for matching during conversion)

---

### Step 5: Verify `entity_embeddings` Table (Hybrid Search)

The content recommendation tool uses hybrid search. Verify the embeddings infrastructure.

```bash
powershell -Command ".\quick-db.bat \"SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'entity_embeddings' ORDER BY ordinal_position;\""
```

**Expected Output:**
```
 id                | integer
 entity_type       | character varying
 entity_id         | integer
 embedding_type    | character varying
 embedding         | ARRAY
 model_version     | character varying
 created_at        | timestamp without time zone
 updated_at        | timestamp without time zone
 content           | text
 content_embedding | USER-DEFINED
 metadata          | jsonb
 contractor_id     | integer
```

**Verification:**
- [ ] Table exists with 12 columns
- [ ] `content_embedding` is USER-DEFINED (pgvector type)
- [ ] `entity_type` is VARCHAR (we'll use this to index Inner Circle content)
- [ ] `content` is TEXT (searchable content for BM25)
- [ ] `metadata` is JSONB (for storing AI tags, focus areas)

---

### Step 6: Verify pgvector Extension

Hybrid search depends on pgvector being installed and operational.

```bash
powershell -Command ".\quick-db.bat \"SELECT extname, extversion FROM pg_extension WHERE extname = 'vector';\""
```

**Expected Output:**
```
 vector  | 0.8.1
```

**Verification:**
- [ ] pgvector extension is installed
- [ ] Version 0.8.1 or higher

---

### Step 7: Verify `contractor_event_registrations` Table (XState Routing Reference)

The state machine routing checks this table for event context. We need to understand the pattern to add Inner Circle routing alongside it.

```bash
powershell -Command ".\quick-db.bat \"SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'contractor_event_registrations' ORDER BY ordinal_position;\""
```

**Expected Output:**
```
 id                | integer
 contractor_id     | integer
 event_id          | integer
 event_date        | date
 event_name        | character varying
 event_status      | character varying
 registration_date | timestamp without time zone
 created_at        | timestamp without time zone
 updated_at        | timestamp without time zone
```

**Verification:**
- [ ] Table exists with 9 columns
- [ ] `event_status` has NO CHECK constraint (values: 'registered', 'checked_in', 'attending')
- [ ] This confirms the routing pattern: controller queries table → builds context → state machine evaluates guard

---

### Step 8: Verify Existing XState State Machine

Confirm the state machine file has the expected structure before modifying it.

```bash
grep -n "states:" "C:/Users/broac/CascadeProjects/The-Power100-Experience/tpe-backend/src/services/conciergeStateMachine.js"
```

**Expected:** Line showing `states:` block

```bash
grep -n "standard_agent\|event_agent\|inner_circle" "C:/Users/broac/CascadeProjects/The-Power100-Experience/tpe-backend/src/services/conciergeStateMachine.js"
```

**Verification:**
- [ ] `standard_agent` state exists
- [ ] `event_agent` state exists
- [ ] `inner_circle_agent` does NOT exist yet (we're adding it)
- [ ] Guards section has `hasActiveEvent` (we'll add `isInnerCircleMember` alongside it)

---

### Step 9: Verify Agent Files Exist

Confirm the agents we're modeling our new agent after are in place.

```bash
ls -la "C:/Users/broac/CascadeProjects/The-Power100-Experience/tpe-backend/src/services/agents/aiConciergeStandardAgent.js" "C:/Users/broac/CascadeProjects/The-Power100-Experience/tpe-backend/src/services/agents/aiConciergeEventAgent.js" 2>/dev/null
```

**Verification:**
- [ ] `aiConciergeStandardAgent.js` exists
- [ ] `aiConciergeEventAgent.js` exists
- [ ] `aiConciergeInnerCircleAgent.js` does NOT exist yet (we're creating it)

```bash
ls "C:/Users/broac/CascadeProjects/The-Power100-Experience/tpe-backend/src/services/agents/tools/" 2>/dev/null
```

**Verification:**
- [ ] Tools directory exists with existing tools
- [ ] `updateMemberProfileTool.js` does NOT exist yet
- [ ] `recommendContentTool.js` does NOT exist yet

---

### Step 10: Verify No Skills Directory Exists Yet

```bash
ls -la "C:/Users/broac/CascadeProjects/The-Power100-Experience/tpe-backend/src/skills/" 2>/dev/null
```

**Verification:**
- [ ] Skills directory does NOT exist yet (we're creating it)
- [ ] OR if it exists, verify no conflicts with our planned structure

---

### Step 11: Verify Server.js Route Registration Pattern

Confirm how routes are registered so we follow the same pattern.

```bash
grep -n "app.use.*Routes\|require.*Routes" "C:/Users/broac/CascadeProjects/The-Power100-Experience/tpe-backend/src/server.js" | head -20
```

**Verification:**
- [ ] Route registration pattern is `app.use('/api/...', require('./routes/...Routes'))`
- [ ] No existing `/api/inner-circle` or `/api/skills` routes registered
- [ ] Note the exact pattern for consistency when adding our routes

---

### Step 12: Verify NPM Dependencies

Check if `gray-matter` is already installed (for SKILL.md frontmatter parsing).

```bash
grep "gray-matter" "C:/Users/broac/CascadeProjects/The-Power100-Experience/tpe-backend/package.json" 2>/dev/null
```

**Verification:**
- [ ] If found: note version, no install needed
- [ ] If NOT found: `npm install gray-matter` needed during implementation

Check if `js-yaml` is already available (gray-matter may use it internally):
```bash
grep "js-yaml\|yaml" "C:/Users/broac/CascadeProjects/The-Power100-Experience/tpe-backend/package.json" 2>/dev/null
```

---

### Step 13: Verify Redis Availability (Rate Limiting)

Rate limiting per member uses Redis. Confirm it's available.

```bash
grep -i "redis" "C:/Users/broac/CascadeProjects/The-Power100-Experience/tpe-backend/.env" 2>/dev/null
```

**Verification:**
- [ ] Redis connection string/host is configured
- [ ] OR note that Redis setup is needed as part of implementation

---

### Step 14: Verify Environment Variables Pattern

Check how existing credentials are stored in .env files to follow the same pattern.

```bash
grep -c "DB_\|DATABASE_\|OPENAI_\|JWT_" "C:/Users/broac/CascadeProjects/The-Power100-Experience/tpe-backend/.env" 2>/dev/null
```

**Verification:**
- [ ] Database credentials are already in .env (not just in CLAUDE.md)
- [ ] OpenAI API key is in .env
- [ ] JWT secret is in .env
- [ ] Note: The security hardening step moves CLAUDE.md credentials to reference .env, not duplicate them

---

## Post-Migration Verification

**Run AFTER migrations are applied (Step 5 in Implementation Order):**

### Verify `inner_circle_members` Table Created

```bash
powershell -Command ".\quick-db.bat \"SELECT column_name, data_type, column_default FROM information_schema.columns WHERE table_name = 'inner_circle_members' ORDER BY ordinal_position;\""
```

**Expected:** 30 columns matching the migration definition

- [ ] All 30 columns exist
- [ ] `focus_areas` is JSONB with default `'[]'::jsonb`
- [ ] `membership_status` CHECK constraint is active
- [ ] `ai_` prefixed fields exist (auto-discoverable by aiKnowledgeService)
- [ ] Trigger `trigger_icm_updated_at` is active

### Verify `skill_definitions` Table Created

```bash
powershell -Command ".\quick-db.bat \"SELECT column_name, data_type, column_default FROM information_schema.columns WHERE table_name = 'skill_definitions' ORDER BY ordinal_position;\""
```

**Expected:** 13 columns matching the migration definition

- [ ] All 13 columns exist
- [ ] `context_type` CHECK constraint includes 'inner_circle', 'contractor', 'event', 'universal'
- [ ] `priority` CHECK constraint includes 'high', 'normal', 'low'
- [ ] `skill_content` is TEXT (stores the Markdown body)
- [ ] `seed_file_path` is VARCHAR (tracks filesystem origin)

### Verify `ai_concierge_sessions` Extension

```bash
powershell -Command ".\quick-db.bat \"SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'ai_concierge_sessions' AND column_name = 'member_id';\""
```

**Expected:**
```
 member_id | integer
```

- [ ] `member_id` column added successfully
- [ ] Index `idx_acs_member_id` exists

### Verify `ai_concierge_conversations` Extension

```bash
powershell -Command ".\quick-db.bat \"SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'ai_concierge_conversations' AND column_name = 'member_id';\""
```

**Expected:**
```
 member_id | integer
```

- [ ] `member_id` column added successfully

### Verify AI Schema Discovery

After migrations, force a schema refresh and confirm the new table is discoverable:

```bash
curl -X POST http://localhost:5000/api/ai-concierge/schema/refresh
```

Then check what the AI can see:

```bash
curl http://localhost:5000/api/ai-concierge/schema/summary
```

- [ ] `inner_circle_members` appears in the schema summary
- [ ] `ai_summary`, `ai_tags`, `ai_insights`, `ai_engagement_score` fields are auto-discovered

---

## Critical Corrections Found During Pre-Flight

### Correction 1: Table Name Mismatch

The Implementation Plan migration references `ai_concierge_messages` but the actual table is `ai_concierge_conversations`.

**Fix:** In `20260215_extend_sessions_for_members.sql`, change:
```sql
-- FROM:
IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'ai_concierge_messages') THEN
    ALTER TABLE ai_concierge_messages

-- TO:
IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'ai_concierge_conversations') THEN
    ALTER TABLE ai_concierge_conversations
```

### Correction 2: contractor_id Type Mismatch

In `ai_concierge_conversations`, `contractor_id` is `character varying` (not integer). The new `member_id` column should still be INTEGER (FK to inner_circle_members.id), but note this type inconsistency — the existing contractor_id stores a string, not an FK.

---

## Checklist Summary

| # | Check | Status |
|---|-------|--------|
| 1 | `ai_concierge_sessions` — 9 columns, no member_id yet | [ ] |
| 2 | `ai_concierge_conversations` — 7 columns, no member_id yet, contractor_id is VARCHAR | [ ] |
| 3 | No conflicting tables (inner_circle, skill, member, power_move) | [ ] |
| 4 | `contractors` — FK reference fields verified (id, email, focus_areas, revenue_tier, team_size) | [ ] |
| 5 | `entity_embeddings` — 12 columns with pgvector content_embedding | [ ] |
| 6 | pgvector extension installed (v0.8.1+) | [ ] |
| 7 | `contractor_event_registrations` — 9 columns, routing pattern confirmed | [ ] |
| 8 | XState: standard_agent + event_agent exist, no inner_circle_agent yet | [ ] |
| 9 | Agent files: Standard + Event exist, Inner Circle does not yet | [ ] |
| 10 | Skills directory does not exist yet | [ ] |
| 11 | Server.js route pattern confirmed, no conflicts | [ ] |
| 12 | NPM dependencies checked (gray-matter) | [ ] |
| 13 | Redis availability confirmed | [ ] |
| 14 | Environment variables pattern verified | [ ] |

**All checks must pass before proceeding to implementation.**
