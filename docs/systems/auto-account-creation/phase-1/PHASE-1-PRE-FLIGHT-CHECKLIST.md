# Phase 1: Pre-Flight Checklist - Contractor Authentication System

**Document Version:** 1.0
**Date:** October 27, 2025
**Status:** MANDATORY - Use before creating or modifying ANY file

---

## 🎯 Purpose

This checklist ensures 100% database alignment and consistency when building the contractor authentication system. Phase 1 creates contractor login/auth to match the existing partner authentication pattern. Following this prevents naming mismatches, ensures password security consistency, and guarantees JWT authentication works identically for both user types.

**Critical Principle:** Contractor auth must be a PERFECT COPY of partner auth patterns. Any deviation will cause authentication bugs and security inconsistencies.

---

## ✅ MANDATORY CHECKLIST - Before Creating/Modifying ANY File

### Step 1: Identify Database Tables Involved

**Question:** What database tables will this file interact with?

**Phase 1 Tables:**
- **contractors** - For foreign key reference (existing table)
- **partner_users** - Pattern to copy EXACTLY (existing table)
- **contractor_users** - New table to create in Phase 1 (DOES NOT EXIST YET)

**Phase 1 File Dependencies:**
- **Authentication Controller**: `contractor_users`, `contractors`
- **Authentication Routes**: `contractor_users` (via controller)
- **Authentication Middleware**: `contractor_users` (for JWT verification)
- **Login Page**: Uses API endpoints (indirect database access)
- **Dashboard Page**: `contractor_users`, `contractors` (for profile data)

**Action:** List all tables this file will query, insert, update, or reference.

---

### Step 2: Verify Column Names (Field Names)

**For EACH table identified in Step 1:**

```bash
# Check partner_users table (our pattern to copy):
powershell -Command ".\quick-db.bat \"SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'partner_users' ORDER BY ordinal_position;\""

# Check contractors table (for foreign key reference):
powershell -Command ".\quick-db.bat \"SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'contractors' ORDER BY ordinal_position;\""

# Verify contractor_users DOES NOT exist yet:
powershell -Command ".\quick-db.bat \"SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'contractor_users');\""
```

**Action:** Document exact column names from database output.

**Phase 1 Key Tables - Verified October 27, 2025:**

#### partner_users (PATTERN TO COPY - 12 columns)
```
column_name          | data_type                  | is_nullable
---------------------|----------------------------|------------
id                   | integer                    | NO
partner_id           | integer                    | YES
email                | character varying(255)     | NO (UNIQUE)
password             | character varying(255)     | NO
first_name           | character varying(100)     | YES
last_name            | character varying(100)     | YES
role                 | character varying(50)      | YES (DEFAULT 'partner')
is_active            | boolean                    | YES (DEFAULT true)
last_login           | timestamp without time zone| YES
reset_token          | character varying(255)     | YES
reset_token_expires  | timestamp without time zone| YES
created_at           | timestamp without time zone| YES (DEFAULT NOW())
```

**CRITICAL FIELD NAMING RULES (from partner_users):**
- ✅ Use `password` NOT `password_hash`
- ✅ Use `last_login` NOT `last_login_at`
- ✅ Use `reset_token` NOT `password_reset_token`
- ✅ Use `reset_token_expires` NOT `password_reset_expires` or `reset_expires_at`
- ✅ Use `created_at` NOT `createdAt` or `created`
- ✅ Use `is_active` NOT `active` or `status`

#### contractors (FOR FOREIGN KEY REFERENCE - First 10 columns)
```
column_name          | data_type                  | is_nullable
---------------------|----------------------------|------------
id                   | integer                    | NO
first_name           | character varying(100)     | YES
last_name            | character varying(100)     | YES
email                | character varying(255)     | NO (UNIQUE)
phone                | character varying(20)      | YES
company_name         | character varying(255)     | YES
... (69 total columns)
```

#### contractor_users (TO BE CREATED IN PHASE 1)
**DOES NOT EXIST YET - Use migration script from PHASE-1-IMPLEMENTATION-PLAN.md**

Expected schema (EXACT COPY of partner_users with contractor_id):
```sql
CREATE TABLE contractor_users (
  id SERIAL PRIMARY KEY,
  contractor_id INTEGER REFERENCES contractors(id) ON DELETE CASCADE,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  role VARCHAR(50) DEFAULT 'contractor',
  is_active BOOLEAN DEFAULT true,
  last_login TIMESTAMP,
  reset_token VARCHAR(255),
  reset_token_expires TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**What to Check:**
- ✅ Exact spelling (snake_case vs camelCase)
- ✅ Underscores vs no underscores
- ✅ Singular vs plural
- ✅ **Phase 1 Critical:** `password` NOT `password_hash`, `last_login` NOT `last_login_at`

---

### Step 3: Verify CHECK Constraints

**For tables with enum-like fields (role, status, etc.):**

```bash
# Check partner_users constraints (our pattern):
powershell -Command ".\quick-db.bat \"SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'partner_users'::regclass AND contype = 'c';\""

# After creating contractor_users, verify constraints match:
powershell -Command ".\quick-db.bat \"SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'contractor_users'::regclass AND contype = 'c';\""
```

**Action:** Document exact allowed values from CHECK constraints.

**Phase 1 Critical Constraints:**

#### partner_users (Expected - VERIFY!)
```
No CHECK constraints expected (role uses DEFAULT, not CHECK)
- role: DEFAULT 'partner' (no constraint)
- is_active: DEFAULT true (no constraint)
```

#### contractor_users (TO BE CREATED)
```
No CHECK constraints needed (following partner_users pattern)
- role: DEFAULT 'contractor' (no constraint)
- is_active: DEFAULT true (no constraint)
```

**What to Check:**
- ✅ Verify no CHECK constraints exist on partner_users
- ✅ Match pattern exactly for contractor_users
- ✅ Use DEFAULT values, not CHECK constraints for role

---

### Step 4: Verify Foreign Key Constraints

**For tables with relationships:**

```bash
# Check partner_users foreign keys:
powershell -Command ".\quick-db.bat \"SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'partner_users'::regclass AND contype = 'f';\""

# After creating contractor_users, verify foreign keys:
powershell -Command ".\quick-db.bat \"SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'contractor_users'::regclass AND contype = 'f';\""
```

**Action:** Document which fields reference other tables.

**Phase 1 Key Foreign Keys - Verified October 27, 2025:**

#### partner_users
```
conname                          | pg_get_constraintdef
---------------------------------|--------------------
partner_users_partner_id_fkey    | FOREIGN KEY (partner_id) REFERENCES strategic_partners(id) ON DELETE CASCADE
```

#### contractor_users (TO BE CREATED)
```
Expected:
contractor_users_contractor_id_fkey | FOREIGN KEY (contractor_id) REFERENCES contractors(id) ON DELETE CASCADE
```

**What to Check:**
- ✅ Foreign key field name: `contractor_id` (NOT `contractors_id`)
- ✅ References `contractors(id)` (NOT `contractor.id`)
- ✅ ON DELETE CASCADE (removes user when contractor deleted)
- ✅ Field is nullable (allows contractors without user accounts)
- ✅ **Phase 1 Critical:** Match partner_users FK pattern EXACTLY

---

### Step 5: Check Data Types (Especially VARCHAR and BOOLEAN)

**From Step 2 output, identify:**
- VARCHAR(255) for email, password, reset_token
- VARCHAR(100) for first_name, last_name
- VARCHAR(50) for role
- BOOLEAN for is_active
- TIMESTAMP for last_login, reset_token_expires, created_at
- INTEGER for id, contractor_id

**Phase 1 Critical Data Types:**

| Field                 | Type           | Notes                                        |
|-----------------------|----------------|----------------------------------------------|
| `email`               | VARCHAR(255)   | UNIQUE constraint, NOT NULL                  |
| `password`            | VARCHAR(255)   | Stores bcrypt hash (60 chars), NOT NULL      |
| `first_name`          | VARCHAR(100)   | Nullable (might not have name on creation)   |
| `last_name`           | VARCHAR(100)   | Nullable (might not have name on creation)   |
| `role`                | VARCHAR(50)    | DEFAULT 'contractor'                         |
| `is_active`           | BOOLEAN        | DEFAULT true, NOT 'true' string              |
| `last_login`          | TIMESTAMP      | Nullable, updated on each login              |
| `reset_token`         | VARCHAR(255)   | Nullable, for password reset flow            |
| `reset_token_expires` | TIMESTAMP      | Nullable, expiration for reset token         |
| `created_at`          | TIMESTAMP      | DEFAULT NOW(), account creation time         |
| `contractor_id`       | INTEGER        | Foreign key to contractors(id), nullable     |

**Action:** Ensure code uses correct data types.

**Common Issues:**
- ❌ Using `password_hash` field name (it's just `password`)
- ❌ Storing boolean as string: `'true'` instead of `true`
- ❌ Using wrong date format for TIMESTAMP fields
- ❌ Not hashing password before storage (use bcrypt)
- ❌ Password field too short (needs 60+ chars for bcrypt)

---

### Step 6: Document Findings BEFORE Coding

**Create a verification block at the top of the file:**

```javascript
// DATABASE-CHECKED: [table_names] columns verified [date]
// ================================================================
// VERIFIED FIELD NAMES:
// - field_one (NOT fieldOne, NOT field1)
// - another_field (NOT anotherField)
// ================================================================
// VERIFIED DATA TYPES:
// - boolean_field: BOOLEAN (use true/false NOT 'true'/'false')
// - password: VARCHAR(255) - stores bcrypt hash
// ================================================================
// PASSWORD SECURITY:
// - Hashing: bcrypt with 12 rounds
// - Generation: 12 characters (uppercase, lowercase, number, symbol)
// - Storage: NEVER store plain text
// ================================================================
// JWT CONFIGURATION:
// - Secret: process.env.JWT_SECRET (same as partner auth)
// - Expiration: 7 days (same as partner auth)
// - Payload: { id, contractor_id, type: 'contractor' }
// ================================================================
```

**Phase 1 Example (contractorAuthController.js):**
```javascript
// DATABASE-CHECKED: contractor_users, contractors verified October 27, 2025
// ================================================================
// VERIFIED FIELD NAMES (from partner_users pattern):
// - password (NOT password_hash)
// - last_login (NOT last_login_at)
// - reset_token (NOT password_reset_token)
// - reset_token_expires (NOT password_reset_expires)
// - contractor_id (NOT contractors_id)
// - is_active (NOT active)
// ================================================================
// VERIFIED DATA TYPES:
// - password: VARCHAR(255) - stores bcrypt hash (60 chars)
// - is_active: BOOLEAN (use true/false NOT 'true'/'false')
// - last_login: TIMESTAMP (use NOW() on login)
// - contractor_id: INTEGER (foreign key to contractors.id)
// ================================================================
// PASSWORD SECURITY:
// - Hashing: bcrypt.hash(password, 12) - EXACTLY 12 rounds
// - Generation: generateSecurePassword() - 12 chars
// - Pattern: At least 1 uppercase, 1 lowercase, 1 number, 1 symbol
// - Comparison: bcrypt.compare(plainPassword, hashedPassword)
// ================================================================
// JWT CONFIGURATION:
// - Secret: process.env.JWT_SECRET (SAME as partner auth)
// - Expiration: '7d' (SAME as partner auth)
// - Sign: jwt.sign({ id, contractor_id, type: 'contractor' }, secret, { expiresIn })
// - Verify: jwt.verify(token, secret)
// ================================================================
```

**Phase 1 Example (contractorAuth.js middleware):**
```javascript
// DATABASE-CHECKED: contractor_users verified October 27, 2025
// ================================================================
// VERIFIED FIELD NAMES:
// - contractor_id (NOT contractors_id, NOT contractorId)
// - is_active (NOT active, NOT isActive)
// - password (NOT password_hash)
// ================================================================
// JWT VERIFICATION:
// - Secret: process.env.JWT_SECRET (SAME as partner auth)
// - Payload structure: { id, contractor_id, type }
// - Type check: decoded.type === 'contractor'
// ================================================================
// MIDDLEWARE PATTERN (copied from partnerAuth.js):
// 1. Extract token from Authorization header
// 2. Verify token with JWT_SECRET
// 3. Query contractor_users table with decoded.id
// 4. Check is_active === true
// 5. Attach req.user with full user data
// 6. Call next()
// ================================================================
```

---

### Step 7: Verify BOTH Development AND Production

**IMPORTANT:** Check that both environments have the same schema!

```bash
# Development - Check partner_users pattern:
powershell -Command ".\quick-db.bat \"SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'partner_users' ORDER BY ordinal_position;\""

# Production - Check partner_users pattern:
# Use mcp__aws-production__exec tool with same query

# Development - After migration, check contractor_users:
powershell -Command ".\quick-db.bat \"SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'contractor_users' ORDER BY ordinal_position;\""

# Production - After migration, check contractor_users:
# Use mcp__aws-production__exec tool with same query
```

**Phase 1 Specific Checks:**
1. ✅ Verify `partner_users` table exists in production (our pattern)
2. ✅ Verify field names match EXACTLY between dev and prod
3. ✅ Run migration on dev first, test thoroughly
4. ✅ Run migration on prod only after dev testing complete
5. ✅ Verify JWT_SECRET is set in BOTH environments

**Action:** Confirm both environments match before implementing authentication.

---

## 🚨 Red Flags - STOP and Verify

If you see ANY of these in Phase 1, STOP and run verification queries:

1. **Using wrong field names** → Verify against partner_users
   ```javascript
   password_hash: bcrypt.hashSync(password)  // ⚠️ STOP! It's "password" not "password_hash"
   ```

2. **Using wrong timestamp field names** → Verify against partner_users
   ```javascript
   last_login_at: new Date()  // ⚠️ STOP! It's "last_login" not "last_login_at"
   ```

3. **Using different JWT configuration** → Verify matches partner auth
   ```javascript
   jwt.sign(payload, differentSecret, { expiresIn: '1d' })  // ⚠️ STOP! Must use SAME secret and '7d'
   ```

4. **Storing plain text passwords** → Verify bcrypt usage
   ```javascript
   password: req.body.password  // ⚠️ STOP! Must hash with bcrypt first
   ```

5. **Using wrong bcrypt rounds** → Verify matches partner auth
   ```javascript
   bcrypt.hash(password, 10)  // ⚠️ STOP! Partner auth uses 12 rounds, not 10
   ```

6. **Using string for boolean** → Verify data type
   ```javascript
   is_active: 'true'  // ⚠️ STOP! Should be: is_active: true (boolean)
   ```

7. **Wrong foreign key field name** → Verify naming
   ```javascript
   contractors_id: contractorId  // ⚠️ STOP! It's "contractor_id" (singular)
   ```

8. **Different middleware pattern** → Verify matches partnerAuth.js
   ```javascript
   // If middleware structure doesn't match partnerAuth.js EXACTLY
   // ⚠️ STOP! Copy pattern from partnerAuth.js
   ```

---

## 📋 Quick Reference Commands

### Check All Columns (Pattern Table)
```bash
powershell -Command ".\quick-db.bat \"SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'partner_users' ORDER BY ordinal_position;\""
```

### Check All Columns (Contractor Table)
```bash
powershell -Command ".\quick-db.bat \"SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'contractors' ORDER BY ordinal_position;\""
```

### Verify contractor_users Does NOT Exist Yet
```bash
powershell -Command ".\quick-db.bat \"SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'contractor_users');\""
```

### Check All Constraints (Pattern Table)
```bash
powershell -Command ".\quick-db.bat \"SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'partner_users'::regclass;\""
```

### Check Foreign Keys Only (Pattern Table)
```bash
powershell -Command ".\quick-db.bat \"SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'partner_users'::regclass AND contype = 'f';\""
```

### Check Unique Constraints (Pattern Table)
```bash
powershell -Command ".\quick-db.bat \"SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'partner_users'::regclass AND contype = 'u';\""
```

### Verify JWT_SECRET Environment Variable
```bash
# Development:
echo $env:JWT_SECRET

# Production:
# Use mcp__aws-production__exec tool:
# echo $JWT_SECRET
```

---

## ✅ Example: Creating contractorAuthController.js

### Pre-Flight Verification:

**1. Tables Involved:**
- `contractor_users` (new table to create)
- `contractors` (for foreign key reference)

**2. Column Names Verified:**
```sql
-- contractor_users columns (FROM MIGRATION):
id, contractor_id, email, password, first_name, last_name,
role, is_active, last_login, reset_token, reset_token_expires,
created_at

-- contractors columns (for FK reference):
id, first_name, last_name, email, phone, company_name
```

**3. CHECK Constraints Verified:**
```bash
# Run verification on partner_users (pattern):
powershell -Command ".\quick-db.bat \"SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'partner_users'::regclass AND contype = 'c';\""

# Result: No CHECK constraints (uses DEFAULT values)
```

**4. Foreign Keys Verified:**
```sql
-- contractor_users:
FOREIGN KEY (contractor_id) REFERENCES contractors(id) ON DELETE CASCADE
```

**5. Data Types Noted:**
- `password`: VARCHAR(255) - stores bcrypt hash (60 chars)
- `is_active`: BOOLEAN (use `true`/`false` NOT `'true'`/`'false'`)
- `last_login`: TIMESTAMP (use `NOW()` on login)
- `contractor_id`: INTEGER (foreign key to contractors.id)

**6. Authentication Patterns (from partnerAuthController.js):**
- Password hashing: `bcrypt.hash(password, 12)` - EXACTLY 12 rounds
- Password comparison: `bcrypt.compare(plainPassword, hashedPassword)`
- JWT signing: `jwt.sign({ id, contractor_id, type: 'contractor' }, JWT_SECRET, { expiresIn: '7d' })`
- Password generation: 12 characters with uppercase, lowercase, number, symbol

**7. Documentation Block:**
```javascript
// DATABASE-CHECKED: contractor_users, contractors verified October 27, 2025
// ================================================================
// VERIFIED FIELD NAMES (from partner_users pattern):
// - password (NOT password_hash)
// - last_login (NOT last_login_at)
// - reset_token (NOT password_reset_token)
// - reset_token_expires (NOT password_reset_expires)
// - contractor_id (NOT contractors_id)
// - is_active (NOT active)
// ================================================================
// VERIFIED DATA TYPES:
// - password: VARCHAR(255) - stores bcrypt hash
// - is_active: BOOLEAN (true/false NOT 'true'/'false')
// - last_login: TIMESTAMP
// - contractor_id: INTEGER
// ================================================================
// PASSWORD SECURITY (copied from partnerAuthController.js):
// - Hashing: bcrypt.hash(password, 12)
// - Generation: 12 chars (uppercase, lowercase, number, symbol)
// - Comparison: bcrypt.compare(plainPassword, hashedPassword)
// ================================================================
// JWT CONFIGURATION (SAME as partner auth):
// - Secret: process.env.JWT_SECRET
// - Expiration: '7d'
// - Payload: { id, contractor_id, type: 'contractor' }
// ================================================================
```

**NOW WE CAN CODE AUTH CONTROLLER SAFELY!**

---

## ✅ Example: Creating contractorAuth.js Middleware

### Pre-Flight Verification:

**1. Tables Involved:**
- `contractor_users` (for JWT verification and user lookup)

**2. Column Names Verified:**
```sql
-- contractor_users columns (needed for query):
id, contractor_id, email, first_name, last_name, role, is_active
```

**3. Middleware Pattern (from partnerAuth.js):**
```javascript
// Step 1: Extract token from Authorization header
const token = req.headers.authorization?.split(' ')[1];

// Step 2: Verify token with JWT_SECRET
const decoded = jwt.verify(token, process.env.JWT_SECRET);

// Step 3: Check token type matches
if (decoded.type !== 'contractor') throw error;

// Step 4: Query contractor_users table with decoded.id
const result = await query(`
  SELECT id, contractor_id, email, first_name, last_name, role, is_active
  FROM contractor_users
  WHERE id = $1
`, [decoded.id]);

// Step 5: Check is_active === true
if (!user.is_active) throw error;

// Step 6: Attach req.user with full user data
req.user = user;

// Step 7: Call next()
next();
```

**4. Documentation Block:**
```javascript
// DATABASE-CHECKED: contractor_users verified October 27, 2025
// ================================================================
// VERIFIED FIELD NAMES:
// - contractor_id (NOT contractors_id, NOT contractorId)
// - is_active (NOT active, NOT isActive)
// ================================================================
// JWT VERIFICATION (SAME pattern as partnerAuth.js):
// - Secret: process.env.JWT_SECRET
// - Payload: { id, contractor_id, type }
// - Type check: decoded.type === 'contractor'
// ================================================================
// MIDDLEWARE PATTERN:
// 1. Extract token from Authorization header
// 2. Verify token with JWT_SECRET
// 3. Query contractor_users table
// 4. Check is_active === true
// 5. Attach req.user
// 6. Call next()
// ================================================================
```

**NOW WE CAN CODE MIDDLEWARE SAFELY!**

---

## 📚 Phase 1 Specific Verification Notes

### Authentication Implementation Checklist
- [ ] Verify `partner_users` table structure (our pattern to copy)
- [ ] Verify `contractors` table exists for FK reference
- [ ] Confirm `contractor_users` table DOES NOT exist yet
- [ ] Run migration to create `contractor_users` table
- [ ] Verify field names match partner_users EXACTLY
- [ ] Verify JWT_SECRET is set in both dev and prod
- [ ] Verify bcrypt rounds match partner auth (12 rounds)
- [ ] Verify JWT expiration matches partner auth (7 days)
- [ ] Test login flow before moving to frontend
- [ ] Test JWT token verification before dashboard

### Migration Safety Checklist
- [ ] Backup database before migration (if production)
- [ ] Run migration on development first
- [ ] Test authentication on development
- [ ] Verify all field names match partner_users pattern
- [ ] Verify foreign key constraint works (cascade delete)
- [ ] Verify unique constraint works (duplicate email blocked)
- [ ] Run migration on production only after dev success

### Security Checklist
- [ ] Passwords NEVER stored in plain text
- [ ] bcrypt rounds set to 12 (same as partner auth)
- [ ] JWT_SECRET is secure and matches partner auth
- [ ] JWT expiration is 7 days (same as partner auth)
- [ ] Password generation includes all required character types
- [ ] reset_token is sufficiently random and secure
- [ ] reset_token_expires is validated before password reset

---

## 🚨 Phase 1 Critical Gotchas

### 1. Field Naming Must Match partner_users EXACTLY
```javascript
// ❌ WRONG (common mistakes):
password_hash: hashedPassword
last_login_at: new Date()
password_reset_token: token

// ✅ CORRECT (match partner_users):
password: hashedPassword
last_login: new Date()
reset_token: token
```

### 2. Boolean Fields (Not Strings)
```javascript
// ❌ WRONG:
is_active: 'true'

// ✅ CORRECT:
is_active: true
```

### 3. JWT Must Use SAME Configuration
```javascript
// ❌ WRONG (different configuration):
jwt.sign(payload, 'different-secret', { expiresIn: '1d' })

// ✅ CORRECT (same as partner auth):
jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' })
```

### 4. bcrypt Rounds Must Match
```javascript
// ❌ WRONG (different rounds):
bcrypt.hash(password, 10)

// ✅ CORRECT (same as partner auth):
bcrypt.hash(password, 12)
```

### 5. Foreign Key Field Name
```javascript
// ❌ WRONG:
contractors_id: contractorId  // Plural, wrong naming

// ✅ CORRECT:
contractor_id: contractorId  // Singular, matches partner_id pattern
```

### 6. Password Field Length
```sql
-- ❌ WRONG (too short for bcrypt):
password VARCHAR(60)

-- ✅ CORRECT (room for bcrypt hash):
password VARCHAR(255)
```

---

## 📚 Related Documents

- **Phase 1 Implementation Plan:** `PHASE-1-IMPLEMENTATION-PLAN.md` (same directory)
- **Auto-Account Creation Overview:** `../AUTO-ACCOUNT-CREATION-OVERVIEW.md`
- **Database Source of Truth:** `DATABASE-SOURCE-OF-TRUTH.md` (project root)
- **Database Connection Pattern:** `DATABASE-CONNECTION-PATTERN.md` (project root)
- **Partner Auth Controller:** `tpe-backend/src/controllers/partnerAuthController.js` (pattern to copy)
- **Partner Auth Middleware:** `tpe-backend/src/middleware/partnerAuth.js` (pattern to copy)
- **Partner Auth Routes:** `tpe-backend/src/routes/partnerAuthRoutes.js` (pattern to copy)

---

**Last Updated:** October 27, 2025
**Next Review:** Before starting Phase 1 Task 1 (database migration)
**Status:** MANDATORY - Use this checklist before ANY Phase 1 development

---

## 🎯 Quick Start for Phase 1

**Before creating ANY file, run these 4 commands:**

```bash
# 1. Check partner_users table (our pattern to copy)
powershell -Command ".\quick-db.bat \"SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'partner_users' ORDER BY ordinal_position;\""

# 2. Check contractors table (for FK reference)
powershell -Command ".\quick-db.bat \"SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'contractors' WHERE column_name IN ('id', 'first_name', 'last_name', 'email');\""

# 3. Verify contractor_users DOES NOT exist yet
powershell -Command ".\quick-db.bat \"SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'contractor_users');\""

# 4. Check partner_users constraints (to match exactly)
powershell -Command ".\quick-db.bat \"SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'partner_users'::regclass;\""
```

**Document results, verify JWT_SECRET is set, then code safely!**
