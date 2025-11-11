# Pre-Onboarding PowerCard System - Integration Map

**Date:** November 11, 2025
**Purpose:** Visual guide to how pre-onboarding integrates with existing PowerCard system
**Status:** Complete system architecture overview

---

## 🎯 Executive Summary

**Key Insight:** 90% of the PowerCard infrastructure already exists. Pre-onboarding is a THIN wrapper that:
1. **Phase 1:** Hooks into Step 8 completion → generates campaigns using existing services
2. **Phase 2:** Adds auto-trigger to response submission → calls existing integration

**Total New Code:**
- Phase 1: ~200 lines (wrapper service + hook)
- Phase 2: ~30 lines (auto-trigger logic)

---

## 🏗️ System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      EXISTING POWERCARD SYSTEM (90%)                        │
│                         ✅ Already Production-Ready                         │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      │
        ┌─────────────────────────────┴─────────────────────────────┐
        │                                                             │
        ▼                                                             ▼
┌───────────────────┐                                     ┌───────────────────┐
│   PHASE 1 (NEW)   │                                     │   PHASE 2 (NEW)   │
│   Wrapper Service │                                     │   Auto-Trigger    │
│    ~200 lines     │                                     │    ~30 lines      │
└───────────────────┘                                     └───────────────────┘
        │                                                             │
        │ Calls existing                                              │ Calls existing
        │ PowerCard services                                          │ integration
        ▼                                                             ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                               │
│   powerCardService.js           powerCardsIntegrationService.js             │
│   - createTemplate()            - processCampaignCompletion()               │
│   - createCampaign()            - aggregatePowerCardsData()                 │
│   - addRecipients()             - addQuarterlyDataFromPowerCards()          │
│   - submitResponse()                                                        │
│                                                                               │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 📊 Complete Data Flow Diagram

### Phase 1: Campaign Generation Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ STEP 1: Partner Completes Onboarding Step 8                                │
└─────────────────────────────────────────────────────────────────────────────┘
                              │
                              │ Trigger Event
                              ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ partnerController.js → updatePartnerStatus()                                │
│   Line XX: Add hook after status update                                    │
└─────────────────────────────────────────────────────────────────────────────┘
                              │
                              │ Hook Call
                              ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ NEW: preOnboardingPowerCardService.generatePreOnboardingCampaign(partnerId)│
│                                                                               │
│   1. Query strategic_partners table                                         │
│      ├─ Get company_name, logo_url                                          │
│      ├─ Get client_references (TEXT: "Name <email>, ...")                  │
│      └─ Get employee_references (TEXT: "Name <email>, ...")                │
│                                                                               │
│   2. Parse References (NEW helper function)                                 │
│      ├─ Split by comma                                                      │
│      ├─ Extract name and email with regex: /^(.+?)\s*<(.+?)>$/            │
│      └─ Return: [{name: "John", email: "john@..."}]                        │
│                                                                               │
│   3. Call EXISTING powerCardService.createTemplate()                        │
│      └─ Returns: templateId                                                 │
│                                                                               │
│   4. Call EXISTING powerCardService.createCampaign()                        │
│      └─ Returns: campaignId                                                 │
│                                                                               │
│   5. Call EXISTING powerCardService.addRecipients()                         │
│      ├─ Creates records in power_card_recipients                            │
│      ├─ Generates unique survey_link (crypto-based)                         │
│      └─ Returns: array of recipient objects with links                      │
│                                                                               │
│   6. Send Emails (using existing emailService)                              │
│      ├─ Subject: "[Partner Name] wants your feedback"                       │
│      ├─ Body: Personalized message with unique link                         │
│      └─ Link: ${FRONTEND_URL}/power-cards/survey/${survey_link}            │
│                                                                               │
└─────────────────────────────────────────────────────────────────────────────┘
                              │
                              │ Campaign Created
                              ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ DATABASE STATE AFTER PHASE 1                                                │
│                                                                               │
│ power_card_campaigns                                                        │
│   ├─ id: 123                                                                │
│   ├─ campaign_name: "[Partner Name] Pre-Onboarding Q1 2025"                │
│   ├─ partner_id: X                                                          │
│   ├─ status: 'active'  ◄─── Waiting for responses                          │
│   ├─ total_sent: 10                                                         │
│   └─ total_responses: 0  ◄─── Will increment as responses come in          │
│                                                                               │
│ power_card_recipients (10 rows created)                                     │
│   ├─ recipient_name: "John Doe"                                             │
│   ├─ recipient_email: "john@example.com"                                    │
│   ├─ recipient_type: 'customer' or 'employee'                               │
│   ├─ survey_link: "abc123xyz..." ◄─── Unique anonymous link                │
│   ├─ status: 'sent'                                                         │
│   └─ sent_at: NOW()                                                         │
│                                                                               │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### Phase 2: Auto-Processing Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ STEP 1: Customer/Employee Receives Email                                   │
└─────────────────────────────────────────────────────────────────────────────┘
                              │
                              │ Clicks Link
                              ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ Frontend: /power-cards/survey/:surveyLink                                  │
│                                                                               │
│ Component: PowerCardSurvey.tsx (EXISTING - 100% Ready!)                    │
│   ├─ Multi-step form (3 custom metrics + satisfaction + NPS)               │
│   ├─ Progress tracking                                                      │
│   ├─ Time tracking                                                          │
│   └─ Real-time score visualization                                          │
└─────────────────────────────────────────────────────────────────────────────┘
                              │
                              │ Submits Response
                              ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ Backend: POST /api/power-cards/survey/:surveyLink/response                 │
│                                                                               │
│ EXISTING CODE (Phase 1):                                                    │
│   ├─ Validate survey link                                                   │
│   ├─ powerCardService.submitResponse(surveyLink, responseData)             │
│   │   ├─ Insert into power_card_responses                                  │
│   │   ├─ Update power_card_campaigns.total_responses += 1                  │
│   │   └─ Update power_card_recipients.status = 'completed'                 │
│   └─ Return: { success: true, response_id, campaign_id }                   │
│                                                                               │
│ ┌───────────────────────────────────────────────────────────────────────┐  │
│ │ NEW CODE (Phase 2): ~30 lines auto-trigger                            │  │
│ │                                                                         │  │
│ │ const campaignId = result.campaign_id;                                 │  │
│ │                                                                         │  │
│ │ // Check if threshold reached                                          │  │
│ │ const campaign = await query(`                                         │  │
│ │   SELECT total_responses, status                                       │  │
│ │   FROM power_card_campaigns                                            │  │
│ │   WHERE id = $1                                                        │  │
│ │ `, [campaignId]);                                                      │  │
│ │                                                                         │  │
│ │ console.log(`[Auto-Processing] Campaign ${campaignId}: ${              │  │
│ │   campaign.total_responses}/5 responses`);                             │  │
│ │                                                                         │  │
│ │ // If 5+ responses AND status is 'active'                              │  │
│ │ if (campaign.total_responses >= 5 && campaign.status === 'active') {  │  │
│ │   console.log(`[Auto-Processing] Threshold reached!`);                 │  │
│ │                                                                         │  │
│ │   try {                                                                │  │
│ │     // AUTO-TRIGGER: Call existing integration                         │  │
│ │     await powerCardsIntegrationService                                 │  │
│ │       .processCampaignCompletion(campaignId);                          │  │
│ │                                                                         │  │
│ │     // Update campaign status                                          │  │
│ │     await query(`                                                      │  │
│ │       UPDATE power_card_campaigns                                      │  │
│ │       SET status = 'completed', updated_at = NOW()                     │  │
│ │       WHERE id = $1                                                    │  │
│ │     `, [campaignId]);                                                  │  │
│ │                                                                         │  │
│ │     console.log(`[Auto-Processing] Completed successfully`);           │  │
│ │   } catch (error) {                                                    │  │
│ │     console.error(`[Auto-Processing] Failed:`, error);                 │  │
│ │     // Don't fail the response submission!                             │  │
│ │   }                                                                    │  │
│ │ }                                                                      │  │
│ └───────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
                              │
                              │ Threshold Reached (5+ responses)
                              ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ EXISTING: powerCardsIntegrationService.processCampaignCompletion()         │
│                                                                               │
│ THIS FUNCTION DOES EVERYTHING! (Already exists - production ready)         │
│                                                                               │
│ Step 1: aggregatePowerCardsData(campaignId, partnerId)                     │
│   ├─ Query all responses for campaign                                      │
│   ├─ Calculate averages:                                                    │
│   │   ├─ avg_satisfaction (from satisfaction_score)                        │
│   │   ├─ avg_nps (from recommendation_score)                               │
│   │   ├─ avg_metric_1 (from metric_1_score)                                │
│   │   ├─ avg_metric_2 (from metric_2_score)                                │
│   │   └─ avg_metric_3 (from metric_3_score)                                │
│   └─ Convert 0-10 scale → 0-100 PCR scale (multiply by 10)                │
│                                                                               │
│ Step 2: addQuarterlyDataFromPowerCards(partnerId, campaignId)              │
│   ├─ Get existing quarterly_history from strategic_partners                │
│   ├─ Add new quarter entry:                                                │
│   │   {                                                                     │
│   │     quarter: 'Q1 2025',                                                │
│   │     avg_satisfaction: 85,                                              │
│   │     avg_nps: 70,                                                       │
│   │     campaign_id: 123,                                                  │
│   │     response_count: 7,                                                 │
│   │     date: '2025-11-11'                                                 │
│   │   }                                                                     │
│   └─ Update strategic_partners.quarterly_history (JSONB array)             │
│                                                                               │
│ Step 3: Calculate Quarterly Feedback Score (70% of final PCR)              │
│   ├─ Formula: (avg_satisfaction + avg_nps + metrics) / metrics_count       │
│   └─ Update strategic_partners.quarterly_feedback_score                    │
│                                                                               │
│ Step 4: Calculate Final PCR Score                                          │
│   ├─ Formula: (base_pcr_score × 30%) + (quarterly_feedback_score × 70%)   │
│   └─ Update strategic_partners.final_pcr_score                             │
│                                                                               │
│ Step 5: momentumService.recalculateMomentum(partnerId)                     │
│   ├─ Compare current quarter vs previous quarters                          │
│   ├─ Calculate trend: 'rising', 'stable', 'declining'                      │
│   └─ Update strategic_partners.performance_trend                           │
│                                                                               │
│ Step 6: badgeService.updatePartnerBadges(partnerId)                        │
│   ├─ Check if partner qualifies for badges:                                │
│   │   ├─ "Top Rated" (PCR >= 85)                                           │
│   │   ├─ "Rising Star" (momentum = 'rising')                               │
│   │   ├─ "Customer Favorite" (avg_satisfaction >= 9)                       │
│   │   └─ "Highly Recommended" (avg_nps >= 80)                              │
│   └─ Update strategic_partners.badges (JSONB array)                        │
│                                                                               │
│ Step 7: Create partner_reports record                                      │
│   ├─ Store aggregated data in JSONB                                        │
│   ├─ Link to campaign_id                                                   │
│   └─ Mark report as 'published'                                            │
│                                                                               │
└─────────────────────────────────────────────────────────────────────────────┘
                              │
                              │ All Updates Complete
                              ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ DATABASE STATE AFTER PHASE 2 (Auto-Processing Complete)                    │
│                                                                               │
│ power_card_campaigns                                                        │
│   ├─ status: 'completed' ◄─── Changed from 'active'                        │
│   └─ total_responses: 7                                                     │
│                                                                               │
│ strategic_partners                                                          │
│   ├─ quarterly_feedback_score: 82.5  ◄─── NEW! (70% weight)                │
│   ├─ final_pcr_score: 88.75  ◄─── UPDATED! (30% base + 70% quarterly)     │
│   ├─ performance_trend: 'rising'  ◄─── UPDATED!                            │
│   ├─ badges: ["Top Rated", "Rising Star"]  ◄─── UPDATED!                   │
│   └─ quarterly_history: [                                                   │
│         {                                                                    │
│           quarter: 'Q1 2025',  ◄─── NEW ENTRY ADDED!                        │
│           avg_satisfaction: 85,                                             │
│           avg_nps: 80,                                                      │
│           campaign_id: 123,                                                 │
│           response_count: 7,                                                │
│           date: '2025-11-11'                                                │
│         }                                                                    │
│       ]                                                                      │
│                                                                               │
│ partner_reports                                                             │
│   ├─ New report created for Q1 2025                                         │
│   ├─ report_type: 'pre-onboarding-powercard'                               │
│   └─ status: 'published'                                                    │
│                                                                               │
└─────────────────────────────────────────────────────────────────────────────┘
                              │
                              │ Landing Page Auto-Updates
                              ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ PUBLIC LANDING PAGE: /pcr/{partner_slug}                                   │
│                                                                               │
│ Component: PublicPCRLandingV2.tsx                                           │
│   ├─ Fetches partner data by public_url slug                               │
│   ├─ Displays UPDATED final_pcr_score: 88.75  ◄─── Automatically updated! │
│   ├─ Shows performance_trend: 'rising' with up arrow                       │
│   ├─ Displays badges: ["Top Rated", "Rising Star"]                         │
│   └─ Shows quarterly_history chart with new Q1 2025 data                   │
│                                                                               │
│ ✨ NO MANUAL UPDATES NEEDED - Everything automatic!                         │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🔗 Integration Points Summary

### Phase 1 Integration Points

| Integration Point | Location | Description | Code Type |
|------------------|----------|-------------|-----------|
| **Hook Trigger** | `partnerController.js` line XX | After Step 8 status update, call campaign generation | NEW (~3 lines) |
| **Wrapper Service** | `preOnboardingPowerCardService.js` | Parse references and orchestrate campaign creation | NEW (~200 lines) |
| **Template Creation** | Calls `powerCardService.createTemplate()` | Existing service - no changes | EXISTING |
| **Campaign Creation** | Calls `powerCardService.createCampaign()` | Existing service - no changes | EXISTING |
| **Recipient Addition** | Calls `powerCardService.addRecipients()` | Existing service - no changes | EXISTING |
| **Email Sending** | Calls `emailService.sendPowerCardEmail()` | May need new email template | EXISTING (+ template) |

### Phase 2 Integration Points

| Integration Point | Location | Description | Code Type |
|------------------|----------|-------------|-----------|
| **Auto-Trigger** | `powerCards.js` routes, response submission endpoint | Check threshold and trigger processing | NEW (~30 lines) |
| **Campaign Processing** | Calls `powerCardsIntegrationService.processCampaignCompletion()` | Existing integration - no changes | EXISTING |
| **PCR Calculation** | Called by `processCampaignCompletion()` | Existing calculation logic | EXISTING |
| **Momentum Update** | Called by `processCampaignCompletion()` | Existing momentum service | EXISTING |
| **Badge Update** | Called by `processCampaignCompletion()` | Existing badge service | EXISTING |

---

## 📁 File Dependency Map

### Files That EXIST (Production-Ready)

```
tpe-backend/src/
├── services/
│   ├── powerCardService.js ✅
│   │   ├── createTemplate()
│   │   ├── createCampaign()
│   │   ├── addRecipients()
│   │   └── submitResponse()
│   │
│   ├── powerCardsIntegrationService.js ✅
│   │   ├── processCampaignCompletion() ◄─── KEY FUNCTION!
│   │   ├── aggregatePowerCardsData()
│   │   └── addQuarterlyDataFromPowerCards()
│   │
│   ├── momentumService.js ✅
│   │   └── recalculateMomentum()
│   │
│   ├── badgeService.js ✅
│   │   └── updatePartnerBadges()
│   │
│   ├── pcrCalculationService.js ✅
│   │   └── calculatePartnerPCR()
│   │
│   └── emailService.js ✅
│       └── sendEmail() (may need PowerCard template)
│
└── routes/
    └── powerCards.js ✅
        ├── POST /survey/:surveyLink/response
        └── ... (other PowerCard endpoints)

tpe-front-end/src/
└── components/
    └── powerCards/
        ├── PowerCardSurvey.tsx ✅
        └── (other PowerCard components)
```

### Files We NEED TO CREATE

```
Phase 1:
tpe-backend/src/
└── services/
    └── preOnboardingPowerCardService.js 🆕 (~200 lines)
        ├── generatePreOnboardingCampaign()
        └── parseReferences()

Phase 2:
(No new files - just modify existing powerCards.js routes)
```

---

## 🔄 Call Sequence Diagrams

### Phase 1: Campaign Generation

```
Step 8 Complete
      │
      ▼
partnerController.updatePartnerStatus()
      │
      ├─ Update partner.onboarding_step = 8
      ├─ Update partner.status = 'active'
      │
      └─ 🆕 Hook: preOnboardingPowerCardService.generatePreOnboardingCampaign(partnerId)
            │
            ├─ Query strategic_partners
            ├─ Parse client_references → [{name, email}, ...]
            ├─ Parse employee_references → [{name, email}, ...]
            │
            ├─ ✅ powerCardService.createTemplate(templateData)
            │   └─ Returns: templateId
            │
            ├─ ✅ powerCardService.createCampaign(campaignData)
            │   └─ Returns: campaignId
            │
            ├─ ✅ powerCardService.addRecipients(campaignId, templateId, recipients)
            │   ├─ Creates power_card_recipients rows
            │   ├─ Generates unique survey_links
            │   └─ Returns: [{recipient, survey_link}, ...]
            │
            └─ ✅ emailService.sendEmail() for each recipient
                └─ Email contains: ${FRONTEND_URL}/power-cards/survey/${survey_link}
```

### Phase 2: Auto-Processing

```
User Submits Response
      │
      ▼
POST /api/power-cards/survey/:surveyLink/response
      │
      ├─ ✅ powerCardService.submitResponse(surveyLink, responseData)
      │   ├─ Insert power_card_responses
      │   ├─ Increment power_card_campaigns.total_responses
      │   └─ Returns: {campaign_id, response_id}
      │
      └─ 🆕 Auto-Trigger Logic:
            │
            ├─ Query campaign status and total_responses
            │
            ├─ if (total_responses >= 5 && status === 'active')
            │   │
            │   ├─ ✅ powerCardsIntegrationService.processCampaignCompletion(campaignId)
            │   │   │
            │   │   ├─ aggregatePowerCardsData()
            │   │   ├─ addQuarterlyDataFromPowerCards()
            │   │   ├─ Calculate quarterly_feedback_score
            │   │   ├─ Calculate final_pcr_score
            │   │   ├─ ✅ momentumService.recalculateMomentum()
            │   │   ├─ ✅ badgeService.updatePartnerBadges()
            │   │   └─ Create partner_reports record
            │   │
            │   └─ Update campaign.status = 'completed'
            │
            └─ Return success (even if auto-trigger fails!)
```

---

## 🎯 Success Criteria & Verification

### Phase 1 Success Metrics

| Metric | How to Verify |
|--------|---------------|
| Campaign Generated | Query `power_card_campaigns` for pre-onboarding campaigns |
| Recipients Added | Check `power_card_recipients.total_sent` matches expected count |
| Emails Sent | Check email service logs for sent count |
| Unique Links Created | Verify `power_card_recipients.survey_link` are all unique |
| Campaign Status Active | Verify `power_card_campaigns.status = 'active'` |

### Phase 2 Success Metrics

| Metric | How to Verify |
|--------|---------------|
| Auto-Trigger Fires | Check logs for "[Auto-Processing] Threshold reached!" |
| PCR Score Updated | Query `strategic_partners.final_pcr_score` for partner |
| Quarterly History Updated | Check `strategic_partners.quarterly_history` JSONB array |
| Momentum Calculated | Verify `strategic_partners.performance_trend` updated |
| Badges Updated | Check `strategic_partners.badges` JSONB array |
| Campaign Completed | Verify `power_card_campaigns.status = 'completed'` |
| Landing Page Updates | Visit `/pcr/{slug}` and verify new scores display |

---

## 🔍 Debugging Guide

### Phase 1 Debugging

**Issue:** Campaign not generating after Step 8
```
1. Check: Hook added to partnerController.js?
2. Check: preOnboardingPowerCardService.js exists?
3. Check: Partner has client_references and employee_references?
4. Check: References are in "Name <email>" format?
5. Check: Email service is configured?
6. Check: FRONTEND_URL environment variable set?
```

**Issue:** Recipients not receiving emails
```
1. Check: power_card_recipients records created?
2. Check: survey_link field populated?
3. Check: Email service logs for errors?
4. Check: Email addresses are valid?
5. Check: SMTP/API credentials configured?
```

### Phase 2 Debugging

**Issue:** Auto-trigger not firing
```
1. Check: Response submission successful?
2. Check: campaign_id returned from submission?
3. Check: Campaign has 5+ responses?
4. Check: Campaign status is 'active' (not 'completed')?
5. Check: Logs show "[Auto-Processing]" messages?
```

**Issue:** processCampaignCompletion fails
```
1. Check: powerCardsIntegrationService.js exists?
2. Check: All dependency services exist (momentum, badge, PCR)?
3. Check: strategic_partners has required fields?
4. Check: Database transaction handling correct?
5. MANUAL TEST: Run processCampaignCompletion directly
```

**Issue:** PCR scores not updating
```
1. Check: processCampaignCompletion completed without errors?
2. Check: strategic_partners.quarterly_feedback_score updated?
3. Check: strategic_partners.final_pcr_score updated?
4. Check: quarterly_history JSONB array has new entry?
5. Check: Landing page queries correct partner by public_url?
```

---

## 📚 Related Documentation

- **Phase 1 Plan:** `phase-1/PHASE-1-IMPLEMENTATION-PLAN-REVISED.md`
- **Phase 1 Checklist:** `phase-1/PHASE-1-PRE-FLIGHT-CHECKLIST.md`
- **Phase 2 Plan:** `phase-2/PHASE-2-IMPLEMENTATION-PLAN-REVISED.md`
- **Phase 2 Checklist:** `phase-2/PHASE-2-PRE-FLIGHT-CHECKLIST.md`
- **System Overview:** `PRE-ONBOARDING-OVERVIEW.md`
- **Database Schema:** `/DATABASE-SOURCE-OF-TRUTH.md`
- **Existing Services:**
  - `tpe-backend/src/services/powerCardService.js`
  - `tpe-backend/src/services/powerCardsIntegrationService.js`

---

## ✨ Key Takeaways

1. **90% Already Exists:** The hard work is done - we're just connecting pieces
2. **Phase 1 = Thin Wrapper:** Parse references → call existing services
3. **Phase 2 = Auto-Trigger:** Add ~30 lines to call existing integration
4. **No Database Migrations:** All tables and fields already exist
5. **Production Ready:** Existing services are tested and working
6. **Timeline:** 4-6 days total (not 12+ days!)

---

**Last Updated:** November 11, 2025
**Status:** Complete Integration Map
**Next Step:** Run Pre-Flight Checklists and Begin Phase 1 Implementation
