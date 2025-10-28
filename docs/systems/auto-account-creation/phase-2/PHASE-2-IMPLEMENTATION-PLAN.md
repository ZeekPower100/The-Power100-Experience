# PHASE 2 - Centralized Account Creation Service
## Implementation Plan

**Timeline**: Week 2 (8-12 hours)
**Priority**: HIGH
**Status**: Ready to Begin
**Prerequisites**: ✅ Phase 1 Complete

---

## OBJECTIVE

Build a centralized account creation service that provides shared functions for automatically creating both partner and contractor accounts with secure passwords, preventing duplicates, and maintaining an audit trail.

**Key Principle**: DRY (Don't Repeat Yourself) - One service handles all account creation logic for both user types.

---

## PRE-FLIGHT CHECKLIST

See [`PHASE-2-PRE-FLIGHT-CHECKLIST.md`](./PHASE-2-PRE-FLIGHT-CHECKLIST.md) for complete verification steps.

**Critical Prerequisites:**
- ✅ Phase 1 complete (contractor authentication working)
- ✅ `contractor_users` table exists and verified
- ✅ `partner_users` table exists and verified
- ⚠️ `account_creation_audit` table does NOT exist - must create (optional but recommended)
- ⚠️ **Decision needed**: Audit trail verbosity (what to log)

---

## DATABASE SCHEMA VERIFICATION

### ✅ VERIFIED: contractor_users table (Phase 1)
```sql
-- DATABASE-CHECKED: contractor_users table verified October 27, 2025
-- ================================================================
-- VERIFIED FIELD NAMES:
-- - id (integer, NOT NULL, serial)
-- - contractor_id (integer, nullable, FOREIGN KEY)
-- - email (character varying, NOT NULL, UNIQUE)
-- - password (character varying, NOT NULL)  ⚠️ NOT "password_hash"!
-- - first_name (character varying, nullable)
-- - last_name (character varying, nullable)
-- - role (character varying, default 'contractor')
-- - is_active (boolean, default true)
-- - last_login (timestamp, nullable)
-- - reset_token (character varying, nullable)
-- - reset_token_expires (timestamp, nullable)
-- - created_at (timestamp, default NOW())
-- - updated_at (timestamp, default NOW())
-- ================================================================
```

### ✅ VERIFIED: partner_users table (Existing)
```sql
-- DATABASE-CHECKED: partner_users table verified October 27, 2025
-- ================================================================
-- VERIFIED FIELD NAMES:
-- - id (integer, NOT NULL, serial)
-- - partner_id (integer, nullable, FOREIGN KEY)
-- - email (character varying, NOT NULL, UNIQUE)
-- - password (character varying, NOT NULL)  ⚠️ NOT "password_hash"!
-- - first_name (character varying, nullable)
-- - last_name (character varying, nullable)
-- - role (character varying, default 'partner')
-- - is_active (boolean, default true)
-- - last_login (timestamp, nullable)
-- - reset_token (character varying, nullable)
-- - reset_token_expires (timestamp, nullable)
-- - created_at (timestamp, default NOW())
-- - updated_at (timestamp, default NOW())
-- ================================================================
```

### ⚠️ NEW: account_creation_audit table (Optional - To Be Created)
```sql
-- DATABASE-CHECKED: To be created in Phase 2
-- ================================================================
-- PURPOSE: Audit trail for all automatic account creation
-- ================================================================
CREATE TABLE account_creation_audit (
  id SERIAL PRIMARY KEY,
  user_type VARCHAR(20) NOT NULL,        -- 'partner' or 'contractor'
  user_id INTEGER NOT NULL,              -- partner_id or contractor_id
  user_account_id INTEGER NOT NULL,      -- partner_users.id or contractor_users.id
  email VARCHAR(255) NOT NULL,
  created_by VARCHAR(50) DEFAULT 'system', -- 'system', 'admin', 'profile_completion', etc.
  trigger_source VARCHAR(100),           -- 'partner_profile_completion', 'contractor_flow', etc.
  password_sent_via VARCHAR(50),         -- 'email', 'sms', 'manual', etc.
  success BOOLEAN NOT NULL,
  error_message TEXT,                    -- If success = false
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_account_audit_user_type ON account_creation_audit(user_type);
CREATE INDEX idx_account_audit_user_id ON account_creation_audit(user_id);
CREATE INDEX idx_account_audit_created_at ON account_creation_audit(created_at);
```

---

## IMPLEMENTATION TASKS

### TASK 1: Database Migration - Create Audit Table (1 hour)

#### 1.1 Create Migration File
**File**: `tpe-database/migrations/create-account-creation-audit-table.js`
**Purpose**: Create audit trail for account creation events

**Migration Implementation:**
```javascript
// DATABASE-CHECKED: account_creation_audit table for Phase 2
// ================================================================
// PURPOSE: Audit trail for automatic account creation
// ================================================================

require('dotenv').config({ path: './tpe-backend/.env' });
const { query } = require('../../tpe-backend/src/config/database');

async function createAccountCreationAuditTable() {
  console.log('\n🚀 CREATING ACCOUNT_CREATION_AUDIT TABLE');
  console.log('='.repeat(80));

  try {
    // ================================================================
    // TABLE: account_creation_audit
    // Purpose: Track all automatic account creation events
    // ================================================================

    console.log('\n📋 Creating account_creation_audit table...');
    await query(`
      CREATE TABLE IF NOT EXISTS account_creation_audit (
        id SERIAL PRIMARY KEY,
        user_type VARCHAR(20) NOT NULL CHECK (user_type IN ('partner', 'contractor')),
        user_id INTEGER NOT NULL,
        user_account_id INTEGER NOT NULL,
        email VARCHAR(255) NOT NULL,
        created_by VARCHAR(50) DEFAULT 'system',
        trigger_source VARCHAR(100),
        password_sent_via VARCHAR(50),
        success BOOLEAN NOT NULL,
        error_message TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('✅ account_creation_audit table created');

    // Create indexes for performance
    console.log('\n📊 Creating indexes for account_creation_audit...');

    await query(`
      CREATE INDEX IF NOT EXISTS idx_account_audit_user_type
      ON account_creation_audit(user_type);
    `);
    console.log('✅ Created index: idx_account_audit_user_type');

    await query(`
      CREATE INDEX IF NOT EXISTS idx_account_audit_user_id
      ON account_creation_audit(user_id);
    `);
    console.log('✅ Created index: idx_account_audit_user_id');

    await query(`
      CREATE INDEX IF NOT EXISTS idx_account_audit_created_at
      ON account_creation_audit(created_at);
    `);
    console.log('✅ Created index: idx_account_audit_created_at');

    // Add table comments
    console.log('\n📝 Adding table comments...');
    await query(`
      COMMENT ON TABLE account_creation_audit IS 'Audit trail for all automatic account creation events';
    `);
    console.log('✅ Table comments added');

    // Verification
    console.log('\n🔍 VERIFYING TABLE CREATION');
    console.log('='.repeat(80));

    const columnCount = await query(`
      SELECT COUNT(*) as column_count
      FROM information_schema.columns
      WHERE table_name = 'account_creation_audit';
    `);
    console.log(`\n✅ account_creation_audit: ${columnCount.rows[0].column_count} columns (expected 11)`);

    console.log('\n' + '='.repeat(80));
    console.log('✅ ACCOUNT_CREATION_AUDIT TABLE CREATED SUCCESSFULLY');
    console.log('='.repeat(80));

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }

  process.exit(0);
}

createAccountCreationAuditTable();
```

#### 1.2 Run Migration
**Commands:**
```bash
# Development database:
cd tpe-database/migrations && node create-account-creation-audit-table.js

# Production database:
# Run same script after Phase 2 testing complete
```

#### 1.3 Verify Migration
**Verification Commands:**
```bash
# Check table was created:
powershell -Command ".\quick-db.bat \"SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'account_creation_audit' ORDER BY ordinal_position;\""

# Check constraints:
powershell -Command ".\quick-db.bat \"SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'account_creation_audit'::regclass;\""

# Check indexes:
powershell -Command ".\quick-db.bat \"SELECT indexname FROM pg_indexes WHERE tablename = 'account_creation_audit';\""
```

---

### TASK 2: Build Centralized Account Creation Service (4-5 hours)

#### 2.1 Create accountCreationService.js
**File**: `tpe-backend/src/services/accountCreationService.js`
**Purpose**: Centralized service for creating both partner and contractor accounts

**Implementation:**
```javascript
// DATABASE-CHECKED: partner_users, contractor_users, contractors, strategic_partners verified October 27, 2025
// ================================================================
// VERIFIED FIELD NAMES:
// - partner_users.password (NOT password_hash)
// - contractor_users.password (NOT password_hash)
// - partner_users.is_active, contractor_users.is_active (BOOLEAN)
// - contractors.id, first_name, last_name, email
// - strategic_partners.id, primary_contact, primary_email
// ================================================================

const bcrypt = require('bcryptjs');
const { query } = require('../config/database');

/**
 * Generate secure 12-character password
 * Same pattern used in auth controllers
 */
function generateSecurePassword() {
  const length = 12;
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  let password = '';

  // Ensure at least one of each type
  password += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)]; // Uppercase
  password += 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)]; // Lowercase
  password += '0123456789'[Math.floor(Math.random() * 10)]; // Number
  password += '!@#$%^&*'[Math.floor(Math.random() * 8)]; // Special char

  // Fill remaining length
  for (let i = 4; i < length; i++) {
    password += charset[Math.floor(Math.random() * charset.length)];
  }

  // Shuffle the password
  return password.split('').sort(() => 0.5 - Math.random()).join('');
}

/**
 * Hash password with bcrypt (12 rounds)
 */
async function hashPassword(plainPassword) {
  return await bcrypt.hash(plainPassword, 12);
}

/**
 * Log account creation to audit trail
 */
async function logAccountCreation(params) {
  const {
    userType,
    userId,
    userAccountId,
    email,
    createdBy = 'system',
    triggerSource,
    passwordSentVia = null,
    success,
    errorMessage = null
  } = params;

  try {
    await query(`
      INSERT INTO account_creation_audit (
        user_type, user_id, user_account_id, email,
        created_by, trigger_source, password_sent_via,
        success, error_message, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
    `, [
      userType,
      userId,
      userAccountId,
      email,
      createdBy,
      triggerSource,
      passwordSentVia,
      success,
      errorMessage
    ]);

    console.log(`📋 Audit log created for ${userType} account: ${email}`);
  } catch (error) {
    console.error('Failed to log account creation:', error);
    // Don't throw - logging failure shouldn't block account creation
  }
}

/**
 * Check if account already exists
 */
async function accountExists(email, userType) {
  const table = userType === 'partner' ? 'partner_users' : 'contractor_users';

  try {
    const result = await query(
      `SELECT id FROM ${table} WHERE email = $1`,
      [email]
    );

    return result.rows.length > 0;
  } catch (error) {
    console.error(`Error checking if ${userType} account exists:`, error);
    throw error;
  }
}

/**
 * Create partner user account
 * @param {number} partnerId - strategic_partners.id
 * @param {string} email - Partner email
 * @param {object} options - Additional options
 * @returns {object} - { success, userId, email, password, error }
 */
async function createPartnerAccount(partnerId, email, options = {}) {
  const {
    createdBy = 'system',
    triggerSource = 'profile_completion'
  } = options;

  try {
    console.log(`🔐 Creating partner account for partner ${partnerId}`);

    // Check if account already exists
    if (await accountExists(email, 'partner')) {
      const error = 'Partner account already exists for this email';
      console.log(`⚠️  ${error}: ${email}`);

      // Log to audit (success = false, but not a critical error)
      await logAccountCreation({
        userType: 'partner',
        userId: partnerId,
        userAccountId: null,
        email,
        createdBy,
        triggerSource,
        success: false,
        errorMessage: error
      });

      return {
        success: false,
        error,
        userId: null,
        email,
        password: null
      };
    }

    // Get partner info for first_name, last_name
    const partnerResult = await query(
      'SELECT primary_contact, primary_email FROM strategic_partners WHERE id = $1',
      [partnerId]
    );

    if (partnerResult.rows.length === 0) {
      throw new Error('Partner not found');
    }

    const partner = partnerResult.rows[0];

    // Split primary_contact into first/last name (if available)
    const nameParts = partner.primary_contact?.split(' ') || [];
    const firstName = nameParts[0] || null;
    const lastName = nameParts.slice(1).join(' ') || null;

    // Generate and hash password
    const plainPassword = generateSecurePassword();
    const hashedPassword = await hashPassword(plainPassword);

    // Create partner user
    // DATABASE-CHECKED: Using exact field names
    const result = await query(`
      INSERT INTO partner_users (
        partner_id, email, password, first_name, last_name, is_active, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, true, NOW(), NOW())
      RETURNING id
    `, [partnerId, email, hashedPassword, firstName, lastName]);

    const userId = result.rows[0].id;

    console.log(`✅ Partner account created: ID ${userId}, Email ${email}`);

    // Log to audit
    await logAccountCreation({
      userType: 'partner',
      userId: partnerId,
      userAccountId: userId,
      email,
      createdBy,
      triggerSource,
      success: true
    });

    return {
      success: true,
      userId,
      partnerId,
      email,
      password: plainPassword, // Return for email sending
      error: null
    };

  } catch (error) {
    console.error('Failed to create partner account:', error);

    // Log failure to audit
    await logAccountCreation({
      userType: 'partner',
      userId: partnerId,
      userAccountId: null,
      email,
      createdBy,
      triggerSource,
      success: false,
      errorMessage: error.message
    });

    return {
      success: false,
      error: error.message,
      userId: null,
      email,
      password: null
    };
  }
}

/**
 * Create contractor user account
 * @param {number} contractorId - contractors.id
 * @param {string} email - Contractor email
 * @param {object} options - Additional options
 * @returns {object} - { success, userId, email, password, error }
 */
async function createContractorAccount(contractorId, email, options = {}) {
  const {
    createdBy = 'system',
    triggerSource = 'profile_completion'
  } = options;

  try {
    console.log(`🔐 Creating contractor account for contractor ${contractorId}`);

    // Check if account already exists
    if (await accountExists(email, 'contractor')) {
      const error = 'Contractor account already exists for this email';
      console.log(`⚠️  ${error}: ${email}`);

      // Log to audit (success = false, but not a critical error)
      await logAccountCreation({
        userType: 'contractor',
        userId: contractorId,
        userAccountId: null,
        email,
        createdBy,
        triggerSource,
        success: false,
        errorMessage: error
      });

      return {
        success: false,
        error,
        userId: null,
        email,
        password: null
      };
    }

    // Get contractor info for first_name, last_name
    const contractorResult = await query(
      'SELECT first_name, last_name FROM contractors WHERE id = $1',
      [contractorId]
    );

    if (contractorResult.rows.length === 0) {
      throw new Error('Contractor not found');
    }

    const contractor = contractorResult.rows[0];

    // Generate and hash password
    const plainPassword = generateSecurePassword();
    const hashedPassword = await hashPassword(plainPassword);

    // Create contractor user
    // DATABASE-CHECKED: Using exact field names
    const result = await query(`
      INSERT INTO contractor_users (
        contractor_id, email, password, first_name, last_name, is_active, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, true, NOW(), NOW())
      RETURNING id
    `, [contractorId, email, hashedPassword, contractor.first_name, contractor.last_name]);

    const userId = result.rows[0].id;

    console.log(`✅ Contractor account created: ID ${userId}, Email ${email}`);

    // Log to audit
    await logAccountCreation({
      userType: 'contractor',
      userId: contractorId,
      userAccountId: userId,
      email,
      createdBy,
      triggerSource,
      success: true
    });

    return {
      success: true,
      userId,
      contractorId,
      email,
      password: plainPassword, // Return for email sending
      error: null
    };

  } catch (error) {
    console.error('Failed to create contractor account:', error);

    // Log failure to audit
    await logAccountCreation({
      userType: 'contractor',
      userId: contractorId,
      userAccountId: null,
      email,
      createdBy,
      triggerSource,
      success: false,
      errorMessage: error.message
    });

    return {
      success: false,
      error: error.message,
      userId: null,
      email,
      password: null
    };
  }
}

module.exports = {
  createPartnerAccount,
  createContractorAccount,
  generateSecurePassword,
  hashPassword,
  accountExists,
  logAccountCreation
};
```

**Sub-tasks:**
- [ ] Create `accountCreationService.js`
- [ ] Implement `generateSecurePassword()`
- [ ] Implement `hashPassword()`
- [ ] Implement `accountExists()`
- [ ] Implement `logAccountCreation()`
- [ ] Implement `createPartnerAccount()`
- [ ] Implement `createContractorAccount()`
- [ ] Add comprehensive error handling
- [ ] Add DATABASE-CHECKED comment header
- [ ] Test all functions individually

---

### TASK 3: Create API Endpoints for Account Creation (1-2 hours)

#### 3.1 Create accountCreationRoutes.js
**File**: `tpe-backend/src/routes/accountCreationRoutes.js`
**Purpose**: Admin-only endpoints for manually creating accounts

**Implementation:**
```javascript
const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { protect } = require('../middleware/auth'); // Admin middleware
const { asyncHandler } = require('../middleware/errorHandler');
const {
  createPartnerAccount,
  createContractorAccount
} = require('../services/accountCreationService');

// Validation middleware
const validatePartnerAccount = [
  body('partnerId').isInt().withMessage('Valid partner ID is required'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];

const validateContractorAccount = [
  body('contractorId').isInt().withMessage('Valid contractor ID is required'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];

// Protected routes (admin only)
router.post('/partner',
  protect,
  validatePartnerAccount,
  asyncHandler(async (req, res) => {
    const { partnerId, email } = req.body;

    const result = await createPartnerAccount(partnerId, email, {
      createdBy: 'admin',
      triggerSource: 'manual_admin_creation'
    });

    if (result.success) {
      res.status(201).json({
        success: true,
        message: 'Partner account created successfully',
        userId: result.userId,
        email: result.email,
        password: result.password // Only return via API, not email yet
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.error
      });
    }
  })
);

router.post('/contractor',
  protect,
  validateContractorAccount,
  asyncHandler(async (req, res) => {
    const { contractorId, email } = req.body;

    const result = await createContractorAccount(contractorId, email, {
      createdBy: 'admin',
      triggerSource: 'manual_admin_creation'
    });

    if (result.success) {
      res.status(201).json({
        success: true,
        message: 'Contractor account created successfully',
        userId: result.userId,
        email: result.email,
        password: result.password // Only return via API, not email yet
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.error
      });
    }
  })
);

module.exports = router;
```

#### 3.2 Register Routes in server.js
**File**: `tpe-backend/src/server.js`

**Add these lines:**
```javascript
// Account creation routes (admin only)
const accountCreationRoutes = require('./routes/accountCreationRoutes');
app.use('/api/account-creation', accountCreationRoutes);
```

**Sub-tasks:**
- [ ] Create `accountCreationRoutes.js`
- [ ] Add validation middleware
- [ ] Add routes to `server.js`
- [ ] Verify routes are registered
- [ ] Test with curl (admin token required)

---

### TASK 4: Unit Testing (2-3 hours)

#### 4.1 Test Account Creation Service
**Test File**: `tpe-backend/tests/accountCreationService.test.js`

**Test Scenarios:**
```javascript
// Test 1: Generate secure password
// - Should be 12 characters
// - Should contain uppercase, lowercase, number, symbol
// - Should be different each time

// Test 2: Hash password
// - Should return bcrypt hash
// - Should be different from plain password
// - Should verify with bcrypt.compare()

// Test 3: Account exists check
// - Should return true for existing email
// - Should return false for non-existing email

// Test 4: Create partner account
// - Should create account successfully
// - Should return password
// - Should log to audit
// - Should prevent duplicates

// Test 5: Create contractor account
// - Should create account successfully
// - Should return password
// - Should log to audit
// - Should prevent duplicates

// Test 6: Error handling
// - Should handle missing partner/contractor
// - Should handle database errors
// - Should log failures to audit
```

#### 4.2 Manual API Testing
**Test Commands:**
```bash
# Get admin token first
ADMIN_TOKEN=$(curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@power100.io","password":"admin123"}' | jq -r '.token')

# Test create partner account
curl -X POST http://localhost:5000/api/account-creation/partner \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"partnerId": 1, "email": "newpartner@test.com"}'

# Test create contractor account
curl -X POST http://localhost:5000/api/account-creation/contractor \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"contractorId": 168, "email": "newcontractor@test.com"}'

# Test duplicate prevention
curl -X POST http://localhost:5000/api/account-creation/contractor \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"contractorId": 168, "email": "test@contractor.com"}'
# Expected: "Contractor account already exists for this email"
```

#### 4.3 Database Verification
**Verify Commands:**
```bash
# Check accounts were created
powershell -Command ".\quick-db.bat \"SELECT id, email, created_at FROM contractor_users ORDER BY created_at DESC LIMIT 5;\""

# Check audit log
powershell -Command ".\quick-db.bat \"SELECT user_type, email, success, trigger_source, created_at FROM account_creation_audit ORDER BY created_at DESC LIMIT 10;\""

# Verify no duplicate accounts
powershell -Command ".\quick-db.bat \"SELECT email, COUNT(*) FROM contractor_users GROUP BY email HAVING COUNT(*) > 1;\""
powershell -Command ".\quick-db.bat \"SELECT email, COUNT(*) FROM partner_users GROUP BY email HAVING COUNT(*) > 1;\""
```

**Sub-tasks:**
- [ ] Create test file with all scenarios
- [ ] Run unit tests and verify all pass
- [ ] Test API endpoints with curl
- [ ] Verify database state after each test
- [ ] Test duplicate prevention
- [ ] Test error scenarios
- [ ] Verify audit log entries

---

## DELIVERABLES

### Backend ✅
- `account_creation_audit` table migration
- `accountCreationService.js` with all core functions
- `accountCreationRoutes.js` with admin-only endpoints
- Comprehensive error handling
- Duplicate prevention logic
- Audit trail logging

### Testing ✅
- Unit tests for all service functions
- API endpoint tests with curl
- Database verification queries
- Audit log verification

### Documentation ✅
- Phase 2 implementation plan (this document)
- Phase 2 pre-flight checklist
- API endpoint documentation
- Database schema documentation

---

## SUCCESS CRITERIA

### Must Have ✅
- [ ] `account_creation_audit` table created successfully
- [ ] `createPartnerAccount()` creates accounts and prevents duplicates
- [ ] `createContractorAccount()` creates accounts and prevents duplicates
- [ ] Passwords are secure (12+ chars, mixed case, numbers, symbols)
- [ ] All account creation logged to audit trail
- [ ] Duplicate accounts prevented
- [ ] Error handling doesn't block account creation

### Nice to Have
- [ ] Admin dashboard UI for manual account creation (future phase)
- [ ] Bulk account creation endpoint (future enhancement)
- [ ] Account creation metrics/analytics (future enhancement)

### Phase 2 Complete When:
- [ ] All "Must Have" criteria met
- [ ] All tests passing
- [ ] Documentation complete
- [ ] Ready for Phase 3 integration (profile completion triggers)

---

## NEXT STEPS (Phase 3)

After Phase 2 is complete:
1. Integrate `createPartnerAccount()` with partner profile completion
2. Integrate `createContractorAccount()` with contractor flow completion
3. Integrate `createContractorAccount()` with event profile completion
4. Test end-to-end flows
5. Proceed to Phase 4 (welcome emails)

---

**Document Created**: October 27, 2025
**Status**: Ready to Begin
**Estimated Completion**: 8-12 hours
**Prerequisites**: Phase 1 Complete ✅
