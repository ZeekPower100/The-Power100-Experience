// Enhanced Partner Routes for PowerConfidence Dashboard Features
const express = require('express');
const router = express.Router();
const {
  getEnhancedPartnerList,
  getPartnerDetailedAnalytics,
  updatePartnerPowerConfidence
} = require('../controllers/partnerEnhancedController');

const { authenticateAdmin } = require('../middleware/auth');

// Apply admin authentication to all routes
router.use(authenticateAdmin);

// GET /api/partners-enhanced/list - Enhanced partner list with PowerConfidence scores
router.get('/list', getEnhancedPartnerList);

// GET /api/partners-enhanced/:partnerId/analytics - Detailed partner analytics
router.get('/:partnerId/analytics', getPartnerDetailedAnalytics);

// PUT /api/partners-enhanced/:partnerId/powerconfidence - Update PowerConfidence score
router.put('/:partnerId/powerconfidence', updatePartnerPowerConfidence);

module.exports = router;