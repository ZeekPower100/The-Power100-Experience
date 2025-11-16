// DATABASE-CHECKED: Uses ceoPcrReportingService November 14, 2025
const ceoPcrReportingService = require('../services/ceoPcrReportingService');
const aiCeoCultureService = require('../services/aiCeoCultureService');

/**
 * Get CEO dashboard data
 * GET /api/ceo-dashboard/:contractorId
 */
const getCeoDashboard = async (req, res, next) => {
  try {
    const { contractorId } = req.params;

    console.log(`[CEO Dashboard Controller] Fetching dashboard for contractor ${contractorId}`);

    const dashboardData = await ceoPcrReportingService.getCeoDashboardData(contractorId);

    res.json({
      success: true,
      data: dashboardData
    });
  } catch (error) {
    console.error('[CEO Dashboard Controller] Error fetching dashboard:', error);
    next(error);
  }
};

/**
 * Get performance alerts for CEO
 * GET /api/ceo-dashboard/:contractorId/alerts
 */
const getPerformanceAlerts = async (req, res, next) => {
  try {
    const { contractorId } = req.params;

    console.log(`[CEO Dashboard Controller] Generating alerts for contractor ${contractorId}`);

    const alerts = await ceoPcrReportingService.generatePerformanceAlerts(contractorId);

    res.json({
      success: true,
      alerts,
      total: alerts.length,
      high_priority: alerts.filter(a => a.severity === 'high' || a.severity === 'critical').length
    });
  } catch (error) {
    console.error('[CEO Dashboard Controller] Error generating alerts:', error);
    next(error);
  }
};

/**
 * Get category comparison (current vs previous)
 * GET /api/ceo-dashboard/:contractorId/comparison
 */
const getCategoryComparison = async (req, res, next) => {
  try {
    const { contractorId } = req.params;

    console.log(`[CEO Dashboard Controller] Fetching category comparison for contractor ${contractorId}`);

    const comparison = await ceoPcrReportingService.getCategoryComparison(contractorId);

    if (!comparison) {
      return res.json({
        success: true,
        message: 'Not enough data for comparison',
        comparison: null
      });
    }

    res.json({
      success: true,
      comparison
    });
  } catch (error) {
    console.error('[CEO Dashboard Controller] Error fetching comparison:', error);
    next(error);
  }
};

/**
 * Get AI culture recommendations
 * GET /api/ceo-dashboard/:contractorId/recommendations
 */
const getCultureRecommendations = async (req, res, next) => {
  try {
    const { contractorId } = req.params;

    console.log(`[CEO Dashboard Controller] Generating AI recommendations for contractor ${contractorId}`);

    const recommendations = await aiCeoCultureService.generateCultureRecommendations(contractorId);

    res.json({
      success: true,
      data: recommendations
    });
  } catch (error) {
    console.error('[CEO Dashboard Controller] Error generating recommendations:', error);
    next(error);
  }
};

module.exports = {
  getCeoDashboard,
  getPerformanceAlerts,
  getCategoryComparison,
  getCultureRecommendations
};
