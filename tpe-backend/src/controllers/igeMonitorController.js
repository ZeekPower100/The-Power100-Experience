// ============================================================================
// DATABASE-CHECKED: Phase 3 - IGE Monitoring Controller
// ============================================================================
// TABLES USED: ai_proactive_messages, ai_question_log, ai_concierge_goals,
//              ai_trust_indicators, contractors
// PURPOSE: Backend API for Internal Goal Engine monitoring dashboard
//
// ENDPOINTS:
// - GET /api/ige-monitor/system-health - Overall system metrics
// - GET /api/ige-monitor/recent-activity - Recent IGE activity
// - GET /api/ige-monitor/system-alerts - Issues requiring attention
// - GET /api/ige-monitor/contractor/:id/summary - Contractor IGE summary
// - GET /api/ige-monitor/contractor/:id/goals - Contractor's goals
// - GET /api/ige-monitor/contractor/:id/messages - Contractor's messages
// - GET /api/ige-monitor/contractor/:id/questions - Contractor's questions
// - GET /api/ige-monitor/contractor/:id/trust-timeline - Contractor's trust history
// - GET /api/ige-monitor/goal/:id - Goal details with related activity
// - GET /api/ige-monitor/message/:id - Message details
// - GET /api/ige-monitor/question/:id - Question details
//
// VERIFIED: October 23, 2025
// ============================================================================

const { query } = require('../config/database');

// ============================================================================
// SYSTEM HEALTH METRICS
// ============================================================================

/**
 * Get overall system health metrics
 * Returns: avg trust score, active goals, response rate, action rate
 */
async function getSystemHealth(req, res) {
  try {
    // Average trust score across all contractors (latest per contractor)
    const trustQuery = await query(`
      SELECT AVG(cumulative_trust_score) as avg_trust_score
      FROM (
        SELECT DISTINCT ON (contractor_id)
          contractor_id,
          cumulative_trust_score
        FROM ai_trust_indicators
        ORDER BY contractor_id, recorded_at DESC
      ) latest_scores
    `);

    // Active goals count
    const goalsQuery = await query(`
      SELECT COUNT(*) as active_goals_count
      FROM ai_concierge_goals
      WHERE status = 'active'
    `);

    // Message response rate
    const responseRateQuery = await query(`
      SELECT
        COUNT(*) as total_sent,
        COUNT(contractor_response) as total_responded,
        ROUND((COUNT(contractor_response)::decimal / NULLIF(COUNT(*), 0)) * 100, 1) as response_rate_pct
      FROM ai_proactive_messages
      WHERE sent_at IS NOT NULL
    `);

    // Action rate (led_to_action)
    const actionRateQuery = await query(`
      SELECT
        COUNT(*) as total_sent,
        COUNT(CASE WHEN led_to_action = true THEN 1 END) as total_actions,
        ROUND((COUNT(CASE WHEN led_to_action = true THEN 1 END)::decimal / NULLIF(COUNT(*), 0)) * 100, 1) as action_rate_pct
      FROM ai_proactive_messages
      WHERE sent_at IS NOT NULL
    `);

    // 7-day trends
    const trustTrendQuery = await query(`
      SELECT AVG(cumulative_trust_score) as avg_trust_score_7d_ago
      FROM (
        SELECT DISTINCT ON (contractor_id)
          contractor_id,
          cumulative_trust_score
        FROM ai_trust_indicators
        WHERE recorded_at < NOW() - INTERVAL '7 days'
        ORDER BY contractor_id, recorded_at DESC
      ) latest_scores_7d
    `);

    const goalsTrendQuery = await query(`
      SELECT COUNT(*) as active_goals_7d_ago
      FROM ai_concierge_goals
      WHERE status = 'active'
        AND created_at < NOW() - INTERVAL '7 days'
    `);

    res.json({
      success: true,
      metrics: {
        trust_score: {
          current: parseFloat(trustQuery.rows[0].avg_trust_score || 0).toFixed(1),
          change_7d: parseFloat(
            (trustQuery.rows[0].avg_trust_score || 0) -
            (trustTrendQuery.rows[0].avg_trust_score_7d_ago || 0)
          ).toFixed(1)
        },
        active_goals: {
          current: parseInt(goalsQuery.rows[0].active_goals_count || 0),
          change_7d: parseInt(goalsQuery.rows[0].active_goals_count || 0) -
                     parseInt(goalsTrendQuery.rows[0].active_goals_7d_ago || 0)
        },
        response_rate: {
          current: parseFloat(responseRateQuery.rows[0].response_rate_pct || 0),
          total_sent: parseInt(responseRateQuery.rows[0].total_sent || 0),
          total_responded: parseInt(responseRateQuery.rows[0].total_responded || 0)
        },
        action_rate: {
          current: parseFloat(actionRateQuery.rows[0].action_rate_pct || 0),
          total_sent: parseInt(actionRateQuery.rows[0].total_sent || 0),
          total_actions: parseInt(actionRateQuery.rows[0].total_actions || 0)
        }
      }
    });
  } catch (error) {
    console.error('Error getting system health:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

// ============================================================================
// RECENT ACTIVITY
// ============================================================================

/**
 * Get recent IGE activity across all contractors
 * Combines goals, messages, questions, and trust events
 */
async function getRecentActivity(req, res) {
  try {
    const limit = parseInt(req.query.limit) || 20;

    // Union query to get recent activity from all tables
    const activityQuery = await query(`
      (
        SELECT
          'goal_created' as activity_type,
          g.created_at as activity_time,
          c.first_name,
          c.last_name,
          g.goal_description as activity_detail,
          g.contractor_id,
          g.id as entity_id
        FROM ai_concierge_goals g
        JOIN contractors c ON c.id = g.contractor_id
        WHERE g.created_at IS NOT NULL
      )
      UNION ALL
      (
        SELECT
          'message_sent' as activity_type,
          m.sent_at as activity_time,
          c.first_name,
          c.last_name,
          CONCAT(m.message_type, ': ', LEFT(m.message_content, 50), '...') as activity_detail,
          m.contractor_id,
          m.id as entity_id
        FROM ai_proactive_messages m
        JOIN contractors c ON c.id = m.contractor_id
        WHERE m.sent_at IS NOT NULL
      )
      UNION ALL
      (
        SELECT
          'question_asked' as activity_type,
          q.asked_at as activity_time,
          c.first_name,
          c.last_name,
          LEFT(q.question_text, 50) as activity_detail,
          q.contractor_id,
          q.id as entity_id
        FROM ai_question_log q
        JOIN contractors c ON c.id = q.contractor_id
        WHERE q.asked_at IS NOT NULL
      )
      UNION ALL
      (
        SELECT
          CASE
            WHEN t.confidence_impact > 0 THEN 'trust_increased'
            ELSE 'trust_decreased'
          END as activity_type,
          t.recorded_at as activity_time,
          c.first_name,
          c.last_name,
          CONCAT(t.indicator_type, ' (',
                 CASE WHEN t.confidence_impact > 0 THEN '+' ELSE '' END,
                 t.confidence_impact, ' points)') as activity_detail,
          t.contractor_id,
          t.id as entity_id
        FROM ai_trust_indicators t
        JOIN contractors c ON c.id = t.contractor_id
        WHERE t.recorded_at IS NOT NULL
      )
      UNION ALL
      (
        SELECT
          'goal_completed' as activity_type,
          g.completed_at as activity_time,
          c.first_name,
          c.last_name,
          g.goal_description as activity_detail,
          g.contractor_id,
          g.id as entity_id
        FROM ai_concierge_goals g
        JOIN contractors c ON c.id = g.contractor_id
        WHERE g.completed_at IS NOT NULL
      )
      ORDER BY activity_time DESC
      LIMIT $1
    `, [limit]);

    res.json({
      success: true,
      activity: activityQuery.rows
    });
  } catch (error) {
    console.error('Error getting recent activity:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

// ============================================================================
// SYSTEM ALERTS
// ============================================================================

/**
 * Get system alerts for issues requiring attention
 */
async function getSystemAlerts(req, res) {
  try {
    // Low trust contractors (< 30)
    const lowTrustQuery = await query(`
      SELECT COUNT(*) as low_trust_count
      FROM (
        SELECT DISTINCT ON (contractor_id)
          contractor_id,
          cumulative_trust_score
        FROM ai_trust_indicators
        ORDER BY contractor_id, recorded_at DESC
      ) latest_scores
      WHERE cumulative_trust_score < 30
    `);

    // Stale goals (>30 days without action)
    const staleGoalsQuery = await query(`
      SELECT COUNT(*) as stale_goals_count
      FROM ai_concierge_goals
      WHERE status = 'active'
        AND (last_action_at < NOW() - INTERVAL '30 days' OR last_action_at IS NULL)
    `);

    // Unanswered questions (>7 days)
    const unansweredQuestionsQuery = await query(`
      SELECT COUNT(*) as unanswered_count
      FROM ai_question_log
      WHERE contractor_answer IS NULL
        AND asked_at < NOW() - INTERVAL '7 days'
    `);

    res.json({
      success: true,
      alerts: {
        low_trust_contractors: parseInt(lowTrustQuery.rows[0].low_trust_count || 0),
        stale_goals: parseInt(staleGoalsQuery.rows[0].stale_goals_count || 0),
        unanswered_questions: parseInt(unansweredQuestionsQuery.rows[0].unanswered_count || 0)
      }
    });
  } catch (error) {
    console.error('Error getting system alerts:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

// ============================================================================
// CONTRACTOR IGE SUMMARY
// ============================================================================

/**
 * Get comprehensive IGE summary for a contractor
 */
async function getContractorIGESummary(req, res) {
  try {
    const contractorId = parseInt(req.params.id);

    // Contractor basic info
    const contractorQuery = await query(`
      SELECT id, first_name, last_name, email
      FROM contractors
      WHERE id = $1
    `, [contractorId]);

    if (contractorQuery.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Contractor not found' });
    }

    // Latest trust score
    const trustQuery = await query(`
      SELECT cumulative_trust_score
      FROM ai_trust_indicators
      WHERE contractor_id = $1
      ORDER BY recorded_at DESC
      LIMIT 1
    `, [contractorId]);

    // Active goals count
    const goalsQuery = await query(`
      SELECT COUNT(*) as active_goals_count
      FROM ai_concierge_goals
      WHERE contractor_id = $1 AND status = 'active'
    `, [contractorId]);

    // Messages sent count
    const messagesQuery = await query(`
      SELECT COUNT(*) as messages_sent_count
      FROM ai_proactive_messages
      WHERE contractor_id = $1 AND sent_at IS NOT NULL
    `, [contractorId]);

    // Last activity timestamp
    const lastActivityQuery = await query(`
      SELECT MAX(activity_time) as last_activity
      FROM (
        SELECT MAX(created_at) as activity_time FROM ai_concierge_goals WHERE contractor_id = $1
        UNION ALL
        SELECT MAX(sent_at) FROM ai_proactive_messages WHERE contractor_id = $1
        UNION ALL
        SELECT MAX(asked_at) FROM ai_question_log WHERE contractor_id = $1
        UNION ALL
        SELECT MAX(recorded_at) FROM ai_trust_indicators WHERE contractor_id = $1
      ) activities
    `, [contractorId]);

    const trustScore = trustQuery.rows.length > 0
      ? parseFloat(trustQuery.rows[0].cumulative_trust_score)
      : 50; // Default neutral score

    res.json({
      success: true,
      contractor: {
        ...contractorQuery.rows[0],
        trust_score: trustScore,
        trust_level: getTrustLevel(trustScore),
        active_goals: parseInt(goalsQuery.rows[0].active_goals_count || 0),
        messages_sent: parseInt(messagesQuery.rows[0].messages_sent_count || 0),
        last_activity: lastActivityQuery.rows[0].last_activity
      }
    });
  } catch (error) {
    console.error('Error getting contractor IGE summary:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

// ============================================================================
// CONTRACTOR GOALS
// ============================================================================

/**
 * Get all goals for a contractor
 */
async function getContractorGoals(req, res) {
  try {
    const contractorId = parseInt(req.params.id);

    const goalsQuery = await query(`
      SELECT
        id,
        goal_type,
        goal_description,
        target_milestone,
        priority_score,
        current_progress,
        next_milestone,
        success_criteria,
        pattern_source,
        pattern_confidence,
        data_gaps,
        status,
        trigger_condition,
        last_action_at,
        created_at,
        updated_at,
        completed_at
      FROM ai_concierge_goals
      WHERE contractor_id = $1
      ORDER BY
        CASE status
          WHEN 'active' THEN 1
          WHEN 'blocked' THEN 2
          WHEN 'completed' THEN 3
          WHEN 'abandoned' THEN 4
        END,
        priority_score DESC NULLS LAST,
        created_at DESC
    `, [contractorId]);

    res.json({
      success: true,
      goals: goalsQuery.rows
    });
  } catch (error) {
    console.error('Error getting contractor goals:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

// ============================================================================
// CONTRACTOR MESSAGES
// ============================================================================

/**
 * Get all proactive messages for a contractor
 */
async function getContractorMessages(req, res) {
  try {
    const contractorId = parseInt(req.params.id);

    const messagesQuery = await query(`
      SELECT
        id,
        message_type,
        message_content,
        ai_reasoning,
        context_data,
        sent_at,
        contractor_response,
        response_received_at,
        conversation_continued,
        outcome_rating,
        led_to_action,
        created_at
      FROM ai_proactive_messages
      WHERE contractor_id = $1
      ORDER BY sent_at DESC NULLS LAST, created_at DESC
    `, [contractorId]);

    res.json({
      success: true,
      messages: messagesQuery.rows
    });
  } catch (error) {
    console.error('Error getting contractor messages:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

// ============================================================================
// CONTRACTOR QUESTIONS
// ============================================================================

/**
 * Get all strategic questions for a contractor
 */
async function getContractorQuestions(req, res) {
  try {
    const contractorId = parseInt(req.params.id);

    const questionsQuery = await query(`
      SELECT
        q.id,
        q.goal_id,
        q.question_text,
        q.question_purpose,
        q.question_type,
        q.asked_at,
        q.contractor_answer,
        q.answer_received_at,
        q.answer_quality_score,
        q.led_to_goal_refinement,
        q.question_naturalness_score,
        g.goal_description
      FROM ai_question_log q
      LEFT JOIN ai_concierge_goals g ON g.id = q.goal_id
      WHERE q.contractor_id = $1
      ORDER BY q.asked_at DESC NULLS LAST, q.created_at DESC
    `, [contractorId]);

    res.json({
      success: true,
      questions: questionsQuery.rows
    });
  } catch (error) {
    console.error('Error getting contractor questions:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

// ============================================================================
// CONTRACTOR TRUST TIMELINE
// ============================================================================

/**
 * Get trust timeline for a contractor
 */
async function getContractorTrustTimeline(req, res) {
  try {
    const contractorId = parseInt(req.params.id);

    const trustQuery = await query(`
      SELECT
        id,
        indicator_type,
        indicator_description,
        context_data,
        confidence_impact,
        cumulative_trust_score,
        recorded_at
      FROM ai_trust_indicators
      WHERE contractor_id = $1
      ORDER BY recorded_at DESC
    `, [contractorId]);

    res.json({
      success: true,
      trust_timeline: trustQuery.rows
    });
  } catch (error) {
    console.error('Error getting contractor trust timeline:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

// ============================================================================
// GOAL DETAIL
// ============================================================================

/**
 * Get detailed goal information with related activity
 */
async function getGoalDetail(req, res) {
  try {
    const goalId = parseInt(req.params.id);

    // Goal details with contractor info
    const goalQuery = await query(`
      SELECT
        g.*,
        c.first_name,
        c.last_name,
        c.email
      FROM ai_concierge_goals g
      JOIN contractors c ON c.id = g.contractor_id
      WHERE g.id = $1
    `, [goalId]);

    if (goalQuery.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Goal not found' });
    }

    const goal = goalQuery.rows[0];

    // Related messages (where context_data contains this goal_id)
    const messagesQuery = await query(`
      SELECT
        id,
        message_type,
        message_content,
        sent_at,
        contractor_response,
        outcome_rating
      FROM ai_proactive_messages
      WHERE contractor_id = $1
        AND (
          context_data->>'goal_id' = $2
          OR message_content ILIKE '%' || $3 || '%'
        )
      ORDER BY sent_at DESC
      LIMIT 10
    `, [goal.contractor_id, goalId.toString(), goal.goal_description.substring(0, 30)]);

    // Related questions
    const questionsQuery = await query(`
      SELECT
        id,
        question_text,
        asked_at,
        contractor_answer,
        answer_quality_score
      FROM ai_question_log
      WHERE goal_id = $1
      ORDER BY asked_at DESC
    `, [goalId]);

    // Related trust events
    const trustQuery = await query(`
      SELECT
        id,
        indicator_type,
        indicator_description,
        confidence_impact,
        recorded_at
      FROM ai_trust_indicators
      WHERE contractor_id = $1
        AND context_data->>'goal_id' = $2
      ORDER BY recorded_at DESC
      LIMIT 10
    `, [goal.contractor_id, goalId.toString()]);

    res.json({
      success: true,
      goal: goal,
      related_activity: {
        messages: messagesQuery.rows,
        questions: questionsQuery.rows,
        trust_events: trustQuery.rows
      }
    });
  } catch (error) {
    console.error('Error getting goal detail:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

// ============================================================================
// MESSAGE DETAIL
// ============================================================================

/**
 * Get detailed message information
 */
async function getMessageDetail(req, res) {
  try {
    const messageId = parseInt(req.params.id);

    const messageQuery = await query(`
      SELECT
        m.*,
        c.first_name,
        c.last_name,
        c.email
      FROM ai_proactive_messages m
      JOIN contractors c ON c.id = m.contractor_id
      WHERE m.id = $1
    `, [messageId]);

    if (messageQuery.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Message not found' });
    }

    res.json({
      success: true,
      message: messageQuery.rows[0]
    });
  } catch (error) {
    console.error('Error getting message detail:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

// ============================================================================
// QUESTION DETAIL
// ============================================================================

/**
 * Get detailed question information
 */
async function getQuestionDetail(req, res) {
  try {
    const questionId = parseInt(req.params.id);

    const questionQuery = await query(`
      SELECT
        q.*,
        c.first_name,
        c.last_name,
        c.email,
        g.goal_description
      FROM ai_question_log q
      JOIN contractors c ON c.id = q.contractor_id
      LEFT JOIN ai_concierge_goals g ON g.id = q.goal_id
      WHERE q.id = $1
    `, [questionId]);

    if (questionQuery.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Question not found' });
    }

    res.json({
      success: true,
      question: questionQuery.rows[0]
    });
  } catch (error) {
    console.error('Error getting question detail:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get trust level label from score
 */
function getTrustLevel(score) {
  if (score <= 20) return 'Very Low';
  if (score <= 40) return 'Low';
  if (score <= 60) return 'Medium';
  if (score <= 80) return 'High';
  return 'Very High';
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  getSystemHealth,
  getRecentActivity,
  getSystemAlerts,
  getContractorIGESummary,
  getContractorGoals,
  getContractorMessages,
  getContractorQuestions,
  getContractorTrustTimeline,
  getGoalDetail,
  getMessageDetail,
  getQuestionDetail
};
