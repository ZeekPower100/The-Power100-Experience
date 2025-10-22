// DATABASE-CHECKED: business_growth_patterns, strategic_partners verified October 22, 2025
// ================================================================
// VERIFIED FIELD NAMES:
// - common_partners (NOT commonPartners) - JSONB array of partner objects
// - pattern_name (NOT patternName)
// - confidence_score (NOT confidenceScore)
// - sample_size (NOT sampleSize)
// - company_name (NOT companyName)
// - total_bookings (NOT totalBookings)
// ================================================================
// VERIFIED DATA TYPES:
// - common_partners: JSONB (array of objects: [{partner_id, usage_rate, avg_satisfaction}])
// - confidence_score: NUMERIC(3,2) (0.00-1.00)
// - sample_size: INTEGER
// - total_bookings: INTEGER
// ================================================================

/**
 * Partner Recommendation Intelligence Service
 *
 * Phase 2: Pattern Learning & Intelligence
 * Day 4: Partner Recommendation Intelligence
 *
 * Enhances partner recommendations by analyzing which partners are commonly
 * used by contractors who successfully scaled. Provides usage statistics
 * and satisfaction scores from pattern analysis.
 *
 * Core Functions:
 * - getPatternBasedPartnerRecommendations() - Get partners with usage stats
 * - calculatePartnerEffectiveness() - Analyze partner success correlation
 * - enhanceMatchScoreWithPatterns() - Boost scores for pattern-recommended partners
 */

const { query } = require('../config/database');

/**
 * Get pattern-based partner recommendations for a contractor
 * @param {number} contractorId - Contractor ID
 * @returns {Promise<Array>} Partners with usage statistics from patterns
 */
async function getPatternBasedPartnerRecommendations(contractorId) {
  console.log(`[Partner Recommendations] Getting pattern-based recommendations for contractor ${contractorId}`);

  try {
    // Get contractor's pattern matches
    const matchesResult = await query(`
      SELECT
        cpm.pattern_id,
        cpm.match_score,
        bgp.pattern_name,
        bgp.common_partners,
        bgp.confidence_score,
        bgp.sample_size
      FROM contractor_pattern_matches cpm
      JOIN business_growth_patterns bgp ON cpm.pattern_id = bgp.id
      WHERE cpm.contractor_id = $1
      ORDER BY cpm.match_score DESC;
    `, [contractorId]);

    if (matchesResult.rows.length === 0) {
      console.log(`[Partner Recommendations] No patterns matched for contractor ${contractorId}`);
      return [];
    }

    console.log(`[Partner Recommendations] Found ${matchesResult.rows.length} pattern match(es)`);

    // Aggregate partner usage across all matched patterns
    const partnerUsageMap = new Map();

    for (const match of matchesResult.rows) {
      if (!match.common_partners || match.common_partners.length === 0) {
        continue;
      }

      // Weight partners by pattern match score and confidence
      const weight = match.match_score * match.confidence_score;

      for (const partnerData of match.common_partners) {
        const partnerId = partnerData.partner_id;

        if (!partnerUsageMap.has(partnerId)) {
          partnerUsageMap.set(partnerId, {
            partner_id: partnerId,
            total_usage_rate: 0,
            weighted_satisfaction: 0,
            pattern_count: 0,
            patterns: [],
            total_weight: 0
          });
        }

        const existing = partnerUsageMap.get(partnerId);
        existing.total_usage_rate += (partnerData.usage_rate || 0) * weight;
        existing.weighted_satisfaction += (partnerData.avg_satisfaction || 0) * weight;
        existing.pattern_count += 1;
        existing.total_weight += weight;
        existing.patterns.push({
          pattern_name: match.pattern_name,
          usage_rate: partnerData.usage_rate,
          sample_size: match.sample_size
        });
      }
    }

    // Calculate averages and fetch partner details
    const recommendations = [];

    for (const [partnerId, usage] of partnerUsageMap.entries()) {
      // Calculate weighted averages
      const avgUsageRate = usage.total_weight > 0
        ? usage.total_usage_rate / usage.total_weight
        : 0;

      const avgSatisfaction = usage.total_weight > 0
        ? usage.weighted_satisfaction / usage.total_weight
        : 0;

      // Fetch partner details
      const partnerResult = await query(`
        SELECT
          id,
          company_name,
          total_bookings
        FROM strategic_partners
        WHERE id = $1;
      `, [partnerId]);

      if (partnerResult.rows.length > 0) {
        const partner = partnerResult.rows[0];

        recommendations.push({
          partner_id: partnerId,
          company_name: partner.company_name,
          usage_rate: Math.round(avgUsageRate * 100) / 100, // Round to 2 decimals
          avg_satisfaction: Math.round(avgSatisfaction * 10) / 10, // Round to 1 decimal
          pattern_count: usage.pattern_count,
          patterns: usage.patterns,
          total_bookings: partner.total_bookings || 0,
          recommendation_strength: calculateRecommendationStrength(avgUsageRate, avgSatisfaction, usage.pattern_count)
        });
      }
    }

    // Sort by recommendation strength (highest first)
    recommendations.sort((a, b) => b.recommendation_strength - a.recommendation_strength);

    console.log(`[Partner Recommendations] Generated ${recommendations.length} recommendation(s)`);

    return recommendations;

  } catch (error) {
    console.error('[Partner Recommendations] Error generating recommendations:', error);
    throw error;
  }
}

/**
 * Calculate recommendation strength score
 * @param {number} usageRate - Average usage rate (0-1)
 * @param {number} satisfaction - Average satisfaction (0-5)
 * @param {number} patternCount - Number of patterns recommending this partner
 * @returns {number} Strength score
 */
function calculateRecommendationStrength(usageRate, satisfaction, patternCount) {
  // Normalize satisfaction to 0-1 scale
  const normalizedSatisfaction = satisfaction / 5;

  // Weight: usage rate (40%), satisfaction (30%), pattern count (30%)
  const strength = (usageRate * 0.4) +
                   (normalizedSatisfaction * 0.3) +
                   (Math.min(patternCount / 3, 1) * 0.3);

  return Math.round(strength * 100) / 100;
}

/**
 * Calculate partner effectiveness by pattern
 * Analyzes which partners correlate with successful pattern outcomes
 * @param {number} patternId - Pattern ID
 * @returns {Promise<Array>} Partner effectiveness metrics
 */
async function calculatePartnerEffectiveness(patternId) {
  console.log(`[Partner Recommendations] Calculating partner effectiveness for pattern ${patternId}`);

  try {
    // Get pattern success tracking data
    const successResult = await query(`
      SELECT
        pst.partner_id,
        COUNT(*) as usage_count,
        AVG(CASE WHEN pst.goal_completed THEN 1 ELSE 0 END) as success_rate,
        AVG(pst.contractor_satisfaction) as avg_satisfaction,
        AVG(pst.time_to_completion_days) as avg_completion_days
      FROM pattern_success_tracking pst
      WHERE pst.pattern_id = $1
        AND pst.partner_id IS NOT NULL
      GROUP BY pst.partner_id
      HAVING COUNT(*) >= 3
      ORDER BY success_rate DESC, avg_satisfaction DESC;
    `, [patternId]);

    console.log(`[Partner Recommendations] Found ${successResult.rows.length} partner(s) with effectiveness data`);

    return successResult.rows.map(row => ({
      partner_id: row.partner_id,
      usage_count: parseInt(row.usage_count),
      success_rate: Math.round(parseFloat(row.success_rate) * 100) / 100,
      avg_satisfaction: Math.round(parseFloat(row.avg_satisfaction || 0) * 10) / 10,
      avg_completion_days: parseInt(row.avg_completion_days || 0)
    }));

  } catch (error) {
    console.error('[Partner Recommendations] Error calculating effectiveness:', error);
    throw error;
  }
}

/**
 * Update pattern's common_partners with effectiveness data
 * Should be run periodically to keep pattern data fresh
 * @param {number} patternId - Pattern ID
 * @returns {Promise<Object>} Updated pattern
 */
async function updatePatternPartnerData(patternId) {
  console.log(`[Partner Recommendations] Updating partner data for pattern ${patternId}`);

  try {
    // Calculate current effectiveness
    const effectiveness = await calculatePartnerEffectiveness(patternId);

    if (effectiveness.length === 0) {
      console.log(`[Partner Recommendations] No effectiveness data to update`);
      return null;
    }

    // Format for common_partners JSONB field
    const commonPartners = effectiveness.map(p => ({
      partner_id: p.partner_id,
      usage_rate: p.success_rate, // Use success rate as proxy for usage
      avg_satisfaction: p.avg_satisfaction
    }));

    // Update pattern
    const updateResult = await query(`
      UPDATE business_growth_patterns
      SET
        common_partners = $2::jsonb,
        last_recalculated_at = NOW(),
        updated_at = NOW()
      WHERE id = $1
      RETURNING *;
    `, [patternId, JSON.stringify(commonPartners)]);

    if (updateResult.rows.length > 0) {
      console.log(`[Partner Recommendations] ✅ Updated pattern ${patternId} with ${commonPartners.length} partner(s)`);
    }

    return updateResult.rows[0];

  } catch (error) {
    console.error('[Partner Recommendations] Error updating pattern data:', error);
    throw error;
  }
}

/**
 * Enhance match score with pattern-based boost
 * If a partner appears in patterns, boost their match score
 * @param {number} baseMatchScore - Original match score (0-1)
 * @param {number} partnerId - Partner ID
 * @param {Array} patterns - Contractor's matched patterns
 * @returns {number} Enhanced match score (0-1)
 */
function enhanceMatchScoreWithPatterns(baseMatchScore, partnerId, patterns) {
  if (!patterns || patterns.length === 0) {
    return baseMatchScore;
  }

  let totalBoost = 0;
  let patternCount = 0;

  // Check if this partner appears in any patterns
  for (const pattern of patterns) {
    if (!pattern.common_partners || pattern.common_partners.length === 0) {
      continue;
    }

    const partnerInPattern = pattern.common_partners.find(p => p.partner_id === partnerId);

    if (partnerInPattern) {
      // Boost based on usage rate and pattern confidence
      const usageBoost = (partnerInPattern.usage_rate || 0) * 0.15; // Up to 15% boost
      const confidenceWeight = pattern.confidence_score || 0.5;

      totalBoost += usageBoost * confidenceWeight;
      patternCount++;
    }
  }

  if (patternCount === 0) {
    return baseMatchScore;
  }

  // Average boost across patterns
  const avgBoost = totalBoost / patternCount;

  // Apply boost, capped at 1.0
  const enhancedScore = Math.min(1.0, baseMatchScore + avgBoost);

  console.log(`[Partner Recommendations] Enhanced score for partner ${partnerId}: ${baseMatchScore.toFixed(2)} → ${enhancedScore.toFixed(2)} (+${avgBoost.toFixed(2)})`);

  return Math.round(enhancedScore * 100) / 100;
}

/**
 * Generate partner recommendation message with usage statistics
 * @param {Object} recommendation - Recommendation object
 * @returns {string} Human-readable message
 */
function generateRecommendationMessage(recommendation) {
  const usagePercent = Math.round(recommendation.usage_rate * 100);
  const satisfaction = recommendation.avg_satisfaction;

  let message = `${recommendation.company_name} - used by ${usagePercent}% of successful contractors`;

  if (satisfaction > 0) {
    message += ` (avg satisfaction: ${satisfaction}/5)`;
  }

  if (recommendation.pattern_count > 1) {
    message += ` - appears in ${recommendation.pattern_count} success patterns`;
  }

  return message;
}

/**
 * Get top partner recommendations for contractor
 * @param {number} contractorId - Contractor ID
 * @param {number} limit - Maximum number of recommendations (default 5)
 * @returns {Promise<Array>} Top recommendations with messages
 */
async function getTopRecommendations(contractorId, limit = 5) {
  try {
    const recommendations = await getPatternBasedPartnerRecommendations(contractorId);

    return recommendations
      .slice(0, limit)
      .map(rec => ({
        ...rec,
        message: generateRecommendationMessage(rec)
      }));

  } catch (error) {
    console.error('[Partner Recommendations] Error getting top recommendations:', error);
    throw error;
  }
}

module.exports = {
  getPatternBasedPartnerRecommendations,
  calculatePartnerEffectiveness,
  updatePatternPartnerData,
  enhanceMatchScoreWithPatterns,
  generateRecommendationMessage,
  getTopRecommendations,
  calculateRecommendationStrength
};
