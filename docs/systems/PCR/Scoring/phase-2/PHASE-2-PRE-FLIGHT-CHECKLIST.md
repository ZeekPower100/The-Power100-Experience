# Phase 2: Pre-Flight Checklist for Performance Intelligence Layer

**Document Version:** 1.0
**Date:** October 30, 2025
**Status:** MANDATORY - Use before creating or modifying ANY file
**Phase:** Performance Intelligence Layer (Momentum & Badges)

---

## 🎯 Purpose

This checklist ensures 100% database alignment for every file we create or modify during Phase 2 implementation (Momentum Modifiers & Trust Badges). Following this prevents naming mismatches and constraint violations when implementing the performance tracking system.

---

## ✅ MANDATORY CHECKLIST - Before Creating/Modifying ANY File

### Step 1: Identify Database Tables Involved

**Question:** What database tables will this file interact with?

**Phase 2 Primary Table:**
- **strategic_partners** (EXISTING - will add 5 new momentum/badge fields)

**Phase 2 Related Tables** (may query but not modify):
- **contractors** (for matching algorithm with badges)
- **contractor_partner_matches** (for badge-enhanced ranking)

**Example:**
- Momentum calculation service: `strategic_partners`
- Badge eligibility service: `strategic_partners`
- Badge display components: `strategic_partners`
- Matching algorithm with badges: `strategic_partners`, `contractor_partner_matches`

**Action:** List all tables this file will query, insert, update, or reference.

---

### Step 2: Verify Column Names (Field Names)

**For EACH table identified in Step 1:**

```bash
# Run this command for EACH table:
powershell -Command ".\quick-db.bat \"SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'TABLE_NAME' ORDER BY ordinal_position;\""
```

**Action:** Document exact column names from database output.

**Phase 2 Key Table - MUST VERIFY:**

#### strategic_partners table (CURRENT STATE - 140 columns)
```bash
powershell -Command ".\quick-db.bat \"SELECT column_name, data_type, character_maximum_length, column_default, is_nullable FROM information_schema.columns WHERE table_name = 'strategic_partners' ORDER BY ordinal_position;\""
```

**Current Column Count:** 140 columns (verified October 30, 2025)
- 124 original columns
- 16 Phase 1 PCR fields (added October 29, 2025)

**Existing Phase 1 Fields (WILL USE - DO NOT MODIFY):**
```
column_name                      | data_type          | column_default         | is_nullable
---------------------------------|--------------------|-----------------------|------------
quarterly_history                | jsonb              | '[]'::jsonb           | YES  ✅ Use for trend analysis
base_pcr_score                   | numeric(5,2)       |                       | YES  ✅ Track for momentum
final_pcr_score                  | numeric(5,2)       |                       | YES  ✅ Current score
pcr_last_calculated              | timestamp          |                       | YES  ✅ Last calc time
engagement_tier                  | character varying  | 'free'                | YES  ✅ Tier badges
payment_multiplier               | numeric(3,1)       | 1.5                   | YES
profile_completion_score         | integer            | 0                     | YES
quarterly_feedback_score         | numeric(5,2)       | 50.00                 | YES
has_quarterly_data               | boolean            | false                 | YES
```

**Existing Legacy Fields (AWARE OF - may reuse):**
```
column_name                      | data_type          | notes
---------------------------------|--------------------|------------------
score_trend                      | character varying  | Legacy field - consider using for performance_trend
feedback_trend                   | character varying  | Legacy field - different purpose
```

**NEW Phase 2 Fields (WILL ADD - verify exact names!):**
```
Expected column_name              | data_type          | column_default         | constraints
---------------------------------|--------------------|-----------------------|-------------
momentum_modifier                | integer            | 0                     | CHECK IN (-3, 0, 5)
performance_trend                | character varying  | 'new'                 | CHECK IN ('improving', 'stable', 'declining', 'new')
quarters_tracked                 | integer            | 0                     | CHECK >= 0
earned_badges                    | jsonb              | '[]'::jsonb           | Array of badge objects
badge_last_updated               | timestamp          |                       |
```

**Critical Fields for Phase 2:**
- `momentum_modifier` (INTEGER) - Performance modifier: -3 (declining), 0 (stable/new), +5 (hot streak)
- `performance_trend` (VARCHAR) - Trend classification: 'improving', 'stable', 'declining', 'new'
- `quarters_tracked` (INTEGER) - Number of quarters with data (for determining trend eligibility)
- `earned_badges` (JSONB) - Array of badge objects: `[{type: 'tier', name: 'Power Gold'}, {type: 'performance', name: 'hot_partner'}]`
- `badge_last_updated` (TIMESTAMP) - Last time badges were recalculated

**What to Check:**
- ✅ Exact spelling (snake_case vs camelCase)
- ✅ Underscores vs no underscores
- ✅ Singular vs plural (`earned_badges` not `earned_badge`)
- ✅ **Phase 2 Critical:** `momentum_modifier` NOT `momentumModifier`, `performance_trend` NOT `performanceTrend`

---

### Step 3: Verify CHECK Constraints

**For tables with enum-like fields (status, type, category, tier, trend, etc.):**

```bash
# Run this command for each table with enum fields:
powershell -Command ".\quick-db.bat \"SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'TABLE_NAME'::regclass AND contype = 'c';\""
```

**Action:** Document exact allowed values from CHECK constraints.

**Phase 2 Critical Constraints - To Be Verified:**

#### strategic_partners (AFTER ADDING PHASE 2 FIELDS)
```bash
powershell -Command ".\quick-db.bat \"SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'strategic_partners'::regclass AND contype = 'c';\""
```

**Expected NEW Constraints:**
```
constraint_name                                      | constraint_definition
----------------------------------------------------|----------------------
strategic_partners_momentum_modifier_check           | CHECK (momentum_modifier IN (-3, 0, 5))
strategic_partners_performance_trend_check           | CHECK (performance_trend IN ('improving', 'stable', 'declining', 'new'))
strategic_partners_quarters_tracked_check            | CHECK (quarters_tracked >= 0)
```

**IMPORTANT Phase 2 Constraint Rules:**
1. **Momentum Modifier:** MUST be -3, 0, or 5 (integer values only)
2. **Performance Trend:** MUST be 'improving', 'stable', 'declining', or 'new' (lowercase, exact spelling)
3. **Quarters Tracked:** MUST be >= 0 (cannot be negative)
4. **Earned Badges:** JSONB array (no constraint, flexible structure)

**What to Check:**
- ✅ Exact enum values (case-sensitive!)
- ✅ All allowed values (don't assume!)
- ✅ **Phase 2 Critical:** Momentum values as integers (-3, 0, 5 not strings), trend values lowercase

---

### Step 4: Verify Foreign Key Constraints

**For tables with relationships:**

```bash
# Run this command to see foreign keys:
powershell -Command ".\quick-db.bat \"SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'TABLE_NAME'::regclass AND contype = 'f';\""
```

**Action:** Document which fields reference other tables.

**Phase 2 Key Foreign Keys - To Be Verified:**

#### strategic_partners (EXISTING - No new FKs in Phase 2)
```bash
powershell -Command ".\quick-db.bat \"SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'strategic_partners'::regclass AND contype = 'f';\""
```

**Expected:**
No new foreign keys in Phase 2. All momentum and badge calculations happen within strategic_partners table using existing quarterly_history JSONB data.

**Phase 2 Note:** We're NOT adding foreign keys. All trend analysis uses quarterly_history JSONB within strategic_partners table.

**What to Check:**
- ✅ Confirm NO new foreign keys expected in Phase 2
- ✅ Existing foreign keys (if any) don't conflict with new fields

---

### Step 5: Check Data Types (Especially JSON/TEXT/INTEGER)

**From Step 2 output, identify:**
- TEXT vs VARCHAR
- INTEGER vs NUMERIC
- TIMESTAMP vs TIMESTAMPTZ
- **JSONB vs TEXT** (most important!)
- BOOLEAN fields
- INTEGER for momentum modifiers

**Phase 2 Critical Data Types:**

| Field                          | Type           | Notes                                         |
|--------------------------------|----------------|-----------------------------------------------|
| `momentum_modifier`            | INTEGER        | Whole number: -3, 0, or 5                     |
| `performance_trend`            | VARCHAR(50)    | Plain text: 'improving', 'stable', 'declining', 'new' |
| `quarters_tracked`             | INTEGER        | Count of quarters with data                   |
| `earned_badges`                | JSONB          | Array of badge objects: [{type, name, earned_date}] |
| `badge_last_updated`           | TIMESTAMP      | Last badge recalculation time                 |

**Existing Fields to Use (Data Type Verification):**
| Field                          | Type           | Notes                                         |
|--------------------------------|----------------|-----------------------------------------------|
| `quarterly_history`            | JSONB          | Array of quarterly scores - use for trend analysis |
| `base_pcr_score`               | NUMERIC(5,2)   | Track history for momentum calculation        |
| `final_pcr_score`              | NUMERIC(5,2)   | Current score                                 |
| `engagement_tier`              | VARCHAR(20)    | Tier badges: 'free', 'gold', 'platinum'       |

**Action:** Ensure code uses correct data types.

**Common Issues:**
- ❌ Using STRING for momentum_modifier (need INTEGER for -3, 0, 5)
- ❌ Using uppercase for performance_trend ('Improving' not 'improving')
- ❌ Not using JSONB array methods for earned_badges
- ❌ Storing badge as string instead of object in JSONB array
- ❌ Using NUMERIC for quarters_tracked (need INTEGER)

---

### Step 6: Document Findings BEFORE Coding

**Create a verification block at the top of the file:**

```javascript
// DATABASE-CHECKED: [table_names] columns verified [date]
// ================================================================
// VERIFIED CONSTRAINTS:
// - table_name.field_name: CHECK IN ('value1', 'value2', 'value3')
// - table_name.score: CHECK BETWEEN 0 AND 100
// ================================================================
// VERIFIED FIELD NAMES:
// - field_one (NOT fieldOne, NOT field1)
// - another_field (NOT anotherField)
// ================================================================
// VERIFIED DATA TYPES:
// - some_modifier: INTEGER (whole number)
// - some_trend: VARCHAR (text)
// - some_badges: JSONB (array of objects)
// ================================================================
```

**Phase 2 Example (Momentum Calculation Service):**
```javascript
// DATABASE-CHECKED: strategic_partners columns verified October 30, 2025
// ================================================================
// VERIFIED CONSTRAINTS:
// - strategic_partners.momentum_modifier: CHECK IN (-3, 0, 5)
// - strategic_partners.performance_trend: CHECK IN ('improving', 'stable', 'declining', 'new')
// - strategic_partners.quarters_tracked: CHECK >= 0
// ================================================================
// VERIFIED FIELD NAMES:
// - momentum_modifier (NOT momentumModifier)
// - performance_trend (NOT performanceTrend)
// - quarters_tracked (NOT quartersTracked)
// - earned_badges (NOT earnedBadges)
// - badge_last_updated (NOT badgeLastUpdated)
// - quarterly_history (NOT quarterlyHistory) - EXISTING FROM PHASE 1
// - base_pcr_score (NOT basePcrScore) - EXISTING FROM PHASE 1
// ================================================================
// VERIFIED DATA TYPES:
// - momentum_modifier: INTEGER (-3, 0, or 5)
// - performance_trend: VARCHAR(50) ('improving', 'stable', 'declining', 'new')
// - quarters_tracked: INTEGER (count >= 0)
// - earned_badges: JSONB (array of badge objects)
// - badge_last_updated: TIMESTAMP (nullable)
// - quarterly_history: JSONB (array from Phase 1) - USE FOR TREND ANALYSIS
// - base_pcr_score: NUMERIC(5,2) (from Phase 1) - TRACK FOR MOMENTUM
// ================================================================
// EXISTING FIELDS TO USE:
// - quarterly_history: JSONB (analyze for trend: compare last 3-4 quarters)
// - base_pcr_score: NUMERIC (current base score for comparison)
// - final_pcr_score: NUMERIC (will apply momentum modifier to this)
// - engagement_tier: VARCHAR (determines tier badge)
// ================================================================
// PHASE 2 CALCULATION OPERATIONS:
// - analyzeTrend: Compare quarterly_history scores to detect improving/declining patterns
// - calculateMomentumModifier: Return -3, 0, or +5 based on trend
// - determineEarnedBadges: Calculate tier + performance badges based on criteria
// - applyMomentumToFinal: Add momentum_modifier to final_pcr_score
// ================================================================
```

---

### Step 7: Verify BOTH Development AND Production

**IMPORTANT:** Check that both environments have the same schema!

```bash
# Development:
powershell -Command ".\quick-db.bat \"SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'strategic_partners' ORDER BY ordinal_position;\""

# Production:
# Use mcp__aws-production__exec tool with same query
PGPASSWORD='dBP0wer100!!' psql -h tpe-database-production.cmtcsi0kytrf.us-east-1.rds.amazonaws.com -U tpeadmin -d tpedb -c "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'strategic_partners' ORDER BY ordinal_position;"
```

**Phase 2 Specific Checks:**
1. Verify strategic_partners table has 140 columns before Phase 2 migration (Phase 1 complete)
2. After migration, verify it has 140 + 5 = 145 columns
3. Verify all new momentum/badge fields exist in both dev and production
4. Verify CHECK constraints match between dev and prod
5. Verify default values match between dev and prod
6. Verify quarterly_history JSONB exists and contains data for trend analysis

**Action:** Confirm both environments match before deploying Phase 2 system.

---

## 🚨 Red Flags - STOP and Verify

If you see ANY of these in Phase 2, STOP and run verification queries:

1. **Setting momentum_modifier** → Verify exact integer values
   ```javascript
   momentum_modifier: '5'  // ⚠️ STOP! Must be INTEGER 5 not string '5'
   momentum_modifier: 10   // ⚠️ STOP! Must be -3, 0, or 5 only
   ```

2. **Setting performance_trend** → Verify exact string values
   ```javascript
   performance_trend: 'Improving'  // ⚠️ STOP! Must be lowercase 'improving'
   performance_trend: 'up'         // ⚠️ STOP! Must be 'improving' not 'up'
   ```

3. **Storing earned_badges** → Verify JSONB array structure
   ```javascript
   // ❌ WRONG (string not JSONB):
   earned_badges = '["hot_partner", "consistent_performer"]'

   // ✅ CORRECT (JSONB array of objects):
   earned_badges = [
     {type: 'tier', name: 'Power Gold', earned_date: '2025-10-30'},
     {type: 'performance', name: 'hot_partner', earned_date: '2025-10-30'}
   ]
   ```

4. **Analyzing quarterly_history** → Verify JSONB array parsing
   ```javascript
   // ❌ WRONG (treating as string):
   const quarters = JSON.parse(partner.quarterly_history)

   // ✅ CORRECT (already parsed object from database):
   const quarters = partner.quarterly_history || []
   ```

5. **Calculating momentum** → Verify returns -3, 0, or 5 only
   ```javascript
   // ❌ WRONG (returns any number):
   momentum_modifier = scoreDifference

   // ✅ CORRECT (returns only -3, 0, or 5):
   if (improving3Quarters) momentum_modifier = 5
   else if (declining2Quarters) momentum_modifier = -3
   else momentum_modifier = 0
   ```

6. **Setting quarters_tracked** → Verify non-negative integer
   ```javascript
   quarters_tracked: -1  // ⚠️ STOP! Cannot be negative
   quarters_tracked: 2.5 // ⚠️ STOP! Must be INTEGER not decimal
   ```

7. **Badge eligibility** → Check against correct thresholds
   ```javascript
   // ❌ WRONG (using final_pcr_score instead of base_pcr_score for trends):
   if (final_pcr_improved) ...

   // ✅ CORRECT (use base_pcr_score for performance trends):
   if (base_pcr_improved) ...
   ```

8. **Tier badge naming** → Verify exact tier values
   ```javascript
   // ❌ WRONG:
   tierBadge = 'Verified'  // Tier is 'gold' not 'verified'

   // ✅ CORRECT:
   if (tier === 'gold') tierBadge = 'Power Gold'
   if (tier === 'platinum') tierBadge = 'Power Platinum'
   ```

9. **Hot Streak detection** → Verify 3+ quarters requirement
   ```javascript
   // ❌ WRONG (only 2 quarters):
   if (quarters_tracked >= 2 && improving) momentum = 5

   // ✅ CORRECT (requires 3 quarters):
   if (quarters_tracked >= 3 && improving3ConsecutiveQuarters) momentum = 5
   ```

10. **Badge timestamp** → Verify TIMESTAMP type
    ```javascript
    // ❌ WRONG (storing as string):
    badge_last_updated = '2025-10-30'

    // ✅ CORRECT (using NOW() or Date object):
    badge_last_updated = NOW()  // SQL
    badge_last_updated = new Date()  // JS before insert
    ```

---

## 📋 Quick Reference Commands

### Check All Columns
```bash
powershell -Command ".\quick-db.bat \"SELECT column_name, data_type, character_maximum_length, column_default, is_nullable FROM information_schema.columns WHERE table_name = 'strategic_partners' ORDER BY ordinal_position;\""
```

### Check Phase 2 Specific Fields
```bash
powershell -Command ".\quick-db.bat \"SELECT column_name, data_type, column_default FROM information_schema.columns WHERE table_name = 'strategic_partners' AND column_name IN ('momentum_modifier', 'performance_trend', 'quarters_tracked', 'earned_badges', 'badge_last_updated');\""
```

### Check Phase 1 Fields We'll Use
```bash
powershell -Command ".\quick-db.bat \"SELECT column_name, data_type, column_default FROM information_schema.columns WHERE table_name = 'strategic_partners' AND column_name IN ('quarterly_history', 'base_pcr_score', 'final_pcr_score', 'engagement_tier');\""
```

### Check All CHECK Constraints
```bash
powershell -Command ".\quick-db.bat \"SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'strategic_partners'::regclass AND contype = 'c';\""
```

### Check Phase 2 Constraints Only
```bash
powershell -Command ".\quick-db.bat \"SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'strategic_partners'::regclass AND contype = 'c' AND (conname LIKE '%momentum%' OR conname LIKE '%trend%' OR conname LIKE '%badge%');\""
```

### Count Columns in strategic_partners
```bash
powershell -Command ".\quick-db.bat \"SELECT COUNT(*) as column_count FROM information_schema.columns WHERE table_name = 'strategic_partners';\""
```

### Check Quarterly History Data
```bash
powershell -Command ".\quick-db.bat \"SELECT company_name, quarterly_history, quarters_tracked FROM strategic_partners WHERE quarterly_history IS NOT NULL AND jsonb_array_length(quarterly_history) > 0 LIMIT 5;\""
```

### Verify Momentum Distribution
```bash
powershell -Command ".\quick-db.bat \"SELECT momentum_modifier, COUNT(*) as partner_count FROM strategic_partners GROUP BY momentum_modifier;\""
```

### Check Badge Distribution
```bash
powershell -Command ".\quick-db.bat \"SELECT jsonb_array_length(earned_badges) as badge_count, COUNT(*) as partners FROM strategic_partners WHERE earned_badges IS NOT NULL GROUP BY badge_count;\""
```

---

## ✅ Phase 2 Specific Verification Notes

### Momentum Calculation Service Checklist
- [ ] Verify `momentum_modifier` is INTEGER type with CHECK IN (-3, 0, 5)
- [ ] Verify `performance_trend` exact values ('improving', 'stable', 'declining', 'new')
- [ ] Verify `quarters_tracked` is INTEGER type with CHECK >= 0
- [ ] Verify `quarterly_history` JSONB exists and contains score history
- [ ] Verify `base_pcr_score` is used for trend analysis (not final_pcr_score)
- [ ] Verify hot streak requires 3+ consecutive quarters of improvement
- [ ] Verify declining requires 2+ consecutive quarters of decline
- [ ] Verify new partners (< 2 quarters) get momentum = 0

### Badge Eligibility Service Checklist
- [ ] Verify `earned_badges` is JSONB array type
- [ ] Verify badge objects have {type, name, earned_date} structure
- [ ] Verify tier badges use exact tier values ('free', 'gold', 'platinum')
- [ ] Verify tier badge display names ('Power Gold', 'Power Platinum')
- [ ] Verify performance badge criteria (hot_partner = 3+ quarters improving)
- [ ] Verify consistent_performer badge (PCR 90+ for 4+ quarters)
- [ ] Verify rising_star badge (base PCR improved 20+ points in 2 quarters)
- [ ] Verify top_rated badge (top 10% in category)

### Migration Script Checklist
- [ ] Verify all new field names match exactly
- [ ] Verify all CHECK constraints defined correctly
- [ ] Verify all default values set correctly
- [ ] Verify no data migration needed (fields start empty/default)
- [ ] Verify indexes created if needed (momentum_modifier, performance_trend)
- [ ] Verify column comments added for documentation

---

## 🚨 Phase 2 Critical Gotchas

### 1. Momentum Modifier as Integer
```javascript
// ❌ WRONG (string):
momentum_modifier: '+5'

// ✅ CORRECT (integer):
momentum_modifier: 5
```

### 2. Performance Trend Case Sensitivity
```javascript
// ❌ WRONG (uppercase):
performance_trend: 'Improving'

// ✅ CORRECT (lowercase):
performance_trend: 'improving'
```

### 3. Quarterly History Analysis
```javascript
// ❌ WRONG (assuming it's a string):
const history = JSON.parse(partner.quarterly_history)

// ✅ CORRECT (already parsed):
const history = partner.quarterly_history || []
```

### 4. Badge Storage Format
```javascript
// ❌ WRONG (array of strings):
earned_badges: ['hot_partner', 'Power Gold']

// ✅ CORRECT (array of objects):
earned_badges: [
  {type: 'performance', name: 'hot_partner', earned_date: '2025-10-30'},
  {type: 'tier', name: 'Power Gold', earned_date: '2025-10-30'}
]
```

### 5. Hot Streak Threshold
```javascript
// ❌ WRONG (only 2 quarters):
if (quarters_tracked >= 2 && allImproving) momentum = 5

// ✅ CORRECT (requires 3 quarters):
if (quarters_tracked >= 3 && last3QuartersImproving) momentum = 5
```

### 6. Using Base PCR for Trends
```javascript
// ❌ WRONG (using final_pcr_score which includes multiplier):
const trend = analyzeTrend(partner.final_pcr_score_history)

// ✅ CORRECT (using base_pcr_score for pure performance):
const trend = analyzeTrend(partner.quarterly_history.map(q => q.base_pcr))
```

### 7. Default Momentum for New Partners
```javascript
// ❌ WRONG (null or undefined):
momentum_modifier: null

// ✅ CORRECT (0 for new/stable):
momentum_modifier: 0
```

### 8. Tier Badge Names
```javascript
// ❌ WRONG (using database value):
tierBadge = partner.engagement_tier  // 'gold'

// ✅ CORRECT (using display name):
tierBadge = partner.engagement_tier === 'gold' ? 'Power Gold' : 'Power Platinum'
```

---

## 📚 Related Documents

- **Database Source of Truth:** `DATABASE-SOURCE-OF-TRUTH.md` (project root)
- **Phase 2 Implementation Plan:** `PHASE-2-IMPLEMENTATION-PLAN.md` (this directory)
- **PCR Overview:** `../PCR-SCORING-OVERVIEW.md`
- **Phase 1 Complete:** `../phase-1/PHASE-1-COMPLETE.md`

---

**Last Updated:** October 30, 2025
**Next Review:** Before each file creation in Phase 2 Days 1-3
**Status:** MANDATORY - Use this checklist religiously

---

## 🎯 Quick Start for Phase 2 Day 1

**Before creating ANY file, run these commands to verify current schema:**

```bash
# 1. Check current strategic_partners table structure (should have 140 columns from Phase 1)
powershell -Command ".\quick-db.bat \"SELECT COUNT(*) as column_count FROM information_schema.columns WHERE table_name = 'strategic_partners';\""

# 2. Check Phase 1 fields we'll use for Phase 2
powershell -Command ".\quick-db.bat \"SELECT column_name, data_type, column_default FROM information_schema.columns WHERE table_name = 'strategic_partners' AND column_name IN ('quarterly_history', 'base_pcr_score', 'final_pcr_score', 'engagement_tier', 'pcr_last_calculated');\""

# 3. Check for any existing momentum/badge fields (should be empty before Phase 2)
powershell -Command ".\quick-db.bat \"SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'strategic_partners' AND (column_name LIKE '%momentum%' OR column_name LIKE '%badge%' OR column_name = 'performance_trend' OR column_name = 'quarters_tracked');\""

# 4. Check quarterly_history data availability
powershell -Command ".\quick-db.bat \"SELECT COUNT(*) as partners_with_history FROM strategic_partners WHERE quarterly_history IS NOT NULL AND jsonb_array_length(quarterly_history) > 0;\""

# 5. Check base_pcr_score data (should have data from Phase 1)
powershell -Command ".\quick-db.bat \"SELECT COUNT(*) as partners_with_pcr FROM strategic_partners WHERE base_pcr_score IS NOT NULL;\""
```

**After running migration, verify new fields:**

```bash
# 1. Verify column count increased (should be 140 + 5 = 145)
powershell -Command ".\quick-db.bat \"SELECT COUNT(*) as column_count FROM information_schema.columns WHERE table_name = 'strategic_partners';\""

# 2. Verify all new Phase 2 fields exist
powershell -Command ".\quick-db.bat \"SELECT column_name, data_type, column_default FROM information_schema.columns WHERE table_name = 'strategic_partners' AND column_name IN ('momentum_modifier', 'performance_trend', 'quarters_tracked', 'earned_badges', 'badge_last_updated');\""

# 3. Verify CHECK constraints were created
powershell -Command ".\quick-db.bat \"SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'strategic_partners'::regclass AND contype = 'c' AND (conname LIKE '%momentum%' OR conname LIKE '%trend%' OR conname LIKE '%badge%' OR conname LIKE '%quarters%');\""

# 4. Verify default values
powershell -Command ".\quick-db.bat \"SELECT momentum_modifier, performance_trend, quarters_tracked, earned_badges FROM strategic_partners LIMIT 5;\""
```

**Document results, then code safely!**
