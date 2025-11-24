// DATABASE-CHECKED: Routes for CEO dashboard endpoints November 14, 2025
const express = require('express');
const router = express.Router();
const ceoDashboardController = require('../controllers/ceoDashboardController');
const { checkCeoPcrAccess } = require('../middleware/ceoPcrAccess');

/**
 * CEO Dashboard Routes
 * Base path: /api/ceo-dashboard
 *
 * PROTECTED: All routes require active CEO PCR subscription
 */

// Get full CEO dashboard data
// GET /api/ceo-dashboard/:contractorId
router.get('/:contractorId', checkCeoPcrAccess, ceoDashboardController.getCeoDashboard);

// Get performance alerts
// GET /api/ceo-dashboard/:contractorId/alerts
router.get('/:contractorId/alerts', checkCeoPcrAccess, ceoDashboardController.getPerformanceAlerts);

// Get category comparison (current vs previous)
// GET /api/ceo-dashboard/:contractorId/comparison
router.get('/:contractorId/comparison', checkCeoPcrAccess, ceoDashboardController.getCategoryComparison);

// Get AI culture recommendations
// GET /api/ceo-dashboard/:contractorId/recommendations
router.get('/:contractorId/recommendations', checkCeoPcrAccess, ceoDashboardController.getCultureRecommendations);

module.exports = router;
