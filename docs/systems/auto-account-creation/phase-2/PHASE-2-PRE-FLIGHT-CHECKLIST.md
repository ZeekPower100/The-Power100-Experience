# Phase 2: Pre-Flight Checklist - Centralized Account Creation Service

**Document Version:** 1.0
**Date:** October 27, 2025
**Status:** MANDATORY - Use before creating or modifying ANY file

---

## 🎯 Purpose

This checklist ensures 100% database alignment and consistency when building the centralized account creation service. Phase 2 creates a unified service layer that handles automatic account creation for both partners and contractors, with audit logging and duplicate prevention.

**Critical Principle:** Use VERIFIED field names from database. Never guess or assume field names. This service must work with both partner_users and contractor_users tables using exact field names.

---

## ✅ DATABASE VERIFICATION COMPLETED - October 27, 2025

### All Field Names Verified Against Database:

**✅ partner_users table (13 columns):**
```
VERIFIED FIELD NAMES:
- id (integer)
- partner_id (integer, foreign key)
- email (character varying, UNIQUE)
- password (character varying) ⚠️ NOT password_hash!
- first_name (character varying)
- last_name (character varying)
- role (character varying, default 'partner')
- is_active (boolean, default true) ⚠️ BOOLEAN not string!
- last_login (timestamp)
- reset_token (character varying)
- reset_token_expires (timestamp)
- created_at (timestamp)
- updated_at (timestamp)
```

**✅ contractor_users table (13 columns):**
```
VERIFIED FIELD NAMES:
- id (integer)
- contractor_id (integer, foreign key)
- email (character varying, UNIQUE)
- password (character varying) ⚠️ NOT password_hash!
- first_name (character varying)
- last_name (character varying)
- role (character varying, default 'contractor')
- is_active (boolean, default true) ⚠️ BOOLEAN not string!
- last_login (timestamp)
- reset_token (character varying)
- reset_token_expires (timestamp)
- created_at (timestamp)
- updated_at (timestamp)
```

**✅ contractors table (69 columns total, key fields verified):**
```
VERIFIED FIELD NAMES:
- id (integer)
- first_name (character varying)
- last_name (character varying)
- email (character varying, UNIQUE)
- phone (character varying)
- company_name (character varying)
```

**✅ strategic_partners table (124 columns total, key fields verified):**
```
VERIFIED FIELD NAMES:
- id (integer)
- primary_contact (character varying) ⚠️ NOT primary_contact_name!
- primary_email (character varying) ⚠️ NOT contact_email!
- company_name (character varying)
```

**⚠️ account_creation_audit table:**
```
STATUS: DOES NOT EXIST YET
PURPOSE: To be created in Phase 2 Task 1
```

---

## ✅ MANDATORY CHECKLIST - Before Creating/Modifying ANY File

### Step 1: Identify Database Tables Involved

**Question:** What database tables will this file interact with?

**Phase 2 Tables:**
- **partner_users** - Existing table for partner user accounts (Phase 1 pattern)
- **contractor_users** - Existing table from Phase 1
- **contractors** - For contractor name and email lookup
- **strategic_partners** - For partner name and email lookup
- **account_creation_audit** - New table to create in Phase 2 (DOES NOT EXIST YET)

**Phase 2 File Dependencies:**
- **Account Creation Service**: All 5 tables above
- **Account Creation Routes**: Indirect (via service layer)
- **Migration Script**: `account_creation_audit` table only

**Action:** List all tables this file will query, insert, update, or reference.

---

### Step 2: Verify Column Names (Field Names)

**For EACH table identified in Step 1:**

```bash
# Check partner_users table (Phase 1 verified):
powershell -Command ".\quick-db.bat \"SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'partner_users' AND column_name IN ('id', 'partner_id', 'email', 'password', 'first_name', 'last_name', 'is_active') ORDER BY ordinal_position;\""

# Check contractor_users table (Phase 1 verified):
powershell -Command ".\quick-db.bat \"SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'contractor_users' AND column_name IN ('id', 'contractor_id', 'email', 'password', 'first_name', 'last_name', 'is_active') ORDER BY ordinal_position;\""

# Check contractors table:
powershell -Command ".\quick-db.bat \"SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'contractors' AND column_name IN ('id', 'first_name', 'last_name', 'email') ORDER BY ordinal_position;\""

# Check strategic_partners table:
powershell -Command ".\quick-db.bat \"SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'strategic_partners' AND column_name IN ('id', 'primary_contact', 'primary_email', 'company_name') ORDER BY ordinal_position;\""

# Verify account_creation_audit DOES NOT exist yet:
powershell -Command ".\quick-db.bat \"SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'account_creation_audit');\""
```

**Action:** Document exact column names from database output.

---

### Step 3: Critical Field Names for Phase 2

**⚠️ MOST COMMON MISTAKES IN PHASE 2:**

```javascript
// ❌ WRONG - Guessing field names:
password_hash: hashedPassword        // Field is "password" not "password_hash"
contact_email: email                 // Field is "primary_email" not "contact_email"
primary_contact_name: name           // Field is "primary_contact" not "primary_contact_name"

// ✅ CORRECT - Using verified field names:
password: hashedPassword             // Matches database exactly
primary_email: email                 // Matches database exactly
primary_contact: name                // Matches database exactly
```

**CRITICAL FIELD NAMING RULES FOR PHASE 2:**
- ✅ Use `password` NOT `password_hash`
- ✅ Use `is_active` NOT `active` or `status`
- ✅ Use `primary_contact` NOT `primary_contact_name` or `contact_name`
- ✅ Use `primary_email` NOT `contact_email` or `partner_email`
- ✅ Use `partner_id` and `contractor_id` NOT `partnerId` or `contractorId`
- ✅ Use `first_name` NOT `firstName` (snake_case throughout)

---

### Step 4: Service Layer Query Patterns

**Phase 2 Service Functions and Required Field Names:**

#### createPartnerAccount() - Required Fields:
```javascript
// strategic_partners query:
SELECT id, primary_contact, primary_email FROM strategic_partners WHERE id = $1

// partner_users insert:
INSERT INTO partner_users (
  partner_id, email, password, first_name, last_name, is_active, created_at, updated_at
)
VALUES ($1, $2, $3, $4, $5, true, NOW(), NOW())
RETURNING id
```

#### createContractorAccount() - Required Fields:
```javascript
// contractors query:
SELECT id, first_name, last_name, email FROM contractors WHERE id = $1

// contractor_users insert:
INSERT INTO contractor_users (
  contractor_id, email, password, first_name, last_name, is_active, created_at, updated_at
)
VALUES ($1, $2, $3, $4, $5, true, NOW(), NOW())
RETURNING id
```

#### accountExists() - Required Fields:
```javascript
// Check partner_users:
SELECT id FROM partner_users WHERE email = $1

// Check contractor_users:
SELECT id FROM contractor_users WHERE email = $1
```

#### logAccountCreation() - Required Fields:
```javascript
// Insert into account_creation_audit:
INSERT INTO account_creation_audit (
  user_type, user_id, user_account_id, email,
  created_by, trigger_source, password_sent_via,
  success, error_message, created_at
)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
```

---

### Step 5: Verify Data Types (Especially BOOLEAN)

**Phase 2 Critical Data Types:**

| Field                 | Type           | Notes                                        |
|-----------------------|----------------|----------------------------------------------|
| `password`            | VARCHAR(255)   | Stores bcrypt hash (60 chars), NOT NULL      |
| `is_active`           | BOOLEAN        | Use `true` NOT `'true'` string               |
| `partner_id`          | INTEGER        | Foreign key, nullable                        |
| `contractor_id`       | INTEGER        | Foreign key, nullable                        |
| `primary_contact`     | VARCHAR        | Partner contact name                         |
| `primary_email`       | VARCHAR        | Partner email address                        |
| `first_name`          | VARCHAR(100)   | Nullable                                     |
| `last_name`           | VARCHAR(100)   | Nullable                                     |
| `success`             | BOOLEAN        | Audit log field, use `true`/`false`          |

**Common Issues in Phase 2:**
- ❌ Using `'true'` string instead of `true` boolean for `is_active`
- ❌ Using `'true'` string instead of `true` boolean for `success` field
- ❌ Guessing field names like `password_hash` instead of `password`
- ❌ Using camelCase like `firstName` instead of snake_case `first_name`

---

### Step 6: Document Findings BEFORE Coding

**Create a verification block at the top of the file:**

```javascript
// DATABASE-CHECKED: [table_names] verified October 27, 2025
// ================================================================
// VERIFIED FIELD NAMES:
// - partner_users.password (NOT password_hash)
// - contractor_users.password (NOT password_hash)
// - partner_users.is_active (BOOLEAN, NOT string)
// - contractor_users.is_active (BOOLEAN, NOT string)
// - contractors.id, first_name, last_name, email
// - strategic_partners.id, primary_contact, primary_email
// ================================================================
// VERIFIED DATA TYPES:
// - password: VARCHAR(255) - stores bcrypt hash
// - is_active: BOOLEAN (use true/false NOT 'true'/'false')
// - success: BOOLEAN (use true/false NOT 'true'/'false')
// ================================================================
// PASSWORD SECURITY (from Phase 1):
// - Hashing: bcrypt.hash(password, 12)
// - Generation: 12 characters (uppercase, lowercase, number, symbol)
// - Comparison: bcrypt.compare(plainPassword, hashedPassword)
// ================================================================
```

**Phase 2 Example (accountCreationService.js):**
```javascript
// DATABASE-CHECKED: partner_users, contractor_users, contractors, strategic_partners verified October 27, 2025
// ================================================================
// VERIFIED FIELD NAMES:
// - partner_users.password (NOT password_hash)
// - contractor_users.password (NOT password_hash)
// - partner_users.is_active, contractor_users.is_active (BOOLEAN)
// - contractors.first_name, last_name, email
// - strategic_partners.primary_contact, primary_email (NOT contact_email!)
// ================================================================
// VERIFIED DATA TYPES:
// - password: VARCHAR(255) - stores bcrypt hash (60 chars)
// - is_active: BOOLEAN (use true NOT 'true')
// - success: BOOLEAN (audit log, use true/false NOT 'true'/'false')
// ================================================================
// PASSWORD SECURITY:
// - Hashing: bcrypt.hash(password, 12) - EXACTLY 12 rounds
// - Generation: generateSecurePassword() - 12 chars
// - Pattern: 1 uppercase, 1 lowercase, 1 number, 1 symbol
// ================================================================
// SERVICE FUNCTIONS:
// - createPartnerAccount(partnerId, email, options)
// - createContractorAccount(contractorId, email, options)
// - accountExists(email, userType)
// - logAccountCreation(params)
// - generateSecurePassword()
// - hashPassword(plainPassword)
// ================================================================
```

---

### Step 7: Verify BOTH Development AND Production

**IMPORTANT:** Check that both environments have the same schema!

```bash
# Development - Verify all tables:
powershell -Command ".\quick-db.bat \"SELECT column_name FROM information_schema.columns WHERE table_name = 'partner_users' ORDER BY ordinal_position;\""
powershell -Command ".\quick-db.bat \"SELECT column_name FROM information_schema.columns WHERE table_name = 'contractor_users' ORDER BY ordinal_position;\""
powershell -Command ".\quick-db.bat \"SELECT column_name FROM information_schema.columns WHERE table_name = 'contractors' WHERE column_name IN ('id', 'first_name', 'last_name', 'email');\""
powershell -Command ".\quick-db.bat \"SELECT column_name FROM information_schema.columns WHERE table_name = 'strategic_partners' WHERE column_name IN ('id', 'primary_contact', 'primary_email');\""

# Production - Use mcp__aws-production__exec tool with same queries
```

**Phase 2 Specific Checks:**
1. ✅ Verify `partner_users` exists in both dev and prod
2. ✅ Verify `contractor_users` exists in both dev and prod
3. ✅ Verify field names match EXACTLY between dev and prod
4. ✅ Run migration on dev first, test thoroughly
5. ✅ Run migration on prod only after dev testing complete

**Action:** Confirm both environments match before implementing service.

---

## 🚨 Red Flags - STOP and Verify

If you see ANY of these in Phase 2, STOP and run verification queries:

1. **Using wrong field names** → Verify against database
   ```javascript
   password_hash: hashedPassword  // ⚠️ STOP! It's "password" not "password_hash"
   contact_email: email           // ⚠️ STOP! It's "primary_email" not "contact_email"
   ```

2. **Using string for boolean** → Verify data type
   ```javascript
   is_active: 'true'              // ⚠️ STOP! Should be: is_active: true (boolean)
   success: 'true'                // ⚠️ STOP! Should be: success: true (boolean)
   ```

3. **Guessing partner field names** → Verify strategic_partners table
   ```javascript
   primary_contact_name: name     // ⚠️ STOP! It's "primary_contact" not "primary_contact_name"
   partner_email: email           // ⚠️ STOP! It's "primary_email" not "partner_email"
   ```

4. **Wrong bcrypt rounds** → Verify matches Phase 1
   ```javascript
   bcrypt.hash(password, 10)      // ⚠️ STOP! Phase 1 uses 12 rounds, not 10
   ```

5. **Wrong audit log field names** → Verify table schema
   ```javascript
   // If field names don't match account_creation_audit schema from Phase 2 plan
   // ⚠️ STOP! Verify against migration script
   ```

6. **Using different password generation** → Verify matches Phase 1
   ```javascript
   // If password generation doesn't match Phase 1 pattern
   // ⚠️ STOP! Must be 12 chars with uppercase, lowercase, number, symbol
   ```

---

## 📋 Quick Reference Commands

### Verify partner_users Fields
```bash
powershell -Command ".\quick-db.bat \"SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'partner_users' AND column_name IN ('id', 'partner_id', 'email', 'password', 'is_active') ORDER BY ordinal_position;\""
```

### Verify contractor_users Fields
```bash
powershell -Command ".\quick-db.bat \"SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'contractor_users' AND column_name IN ('id', 'contractor_id', 'email', 'password', 'is_active') ORDER BY ordinal_position;\""
```

### Verify contractors Fields
```bash
powershell -Command ".\quick-db.bat \"SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'contractors' AND column_name IN ('id', 'first_name', 'last_name', 'email') ORDER BY ordinal_position;\""
```

### Verify strategic_partners Fields
```bash
powershell -Command ".\quick-db.bat \"SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'strategic_partners' AND column_name IN ('id', 'primary_contact', 'primary_email') ORDER BY ordinal_position;\""
```

### Verify account_creation_audit Does NOT Exist Yet
```bash
powershell -Command ".\quick-db.bat \"SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'account_creation_audit');\""
```

### After Migration - Verify account_creation_audit Table
```bash
powershell -Command ".\quick-db.bat \"SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'account_creation_audit' ORDER BY ordinal_position;\""
```

---

## ✅ Example: Creating accountCreationService.js

### Pre-Flight Verification:

**1. Tables Involved:**
- `partner_users` (existing from Phase 1)
- `contractor_users` (existing from Phase 1)
- `contractors` (for name lookup)
- `strategic_partners` (for name lookup)
- `account_creation_audit` (to be created in Phase 2)

**2. Column Names Verified:**
```sql
-- partner_users:
id, partner_id, email, password, first_name, last_name, is_active

-- contractor_users:
id, contractor_id, email, password, first_name, last_name, is_active

-- contractors:
id, first_name, last_name, email

-- strategic_partners:
id, primary_contact, primary_email

-- account_creation_audit (to be created):
id, user_type, user_id, user_account_id, email, created_by,
trigger_source, password_sent_via, success, error_message, created_at
```

**3. Data Types Verified:**
- `password`: VARCHAR(255) - stores bcrypt hash
- `is_active`: BOOLEAN (use `true`/`false` NOT `'true'`/`'false'`)
- `success`: BOOLEAN (use `true`/`false` NOT `'true'`/`'false'`)
- `primary_contact`: VARCHAR - partner contact name
- `primary_email`: VARCHAR - partner email

**4. Password Security (from Phase 1):**
- Hashing: `bcrypt.hash(password, 12)` - EXACTLY 12 rounds
- Generation: 12 characters with uppercase, lowercase, number, symbol
- Comparison: `bcrypt.compare(plainPassword, hashedPassword)`

**5. Documentation Block:**
```javascript
// DATABASE-CHECKED: partner_users, contractor_users, contractors, strategic_partners verified October 27, 2025
// ================================================================
// VERIFIED FIELD NAMES:
// - partner_users.password (NOT password_hash)
// - contractor_users.password (NOT password_hash)
// - partner_users.is_active, contractor_users.is_active (BOOLEAN)
// - contractors.first_name, last_name (NOT firstName, lastName)
// - strategic_partners.primary_contact, primary_email (NOT contact_email!)
// ================================================================
// VERIFIED DATA TYPES:
// - password: VARCHAR(255) - stores bcrypt hash
// - is_active: BOOLEAN (true/false NOT 'true'/'false')
// - success: BOOLEAN (true/false NOT 'true'/'false')
// ================================================================
// PASSWORD SECURITY:
// - Hashing: bcrypt.hash(password, 12)
// - Generation: 12 chars (uppercase, lowercase, number, symbol)
// ================================================================
```

**NOW WE CAN CODE SERVICE SAFELY!**

---

## 📚 Phase 2 Specific Verification Notes

### Service Implementation Checklist
- [ ] Verify `partner_users` table field names
- [ ] Verify `contractor_users` table field names
- [ ] Verify `contractors` table field names (especially `first_name`, `last_name`)
- [ ] Verify `strategic_partners` table field names (especially `primary_contact`, `primary_email`)
- [ ] Confirm `account_creation_audit` table DOES NOT exist yet
- [ ] Run migration to create `account_creation_audit` table
- [ ] Verify bcrypt rounds match Phase 1 (12 rounds)
- [ ] Test service functions before creating API routes
- [ ] Test duplicate prevention logic
- [ ] Verify audit logging works correctly

### Migration Safety Checklist
- [ ] Backup database before migration (if production)
- [ ] Run migration on development first
- [ ] Test account creation on development
- [ ] Verify audit log entries are created correctly
- [ ] Verify indexes improve query performance
- [ ] Run migration on production only after dev success

### Testing Checklist
- [ ] Test `createPartnerAccount()` with valid partner
- [ ] Test `createContractorAccount()` with valid contractor
- [ ] Test duplicate prevention (account already exists)
- [ ] Test with non-existent partner/contractor (error handling)
- [ ] Verify passwords are hashed correctly (bcrypt with 12 rounds)
- [ ] Verify audit log entries for all scenarios
- [ ] Test API endpoints with admin token
- [ ] Test API endpoints without admin token (should fail)

---

## 🚨 Phase 2 Critical Gotchas

### 1. Field Naming - strategic_partners Table
```javascript
// ❌ WRONG (common mistakes):
contact_email: partner.email
primary_contact_name: partner.name
partner_email: email

// ✅ CORRECT (verified field names):
primary_email: partner.primary_email
primary_contact: partner.primary_contact
```

### 2. Boolean Fields in Audit Log
```javascript
// ❌ WRONG:
success: 'true'
success: 'false'

// ✅ CORRECT:
success: true
success: false
```

### 3. Password Field Name
```javascript
// ❌ WRONG (in BOTH tables):
INSERT INTO partner_users (password_hash, ...) VALUES (...)
INSERT INTO contractor_users (password_hash, ...) VALUES (...)

// ✅ CORRECT:
INSERT INTO partner_users (password, ...) VALUES (...)
INSERT INTO contractor_users (password, ...) VALUES (...)
```

### 4. Contractor Name Lookup
```javascript
// ❌ WRONG (camelCase):
SELECT firstName, lastName FROM contractors WHERE id = $1

// ✅ CORRECT (snake_case):
SELECT first_name, last_name FROM contractors WHERE id = $1
```

### 5. Partner Name Splitting
```javascript
// ❌ WRONG (field doesn't exist):
const name = partner.contact_name.split(' ')

// ✅ CORRECT:
const nameParts = partner.primary_contact?.split(' ') || []
const firstName = nameParts[0] || null
const lastName = nameParts.slice(1).join(' ') || null
```

---

## 📚 Related Documents

- **Phase 2 Implementation Plan:** `PHASE-2-IMPLEMENTATION-PLAN.md` (same directory)
- **Phase 1 Completion Report:** `../phase-1/PHASE-1-COMPLETION.md`
- **Phase 1 Pre-Flight Checklist:** `../phase-1/PHASE-1-PRE-FLIGHT-CHECKLIST.md`
- **Auto-Account Creation Overview:** `../AUTO-ACCOUNT-CREATION-OVERVIEW.md`
- **Database Source of Truth:** `DATABASE-SOURCE-OF-TRUTH.md` (project root)
- **Database Connection Pattern:** `DATABASE-CONNECTION-PATTERN.md` (project root)

---

**Last Updated:** October 27, 2025
**Next Review:** Before starting Phase 2 Task 1 (database migration)
**Status:** MANDATORY - Use this checklist before ANY Phase 2 development

---

## 🎯 Quick Start for Phase 2

**Before creating ANY file, run these 5 commands:**

```bash
# 1. Verify partner_users field names
powershell -Command ".\quick-db.bat \"SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'partner_users' AND column_name IN ('id', 'partner_id', 'email', 'password', 'is_active') ORDER BY ordinal_position;\""

# 2. Verify contractor_users field names
powershell -Command ".\quick-db.bat \"SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'contractor_users' AND column_name IN ('id', 'contractor_id', 'email', 'password', 'is_active') ORDER BY ordinal_position;\""

# 3. Verify contractors field names
powershell -Command ".\quick-db.bat \"SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'contractors' AND column_name IN ('id', 'first_name', 'last_name', 'email') ORDER BY ordinal_position;\""

# 4. Verify strategic_partners field names
powershell -Command ".\quick-db.bat \"SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'strategic_partners' AND column_name IN ('id', 'primary_contact', 'primary_email') ORDER BY ordinal_position;\""

# 5. Verify account_creation_audit DOES NOT exist yet
powershell -Command ".\quick-db.bat \"SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'account_creation_audit');\""
```

**Document results, verify all field names match implementation plan, then code safely!**

---

## ✅ VERIFICATION SUMMARY - October 27, 2025

**All field names in Phase 2 implementation plan have been verified against the database:**

✅ **partner_users**: `password`, `is_active`, `partner_id`, `email`, `first_name`, `last_name` - VERIFIED
✅ **contractor_users**: `password`, `is_active`, `contractor_id`, `email`, `first_name`, `last_name` - VERIFIED
✅ **contractors**: `id`, `first_name`, `last_name`, `email` - VERIFIED
✅ **strategic_partners**: `id`, `primary_contact`, `primary_email` - VERIFIED
✅ **account_creation_audit**: Does not exist yet (will be created in Phase 2 Task 1) - VERIFIED

**Phase 2 implementation plan is 100% aligned with database schema.**
**Ready to begin Phase 2 development.**

---

**END OF PHASE 2 PRE-FLIGHT CHECKLIST**
