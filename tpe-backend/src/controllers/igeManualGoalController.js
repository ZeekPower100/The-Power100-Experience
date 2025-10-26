// ============================================================================
// DATABASE-CHECKED: ai_concierge_goals
// DATE: October 24, 2025
// REFERENCE: PHASE-3A-FIELD-REFERENCE.md
// ============================================================================

const { query } = require('../config/database');

/**
 * Create a manual goal for a contractor
 * POST /api/ige-monitor/contractor/:id/goal
 */
async function createGoal(req, res) {
  try {
    const { id: contractor_id } = req.params;
    const {
      goal_type,              // REQUIRED
      goal_description,       // REQUIRED
      target_milestone,
      priority_score,
      current_progress,
      next_milestone,
      success_criteria,
      pattern_source,
      pattern_confidence,
      data_gaps,
      status,
      trigger_condition
    } = req.body;

    // Validate required fields
    if (!goal_type || !goal_description) {
      return res.status(400).json({
        success: false,
        error: 'goal_type and goal_description are required'
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

    // Insert new goal with EXACT field names from database
    const insertQuery = `
      INSERT INTO ai_concierge_goals (
        contractor_id,
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
        trigger_condition
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `;

    const values = [
      contractor_id,
      goal_type,
      goal_description,
      target_milestone || null,
      priority_score !== undefined ? priority_score : 5,  // Default: 5
      current_progress !== undefined ? current_progress : 0,  // Default: 0
      next_milestone || null,
      success_criteria ? JSON.stringify(success_criteria) : null,
      pattern_source || 'manual_admin_creation',
      pattern_confidence || null,
      data_gaps ? JSON.stringify(data_gaps) : null,
      status || 'active',  // Default: 'active'
      trigger_condition || null
    ];

    const result = await query(insertQuery, values);

    res.json({
      success: true,
      goal: result.rows[0],
      message: 'Goal created successfully'
    });

  } catch (error) {
    console.error('Error creating manual goal:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create goal',
      details: error.message
    });
  }
}

/**
 * Update a goal
 * PUT /api/ige-monitor/goal/:id
 */
async function updateGoal(req, res) {
  try {
    const { id } = req.params;
    const {
      goal_type,
      goal_description,
      target_milestone,
      priority_score,
      current_progress,
      next_milestone,
      success_criteria,
      status,
      completed_at
    } = req.body;

    // Build dynamic UPDATE query
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (goal_type !== undefined) {
      updates.push(`goal_type = $${paramCount++}`);
      values.push(goal_type);
    }
    if (goal_description !== undefined) {
      updates.push(`goal_description = $${paramCount++}`);
      values.push(goal_description);
    }
    if (target_milestone !== undefined) {
      updates.push(`target_milestone = $${paramCount++}`);
      values.push(target_milestone);
    }
    if (priority_score !== undefined) {
      updates.push(`priority_score = $${paramCount++}`);
      values.push(priority_score);
    }
    if (current_progress !== undefined) {
      updates.push(`current_progress = $${paramCount++}`);
      values.push(current_progress);
    }
    if (next_milestone !== undefined) {
      updates.push(`next_milestone = $${paramCount++}`);
      values.push(next_milestone);
    }
    if (success_criteria !== undefined) {
      updates.push(`success_criteria = $${paramCount++}`);
      values.push(JSON.stringify(success_criteria));
    }
    if (status !== undefined) {
      updates.push(`status = $${paramCount++}`);
      values.push(status);
    }
    if (completed_at !== undefined) {
      updates.push(`completed_at = $${paramCount++}`);
      values.push(completed_at);
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
      UPDATE ai_concierge_goals
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await query(updateQuery, values);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Goal not found'
      });
    }

    res.json({
      success: true,
      goal: result.rows[0],
      message: 'Goal updated successfully'
    });

  } catch (error) {
    console.error('Error updating goal:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update goal',
      details: error.message
    });
  }
}

/**
 * Delete a goal
 * DELETE /api/ige-monitor/goal/:id
 */
async function deleteGoal(req, res) {
  try {
    const { id } = req.params;

    const result = await query(
      'DELETE FROM ai_concierge_goals WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Goal not found'
      });
    }

    res.json({
      success: true,
      message: 'Goal deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting goal:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete goal',
      details: error.message
    });
  }
}

module.exports = {
  createGoal,
  updateGoal,
  deleteGoal
};
