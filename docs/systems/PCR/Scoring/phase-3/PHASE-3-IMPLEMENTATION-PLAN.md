# Phase 3: PowerCards Integration & Engagement Layer - Implementation Plan

**Document Version:** 1.0
**Date:** October 30, 2025
**Status:** READY FOR IMPLEMENTATION
**Database Schema:** power_card_* tables + strategic_partners (145 columns verified October 30, 2025)

---

## 📋 Executive Summary

**Goal:** Integrate existing PowerCards quarterly feedback system with PCR scoring engine, then add visual engagement layers to existing partner portal dashboard.

### What Phase 3 Delivers
- ✅ PowerCards → `quarterly_history` integration pipeline
- ✅ Automatic momentum recalculation after campaign completion
- ✅ Badge visibility in existing partner portal dashboard
- ✅ Momentum and performance cards in partner stats
- ✅ PCR evolution chart and momentum history visualization
- ✅ Admin analytics enhancement (all-partner momentum overview)

### Key Discovery: PowerCards Already Exists! 🎉

**Existing Infrastructure:**
- ✅ `power_card_campaigns` table (11 columns - quarterly campaigns)
- ✅ `power_card_responses` table (13 columns - survey responses)
- ✅ `power_card_analytics` table (17 columns - aggregated data)
- ✅ `power_card_templates` table (18 columns - customizable surveys)
- ✅ `power_card_recipients` table (18 columns - survey recipients)
- ✅ Partner portal dashboard (`/partner-portal/dashboard`)

**Phase 3 is an INTEGRATION project, not a build-from-scratch project.**

---

## 🗄️ Database Schema Verification

### Prerequisites Verification ✅

**CRITICAL: Run Pre-Flight Checklist BEFORE implementing**

**Existing PowerCards Tables (REUSE - DO NOT MODIFY):**

#### 1. power_card_campaigns (11 columns)
```sql
column_name          | data_type                   | column_default
---------------------|-----------------------------|-----------------------
id                   | integer                     | nextval('power_card_campaigns_id_seq')
campaign_name        | character varying(255)      |
quarter              | character varying(10)       |  -- 'Q1', 'Q2', 'Q3', 'Q4'
year                 | integer                     |
start_date           | date                        |
end_date             | date                        |
status               | character varying(50)       | 'draft'  -- 'draft', 'active', 'completed', 'archived'
created_by           | integer                     |
created_at           | timestamp without time zone | CURRENT_TIMESTAMP
updated_at           | timestamp without time zone | CURRENT_TIMESTAMP
description          | text                        |
```

#### 2. power_card_responses (13 columns)
```sql
column_name            | data_type                   | column_default
-----------------------|-----------------------------|-----------------------
id                     | integer                     | nextval('power_card_responses_id_seq')
campaign_id            | integer                     |
template_id            | integer                     |
recipient_id           | integer                     |
contractor_id          | integer                     |
partner_id             | integer                     |  -- CRITICAL: Maps to strategic_partners.id
metric_1_score         | numeric(5,2)                |
metric_2_score         | numeric(5,2)                |
metric_3_score         | numeric(5,2)                |
satisfaction_score     | numeric(5,2)                |  -- 0-5 scale
recommendation_score   | numeric(5,2)                |  -- NPS: -100 to 100
submitted_at           | timestamp without time zone | CURRENT_TIMESTAMP
feedback_comments      | text                        |
```

#### 3. power_card_analytics (17 columns)
```sql
column_name                | data_type                   | column_default
---------------------------|-----------------------------|-----------------------
id                         | integer                     | nextval('power_card_analytics_id_seq')
campaign_id                | integer                     |
partner_id                 | integer                     |  -- CRITICAL: Maps to strategic_partners.id
quarter                    | character varying(10)       |
year                       | integer                     |
response_count             | integer                     | 0
avg_metric_1               | numeric(5,2)                |
avg_metric_2               | numeric(5,2)                |
avg_metric_3               | numeric(5,2)                |
avg_satisfaction           | numeric(5,2)                |  -- Will map to quarterly_feedback_score
avg_nps                    | numeric(5,2)                |
trend_direction            | character varying(20)       |  -- 'up', 'down', 'stable'
previous_avg_satisfaction  | numeric(5,2)                |
satisfaction_change        | numeric(5,2)                |
calculated_at              | timestamp without time zone | CURRENT_TIMESTAMP
created_at                 | timestamp without time zone | CURRENT_TIMESTAMP
updated_at                 | timestamp without time zone | CURRENT_TIMESTAMP
```

**Existing strategic_partners Phase 2 Fields (WILL POPULATE):**
```sql
column_name                | data_type          | column_default         | notes
---------------------------|--------------------|-----------------------|------------------
quarterly_history          | jsonb              | '[]'::jsonb           | TARGET for PowerCards data
momentum_modifier          | integer            | 0                     | Recalc after PowerCards
performance_trend          | character varying  | 'new'                 | Recalc after PowerCards
earned_badges              | jsonb              | '[]'::jsonb           | Recalc after PowerCards
badge_last_updated         | timestamp          |                       |
next_quarterly_review      | date               |                       | EXISTING - will use!
quarterly_feedback_score   | numeric(5,2)       | 50.00                 | Update from PowerCards
```

---

## 🔧 Service Layer: PowerCards Integration Service

**File:** `tpe-backend/src/services/powerCardsIntegrationService.js` (CREATE)

**DATABASE-CHECKED: All field names verified against power_card_* and strategic_partners schemas**

```javascript
// DATABASE-CHECKED: power_card_campaigns, power_card_responses, power_card_analytics, strategic_partners columns verified October 30, 2025
// ================================================================
// PowerCards Integration Service (Phase 3)
// ================================================================
// Purpose: Connect PowerCards quarterly feedback to PCR scoring system
// Flow: PowerCards Campaign Complete → quarterly_history → Momentum Recalc → Badge Update
// ================================================================

const { query } = require('../config/database');
const momentumService = require('./momentumCalculationService');
const badgeService = require('./badgeEligibilityService');
const pcrService = require('./pcrCalculationService');

/**
 * Aggregate PowerCards responses into quarterly feedback score
 *
 * Formula: weighted average of satisfaction_score (40%) + recommendation_score (30%) + metrics (30%)
 *
 * @param {number} campaignId - PowerCard campaign ID
 * @param {number} partnerId - Strategic partner ID
 * @returns {Object} Aggregated quarterly data
 */
async function aggregatePowerCardsData(campaignId, partnerId) {
  console.log(`[PowerCards Integration] Aggregating data for campaign ${campaignId}, partner ${partnerId}`);

  // Fetch all responses for this campaign and partner
  // DATABASE FIELDS: power_card_responses columns
  const responsesResult = await query(`
    SELECT
      metric_1_score,
      metric_2_score,
      metric_3_score,
      satisfaction_score,
      recommendation_score,
      submitted_at
    FROM power_card_responses
    WHERE campaign_id = $1
      AND partner_id = $2
      AND submitted_at IS NOT NULL
  `, [campaignId, partnerId]);

  if (responsesResult.rows.length === 0) {
    console.log(`[PowerCards Integration] No responses found for partner ${partnerId} in campaign ${campaignId}`);
    return null;
  }

  const responses = responsesResult.rows;
  const responseCount = responses.length;

  // Calculate averages
  let totalSatisfaction = 0;
  let totalRecommendation = 0;
  let totalMetrics = 0;
  let metricCount = 0;

  responses.forEach(response => {
    // Satisfaction score (0-5 scale, convert to 0-100)
    if (response.satisfaction_score !== null) {
      totalSatisfaction += parseFloat(response.satisfaction_score) * 20; // Convert to 0-100
    }

    // Recommendation/NPS score (-100 to 100, convert to 0-100)
    if (response.recommendation_score !== null) {
      const nps = parseFloat(response.recommendation_score);
      totalRecommendation += (nps + 100) / 2; // Convert -100/100 to 0-100
    }

    // Custom metrics (already 0-100 scale)
    if (response.metric_1_score !== null) {
      totalMetrics += parseFloat(response.metric_1_score);
      metricCount++;
    }
    if (response.metric_2_score !== null) {
      totalMetrics += parseFloat(response.metric_2_score);
      metricCount++;
    }
    if (response.metric_3_score !== null) {
      totalMetrics += parseFloat(response.metric_3_score);
      metricCount++;
    }
  });

  // Calculate weighted quarterly feedback score
  const avgSatisfaction = totalSatisfaction / responseCount;
  const avgRecommendation = totalRecommendation / responseCount;
  const avgMetrics = metricCount > 0 ? totalMetrics / metricCount : 50; // Default 50 if no metrics

  // Weighted formula: 40% satisfaction + 30% recommendation + 30% metrics
  const quarterlyScore = (avgSatisfaction * 0.40) + (avgRecommendation * 0.30) + (avgMetrics * 0.30);

  console.log(`[PowerCards Integration] Aggregated ${responseCount} responses:`, {
    satisfaction: avgSatisfaction.toFixed(2),
    recommendation: avgRecommendation.toFixed(2),
    metrics: avgMetrics.toFixed(2),
    finalScore: quarterlyScore.toFixed(2)
  });

  return {
    responseCount,
    avgSatisfaction: Math.round(avgSatisfaction * 100) / 100,
    avgRecommendation: Math.round(avgRecommendation * 100) / 100,
    avgMetrics: Math.round(avgMetrics * 100) / 100,
    quarterlyScore: Math.round(quarterlyScore * 100) / 100
  };
}

/**
 * Add PowerCards data to partner's quarterly_history JSONB array
 *
 * @param {number} partnerId - Strategic partner ID
 * @param {number} campaignId - PowerCard campaign ID
 * @returns {Object} Updated quarterly history
 */
async function addQuarterlyDataFromPowerCards(partnerId, campaignId) {
  console.log(`[PowerCards Integration] Processing campaign ${campaignId} for partner ${partnerId}`);

  // Fetch campaign details
  // DATABASE FIELDS: power_card_campaigns columns
  const campaignResult = await query(`
    SELECT
      campaign_name,
      quarter,
      year,
      end_date
    FROM power_card_campaigns
    WHERE id = $1
  `, [campaignId]);

  if (campaignResult.rows.length === 0) {
    throw new Error(`Campaign ${campaignId} not found`);
  }

  const campaign = campaignResult.rows[0];

  // Aggregate PowerCards responses into quarterly score
  const aggregatedData = await aggregatePowerCardsData(campaignId, partnerId);

  if (!aggregatedData) {
    console.log(`[PowerCards Integration] No data to add for partner ${partnerId}`);
    return null;
  }

  // Fetch current quarterly_history
  // DATABASE FIELD: strategic_partners.quarterly_history
  const partnerResult = await query(`
    SELECT quarterly_history
    FROM strategic_partners
    WHERE id = $1
  `, [partnerId]);

  if (partnerResult.rows.length === 0) {
    throw new Error(`Partner ${partnerId} not found`);
  }

  const currentHistory = partnerResult.rows[0].quarterly_history || [];

  // Create new quarterly entry
  const quarterlyEntry = {
    quarter: campaign.quarter,
    year: campaign.year,
    date: campaign.end_date,
    score: aggregatedData.quarterlyScore,
    quarterly_score: aggregatedData.quarterlyScore, // Alias for momentum service
    response_count: aggregatedData.responseCount,
    avg_satisfaction: aggregatedData.avgSatisfaction,
    avg_nps: aggregatedData.avgRecommendation,
    source: 'powercard',
    campaign_id: campaignId,
    created_at: new Date().toISOString()
  };

  // Check if this quarter already exists (prevent duplicates)
  const existingIndex = currentHistory.findIndex(
    entry => entry.quarter === campaign.quarter && entry.year === campaign.year
  );

  let updatedHistory;
  if (existingIndex >= 0) {
    // Update existing entry
    updatedHistory = [...currentHistory];
    updatedHistory[existingIndex] = quarterlyEntry;
    console.log(`[PowerCards Integration] Updated existing ${campaign.quarter}-${campaign.year} entry`);
  } else {
    // Add new entry
    updatedHistory = [...currentHistory, quarterlyEntry];
    console.log(`[PowerCards Integration] Added new ${campaign.quarter}-${campaign.year} entry`);
  }

  // Update strategic_partners with new quarterly data
  // DATABASE FIELDS: quarterly_history, quarterly_feedback_score, has_quarterly_data
  await query(`
    UPDATE strategic_partners
    SET
      quarterly_history = $1::jsonb,
      quarterly_feedback_score = $2,
      has_quarterly_data = true,
      updated_at = NOW()
    WHERE id = $3
  `, [JSON.stringify(updatedHistory), aggregatedData.quarterlyScore, partnerId]);

  console.log(`[PowerCards Integration] ✅ Quarterly history updated for partner ${partnerId}`);

  return {
    partnerId,
    quarter: campaign.quarter,
    year: campaign.year,
    quarterlyScore: aggregatedData.quarterlyScore,
    responseCount: aggregatedData.responseCount,
    quarterlyHistory: updatedHistory
  };
}

/**
 * Process completed PowerCards campaign and update all affected partners
 *
 * This is the main integration point - call this when a campaign is marked as "completed"
 *
 * @param {number} campaignId - PowerCard campaign ID
 * @returns {Object} Summary of processing results
 */
async function processCampaignCompletion(campaignId) {
  console.log(`[PowerCards Integration] Processing completed campaign ${campaignId}`);

  // Get all partners who have responses in this campaign
  const partnersResult = await query(`
    SELECT DISTINCT partner_id
    FROM power_card_responses
    WHERE campaign_id = $1
      AND partner_id IS NOT NULL
      AND submitted_at IS NOT NULL
  `, [campaignId]);

  const partnerIds = partnersResult.rows.map(r => r.partner_id);
  console.log(`[PowerCards Integration] Found ${partnerIds.length} partners with responses`);

  const results = {
    campaignId,
    totalPartners: partnerIds.length,
    succeeded: 0,
    failed: 0,
    errors: []
  };

  // Process each partner
  for (const partnerId of partnerIds) {
    try {
      // Step 1: Add quarterly data from PowerCards
      await addQuarterlyDataFromPowerCards(partnerId, campaignId);

      // Step 2: Recalculate momentum and performance trend
      await momentumService.updatePartnerMomentum(partnerId);

      // Step 3: Recalculate badges
      await badgeService.updatePartnerBadges(partnerId);

      // Step 4: Recalculate PCR with new momentum
      await pcrService.calculatePartnerPCR(partnerId);

      results.succeeded++;
      console.log(`[PowerCards Integration] ✅ Processed partner ${partnerId}`);
    } catch (error) {
      console.error(`[PowerCards Integration] ❌ Failed for partner ${partnerId}:`, error.message);
      results.failed++;
      results.errors.push({
        partnerId,
        error: error.message
      });
    }
  }

  console.log(`[PowerCards Integration] ✅ Campaign processing complete: ${results.succeeded} succeeded, ${results.failed} failed`);
  return results;
}

/**
 * Get quarterly performance data for partner dashboard
 *
 * @param {number} partnerId - Strategic partner ID
 * @param {number} limit - Number of recent quarters to return
 * @returns {Object} Quarterly performance history
 */
async function getPartnerQuarterlyPerformance(partnerId, limit = 4) {
  // DATABASE FIELDS: quarterly_history, momentum_modifier, performance_trend
  const result = await query(`
    SELECT
      quarterly_history,
      momentum_modifier,
      performance_trend,
      quarters_tracked
    FROM strategic_partners
    WHERE id = $1
  `, [partnerId]);

  if (result.rows.length === 0) {
    throw new Error(`Partner ${partnerId} not found`);
  }

  const partner = result.rows[0];
  const history = partner.quarterly_history || [];

  // Sort by date (most recent first) and limit
  const recentHistory = [...history]
    .sort((a, b) => new Date(b.date || b.created_at) - new Date(a.date || a.created_at))
    .slice(0, limit);

  return {
    partnerId,
    momentumModifier: partner.momentum_modifier,
    performanceTrend: partner.performance_trend,
    quartersTracked: partner.quarters_tracked,
    recentQuarters: recentHistory
  };
}

module.exports = {
  aggregatePowerCardsData,
  addQuarterlyDataFromPowerCards,
  processCampaignCompletion,
  getPartnerQuarterlyPerformance
};
```

---

## 🌐 API Endpoints: Phase 3 PowerCards Integration Routes

**File:** `tpe-backend/src/routes/partnerRoutes.js` (UPDATE)

**Add these new routes:**

```javascript
// DATABASE-CHECKED: All field names verified against power_card_* and strategic_partners schemas
const powerCardsIntegrationService = require('../services/powerCardsIntegrationService');

/**
 * POST /api/partners/powercard-campaign/:campaignId/process
 * Process completed PowerCards campaign and update all partner scores
 */
router.post('/powercard-campaign/:campaignId/process',
  protect,
  asyncHandler(async (req, res) => {
    const { campaignId } = req.params;

    const results = await powerCardsIntegrationService.processCampaignCompletion(
      parseInt(campaignId)
    );

    res.json({
      success: true,
      message: `PowerCards campaign processed: ${results.succeeded} partners updated`,
      data: results
    });
  })
);

/**
 * GET /api/partners/:id/quarterly-performance
 * Get quarterly performance history for partner dashboard
 */
router.get('/:id/quarterly-performance',
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const limit = parseInt(req.query.limit) || 4;

    const performance = await powerCardsIntegrationService.getPartnerQuarterlyPerformance(
      parseInt(id),
      limit
    );

    res.json({
      success: true,
      data: performance
    });
  })
);
```

---

## 🎨 Frontend: Partner Dashboard Enhancements

**File:** `tpe-front-end/src/app/partner-portal/dashboard/page.tsx` (UPDATE)

**Add these new components to existing dashboard:**

### 1. Badge Display Card (Insert after Stats Cards, around line 212)

```tsx
{/* Phase 3: Badge Showcase Section */}
<Card className="mb-8">
  <CardHeader>
    <CardTitle className="flex items-center">
      <Star className="h-5 w-5 mr-2 text-yellow-500" />
      Your Achievements
    </CardTitle>
    <CardDescription>
      Trust badges earned through performance and partnership tier
    </CardDescription>
  </CardHeader>
  <CardContent>
    {partnerProfile?.earned_badges && partnerProfile.earned_badges.length > 0 ? (
      <div className="flex flex-wrap gap-3">
        {partnerProfile.earned_badges.map((badge: any, index: number) => (
          <Badge
            key={index}
            variant="outline"
            className="px-4 py-2 text-sm font-medium flex items-center gap-2"
          >
            <span className="text-lg">{badge.icon}</span>
            <span>{badge.name}</span>
          </Badge>
        ))}
      </div>
    ) : (
      <p className="text-slate-600">
        Complete your profile and maintain high performance to earn trust badges!
      </p>
    )}
  </CardContent>
</Card>
```

### 2. Momentum & Performance Card (Insert after badges, around line 235)

```tsx
{/* Phase 3: Momentum & Performance Section */}
<Card className="mb-8">
  <CardHeader>
    <CardTitle className="flex items-center">
      <TrendingUp className="h-5 w-5 mr-2 text-green-500" />
      Performance Momentum
    </CardTitle>
    <CardDescription>
      Your quarterly performance trend and PCR momentum
    </CardDescription>
  </CardHeader>
  <CardContent>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="text-center">
        <div className="text-3xl font-bold mb-1">
          {partnerProfile?.momentum_modifier > 0 && '+'}
          {partnerProfile?.momentum_modifier || 0}
        </div>
        <p className="text-sm text-slate-600">Momentum Modifier</p>
        <p className="text-xs text-slate-500 mt-1">
          {partnerProfile?.momentum_modifier === 5 && '🔥 Hot Streak!'}
          {partnerProfile?.momentum_modifier === 0 && '📊 Stable Performance'}
          {partnerProfile?.momentum_modifier === -3 && '📉 Needs Improvement'}
        </p>
      </div>

      <div className="text-center">
        <div className="text-3xl font-bold mb-1 capitalize">
          {partnerProfile?.performance_trend || 'New'}
        </div>
        <p className="text-sm text-slate-600">Performance Trend</p>
        <p className="text-xs text-slate-500 mt-1">
          Based on {partnerProfile?.quarters_tracked || 0} quarters of data
        </p>
      </div>

      <div className="text-center">
        <div className="text-3xl font-bold mb-1">
          {partnerProfile?.final_pcr_score?.toFixed(1) || '--'}
        </div>
        <p className="text-sm text-slate-600">Current PCR Score</p>
        <p className="text-xs text-slate-500 mt-1">
          Out of 105 (with momentum)
        </p>
      </div>
    </div>
  </CardContent>
</Card>
```

### 3. Quarterly Performance Chart (Replace "Coming Soon" analytics placeholder)

```tsx
{/* Phase 3: Quarterly Performance Chart (replaces Coming Soon analytics) */}
<Card className="mt-8">
  <CardHeader>
    <CardTitle>Quarterly Performance History</CardTitle>
    <CardDescription>
      Your customer feedback scores over the last 4 quarters
    </CardDescription>
  </CardHeader>
  <CardContent>
    {partnerProfile?.quarterly_history && partnerProfile.quarterly_history.length > 0 ? (
      <div className="space-y-4">
        {partnerProfile.quarterly_history
          .slice(0, 4)
          .reverse() // Show oldest to newest
          .map((quarter: any, index: number) => (
            <div key={index} className="flex items-center gap-4">
              <div className="w-24 text-sm font-medium">
                {quarter.quarter} {quarter.year}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-slate-200 rounded-full h-3 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        quarter.score >= 85
                          ? 'bg-green-500'
                          : quarter.score >= 70
                          ? 'bg-yellow-500'
                          : 'bg-red-500'
                      }`}
                      style={{ width: `${quarter.score}%` }}
                    />
                  </div>
                  <span className="text-sm font-semibold w-12 text-right">
                    {quarter.score.toFixed(1)}
                  </span>
                </div>
              </div>
            </div>
          ))}
      </div>
    ) : (
      <div className="text-center py-8 text-slate-600">
        <p>No quarterly data yet. Complete your first PowerCard survey to see your performance history!</p>
      </div>
    )}
  </CardContent>
</Card>
```

---

## 📅 Implementation Timeline (5 Days)

### Day 1-2: PowerCards Integration Layer (CRITICAL PATH)
**Priority:** HIGHEST - Connects existing PowerCards to momentum/badge system

**Day 1: Service Layer**
- Create `powerCardsIntegrationService.js`
- Implement `aggregatePowerCardsData()` function
- Implement `addQuarterlyDataFromPowerCards()` function
- Test with sample PowerCards campaign data

**Day 2: Campaign Processing & API**
- Implement `processCampaignCompletion()` workflow
- Add PowerCards integration API endpoints
- Test end-to-end flow: PowerCard → quarterly_history → momentum → badges
- Verify PCR recalculation triggers correctly

**Deliverable:** PowerCards data automatically flows into momentum calculations

---

### Day 3: Partner Portal Badge Display
**Priority:** HIGH - Makes badges visible and valuable

**Morning:**
- Add badge showcase component to partner dashboard
- Fetch and display earned badges from API
- Add badge tooltips with descriptions

**Afternoon:**
- Add momentum and performance cards
- Display momentum modifier (+5, 0, -3) with visual indicators
- Show performance trend (improving/stable/declining)
- Test responsive layout

**Deliverable:** Partners can see their badges and momentum in dashboard

---

### Day 4: Quarterly Performance Visualization
**Priority:** MEDIUM - Visual engagement layer

**Morning:**
- Create quarterly performance chart component
- Fetch quarterly_history from API
- Display last 4 quarters with bar chart visualization
- Color-code performance (green 85+, yellow 70-84, red <70)

**Afternoon:**
- Add PCR evolution timeline
- Show base PCR vs final PCR (with momentum)
- Add trend indicators (up/down arrows)
- Test with various data scenarios

**Deliverable:** Visual analytics in partner dashboard

---

### Day 5: Admin Analytics Enhancement
**Priority:** MEDIUM - Admin oversight capabilities

**Morning:**
- Add momentum distribution chart to admin dashboard
- Show partner performance trend breakdown
- Display badge distribution across all partners

**Afternoon:**
- Add "Process PowerCard Campaign" admin action
- Create bulk campaign processing UI
- Add analytics for PowerCards response rates
- Testing and documentation

**Deliverable:** Complete Phase 3 with admin tools

---

## 🎯 Success Metrics

| Metric | Target | How to Measure |
|--------|--------|----------------|
| **PowerCards Integration** | 100% automated | Campaign completion triggers momentum update |
| **Data Accuracy** | 100% | Quarterly scores match PowerCards aggregation |
| **Badge Display Speed** | < 200ms | Partner dashboard load time |
| **Chart Render Time** | < 500ms | Performance visualization load time |
| **Momentum Recalc** | < 100ms per partner | After PowerCards data added |
| **Partner Engagement** | 50%+ view badges | Dashboard analytics tracking |

---

## 🧪 Test Scenarios

### PowerCards Integration Testing
1. **Campaign Completion**: Mark campaign as "completed" → Verify all partners processed
2. **Quarterly Data Added**: Check strategic_partners.quarterly_history has new entry
3. **Momentum Recalculated**: Verify momentum_modifier updated based on new quarter
4. **Badges Updated**: Verify badges recalculated after momentum change
5. **PCR Adjusted**: Verify final_pcr_score includes new momentum modifier

### Partner Dashboard Testing
6. **Badge Display**: Partner with 3+ badges → All badges visible with icons
7. **Momentum Display**: Partner with +5 modifier → "Hot Streak!" indicator shows
8. **Performance Chart**: Partner with 4 quarters data → Chart displays correctly
9. **New Partner**: Partner with no quarters → Shows "no data yet" message
10. **Responsive Layout**: Test on mobile/tablet/desktop → All components responsive

### Admin Dashboard Testing
11. **Campaign Processing**: Admin clicks "Process Campaign" → All partners updated
12. **Momentum Distribution**: Admin views analytics → Chart shows -3/0/+5 distribution
13. **Badge Analytics**: Admin views badge stats → See badge distribution across partners

---

## 📚 Related Documents

- **Overview:** [Phase 3 Overview](./PHASE-3-OVERVIEW.md)
- **Pre-Flight Checklist:** [Phase 3 Pre-Flight Checklist](./PHASE-3-PRE-FLIGHT-CHECKLIST.md)
- **Phase 2 Complete:** [Phase 2 Implementation Plan](../phase-2/PHASE-2-IMPLEMENTATION-PLAN.md)
- **PCR Overview:** [PCR Scoring System Overview](../PCR-SCORING-OVERVIEW.md)

---

## 🎉 Phase 3 Deliverables

**When Phase 3 is Complete:**
1. ✅ PowerCards automatically populate quarterly_history
2. ✅ Momentum recalculated after every quarterly feedback cycle
3. ✅ Badges visible in partner portal dashboard
4. ✅ Quarterly performance charts in partner dashboard
5. ✅ Admin can process PowerCards campaigns with one click
6. ✅ Partner engagement analytics tracked

**What's NOT in Phase 3:**
- ❌ Email notifications for badge achievements (future: Phase 4)
- ❌ Badge achievement timeline view (future enhancement)
- ❌ Social sharing of badges (future feature)
- ❌ Gamification leaderboard (future: Phase 5)

---

**Last Updated:** October 30, 2025
**Status:** Ready for Day 1 (Pre-Flight Checklist Complete)
**Next Step:** Begin Day 1 - PowerCards Integration Service
