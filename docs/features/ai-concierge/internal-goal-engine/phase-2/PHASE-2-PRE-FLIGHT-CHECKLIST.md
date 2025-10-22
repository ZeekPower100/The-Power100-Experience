# Phase 2: Pre-Flight Checklist for Pattern Learning & Intelligence

**Document Version:** 1.0
**Date:** October 22, 2025
**Status:** MANDATORY - Use before creating or modifying ANY file
**Phase:** Pattern Learning System (Week 2)

---

## 🎯 Purpose

This checklist ensures 100% database alignment for every file we create or modify during Phase 2 implementation (Pattern Learning & Intelligence). Following this prevents naming mismatches and constraint violations when implementing the AI's pattern analysis system.

---

## ✅ MANDATORY CHECKLIST - Before Creating/Modifying ANY File

### Step 1: Identify Database Tables Involved

**Question:** What database tables will this file interact with?

**Phase 2 Common Tables:**
- **New Tables:** `business_growth_patterns`, `contractor_pattern_matches`, `pattern_success_tracking`
- **Phase 1 Tables:** `ai_concierge_goals`, `ai_concierge_checklist_items`
- **Existing Tables:** `contractors`, `contractor_action_items`

**Example:**
- Pattern analysis service: `business_growth_patterns`, `contractors`
- Pattern matching service: `contractor_pattern_matches`, `business_growth_patterns`, `contractors`
- Enhanced goal engine: `ai_concierge_goals`, `business_growth_patterns`, `contractor_pattern_matches`

**Action:** List all tables this file will query, insert, update, or reference.

---

### Step 2: Verify Column Names (Field Names)

**For EACH table identified in Step 1:**

```bash
# Run this command for EACH table:
powershell -Command ".\quick-db.bat \"SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'TABLE_NAME' ORDER BY ordinal_position;\""
```

**Action:** Document exact column names from database output.

**Phase 2 Key Tables - To Be Verified:**

#### business_growth_patterns table (NEW - WILL CREATE!)
```bash
powershell -Command ".\quick-db.bat \"SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'business_growth_patterns' ORDER BY ordinal_position;\""
```

**Expected Columns (verify exact names!):**
```
column_name                      | data_type          | is_nullable
---------------------------------|--------------------|-----------
id                               | integer            | NO
from_revenue_tier                | character varying  | NO
to_revenue_tier                  | character varying  | NO
pattern_name                     | character varying  | NO
pattern_description              | text               | YES
pattern_type                     | character varying  | YES
common_focus_areas               | jsonb              | YES
common_partners                  | jsonb              | YES
common_milestones                | jsonb              | YES
common_books                     | jsonb              | YES
common_podcasts                  | jsonb              | YES
common_events                    | jsonb              | YES
avg_time_to_level_up_months      | integer            | YES
median_time_to_level_up_months   | integer            | YES
fastest_time_months              | integer            | YES
success_indicators               | jsonb              | YES
sample_size                      | integer            | NO
confidence_score                 | numeric(3,2)       | YES
last_recalculated_at             | timestamp          | YES
created_at                       | timestamp          | YES
updated_at                       | timestamp          | YES
```

**Critical Fields for Phase 2:**
- `from_revenue_tier` (VARCHAR) - Starting revenue level (must match contractor revenue tiers)
- `to_revenue_tier` (VARCHAR) - Target revenue level
- `pattern_name` (VARCHAR) - Descriptive name (e.g., "3M to 5M Lead System Focus")
- `pattern_type` (VARCHAR) - Category: 'revenue_growth', 'team_expansion', 'lead_improvement'
- `common_focus_areas` (JSONB) - Array of focus areas: ["greenfield_growth", "operational_efficiency"]
- `common_partners` (JSONB) - Array of partner objects with usage rates
- `common_milestones` (JSONB) - Array of milestone strings
- `sample_size` (INTEGER) - Number of contractors in pattern (for confidence)
- `confidence_score` (NUMERIC) - 0.00-1.00 statistical confidence

#### contractor_pattern_matches table (NEW - WILL CREATE!)
```bash
powershell -Command ".\quick-db.bat \"SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'contractor_pattern_matches' ORDER BY ordinal_position;\""
```

**Expected Columns (verify exact names!):**
```
column_name                  | data_type          | is_nullable
-----------------------------|--------------------|-----------
id                           | integer            | NO
contractor_id                | integer            | NO
pattern_id                   | integer            | NO
match_score                  | numeric(3,2)       | YES
match_reason                 | text               | YES
pattern_applied_at           | timestamp          | YES
pattern_result               | character varying  | YES
goals_generated              | integer            | YES
checklist_items_generated    | integer            | YES
created_at                   | timestamp          | YES
updated_at                   | timestamp          | YES
```

**Critical Fields for Phase 2:**
- `contractor_id` (INTEGER) - FK to contractors
- `pattern_id` (INTEGER) - FK to business_growth_patterns
- `match_score` (NUMERIC) - 0.00-1.00 fit quality
- `match_reason` (TEXT) - Human-readable explanation
- `pattern_result` (VARCHAR) - 'pending', 'successful', 'unsuccessful', 'in_progress'
- `goals_generated` (INTEGER) - Count of goals created from this pattern
- `checklist_items_generated` (INTEGER) - Count of checklist items created

#### pattern_success_tracking table (NEW - WILL CREATE!)
```bash
powershell -Command ".\quick-db.bat \"SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'pattern_success_tracking' ORDER BY ordinal_position;\""
```

**Expected Columns (verify exact names!):**
```
column_name                | data_type          | is_nullable
---------------------------|--------------------|-----------
id                         | integer            | NO
pattern_id                 | integer            | NO
contractor_id              | integer            | NO
goal_id                    | integer            | YES
goal_completed             | boolean            | YES
time_to_completion_days    | integer            | YES
contractor_satisfaction    | integer            | YES
outcome_notes              | text               | YES
revenue_impact             | character varying  | YES
what_worked                | text               | YES
what_didnt_work            | text               | YES
created_at                 | timestamp          | YES
completed_at               | timestamp          | YES
```

**Critical Fields for Phase 2:**
- `pattern_id` (INTEGER) - FK to business_growth_patterns
- `contractor_id` (INTEGER) - FK to contractors
- `goal_id` (INTEGER) - FK to ai_concierge_goals
- `goal_completed` (BOOLEAN) - Success indicator
- `time_to_completion_days` (INTEGER) - Duration metric
- `contractor_satisfaction` (INTEGER) - 1-5 rating
- `revenue_impact` (VARCHAR) - 'positive', 'neutral', 'negative', 'too_early'

#### contractors table (EXISTING - VERIFY!)
```bash
powershell -Command ".\quick-db.bat \"SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'contractors' AND column_name IN ('id', 'revenue_tier', 'team_size', 'focus_areas', 'current_stage', 'service_area', 'services_offered') ORDER BY ordinal_position;\""
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
service_area         | character varying  | YES
services_offered     | text               | YES
```

**Critical Fields for Phase 2:**
- `revenue_tier` (VARCHAR) - Must match pattern tier values EXACTLY
- `focus_areas` (TEXT) - Used for pattern matching algorithm
- `team_size` (VARCHAR) - Factor in similarity scoring
- `current_stage` (VARCHAR) - Lifecycle alignment

#### ai_concierge_goals table (PHASE 1 - VERIFY!)
```bash
powershell -Command ".\quick-db.bat \"SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'ai_concierge_goals' AND column_name IN ('id', 'contractor_id', 'goal_type', 'goal_description', 'priority_score', 'pattern_source', 'pattern_confidence', 'data_gaps') ORDER BY ordinal_position;\""
```

**Expected Columns (verify exact names!):**
```
column_name          | data_type          | is_nullable
---------------------|--------------------|-----------
id                   | integer            | NO
contractor_id        | integer            | NO
goal_type            | character varying  | NO
goal_description     | text               | NO
priority_score       | integer            | YES
pattern_source       | text               | YES
pattern_confidence   | numeric(3,2)       | YES
data_gaps            | jsonb              | YES
```

**Phase 2 Enhancements:**
- `pattern_source` (TEXT) - NEW: Attribution text like "Based on 47 contractors who went from $3M to $5M"
- `pattern_confidence` (NUMERIC) - NEW: 0.00-1.00 confidence score from pattern

**What to Check:**
- ✅ Exact spelling (snake_case vs camelCase)
- ✅ Underscores vs no underscores
- ✅ Singular vs plural
- ✅ **Phase 2 Critical:** `from_revenue_tier` NOT `fromRevenueTier`, `match_score` NOT `matchScore`

---

### Step 3: Verify CHECK Constraints

**For tables with enum-like fields (status, type, category, etc.):**

```bash
# Run this command for EACH table with enum fields:
powershell -Command ".\quick-db.bat \"SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'TABLE_NAME'::regclass AND contype = 'c';\""
```

**Action:** Document exact allowed values from CHECK constraints.

**Phase 2 Critical Constraints - To Be Verified:**

#### business_growth_patterns (AFTER CREATION)
```bash
powershell -Command ".\quick-db.bat \"SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'business_growth_patterns'::regclass AND contype = 'c';\""
```

**Expected Constraints:**
- `confidence_score`: CHECK BETWEEN 0 AND 1 (stored as NUMERIC(3,2))

**IMPORTANT:** Pattern type has no CHECK constraint - it's a flexible VARCHAR field. Common values: 'revenue_growth', 'team_expansion', 'lead_improvement'.

#### contractor_pattern_matches (AFTER CREATION)
```bash
powershell -Command ".\quick-db.bat \"SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'contractor_pattern_matches'::regclass AND contype = 'c';\""
```

**Expected Constraints:**
- `match_score`: CHECK BETWEEN 0 AND 1 (stored as NUMERIC(3,2))
- `pattern_result`: No CHECK constraint, but use: 'pending', 'successful', 'unsuccessful', 'in_progress'

#### pattern_success_tracking (AFTER CREATION)
```bash
powershell -Command ".\quick-db.bat \"SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'pattern_success_tracking'::regclass AND contype = 'c';\""
```

**Expected Constraints:**
- `contractor_satisfaction`: CHECK BETWEEN 1 AND 5 (1-5 rating scale)
- `revenue_impact`: No CHECK constraint, but use: 'positive', 'neutral', 'negative', 'too_early'

**What to Check:**
- ✅ Exact enum values (case-sensitive!)
- ✅ All allowed values (don't assume!)
- ✅ **Phase 2 Critical:** Match scores MUST be 0.00-1.00, satisfaction MUST be 1-5

---

### Step 4: Verify Foreign Key Constraints

**For tables with relationships:**

```bash
# Run this command to see foreign keys:
powershell -Command ".\quick-db.bat \"SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'TABLE_NAME'::regclass AND contype = 'f';\""
```

**Action:** Document which fields reference other tables.

**Phase 2 Key Foreign Keys - To Be Verified:**

#### business_growth_patterns (AFTER CREATION)
```bash
powershell -Command ".\quick-db.bat \"SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'business_growth_patterns'::regclass AND contype = 'f';\""
```

**Expected:**
No foreign keys - this is a standalone pattern library table.

#### contractor_pattern_matches (AFTER CREATION)
```bash
powershell -Command ".\quick-db.bat \"SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'contractor_pattern_matches'::regclass AND contype = 'f';\""
```

**Expected:**
```
conname                                           | pg_get_constraintdef
--------------------------------------------------|--------------------
contractor_pattern_matches_contractor_id_fkey     | FOREIGN KEY (contractor_id) REFERENCES contractors(id) ON DELETE CASCADE
contractor_pattern_matches_pattern_id_fkey        | FOREIGN KEY (pattern_id) REFERENCES business_growth_patterns(id) ON DELETE CASCADE
```

#### pattern_success_tracking (AFTER CREATION)
```bash
powershell -Command ".\quick-db.bat \"SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'pattern_success_tracking'::regclass AND contype = 'f';\""
```

**Expected:**
```
pattern_success_tracking_pattern_id_fkey      | FOREIGN KEY (pattern_id) REFERENCES business_growth_patterns(id) ON DELETE CASCADE
pattern_success_tracking_contractor_id_fkey   | FOREIGN KEY (contractor_id) REFERENCES contractors(id) ON DELETE CASCADE
pattern_success_tracking_goal_id_fkey         | FOREIGN KEY (goal_id) REFERENCES ai_concierge_goals(id) ON DELETE CASCADE
```

**What to Check:**
- ✅ Which fields are foreign keys
- ✅ Which tables they reference
- ✅ CASCADE behavior (pattern matches deleted when contractor or pattern deleted)
- ✅ **Phase 2 Critical:** Pattern generation must check pattern exists, contractor exists before creating matches

---

### Step 5: Check Data Types (Especially JSON/TEXT)

**From Step 2 output, identify:**
- TEXT vs VARCHAR
- INTEGER vs BIGINT
- TIMESTAMP vs TIMESTAMPTZ
- **TEXT vs JSONB** (most important!)
- BOOLEAN fields
- NUMERIC for decimal values

**Phase 2 Critical Data Types:**

| Field                          | Type           | Notes                                         |
|--------------------------------|----------------|-----------------------------------------------|
| `pattern_name`                 | VARCHAR(255)   | Short descriptive name                        |
| `pattern_description`          | TEXT           | Long-form description                         |
| `pattern_type`                 | VARCHAR(100)   | Plain text: 'revenue_growth', etc.            |
| `common_focus_areas`           | JSONB          | Array: ["greenfield_growth", "operations"]    |
| `common_partners`              | JSONB          | Array of objects: [{partner_id: 5, usage: 0.89}] |
| `common_milestones`            | JSONB          | Array: ["hired_ops_manager", "implemented_crm"] |
| `common_books`                 | JSONB          | Array of book titles with usage rates         |
| `common_podcasts`              | JSONB          | Array of podcast names                        |
| `common_events`                | JSONB          | Array of event names                          |
| `success_indicators`           | JSONB          | Object: {lead_flow_improved: true, revenue_increased: 40} |
| `sample_size`                  | INTEGER        | Number of contractors (used for confidence)   |
| `confidence_score`             | NUMERIC(3,2)   | 0.00-1.00 statistical confidence              |
| `match_score`                  | NUMERIC(3,2)   | 0.00-1.00 pattern fit quality                 |
| `match_reason`                 | TEXT           | Human-readable explanation                    |
| `pattern_result`               | VARCHAR(50)    | Plain text: 'pending', 'successful', etc.     |
| `goals_generated`              | INTEGER        | Count of goals created                        |
| `goal_completed`               | BOOLEAN        | True/false success indicator                  |
| `time_to_completion_days`      | INTEGER        | Duration in days                              |
| `contractor_satisfaction`      | INTEGER        | 1-5 rating                                    |
| `revenue_impact`               | VARCHAR(50)    | Plain text: 'positive', 'neutral', etc.       |

**Action:** Ensure code uses correct data types.

**Common Issues:**
- ❌ Using `JSON.parse()` on VARCHAR field (plain text, not JSON)
- ❌ Storing object without using JSONB data structure
- ❌ Using wrong number type for scores (INTEGER vs NUMERIC)
- ❌ Not checking if JSONB field is null before accessing properties
- ❌ Treating JSONB array as string

---

### Step 6: Document Findings BEFORE Coding

**Create a verification block at the top of the file:**

```javascript
// DATABASE-CHECKED: [table_names] columns verified [date]
// ================================================================
// VERIFIED CONSTRAINTS:
// - table_name.field_name: CHECK IN ('value1', 'value2', 'value3')
// - table_name.score: CHECK BETWEEN 0 AND 1
// ================================================================
// VERIFIED FIELD NAMES:
// - field_one (NOT fieldOne, NOT field1)
// - another_field (NOT anotherField)
// ================================================================
// VERIFIED DATA TYPES:
// - common_partners: JSONB (array of objects)
// - pattern_type: VARCHAR (plain text, not JSON)
// - confidence_score: NUMERIC(3,2) (0.00-1.00)
// ================================================================
```

**Phase 2 Example (Pattern Analysis Service):**
```javascript
// DATABASE-CHECKED: business_growth_patterns, contractors verified October 22, 2025
// ================================================================
// VERIFIED CONSTRAINTS:
// - business_growth_patterns.confidence_score: CHECK BETWEEN 0 AND 1
// - pattern_success_tracking.contractor_satisfaction: CHECK BETWEEN 1 AND 5
// ================================================================
// VERIFIED FIELD NAMES:
// - from_revenue_tier (NOT fromRevenueTier)
// - to_revenue_tier (NOT toRevenueTier)
// - pattern_name (NOT patternName)
// - common_focus_areas (NOT commonFocusAreas)
// - common_partners (NOT commonPartners)
// - sample_size (NOT sampleSize)
// - confidence_score (NOT confidenceScore)
// ================================================================
// VERIFIED DATA TYPES:
// - common_focus_areas: JSONB (array of strings)
// - common_partners: JSONB (array of objects with partner_id, usage_rate, avg_satisfaction)
// - common_milestones: JSONB (array of strings)
// - success_indicators: JSONB (object with boolean/numeric values)
// - sample_size: INTEGER (count of contractors)
// - confidence_score: NUMERIC(3,2) (0.00-1.00)
// - match_score: NUMERIC(3,2) (0.00-1.00)
// ================================================================
// PATTERN ANALYSIS OPERATIONS:
// - analyzeRevenueTransitions: Find contractors who leveled up
// - identifyCommonPatterns: Extract common focus areas, partners, actions
// - calculatePatternConfidence: Statistical confidence based on sample size
// - storePattern: INSERT with sample_size, confidence_score 0.00-1.00
// ================================================================
```

**Phase 2 Example (Pattern Matching Service):**
```javascript
// DATABASE-CHECKED: contractor_pattern_matches, business_growth_patterns, contractors verified October 22, 2025
// ================================================================
// VERIFIED CONSTRAINTS:
// - contractor_pattern_matches.match_score: CHECK BETWEEN 0 AND 1
// ================================================================
// VERIFIED FIELD NAMES:
// - contractor_id (NOT contractorId)
// - pattern_id (NOT patternId)
// - match_score (NOT matchScore)
// - match_reason (NOT matchReason)
// - pattern_result (NOT patternResult)
// - goals_generated (NOT goalsGenerated)
// ================================================================
// VERIFIED DATA TYPES:
// - match_score: NUMERIC(3,2) (0.00-1.00)
// - match_reason: TEXT (human-readable explanation)
// - pattern_result: VARCHAR(50) ('pending', 'successful', 'unsuccessful', 'in_progress')
// - goals_generated: INTEGER (count)
// - checklist_items_generated: INTEGER (count)
// ================================================================
// PATTERN MATCHING OPERATIONS:
// - findMatchingPatterns: Query patterns WHERE revenue_tier matches
// - calculateMatchScore: Revenue tier (30%) + Focus areas (40%) + Team size (15%) + Stage (15%)
// - applyPatternToContractor: INSERT with match_score 0.00-1.00
// - rankPatternsByRelevance: ORDER BY match_score DESC
// ================================================================
```

**Phase 2 Example (Enhanced Goal Generation):**
```javascript
// DATABASE-CHECKED: ai_concierge_goals, business_growth_patterns, contractor_pattern_matches verified October 22, 2025
// ================================================================
// VERIFIED CONSTRAINTS:
// - ai_concierge_goals.priority_score: CHECK BETWEEN 1 AND 10
// - ai_concierge_goals.pattern_confidence: CHECK BETWEEN 0 AND 1
// ================================================================
// VERIFIED FIELD NAMES:
// - pattern_source (NOT patternSource) - NEW Phase 2 field
// - pattern_confidence (NOT patternConfidence) - NEW Phase 2 field
// - goal_description (NOT goalDescription)
// - priority_score (NOT priorityScore)
// ================================================================
// VERIFIED DATA TYPES:
// - pattern_source: TEXT (attribution like "Based on 47 contractors who went from $3M to $5M")
// - pattern_confidence: NUMERIC(3,2) (0.00-1.00 from pattern)
// - goal_description: TEXT (enhanced with pattern data)
// ================================================================
// ENHANCED GOAL GENERATION:
// - Query matching patterns before generating goals
// - Use pattern data to inform goal descriptions, priorities, milestones
// - Include pattern_source and pattern_confidence in goal record
// - Generate checklist items from pattern's common_milestones
// - Boost priority_score if pattern has high confidence
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

**Phase 2 Specific Checks:**
1. Verify `business_growth_patterns` table exists in production after creation
2. Verify `contractor_pattern_matches` table exists in production after creation
3. Verify `pattern_success_tracking` table exists in production after creation
4. Verify Phase 1 tables (`ai_concierge_goals`, `ai_concierge_checklist_items`) have new pattern fields
5. Verify constraints match between dev and prod
6. Verify foreign keys match between dev and prod
7. Verify indexes created on both environments

**Action:** Confirm both environments match before deploying pattern learning system.

---

## 🚨 Red Flags - STOP and Verify

If you see ANY of these in Phase 2, STOP and run verification queries:

1. **Setting from_revenue_tier** → Verify exact contractor revenue tier values
   ```javascript
   from_revenue_tier: '0_5_million'  // ⚠️ STOP! Must match contractor tiers EXACTLY
   ```

2. **Storing common_focus_areas** → Verify JSONB array structure
   ```javascript
   common_focus_areas: ['greenfield_growth', 'operational_efficiency']  // ⚠️ STOP! Verify JSONB type
   ```

3. **Calculating confidence_score** → Verify 0.00-1.00 range
   ```javascript
   confidence_score: 0.95  // ⚠️ STOP! Must be NUMERIC(3,2) between 0 and 1
   ```

4. **Storing common_partners** → Verify JSONB object array structure
   ```javascript
   common_partners: [{partner_id: 5, usage_rate: 0.89, avg_satisfaction: 4.8}]  // ⚠️ STOP! Verify structure
   ```

5. **Setting match_score** → Verify 0.00-1.00 range
   ```javascript
   match_score: 0.87  // ⚠️ STOP! Must be NUMERIC(3,2) between 0 and 1
   ```

6. **Foreign key checks** → Verify pattern and contractor exist
   ```javascript
   INSERT INTO contractor_pattern_matches (contractor_id, pattern_id, ...)  // ⚠️ STOP! Do both exist?
   ```

7. **Setting pattern_result** → Verify exact values
   ```javascript
   pattern_result: 'success'  // ⚠️ STOP! Is it 'successful' or 'success'?
   ```

8. **Setting contractor_satisfaction** → Verify 1-5 range
   ```javascript
   contractor_satisfaction: 3  // ⚠️ STOP! Must be 1-5 per CHECK constraint
   ```

9. **Storing pattern_source** → Verify TEXT type, not JSONB
   ```javascript
   pattern_source: 'Based on 47 contractors...'  // ⚠️ STOP! Plain TEXT, not JSON
   ```

10. **Sample size for confidence** → Verify >= 5 for valid pattern
    ```javascript
    if (sample_size < 5) { /* Pattern not valid */ }  // ⚠️ STOP! Minimum sample size check
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

### List All Pattern-Related Tables
```bash
powershell -Command ".\quick-db.bat \"SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND (table_name LIKE '%pattern%' OR table_name LIKE '%goal%' OR table_name LIKE '%checklist%') ORDER BY table_name;\""
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

### Check Pattern Count by Tier
```bash
powershell -Command ".\quick-db.bat \"SELECT from_revenue_tier, to_revenue_tier, COUNT(*) FROM business_growth_patterns GROUP BY from_revenue_tier, to_revenue_tier;\""
```

### Check Pattern Confidence Scores
```bash
powershell -Command ".\quick-db.bat \"SELECT pattern_name, sample_size, confidence_score FROM business_growth_patterns ORDER BY confidence_score DESC LIMIT 10;\""
```

---

## ✅ Example: Creating patternAnalysisService.js

### Pre-Flight Verification:

**1. Tables Involved:**
- `business_growth_patterns` (create patterns)
- `contractors` (read contractor profile for analysis)

**2. Column Names Verified:**
```bash
# Run both:
powershell -Command ".\quick-db.bat \"SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'business_growth_patterns' ORDER BY ordinal_position;\""
powershell -Command ".\quick-db.bat \"SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'contractors' AND column_name IN ('id', 'revenue_tier', 'focus_areas', 'team_size') ORDER BY ordinal_position;\""

# Document results:
# business_growth_patterns: id, from_revenue_tier, to_revenue_tier, pattern_name, common_focus_areas, sample_size, confidence_score, ...
# contractors: id, revenue_tier, focus_areas, team_size, ...
```

**3. CHECK Constraints Verified:**
```bash
powershell -Command ".\quick-db.bat \"SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'business_growth_patterns'::regclass AND contype = 'c';\""

# Document results:
# confidence_score: CHECK BETWEEN 0 AND 1 (NUMERIC(3,2))
```

**4. Foreign Keys Verified:**
```sql
-- business_growth_patterns:
-- No foreign keys (standalone pattern library)

-- contractors:
-- No foreign keys relevant to pattern analysis
```

**5. Data Types Noted:**
- `pattern_name`: VARCHAR(255) (short descriptive name)
- `pattern_description`: TEXT (long-form description)
- `common_focus_areas`: JSONB (array of focus area strings)
- `common_partners`: JSONB (array of partner objects)
- `common_milestones`: JSONB (array of milestone strings)
- `sample_size`: INTEGER (count of contractors in pattern)
- `confidence_score`: NUMERIC(3,2) (0.00-1.00)
- `avg_time_to_level_up_months`: INTEGER (average duration)

**6. Documentation Block:**
```javascript
// DATABASE-CHECKED: business_growth_patterns, contractors verified October 22, 2025
// ================================================================
// VERIFIED CONSTRAINTS:
// - business_growth_patterns.confidence_score: CHECK BETWEEN 0 AND 1
// ================================================================
// VERIFIED FIELD NAMES:
// - from_revenue_tier (NOT fromRevenueTier)
// - to_revenue_tier (NOT toRevenueTier)
// - pattern_name (NOT patternName)
// - pattern_description (NOT patternDescription)
// - common_focus_areas (NOT commonFocusAreas)
// - common_partners (NOT commonPartners)
// - common_milestones (NOT commonMilestones)
// - sample_size (NOT sampleSize)
// - confidence_score (NOT confidenceScore)
// - avg_time_to_level_up_months (NOT avgTimeToLevelUpMonths)
// ================================================================
// VERIFIED DATA TYPES:
// - common_focus_areas: JSONB (array of strings)
// - common_partners: JSONB (array of objects)
// - common_milestones: JSONB (array of strings)
// - sample_size: INTEGER (count)
// - confidence_score: NUMERIC(3,2) (0.00-1.00)
// ================================================================
// PATTERN ANALYSIS OPERATIONS:
// - analyzeRevenueTransitions: Find contractors who leveled up
// - identifyCommonPatterns: Extract common focus areas, partners, actions
// - calculatePatternConfidence: Statistical confidence = min(1.0, sample_size / 20)
// - storePattern: INSERT with sample_size >= 5, confidence_score 0.00-1.00
// ================================================================
```

**NOW WE CAN CODE PATTERN ANALYSIS SAFELY!**

---

## 📚 Phase 2 Specific Verification Notes

### Pattern Analysis Service Checklist
- [ ] Verify `from_revenue_tier` matches contractor revenue tier values EXACTLY
- [ ] Verify `to_revenue_tier` matches contractor revenue tier values EXACTLY
- [ ] Verify `pattern_type` valid values (or no constraint)
- [ ] Verify `common_focus_areas` is JSONB array type
- [ ] Verify `common_partners` is JSONB array of objects
- [ ] Verify `common_milestones` is JSONB array type
- [ ] Verify `sample_size` is INTEGER type (minimum 5 for valid pattern)
- [ ] Verify `confidence_score` is NUMERIC(3,2) with CHECK BETWEEN 0 AND 1

### Pattern Matching Service Checklist
- [ ] Verify `contractor_id` FK to contractors
- [ ] Verify `pattern_id` FK to business_growth_patterns
- [ ] Verify `match_score` is NUMERIC(3,2) with CHECK BETWEEN 0 AND 1
- [ ] Verify `match_reason` is TEXT type
- [ ] Verify `pattern_result` valid values
- [ ] Verify `goals_generated` and `checklist_items_generated` are INTEGER

### Enhanced Goal Generation Checklist
- [ ] Verify Phase 1 `ai_concierge_goals` table has `pattern_source` field (TEXT)
- [ ] Verify Phase 1 `ai_concierge_goals` table has `pattern_confidence` field (NUMERIC)
- [ ] Verify pattern query joins tables correctly
- [ ] Verify pattern data enhances goal descriptions
- [ ] Verify pattern confidence boosts priority scores correctly

### Pattern Success Tracking Checklist
- [ ] Verify `pattern_id` FK to business_growth_patterns
- [ ] Verify `contractor_id` FK to contractors
- [ ] Verify `goal_id` FK to ai_concierge_goals
- [ ] Verify `goal_completed` is BOOLEAN type
- [ ] Verify `contractor_satisfaction` is INTEGER with CHECK BETWEEN 1 AND 5
- [ ] Verify `revenue_impact` valid values

---

## 🚨 Phase 2 Critical Gotchas

### 1. Revenue Tier Alignment
```javascript
// ❌ WRONG (made-up tier value):
from_revenue_tier: '3M-5M'

// ✅ CORRECT (exact contractor tier value):
from_revenue_tier: '0_5_million'  // Must match contractors.revenue_tier exactly
```

### 2. JSONB Arrays vs Strings
```javascript
// ❌ WRONG (if common_focus_areas is JSONB):
common_focus_areas: '["greenfield_growth", "operations"]'  // String, not array

// ✅ CORRECT (if common_focus_areas is JSONB):
common_focus_areas: ["greenfield_growth", "operational_efficiency"]  // Direct array

// When reading:
const focusAreas = pattern.common_focus_areas;  // Already parsed as array
```

### 3. JSONB Object Arrays (Partners)
```javascript
// ❌ WRONG (flat array):
common_partners: [5, 12, 23]  // Just IDs, no context

// ✅ CORRECT (array of objects with usage rates):
common_partners: [
  { partner_id: 5, usage_rate: 0.89, avg_satisfaction: 4.8 },
  { partner_id: 12, usage_rate: 0.67, avg_satisfaction: 4.5 }
]
```

### 4. Confidence Score Range
```javascript
// ❌ WRONG (outside 0.00-1.00 range):
confidence_score: 95  // Percentage, not decimal

// ✅ CORRECT (0.00-1.00 range):
confidence_score: 0.95  // Must be NUMERIC(3,2) between 0 and 1
```

### 5. Sample Size Minimum
```javascript
// ❌ WRONG (too few samples):
if (sample_size >= 1) { createPattern() }  // Not statistically valid

// ✅ CORRECT (minimum 5 samples):
if (sample_size >= 5) { createPattern() }  // Only create with enough data
```

### 6. Match Score Calculation
```javascript
// ❌ WRONG (score outside 0-1 range):
match_score = (revenueTierMatch * 0.3) + (focusAreaMatch * 0.4) + ...
// Could exceed 1.0 if not capped

// ✅ CORRECT (ensure 0.00-1.00 range):
match_score = Math.min(1.0, Math.max(0.0,
  (revenueTierMatch * 0.3) + (focusAreaMatch * 0.4) + (teamSizeMatch * 0.15) + (stageMatch * 0.15)
));
```

### 7. Pattern Result Values
```javascript
// ❌ WRONG (typo or inconsistent):
pattern_result: 'success'

// ✅ CORRECT (exact values):
pattern_result: 'successful'  // Or: 'pending', 'unsuccessful', 'in_progress'
```

### 8. Revenue Impact Values
```javascript
// ❌ WRONG (inconsistent naming):
revenue_impact: 'good'

// ✅ CORRECT (exact values):
revenue_impact: 'positive'  // Or: 'neutral', 'negative', 'too_early'
```

### 9. Pattern Attribution Text
```javascript
// ❌ WRONG (storing as JSONB):
pattern_source: { count: 47, from_tier: '0_5_million', to_tier: '5_10_million' }

// ✅ CORRECT (plain TEXT string):
pattern_source: 'Based on 47 contractors who went from $3M to $5M - 89% improved lead systems first'
```

### 10. Satisfaction Rating Range
```javascript
// ❌ WRONG (outside 1-5 range):
contractor_satisfaction: 10  // Will fail CHECK constraint

// ✅ CORRECT (1-5 range):
contractor_satisfaction: 4  // Must be 1-5 per CHECK constraint
```

---

## 📚 Related Documents

- **Database Source of Truth:** `DATABASE-SOURCE-OF-TRUTH.md` (project root)
- **Phase 2 Implementation Plan:** `PHASE-2-IMPLEMENTATION-PLAN.md` (this directory)
- **Phase 1 Pre-Flight Checklist:** `../phase-1/PHASE-1-PRE-FLIGHT-CHECKLIST.md`
- **Internal Goal Engine Overview:** `../INTERNAL-GOAL-ENGINE-OVERVIEW.md`
- **AI Field Naming Conventions:** `docs/AI-FIELD-NAMING-CONVENTIONS.md`

---

**Last Updated:** October 22, 2025
**Next Review:** Before each file creation in Phase 2 Days 1-7
**Status:** MANDATORY - Use this checklist religiously

---

## 🎯 Quick Start for Phase 2 Day 1

**Before creating ANY file, run these commands to verify existing tables:**

```bash
# 1. Check contractors table (existing - for pattern analysis)
powershell -Command ".\quick-db.bat \"SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'contractors' AND column_name IN ('id', 'revenue_tier', 'team_size', 'focus_areas', 'current_stage', 'service_area', 'services_offered') ORDER BY ordinal_position;\""

# 2. Check ai_concierge_goals table (Phase 1 - verify pattern fields added)
powershell -Command ".\quick-db.bat \"SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'ai_concierge_goals' ORDER BY ordinal_position;\""

# 3. After creating new tables, verify:
powershell -Command ".\quick-db.bat \"SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'business_growth_patterns' ORDER BY ordinal_position;\""

powershell -Command ".\quick-db.bat \"SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'contractor_pattern_matches' ORDER BY ordinal_position;\""

powershell -Command ".\quick-db.bat \"SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'pattern_success_tracking' ORDER BY ordinal_position;\""

# 4. Verify CHECK constraints on new tables:
powershell -Command ".\quick-db.bat \"SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'business_growth_patterns'::regclass AND contype = 'c';\""

powershell -Command ".\quick-db.bat \"SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'contractor_pattern_matches'::regclass AND contype = 'c';\""

powershell -Command ".\quick-db.bat \"SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'pattern_success_tracking'::regclass AND contype = 'c';\""

# 5. Verify foreign keys on new tables:
powershell -Command ".\quick-db.bat \"SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'contractor_pattern_matches'::regclass AND contype = 'f';\""

powershell -Command ".\quick-db.bat \"SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'pattern_success_tracking'::regclass AND contype = 'f';\""
```

**Document results, then code safely!**
