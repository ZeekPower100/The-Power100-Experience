# Phase 1: Pre-Flight Checklist for Internal Goal Engine

**Document Version:** 1.0
**Date:** October 22, 2025
**Status:** MANDATORY - Use before creating or modifying ANY file
**Phase:** Background Goal Engine (Week 1)

---

## 🎯 Purpose

This checklist ensures 100% database alignment for every file we create or modify during Phase 1 implementation (Background Goal Engine). Following this prevents naming mismatches and constraint violations when implementing the AI's internal goal system.

---

## ✅ MANDATORY CHECKLIST - Before Creating/Modifying ANY File

### Step 1: Identify Database Tables Involved

**Question:** What database tables will this file interact with?

**Phase 1 Common Tables:**
- **New Tables:** `ai_concierge_goals`, `ai_concierge_checklist_items`
- **Integration Points:** `contractors`, `contractor_action_items`, `contractor_followup_schedules`
- **Context Building:** `ai_concierge_sessions`

**Example:**
- Goal engine service: `ai_concierge_goals`, `ai_concierge_checklist_items`, `contractors`
- Context injection: `contractors`, `ai_concierge_goals`, `ai_concierge_checklist_items`
- Progress tracking: `ai_concierge_checklist_items`, `contractor_action_items`

**Action:** List all tables this file will query, insert, update, or reference.

---

### Step 2: Verify Column Names (Field Names)

**For EACH table identified in Step 1:**

```bash
# Run this command for EACH table:
powershell -Command ".\quick-db.bat \"SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'TABLE_NAME' ORDER BY ordinal_position;\""
```

**Action:** Document exact column names from database output.

**Phase 1 Key Tables - To Be Verified:**

#### contractors table (EXISTING - VERIFY!)
```bash
powershell -Command ".\quick-db.bat \"SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'contractors' AND column_name IN ('id', 'revenue_tier', 'team_size', 'focus_areas', 'current_stage', 'business_goals', 'current_challenges', 'ai_summary', 'ai_insights', 'growth_potential', 'lifecycle_stage', 'last_ai_analysis') ORDER BY ordinal_position;\""
```

**Expected Columns (verify exact names!):**
```
column_name          | data_type          | is_nullable
---------------------|--------------------|-----------
id                   | integer            | NO
revenue_tier         | character varying  | YES
team_size            | character varying  | YES
focus_areas          | text               | YES
current_stage        | character varying  | YES
business_goals       | jsonb              | YES
current_challenges   | jsonb              | YES
ai_summary           | text               | YES
ai_insights          | jsonb              | YES
growth_potential     | integer            | YES
lifecycle_stage      | character varying  | YES
last_ai_analysis     | timestamp          | YES
```

**Critical Fields for Phase 1:**
- `revenue_tier` (VARCHAR) - Current revenue level for goal generation
- `focus_areas` (TEXT) - Business priorities to inform goals
- `business_goals` (JSONB) - Structured goal data
- `current_challenges` (JSONB) - Pain points to address
- `ai_insights` (JSONB) - AI's understanding for context
- `growth_potential` (INTEGER) - Scoring for priority

#### contractor_action_items table (EXISTING - VERIFY!)
```bash
powershell -Command ".\quick-db.bat \"SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'contractor_action_items' ORDER BY ordinal_position;\""
```

**Expected Columns (verify exact names!):**
```
column_name              | data_type          | is_nullable
-------------------------|--------------------|------------
id                       | integer            | NO
contractor_id            | integer            | NO
event_id                 | integer            | YES
title                    | character varying  | NO
description              | text               | YES
action_type              | character varying  | YES
priority                 | integer            | YES
contractor_priority      | integer            | YES
ai_suggested_priority    | integer            | YES
status                   | character varying  | YES
ai_generated             | boolean            | YES
ai_reasoning             | text               | YES
conversation_context     | jsonb              | YES
created_at               | timestamp          | YES
```

**Critical Fields for Phase 1:**
- `contractor_id` (INTEGER) - Links goals to action items
- `ai_generated` (BOOLEAN) - Track AI-created actions
- `ai_reasoning` (TEXT) - Why AI created this action
- `conversation_context` (JSONB) - Context when created

#### contractor_followup_schedules table (EXISTING - VERIFY!)
```bash
powershell -Command ".\quick-db.bat \"SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'contractor_followup_schedules' ORDER BY ordinal_position;\""
```

**Expected Columns (verify exact names!):**
```
column_name           | data_type          | is_nullable
----------------------|--------------------|------------
id                    | integer            | NO
contractor_id         | integer            | NO
action_item_id        | integer            | YES
scheduled_time        | timestamp          | NO
followup_type         | character varying  | NO
status                | character varying  | YES
ai_should_personalize | boolean            | YES
ai_context_hints      | jsonb              | YES
skip_if_completed     | boolean            | YES
```

**Critical Fields for Phase 1:**
- `action_item_id` (INTEGER) - Links to goals' action items
- `ai_should_personalize` (BOOLEAN) - AI-driven follow-ups
- `ai_context_hints` (JSONB) - Context for AI

#### ai_concierge_goals table (NEW - WILL CREATE!)
**Purpose:** AI's internal goal system - hidden from contractor

**Schema to Create:**
```sql
CREATE TABLE ai_concierge_goals (
  id SERIAL PRIMARY KEY,
  contractor_id INTEGER NOT NULL REFERENCES contractors(id) ON DELETE CASCADE,

  -- Goal Definition
  goal_type VARCHAR(100) NOT NULL,
  goal_description TEXT NOT NULL,
  target_milestone VARCHAR(255),

  -- Priority & Progress
  priority_score INTEGER DEFAULT 5 CHECK (priority_score BETWEEN 1 AND 10),
  current_progress INTEGER DEFAULT 0 CHECK (current_progress BETWEEN 0 AND 100),
  next_milestone TEXT,

  -- Success Criteria
  success_criteria JSONB,

  -- Pattern Source
  pattern_source TEXT,
  pattern_confidence NUMERIC(3,2) CHECK (pattern_confidence BETWEEN 0 AND 1),

  -- Data Gaps
  data_gaps JSONB,

  -- Status & Timing
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned', 'blocked')),
  trigger_condition VARCHAR(100),
  last_action_at TIMESTAMP,

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);
```

**Expected Column Count After Creation:** 17 columns

**Verify After Creation:**
```bash
powershell -Command ".\quick-db.bat \"SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'ai_concierge_goals' ORDER BY ordinal_position;\""
```

#### ai_concierge_checklist_items table (NEW - WILL CREATE!)
**Purpose:** AI's checklist - specific actions within goals

**Schema to Create:**
```sql
CREATE TABLE ai_concierge_checklist_items (
  id SERIAL PRIMARY KEY,
  goal_id INTEGER REFERENCES ai_concierge_goals(id) ON DELETE CASCADE,
  contractor_id INTEGER NOT NULL REFERENCES contractors(id) ON DELETE CASCADE,

  -- Checklist Item
  checklist_item TEXT NOT NULL,
  item_type VARCHAR(100),

  -- Status & Trigger
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'skipped')),
  trigger_condition VARCHAR(100),

  -- Execution
  executed_at TIMESTAMP,
  execution_context JSONB,

  -- Completion
  completed_at TIMESTAMP,
  completion_notes TEXT,

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Expected Column Count After Creation:** 13 columns

**Verify After Creation:**
```bash
powershell -Command ".\quick-db.bat \"SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'ai_concierge_checklist_items' ORDER BY ordinal_position;\""
```

**What to Check:**
- ✅ Exact spelling (snake_case vs camelCase)
- ✅ Underscores vs no underscores
- ✅ Singular vs plural
- ✅ **Phase 1 Critical:** `goal_type` NOT `goalType`, `data_gaps` NOT `dataGaps`

---

### Step 3: Verify CHECK Constraints

**For tables with enum-like fields (status, type, category, etc.):**

```bash
# Run this command for EACH table with enum fields:
powershell -Command ".\quick-db.bat \"SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'TABLE_NAME'::regclass AND contype = 'c';\""
```

**Action:** Document exact allowed values from CHECK constraints.

**Phase 1 Critical Constraints - To Be Verified:**

#### ai_concierge_goals (AFTER CREATION)
```bash
powershell -Command ".\quick-db.bat \"SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'ai_concierge_goals'::regclass AND contype = 'c';\""
```

**Expected Constraints:**
- `status`: CHECK IN ('active', 'completed', 'abandoned', 'blocked')
- `priority_score`: CHECK BETWEEN 1 AND 10
- `current_progress`: CHECK BETWEEN 0 AND 100
- `pattern_confidence`: CHECK BETWEEN 0 AND 1

**IMPORTANT:** These constraints are defined in the CREATE TABLE statement. Verify they exist after creation.

#### ai_concierge_checklist_items (AFTER CREATION)
```bash
powershell -Command ".\quick-db.bat \"SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'ai_concierge_checklist_items'::regclass AND contype = 'c';\""
```

**Expected Constraints:**
- `status`: CHECK IN ('pending', 'in_progress', 'completed', 'skipped')

**What to Check:**
- ✅ Exact enum values (case-sensitive!)
- ✅ All allowed values (don't assume!)
- ✅ **Phase 1 Critical:** Goal status MUST use exact constraint values in code

---

### Step 4: Verify Foreign Key Constraints

**For tables with relationships:**

```bash
# Run this command to see foreign keys:
powershell -Command ".\quick-db.bat \"SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'TABLE_NAME'::regclass AND contype = 'f';\""
```

**Action:** Document which fields reference other tables.

**Phase 1 Key Foreign Keys - To Be Verified:**

#### ai_concierge_goals (AFTER CREATION)
```bash
powershell -Command ".\quick-db.bat \"SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'ai_concierge_goals'::regclass AND contype = 'f';\""
```

**Expected:**
```
conname                                    | pg_get_constraintdef
-------------------------------------------|--------------------
ai_concierge_goals_contractor_id_fkey      | FOREIGN KEY (contractor_id) REFERENCES contractors(id) ON DELETE CASCADE
```

#### ai_concierge_checklist_items (AFTER CREATION)
```bash
powershell -Command ".\quick-db.bat \"SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'ai_concierge_checklist_items'::regclass AND contype = 'f';\""
```

**Expected:**
```
ai_concierge_checklist_items_goal_id_fkey        | FOREIGN KEY (goal_id) REFERENCES ai_concierge_goals(id) ON DELETE CASCADE
ai_concierge_checklist_items_contractor_id_fkey  | FOREIGN KEY (contractor_id) REFERENCES contractors(id) ON DELETE CASCADE
```

**What to Check:**
- ✅ Which fields are foreign keys
- ✅ Which tables they reference
- ✅ CASCADE behavior (goals/items deleted when contractor deleted)
- ✅ **Phase 1 Critical:** Goal generation must check contractor exists first

---

### Step 5: Check Data Types (Especially JSON/TEXT)

**From Step 2 output, identify:**
- TEXT vs VARCHAR
- INTEGER vs BIGINT
- TIMESTAMP vs TIMESTAMPTZ
- **TEXT vs JSONB** (most important!)
- BOOLEAN fields
- NUMERIC for decimal values

**Phase 1 Critical Data Types:**

| Field                     | Type      | Notes                                    |
|---------------------------|-----------|------------------------------------------|
| `goal_description`        | TEXT      | Long-form description                    |
| `goal_type`               | VARCHAR   | Plain text: 'revenue_growth', etc.       |
| `success_criteria`        | JSONB     | Store as object: {revenue_increase: 20%} |
| `data_gaps`               | JSONB     | Array of strings: ["team_size"]          |
| `priority_score`          | INTEGER   | 1-10 numeric value                       |
| `current_progress`        | INTEGER   | 0-100 percentage                         |
| `pattern_confidence`      | NUMERIC   | 0.00-1.00 decimal value                  |
| `execution_context`       | JSONB     | Conversation excerpt as object           |
| `status`                  | VARCHAR   | Plain text: check CHECK constraint       |

**Action:** Ensure code uses correct data types.

**Common Issues:**
- ❌ Using `JSON.parse()` on VARCHAR field (plain text, not JSON)
- ❌ Storing object without using JSONB data structure
- ❌ Using wrong number type for scores (INTEGER vs NUMERIC)
- ❌ Not checking if JSONB field is null before accessing properties

---

### Step 6: Document Findings BEFORE Coding

**Create a verification block at the top of the file:**

```javascript
// DATABASE-CHECKED: [table_names] columns verified [date]
// ================================================================
// VERIFIED CONSTRAINTS:
// - table_name.field_name: CHECK IN ('value1', 'value2', 'value3')
// - table_name.score: CHECK BETWEEN 1 AND 10
// ================================================================
// VERIFIED FIELD NAMES:
// - field_one (NOT fieldOne, NOT field1)
// - another_field (NOT anotherField)
// ================================================================
// VERIFIED DATA TYPES:
// - success_criteria: JSONB (use object directly)
// - goal_type: VARCHAR (plain text, not JSON)
// - priority_score: INTEGER (1-10)
// ================================================================
```

**Phase 1 Example (Goal Engine Service):**
```javascript
// DATABASE-CHECKED: ai_concierge_goals, ai_concierge_checklist_items verified October 22, 2025
// ================================================================
// VERIFIED CONSTRAINTS:
// - ai_concierge_goals.status: CHECK IN ('active', 'completed', 'abandoned', 'blocked')
// - ai_concierge_goals.priority_score: CHECK BETWEEN 1 AND 10
// - ai_concierge_goals.current_progress: CHECK BETWEEN 0 AND 100
// - ai_concierge_checklist_items.status: CHECK IN ('pending', 'in_progress', 'completed', 'skipped')
// ================================================================
// VERIFIED FIELD NAMES:
// - goal_type (NOT goalType)
// - goal_description (NOT goalDescription)
// - priority_score (NOT priorityScore)
// - data_gaps (NOT dataGaps)
// - checklist_item (NOT checklistItem)
// - item_type (NOT itemType)
// ================================================================
// VERIFIED DATA TYPES:
// - success_criteria: JSONB (store as object)
// - data_gaps: JSONB (store as array)
// - goal_type: VARCHAR (plain text)
// - priority_score: INTEGER (1-10)
// - pattern_confidence: NUMERIC(3,2) (0.00-1.00)
// - execution_context: JSONB (store conversation excerpt)
// ================================================================
```

**Phase 1 Example (Context Builder Integration):**
```javascript
// DATABASE-CHECKED: contractors, ai_concierge_goals, ai_concierge_checklist_items verified October 22, 2025
// ================================================================
// VERIFIED CONSTRAINTS:
// - ai_concierge_goals.status: CHECK IN ('active', 'completed', 'abandoned', 'blocked')
// - ai_concierge_checklist_items.status: CHECK IN ('pending', 'in_progress', 'completed', 'skipped')
// ================================================================
// VERIFIED FIELD NAMES:
// - contractors.revenue_tier (NOT revenueTier)
// - contractors.focus_areas (NOT focusAreas)
// - contractors.business_goals (NOT businessGoals - JSONB field)
// - ai_concierge_goals.goal_description (NOT goalDescription)
// - ai_concierge_checklist_items.checklist_item (NOT checklistItem)
// ================================================================
// VERIFIED DATA TYPES:
// - business_goals: JSONB (parse as object)
// - focus_areas: TEXT (split by comma if stored as CSV)
// - data_gaps: JSONB (array of strings)
// - execution_context: JSONB (object with conversation data)
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
PGPASSWORD='dBP0wer100!!' psql -h tpe-database-production.cmtcsi0kytrf.us-east-1.rds.amazonaws.com -U tpeadmin -d tpedb -c "SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conname = 'CONSTRAINT_NAME';"
```

**Phase 1 Specific Checks:**
1. Verify `ai_concierge_goals` table exists in production after creation
2. Verify `ai_concierge_checklist_items` table exists in production after creation
3. Verify constraints match between dev and prod
4. Verify foreign keys match between dev and prod
5. Verify indexes created on both environments

**Action:** Confirm both environments match before deploying goal engine.

---

## 🚨 Red Flags - STOP and Verify

If you see ANY of these in Phase 1, STOP and run verification queries:

1. **Setting goal_type** → Verify valid goal types
   ```javascript
   goal_type: 'revenue_growth'  // ⚠️ STOP! What are valid goal types?
   ```

2. **Checking goal status** → Verify exact constraint values
   ```javascript
   goal.status === 'active'  // ⚠️ STOP! Is it 'active' or 'ACTIVE'?
   ```

3. **Storing data_gaps** → Verify JSONB array structure
   ```javascript
   data_gaps: ['team_size', 'close_rate']  // ⚠️ STOP! Verify JSONB type
   ```

4. **Setting priority_score** → Verify 1-10 range
   ```javascript
   priority_score: 15  // ⚠️ STOP! Must be 1-10 per CHECK constraint
   ```

5. **Updating current_progress** → Verify 0-100 range
   ```javascript
   current_progress: 150  // ⚠️ STOP! Must be 0-100 per CHECK constraint
   ```

6. **Foreign key checks** → Verify contractor exists
   ```javascript
   INSERT INTO ai_concierge_goals (contractor_id, ...)  // ⚠️ STOP! Does contractor exist?
   ```

7. **Checklist item status** → Verify exact values
   ```javascript
   status: 'complete'  // ⚠️ STOP! Is it 'completed' or 'complete'?
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

### List All Goal-Related Tables
```bash
powershell -Command ".\quick-db.bat \"SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND (table_name LIKE '%goal%' OR table_name LIKE '%checklist%') ORDER BY table_name;\""
```

### Check Specific Constraint
```bash
powershell -Command ".\quick-db.bat \"SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conname = 'CONSTRAINT_NAME';\""
```

### Verify Table Exists
```bash
powershell -Command ".\quick-db.bat \"SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'TABLE_NAME');\""
```

### Count Columns in Table
```bash
powershell -Command ".\quick-db.bat \"SELECT COUNT(*) as column_count FROM information_schema.columns WHERE table_name = 'TABLE_NAME';\""
```

---

## ✅ Example: Creating goalEngineService.js

### Pre-Flight Verification:

**1. Tables Involved:**
- `ai_concierge_goals` (create/read/update goals)
- `ai_concierge_checklist_items` (create/read/update checklist)
- `contractors` (read contractor profile for goal generation)

**2. Column Names Verified:**
```bash
# Run all three:
powershell -Command ".\quick-db.bat \"SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'ai_concierge_goals' ORDER BY ordinal_position;\""
powershell -Command ".\quick-db.bat \"SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'ai_concierge_checklist_items' ORDER BY ordinal_position;\""
powershell -Command ".\quick-db.bat \"SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'contractors' AND column_name IN ('id', 'revenue_tier', 'focus_areas', 'business_goals') ORDER BY ordinal_position;\""

# Document results:
# ai_concierge_goals: id, contractor_id, goal_type, goal_description, priority_score, status, ...
# ai_concierge_checklist_items: id, goal_id, contractor_id, checklist_item, status, ...
# contractors: id, revenue_tier, focus_areas, business_goals, ...
```

**3. CHECK Constraints Verified:**
```bash
powershell -Command ".\quick-db.bat \"SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'ai_concierge_goals'::regclass AND contype = 'c';\""

# Document results:
# status: CHECK IN ('active', 'completed', 'abandoned', 'blocked')
# priority_score: CHECK BETWEEN 1 AND 10
# current_progress: CHECK BETWEEN 0 AND 100
```

**4. Foreign Keys Verified:**
```sql
-- ai_concierge_goals:
FOREIGN KEY (contractor_id) REFERENCES contractors(id) ON DELETE CASCADE

-- ai_concierge_checklist_items:
FOREIGN KEY (goal_id) REFERENCES ai_concierge_goals(id) ON DELETE CASCADE
FOREIGN KEY (contractor_id) REFERENCES contractors(id) ON DELETE CASCADE
```

**5. Data Types Noted:**
- `goal_description`: TEXT (long-form description)
- `goal_type`: VARCHAR (plain text: 'revenue_growth', 'team_expansion')
- `success_criteria`: JSONB (object: {revenue_increase: 20})
- `data_gaps`: JSONB (array: ["team_size", "close_rate"])
- `priority_score`: INTEGER (1-10)
- `execution_context`: JSONB (conversation excerpt object)

**6. Documentation Block:**
```javascript
// DATABASE-CHECKED: ai_concierge_goals, ai_concierge_checklist_items, contractors verified October 22, 2025
// ================================================================
// VERIFIED CONSTRAINTS:
// - ai_concierge_goals.status: CHECK IN ('active', 'completed', 'abandoned', 'blocked')
// - ai_concierge_goals.priority_score: CHECK BETWEEN 1 AND 10
// - ai_concierge_goals.current_progress: CHECK BETWEEN 0 AND 100
// - ai_concierge_checklist_items.status: CHECK IN ('pending', 'in_progress', 'completed', 'skipped')
// ================================================================
// VERIFIED FIELD NAMES:
// - goal_type (NOT goalType)
// - goal_description (NOT goalDescription)
// - priority_score (NOT priorityScore)
// - current_progress (NOT currentProgress)
// - data_gaps (NOT dataGaps)
// - checklist_item (NOT checklistItem)
// - contractor_id (NOT contractorId)
// ================================================================
// VERIFIED DATA TYPES:
// - success_criteria: JSONB (store as object)
// - data_gaps: JSONB (store as array)
// - execution_context: JSONB (store conversation excerpt)
// - priority_score: INTEGER (1-10)
// - current_progress: INTEGER (0-100)
// - pattern_confidence: NUMERIC(3,2) (0.00-1.00)
// ================================================================
// GOAL ENGINE OPERATIONS:
// - createGoal: INSERT with status='active', priority_score 1-10
// - getActiveGoals: SELECT WHERE status='active' ORDER BY priority_score DESC
// - updateProgress: UPDATE current_progress (0-100) and last_action_at
// - completeGoal: UPDATE status='completed', completed_at=NOW()
// ================================================================
```

**NOW WE CAN CODE GOAL ENGINE SAFELY!**

---

## 📚 Phase 1 Specific Verification Notes

### Goal Engine Service Checklist
- [ ] Verify `goal_type` valid values (or no constraint)
- [ ] Verify `status` CHECK constraint values
- [ ] Verify `priority_score` range (1-10)
- [ ] Verify `current_progress` range (0-100)
- [ ] Verify `data_gaps` is JSONB array type
- [ ] Verify `success_criteria` is JSONB object type
- [ ] Verify `contractor_id` FK to contractors

### Checklist Service Checklist
- [ ] Verify `checklist_item` is TEXT type
- [ ] Verify `item_type` valid values (or no constraint)
- [ ] Verify `status` CHECK constraint values
- [ ] Verify `execution_context` is JSONB type
- [ ] Verify `goal_id` FK to ai_concierge_goals
- [ ] Verify `contractor_id` FK to contractors

### Context Builder Integration Checklist
- [ ] Verify `contractors.focus_areas` field name
- [ ] Verify `contractors.business_goals` is JSONB
- [ ] Verify goal retrieval query uses exact field names
- [ ] Verify checklist query joins tables correctly
- [ ] Verify system prompt injection doesn't leak to user

---

## 🚨 Phase 1 Critical Gotchas

### 1. JSONB vs TEXT for Arrays
```javascript
// ❌ WRONG (if data_gaps is JSONB):
data_gaps: '["team_size", "close_rate"]'  // String, not array

// ✅ CORRECT (if data_gaps is JSONB):
data_gaps: ["team_size", "close_rate"]  // Direct array

// When reading:
const gaps = goal.data_gaps;  // Already parsed as array
```

### 2. Goal Status Values
```javascript
// ❌ WRONG (if CHECK constraint is case-sensitive):
status: 'Active'

// ✅ CORRECT (verify against constraint):
status: 'active'
```

### 3. Priority Score Range
```javascript
// ❌ WRONG (outside 1-10 range):
priority_score: 0  // Will fail CHECK constraint

// ✅ CORRECT (1-10 range):
priority_score: 5  // Default, or calculated 1-10
```

### 4. Progress Percentage
```javascript
// ❌ WRONG (outside 0-100 range):
current_progress: (completed / total) * 10  // Could exceed 100

// ✅ CORRECT (0-100 range):
current_progress: Math.min(100, Math.floor((completed / total) * 100))
```

### 5. Checklist Item Status
```javascript
// ❌ WRONG (typo):
status: 'complete'

// ✅ CORRECT (verify against constraint):
status: 'completed'
```

### 6. Goal Type Consistency
```javascript
// ❌ WRONG (inconsistent naming):
goal_type: 'Revenue Growth'  // Spaces, title case

// ✅ CORRECT (snake_case, consistent):
goal_type: 'revenue_growth'
```

### 7. Data Gap Array
```javascript
// ❌ WRONG (string instead of array):
data_gaps: 'team_size,close_rate'

// ✅ CORRECT (JSONB array):
data_gaps: ['team_size', 'close_rate']
```

---

## 📚 Related Documents

- **Database Source of Truth:** `DATABASE-SOURCE-OF-TRUTH.md` (project root)
- **Phase 1 Implementation Plan:** `PHASE-1-IMPLEMENTATION-PLAN.md` (this directory)
- **Internal Goal Engine Overview:** `../INTERNAL-GOAL-ENGINE-OVERVIEW.md`
- **AI Field Naming Conventions:** `docs/AI-FIELD-NAMING-CONVENTIONS.md`

---

**Last Updated:** October 22, 2025
**Next Review:** Before each file creation in Phase 1 Days 1-7
**Status:** MANDATORY - Use this checklist religiously

---

## 🎯 Quick Start for Phase 1 Day 1

**Before creating ANY file, run these commands to verify existing tables:**

```bash
# 1. Check contractors table (existing - for goal generation)
powershell -Command ".\quick-db.bat \"SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'contractors' AND column_name IN ('id', 'revenue_tier', 'team_size', 'focus_areas', 'business_goals', 'current_challenges', 'ai_insights') ORDER BY ordinal_position;\""

# 2. Check contractor_action_items table (existing - for integration)
powershell -Command ".\quick-db.bat \"SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'contractor_action_items' ORDER BY ordinal_position;\""

# 3. Check contractor_followup_schedules table (existing - for integration)
powershell -Command ".\quick-db.bat \"SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'contractor_followup_schedules' ORDER BY ordinal_position;\""

# 4. After creating new tables, verify:
powershell -Command ".\quick-db.bat \"SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'ai_concierge_goals' ORDER BY ordinal_position;\""

powershell -Command ".\quick-db.bat \"SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'ai_concierge_checklist_items' ORDER BY ordinal_position;\""

# 5. Verify CHECK constraints on new tables:
powershell -Command ".\quick-db.bat \"SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'ai_concierge_goals'::regclass AND contype = 'c';\""

powershell -Command ".\quick-db.bat \"SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'ai_concierge_checklist_items'::regclass AND contype = 'c';\""
```

**Document results, then code safely!**
