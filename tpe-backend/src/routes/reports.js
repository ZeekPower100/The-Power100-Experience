// Report Routes
const express = require('express');
const router = express.Router();
const reportService = require('../services/reportGenerationService');
const { asyncHandler } = require('../middleware/errorHandler');

// Contractor Report
router.get('/contractor/:contractorId/partner/:partnerId', asyncHandler(async (req, res) => {
  const { contractorId, partnerId } = req.params;
  const report = await reportService.generateContractorReport(contractorId, partnerId);
  res.json({ success: true, report_type: 'contractor_comparison', report });
}));

// Executive Report
router.get('/executive/partner/:partnerId', asyncHandler(async (req, res) => {
  const { partnerId } = req.params;
  const report = await reportService.generateExecutiveReport(partnerId);
  res.json({ success: true, report_type: 'executive_summary', report });
}));

// Public PCR Report
router.get('/pcr/:partnerId', asyncHandler(async (req, res) => {
  const { partnerId } = req.params;
  const report = await reportService.generatePublicPCRReport(partnerId);
  res.json({ success: true, report_type: 'public_pcr', report });
}));

// Demo - All DM reports
router.get('/demo/destination-motivation', asyncHandler(async (req, res) => {
  const [contractor, executive, pcr] = await Promise.all([
    reportService.generateContractorReport(1, 4),
    reportService.generateExecutiveReport(4),
    reportService.generatePublicPCRReport(4)
  ]);
  
  res.json({
    success: true,
    reports: {
      contractor_comparison: contractor,
      executive_summary: executive,
      public_pcr: pcr
    }
  });
}));

module.exports = router;
