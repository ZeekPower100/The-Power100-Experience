// ============================================================================
// DATABASE-CHECKED: ai_concierge_goals, contractor_action_items, ai_proactive_messages, ai_trust_indicators, contractors
// DATE: October 24, 2025
// REFERENCE: PHASE-3B-FIELD-REFERENCE.md
// ============================================================================

const { query } = require('../config/database');

/**
 * Get system-wide overview analytics
 * GET /api/ige-monitor/analytics/overview
 */
async function getOverview(req, res) {
  try {
    // Goals Summary
    const goalsQuery = `
      SELECT
        COUNT(*) as total_goals,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_goals,
        COUNT(CASE WHEN completed_at IS NOT NULL THEN 1 END) as completed_goals,
        ROUND(COUNT(CASE WHEN completed_at IS NOT NULL THEN 1 END)::numeric / NULLIF(COUNT(*), 0) * 100, 2) as completion_rate
      FROM ai_concierge_goals
    `;

    // Actions Summary
    const actionsQuery = `
      SELECT
        COUNT(*) as total_actions,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_actions,
        COUNT(CASE WHEN completed_at IS NOT NULL THEN 1 END) as completed_actions,
        COUNT(CASE WHEN due_date < NOW() AND status = 'pending' THEN 1 END) as overdue_actions,
        ROUND(COUNT(CASE WHEN completed_at IS NOT NULL THEN 1 END)::numeric / NULLIF(COUNT(*), 0) * 100, 2) as completion_rate
      FROM contractor_action_items
    `;

    // Messages Summary
    const messagesQuery = `
      SELECT
        COUNT(*) as total_messages,
        COUNT(CASE WHEN sent_at IS NOT NULL THEN 1 END) as sent_messages,
        COUNT(CASE WHEN contractor_response IS NOT NULL THEN 1 END) as responded_messages,
        ROUND(COUNT(CASE WHEN contractor_response IS NOT NULL THEN 1 END)::numeric / NULLIF(COUNT(CASE WHEN sent_at IS NOT NULL THEN 1 END), 0) * 100, 2) as response_rate,
        ROUND(AVG(outcome_rating), 2) as avg_outcome_rating
      FROM ai_proactive_messages
    `;

    // Trust Score Summary (Latest per contractor)
    const trustQuery = `
      WITH latest_trust AS (
        SELECT DISTINCT ON (contractor_id)
          contractor_id,
          cumulative_trust_score
        FROM ai_trust_indicators
        ORDER BY contractor_id, recorded_at DESC
      )
      SELECT
        ROUND(AVG(cumulative_trust_score), 2) as avg_trust_score,
        ROUND(MIN(cumulative_trust_score), 2) as min_trust_score,
        ROUND(MAX(cumulative_trust_score), 2) as max_trust_score,
        COUNT(CASE WHEN cumulative_trust_score >= 70 THEN 1 END) as high_trust_count,
        COUNT(CASE WHEN cumulative_trust_score >= 40 AND cumulative_trust_score < 70 THEN 1 END) as medium_trust_count,
        COUNT(CASE WHEN cumulative_trust_score < 40 THEN 1 END) as low_trust_count
      FROM latest_trust
    `;

    // Contractors Summary
    const contractorsQuery = `
      SELECT
        COUNT(*) as total_contractors,
        COUNT(CASE WHEN last_activity_at > NOW() - INTERVAL '30 days' THEN 1 END) as active_contractors,
        COUNT(CASE WHEN created_at > NOW() - INTERVAL '30 days' THEN 1 END) as new_contractors_30d
      FROM contractors
    `;

    const [goalsResult, actionsResult, messagesResult, trustResult, contractorsResult] = await Promise.all([
      query(goalsQuery),
      query(actionsQuery),
      query(messagesQuery),
      query(trustQuery),
      query(contractorsQuery)
    ]);

    res.json({
      success: true,
      overview: {
        goals: goalsResult.rows[0],
        actions: actionsResult.rows[0],
        messages: messagesResult.rows[0],
        trust: trustResult.rows[0],
        contractors: contractorsResult.rows[0]
      }
    });

  } catch (error) {
    console.error('Error fetching overview analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch overview analytics',
      details: error.message
    });
  }
}

/**
 * Get goals analytics summary
 * GET /api/ige-monitor/analytics/goals/summary
 */
async function getGoalsSummary(req, res) {
  try {
    // Overall goals stats
    const overallQuery = `
      SELECT
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active,
        COUNT(CASE WHEN completed_at IS NOT NULL THEN 1 END) as completed,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled,
        ROUND(AVG(priority_score), 2) as avg_priority,
        ROUND(AVG(EXTRACT(EPOCH FROM (completed_at - created_at)) / 86400), 2) as avg_days_to_complete
      FROM ai_concierge_goals
      WHERE completed_at IS NOT NULL
    `;

    // Goals by type
    const byTypeQuery = `
      SELECT
        goal_type,
        COUNT(*) as total,
        COUNT(CASE WHEN completed_at IS NOT NULL THEN 1 END) as completed,
        ROUND(COUNT(CASE WHEN completed_at IS NOT NULL THEN 1 END)::numeric / NULLIF(COUNT(*), 0) * 100, 2) as completion_rate
      FROM ai_concierge_goals
      GROUP BY goal_type
      ORDER BY total DESC
    `;

    // Goals by source
    const bySourceQuery = `
      SELECT
        COALESCE(pattern_source, 'unknown') as source,
        COUNT(*) as total,
        COUNT(CASE WHEN completed_at IS NOT NULL THEN 1 END) as completed
      FROM ai_concierge_goals
      GROUP BY pattern_source
      ORDER BY total DESC
    `;

    const [overallResult, byTypeResult, bySourceResult] = await Promise.all([
      query(overallQuery),
      query(byTypeQuery),
      query(bySourceQuery)
    ]);

    res.json({
      success: true,
      summary: overallResult.rows[0],
      by_type: byTypeResult.rows,
      by_source: bySourceResult.rows
    });

  } catch (error) {
    console.error('Error fetching goals summary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch goals summary',
      details: error.message
    });
  }
}

/**
 * Get actions analytics summary
 * GET /api/ige-monitor/analytics/actions/summary
 */
async function getActionsSummary(req, res) {
  try {
    // Overall actions stats
    const overallQuery = `
      SELECT
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
        COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress,
        COUNT(CASE WHEN completed_at IS NOT NULL THEN 1 END) as completed,
        COUNT(CASE WHEN due_date < NOW() AND status = 'pending' THEN 1 END) as overdue,
        COUNT(CASE WHEN ai_generated = true THEN 1 END) as ai_generated,
        COUNT(CASE WHEN ai_generated = false THEN 1 END) as manual,
        ROUND(AVG(priority), 2) as avg_priority,
        ROUND(AVG(EXTRACT(EPOCH FROM (completed_at - created_at)) / 86400), 2) as avg_days_to_complete
      FROM contractor_action_items
      WHERE completed_at IS NOT NULL
    `;

    // Actions by type
    const byTypeQuery = `
      SELECT
        action_type,
        COUNT(*) as total,
        COUNT(CASE WHEN completed_at IS NOT NULL THEN 1 END) as completed,
        ROUND(COUNT(CASE WHEN completed_at IS NOT NULL THEN 1 END)::numeric / NULLIF(COUNT(*), 0) * 100, 2) as completion_rate,
        ROUND(AVG(EXTRACT(EPOCH FROM (completed_at - created_at)) / 86400), 2) as avg_days_to_complete
      FROM contractor_action_items
      WHERE completed_at IS NOT NULL
      GROUP BY action_type
      ORDER BY total DESC
    `;

    const [overallResult, byTypeResult] = await Promise.all([
      query(overallQuery),
      query(byTypeQuery)
    ]);

    res.json({
      success: true,
      summary: overallResult.rows[0],
      by_type: byTypeResult.rows
    });

  } catch (error) {
    console.error('Error fetching actions summary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch actions summary',
      details: error.message
    });
  }
}

/**
 * Get messages analytics summary
 * GET /api/ige-monitor/analytics/messages/summary
 */
async function getMessagesSummary(req, res) {
  try {
    // Overall messages stats
    const overallQuery = `
      SELECT
        COUNT(*) as total,
        COUNT(CASE WHEN sent_at IS NOT NULL THEN 1 END) as sent,
        COUNT(CASE WHEN contractor_response IS NOT NULL THEN 1 END) as responded,
        ROUND(COUNT(CASE WHEN contractor_response IS NOT NULL THEN 1 END)::numeric / NULLIF(COUNT(CASE WHEN sent_at IS NOT NULL THEN 1 END), 0) * 100, 2) as response_rate,
        COUNT(CASE WHEN conversation_continued = true THEN 1 END) as conversations_continued,
        COUNT(CASE WHEN led_to_action = true THEN 1 END) as led_to_actions,
        ROUND(AVG(outcome_rating), 2) as avg_outcome_rating,
        ROUND(AVG(EXTRACT(EPOCH FROM (response_received_at - sent_at)) / 3600), 2) as avg_hours_to_response
      FROM ai_proactive_messages
      WHERE response_received_at IS NOT NULL
    `;

    // Messages by type
    const byTypeQuery = `
      SELECT
        message_type,
        COUNT(*) as total_sent,
        COUNT(CASE WHEN contractor_response IS NOT NULL THEN 1 END) as responses,
        ROUND(COUNT(CASE WHEN contractor_response IS NOT NULL THEN 1 END)::numeric / NULLIF(COUNT(*), 0) * 100, 2) as response_rate,
        COUNT(CASE WHEN led_to_action = true THEN 1 END) as led_to_actions,
        ROUND(AVG(outcome_rating), 2) as avg_outcome_rating
      FROM ai_proactive_messages
      WHERE sent_at IS NOT NULL
      GROUP BY message_type
      ORDER BY response_rate DESC
    `;

    const [overallResult, byTypeResult] = await Promise.all([
      query(overallQuery),
      query(byTypeQuery)
    ]);

    res.json({
      success: true,
      summary: overallResult.rows[0],
      by_type: byTypeResult.rows
    });

  } catch (error) {
    console.error('Error fetching messages summary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch messages summary',
      details: error.message
    });
  }
}

/**
 * Get trust analytics summary
 * GET /api/ige-monitor/analytics/trust/summary
 */
async function getTrustSummary(req, res) {
  try {
    // Current trust scores (latest per contractor)
    const currentQuery = `
      WITH latest_trust AS (
        SELECT DISTINCT ON (contractor_id)
          contractor_id,
          cumulative_trust_score
        FROM ai_trust_indicators
        ORDER BY contractor_id, recorded_at DESC
      )
      SELECT
        COUNT(*) as total_contractors,
        ROUND(AVG(cumulative_trust_score), 2) as avg_score,
        ROUND(MIN(cumulative_trust_score), 2) as min_score,
        ROUND(MAX(cumulative_trust_score), 2) as max_score,
        COUNT(CASE WHEN cumulative_trust_score >= 70 THEN 1 END) as high_trust,
        COUNT(CASE WHEN cumulative_trust_score >= 40 AND cumulative_trust_score < 70 THEN 1 END) as medium_trust,
        COUNT(CASE WHEN cumulative_trust_score < 40 THEN 1 END) as low_trust
      FROM latest_trust
    `;

    // Trust indicators by type
    const byTypeQuery = `
      SELECT
        indicator_type,
        COUNT(*) as occurrences,
        ROUND(AVG(confidence_impact), 2) as avg_impact,
        SUM(CASE WHEN confidence_impact > 0 THEN 1 ELSE 0 END) as positive_count,
        SUM(CASE WHEN confidence_impact < 0 THEN 1 ELSE 0 END) as negative_count
      FROM ai_trust_indicators
      GROUP BY indicator_type
      ORDER BY occurrences DESC
    `;

    const [currentResult, byTypeResult] = await Promise.all([
      query(currentQuery),
      query(byTypeQuery)
    ]);

    res.json({
      success: true,
      summary: currentResult.rows[0],
      by_indicator_type: byTypeResult.rows
    });

  } catch (error) {
    console.error('Error fetching trust summary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch trust summary',
      details: error.message
    });
  }
}

/**
 * Get time-series trends
 * GET /api/ige-monitor/analytics/trends/:metric?period=7d
 *
 * Supported metrics: goals, actions, messages, trust
 * Supported periods: 7d, 30d, 90d
 */
async function getTrends(req, res) {
  try {
    const { metric } = req.params;
    const { period = '30d' } = req.query;

    // Parse period
    const days = parseInt(period.replace('d', ''));
    if (isNaN(days) || days < 1 || days > 365) {
      return res.status(400).json({
        success: false,
        error: 'Invalid period. Use format: 7d, 30d, 90d (max 365d)'
      });
    }

    let trendsQuery;

    switch(metric) {
      case 'goals':
        trendsQuery = `
          SELECT
            DATE_TRUNC('day', created_at) as date,
            COUNT(*) as created,
            COUNT(CASE WHEN completed_at IS NOT NULL THEN 1 END) as completed
          FROM ai_concierge_goals
          WHERE created_at > NOW() - INTERVAL '${days} days'
          GROUP BY DATE_TRUNC('day', created_at)
          ORDER BY date ASC
        `;
        break;

      case 'actions':
        trendsQuery = `
          SELECT
            DATE_TRUNC('day', created_at) as date,
            COUNT(*) as created,
            COUNT(CASE WHEN completed_at IS NOT NULL THEN 1 END) as completed
          FROM contractor_action_items
          WHERE created_at > NOW() - INTERVAL '${days} days'
          GROUP BY DATE_TRUNC('day', created_at)
          ORDER BY date ASC
        `;
        break;

      case 'messages':
        trendsQuery = `
          SELECT
            DATE_TRUNC('day', sent_at) as date,
            COUNT(*) as sent,
            COUNT(CASE WHEN contractor_response IS NOT NULL THEN 1 END) as responded
          FROM ai_proactive_messages
          WHERE sent_at > NOW() - INTERVAL '${days} days'
          GROUP BY DATE_TRUNC('day', sent_at)
          ORDER BY date ASC
        `;
        break;

      case 'trust':
        trendsQuery = `
          WITH daily_scores AS (
            SELECT DISTINCT ON (DATE_TRUNC('day', recorded_at), contractor_id)
              DATE_TRUNC('day', recorded_at) as date,
              contractor_id,
              cumulative_trust_score
            FROM ai_trust_indicators
            WHERE recorded_at > NOW() - INTERVAL '${days} days'
            ORDER BY DATE_TRUNC('day', recorded_at), contractor_id, recorded_at DESC
          )
          SELECT
            date,
            ROUND(AVG(cumulative_trust_score), 2) as avg_trust_score,
            COUNT(DISTINCT contractor_id) as contractors_tracked
          FROM daily_scores
          GROUP BY date
          ORDER BY date ASC
        `;
        break;

      default:
        return res.status(400).json({
          success: false,
          error: 'Invalid metric. Supported: goals, actions, messages, trust'
        });
    }

    const result = await query(trendsQuery);

    res.json({
      success: true,
      metric: metric,
      period: period,
      trends: result.rows
    });

  } catch (error) {
    console.error('Error fetching trends:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch trends',
      details: error.message
    });
  }
}

/**
 * Get contractor segmentation by trust
 * GET /api/ige-monitor/analytics/segments/by-trust
 */
async function getSegmentsByTrust(req, res) {
  try {
    const segmentsQuery = `
      WITH latest_trust AS (
        SELECT DISTINCT ON (contractor_id)
          contractor_id,
          cumulative_trust_score
        FROM ai_trust_indicators
        ORDER BY contractor_id, recorded_at DESC
      ),
      segments AS (
        SELECT
          c.id,
          c.first_name,
          c.last_name,
          c.revenue_tier,
          lt.cumulative_trust_score,
          CASE
            WHEN lt.cumulative_trust_score >= 70 THEN 'high'
            WHEN lt.cumulative_trust_score >= 40 THEN 'medium'
            ELSE 'low'
          END as trust_segment
        FROM contractors c
        LEFT JOIN latest_trust lt ON c.id = lt.contractor_id
      )
      SELECT
        trust_segment,
        COUNT(*) as contractor_count,
        ROUND(AVG(cumulative_trust_score), 2) as avg_trust_score
      FROM segments
      WHERE cumulative_trust_score IS NOT NULL
      GROUP BY trust_segment
      ORDER BY
        CASE trust_segment
          WHEN 'high' THEN 1
          WHEN 'medium' THEN 2
          WHEN 'low' THEN 3
        END
    `;

    const result = await query(segmentsQuery);

    res.json({
      success: true,
      segments: result.rows
    });

  } catch (error) {
    console.error('Error fetching trust segments:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch trust segments',
      details: error.message
    });
  }
}

/**
 * Get contractor segmentation by engagement
 * GET /api/ige-monitor/analytics/segments/by-engagement
 */
async function getSegmentsByEngagement(req, res) {
  try {
    const segmentsQuery = `
      WITH segments AS (
        SELECT
          CASE
            WHEN last_activity_at > NOW() - INTERVAL '7 days' THEN 'highly_active'
            WHEN last_activity_at > NOW() - INTERVAL '30 days' THEN 'active'
            WHEN last_activity_at > NOW() - INTERVAL '90 days' THEN 'less_active'
            ELSE 'inactive'
          END as engagement_segment
        FROM contractors
        WHERE last_activity_at IS NOT NULL
      )
      SELECT
        engagement_segment,
        COUNT(*) as contractor_count
      FROM segments
      GROUP BY engagement_segment
      ORDER BY
        CASE engagement_segment
          WHEN 'highly_active' THEN 1
          WHEN 'active' THEN 2
          WHEN 'less_active' THEN 3
          WHEN 'inactive' THEN 4
        END
    `;

    const result = await query(segmentsQuery);

    res.json({
      success: true,
      segments: result.rows
    });

  } catch (error) {
    console.error('Error fetching engagement segments:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch engagement segments',
      details: error.message
    });
  }
}

module.exports = {
  getOverview,
  getGoalsSummary,
  getActionsSummary,
  getMessagesSummary,
  getTrustSummary,
  getTrends,
  getSegmentsByTrust,
  getSegmentsByEngagement
};
