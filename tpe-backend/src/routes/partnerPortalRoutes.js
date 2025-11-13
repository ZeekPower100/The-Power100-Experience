const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { protectPartner } = require('../middleware/partnerAuth');
const { protectPartnerOrAdmin } = require('../middleware/flexibleAuth');
const {
  getPartnerDashboard,
  getQuarterlyScores,
  getCategoryScores,
  getRecentFeedback,
  getContractorStats,
  exportPartnerReport,
  getPartnerProfile,
  updatePartnerProfile,
  uploadLogo,
  getFieldOptions,
  // Phase 3: Lead Management
  getPartnerLeads,
  getLeadDetails,
  updateLeadStatus,
  addLeadNote,
  getLeadStats,
  // Phase 4: Bulk Operations
  bulkUpdateLeadStatus,
  exportLeads
} = require('../controllers/partnerPortalController');
const { uploadLogoMiddleware } = require('../middleware/fileUpload');
const { asyncHandler } = require('../middleware/errorHandler');

// Validation middleware for export
const validateExport = [
  body('format').optional().isIn(['pdf', 'excel', 'csv']).withMessage('Format must be pdf, excel, or csv'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];

// Profile management routes (Phase 2) - Accept both partner AND admin tokens
// These routes must come BEFORE the router.use(protectPartner) to avoid being overridden
router.get('/profile', protectPartnerOrAdmin, asyncHandler(getPartnerProfile));
router.put('/profile', protectPartnerOrAdmin, asyncHandler(updatePartnerProfile));
router.post('/profile/upload-logo', protectPartnerOrAdmin, uploadLogoMiddleware.single('logo'), asyncHandler(uploadLogo));

// Lead management routes (Phase 3) - Accept both partner AND admin tokens
router.get('/leads', protectPartnerOrAdmin, asyncHandler(getPartnerLeads));
router.get('/leads/stats', protectPartnerOrAdmin, asyncHandler(getLeadStats));

// Bulk operations routes (Phase 4) - Must come BEFORE parameterized routes
router.put('/leads/bulk/status', protectPartnerOrAdmin, asyncHandler(bulkUpdateLeadStatus));
router.post('/leads/export', protectPartnerOrAdmin, asyncHandler(exportLeads));

// Parameterized lead routes - Must come AFTER specific routes like /leads/export
router.get('/leads/:leadId', protectPartnerOrAdmin, asyncHandler(getLeadDetails));
router.put('/leads/:leadId/status', protectPartnerOrAdmin, asyncHandler(updateLeadStatus));
router.post('/leads/:leadId/notes', protectPartnerOrAdmin, asyncHandler(addLeadNote));

// All remaining routes require partner authentication only
router.use(protectPartner);

// Partner dashboard routes
router.get('/dashboard', asyncHandler(getPartnerDashboard));

// Analytics routes
router.get('/analytics/quarterly', asyncHandler(getQuarterlyScores));
router.get('/analytics/categories', asyncHandler(getCategoryScores));

// Feedback routes
router.get('/feedback/recent', asyncHandler(getRecentFeedback));

// Contractor statistics routes
router.get('/contractors/stats', asyncHandler(getContractorStats));

// Export route
router.post('/export-report', validateExport, asyncHandler(exportPartnerReport));

// Field options route
router.get('/options', asyncHandler(getFieldOptions));

module.exports = router;