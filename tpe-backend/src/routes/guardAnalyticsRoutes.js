// ================================================================
// Guard Analytics Routes - Phase 3 Day 5
// ================================================================
// Purpose: API routes for Guard Monitoring Dashboard
// Note: No authentication middleware - follows same pattern as tokenAnalyticsRoutes
// ================================================================

const express = require('express');
const router = express.Router();
const guardAnalyticsController = require('../controllers/guardAnalyticsController');

// GET /api/analytics/guards/stats - Overall guard statistics
router.get('/stats', guardAnalyticsController.getOverallStats);

// GET /api/analytics/guards/violations - Recent guard violations
router.get('/violations', guardAnalyticsController.getViolations);

// GET /api/analytics/guards/activity-over-time - Guard activity over time
router.get('/activity-over-time', guardAnalyticsController.getActivityOverTime);

// GET /api/analytics/guards/top-violators - Top violators
router.get('/top-violators', guardAnalyticsController.getTopViolators);

// GET /api/analytics/guards/type-breakdown - Guard type breakdown
router.get('/type-breakdown', guardAnalyticsController.getTypeBreakdown);

// GET /api/analytics/guards/activity - Recent guard activity feed
router.get('/activity', guardAnalyticsController.getRecentActivity);

// GET /api/analytics/guards/contractor/:contractorId - Contractor-specific stats
router.get('/contractor/:contractorId', guardAnalyticsController.getContractorStats);

module.exports = router;
