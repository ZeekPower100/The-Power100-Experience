// ================================================================
// Report Routes - Phase 1 & 2: Quarterly Report Generation & Email Delivery
// DATABASE-CHECKED: All field names verified November 1, 2025
// ================================================================
const express = require('express');
const router = express.Router();
const reportService = require('../services/reportGenerationService');
const emailDeliveryService = require('../services/emailDeliveryService');
const { asyncHandler } = require('../middleware/errorHandler');
const { adminOnly, optionalFlexibleAuth, partnerOnly, contractorOnly } = require('../middleware/auth');

// ================================================================
// REPORT GENERATION ENDPOINTS (Authenticated - Admin Only)
// ================================================================

/**
 * POST /api/reports/executive/:partnerId
 * Generate Executive Summary Report for a partner
 * Query params: ?campaignId=123 (optional - uses latest completed if not specified)
 * Body: { generatedBy: adminUserId }
 */
router.post('/executive/:partnerId', adminOnly, asyncHandler(async (req, res) => {
  const { partnerId } = req.params;
  const { campaignId } = req.query;
  const { generatedBy } = req.body;

  // Validate partnerId
  if (!partnerId || isNaN(parseInt(partnerId))) {
    return res.status(400).json({
      success: false,
      error: 'Invalid partner ID'
    });
  }

  // Generate report
  const report = await reportService.generateExecutiveReport(
    parseInt(partnerId),
    campaignId ? parseInt(campaignId) : null,
    generatedBy ? parseInt(generatedBy) : null
  );

  res.status(201).json({
    success: true,
    report_type: 'executive_summary',
    report_id: report.report_id,
    message: 'Executive report generated successfully',
    report
  });
}));

/**
 * POST /api/reports/contractor/:contractorId/partner/:partnerId
 * Generate Contractor Comparison Report
 * Query params: ?campaignId=123 (optional - uses latest completed if not specified)
 */
router.post('/contractor/:contractorId/partner/:partnerId', adminOnly, asyncHandler(async (req, res) => {
  const { contractorId, partnerId } = req.params;
  const { campaignId } = req.query;

  // Validate IDs
  if (!contractorId || isNaN(parseInt(contractorId))) {
    return res.status(400).json({
      success: false,
      error: 'Invalid contractor ID'
    });
  }

  if (!partnerId || isNaN(parseInt(partnerId))) {
    return res.status(400).json({
      success: false,
      error: 'Invalid partner ID'
    });
  }

  // Generate report
  const report = await reportService.generateContractorReport(
    parseInt(contractorId),
    parseInt(partnerId),
    campaignId ? parseInt(campaignId) : null
  );

  res.status(201).json({
    success: true,
    report_type: 'contractor_comparison',
    report_id: report.report_id,
    message: 'Contractor report generated successfully',
    report
  });
}));

// ================================================================
// PUBLIC REPORT ENDPOINTS (No Authentication Required)
// ================================================================

/**
 * GET /api/reports/pcr/:partnerId
 * Get Public PCR Report for landing page display
 * This does NOT save to database - generates on-the-fly
 */
router.get('/pcr/:partnerId', asyncHandler(async (req, res) => {
  const { partnerId } = req.params;

  // Validate partnerId
  if (!partnerId || isNaN(parseInt(partnerId))) {
    return res.status(400).json({
      success: false,
      error: 'Invalid partner ID'
    });
  }

  // Generate public report (not saved to DB)
  const report = await reportService.generatePublicPCRReport(parseInt(partnerId));

  res.json({
    success: true,
    report_type: 'public_pcr',
    report
  });
}));

// ================================================================
// REPORT RETRIEVAL ENDPOINTS (Authenticated)
// ================================================================

/**
 * GET /api/reports/:reportId
 * Get a specific report by ID
 */
router.get('/:reportId', adminOnly, asyncHandler(async (req, res) => {
  const { reportId } = req.params;

  // Validate reportId
  if (!reportId || isNaN(parseInt(reportId))) {
    return res.status(400).json({
      success: false,
      error: 'Invalid report ID'
    });
  }

  // Get report
  const report = await reportService.getReportById(parseInt(reportId));

  if (!report) {
    return res.status(404).json({
      success: false,
      error: 'Report not found'
    });
  }

  res.json({
    success: true,
    report
  });
}));

/**
 * GET /api/reports/partner/:partnerId/latest/:reportType
 * Get the latest report for a partner by type
 * reportType: 'executive_summary' | 'contractor_comparison' | 'public_pcr'
 */
router.get('/partner/:partnerId/latest/:reportType', adminOnly, asyncHandler(async (req, res) => {
  const { partnerId, reportType } = req.params;

  // Validate partnerId
  if (!partnerId || isNaN(parseInt(partnerId))) {
    return res.status(400).json({
      success: false,
      error: 'Invalid partner ID'
    });
  }

  // Validate reportType
  const validTypes = ['executive_summary', 'contractor_comparison', 'public_pcr'];
  if (!validTypes.includes(reportType)) {
    return res.status(400).json({
      success: false,
      error: `Invalid report type. Must be one of: ${validTypes.join(', ')}`
    });
  }

  // Get latest report
  const report = await reportService.getLatestReport(parseInt(partnerId), reportType);

  if (!report) {
    return res.status(404).json({
      success: false,
      error: 'No reports found for this partner and type'
    });
  }

  res.json({
    success: true,
    report
  });
}));

// ================================================================
// PORTAL ENDPOINTS (Phase 2 Day 3 - Partner & Contractor Portals)
// ================================================================

/**
 * GET /api/reports/partner/:partnerId/all
 * Get all executive summary reports for a partner
 * Used by partner portal to display quarterly reports list
 * Authentication: Partner token required, can only access own reports
 */
router.get('/partner/:partnerId/all', partnerOnly, asyncHandler(async (req, res) => {
  const { partnerId } = req.params;

  // Validate partnerId
  if (!partnerId || isNaN(parseInt(partnerId))) {
    return res.status(400).json({
      success: false,
      error: 'Invalid partner ID'
    });
  }

  // Authorization: Ensure partner can only access their own reports
  if (req.partnerId !== parseInt(partnerId)) {
    return res.status(403).json({
      success: false,
      error: 'Access denied: You can only view your own reports'
    });
  }

  // Get all reports for this partner
  const reports = await reportService.getAllReportsForPartner(parseInt(partnerId));

  res.json({
    success: true,
    count: reports.length,
    reports
  });
}));

/**
 * GET /api/reports/contractor/:contractorId/all
 * Get all contractor comparison reports for a contractor
 * Used by contractor portal to display performance reports list
 * Authentication: Contractor token required, can only access own reports
 */
router.get('/contractor/:contractorId/all', contractorOnly, asyncHandler(async (req, res) => {
  const { contractorId } = req.params;

  // Validate contractorId
  if (!contractorId || isNaN(parseInt(contractorId))) {
    return res.status(400).json({
      success: false,
      error: 'Invalid contractor ID'
    });
  }

  // Authorization: Ensure contractor can only access their own reports
  if (req.contractorId !== parseInt(contractorId)) {
    return res.status(403).json({
      success: false,
      error: 'Access denied: You can only view your own reports'
    });
  }

  // Get all reports for this contractor
  const reports = await reportService.getAllReportsForContractor(parseInt(contractorId));

  res.json({
    success: true,
    count: reports.length,
    reports
  });
}));

// ================================================================
// REPORT STATUS UPDATE ENDPOINTS (Authenticated)
// ================================================================

/**
 * PATCH /api/reports/:reportId/delivered
 * Mark a report as delivered
 */
router.patch('/:reportId/delivered', adminOnly, asyncHandler(async (req, res) => {
  const { reportId } = req.params;

  // Validate reportId
  if (!reportId || isNaN(parseInt(reportId))) {
    return res.status(400).json({
      success: false,
      error: 'Invalid report ID'
    });
  }

  // Update status
  const result = await reportService.markReportDelivered(parseInt(reportId));

  res.json({
    success: true,
    message: 'Report marked as delivered',
    report_id: result.report_id,
    status: result.status,
    delivered_at: result.delivered_at
  });
}));

/**
 * PATCH /api/reports/:reportId/viewed
 * Mark a report as viewed
 * Authentication: Optional - no auth required for public tracking
 * This allows email links to track views without authentication
 */
router.patch('/:reportId/viewed', optionalFlexibleAuth, asyncHandler(async (req, res) => {
  const { reportId } = req.params;

  // Validate reportId
  if (!reportId || isNaN(parseInt(reportId))) {
    return res.status(400).json({
      success: false,
      error: 'Invalid report ID'
    });
  }

  // Update status
  const result = await reportService.markReportViewed(parseInt(reportId));

  res.json({
    success: true,
    message: result.already_viewed ? 'Report was already viewed' : 'Report marked as viewed',
    report_id: result.report_id,
    status: result.status,
    viewed_at: result.viewed_at,
    already_viewed: result.already_viewed
  });
}));

// ================================================================
// EMAIL DELIVERY ENDPOINTS (Phase 2 - Authenticated - Admin Only)
// ================================================================

/**
 * POST /api/reports/:reportId/send
 * Send a report via email (n8n webhook pattern)
 * Body: { contractorId: number } (required for contractor reports only)
 */
router.post('/:reportId/send', adminOnly, asyncHandler(async (req, res) => {
  const { reportId } = req.params;
  const { contractorId } = req.body;

  // Validate reportId
  if (!reportId || isNaN(parseInt(reportId))) {
    return res.status(400).json({
      success: false,
      error: 'Invalid report ID'
    });
  }

  // Get report type to determine which send function to use
  const report = await reportService.getReportById(parseInt(reportId));

  if (!report) {
    return res.status(404).json({
      success: false,
      error: 'Report not found'
    });
  }

  // Send based on report type
  let result;
  if (report.report_type === 'executive_summary') {
    result = await emailDeliveryService.sendExecutiveReport(parseInt(reportId));
  } else if (report.report_type === 'contractor_comparison') {
    if (!contractorId) {
      return res.status(400).json({
        success: false,
        error: 'Contractor ID required for contractor reports'
      });
    }
    result = await emailDeliveryService.sendContractorReport(parseInt(reportId), parseInt(contractorId));
  } else if (report.report_type === 'public_pcr') {
    return res.status(400).json({
      success: false,
      error: 'Public PCR reports are not sent via email'
    });
  }

  res.json({
    success: true,
    message: 'Report sent via email successfully',
    result
  });
}));

/**
 * POST /api/reports/send-all-pending
 * Send all reports with status = 'generated' via email
 * Batch email delivery for executive reports
 */
router.post('/send-all-pending', adminOnly, asyncHandler(async (req, res) => {
  const result = await emailDeliveryService.sendAllPendingReports();

  res.json({
    success: true,
    message: `Email delivery complete: ${result.succeeded} succeeded, ${result.failed} failed`,
    result
  });
}));

// ================================================================
// DEMO/TESTING ENDPOINTS
// ================================================================

/**
 * GET /api/reports/demo/destination-motivation
 * Generate all three report types for Destination Motivation (partnerId=4)
 * Uses contractorId=1 for contractor report
 */
router.get('/demo/destination-motivation', asyncHandler(async (req, res) => {
  const partnerId = 4; // Destination Motivation
  const contractorId = 1;

  // Generate all three reports in parallel
  const [contractor, executive, pcr] = await Promise.all([
    reportService.generateContractorReport(contractorId, partnerId),
    reportService.generateExecutiveReport(partnerId),
    reportService.generatePublicPCRReport(partnerId)
  ]);

  res.json({
    success: true,
    message: 'Demo reports generated for Destination Motivation',
    reports: {
      contractor_comparison: contractor,
      executive_summary: executive,
      public_pcr: pcr
    }
  });
}));

module.exports = router;
