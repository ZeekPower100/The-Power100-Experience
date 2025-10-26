// ============================================================================
// DATABASE-CHECKED: ai_proactive_messages, ai_concierge_goals, contractor_action_items
// DATE: October 24, 2025
// REFERENCE: PHASE-3A-FIELD-REFERENCE.md
// ============================================================================

const { query } = require('../config/database');

/**
 * Send bulk messages to multiple contractors
 * POST /api/ige-monitor/bulk/message
 */
async function bulkMessage(req, res) {
  try {
    const {
      contractor_ids,      // REQUIRED: array of contractor IDs
      message_type,        // REQUIRED
      message_content,     // REQUIRED
      send_immediately,
      context_data
    } = req.body;

    // Validate required fields
    if (!contractor_ids || !Array.isArray(contractor_ids) || contractor_ids.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'contractor_ids must be a non-empty array'
      });
    }

    if (!message_type || !message_content) {
      return res.status(400).json({
        success: false,
        error: 'message_type and message_content are required'
      });
    }

    // Verify all contractors exist
    const contractorCheck = await query(
      `SELECT id FROM contractors WHERE id = ANY($1::int[])`,
      [contractor_ids]
    );

    if (contractorCheck.rows.length !== contractor_ids.length) {
      return res.status(400).json({
        success: false,
        error: `Some contractor IDs are invalid. Found ${contractorCheck.rows.length} of ${contractor_ids.length} contractors.`
      });
    }

    // Build bulk insert query
    const sent_at = send_immediately ? new Date() : null;
    const results = [];

    for (const contractor_id of contractor_ids) {
      const insertQuery = `
        INSERT INTO ai_proactive_messages (
          contractor_id,
          message_type,
          message_content,
          ai_reasoning,
          context_data,
          sent_at
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, contractor_id
      `;

      const values = [
        contractor_id,
        message_type,
        message_content,
        'Bulk message - Manually created by admin',
        context_data ? JSON.stringify(context_data) : null,
        sent_at
      ];

      const result = await query(insertQuery, values);
      results.push(result.rows[0]);
    }

    res.json({
      success: true,
      messagesCreated: results.length,
      messages: results,
      sent: send_immediately,
      info: send_immediately
        ? `${results.length} messages sent immediately`
        : `${results.length} messages queued for delivery`
    });

  } catch (error) {
    console.error('Error sending bulk messages:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send bulk messages',
      details: error.message
    });
  }
}

/**
 * Create bulk goals for multiple contractors
 * POST /api/ige-monitor/bulk/goal
 */
async function bulkGoal(req, res) {
  try {
    const {
      contractor_ids,      // REQUIRED: array of contractor IDs
      goal_type,           // REQUIRED
      goal_description,    // REQUIRED
      target_milestone,
      priority_score,
      status
    } = req.body;

    // Validate required fields
    if (!contractor_ids || !Array.isArray(contractor_ids) || contractor_ids.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'contractor_ids must be a non-empty array'
      });
    }

    if (!goal_type || !goal_description) {
      return res.status(400).json({
        success: false,
        error: 'goal_type and goal_description are required'
      });
    }

    // Verify all contractors exist
    const contractorCheck = await query(
      `SELECT id FROM contractors WHERE id = ANY($1::int[])`,
      [contractor_ids]
    );

    if (contractorCheck.rows.length !== contractor_ids.length) {
      return res.status(400).json({
        success: false,
        error: `Some contractor IDs are invalid. Found ${contractorCheck.rows.length} of ${contractor_ids.length} contractors.`
      });
    }

    // Build bulk insert query
    const results = [];

    for (const contractor_id of contractor_ids) {
      const insertQuery = `
        INSERT INTO ai_concierge_goals (
          contractor_id,
          goal_type,
          goal_description,
          target_milestone,
          priority_score,
          status,
          pattern_source
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id, contractor_id, goal_description
      `;

      const values = [
        contractor_id,
        goal_type,
        goal_description,
        target_milestone || null,
        priority_score !== undefined ? priority_score : 5,
        status || 'active',
        'bulk_manual_admin_creation'
      ];

      const result = await query(insertQuery, values);
      results.push(result.rows[0]);
    }

    res.json({
      success: true,
      goalsCreated: results.length,
      goals: results,
      message: `${results.length} goals created successfully`
    });

  } catch (error) {
    console.error('Error creating bulk goals:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create bulk goals',
      details: error.message
    });
  }
}

/**
 * Create bulk action items for multiple contractors
 * POST /api/ige-monitor/bulk/action
 */
async function bulkAction(req, res) {
  try {
    const {
      contractor_ids,      // REQUIRED: array of contractor IDs
      title,               // REQUIRED
      action_type,         // REQUIRED
      priority,
      description,
      due_date,
      status
    } = req.body;

    // Validate required fields
    if (!contractor_ids || !Array.isArray(contractor_ids) || contractor_ids.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'contractor_ids must be a non-empty array'
      });
    }

    if (!title || !action_type) {
      return res.status(400).json({
        success: false,
        error: 'title and action_type are required'
      });
    }

    // Verify all contractors exist
    const contractorCheck = await query(
      `SELECT id FROM contractors WHERE id = ANY($1::int[])`,
      [contractor_ids]
    );

    if (contractorCheck.rows.length !== contractor_ids.length) {
      return res.status(400).json({
        success: false,
        error: `Some contractor IDs are invalid. Found ${contractorCheck.rows.length} of ${contractor_ids.length} contractors.`
      });
    }

    // Build bulk insert query
    const results = [];

    for (const contractor_id of contractor_ids) {
      const insertQuery = `
        INSERT INTO contractor_action_items (
          contractor_id,
          title,
          description,
          action_type,
          priority,
          due_date,
          status,
          ai_generated,
          ai_reasoning
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id, contractor_id, title
      `;

      const values = [
        contractor_id,
        title,
        description || null,
        action_type,
        priority !== undefined ? priority : 5,
        due_date || null,
        status || 'pending',
        false,
        'Bulk action - Manually created by admin'
      ];

      const result = await query(insertQuery, values);
      results.push(result.rows[0]);
    }

    res.json({
      success: true,
      actionsCreated: results.length,
      actions: results,
      message: `${results.length} action items created successfully`
    });

  } catch (error) {
    console.error('Error creating bulk actions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create bulk actions',
      details: error.message
    });
  }
}

module.exports = {
  bulkMessage,
  bulkGoal,
  bulkAction
};
