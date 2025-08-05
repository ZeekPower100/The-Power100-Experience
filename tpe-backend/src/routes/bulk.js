const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/auth');
const {
  bulkUpdateContractors,
  bulkDeleteContractors,
  bulkUpdatePartners,
  bulkTogglePartnerStatus,
  exportContractors,
  exportPartners
} = require('../controllers/bulkController');

// All bulk operations require admin access
router.use(protect);
router.use(adminOnly);

// Contractor bulk operations
router.post('/contractors/update', bulkUpdateContractors);
router.post('/contractors/delete', bulkDeleteContractors);
router.post('/contractors/export', exportContractors);

// Partner bulk operations
router.post('/partners/update', bulkUpdatePartners);
router.post('/partners/toggle-status', bulkTogglePartnerStatus);
router.post('/partners/export', exportPartners);

module.exports = router;