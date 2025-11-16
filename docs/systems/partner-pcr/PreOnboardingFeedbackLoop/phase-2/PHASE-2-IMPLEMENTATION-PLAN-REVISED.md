# Phase 2: Auto-Processing & PCR Updates - REVISED Implementation Plan

**Document Version:** 2.0 (REVISED)
**Date:** November 10, 2025
**Status:** READY FOR IMPLEMENTATION
**Prerequisites:** Phase 1 Complete (Pre-Onboarding PowerCard campaigns generating)
**Key Change:** Leverages existing `processCampaignCompletion()` - we're adding auto-trigger only

---

## 🎉 MAJOR DISCOVERY: Processing System Already Complete!

**The existing PowerCard integration service (`powerCardsIntegrationService.js`) already does EVERYTHING:**
- ✅ Aggregates PowerCard responses
- ✅ Calculates quarterly scores (0-100 scale)
- ✅ Updates `strategic_partners` PCR fields
- ✅ Adds data to `quarterly_history` JSONB
- ✅ Recalculates momentum
- ✅ Updates badges
- ✅ Handles client vs employee response separation

**What we're ACTUALLY building:**
- 🔧 Auto-detection of threshold (5+ responses)
- 🔧 Auto-trigger of existing `processCampaignCompletion()`
- 🔧 That's it!

**Revised Timeline: 1-2 days** (down from 5 days)

---

## 📋 What Phase 2 Delivers (Revised)

### NEW Deliverables:
- ✅ Automatic threshold detection (5+ responses = 50% response rate)
- ✅ Auto-trigger campaign processing when threshold met
- ✅ Landing page auto-updates with PCR score

### REUSING Existing:
- ✅ Response aggregation (`powerCardsIntegrationService.aggregatePowerCardsData()`)
- ✅ Quarterly data creation (`addQuarterlyDataFromPowerCards()`)
- ✅ Campaign completion workflow (`processCampaignCompletion()`)
- ✅ PCR calculation (30% profile + 70% quarterly)
- ✅ Momentum recalculation
- ✅ Badge updates

---

## 🛠️ Implementation - Minimal Code Changes

### File 1: Add Auto-Trigger to Response Submission (UPDATE EXISTING)

**File:** `tpe-backend/src/routes/powerCards.js` (UPDATE EXISTING ENDPOINT)

**Current Code:**
```javascript
// POST /api/power-cards/survey/:surveyLink/response
router.post('/survey/:surveyLink/response', asyncHandler(async (req, res) => {
  const { surveyLink } = req.params;
  const responseData = req.body;

  // Existing submission logic...
  const result = await powerCardService.submitResponse(surveyLink, responseData);

  res.json({
    success: true,
    message: 'Response submitted successfully',
    response_id: result.response_id
  });
}));
```

**NEW Code (Add auto-trigger check):**
```javascript
// Import at top
const powerCardsIntegrationService = require('../services/powerCardsIntegrationService');

// POST /api/power-cards/survey/:surveyLink/response
router.post('/survey/:surveyLink/response', asyncHandler(async (req, res) => {
  const { surveyLink } = req.params;
  const responseData = req.body;

  // EXISTING: Submit response
  const result = await powerCardService.submitResponse(surveyLink, responseData);

  // NEW: Check if campaign reached threshold and auto-process
  const campaignId = result.campaign_id;

  if (campaignId) {
    // Get campaign response count
    const campaignStats = await query(`
      SELECT
        total_sent,
        total_responses,
        status
      FROM power_card_campaigns
      WHERE id = $1
    `, [campaignId]);

    const campaign = campaignStats.rows[0];

    // Check threshold: 5+ responses (50%) AND status is 'active'
    if (campaign && campaign.total_responses >= 5 && campaign.status === 'active') {
      console.log(
        `[Auto-Processing] Campaign ${campaignId} reached threshold ` +
        `(${campaign.total_responses}/${campaign.total_sent}). Processing...`
      );

      try {
        // AUTO-TRIGGER: Call existing campaign completion service
        const processingResult = await powerCardsIntegrationService.processCampaignCompletion(campaignId);

        console.log(
          `[Auto-Processing] ✅ Campaign ${campaignId} processed successfully. ` +
          `${processingResult.partnersUpdated.length} partners updated.`
        );

        // Update campaign status to 'completed'
        await query(`
          UPDATE power_card_campaigns
          SET status = 'completed', updated_at = NOW()
          WHERE id = $1
        `, [campaignId]);

      } catch (error) {
        console.error(
          `[Auto-Processing] ❌ Failed to process campaign ${campaignId}:`,
          error
        );
        // Don't fail the response submission if processing fails
        // Admin can manually trigger later
      }
    }
  }

  res.json({
    success: true,
    message: 'Response submitted successfully',
    response_id: result.response_id
  });
}));
```

**That's the entire Phase 2 implementation! ~30 lines of code.**

---

## 📊 How It Works (Leveraging Existing System)

### Step-by-Step Flow:

```
1. Respondent submits PowerCard survey
   ↓
2. POST /api/power-cards/survey/:surveyLink/response
   ↓
3. EXISTING: powerCardService.submitResponse()
   - Saves response to power_card_responses
   - Updates recipient status to 'completed'
   - Increments campaign.total_responses
   ↓
4. NEW: Check threshold
   - Query campaign stats
   - If total_responses >= 5 AND status = 'active':
     → Auto-trigger processing
   ↓
5. EXISTING: powerCardsIntegrationService.processCampaignCompletion()
   - Gets all partners with responses in campaign
   - For each partner:
     a. aggregatePowerCardsData() → quarterly score
     b. addQuarterlyDataFromPowerCards() → updates quarterly_history
     c. momentumCalculationService.updateMomentum() → momentum_modifier
     d. badgeEligibilityService.updateBadges() → earned_badges
     e. pcrCalculationService.calculatePartnerPCR() → final_pcr_score
   ↓
6. EXISTING: Partner data updated in strategic_partners:
   - quarterly_feedback_score (0-100)
   - final_pcr_score (recalculated)
   - momentum_modifier (updated)
   - earned_badges (updated)
   - quarterly_history (appended)
   ↓
7. Landing page automatically shows updated PCR score
   (No code changes needed - reads from strategic_partners.final_pcr_score)
```

---

## 📅 Revised Implementation Timeline (1-2 Days)

### Day 1: Add Auto-Trigger Logic
**Tasks:**
1. Update `powerCards.js` route with threshold check
2. Add call to existing `processCampaignCompletion()`
3. Add error handling (don't fail response if processing fails)
4. Test threshold detection (4 responses = no trigger, 5 responses = trigger)
5. Verify existing processing service works correctly

**Deliverable:** Automatic campaign processing at 5 responses

**Time:** 3-4 hours

---

### Day 2: Testing & Validation
**Tasks:**
1. End-to-end testing with real pre-onboarding campaign
2. Submit 5 responses and verify auto-processing triggers
3. Check PCR score updates in database
4. Verify landing page shows new score
5. Test error cases (processing failure doesn't break submission)
6. Verify momentum and badges update correctly

**Deliverable:** Production-ready auto-processing system

**Time:** 3-4 hours

---

## 🎯 Success Metrics

| Metric | Target | How to Measure |
|--------|--------|----------------|
| **Auto-Trigger Detection** | 100% | Triggers at exactly 5 responses |
| **Processing Speed** | < 3 seconds | Time from trigger to PCR update |
| **PCR Accuracy** | 100% | Matches manual processing |
| **Landing Page Update** | Immediate | Score visible after processing |
| **Error Recovery** | 100% | Response saves even if processing fails |

---

## 🔧 Reusing Existing Services

### What We're NOT Building:

❌ Response aggregation (use `aggregatePowerCardsData()`)
❌ Quarterly score calculation (use `addQuarterlyDataFromPowerCards()`)
❌ PCR calculation (use `calculatePartnerPCR()`)
❌ Momentum updates (use `updateMomentum()`)
❌ Badge updates (use `updateBadges()`)
❌ Database updates (existing services handle all updates)
❌ Report generation (existing system handles quarterly_history)

### What We ARE Building:

✅ Threshold check (5+ responses?)
✅ Auto-trigger call to `processCampaignCompletion()`
✅ Error handling for auto-processing

**Total New Code: ~30 lines**

---

## 🧪 Testing Strategy

### Test Case 1: Threshold Not Met
```
Given: Campaign with 4 responses
When: 4th response submitted
Then: Auto-processing does NOT trigger
And: Campaign status remains 'active'
```

### Test Case 2: Threshold Met
```
Given: Campaign with 4 responses
When: 5th response submitted
Then: Auto-processing DOES trigger
And: Campaign status changes to 'completed'
And: Partner PCR score updates
And: Quarterly history appended
And: Momentum recalculated
And: Landing page shows new score
```

### Test Case 3: Additional Responses After Processing
```
Given: Campaign already processed (status = 'completed')
When: 6th response submitted
Then: Response saved successfully
But: Auto-processing does NOT trigger again
And: Campaign status stays 'completed'
```

### Test Case 4: Processing Failure
```
Given: Campaign reaches threshold
When: Auto-processing fails (e.g., database error)
Then: Response still saves successfully
And: Error logged for admin review
And: Campaign status stays 'active'
And: Admin can manually trigger later
```

---

## 📊 What Gets Updated Automatically

### strategic_partners Table Updates:
```sql
-- These fields get updated by existing processCampaignCompletion():
quarterly_feedback_score = [calculated from PowerCard responses]  -- 0-100 scale
final_pcr_score = [recalculated with new quarterly data]           -- 30% profile + 70% quarterly
momentum_modifier = [recalculated based on trend]                   -- -10 to +10
earned_badges = [updated based on new score]                       -- JSONB array
quarterly_history = [appended with new quarter]                    -- JSONB array
updated_at = NOW()
```

### Campaign Status Update:
```sql
-- NEW code updates this:
power_card_campaigns.status = 'completed'
```

---

## 🎨 Landing Page Updates (No Code Changes Needed!)

**The landing page already queries `strategic_partners.final_pcr_score`:**

**Current Code (No Changes Needed):**
```javascript
// tpe-backend/src/services/publicPCRService.js
const partner = await query(`
  SELECT
    final_pcr_score,  // ← This automatically shows new score!
    performance_trend,
    earned_badges,
    ...
  FROM strategic_partners
  WHERE public_url = $1
`);
```

**Landing page automatically shows:**
- ✅ Updated PCR score
- ✅ Updated performance trend
- ✅ Updated badges
- ✅ New quarterly data (if displayed)

---

## 📚 Related Documents

- **Overview:** [Pre-Onboarding System Overview](../PRE-ONBOARDING-OVERVIEW.md)
- **Pre-Flight Checklist:** [Phase 2 Pre-Flight Checklist (Revised)](./PHASE-2-PRE-FLIGHT-CHECKLIST-REVISED.md)
- **Phase 1 Plan:** [Phase 1 Implementation Plan (Revised)](../phase-1/PHASE-1-IMPLEMENTATION-PLAN-REVISED.md)
- **Existing Integration Service:** `tpe-backend/src/services/powerCardsIntegrationService.js`
- **Existing PCR Service:** `tpe-backend/src/services/pcrCalculationService.js`
- **Existing Momentum Service:** `tpe-backend/src/services/momentumCalculationService.js`

---

## 🎉 Key Advantages of This Approach

1. **Minimal Code:** ~30 lines vs. ~500+ lines
2. **Zero Risk:** Not changing existing processing logic
3. **Faster Implementation:** 1-2 days vs. 5 days
4. **Battle-Tested:** Reusing proven processing pipeline
5. **Consistent:** Same processing for quarterly and pre-onboarding
6. **Easy Maintenance:** No duplicate processing logic

---

## 🚨 Important Notes

### Threshold Configuration:
- **Current:** Hard-coded to 5 responses (50% response rate)
- **Future Enhancement:** Make threshold configurable per campaign

### Processing Idempotency:
- Status check (`status = 'active'`) prevents double-processing
- Safe to call `processCampaignCompletion()` multiple times
- Will skip campaigns already processed

### Error Handling:
- Response submission NEVER fails due to processing errors
- Processing errors are logged but don't affect user experience
- Admin can manually trigger processing later if auto-processing fails

---

**Last Updated:** November 10, 2025
**Status:** Ready for Day 1 Implementation
**Prerequisites:** Phase 1 Complete
**Estimated Completion:** 1-2 days
**Total New Code:** ~30 lines
