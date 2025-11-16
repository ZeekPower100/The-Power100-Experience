# Phase 2 Pre-Flight Checklist - Auto-Processing Trigger (REVISED)

**Date:** November 11, 2025
**Purpose:** Verify prerequisites for adding auto-trigger to existing integration
**Status:** MANDATORY - Must complete before any code changes
**Prerequisites:** Phase 1 Complete (PowerCard Generation System Working)
**Approach:** AUTO-TRIGGER existing `processCampaignCompletion()`, NOT building from scratch

---

## 🔴 CRITICAL: This Checklist is MANDATORY

**DO NOT SKIP THIS STEP**

This checklist ensures Phase 1 is working and existing integration is ready for auto-trigger.

**Estimated Time:** 10-15 minutes
**Consequence of Skipping:** Auto-trigger may call broken integration, causing data corruption

---

## ✅ Phase 2 Pre-Flight Checklist

### Step 1: Verify Phase 1 is Complete and Generating Campaigns

```bash
# Check if pre-onboarding service exists
ls tpe-backend/src/services/preOnboardingPowerCardService.js
```

**Expected:** File exists (Phase 1 Complete)

**Check Recent Campaigns:**
```bash
powershell -Command ".\quick-db.bat \"SELECT id, campaign_name, partner_id, status, total_sent, total_responses, created_at FROM power_card_campaigns WHERE campaign_name LIKE '%Pre-Onboarding%' ORDER BY created_at DESC LIMIT 5;\""
```

**Expected Output:**
```
id | campaign_name                        | partner_id | status | total_sent | total_responses | created_at
---+--------------------------------------+------------+--------+------------+-----------------+------------------
X  | [Partner Name] Pre-Onboarding Q1... | X          | active | 10         | 0-4             | 2025-01-XX...
```

**Verification:**
- [ ] Pre-onboarding service file exists
- [ ] At least 1 pre-onboarding campaign created
- [ ] Campaigns have status 'active' (waiting for responses)
- [ ] Recipients were added (total_sent > 0)

---

### Step 2: CRITICAL - Verify Existing Integration Service (processCampaignCompletion)

```bash
# Check if powerCardsIntegrationService.js exists
ls tpe-backend/src/services/powerCardsIntegrationService.js
```

**Expected:** File exists (COMPLETE INTEGRATION ALREADY BUILT)

**Read and verify the KEY function exists:**
```bash
cat tpe-backend/src/services/powerCardsIntegrationService.js | grep -A 5 "processCampaignCompletion"
```

**CRITICAL Verification:**
- [ ] `processCampaignCompletion(campaignId)` function EXISTS
- [ ] Function handles aggregation
- [ ] Function updates PCR scores
- [ ] Function updates momentum
- [ ] Function updates badges
- [ ] Function is exported properly

**WHY THIS MATTERS:**
Phase 2 ONLY adds auto-trigger to call this existing function. If this function is broken, auto-trigger will propagate errors!

---

### Step 3: Manually Test processCampaignCompletion (CRITICAL)

**This is the MOST IMPORTANT check in Phase 2 Pre-Flight!**

**Option A: Test with Real Data (if 5+ responses exist):**
```bash
# Find campaign with 5+ responses
powershell -Command ".\quick-db.bat \"SELECT id, campaign_name, total_responses FROM power_card_campaigns WHERE total_responses >= 5 AND status = 'active' LIMIT 1;\""
```

If found, document campaign ID: `____________`

**Option B: Create Test Data (if no campaigns with 5+ responses):**
```bash
# Count existing campaigns
powershell -Command ".\quick-db.bat \"SELECT id, total_responses FROM power_card_campaigns WHERE status = 'active' ORDER BY created_at DESC LIMIT 3;\""
```

**Create test script to manually call the function:**
```javascript
// test-campaign-completion.js
const powerCardsIntegrationService = require('./tpe-backend/src/services/powerCardsIntegrationService');

(async () => {
  try {
    const campaignId = 1; // Replace with actual campaign ID
    console.log(`Testing processCampaignCompletion for campaign ${campaignId}...`);

    const result = await powerCardsIntegrationService.processCampaignCompletion(campaignId);

    console.log('SUCCESS:', result);
    console.log('PCR scores updated, momentum recalculated, badges updated');
  } catch (error) {
    console.error('FAILED:', error.message);
    process.exit(1);
  }
})();
```

**Run Test:**
```bash
node test-campaign-completion.js
```

**Verification:**
- [ ] Function executes without errors
- [ ] Partner's PCR scores updated in database
- [ ] `quarterly_history` JSONB updated
- [ ] Momentum recalculated
- [ ] Badges updated
- [ ] Campaign status changed to 'completed'

**If Test Fails:** DO NOT PROCEED WITH PHASE 2! Fix `processCampaignCompletion()` first!

---

### Step 4: Verify PowerCard Response Submission Endpoint

```bash
# Check if powerCard routes exist
cat tpe-backend/src/routes/powerCards.js | grep -A 10 "POST.*survey.*response"
```

**Expected:** Endpoint like `router.post('/survey/:surveyLink/response', ...)`

**Verification:**
- [ ] Response submission endpoint exists
- [ ] Endpoint accepts anonymous submissions
- [ ] Endpoint uses `surveyLink` parameter
- [ ] Endpoint calls `powerCardService.submitResponse()`

**Document Endpoint Details:**
```
Route: POST /api/power-cards/survey/:surveyLink/response
Handler Function: _______________________________
Line Number: ____________________________________
```

**WHY THIS MATTERS:**
This is where we'll add the ~30 lines of auto-trigger code!

---

### Step 5: Verify Campaign Status and Response Count Tracking

```bash
powershell -Command ".\quick-db.bat \"SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'power_card_campaigns' AND column_name IN ('id', 'status', 'total_responses', 'total_sent', 'updated_at') ORDER BY column_name;\""
```

**Expected Output:**
```
id              | integer
status          | character varying
total_responses | integer
total_sent      | integer
updated_at      | timestamp without time zone
```

**Verification:**
- [ ] `status` field exists (for 'active' → 'completed' transition)
- [ ] `total_responses` field exists (for threshold check: >= 5)
- [ ] `updated_at` field exists (for timestamp tracking)

**Test Response Count Increment:**
```bash
powershell -Command ".\quick-db.bat \"SELECT id, campaign_name, total_responses FROM power_card_campaigns WHERE status = 'active' ORDER BY total_responses DESC LIMIT 5;\""
```

**Verification:**
- [ ] Can identify campaigns with responses
- [ ] `total_responses` increments correctly when responses submitted
- [ ] Can check if `total_responses >= 5`

---

### Step 6: Verify Auto-Trigger Logic Requirements

**Phase 2 Auto-Trigger Logic:**
```javascript
// What we're adding to response submission endpoint:

// 1. Get campaign ID from submitted response
const campaignId = result.campaign_id;

// 2. Check campaign status and response count
const campaign = await query(`
  SELECT total_responses, status
  FROM power_card_campaigns
  WHERE id = $1
`, [campaignId]);

// 3. Check threshold (5+ responses AND status = 'active')
if (campaign.total_responses >= 5 && campaign.status === 'active') {
  // 4. Auto-trigger existing integration
  await powerCardsIntegrationService.processCampaignCompletion(campaignId);

  // 5. Update status to 'completed'
  await query(`
    UPDATE power_card_campaigns
    SET status = 'completed', updated_at = NOW()
    WHERE id = $1
  `, [campaignId]);
}
```

**Verification Checklist:**
- [ ] Can retrieve `campaign_id` from response submission
- [ ] Can query campaign status and response count
- [ ] Can check threshold condition (>= 5 AND active)
- [ ] Can call `processCampaignCompletion(campaignId)`
- [ ] Can update campaign status to 'completed'
- [ ] Have proper error handling (don't fail response submission if auto-trigger fails)

---

### Step 7: Verify Database Transaction Handling

**Check if response submission is transactional:**
```bash
cat tpe-backend/src/services/powerCardService.js | grep -A 20 "submitResponse" | grep -i "transaction\|BEGIN\|COMMIT"
```

**Verification:**
- [ ] Check if existing code uses transactions
- [ ] Understand transaction scope
- [ ] Auto-trigger should NOT be in same transaction as response submission
- [ ] Auto-trigger failure should NOT rollback response submission

**WHY THIS MATTERS:**
If auto-trigger fails (e.g., PCR calculation error), we still want the response to be saved!

---

### Step 8: Check Existing Campaigns for Testing

```bash
powershell -Command ".\quick-db.bat \"SELECT c.id, c.campaign_name, c.status, c.total_responses, c.total_sent, (c.total_responses::float / NULLIF(c.total_sent, 0) * 100)::numeric(5,2) as response_rate FROM power_card_campaigns c WHERE c.status = 'active' ORDER BY c.created_at DESC LIMIT 5;\""
```

**Document Test Scenarios:**

**Scenario 1: Campaign Below Threshold**
```
Campaign ID: _______
Responses: ____ (should be < 5)
Status: active
Plan: Submit more responses to trigger auto-processing
```

**Scenario 2: Campaign At Threshold**
```
Campaign ID: _______
Responses: 4 (one more will trigger!)
Status: active
Plan: Submit 1 response and verify auto-trigger
```

**Scenario 3: Campaign Already Completed**
```
Campaign ID: _______
Responses: 5+
Status: completed
Plan: Verify auto-trigger doesn't re-process
```

**Verification:**
- [ ] Have at least 1 active campaign for testing
- [ ] Understand which campaigns will trigger auto-processing
- [ ] Can manually add test responses if needed

---

### Step 9: Verify Error Logging Infrastructure

```bash
# Check logging in powerCard routes
cat tpe-backend/src/routes/powerCards.js | grep -i "console\|logger\|log"
```

**Verification:**
- [ ] Route has logging infrastructure
- [ ] Can add auto-trigger logging
- [ ] Will be able to debug auto-trigger issues

**Required Logging for Phase 2:**
```javascript
console.log(`[Auto-Processing] Campaign ${campaignId}: ${total_responses}/5 responses`);
console.log(`[Auto-Processing] Threshold reached! Processing campaign ${campaignId}...`);
console.log(`[Auto-Processing] Campaign ${campaignId} completed successfully`);
console.error(`[Auto-Processing] Failed for campaign ${campaignId}:`, error);
```

---

### Step 10: Verify Integration Service Dependencies

**Check what processCampaignCompletion depends on:**
```bash
cat tpe-backend/src/services/powerCardsIntegrationService.js | grep -E "require|import" | head -20
```

**Expected Dependencies:**
- [ ] momentum service
- [ ] badge service
- [ ] PCR calculation service
- [ ] database query function

**Verify Services Exist:**
```bash
ls tpe-backend/src/services/momentumService.js
ls tpe-backend/src/services/badgeService.js
ls tpe-backend/src/services/pcrCalculationService.js
```

**Verification:**
- [ ] All dependency services exist
- [ ] Services are properly imported
- [ ] Auto-trigger won't fail due to missing dependencies

---

## 📋 Final Pre-Flight Checklist Summary

Before proceeding to Phase 2 implementation, verify ALL items are checked:

### ✅ Phase 1 Verification (CRITICAL)
- [ ] Pre-onboarding service exists and working
- [ ] At least 1 pre-onboarding campaign created
- [ ] Campaigns have recipients (total_sent > 0)
- [ ] Response submission endpoint works

### ✅ Existing Integration Verification (MOST CRITICAL!)
- [ ] `processCampaignCompletion(campaignId)` function EXISTS
- [ ] **MANUALLY TESTED** `processCampaignCompletion()` and it WORKS
- [ ] Function updates PCR scores correctly
- [ ] Function updates momentum and badges
- [ ] Function doesn't throw errors

### ✅ Auto-Trigger Integration Point
- [ ] Response submission endpoint identified (file/function/line)
- [ ] Can retrieve `campaign_id` from response
- [ ] Can query campaign status and response count
- [ ] Can update campaign status to 'completed'

### ✅ Data Verification
- [ ] Have test campaigns in 'active' status
- [ ] Understand which campaigns will trigger (4 responses = 1 away)
- [ ] Can add test responses manually if needed

### ✅ Infrastructure
- [ ] Transaction handling understood
- [ ] Logging infrastructure available
- [ ] All dependency services exist (momentum, badge, PCR)

---

## 🚨 If ANY Checks Fail

**DO NOT PROCEED WITH IMPLEMENTATION**

Critical failures and solutions:

1. **processCampaignCompletion doesn't exist:** STOP! Phase 2 cannot work without this
2. **Manual test of processCampaignCompletion fails:** FIX the function BEFORE adding auto-trigger!
3. **Phase 1 not complete:** Complete Phase 1 first (campaign generation)
4. **No active campaigns:** Generate test campaigns using Phase 1 service
5. **Missing dependencies:** Verify momentum/badge/PCR services exist

**Remember:** Phase 2 is ONLY ~30 lines of auto-trigger code. If existing integration is broken, Phase 2 will just auto-trigger broken code!

---

## ✅ Pre-Flight Complete

Once all checks pass:

### What We're Building (Summary):
**Phase 2 is JUST auto-trigger logic (~30 lines):**
1. ✅ Add threshold check to response submission endpoint
2. ✅ Call existing `processCampaignCompletion()` when threshold reached
3. ✅ Update campaign status to 'completed'
4. ✅ Add logging for debugging

**What We're NOT Building:**
- ❌ Aggregation logic (already exists!)
- ❌ PCR calculation (already exists!)
- ❌ Momentum service (already exists!)
- ❌ Badge service (already exists!)
- ❌ Report generation (already exists!)

### Critical Understanding:
**Phase 2 Success = Existing Integration Works + Auto-Trigger Calls It**

If existing integration is broken, fixing it is NOT part of Phase 2. Fix it BEFORE starting Phase 2!

### Ready to Proceed:
- [ ] **CONFIRMED:** Manually tested `processCampaignCompletion()` and it works
- [ ] Document response submission endpoint location
- [ ] Document test campaign IDs for verification
- [ ] Proceed to Phase 2 Implementation Plan (Revised)
- [ ] Timeline: 1-2 days (NOT 5 days!)

---

## 📚 Related Documents

- **Implementation Plan:** `./PHASE-2-IMPLEMENTATION-PLAN-REVISED.md`
- **Overview:** `../PRE-ONBOARDING-OVERVIEW.md`
- **Phase 1 Plan:** `../phase-1/PHASE-1-IMPLEMENTATION-PLAN-REVISED.md`
- **Existing Integration Service:** `tpe-backend/src/services/powerCardsIntegrationService.js`
- **Database Source of Truth:** `/DATABASE-SOURCE-OF-TRUTH.md`

---

## 🎉 Ready to Implement

**All checks passed?** You're ready to begin Phase 2 implementation!

**Next Steps:**
1. **Hour 1-2:** Add auto-trigger logic to response submission endpoint
2. **Hour 3-4:** Add logging and error handling
3. **Hour 5-6:** Test with real campaign (submit responses until threshold)
4. **Hour 7-8:** Verify PCR updates, momentum, badges all working

**Total Implementation Time:** 1-2 days (NOT 5 days like original plan!)

---

**Status:** Ready for verification
**Next Step:** Run all verification commands and check all boxes
**Estimated Time:** 10-15 minutes
**Last Updated:** November 11, 2025
**Revision:** Auto-trigger existing integration (NOT building from scratch)
**CRITICAL:** Must manually test `processCampaignCompletion()` before proceeding!
