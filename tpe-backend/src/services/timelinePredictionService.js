// DATABASE-CHECKED: business_growth_patterns, contractor_pattern_matches verified October 22, 2025
// ================================================================
// VERIFIED FIELD NAMES:
// - avg_time_to_level_up_months (NOT avgTimeToLevelUpMonths)
// - median_time_to_level_up_months (NOT medianTimeToLevelUpMonths)
// - fastest_time_months (NOT fastestTimeMonths)
// - from_revenue_tier (NOT fromRevenueTier)
// - to_revenue_tier (NOT toRevenueTier)
// - sample_size (NOT sampleSize)
// - confidence_score (NOT confidenceScore)
// ================================================================
// VERIFIED DATA TYPES:
// - avg_time_to_level_up_months: INTEGER (duration in months)
// - median_time_to_level_up_months: INTEGER (duration in months)
// - fastest_time_months: INTEGER (duration in months)
// - sample_size: INTEGER (count of contractors)
// - confidence_score: NUMERIC(3,2) (0.00-1.00)
// ================================================================

/**
 * Timeline Prediction Service
 *
 * Phase 2: Pattern Learning & Intelligence
 * Day 5: Timeline Predictions & Content Recommendations
 *
 * Provides realistic timeline predictions for contractors based on
 * historical patterns from similar contractors who successfully scaled.
 *
 * Core Functions:
 * - predictTimeToMilestone() - Predict timeline to reach target revenue tier
 * - getPatternTimelines() - Get timeline data from matching patterns
 * - calculateRealisticTimeline() - Calculate weighted timeline estimate
 * - formatTimelineMessage() - Generate human-readable timeline message
 */

const { query } = require('../config/database');

/**
 * Predict time to reach milestone based on patterns
 * @param {number} contractorId - Contractor ID
 * @param {string} targetRevenueTier - Target revenue tier (e.g., '5_10_million')
 * @returns {Promise<Object>} Timeline prediction with range and confidence
 */
async function predictTimeToMilestone(contractorId, targetRevenueTier) {
  console.log(`[Timeline Prediction] Predicting timeline for contractor ${contractorId} to reach ${targetRevenueTier}`);

  try {
    // Get contractor's current revenue tier
    const contractorResult = await query(`
      SELECT revenue_tier FROM contractors WHERE id = $1;
    `, [contractorId]);

    if (contractorResult.rows.length === 0) {
      throw new Error(`Contractor ${contractorId} not found`);
    }

    const currentTier = contractorResult.rows[0].revenue_tier;
    console.log(`[Timeline Prediction] Current tier: ${currentTier}, Target tier: ${targetRevenueTier}`);

    // Get matching patterns for this transition
    const patternsResult = await query(`
      SELECT
        bgp.id,
        bgp.pattern_name,
        bgp.from_revenue_tier,
        bgp.to_revenue_tier,
        bgp.avg_time_to_level_up_months,
        bgp.median_time_to_level_up_months,
        bgp.fastest_time_months,
        bgp.sample_size,
        bgp.confidence_score,
        cpm.match_score
      FROM contractor_pattern_matches cpm
      JOIN business_growth_patterns bgp ON cpm.pattern_id = bgp.id
      WHERE cpm.contractor_id = $1
        AND bgp.to_revenue_tier = $2
        AND bgp.avg_time_to_level_up_months IS NOT NULL
      ORDER BY cpm.match_score DESC;
    `, [contractorId, targetRevenueTier]);

    if (patternsResult.rows.length === 0) {
      console.log(`[Timeline Prediction] No patterns found for transition to ${targetRevenueTier}`);
      return {
        has_prediction: false,
        message: 'Not enough data to predict timeline for this revenue tier transition'
      };
    }

    console.log(`[Timeline Prediction] Found ${patternsResult.rows.length} pattern(s) with timeline data`);

    // Calculate weighted timeline using match scores
    let weightedAvg = 0;
    let weightedMedian = 0;
    let fastestTime = null;
    let totalWeight = 0;
    let totalSampleSize = 0;
    let avgConfidence = 0;

    for (const pattern of patternsResult.rows) {
      // Weight by match score and confidence
      const weight = pattern.match_score * pattern.confidence_score;

      weightedAvg += (pattern.avg_time_to_level_up_months || 0) * weight;
      weightedMedian += (pattern.median_time_to_level_up_months || 0) * weight;
      totalWeight += weight;
      totalSampleSize += pattern.sample_size || 0;
      avgConfidence += pattern.confidence_score || 0;

      // Track fastest time
      if (pattern.fastest_time_months !== null) {
        if (fastestTime === null || pattern.fastest_time_months < fastestTime) {
          fastestTime = pattern.fastest_time_months;
        }
      }
    }

    // Calculate averages
    const avgTimeline = totalWeight > 0 ? Math.round(weightedAvg / totalWeight) : null;
    const medianTimeline = totalWeight > 0 ? Math.round(weightedMedian / totalWeight) : null;
    const confidence = patternsResult.rows.length > 0 ? avgConfidence / patternsResult.rows.length : 0;

    // Create timeline range (median ± 20% or avg ± 20%)
    const baseTimeline = medianTimeline || avgTimeline;
    const minTimeline = Math.max(1, Math.round(baseTimeline * 0.8));
    const maxTimeline = Math.round(baseTimeline * 1.2);

    const prediction = {
      has_prediction: true,
      estimated_months: baseTimeline,
      min_months: minTimeline,
      max_months: maxTimeline,
      fastest_observed_months: fastestTime,
      confidence_score: Math.round(confidence * 100) / 100,
      sample_size: totalSampleSize,
      pattern_count: patternsResult.rows.length,
      from_tier: currentTier,
      to_tier: targetRevenueTier,
      message: formatTimelineMessage(minTimeline, maxTimeline, fastestTime, totalSampleSize)
    };

    console.log(`[Timeline Prediction] ✅ Prediction: ${minTimeline}-${maxTimeline} months (${totalSampleSize} contractors)`);

    return prediction;

  } catch (error) {
    console.error('[Timeline Prediction] Error predicting timeline:', error);
    throw error;
  }
}

/**
 * Get timeline data from all matching patterns for a contractor
 * @param {number} contractorId - Contractor ID
 * @returns {Promise<Array>} Pattern timeline data
 */
async function getPatternTimelines(contractorId) {
  console.log(`[Timeline Prediction] Getting timeline data for contractor ${contractorId}`);

  try {
    const timelinesResult = await query(`
      SELECT
        bgp.id,
        bgp.pattern_name,
        bgp.from_revenue_tier,
        bgp.to_revenue_tier,
        bgp.avg_time_to_level_up_months,
        bgp.median_time_to_level_up_months,
        bgp.fastest_time_months,
        bgp.sample_size,
        bgp.confidence_score,
        cpm.match_score
      FROM contractor_pattern_matches cpm
      JOIN business_growth_patterns bgp ON cpm.pattern_id = bgp.id
      WHERE cpm.contractor_id = $1
        AND bgp.avg_time_to_level_up_months IS NOT NULL
      ORDER BY cpm.match_score DESC;
    `, [contractorId]);

    console.log(`[Timeline Prediction] Found ${timelinesResult.rows.length} pattern(s) with timeline data`);

    return timelinesResult.rows.map(row => ({
      pattern_id: row.id,
      pattern_name: row.pattern_name,
      from_revenue_tier: row.from_revenue_tier,
      to_revenue_tier: row.to_revenue_tier,
      avg_months: row.avg_time_to_level_up_months,
      median_months: row.median_time_to_level_up_months,
      fastest_months: row.fastest_time_months,
      sample_size: row.sample_size,
      confidence_score: row.confidence_score,
      match_score: row.match_score
    }));

  } catch (error) {
    console.error('[Timeline Prediction] Error getting pattern timelines:', error);
    throw error;
  }
}

/**
 * Calculate realistic timeline based on contractor specifics
 * Adjusts pattern timelines based on contractor readiness factors
 * @param {Object} contractor - Contractor profile
 * @param {Object} baseTimeline - Base timeline from patterns
 * @returns {Object} Adjusted timeline prediction
 */
function calculateRealisticTimeline(contractor, baseTimeline) {
  if (!baseTimeline.has_prediction) {
    return baseTimeline;
  }

  let adjustmentFactor = 1.0;

  // Adjust based on team size (larger team = potentially faster)
  if (contractor.team_size) {
    const teamSizeNum = parseInt(contractor.team_size);
    if (teamSizeNum >= 10) {
      adjustmentFactor *= 0.9; // 10% faster with larger team
    } else if (teamSizeNum <= 3) {
      adjustmentFactor *= 1.15; // 15% slower with smaller team
    }
  }

  // Adjust based on current stage
  if (contractor.current_stage === 'scaling' || contractor.current_stage === 'optimizing') {
    adjustmentFactor *= 0.95; // 5% faster if already scaling
  } else if (contractor.current_stage === 'starting' || contractor.current_stage === 'stabilizing') {
    adjustmentFactor *= 1.1; // 10% slower if earlier stage
  }

  // Apply adjustments
  const adjustedMin = Math.max(1, Math.round(baseTimeline.min_months * adjustmentFactor));
  const adjustedMax = Math.round(baseTimeline.max_months * adjustmentFactor);
  const adjustedEstimate = Math.round(baseTimeline.estimated_months * adjustmentFactor);

  return {
    ...baseTimeline,
    estimated_months: adjustedEstimate,
    min_months: adjustedMin,
    max_months: adjustedMax,
    adjustment_factor: Math.round(adjustmentFactor * 100) / 100,
    message: formatTimelineMessage(adjustedMin, adjustedMax, baseTimeline.fastest_observed_months, baseTimeline.sample_size)
  };
}

/**
 * Format human-readable timeline message
 * @param {number} minMonths - Minimum expected months
 * @param {number} maxMonths - Maximum expected months
 * @param {number} fastestMonths - Fastest observed time
 * @param {number} sampleSize - Number of contractors in sample
 * @returns {string} Formatted message
 */
function formatTimelineMessage(minMonths, maxMonths, fastestMonths, sampleSize) {
  let message = `Based on ${sampleSize} similar contractor${sampleSize !== 1 ? 's' : ''}, expect ${minMonths}-${maxMonths} months`;

  if (fastestMonths !== null && fastestMonths !== undefined) {
    message += ` (fastest achieved in ${fastestMonths} months)`;
  }

  return message;
}

/**
 * Get next milestone timeline for contractor
 * Predicts timeline to reach next revenue tier
 * @param {number} contractorId - Contractor ID
 * @returns {Promise<Object>} Next milestone timeline
 */
async function getNextMilestoneTimeline(contractorId) {
  console.log(`[Timeline Prediction] Getting next milestone timeline for contractor ${contractorId}`);

  try {
    // Get contractor's current tier
    const contractorResult = await query(`
      SELECT revenue_tier, team_size, current_stage FROM contractors WHERE id = $1;
    `, [contractorId]);

    if (contractorResult.rows.length === 0) {
      throw new Error(`Contractor ${contractorId} not found`);
    }

    const contractor = contractorResult.rows[0];
    const currentTier = contractor.revenue_tier;

    // Define tier progression
    const tierProgression = {
      '0_5_million': '5_10_million',
      '5_10_million': '11_20_million',
      '11_20_million': '21_30_million',
      '21_30_million': '31_50_million',
      '31_50_million': '51_75_million',
      '51_75_million': '76_100_million',
      '76_100_million': '101_150_million',
      '101_150_million': '150_million_plus'
    };

    const nextTier = tierProgression[currentTier];

    if (!nextTier) {
      console.log(`[Timeline Prediction] No next tier for ${currentTier}`);
      return {
        has_prediction: false,
        message: 'Already at highest revenue tier tracked'
      };
    }

    // Get base timeline prediction
    const baseTimeline = await predictTimeToMilestone(contractorId, nextTier);

    if (!baseTimeline.has_prediction) {
      return baseTimeline;
    }

    // Calculate realistic timeline with adjustments
    const realisticTimeline = calculateRealisticTimeline(contractor, baseTimeline);

    return realisticTimeline;

  } catch (error) {
    console.error('[Timeline Prediction] Error getting next milestone timeline:', error);
    throw error;
  }
}

module.exports = {
  predictTimeToMilestone,
  getPatternTimelines,
  calculateRealisticTimeline,
  formatTimelineMessage,
  getNextMilestoneTimeline
};
