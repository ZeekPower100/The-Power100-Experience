# PHASE 3 - Profile Completion Integration
## Implementation Plan

**Timeline**: Week 3 (6-8 hours)
**Priority**: HIGH
**Status**: Ready to Begin
**Prerequisites**: ✅ Phase 1 Complete, ✅ Phase 2 Complete

---

## OBJECTIVE

Integrate the centralized account creation service with three profile completion flows so that accounts are automatically created when users complete their profiles. This phase connects the backend service (Phase 2) with real user workflows.

**Key Principle**: Account creation should be **invisible** to the user. When they complete their profile, the account is created automatically in the background. Errors should be logged but never block the profile completion flow.

---

## PRE-FLIGHT CHECKLIST

See [`PHASE-3-PRE-FLIGHT-CHECKLIST.md`](./PHASE-3-PRE-FLIGHT-CHECKLIST.md) for complete verification steps.

**Critical Prerequisites:**
- ✅ Phase 1 complete (contractor authentication working)
- ✅ Phase 2 complete (account creation service working)
- ⚠️ **Decision needed**: Profile completion trigger logic
- ⚠️ **Decision needed**: Error handling behavior (log vs alert)

---

## DATABASE SCHEMA VERIFICATION

### ✅ VERIFIED: strategic_partners table (October 27, 2025)
```sql
-- DATABASE-CHECKED: strategic_partners table verified October 27, 2025
-- ================================================================
-- VERIFIED FIELD NAMES (relevant for profile completion):
-- - id (integer, NOT NULL, serial)
-- - primary_email (character varying) ⚠️ NOT contact_email!
-- - company_name (character varying)
-- - primary_contact (character varying)
-- ================================================================
-- NOTE: No profile_completed_at or profile_complete field exists
-- Profile completeness must be determined by business logic
-- ================================================================
```

### ✅ VERIFIED: contractors table (October 27, 2025)
```sql
-- DATABASE-CHECKED: contractors table verified October 27, 2025
-- ================================================================
-- VERIFIED FIELD NAMES (relevant for profile completion):
-- - id (integer, NOT NULL, serial)
-- - email (character varying, UNIQUE)
-- - first_name (character varying)
-- - last_name (character varying)
-- - lifecycle_stage (character varying) - values: 'onboarding', 'active', 'power_user', 'at_risk', 'churned'
-- ================================================================
-- NOTE: No profile_completed_at or profile_complete field exists
-- Profile completeness must be determined by business logic
-- ================================================================
```

### ✅ VERIFIED: contractor_event_registrations table (October 27, 2025)
```sql
-- DATABASE-CHECKED: contractor_event_registrations table verified October 27, 2025
-- ================================================================
-- VERIFIED FIELD NAMES:
-- - id (integer, NOT NULL, serial)
-- - contractor_id (integer, foreign key to contractors.id)
-- - event_id (integer, foreign key to events.id)
-- - event_status (character varying)
-- - created_at (timestamp)
-- ================================================================
-- NOTE: No profile_completed field exists
-- Profile completeness must be determined by business logic
-- ================================================================
```

### ✅ VERIFIED: partner_users & contractor_users tables (From Phase 1)
```sql
-- Both tables have same structure for existence checking:
-- - id (integer)
-- - partner_id / contractor_id (integer, foreign key)
-- - email (character varying, UNIQUE)
-- - is_active (boolean) ⚠️ BOOLEAN, NOT string!
```

---

## INTEGRATION POINTS

### Integration Point 1: Partner Profile Completion ⚠️ HIGHEST PRIORITY
**Location**: `/partner-portal/profile/page.tsx`
**Trigger**: When partner submits complete profile form
**Action**: Call `createPartnerAccount(partnerId, email)`

#### Profile Completion Logic
Since there's NO `profile_completed` field in strategic_partners, we determine completeness by:
- ✅ All required fields are filled (company_name, primary_contact, primary_email, etc.)
- ✅ Profile form submission is successful
- ✅ Partner data is saved to database

#### Integration Flow
```
1. User fills out partner profile form
2. Form validates all required fields
3. Form submits to backend API (e.g., PUT /api/partners/:id)
4. Backend saves partner data to strategic_partners table
5. **NEW**: Backend checks if partner_users account exists
6. **NEW**: If not exists, call accountCreationService.createPartnerAccount()
7. **NEW**: Log result (success or failure) to audit trail
8. Return success response to frontend (account creation happens in background)
```

### Integration Point 2: Contractor Flow Completion
**Location**: `/contractorflow/page.tsx`
**Trigger**: When contractor completes step 5 (final step)
**Action**: Call `createContractorAccount(contractorId, email)`

#### Profile Completion Logic
Since there's NO `profile_completed` field in contractors, we determine completeness by:
- ✅ Contractor reaches step 5 (completion step)
- ✅ All required contractor data is saved (name, email, company, focus areas, etc.)
- ✅ Contractor data is in database with lifecycle_stage = 'active' (or 'onboarding')

#### Integration Flow
```
1. Contractor progresses through 5-step flow
2. Step 5: Final data submission
3. Frontend calls backend API (e.g., POST /api/contractors or PATCH /api/contractors/:id)
4. Backend saves contractor data to contractors table
5. **NEW**: Backend checks if contractor_users account exists
6. **NEW**: If not exists, call accountCreationService.createContractorAccount()
7. **NEW**: Log result (success or failure) to audit trail
8. Return success response to frontend (account creation happens in background)
```

### Integration Point 3: Event Profile Completion (Contractors at Events)
**Location**: Event registration flow (likely `/events/[eventId]/page.tsx`)
**Trigger**: When contractor registers for an event AND completes their profile
**Action**: Call `createContractorAccount(contractorId, email)`

#### Profile Completion Logic
Since there's NO `profile_completed` field in contractor_event_registrations, we determine completeness by:
- ✅ Contractor successfully registers for event
- ✅ Record created in contractor_event_registrations table
- ✅ Contractor profile in contractors table has all required fields

#### Integration Flow
```
1. Contractor registers for an event
2. Frontend/backend creates contractor record (if new) in contractors table
3. Frontend/backend creates registration record in contractor_event_registrations table
4. **NEW**: Backend checks if contractor_users account exists
5. **NEW**: If not exists, call accountCreationService.createContractorAccount()
6. **NEW**: Log result (success or failure) to audit trail
7. Return success response to frontend (account creation happens in background)
```

---

## IMPLEMENTATION TASKS

### TASK 1: Backend Integration - Partner Profile Completion (2-3 hours)

#### 1.1 Identify Partner Profile Update Endpoint
**Location**: Likely `tpe-backend/src/controllers/partnerController.js` or similar
**Find the endpoint**: PUT/PATCH `/api/partners/:id` or similar

**Action**: Add account creation logic after successful profile update

#### 1.2 Add Account Creation Logic to Partner Controller
**Pseudo-code**:
```javascript
// DATABASE-CHECKED: strategic_partners, partner_users verified October 27, 2025
// ================================================================
// VERIFIED FIELD NAMES:
// - strategic_partners: id, primary_email (NOT contact_email!)
// - partner_users: id, partner_id, email, is_active
// ================================================================

const { createPartnerAccount } = require('../services/accountCreationService');

// In the partner update/create handler:
async function updatePartnerProfile(req, res) {
  try {
    // 1. Update partner profile (existing logic)
    const partnerId = req.params.id;
    const profileData = req.body;

    // Update strategic_partners table
    await query(`
      UPDATE strategic_partners
      SET /* updated fields */
      WHERE id = $1
    `, [partnerId]);

    // 2. Check if profile is complete
    const isProfileComplete = checkProfileCompleteness(profileData);

    if (isProfileComplete) {
      // 3. Check if partner_users account already exists
      const accountExists = await query(`
        SELECT id FROM partner_users WHERE partner_id = $1
      `, [partnerId]);

      // 4. Create account if it doesn't exist
      if (accountExists.rows.length === 0) {
        const email = profileData.primary_email || profileData.email;

        try {
          const result = await createPartnerAccount(partnerId, email, {
            createdBy: 'system',
            triggerSource: 'partner_profile_completion'
          });

          if (result.success) {
            console.log(`✅ Account created for partner ${partnerId}`);
            // NOTE: Password is in result.password (for Phase 4 email)
          } else {
            console.warn(`⚠️ Account creation failed for partner ${partnerId}: ${result.error}`);
          }
        } catch (error) {
          // Don't throw - log error but don't block profile completion
          console.error(`❌ Account creation error for partner ${partnerId}:`, error);
        }
      }
    }

    // 5. Return success (regardless of account creation result)
    res.status(200).json({
      success: true,
      message: 'Profile updated successfully'
    });

  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({
      success: false,
      message: 'Profile update failed'
    });
  }
}

// Helper function to determine profile completeness
function checkProfileCompleteness(profileData) {
  // Define required fields
  const requiredFields = ['company_name', 'primary_email', 'primary_contact'];

  // Check if all required fields are present and non-empty
  return requiredFields.every(field => {
    return profileData[field] && profileData[field].trim().length > 0;
  });
}
```

**Sub-tasks:**
- [ ] Locate partner profile update endpoint
- [ ] Add `checkProfileCompleteness()` helper function
- [ ] Add account existence check
- [ ] Add `createPartnerAccount()` call with error handling
- [ ] Test with curl or Postman
- [ ] Verify audit log entry created

---

### TASK 2: Backend Integration - Contractor Flow Completion (2-3 hours)

#### 2.1 Identify Contractor Flow Completion Endpoint
**Location**: Likely `tpe-backend/src/controllers/contractorController.js` or similar
**Find the endpoint**: POST/PATCH `/api/contractors` or similar

**Action**: Add account creation logic after contractor completes flow

#### 2.2 Add Account Creation Logic to Contractor Controller
**Pseudo-code**:
```javascript
// DATABASE-CHECKED: contractors, contractor_users verified October 27, 2025
// ================================================================
// VERIFIED FIELD NAMES:
// - contractors: id, email, first_name, last_name, lifecycle_stage
// - contractor_users: id, contractor_id, email, is_active
// ================================================================

const { createContractorAccount } = require('../services/accountCreationService');

// In the contractor creation/update handler:
async function completeContractorFlow(req, res) {
  try {
    // 1. Save contractor data (existing logic)
    const contractorData = req.body;

    // Insert or update contractors table
    const result = await query(`
      INSERT INTO contractors (first_name, last_name, email, /* other fields */)
      VALUES ($1, $2, $3, /* other values */)
      ON CONFLICT (email) DO UPDATE SET /* updated fields */
      RETURNING id
    `, [/* values */]);

    const contractorId = result.rows[0].id;

    // 2. Check if this is a completed profile (step 5 or all required fields present)
    const isComplete = req.body.step === 5 || checkContractorCompleteness(contractorData);

    if (isComplete) {
      // 3. Check if contractor_users account already exists
      const accountExists = await query(`
        SELECT id FROM contractor_users WHERE contractor_id = $1
      `, [contractorId]);

      // 4. Create account if it doesn't exist
      if (accountExists.rows.length === 0) {
        const email = contractorData.email;

        try {
          const accountResult = await createContractorAccount(contractorId, email, {
            createdBy: 'system',
            triggerSource: 'contractor_flow_completion'
          });

          if (accountResult.success) {
            console.log(`✅ Account created for contractor ${contractorId}`);
            // NOTE: Password is in accountResult.password (for Phase 4 email)
          } else {
            console.warn(`⚠️ Account creation failed for contractor ${contractorId}: ${accountResult.error}`);
          }
        } catch (error) {
          // Don't throw - log error but don't block flow completion
          console.error(`❌ Account creation error for contractor ${contractorId}:`, error);
        }
      }
    }

    // 5. Return success (regardless of account creation result)
    res.status(200).json({
      success: true,
      contractorId,
      message: 'Contractor flow completed successfully'
    });

  } catch (error) {
    console.error('Contractor flow error:', error);
    res.status(500).json({
      success: false,
      message: 'Contractor flow failed'
    });
  }
}

// Helper function to determine contractor completeness
function checkContractorCompleteness(contractorData) {
  // Define required fields
  const requiredFields = ['first_name', 'last_name', 'email', 'company_name', 'focus_areas'];

  // Check if all required fields are present and non-empty
  return requiredFields.every(field => {
    return contractorData[field] &&
           (typeof contractorData[field] === 'string' ? contractorData[field].trim().length > 0 : true);
  });
}
```

**Sub-tasks:**
- [ ] Locate contractor flow completion endpoint
- [ ] Add `checkContractorCompleteness()` helper function
- [ ] Add account existence check
- [ ] Add `createContractorAccount()` call with error handling
- [ ] Test with contractor flow frontend
- [ ] Verify audit log entry created

---

### TASK 3: Backend Integration - Event Profile Completion (1-2 hours)

#### 3.1 Identify Event Registration Endpoint
**Location**: Likely `tpe-backend/src/controllers/eventController.js` or similar
**Find the endpoint**: POST `/api/events/:eventId/register` or similar

**Action**: Add account creation logic after event registration

#### 3.2 Add Account Creation Logic to Event Controller
**Pseudo-code**:
```javascript
// DATABASE-CHECKED: contractors, contractor_users, contractor_event_registrations verified October 27, 2025
// ================================================================
// VERIFIED FIELD NAMES:
// - contractors: id, email, first_name, last_name
// - contractor_users: id, contractor_id, email, is_active
// - contractor_event_registrations: id, contractor_id, event_id, event_status
// ================================================================

const { createContractorAccount } = require('../services/accountCreationService');

// In the event registration handler:
async function registerForEvent(req, res) {
  try {
    // 1. Register contractor for event (existing logic)
    const { eventId } = req.params;
    const contractorData = req.body;

    // Create or get contractor record
    let contractorId;
    const existingContractor = await query(`
      SELECT id FROM contractors WHERE email = $1
    `, [contractorData.email]);

    if (existingContractor.rows.length > 0) {
      contractorId = existingContractor.rows[0].id;
    } else {
      // Create new contractor
      const result = await query(`
        INSERT INTO contractors (first_name, last_name, email, /* other fields */)
        VALUES ($1, $2, $3, /* other values */)
        RETURNING id
      `, [/* values */]);
      contractorId = result.rows[0].id;
    }

    // Create event registration
    await query(`
      INSERT INTO contractor_event_registrations (contractor_id, event_id, event_status, created_at)
      VALUES ($1, $2, $3, NOW())
    `, [contractorId, eventId, 'registered']);

    // 2. Check if contractor profile is complete
    const isComplete = checkContractorCompleteness(contractorData);

    if (isComplete) {
      // 3. Check if contractor_users account already exists
      const accountExists = await query(`
        SELECT id FROM contractor_users WHERE contractor_id = $1
      `, [contractorId]);

      // 4. Create account if it doesn't exist
      if (accountExists.rows.length === 0) {
        const email = contractorData.email;

        try {
          const accountResult = await createContractorAccount(contractorId, email, {
            createdBy: 'system',
            triggerSource: 'event_profile_completion'
          });

          if (accountResult.success) {
            console.log(`✅ Account created for contractor ${contractorId} via event ${eventId}`);
          } else {
            console.warn(`⚠️ Account creation failed for contractor ${contractorId}: ${accountResult.error}`);
          }
        } catch (error) {
          // Don't throw - log error but don't block registration
          console.error(`❌ Account creation error for contractor ${contractorId}:`, error);
        }
      }
    }

    // 5. Return success (regardless of account creation result)
    res.status(200).json({
      success: true,
      contractorId,
      eventId,
      message: 'Event registration successful'
    });

  } catch (error) {
    console.error('Event registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Event registration failed'
    });
  }
}
```

**Sub-tasks:**
- [ ] Locate event registration endpoint
- [ ] Add contractor profile completeness check
- [ ] Add account existence check
- [ ] Add `createContractorAccount()` call with error handling
- [ ] Test with event registration flow
- [ ] Verify audit log entry created

---

### TASK 4: Testing & Verification (1-2 hours)

#### 4.1 Test Partner Profile Completion Flow
```bash
# Test 1: Create/update partner profile with complete data
curl -X PUT http://localhost:5000/api/partners/3 \
  -H "Content-Type: application/json" \
  -d '{
    "company_name": "Test Partner Co",
    "primary_contact": "John Doe",
    "primary_email": "john@testpartner.com"
  }'

# Verify account was created:
powershell -Command ".\quick-db.bat \"SELECT id, partner_id, email FROM partner_users WHERE partner_id = 3;\""

# Verify audit log:
powershell -Command ".\quick-db.bat \"SELECT user_type, user_id, email, success, trigger_source FROM account_creation_audit WHERE user_type = 'partner' ORDER BY created_at DESC LIMIT 1;\""
```

#### 4.2 Test Contractor Flow Completion
```bash
# Test 2: Complete contractor flow
curl -X POST http://localhost:5000/api/contractors \
  -H "Content-Type: application/json" \
  -d '{
    "first_name": "Jane",
    "last_name": "Smith",
    "email": "jane@testcontractor.com",
    "company_name": "Test Contractor LLC",
    "focus_areas": ["Sales", "Marketing"],
    "step": 5
  }'

# Verify account was created:
powershell -Command ".\quick-db.bat \"SELECT id, contractor_id, email FROM contractor_users WHERE email = 'jane@testcontractor.com';\""

# Verify audit log:
powershell -Command ".\quick-db.bat \"SELECT user_type, user_id, email, success, trigger_source FROM account_creation_audit WHERE user_type = 'contractor' ORDER BY created_at DESC LIMIT 1;\""
```

#### 4.3 Test Event Registration Flow
```bash
# Test 3: Register contractor for event
curl -X POST http://localhost:5000/api/events/1/register \
  -H "Content-Type: application/json" \
  -d '{
    "first_name": "Bob",
    "last_name": "Johnson",
    "email": "bob@eventcontractor.com",
    "company_name": "Event Contractor Inc"
  }'

# Verify account was created:
powershell -Command ".\quick-db.bat \"SELECT id, contractor_id, email FROM contractor_users WHERE email = 'bob@eventcontractor.com';\""

# Verify audit log:
powershell -Command ".\quick-db.bat \"SELECT user_type, user_id, email, success, trigger_source FROM account_creation_audit WHERE trigger_source = 'event_profile_completion' ORDER BY created_at DESC LIMIT 1;\""
```

#### 4.4 Test Duplicate Prevention
```bash
# Test 4: Try to create duplicate accounts (should skip creation)
# Re-run any of the above tests with same email
# Verify:
# - No duplicate accounts in partner_users/contractor_users
# - Audit log shows success=false with error message
```

#### 4.5 Test Error Handling
```bash
# Test 5: Simulate error scenarios
# - Invalid partner_id / contractor_id
# - Missing email field
# - Database connection error
# Verify:
# - Profile completion still succeeds
# - Error is logged to audit trail
# - Application doesn't crash
```

**Sub-tasks:**
- [ ] Run all 5 test scenarios
- [ ] Verify accounts created correctly
- [ ] Verify audit logs accurate
- [ ] Verify duplicate prevention works
- [ ] Verify error handling graceful
- [ ] Document any issues found

---

## DELIVERABLES

### Backend Integration ✅
- Partner profile completion integration in `partnerController.js`
- Contractor flow completion integration in `contractorController.js`
- Event registration integration in `eventController.js`
- Profile completeness helper functions
- Comprehensive error handling

### Testing ✅
- All three integration points tested
- Duplicate prevention verified
- Error handling verified
- Audit logs verified

### Documentation ✅
- Phase 3 implementation plan (this document)
- Phase 3 pre-flight checklist
- Integration point documentation
- Testing procedures

---

## SUCCESS CRITERIA

### Must Have ✅
- [ ] Partner completes profile → account created
- [ ] Contractor completes flow → account created
- [ ] Event registration → account created
- [ ] Duplicate accounts prevented (check if exists first)
- [ ] Errors handled gracefully (don't block profile completion)
- [ ] All account creation logged to audit trail
- [ ] Profile completeness logic working correctly

### Nice to Have
- [ ] Admin notification when account creation fails (future enhancement)
- [ ] Retry mechanism for failed account creation (future enhancement)
- [ ] Dashboard showing account creation metrics (future enhancement)

### Phase 3 Complete When:
- [ ] All "Must Have" criteria met
- [ ] All tests passing
- [ ] Documentation complete
- [ ] Ready for Phase 4 (welcome emails)

---

## NEXT STEPS (Phase 4)

After Phase 3 is complete:
1. Add email notifications with credentials (via n8n → GHL)
2. Test end-to-end flows with email delivery
3. Production deployment and monitoring
4. Phase 4 completion report

---

**Document Created**: October 27, 2025
**Status**: Ready to Begin
**Estimated Completion**: 6-8 hours
**Prerequisites**: Phase 1 Complete ✅, Phase 2 Complete ✅
