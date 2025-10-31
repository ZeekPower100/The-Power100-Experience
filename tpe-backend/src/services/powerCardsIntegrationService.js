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
  // Include partner_type to distinguish CLIENT feedback vs EMPLOYEE feedback
  // DATABASE FIELDS: power_card_responses + power_card_templates
  const responsesResult = await query(`
    SELECT
      r.metric_1_score,
      r.metric_2_score,
      r.metric_3_score,
      r.satisfaction_score,
      r.recommendation_score,
      r.submitted_at,
      t.partner_type
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

  const allResponses = responsesResult.rows;

  // Separate responses by type
  const clientResponses = allResponses.filter(r => r.partner_type === 'strategic_partner');
  const employeeResponses = allResponses.filter(r => r.partner_type === 'employee_feedback');

  console.log(`[PowerCards Integration] Found ${clientResponses.length} client + ${employeeResponses.length} employee responses`);

  // Helper function to calculate averages for a group
  const calculateGroupAverages = (responses, groupName) => {
    if (responses.length === 0) {
      console.log(`[PowerCards Integration] No ${groupName} responses`);
      return null;
    }

    let totalSatisfaction = 0, satisfactionCount = 0;
    let totalRecommendation = 0, recommendationCount = 0;
    let totalMetric1 = 0, metric1Count = 0;
    let totalMetric2 = 0, metric2Count = 0;
    let totalMetric3 = 0, metric3Count = 0;

    responses.forEach(response => {
      // Satisfaction score (0-10 scale, convert to 0-100)
      if (response.satisfaction_score !== null) {
        totalSatisfaction += parseInt(response.satisfaction_score) * 10;
        satisfactionCount++;
      }

      // Recommendation score (0-10 scale, convert to 0-100)
      if (response.recommendation_score !== null) {
        totalRecommendation += parseInt(response.recommendation_score) * 10;
        recommendationCount++;
      }

      // Custom metrics (0-10 scale, convert to 0-100)
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
    });

    // Calculate averages (default to 50 if no data)
    const avgSatisfaction = satisfactionCount > 0 ? totalSatisfaction / satisfactionCount : 50;
    const avgRecommendation = recommendationCount > 0 ? totalRecommendation / recommendationCount : 50;

    // Average all 3 custom metrics together
    const metricValues = [];
    if (metric1Count > 0) metricValues.push(totalMetric1 / metric1Count);
    if (metric2Count > 0) metricValues.push(totalMetric2 / metric2Count);
    if (metric3Count > 0) metricValues.push(totalMetric3 / metric3Count);
    const avgMetrics = metricValues.length > 0
      ? metricValues.reduce((sum, val) => sum + val, 0) / metricValues.length
      : 50;

    return {
      response_count: responses.length,
      avg_satisfaction: Math.round(avgSatisfaction * 100) / 100,
      avg_recommendation: Math.round(avgRecommendation * 100) / 100,
      avg_metric_1: metric1Count > 0 ? Math.round((totalMetric1 / metric1Count) * 100) / 100 : null,
      avg_metric_2: metric2Count > 0 ? Math.round((totalMetric2 / metric2Count) * 100) / 100 : null,
      avg_metric_3: metric3Count > 0 ? Math.round((totalMetric3 / metric3Count) * 100) / 100 : null,
      avg_metrics: Math.round(avgMetrics * 100) / 100
    };
  };

  // Calculate for each group
  const clientData = calculateGroupAverages(clientResponses, 'client');
  const employeeData = calculateGroupAverages(employeeResponses, 'employee');

  // Calculate combined quarterly score for PCR
  // If both groups exist, weight by response count
  let combinedQuarterlyScore;
  if (clientData && employeeData) {
    const totalResponses = clientData.response_count + employeeData.response_count;
    const clientWeight = clientData.response_count / totalResponses;
    const employeeWeight = employeeData.response_count / totalResponses;

    const clientScore = (clientData.avg_satisfaction * 0.40) + (clientData.avg_recommendation * 0.30) + (clientData.avg_metrics * 0.30);
    const employeeScore = (employeeData.avg_satisfaction * 0.40) + (employeeData.avg_recommendation * 0.30) + (employeeData.avg_metrics * 0.30);

    combinedQuarterlyScore = (clientScore * clientWeight) + (employeeScore * employeeWeight);
  } else if (clientData) {
    combinedQuarterlyScore = (clientData.avg_satisfaction * 0.40) + (clientData.avg_recommendation * 0.30) + (clientData.avg_metrics * 0.30);
  } else if (employeeData) {
    combinedQuarterlyScore = (employeeData.avg_satisfaction * 0.40) + (employeeData.avg_recommendation * 0.30) + (employeeData.avg_metrics * 0.30);
  } else {
    combinedQuarterlyScore = 50; // Default
  }

  console.log(`[PowerCards Integration] Combined quarterly score: ${combinedQuarterlyScore.toFixed(2)}`);

  return {
    responseCount: allResponses.length,
    clients: clientData,
    employees: employeeData,
    quarterlyScore: Math.round(combinedQuarterlyScore * 100) / 100
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

  // Create new quarterly entry with client/employee breakdown
  const quarterlyEntry = {
    quarter: campaign.quarter,
    year: campaign.year,
    date: campaign.end_date,
    score: aggregatedData.quarterlyScore,
    quarterly_score: aggregatedData.quarterlyScore, // Alias for momentum service compatibility
    response_count: aggregatedData.responseCount,

    // Client feedback data (strategic_partner template responses)
    clients: aggregatedData.clients,

    // Employee feedback data (employee_feedback template responses)
    employees: aggregatedData.employees,

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
