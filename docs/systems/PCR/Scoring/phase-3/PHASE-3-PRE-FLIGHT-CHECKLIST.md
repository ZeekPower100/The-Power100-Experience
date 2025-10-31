# Phase 3: Pre-Flight Checklist for PowerCards Integration & Engagement Layer

**Document Version:** 1.0
**Date:** October 30, 2025
**Status:** MANDATORY - Use before creating or modifying ANY file
**Phase:** PowerCards Integration & Engagement Layer

---

## 🎯 Purpose

This checklist ensures 100% database alignment for every file we create or modify during Phase 3 implementation (PowerCards Integration). Following this prevents naming mismatches and ensures correct integration with existing PowerCards infrastructure.

**Key Difference from Phase 2:** Phase 3 is an INTEGRATION project. We're connecting existing PowerCards tables to existing strategic_partners PCR fields. No new tables, minimal new fields.

---

## ✅ MANDATORY CHECKLIST - Before Creating/Modifying ANY File

### Step 1: Identify Database Tables Involved

**Question:** What database tables will this file interact with?

**Phase 3 Primary Tables:**
- **power_card_campaigns** (EXISTING - 11 columns)
- **power_card_responses** (EXISTING - 13 columns)
- **power_card_analytics** (EXISTING - 17 columns)
- **power_card_templates** (EXISTING - 18 columns)
- **power_card_recipients** (EXISTING - 18 columns)
- **strategic_partners** (EXISTING - 145 columns from Phase 1+2)

**Example:**
- PowerCards integration service: `power_card_campaigns`, `power_card_responses`, `strategic_partners`
- Partner dashboard components: `strategic_partners`
- Admin campaign processing: `power_card_campaigns`, `power_card_responses`, `power_card_analytics`

**Action:** List all tables this file will query, insert, update, or reference.

---

### Step 2: Verify Column Names (Field Names)

**For EACH table identified in Step 1:**

```bash
# Run this command for EACH table:
powershell -Command ".\quick-db.bat \"SELECT column_name, data_type, character_maximum_length, is_nullable FROM information_schema.columns WHERE table_name = 'TABLE_NAME' ORDER BY ordinal_position;\""
```

**Action:** Document exact column names from database output.

**Phase 3 Key Tables - MUST VERIFY:**

#### power_card_campaigns table (11 columns)
```bash
powershell -Command ".\quick-db.bat \"SELECT column_name, data_type, character_maximum_length, column_default FROM information_schema.columns WHERE table_name = 'power_card_campaigns' ORDER BY ordinal_position;\""
```

**Critical Fields:**
```
column_name          | data_type                   | column_default
---------------------|-----------------------------|-----------------------
id                   | integer                     | nextval('power_card_campaigns_id_seq')
campaign_name        | character varying(255)      |
quarter              | character varying(10)       |  -- 'Q1', 'Q2', 'Q3', 'Q4'
year                 | integer                     |
start_date           | date                        |
end_date             | date                        |
status               | character varying(50)       | 'draft'  -- CHECK VALUES: 'draft', 'active', 'completed', 'archived'
created_by           | integer                     |
created_at           | timestamp without time zone | CURRENT_TIMESTAMP
updated_at           | timestamp without time zone | CURRENT_TIMESTAMP
description          | text                        |
```

#### power_card_responses table (13 columns)
```bash
powershell -Command ".\quick-db.bat \"SELECT column_name, data_type, character_maximum_length, column_default FROM information_schema.columns WHERE table_name = 'power_card_responses' ORDER BY ordinal_position;\""
```

**Critical Fields:**
```
column_name            | data_type                   | notes
-----------------------|-----------------------------|------------------
id                     | integer                     |
campaign_id            | integer                     | FK to power_card_campaigns.id
template_id            | integer                     | FK to power_card_templates.id
recipient_id           | integer                     | FK to power_card_recipients.id
contractor_id          | integer                     | FK to contractors.id
partner_id             | integer                     | FK to strategic_partners.id (CRITICAL!)
metric_1_score         | numeric(5,2)                | Custom metric score (0-100)
metric_2_score         | numeric(5,2)                | Custom metric score (0-100)
metric_3_score         | numeric(5,2)                | Custom metric score (0-100)
satisfaction_score     | numeric(5,2)                | Satisfaction rating (0-5 scale)
recommendation_score   | numeric(5,2)                | NPS score (-100 to 100)
submitted_at           | timestamp without time zone | Response submission timestamp
feedback_comments      | text                        | Optional text feedback
```

#### power_card_analytics table (17 columns)
```bash
powershell -Command ".\quick-db.bat \"SELECT column_name, data_type, character_maximum_length, column_default FROM information_schema.columns WHERE table_name = 'power_card_analytics' ORDER BY ordinal_position;\""
```

**Critical Fields:**
```
column_name                | data_type                   | notes
---------------------------|-----------------------------|-----------------------
id                         | integer                     |
campaign_id                | integer                     | FK to power_card_campaigns.id
partner_id                 | integer                     | FK to strategic_partners.id (CRITICAL!)
quarter                    | character varying(10)       | 'Q1', 'Q2', 'Q3', 'Q4'
year                       | integer                     |
response_count             | integer                     | Number of responses
avg_metric_1               | numeric(5,2)                | Average of metric_1_score
avg_metric_2               | numeric(5,2)                | Average of metric_2_score
avg_metric_3               | numeric(5,2)                | Average of metric_3_score
avg_satisfaction           | numeric(5,2)                | Average satisfaction (CRITICAL for PCR)
avg_nps                    | numeric(5,2)                | Average NPS score
trend_direction            | character varying(20)       | 'up', 'down', 'stable'
previous_avg_satisfaction  | numeric(5,2)                | Prior quarter comparison
satisfaction_change        | numeric(5,2)                | Change from prior quarter
calculated_at              | timestamp without time zone |
created_at                 | timestamp without time zone |
updated_at                 | timestamp without time zone |
```

#### strategic_partners Phase 2 fields (WILL POPULATE FROM POWERCARD DATA)
```bash
powershell -Command ".\quick-db.bat \"SELECT column_name, data_type, column_default FROM information_schema.columns WHERE table_name = 'strategic_partners' AND column_name IN ('quarterly_history', 'momentum_modifier', 'performance_trend', 'earned_badges', 'quarterly_feedback_score', 'has_quarterly_data', 'next_quarterly_review');\""
```

**Critical Integration Fields:**
```
column_name                | data_type          | column_default         | notes
---------------------------|--------------------|-----------------------|------------------
quarterly_history          | jsonb              | '[]'::jsonb           | TARGET for PowerCards data
momentum_modifier          | integer            | 0                     | Recalc after PowerCards
performance_trend          | character varying  | 'new'                 | Recalc after PowerCards
earned_badges              | jsonb              | '[]'::jsonb           | Recalc after PowerCards
badge_last_updated         | timestamp          |                       |
quarterly_feedback_score   | numeric(5,2)       | 50.00                 | Update from PowerCards avg
has_quarterly_data         | boolean            | false                 | Set to true when PowerCards processed
next_quarterly_review      | date               |                       | EXISTING - schedule next survey
```

**What to Check:**
- ✅ Exact spelling (snake_case)
- ✅ Underscores vs no underscores
- ✅ Singular vs plural (`power_card_responses` not `power_card_response`)
- ✅ **Phase 3 Critical:** `partner_id` in responses/analytics links to `strategic_partners.id`

---

### Step 3: Verify CHECK Constraints & Enum Values

**For tables with status, type, or category fields:**

```bash
# Check campaign status values
powershell -Command ".\quick-db.bat \"SELECT DISTINCT status FROM power_card_campaigns;\""

# Check trend direction values
powershell -Command ".\quick-db.bat \"SELECT DISTINCT trend_direction FROM power_card_analytics WHERE trend_direction IS NOT NULL;\""
```

**Action:** Document exact allowed values.

**Phase 3 Critical Enum Values:**

#### power_card_campaigns.status
```
Expected Values:
- 'draft' (campaign being created)
- 'active' (currently collecting responses)
- 'completed' (ready for processing) ← TRIGGER for Phase 3 integration
- 'archived' (old campaign)
```

#### power_card_analytics.trend_direction
```
Expected Values:
- 'up' (satisfaction increasing)
- 'down' (satisfaction decreasing)
- 'stable' (satisfaction unchanged)
```

#### strategic_partners.performance_trend (from Phase 2)
```
CHECK Values:
- 'improving' (quarterly scores going up)
- 'stable' (consistent scores)
- 'declining' (quarterly scores going down)
- 'new' (< 2 quarters of data)
```

**What to Check:**
- ✅ Exact enum values (case-sensitive!)
- ✅ All allowed values (don't assume!)
- ✅ **Phase 3 Critical:** Campaign status 'completed' triggers integration

---

### Step 4: Verify Foreign Key Relationships

**For PowerCards integration:**

```bash
# Verify partner_id foreign keys
powershell -Command ".\quick-db.bat \"SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'power_card_responses'::regclass AND contype = 'f';\""

powershell -Command ".\quick-db.bat \"SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'power_card_analytics'::regclass AND contype = 'f';\""
```

**Action:** Document which fields reference other tables.

**Phase 3 Critical Foreign Keys:**

#### power_card_responses
```
Expected Foreign Keys:
- campaign_id → power_card_campaigns.id
- template_id → power_card_templates.id
- recipient_id → power_card_recipients.id
- contractor_id → contractors.id
- partner_id → strategic_partners.id (CRITICAL for Phase 3)
```

#### power_card_analytics
```
Expected Foreign Keys:
- campaign_id → power_card_campaigns.id
- partner_id → strategic_partners.id (CRITICAL for Phase 3)
```

**What to Check:**
- ✅ partner_id correctly references strategic_partners.id
- ✅ No orphaned responses (partner_id exists in strategic_partners)
- ✅ Campaign completion only processes partners with responses

---

### Step 5: Check Data Types (Especially JSONB, NUMERIC, TIMESTAMP)

**From Step 2 output, identify:**
- NUMERIC(5,2) for scores (satisfaction_score, avg_satisfaction)
- INTEGER for counts (response_count, year)
- TIMESTAMP for dates (submitted_at, calculated_at)
- **JSONB for quarterly_history** (most important!)
- TEXT for comments (feedback_comments, description)

**Phase 3 Critical Data Types:**

| Field                          | Type           | Notes                                         |
|--------------------------------|----------------|-----------------------------------------------|
| `satisfaction_score`           | NUMERIC(5,2)   | 0-5 scale (convert to 0-100 for PCR)         |
| `recommendation_score`         | NUMERIC(5,2)   | -100 to 100 (convert to 0-100 for PCR)       |
| `metric_1_score`               | NUMERIC(5,2)   | 0-100 scale                                   |
| `avg_satisfaction`             | NUMERIC(5,2)   | Aggregated average (0-5 scale)                |
| `quarterly_history`            | JSONB          | Array of quarterly objects                    |
| `quarterly_feedback_score`     | NUMERIC(5,2)   | Final aggregated score (0-100)                |
| `submitted_at`                 | TIMESTAMP      | Response submission time                      |
| `campaign_id`                  | INTEGER        | FK to campaigns                               |
| `partner_id`                   | INTEGER        | FK to strategic_partners (CRITICAL!)          |

**Action:** Ensure code uses correct data types and conversions.

**Common Issues:**
- ❌ Not converting satisfaction_score (0-5) to 0-100 scale for PCR
- ❌ Not converting recommendation_score (-100 to 100) to 0-100 scale
- ❌ Using STRING for partner_id (need INTEGER)
- ❌ Not handling NULL scores in aggregation
- ❌ Not parsing quarterly_history JSONB correctly

---

### Step 6: Document Findings BEFORE Coding

**Create a verification block at the top of the file:**

```javascript
// DATABASE-CHECKED: [table_names] columns verified [date]
// ================================================================
// VERIFIED TABLE RELATIONSHIPS:
// - power_card_responses.partner_id → strategic_partners.id
// - power_card_analytics.partner_id → strategic_partners.id
// - power_card_responses.campaign_id → power_card_campaigns.id
// ================================================================
// VERIFIED FIELD NAMES:
// - power_card_campaigns: status, quarter, year, end_date
// - power_card_responses: satisfaction_score, recommendation_score, partner_id
// - strategic_partners: quarterly_history, momentum_modifier, quarterly_feedback_score
// ================================================================
// VERIFIED DATA CONVERSIONS:
// - satisfaction_score (0-5) × 20 = 0-100 scale
// - recommendation_score (-100 to 100) → (score + 100) / 2 = 0-100 scale
// - metric_*_score (0-100) = no conversion needed
// ================================================================
// VERIFIED CAMPAIGN TRIGGER:
// - Campaign status 'completed' triggers processCampaignCompletion()
// - All partners with submitted_at NOT NULL are processed
// ================================================================
```

**Phase 3 Example (PowerCards Integration Service):**
```javascript
// DATABASE-CHECKED: power_card_campaigns, power_card_responses, power_card_analytics, strategic_partners columns verified October 30, 2025
// ================================================================
// INTEGRATION FLOW:
// 1. Campaign marked as 'completed'
// 2. Query power_card_responses WHERE campaign_id AND partner_id NOT NULL AND submitted_at NOT NULL
// 3. Aggregate: (satisfaction × 0.40) + (recommendation × 0.30) + (metrics × 0.30)
// 4. Add to strategic_partners.quarterly_history JSONB array
// 5. Update strategic_partners.quarterly_feedback_score
// 6. Trigger momentumService.updatePartnerMomentum()
// 7. Trigger badgeService.updatePartnerBadges()
// 8. Trigger pcrService.calculatePartnerPCR()
// ================================================================
// VERIFIED TABLE RELATIONSHIPS:
// - power_card_responses.partner_id → strategic_partners.id (INTEGER FK)
// - power_card_responses.campaign_id → power_card_campaigns.id (INTEGER FK)
// - power_card_analytics.partner_id → strategic_partners.id (INTEGER FK)
// ================================================================
// VERIFIED FIELD NAMES:
// - power_card_campaigns: status ('completed'), quarter ('Q1-Q4'), year (integer), end_date (date)
// - power_card_responses: partner_id (FK), satisfaction_score (0-5), recommendation_score (-100 to 100), metric_*_score (0-100), submitted_at (timestamp)
// - strategic_partners: quarterly_history (jsonb), quarterly_feedback_score (numeric), momentum_modifier (integer), performance_trend (varchar)
// ================================================================
// VERIFIED DATA CONVERSIONS:
// - satisfaction_score (0-5 scale) × 20 = 0-100 scale for quarterly_feedback_score
// - recommendation_score (-100 to 100) → (score + 100) / 2 = 0-100 scale
// - metric_1_score, metric_2_score, metric_3_score (already 0-100 scale, no conversion)
// - Final formula: (avgSat × 0.40) + (avgRec × 0.30) + (avgMetrics × 0.30) = quarterly_score
// ================================================================
// JSONB STRUCTURE (quarterly_history entry):
// {
//   quarter: 'Q1',
//   year: 2025,
//   date: '2025-03-31',
//   score: 82.5,
//   quarterly_score: 82.5,  // Alias for momentum service compatibility
//   response_count: 15,
//   avg_satisfaction: 4.2,
//   avg_nps: 65,
//   source: 'powercard',
//   campaign_id: 123,
//   created_at: '2025-04-01T10:00:00Z'
// }
// ================================================================
```

---

### Step 7: Verify BOTH Development AND Production

**IMPORTANT:** Check that both environments have PowerCards tables!

```bash
# Development: Verify all PowerCards tables exist
powershell -Command ".\quick-db.bat \"SELECT table_name FROM information_schema.tables WHERE table_name LIKE 'power_card_%' ORDER BY table_name;\""

# Production: Same check
# Use mcp__aws-production__exec tool with same query
PGPASSWORD='dBP0wer100!!' psql -h tpe-database-production.cmtcsi0kytrf.us-east-1.rds.amazonaws.com -U tpeadmin -d tpedb -c "SELECT table_name FROM information_schema.tables WHERE table_name LIKE 'power_card_%' ORDER BY table_name;"
```

**Phase 3 Specific Checks:**
1. Verify all 5 PowerCards tables exist (campaigns, responses, analytics, templates, recipients)
2. Verify strategic_partners has Phase 2 fields (momentum_modifier, performance_trend, earned_badges, quarterly_history)
3. Verify partner_id foreign keys exist and are valid
4. Verify sample campaign data exists for testing
5. Verify at least one "completed" campaign exists

**Action:** Confirm both environments have PowerCards infrastructure before deploying Phase 3 integration.

---

## 🚨 Red Flags - STOP and Verify

If you see ANY of these in Phase 3, STOP and run verification queries:

1. **Converting satisfaction_score** → Verify conversion formula
   ```javascript
   // ❌ WRONG (treating as 0-100):
   quarterlyScore = satisfaction_score

   // ✅ CORRECT (converting 0-5 to 0-100):
   quarterlyScore = satisfaction_score * 20
   ```

2. **Converting recommendation_score (NPS)** → Verify conversion formula
   ```javascript
   // ❌ WRONG (treating as 0-100):
   quarterlyScore = recommendation_score

   // ✅ CORRECT (converting -100/100 to 0-100):
   quarterlyScore = (recommendation_score + 100) / 2
   ```

3. **Filtering responses** → Verify NULL checks
   ```javascript
   // ❌ WRONG (includes incomplete responses):
   SELECT * FROM power_card_responses WHERE campaign_id = $1

   // ✅ CORRECT (only completed responses):
   SELECT * FROM power_card_responses
   WHERE campaign_id = $1
     AND partner_id IS NOT NULL
     AND submitted_at IS NOT NULL
   ```

4. **Adding to quarterly_history** → Verify JSONB structure
   ```javascript
   // ❌ WRONG (invalid structure):
   quarterly_history.push(82.5)  // Just a number

   // ✅ CORRECT (complete object):
   quarterly_history.push({
     quarter: 'Q1',
     year: 2025,
     date: '2025-03-31',
     score: 82.5,
     quarterly_score: 82.5,
     response_count: 15,
     source: 'powercard',
     campaign_id: 123
   })
   ```

5. **Checking duplicate quarters** → Verify before adding
   ```javascript
   // ❌ WRONG (creates duplicates):
   quarterly_history.push(newEntry)

   // ✅ CORRECT (checks for existing quarter):
   const existingIndex = quarterly_history.findIndex(
     entry => entry.quarter === 'Q1' && entry.year === 2025
   );
   if (existingIndex >= 0) {
     quarterly_history[existingIndex] = newEntry; // Update
   } else {
     quarterly_history.push(newEntry); // Add new
   }
   ```

6. **Campaign completion trigger** → Verify status value
   ```javascript
   // ❌ WRONG (wrong status value):
   WHERE status = 'complete'  // No 'd'

   // ✅ CORRECT (exact database value):
   WHERE status = 'completed'  // With 'd'
   ```

7. **Partner ID foreign key** → Verify integer type
   ```javascript
   // ❌ WRONG (string type):
   WHERE partner_id = '123'

   // ✅ CORRECT (integer type):
   WHERE partner_id = 123
   ```

8. **Aggregating scores** → Verify NULL handling
   ```javascript
   // ❌ WRONG (NULLs break average):
   avgScore = responses.reduce((sum, r) => sum + r.score, 0) / responses.length

   // ✅ CORRECT (filters NULLs):
   const validScores = responses.filter(r => r.score !== null);
   avgScore = validScores.reduce((sum, r) => sum + r.score, 0) / validScores.length
   ```

9. **Triggering momentum recalc** → Verify order of operations
   ```javascript
   // ❌ WRONG (momentum before quarterly data added):
   await momentumService.updatePartnerMomentum(partnerId);
   await addQuarterlyDataFromPowerCards(partnerId, campaignId);

   // ✅ CORRECT (quarterly data first, then momentum):
   await addQuarterlyDataFromPowerCards(partnerId, campaignId);
   await momentumService.updatePartnerMomentum(partnerId);
   await badgeService.updatePartnerBadges(partnerId);
   await pcrService.calculatePartnerPCR(partnerId);
   ```

10. **Dashboard data fetching** → Verify includes Phase 2 fields
    ```javascript
    // ❌ WRONG (missing Phase 2 fields):
    SELECT id, company_name, final_pcr_score FROM strategic_partners

    // ✅ CORRECT (includes momentum/badges):
    SELECT id, company_name, final_pcr_score,
           momentum_modifier, performance_trend,
           earned_badges, quarterly_history
    FROM strategic_partners
    ```

---

## 📋 Quick Reference Commands

### Check All PowerCards Tables
```bash
powershell -Command ".\quick-db.bat \"SELECT table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_name LIKE 'power_card_%'
ORDER BY table_name;\""
```

### Check PowerCards Campaign Status Values
```bash
powershell -Command ".\quick-db.bat \"SELECT DISTINCT status, COUNT(*) FROM power_card_campaigns GROUP BY status;\""
```

### Check PowerCards Data Availability
```bash
powershell -Command ".\quick-db.bat \"SELECT
  c.id, c.campaign_name, c.quarter, c.year, c.status,
  COUNT(r.id) as response_count
FROM power_card_campaigns c
LEFT JOIN power_card_responses r ON r.campaign_id = c.id AND r.submitted_at IS NOT NULL
GROUP BY c.id
ORDER BY c.created_at DESC
LIMIT 10;\""
```

### Check Partner Coverage in PowerCards
```bash
powershell -Command ".\quick-db.bat \"SELECT
  COUNT(DISTINCT partner_id) as partners_with_responses,
  COUNT(*) as total_responses
FROM power_card_responses
WHERE partner_id IS NOT NULL
  AND submitted_at IS NOT NULL;\""
```

### Check Quarterly History Population
```bash
powershell -Command ".\quick-db.bat \"SELECT
  COUNT(*) as partners_with_history,
  AVG(jsonb_array_length(quarterly_history)) as avg_quarters
FROM strategic_partners
WHERE quarterly_history IS NOT NULL
  AND jsonb_array_length(quarterly_history) > 0;\""
```

### Verify Phase 2 Integration Fields
```bash
powershell -Command ".\quick-db.bat \"SELECT
  column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'strategic_partners'
  AND column_name IN ('quarterly_history', 'momentum_modifier', 'performance_trend', 'earned_badges', 'quarterly_feedback_score', 'has_quarterly_data')
ORDER BY column_name;\""
```

### Test PowerCards Aggregation Query
```bash
powershell -Command ".\quick-db.bat \"SELECT
  campaign_id,
  partner_id,
  COUNT(*) as response_count,
  AVG(satisfaction_score) as avg_satisfaction,
  AVG(recommendation_score) as avg_recommendation,
  AVG((metric_1_score + metric_2_score + metric_3_score) / 3) as avg_metrics
FROM power_card_responses
WHERE submitted_at IS NOT NULL
  AND partner_id IS NOT NULL
GROUP BY campaign_id, partner_id
LIMIT 5;\""
```

---

## ✅ Phase 3 Specific Verification Notes

### PowerCards Integration Service Checklist
- [ ] Verify `power_card_responses.partner_id` is INTEGER FK to strategic_partners.id
- [ ] Verify `satisfaction_score` conversion (0-5 → 0-100: multiply by 20)
- [ ] Verify `recommendation_score` conversion (-100/100 → 0-100: (score+100)/2)
- [ ] Verify `metric_*_score` is already 0-100 (no conversion needed)
- [ ] Verify weighted formula: (satisfaction × 0.40) + (recommendation × 0.30) + (metrics × 0.30)
- [ ] Verify NULL handling in aggregation (filter out NULL scores)
- [ ] Verify JSONB structure for quarterly_history entry
- [ ] Verify duplicate quarter detection (check before adding)
- [ ] Verify campaign status 'completed' triggers processing
- [ ] Verify correct operation order: data → momentum → badges → PCR

### Partner Dashboard Component Checklist
- [ ] Verify dashboard fetches earned_badges JSONB field
- [ ] Verify dashboard fetches momentum_modifier INTEGER field
- [ ] Verify dashboard fetches performance_trend VARCHAR field
- [ ] Verify dashboard fetches quarterly_history JSONB array
- [ ] Verify badge display handles empty array (no badges yet)
- [ ] Verify momentum display handles 0 (stable), +5 (hot streak), -3 (declining)
- [ ] Verify quarterly chart handles empty history (no quarters yet)
- [ ] Verify responsive layout on mobile/tablet/desktop

### Admin Campaign Processing Checklist
- [ ] Verify only processes campaigns with status = 'completed'
- [ ] Verify only processes responses with submitted_at NOT NULL
- [ ] Verify only processes responses with partner_id NOT NULL
- [ ] Verify bulk processing handles errors gracefully (continues on failure)
- [ ] Verify admin can see processing results (success/failure counts)
- [ ] Verify processing updates strategic_partners.updated_at timestamp

---

## 🚨 Phase 3 Critical Gotchas

### 1. Satisfaction Score Conversion
```javascript
// ❌ WRONG (0-5 scale not converted):
quarterlyScore = avgSatisfaction

// ✅ CORRECT (convert to 0-100):
quarterlyScore = avgSatisfaction * 20
```

### 2. NPS Score Conversion
```javascript
// ❌ WRONG (-100 to 100 not converted):
quarterlyScore = avgNPS

// ✅ CORRECT (convert to 0-100):
quarterlyScore = (avgNPS + 100) / 2
```

### 3. NULL Score Handling
```javascript
// ❌ WRONG (NULLs break average):
const avg = scores.reduce((sum, s) => sum + s, 0) / scores.length

// ✅ CORRECT (filter NULLs first):
const validScores = scores.filter(s => s !== null && !isNaN(s));
const avg = validScores.reduce((sum, s) => sum + s, 0) / validScores.length
```

### 4. Quarterly History Structure
```javascript
// ❌ WRONG (missing required fields):
{ quarter: 'Q1', score: 82 }

// ✅ CORRECT (complete structure):
{
  quarter: 'Q1',
  year: 2025,
  date: '2025-03-31',
  score: 82.5,
  quarterly_score: 82.5,  // Alias for momentum service
  response_count: 15,
  source: 'powercard',
  campaign_id: 123,
  created_at: new Date().toISOString()
}
```

### 5. Duplicate Quarter Detection
```javascript
// ❌ WRONG (always adds new entry):
quarterly_history.push(newEntry)

// ✅ CORRECT (checks for existing):
const index = quarterly_history.findIndex(
  e => e.quarter === newEntry.quarter && e.year === newEntry.year
);
if (index >= 0) {
  quarterly_history[index] = newEntry;  // Update
} else {
  quarterly_history.push(newEntry);  // Add new
}
```

### 6. Campaign Status Check
```javascript
// ❌ WRONG (typo in status):
WHERE status = 'complete'  // Missing 'd'

// ✅ CORRECT (exact database value):
WHERE status = 'completed'
```

### 7. Response Filtering
```javascript
// ❌ WRONG (includes incomplete/orphaned responses):
SELECT * FROM power_card_responses WHERE campaign_id = $1

// ✅ CORRECT (only valid completed responses):
SELECT * FROM power_card_responses
WHERE campaign_id = $1
  AND partner_id IS NOT NULL
  AND submitted_at IS NOT NULL
```

### 8. Operation Order
```javascript
// ❌ WRONG (momentum before data):
await momentumService.updatePartnerMomentum(partnerId);
await addQuarterlyData(partnerId);

// ✅ CORRECT (data first, then cascading updates):
await addQuarterlyData(partnerId);
await momentumService.updatePartnerMomentum(partnerId);
await badgeService.updatePartnerBadges(partnerId);
await pcrService.calculatePartnerPCR(partnerId);
```

---

## 📚 Related Documents

- **Database Source of Truth:** `DATABASE-SOURCE-OF-TRUTH.md` (project root)
- **Phase 3 Implementation Plan:** `PHASE-3-IMPLEMENTATION-PLAN.md` (this directory)
- **Phase 3 Overview:** `PHASE-3-OVERVIEW.md` (this directory)
- **Phase 2 Complete:** `../phase-2/PHASE-2-IMPLEMENTATION-PLAN.md`
- **PCR Overview:** `../PCR-SCORING-OVERVIEW.md`

---

**Last Updated:** October 30, 2025
**Next Review:** Before each file creation in Phase 3 Days 1-5
**Status:** MANDATORY - Use this checklist religiously

---

## 🎯 Quick Start for Phase 3 Day 1

**Before creating ANY file, run these commands to verify PowerCards infrastructure:**

```bash
# 1. Verify all 5 PowerCards tables exist
powershell -Command ".\quick-db.bat \"SELECT table_name FROM information_schema.tables WHERE table_name LIKE 'power_card_%' ORDER BY table_name;\""

# 2. Check PowerCards data availability
powershell -Command ".\quick-db.bat \"SELECT c.campaign_name, c.quarter, c.year, c.status, COUNT(r.id) as responses FROM power_card_campaigns c LEFT JOIN power_card_responses r ON r.campaign_id = c.id WHERE r.submitted_at IS NOT NULL GROUP BY c.id ORDER BY c.created_at DESC LIMIT 5;\""

# 3. Verify strategic_partners Phase 2 fields exist
powershell -Command ".\quick-db.bat \"SELECT column_name FROM information_schema.columns WHERE table_name = 'strategic_partners' AND column_name IN ('quarterly_history', 'momentum_modifier', 'performance_trend', 'earned_badges', 'quarterly_feedback_score');\""

# 4. Check partner_id foreign key in responses
powershell -Command ".\quick-db.bat \"SELECT COUNT(DISTINCT partner_id) as partners_with_responses FROM power_card_responses WHERE partner_id IS NOT NULL AND submitted_at IS NOT NULL;\""

# 5. Check for completed campaigns
powershell -Command ".\quick-db.bat \"SELECT COUNT(*) as completed_campaigns FROM power_card_campaigns WHERE status = 'completed';\""
```

**Document results, then code safely!**
