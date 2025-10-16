# Phase 5: Pre-Flight Checklist for Production Optimization

**Document Version:** 1.0
**Date:** October 16, 2025
**Status:** MANDATORY - Use before creating or modifying ANY production optimization file
**Phase:** Production Optimization & Validation (Week 6)

---

## 🎯 Purpose

This checklist ensures 100% production environment alignment and database verification for every file we create or modify during Phase 5 implementation (Production Optimization & Validation). Following this prevents production failures, performance bottlenecks, and data integrity issues when optimizing our AI Concierge for scale.

---

## ✅ MANDATORY CHECKLIST - Before Creating/Modifying ANY File

### Step 1: Identify Database Tables Involved

**Question:** What database tables will this file interact with or monitor?

**Phase 5 Common Tables:**
- **Session Monitoring:** `ai_concierge_sessions`
- **Learning Tracking:** `ai_learning_events`
- **Query Performance:** `pg_stat_statements` (PostgreSQL extension)
- **Event Context:** `contractor_event_registrations`, `events`
- **Contractor Data:** `contractors`
- **Cache Keys:** Redis (in-memory, not PostgreSQL)

**Example:**
- Production validation script: `ai_concierge_sessions`, `ai_learning_events`
- Database optimization: `pg_stat_statements`, `ai_concierge_sessions`
- Caching service: `contractors`, `contractor_event_registrations`, `events`
- Load testing: All tables (read operations)

**Action:** List all tables this file will query, monitor, or optimize.

---

### Step 2: Verify Column Names (Field Names)

**For EACH table identified in Step 1:**

```bash
# Run this command for EACH table:
powershell -Command ".\quick-db.bat \"SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'TABLE_NAME' ORDER BY ordinal_position;\""
```

**Action:** Document exact column names from database output.

**Phase 5 Key Tables - To Be Verified:**

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
updated_at           | timestamp without time zone| YES
```

**Critical Fields for Phase 5:**
- `session_id` (VARCHAR) - For session tracking and monitoring
- `session_type` (VARCHAR) - For performance analysis by agent type
- `session_status` (VARCHAR) - For completion rate metrics
- `duration_minutes` (INTEGER) - For performance benchmarking
- `started_at`, `ended_at` (TIMESTAMP) - For time-based analysis

#### ai_learning_events (Expected - VERIFY!)
```bash
powershell -Command ".\quick-db.bat \"SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'ai_learning_events' ORDER BY ordinal_position;\""
```

**Expected Columns (verify exact names!):**
```
column_name          | data_type                  | is_nullable
---------------------|----------------------------|------------
id                   | integer                    | NO
contractor_id        | integer                    | NO
event_type           | character varying          | NO
event_data           | jsonb                      | YES
learning_context     | jsonb                      | YES
confidence_score     | numeric(3,2)               | YES
created_at           | timestamp without time zone| YES
processed_at         | timestamp without time zone| YES
```

**Critical Fields for Phase 5:**
- `event_type` (VARCHAR) - For categorizing learning events
- `event_data` (JSONB) - For analyzing learning patterns
- `confidence_score` (NUMERIC) - For quality metrics
- `created_at`, `processed_at` (TIMESTAMP) - For processing time analysis

#### pg_stat_statements (PostgreSQL Extension - VERIFY!)
```bash
powershell -Command ".\quick-db.bat \"SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'pg_stat_statements' ORDER BY ordinal_position;\""
```

**Expected Columns (verify exact names!):**
```
column_name          | data_type
---------------------|----------------------------
query                | text
calls                | bigint
total_exec_time      | double precision (or total_time in older versions)
mean_exec_time       | double precision (or mean_time in older versions)
rows                 | bigint
... (many more columns)
```

**Critical Fields for Phase 5:**
- `query` (TEXT) - SQL query text for analysis
- `calls` (BIGINT) - Number of executions
- `total_exec_time` (DOUBLE PRECISION) - Total execution time (verify: `total_time` in PG < 13)
- `mean_exec_time` (DOUBLE PRECISION) - Average execution time (verify: `mean_time` in PG < 13)
- `rows` (BIGINT) - Total rows returned/affected

**IMPORTANT:** Field names changed in PostgreSQL 13! Verify exact column names:
```bash
# Check if using old or new naming:
powershell -Command ".\quick-db.bat \"SELECT column_name FROM information_schema.columns WHERE table_name = 'pg_stat_statements' AND column_name IN ('total_exec_time', 'total_time');\""
```

#### contractors (Performance-Critical Fields - VERIFY!)
```bash
powershell -Command ".\quick-db.bat \"SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'contractors' AND column_name IN ('id', 'email', 'company_name', 'focus_areas', 'business_goals', 'ai_business_summary', 'ai_differentiators') ORDER BY ordinal_position;\""
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
ai_business_summary  | text                       | YES
ai_differentiators   | jsonb                      | YES
```

**What to Check:**
- ✅ Exact spelling (snake_case vs camelCase)
- ✅ Underscores vs no underscores
- ✅ **Phase 5 Critical:** `total_exec_time` vs `total_time`, `mean_exec_time` vs `mean_time`
- ✅ **Phase 5 Critical:** `duration_minutes` NOT `duration_mins`, `session_status` NOT `status`

---

### Step 3: Verify PostgreSQL Version & Extensions

**For production optimization, PostgreSQL version matters!**

```bash
# Check PostgreSQL version:
powershell -Command ".\quick-db.bat \"SELECT version();\""

# Check if pg_stat_statements is installed:
powershell -Command ".\quick-db.bat \"SELECT * FROM pg_available_extensions WHERE name = 'pg_stat_statements';\""

# Check if pg_stat_statements is enabled:
powershell -Command ".\quick-db.bat \"SELECT * FROM pg_extension WHERE extname = 'pg_stat_statements';\""
```

**Action:** Document PostgreSQL version and installed extensions.

**Phase 5 Required Extensions:**
- `pg_stat_statements` - Query performance tracking (REQUIRED for Day 2)
- `pg_trgm` - Full-text search optimization (optional)

**If pg_stat_statements is NOT installed:**
```sql
-- Enable in postgresql.conf (requires superuser):
shared_preload_libraries = 'pg_stat_statements'

-- Then create extension:
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
```

**IMPORTANT:** If you cannot install pg_stat_statements, document this limitation and skip query performance analysis in Day 2.

---

### Step 4: Verify Indexes (Critical for Performance)

**For tables with performance concerns:**

```bash
# Check existing indexes on a table:
powershell -Command ".\quick-db.bat \"SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'TABLE_NAME' ORDER BY indexname;\""
```

**Action:** Document existing indexes and identify missing ones.

**Phase 5 Critical Indexes - To Be Verified:**

#### ai_concierge_sessions
```bash
powershell -Command ".\quick-db.bat \"SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'ai_concierge_sessions' ORDER BY indexname;\""
```

**Expected Indexes (VERIFY!):**
```
indexname                                   | indexdef
--------------------------------------------|--------------------
ai_concierge_sessions_pkey                  | PRIMARY KEY (id)
idx_ai_concierge_sessions_contractor_id     | INDEX (contractor_id) - VERIFY EXISTS!
idx_ai_concierge_sessions_session_id        | UNIQUE INDEX (session_id) - VERIFY EXISTS!
idx_ai_concierge_sessions_started_at        | INDEX (started_at) - May not exist, add in Day 2!
```

**Missing Indexes (Likely Need to Add in Day 2):**
- `idx_ai_concierge_sessions_started_at` - For time-based queries
- `idx_ai_concierge_sessions_session_type` - For agent type filtering
- `idx_ai_concierge_sessions_contractor_started` - Composite index for hot path queries

#### ai_learning_events
```bash
powershell -Command ".\quick-db.bat \"SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'ai_learning_events' ORDER BY indexname;\""
```

**Expected Indexes (VERIFY!):**
```
indexname                                   | indexdef
--------------------------------------------|--------------------
ai_learning_events_pkey                     | PRIMARY KEY (id)
idx_ai_learning_events_contractor_id        | INDEX (contractor_id) - VERIFY EXISTS!
idx_ai_learning_events_created_at           | INDEX (created_at) - May not exist, add in Day 2!
```

**What to Check:**
- ✅ Which indexes exist (don't assume!)
- ✅ Which columns are indexed
- ✅ If composite indexes exist for common query patterns
- ✅ **Phase 5 Critical:** Missing indexes will be created in Day 2, document them now!

---

### Step 5: Check Data Types (Especially for Query Performance)

**From Step 2 output, identify:**
- TEXT vs VARCHAR (affects index performance)
- INTEGER vs BIGINT (affects storage and speed)
- TIMESTAMP vs TIMESTAMPTZ (affects date queries)
- JSONB vs JSON (JSONB is faster, indexed)
- BOOLEAN fields (fast filtering)

**Phase 5 Critical Data Types:**

| Field                     | Type            | Performance Notes                        |
|---------------------------|-----------------|------------------------------------------|
| `session_data`            | TEXT            | Large field, avoid in SELECT *           |
| `session_type`            | VARCHAR         | Indexed, fast filtering                  |
| `session_status`          | VARCHAR         | Indexed, fast filtering                  |
| `duration_minutes`        | INTEGER         | Numeric, fast aggregation                |
| `event_data`              | JSONB           | Indexable, GIN index for fast queries    |
| `confidence_score`        | NUMERIC(3,2)    | Precise, good for averaging              |
| `calls`                   | BIGINT          | Large numbers, use BIGINT not INTEGER    |
| `total_exec_time`         | DOUBLE PRECISION| High precision for time measurements     |

**Action:** Ensure queries avoid full table scans on large TEXT fields.

**Common Performance Issues:**
- ❌ `SELECT * FROM ai_concierge_sessions` (pulls large session_data field)
- ✅ `SELECT id, contractor_id, session_type, duration_minutes FROM ai_concierge_sessions`
- ❌ `WHERE session_data LIKE '%keyword%'` (no index, slow)
- ✅ `WHERE session_type = 'standard'` (indexed, fast)

---

### Step 6: Document Findings BEFORE Coding

**Create a verification block at the top of the file:**

```javascript
// DATABASE-CHECKED: [table_names] columns verified [date]
// ================================================================
// POSTGRESQL VERSION: [version number]
// ================================================================
// VERIFIED EXTENSIONS:
// - pg_stat_statements: [installed/not installed]
// ================================================================
// VERIFIED FIELD NAMES:
// - field_one (NOT fieldOne, NOT field1)
// - another_field (NOT anotherField)
// ================================================================
// VERIFIED DATA TYPES:
// - session_data: TEXT (avoid in SELECT *, large field)
// - event_data: JSONB (indexable with GIN)
// - total_exec_time: DOUBLE PRECISION (or total_time in PG < 13)
// ================================================================
// VERIFIED INDEXES:
// - idx_ai_concierge_sessions_contractor_id: EXISTS
// - idx_ai_concierge_sessions_started_at: MISSING (add in Day 2)
// ================================================================
```

**Phase 5 Example (Database Optimization Script):**
```javascript
// DATABASE-CHECKED: ai_concierge_sessions, pg_stat_statements verified October 16, 2025
// ================================================================
// POSTGRESQL VERSION: PostgreSQL 15.4 (verified)
// ================================================================
// VERIFIED EXTENSIONS:
// - pg_stat_statements: INSTALLED and ENABLED
// ================================================================
// VERIFIED FIELD NAMES:
// - pg_stat_statements.total_exec_time (NOT total_time - PG 13+)
// - pg_stat_statements.mean_exec_time (NOT mean_time - PG 13+)
// - ai_concierge_sessions.duration_minutes (NOT duration_mins)
// - ai_concierge_sessions.started_at (NOT start_time)
// ================================================================
// VERIFIED DATA TYPES:
// - pg_stat_statements.calls: BIGINT (use for high volume)
// - pg_stat_statements.total_exec_time: DOUBLE PRECISION
// - ai_concierge_sessions.session_data: TEXT (exclude from queries)
// ================================================================
// VERIFIED INDEXES:
// - ai_concierge_sessions: pkey (id), idx_contractor_id, idx_session_id (UNIQUE)
// - MISSING: idx_started_at, idx_session_type (create in Day 2)
// ================================================================
```

**Phase 5 Example (Caching Service):**
```javascript
// DATABASE-CHECKED: contractors, contractor_event_registrations, events verified October 16, 2025
// ================================================================
// CACHE STRATEGY:
// - Redis TTL: 300 seconds (5 minutes) for contractor bundles
// - Cache keys: contractor:{id}, contractor_events:{id}
// ================================================================
// VERIFIED FIELD NAMES:
// - contractors.ai_business_summary (NOT aiBusSummary)
// - contractors.ai_differentiators (NOT aiDifferentiators)
// - contractor_event_registrations.event_status (NOT eventStatus)
// ================================================================
// VERIFIED DATA TYPES:
// - ai_business_summary: TEXT (cacheable, large field)
// - ai_differentiators: JSONB (cacheable, parsed)
// - business_goals: JSONB (cacheable, parsed)
// ================================================================
// CACHED FIELDS (Contractor Bundle):
// - id, email, company_name, focus_areas, business_goals
// - ai_business_summary, ai_differentiators
// - event_context (from contractor_event_registrations + events)
// ================================================================
```

---

### Step 7: Verify BOTH Development AND Production Environments

**CRITICAL FOR PHASE 5:** Production environment must match development!

```bash
# Development:
powershell -Command ".\quick-db.bat \"SELECT version();\""
powershell -Command ".\quick-db.bat \"SELECT column_name FROM information_schema.columns WHERE table_name = 'ai_concierge_sessions' ORDER BY ordinal_position;\""

# Production (use MCP tool):
# PGPASSWORD='dBP0wer100!!' psql -h tpe-database-production.cmtcsi0kytrf.us-east-1.rds.amazonaws.com -U tpeadmin -d tpedb -c "SELECT version();"
# PGPASSWORD='dBP0wer100!!' psql -h tpe-database-production.cmtcsi0kytrf.us-east-1.rds.amazonaws.com -U tpeadmin -d tpedb -c "SELECT column_name FROM information_schema.columns WHERE table_name = 'ai_concierge_sessions' ORDER BY ordinal_position;"
```

**Phase 5 Specific Checks:**
1. ✅ Verify PostgreSQL versions match (or note differences)
2. ✅ Verify `pg_stat_statements` is installed in BOTH environments
3. ✅ Verify `ai_concierge_sessions` table exists in production
4. ✅ Verify `ai_learning_events` table exists in production
5. ✅ Verify indexes match between dev and prod (or document missing ones)
6. ✅ Verify column names match exactly (especially pg_stat_statements fields)

**Action:** Document any environment differences and plan to resolve them in Day 1.

---

## 🚨 Red Flags - STOP and Verify

If you see ANY of these in Phase 5, STOP and run verification queries:

1. **Querying session_data in SELECT *** → Verify it's needed, exclude if not
   ```javascript
   SELECT * FROM ai_concierge_sessions  // ⚠️ STOP! Pulling large session_data field
   // Use: SELECT id, contractor_id, session_type, duration_minutes FROM ai_concierge_sessions
   ```

2. **Using pg_stat_statements fields** → Verify PostgreSQL version and field names
   ```javascript
   SELECT total_time FROM pg_stat_statements  // ⚠️ STOP! Is it total_time (PG < 13) or total_exec_time (PG 13+)?
   ```

3. **Creating indexes** → Verify index doesn't already exist
   ```sql
   CREATE INDEX idx_ai_concierge_sessions_contractor_id ...  // ⚠️ STOP! Check if exists first
   ```

4. **Caching data** → Verify field names and data types
   ```javascript
   const summary = contractor.aiBusSummary  // ⚠️ STOP! Is it ai_business_summary or aiBusSummary?
   ```

5. **Production URLs** → Verify environment-aware configuration
   ```javascript
   const apiUrl = 'http://localhost:5000'  // ⚠️ STOP! Hardcoded localhost will fail in production
   ```

6. **Load testing queries** → Verify they use indexes
   ```sql
   SELECT * FROM contractors WHERE email LIKE '%@%'  // ⚠️ STOP! No index, will be slow under load
   ```

7. **Monitoring queries** → Verify they don't cause performance issues
   ```sql
   SELECT * FROM ai_concierge_sessions WHERE session_data LIKE '%error%'  // ⚠️ STOP! Slow query, avoid
   ```

---

## 📋 Quick Reference Commands

### Check PostgreSQL Version
```bash
powershell -Command ".\quick-db.bat \"SELECT version();\""
```

### Check if Extension Exists
```bash
powershell -Command ".\quick-db.bat \"SELECT * FROM pg_available_extensions WHERE name = 'EXTENSION_NAME';\""
```

### Check if Extension is Enabled
```bash
powershell -Command ".\quick-db.bat \"SELECT * FROM pg_extension WHERE extname = 'EXTENSION_NAME';\""
```

### Check All Indexes on Table
```bash
powershell -Command ".\quick-db.bat \"SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'TABLE_NAME' ORDER BY indexname;\""
```

### Check Table Size (for performance analysis)
```bash
powershell -Command ".\quick-db.bat \"SELECT pg_size_pretty(pg_total_relation_size('TABLE_NAME'));\""
```

### Check Slow Queries (requires pg_stat_statements)
```bash
# PostgreSQL 13+:
powershell -Command ".\quick-db.bat \"SELECT query, calls, mean_exec_time FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 10;\""

# PostgreSQL < 13:
powershell -Command ".\quick-db.bat \"SELECT query, calls, mean_time FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;\""
```

### Check Index Usage
```bash
powershell -Command ".\quick-db.bat \"SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch FROM pg_stat_user_indexes WHERE tablename = 'TABLE_NAME' ORDER BY idx_scan;\""
```

### List All AI-Related Tables
```bash
powershell -Command ".\quick-db.bat \"SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND (table_name LIKE '%ai_%' OR table_name LIKE '%session%' OR table_name LIKE '%learning%') ORDER BY table_name;\""
```

---

## ✅ Example: Creating Database Optimization Script (Day 2)

### Pre-Flight Verification:

**1. Tables Involved:**
- `pg_stat_statements` (query performance tracking)
- `ai_concierge_sessions` (session performance analysis)
- `ai_learning_events` (learning event analysis)

**2. PostgreSQL Version Verified:**
```bash
powershell -Command ".\quick-db.bat \"SELECT version();\""
# Result: PostgreSQL 15.4 (verified)
```

**3. Extensions Verified:**
```bash
powershell -Command ".\quick-db.bat \"SELECT * FROM pg_extension WHERE extname = 'pg_stat_statements';\""
# Result: pg_stat_statements is INSTALLED
```

**4. Column Names Verified (pg_stat_statements):**
```bash
powershell -Command ".\quick-db.bat \"SELECT column_name FROM information_schema.columns WHERE table_name = 'pg_stat_statements' AND column_name IN ('total_exec_time', 'total_time', 'mean_exec_time', 'mean_time');\""

# Document results:
# PostgreSQL 15 uses: total_exec_time, mean_exec_time (NOT total_time, mean_time)
```

**5. Indexes Verified:**
```bash
powershell -Command ".\quick-db.bat \"SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'ai_concierge_sessions';\""

# Document results:
# EXISTS: pkey (id), idx_contractor_id, idx_session_id
# MISSING: idx_started_at, idx_session_type (need to create)
```

**6. Table Sizes Checked:**
```bash
powershell -Command ".\quick-db.bat \"SELECT pg_size_pretty(pg_total_relation_size('ai_concierge_sessions'));\""
# Result: 128 MB (baseline documented)
```

**7. Documentation Block:**
```javascript
// DATABASE-CHECKED: ai_concierge_sessions, pg_stat_statements verified October 16, 2025
// ================================================================
// POSTGRESQL VERSION: PostgreSQL 15.4
// ================================================================
// VERIFIED EXTENSIONS:
// - pg_stat_statements: INSTALLED (version 1.10)
// ================================================================
// VERIFIED FIELD NAMES:
// - pg_stat_statements.total_exec_time (PG 13+, NOT total_time)
// - pg_stat_statements.mean_exec_time (PG 13+, NOT mean_time)
// - pg_stat_statements.calls (BIGINT)
// - ai_concierge_sessions.duration_minutes (INTEGER)
// - ai_concierge_sessions.started_at (TIMESTAMP)
// ================================================================
// VERIFIED INDEXES:
// - ai_concierge_sessions_pkey: PRIMARY KEY (id)
// - idx_ai_concierge_sessions_contractor_id: INDEX (contractor_id)
// - idx_ai_concierge_sessions_session_id: UNIQUE INDEX (session_id)
// MISSING (to create):
// - idx_ai_concierge_sessions_started_at: INDEX (started_at) - for time-based queries
// - idx_ai_concierge_sessions_session_type: INDEX (session_type) - for agent type filtering
// ================================================================
// BASELINE PERFORMANCE:
// - ai_concierge_sessions table size: 128 MB
// - Slowest query: avg 45ms (contractor bundle fetch)
// ================================================================
```

**NOW WE CAN CREATE OPTIMIZATION SCRIPT SAFELY!**

---

## 📚 Phase 5 Specific Verification Notes

### Production Validation Checklist (Day 1)
- [ ] Verify production backend is running and accessible
- [ ] Verify state machine routes respond correctly
- [ ] Verify session persistence is working in production
- [ ] Verify AI Concierge responds in production
- [ ] Verify no hardcoded localhost URLs remain

### Database Optimization Checklist (Day 2)
- [ ] Verify PostgreSQL version matches dev and prod
- [ ] Verify pg_stat_statements is installed and enabled
- [ ] Verify column names (especially total_exec_time vs total_time)
- [ ] Verify existing indexes before creating new ones
- [ ] Verify baseline performance metrics before optimization

### Caching Implementation Checklist (Day 3)
- [ ] Verify Redis is accessible in production
- [ ] Verify contractor bundle field names
- [ ] Verify event context field names
- [ ] Verify data types for cached fields (TEXT, JSONB, etc.)
- [ ] Verify cache TTL values are appropriate (5 minutes recommended)

### Load Testing Checklist (Day 4)
- [ ] Verify production environment can handle test load
- [ ] Verify queries use indexes (check with EXPLAIN)
- [ ] Verify no full table scans under load
- [ ] Verify monitoring endpoints don't impact performance

---

## 🚨 Phase 5 Critical Gotchas

### 1. PostgreSQL Version Differences (pg_stat_statements)
```javascript
// ❌ WRONG (if PostgreSQL 13+):
SELECT total_time FROM pg_stat_statements

// ✅ CORRECT (if PostgreSQL 13+):
SELECT total_exec_time FROM pg_stat_statements

// ✅ SAFE (version-agnostic query):
SELECT
  COALESCE(total_exec_time, total_time) as exec_time,
  COALESCE(mean_exec_time, mean_time) as mean_time
FROM pg_stat_statements
```

### 2. Hardcoded Localhost URLs
```javascript
// ❌ WRONG (fails in production):
const apiUrl = 'http://localhost:5000'

// ✅ CORRECT (environment-aware):
const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'

// ✅ CORRECT (relative URL for same domain):
const apiUrl = typeof window !== 'undefined' && window.location.hostname !== 'localhost'
  ? ''
  : 'http://localhost:5000'
```

### 3. Missing Indexes
```sql
-- ❌ WRONG (creates duplicate index):
CREATE INDEX idx_ai_concierge_sessions_contractor_id ON ai_concierge_sessions(contractor_id);

-- ✅ CORRECT (check first):
SELECT indexname FROM pg_indexes WHERE tablename = 'ai_concierge_sessions' AND indexname = 'idx_ai_concierge_sessions_contractor_id';
-- If no results, then create index

-- ✅ SAFER (CREATE IF NOT EXISTS):
CREATE INDEX IF NOT EXISTS idx_ai_concierge_sessions_contractor_id ON ai_concierge_sessions(contractor_id);
```

### 4. Large Field Selection
```sql
-- ❌ WRONG (pulls large session_data field):
SELECT * FROM ai_concierge_sessions WHERE contractor_id = 123

-- ✅ CORRECT (select only needed fields):
SELECT id, contractor_id, session_type, duration_minutes, started_at
FROM ai_concierge_sessions
WHERE contractor_id = 123
```

### 5. Cache Key Naming
```javascript
// ❌ WRONG (inconsistent cache keys):
const key = `contractor_${contractorId}`

// ✅ CORRECT (consistent naming):
const key = `contractor:${contractorId}`
const eventKey = `contractor_events:${contractorId}`
```

### 6. Redis Connection in Production
```javascript
// ❌ WRONG (hardcoded localhost):
const redis = new Redis({ host: 'localhost', port: 6379 })

// ✅ CORRECT (environment-aware):
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined
})
```

---

## 📚 Related Documents

- **Database Source of Truth:** `DATABASE-SOURCE-OF-TRUTH.md` (project root)
- **Phase 5 Implementation Plan:** `PHASE-5-IMPLEMENTATION-PLAN.md` (this directory)
- **Phase 4 Pre-Flight Checklist:** `../phase-4/PHASE-4-PRE-FLIGHT-CHECKLIST.md` (state machine reference)
- **AI Concierge Architecture:** `../AI-CONCIERGE-HYBRID-ARCHITECTURE-RECOMMENDATION.md`

---

**Last Updated:** October 16, 2025
**Next Review:** Before each file creation in Phase 5 Days 1-5
**Status:** MANDATORY - Use this checklist religiously

---

## 🎯 Quick Start for Phase 5

**Before creating ANY production optimization file, run these commands:**

```bash
# 1. Check PostgreSQL version
powershell -Command ".\quick-db.bat \"SELECT version();\""

# 2. Check if pg_stat_statements is installed
powershell -Command ".\quick-db.bat \"SELECT * FROM pg_extension WHERE extname = 'pg_stat_statements';\""

# 3. Check pg_stat_statements column names (version-dependent!)
powershell -Command ".\quick-db.bat \"SELECT column_name FROM information_schema.columns WHERE table_name = 'pg_stat_statements' AND column_name IN ('total_exec_time', 'total_time', 'mean_exec_time', 'mean_time');\""

# 4. Check ai_concierge_sessions table
powershell -Command ".\quick-db.bat \"SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'ai_concierge_sessions' ORDER BY ordinal_position;\""

# 5. Check existing indexes
powershell -Command ".\quick-db.bat \"SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'ai_concierge_sessions';\""

# 6. Check ai_learning_events table
powershell -Command ".\quick-db.bat \"SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'ai_learning_events' ORDER BY ordinal_position;\""
```

**Document results, verify production environment, then code safely!**
