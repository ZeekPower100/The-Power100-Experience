// Report Routes - Contractor, Executive, and Public PCR reports
const express = require('express');
const router = express.Router();
const reportService = require('../services/reportGenerationService');
const { protect } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

// ===== CONTRACTOR REPORT =====
// GET /api/reports/contractor/:contractorId/partner/:partnerId
router.get('/contractor/:contractorId/partner/:partnerId', asyncHandler(async (req, res) => {
  const { contractorId, partnerId } = req.params;
  
  const report = await reportService.generateContractorReport(contractorId, partnerId);
  
  res.status(200).json({
    success: true,
    report_type: 'contractor_comparison',
    report
  });
}));

// ===== EXECUTIVE REPORT (Protected - Partner/Admin only) =====
// GET /api/reports/executive/partner/:partnerId
router.get('/executive/partner/:partnerId', protect, asyncHandler(async (req, res) => {
  const { partnerId } = req.params;
  
  const report = await reportService.generateExecutiveReport(partnerId);
  
  res.status(200).json({
    success: true,
    report_type: 'executive_summary',
    confidential: true,
    report
  });
}));

// ===== PUBLIC PCR REPORT =====
// GET /api/reports/pcr/:partnerId
router.get('/pcr/:partnerId', asyncHandler(async (req, res) => {
  const { partnerId } = req.params;
  
  const report = await reportService.generatePublicPCRReport(partnerId);
  
  res.status(200).json({
    success: true,
    report_type: 'public_pcr',
    report
  });
}));

// ===== PREVIEW ENDPOINTS FOR DEMO =====

// Preview all DM reports at once (for demo purposes)
// GET /api/reports/demo/destination-motivation
router.get('/demo/destination-motivation', asyncHandler(async (req, res) => {
  const dmPartnerId = 4; // DM's ID
  const sampleContractorId = 1;
  
  // Generate all three reports
  const [contractorReport, executiveReport, pcrReport] = await Promise.all([
    reportService.generateContractorReport(sampleContractorId, dmPartnerId),
    reportService.generateExecutiveReport(dmPartnerId),
    reportService.generatePublicPCRReport(dmPartnerId)
  ]);
  
  res.status(200).json({
    success: true,
    demo: true,
    reports: {
      contractor_comparison: contractorReport,
      executive_summary: executiveReport,
      public_pcr: pcrReport
    },
    message: 'All three report types for Destination Motivation'
  });
}));

module.exports = router;