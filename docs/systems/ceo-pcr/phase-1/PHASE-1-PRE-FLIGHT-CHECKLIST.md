# Phase 1 Pre-Flight Checklist - CEO PCR System

**Document Version:** 1.0
**Date:** November 14, 2025
**Purpose:** Verify database schema and prerequisites before Phase 1 implementation

---

## ✅ Database Schema Verification

### Step 1: Verify Existing Tables

Run these commands to verify current state:

```sql
-- Check contractors table exists and has correct columns
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'contractors'
ORDER BY column_name;
-- Expected: 72 columns (verified November 14, 2025)

-- Check power_card_campaigns table exists
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'power_card_campaigns'
ORDER BY column_name;
-- Expected: 14 columns (campaign_id, contractor_id, status, etc.)

-- Check power_card_responses table exists and has employee feedback fields
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'power_card_responses'
WHERE column_name IN ('leadership_score', 'culture_score', 'growth_opportunity_score', 'satisfaction_score', 'recommendation_score');
-- Expected: All 5 fields exist with INTEGER data type
```

**Verification Results:**
- [ ] contractors table exists with 72 columns
- [ ] power_card_campaigns table exists
- [ ] power_card_responses has all 5 required score fields
- [ ] No CEO PCR fields exist in contractors yet (good - we're adding them)

---

### Step 2: Verify No Conflicting Tables

```sql
-- Ensure company_employees table does NOT exist yet
SELECT table_name
FROM information_schema.tables
WHERE table_name = 'company_employees';
-- Expected: 0 rows (table doesn't exist yet)

-- Ensure ceo_pcr_scores table does NOT exist yet
SELECT table_name
FROM information_schema.tables
WHERE table_name = 'ceo_pcr_scores';
-- Expected: 0 rows (table doesn't exist yet)
```

**Verification Results:**
- [ ] company_employees table does NOT exist (confirmed)
- [ ] ceo_pcr_scores table does NOT exist (confirmed)

---

### Step 3: Test Foreign Key Constraints

```sql
-- Verify contractors.id exists and has primary key
SELECT constraint_name, constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'contractors' AND constraint_type = 'PRIMARY KEY';
-- Expected: 1 row (contractors_pkey or similar)

-- Verify power_card_campaigns.id exists
SELECT constraint_name, constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'power_card_campaigns' AND constraint_type = 'PRIMARY KEY';
-- Expected: 1 row
```

**Verification Results:**
- [ ] contractors has valid primary key
- [ ] power_card_campaigns has valid primary key
- [ ] Ready for foreign key relationships

---

## 🗂️ Migration File Preparation

### Step 4: Create Migration Files

Create these 3 migration files in `tpe-database/migrations/`:

**File 1:** `20251114_create_company_employees.sql`
- [ ] File created
- [ ] SQL syntax verified
- [ ] DATABASE-CHECKED comments included
- [ ] All field names match TPE conventions (snake_case)

**File 2:** `20251114_create_ceo_pcr_scores.sql`
- [ ] File created
- [ ] SQL syntax verified
- [ ] Constraints properly defined (UNIQUE, CHECK)
- [ ] Indexes created for performance

**File 3:** `20251114_add_ceo_pcr_to_contractors.sql`
- [ ] File created
- [ ] Uses `ADD COLUMN IF NOT EXISTS` for safety
- [ ] CHECK constraints prevent invalid scores
- [ ] Comments added to all columns

---

## 🧪 Test Data Preparation

### Step 5: Prepare Test Data

Create test contractor and employees for verification:

```sql
-- Create test contractor (if doesn't exist)
INSERT INTO contractors (first_name, last_name, email, company_name)
VALUES ('Test', 'CEO', 'test.ceo@example.com', 'Test Company Inc.')
ON CONFLICT (email) DO NOTHING
RETURNING id;
-- Note the returned ID for next steps
```

**Test Data Ready:**
- [ ] Test contractor created
- [ ] Contractor ID noted: `_______`

---

## 📦 Backend File Structure

### Step 6: Verify Backend Directories Exist

```bash
# Check these directories exist:
ls tpe-backend/src/services/
ls tpe-backend/src/controllers/
ls tpe-backend/src/routes/
```

**Directory Verification:**
- [ ] `tpe-backend/src/services/` exists
- [ ] `tpe-backend/src/controllers/` exists
- [ ] `tpe-backend/src/routes/` exists

---

## 🔧 Dependencies Check

### Step 7: Verify Required NPM Packages

```bash
# Backend dependencies
cd tpe-backend
npm list pg  # PostgreSQL driver
npm list csv-parser  # CSV parsing for bulk import
```

**Dependencies Verified:**
- [ ] `pg` package installed (database driver)
- [ ] `csv-parser` package installed (for employee CSV uploads)
- [ ] If missing, run: `npm install csv-parser`

---

## 🔐 Permissions Verification

### Step 8: Database User Permissions

```sql
-- Verify current user can CREATE TABLE
SELECT has_table_privilege(current_user, 'contractors', 'INSERT');
-- Expected: true

-- Verify current user can ALTER TABLE
SELECT has_table_privilege(current_user, 'contractors', 'UPDATE');
-- Expected: true
```

**Permissions Verified:**
- [ ] Can create new tables
- [ ] Can alter existing tables
- [ ] Can create indexes
- [ ] Can add foreign keys

---

## 📋 Implementation Readiness Checklist

### Final Pre-Flight Checks

**Database:**
- [ ] All prerequisite tables exist and verified
- [ ] No conflicting table names
- [ ] Foreign key relationships validated
- [ ] Test data prepared

**Backend:**
- [ ] Directory structure exists
- [ ] Required dependencies installed
- [ ] Database connection working
- [ ] Test environment ready

**Documentation:**
- [ ] Phase 1 Implementation Plan reviewed
- [ ] Migration files prepared
- [ ] Field naming conventions verified (all snake_case)
- [ ] DATABASE-CHECKED comments in all SQL

**Safety:**
- [ ] Migrations use `IF NOT EXISTS` where appropriate
- [ ] CHECK constraints prevent invalid data
- [ ] Unique constraints prevent duplicates
- [ ] ON DELETE CASCADE/SET NULL properly configured

---

## ⚠️ Known Considerations

### Database Field Naming
✅ **All field names follow TPE conventions:**
- Use `snake_case` (not camelCase)
- Boolean fields: `is_active`, `sms_opt_in`
- Timestamp fields: `created_at`, `updated_at`
- Reference fields: `contractor_id`, `campaign_id`

### PowerCard Integration
✅ **Existing power_card_responses fields are PERFECT for CEO PCR:**
- `leadership_score` → Leadership Effectiveness
- `culture_score` → Company Culture
- `growth_opportunity_score` → Growth & Development
- `satisfaction_score` → Overall Satisfaction
- `recommendation_score` → NPS (Recommend company)

**No changes to PowerCard system needed!** We reuse existing infrastructure.

---

## 🚀 Ready to Proceed?

### Green Light Criteria

All checkboxes above must be ✅ before proceeding with implementation.

**If ANY item is ❌:**
1. Document the issue
2. Resolve before continuing
3. Re-verify this checklist
4. Only proceed when all items ✅

---

## 📝 Sign-Off

**Database Verification Completed By:** _______________
**Date:** _______________
**All Checks Passed:** [ ] YES / [ ] NO

**Notes:**
_______________________________________________________________________________
_______________________________________________________________________________
_______________________________________________________________________________

---

**Next Step:** [Begin Phase 1 Implementation](./PHASE-1-IMPLEMENTATION-PLAN.md)
