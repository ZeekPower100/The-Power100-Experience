// ============================================================================
// DATABASE-CHECKED: ai_proactive_messages
// DATE: October 24, 2025
// REFERENCE: PHASE-3A-FIELD-REFERENCE.md
// ============================================================================

const { query } = require('../config/database');

/**
 * Send a manual message to a contractor
 * POST /api/ige-monitor/contractor/:id/message
 */
async function sendMessage(req, res) {
  try {
    const { id: contractor_id } = req.params;
    const {
      message_type,        // REQUIRED
      message_content,     // REQUIRED
      send_immediately,    // Optional: if true, set sent_at to now()
      context_data
    } = req.body;

    // Validate required fields
    if (!message_type || !message_content) {
      return res.status(400).json({
        success: false,
        error: 'message_type and message_content are required'
      });
    }

    // Verify contractor exists
    const contractorCheck = await query(
      'SELECT id, first_name, last_name, email FROM contractors WHERE id = $1',
      [contractor_id]
    );

    if (contractorCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Contractor not found'
      });
    }

    // Insert new message with EXACT field names from database
    const insertQuery = `
      INSERT INTO ai_proactive_messages (
        contractor_id,
        message_type,
        message_content,
        ai_reasoning,
        context_data,
        sent_at
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

    const values = [
      contractor_id,
      message_type,
      message_content,
      'Manually created by admin',  // ai_reasoning is REQUIRED - use this for manual messages
      context_data ? JSON.stringify(context_data) : null,
      send_immediately ? new Date() : null  // If send_immediately, set sent_at to now
    ];

    const result = await query(insertQuery, values);

    res.json({
      success: true,
      message: result.rows[0],
      sent: send_immediately,
      info: send_immediately
        ? 'Message sent immediately'
        : 'Message queued for delivery'
    });

  } catch (error) {
    console.error('Error sending manual message:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send message',
      details: error.message
    });
  }
}

/**
 * Update a message (e.g., mark as sent, record response)
 * PUT /api/ige-monitor/message/:id
 */
async function updateMessage(req, res) {
  try {
    const { id } = req.params;
    const {
      sent_at,
      contractor_response,
      response_received_at,
      conversation_continued,
      outcome_rating,
      led_to_action
    } = req.body;

    // Build dynamic UPDATE query
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (sent_at !== undefined) {
      updates.push(`sent_at = $${paramCount++}`);
      values.push(sent_at);
    }
    if (contractor_response !== undefined) {
      updates.push(`contractor_response = $${paramCount++}`);
      values.push(contractor_response);
    }
    if (response_received_at !== undefined) {
      updates.push(`response_received_at = $${paramCount++}`);
      values.push(response_received_at);
    }
    if (conversation_continued !== undefined) {
      updates.push(`conversation_continued = $${paramCount++}`);
      values.push(conversation_continued);
    }
    if (outcome_rating !== undefined) {
      updates.push(`outcome_rating = $${paramCount++}`);
      values.push(outcome_rating);
    }
    if (led_to_action !== undefined) {
      updates.push(`led_to_action = $${paramCount++}`);
      values.push(led_to_action);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No fields to update'
      });
    }

    // Always update updated_at
    updates.push(`updated_at = NOW()`);

    values.push(id);
    const updateQuery = `
      UPDATE ai_proactive_messages
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await query(updateQuery, values);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Message not found'
      });
    }

    res.json({
      success: true,
      message: result.rows[0],
      info: 'Message updated successfully'
    });

  } catch (error) {
    console.error('Error updating message:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update message',
      details: error.message
    });
  }
}

/**
 * Delete a message
 * DELETE /api/ige-monitor/message/:id
 */
async function deleteMessage(req, res) {
  try {
    const { id } = req.params;

    const result = await query(
      'DELETE FROM ai_proactive_messages WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Message not found'
      });
    }

    res.json({
      success: true,
      info: 'Message deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting message:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete message',
      details: error.message
    });
  }
}

module.exports = {
  sendMessage,
  updateMessage,
  deleteMessage
};
