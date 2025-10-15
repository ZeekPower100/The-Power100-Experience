// DATABASE-CHECKED: ai_interactions verified October 14, 2025
// ================================================================
// Token Analytics Controller - Phase 3 Day 2 Enhancement
// ================================================================
// Purpose: Expose token usage analytics via REST API
// Routes: /api/analytics/tokens/*
// ================================================================
// VERIFIED FIELD NAMES:
// - contractor_id (NOT contractorId)
// - interaction_type (NOT interactionType)
// - interaction_data (NOT interactionData) - JSONB type
// - created_at (NOT createdAt)
// ================================================================

const tokenUsageAnalytics = require('../services/analytics/tokenUsageAnalytics');

const tokenAnalyticsController = {
  /**
   * GET /api/analytics/tokens/contractor/:contractorId
   * Get token usage statistics for a specific contractor
   */
  async getContractorUsage(req, res, next) {
    try {
      const { contractorId } = req.params;
      const { days = 30 } = req.query;

      if (!contractorId) {
        return res.status(400).json({
          success: false,
          error: 'Contractor ID is required'
        });
      }

      const usage = await tokenUsageAnalytics.getContractorTokenUsage(
        parseInt(contractorId),
        parseInt(days)
      );

      res.json({
        success: true,
        data: usage,
        period_days: parseInt(days)
      });
    } catch (error) {
      console.error('[Token Analytics] Error fetching contractor usage:', error);
      next(error);
    }
  },

  /**
   * GET /api/analytics/tokens/trends
   * Get token usage trends over time
   */
  async getTrends(req, res, next) {
    try {
      const { contractorId, days = 7 } = req.query;

      const trends = await tokenUsageAnalytics.getTokenUsageTrends(
        contractorId ? parseInt(contractorId) : null,
        parseInt(days)
      );

      res.json({
        success: true,
        data: trends,
        period_days: parseInt(days),
        contractor_id: contractorId ? parseInt(contractorId) : null,
        scope: contractorId ? 'contractor' : 'system'
      });
    } catch (error) {
      console.error('[Token Analytics] Error fetching trends:', error);
      next(error);
    }
  },

  /**
   * GET /api/analytics/tokens/system
   * Get system-wide token usage statistics
   */
  async getSystemUsage(req, res, next) {
    try {
      const { days = 30 } = req.query;

      const usage = await tokenUsageAnalytics.getSystemTokenUsage(
        parseInt(days)
      );

      res.json({
        success: true,
        data: usage,
        period_days: parseInt(days)
      });
    } catch (error) {
      console.error('[Token Analytics] Error fetching system usage:', error);
      next(error);
    }
  },

  /**
   * GET /api/analytics/tokens/summary
   * Get comprehensive usage summary (contractor + system)
   */
  async getSummary(req, res, next) {
    try {
      const { contractorId, days = 30 } = req.query;

      if (!contractorId) {
        return res.status(400).json({
          success: false,
          error: 'Contractor ID is required for summary'
        });
      }

      // Fetch both contractor and system usage in parallel
      const [contractorUsage, systemUsage, trends] = await Promise.all([
        tokenUsageAnalytics.getContractorTokenUsage(parseInt(contractorId), parseInt(days)),
        tokenUsageAnalytics.getSystemTokenUsage(parseInt(days)),
        tokenUsageAnalytics.getTokenUsageTrends(parseInt(contractorId), 7) // Last 7 days
      ]);

      // Calculate contractor's percentage of system usage
      const contractorPercentage = systemUsage.total_interactions > 0
        ? (contractorUsage.interaction_count / systemUsage.total_interactions * 100).toFixed(2)
        : 0;

      res.json({
        success: true,
        data: {
          contractor: contractorUsage,
          system: systemUsage,
          recent_trends: trends,
          contractor_percentage: parseFloat(contractorPercentage)
        },
        period_days: parseInt(days)
      });
    } catch (error) {
      console.error('[Token Analytics] Error fetching summary:', error);
      next(error);
    }
  }
};

module.exports = tokenAnalyticsController;
