// DATABASE-CHECKED: company_employees, ceo_pcr_scores, power_card_responses columns verified November 14, 2025
// ================================================================
// CEO PCR Calculation Service
// ================================================================
// Purpose: Calculate CEO PowerConfidence Rating from employee feedback
// Formula: Final CEO PCR = Average(Employee Scores) ± Trend Modifier
// ================================================================

const { query } = require('../config/database');

/**
 * Calculate CEO PCR from employee PowerCard responses
 *
 * @param {number} contractorId - Contractor ID
 * @param {number} campaignId - PowerCard campaign ID
 * @param {string} quarter - Quarter identifier (Q1, Q2, Q3, Q4)
 * @param {number} year - Year (2025, 2026, etc.)
 * @returns {Object} Calculated CEO PCR scores
 */
async function calculateCeoPCR(contractorId, campaignId, quarter, year) {
  console.log(`[CEO PCR] Calculating for contractor ${contractorId}, ${quarter}-${year}`);

  // Step 1: Get all employee responses for this campaign
  // DATABASE FIELDS: power_card_responses (leadership_score, culture_score, growth_opportunity_score, satisfaction_score, recommendation_score)
  const responsesResult = await query(`
    SELECT
      COUNT(*) as total_responses,
      AVG(leadership_score) as avg_leadership,
      AVG(culture_score) as avg_culture,
      AVG(growth_opportunity_score) as avg_growth,
      AVG(satisfaction_score) as avg_satisfaction,
      AVG(recommendation_score) as avg_nps
    FROM power_card_responses
    WHERE campaign_id = $1
      AND recipient_id IN (
        SELECT id FROM company_employees
        WHERE contractor_id = $2 AND is_active = true
      )
  `, [campaignId, contractorId]);

  const responses = responsesResult.rows[0];

  // Step 2: Get total active employees for response rate
  // DATABASE FIELDS: company_employees (contractor_id, is_active)
  const employeeCountResult = await query(`
    SELECT COUNT(*) as total_employees
    FROM company_employees
    WHERE contractor_id = $1 AND is_active = true
  `, [contractorId]);

  const totalEmployees = parseInt(employeeCountResult.rows[0].total_employees);
  const totalResponses = parseInt(responses.total_responses);
  const responseRate = totalEmployees > 0 ? (totalResponses / totalEmployees) * 100 : 0;

  // Step 3: Calculate category scores
  const leadershipScore = parseFloat(responses.avg_leadership) || 0;
  const cultureScore = parseFloat(responses.avg_culture) || 0;
  const growthScore = parseFloat(responses.avg_growth) || 0;
  const satisfactionScore = parseFloat(responses.avg_satisfaction) || 0;
  const npsScore = parseFloat(responses.avg_nps) || 0;

  // Step 4: Calculate base score (average of all categories)
  const baseScore = (leadershipScore + cultureScore + growthScore + satisfactionScore + npsScore) / 5;
  const roundedBaseScore = Math.round(baseScore * 100) / 100;

  // Step 5: Calculate trend modifier
  const trendModifier = await calculateTrendModifier(contractorId, quarter, year);

  // Step 6: Calculate final CEO PCR
  const finalCeoPcr = roundedBaseScore + trendModifier;

  console.log(`[CEO PCR] Base: ${roundedBaseScore}, Trend: ${trendModifier > 0 ? '+' : ''}${trendModifier}, Final: ${finalCeoPcr}`);

  // Step 7: Save to ceo_pcr_scores table
  // DATABASE FIELDS: ceo_pcr_scores (all columns verified)
  await query(`
    INSERT INTO ceo_pcr_scores (
      contractor_id, quarter, year, campaign_id,
      total_employees, total_responses, response_rate,
      leadership_score, culture_score, growth_score, satisfaction_score, nps_score,
      base_score, trend_modifier, final_ceo_pcr
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
    ON CONFLICT (contractor_id, quarter, year)
    DO UPDATE SET
      campaign_id = EXCLUDED.campaign_id,
      total_employees = EXCLUDED.total_employees,
      total_responses = EXCLUDED.total_responses,
      response_rate = EXCLUDED.response_rate,
      leadership_score = EXCLUDED.leadership_score,
      culture_score = EXCLUDED.culture_score,
      growth_score = EXCLUDED.growth_score,
      satisfaction_score = EXCLUDED.satisfaction_score,
      nps_score = EXCLUDED.nps_score,
      base_score = EXCLUDED.base_score,
      trend_modifier = EXCLUDED.trend_modifier,
      final_ceo_pcr = EXCLUDED.final_ceo_pcr,
      calculated_at = NOW()
  `, [
    contractorId, quarter, year, campaignId,
    totalEmployees, totalResponses, responseRate,
    leadershipScore, cultureScore, growthScore, satisfactionScore, npsScore,
    roundedBaseScore, trendModifier, finalCeoPcr
  ]);

  // Step 8: Update contractors table with current score
  // DATABASE FIELDS: contractors (current_ceo_pcr, previous_ceo_pcr, ceo_pcr_trend, ceo_pcr_last_calculated)
  const trend = determineTrend(trendModifier);
  await query(`
    UPDATE contractors
    SET
      previous_ceo_pcr = current_ceo_pcr,
      current_ceo_pcr = $1,
      ceo_pcr_trend = $2,
      ceo_pcr_last_calculated = NOW()
    WHERE id = $3
  `, [finalCeoPcr, trend, contractorId]);

  console.log(`[CEO PCR] ✅ CEO PCR calculated and saved for contractor ${contractorId}`);

  return {
    contractorId,
    quarter,
    year,
    totalEmployees,
    totalResponses,
    responseRate,
    categoryScores: {
      leadership: leadershipScore,
      culture: cultureScore,
      growth: growthScore,
      satisfaction: satisfactionScore,
      nps: npsScore
    },
    baseScore: roundedBaseScore,
    trendModifier,
    finalCeoPcr,
    trend
  };
}

/**
 * Calculate trend modifier based on quarterly history
 *
 * @param {number} contractorId - Contractor ID
 * @param {string} currentQuarter - Current quarter
 * @param {number} currentYear - Current year
 * @returns {number} Trend modifier (-5, 0, or +5)
 */
async function calculateTrendModifier(contractorId, currentQuarter, currentYear) {
  // Get last 3 quarters of scores
  // DATABASE FIELDS: ceo_pcr_scores (base_score, quarter, year)
  const historyResult = await query(`
    SELECT base_score, quarter, year
    FROM ceo_pcr_scores
    WHERE contractor_id = $1
    ORDER BY year DESC, quarter DESC
    LIMIT 3
  `, [contractorId]);

  const history = historyResult.rows;

  // Need at least 2 previous quarters for trend analysis
  if (history.length < 2) {
    return 0; // New contractor, no trend
  }

  // Check for improving trend (3+ consecutive quarters)
  if (history.length >= 3) {
    const isImproving = history[0].base_score > history[1].base_score &&
                       history[1].base_score > history[2].base_score;
    if (isImproving) {
      return 5; // Hot streak bonus
    }
  }

  // Check for declining trend (2+ consecutive quarters)
  if (history.length >= 2) {
    const isDeclining = history[0].base_score < history[1].base_score &&
                       history[1].base_score < history[2].base_score;
    if (isDeclining) {
      return -5; // Decline penalty
    }
  }

  return 0; // Stable
}

/**
 * Determine trend label from modifier
 */
function determineTrend(modifier) {
  if (modifier > 0) return 'improving';
  if (modifier < 0) return 'declining';
  return 'stable';
}

module.exports = {
  calculateCeoPCR,
  calculateTrendModifier
};
