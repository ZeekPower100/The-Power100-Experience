// DATABASE-CHECKED: contractors, ceo_pcr_scores tables verified November 14, 2025
// ================================================================
// CEO PCR Reporting Service
// ================================================================
// Purpose: Aggregate CEO PCR data for dashboards and generate alerts
// ================================================================

const { query } = require('../config/database');

/**
 * Get CEO dashboard data
 * Includes current score, category breakdowns, and quarterly history
 *
 * @param {number} contractorId - Contractor ID
 * @returns {Object} Complete dashboard data
 */
async function getCeoDashboardData(contractorId) {
  console.log(`[CEO PCR Reporting] Fetching dashboard data for contractor ${contractorId}`);

  // DATABASE FIELDS: contractors (current_ceo_pcr, previous_ceo_pcr, ceo_pcr_trend, etc.)
  const contractorResult = await query(`
    SELECT
      id,
      company_name,
      current_ceo_pcr,
      previous_ceo_pcr,
      ceo_pcr_trend,
      total_employees,
      last_employee_survey,
      ceo_pcr_last_calculated
    FROM contractors
    WHERE id = $1
  `, [contractorId]);

  if (contractorResult.rows.length === 0) {
    throw new Error(`Contractor ${contractorId} not found`);
  }

  const contractor = contractorResult.rows[0];

  // DATABASE FIELDS: ceo_pcr_scores (all columns)
  const latestQuarterResult = await query(`
    SELECT
      quarter,
      year,
      total_employees,
      total_responses,
      response_rate,
      leadership_score,
      culture_score,
      growth_score,
      satisfaction_score,
      nps_score,
      base_score,
      trend_modifier,
      final_ceo_pcr,
      campaign_id,
      calculated_at
    FROM ceo_pcr_scores
    WHERE contractor_id = $1
    ORDER BY year DESC, quarter DESC
    LIMIT 1
  `, [contractorId]);

  const latestQuarter = latestQuarterResult.rows[0] || null;

  // Get quarterly history (last 4 quarters)
  // DATABASE FIELDS: ceo_pcr_scores
  const historyResult = await query(`
    SELECT
      quarter,
      year,
      final_ceo_pcr,
      base_score,
      trend_modifier,
      response_rate
    FROM ceo_pcr_scores
    WHERE contractor_id = $1
    ORDER BY year DESC, quarter DESC
    LIMIT 4
  `, [contractorId]);

  const dashboardData = {
    contractor_id: contractor.id,
    company_name: contractor.company_name,
    current_ceo_pcr: parseFloat(contractor.current_ceo_pcr) || 0,
    previous_ceo_pcr: parseFloat(contractor.previous_ceo_pcr) || 0,
    ceo_pcr_trend: contractor.ceo_pcr_trend || 'new',
    total_employees: contractor.total_employees || 0,
    last_survey_date: contractor.last_employee_survey,
    last_calculated: contractor.ceo_pcr_last_calculated,

    latest_quarter: latestQuarter ? {
      quarter: latestQuarter.quarter,
      year: latestQuarter.year,
      response_rate: parseFloat(latestQuarter.response_rate),
      total_responses: latestQuarter.total_responses,
      total_employees: latestQuarter.total_employees,

      category_scores: {
        leadership: parseFloat(latestQuarter.leadership_score),
        culture: parseFloat(latestQuarter.culture_score),
        growth: parseFloat(latestQuarter.growth_score),
        satisfaction: parseFloat(latestQuarter.satisfaction_score),
        nps: parseFloat(latestQuarter.nps_score)
      },

      base_score: parseFloat(latestQuarter.base_score),
      trend_modifier: latestQuarter.trend_modifier,
      final_ceo_pcr: parseFloat(latestQuarter.final_ceo_pcr),
      calculated_at: latestQuarter.calculated_at
    } : null,

    history: historyResult.rows.map(row => ({
      quarter: row.quarter,
      year: row.year,
      final_ceo_pcr: parseFloat(row.final_ceo_pcr),
      base_score: parseFloat(row.base_score),
      trend_modifier: row.trend_modifier,
      response_rate: parseFloat(row.response_rate)
    }))
  };

  console.log(`[CEO PCR Reporting] ✅ Dashboard data retrieved for ${contractor.company_name}`);
  return dashboardData;
}

/**
 * Generate performance alerts based on scores and trends
 *
 * @param {number} contractorId - Contractor ID
 * @returns {Array} Array of alert objects
 */
async function generatePerformanceAlerts(contractorId) {
  console.log(`[CEO PCR Reporting] Generating performance alerts for contractor ${contractorId}`);

  const data = await getCeoDashboardData(contractorId);
  const alerts = [];

  // Alert: Declining trend
  if (data.ceo_pcr_trend === 'declining') {
    alerts.push({
      type: 'warning',
      severity: 'high',
      title: 'Culture Score Declining',
      message: `Your CEO PCR has declined for 2+ consecutive quarters (${data.trend_modifier} pts penalty applied). Review category scores to identify areas for improvement.`,
      action: 'View Improvement Resources',
      action_link: '/contractor/ceo-dashboard/resources'
    });
  }

  // Alert: Low overall score
  if (data.current_ceo_pcr < 70) {
    alerts.push({
      type: 'error',
      severity: 'critical',
      title: 'Low CEO PowerConfidence Rating',
      message: `Your CEO PCR of ${data.current_ceo_pcr.toFixed(1)} indicates significant room for improvement. Immediate attention recommended.`,
      action: 'Get Expert Help',
      action_link: '/contractor/ceo-dashboard/resources'
    });
  }

  // Alert: Low response rate
  if (data.latest_quarter && data.latest_quarter.response_rate < 70) {
    alerts.push({
      type: 'info',
      severity: 'medium',
      title: 'Low Response Rate',
      message: `Only ${data.latest_quarter.response_rate.toFixed(0)}% of employees responded to the last survey. Encourage participation for more accurate insights.`,
      action: 'Send Reminder',
      action_link: '/contractor/employees'
    });
  }

  // Alert: Low category scores
  if (data.latest_quarter) {
    const categoryNames = {
      leadership: 'Leadership Effectiveness',
      culture: 'Company Culture',
      growth: 'Growth & Development',
      satisfaction: 'Overall Satisfaction',
      nps: 'Employee Recommendation'
    };

    const categoryScores = data.latest_quarter.category_scores;
    const lowCategories = Object.entries(categoryScores)
      .filter(([, score]) => score < 70)
      .sort((a, b) => a[1] - b[1]);

    lowCategories.forEach(([category, score]) => {
      alerts.push({
        type: 'warning',
        severity: 'high',
        title: `${categoryNames[category]} Needs Attention`,
        message: `Score: ${score.toFixed(1)}/100. This area requires focus to improve employee experience.`,
        action: 'Get Recommendations',
        action_link: `/contractor/ceo-dashboard/resources?focus=${category}`
      });
    });
  }

  // Alert: Improving trend (positive feedback)
  if (data.ceo_pcr_trend === 'improving') {
    alerts.push({
      type: 'success',
      severity: 'low',
      title: 'Culture Improving!',
      message: `Great work! Your CEO PCR has improved for 3+ consecutive quarters (+${data.trend_modifier} pts bonus). Keep up the momentum.`,
      action: 'View Trends',
      action_link: '/contractor/ceo-dashboard'
    });
  }

  console.log(`[CEO PCR Reporting] ✅ Generated ${alerts.length} alerts`);
  return alerts;
}

/**
 * Get category breakdown comparison (current vs previous)
 *
 * @param {number} contractorId - Contractor ID
 * @returns {Object} Category comparison data
 */
async function getCategoryComparison(contractorId) {
  // Get current and previous quarters
  const historyResult = await query(`
    SELECT
      quarter,
      year,
      leadership_score,
      culture_score,
      growth_score,
      satisfaction_score,
      nps_score
    FROM ceo_pcr_scores
    WHERE contractor_id = $1
    ORDER BY year DESC, quarter DESC
    LIMIT 2
  `, [contractorId]);

  if (historyResult.rows.length < 2) {
    return null; // Not enough data for comparison
  }

  const current = historyResult.rows[0];
  const previous = historyResult.rows[1];

  return {
    current_quarter: `${current.quarter}-${current.year}`,
    previous_quarter: `${previous.quarter}-${previous.year}`,

    categories: {
      leadership: {
        current: parseFloat(current.leadership_score),
        previous: parseFloat(previous.leadership_score),
        change: parseFloat(current.leadership_score) - parseFloat(previous.leadership_score)
      },
      culture: {
        current: parseFloat(current.culture_score),
        previous: parseFloat(previous.culture_score),
        change: parseFloat(current.culture_score) - parseFloat(previous.culture_score)
      },
      growth: {
        current: parseFloat(current.growth_score),
        previous: parseFloat(previous.growth_score),
        change: parseFloat(current.growth_score) - parseFloat(previous.growth_score)
      },
      satisfaction: {
        current: parseFloat(current.satisfaction_score),
        previous: parseFloat(previous.satisfaction_score),
        change: parseFloat(current.satisfaction_score) - parseFloat(previous.satisfaction_score)
      },
      nps: {
        current: parseFloat(current.nps_score),
        previous: parseFloat(previous.nps_score),
        change: parseFloat(current.nps_score) - parseFloat(previous.nps_score)
      }
    }
  };
}

module.exports = {
  getCeoDashboardData,
  generatePerformanceAlerts,
  getCategoryComparison
};
