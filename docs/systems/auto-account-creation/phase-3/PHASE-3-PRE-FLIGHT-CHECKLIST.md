# Phase 3: Pre-Flight Checklist - Profile Completion Integration

**Document Version:** 1.0
**Date:** October 27, 2025
**Status:** MANDATORY - Use before creating or modifying ANY file

---

## 🎯 Purpose

This checklist ensures 100% database alignment and consistency when integrating account creation with profile completion flows. Phase 3 connects the centralized service (Phase 2) with real user workflows for partners, contractors, and event registrations.

**Critical Principle**: Account creation must be **invisible** to users. Profile completion should never fail because of account creation issues. Always check database field names before coding.

---

## ✅ DATABASE VERIFICATION COMPLETED - October 27, 2025

### All Field Names Verified Against Database:

**✅ strategic_partners table:**
```
VERIFIED FIELD NAMES:
- id (integer)
- primary_email (character varying) ⚠️ NOT contact_email!
- company_name (character varying)
- primary_contact (character varying)

⚠️ CRITICAL NOTE: No profile_completed_at or profile_complete field exists!
Profile completeness MUST be determined by business logic (checking required fields).
```

**✅ contractors table:**
```
VERIFIED FIELD NAMES:
- id (integer)
- email (character varying, UNIQUE)
- first_name (character varying)
- last_name (character varying)
- lifecycle_stage (character varying)

⚠️ CRITICAL NOTE: No profile_completed_at or profile_complete field exists!
Profile completeness MUST be determined by business logic (checking required fields).
```

**✅ contractor_event_registrations table:**
```
VERIFIED FIELD NAMES:
- id (integer)
- contractor_id (integer, foreign key)
- event_id (integer, foreign key)
- event_status (character varying)
- created_at (timestamp)

⚠️ CRITICAL NOTE: No profile_completed field exists!
Registration existence indicates event participation, but profile completeness must be checked in contractors table.
```

**✅ partner_users table (from Phase 1):**
```
VERIFIED FIELD NAMES:
- id (integer)
- partner_id (integer, foreign key)
- email (character varying, UNIQUE)
- is_active (boolean) ⚠️ BOOLEAN not string!
```

**✅ contractor_users table (from Phase 1):**
```
VERIFIED FIELD NAMES:
- id (integer)
- contractor_id (integer, foreign key)
- email (character varying, UNIQUE)
- is_active (boolean) ⚠️ BOOLEAN not string!
```

---

## ✅ MANDATORY CHECKLIST - Before Creating/Modifying ANY File

### Step 1: Identify Integration Points

**Question:** Which profile completion flows will trigger account creation?

**Phase 3 Integration Points:**
- **Partner Profile Completion** - `strategic_partners` table update
- **Contractor Flow Completion** - `contractors` table insert/update
- **Event Registration** - `contractor_event_registrations` table insert

**Action:** List which controllers/endpoints will be modified.

---

### Step 2: Verify Column Names (Field Names)

**For EACH integration point, verify field names:**

```bash
# Partner profile completion - verify strategic_partners:
powershell -Command ".\quick-db.bat \"SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'strategic_partners' AND column_name IN ('id', 'primary_email', 'company_name', 'primary_contact') ORDER BY ordinal_position;\""

# Contractor flow completion - verify contractors:
powershell -Command ".\quick-db.bat \"SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'contractors' AND column_name IN ('id', 'email', 'first_name', 'last_name', 'lifecycle_stage') ORDER BY ordinal_position;\""

# Event registration - verify contractor_event_registrations:
powershell -Command ".\quick-db.bat \"SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'contractor_event_registrations' AND column_name IN ('id', 'contractor_id', 'event_id', 'event_status', 'created_at') ORDER BY ordinal_position;\""

# Account existence checks - verify partner_users and contractor_users:
powershell -Command ".\quick-db.bat \"SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'partner_users' AND column_name IN ('id', 'partner_id', 'email', 'is_active') ORDER BY ordinal_position;\""
powershell -Command ".\quick-db.bat \"SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'contractor_users' AND column_name IN ('id', 'contractor_id', 'email', 'is_active') ORDER BY ordinal_position;\""
```

**Action:** Document exact column names from database output.

---

### Step 3: Critical Field Names for Phase 3

**⚠️ MOST COMMON MISTAKES IN PHASE 3:**

```javascript
// ❌ WRONG - Assuming profile completeness fields exist:
if (partner.profile_completed) { ... }          // Field doesn't exist!
if (contractor.profile_completed_at) { ... }    // Field doesn't exist!

// ✅ CORRECT - Check required fields instead:
function checkProfileCompleteness(data) {
  const requiredFields = ['company_name', 'primary_email', 'primary_contact'];
  return requiredFields.every(field => data[field] && data[field].trim().length > 0);
}

// ❌ WRONG - Using wrong email field name:
const email = partner.contact_email;            // Field is "primary_email" not "contact_email"

// ✅ CORRECT - Using verified field name:
const email = partner.primary_email;            // Matches database exactly
```

**CRITICAL FIELD NAMING RULES FOR PHASE 3:**
- ✅ Use `primary_email` NOT `contact_email` (for partners)
- ✅ Use `primary_contact` NOT `contact_name` (for partners)
- ✅ Use `first_name`, `last_name` NOT `firstName`, `lastName` (snake_case)
- ✅ NO `profile_completed` field exists - use business logic instead
- ✅ Check account existence with `SELECT id FROM partner_users WHERE partner_id = $1`

---

### Step 4: Profile Completeness Logic

**Since NO profile_completed fields exist, define completeness logic:**

#### Partner Profile Completeness
```javascript
function isPartnerProfileComplete(partnerData) {
  // Define required fields based on business requirements
  const requiredFields = [
    'company_name',
    'primary_email',
    'primary_contact'
    // Add other required fields as needed
  ];

  // Check all required fields are present and non-empty
  return requiredFields.every(field => {
    return partnerData[field] &&
           typeof partnerData[field] === 'string' &&
           partnerData[field].trim().length > 0;
  });
}
```

#### Contractor Profile Completeness
```javascript
function isContractorProfileComplete(contractorData) {
  // Define required fields based on business requirements
  const requiredFields = [
    'first_name',
    'last_name',
    'email',
    'company_name',
    'focus_areas'  // May be JSON array
  ];

  // Check all required fields are present and non-empty
  return requiredFields.every(field => {
    const value = contractorData[field];
    if (!value) return false;

    // Handle arrays (like focus_areas)
    if (Array.isArray(value)) return value.length > 0;

    // Handle strings
    if (typeof value === 'string') return value.trim().length > 0;

    return true;
  });
}
```

**Action:** Define completeness logic BEFORE implementing integration.

---

### Step 5: Account Existence Check Queries

**Phase 3 Integration Pattern:**

```javascript
// DATABASE-CHECKED: partner_users, contractor_users verified October 27, 2025
// ================================================================
// VERIFIED FIELD NAMES:
// - partner_users: id, partner_id, email
// - contractor_users: id, contractor_id, email
// ================================================================

// Check if partner account exists:
const partnerAccountExists = await query(`
  SELECT id FROM partner_users WHERE partner_id = $1
`, [partnerId]);

// Check if contractor account exists:
const contractorAccountExists = await query(`
  SELECT id FROM contractor_users WHERE contractor_id = $1
`, [contractorId]);

// Only create if NOT exists:
if (partnerAccountExists.rows.length === 0) {
  await createPartnerAccount(partnerId, email, { ... });
}
```

---

### Step 6: Error Handling Pattern

**CRITICAL**: Account creation errors must NOT block profile completion!

```javascript
// ✅ CORRECT error handling pattern:
try {
  // 1. Complete profile operation (MUST succeed)
  await updatePartnerProfile(partnerId, profileData);

  // 2. Try to create account (errors logged but don't throw)
  if (isProfileComplete && !accountExists) {
    try {
      const result = await createPartnerAccount(partnerId, email, { ... });

      if (result.success) {
        console.log(`✅ Account created for partner ${partnerId}`);
      } else {
        console.warn(`⚠️ Account creation failed: ${result.error}`);
        // Don't throw - just log the warning
      }
    } catch (accountError) {
      console.error(`❌ Account creation error:`, accountError);
      // Don't throw - just log the error
    }
  }

  // 3. Return success (profile updated, account creation attempted)
  res.status(200).json({ success: true, message: 'Profile updated' });

} catch (error) {
  // Only throw if profile update itself failed
  console.error('Profile update error:', error);
  res.status(500).json({ success: false, message: 'Profile update failed' });
}
```

**Action:** Ensure error handling follows this pattern in ALL integration points.

---

### Step 7: Document Findings BEFORE Coding

**Create verification blocks for EACH integration file:**

```javascript
// DATABASE-CHECKED: strategic_partners, partner_users verified October 27, 2025
// ================================================================
// INTEGRATION POINT: Partner Profile Completion
// ================================================================
// VERIFIED FIELD NAMES:
// - strategic_partners: id, primary_email, company_name, primary_contact
// - partner_users: id, partner_id, email, is_active
// ================================================================
// PROFILE COMPLETENESS:
// - No profile_completed field exists
// - Completeness determined by: company_name, primary_email, primary_contact filled
// ================================================================
// ERROR HANDLING:
// - Account creation errors MUST NOT block profile completion
// - Log errors but return success response
// ================================================================
```

---

## 🚨 Red Flags - STOP and Verify

If you see ANY of these in Phase 3, STOP and run verification queries:

1. **Assuming profile_completed field exists** → Verify table schema
   ```javascript
   if (partner.profile_completed) { ... }  // ⚠️ STOP! Field doesn't exist
   ```

2. **Using wrong email field name** → Verify strategic_partners fields
   ```javascript
   const email = partner.contact_email;    // ⚠️ STOP! It's "primary_email"
   ```

3. **Blocking profile completion on account error** → Verify error handling
   ```javascript
   throw new Error('Account creation failed'); // ⚠️ STOP! Don't throw in account creation
   ```

4. **Not checking account existence** → Verify before creating
   ```javascript
   await createPartnerAccount(...);         // ⚠️ STOP! Check if exists first
   ```

5. **Using string for boolean** → Verify data type
   ```javascript
   is_active: 'true'                       // ⚠️ STOP! Should be boolean true
   ```

---

## 📋 Quick Reference Commands

### Check Partner Profile Fields
```bash
powershell -Command ".\quick-db.bat \"SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'strategic_partners' AND column_name IN ('id', 'primary_email', 'company_name', 'primary_contact') ORDER BY ordinal_position;\""
```

### Check Contractor Profile Fields
```bash
powershell -Command ".\quick-db.bat \"SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'contractors' AND column_name IN ('id', 'email', 'first_name', 'last_name', 'lifecycle_stage') ORDER BY ordinal_position;\""
```

### Check Event Registration Fields
```bash
powershell -Command ".\quick-db.bat \"SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'contractor_event_registrations' AND column_name IN ('id', 'contractor_id', 'event_id', 'event_status') ORDER BY ordinal_position;\""
```

### Check Account Existence
```bash
# Check if partner account exists:
powershell -Command ".\quick-db.bat \"SELECT id FROM partner_users WHERE partner_id = 3;\""

# Check if contractor account exists:
powershell -Command ".\quick-db.bat \"SELECT id FROM contractor_users WHERE contractor_id = 168;\""
```

### Verify Audit Log
```bash
powershell -Command ".\quick-db.bat \"SELECT user_type, user_id, email, success, trigger_source, created_at FROM account_creation_audit ORDER BY created_at DESC LIMIT 10;\""
```

---

## ✅ Example: Integrating Partner Profile Completion

### Pre-Flight Verification:

**1. Tables Involved:**
- `strategic_partners` (for profile data)
- `partner_users` (for account existence check)

**2. Column Names Verified:**
```sql
-- strategic_partners columns:
id, primary_email, company_name, primary_contact

-- partner_users columns:
id, partner_id, email, is_active
```

**3. No Profile Completion Fields:**
```bash
# Verified: No profile_completed or profile_completed_at field exists
# Must use business logic to determine completeness
```

**4. Profile Completeness Logic:**
```javascript
const requiredFields = ['company_name', 'primary_email', 'primary_contact'];
const isComplete = requiredFields.every(f => data[f] && data[f].trim().length > 0);
```

**5. Account Existence Check:**
```javascript
const exists = await query(`SELECT id FROM partner_users WHERE partner_id = $1`, [partnerId]);
```

**6. Documentation Block:**
```javascript
// DATABASE-CHECKED: strategic_partners, partner_users verified October 27, 2025
// ================================================================
// INTEGRATION POINT: Partner Profile Completion
// VERIFIED FIELD NAMES:
// - strategic_partners: primary_email (NOT contact_email!)
// - partner_users: partner_id, email, is_active
// PROFILE COMPLETENESS: company_name, primary_email, primary_contact
// ERROR HANDLING: Don't throw on account creation error
// ================================================================
```

**NOW WE CAN CODE INTEGRATION SAFELY!**

---

## 📚 Phase 3 Specific Verification Notes

### Integration Points Checklist
- [ ] Locate partner profile update endpoint in `partnerController.js`
- [ ] Locate contractor flow completion endpoint in `contractorController.js`
- [ ] Locate event registration endpoint in `eventController.js`
- [ ] Verify Phase 2 account creation service is working
- [ ] Define profile completeness logic for each integration point
- [ ] Plan error handling strategy (log but don't block)

### Testing Checklist
- [ ] Test partner profile completion → account created
- [ ] Test contractor flow completion → account created
- [ ] Test event registration → account created
- [ ] Test duplicate prevention (account already exists)
- [ ] Test error handling (service unavailable, etc.)
- [ ] Verify audit logs for all scenarios

### Error Handling Checklist
- [ ] Account creation errors logged but don't throw
- [ ] Profile completion succeeds regardless of account creation
- [ ] Audit trail captures both success and failure cases
- [ ] User never sees account creation errors
- [ ] Admin can monitor account creation failures via audit log

---

## 🚨 Phase 3 Critical Gotchas

### 1. No Profile Completion Fields Exist
```javascript
// ❌ WRONG - Field doesn't exist:
if (partner.profile_completed) {
  await createAccount();
}

// ✅ CORRECT - Use business logic:
if (isPartnerProfileComplete(partnerData)) {
  await createAccount();
}
```

### 2. Wrong Email Field Name for Partners
```javascript
// ❌ WRONG:
const email = partner.contact_email;
const email = partner.partner_email;

// ✅ CORRECT:
const email = partner.primary_email;
```

### 3. Blocking Profile Completion on Account Error
```javascript
// ❌ WRONG - Throws and blocks profile completion:
const result = await createPartnerAccount(...);
if (!result.success) {
  throw new Error('Account creation failed');
}

// ✅ CORRECT - Logs but doesn't throw:
try {
  const result = await createPartnerAccount(...);
  if (!result.success) {
    console.warn('Account creation failed:', result.error);
  }
} catch (error) {
  console.error('Account creation error:', error);
}
// Continue with profile completion success
```

### 4. Not Checking Account Existence First
```javascript
// ❌ WRONG - Creates duplicate:
await createPartnerAccount(partnerId, email);

// ✅ CORRECT - Checks first:
const exists = await query(`SELECT id FROM partner_users WHERE partner_id = $1`, [partnerId]);
if (exists.rows.length === 0) {
  await createPartnerAccount(partnerId, email);
}
```

### 5. Wrong Data Types in Queries
```javascript
// ❌ WRONG - String instead of integer:
WHERE partner_id = '3'

// ✅ CORRECT - Integer:
WHERE partner_id = $1`, [3]
```

---

## 📚 Related Documents

- **Phase 3 Implementation Plan:** `PHASE-3-IMPLEMENTATION-PLAN.md` (same directory)
- **Phase 2 Completion Report:** `../phase-2/PHASE-2-COMPLETION.md`
- **Phase 1 Completion Report:** `../phase-1/PHASE-1-COMPLETION.md`
- **Auto-Account Creation Overview:** `../AUTO-ACCOUNT-CREATION-OVERVIEW.md`
- **Database Source of Truth:** `DATABASE-SOURCE-OF-TRUTH.md` (project root)

---

**Last Updated:** October 27, 2025
**Next Review:** Before starting Phase 3 Task 1 (partner integration)
**Status:** MANDATORY - Use this checklist before ANY Phase 3 development

---

## 🎯 Quick Start for Phase 3

**Before modifying ANY controller, run these 5 commands:**

```bash
# 1. Verify strategic_partners fields
powershell -Command ".\quick-db.bat \"SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'strategic_partners' AND column_name IN ('id', 'primary_email', 'company_name', 'primary_contact') ORDER BY ordinal_position;\""

# 2. Verify contractors fields
powershell -Command ".\quick-db.bat \"SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'contractors' AND column_name IN ('id', 'email', 'first_name', 'last_name', 'lifecycle_stage') ORDER BY ordinal_position;\""

# 3. Verify contractor_event_registrations fields
powershell -Command ".\quick-db.bat \"SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'contractor_event_registrations' AND column_name IN ('id', 'contractor_id', 'event_id', 'event_status') ORDER BY ordinal_position;\""

# 4. Verify partner_users account structure
powershell -Command ".\quick-db.bat \"SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'partner_users' AND column_name IN ('id', 'partner_id', 'email', 'is_active') ORDER BY ordinal_position;\""

# 5. Verify contractor_users account structure
powershell -Command ".\quick-db.bat \"SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'contractor_users' AND column_name IN ('id', 'contractor_id', 'email', 'is_active') ORDER BY ordinal_position;\""
```

**Document results, define profile completeness logic, then code safely!**

---

## ✅ VERIFICATION SUMMARY - October 27, 2025

**All field names in Phase 3 integration points have been verified against the database:**

✅ **strategic_partners**: `id`, `primary_email`, `company_name`, `primary_contact` - VERIFIED
✅ **contractors**: `id`, `email`, `first_name`, `last_name`, `lifecycle_stage` - VERIFIED
✅ **contractor_event_registrations**: `id`, `contractor_id`, `event_id`, `event_status` - VERIFIED
✅ **partner_users**: `id`, `partner_id`, `email`, `is_active` - VERIFIED
✅ **contractor_users**: `id`, `contractor_id`, `email`, `is_active` - VERIFIED

⚠️ **CRITICAL FINDING**: No `profile_completed` or `profile_completed_at` fields exist in any table. Profile completeness MUST be determined by business logic.

**Phase 3 integration plan is 100% aligned with database schema.**
**Ready to begin Phase 3 development.**

---

**END OF PHASE 3 PRE-FLIGHT CHECKLIST**
