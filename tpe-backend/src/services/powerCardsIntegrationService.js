// DATABASE-CHECKED: power_card_campaigns, power_card_responses, power_card_templates, strategic_partners columns verified October 30, 2025
// ================================================================
// PowerCards Integration Service (Phase 3)
// ================================================================
// Purpose: Connect PowerCards quarterly feedback to PCR scoring system
// Flow: PowerCards Campaign Complete → quarterly_history → Momentum Recalc → Badge Update
// ================================================================
// SCHEMA VERIFIED:
// - power_card_responses.contractor_id → contractors.id (responses BY contractors)
// - power_card_responses.template_id → power_card_templates.id
// - power_card_templates.partner_id → strategic_partners.id (CORRECT path to partner!)
// - ALL scores are INTEGER 0-10 scale (not 0-5, not -100/100 NPS!)
// - Convert: score * 10 = 0-100 scale for PCR
// ================================================================

const { query } = require('../config/database');
const momentumService = require('./momentumCalculationService');
const badgeService = require('./badgeEligibilityService');
const pcrService = require('./pcrCalculationService');

/**
 * Aggregate PowerCards responses into quarterly feedback score
 *
 * Formula: weighted average of satisfaction (40%) + recommendation (30%) + metrics (30%)
 * Score conversion: All scores are 0-10 INTEGER → multiply by 10 for 0-100 scale
 *
 * @param {number} campaignId - PowerCard campaign ID
 * @param {number} partnerId - Strategic partner ID
 * @returns {Object} Aggregated quarterly data
 */
async function aggregatePowerCardsData(campaignId, partnerId) {
  console.log(`[PowerCards Integration] Aggregating data for campaign ${campaignId}, partner ${partnerId}`);

  // Fetch all responses for this campaign and partner
  // Join through template_id to get partner_id
  // DATABASE FIELDS: power_card_responses + power_card_templates
  const responsesResult = await query(`
    SELECT
      r.metric_1_score,
      r.metric_2_score,
      r.metric_3_score,
      r.satisfaction_score,
      r.recommendation_score,
      r.custom_metric_score,
      r.submitted_at
    FROM power_card_responses r
    JOIN power_card_templates t ON r.template_id = t.id
    WHERE r.campaign_id = $1
      AND t.partner_id = $2
      AND r.submitted_at IS NOT NULL
  `, [campaignId, partnerId]);

  if (responsesResult.rows.length === 0) {
    console.log(`[PowerCards Integration] No responses found for partner ${partnerId} in campaign ${campaignId}`);
    return null;
  }

  const responses = responsesResult.rows;
  const responseCount = responses.length;

  // Calculate averages (all scores are 0-10 INTEGER, convert to 0-100)
  let totalSatisfaction = 0;
  let totalRecommendation = 0;
  let totalMetric1 = 0;
  let totalMetric2 = 0;
  let totalMetric3 = 0;
  let totalCustomMetric = 0;
  let metric1Count = 0;
  let metric2Count = 0;
  let metric3Count = 0;
  let customMetricCount = 0;
  let satisfactionCount = 0;
  let recommendationCount = 0;

  responses.forEach(response => {
    // Satisfaction score (0-10 scale, convert to 0-100)
    if (response.satisfaction_score !== null) {
      totalSatisfaction += parseInt(response.satisfaction_score) * 10; // Convert 0-10 to 0-100
      satisfactionCount++;
    }

    // Recommendation score (0-10 scale, NOT NPS! Convert to 0-100)
    if (response.recommendation_score !== null) {
      totalRecommendation += parseInt(response.recommendation_score) * 10; // Convert 0-10 to 0-100
      recommendationCount++;
    }

    // Standard metrics (0-10 scale, convert to 0-100)
    if (response.metric_1_score !== null) {
      totalMetric1 += parseInt(response.metric_1_score) * 10;
      metric1Count++;
    }
    if (response.metric_2_score !== null) {
      totalMetric2 += parseInt(response.metric_2_score) * 10;
      metric2Count++;
    }
    if (response.metric_3_score !== null) {
      totalMetric3 += parseInt(response.metric_3_score) * 10;
      metric3Count++;
    }

    // Custom metric (0-10 scale, convert to 0-100)
    if (response.custom_metric_score !== null) {
      totalCustomMetric += parseInt(response.custom_metric_score) * 10;
      customMetricCount++;
    }
  });

  // Calculate averages (already on 0-100 scale after conversion)
  const avgSatisfaction = satisfactionCount > 0 ? totalSatisfaction / satisfactionCount : 50; // Default 50 if no data
  const avgRecommendation = recommendationCount > 0 ? totalRecommendation / recommendationCount : 50;

  // Average all standard metrics together
  let avgMetrics = 50; // Default
  const metricValues = [];
  if (metric1Count > 0) metricValues.push(totalMetric1 / metric1Count);
  if (metric2Count > 0) metricValues.push(totalMetric2 / metric2Count);
  if (metric3Count > 0) metricValues.push(totalMetric3 / metric3Count);

  if (metricValues.length > 0) {
    avgMetrics = metricValues.reduce((sum, val) => sum + val, 0) / metricValues.length;
  }

  // Calculate average custom metric (stored separately for historical tracking)
  const avgCustomMetric = customMetricCount > 0 ? totalCustomMetric / customMetricCount : null;

  // Weighted formula: 40% satisfaction + 30% recommendation + 30% metrics
  const quarterlyScore = (avgSatisfaction * 0.40) + (avgRecommendation * 0.30) + (avgMetrics * 0.30);

  console.log(`[PowerCards Integration] Aggregated ${responseCount} responses:`, {
    satisfaction: avgSatisfaction.toFixed(2),
    recommendation: avgRecommendation.toFixed(2),
    metrics: avgMetrics.toFixed(2),
    customMetric: avgCustomMetric ? avgCustomMetric.toFixed(2) : 'N/A',
    finalScore: quarterlyScore.toFixed(2)
  });

  return {
    responseCount,
    avgSatisfaction: Math.round(avgSatisfaction * 100) / 100,
    avgRecommendation: Math.round(avgRecommendation * 100) / 100,
    avgMetrics: Math.round(avgMetrics * 100) / 100,
    avgCustomMetric: avgCustomMetric ? Math.round(avgCustomMetric * 100) / 100 : null,
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
      end_date,
      custom_metric_question,
      custom_metric_label
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
    quarterly_score: aggregatedData.quarterlyScore, // Alias for momentum service compatibility
    response_count: aggregatedData.responseCount,
    avg_satisfaction: aggregatedData.avgSatisfaction,
    avg_recommendation: aggregatedData.avgRecommendation,
    avg_metrics: aggregatedData.avgMetrics,
    avg_custom_metric: aggregatedData.avgCustomMetric, // Partner-specific custom metric score
    custom_metric_question: campaign.custom_metric_question, // What question was asked
    custom_metric_label: campaign.custom_metric_label, // Short label for this metric
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
  // Join through templates to get partner_id
  const partnersResult = await query(`
    SELECT DISTINCT t.partner_id
    FROM power_card_responses r
    JOIN power_card_templates t ON r.template_id = t.id
    WHERE r.campaign_id = $1
      AND t.partner_id IS NOT NULL
      AND r.submitted_at IS NOT NULL
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
      const quarterlyData = await addQuarterlyDataFromPowerCards(partnerId, campaignId);

      if (!quarterlyData) {
        console.log(`[PowerCards Integration] ⚠️ No data for partner ${partnerId}, skipping`);
        continue;
      }

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
  // DATABASE FIELDS: quarterly_history, momentum_modifier, performance_trend, quarters_tracked
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
