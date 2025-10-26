// ============================================================================
// DATABASE-CHECKED: contractor_action_items
// DATE: October 24, 2025
// REFERENCE: PHASE-3A-FIELD-REFERENCE.md
// ============================================================================

const { query } = require('../config/database');

/**
 * Create a manual action item for a contractor
 * POST /api/ige-monitor/contractor/:id/action
 */
async function createAction(req, res) {
  try {
    const { id: contractor_id } = req.params;
    const {
      title,              // REQUIRED
      action_type,        // REQUIRED
      priority,
      description,
      due_date,
      reminder_time,
      status,
      event_id,
      contractor_priority,
      ai_suggested_priority,
      related_partner_id,
      related_peer_contractor_id,
      related_speaker_id,
      related_sponsor_id,
      related_note_id,
      related_demo_booking_id,
      conversation_context
    } = req.body;

    // Validate required fields
    if (!title || !action_type) {
      return res.status(400).json({
        success: false,
        error: 'title and action_type are required'
      });
    }

    // Verify contractor exists
    const contractorCheck = await query(
      'SELECT id FROM contractors WHERE id = $1',
      [contractor_id]
    );

    if (contractorCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Contractor not found'
      });
    }

    // Insert new action with EXACT field names from database
    const insertQuery = `
      INSERT INTO contractor_action_items (
        contractor_id,
        title,
        description,
        action_type,
        priority,
        contractor_priority,
        ai_suggested_priority,
        due_date,
        reminder_time,
        status,
        event_id,
        related_partner_id,
        related_peer_contractor_id,
        related_speaker_id,
        related_sponsor_id,
        related_note_id,
        related_demo_booking_id,
        ai_generated,
        ai_reasoning,
        conversation_context
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
      RETURNING *
    `;

    const values = [
      contractor_id,
      title,
      description || null,
      action_type,
      priority !== undefined ? priority : 5,  // Default: 5
      contractor_priority || null,
      ai_suggested_priority || null,
      due_date || null,
      reminder_time || null,
      status || 'pending',  // Default: 'pending'
      event_id || null,
      related_partner_id || null,
      related_peer_contractor_id || null,
      related_speaker_id || null,
      related_sponsor_id || null,
      related_note_id || null,
      related_demo_booking_id || null,
      false,  // ai_generated = false for manual creation
      'Manually created by admin',  // ai_reasoning
      conversation_context ? JSON.stringify(conversation_context) : '{}'
    ];

    const result = await query(insertQuery, values);

    res.json({
      success: true,
      action: result.rows[0],
      message: 'Action item created successfully'
    });

  } catch (error) {
    console.error('Error creating manual action:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create action item',
      details: error.message
    });
  }
}

/**
 * Update an action item
 * PUT /api/ige-monitor/action/:id
 */
async function updateAction(req, res) {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      action_type,
      priority,
      contractor_priority,
      due_date,
      reminder_time,
      status,
      completed_at,
      cancelled_reason
    } = req.body;

    // Build dynamic UPDATE query
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (title !== undefined) {
      updates.push(`title = $${paramCount++}`);
      values.push(title);
    }
    if (description !== undefined) {
      updates.push(`description = $${paramCount++}`);
      values.push(description);
    }
    if (action_type !== undefined) {
      updates.push(`action_type = $${paramCount++}`);
      values.push(action_type);
    }
    if (priority !== undefined) {
      updates.push(`priority = $${paramCount++}`);
      values.push(priority);
    }
    if (contractor_priority !== undefined) {
      updates.push(`contractor_priority = $${paramCount++}`);
      values.push(contractor_priority);
    }
    if (due_date !== undefined) {
      updates.push(`due_date = $${paramCount++}`);
      values.push(due_date);
    }
    if (reminder_time !== undefined) {
      updates.push(`reminder_time = $${paramCount++}`);
      values.push(reminder_time);
    }
    if (status !== undefined) {
      updates.push(`status = $${paramCount++}`);
      values.push(status);
    }
    if (completed_at !== undefined) {
      updates.push(`completed_at = $${paramCount++}`);
      values.push(completed_at);
    }
    if (cancelled_reason !== undefined) {
      updates.push(`cancelled_reason = $${paramCount++}`);
      values.push(cancelled_reason);
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
      UPDATE contractor_action_items
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await query(updateQuery, values);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Action item not found'
      });
    }

    res.json({
      success: true,
      action: result.rows[0],
      message: 'Action item updated successfully'
    });

  } catch (error) {
    console.error('Error updating action:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update action item',
      details: error.message
    });
  }
}

/**
 * Delete an action item
 * DELETE /api/ige-monitor/action/:id
 */
async function deleteAction(req, res) {
  try {
    const { id } = req.params;

    const result = await query(
      'DELETE FROM contractor_action_items WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Action item not found'
      });
    }

    res.json({
      success: true,
      message: 'Action item deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting action:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete action item',
      details: error.message
    });
  }
}

module.exports = {
  createAction,
  updateAction,
  deleteAction
};
