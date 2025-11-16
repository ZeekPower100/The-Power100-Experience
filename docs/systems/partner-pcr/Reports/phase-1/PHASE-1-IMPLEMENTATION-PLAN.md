# Phase 1: Quarterly Reports Foundation - Implementation Plan

**Document Version:** 1.0
**Date:** October 31, 2025
**Status:** READY FOR IMPLEMENTATION
**Database Schema:** Verified against 6 tables (October 31, 2025)

---

## 📋 Executive Summary

**Goal:** Build the foundation of the quarterly reports system that generates partner executive reports and contractor comparison reports with real PowerCard data.

### What Phase 1 Delivers
- ✅ Database schema for partner_reports table (tracking and history)
- ✅ Real data integration from PowerCard campaigns and analytics
- ✅ Partner Executive Report generation (3 custom metrics)
- ✅ Contractor Comparison Report generation (variance-based peer benchmarks)
- ✅ Report generation service layer connected to real data
- ✅ API endpoints for report access and management
- ✅ Report tracking and metadata storage
- ✅ Data aggregation logic for peer benchmarking

---

## 🗄️ Database Schema Changes

### Prerequisites Verification ✅

**CRITICAL: Run Pre-Flight Checklist BEFORE implementing**

**Existing Tables Verified (October 31, 2025):**
- `strategic_partners` - 18 required fields verified
- `power_card_analytics` - 17 fields with percentiles
- `power_card_templates` - 11 metric fields
- `power_card_campaigns` - 12 fields with quarter/year tracking
- `power_card_responses` - 13 fields with metric scores
- `contractors` - 6 key fields including revenue_tier
- `admin_users` - 3 fields for tracking

---

### Migration SQL: Create partner_reports Table

**File:** `tpe-database/migrations/20251031_create_partner_reports.sql`

**DATABASE-CHECKED: All field names verified against schema October 31, 2025**

```sql
-- ================================================================
-- Migration: Create Quarterly Reports System Tables
-- Date: October 31, 2025
-- Purpose: Track and store quarterly report generation for partners and contractors
-- ================================================================

-- Partner Reports Table
CREATE TABLE IF NOT EXISTS partner_reports (
  id SERIAL PRIMARY KEY,

  -- Report Identification
  partner_id INTEGER NOT NULL REFERENCES strategic_partners(id) ON DELETE CASCADE,
  campaign_id INTEGER REFERENCES power_card_campaigns(id) ON DELETE SET NULL,
  report_type VARCHAR(50) NOT NULL CHECK (report_type IN ('executive_summary', 'contractor_comparison', 'public_pcr')),

  -- Temporal Tracking
  quarter VARCHAR(2) NOT NULL CHECK (quarter IN ('Q1', 'Q2', 'Q3', 'Q4')),
  year INTEGER NOT NULL,
  generation_date TIMESTAMP DEFAULT NOW(),

  -- Report Data (JSONB for flexible structure)
  report_data JSONB NOT NULL,

  -- Metrics Summary (for quick access without parsing JSONB)
  total_responses INTEGER DEFAULT 0,
  avg_satisfaction NUMERIC(5,2),
  avg_nps INTEGER,
  metric_1_avg NUMERIC(5,2),
  metric_2_avg NUMERIC(5,2),
  metric_3_avg NUMERIC(5,2),

  -- Custom Metric Names (denormalized for convenience)
  metric_1_name VARCHAR(100),
  metric_2_name VARCHAR(100),
  metric_3_name VARCHAR(100),

  -- Report Status & Delivery
  status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'generated', 'delivered', 'viewed')),
  delivered_at TIMESTAMP,
  viewed_at TIMESTAMP,
  generated_by INTEGER REFERENCES admin_users(id) ON DELETE SET NULL,

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ================================================================
-- Indexes for Performance
-- ================================================================

-- Primary lookups
CREATE INDEX IF NOT EXISTS idx_partner_reports_partner_id
  ON partner_reports(partner_id);

CREATE INDEX IF NOT EXISTS idx_partner_reports_campaign_id
  ON partner_reports(campaign_id);

-- Report type filtering
CREATE INDEX IF NOT EXISTS idx_partner_reports_type
  ON partner_reports(report_type);

-- Temporal queries (most common: get latest report for partner)
CREATE INDEX IF NOT EXISTS idx_partner_reports_partner_quarter_year
  ON partner_reports(partner_id, year DESC, quarter DESC);

-- Status filtering
CREATE INDEX IF NOT EXISTS idx_partner_reports_status
  ON partner_reports(status)
  WHERE status IN ('draft', 'generated');

-- Composite index for quarter/year lookups across all partners
CREATE INDEX IF NOT EXISTS idx_partner_reports_quarter_year
  ON partner_reports(year DESC, quarter DESC);

-- ================================================================
-- Comments for Documentation
-- ================================================================

COMMENT ON TABLE partner_reports IS
  'Tracks quarterly reports generated for partners (executive summary) and contractors (comparison reports)';

COMMENT ON COLUMN partner_reports.report_type IS
  'Type of report: executive_summary (for partners), contractor_comparison (for contractors), public_pcr (landing page)';

COMMENT ON COLUMN partner_reports.report_data IS
  'Full report data in JSONB format including all metrics, charts, and comparison data';

COMMENT ON COLUMN partner_reports.metric_1_name IS
  'Denormalized custom metric 1 name from power_card_templates for quick filtering';

COMMENT ON COLUMN partner_reports.quarter IS
  'Quarter when report was generated: Q1, Q2, Q3, or Q4';

COMMENT ON COLUMN partner_reports.status IS
  'Report lifecycle: draft → generated → delivered → viewed';

-- ================================================================
-- Verification Query
-- ================================================================

SELECT
  COUNT(*) as total_reports,
  COUNT(DISTINCT partner_id) as partners_with_reports,
  COUNT(*) FILTER (WHERE report_type = 'executive_summary') as executive_reports,
  COUNT(*) FILTER (WHERE report_type = 'contractor_comparison') as contractor_reports,
  COUNT(*) FILTER (WHERE status = 'delivered') as delivered_reports
FROM partner_reports;
```

---

## 🛠️ Service Layer: Report Generation Service

**File:** `tpe-backend/src/services/reportGenerationService.js` (UPDATE EXISTING)

**DATABASE-CHECKED: All field names match verified schema October 31, 2025**

```javascript
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
  await query(`
    UPDATE partner_reports
    SET
      status = 'viewed',
      viewed_at = NOW(),
      updated_at = NOW()
    WHERE id = $1 AND viewed_at IS NULL
  `, [reportId]);
}

module.exports = {
  generateExecutiveReport,
  generateContractorReport,
  generatePublicPCRReport,
  getReportById,
  getLatestReport,
  markReportDelivered,
  markReportViewed
};
```

---

## 📡 API Endpoints

**File:** `tpe-backend/src/routes/reports.js` (UPDATE EXISTING)

**DATABASE-CHECKED: All endpoints use verified field names**

```javascript
// DATABASE-CHECKED: Routes verified against schema October 31, 2025
const express = require('express');
const router = express.Router();
const { asyncHandler } = require('../middleware/errorHandler');
const reportService = require('../services/reportGenerationService');
const { protect } = require('../middleware/auth');

/**
 * POST /api/reports/executive/:partnerId
 * Generate executive report for a partner
 * Optional: ?campaignId=123 to specify campaign
 */
router.post('/executive/:partnerId', protect, asyncHandler(async (req, res) => {
  const { partnerId } = req.params;
  const { campaignId } = req.query;

  const report = await reportService.generateExecutiveReport(
    parseInt(partnerId),
    campaignId ? parseInt(campaignId) : null
  );

  res.json({
    success: true,
    report_type: 'executive_summary',
    report
  });
}));

/**
 * POST /api/reports/contractor/:contractorId/partner/:partnerId
 * Generate contractor comparison report
 * Optional: ?campaignId=123 to specify campaign
 */
router.post('/contractor/:contractorId/partner/:partnerId', protect, asyncHandler(async (req, res) => {
  const { contractorId, partnerId } = req.params;
  const { campaignId } = req.query;

  const report = await reportService.generateContractorReport(
    parseInt(contractorId),
    parseInt(partnerId),
    campaignId ? parseInt(campaignId) : null
  );

  res.json({
    success: true,
    report_type: 'contractor_comparison',
    report
  });
}));

/**
 * GET /api/reports/pcr/:partnerId
 * Get public PCR report (landing page data)
 * This endpoint is PUBLIC - no auth required
 */
router.get('/pcr/:partnerId', asyncHandler(async (req, res) => {
  const { partnerId } = req.params;

  const report = await reportService.generatePublicPCRReport(parseInt(partnerId));

  res.json({
    success: true,
    report_type: 'public_pcr',
    report
  });
}));

/**
 * GET /api/reports/:reportId
 * Get existing report by ID
 */
router.get('/:reportId', protect, asyncHandler(async (req, res) => {
  const { reportId } = req.params;

  const report = await reportService.getReportById(parseInt(reportId));

  res.json({
    success: true,
    report
  });
}));

/**
 * GET /api/reports/partner/:partnerId/latest/:reportType
 * Get latest report for a partner by type
 * reportType: executive_summary | contractor_comparison | public_pcr
 */
router.get('/partner/:partnerId/latest/:reportType', protect, asyncHandler(async (req, res) => {
  const { partnerId, reportType } = req.params;

  const report = await reportService.getLatestReport(parseInt(partnerId), reportType);

  if (!report) {
    return res.status(404).json({
      success: false,
      message: `No ${reportType} report found for partner ${partnerId}`
    });
  }

  res.json({
    success: true,
    report
  });
}));

/**
 * PATCH /api/reports/:reportId/delivered
 * Mark report as delivered
 */
router.patch('/:reportId/delivered', protect, asyncHandler(async (req, res) => {
  const { reportId } = req.params;

  await reportService.markReportDelivered(parseInt(reportId));

  res.json({
    success: true,
    message: 'Report marked as delivered'
  });
}));

/**
 * PATCH /api/reports/:reportId/viewed
 * Mark report as viewed
 */
router.patch('/:reportId/viewed', asyncHandler(async (req, res) => {
  const { reportId } = req.params;

  await reportService.markReportViewed(parseInt(reportId));

  res.json({
    success: true,
    message: 'Report marked as viewed'
  });
}));

module.exports = router;
```

---

## 📅 Implementation Timeline (5-7 Days)

### Day 1: Database Migration & Verification ✅
**Tasks:**
1. ✅ Complete Pre-Flight Checklist (verify all 6 required tables)
2. ✅ Create migration SQL file for partner_reports table
3. ✅ Test migration on local development database
4. ✅ Verify table creation with `\d partner_reports`
5. ✅ Verify indexes created
6. ✅ Apply to production database

**Deliverable:** Database ready with partner_reports table and all foreign keys

---

### Day 2: Report Generation Service - Executive Reports
**Tasks:**
1. ✅ Update `reportGenerationService.js` with database field verification
2. ✅ Implement `generateExecutiveReport()` function
3. ✅ Test with real PowerCard campaign data
4. ✅ Verify custom metric names from power_card_templates
5. ✅ Test JSONB report_data storage
6. ✅ Verify report saved to partner_reports table

**Deliverable:** Working executive report generation with real data

---

### Day 3: Report Generation Service - Contractor Reports
**Tasks:**
1. ✅ Implement `generateContractorReport()` function
2. ✅ Implement variance calculation logic
3. ✅ Test revenue tier benchmark matching
4. ✅ Verify contractor responses from power_card_responses
5. ✅ Test comparison calculations (variance percentages)
6. ✅ Unit tests for variance calculation

**Deliverable:** Working contractor comparison reports with variance-based metrics

---

### Day 4: API Endpoints & Integration
**Tasks:**
1. ✅ Update reports.js routes with new endpoints
2. ✅ Test POST /api/reports/executive/:partnerId
3. ✅ Test POST /api/reports/contractor/:contractorId/partner/:partnerId
4. ✅ Test GET /api/reports/pcr/:partnerId (public endpoint)
5. ✅ Test report retrieval endpoints
6. ✅ Test mark delivered/viewed endpoints
7. ✅ End-to-end API testing

**Deliverable:** All report API endpoints working and tested

---

### Day 5: Public PCR Report & Testing
**Tasks:**
1. ✅ Implement `generatePublicPCRReport()` function
2. ✅ Test public PCR landing page data
3. ✅ Verify all database field references
4. ✅ Performance testing (generation time < 500ms)
5. ✅ Test error handling for missing data
6. ✅ Documentation updates

**Deliverable:** Complete report generation system tested and documented

---

## 🎯 Success Metrics

| Metric | Target | How to Measure |
|--------|--------|----------------|
| **Generation Speed** | < 500ms | Time to generate any report type |
| **Data Accuracy** | 100% | Report data matches PowerCard analytics |
| **Database Integrity** | 100% | All foreign keys valid, no orphaned records |
| **Variance Calculation** | Accurate | Contractor variance matches manual calculation |
| **Custom Metrics** | Dynamic | Report shows correct metric names from template |
| **Report Storage** | 100% | All reports saved to partner_reports table |

---

## 📚 Related Documents

- **Overview:** [PCR Reports System Overview](../PCR-REPORTS-OVERVIEW.md)
- **Pre-Flight Checklist:** [Phase 1 Pre-Flight Checklist](./PHASE-1-PRE-FLIGHT-CHECKLIST.md)
- **Database Schema:** Check `quick-db.bat` before implementation
- **Demo Reference:** `/tpe-front-end/public/dm-reports-demo.html`

---

## 🎉 Phase 1 Deliverables

**When Phase 1 is Complete:**
1. ✅ partner_reports table created with all fields and indexes
2. ✅ Executive reports generated from real PowerCard data
3. ✅ Contractor comparison reports with variance calculations
4. ✅ Public PCR reports for landing pages
5. ✅ All reports stored in database with metadata
6. ✅ API endpoints for report generation and retrieval
7. ✅ Custom metric names dynamically included in reports

**What's NOT in Phase 1:**
- ❌ Email delivery system (Phase 2)
- ❌ Partner portal UI for viewing reports (Phase 2)
- ❌ Contractor portal UI for viewing reports (Phase 2)
- ❌ Automated report generation on campaign completion (Phase 2)
- ❌ Report templates and styling (Phase 3)
- ❌ PDF export functionality (Phase 3)

---

**Last Updated:** October 31, 2025
**Status:** Ready for Day 1 (Pre-Flight Checklist)
**Next Step:** Complete Phase 1 Pre-Flight Checklist
