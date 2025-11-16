// DATABASE-CHECKED: Routes for CEO dashboard endpoints November 14, 2025
const express = require('express');
const router = express.Router();
const ceoDashboardController = require('../controllers/ceoDashboardController');

/**
 * CEO Dashboard Routes
 * Base path: /api/ceo-dashboard
 */

// Get full CEO dashboard data
// GET /api/ceo-dashboard/:contractorId
router.get('/:contractorId', ceoDashboardController.getCeoDashboard);

// Get performance alerts
// GET /api/ceo-dashboard/:contractorId/alerts
router.get('/:contractorId/alerts', ceoDashboardController.getPerformanceAlerts);

// Get category comparison (current vs previous)
// GET /api/ceo-dashboard/:contractorId/comparison
router.get('/:contractorId/comparison', ceoDashboardController.getCategoryComparison);

// Get AI culture recommendations
// GET /api/ceo-dashboard/:contractorId/recommendations
router.get('/:contractorId/recommendations', ceoDashboardController.getCultureRecommendations);

module.exports = router;
