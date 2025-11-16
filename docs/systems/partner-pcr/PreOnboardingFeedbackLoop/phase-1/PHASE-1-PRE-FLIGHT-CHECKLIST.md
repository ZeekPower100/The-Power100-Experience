# Phase 1 Pre-Flight Checklist - Pre-Onboarding PowerCard System (REVISED)

**Date:** November 11, 2025
**Purpose:** Verify existing PowerCard system and integration prerequisites before Phase 1
**Status:** MANDATORY - Must complete before any code changes
**Approach:** INTEGRATION with existing system, NOT building from scratch

---

## 🔴 CRITICAL: This Checklist is MANDATORY

**DO NOT SKIP THIS STEP**

This checklist prevents hours of debugging by ensuring:
1. ✅ **Existing PowerCard system is functional**
2. ✅ **All required database tables and fields exist**
3. ✅ **Integration services are available**
4. ✅ **Step 8 completion hook location identified**

**Estimated Time:** 15-20 minutes
**Consequence of Skipping:** Hours of debugging integration issues

---

## ✅ Pre-Flight Checklist

### Step 1: Verify Existing PowerCard Service (CRITICAL)

```bash
# Check if powerCardService.js exists
ls tpe-backend/src/services/powerCardService.js
```

**Expected:** File exists (COMPLETE SYSTEM ALREADY BUILT)

**Read the file and verify these functions exist:**
```bash
cat tpe-backend/src/services/powerCardService.js | grep -E "createTemplate|createCampaign|addRecipients|submitResponse"
```

**Required Functions:**
- [ ] `createTemplate(templateData)` - Creates survey templates
- [ ] `createCampaign(campaignData)` - Creates quarterly campaigns
- [ ] `addRecipients(campaignId, templateId, recipients)` - Adds recipients with unique links
- [ ] `submitResponse(surveyLink, responseData)` - Handles anonymous submissions
- [ ] `getCampaignById(campaignId)` - Retrieves campaign data
- [ ] `getRecipientsByCampaign(campaignId)` - Gets recipient list

**Verification:**
- [ ] File exists
- [ ] All 6 core functions present
- [ ] Functions export properly
- [ ] Service is production-ready

---

### Step 2: Verify PowerCard Integration Service (CRITICAL)

```bash
# Check if powerCardsIntegrationService.js exists
ls tpe-backend/src/services/powerCardsIntegrationService.js
```

**Expected:** File exists (COMPLETE INTEGRATION ALREADY BUILT)

**Read the file and verify these functions exist:**
```bash
cat tpe-backend/src/services/powerCardsIntegrationService.js | grep -E "processCampaignCompletion|aggregatePowerCardsData|addQuarterlyDataFromPowerCards"
```

**Required Functions:**
- [ ] `processCampaignCompletion(campaignId)` - **CRITICAL: Does EVERYTHING**
  - Aggregates responses
  - Calculates quarterly scores
  - Updates strategic_partners PCR fields
  - Adds to quarterly_history JSONB
  - Recalculates momentum
  - Updates badges
- [ ] `aggregatePowerCardsData(campaignId, partnerId)` - Aggregates responses
- [ ] `addQuarterlyDataFromPowerCards(partnerId, campaignId)` - Updates quarterly_history

**Verification:**
- [ ] File exists
- [ ] `processCampaignCompletion()` exists (THIS IS THE KEY FUNCTION!)
- [ ] Integration with momentum service confirmed
- [ ] Integration with badge service confirmed
- [ ] Integration with PCR calculation confirmed

**WHY THIS MATTERS:**
Phase 1 builds a wrapper that calls these existing services. Phase 2 only adds auto-trigger to call `processCampaignCompletion()`.

---

### Step 3: Verify PowerCard Survey Form (CRITICAL)

```bash
# Check if PowerCardSurvey.tsx exists
ls tpe-front-end/src/components/powerCards/PowerCardSurvey.tsx
```

**Expected:** File exists (COMPLETE UI ALREADY BUILT)

**Verification:**
- [ ] File exists
- [ ] Multi-step survey form implemented
- [ ] Progress tracking implemented
- [ ] Time tracking implemented
- [ ] Real-time score visualization
- [ ] Modern Design System compliant
- [ ] Anonymous submission working

**WHY THIS MATTERS:**
We don't need to build a survey form - it's already production-ready!

---

### Step 4: Verify Database Schema (All PowerCard Tables)

#### 4a. Verify strategic_partners Table (Pre-Onboarding Fields)

```bash
powershell -Command ".\quick-db.bat \"SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'strategic_partners' AND column_name IN ('id', 'company_name', 'logo_url', 'client_references', 'employee_references', 'is_active') ORDER BY column_name;\""
```

**Expected Output:**
```
client_references    | text
company_name         | character varying
employee_references  | text
id                   | integer
is_active            | boolean
logo_url             | character varying
```

**Verification:**
- [ ] All 6 fields exist
- [ ] `client_references` is TEXT (stores "Name <email>, Name <email>")
- [ ] `employee_references` is TEXT (stores "Name <email>, Name <email>")
- [ ] Both fields support comma-separated lists

---

#### 4b. Verify power_card_campaigns Table

```bash
powershell -Command ".\quick-db.bat \"SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'power_card_campaigns' ORDER BY column_name;\""
```

**Expected Fields (Minimum Required):**
```
campaign_name   | character varying
created_at      | timestamp without time zone
end_date        | date
id              | integer
partner_id      | integer
quarter         | character varying
response_rate   | numeric
start_date      | date
status          | character varying
total_responses | integer
total_sent      | integer
updated_at      | timestamp without time zone
year            | integer
```

**Verification:**
- [ ] Table exists
- [ ] All 13+ fields present
- [ ] `status` field exists ('pending', 'active', 'completed')
- [ ] `total_responses` field exists (for threshold checking)
- [ ] `partner_id` foreign key exists

---

#### 4c. Verify power_card_recipients Table (18 Fields!)

```bash
powershell -Command ".\quick-db.bat \"SELECT column_name FROM information_schema.columns WHERE table_name = 'power_card_recipients' ORDER BY column_name;\""
```

**Expected Fields:**
- [ ] campaign_id
- [ ] company_id
- [ ] company_type
- [ ] completed_at
- [ ] created_at
- [ ] id
- [ ] opened_at
- [ ] recipient_email
- [ ] recipient_id
- [ ] recipient_name
- [ ] recipient_type (customer/employee)
- [ ] reminder_sent_at
- [ ] revenue_tier
- [ ] sent_at
- [ ] started_at
- [ ] status
- [ ] survey_link (CRITICAL: Unique anonymous link)
- [ ] template_id

**Verification:**
- [ ] All 18 fields exist
- [ ] `survey_link` field exists (unique crypto-based links)
- [ ] `recipient_type` field exists (customer vs employee)

---

#### 4d. Verify power_card_responses Table

```bash
powershell -Command ".\quick-db.bat \"SELECT column_name FROM information_schema.columns WHERE table_name = 'power_card_responses' ORDER BY column_name;\""
```

**Expected Fields:**
- [ ] campaign_id
- [ ] contractor_id
- [ ] id
- [ ] metric_1_response
- [ ] metric_1_score
- [ ] metric_2_response
- [ ] metric_2_score
- [ ] metric_3_response
- [ ] metric_3_score
- [ ] recommendation_score
- [ ] satisfaction_score
- [ ] submitted_at
- [ ] template_id

**Verification:**
- [ ] All 13 fields exist
- [ ] Dynamic metric fields (1/2/3) exist
- [ ] Scores stored as integers (0-10 scale)

---

#### 4e. Verify power_card_templates Table

```bash
powershell -Command ".\quick-db.bat \"SELECT column_name FROM information_schema.columns WHERE table_name = 'power_card_templates' WHERE column_name LIKE 'metric_%' OR column_name = 'partner_id' OR column_name = 'id' ORDER BY column_name;\""
```

**Expected Fields:**
- [ ] id
- [ ] partner_id
- [ ] metric_1_name
- [ ] metric_1_question
- [ ] metric_1_type
- [ ] metric_2_name
- [ ] metric_2_question
- [ ] metric_2_type
- [ ] metric_3_name
- [ ] metric_3_question
- [ ] metric_3_type

**Verification:**
- [ ] All metric configuration fields exist
- [ ] Can store custom survey questions

---

### Step 5: Verify Email Service Configuration

```bash
# Check if email service file exists
ls tpe-backend/src/services/emailService.js
```

**Expected:** File exists

**Check environment variables:**
```bash
cat .env | grep -E "EMAIL|SMTP|SENDGRID|FRONTEND_URL"
```

**Required Configuration:**
- [ ] Email service file exists
- [ ] Email credentials configured (SMTP or API)
- [ ] `FRONTEND_URL` environment variable set
- [ ] Can send emails with links

**PowerCard Email Requirements:**
- Subject: "[Partner Name] wants your feedback"
- Body: Includes unique survey link (`survey_link` from recipients table)
- Link format: `${FRONTEND_URL}/power-cards/survey/${survey_link}`

---

### Step 6: Verify Authentication Middleware

```bash
# Check if auth middleware exists
ls tpe-backend/src/middleware/auth.js
```

**Expected:** File exists with `protect` middleware

**Verification:**
- [ ] Auth middleware exists
- [ ] `protect` function exports properly
- [ ] Can protect admin endpoints
- [ ] JWT authentication working

---

### Step 7: Find Step 8 Completion Hook Location (CRITICAL)

**This is where we trigger PowerCard generation!**

```bash
# Search for Step 8 completion logic in partner flow
grep -r "step.*8" tpe-backend/src/ --include="*.js" | grep -i "complete\|finish\|done"
```

**OR check partner controller:**
```bash
cat tpe-backend/src/controllers/partnerController.js | grep -A 10 "step.*8\|onboard"
```

**What to Look For:**
- [ ] Endpoint that marks partner onboarding Step 8 as complete
- [ ] Function that's called when partner finishes onboarding
- [ ] Status update that changes to "onboarding_complete"
- [ ] Possible location to add hook: `updatePartnerStatus()` or similar

**Document the Hook Location:**
```
File: _______________________________________
Function: ___________________________________
Line Number: ________________________________
```

**WHY THIS MATTERS:**
This is where we'll add the call to `generatePreOnboardingCampaign(partnerId)`.

---

### Step 8: Verify Test Partner Data

```bash
powershell -Command ".\quick-db.bat \"SELECT id, company_name, CASE WHEN client_references IS NOT NULL AND client_references != '' THEN 'YES' ELSE 'NO' END as has_customers, CASE WHEN employee_references IS NOT NULL AND employee_references != '' THEN 'YES' ELSE 'NO' END as has_employees FROM strategic_partners WHERE is_active = true LIMIT 5;\""
```

**Expected Output:**
```
id | company_name           | has_customers | has_employees
---+------------------------+---------------+--------------
X  | Some Partner Name      | YES           | YES
```

**Verification:**
- [ ] At least 1 partner has customer references
- [ ] At least 1 partner has employee references
- [ ] Can test PowerCard generation with real data

**Check Reference Format:**
```bash
powershell -Command ".\quick-db.bat \"SELECT LEFT(client_references, 100) as sample_refs FROM strategic_partners WHERE client_references IS NOT NULL LIMIT 1;\""
```

**Expected Format:** `"John Doe <john@example.com>, Jane Smith <jane@example.com>"`

**Verification:**
- [ ] References are in "Name <email>" format
- [ ] Multiple references separated by commas
- [ ] Can parse with regex: `/^(.+?)\s*<(.+?)>$/`

---

### Step 9: Verify PowerCard Routes Exist

```bash
# Check if powerCard routes exist
ls tpe-backend/src/routes/powerCards.js
```

**Expected:** File exists

**Check if routes are registered in server.js:**
```bash
cat tpe-backend/server.js | grep -i "powercard"
```

**Expected:** Line like `app.use('/api/power-cards', powerCardRoutes);`

**Verification:**
- [ ] Routes file exists
- [ ] Routes registered in server.js
- [ ] API endpoints accessible
- [ ] Anonymous survey submission endpoint exists

---

### Step 10: Check Existing PowerCard Campaigns (Data State)

```bash
powershell -Command ".\quick-db.bat \"SELECT COUNT(*) as total_campaigns FROM power_card_campaigns;\""
```

**Document Current State:**
```
Total Existing Campaigns: ________
Pre-Onboarding Campaigns: ________ (should be 0)
```

**Verification:**
- [ ] System state documented
- [ ] No existing pre-onboarding campaigns conflict

---

### Step 11: Verify Frontend API Integration

```bash
# Check if powerCardApi exists in frontend
ls tpe-front-end/src/entities/powerCardApi.ts
```

**Expected:** File might exist OR needs to be created

**Verification:**
- [ ] Check if API file exists
- [ ] If exists: Verify it has survey submission function
- [ ] If missing: Note that we need to create it
- [ ] Frontend can call `/api/power-cards/survey/:surveyLink/response`

---

### Step 12: Test Existing PowerCard System (Optional but Recommended)

**Manual Test of Existing System:**

1. Create a test campaign (using existing service):
```javascript
// Test in Node REPL or create test script
const powerCardService = require('./tpe-backend/src/services/powerCardService');

// This should work if system is functional:
powerCardService.createCampaign({
  campaign_name: 'Pre-Flight Test Campaign',
  partner_id: 1,
  quarter: 'Q1',
  year: 2025,
  start_date: new Date(),
  end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  status: 'pending'
});
```

**Verification:**
- [ ] Can create test campaign without errors
- [ ] Campaign appears in database
- [ ] Existing system is functional

---

## 📋 Final Pre-Flight Checklist Summary

Before proceeding to Phase 1 implementation, verify ALL items are checked:

### ✅ Existing System Verification (CRITICAL)
- [ ] `powerCardService.js` exists and has all 6 core functions
- [ ] `powerCardsIntegrationService.js` exists with `processCampaignCompletion()`
- [ ] `PowerCardSurvey.tsx` exists and is production-ready
- [ ] PowerCard routes exist and are registered
- [ ] Anonymous survey submission endpoint works

### ✅ Database Verification
- [ ] strategic_partners has `client_references` and `employee_references` (TEXT)
- [ ] power_card_campaigns table exists (13+ fields including `status`)
- [ ] power_card_recipients table exists (18 fields including `survey_link`)
- [ ] power_card_responses table exists (13 fields for dynamic metrics)
- [ ] power_card_templates table exists (metric configuration)

### ✅ Integration Point Verification
- [ ] Step 8 completion hook location identified (file, function, line)
- [ ] Email service exists and is configured
- [ ] `FRONTEND_URL` environment variable set
- [ ] Authentication middleware exists

### ✅ Data Verification
- [ ] At least 1 partner has reference data
- [ ] References are in parseable format ("Name <email>")
- [ ] Test partner ready for PowerCard generation

---

## 🚨 If ANY Checks Fail

**DO NOT PROCEED WITH IMPLEMENTATION**

If any verification fails:

1. **Missing powerCardService.js:** CRITICAL - System not ready, investigate immediately
2. **Missing powerCardsIntegrationService.js:** CRITICAL - Phase 2 won't work
3. **Missing PowerCardSurvey.tsx:** CRITICAL - Frontend not ready
4. **Missing Database Tables:** Run PowerCard migrations first
5. **Can't Find Step 8 Hook:** Search partner onboarding flow thoroughly
6. **Missing Email Config:** Configure email service before proceeding

---

## ✅ Pre-Flight Complete

Once all checks pass:

### What We're Building (Summary):
**Phase 1 is JUST a wrapper service + hook:**
1. ✅ Create `preOnboardingPowerCardService.js` (~200 lines)
   - Parses references from TEXT fields
   - Calls existing `powerCardService` functions
   - Sends emails with unique links
2. ✅ Add hook to Step 8 completion
3. ✅ Test with real partner

**What We're NOT Building:**
- ❌ PowerCard system (already exists!)
- ❌ Survey form (already exists!)
- ❌ Campaign processing (already exists!)
- ❌ PCR integration (already exists!)

### Ready to Proceed:
- [ ] Document Step 8 hook location (file/function/line)
- [ ] Proceed to Phase 1 Implementation Plan (Revised)
- [ ] Timeline: 3-4 days (NOT 7 days!)

---

## 📚 Related Documents

- **Implementation Plan:** `./PHASE-1-IMPLEMENTATION-PLAN-REVISED.md`
- **Overview:** `../PRE-ONBOARDING-OVERVIEW.md`
- **Phase 2 Plan:** `../phase-2/PHASE-2-IMPLEMENTATION-PLAN-REVISED.md`
- **Database Source of Truth:** `/DATABASE-SOURCE-OF-TRUTH.md`
- **Reports Pre-Flight:** `/docs/systems/PCR/Reports/phase-1/PHASE-1-PRE-FLIGHT-CHECKLIST.md` (reference)

---

## 🎉 Ready to Implement

**All checks passed?** You're ready to begin Phase 1 implementation!

**Next Steps:**
1. **Day 1-2:** Create pre-onboarding wrapper service + reference parser
2. **Day 2-3:** Add Step 8 completion hook + email integration
3. **Day 3-4:** Testing with real partner data

---

**Status:** Ready for verification
**Next Step:** Run all verification commands and check all boxes
**Estimated Time:** 15-20 minutes
**Last Updated:** November 11, 2025
**Revision:** Leveraging existing PowerCard system (90% already built)
