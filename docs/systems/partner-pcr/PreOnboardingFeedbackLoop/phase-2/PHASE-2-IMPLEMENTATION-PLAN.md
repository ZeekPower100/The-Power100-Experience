# Phase 2: Response Aggregation & PCR Calculation - Implementation Plan

**Document Version:** 1.0
**Date:** November 10, 2025
**Status:** READY FOR IMPLEMENTATION
**Database Schema:** Verified November 10, 2025
**Prerequisites:** Phase 1 Complete (PowerCard Generation System)

---

## 📋 Executive Summary

**Goal:** Aggregate PowerCard responses and generate partner's first PCR score and quarterly report.

### What Phase 2 Delivers
- ✅ Automatic response aggregation when threshold reached (5+ responses)
- ✅ PCR score calculation combining profile (30%) + PowerCard responses (70%)
- ✅ First quarterly report generation
- ✅ Auto-update `strategic_partners.final_pcr_score`
- ✅ Landing page auto-population with real data
- ✅ Campaign completion workflow

---

## 🗄️ Database Schema (All Tables Exist - Verified November 10, 2025)

**DATABASE-CHECKED: No migrations needed, all tables exist**

### Key Tables for Phase 2

#### power_card_responses (Response Aggregation Source)
```sql
id                   INTEGER PRIMARY KEY
campaign_id          INTEGER             -- Link to campaign
satisfaction_score   INTEGER             -- 1-10 rating
recommendation_score INTEGER             -- NPS score
metric_1_score       INTEGER             -- Custom metrics
metric_2_score       INTEGER
metric_3_score       INTEGER
metric_1_response    TEXT                -- Qualitative feedback
metric_2_response    TEXT
metric_3_response    TEXT
submitted_at         TIMESTAMP
```

#### strategic_partners (PCR Score Storage)
```sql
id                   INTEGER PRIMARY KEY
company_name         VARCHAR
final_pcr_score      NUMERIC             -- ⚠️ UPDATES HERE
base_pcr_score       NUMERIC             -- Profile-based score (30%)
quarterly_feedback_score NUMERIC         -- PowerCard score (70%)
performance_trend    VARCHAR             -- 'improving', 'stable', 'declining'
```

#### partner_reports (First Report Generation)
```sql
id                   INTEGER PRIMARY KEY
partner_id           INTEGER             -- FK to strategic_partners
campaign_id          INTEGER             -- FK to power_card_campaigns
report_type          VARCHAR             -- 'quarterly'
quarter              VARCHAR             -- Q1, Q2, Q3, Q4
year                 INTEGER
report_data          JSONB               -- Full aggregated data
avg_satisfaction     NUMERIC             -- Aggregated score
avg_nps              INTEGER             -- Aggregated NPS
total_responses      INTEGER             -- Response count
status               VARCHAR             -- 'draft' → 'generated'
```

---

## 🔄 Aggregation Logic

### Trigger Conditions

**When to Aggregate:**
1. **Threshold Met**: Campaign has >= 5 responses (50% response rate)
2. **Campaign Status**: Status is 'active' (not already 'completed')
3. **Automatic**: Triggered by response submission webhook

### Aggregation Formula

**Profile-Based Score (Already Exists):**
- Implementation: `pcrCalculationService.js`
- Weight: 30% of final PCR
- Components: Logo (5), demos (20), description (10), differentiators (10), etc.

**PowerCard Response Score (Phase 2):**
- Weight: 70% of final PCR
- Formula: `(avg_satisfaction * 10) + (NPS_normalized * 0.3) + (avg_custom_metrics * 0.5)`
- Normalize NPS: Convert -100 to 100 range → 0 to 100 scale

**Final PCR:**
```javascript
finalPCR = (profileScore * 0.30) + (powercardScore * 0.70)
```

---

## 🛠️ Service Layer Implementation

### File 1: PowerCard Response Aggregation Service

**File:** `tpe-backend/src/services/powercardAggregationService.js` (NEW FILE)

**DATABASE-CHECKED: All field names verified November 10, 2025**

```javascript
// DATABASE-CHECKED: power_card_responses, power_card_campaigns, strategic_partners,
//                   partner_reports tables verified November 10, 2025
// ================================================================
// PowerCard Response Aggregation Service
// ================================================================
// Purpose: Aggregate PowerCard responses and generate first report
// Triggers: Called when campaign reaches response threshold
// ================================================================

const { query } = require('../config/database');
const pcrCalculationService = require('./pcrCalculationService');

/**
 * Check if campaign has reached response threshold and trigger aggregation
 *
 * DATABASE TABLES: power_card_campaigns, power_card_responses
 *
 * @param {number} campaignId - PowerCard campaign ID
 * @returns {Object|null} Aggregation result or null if threshold not met
 */
async function checkAndAggregate(campaignId) {
  console.log(`[Aggregation] Checking campaign ${campaignId} for aggregation threshold`);

  // STEP 1: Get campaign info
  const campaignResult = await query(`
    SELECT
      id,
      partner_id,
      campaign_name,
      quarter,
      year,
      status,
      total_sent,
      total_responses
    FROM power_card_campaigns
    WHERE id = $1
  `, [campaignId]);

  if (campaignResult.rows.length === 0) {
    throw new Error(`Campaign ${campaignId} not found`);
  }

  const campaign = campaignResult.rows[0];

  // STEP 2: Check if already completed
  if (campaign.status === 'completed') {
    console.log(`[Aggregation] Campaign ${campaignId} already completed`);
    return null;
  }

  // STEP 3: Check response threshold (minimum 5 responses = 50%)
  if (campaign.total_responses < 5) {
    console.log(`[Aggregation] Campaign ${campaignId} has only ${campaign.total_responses}/10 responses. Waiting for threshold.`);
    return null;
  }

  console.log(`[Aggregation] ✅ Threshold met! Aggregating ${campaign.total_responses} responses`);

  // STEP 4: Aggregate responses
  return await aggregateCampaignResponses(campaignId);
}

/**
 * Aggregate all responses for a campaign and generate report
 *
 * DATABASE TABLES: power_card_responses, strategic_partners, partner_reports
 *
 * @param {number} campaignId - PowerCard campaign ID
 * @returns {Object} Aggregated data and report ID
 */
async function aggregateCampaignResponses(campaignId) {
  console.log(`[Aggregation] Starting aggregation for campaign ${campaignId}`);

  // STEP 1: Get campaign details
  const campaignResult = await query(`
    SELECT
      id,
      partner_id,
      campaign_name,
      quarter,
      year
    FROM power_card_campaigns
    WHERE id = $1
  `, [campaignId]);

  const campaign = campaignResult.rows[0];

  // STEP 2: Get all responses for this campaign
  const responsesResult = await query(`
    SELECT
      satisfaction_score,
      recommendation_score,
      metric_1_score,
      metric_2_score,
      metric_3_score,
      metric_1_response,
      metric_2_response,
      metric_3_response,
      submitted_at
    FROM power_card_responses
    WHERE campaign_id = $1
    ORDER BY submitted_at
  `, [campaignId]);

  const responses = responsesResult.rows;
  const totalResponses = responses.length;

  if (totalResponses === 0) {
    throw new Error(`No responses found for campaign ${campaignId}`);
  }

  // STEP 3: Calculate aggregated metrics
  const avgSatisfaction = responses.reduce((sum, r) => sum + (r.satisfaction_score || 0), 0) / totalResponses;
  const avgNPS = responses.reduce((sum, r) => sum + (r.recommendation_score || 0), 0) / totalResponses;
  const avgMetric1 = responses.reduce((sum, r) => sum + (r.metric_1_score || 0), 0) / totalResponses;
  const avgMetric2 = responses.reduce((sum, r) => sum + (r.metric_2_score || 0), 0) / totalResponses;
  const avgMetric3 = responses.reduce((sum, r) => sum + (r.metric_3_score || 0), 0) / totalResponses;

  // STEP 4: Calculate PowerCard-based quarterly score (70% of final PCR)
  // Formula: (satisfaction * 10) + (NPS normalized * 0.3) + (avg metrics * 0.5)
  const npsNormalized = ((avgNPS + 100) / 200) * 100; // Convert -100 to 100 → 0 to 100
  const avgCustomMetrics = (avgMetric1 + avgMetric2 + avgMetric3) / 3;
  const quarterlyScore = (avgSatisfaction * 10) + (npsNormalized * 0.3) + (avgCustomMetrics * 0.5);

  // STEP 5: Get partner's profile-based score (30% of final PCR)
  const partner = await pcrCalculationService.getPartnerWithScores(campaign.partner_id);
  const profileScore = partner.base_pcr_score || 50; // Default to 50 if not calculated yet

  // STEP 6: Calculate final PCR (30% profile + 70% quarterly)
  const finalPCR = (profileScore * 0.30) + (quarterlyScore * 0.70);

  // STEP 7: Update strategic_partners with new scores
  await query(`
    UPDATE strategic_partners
    SET
      quarterly_feedback_score = $1,
      final_pcr_score = $2,
      performance_trend = $3,
      updated_at = NOW()
    WHERE id = $4
  `, [
    quarterlyScore,
    finalPCR,
    determineTrend(finalPCR, partner.final_pcr_score),
    campaign.partner_id
  ]);

  // STEP 8: Collect qualitative feedback (testimonials)
  const testimonials = responses
    .filter(r => r.metric_1_response || r.metric_2_response || r.metric_3_response)
    .map(r => ({
      feedback: r.metric_1_response || r.metric_2_response || r.metric_3_response,
      rating: r.satisfaction_score,
      submitted_at: r.submitted_at
    }));

  // STEP 9: Create report_data structure
  const reportData = {
    campaign: {
      id: campaign.id,
      name: campaign.campaign_name,
      quarter: campaign.quarter,
      year: campaign.year
    },
    aggregated_metrics: {
      total_responses: totalResponses,
      avg_satisfaction: parseFloat(avgSatisfaction.toFixed(2)),
      avg_nps: parseInt(avgNPS),
      avg_metric_1: parseFloat(avgMetric1.toFixed(2)),
      avg_metric_2: parseFloat(avgMetric2.toFixed(2)),
      avg_metric_3: parseFloat(avgMetric3.toFixed(2))
    },
    scores: {
      profile_score: parseFloat(profileScore.toFixed(2)),
      quarterly_score: parseFloat(quarterlyScore.toFixed(2)),
      final_pcr: parseFloat(finalPCR.toFixed(2))
    },
    testimonials: testimonials.slice(0, 5), // Top 5 testimonials
    generated_at: new Date().toISOString()
  };

  // STEP 10: Create partner_reports record
  const reportResult = await query(`
    INSERT INTO partner_reports (
      partner_id,
      campaign_id,
      report_type,
      quarter,
      year,
      report_data,
      avg_satisfaction,
      avg_nps,
      total_responses,
      status,
      generation_date
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
    RETURNING id
  `, [
    campaign.partner_id,
    campaign.id,
    'quarterly',
    campaign.quarter,
    campaign.year,
    JSON.stringify(reportData),
    avgSatisfaction,
    avgNPS,
    totalResponses,
    'generated'
  ]);

  const reportId = reportResult.rows[0].id;

  // STEP 11: Update campaign status to 'completed'
  await query(`
    UPDATE power_card_campaigns
    SET
      status = 'completed',
      response_rate = ($1::NUMERIC / total_sent) * 100,
      updated_at = NOW()
    WHERE id = $2
  `, [totalResponses, campaign.id]);

  console.log(`[Aggregation] ✅ Campaign ${campaignId} completed. Report ${reportId} generated. Final PCR: ${finalPCR.toFixed(2)}`);

  return {
    campaignId: campaign.id,
    reportId,
    partnerId: campaign.partner_id,
    finalPCR: parseFloat(finalPCR.toFixed(2)),
    totalResponses,
    reportData
  };
}

/**
 * Determine performance trend by comparing scores
 *
 * @param {number} newScore - New PCR score
 * @param {number} oldScore - Previous PCR score (or null)
 * @returns {string} 'improving', 'stable', 'declining', or 'new'
 */
function determineTrend(newScore, oldScore) {
  if (!oldScore) return 'new';

  const diff = newScore - oldScore;

  if (diff > 5) return 'improving';
  if (diff < -5) return 'declining';
  return 'stable';
}

module.exports = {
  checkAndAggregate,
  aggregateCampaignResponses
};
```

---

### File 2: Response Submission Webhook

**File:** `tpe-backend/src/routes/powercard.js` (UPDATE - add submission endpoint)

```javascript
/**
 * POST /api/powercard/submit/:token
 * Submit PowerCard response (PUBLIC - no auth required)
 */
router.post('/submit/:token', asyncHandler(async (req, res) => {
  const { token } = req.params;
  const responseData = req.body;

  // Step 1: Validate token and get recipient
  const recipient = await query(`
    SELECT
      id,
      campaign_id,
      recipient_email,
      recipient_name,
      status,
      template_id
    FROM power_card_recipients
    WHERE survey_link LIKE $1 AND status != 'completed'
  `, [`%${token}%`]);

  if (recipient.rows.length === 0) {
    return res.status(404).json({
      success: false,
      message: 'PowerCard not found or already submitted'
    });
  }

  const rec = recipient.rows[0];

  // Step 2: Save response
  await query(`
    INSERT INTO power_card_responses (
      campaign_id,
      template_id,
      satisfaction_score,
      recommendation_score,
      metric_1_score,
      metric_2_score,
      metric_3_score,
      metric_1_response,
      metric_2_response,
      metric_3_response,
      submitted_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
  `, [
    rec.campaign_id,
    rec.template_id,
    responseData.satisfaction_score,
    responseData.recommendation_score,
    responseData.metric_1_score,
    responseData.metric_2_score,
    responseData.metric_3_score,
    responseData.metric_1_response,
    responseData.metric_2_response,
    responseData.metric_3_response
  ]);

  // Step 3: Update recipient status
  await query(`
    UPDATE power_card_recipients
    SET status = 'completed', completed_at = NOW()
    WHERE id = $1
  `, [rec.id]);

  // Step 4: Increment campaign total_responses
  await query(`
    UPDATE power_card_campaigns
    SET total_responses = total_responses + 1
    WHERE id = $1
  `, [rec.campaign_id]);

  // Step 5: Check if aggregation threshold met
  const aggregationService = require('../services/powercardAggregationService');
  await aggregationService.checkAndAggregate(rec.campaign_id);

  res.json({
    success: true,
    message: 'Response submitted successfully'
  });
}));
```

---

## 📅 Implementation Timeline (3-5 Days)

### Day 1: Aggregation Service
**Tasks:**
1. Create `powercardAggregationService.js`
2. Implement `checkAndAggregate()` function
3. Implement `aggregateCampaignResponses()` function
4. Test aggregation logic with sample data
5. Unit tests for calculations

**Deliverable:** Working aggregation service

---

### Day 2: PCR Score Calculation
**Tasks:**
1. Integrate with existing `pcrCalculationService.js`
2. Test profile score (30%) + quarterly score (70%) formula
3. Verify `final_pcr_score` updates correctly
4. Test trend calculation logic
5. Verify landing page shows updated score

**Deliverable:** Accurate PCR calculation

---

### Day 3: Report Generation
**Tasks:**
1. Test `partner_reports` record creation
2. Verify report_data JSONB structure
3. Test testimonial extraction
4. Verify campaign status updates to 'completed'
5. Test landing page auto-population

**Deliverable:** First reports generated successfully

---

### Day 4: Response Submission Integration
**Tasks:**
1. Update PowerCard response submission endpoint
2. Add automatic aggregation check after each response
3. Test threshold logic (triggers at 5 responses)
4. End-to-end testing
5. Error handling

**Deliverable:** Complete submission → aggregation flow

---

### Day 5: Testing & Validation
**Tasks:**
1. Test full flow with multiple partners
2. Verify PCR scores match manual calculations
3. Test edge cases (0 responses, 10 responses, etc.)
4. Performance testing
5. Documentation

**Deliverable:** Production-ready Phase 2 system

---

## 🎯 Success Metrics

| Metric | Target | How to Measure |
|--------|--------|----------------|
| **Aggregation Speed** | < 2 seconds | Time to aggregate 10 responses |
| **PCR Calculation Accuracy** | 100% | Matches manual calculation |
| **Report Generation** | < 1 second | Time to create partner_reports record |
| **Landing Page Update** | Immediate | PCR score visible after aggregation |
| **Threshold Detection** | 100% | Triggers at exactly 5 responses |

---

## 📚 Related Documents

- **Overview:** [Pre-Onboarding System Overview](../PRE-ONBOARDING-OVERVIEW.md)
- **Pre-Flight Checklist:** [Phase 2 Pre-Flight Checklist](./PHASE-2-PRE-FLIGHT-CHECKLIST.md)
- **Phase 1 Plan:** [Phase 1 Implementation Plan](../phase-1/PHASE-1-IMPLEMENTATION-PLAN.md)
- **PCR Calculation Service:** `tpe-backend/src/services/pcrCalculationService.js`

---

**Last Updated:** November 10, 2025
**Status:** Ready for Day 1 (Pre-Flight Checklist)
**Prerequisites:** Phase 1 Complete
**Next Step:** Complete Phase 2 Pre-Flight Checklist
