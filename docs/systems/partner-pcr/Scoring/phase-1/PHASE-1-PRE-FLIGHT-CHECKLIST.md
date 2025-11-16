# Phase 1: Pre-Flight Checklist for Core PCR Calculation Engine

**Document Version:** 1.0
**Date:** October 29, 2025
**Status:** MANDATORY - Use before creating or modifying ANY file
**Phase:** Core PCR Calculation Engine (Week 1)

---

## 🎯 Purpose

This checklist ensures 100% database alignment for every file we create or modify during Phase 1 implementation (Core PCR Calculation Engine). Following this prevents naming mismatches and constraint violations when implementing the PCR scoring system.

---

## ✅ MANDATORY CHECKLIST - Before Creating/Modifying ANY File

### Step 1: Identify Database Tables Involved

**Question:** What database tables will this file interact with?

**Phase 1 Primary Table:**
- **strategic_partners** (EXISTING - will add PCR fields)

**Phase 1 Related Tables** (may query but not modify):
- **contractors** (for matching algorithm integration)
- **contractor_partner_matches** (for PCR-based ranking)

**Example:**
- PCR calculation service: `strategic_partners`
- PCR API endpoints: `strategic_partners`
- Admin dashboard updates: `strategic_partners`
- Matching algorithm updates: `strategic_partners`, `contractor_partner_matches`

**Action:** List all tables this file will query, insert, update, or reference.

---

### Step 2: Verify Column Names (Field Names)

**For EACH table identified in Step 1:**

```bash
# Run this command for EACH table:
powershell -Command ".\quick-db.bat \"SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'TABLE_NAME' ORDER BY ordinal_position;\""
```

**Action:** Document exact column names from database output.

**Phase 1 Key Table - MUST VERIFY:**

#### strategic_partners table (EXISTING - WILL EXTEND!)
```bash
powershell -Command ".\quick-db.bat \"SELECT column_name, data_type, character_maximum_length, column_default, is_nullable FROM information_schema.columns WHERE table_name = 'strategic_partners' ORDER BY ordinal_position;\""
```

**Current Column Count:** 124 columns (verified October 29, 2025)

**Existing Relevant Fields (DO NOT MODIFY - will use these):**
```
column_name                      | data_type          | column_default         | is_nullable
---------------------------------|--------------------|-----------------------|------------
id                               | integer            | nextval(...)          | NO
company_name                     | character varying  |                       | YES
powerconfidence_score            | integer            | 0                     | YES
power_confidence_score           | integer            | 0                     | YES  ⚠️ DUPLICATE!
previous_powerconfidence_score   | integer            |                       | YES
landing_page_videos              | jsonb              |                       | YES
client_testimonials              | jsonb              | '[]'::jsonb           | YES
employee_references              | text               |                       | YES
key_differentiators              | text               |                       | YES
company_description              | text               |                       | YES
unique_value                     | text               |                       | YES
testimonials                     | text               |                       | YES
success_stories                  | text               |                       | YES
client_demos                     | text               |                       | YES
primary_email                    | character varying  |                       | YES
ceo_contact_email                | text               |                       | YES
cx_contact_email                 | text               |                       | YES
sales_contact_email              | text               |                       | YES
average_satisfaction             | numeric            |                       | YES
total_feedback_responses         | integer            | 0                     | YES
last_quarterly_report            | date               |                       | YES
feedback_trend                   | character varying  |                       | YES
is_active                        | boolean            | true                  | YES
created_at                       | timestamp          | CURRENT_TIMESTAMP     | YES
updated_at                       | timestamp          | CURRENT_TIMESTAMP     | YES
```

**NEW Phase 1 Fields (WILL ADD - verify exact names!):**
```
Expected column_name              | data_type          | column_default         | constraints
---------------------------------|--------------------|-----------------------|-------------
engagement_tier                  | character varying  | 'free'                | CHECK IN ('free', 'verified', 'gold')
payment_multiplier               | numeric(3,1)       | 1.5                   | CHECK IN (1.5, 2.5, 5.0)
subscription_start_date          | date               |                       |
subscription_end_date            | date               |                       |
subscription_status              | character varying  | 'inactive'            | CHECK IN ('active', 'cancelled', 'expired', 'inactive')
profile_completion_score         | integer            | 0                     | CHECK >= 0 AND <= 100
demo_videos_count                | integer            | 0                     |
employee_feedback_count          | integer            | 0                     |
customer_feedback_count          | integer            | 0                     |
profile_last_updated             | timestamp          | NOW()                 |
quarterly_feedback_score         | numeric(5,2)       | 50.00                 | CHECK >= 0 AND <= 100
has_quarterly_data               | boolean            | false                 |
quarterly_history                | jsonb              | '[]'::jsonb           |
base_pcr_score                   | numeric(5,2)       |                       | CHECK NULL OR (>= 0 AND <= 100)
final_pcr_score                  | numeric(5,2)       |                       | CHECK NULL OR (>= 0 AND <= 105)
pcr_last_calculated              | timestamp          |                       |
```

**Critical Fields for Phase 1:**
- `engagement_tier` (VARCHAR) - Payment tier: 'free', 'verified', 'gold'
- `payment_multiplier` (NUMERIC 3,1) - Must be 1.5, 2.5, or 5.0
- `profile_completion_score` (INTEGER) - 0-100 range
- `demo_videos_count` (INTEGER) - Count from landing_page_videos JSONB
- `employee_feedback_count` (INTEGER) - Count from employee_references or manual
- `customer_feedback_count` (INTEGER) - Count from client_testimonials JSONB
- `quarterly_feedback_score` (NUMERIC 5,2) - Defaults to 50.00, updated with real data
- `has_quarterly_data` (BOOLEAN) - Flag if real quarterly data exists
- `quarterly_history` (JSONB) - Array of quarterly score objects
- `base_pcr_score` (NUMERIC 5,2) - Calculated score before multiplier (0-100)
- `final_pcr_score` (NUMERIC 5,2) - Final score after multiplier (0-105)

**⚠️ CRITICAL GOTCHA - Duplicate Fields:**
```
powerconfidence_score       | integer  | 0    | Legacy field
power_confidence_score      | integer  | 0    | Duplicate field (note underscore placement!)
```
**Decision:** Use `final_pcr_score` for new system. Consider migrating old scores later.

**What to Check:**
- ✅ Exact spelling (snake_case vs camelCase)
- ✅ Underscores vs no underscores
- ✅ Singular vs plural
- ✅ **Phase 1 Critical:** `engagement_tier` NOT `engagementTier`, `base_pcr_score` NOT `basePcrScore`

---

### Step 3: Verify CHECK Constraints

**For tables with enum-like fields (status, type, category, tier, etc.):**

```bash
# Run this command for each table with enum fields:
powershell -Command ".\quick-db.bat \"SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'TABLE_NAME'::regclass AND contype = 'c';\""
```

**Action:** Document exact allowed values from CHECK constraints.

**Phase 1 Critical Constraints - To Be Verified:**

#### strategic_partners (AFTER ADDING PCR FIELDS)
```bash
powershell -Command ".\quick-db.bat \"SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'strategic_partners'::regclass AND contype = 'c';\""
```

**Expected NEW Constraints:**
```
constraint_name                                      | constraint_definition
----------------------------------------------------|----------------------
strategic_partners_engagement_tier_check             | CHECK (engagement_tier IN ('free', 'verified', 'gold'))
strategic_partners_payment_multiplier_check          | CHECK (payment_multiplier IN (1.5, 2.5, 5.0))
strategic_partners_subscription_status_check         | CHECK (subscription_status IN ('active', 'cancelled', 'expired', 'inactive'))
strategic_partners_profile_completion_score_check    | CHECK (profile_completion_score >= 0 AND profile_completion_score <= 100)
strategic_partners_quarterly_feedback_score_check    | CHECK (quarterly_feedback_score >= 0 AND quarterly_feedback_score <= 100)
strategic_partners_base_pcr_score_check              | CHECK (base_pcr_score IS NULL OR (base_pcr_score >= 0 AND base_pcr_score <= 100))
strategic_partners_final_pcr_score_check             | CHECK (final_pcr_score IS NULL OR (final_pcr_score >= 0 AND final_pcr_score <= 105))
```

**IMPORTANT Phase 1 Constraint Rules:**
1. **Engagement Tier:** MUST be 'free', 'verified', or 'gold' (lowercase, exact spelling)
2. **Payment Multiplier:** MUST be 1.5, 2.5, or 5.0 (stored as NUMERIC 3,1)
3. **Subscription Status:** MUST be 'active', 'cancelled', 'expired', or 'inactive'
4. **Profile Score:** MUST be 0-100 (INTEGER)
5. **Quarterly Score:** MUST be 0-100 (NUMERIC 5,2), defaults to 50.00
6. **Base PCR:** MUST be NULL or 0-100 (NUMERIC 5,2)
7. **Final PCR:** MUST be NULL or 0-105 (NUMERIC 5,2) - allows up to 105 due to multiplier formula

**What to Check:**
- ✅ Exact enum values (case-sensitive!)
- ✅ All allowed values (don't assume!)
- ✅ **Phase 1 Critical:** Tier values lowercase, multipliers as decimals, scores in correct ranges

---

### Step 4: Verify Foreign Key Constraints

**For tables with relationships:**

```bash
# Run this command to see foreign keys:
powershell -Command ".\quick-db.bat \"SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'TABLE_NAME'::regclass AND contype = 'f';\""
```

**Action:** Document which fields reference other tables.

**Phase 1 Key Foreign Keys - To Be Verified:**

#### strategic_partners (EXISTING - No new FKs in Phase 1)
```bash
powershell -Command ".\quick-db.bat \"SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'strategic_partners'::regclass AND contype = 'f';\""
```

**Expected:**
No new foreign keys in Phase 1. All PCR fields are self-contained within strategic_partners table.

**Phase 1 Note:** We're NOT adding foreign keys. All calculations happen within strategic_partners table.

**What to Check:**
- ✅ Confirm NO new foreign keys expected in Phase 1
- ✅ Existing foreign keys (if any) don't conflict with new fields

---

### Step 5: Check Data Types (Especially JSON/TEXT/NUMERIC)

**From Step 2 output, identify:**
- TEXT vs VARCHAR
- INTEGER vs NUMERIC
- TIMESTAMP vs TIMESTAMPTZ
- **JSONB vs TEXT** (most important!)
- BOOLEAN fields
- NUMERIC precision for decimal scores

**Phase 1 Critical Data Types:**

| Field                          | Type           | Notes                                         |
|--------------------------------|----------------|-----------------------------------------------|
| `engagement_tier`              | VARCHAR(20)    | Plain text: 'free', 'verified', 'gold'        |
| `payment_multiplier`           | NUMERIC(3,1)   | Decimal: 1.5, 2.5, or 5.0                     |
| `subscription_start_date`      | DATE           | Start date of paid subscription               |
| `subscription_end_date`        | DATE           | End date of paid subscription                 |
| `subscription_status`          | VARCHAR(50)    | Plain text: 'active', 'cancelled', etc.       |
| `profile_completion_score`     | INTEGER        | Whole number 0-100                            |
| `demo_videos_count`            | INTEGER        | Count from landing_page_videos JSONB          |
| `employee_feedback_count`      | INTEGER        | Count from employee_references TEXT           |
| `customer_feedback_count`      | INTEGER        | Count from client_testimonials JSONB          |
| `profile_last_updated`         | TIMESTAMP      | Last time profile was modified                |
| `quarterly_feedback_score`     | NUMERIC(5,2)   | Decimal 0.00-100.00, defaults to 50.00        |
| `has_quarterly_data`           | BOOLEAN        | True if real quarterly data exists            |
| `quarterly_history`            | JSONB          | Array of objects: [{quarter: 'Q1-2025', score: 78, ...}] |
| `base_pcr_score`               | NUMERIC(5,2)   | Decimal 0.00-100.00 (nullable)                |
| `final_pcr_score`              | NUMERIC(5,2)   | Decimal 0.00-105.00 (nullable)                |
| `pcr_last_calculated`          | TIMESTAMP      | Last calculation time                         |

**Existing Fields to Use (Data Type Verification):**
| Field                          | Type           | Notes                                         |
|--------------------------------|----------------|-----------------------------------------------|
| `landing_page_videos`          | JSONB          | Array of video objects - use jsonb_array_length() |
| `client_testimonials`          | JSONB          | Array of testimonial objects - use jsonb_array_length() |
| `employee_references`          | TEXT           | Text field - parse for count                  |
| `key_differentiators`          | TEXT           | Plain text, check length > 50 for scoring     |
| `company_description`          | TEXT           | Plain text, check length > 100 for scoring    |
| `unique_value`                 | TEXT           | Plain text, check length > 50 for scoring     |
| `testimonials`                 | TEXT           | Plain text for additional scoring             |
| `success_stories`              | TEXT           | Plain text for additional scoring             |
| `average_satisfaction`         | NUMERIC        | Existing field - use if available             |

**Action:** Ensure code uses correct data types.

**Common Issues:**
- ❌ Using INTEGER for payment_multiplier (need NUMERIC for 1.5, 2.5, 5.0)
- ❌ Using INTEGER for scores (need NUMERIC(5,2) for decimal precision)
- ❌ Using `JSON.parse()` on TEXT field (employee_references is TEXT, not JSONB)
- ❌ Not using jsonb_array_length() for JSONB arrays (landing_page_videos, client_testimonials)
- ❌ Storing tier as number instead of string ('free' not 1)
- ❌ Storing multiplier as integer (1.5 not 2)

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
// - some_score: NUMERIC(5,2) (decimal with 2 places)
// - some_count: INTEGER (whole number)
// - some_array: JSONB (array type)
// ================================================================
```

**Phase 1 Example (PCR Calculation Service):**
```javascript
// DATABASE-CHECKED: strategic_partners columns verified October 29, 2025
// ================================================================
// VERIFIED CONSTRAINTS:
// - strategic_partners.engagement_tier: CHECK IN ('free', 'verified', 'gold')
// - strategic_partners.payment_multiplier: CHECK IN (1.5, 2.5, 5.0)
// - strategic_partners.subscription_status: CHECK IN ('active', 'cancelled', 'expired', 'inactive')
// - strategic_partners.profile_completion_score: CHECK >= 0 AND <= 100
// - strategic_partners.quarterly_feedback_score: CHECK >= 0 AND <= 100
// - strategic_partners.base_pcr_score: CHECK IS NULL OR (>= 0 AND <= 100)
// - strategic_partners.final_pcr_score: CHECK IS NULL OR (>= 0 AND <= 105)
// ================================================================
// VERIFIED FIELD NAMES:
// - engagement_tier (NOT engagementTier)
// - payment_multiplier (NOT paymentMultiplier)
// - subscription_start_date (NOT subscriptionStartDate)
// - subscription_end_date (NOT subscriptionEndDate)
// - subscription_status (NOT subscriptionStatus)
// - profile_completion_score (NOT profileCompletionScore)
// - demo_videos_count (NOT demoVideosCount)
// - employee_feedback_count (NOT employeeFeedbackCount)
// - customer_feedback_count (NOT customerFeedbackCount)
// - profile_last_updated (NOT profileLastUpdated)
// - quarterly_feedback_score (NOT quarterlyFeedbackScore)
// - has_quarterly_data (NOT hasQuarterlyData)
// - quarterly_history (NOT quarterlyHistory)
// - base_pcr_score (NOT basePcrScore)
// - final_pcr_score (NOT finalPcrScore)
// - pcr_last_calculated (NOT pcrLastCalculated)
// ================================================================
// VERIFIED DATA TYPES:
// - engagement_tier: VARCHAR(20) (plain text)
// - payment_multiplier: NUMERIC(3,1) (1.5, 2.5, or 5.0)
// - profile_completion_score: INTEGER (0-100)
// - demo_videos_count: INTEGER (count)
// - quarterly_feedback_score: NUMERIC(5,2) (decimal 0.00-100.00)
// - has_quarterly_data: BOOLEAN (true/false)
// - quarterly_history: JSONB (array of objects)
// - base_pcr_score: NUMERIC(5,2) (decimal 0.00-100.00, nullable)
// - final_pcr_score: NUMERIC(5,2) (decimal 0.00-105.00, nullable)
// ================================================================
// EXISTING FIELDS TO USE:
// - landing_page_videos: JSONB (use jsonb_array_length() for demo_videos_count)
// - client_testimonials: JSONB (use jsonb_array_length() for customer_feedback_count)
// - employee_references: TEXT (parse for employee_feedback_count)
// - key_differentiators: TEXT (check length > 50)
// - company_description: TEXT (check length > 100)
// - unique_value: TEXT (check length > 50)
// - average_satisfaction: NUMERIC (use if available for quarterly score)
// ================================================================
// PCR CALCULATION OPERATIONS:
// - calculateProfileCompletionScore: Weighted sum of profile elements (0-100)
// - calculateQuarterlyFeedbackScore: Returns 50.00 default or real score
// - calculateBasePCR: (Profile × 0.30) + (Quarterly × 0.70)
// - calculateFinalPCR: (Base × 0.80) + (20 × Multiplier / 5)
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

**Phase 1 Specific Checks:**
1. Verify strategic_partners table has 124 columns before migration
2. After migration, verify it has 124 + 16 = 140 columns
3. Verify all new PCR fields exist in both dev and production
4. Verify CHECK constraints match between dev and prod
5. Verify default values match between dev and prod
6. Verify data migration populated counts (demo_videos_count, customer_feedback_count)

**Action:** Confirm both environments match before deploying PCR system.

---

## 🚨 Red Flags - STOP and Verify

If you see ANY of these in Phase 1, STOP and run verification queries:

1. **Setting engagement_tier** → Verify exact values
   ```javascript
   engagement_tier: 'Free'  // ⚠️ STOP! Must be lowercase 'free'
   ```

2. **Setting payment_multiplier** → Verify decimal values
   ```javascript
   payment_multiplier: 2  // ⚠️ STOP! Must be 2.5 not 2
   ```

3. **Storing profile_completion_score** → Verify INTEGER type
   ```javascript
   profile_completion_score: 85.5  // ⚠️ STOP! Must be INTEGER (round to 86)
   ```

4. **Storing base_pcr_score** → Verify NUMERIC(5,2) type
   ```javascript
   base_pcr_score: 75  // ⚠️ STOP! Store as 75.00 for NUMERIC type
   ```

5. **Storing final_pcr_score** → Verify 0-105 range
   ```javascript
   final_pcr_score: 110  // ⚠️ STOP! Cannot exceed 105 per CHECK constraint
   ```

6. **Counting demo videos** → Use jsonb_array_length()
   ```javascript
   // ❌ WRONG:
   demo_videos_count = landing_page_videos.length  // landing_page_videos is JSONB in database

   // ✅ CORRECT:
   demo_videos_count = jsonb_array_length(landing_page_videos)  // SQL
   // OR in JS after fetching:
   demo_videos_count = partner.landing_page_videos ? partner.landing_page_videos.length : 0
   ```

7. **Parsing employee_references** → It's TEXT, not JSONB
   ```javascript
   // ❌ WRONG:
   employee_feedback_count = JSON.parse(partner.employee_references).length

   // ✅ CORRECT:
   employee_feedback_count = partner.employee_references ? parseEmployeeCount(partner.employee_references) : 0
   ```

8. **Storing quarterly_history** → Verify JSONB array
   ```javascript
   // ❌ WRONG:
   quarterly_history = '[{"quarter":"Q1-2025","score":78}]'  // String, not JSONB

   // ✅ CORRECT:
   quarterly_history = [{quarter: 'Q1-2025', score: 78}]  // Direct array/object
   ```

9. **Setting subscription_status** → Verify exact values
   ```javascript
   subscription_status: 'Active'  // ⚠️ STOP! Must be lowercase 'active'
   ```

10. **Calculating final PCR** → Ensure formula keeps score in 0-105 range
    ```javascript
    // ❌ WRONG (could exceed 105):
    final_pcr = base_pcr * payment_multiplier

    // ✅ CORRECT (formula ensures 0-105):
    final_pcr = (base_pcr * 0.80) + (20 * payment_multiplier / 5)
    ```

---

## 📋 Quick Reference Commands

### Check All Columns
```bash
powershell -Command ".\quick-db.bat \"SELECT column_name, data_type, character_maximum_length, column_default, is_nullable FROM information_schema.columns WHERE table_name = 'strategic_partners' ORDER BY ordinal_position;\""
```

### Check All Constraints
```bash
powershell -Command ".\quick-db.bat \"SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'strategic_partners'::regclass;\""
```

### Check CHECK Constraints Only
```bash
powershell -Command ".\quick-db.bat \"SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'strategic_partners'::regclass AND contype = 'c';\""
```

### Check Foreign Keys Only
```bash
powershell -Command ".\quick-db.bat \"SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'strategic_partners'::regclass AND contype = 'f';\""
```

### Count Columns in strategic_partners
```bash
powershell -Command ".\quick-db.bat \"SELECT COUNT(*) as column_count FROM information_schema.columns WHERE table_name = 'strategic_partners';\""
```

### Check Specific PCR Field
```bash
powershell -Command ".\quick-db.bat \"SELECT column_name, data_type, column_default, is_nullable FROM information_schema.columns WHERE table_name = 'strategic_partners' AND column_name = 'engagement_tier';\""
```

### Verify Data Migration (After Running Migration)
```bash
powershell -Command ".\quick-db.bat \"SELECT company_name, demo_videos_count, customer_feedback_count, profile_completion_score, final_pcr_score FROM strategic_partners WHERE id IN (SELECT id FROM strategic_partners LIMIT 5);\""
```

### Check Engagement Tier Distribution
```bash
powershell -Command ".\quick-db.bat \"SELECT engagement_tier, COUNT(*) as partner_count FROM strategic_partners GROUP BY engagement_tier;\""
```

### Check PCR Score Ranges
```bash
powershell -Command ".\quick-db.bat \"SELECT MIN(base_pcr_score) as min_base, MAX(base_pcr_score) as max_base, MIN(final_pcr_score) as min_final, MAX(final_pcr_score) as max_final FROM strategic_partners WHERE base_pcr_score IS NOT NULL;\""
```

---

## ✅ Example: Creating pcrCalculationService.js

### Pre-Flight Verification:

**1. Tables Involved:**
- `strategic_partners` (read for calculation, update for scores)

**2. Column Names Verified:**
```bash
# Run command:
powershell -Command ".\quick-db.bat \"SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'strategic_partners' AND column_name IN ('id', 'company_name', 'demo_videos_count', 'employee_feedback_count', 'customer_feedback_count', 'key_differentiators', 'company_description', 'unique_value', 'primary_email', 'ceo_contact_email', 'cx_contact_email', 'sales_contact_email', 'testimonials', 'success_stories', 'client_demos', 'has_quarterly_data', 'quarterly_feedback_score', 'average_satisfaction', 'engagement_tier', 'payment_multiplier', 'profile_completion_score', 'base_pcr_score', 'final_pcr_score', 'pcr_last_calculated') ORDER BY ordinal_position;\""

# Document results - all field names confirmed
```

**3. CHECK Constraints Verified:**
```bash
powershell -Command ".\quick-db.bat \"SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'strategic_partners'::regclass AND contype = 'c' AND conname LIKE '%pcr%' OR conname LIKE '%tier%' OR conname LIKE '%multiplier%';\""

# Document results:
# - engagement_tier: CHECK IN ('free', 'verified', 'gold')
# - payment_multiplier: CHECK IN (1.5, 2.5, 5.0)
# - profile_completion_score: CHECK >= 0 AND <= 100
# - quarterly_feedback_score: CHECK >= 0 AND <= 100
# - base_pcr_score: CHECK IS NULL OR (>= 0 AND <= 100)
# - final_pcr_score: CHECK IS NULL OR (>= 0 AND <= 105)
```

**4. Foreign Keys Verified:**
No foreign keys for PCR fields (all self-contained in strategic_partners)

**5. Data Types Noted:**
- `engagement_tier`: VARCHAR(20)
- `payment_multiplier`: NUMERIC(3,1)
- `profile_completion_score`: INTEGER
- `demo_videos_count`: INTEGER
- `quarterly_feedback_score`: NUMERIC(5,2)
- `has_quarterly_data`: BOOLEAN
- `quarterly_history`: JSONB
- `base_pcr_score`: NUMERIC(5,2)
- `final_pcr_score`: NUMERIC(5,2)

**6. Documentation Block:**
```javascript
// DATABASE-CHECKED: strategic_partners columns verified October 29, 2025
// ================================================================
// VERIFIED CONSTRAINTS:
// - strategic_partners.engagement_tier: CHECK IN ('free', 'verified', 'gold')
// - strategic_partners.payment_multiplier: CHECK IN (1.5, 2.5, 5.0)
// - strategic_partners.profile_completion_score: CHECK >= 0 AND <= 100
// - strategic_partners.quarterly_feedback_score: CHECK >= 0 AND <= 100
// - strategic_partners.base_pcr_score: CHECK IS NULL OR (>= 0 AND <= 100)
// - strategic_partners.final_pcr_score: CHECK IS NULL OR (>= 0 AND <= 105)
// ================================================================
// VERIFIED FIELD NAMES: [See full list above in Step 6 example]
// ================================================================
// VERIFIED DATA TYPES: [See full list above in Step 6 example]
// ================================================================
```

**NOW WE CAN CODE PCR CALCULATION SERVICE SAFELY!**

---

## 📚 Phase 1 Specific Verification Notes

### PCR Calculation Service Checklist
- [ ] Verify `engagement_tier` exact values ('free', 'verified', 'gold')
- [ ] Verify `payment_multiplier` exact values (1.5, 2.5, 5.0)
- [ ] Verify `subscription_status` exact values ('active', 'cancelled', 'expired', 'inactive')
- [ ] Verify `profile_completion_score` is INTEGER type (0-100)
- [ ] Verify `demo_videos_count` counts from landing_page_videos JSONB
- [ ] Verify `customer_feedback_count` counts from client_testimonials JSONB
- [ ] Verify `employee_feedback_count` parses employee_references TEXT
- [ ] Verify `quarterly_feedback_score` is NUMERIC(5,2) with default 50.00
- [ ] Verify `has_quarterly_data` is BOOLEAN
- [ ] Verify `quarterly_history` is JSONB array
- [ ] Verify `base_pcr_score` is NUMERIC(5,2), nullable, 0-100 range
- [ ] Verify `final_pcr_score` is NUMERIC(5,2), nullable, 0-105 range

### Migration Script Checklist
- [ ] Verify all new field names match exactly
- [ ] Verify all CHECK constraints defined correctly
- [ ] Verify all default values set correctly
- [ ] Verify data migration populates demo_videos_count from landing_page_videos
- [ ] Verify data migration populates customer_feedback_count from client_testimonials
- [ ] Verify indexes created on engagement_tier and final_pcr_score
- [ ] Verify column comments added for documentation

### API Endpoint Checklist
- [ ] Verify POST /api/partners/:id/calculate-pcr uses correct field names
- [ ] Verify PATCH /api/partners/:id/engagement-tier validates tier values
- [ ] Verify response includes all PCR fields (profile_score, quarterly_score, base_pcr, final_pcr)
- [ ] Verify engagement tier changes recalculate PCR automatically

### Admin Dashboard Checklist
- [ ] Verify PCR scores display with 2 decimal places (NUMERIC 5,2)
- [ ] Verify engagement tier dropdown uses exact values ('free', 'verified', 'gold')
- [ ] Verify payment multiplier displays correctly (1.5x, 2.5x, 5.0x)
- [ ] Verify PCR calculation triggers on profile updates

---

## 🚨 Phase 1 Critical Gotchas

### 1. Engagement Tier Case Sensitivity
```javascript
// ❌ WRONG (uppercase):
engagement_tier: 'Free'

// ✅ CORRECT (lowercase):
engagement_tier: 'free'
```

### 2. Payment Multiplier as Decimal
```javascript
// ❌ WRONG (integer):
payment_multiplier: 2  // Should be 2.5

// ✅ CORRECT (decimal):
payment_multiplier: 2.5  // NUMERIC(3,1)
```

### 3. JSONB Array Length vs String
```javascript
// ❌ WRONG (if landing_page_videos is JSONB in DB):
demo_videos_count = JSON.parse(landing_page_videos).length

// ✅ CORRECT (if landing_page_videos is already parsed as JS object):
demo_videos_count = landing_page_videos ? landing_page_videos.length : 0
```

### 4. Score Precision
```javascript
// ❌ WRONG (INTEGER when should be NUMERIC):
base_pcr_score = 75  // For INTEGER field, OK
base_pcr_score = 75  // For NUMERIC(5,2) field, store as 75.00

// ✅ CORRECT (proper precision):
base_pcr_score = Math.round(score * 100) / 100  // 2 decimal places
```

### 5. Quarterly Feedback Default
```javascript
// ❌ WRONG (0 as default):
quarterly_feedback_score = has_quarterly_data ? actual_score : 0

// ✅ CORRECT (50 as default):
quarterly_feedback_score = has_quarterly_data ? actual_score : 50.00
```

### 6. Final PCR Formula
```javascript
// ❌ WRONG (simple multiplication exceeds 105):
final_pcr = base_pcr * payment_multiplier  // Could be 100 * 5 = 500

// ✅ CORRECT (formula ensures 0-105):
final_pcr = (base_pcr * 0.80) + (20 * payment_multiplier / 5)
// Max: (100 * 0.80) + (20 * 5 / 5) = 80 + 20 = 100
```

### 7. NULL vs 0 for Scores
```javascript
// ❌ WRONG (storing 0 before calculation):
base_pcr_score: 0  // Looks like calculated but bad

// ✅ CORRECT (NULL until calculated):
base_pcr_score: null  // Clear it hasn't been calculated yet
```

### 8. Employee References Parsing
```javascript
// ❌ WRONG (employee_references is TEXT, not JSONB):
employee_feedback_count = JSON.parse(partner.employee_references).length

// ✅ CORRECT (parse TEXT field manually):
function parseEmployeeCount(text) {
  if (!text) return 0;
  // Count occurrences of separator or entries
  // Implementation depends on how data is stored
  return text.split('\n').filter(line => line.trim().length > 0).length;
}
```

### 9. Subscription Status Values
```javascript
// ❌ WRONG (inconsistent naming):
subscription_status: 'active'  // lowercase
subscription_status: 'Cancelled'  // capitalized
subscription_status: 'EXPIRED'  // uppercase

// ✅ CORRECT (consistent lowercase):
subscription_status: 'active'
subscription_status: 'cancelled'
subscription_status: 'expired'
subscription_status: 'inactive'
```

### 10. Duplicate PowerConfidence Fields
```javascript
// ⚠️ BE AWARE (two similar fields exist):
powerconfidence_score      // Legacy field (INTEGER)
power_confidence_score     // Duplicate field (INTEGER)
final_pcr_score            // NEW field (NUMERIC 5,2) - USE THIS

// ✅ CORRECT (use new field):
// For new system, update final_pcr_score
// Consider migrating old scores to final_pcr_score in future
```

---

## 📚 Related Documents

- **Database Source of Truth:** `DATABASE-SOURCE-OF-TRUTH.md` (project root)
- **Phase 1 Implementation Plan:** `PHASE-1-IMPLEMENTATION-PLAN.md` (this directory)
- **PCR Overview:** `../PCR-SCORING-OVERVIEW.md`
- **Phase 2 Plan:** `../phase-2/PHASE-2-IMPLEMENTATION-PLAN.md`

---

**Last Updated:** October 29, 2025
**Next Review:** Before each file creation in Phase 1 Days 1-5
**Status:** MANDATORY - Use this checklist religiously

---

## 🎯 Quick Start for Phase 1 Day 1

**Before creating ANY file, run these commands to verify current schema:**

```bash
# 1. Check current strategic_partners table structure (should have 124 columns)
powershell -Command ".\quick-db.bat \"SELECT COUNT(*) as column_count FROM information_schema.columns WHERE table_name = 'strategic_partners';\""

# 2. Check for duplicate powerconfidence fields
powershell -Command ".\quick-db.bat \"SELECT column_name, data_type, column_default FROM information_schema.columns WHERE table_name = 'strategic_partners' AND column_name LIKE '%confidence%';\""

# 3. Check existing JSONB fields we'll use for counts
powershell -Command ".\quick-db.bat \"SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'strategic_partners' AND column_name IN ('landing_page_videos', 'client_testimonials');\""

# 4. Verify TEXT fields we'll use for scoring
powershell -Command ".\quick-db.bat \"SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'strategic_partners' AND column_name IN ('key_differentiators', 'company_description', 'unique_value', 'employee_references');\""

# 5. Check existing satisfaction fields
powershell -Command ".\quick-db.bat \"SELECT column_name, data_type, column_default FROM information_schema.columns WHERE table_name = 'strategic_partners' AND column_name IN ('average_satisfaction', 'total_feedback_responses', 'last_quarterly_report');\""
```

**After running migration, verify new fields:**

```bash
# 1. Verify column count increased (should be 124 + 16 = 140)
powershell -Command ".\quick-db.bat \"SELECT COUNT(*) as column_count FROM information_schema.columns WHERE table_name = 'strategic_partners';\""

# 2. Verify all new PCR fields exist
powershell -Command ".\quick-db.bat \"SELECT column_name, data_type, column_default FROM information_schema.columns WHERE table_name = 'strategic_partners' AND column_name IN ('engagement_tier', 'payment_multiplier', 'subscription_start_date', 'subscription_end_date', 'subscription_status', 'profile_completion_score', 'demo_videos_count', 'employee_feedback_count', 'customer_feedback_count', 'profile_last_updated', 'quarterly_feedback_score', 'has_quarterly_data', 'quarterly_history', 'base_pcr_score', 'final_pcr_score', 'pcr_last_calculated');\""

# 3. Verify CHECK constraints were created
powershell -Command ".\quick-db.bat \"SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'strategic_partners'::regclass AND contype = 'c' AND (conname LIKE '%tier%' OR conname LIKE '%multiplier%' OR conname LIKE '%pcr%');\""

# 4. Verify data migration populated counts
powershell -Command ".\quick-db.bat \"SELECT company_name, demo_videos_count, customer_feedback_count FROM strategic_partners WHERE demo_videos_count > 0 OR customer_feedback_count > 0 LIMIT 10;\""

# 5. Verify default values
powershell -Command ".\quick-db.bat \"SELECT engagement_tier, payment_multiplier, quarterly_feedback_score, has_quarterly_data FROM strategic_partners LIMIT 5;\""
```

**Document results, then code safely!**
