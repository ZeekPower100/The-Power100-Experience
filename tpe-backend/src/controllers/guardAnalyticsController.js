// DATABASE-CHECKED: Uses guardAnalyticsService.js which has verified columns
// ================================================================
// Guard Analytics Controller - Phase 3 Day 5
// ================================================================
// Purpose: API endpoints for Guard Monitoring Dashboard
// Provides guard statistics, violations, and activity data
// ================================================================

const GuardAnalyticsService = require('../services/analytics/guardAnalyticsService');

/**
 * Get overall guard statistics
 * GET /api/analytics/guards/stats
 * Query params: hours (optional, default: 24)
 */
exports.getOverallStats = async (req, res) => {
  try {
    const hours = parseInt(req.query.hours) || 24;
    const stats = await GuardAnalyticsService.getOverallStats(hours);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('[GuardAnalyticsController] Error getting overall stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch guard statistics',
      message: error.message
    });
  }
};

/**
 * Get recent guard violations
 * GET /api/analytics/guards/violations
 * Query params: limit (optional, default: 50), hours (optional, default: 24)
 */
exports.getViolations = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const hours = parseInt(req.query.hours) || 24;
    const violations = await GuardAnalyticsService.getRecentViolations(limit, hours);

    res.json({
      success: true,
      data: violations,
      count: violations.length
    });
  } catch (error) {
    console.error('[GuardAnalyticsController] Error getting violations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch guard violations',
      message: error.message
    });
  }
};

/**
 * Get guard activity over time
 * GET /api/analytics/guards/activity-over-time
 * Query params: hours (optional, default: 24)
 */
exports.getActivityOverTime = async (req, res) => {
  try {
    const hours = parseInt(req.query.hours) || 24;
    const activity = await GuardAnalyticsService.getActivityOverTime(hours);

    res.json({
      success: true,
      data: activity,
      count: activity.length
    });
  } catch (error) {
    console.error('[GuardAnalyticsController] Error getting activity over time:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch guard activity over time',
      message: error.message
    });
  }
};

/**
 * Get top violators
 * GET /api/analytics/guards/top-violators
 * Query params: limit (optional, default: 10), hours (optional, default: 24)
 */
exports.getTopViolators = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const hours = parseInt(req.query.hours) || 24;
    const violators = await GuardAnalyticsService.getTopViolators(limit, hours);

    res.json({
      success: true,
      data: violators,
      count: violators.length
    });
  } catch (error) {
    console.error('[GuardAnalyticsController] Error getting top violators:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch top violators',
      message: error.message
    });
  }
};

/**
 * Get guard type breakdown
 * GET /api/analytics/guards/type-breakdown
 * Query params: hours (optional, default: 24)
 */
exports.getTypeBreakdown = async (req, res) => {
  try {
    const hours = parseInt(req.query.hours) || 24;
    const breakdown = await GuardAnalyticsService.getGuardTypeBreakdown(hours);

    res.json({
      success: true,
      data: breakdown,
      count: breakdown.length
    });
  } catch (error) {
    console.error('[GuardAnalyticsController] Error getting type breakdown:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch guard type breakdown',
      message: error.message
    });
  }
};

/**
 * Get recent guard activity feed
 * GET /api/analytics/guards/activity
 * Query params: limit (optional, default: 100)
 */
exports.getRecentActivity = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const activity = await GuardAnalyticsService.getRecentActivity(limit);

    res.json({
      success: true,
      data: activity,
      count: activity.length
    });
  } catch (error) {
    console.error('[GuardAnalyticsController] Error getting recent activity:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch recent guard activity',
      message: error.message
    });
  }
};

/**
 * Get contractor-specific guard statistics
 * GET /api/analytics/guards/contractor/:contractorId
 * Query params: days (optional, default: 30)
 */
exports.getContractorStats = async (req, res) => {
  try {
    const contractorId = parseInt(req.params.contractorId);
    const days = parseInt(req.query.days) || 30;

    if (!contractorId || isNaN(contractorId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid contractor ID'
      });
    }

    const stats = await GuardAnalyticsService.getContractorStats(contractorId, days);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('[GuardAnalyticsController] Error getting contractor stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch contractor guard statistics',
      message: error.message
    });
  }
};
