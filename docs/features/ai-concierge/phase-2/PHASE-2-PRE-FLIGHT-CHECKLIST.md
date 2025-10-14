# Phase 2: Pre-Flight Checklist for File Creation

**Document Version:** 1.0
**Date:** October 13, 2025
**Status:** MANDATORY - Use before creating or modifying ANY file

---

## 🎯 Purpose

This checklist ensures 100% database alignment for every file we create or modify during Phase 2 implementation. Following this prevents naming mismatches and constraint violations.

---

## ✅ MANDATORY CHECKLIST - Before Creating/Modifying ANY File

### Step 1: Identify Database Tables Involved

**Question:** What database tables will this file interact with?

**Example:**
- Agent file: `ai_concierge_sessions`, `ai_learning_events`, `contractors`
- Tool file: Already done - all tools verified
- Controller file: Multiple tables via services

**Action:** List all tables this file will query, insert, update, or reference.

---

### Step 2: Verify Column Names (Field Names)

**For EACH table identified in Step 1:**

```bash
# Run this command for EACH table:
powershell -Command ".\quick-db.bat \"SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'TABLE_NAME' ORDER BY ordinal_position;\""
```

**Action:** Document exact column names from database output.

**Example Output:**
```
column_name          | data_type
---------------------|----------
id                   | integer
contractor_id        | integer
session_start        | timestamp
ai_context           | jsonb
```

**What to Check:**
- ✅ Exact spelling (snake_case vs camelCase)
- ✅ Underscores vs no underscores
- ✅ Singular vs plural
- ✅ Common mistakes: `note_text` NOT `note_content`

---

### Step 3: Verify CHECK Constraints

**For tables with enum-like fields (status, type, category, etc.):**

```bash
# Run this command for EACH table with enum fields:
powershell -Command ".\quick-db.bat \"SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'TABLE_NAME'::regclass AND contype = 'c';\""
```

**Action:** Document exact allowed values from CHECK constraints.

**Example Output:**
```
conname              | pg_get_constraintdef
---------------------|--------------------
valid_note_type      | CHECK (note_type IN ('general', 'contact', 'insight', 'action_item', 'speaker_note', 'sponsor_note', 'peer_connection'))
valid_status         | CHECK (status IN ('active', 'inactive', 'pending'))
```

**What to Check:**
- ✅ Exact enum values (case-sensitive!)
- ✅ All allowed values (don't assume!)
- ✅ Common mistakes: `'scheduled'` NOT `'pending'` for status

---

### Step 4: Verify Foreign Key Constraints

**For tables with relationships:**

```bash
# Run this command to see foreign keys:
powershell -Command ".\quick-db.bat \"SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'TABLE_NAME'::regclass AND contype = 'f';\""
```

**Action:** Document which fields reference other tables.

**Example Output:**
```
conname                              | pg_get_constraintdef
-------------------------------------|--------------------
ai_learning_events_contractor_id_fkey| FOREIGN KEY (contractor_id) REFERENCES contractors(id)
ai_learning_events_event_id_fkey     | FOREIGN KEY (event_id) REFERENCES events(id)
```

**What to Check:**
- ✅ Which fields are foreign keys
- ✅ Which tables they reference
- ✅ If the reference is required (NOT NULL) or optional (NULL allowed)

---

### Step 5: Check Data Types (Especially JSON/JSONB)

**From Step 2 output, identify:**
- TEXT vs VARCHAR
- INTEGER vs BIGINT
- TIMESTAMP vs TIMESTAMPTZ
- **JSON vs JSONB** (most important!)
- ARRAY types

**Action:** Ensure code uses correct data types.

**Common Issues:**
- ❌ Using `JSON.stringify()` on JSONB field (already JSON in DB)
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
```

**Example:**
```javascript
// DATABASE-CHECKED: ai_concierge_sessions, contractors verified October 13, 2025
// ================================================================
// VERIFIED CONSTRAINTS:
// - ai_concierge_sessions.session_type: CHECK IN ('standard', 'event')
// - ai_concierge_sessions.status: CHECK IN ('active', 'completed', 'failed')
// ================================================================
// VERIFIED FIELD NAMES:
// - contractor_id (NOT contractorId)
// - session_start (NOT sessionStart, NOT start_time)
// - ai_context (JSONB type)
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

**Action:** Confirm both environments match.

---

## 🚨 Red Flags - STOP and Verify

If you see ANY of these, STOP and run verification queries:

1. **Writing enum values** → Verify CHECK constraint
   ```javascript
   status: 'pending'  // ⚠️ STOP! Check valid_status constraint
   ```

2. **Writing field names with assumptions** → Verify column names
   ```javascript
   note_content: text  // ⚠️ STOP! Is it note_content or note_text?
   ```

3. **Inserting to tables with foreign keys** → Verify references exist
   ```javascript
   event_id: 1  // ⚠️ STOP! Does event with ID 1 exist?
   ```

4. **Using field name variations** → Verify exact spelling
   ```javascript
   followupType vs followup_type  // ⚠️ STOP! Check database
   ```

---

## 📋 Quick Reference Commands

### Check All Columns
```bash
powershell -Command ".\quick-db.bat \"SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'TABLE_NAME' ORDER BY ordinal_position;\""
```

### Check All Constraints
```bash
powershell -Command ".\quick-db.bat \"SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'TABLE_NAME'::regclass;\""
```

### Check Specific Constraint
```bash
powershell -Command ".\quick-db.bat \"SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conname = 'CONSTRAINT_NAME';\""
```

### List All Tables
```bash
powershell -Command ".\quick-db.bat \"SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;\""
```

---

## ✅ Example: Creating aiConciergeStandardAgent.js

### Pre-Flight Verification:

**1. Tables Involved:**
- `ai_concierge_sessions`
- `contractors`
- `ai_learning_events`

**2. Column Names Verified:**
```sql
-- ai_concierge_sessions columns:
id, contractor_id, session_type, session_start, session_end,
message_count, ai_context, status, created_at, updated_at

-- contractors columns:
id, first_name, last_name, email, company_name, phone,
focus_areas, revenue_tier, team_size, business_goals

-- ai_learning_events columns:
id, event_type, contractor_id, event_id, context, action_taken,
outcome, success_score, learned_insight, confidence_level,
related_entities, created_at, updated_at
```

**3. CHECK Constraints Verified:**
```sql
-- ai_concierge_sessions.session_type:
CHECK (session_type IN ('standard', 'event'))

-- ai_concierge_sessions.status:
CHECK (status IN ('active', 'completed', 'failed'))
```

**4. Foreign Keys Verified:**
```sql
-- ai_concierge_sessions:
FOREIGN KEY (contractor_id) REFERENCES contractors(id)

-- ai_learning_events:
FOREIGN KEY (contractor_id) REFERENCES contractors(id)
FOREIGN KEY (event_id) REFERENCES events(id)  -- Optional (can be NULL)
```

**5. Data Types Noted:**
- `ai_context`: JSONB (no need to stringify, already JSON)
- `focus_areas`: TEXT (stored as JSON string, need to parse)
- `session_start`: TIMESTAMP
- `message_count`: INTEGER

**6. Documentation Block:**
```javascript
// DATABASE-CHECKED: ai_concierge_sessions, contractors, ai_learning_events verified October 13, 2025
// ================================================================
// VERIFIED CONSTRAINTS:
// - ai_concierge_sessions.session_type: CHECK IN ('standard', 'event')
// - ai_concierge_sessions.status: CHECK IN ('active', 'completed', 'failed')
// ================================================================
// VERIFIED FIELD NAMES:
// - contractor_id (NOT contractorId)
// - session_type (NOT sessionType)
// - ai_context (JSONB type - do NOT stringify)
// - focus_areas (TEXT type - MUST parse JSON string)
// ================================================================
```

**NOW WE CAN CODE SAFELY!**

---

## 📚 Related Documents

- **Database Source of Truth:** `DATABASE-SOURCE-OF-TRUTH.md` (project root)
- **Database Verification Notes:** `PHASE-2-DATABASE-VERIFICATION-NOTES.md`
- **Phase 2 Plan:** `PHASE-2-IMPLEMENTATION-PLAN.md`

---

**Last Updated:** October 13, 2025
**Next Review:** Before each file creation in Phase 2 Day 3
**Status:** MANDATORY - Use this checklist religiously
