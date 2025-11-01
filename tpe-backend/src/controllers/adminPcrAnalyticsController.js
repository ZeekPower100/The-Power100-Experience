// DATABASE-CHECKED: strategic_partners columns verified October 31, 2025
// ================================================================
// VERIFIED FIELD NAMES:
// - id (INTEGER, primary key)
// - company_name (VARCHAR)
// - is_active (BOOLEAN, default: true)
// - final_pcr_score (NUMERIC(5,2), nullable)
// - base_pcr_score (NUMERIC(5,2), nullable)
// - momentum_modifier (INTEGER, default: 0, values: -3, 0, 5)
// - performance_trend (VARCHAR, default: 'new', values: 'improving', 'stable', 'declining', 'new')
// - engagement_tier (VARCHAR, default: 'free', values: 'free', 'gold', 'platinum')
// - earned_badges (JSONB, default: '[]'::jsonb, structure: [{type, name, icon, category, earnedAt, description}])
// - quarters_tracked (INTEGER, default: 0)
// - quarterly_history (JSONB, default: '[]'::jsonb)
// - quarterly_feedback_score (NUMERIC(5,2), default: 50.00)
// ================================================================
// VERIFIED DATA TYPES:
// - Scores: NUMERIC(5,2) - stores values like 86.14
// - Momentum: INTEGER - values: -3 (declining), 0 (stable/new), 5 (hot streak)
// - Badges: JSONB array of objects
// - History: JSONB array of quarterly objects
// ================================================================
// PURPOSE:
// Provide analytics endpoints for admin dashboard to monitor:
// - Momentum distribution across all partners
// - Performance trend breakdown
// - Badge distribution and averages
// - PCR score distribution and statistics
// - Top performing partners
// ================================================================

const { query } = require('../config/database');

/**
 * Get momentum distribution across all active partners
 * Returns count of partners by momentum modifier (-3, 0, 5)
 *
 * GET /api/admin/pcr/momentum-distribution
 */
async function getMomentumDistribution(req, res) {
  try {
    console.log('[Admin Analytics] Fetching momentum distribution...');

    const result = await query(`
      SELECT
        momentum_modifier,
        performance_trend,
        COUNT(*) as partner_count
      FROM strategic_partners
      WHERE is_active = true
      GROUP BY momentum_modifier, performance_trend
      ORDER BY momentum_modifier DESC
    `);

    // Organize by momentum modifier
    const distribution = {
      hot_streak: {
        modifier: 5,
        count: 0,
        trends: []
      },
      stable: {
        modifier: 0,
        count: 0,
        trends: []
      },
      declining: {
        modifier: -3,
        count: 0,
        trends: []
      }
    };

    result.rows.forEach(row => {
      const modifier = parseInt(row.momentum_modifier);
      const count = parseInt(row.partner_count);
      const trend = row.performance_trend;

      if (modifier === 5) {
        distribution.hot_streak.count += count;
        distribution.hot_streak.trends.push({ trend, count });
      } else if (modifier === -3) {
        distribution.declining.count += count;
        distribution.declining.trends.push({ trend, count });
      } else {
        distribution.stable.count += count;
        distribution.stable.trends.push({ trend, count });
      }
    });

    const total = distribution.hot_streak.count + distribution.stable.count + distribution.declining.count;

    res.json({
      success: true,
      data: {
        distribution,
        total,
        percentages: {
          hot_streak: total > 0 ? Math.round((distribution.hot_streak.count / total) * 100) : 0,
          stable: total > 0 ? Math.round((distribution.stable.count / total) * 100) : 0,
          declining: total > 0 ? Math.round((distribution.declining.count / total) * 100) : 0
        }
      }
    });

  } catch (error) {
    console.error('[Admin Analytics] Momentum distribution error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch momentum distribution',
      details: error.message
    });
  }
}

/**
 * Get performance trend breakdown
 * Returns count of partners by trend (improving, stable, declining, new)
 *
 * GET /api/admin/pcr/performance-trends
 */
async function getPerformanceTrends(req, res) {
  try {
    console.log('[Admin Analytics] Fetching performance trends...');

    const result = await query(`
      SELECT
        performance_trend,
        COUNT(*) as partner_count,
        AVG(final_pcr_score) as avg_pcr,
        AVG(quarters_tracked) as avg_quarters
      FROM strategic_partners
      WHERE is_active = true
      GROUP BY performance_trend
      ORDER BY
        CASE performance_trend
          WHEN 'improving' THEN 1
          WHEN 'stable' THEN 2
          WHEN 'declining' THEN 3
          WHEN 'new' THEN 4
        END
    `);

    const trends = result.rows.map(row => ({
      trend: row.performance_trend,
      count: parseInt(row.partner_count),
      averagePCR: row.avg_pcr ? parseFloat(row.avg_pcr).toFixed(2) : null,
      averageQuarters: row.avg_quarters ? parseFloat(row.avg_quarters).toFixed(1) : null
    }));

    const total = trends.reduce((sum, t) => sum + t.count, 0);

    res.json({
      success: true,
      data: {
        trends,
        total,
        summary: {
          improving: trends.find(t => t.trend === 'improving')?.count || 0,
          stable: trends.find(t => t.trend === 'stable')?.count || 0,
          declining: trends.find(t => t.trend === 'declining')?.count || 0,
          new: trends.find(t => t.trend === 'new')?.count || 0
        }
      }
    });

  } catch (error) {
    console.error('[Admin Analytics] Performance trends error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch performance trends',
      details: error.message
    });
  }
}

/**
 * Get badge distribution across all partners
 * Returns count of each badge type
 *
 * GET /api/admin/pcr/badge-distribution
 */
async function getBadgeDistribution(req, res) {
  try {
    console.log('[Admin Analytics] Fetching badge distribution...');

    const result = await query(`
      SELECT
        earned_badges
      FROM strategic_partners
      WHERE is_active = true
        AND earned_badges IS NOT NULL
        AND jsonb_array_length(earned_badges) > 0
    `);

    // Count each badge type
    const badgeCounts = {};
    let totalBadges = 0;
    let partnersWithBadges = 0;

    result.rows.forEach(row => {
      const badges = row.earned_badges || [];
      if (badges.length > 0) partnersWithBadges++;

      badges.forEach(badge => {
        if (!badgeCounts[badge.type]) {
          badgeCounts[badge.type] = {
            type: badge.type,
            name: badge.name,
            category: badge.category,
            icon: badge.icon,
            count: 0
          };
        }
        badgeCounts[badge.type].count++;
        totalBadges++;
      });
    });

    const distribution = Object.values(badgeCounts).sort((a, b) => b.count - a.count);

    res.json({
      success: true,
      data: {
        distribution,
        totalBadges,
        partnersWithBadges,
        averageBadgesPerPartner: partnersWithBadges > 0
          ? (totalBadges / partnersWithBadges).toFixed(2)
          : 0
      }
    });

  } catch (error) {
    console.error('[Admin Analytics] Badge distribution error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch badge distribution',
      details: error.message
    });
  }
}

/**
 * Get PCR score distribution
 * Returns partners grouped by score ranges
 *
 * GET /api/admin/pcr/score-distribution
 */
async function getScoreDistribution(req, res) {
  try {
    console.log('[Admin Analytics] Fetching score distribution...');

    const result = await query(`
      SELECT
        CASE
          WHEN final_pcr_score >= 90 THEN '90-100'
          WHEN final_pcr_score >= 80 THEN '80-89'
          WHEN final_pcr_score >= 70 THEN '70-79'
          WHEN final_pcr_score >= 60 THEN '60-69'
          WHEN final_pcr_score >= 50 THEN '50-59'
          ELSE '0-49'
        END as score_range,
        COUNT(*) as partner_count,
        AVG(final_pcr_score) as avg_score
      FROM strategic_partners
      WHERE is_active = true
        AND final_pcr_score IS NOT NULL
      GROUP BY score_range
      ORDER BY score_range DESC
    `);

    const distribution = result.rows.map(row => ({
      range: row.score_range,
      count: parseInt(row.partner_count),
      averageScore: parseFloat(row.avg_score).toFixed(2)
    }));

    const total = distribution.reduce((sum, r) => sum + r.count, 0);

    // Get overall statistics
    const statsResult = await query(`
      SELECT
        AVG(final_pcr_score) as avg_pcr,
        MIN(final_pcr_score) as min_pcr,
        MAX(final_pcr_score) as max_pcr,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY final_pcr_score) as median_pcr
      FROM strategic_partners
      WHERE is_active = true
        AND final_pcr_score IS NOT NULL
    `);

    const stats = statsResult.rows[0];

    res.json({
      success: true,
      data: {
        distribution,
        total,
        statistics: {
          average: stats.avg_pcr ? parseFloat(stats.avg_pcr).toFixed(2) : null,
          median: stats.median_pcr ? parseFloat(stats.median_pcr).toFixed(2) : null,
          min: stats.min_pcr ? parseFloat(stats.min_pcr).toFixed(2) : null,
          max: stats.max_pcr ? parseFloat(stats.max_pcr).toFixed(2) : null
        }
      }
    });

  } catch (error) {
    console.error('[Admin Analytics] Score distribution error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch score distribution',
      details: error.message
    });
  }
}

/**
 * Get top performing partners
 * Returns partners sorted by final PCR score
 *
 * GET /api/admin/pcr/top-performers?limit=10
 */
async function getTopPerformers(req, res) {
  try {
    const limit = parseInt(req.query.limit) || 10;
    console.log(`[Admin Analytics] Fetching top ${limit} performers...`);

    const result = await query(`
      SELECT
        id,
        company_name,
        final_pcr_score,
        base_pcr_score,
        momentum_modifier,
        performance_trend,
        engagement_tier,
        earned_badges
      FROM strategic_partners
      WHERE is_active = true
        AND final_pcr_score IS NOT NULL
      ORDER BY final_pcr_score DESC
      LIMIT $1
    `, [limit]);

    const performers = result.rows.map(row => ({
      partnerId: row.id,
      companyName: row.company_name,
      finalPCR: parseFloat(row.final_pcr_score),
      basePCR: parseFloat(row.base_pcr_score),
      momentum: parseInt(row.momentum_modifier),
      trend: row.performance_trend,
      tier: row.engagement_tier,
      badgeCount: row.earned_badges ? row.earned_badges.length : 0
    }));

    res.json({
      success: true,
      data: {
        performers,
        count: performers.length
      }
    });

  } catch (error) {
    console.error('[Admin Analytics] Top performers error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch top performers',
      details: error.message
    });
  }
}

/**
 * Get comprehensive PCR analytics dashboard data
 * Returns all analytics in one call for dashboard
 *
 * GET /api/admin/pcr/dashboard
 */
async function getDashboardAnalytics(req, res) {
  try {
    console.log('[Admin Analytics] Fetching dashboard analytics...');

    // Get all analytics in parallel
    const [momentumResult, trendsResult, badgesResult, scoresResult] = await Promise.all([
      query(`
        SELECT momentum_modifier, performance_trend, COUNT(*) as count
        FROM strategic_partners
        WHERE is_active = true
        GROUP BY momentum_modifier, performance_trend
      `),
      query(`
        SELECT performance_trend, COUNT(*) as count, AVG(final_pcr_score) as avg_pcr
        FROM strategic_partners
        WHERE is_active = true
        GROUP BY performance_trend
      `),
      query(`
        SELECT earned_badges FROM strategic_partners
        WHERE is_active = true AND earned_badges IS NOT NULL
      `),
      query(`
        SELECT
          AVG(final_pcr_score) as avg,
          MIN(final_pcr_score) as min,
          MAX(final_pcr_score) as max,
          COUNT(*) as total
        FROM strategic_partners
        WHERE is_active = true AND final_pcr_score IS NOT NULL
      `)
    ]);

    // Process results
    const momentum = { hot_streak: 0, stable: 0, declining: 0 };
    momentumResult.rows.forEach(row => {
      const mod = parseInt(row.momentum_modifier);
      if (mod === 5) momentum.hot_streak += parseInt(row.count);
      else if (mod === -3) momentum.declining += parseInt(row.count);
      else momentum.stable += parseInt(row.count);
    });

    const trends = {};
    trendsResult.rows.forEach(row => {
      trends[row.performance_trend] = parseInt(row.count);
    });

    let totalBadges = 0;
    badgesResult.rows.forEach(row => {
      totalBadges += (row.earned_badges || []).length;
    });

    const scores = scoresResult.rows[0];

    res.json({
      success: true,
      data: {
        momentum,
        trends,
        badges: {
          total: totalBadges,
          average: scores.total > 0 ? (totalBadges / parseInt(scores.total)).toFixed(2) : 0
        },
        scores: {
          average: scores.avg ? parseFloat(scores.avg).toFixed(2) : null,
          min: scores.min ? parseFloat(scores.min).toFixed(2) : null,
          max: scores.max ? parseFloat(scores.max).toFixed(2) : null,
          total: parseInt(scores.total)
        }
      }
    });

  } catch (error) {
    console.error('[Admin Analytics] Dashboard analytics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dashboard analytics',
      details: error.message
    });
  }
}

module.exports = {
  getMomentumDistribution,
  getPerformanceTrends,
  getBadgeDistribution,
  getScoreDistribution,
  getTopPerformers,
  getDashboardAnalytics
};
