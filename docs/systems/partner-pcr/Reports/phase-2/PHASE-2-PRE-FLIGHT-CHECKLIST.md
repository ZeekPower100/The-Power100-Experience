# Phase 2: Pre-Flight Checklist for Reports Portal & Email Delivery

**Document Version:** 1.0
**Date:** October 31, 2025
**Status:** MANDATORY - Use before creating or modifying ANY file
**Phase:** Reports Portal & Email Delivery (Week 2)

---

## 🎯 Purpose

This checklist ensures 100% database alignment for every file we create or modify during Phase 2 implementation (Reports Portal & Email Delivery). Following this prevents naming mismatches and ensures proper integration with Phase 1 foundation.

**Phase 2 builds on Phase 1:** Assumes partner_reports table already exists from Phase 1 migration.

---

## ✅ MANDATORY CHECKLIST - Before Creating/Modifying ANY File

### Step 1: Identify Database Tables Involved

**Question:** What database tables will this file interact with?

**Phase 2 Primary Tables:**
- **partner_reports** (EXISTING from Phase 1 - will query and update)
- **strategic_partners** (EXISTING - for partner portal access)
- **contractors** (EXISTING - for contractor portal access)
- **power_card_campaigns** (EXISTING - for automation triggers)

**Phase 2 Related Tables** (may query but not modify):
- **admin_users** (for tracking who triggered reports)
- **power_card_analytics** (already used in Phase 1 generation)
- **power_card_templates** (already used in Phase 1 generation)
- **power_card_responses** (already used in Phase 1 generation)

**Example:**
- Email delivery service: `partner_reports`, `strategic_partners`, `contractors`
- Partner portal UI: `partner_reports`, `strategic_partners`
- Contractor portal UI: `partner_reports`, `contractors`
- Automation workflow: `power_card_campaigns`, `partner_reports`

**Action:** List all tables this file will query, insert, update, or reference.

---

### Step 2: Verify Column Names (Field Names)

**For EACH table identified in Step 1:**

```bash
# Run this command for EACH table:
powershell -Command ".\quick-db.bat \"SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'TABLE_NAME' ORDER BY ordinal_position;\""
```

**Action:** Document exact column names from database output.

**Phase 2 Key Tables - MUST VERIFY:**

#### partner_reports table (EXISTING from Phase 1 - DO NOT MODIFY!)
```bash
powershell -Command ".\quick-db.bat \"SELECT column_name, data_type, column_default, is_nullable FROM information_schema.columns WHERE table_name = 'partner_reports' ORDER BY ordinal_position;\""
```

**Expected Fields (verify Phase 1 migration succeeded):**
```
column_name                      | data_type          | column_default         | is_nullable
---------------------------------|--------------------|-----------------------|------------
id                               | integer            | nextval(...)          | NO
partner_id                       | integer            |                       | NO
campaign_id                      | integer            |                       | YES
report_type                      | character varying  |                       | NO
quarter                          | character varying  |                       | NO
year                             | integer            |                       | NO
generation_date                  | timestamp          | NOW()                 | YES
report_data                      | jsonb              |                       | NO
total_responses                  | integer            | 0                     | YES
avg_satisfaction                 | numeric            |                       | YES
avg_nps                          | integer            |                       | YES
metric_1_avg                     | numeric            |                       | YES
metric_2_avg                     | numeric            |                       | YES
metric_3_avg                     | numeric            |                       | YES
metric_1_name                    | character varying  |                       | YES
metric_2_name                    | character varying  |                       | YES
metric_3_name                    | character varying  |                       | YES
status                           | character varying  | 'draft'               | YES
delivered_at                     | timestamp          |                       | YES
viewed_at                        | timestamp          |                       | YES
generated_by                     | integer            |                       | YES
created_at                       | timestamp          | NOW()                 | YES
updated_at                       | timestamp          | NOW()                 | YES
```

**Phase 2 Critical Fields (existing - will use):**
- `status` (VARCHAR) - Values: 'draft', 'generated', 'delivered', 'viewed'
- `delivered_at` (TIMESTAMP) - When email was sent
- `viewed_at` (TIMESTAMP) - When report was opened
- `report_data` (JSONB) - Contains full report for portal display
- `report_type` (VARCHAR) - 'executive_summary', 'contractor_comparison', 'public_pcr'

**NO NEW FIELDS ADDED IN PHASE 2** - We use what Phase 1 created!

---

#### strategic_partners table (EXISTING - for partner portal)
```bash
powershell -Command ".\quick-db.bat \"SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'strategic_partners' AND column_name IN ('id', 'company_name', 'primary_email', 'logo_url', 'is_active') ORDER BY column_name;\""
```

**Expected Fields:**
```
column_name     | data_type
----------------|------------------
company_name    | character varying
id              | integer
is_active       | boolean
logo_url        | character varying
primary_email   | character varying
```

**Phase 2 Usage:**
- `id` - Link to partner_reports.partner_id
- `company_name` - Display in portal and emails
- `primary_email` - Send executive reports to this email
- `logo_url` - Include in email templates
- `is_active` - Only send reports to active partners

---

#### contractors table (EXISTING - for contractor portal)
```bash
powershell -Command ".\quick-db.bat \"SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'contractors' AND column_name IN ('id', 'name', 'company_name', 'email', 'revenue_tier') ORDER BY column_name;\""
```

**Expected Fields:**
```
column_name     | data_type
----------------|------------------
company_name    | character varying
email           | character varying
id              | integer
name            | character varying
revenue_tier    | character varying
```

**Phase 2 Usage:**
- `id` - Reference for contractor-specific reports
- `name` - Display in portal and emails
- `email` - Send contractor reports to this email
- `company_name` - Display in reports
- `revenue_tier` - Already used for benchmarking in Phase 1

---

#### power_card_campaigns table (EXISTING - for automation triggers)
```bash
powershell -Command ".\quick-db.bat \"SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'power_card_campaigns' AND column_name IN ('id', 'partner_id', 'status', 'quarter', 'year', 'total_responses') ORDER BY column_name;\""
```

**Expected Fields:**
```
column_name      | data_type
-----------------|------------------
id               | integer
partner_id       | integer
quarter          | character varying
status           | character varying
total_responses  | integer
year             | integer
```

**Phase 2 Usage:**
- `status` - Trigger report generation when status = 'completed'
- `quarter`, `year` - Include in report generation
- `partner_id` - Know which partner to generate report for
- `total_responses` - Verify sufficient data before generating

**Critical Constraint:**
- Status values: Check what values are allowed (likely 'draft', 'active', 'completed', 'cancelled')

---

#### admin_users table (EXISTING - for tracking)
```bash
powershell -Command ".\quick-db.bat \"SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'admin_users' AND column_name IN ('id', 'email', 'name') ORDER BY column_name;\""
```

**Expected Fields:**
```
column_name | data_type
------------|------------------
email       | character varying
id          | integer
name        | character varying
```

**Phase 2 Usage:**
- `id` - Store in partner_reports.generated_by
- `name` - Display who triggered manual report generation

---

### Step 3: Verify CHECK Constraints

**For tables with enum-like fields (status, type, etc.):**

```bash
# Run this command for each table with enum fields:
powershell -Command ".\quick-db.bat \"SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'TABLE_NAME'::regclass AND contype = 'c';\""
```

**Action:** Document exact allowed values from CHECK constraints.

**Phase 2 Critical Constraints - To Be Verified:**

#### partner_reports (verify Phase 1 constraints)
```bash
powershell -Command ".\quick-db.bat \"SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'partner_reports'::regclass AND contype = 'c';\""
```

**Expected Constraints:**
```
constraint_name                           | constraint_definition
------------------------------------------|----------------------
partner_reports_report_type_check         | CHECK (report_type IN ('executive_summary', 'contractor_comparison', 'public_pcr'))
partner_reports_quarter_check             | CHECK (quarter IN ('Q1', 'Q2', 'Q3', 'Q4'))
partner_reports_status_check              | CHECK (status IN ('draft', 'generated', 'delivered', 'viewed'))
```

**IMPORTANT Phase 2 Constraint Rules:**
1. **Report Type:** MUST be 'executive_summary', 'contractor_comparison', or 'public_pcr' (lowercase, underscore)
2. **Quarter:** MUST be 'Q1', 'Q2', 'Q3', or 'Q4' (uppercase Q)
3. **Status:** MUST be 'draft', 'generated', 'delivered', or 'viewed' (lowercase)

**What to Check:**
- ✅ Exact enum values (case-sensitive!)
- ✅ All allowed values (don't assume!)
- ✅ **Phase 2 Critical:** Status progression: draft → generated → delivered → viewed

---

#### power_card_campaigns (verify status values)
```bash
powershell -Command ".\quick-db.bat \"SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'power_card_campaigns'::regclass AND contype = 'c';\""
```

**Expected Constraints:**
Check what status values are allowed. Document for automation triggers.

---

### Step 4: Verify Foreign Key Constraints

**For tables with relationships:**

```bash
# Run this command to see foreign keys:
powershell -Command ".\quick-db.bat \"SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'TABLE_NAME'::regclass AND contype = 'f';\""
```

**Action:** Document which fields reference other tables.

**Phase 2 Key Foreign Keys - To Be Verified:**

#### partner_reports (verify Phase 1 foreign keys)
```bash
powershell -Command ".\quick-db.bat \"SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'partner_reports'::regclass AND contype = 'f';\""
```

**Expected Foreign Keys:**
```
constraint_name                           | constraint_definition
------------------------------------------|----------------------
partner_reports_partner_id_fkey           | FOREIGN KEY (partner_id) REFERENCES strategic_partners(id) ON DELETE CASCADE
partner_reports_campaign_id_fkey          | FOREIGN KEY (campaign_id) REFERENCES power_card_campaigns(id) ON DELETE SET NULL
partner_reports_generated_by_fkey         | FOREIGN KEY (generated_by) REFERENCES admin_users(id) ON DELETE SET NULL
```

**Phase 2 Note:**
- CASCADE on partner_id: If partner deleted, their reports are deleted too
- SET NULL on campaign_id: If campaign deleted, report remains but campaign reference is NULL
- SET NULL on generated_by: If admin user deleted, report remains but creator reference is NULL

**What to Check:**
- ✅ All foreign keys exist from Phase 1
- ✅ ON DELETE actions are correct for Phase 2 use cases
- ✅ Can safely query joins on these relationships

---

### Step 5: Check Data Types (Especially JSON/TEXT/TIMESTAMP)

**From Step 2 output, identify:**
- TEXT vs VARCHAR
- INTEGER vs NUMERIC
- TIMESTAMP vs TIMESTAMPTZ
- **JSONB vs TEXT** (most important!)
- BOOLEAN fields

**Phase 2 Critical Data Types:**

| Field                          | Type           | Notes                                         |
|--------------------------------|----------------|-----------------------------------------------|
| `report_data`                  | JSONB          | Full report JSON for portal display           |
| `status`                       | VARCHAR(50)    | Plain text: 'draft', 'generated', 'delivered', 'viewed' |
| `delivered_at`                 | TIMESTAMP      | When email was sent                           |
| `viewed_at`                    | TIMESTAMP      | When report was opened in portal              |
| `report_type`                  | VARCHAR(50)    | Report type identifier                        |
| `quarter`                      | VARCHAR(2)     | 'Q1', 'Q2', 'Q3', or 'Q4'                     |
| `year`                         | INTEGER        | 4-digit year                                  |
| `metric_1_name`                | VARCHAR(100)   | Custom metric name                            |
| `metric_2_name`                | VARCHAR(100)   | Custom metric name                            |
| `metric_3_name`                | VARCHAR(100)   | Custom metric name                            |
| `avg_satisfaction`             | NUMERIC(5,2)   | Decimal 0.00-100.00                           |
| `avg_nps`                      | INTEGER        | Whole number -100 to 100                      |
| `metric_1_avg`                 | NUMERIC(5,2)   | Decimal average                               |
| `partner_id`                   | INTEGER        | Foreign key to strategic_partners             |
| `campaign_id`                  | INTEGER        | Foreign key to power_card_campaigns (nullable)|
| `generated_by`                 | INTEGER        | Foreign key to admin_users (nullable)         |

**Action:** Ensure code uses correct data types.

**Common Issues:**
- ❌ Using `JSON.parse()` on report_data (it's already parsed from JSONB)
- ❌ Using Date objects incorrectly with TIMESTAMP fields
- ❌ Storing status as number instead of string ('delivered' not 3)
- ❌ Using wrong case for status values ('Delivered' vs 'delivered')

---

### Step 6: Document Findings BEFORE Coding

**Create a verification block at the top of the file:**

```javascript
// DATABASE-CHECKED: [table_names] columns verified [date]
// ================================================================
// VERIFIED CONSTRAINTS:
// - table_name.field_name: CHECK IN ('value1', 'value2', 'value3')
// ================================================================
// VERIFIED FIELD NAMES:
// - field_one (NOT fieldOne, NOT field1)
// - another_field (NOT anotherField)
// ================================================================
// VERIFIED DATA TYPES:
// - some_field: JSONB (already parsed from database)
// - some_timestamp: TIMESTAMP (use JS Date objects)
// ================================================================
```

**Phase 2 Example (Email Delivery Service):**
```javascript
// DATABASE-CHECKED: partner_reports, strategic_partners, contractors verified October 31, 2025
// ================================================================
// VERIFIED CONSTRAINTS:
// - partner_reports.status: CHECK IN ('draft', 'generated', 'delivered', 'viewed')
// - partner_reports.report_type: CHECK IN ('executive_summary', 'contractor_comparison', 'public_pcr')
// - partner_reports.quarter: CHECK IN ('Q1', 'Q2', 'Q3', 'Q4')
// ================================================================
// VERIFIED FIELD NAMES:
// - delivered_at (NOT deliveredAt)
// - viewed_at (NOT viewedAt)
// - report_data (NOT reportData)
// - report_type (NOT reportType)
// - partner_id (NOT partnerId)
// - campaign_id (NOT campaignId)
// - generated_by (NOT generatedBy)
// - metric_1_name (NOT metric1Name)
// - avg_satisfaction (NOT avgSatisfaction)
// - primary_email (NOT primaryEmail - from strategic_partners)
// ================================================================
// VERIFIED DATA TYPES:
// - report_data: JSONB (already parsed object from database)
// - delivered_at: TIMESTAMP (nullable until email sent)
// - viewed_at: TIMESTAMP (nullable until report opened)
// - status: VARCHAR(50) (plain text)
// - partner_id: INTEGER (foreign key)
// ================================================================
// EMAIL OPERATIONS:
// - sendExecutiveReport: Email to strategic_partners.primary_email
// - sendContractorReport: Email to contractors.email
// - updateDeliveryStatus: Set delivered_at = NOW(), status = 'delivered'
// - trackReportView: Set viewed_at = NOW(), status = 'viewed' (only if not already viewed)
// ================================================================
```

---

### Step 7: Verify BOTH Development AND Production

**IMPORTANT:** Check that both environments have Phase 1 migration applied!

```bash
# Development: Verify partner_reports table exists
powershell -Command ".\quick-db.bat \"SELECT COUNT(*) as column_count FROM information_schema.columns WHERE table_name = 'partner_reports';\""

# Production: Same check
# Use mcp__aws-production__exec tool with same query
PGPASSWORD='dBP0wer100!!' psql -h tpe-database-production.cmtcsi0kytrf.us-east-1.rds.amazonaws.com -U tpeadmin -d tpedb -c "SELECT COUNT(*) as column_count FROM information_schema.columns WHERE table_name = 'partner_reports';"
```

**Phase 2 Specific Checks:**
1. Verify partner_reports table has 22 columns (from Phase 1)
2. Verify all CHECK constraints exist in both environments
3. Verify all foreign keys exist in both environments
4. Verify strategic_partners has primary_email field
5. Verify contractors has email field
6. Verify power_card_campaigns has status field

**Action:** Confirm both environments match before implementing Phase 2.

---

## 🚨 Red Flags - STOP and Verify

If you see ANY of these in Phase 2, STOP and run verification queries:

1. **Setting report status** → Verify exact values
   ```javascript
   status: 'Delivered'  // ⚠️ STOP! Must be lowercase 'delivered'
   ```

2. **Setting report_type** → Verify exact values
   ```javascript
   report_type: 'Executive Summary'  // ⚠️ STOP! Must be 'executive_summary' with underscore
   ```

3. **Setting quarter** → Verify exact format
   ```javascript
   quarter: 'q1'  // ⚠️ STOP! Must be uppercase 'Q1'
   ```

4. **Parsing report_data** → It's already parsed from JSONB
   ```javascript
   // ❌ WRONG:
   const report = JSON.parse(row.report_data);  // JSONB is already an object

   // ✅ CORRECT:
   const report = row.report_data;  // Use directly
   ```

5. **Updating delivered_at** → Use NOW() or JS Date
   ```javascript
   // ❌ WRONG:
   delivered_at: 'now'  // String, not timestamp

   // ✅ CORRECT (SQL):
   delivered_at = NOW()

   // ✅ CORRECT (JS):
   delivered_at: new Date()
   ```

6. **Status progression** → Follow correct order
   ```javascript
   // ❌ WRONG (skip states):
   status: 'draft' → 'viewed'  // Must go through 'generated' → 'delivered' first

   // ✅ CORRECT:
   status: 'draft' → 'generated' → 'delivered' → 'viewed'
   ```

7. **Email field references** → Use correct table.field
   ```javascript
   // ❌ WRONG:
   SELECT email FROM partner_reports  // partner_reports doesn't have email

   // ✅ CORRECT:
   SELECT sp.primary_email FROM strategic_partners sp
   JOIN partner_reports pr ON pr.partner_id = sp.id
   ```

8. **Timestamp comparisons** → Handle NULL correctly
   ```javascript
   // ❌ WRONG:
   if (delivered_at > now)  // delivered_at might be NULL

   // ✅ CORRECT:
   if (delivered_at && delivered_at > now)
   ```

---

## 📋 Quick Reference Commands

### Check partner_reports Table Exists
```bash
powershell -Command ".\quick-db.bat \"SELECT table_name FROM information_schema.tables WHERE table_name = 'partner_reports';\""
```

### Check All partner_reports Columns
```bash
powershell -Command ".\quick-db.bat \"SELECT column_name, data_type, column_default, is_nullable FROM information_schema.columns WHERE table_name = 'partner_reports' ORDER BY ordinal_position;\""
```

### Check partner_reports Constraints
```bash
powershell -Command ".\quick-db.bat \"SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'partner_reports'::regclass;\""
```

### Check Foreign Keys
```bash
powershell -Command ".\quick-db.bat \"SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'partner_reports'::regclass AND contype = 'f';\""
```

### Check Report Status Distribution
```bash
powershell -Command ".\quick-db.bat \"SELECT status, COUNT(*) as report_count FROM partner_reports GROUP BY status;\""
```

### Check Email Fields Exist
```bash
powershell -Command ".\quick-db.bat \"SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'strategic_partners' AND column_name = 'primary_email';\""

powershell -Command ".\quick-db.bat \"SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'contractors' AND column_name = 'email';\""
```

### Check Campaign Status Values
```bash
powershell -Command ".\quick-db.bat \"SELECT DISTINCT status FROM power_card_campaigns ORDER BY status;\""
```

### Verify Delivered Reports
```bash
powershell -Command ".\quick-db.bat \"SELECT id, report_type, status, delivered_at FROM partner_reports WHERE delivered_at IS NOT NULL ORDER BY delivered_at DESC LIMIT 10;\""
```

### Check Reports Ready for Delivery
```bash
powershell -Command ".\quick-db.bat \"SELECT COUNT(*) as ready_to_send FROM partner_reports WHERE status = 'generated' AND delivered_at IS NULL;\""
```

---

## 📚 Phase 2 Specific Verification Notes

### Email Delivery Service Checklist
- [ ] Verify `partner_reports.status` exact values ('draft', 'generated', 'delivered', 'viewed')
- [ ] Verify `partner_reports.delivered_at` is TIMESTAMP (nullable)
- [ ] Verify `partner_reports.viewed_at` is TIMESTAMP (nullable)
- [ ] Verify `strategic_partners.primary_email` exists for partner emails
- [ ] Verify `contractors.email` exists for contractor emails
- [ ] Verify `report_data` is JSONB (already parsed)
- [ ] Verify status transitions follow correct order

### Partner Portal UI Checklist
- [ ] Verify can join `partner_reports` with `strategic_partners` on partner_id
- [ ] Verify `report_data` contains all fields needed for display
- [ ] Verify `report_type` used to route to correct template
- [ ] Verify `viewed_at` updates when partner opens report
- [ ] Verify portal only shows reports for authenticated partner's ID

### Contractor Portal UI Checklist
- [ ] Verify contractor reports link to correct contractor ID
- [ ] Verify variance data is in `report_data` JSONB
- [ ] Verify custom metric names stored in metric_1/2/3_name fields
- [ ] Verify `viewed_at` updates when contractor opens report

### Automation Workflow Checklist
- [ ] Verify `power_card_campaigns.status` values for trigger ('completed')
- [ ] Verify campaign has sufficient `total_responses` before generation
- [ ] Verify `partner_reports` doesn't already exist for quarter/year
- [ ] Verify foreign keys maintain data integrity on campaign completion

---

## 🚨 Phase 2 Critical Gotchas

### 1. Status Case Sensitivity
```javascript
// ❌ WRONG (uppercase):
status: 'Generated'

// ✅ CORRECT (lowercase):
status: 'generated'
```

### 2. JSONB Already Parsed
```javascript
// ❌ WRONG (double parsing):
const report = JSON.parse(row.report_data);

// ✅ CORRECT (use directly):
const report = row.report_data;
```

### 3. NULL Timestamp Handling
```javascript
// ❌ WRONG (NULL comparison fails):
if (delivered_at > cutoffDate)

// ✅ CORRECT (check NULL first):
if (delivered_at && delivered_at > cutoffDate)
```

### 4. Email Field Location
```javascript
// ❌ WRONG (email not in partner_reports):
SELECT email FROM partner_reports

// ✅ CORRECT (email in strategic_partners):
SELECT sp.primary_email
FROM partner_reports pr
JOIN strategic_partners sp ON pr.partner_id = sp.id
```

### 5. Status Progression Order
```javascript
// ❌ WRONG (skip states):
UPDATE partner_reports SET status = 'viewed' WHERE status = 'generated'

// ✅ CORRECT (follow progression):
// generated → delivered (when email sent)
// delivered → viewed (when report opened)
```

### 6. Quarter Format
```javascript
// ❌ WRONG (lowercase):
quarter: 'q1'

// ✅ CORRECT (uppercase Q):
quarter: 'Q1'
```

### 7. Report Type Format
```javascript
// ❌ WRONG (spaces or camelCase):
report_type: 'Executive Summary'
report_type: 'executiveSummary'

// ✅ CORRECT (snake_case):
report_type: 'executive_summary'
```

---

## 📚 Related Documents

- **Database Source of Truth:** `DATABASE-SOURCE-OF-TRUTH.md` (project root)
- **Phase 2 Implementation Plan:** `PHASE-2-IMPLEMENTATION-PLAN.md` (this directory)
- **Phase 1 Pre-Flight:** `../phase-1/PHASE-1-PRE-FLIGHT-CHECKLIST.md`
- **Phase 1 Implementation:** `../phase-1/PHASE-1-IMPLEMENTATION-PLAN.md`
- **Reports Overview:** `../PCR-REPORTS-OVERVIEW.md`

---

**Last Updated:** October 31, 2025
**Next Review:** Before each file creation in Phase 2 Days 1-5
**Status:** MANDATORY - Use this checklist religiously

---

## 🎯 Quick Start for Phase 2 Day 1

**Before creating ANY file, run these commands to verify Phase 1 completed successfully:**

```bash
# 1. Verify partner_reports table exists (should have 22 columns)
powershell -Command ".\quick-db.bat \"SELECT COUNT(*) as column_count FROM information_schema.columns WHERE table_name = 'partner_reports';\""

# 2. Verify all required fields exist
powershell -Command ".\quick-db.bat \"SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'partner_reports' AND column_name IN ('status', 'delivered_at', 'viewed_at', 'report_data', 'report_type', 'partner_id', 'campaign_id') ORDER BY column_name;\""

# 3. Verify CHECK constraints for status
powershell -Command ".\quick-db.bat \"SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'partner_reports'::regclass AND conname LIKE '%status%';\""

# 4. Verify foreign keys exist
powershell -Command ".\quick-db.bat \"SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'partner_reports'::regclass AND contype = 'f';\""

# 5. Verify email fields in related tables
powershell -Command ".\quick-db.bat \"SELECT column_name FROM information_schema.columns WHERE table_name = 'strategic_partners' AND column_name = 'primary_email';\""

powershell -Command ".\quick-db.bat \"SELECT column_name FROM information_schema.columns WHERE table_name = 'contractors' AND column_name = 'email';\""

# 6. Check if any reports already generated (Phase 1 testing)
powershell -Command ".\quick-db.bat \"SELECT id, report_type, status, quarter, year FROM partner_reports ORDER BY id DESC LIMIT 5;\""
```

**After verifying, proceed with Phase 2 implementation knowing the database foundation is solid!**
