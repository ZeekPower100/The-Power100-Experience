# Phase 3: Pre-Flight Checklist for Public PCR Pages & Advanced Features

**Document Version:** 1.0
**Date:** October 31, 2025
**Status:** MANDATORY - Use before creating or modifying ANY file
**Phase:** Public PCR Pages & Advanced Features (Week 3)

---

## 🎯 Purpose

This checklist ensures 100% database alignment for every file we create or modify during Phase 3 implementation (Public PCR Pages & Advanced Features). Following this prevents naming mismatches and ensures proper integration with Phase 1 & 2 foundation.

**Phase 3 builds on Phase 1 & 2:** Assumes partner_reports table exists from Phase 1 and Phase 2 features are working.

---

## ✅ MANDATORY CHECKLIST - Before Creating/Modifying ANY File

### Step 1: Identify Database Tables Involved

**Question:** What database tables will this file interact with?

**Phase 3 Primary Tables:**
- **partner_reports** (EXISTING - will extend with Phase 3 fields)
- **strategic_partners** (EXISTING - for public PCR data)

**Phase 3 Related Tables** (may query but not modify):
- **contractors** (for contractor-facing features)
- **power_card_campaigns** (for quarterly data)
- **admin_users** (for tracking)

**Example:**
- PDF generation service: `partner_reports`
- Public PCR page: `strategic_partners`, `partner_reports`
- Share link service: `partner_reports`
- Analytics service: `partner_reports`

**Action:** List all tables this file will query, insert, update, or reference.

---

### Step 2: Verify Column Names (Field Names)

**For EACH table identified in Step 1:**

```bash
# Run this command for EACH table:
powershell -Command ".\quick-db.bat \"SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'TABLE_NAME' ORDER BY ordinal_position;\""
```

**Action:** Document exact column names from database output.

**Phase 3 Key Tables - MUST VERIFY:**

#### partner_reports table (EXISTING - WILL EXTEND!)
```bash
powershell -Command ".\quick-db.bat \"SELECT column_name, data_type, column_default, is_nullable FROM information_schema.columns WHERE table_name = 'partner_reports' ORDER BY ordinal_position;\""
```

**Existing Fields from Phase 1 & 2 (22 columns - DO NOT MODIFY!):**
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

**NEW Phase 3 Fields (WILL ADD - verify exact names!):**
```
Expected column_name              | data_type          | column_default         | is_nullable
---------------------------------|--------------------|-----------------------|-------------
pdf_generated_at                 | timestamp          |                       | YES
pdf_url                          | character varying  |                       | YES
pdf_file_size                    | integer            |                       | YES
share_token                      | character varying  |                       | YES
share_enabled                    | boolean            | false                 | YES
share_expires_at                 | timestamp          |                       | YES
view_count                       | integer            | 0                     | YES
pdf_download_count               | integer            | 0                     | YES
last_viewed_at                   | timestamp          |                       | YES
custom_branding                  | jsonb              | '{}'::jsonb           | YES
language                         | character varying  | 'en'                  | YES
scheduled_send_at                | timestamp          |                       | YES
recurring_frequency              | character varying  |                       | YES
next_scheduled_send              | timestamp          |                       | YES
```

**Critical Fields for Phase 3:**
- `pdf_generated_at` (TIMESTAMP) - When PDF was created
- `pdf_url` (VARCHAR 500) - S3 URL to PDF file
- `pdf_file_size` (INTEGER) - Size in bytes
- `share_token` (VARCHAR 100) - Unique token for sharing (UNIQUE constraint)
- `share_enabled` (BOOLEAN) - Whether share link is active
- `share_expires_at` (TIMESTAMP) - When share link expires (nullable = never)
- `view_count` (INTEGER) - Number of views
- `pdf_download_count` (INTEGER) - Number of PDF downloads
- `last_viewed_at` (TIMESTAMP) - Most recent view timestamp
- `custom_branding` (JSONB) - Partner-specific branding overrides
- `language` (VARCHAR 10) - Report language code (en, es, fr, etc.)
- `scheduled_send_at` (TIMESTAMP) - When to auto-send
- `recurring_frequency` (VARCHAR 20) - Recurring schedule (daily, weekly, monthly, quarterly)

**After Migration, partner_reports will have 22 + 14 = 36 columns total**

**What to Check:**
- ✅ Exact spelling (snake_case vs camelCase)
- ✅ Underscores vs no underscores
- ✅ Singular vs plural
- ✅ **Phase 3 Critical:** `pdf_generated_at` NOT `pdfGeneratedAt`, `share_token` NOT `shareToken`

---

#### strategic_partners table (EXISTING - for public PCR pages)
```bash
powershell -Command ".\quick-db.bat \"SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'strategic_partners' AND column_name IN ('id', 'company_name', 'description', 'value_proposition', 'logo_url', 'website', 'final_pcr_score', 'earned_badges', 'performance_trend', 'engagement_tier', 'key_differentiators', 'client_testimonials', 'landing_page_videos', 'video_metadata', 'is_active') ORDER BY column_name;\""
```

**Expected Public PCR Fields:**
```
column_name              | data_type
-------------------------|------------------
client_testimonials      | jsonb
company_name             | character varying
description              | text
earned_badges            | jsonb
engagement_tier          | character varying
final_pcr_score          | numeric
id                       | integer
is_active                | boolean
key_differentiators      | text
landing_page_videos      | text
logo_url                 | character varying
performance_trend        | character varying
value_proposition        | text
video_metadata           | text
website                  | character varying
```

**Phase 3 Usage:**
- All fields are for public display on PCR landing pages
- `final_pcr_score`, `earned_badges`, `performance_trend` for showcase
- `client_testimonials`, `landing_page_videos` for social proof
- `is_active` - Only show public pages for active partners

---

### Step 3: Verify CHECK Constraints

**For tables with enum-like fields:**

```bash
# Run this command for each table with enum fields:
powershell -Command ".\quick-db.bat \"SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'TABLE_NAME'::regclass AND contype = 'c';\""
```

**Action:** Document exact allowed values from CHECK constraints.

**Phase 3 Critical Constraints - To Be Verified:**

#### partner_reports (verify Phase 1 & 2 constraints still exist + Phase 3 additions)
```bash
powershell -Command ".\quick-db.bat \"SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'partner_reports'::regclass AND contype = 'c';\""
```

**Expected Existing Constraints (from Phase 1 & 2):**
```
constraint_name                           | constraint_definition
------------------------------------------|----------------------
partner_reports_report_type_check         | CHECK (report_type IN ('executive_summary', 'contractor_comparison', 'public_pcr'))
partner_reports_quarter_check             | CHECK (quarter IN ('Q1', 'Q2', 'Q3', 'Q4'))
partner_reports_status_check              | CHECK (status IN ('draft', 'generated', 'delivered', 'viewed'))
```

**NO NEW CHECK CONSTRAINTS IN PHASE 3** - All new fields are flexible (timestamps, integers, booleans, JSONB)

**Phase 3 Notes:**
- `share_token` has UNIQUE constraint (not CHECK)
- `share_enabled` is BOOLEAN (true/false)
- `language` has no CHECK constraint (flexible for future languages)
- `recurring_frequency` has no CHECK constraint initially (will validate in code)

**What to Check:**
- ✅ All Phase 1 & 2 constraints still exist after migration
- ✅ No conflicting new constraints

---

### Step 4: Verify Foreign Key Constraints

**For tables with relationships:**

```bash
# Run this command to see foreign keys:
powershell -Command ".\quick-db.bat \"SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'TABLE_NAME'::regclass AND contype = 'f';\""
```

**Action:** Document which fields reference other tables.

**Phase 3 Key Foreign Keys - To Be Verified:**

#### partner_reports (verify Phase 1 foreign keys still exist)
```bash
powershell -Command ".\quick-db.bat \"SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'partner_reports'::regclass AND contype = 'f';\""
```

**Expected Foreign Keys (from Phase 1 - NO CHANGES):**
```
constraint_name                           | constraint_definition
------------------------------------------|----------------------
partner_reports_partner_id_fkey           | FOREIGN KEY (partner_id) REFERENCES strategic_partners(id) ON DELETE CASCADE
partner_reports_campaign_id_fkey          | FOREIGN KEY (campaign_id) REFERENCES power_card_campaigns(id) ON DELETE SET NULL
partner_reports_generated_by_fkey         | FOREIGN KEY (generated_by) REFERENCES admin_users(id) ON DELETE SET NULL
```

**Phase 3 Note:** NO new foreign keys. All Phase 3 fields are self-contained within partner_reports.

**What to Check:**
- ✅ All Phase 1 foreign keys intact after Phase 3 migration
- ✅ No new foreign keys needed for Phase 3 features

---

### Step 5: Verify UNIQUE Constraints

**Phase 3 introduces UNIQUE constraint on share_token:**

```bash
powershell -Command ".\quick-db.bat \"SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'partner_reports'::regclass AND contype = 'u';\""
```

**Expected UNIQUE Constraints:**
```
constraint_name                           | constraint_definition
------------------------------------------|----------------------
partner_reports_share_token_key           | UNIQUE (share_token)
```

**Phase 3 Critical:**
- `share_token` must be unique across all reports
- Prevents duplicate share links
- Used for public access without authentication

**What to Check:**
- ✅ UNIQUE constraint created on share_token
- ✅ No duplicate share_token values exist

---

### Step 6: Check Data Types (Especially JSONB/TIMESTAMP/INTEGER)

**From Step 2 output, identify:**
- TEXT vs VARCHAR
- INTEGER vs NUMERIC
- TIMESTAMP (not TIMESTAMPTZ)
- **JSONB** for custom_branding
- BOOLEAN for share_enabled
- VARCHAR length limits (pdf_url 500, share_token 100, language 10)

**Phase 3 Critical Data Types:**

| Field                          | Type           | Notes                                         |
|--------------------------------|----------------|-----------------------------------------------|
| `pdf_generated_at`             | TIMESTAMP      | When PDF created (nullable until generated)   |
| `pdf_url`                      | VARCHAR(500)   | S3 full URL (e.g., https://s3...)             |
| `pdf_file_size`                | INTEGER        | Size in bytes                                 |
| `share_token`                  | VARCHAR(100)   | Unique 64-char hex token                      |
| `share_enabled`                | BOOLEAN        | True if share link active                     |
| `share_expires_at`             | TIMESTAMP      | Expiration time (NULL = never expires)        |
| `view_count`                   | INTEGER        | Increments on each view (default 0)           |
| `pdf_download_count`           | INTEGER        | Increments on each download (default 0)       |
| `last_viewed_at`               | TIMESTAMP      | Most recent view timestamp                    |
| `custom_branding`              | JSONB          | Object with colors, logos, etc.               |
| `language`                     | VARCHAR(10)    | Language code (e.g., 'en', 'es', 'fr')        |
| `scheduled_send_at`            | TIMESTAMP      | Future send time (nullable)                   |
| `recurring_frequency`          | VARCHAR(20)    | 'daily', 'weekly', 'monthly', 'quarterly'     |
| `next_scheduled_send`          | TIMESTAMP      | Next recurrence timestamp                     |

**Action:** Ensure code uses correct data types.

**Common Issues:**
- ❌ Using Date objects without proper TIMESTAMP formatting
- ❌ Storing share_token as TEXT instead of VARCHAR(100)
- ❌ Not handling NULL for pdf_url before PDF generation
- ❌ Using JSON.parse() on custom_branding (it's JSONB, already parsed)
- ❌ Not incrementing view_count atomically

---

### Step 7: Document Findings BEFORE Coding

**Create a verification block at the top of the file:**

```javascript
// DATABASE-CHECKED: [table_names] columns verified [date]
// ================================================================
// VERIFIED CONSTRAINTS:
// - table_name.field_name: UNIQUE
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

**Phase 3 Example (PDF Generation Service):**
```javascript
// DATABASE-CHECKED: partner_reports, strategic_partners verified October 31, 2025
// ================================================================
// VERIFIED CONSTRAINTS:
// - partner_reports.share_token: UNIQUE (no duplicates allowed)
// ================================================================
// VERIFIED FIELD NAMES:
// - pdf_generated_at (NOT pdfGeneratedAt)
// - pdf_url (NOT pdfUrl)
// - pdf_file_size (NOT pdfFileSize)
// - share_token (NOT shareToken)
// - share_enabled (NOT shareEnabled)
// - share_expires_at (NOT shareExpiresAt)
// - view_count (NOT viewCount)
// - pdf_download_count (NOT pdfDownloadCount)
// - last_viewed_at (NOT lastViewedAt)
// - custom_branding (NOT customBranding)
// - scheduled_send_at (NOT scheduledSendAt)
// - recurring_frequency (NOT recurringFrequency)
// ================================================================
// VERIFIED DATA TYPES:
// - pdf_generated_at: TIMESTAMP (nullable until PDF generated)
// - pdf_url: VARCHAR(500) (S3 URL)
// - pdf_file_size: INTEGER (bytes)
// - share_token: VARCHAR(100) (unique hex string)
// - share_enabled: BOOLEAN (true/false)
// - share_expires_at: TIMESTAMP (nullable = never expires)
// - view_count: INTEGER (default 0, increments atomically)
// - pdf_download_count: INTEGER (default 0, increments atomically)
// - last_viewed_at: TIMESTAMP (nullable until first view)
// - custom_branding: JSONB (already parsed object from database)
// - language: VARCHAR(10) (language code like 'en')
// ================================================================
// PDF GENERATION OPERATIONS:
// - generateReportPDF: Create PDF with Puppeteer, upload to S3, store pdf_url
// - getPDFDownloadUrl: Get signed S3 URL, increment pdf_download_count
// - createShareLink: Generate unique share_token, set share_enabled = true
// ================================================================
```

---

### Step 8: Verify BOTH Development AND Production

**IMPORTANT:** Check that both environments have Phase 1 & 2 applied before Phase 3!

```bash
# Development: Verify partner_reports has Phase 1 & 2 fields (22 columns)
powershell -Command ".\quick-db.bat \"SELECT COUNT(*) as column_count FROM information_schema.columns WHERE table_name = 'partner_reports';\""

# Production: Same check
# Use mcp__aws-production__exec tool with same query
PGPASSWORD='dBP0wer100!!' psql -h tpe-database-production.cmtcsi0kytrf.us-east-1.rds.amazonaws.com -U tpeadmin -d tpedb -c "SELECT COUNT(*) as column_count FROM information_schema.columns WHERE table_name = 'partner_reports';"
```

**Phase 3 Specific Checks:**
1. Verify partner_reports has 22 columns before Phase 3 migration
2. After Phase 3 migration, verify it has 22 + 14 = 36 columns
3. Verify share_token UNIQUE constraint exists
4. Verify all Phase 3 default values are set (share_enabled = false, view_count = 0, etc.)
5. Verify custom_branding defaults to empty JSONB object '{}'
6. Verify language defaults to 'en'

**Action:** Confirm both environments match before implementing Phase 3.

---

## 🚨 Red Flags - STOP and Verify

If you see ANY of these in Phase 3, STOP and run verification queries:

1. **Setting pdf_url before PDF generated** → Should be NULL initially
   ```javascript
   pdf_url: 'pending'  // ⚠️ STOP! Should be NULL until PDF created
   ```

2. **Not using unique share_token** → Must be unique across all reports
   ```javascript
   share_token: reportId.toString()  // ⚠️ STOP! Must be unique random string
   ```

3. **Storing share_enabled as string** → Must be BOOLEAN
   ```javascript
   share_enabled: 'true'  // ⚠️ STOP! Must be boolean true/false
   ```

4. **Not handling NULL share_expires_at** → NULL = never expires
   ```javascript
   // ❌ WRONG:
   if (share_expires_at < now)  // Fails if share_expires_at is NULL

   // ✅ CORRECT:
   if (share_expires_at && share_expires_at < now)
   ```

5. **Parsing custom_branding JSONB** → Already parsed
   ```javascript
   // ❌ WRONG:
   const branding = JSON.parse(row.custom_branding);

   // ✅ CORRECT:
   const branding = row.custom_branding;  // Already an object
   ```

6. **Not incrementing view_count atomically** → Race condition
   ```javascript
   // ❌ WRONG:
   const current = await query('SELECT view_count FROM partner_reports WHERE id = $1', [id]);
   await query('UPDATE partner_reports SET view_count = $1 WHERE id = $2', [current + 1, id]);

   // ✅ CORRECT:
   await query('UPDATE partner_reports SET view_count = view_count + 1 WHERE id = $1', [id]);
   ```

7. **Storing pdf_file_size as string** → Must be INTEGER
   ```javascript
   pdf_file_size: '1024KB'  // ⚠️ STOP! Must be integer bytes: 1048576
   ```

8. **Not validating S3 URL format** → Must be full URL
   ```javascript
   pdf_url: 'reports/file.pdf'  // ⚠️ STOP! Must be full S3 URL: https://s3.amazonaws.com/bucket/reports/file.pdf
   ```

---

## 📋 Quick Reference Commands

### Verify Phase 1 & 2 Complete
```bash
# Should return 22 (before Phase 3 migration)
powershell -Command ".\quick-db.bat \"SELECT COUNT(*) as column_count FROM information_schema.columns WHERE table_name = 'partner_reports';\""
```

### Check All partner_reports Columns After Phase 3
```bash
# Should return 36 (after Phase 3 migration)
powershell -Command ".\quick-db.bat \"SELECT column_name, data_type, column_default FROM information_schema.columns WHERE table_name = 'partner_reports' ORDER BY ordinal_position;\""
```

### Verify Phase 3 Fields Exist
```bash
powershell -Command ".\quick-db.bat \"SELECT column_name, data_type, column_default FROM information_schema.columns WHERE table_name = 'partner_reports' AND column_name IN ('pdf_generated_at', 'pdf_url', 'pdf_file_size', 'share_token', 'share_enabled', 'share_expires_at', 'view_count', 'pdf_download_count', 'last_viewed_at', 'custom_branding', 'language', 'scheduled_send_at', 'recurring_frequency', 'next_scheduled_send') ORDER BY column_name;\""
```

### Check UNIQUE Constraint on share_token
```bash
powershell -Command ".\quick-db.bat \"SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'partner_reports'::regclass AND contype = 'u';\""
```

### Verify Default Values
```bash
powershell -Command ".\quick-db.bat \"SELECT share_enabled, view_count, pdf_download_count, custom_branding, language FROM partner_reports LIMIT 5;\""
```

### Check Reports with PDFs
```bash
powershell -Command ".\quick-db.bat \"SELECT id, report_type, pdf_url, pdf_file_size, pdf_generated_at FROM partner_reports WHERE pdf_url IS NOT NULL ORDER BY pdf_generated_at DESC LIMIT 10;\""
```

### Check Active Share Links
```bash
powershell -Command ".\quick-db.bat \"SELECT id, share_token, share_enabled, share_expires_at FROM partner_reports WHERE share_enabled = true ORDER BY created_at DESC LIMIT 10;\""
```

### Check View and Download Analytics
```bash
powershell -Command ".\quick-db.bat \"SELECT id, report_type, view_count, pdf_download_count, last_viewed_at FROM partner_reports ORDER BY view_count DESC LIMIT 10;\""
```

### Verify Strategic Partners Public Fields
```bash
powershell -Command ".\quick-db.bat \"SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'strategic_partners' AND column_name IN ('final_pcr_score', 'earned_badges', 'performance_trend', 'client_testimonials', 'landing_page_videos') ORDER BY column_name;\""
```

---

## 📚 Phase 3 Specific Verification Notes

### PDF Generation Service Checklist
- [ ] Verify `pdf_generated_at` is TIMESTAMP (nullable)
- [ ] Verify `pdf_url` is VARCHAR(500) (nullable until generated)
- [ ] Verify `pdf_file_size` is INTEGER (nullable until generated)
- [ ] Verify AWS S3 bucket configured in environment
- [ ] Verify Puppeteer can generate PDFs
- [ ] Verify S3 upload permissions work

### Share Link Service Checklist
- [ ] Verify `share_token` has UNIQUE constraint
- [ ] Verify `share_token` generation uses crypto.randomBytes()
- [ ] Verify `share_enabled` is BOOLEAN (default false)
- [ ] Verify `share_expires_at` NULL handling (NULL = never expires)
- [ ] Verify share token is 64-char hex string (32 bytes)
- [ ] Verify share links work without authentication

### Public PCR Page Checklist
- [ ] Verify `final_pcr_score` from strategic_partners
- [ ] Verify `earned_badges` is JSONB array
- [ ] Verify `client_testimonials` is JSONB array
- [ ] Verify `landing_page_videos` exists
- [ ] Verify `is_active` filter for public pages
- [ ] Verify view_count increments on page load

### Analytics Tracking Checklist
- [ ] Verify `view_count` increments atomically
- [ ] Verify `pdf_download_count` increments on download
- [ ] Verify `last_viewed_at` updates on each view
- [ ] Verify analytics queries use proper indexes
- [ ] Verify counters never decrement

### Custom Branding Checklist
- [ ] Verify `custom_branding` is JSONB (default '{}')
- [ ] Verify custom_branding structure is flexible
- [ ] Verify branding overrides apply to PDFs
- [ ] Verify branding doesn't break if empty

---

## 🚨 Phase 3 Critical Gotchas

### 1. Share Token Must Be Unique
```javascript
// ❌ WRONG (predictable):
share_token: `${partnerId}-${reportId}`

// ✅ CORRECT (cryptographically random):
const crypto = require('crypto');
share_token: crypto.randomBytes(32).toString('hex')
```

### 2. NULL Share Expiration = Never Expires
```javascript
// ❌ WRONG (doesn't handle NULL):
if (share_expires_at < now) { return 'expired'; }

// ✅ CORRECT (NULL check first):
if (share_expires_at && share_expires_at < now) { return 'expired'; }
```

### 3. JSONB Already Parsed
```javascript
// ❌ WRONG (double parse):
const branding = JSON.parse(row.custom_branding);

// ✅ CORRECT (use directly):
const branding = row.custom_branding;
```

### 4. Atomic Counter Increments
```javascript
// ❌ WRONG (race condition):
const count = await query('SELECT view_count FROM ...');
await query('UPDATE ... SET view_count = $1', [count + 1]);

// ✅ CORRECT (atomic):
await query('UPDATE partner_reports SET view_count = view_count + 1 WHERE id = $1', [id]);
```

### 5. S3 URLs Must Be Full URLs
```javascript
// ❌ WRONG (partial path):
pdf_url: 'reports/report-123.pdf'

// ✅ CORRECT (full S3 URL):
pdf_url: 'https://s3.amazonaws.com/tpe-reports/reports/report-123.pdf'
```

### 6. PDF File Size in Bytes
```javascript
// ❌ WRONG (string with units):
pdf_file_size: '1.5MB'

// ✅ CORRECT (integer bytes):
pdf_file_size: 1572864  // 1.5MB in bytes
```

### 7. Language Code Format
```javascript
// ❌ WRONG (full name or uppercase):
language: 'English'
language: 'EN'

// ✅ CORRECT (lowercase 2-letter code):
language: 'en'
```

---

## 📚 Related Documents

- **Database Source of Truth:** `DATABASE-SOURCE-OF-TRUTH.md` (project root)
- **Phase 3 Implementation Plan:** `PHASE-3-IMPLEMENTATION-PLAN.md` (this directory)
- **Phase 1 Pre-Flight:** `../phase-1/PHASE-1-PRE-FLIGHT-CHECKLIST.md`
- **Phase 2 Pre-Flight:** `../phase-2/PHASE-2-PRE-FLIGHT-CHECKLIST.md`
- **Reports Overview:** `../PCR-REPORTS-OVERVIEW.md`

---

**Last Updated:** October 31, 2025
**Next Review:** Before each file creation in Phase 3 Days 1-5
**Status:** MANDATORY - Use this checklist religiously

---

## 🎯 Quick Start for Phase 3 Day 1

**Before creating ANY file, run these commands to verify Phase 1 & 2 completed successfully:**

```bash
# 1. Verify partner_reports table exists with Phase 1 & 2 fields (should have 22 columns)
powershell -Command ".\quick-db.bat \"SELECT COUNT(*) as column_count FROM information_schema.columns WHERE table_name = 'partner_reports';\""

# 2. Verify Phase 1 & 2 critical fields exist
powershell -Command ".\quick-db.bat \"SELECT column_name FROM information_schema.columns WHERE table_name = 'partner_reports' AND column_name IN ('report_data', 'status', 'delivered_at', 'viewed_at', 'pdf_url') ORDER BY column_name;\""

# 3. Verify strategic_partners has public PCR fields
powershell -Command ".\quick-db.bat \"SELECT column_name FROM information_schema.columns WHERE table_name = 'strategic_partners' AND column_name IN ('final_pcr_score', 'earned_badges', 'client_testimonials', 'landing_page_videos') ORDER BY column_name;\""

# 4. Check if Phase 3 already applied (should return 0 before migration)
powershell -Command ".\quick-db.bat \"SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'partner_reports' AND column_name = 'share_token';\""

# 5. Verify AWS S3 credentials configured
echo $env:AWS_ACCESS_KEY_ID
echo $env:AWS_SECRET_ACCESS_KEY
echo $env:REPORTS_S3_BUCKET
```

**After running Phase 3 migration, verify new fields:**

```bash
# 1. Verify column count increased to 36
powershell -Command ".\quick-db.bat \"SELECT COUNT(*) as column_count FROM information_schema.columns WHERE table_name = 'partner_reports';\""

# 2. Verify all 14 new Phase 3 fields exist
powershell -Command ".\quick-db.bat \"SELECT column_name, data_type, column_default FROM information_schema.columns WHERE table_name = 'partner_reports' AND column_name IN ('pdf_generated_at', 'pdf_url', 'pdf_file_size', 'share_token', 'share_enabled', 'share_expires_at', 'view_count', 'pdf_download_count', 'last_viewed_at', 'custom_branding', 'language', 'scheduled_send_at', 'recurring_frequency', 'next_scheduled_send') ORDER BY column_name;\""

# 3. Verify UNIQUE constraint on share_token
powershell -Command ".\quick-db.bat \"SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'partner_reports'::regclass AND contype = 'u';\""

# 4. Verify default values
powershell -Command ".\quick-db.bat \"SELECT column_name, column_default FROM information_schema.columns WHERE table_name = 'partner_reports' AND column_name IN ('share_enabled', 'view_count', 'pdf_download_count', 'custom_branding', 'language') ORDER BY column_name;\""

# 5. Verify indexes created
powershell -Command ".\quick-db.bat \"SELECT indexname FROM pg_indexes WHERE tablename = 'partner_reports' AND indexname LIKE '%pdf%' OR indexname LIKE '%share%' OR indexname LIKE '%view%' ORDER BY indexname;\""
```

**Document results, then code safely!**
