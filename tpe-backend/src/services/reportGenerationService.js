// DATABASE-CHECKED: strategic_partners, power_card_analytics, power_card_templates,
//                   power_card_campaigns, power_card_responses, contractors verified October 31, 2025
// ================================================================
// Quarterly Report Generation Service
// ================================================================
// Purpose: Generate partner executive reports and contractor comparison reports
// Data Source: PowerCard campaigns and analytics aggregated by revenue tier
// ================================================================

const { query } = require('../config/database');

/**
 * Generate Executive Report for Partner
 * Shows partner's custom metrics with quarterly performance
 *
 * DATABASE TABLES: strategic_partners, power_card_campaigns, power_card_analytics, power_card_templates
 *
 * @param {number} partnerId - Partner ID
 * @param {number} campaignId - PowerCard campaign ID (optional, uses latest if not provided)
 * @returns {Object} Executive report with all metrics and branding
 */
async function generateExecutiveReport(partnerId, campaignId = null) {
  console.log(`[Report Generation] Starting executive report for partner ${partnerId}`);

  // STEP 1: Get partner info
  // DATABASE FIELDS: company_name, description, logo_url, final_pcr_score, quarterly_feedback_score
  const partnerResult = await query(`
    SELECT
      id,
      company_name,
      description,
      logo_url,
      final_pcr_score,
      quarterly_feedback_score,
      engagement_tier
    FROM strategic_partners
    WHERE id = $1 AND is_active = true
  `, [partnerId]);

  if (partnerResult.rows.length === 0) {
    throw new Error(`Partner ${partnerId} not found or inactive`);
  }

  const partner = partnerResult.rows[0];

  // STEP 2: Get campaign info (latest completed if not specified)
  // DATABASE FIELDS: id, campaign_name, quarter, year, total_responses, response_rate
  let campaign;
  if (campaignId) {
    const campaignResult = await query(`
      SELECT id, campaign_name, quarter, year, total_responses, response_rate, total_sent
      FROM power_card_campaigns
      WHERE id = $1 AND partner_id = $2
    `, [campaignId, partnerId]);

    if (campaignResult.rows.length === 0) {
      throw new Error(`Campaign ${campaignId} not found for partner ${partnerId}`);
    }
    campaign = campaignResult.rows[0];
  } else {
    // Get latest completed campaign
    const campaignResult = await query(`
      SELECT id, campaign_name, quarter, year, total_responses, response_rate, total_sent
      FROM power_card_campaigns
      WHERE partner_id = $1 AND status = 'completed'
      ORDER BY year DESC,
        CASE quarter
          WHEN 'Q4' THEN 4
          WHEN 'Q3' THEN 3
          WHEN 'Q2' THEN 2
          WHEN 'Q1' THEN 1
        END DESC
      LIMIT 1
    `, [partnerId]);

    if (campaignResult.rows.length === 0) {
      throw new Error(`No completed campaigns found for partner ${partnerId}`);
    }
    campaign = campaignResult.rows[0];
  }

  // STEP 3: Get custom metric names from template
  // DATABASE FIELDS: metric_1_name, metric_2_name, metric_3_name
  const templateResult = await query(`
    SELECT
      metric_1_name,
      metric_2_name,
      metric_3_name
    FROM power_card_templates
    WHERE partner_id = $1
    ORDER BY created_at DESC
    LIMIT 1
  `, [partnerId]);

  const metricNames = templateResult.rows.length > 0 ? templateResult.rows[0] : {
    metric_1_name: 'Custom Metric 1',
    metric_2_name: 'Custom Metric 2',
    metric_3_name: 'Custom Metric 3'
  };

  // STEP 4: Get analytics for this campaign
  // DATABASE FIELDS: avg_metric_1, avg_metric_2, avg_metric_3, avg_satisfaction, avg_nps, total_responses
  const analyticsResult = await query(`
    SELECT
      avg_metric_1,
      avg_metric_2,
      avg_metric_3,
      avg_satisfaction,
      avg_nps,
      total_responses,
      percentile_25,
      percentile_50,
      percentile_75
    FROM power_card_analytics
    WHERE campaign_id = $1
    LIMIT 1
  `, [campaign.id]);

  const analytics = analyticsResult.rows.length > 0 ? analyticsResult.rows[0] : null;

  if (!analytics) {
    throw new Error(`No analytics data found for campaign ${campaign.id}`);
  }

  // STEP 5: Build executive report structure
  const report = {
    partner: {
      id: partner.id,
      company_name: partner.company_name,
      description: partner.description,
      logo_url: partner.logo_url,
      pcr_score: partner.final_pcr_score,
      engagement_tier: partner.engagement_tier
    },
    campaign: {
      id: campaign.id,
      name: campaign.campaign_name,
      quarter: campaign.quarter,
      year: campaign.year,
      total_sent: campaign.total_sent,
      total_responses: campaign.total_responses,
      response_rate: campaign.response_rate
    },
    performance_summary: {
      overall_satisfaction: parseFloat(analytics.avg_satisfaction).toFixed(1),
      nps_score: parseInt(analytics.avg_nps),
      total_feedback: parseInt(analytics.total_responses)
    },
    custom_metrics: [
      {
        name: metricNames.metric_1_name,
        average: analytics.avg_metric_1 ? parseFloat(analytics.avg_metric_1).toFixed(1) : null,
        trend: 'stable' // Will be calculated from quarterly_history in future
      },
      {
        name: metricNames.metric_2_name,
        average: analytics.avg_metric_2 ? parseFloat(analytics.avg_metric_2).toFixed(1) : null,
        trend: 'stable'
      },
      {
        name: metricNames.metric_3_name,
        average: analytics.avg_metric_3 ? parseFloat(analytics.avg_metric_3).toFixed(1) : null,
        trend: 'stable'
      }
    ],
    distribution: {
      percentile_25: analytics.percentile_25,
      percentile_50: analytics.percentile_50,
      percentile_75: analytics.percentile_75
    },
    generated_at: new Date().toISOString(),
    report_type: 'executive_summary'
  };

  // STEP 6: Save report to database
  const reportResult = await query(`
    INSERT INTO partner_reports (
      partner_id,
      campaign_id,
      report_type,
      quarter,
      year,
      report_data,
      total_responses,
      avg_satisfaction,
      avg_nps,
      metric_1_avg,
      metric_2_avg,
      metric_3_avg,
      metric_1_name,
      metric_2_name,
      metric_3_name,
      status
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
    RETURNING id
  `, [
    partnerId,
    campaign.id,
    'executive_summary',
    campaign.quarter,
    campaign.year,
    JSON.stringify(report),
    analytics.total_responses,
    analytics.avg_satisfaction,
    analytics.avg_nps,
    analytics.avg_metric_1,
    analytics.avg_metric_2,
    analytics.avg_metric_3,
    metricNames.metric_1_name,
    metricNames.metric_2_name,
    metricNames.metric_3_name,
    'generated'
  ]);

  console.log(`[Report Generation] ✅ Executive report ${reportResult.rows[0].id} generated for partner ${partnerId}`);

  return {
    ...report,
    report_id: reportResult.rows[0].id
  };
}

/**
 * Generate Contractor Comparison Report
 * Shows contractor's variance from revenue tier averages (NOT actual numbers)
 *
 * DATABASE TABLES: contractors, power_card_responses, power_card_analytics
 *
 * @param {number} contractorId - Contractor ID
 * @param {number} partnerId - Partner ID (for context)
 * @param {number} campaignId - PowerCard campaign ID (optional, uses latest if not provided)
 * @returns {Object} Contractor comparison report with variance-based metrics
 */
async function generateContractorReport(contractorId, partnerId, campaignId = null) {
  console.log(`[Report Generation] Starting contractor report for contractor ${contractorId}, partner ${partnerId}`);

  // STEP 1: Get contractor info
  // DATABASE FIELDS: id, name, company_name, revenue_tier
  const contractorResult = await query(`
    SELECT
      id,
      name,
      company_name,
      revenue_tier
    FROM contractors
    WHERE id = $1
  `, [contractorId]);

  if (contractorResult.rows.length === 0) {
    throw new Error(`Contractor ${contractorId} not found`);
  }

  const contractor = contractorResult.rows[0];

  // STEP 2: Get partner info
  // DATABASE FIELDS: company_name, logo_url
  const partnerResult = await query(`
    SELECT company_name, logo_url
    FROM strategic_partners
    WHERE id = $1
  `, [partnerId]);

  if (partnerResult.rows.length === 0) {
    throw new Error(`Partner ${partnerId} not found`);
  }

  const partner = partnerResult.rows[0];

  // STEP 3: Get campaign
  let campaign;
  if (campaignId) {
    const campaignResult = await query(`
      SELECT id, campaign_name, quarter, year
      FROM power_card_campaigns
      WHERE id = $1 AND partner_id = $2
    `, [campaignId, partnerId]);

    if (campaignResult.rows.length === 0) {
      throw new Error(`Campaign ${campaignId} not found`);
    }
    campaign = campaignResult.rows[0];
  } else {
    const campaignResult = await query(`
      SELECT id, campaign_name, quarter, year
      FROM power_card_campaigns
      WHERE partner_id = $1 AND status = 'completed'
      ORDER BY year DESC,
        CASE quarter
          WHEN 'Q4' THEN 4
          WHEN 'Q3' THEN 3
          WHEN 'Q2' THEN 2
          WHEN 'Q1' THEN 1
        END DESC
      LIMIT 1
    `, [partnerId]);

    if (campaignResult.rows.length === 0) {
      throw new Error(`No completed campaigns found for partner ${partnerId}`);
    }
    campaign = campaignResult.rows[0];
  }

  // STEP 4: Get custom metric names
  const templateResult = await query(`
    SELECT metric_1_name, metric_2_name, metric_3_name
    FROM power_card_templates
    WHERE partner_id = $1
    ORDER BY created_at DESC
    LIMIT 1
  `, [partnerId]);

  const metricNames = templateResult.rows.length > 0 ? templateResult.rows[0] : {
    metric_1_name: 'Custom Metric 1',
    metric_2_name: 'Custom Metric 2',
    metric_3_name: 'Custom Metric 3'
  };

  // STEP 5: Get contractor's actual scores
  // DATABASE FIELDS: metric_1_score, metric_2_score, metric_3_score, satisfaction_score, recommendation_score
  const responseResult = await query(`
    SELECT
      metric_1_score,
      metric_2_score,
      metric_3_score,
      satisfaction_score,
      recommendation_score
    FROM power_card_responses
    WHERE contractor_id = $1 AND campaign_id = $2
    ORDER BY submitted_at DESC
    LIMIT 1
  `, [contractorId, campaign.id]);

  if (responseResult.rows.length === 0) {
    throw new Error(`No PowerCard response found for contractor ${contractorId} in campaign ${campaign.id}`);
  }

  const contractorScores = responseResult.rows[0];

  // STEP 6: Get revenue tier benchmarks
  // DATABASE FIELDS: avg_metric_1, avg_metric_2, avg_metric_3, avg_satisfaction, avg_nps, revenue_tier
  const benchmarkResult = await query(`
    SELECT
      avg_metric_1,
      avg_metric_2,
      avg_metric_3,
      avg_satisfaction,
      avg_nps,
      percentile_50
    FROM power_card_analytics
    WHERE campaign_id = $1 AND revenue_tier = $2
    LIMIT 1
  `, [campaign.id, contractor.revenue_tier]);

  const benchmark = benchmarkResult.rows.length > 0 ? benchmarkResult.rows[0] : null;

  if (!benchmark) {
    throw new Error(`No benchmark data found for revenue tier ${contractor.revenue_tier} in campaign ${campaign.id}`);
  }

  // STEP 7: Calculate variance (percentage difference from tier average)
  function calculateVariance(actual, average) {
    if (!actual || !average) return null;
    const variance = ((actual - average) / average) * 100;
    return {
      variance: variance.toFixed(1) + '%',
      trend: variance > 0 ? 'up' : (variance < 0 ? 'down' : 'stable'),
      comparison: variance > 0 ? 'Above tier average' : (variance < 0 ? 'Below tier average' : 'At tier average')
    };
  }

  // STEP 8: Build contractor comparison report
  const report = {
    contractor: {
      id: contractor.id,
      name: contractor.name,
      company_name: contractor.company_name,
      revenue_tier: contractor.revenue_tier
    },
    partner: {
      company_name: partner.company_name,
      logo_url: partner.logo_url
    },
    campaign: {
      quarter: campaign.quarter,
      year: campaign.year,
      name: campaign.campaign_name
    },
    current_tier_performance: {
      tier: contractor.revenue_tier,
      metrics: {
        [metricNames.metric_1_name]: calculateVariance(contractorScores.metric_1_score, benchmark.avg_metric_1),
        [metricNames.metric_2_name]: calculateVariance(contractorScores.metric_2_score, benchmark.avg_metric_2),
        [metricNames.metric_3_name]: calculateVariance(contractorScores.metric_3_score, benchmark.avg_metric_3),
        satisfaction: calculateVariance(contractorScores.satisfaction_score, benchmark.avg_satisfaction),
        nps: calculateVariance(contractorScores.recommendation_score, benchmark.avg_nps)
      }
    },
    peer_comparison: {
      percentile_position: 'median', // Placeholder - will calculate actual percentile in future
      tier_median: benchmark.percentile_50
    },
    generated_at: new Date().toISOString(),
    report_type: 'contractor_comparison'
  };

  // STEP 9: Save report to database
  const reportResult = await query(`
    INSERT INTO partner_reports (
      partner_id,
      campaign_id,
      report_type,
      quarter,
      year,
      report_data,
      total_responses,
      metric_1_name,
      metric_2_name,
      metric_3_name,
      status
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    RETURNING id
  `, [
    partnerId,
    campaign.id,
    'contractor_comparison',
    campaign.quarter,
    campaign.year,
    JSON.stringify(report),
    1, // Individual contractor report
    metricNames.metric_1_name,
    metricNames.metric_2_name,
    metricNames.metric_3_name,
    'generated'
  ]);

  console.log(`[Report Generation] ✅ Contractor report ${reportResult.rows[0].id} generated`);

  return {
    ...report,
    report_id: reportResult.rows[0].id
  };
}

/**
 * Generate Public PCR Report (Landing Page Data)
 * Shows partner's PCR score, badges, and public performance metrics
 *
 * DATABASE TABLES: strategic_partners, power_card_campaigns
 *
 * @param {number} partnerId - Partner ID
 * @returns {Object} Public PCR landing page data
 */
async function generatePublicPCRReport(partnerId) {
  console.log(`[Report Generation] Starting public PCR report for partner ${partnerId}`);

  // Get partner comprehensive info
  // DATABASE FIELDS: company_name, description, value_proposition, logo_url, website,
  //                  final_pcr_score, earned_badges, performance_trend, key_differentiators,
  //                  client_testimonials, landing_page_videos
  const partnerResult = await query(`
    SELECT
      id,
      company_name,
      description,
      value_proposition,
      logo_url,
      website,
      final_pcr_score,
      earned_badges,
      performance_trend,
      key_differentiators,
      client_testimonials,
      landing_page_videos,
      engagement_tier
    FROM strategic_partners
    WHERE id = $1 AND is_active = true
  `, [partnerId]);

  if (partnerResult.rows.length === 0) {
    throw new Error(`Partner ${partnerId} not found or inactive`);
  }

  const partner = partnerResult.rows[0];

  // Get latest quarterly score
  const latestCampaign = await query(`
    SELECT quarter, year, total_responses
    FROM power_card_campaigns
    WHERE partner_id = $1 AND status = 'completed'
    ORDER BY year DESC,
      CASE quarter
        WHEN 'Q4' THEN 4
        WHEN 'Q3' THEN 3
        WHEN 'Q2' THEN 2
        WHEN 'Q1' THEN 1
      END DESC
    LIMIT 1
  `, [partnerId]);

  const report = {
    partner: {
      id: partner.id,
      company_name: partner.company_name,
      description: partner.description,
      value_proposition: partner.value_proposition,
      logo_url: partner.logo_url,
      website: partner.website
    },
    pcr_summary: {
      final_score: partner.final_pcr_score,
      performance_trend: partner.performance_trend,
      engagement_tier: partner.engagement_tier,
      earned_badges: partner.earned_badges || []
    },
    latest_quarter: latestCampaign.rows.length > 0 ? {
      quarter: latestCampaign.rows[0].quarter,
      year: latestCampaign.rows[0].year,
      total_responses: latestCampaign.rows[0].total_responses
    } : null,
    differentiators: partner.key_differentiators,
    testimonials: partner.client_testimonials || [],
    videos: partner.landing_page_videos,
    generated_at: new Date().toISOString(),
    report_type: 'public_pcr'
  };

  console.log(`[Report Generation] ✅ Public PCR report generated for partner ${partnerId}`);

  return report;
}

/**
 * Get existing report by ID
 *
 * @param {number} reportId - Report ID
 * @returns {Object} Report data
 */
async function getReportById(reportId) {
  const result = await query(`
    SELECT
      id,
      partner_id,
      campaign_id,
      report_type,
      quarter,
      year,
      report_data,
      status,
      generated_by,
      generation_date,
      delivered_at,
      viewed_at
    FROM partner_reports
    WHERE id = $1
  `, [reportId]);

  if (result.rows.length === 0) {
    throw new Error(`Report ${reportId} not found`);
  }

  return result.rows[0];
}

/**
 * Get latest report for a partner by type
 *
 * @param {number} partnerId - Partner ID
 * @param {string} reportType - 'executive_summary', 'contractor_comparison', or 'public_pcr'
 * @returns {Object} Latest report
 */
async function getLatestReport(partnerId, reportType) {
  const result = await query(`
    SELECT
      id,
      partner_id,
      campaign_id,
      report_type,
      quarter,
      year,
      report_data,
      status,
      generation_date
    FROM partner_reports
    WHERE partner_id = $1 AND report_type = $2
    ORDER BY year DESC,
      CASE quarter
        WHEN 'Q4' THEN 4
        WHEN 'Q3' THEN 3
        WHEN 'Q2' THEN 2
        WHEN 'Q1' THEN 1
      END DESC
    LIMIT 1
  `, [partnerId, reportType]);

  return result.rows.length > 0 ? result.rows[0] : null;
}

/**
 * Mark report as delivered
 *
 * @param {number} reportId - Report ID
 */
async function markReportDelivered(reportId) {
  await query(`
    UPDATE partner_reports
    SET
      status = 'delivered',
      delivered_at = NOW(),
      updated_at = NOW()
    WHERE id = $1
  `, [reportId]);
}

/**
 * Mark report as viewed
 *
 * @param {number} reportId - Report ID
 */
async function markReportViewed(reportId) {
  const result = await query(`
    UPDATE partner_reports
    SET
      status = 'viewed',
      viewed_at = NOW(),
      updated_at = NOW()
    WHERE id = $1
    RETURNING id, status, viewed_at, viewed_at IS NULL as already_viewed
  `, [reportId]);

  if (result.rows.length === 0) {
    throw new Error(`Report ${reportId} not found`);
  }

  return {
    report_id: result.rows[0].id,
    status: result.rows[0].status,
    viewed_at: result.rows[0].viewed_at,
    already_viewed: result.rows[0].already_viewed
  };
}

/**
 * Get all reports for a partner (executive summary reports)
 * Used by partner portal to display all quarterly reports
 *
 * @param {number} partnerId - Partner ID
 * @returns {Array} All reports for the partner, ordered by most recent first
 */
async function getAllReportsForPartner(partnerId) {
  const result = await query(`
    SELECT
      id,
      partner_id,
      campaign_id,
      report_type,
      quarter,
      year,
      report_data,
      status,
      generation_date,
      delivered_at,
      viewed_at,
      total_responses,
      avg_satisfaction,
      avg_nps,
      metric_1_name,
      metric_1_avg,
      metric_2_name,
      metric_2_avg,
      metric_3_name,
      metric_3_avg
    FROM partner_reports
    WHERE partner_id = $1 AND report_type = 'executive_summary'
    ORDER BY year DESC,
      CASE quarter
        WHEN 'Q4' THEN 4
        WHEN 'Q3' THEN 3
        WHEN 'Q2' THEN 2
        WHEN 'Q1' THEN 1
      END DESC
  `, [partnerId]);

  return result.rows;
}

/**
 * Get all reports for a contractor (contractor comparison reports)
 * Used by contractor portal to display all their performance reports
 * Note: Contractor ID is stored in report_data JSONB, not as separate column
 *
 * @param {number} contractorId - Contractor ID
 * @returns {Array} All contractor reports, ordered by most recent first
 */
async function getAllReportsForContractor(contractorId) {
  const result = await query(`
    SELECT
      id,
      partner_id,
      campaign_id,
      report_type,
      quarter,
      year,
      report_data,
      status,
      generation_date,
      delivered_at,
      viewed_at,
      total_responses,
      metric_1_name,
      metric_2_name,
      metric_3_name
    FROM partner_reports
    WHERE report_type = 'contractor_comparison'
      AND (report_data->'contractor'->>'id')::int = $1
    ORDER BY year DESC,
      CASE quarter
        WHEN 'Q4' THEN 4
        WHEN 'Q3' THEN 3
        WHEN 'Q2' THEN 2
        WHEN 'Q1' THEN 1
      END DESC
  `, [contractorId]);

  return result.rows;
}

module.exports = {
  generateExecutiveReport,
  generateContractorReport,
  generatePublicPCRReport,
  getReportById,
  getLatestReport,
  markReportDelivered,
  markReportViewed,
  getAllReportsForPartner,
  getAllReportsForContractor
};
