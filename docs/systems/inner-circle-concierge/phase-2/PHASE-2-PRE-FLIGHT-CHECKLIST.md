# Phase 2 Pre-Flight Checklist — Inner Circle AI Concierge

**Date:** February 15, 2026
**Purpose:** Verify Phase 1 completion, existing infrastructure, and dependencies before implementing Phase 2
**Status:** MANDATORY — Must complete before any Phase 2 code changes
**Estimated Time:** 15-20 minutes

---

## CRITICAL: This Checklist is MANDATORY

**DO NOT SKIP THIS STEP**

Phase 2 builds directly on Phase 1. This checklist ensures:
1. Phase 1 tables (`inner_circle_members`, `skill_definitions`) exist and are functional
2. Phase 1 skills are seeded in the database
3. The Inner Circle Agent is operational
4. New Phase 2 tables won't conflict with existing schema
5. Bull queue / Redis infrastructure is operational for the heartbeat engine
6. Content tables (`video_content`, `podcast_episodes`) are ready for integration
7. No naming conflicts with planned new files

**Consequence of Skipping:** Broken migrations, missing dependencies, heartbeat engine failures

---

## Pre-Flight Checklist

### Step 1: Verify `inner_circle_members` Table (Phase 1 Dependency)

Phase 2 creates PowerMoves that FK to this table. Confirm it exists and has the required fields.

```bash
powershell -Command ".\quick-db.bat \"SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'inner_circle_members' AND column_name IN ('id', 'email', 'power_moves_completed', 'power_moves_active', 'power_moves_history', 'partner_recommendation_unlocked', 'onboarding_complete', 'focus_areas', 'ai_engagement_score') ORDER BY column_name;\""
```

**Expected Output:**
```
 ai_engagement_score             | numeric
 email                           | character varying
 focus_areas                     | jsonb
 id                              | integer
 onboarding_complete             | boolean
 partner_recommendation_unlocked | boolean
 power_moves_active              | jsonb
 power_moves_completed           | integer
 power_moves_history             | jsonb
```

**Verification:**
- [ ] Table exists with all 9 checked columns
- [ ] `power_moves_completed` is INTEGER (we'll increment this on completion)
- [ ] `power_moves_active` is JSONB (we'll append/remove PowerMove references)
- [ ] `power_moves_history` is JSONB (we'll move completed PowerMoves here)
- [ ] `partner_recommendation_unlocked` is BOOLEAN (we'll set true on PowerMove creation)
- [ ] `ai_engagement_score` is NUMERIC (we'll update this with engagement calculation)

---

### Step 2: Verify `skill_definitions` Table (Phase 1 Dependency)

Phase 2 seeds 3 new skills. Confirm the table exists and Phase 1 skills are loaded.

```bash
powershell -Command ".\quick-db.bat \"SELECT skill_name, context_type, priority, is_active FROM skill_definitions WHERE context_type = 'inner_circle' ORDER BY skill_name;\""
```

**Expected Output (Phase 1 skills):**
```
 inner_circle_general_guidance | inner_circle | normal | t
 inner_circle_onboarding       | inner_circle | high   | t
 partner_gating                | inner_circle | high   | t
```

**Verification:**
- [ ] `skill_definitions` table exists
- [ ] 3 Phase 1 skills are seeded and active
- [ ] `powermove_coaching` does NOT exist yet (we're adding it)
- [ ] `content_recommendation` does NOT exist yet (we're adding it)
- [ ] `proactive_engagement` does NOT exist yet (we're adding it)

---

### Step 3: Verify No Conflicting Tables Exist

Our migrations create `power_moves` and `power_move_checkins`. Confirm they don't already exist.

```bash
powershell -Command ".\quick-db.bat \"SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND (table_name LIKE '%power_move%' OR table_name LIKE '%checkin%') ORDER BY table_name;\""
```

**Expected Output:**
```
(0 rows)
```

**Verification:**
- [ ] No `power_moves` table exists
- [ ] No `power_move_checkins` table exists
- [ ] No other conflicting tables

---

### Step 4: Verify Inner Circle Agent is Functional

Confirm the Phase 1 agent file exists and is wired up.

```bash
ls -la "C:/Users/broac/CascadeProjects/The-Power100-Experience/tpe-backend/src/services/agents/aiConciergeInnerCircleAgent.js" 2>/dev/null
```

**Verification:**
- [ ] `aiConciergeInnerCircleAgent.js` exists
- [ ] File is non-empty

```bash
grep -n "inner_circle" "C:/Users/broac/CascadeProjects/The-Power100-Experience/tpe-backend/src/services/conciergeStateMachine.js"
```

**Verification:**
- [ ] `inner_circle_agent` state exists in state machine
- [ ] `isInnerCircleMember` guard exists

---

### Step 5: Verify Existing Agent Tools Directory

Confirm our new tools won't conflict with existing files.

```bash
ls "C:/Users/broac/CascadeProjects/The-Power100-Experience/tpe-backend/src/services/agents/tools/" 2>/dev/null
```

**Verification:**
- [ ] Tools directory exists with existing tools
- [ ] `managePowerMoveTool.js` does NOT exist yet (we're creating it)
- [ ] `powerMoveCheckinTool.js` does NOT exist yet (we're creating it)

---

### Step 6: Verify Bull Queue Infrastructure

Phase 2's heartbeat engine uses BullMQ. Confirm the package is installed and the queue pattern is available.

```bash
grep "bullmq\|ioredis" "C:/Users/broac/CascadeProjects/The-Power100-Experience/tpe-backend/package.json"
```

**Expected Output:**
```
    "bullmq": "^5.61.0",
    "ioredis": "^5.8.1",
```

**Verification:**
- [ ] `bullmq` is installed (v5.61.0+)
- [ ] `ioredis` is installed (v5.8.1+)

---

### Step 7: Verify Redis Availability

The heartbeat engine and rate limiting use Redis. Confirm it's accessible.

```bash
grep -i "REDIS" "C:/Users/broac/CascadeProjects/The-Power100-Experience/tpe-backend/.env" 2>/dev/null
```

**Verification:**
- [ ] `REDIS_HOST` is set (or defaults to localhost)
- [ ] `REDIS_PORT` is set (or defaults to 6379)
- [ ] OR note that Redis uses defaults (localhost:6379, no password)

**Existing Queue Pattern (to follow):**
```javascript
const { Queue } = require('bullmq');
const Redis = require('ioredis');

const redisConnection = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  }
});
```

**Queue files to reference for pattern consistency:**
- `tpe-backend/src/queues/powerCardQueue.js`
- `tpe-backend/src/queues/proactiveMessageQueue.js`
- `tpe-backend/src/queues/followUpQueue.js`
- `tpe-backend/src/queues/eventOrchestrationQueue.js`

---

### Step 8: Verify Existing Queue Initialization Pattern

Confirm how queues are registered in server.js so we follow the same pattern.

```bash
grep -n "require.*Queue\|require.*queue\|initialize.*Scheduler\|initialize.*Processor" "C:/Users/broac/CascadeProjects/The-Power100-Experience/tpe-backend/src/server.js" | head -10
```

**Verification:**
- [ ] Queues are initialized via `require` + initialization function call in server.js
- [ ] Pattern is: `const { initializeFooScheduler } = require('./queues/fooQueue');`
- [ ] No existing `heartbeat` queue registered

---

### Step 9: Verify `video_content` Table (Content Architecture)

Verify existing table structure and AI fields. We'll be adding `show_id`, `featured_names`, and `episode_number`.

```bash
powershell -Command ".\quick-db.bat \"SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'video_content' AND column_name IN ('id', 'title', 'description', 'video_type', 'ai_summary', 'ai_insights', 'ai_key_topics', 'ai_engagement_score', 'is_active') ORDER BY column_name;\""
```

**Expected Output:**
```
 ai_engagement_score | numeric
 ai_insights         | jsonb
 ai_key_topics       | jsonb
 ai_summary          | text
 description         | text
 id                  | integer
 is_active           | boolean
 title               | character varying
 video_type          | character varying
```

**Verification:**
- [ ] `video_content` table exists with AI fields
- [ ] `video_type` currently holds `demo` and `partner_demo` (verified)
- [ ] `show_id` does NOT exist yet (we're adding it)
- [ ] `featured_names` does NOT exist yet (we're adding it)
- [ ] `episode_number` does NOT exist yet (we're adding it)

Check existing video_type values to confirm no conflicts:
```bash
powershell -Command ".\quick-db.bat \"SELECT DISTINCT video_type, COUNT(*) FROM video_content GROUP BY video_type;\""
```

- [ ] Only `demo` and `partner_demo` exist (no conflicts with new types like `episode`)

---

### Step 10: Verify `podcast_episodes` Table (Content Architecture)

We'll be adding a FK constraint on the existing `show_id` column and 6 AI fields.

```bash
powershell -Command ".\quick-db.bat \"SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'podcast_episodes' ORDER BY ordinal_position;\""
```

**Expected Output (12 columns — no AI fields yet):**
```
 id                | integer
 show_id           | integer
 episode_number    | integer
 title             | character varying
 description       | text
 audio_url         | text
 duration_seconds  | integer
 publish_date      | date
 guest_names       | ARRAY
 transcript_status | character varying
 file_size_mb      | numeric
 created_at        | timestamp without time zone
```

**Verification:**
- [ ] `podcast_episodes` table exists with 12 columns
- [ ] `show_id` column exists (INTEGER, no FK constraint yet)
- [ ] `guest_names` is ARRAY type (already supports name filtering for podcasts)
- [ ] `ai_summary` does NOT exist yet (we're adding it)
- [ ] `ai_insights` does NOT exist yet (we're adding it)
- [ ] `ai_key_topics` does NOT exist yet (we're adding it)

Check existing show_id values:
```bash
powershell -Command ".\quick-db.bat \"SELECT DISTINCT show_id FROM podcast_episodes;\""
```

- [ ] Note existing show_id values (currently show_id=1)
- [ ] These will need to be mapped to the new `shows` table after migration

---

### Step 11: Verify No Conflicting `shows` Table Exists

```bash
powershell -Command ".\quick-db.bat \"SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'shows';\""
```

**Expected Output:**
```
(0 rows)
```

- [ ] No `shows` table exists yet

---

### Step 11B: Verify No Conflicting `member_watch_history` Table Exists

```bash
powershell -Command ".\quick-db.bat \"SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'member_watch_history';\""
```

**Expected Output:**
```
(0 rows)
```

- [ ] No `member_watch_history` table exists yet

---

### Step 12: Verify `entity_embeddings` Table (Hybrid Search Readiness)

Content recommendations use hybrid search. Verify embeddings exist for content.

```bash
powershell -Command ".\quick-db.bat \"SELECT entity_type, COUNT(*) as count FROM entity_embeddings GROUP BY entity_type ORDER BY entity_type;\""
```

**Expected Output:**
```
 book              | [count]
 event             | [count]
 podcast           | [count]
 strategic_partner | [count]
```

**Verification:**
- [ ] `entity_embeddings` table has data
- [ ] `podcast` entity type has embeddings
- [ ] No `video` entity type yet — content ingestion pipeline will add these
- [ ] Note: new show content will need embeddings generated via contentIngestionService

---

### Step 12B: Verify Member Content Engagement Strategy

Member content tracking uses `inner_circle_members.content_interactions` (JSONB field from Phase 1), NOT the `contractor_content_engagement` table.

```bash
powershell -Command ".\quick-db.bat \"SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'inner_circle_members' AND column_name = 'content_interactions';\""
```

**Expected Output:**
```
 content_interactions | jsonb
```

- [ ] `content_interactions` JSONB field exists on `inner_circle_members`
- [ ] This is where member content engagement data will be stored (no need to extend `contractor_content_engagement`)

---

### Step 13: Verify Hybrid Search Service

Confirm the search service we'll use for content recommendations is available.

```bash
ls -la "C:/Users/broac/CascadeProjects/The-Power100-Experience/tpe-backend/src/services/hybridSearchService.js" 2>/dev/null
```

**Verification:**
- [ ] `hybridSearchService.js` exists

```bash
grep -n "searchPodcasts\|searchBooks\|search(" "C:/Users/broac/CascadeProjects/The-Power100-Experience/tpe-backend/src/services/hybridSearchService.js" | head -10
```

- [ ] `search()` method exists (main hybrid search)
- [ ] `searchPodcasts()` method exists (podcast-specific)
- [ ] `searchBooks()` method exists (book-specific)
- [ ] Default weights: BM25 40%, Vector 60%

---

### Step 14: Verify `scheduleFollowupTool` Pattern (Heartbeat Integration)

The heartbeat service uses the follow-up tool to schedule proactive outreach. Verify it's available and supports the follow-up types we need.

```bash
grep -n "followup_type\|check_in\|reminder\|offer_help\|resource_recommendation" "C:/Users/broac/CascadeProjects/The-Power100-Experience/tpe-backend/src/services/agents/tools/scheduleFollowupTool.js" | head -15
```

**Verification:**
- [ ] `scheduleFollowupTool.js` exists
- [ ] Supports `check_in` type (for weekly PowerMove check-ins)
- [ ] Supports `reminder` type (for deadline reminders)
- [ ] Supports `offer_help` type (for re-engagement)
- [ ] Supports `resource_recommendation` type (for content suggestions)

**IMPORTANT:** The existing tool uses `contractorId` parameter. The heartbeat engine for Inner Circle will need to either:
1. Extend the tool to accept `memberId` alongside `contractorId`
2. Or create a member-specific version

Check the tool's parameter schema:
```bash
grep -A 3 "contractorId" "C:/Users/broac/CascadeProjects/The-Power100-Experience/tpe-backend/src/services/agents/tools/scheduleFollowupTool.js" | head -5
```

- [ ] Note: `contractorId` is currently required (`z.number().int().positive()`)
- [ ] Decision needed: Add optional `memberId` parameter or create separate tool

---

### Step 15: Verify Skill Seed Directory Exists

Confirm the skills directory from Phase 1 is in place for new Phase 2 skill files.

```bash
ls "C:/Users/broac/CascadeProjects/The-Power100-Experience/tpe-backend/src/skills/inner-circle/" 2>/dev/null
```

**Expected:** Directories for Phase 1 skills (onboarding, general-guidance, partner-gating)

**Verification:**
- [ ] `tpe-backend/src/skills/inner-circle/` directory exists
- [ ] Phase 1 skill directories are present
- [ ] `powermove-coaching/` does NOT exist yet (we're creating it)
- [ ] `content-recommendation/` does NOT exist yet (we're creating it)
- [ ] `proactive-engagement/` does NOT exist yet (we're creating it)

---

### Step 16: Verify `memberScopedQuery` Service Exists (Phase 1 Dependency)

All Phase 2 tools use member-scoped queries. Confirm the service from Phase 1 is available.

```bash
ls -la "C:/Users/broac/CascadeProjects/The-Power100-Experience/tpe-backend/src/services/memberScopedQuery.js" 2>/dev/null
```

**Verification:**
- [ ] `memberScopedQuery.js` exists
- [ ] Service exports a query function that enforces `member_id` in WHERE clauses

---

### Step 17: Verify `laneQueue` Service Exists (Phase 1 Dependency)

Phase 2 heartbeat uses the 'cron' lane. Confirm the lane queue is operational.

```bash
ls -la "C:/Users/broac/CascadeProjects/The-Power100-Experience/tpe-backend/src/services/laneQueue.js" 2>/dev/null
```

**Verification:**
- [ ] `laneQueue.js` exists
- [ ] Exports `enqueueInLane`, `CommandLane`
- [ ] `CommandLane.Cron` lane is defined (used by heartbeat)

---

## Post-Migration Verification

**Run AFTER Phase 2 migrations are applied:**

### Verify `power_moves` Table Created

```bash
powershell -Command ".\quick-db.bat \"SELECT column_name, data_type, column_default FROM information_schema.columns WHERE table_name = 'power_moves' ORDER BY ordinal_position;\""
```

**Expected:** ~25 columns matching the migration definition

- [ ] All columns exist
- [ ] `pillar` CHECK constraint is active (growth, culture, community, innovation)
- [ ] `status` CHECK constraint is active (draft, active, in_progress, completed, expired, abandoned)
- [ ] `member_id` FK references `inner_circle_members(id)`
- [ ] `action_steps` is JSONB with default `'[]'::jsonb`
- [ ] `target_date` is TIMESTAMP NOT NULL
- [ ] Trigger `trigger_pm_updated_at` is active

### Verify `power_move_checkins` Table Created

```bash
powershell -Command ".\quick-db.bat \"SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'power_move_checkins' ORDER BY ordinal_position;\""
```

**Expected:** ~13 columns matching the migration definition

- [ ] All columns exist
- [ ] `checkin_source` CHECK constraint is active (concierge, member_initiated, heartbeat)
- [ ] `power_move_id` FK references `power_moves(id)`
- [ ] `member_id` FK references `inner_circle_members(id)`

### Verify `shows` Table Created and Seeded

```bash
powershell -Command ".\quick-db.bat \"SELECT id, name, slug, hosts, format FROM shows ORDER BY id;\""
```

**Expected:** 3 seeded shows
```
 1 | PowerChat                          | powerchat          | Greg        | video_podcast
 2 | Inner Circle with Greg & Paul      | inner-circle       | Greg & Paul | live_session
 3 | Outside The Lines with Ray & Greg  | outside-the-lines  | Ray & Greg  | video_podcast
```

- [ ] All 3 shows exist with correct slugs and formats
- [ ] Slugs match WordPress `/show/{slug}/` paths

### Verify `video_content` Extensions Applied

```bash
powershell -Command ".\quick-db.bat \"SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'video_content' AND column_name IN ('show_id', 'featured_names', 'episode_number') ORDER BY column_name;\""
```

**Expected:**
```
 episode_number | integer
 featured_names | ARRAY
 show_id        | integer
```

- [ ] `show_id` column exists with FK to `shows(id)`
- [ ] `featured_names` is TEXT ARRAY
- [ ] `episode_number` is INTEGER
- [ ] Existing data unchanged (all new columns are nullable)

### Verify `podcast_episodes` Extensions Applied

```bash
powershell -Command ".\quick-db.bat \"SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'podcast_episodes' AND column_name IN ('ai_summary', 'ai_insights', 'ai_key_topics', 'ai_engagement_score', 'ai_processing_status', 'last_ai_analysis') ORDER BY column_name;\""
```

**Expected:** 6 new AI fields
```
 ai_engagement_score  | numeric
 ai_insights          | jsonb
 ai_key_topics        | jsonb
 ai_processing_status | character varying
 ai_summary           | text
 last_ai_analysis     | timestamp without time zone
```

- [ ] All 6 AI fields added
- [ ] FK constraint exists on `show_id` → `shows(id)`
- [ ] Existing podcast data unchanged

### Verify `member_watch_history` Table Created

```bash
powershell -Command ".\quick-db.bat \"SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'member_watch_history' ORDER BY ordinal_position;\""
```

**Expected:** ~14 columns matching the migration definition
```
 id                       | integer
 member_id                | integer
 content_id               | integer
 content_type             | character varying
 show_id                  | integer
 watch_progress           | integer
 total_watch_time_seconds | integer
 watch_count              | integer
 completed                | boolean
 source                   | character varying
 first_watched_at         | timestamp without time zone
 last_watched_at          | timestamp without time zone
 created_at               | timestamp without time zone
 updated_at               | timestamp without time zone
```

- [ ] All columns exist
- [ ] `member_id` FK references `inner_circle_members(id)`
- [ ] `show_id` FK references `shows(id)` (nullable)
- [ ] `source` CHECK constraint active (portal, concierge_recommendation, direct_link, email_link)
- [ ] UNIQUE constraint on `(member_id, content_id, content_type)` for UPSERT
- [ ] Trigger `trigger_mwh_updated_at` is active

---

### Verify Existing `show_id` Values Map Correctly

```bash
powershell -Command ".\quick-db.bat \"SELECT pe.id, pe.title, pe.show_id, s.name as show_name FROM podcast_episodes pe LEFT JOIN shows s ON pe.show_id = s.id;\""
```

- [ ] Existing episodes with `show_id = 1` either map to a show or need reassignment
- [ ] NOTE: Existing `show_id = 1` may need to be updated — it predates the `shows` table. Decide whether TPX industry podcasts get their own show entry or `show_id` is set to NULL.

### Verify Phase 2 Skills Seeded

```bash
powershell -Command ".\quick-db.bat \"SELECT skill_name, context_type, priority, is_active FROM skill_definitions WHERE context_type = 'inner_circle' ORDER BY skill_name;\""
```

**Expected:** 6 skills total (3 Phase 1 + 3 Phase 2)
```
 content_recommendation           | inner_circle | normal | t
 inner_circle_general_guidance    | inner_circle | normal | t
 inner_circle_onboarding          | inner_circle | high   | t
 partner_gating                   | inner_circle | high   | t
 powermove_coaching               | inner_circle | high   | t
 proactive_engagement             | inner_circle | normal | t
```

- [ ] All 6 skills present and active
- [ ] `powermove_coaching` has priority 'high'

### Verify Heartbeat Queue Registered

After server restart, check that the heartbeat queue is initialized:

```bash
grep -n "heartbeat" "C:/Users/broac/CascadeProjects/The-Power100-Experience/tpe-backend/src/server.js"
```

- [ ] Heartbeat queue is imported and initialized in server.js

---

## Critical Decisions to Make During Implementation

### Decision 1: `scheduleFollowupTool` — Extend or Duplicate?

The existing `scheduleFollowupTool` requires `contractorId` (integer, positive, required). The heartbeat engine needs to schedule follow-ups for Inner Circle members.

**Options:**
- **A) Extend existing tool** — Add optional `memberId` parameter, make `contractorId` optional (when memberId is provided). Updates the `contractor_followup_schedules` table which may need a `member_id` column.
- **B) Create member-specific tool** — New `scheduleMemberFollowupTool.js` with its own table or using the same table with member_id extension.

**Recommendation:** Option A — extend the existing tool. Add `member_id` column to `contractor_followup_schedules` (same pattern as sessions table). Keeps one scheduling system, not two.

### Decision 2: Existing `show_id = 1` in `podcast_episodes`

The existing TPX industry podcast has `show_id = 1`, which predates the `shows` table. After migration:

**Options:**
- **A) Create a "TPX Industry Podcasts" show entry** — Insert into `shows` table so the FK maps cleanly. Maintains data integrity.
- **B) Set existing `show_id` to NULL** — Treat TPX podcasts as non-show content. Requires an UPDATE.

**Recommendation:** Option A — create a show entry for TPX industry podcasts. It's real content with a real identity, and it keeps the FK clean.

---

## Checklist Summary

| # | Check | Status |
|---|-------|--------|
| 1 | `inner_circle_members` — 9 key fields verified (Phase 1 complete) | [ ] |
| 2 | `skill_definitions` — 3 Phase 1 skills seeded, no Phase 2 skills yet | [ ] |
| 3 | No conflicting tables (`power_moves`, `power_move_checkins`) | [ ] |
| 4 | Inner Circle Agent exists and is wired to state machine | [ ] |
| 5 | Agent tools directory — no naming conflicts | [ ] |
| 6 | BullMQ + ioredis packages installed | [ ] |
| 7 | Redis accessible (localhost:6379 or configured) | [ ] |
| 8 | Queue initialization pattern confirmed in server.js | [ ] |
| 9 | `video_content` — AI fields exist, no `show_id`/`featured_names` yet | [ ] |
| 10 | `podcast_episodes` — 12 columns, no AI fields yet, `show_id` exists without FK | [ ] |
| 11 | No `shows` table exists yet | [ ] |
| 11B | No `member_watch_history` table exists yet | [ ] |
| 12 | `entity_embeddings` — has data, note entity types | [ ] |
| 12B | `content_interactions` JSONB field exists on `inner_circle_members` | [ ] |
| 13 | `hybridSearchService.js` — search methods available | [ ] |
| 14 | `scheduleFollowupTool` — uses contractorId, extension decision needed | [ ] |
| 15 | Skill seed directory exists for Phase 2 skills | [ ] |
| 16 | `memberScopedQuery.js` exists (Phase 1) | [ ] |
| 17 | `laneQueue.js` exists with Cron lane (Phase 1) | [ ] |

**All checks must pass before proceeding to Phase 2 implementation.**
