# Phase 3: Pre-Flight Checklist for File Creation

**Document Version:** 1.0
**Date:** October 14, 2025
**Status:** MANDATORY - Use before creating or modifying ANY file

---

## 🎯 Purpose

This checklist ensures 100% database alignment for every file we create or modify during Phase 3 implementation (Observability & Guardrails). Following this prevents naming mismatches and constraint violations when implementing LangSmith tracing, AI Action Guards, and monitoring features.

---

## ✅ MANDATORY CHECKLIST - Before Creating/Modifying ANY File

### Step 1: Identify Database Tables Involved

**Question:** What database tables will this file interact with?

**Phase 3 Common Tables:**
- **Tracing & Logging:** `ai_interactions`, `ai_concierge_sessions`
- **Guards & Permissions:** `contractors`, `contractor_action_items`
- **Monitoring:** `ai_interactions`, `contractor_action_items`, `contractors`
- **Analytics:** `ai_interactions`, `ai_metadata`

**Example:**
- Guard file: `contractors`, `contractor_action_items`, `ai_interactions`
- Tracer file: `ai_interactions`, `ai_concierge_sessions`
- Monitoring controller: `ai_interactions`, `contractor_action_items`, `contractors`

**Action:** List all tables this file will query, insert, update, or reference.

---

### Step 2: Verify Column Names (Field Names)

**For EACH table identified in Step 1:**

```bash
# Run this command for EACH table:
powershell -Command ".\quick-db.bat \"SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'TABLE_NAME' ORDER BY ordinal_position;\""
```

**Action:** Document exact column names from database output.

**Phase 3 Key Tables - Verified October 14, 2025:**

#### ai_interactions (8 columns)
```
column_name          | data_type
---------------------|----------
id                   | integer
contractor_id        | integer
interaction_type     | character varying
interaction_data     | jsonb
user_message         | text
ai_response          | text
satisfaction_rating  | integer
created_at           | timestamp without time zone
```

#### contractor_action_items (27 columns)
```
column_name                  | data_type
-----------------------------|----------
id                           | integer
contractor_id                | integer (NOT NULL)
event_id                     | integer
title                        | character varying (NOT NULL)
description                  | text
action_type                  | character varying (NOT NULL)
priority                     | integer (NOT NULL)
contractor_priority          | integer
ai_suggested_priority        | integer
due_date                     | date
reminder_time                | timestamp without time zone
status                       | character varying
completed_at                 | timestamp without time zone
cancelled_reason             | text
related_partner_id           | integer
related_peer_contractor_id   | integer
related_speaker_id           | integer
related_sponsor_id           | integer
related_note_id              | integer
related_demo_booking_id      | integer
ai_generated                 | boolean
ai_reasoning                 | text
extraction_confidence        | numeric
source_message_id            | integer
conversation_context         | jsonb
created_at                   | timestamp without time zone
updated_at                   | timestamp without time zone
```

#### contractors (AI-related fields)
```
column_name                  | data_type
-----------------------------|----------
id                           | integer
email                        | character varying (NOT NULL, UNIQUE)
company_name                 | character varying
has_ai_access                | boolean
ai_coach_opt_in              | boolean
opted_in_coaching            | boolean
ai_summary                   | text
ai_tags                      | jsonb
ai_quality_score             | integer
ai_insights                  | jsonb
last_ai_analysis             | timestamp without time zone
engagement_score             | integer
churn_risk                   | integer
growth_potential             | integer
next_best_action             | text
lifecycle_stage              | character varying
communication_preferences    | jsonb
learning_preferences         | jsonb
business_goals               | jsonb
current_challenges           | jsonb
```

#### ai_concierge_sessions (9 columns)
```
column_name          | data_type
---------------------|----------
id                   | integer
contractor_id        | integer
session_id           | character varying (UNIQUE)
session_type         | character varying
session_status       | character varying
session_data         | text
started_at           | timestamp without time zone
ended_at             | timestamp without time zone
duration_minutes     | integer
```

**What to Check:**
- ✅ Exact spelling (snake_case vs camelCase)
- ✅ Underscores vs no underscores
- ✅ Singular vs plural
- ✅ **Phase 3 Critical:** `ai_generated` NOT `ai_created`, `interaction_type` NOT `interactionType`

---

### Step 3: Verify CHECK Constraints

**For tables with enum-like fields (status, type, category, etc.):**

```bash
# Run this command for EACH table with enum fields:
powershell -Command ".\quick-db.bat \"SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'TABLE_NAME'::regclass AND contype = 'c';\""
```

**Action:** Document exact allowed values from CHECK constraints.

**Phase 3 Critical Constraints - Verified October 14, 2025:**

#### ai_concierge_sessions
```bash
powershell -Command ".\quick-db.bat \"SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'ai_concierge_sessions'::regclass AND contype = 'c';\""
```

**Expected Constraints:**
- `session_type`: Likely CHECK IN ('standard', 'event', 'chat') - **VERIFY THIS!**
- `session_status`: Likely CHECK IN ('active', 'completed', 'ended') - **VERIFY THIS!**

#### contractor_action_items
```bash
powershell -Command ".\quick-db.bat \"SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'contractor_action_items'::regclass AND contype = 'c';\""
```

**Expected Constraints:**
- `status`: Likely CHECK IN ('pending', 'in_progress', 'completed', 'cancelled') - **VERIFY THIS!**
- `action_type`: Likely CHECK IN (various action types) - **VERIFY THIS!**

**What to Check:**
- ✅ Exact enum values (case-sensitive!)
- ✅ All allowed values (don't assume!)
- ✅ **Phase 3 Critical:** Guard checks MUST use exact constraint values

---

### Step 4: Verify Foreign Key Constraints

**For tables with relationships:**

```bash
# Run this command to see foreign keys:
powershell -Command ".\quick-db.bat \"SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'TABLE_NAME'::regclass AND contype = 'f';\""
```

**Action:** Document which fields reference other tables.

**Phase 3 Key Foreign Keys - Verified October 14, 2025:**

#### ai_concierge_sessions
```
conname                              | pg_get_constraintdef
-------------------------------------|--------------------
ai_coach_sessions_contractor_id_fkey | FOREIGN KEY (contractor_id) REFERENCES contractors(id) ON DELETE CASCADE
```

#### ai_interactions (Expected - VERIFY!)
```
Expected: contractor_id → contractors(id)
```

#### contractor_action_items (Expected - VERIFY!)
```
Expected:
- contractor_id → contractors(id) (NOT NULL)
- event_id → events(id) (NULL allowed)
- related_partner_id → strategic_partners(id) (NULL allowed)
```

**What to Check:**
- ✅ Which fields are foreign keys
- ✅ Which tables they reference
- ✅ If the reference is required (NOT NULL) or optional (NULL allowed)
- ✅ **Phase 3 Critical:** Guards must check FK existence before insert

---

### Step 5: Check Data Types (Especially JSON/JSONB)

**From Step 2 output, identify:**
- TEXT vs VARCHAR
- INTEGER vs BIGINT
- TIMESTAMP vs TIMESTAMPTZ
- **JSON vs JSONB** (most important!)
- BOOLEAN fields
- NUMERIC fields (for scores/confidence)

**Phase 3 Critical Data Types:**

| Field                     | Type      | Notes                                    |
|---------------------------|-----------|------------------------------------------|
| `interaction_data`        | JSONB     | No stringify needed, already JSON        |
| `conversation_context`    | JSONB     | No stringify needed, already JSON        |
| `ai_tags`                 | JSONB     | No stringify needed, already JSON        |
| `ai_insights`             | JSONB     | No stringify needed, already JSON        |
| `ai_reasoning`            | TEXT      | Plain text reasoning                     |
| `ai_generated`            | BOOLEAN   | Use `true`/`false` NOT `'true'`/`'false'` |
| `extraction_confidence`   | NUMERIC   | Use decimal numbers (0.0-1.0 or 0-100)  |
| `has_ai_access`           | BOOLEAN   | Guard check field                        |
| `ai_coach_opt_in`         | BOOLEAN   | Guard check field                        |

**Action:** Ensure code uses correct data types.

**Common Issues:**
- ❌ Using `JSON.stringify()` on JSONB field (already JSON in DB)
- ❌ Storing boolean as string: `'true'` instead of `true`
- ❌ Not parsing TEXT that contains JSON string
- ❌ Using wrong date format for TIMESTAMP fields

---

### Step 6: Document Findings BEFORE Coding

**Create a verification block at the top of the file:**

```javascript
// DATABASE-CHECKED: [table_names] columns verified [date]
// ================================================================
// VERIFIED CONSTRAINTS:
// - table_name.field_name: CHECK IN ('value1', 'value2', 'value3')
// - table_name.status: CHECK IN ('active', 'inactive')
// ================================================================
// VERIFIED FIELD NAMES:
// - field_one (NOT fieldOne, NOT field1)
// - another_field (NOT anotherField)
// ================================================================
// VERIFIED DATA TYPES:
// - jsonb_field: JSONB (do NOT stringify)
// - boolean_field: BOOLEAN (use true/false NOT 'true'/'false')
// ================================================================
```

**Phase 3 Example (AI Action Guards):**
```javascript
// DATABASE-CHECKED: contractor_action_items, contractors, ai_interactions verified October 14, 2025
// ================================================================
// VERIFIED CONSTRAINTS:
// - contractor_action_items.status: CHECK IN ('pending', 'in_progress', 'completed', 'cancelled')
// - contractor_action_items.action_type: (verify specific values before using)
// ================================================================
// VERIFIED FIELD NAMES:
// - contractor_id (NOT contractorId)
// - ai_generated (NOT ai_created, NOT aiGenerated)
// - extraction_confidence (NOT extractionConfidence)
// - interaction_type (NOT interactionType)
// - interaction_data (NOT interactionData)
// ================================================================
// VERIFIED DATA TYPES:
// - contractor_action_items.ai_generated: BOOLEAN (use true/false)
// - contractor_action_items.conversation_context: JSONB (do NOT stringify)
// - ai_interactions.interaction_data: JSONB (do NOT stringify)
// - contractors.has_ai_access: BOOLEAN (use true/false)
// ================================================================
```

**Phase 3 Example (OpenAI Tracer):**
```javascript
// DATABASE-CHECKED: ai_interactions columns verified October 14, 2025
// ================================================================
// VERIFIED FIELD NAMES:
// - contractor_id (NOT contractorId)
// - interaction_type (NOT interactionType)
// - interaction_data (NOT interactionData)
// - user_message (NOT userMessage)
// - ai_response (NOT aiResponse)
// ================================================================
// VERIFIED DATA TYPES:
// - interaction_data: JSONB (store token usage, duration, status as JSON object)
// - user_message: TEXT
// - ai_response: TEXT
// - created_at: TIMESTAMP (use NOW() or new Date())
// ================================================================
```

---

### Step 7: Verify BOTH Development AND Production

**IMPORTANT:** Check that both environments have the same constraints!

```bash
# Development:
powershell -Command ".\quick-db.bat \"SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conname = 'CONSTRAINT_NAME';\""

# Production:
# Use mcp__aws-production__exec tool with same query
```

**Phase 3 Specific Checks:**
1. Verify `ai_interactions` table exists in production
2. Verify `contractor_action_items` table exists in production
3. Verify constraints match between dev and prod
4. Verify foreign keys match between dev and prod

**Action:** Confirm both environments match before implementing guards.

---

## 🚨 Red Flags - STOP and Verify

If you see ANY of these in Phase 3, STOP and run verification queries:

1. **Writing guard check results** → Verify `interaction_type` naming
   ```javascript
   interaction_type: 'guard_check_create_action_item'  // ⚠️ STOP! Verify naming convention
   ```

2. **Storing JSON in interaction_data** → Verify it's JSONB, not TEXT
   ```javascript
   interaction_data: JSON.stringify({ allowed: true })  // ⚠️ STOP! JSONB doesn't need stringify
   ```

3. **Setting ai_generated flag** → Verify it's BOOLEAN type
   ```javascript
   ai_generated: 'true'  // ⚠️ WRONG! Should be: ai_generated: true
   ```

4. **Checking contractor permissions** → Verify exact field names
   ```javascript
   contractor.aiAccess  // ⚠️ STOP! Is it has_ai_access or ai_access?
   ```

5. **Writing action item status** → Verify CHECK constraint
   ```javascript
   status: 'active'  // ⚠️ STOP! Is 'active' valid for action items? Or is it 'pending'?
   ```

6. **Rate limiting checks** → Verify interaction_type pattern
   ```javascript
   interaction_type: 'action_item_create'  // ⚠️ STOP! Verify exact naming pattern
   ```

---

## 📋 Quick Reference Commands

### Check All Columns
```bash
powershell -Command ".\quick-db.bat \"SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'TABLE_NAME' ORDER BY ordinal_position;\""
```

### Check All Constraints
```bash
powershell -Command ".\quick-db.bat \"SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'TABLE_NAME'::regclass;\""
```

### Check CHECK Constraints Only
```bash
powershell -Command ".\quick-db.bat \"SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'TABLE_NAME'::regclass AND contype = 'c';\""
```

### Check Foreign Keys Only
```bash
powershell -Command ".\quick-db.bat \"SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'TABLE_NAME'::regclass AND contype = 'f';\""
```

### List All AI-Related Tables
```bash
powershell -Command ".\quick-db.bat \"SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND (table_name LIKE '%ai%' OR table_name LIKE '%action%') ORDER BY table_name;\""
```

### Check Specific Constraint
```bash
powershell -Command ".\quick-db.bat \"SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conname = 'CONSTRAINT_NAME';\""
```

---

## ✅ Example: Creating aiActionGuards.js

### Pre-Flight Verification:

**1. Tables Involved:**
- `contractors`
- `contractor_action_items`
- `ai_interactions`
- `strategic_partners` (for partner access checks)
- `contractor_partner_matches` (for partner access checks)

**2. Column Names Verified:**
```sql
-- contractors columns (AI fields):
id, email, company_name, has_ai_access, ai_coach_opt_in, opted_in_coaching,
ai_summary, ai_tags, ai_quality_score, ai_insights, last_ai_analysis

-- contractor_action_items columns:
id, contractor_id, event_id, title, description, action_type, priority,
contractor_priority, ai_suggested_priority, due_date, reminder_time, status,
completed_at, cancelled_reason, related_partner_id, related_peer_contractor_id,
related_speaker_id, related_sponsor_id, related_note_id, related_demo_booking_id,
ai_generated, ai_reasoning, extraction_confidence, source_message_id,
conversation_context, created_at, updated_at

-- ai_interactions columns:
id, contractor_id, interaction_type, interaction_data, user_message,
ai_response, satisfaction_rating, created_at
```

**3. CHECK Constraints Verified:**
```bash
# Run verification:
powershell -Command ".\quick-db.bat \"SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'contractor_action_items'::regclass AND contype = 'c';\""

# Document results:
# contractor_action_items.status: CHECK IN ('pending', 'in_progress', 'completed', 'cancelled')
# contractor_action_items.action_type: (verify specific values)
```

**4. Foreign Keys Verified:**
```sql
-- contractor_action_items:
FOREIGN KEY (contractor_id) REFERENCES contractors(id) -- NOT NULL
FOREIGN KEY (event_id) REFERENCES events(id) -- NULL allowed
FOREIGN KEY (related_partner_id) REFERENCES strategic_partners(id) -- NULL allowed

-- ai_interactions:
FOREIGN KEY (contractor_id) REFERENCES contractors(id) -- Verify nullability
```

**5. Data Types Noted:**
- `has_ai_access`: BOOLEAN (use `true`/`false` NOT `'true'`/`'false'`)
- `ai_coach_opt_in`: BOOLEAN (use `true`/`false` NOT `'true'`/`'false'`)
- `ai_generated`: BOOLEAN (use `true`/`false` NOT `'true'`/`'false'`)
- `interaction_data`: JSONB (no need to stringify, already JSON)
- `conversation_context`: JSONB (no need to stringify, already JSON)
- `extraction_confidence`: NUMERIC (use decimal: 0.85 NOT '85%')

**6. Documentation Block:**
```javascript
// DATABASE-CHECKED: contractor_action_items, contractors, ai_interactions verified October 14, 2025
// ================================================================
// VERIFIED CONSTRAINTS:
// - contractor_action_items.status: CHECK IN ('pending', 'in_progress', 'completed', 'cancelled')
// - contractor_action_items.action_type: (specific values to be verified)
// ================================================================
// VERIFIED FIELD NAMES:
// - contractor_id (NOT contractorId)
// - ai_generated (NOT ai_created, NOT aiGenerated)
// - interaction_type (NOT interactionType)
// - interaction_data (NOT interactionData)
// - has_ai_access (NOT hasAiAccess)
// - ai_coach_opt_in (NOT aiCoachOptIn)
// ================================================================
// VERIFIED DATA TYPES:
// - has_ai_access: BOOLEAN (true/false NOT 'true'/'false')
// - ai_generated: BOOLEAN (true/false NOT 'true'/'false')
// - interaction_data: JSONB (do NOT JSON.stringify)
// - conversation_context: JSONB (do NOT JSON.stringify)
// - extraction_confidence: NUMERIC (0.85 NOT '85%')
// ================================================================
// GUARD RATE LIMITS:
// - action_item_create: 10 per hour
// - message_send: 50 per hour
// - partner_lookup: 100 per hour
// ================================================================
```

**NOW WE CAN CODE GUARDS SAFELY!**

---

## ✅ Example: Creating openaiTracer.js

### Pre-Flight Verification:

**1. Tables Involved:**
- `ai_interactions`
- `ai_concierge_sessions` (for session linking)

**2. Column Names Verified:**
```sql
-- ai_interactions columns:
id, contractor_id, interaction_type, interaction_data, user_message,
ai_response, satisfaction_rating, created_at

-- ai_concierge_sessions columns:
id, contractor_id, session_id, session_type, session_status,
session_data, started_at, ended_at, duration_minutes
```

**3. CHECK Constraints Verified:**
```bash
# Verify session_type values:
powershell -Command ".\quick-db.bat \"SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'ai_concierge_sessions'::regclass AND contype = 'c';\""

# Document results:
# session_type: CHECK IN ('standard', 'event') or similar - VERIFY THIS!
```

**4. Foreign Keys Verified:**
```sql
-- ai_interactions:
FOREIGN KEY (contractor_id) REFERENCES contractors(id)

-- ai_concierge_sessions:
FOREIGN KEY (contractor_id) REFERENCES contractors(id) ON DELETE CASCADE
```

**5. Data Types Noted:**
- `interaction_data`: JSONB (store token usage, duration, status)
- `session_data`: TEXT (LangGraph state - already handled)
- `user_message`: TEXT
- `ai_response`: TEXT
- `created_at`: TIMESTAMP

**6. Documentation Block:**
```javascript
// DATABASE-CHECKED: ai_interactions, ai_concierge_sessions verified October 14, 2025
// ================================================================
// VERIFIED FIELD NAMES:
// - contractor_id (NOT contractorId)
// - interaction_type (NOT interactionType)
// - interaction_data (NOT interactionData)
// - user_message (NOT userMessage)
// - ai_response (NOT aiResponse)
// - session_id (NOT sessionId)
// - session_type (NOT sessionType)
// ================================================================
// VERIFIED DATA TYPES:
// - interaction_data: JSONB (store as object, do NOT stringify)
//   Example: { duration: 1250, status: 'success', prompt_tokens: 150 }
// - user_message: TEXT
// - ai_response: TEXT
// - created_at: TIMESTAMP (use NOW())
// ================================================================
// INTERACTION TYPES:
// - 'ai_concierge_standard' (standard agent invocation)
// - 'ai_concierge_event' (event agent invocation)
// - 'guard_check_*' (guard checks)
// - 'action_item_create' (rate limiting)
// - 'partner_lookup' (rate limiting)
// ================================================================
```

**NOW WE CAN CODE TRACER SAFELY!**

---

## 📚 Phase 3 Specific Verification Notes

### Guard Implementation Checklist
- [ ] Verify `has_ai_access` field exists and is BOOLEAN
- [ ] Verify `ai_coach_opt_in` field exists and is BOOLEAN
- [ ] Verify `ai_generated` field exists and is BOOLEAN
- [ ] Verify `contractor_action_items.status` CHECK constraint values
- [ ] Verify `interaction_type` naming convention for guard logs
- [ ] Verify `interaction_data` is JSONB (not TEXT)
- [ ] Verify rate limit time windows (3600 seconds = 1 hour)

### Tracing Implementation Checklist
- [ ] Verify `ai_interactions` table exists
- [ ] Verify `interaction_data` is JSONB for token usage
- [ ] Verify `interaction_type` naming convention
- [ ] Verify LangSmith environment variables are set
- [ ] Verify session linking via `session_id` field

### Monitoring Dashboard Checklist
- [ ] Verify `ai_interactions` aggregation queries work
- [ ] Verify JSON field extraction syntax: `interaction_data->>'field'`
- [ ] Verify FILTER clause syntax for PostgreSQL
- [ ] Verify date range queries with INTERVAL syntax
- [ ] Verify JOINs between tables for contractor details

---

## 🚨 Phase 3 Critical Gotchas

### 1. JSONB vs JSON.stringify()
```javascript
// ❌ WRONG:
interaction_data: JSON.stringify({ allowed: true })

// ✅ CORRECT:
interaction_data: JSON.stringify({ allowed: true }) // for INSERT with $1, $2 params

// ✅ ALSO CORRECT (if using JSONB literal):
interaction_data: { allowed: true } // Let the driver handle it
```

### 2. Boolean Fields
```javascript
// ❌ WRONG:
ai_generated: 'true'
has_ai_access: 'false'

// ✅ CORRECT:
ai_generated: true
has_ai_access: false
```

### 3. Rate Limit Time Windows
```javascript
// ❌ WRONG:
WHERE created_at >= NOW() - '1 hour'

// ✅ CORRECT:
WHERE created_at >= NOW() - INTERVAL '3600 seconds'
// OR
WHERE created_at >= NOW() - INTERVAL '1 hour'
```

### 4. JSON Field Extraction in Queries
```javascript
// ❌ WRONG:
SELECT interaction_data.allowed FROM ai_interactions

// ✅ CORRECT:
SELECT (interaction_data->>'allowed')::boolean FROM ai_interactions
```

### 5. Guard Check Naming Convention
```javascript
// ✅ CONSISTENT PATTERN:
'guard_check_create_action_item_permission'
'guard_check_create_action_item_rate_limit'
'guard_check_create_action_item_limit'

// NOT random names:
'permission_check', 'rate_limit', 'item_limit'
```

---

## 📚 Related Documents

- **Database Source of Truth:** `DATABASE-SOURCE-OF-TRUTH.md` (project root)
- **Phase 3 Implementation Plan:** `PHASE-3-IMPLEMENTATION-PLAN.md`
- **Phase 2 Pre-Flight Checklist:** `../phase-2/PHASE-2-PRE-FLIGHT-CHECKLIST.md` (reference example)
- **AI Field Naming Conventions:** `docs/AI-FIELD-NAMING-CONVENTIONS.md`

---

**Last Updated:** October 14, 2025
**Next Review:** Before each file creation in Phase 3 Days 1-5
**Status:** MANDATORY - Use this checklist religiously

---

## 🎯 Quick Start for Phase 3

**Before creating ANY file, run these 4 commands:**

```bash
# 1. Check ai_interactions table
powershell -Command ".\quick-db.bat \"SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'ai_interactions' ORDER BY ordinal_position;\""

# 2. Check contractor_action_items table
powershell -Command ".\quick-db.bat \"SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'contractor_action_items' ORDER BY ordinal_position;\""

# 3. Check contractors AI fields
powershell -Command ".\quick-db.bat \"SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'contractors' AND column_name LIKE '%ai%' ORDER BY ordinal_position;\""

# 4. Check action_items constraints
powershell -Command ".\quick-db.bat \"SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'contractor_action_items'::regclass;\""
```

**Document results, then code safely!**
