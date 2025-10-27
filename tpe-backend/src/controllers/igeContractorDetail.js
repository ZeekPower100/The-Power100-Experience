// ============================================================================
// DATABASE-CHECKED: contractors, ai_trust_indicators, ai_concierge_goals,
//                   contractor_action_items, ai_proactive_messages
// DATE: October 24, 2025
// ============================================================================

const { query } = require('../config/database');

/**
 * Get detailed contractor information with complete IGE history
 * GET /api/ige-monitor/contractor/:id
 */
async function getContractorDetail(req, res) {
  try {
    const { id } = req.params;

    // Get basic contractor info
    const contractorQuery = `
      SELECT
        id,
        first_name,
        last_name,
        email,
        phone,
        company_name,
        revenue_tier,
        created_at,
        last_activity_at,
        focus_areas,
        current_stage,
        team_size
      FROM contractors
      WHERE id = $1
    `;
    const contractorResult = await query(contractorQuery, [id]);

    if (contractorResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Contractor not found'
      });
    }

    const contractor = contractorResult.rows[0];

    // Get trust score history (EXACT FIELDS: indicator_type, indicator_description, confidence_impact)
    const trustScoreQuery = `
      SELECT
        id,
        cumulative_trust_score,
        confidence_impact,
        indicator_description,
        indicator_type,
        recorded_at
      FROM ai_trust_indicators
      WHERE contractor_id = $1
      ORDER BY recorded_at DESC
      LIMIT 50
    `;
    const trustScoreResult = await query(trustScoreQuery, [id]);

    // Get current trust score
    const currentTrustScore = trustScoreResult.rows.length > 0
      ? trustScoreResult.rows[0].cumulative_trust_score
      : 50;

    // Get goals (EXACT FIELDS: goal_description, goal_type, priority_score, target_milestone)
    const goalsQuery = `
      SELECT
        id,
        goal_description,
        goal_type,
        priority_score,
        status,
        target_milestone,
        current_progress,
        created_at,
        updated_at,
        completed_at
      FROM ai_concierge_goals
      WHERE contractor_id = $1
      ORDER BY
        CASE status
          WHEN 'active' THEN 1
          WHEN 'completed' THEN 2
          ELSE 3
        END,
        created_at DESC
    `;
    const goalsResult = await query(goalsQuery, [id]);

    // Get action items (EXACT FIELDS: title, description, action_type)
    const actionsQuery = `
      SELECT
        id,
        title,
        description,
        action_type,
        priority,
        status,
        due_date,
        created_at,
        completed_at,
        ai_generated
      FROM contractor_action_items
      WHERE contractor_id = $1
      ORDER BY
        CASE status
          WHEN 'pending' THEN 1
          WHEN 'in_progress' THEN 2
          WHEN 'completed' THEN 3
          ELSE 4
        END,
        created_at DESC
    `;
    const actionsResult = await query(actionsQuery, [id]);

    // Get messages (EXACT FIELDS: message_content, message_type - NO trigger_reason or delivery_status)
    const messagesQuery = `
      SELECT
        id,
        message_content,
        message_type,
        ai_reasoning,
        sent_at,
        created_at
      FROM ai_proactive_messages
      WHERE contractor_id = $1
      ORDER BY created_at DESC
      LIMIT 50
    `;
    const messagesResult = await query(messagesQuery, [id]);

    // Calculate summary metrics
    const activeGoals = goalsResult.rows.filter(g => g.status === 'active').length;
    const completedGoals = goalsResult.rows.filter(g => g.status === 'completed').length;
    const pendingActions = actionsResult.rows.filter(a => a.status === 'pending').length;
    const completedActions = actionsResult.rows.filter(a => a.status === 'completed').length;
    const messagesSent = messagesResult.rows.filter(m => m.sent_at !== null).length;

    // Build activity timeline (recent 20 activities)
    const timeline = [];

    // Add trust score changes
    trustScoreResult.rows.slice(0, 10).forEach(score => {
      timeline.push({
        type: 'trust_score',
        timestamp: score.recorded_at,
        description: score.indicator_description,
        delta: score.confidence_impact,
        category: score.indicator_type
      });
    });

    // Add goal milestones
    goalsResult.rows.slice(0, 5).forEach(goal => {
      if (goal.completed_at) {
        timeline.push({
          type: 'goal_completed',
          timestamp: goal.completed_at,
          description: `Completed goal: ${goal.goal_description}`,
          category: goal.goal_type
        });
      }
    });

    // Add recent actions
    actionsResult.rows.filter(a => a.completed_at).slice(0, 5).forEach(action => {
      timeline.push({
        type: 'action_completed',
        timestamp: action.completed_at,
        description: `Completed: ${action.title || action.description}`,
        category: action.action_type
      });
    });

    // Add messages
    messagesResult.rows.slice(0, 5).forEach(message => {
      if (message.sent_at) {
        timeline.push({
          type: 'message_sent',
          timestamp: message.sent_at,
          description: message.ai_reasoning || message.message_type,
          message_type: message.message_type
        });
      }
    });

    // Sort timeline by timestamp descending
    timeline.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    res.json({
      success: true,
      contractor: {
        ...contractor,
        trust_score: currentTrustScore,
        metrics: {
          active_goals: activeGoals,
          completed_goals: completedGoals,
          total_goals: goalsResult.rows.length,
          pending_actions: pendingActions,
          completed_actions: completedActions,
          total_actions: actionsResult.rows.length,
          messages_sent: messagesSent,
          total_messages: messagesResult.rows.length
        }
      },
      trust_history: trustScoreResult.rows,
      goals: goalsResult.rows,
      actions: actionsResult.rows,
      messages: messagesResult.rows,
      timeline: timeline.slice(0, 20)
    });

  } catch (error) {
    console.error('Error fetching contractor detail:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch contractor details',
      details: error.message
    });
  }
}

module.exports = {
  getContractorDetail
};
