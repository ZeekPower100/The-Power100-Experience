// DATABASE-CHECKED: strategic_partners columns verified October 30, 2025
// ================================================================
// VERIFIED CONSTRAINTS:
// - strategic_partners.momentum_modifier: CHECK IN (-3, 0, 5)
// - strategic_partners.performance_trend: CHECK IN ('improving', 'stable', 'declining', 'new')
// - strategic_partners.quarters_tracked: CHECK >= 0
// ================================================================
// VERIFIED FIELD NAMES:
// - momentum_modifier (NOT momentumModifier)
// - performance_trend (NOT performanceTrend)
// - quarters_tracked (NOT quartersTracked)
// - quarterly_history (NOT quarterlyHistory) - EXISTING FROM PHASE 1
// - base_pcr_score (NOT basePcrScore) - EXISTING FROM PHASE 1
// - final_pcr_score (NOT finalPcrScore) - EXISTING FROM PHASE 1
// ================================================================
// VERIFIED DATA TYPES:
// - momentum_modifier: INTEGER (-3, 0, or 5)
// - performance_trend: VARCHAR ('improving', 'stable', 'declining', 'new')
// - quarters_tracked: INTEGER (count >= 0)
// - quarterly_history: JSONB (array from Phase 1) - USE FOR TREND ANALYSIS
// - base_pcr_score: NUMERIC(5,2) (from Phase 1) - TRACK FOR MOMENTUM
// - final_pcr_score: NUMERIC(5,2) (from Phase 1) - APPLY MOMENTUM TO THIS
// ================================================================

/**
 * Momentum Calculation Service (Phase 2)
 *
 * Purpose: Calculate momentum modifiers based on quarterly performance trends
 * Modifiers: +5 (hot streak), 0 (stable/new), -3 (declining)
 */

const { query } = require('../config/database');

/**
 * Momentum Modifier Values
 */
const MOMENTUM_MODIFIERS = {
  HOT_STREAK: 5,      // 3+ consecutive quarters with 85+ quarterly score
  STABLE: 0,          // Default for new or stable performance
  DECLINING: -3       // 3+ consecutive quarters with declining scores
};

/**
 * Performance Thresholds
 */
const THRESHOLDS = {
  HOT_STREAK_SCORE: 85,           // Minimum score for hot streak qualification
  HOT_STREAK_QUARTERS: 3,         // Consecutive quarters needed for hot streak
  DECLINING_QUARTERS: 3,          // Consecutive quarters of decline needed
  MIN_QUARTERS_FOR_TREND: 2       // Minimum quarters to establish trend
};

/**
 * Analyze quarterly history to determine performance trend
 *
 * @param {Array} quarterlyHistory - Array of quarterly feedback data from JSONB field
 * @returns {string} 'improving', 'stable', 'declining', or 'new'
 */
function analyzePerformanceTrend(quarterlyHistory) {
  // DATABASE FIELD: quarterly_history (JSONB array)
  if (!quarterlyHistory || quarterlyHistory.length < THRESHOLDS.MIN_QUARTERS_FOR_TREND) {
    return 'new';
  }

  // Sort by date (most recent first)
  const sorted = [...quarterlyHistory].sort((a, b) =>
    new Date(b.date || b.created_at) - new Date(a.date || a.created_at)
  );

  // Get last 3 quarters for trend analysis
  const recent = sorted.slice(0, 3);

  if (recent.length < THRESHOLDS.MIN_QUARTERS_FOR_TREND) {
    return 'new';
  }

  // Check if scores are consistently improving
  let improving = true;
  let declining = true;

  for (let i = 0; i < recent.length - 1; i++) {
    const current = parseFloat(recent[i].score || recent[i].quarterly_score || 0);
    const previous = parseFloat(recent[i + 1].score || recent[i + 1].quarterly_score || 0);

    if (current <= previous) improving = false;
    if (current >= previous) declining = false;
  }

  if (improving) return 'improving';
  if (declining) return 'declining';
  return 'stable';
}

/**
 * Calculate momentum modifier based on quarterly history
 *
 * @param {Array} quarterlyHistory - Array of quarterly feedback data
 * @param {number} currentQuarterlyScore - Current quarterly feedback score
 * @returns {number} Momentum modifier: -3, 0, or +5
 */
function calculateMomentumModifier(quarterlyHistory, currentQuarterlyScore) {
  // DATABASE FIELD: quarterly_history (JSONB array)
  if (!quarterlyHistory || quarterlyHistory.length < THRESHOLDS.HOT_STREAK_QUARTERS) {
    return MOMENTUM_MODIFIERS.STABLE;  // Not enough data
  }

  // Sort by date (most recent first)
  const sorted = [...quarterlyHistory].sort((a, b) =>
    new Date(b.date || b.created_at) - new Date(a.date || a.created_at)
  );

  // Get last 3 quarters
  const recentQuarters = sorted.slice(0, THRESHOLDS.HOT_STREAK_QUARTERS);

  // Check for IMPROVING: 3+ consecutive quarters with increasing scores
  // Per spec: "Base PCR improved for 3+ consecutive quarters" → +5
  let improvingCount = 0;
  for (let i = 0; i < recentQuarters.length - 1; i++) {
    const current = parseFloat(recentQuarters[i].score || recentQuarters[i].quarterly_score || 0);
    const previous = parseFloat(recentQuarters[i + 1].score || recentQuarters[i + 1].quarterly_score || 0);

    if (current > previous) {
      improvingCount++;
    }
  }

  if (improvingCount >= THRESHOLDS.HOT_STREAK_QUARTERS - 1) {  // -1 because we compare pairs
    console.log(`[Momentum] 🔥 IMPROVING trend detected: ${improvingCount + 1} consecutive quarters increasing`);
    return MOMENTUM_MODIFIERS.HOT_STREAK;
  }

  // Check for DECLINING: 2+ consecutive quarters of dropping scores
  // Per spec: "Base PCR dropped for 2+ consecutive quarters" → -3
  let decliningCount = 0;
  for (let i = 0; i < recentQuarters.length - 1; i++) {
    const current = parseFloat(recentQuarters[i].score || recentQuarters[i].quarterly_score || 0);
    const previous = parseFloat(recentQuarters[i + 1].score || recentQuarters[i + 1].quarterly_score || 0);

    if (current < previous) {
      decliningCount++;
    }
  }

  if (decliningCount >= THRESHOLDS.DECLINING_QUARTERS - 1) {  // -1 because we compare pairs
    console.log(`[Momentum] 📉 DECLINING trend detected: ${decliningCount + 1} consecutive quarters dropping`);
    return MOMENTUM_MODIFIERS.DECLINING;
  }

  // Default: STABLE
  return MOMENTUM_MODIFIERS.STABLE;
}

/**
 * Update momentum and performance trend for a partner
 *
 * @param {number} partnerId - Partner ID
 * @returns {Object} Updated momentum data
 */
async function updatePartnerMomentum(partnerId) {
  console.log(`[Momentum] Calculating momentum for partner ${partnerId}`);

  // Fetch partner with quarterly history
  // DATABASE FIELDS: quarterly_history, quarterly_feedback_score, quarters_tracked
  const result = await query(`
    SELECT
      id,
      company_name,
      quarterly_history,
      quarterly_feedback_score,
      quarters_tracked
    FROM strategic_partners
    WHERE id = $1
  `, [partnerId]);

  if (result.rows.length === 0) {
    throw new Error(`Partner ${partnerId} not found`);
  }

  const partner = result.rows[0];
  const quarterlyHistory = partner.quarterly_history || [];
  const currentScore = parseFloat(partner.quarterly_feedback_score || 50);

  // Calculate momentum modifier
  const momentumModifier = calculateMomentumModifier(quarterlyHistory, currentScore);

  // Analyze performance trend
  const performanceTrend = analyzePerformanceTrend(quarterlyHistory);

  // Update quarters tracked
  const quartersTracked = quarterlyHistory.length;

  console.log(`[Momentum] Partner ${partnerId}:`, {
    momentum: momentumModifier,
    trend: performanceTrend,
    quarters: quartersTracked
  });

  // Update database
  // DATABASE FIELDS: momentum_modifier, performance_trend, quarters_tracked
  await query(`
    UPDATE strategic_partners
    SET
      momentum_modifier = $1,
      performance_trend = $2,
      quarters_tracked = $3,
      updated_at = NOW()
    WHERE id = $4
  `, [momentumModifier, performanceTrend, quartersTracked, partnerId]);

  return {
    partnerId,
    companyName: partner.company_name,
    momentumModifier,
    performanceTrend,
    quartersTracked,
    currentQuarterlyScore: currentScore
  };
}

/**
 * Apply momentum modifier to final PCR score
 *
 * @param {number} finalPCR - Final PCR score before momentum
 * @param {number} momentumModifier - Momentum modifier (-3, 0, or +5)
 * @returns {number} Final PCR with momentum applied (capped at 105)
 */
function applyMomentumToPCR(finalPCR, momentumModifier) {
  const adjusted = finalPCR + momentumModifier;

  // Cap at 105 (maximum possible PCR)
  const capped = Math.min(adjusted, 105);

  // Ensure minimum of 0
  return Math.max(capped, 0);
}

module.exports = {
  calculateMomentumModifier,
  analyzePerformanceTrend,
  updatePartnerMomentum,
  applyMomentumToPCR,
  MOMENTUM_MODIFIERS,
  THRESHOLDS
};
