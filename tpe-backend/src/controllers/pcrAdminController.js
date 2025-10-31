// DATABASE-CHECKED: strategic_partners, power_card_campaigns columns verified October 31, 2025
// ================================================================
// PCR Admin Analytics Controller
// ================================================================
// Purpose: Admin endpoints for PowerConfidence Rating analytics and campaign processing
// ================================================================

const { query } = require('../config/database');
const powerCardsIntegrationService = require('../services/powerCardsIntegrationService');

/**
 * Process completed PowerCards campaign
 * POST /api/admin/power-cards/campaigns/:id/process
 */
const processCampaign = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate campaign exists and is ready for processing
    const campaignResult = await query(
      'SELECT id, campaign_name, status FROM power_card_campaigns WHERE id = $1',
      [id]
    );

    if (campaignResult.rows.length === 0) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    // Process campaign completion
    const results = await powerCardsIntegrationService.processCampaignCompletion(parseInt(id));

    res.json({
      success: true,
      campaign: campaignResult.rows[0],
      results
    });
  } catch (error) {
    console.error('[PCR Admin] Error processing campaign:', error);
    res.status(500).json({ error: 'Failed to process campaign' });
  }
};

/**
 * Get momentum distribution across all partners
 * GET /api/admin/pcr/momentum-distribution
 */
const getMomentumDistribution = async (req, res) => {
  try {
    const result = await query(`
      SELECT
        momentum_modifier,
        COUNT(*) as count
      FROM strategic_partners
      WHERE momentum_modifier IS NOT NULL
      GROUP BY momentum_modifier
      ORDER BY momentum_modifier DESC
    `);

    const distribution = {
      positive: 0,  // +5
      neutral: 0,   // 0
      negative: 0   // -3
    };

    result.rows.forEach(row => {
      const momentum = parseInt(row.momentum_modifier);
      const count = parseInt(row.count);

      if (momentum > 0) distribution.positive += count;
      else if (momentum === 0) distribution.neutral += count;
      else distribution.negative += count;
    });

    res.json({
      success: true,
      distribution,
      details: result.rows.map(r => ({
        momentum: r.momentum_modifier,
        count: parseInt(r.count)
      }))
    });
  } catch (error) {
    console.error('[PCR Admin] Error getting momentum distribution:', error);
    res.status(500).json({ error: 'Failed to get momentum distribution' });
  }
};

/**
 * Get badge distribution across all partners
 * GET /api/admin/pcr/badge-distribution
 */
const getBadgeDistribution = async (req, res) => {
  try {
    const result = await query(`
      SELECT
        earned_badges,
        company_name
      FROM strategic_partners
      WHERE earned_badges IS NOT NULL
        AND jsonb_array_length(earned_badges) > 0
    `);

    const badgeCounts = {};
    const partnersByBadge = {};

    result.rows.forEach(row => {
      const badges = row.earned_badges || [];
      badges.forEach(badge => {
        const badgeName = badge.badge || badge.name || 'Unknown';
        badgeCounts[badgeName] = (badgeCounts[badgeName] || 0) + 1;

        if (!partnersByBadge[badgeName]) {
          partnersByBadge[badgeName] = [];
        }
        partnersByBadge[badgeName].push(row.company_name);
      });
    });

    res.json({
      success: true,
      totalPartners: result.rows.length,
      badgeCounts,
      partnersByBadge
    });
  } catch (error) {
    console.error('[PCR Admin] Error getting badge distribution:', error);
    res.status(500).json({ error: 'Failed to get badge distribution' });
  }
};

/**
 * Get performance trends breakdown
 * GET /api/admin/pcr/performance-trends
 */
const getPerformanceTrends = async (req, res) => {
  try {
    const result = await query(`
      SELECT
        performance_trend,
        COUNT(*) as count,
        ROUND(AVG(current_powerconfidence_score), 2) as avg_score
      FROM strategic_partners
      WHERE performance_trend IS NOT NULL
      GROUP BY performance_trend
      ORDER BY
        CASE performance_trend
          WHEN 'improving' THEN 1
          WHEN 'stable' THEN 2
          WHEN 'declining' THEN 3
          ELSE 4
        END
    `);

    res.json({
      success: true,
      trends: result.rows.map(r => ({
        trend: r.performance_trend,
        count: parseInt(r.count),
        avgScore: parseFloat(r.avg_score)
      }))
    });
  } catch (error) {
    console.error('[PCR Admin] Error getting performance trends:', error);
    res.status(500).json({ error: 'Failed to get performance trends' });
  }
};

module.exports = {
  processCampaign,
  getMomentumDistribution,
  getBadgeDistribution,
  getPerformanceTrends
};
