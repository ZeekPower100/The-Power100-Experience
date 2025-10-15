# Phase 4: Pre-Flight Checklist for File Creation

**Document Version:** 1.0
**Date:** October 15, 2025
**Status:** MANDATORY - Use before creating or modifying ANY file
**Phase:** State Machine Integration (Week 5)

---

## 🎯 Purpose

This checklist ensures 100% database alignment for every file we create or modify during Phase 4 implementation (State Machine Integration). Following this prevents naming mismatches and constraint violations when implementing XState state machines for agent routing.

---

## ✅ MANDATORY CHECKLIST - Before Creating/Modifying ANY File

### Step 1: Identify Database Tables Involved

**Question:** What database tables will this file interact with?

**Phase 4 Common Tables:**
- **State Persistence:** `ai_concierge_sessions`
- **Agent Routing:** `contractor_event_registrations`, `events`
- **Contractor Context:** `contractors`

**Example:**
- State machine file: `ai_concierge_sessions`
- State machine manager: `ai_concierge_sessions`, `contractor_event_registrations`, `events`
- Controller integration: `contractor_event_registrations`, `events`, `ai_concierge_sessions`

**Action:** List all tables this file will query, insert, update, or reference.

---

### Step 2: Verify Column Names (Field Names)

**For EACH table identified in Step 1:**

```bash
# Run this command for EACH table:
powershell -Command ".\quick-db.bat \"SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'TABLE_NAME' ORDER BY ordinal_position;\""
```

**Action:** Document exact column names from database output.

**Phase 4 Key Tables - To Be Verified:**

#### ai_concierge_sessions (Expected - VERIFY!)
```bash
powershell -Command ".\quick-db.bat \"SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'ai_concierge_sessions' ORDER BY ordinal_position;\""
```

**Expected Columns (verify exact names!):**
```
column_name          | data_type                  | is_nullable
---------------------|----------------------------|------------
id                   | integer                    | NO
contractor_id        | integer                    | NO
session_id           | character varying          | NO
session_type         | character varying          | YES
session_status       | character varying          | YES
session_data         | text                       | YES
started_at           | timestamp without time zone| YES
ended_at             | timestamp without time zone| YES
duration_minutes     | integer                    | YES
updated_at           | timestamp without time zone| YES (verify if exists!)
```

**Critical Fields for Phase 4:**
- `session_id` (VARCHAR) - UNIQUE identifier for session
- `session_data` (TEXT) - Will store stringified XState machine state
- `session_type` (VARCHAR) - Stores current agent type ('standard' or 'event')
- `contractor_id` (INTEGER) - Links to contractors table

#### contractor_event_registrations (Expected - VERIFY!)
```bash
powershell -Command ".\quick-db.bat \"SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'contractor_event_registrations' ORDER BY ordinal_position;\""
```

**Expected Columns (verify exact names!):**
```
column_name          | data_type                  | is_nullable
---------------------|----------------------------|------------
id                   | integer                    | NO
contractor_id        | integer                    | NO
event_id             | integer                    | NO
event_status         | character varying          | YES
registration_date    | timestamp without time zone| YES
attendance_confirmed | boolean                    | YES
checked_in_at        | timestamp without time zone| YES
created_at           | timestamp without time zone| YES
updated_at           | timestamp without time zone| YES
```

**Critical Fields for Phase 4:**
- `contractor_id` (INTEGER) - Links to contractors
- `event_id` (INTEGER) - Links to events
- `event_status` (VARCHAR) - Registration status (verify CHECK constraint!)

#### events (Expected - VERIFY!)
```bash
powershell -Command ".\quick-db.bat \"SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'events' ORDER BY ordinal_position;\""
```

**Expected Columns (verify exact names!):**
```
column_name          | data_type                  | is_nullable
---------------------|----------------------------|------------
id                   | integer                    | NO
name                 | character varying          | NO
date                 | timestamp without time zone| YES
end_date             | timestamp without time zone| YES
status               | character varying          | YES
... (other columns)
```

**Critical Fields for Phase 4:**
- `id` (INTEGER) - Event ID
- `name` (VARCHAR) - Event name
- `date` (TIMESTAMP) - Event start date
- `end_date` (TIMESTAMP) - Event end date

#### contractors (AI-related fields - Expected - VERIFY!)
```bash
powershell -Command ".\quick-db.bat \"SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'contractors' AND column_name IN ('id', 'email', 'company_name', 'focus_areas', 'business_goals') ORDER BY ordinal_position;\""
```

**Expected Columns (verify exact names!):**
```
column_name          | data_type                  | is_nullable
---------------------|----------------------------|------------
id                   | integer                    | NO
email                | character varying          | NO
company_name         | character varying          | YES
focus_areas          | text                       | YES
business_goals       | jsonb                      | YES
```

**What to Check:**
- ✅ Exact spelling (snake_case vs camelCase)
- ✅ Underscores vs no underscores
- ✅ Singular vs plural
- ✅ **Phase 4 Critical:** `session_data` NOT `sessionData`, `event_status` NOT `eventStatus`

---

### Step 3: Verify CHECK Constraints

**For tables with enum-like fields (status, type, category, etc.):**

```bash
# Run this command for EACH table with enum fields:
powershell -Command ".\quick-db.bat \"SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'TABLE_NAME'::regclass AND contype = 'c';\""
```

**Action:** Document exact allowed values from CHECK constraints.

**Phase 4 Critical Constraints - To Be Verified:**

#### ai_concierge_sessions
```bash
powershell -Command ".\quick-db.bat \"SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'ai_concierge_sessions'::regclass AND contype = 'c';\""
```

**Expected Constraints (VERIFY!):**
- `session_type`: CHECK IN ('standard', 'event') OR NO CONSTRAINT
- `session_status`: CHECK IN ('active', 'completed', 'ended') OR NO CONSTRAINT

**IMPORTANT:** If NO CHECK constraints exist, document this! You can use any values, but be consistent.

#### contractor_event_registrations
```bash
powershell -Command ".\quick-db.bat \"SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'contractor_event_registrations'::regclass AND contype = 'c';\""
```

**Expected Constraints (VERIFY!):**
- `event_status`: CHECK IN ('registered', 'checked_in', 'attending', 'no_show', 'cancelled') - **VERIFY EXACT VALUES!**

**What to Check:**
- ✅ Exact enum values (case-sensitive!)
- ✅ All allowed values (don't assume!)
- ✅ **Phase 4 Critical:** State machine guards MUST use exact constraint values

---

### Step 4: Verify Foreign Key Constraints

**For tables with relationships:**

```bash
# Run this command to see foreign keys:
powershell -Command ".\quick-db.bat \"SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'TABLE_NAME'::regclass AND contype = 'f';\""
```

**Action:** Document which fields reference other tables.

**Phase 4 Key Foreign Keys - To Be Verified:**

#### ai_concierge_sessions
```bash
powershell -Command ".\quick-db.bat \"SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'ai_concierge_sessions'::regclass AND contype = 'f';\""
```

**Expected:**
```
conname                              | pg_get_constraintdef
-------------------------------------|--------------------
ai_concierge_sessions_contractor_id_fkey | FOREIGN KEY (contractor_id) REFERENCES contractors(id) ON DELETE CASCADE
```

#### contractor_event_registrations
```bash
powershell -Command ".\quick-db.bat \"SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'contractor_event_registrations'::regclass AND contype = 'f';\""
```

**Expected:**
```
contractor_event_registrations_contractor_id_fkey | FOREIGN KEY (contractor_id) REFERENCES contractors(id)
contractor_event_registrations_event_id_fkey      | FOREIGN KEY (event_id) REFERENCES events(id)
```

**What to Check:**
- ✅ Which fields are foreign keys
- ✅ Which tables they reference
- ✅ If the reference is required (NOT NULL) or optional (NULL allowed)
- ✅ **Phase 4 Critical:** State machine guards must check FK existence before routing

---

### Step 5: Check Data Types (Especially JSON/TEXT)

**From Step 2 output, identify:**
- TEXT vs VARCHAR
- INTEGER vs BIGINT
- TIMESTAMP vs TIMESTAMPTZ
- **TEXT vs JSONB** (most important for state storage!)
- BOOLEAN fields

**Phase 4 Critical Data Types:**

| Field                     | Type      | Notes                                    |
|---------------------------|-----------|------------------------------------------|
| `session_data`            | TEXT      | Store JSON as stringified text          |
| `session_type`            | VARCHAR   | Plain text: 'standard' or 'event'        |
| `event_status`            | VARCHAR   | Plain text: check CHECK constraint       |
| `contractor_id`           | INTEGER   | Numeric ID                               |
| `event_id`                | INTEGER   | Numeric ID                               |
| `date`                    | TIMESTAMP | Event date (no timezone)                 |

**Action:** Ensure code uses correct data types.

**Common Issues:**
- ❌ Using `JSON.parse()` on VARCHAR field (plain text, not JSON)
- ❌ Storing object without `JSON.stringify()` in TEXT field
- ❌ Using wrong date format for TIMESTAMP fields
- ❌ Not checking if TEXT field contains valid JSON before parsing

---

### Step 6: Document Findings BEFORE Coding

**Create a verification block at the top of the file:**

```javascript
// DATABASE-CHECKED: [table_names] columns verified [date]
// ================================================================
// VERIFIED CONSTRAINTS:
// - table_name.field_name: CHECK IN ('value1', 'value2', 'value3') OR NO CONSTRAINT
// - table_name.status: CHECK IN ('active', 'inactive') OR NO CONSTRAINT
// ================================================================
// VERIFIED FIELD NAMES:
// - field_one (NOT fieldOne, NOT field1)
// - another_field (NOT anotherField)
// ================================================================
// VERIFIED DATA TYPES:
// - session_data: TEXT (use JSON.stringify before storing)
// - session_type: VARCHAR (plain text, not JSON)
// - boolean_field: BOOLEAN (use true/false NOT 'true'/'false')
// ================================================================
```

**Phase 4 Example (State Machine):**
```javascript
// DATABASE-CHECKED: ai_concierge_sessions columns verified October 15, 2025
// ================================================================
// VERIFIED CONSTRAINTS:
// - ai_concierge_sessions.session_type: NO CHECK CONSTRAINT (can use 'standard' or 'event')
// - ai_concierge_sessions.session_status: NO CHECK CONSTRAINT (can use 'active', 'completed', 'ended')
// ================================================================
// VERIFIED FIELD NAMES:
// - session_id (NOT sessionId)
// - session_data (NOT sessionData)
// - session_type (NOT sessionType)
// - contractor_id (NOT contractorId)
// ================================================================
// VERIFIED DATA TYPES:
// - session_data: TEXT (store JSON.stringify(stateObject))
// - session_type: VARCHAR (plain text: 'standard' or 'event')
// - contractor_id: INTEGER
// ================================================================
```

**Phase 4 Example (State Machine Manager):**
```javascript
// DATABASE-CHECKED: ai_concierge_sessions, contractor_event_registrations, events verified October 15, 2025
// ================================================================
// VERIFIED CONSTRAINTS:
// - contractor_event_registrations.event_status: CHECK IN ('registered', 'checked_in', 'attending', 'no_show', 'cancelled')
// ================================================================
// VERIFIED FIELD NAMES:
// - contractor_event_registrations.contractor_id (NOT contractorId)
// - contractor_event_registrations.event_id (NOT eventId)
// - contractor_event_registrations.event_status (NOT eventStatus)
// - events.date (NOT start_date, NOT startDate)
// - events.end_date (NOT endDate)
// ================================================================
// VERIFIED DATA TYPES:
// - event_status: VARCHAR (plain text, check against constraint values)
// - date: TIMESTAMP (use Date objects)
// - contractor_id: INTEGER
// - event_id: INTEGER
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

**Phase 4 Specific Checks:**
1. Verify `ai_concierge_sessions` table exists in production
2. Verify `contractor_event_registrations` table exists in production
3. Verify constraints match between dev and prod
4. Verify foreign keys match between dev and prod

**Action:** Confirm both environments match before implementing state machine.

---

## 🚨 Red Flags - STOP and Verify

If you see ANY of these in Phase 4, STOP and run verification queries:

1. **Storing state in session_data** → Verify it's TEXT, not JSONB
   ```javascript
   session_data: JSON.stringify({ state: 'idle', context: {...} })  // ⚠️ STOP! Verify TEXT type
   ```

2. **Setting session_type** → Verify CHECK constraint or allowed values
   ```javascript
   session_type: 'event'  // ⚠️ STOP! Is 'event' valid? Or is it 'event_mode'?
   ```

3. **Checking event_status** → Verify exact constraint values
   ```javascript
   event_status === 'attending'  // ⚠️ STOP! Is it 'attending' or 'checked_in'?
   ```

4. **Querying event dates** → Verify column names
   ```javascript
   e.start_date  // ⚠️ STOP! Is it 'date' or 'start_date'?
   ```

5. **State machine guards** → Verify exact field names and values
   ```javascript
   contractor.eventStatus  // ⚠️ STOP! Is it event_status or eventStatus?
   ```

6. **Foreign key checks** → Verify relationship exists
   ```javascript
   JOIN events ON contractor_event_registrations.event_id = events.id  // ⚠️ STOP! Verify FK exists
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

### List All State-Related Tables
```bash
powershell -Command ".\quick-db.bat \"SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND (table_name LIKE '%session%' OR table_name LIKE '%event%' OR table_name LIKE '%registration%') ORDER BY table_name;\""
```

### Check Specific Constraint
```bash
powershell -Command ".\quick-db.bat \"SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conname = 'CONSTRAINT_NAME';\""
```

---

## ✅ Example: Creating conciergeStateMachine.js

### Pre-Flight Verification:

**1. Tables Involved:**
- `ai_concierge_sessions` (for state persistence)
- `contractor_event_registrations` (for guard checks)
- `events` (for event date checks)

**2. Column Names Verified:**
```bash
# Run all three:
powershell -Command ".\quick-db.bat \"SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'ai_concierge_sessions' ORDER BY ordinal_position;\""
powershell -Command ".\quick-db.bat \"SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'contractor_event_registrations' ORDER BY ordinal_position;\""
powershell -Command ".\quick-db.bat \"SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'events' ORDER BY ordinal_position;\""

# Document results:
# ai_concierge_sessions: id, contractor_id, session_id, session_type, session_data, ...
# contractor_event_registrations: id, contractor_id, event_id, event_status, ...
# events: id, name, date, end_date, ...
```

**3. CHECK Constraints Verified:**
```bash
powershell -Command ".\quick-db.bat \"SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'contractor_event_registrations'::regclass AND contype = 'c';\""

# Document results:
# event_status: CHECK IN ('registered', 'checked_in', 'attending', 'no_show', 'cancelled')
```

**4. Foreign Keys Verified:**
```sql
-- ai_concierge_sessions:
FOREIGN KEY (contractor_id) REFERENCES contractors(id) ON DELETE CASCADE

-- contractor_event_registrations:
FOREIGN KEY (contractor_id) REFERENCES contractors(id)
FOREIGN KEY (event_id) REFERENCES events(id)
```

**5. Data Types Noted:**
- `session_data`: TEXT (store JSON.stringify(state))
- `session_type`: VARCHAR (plain text: 'standard' or 'event')
- `event_status`: VARCHAR (check against constraint: 'registered', 'checked_in', 'attending')
- `date`: TIMESTAMP (event start date)

**6. Documentation Block:**
```javascript
// DATABASE-CHECKED: ai_concierge_sessions, contractor_event_registrations, events verified October 15, 2025
// ================================================================
// VERIFIED CONSTRAINTS:
// - contractor_event_registrations.event_status: CHECK IN ('registered', 'checked_in', 'attending', 'no_show', 'cancelled')
// ================================================================
// VERIFIED FIELD NAMES:
// - session_id (NOT sessionId)
// - session_data (NOT sessionData)
// - contractor_id (NOT contractorId)
// - event_id (NOT eventId)
// - event_status (NOT eventStatus)
// ================================================================
// VERIFIED DATA TYPES:
// - session_data: TEXT (use JSON.stringify)
// - session_type: VARCHAR (plain text)
// - event_status: VARCHAR (plain text, check against constraint)
// ================================================================
// STATE MACHINE GUARDS:
// - hasActiveEvent: Checks event_status IN ('registered', 'checked_in', 'attending')
// - eventIsToday: Checks date is today
// ================================================================
```

**NOW WE CAN CODE STATE MACHINE SAFELY!**

---

## 📚 Phase 4 Specific Verification Notes

### State Machine Implementation Checklist
- [ ] Verify `session_data` is TEXT type (for JSON.stringify)
- [ ] Verify `session_type` allowed values (or no constraint)
- [ ] Verify `event_status` CHECK constraint values
- [ ] Verify `contractor_event_registrations` FK to contractors and events
- [ ] Verify event date fields (date vs start_date vs event_date)

### State Machine Manager Checklist
- [ ] Verify `session_id` is UNIQUE
- [ ] Verify state persistence query uses exact field names
- [ ] Verify event context query joins tables correctly
- [ ] Verify guard logic matches CHECK constraint values

### Controller Integration Checklist
- [ ] Verify agent routing uses exact field names
- [ ] Verify event status check matches constraint values
- [ ] Verify date comparisons use correct field names
- [ ] Verify state machine manager calls use correct parameters

---

## 🚨 Phase 4 Critical Gotchas

### 1. TEXT vs JSONB for session_data
```javascript
// ❌ WRONG (if session_data is TEXT):
session_data: { state: 'idle', context: {...} }

// ✅ CORRECT (if session_data is TEXT):
session_data: JSON.stringify({ state: 'idle', context: {...} })

// When reading:
const state = JSON.parse(session.session_data);
```

### 2. Event Status Values
```javascript
// ❌ WRONG (if CHECK constraint is different):
event_status: 'attending'

// ✅ CORRECT (verify against constraint):
event_status: 'checked_in'  // Or whatever the actual constraint allows
```

### 3. Date Field Names
```javascript
// ❌ WRONG (if field is 'date'):
e.start_date

// ✅ CORRECT (verify field name):
e.date
```

### 4. State Machine Guards
```javascript
// ❌ WRONG (camelCase):
if (context.eventContext.eventStatus === 'attending')

// ✅ CORRECT (snake_case from database):
if (context.eventContext.event_status === 'checked_in')
```

### 5. Session Type Values
```javascript
// ❌ WRONG (if no constraint, but be consistent):
session_type: 'standard_agent'

// ✅ CORRECT (use consistent values from Phase 2):
session_type: 'standard'  // Or 'event'
```

---

## 📚 Related Documents

- **Database Source of Truth:** `DATABASE-SOURCE-OF-TRUTH.md` (project root)
- **Phase 4 Implementation Plan:** `PHASE-4-IMPLEMENTATION-PLAN.md` (this directory)
- **Phase 3 Pre-Flight Checklist:** `../phase-3/PHASE-3-PRE-FLIGHT-CHECKLIST.md` (reference example)
- **AI Field Naming Conventions:** `docs/AI-FIELD-NAMING-CONVENTIONS.md`

---

**Last Updated:** October 15, 2025
**Next Review:** Before each file creation in Phase 4 Days 1-5
**Status:** MANDATORY - Use this checklist religiously

---

## 🎯 Quick Start for Phase 4

**Before creating ANY file, run these 4 commands:**

```bash
# 1. Check ai_concierge_sessions table
powershell -Command ".\quick-db.bat \"SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'ai_concierge_sessions' ORDER BY ordinal_position;\""

# 2. Check contractor_event_registrations table
powershell -Command ".\quick-db.bat \"SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'contractor_event_registrations' ORDER BY ordinal_position;\""

# 3. Check events table
powershell -Command ".\quick-db.bat \"SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'events' ORDER BY ordinal_position;\""

# 4. Check event_status constraint
powershell -Command ".\quick-db.bat \"SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'contractor_event_registrations'::regclass AND contype = 'c';\""
```

**Document results, then code safely!**
