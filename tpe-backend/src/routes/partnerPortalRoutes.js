const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { protectPartner } = require('../middleware/partnerAuth');
const {
  getPartnerDashboard,
  getPartnerFeedback,
  exportPartnerReport
} = require('../controllers/partnerPortalController');
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

// All routes require partner authentication
router.use(protectPartner);

// Partner dashboard routes
router.get('/dashboard', asyncHandler(getPartnerDashboard));
router.get('/feedback', asyncHandler(getPartnerFeedback));
router.post('/export-report', validateExport, asyncHandler(exportPartnerReport));

module.exports = router;