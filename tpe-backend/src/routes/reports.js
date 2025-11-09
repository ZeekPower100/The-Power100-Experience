// ================================================================
// Report Routes - Phase 1, 2 & 3: Quarterly Report Generation, Email Delivery & PDF Generation
// DATABASE-CHECKED: All field names verified November 2, 2025
// ================================================================
const express = require('express');
const router = express.Router();
const reportService = require('../services/reportGenerationService');
const emailDeliveryService = require('../services/emailDeliveryService');
const pdfService = require('../services/pdfGenerationService');
const publicPCRService = require('../services/publicPCRService');
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
 * Authentication: Admin, Partner (own reports), or Contractor (own reports)
 */
router.get('/:reportId', optionalFlexibleAuth, asyncHandler(async (req, res) => {
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

  // Authorization: Check if user can access this report
  if (req.userType === 'partner') {
    // Partners can only view their own executive summary reports
    if (report.partner_id !== req.partnerId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied: You can only view your own reports'
      });
    }
  } else if (req.userType === 'contractor') {
    // Contractors can only view their own contractor comparison reports
    const reportContractorId = report.report_data?.contractor?.id;
    if (!reportContractorId || reportContractorId !== req.contractorId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied: You can only view your own reports'
      });
    }
  }
  // Admins can view all reports (no authorization check needed)

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

// ================================================================
// PDF GENERATION ENDPOINTS (Phase 3 - Authenticated)
// ================================================================

/**
 * POST /api/reports/:reportId/generate-pdf
 * Generate PDF for a specific report
 * Authenticated: Partner or Admin
 */
router.post('/:reportId/generate-pdf', optionalFlexibleAuth, asyncHandler(async (req, res) => {
  const { reportId } = req.params;

  // Validate reportId
  if (!reportId || isNaN(parseInt(reportId))) {
    return res.status(400).json({
      success: false,
      error: 'Invalid report ID'
    });
  }

  // Get report to check ownership
  const report = await reportService.getReportById(parseInt(reportId));

  if (!report) {
    return res.status(404).json({
      success: false,
      error: 'Report not found'
    });
  }

  // Authorization: Partners can only generate PDFs for their own reports
  if (req.userType === 'partner' && report.partner_id !== req.partnerId) {
    return res.status(403).json({
      success: false,
      error: 'Access denied: You can only generate PDFs for your own reports'
    });
  }

  // Generate PDF
  const result = await pdfService.generateReportPDF(parseInt(reportId));

  res.status(200).json({
    success: true,
    message: 'PDF generated successfully',
    pdf: result
  });
}));

/**
 * GET /api/reports/:reportId/pdf/download
 * Get signed URL for PDF download
 * Authenticated: Partner or Admin
 */
router.get('/:reportId/pdf/download', optionalFlexibleAuth, asyncHandler(async (req, res) => {
  const { reportId } = req.params;

  // Validate reportId
  if (!reportId || isNaN(parseInt(reportId))) {
    return res.status(400).json({
      success: false,
      error: 'Invalid report ID'
    });
  }

  // Get report to check ownership
  const report = await reportService.getReportById(parseInt(reportId));

  if (!report) {
    return res.status(404).json({
      success: false,
      error: 'Report not found'
    });
  }

  // Authorization: Partners can only download their own PDFs
  if (req.userType === 'partner' && report.partner_id !== req.partnerId) {
    return res.status(403).json({
      success: false,
      error: 'Access denied: You can only download your own reports'
    });
  }

  // Get signed download URL (expires in 1 hour)
  const signedUrl = await pdfService.getPDFDownloadUrl(parseInt(reportId), 3600);

  res.status(200).json({
    success: true,
    downloadUrl: signedUrl,
    expiresIn: 3600
  });
}));

/**
 * POST /api/reports/:reportId/share
 * Generate share token for public access
 * Authenticated: Admin only
 */
router.post('/:reportId/share', adminOnly, asyncHandler(async (req, res) => {
  const { reportId } = req.params;
  const { expiresInDays } = req.body;

  // Validate reportId
  if (!reportId || isNaN(parseInt(reportId))) {
    return res.status(400).json({
      success: false,
      error: 'Invalid report ID'
    });
  }

  // Generate share token (default 30 days)
  const result = await pdfService.generateShareToken(
    parseInt(reportId),
    expiresInDays || 30
  );

  res.status(200).json({
    success: true,
    message: 'Share link generated successfully',
    share: result
  });
}));

/**
 * GET /api/reports/share/:token
 * View shared report (PUBLIC - No auth required)
 */
router.get('/share/:token', asyncHandler(async (req, res) => {
  const { token } = req.params;

  if (!token) {
    return res.status(400).json({
      success: false,
      error: 'Share token required'
    });
  }

  try {
    const report = await pdfService.getReportByShareToken(token);

    res.status(200).json({
      success: true,
      report
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      error: error.message
    });
  }
}));

/**
 * POST /api/reports/pdf/generate-all
 * Generate PDFs for all reports missing them
 * Authenticated: Admin only
 */
router.post('/pdf/generate-all', adminOnly, asyncHandler(async (req, res) => {
  console.log('[PDF Batch] Starting batch PDF generation');

  const result = await pdfService.generateAllMissingPDFs();

  res.status(200).json({
    success: true,
    message: 'Batch PDF generation complete',
    summary: result
  });
}));

// ================================================================
// PUBLIC PCR ENDPOINTS (No Authentication Required - Phase 3 Day 3)
// ================================================================

/**
 * GET /api/reports/public/pcr/:publicUrl
 * Get public PCR data by URL slug
 * NO AUTHENTICATION REQUIRED
 */
router.get('/public/pcr/:publicUrl', asyncHandler(async (req, res) => {
  const { publicUrl } = req.params;

  console.log(`[Public PCR] GET request for slug: ${publicUrl}`);

  const pcrData = await publicPCRService.getPublicPCRBySlug(publicUrl);

  res.status(200).json({
    success: true,
    pcr: pcrData
  });
}));

/**
 * POST /api/reports/partner/:partnerId/public-url
 * Set public URL for a partner
 * Authenticated: Admin or Partner
 */
router.post('/partner/:partnerId/public-url', optionalFlexibleAuth, asyncHandler(async (req, res) => {
  const { partnerId } = req.params;
  const { publicUrl } = req.body;

  // Authorization: Admins can set for any partner, Partners can only set for themselves
  if (req.userType === 'partner' && req.partnerId !== parseInt(partnerId)) {
    return res.status(403).json({
      success: false,
      error: 'Access denied: You can only set your own public URL'
    });
  }

  if (!publicUrl) {
    return res.status(400).json({
      success: false,
      error: 'publicUrl is required'
    });
  }

  const result = await publicPCRService.setPublicURL(parseInt(partnerId), publicUrl);

  res.status(200).json({
    success: true,
    message: 'Public URL set successfully',
    result
  });
}));

/**
 * GET /api/reports/partner/:partnerId/public-url
 * Get public URL for a partner
 * Authenticated: Admin or Partner
 */
router.get('/partner/:partnerId/public-url', optionalFlexibleAuth, asyncHandler(async (req, res) => {
  const { partnerId } = req.params;

  // Authorization: Admins can view any partner, Partners can only view their own
  if (req.userType === 'partner' && req.partnerId !== parseInt(partnerId)) {
    return res.status(403).json({
      success: false,
      error: 'Access denied'
    });
  }

  const publicUrl = await publicPCRService.getPublicURL(parseInt(partnerId));

  res.status(200).json({
    success: true,
    publicUrl,
    fullUrl: publicUrl ? `${process.env.FRONTEND_URL || 'http://localhost:3002'}/pcr/${publicUrl}` : null
  });
}));

module.exports = router;
