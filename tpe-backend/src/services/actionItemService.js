// DATABASE-CHECKED: contractor_action_items (27 columns) verified on 2025-10-07
// Columns: id, contractor_id, event_id, title, description, action_type, priority,
// contractor_priority, ai_suggested_priority, due_date, reminder_time, status,
// completed_at, cancelled_reason, related_partner_id, related_peer_contractor_id,
// related_speaker_id, related_sponsor_id, related_note_id, related_demo_booking_id,
// ai_generated, ai_reasoning, extraction_confidence, source_message_id,
// conversation_context, created_at, updated_at

const { query } = require('../config/database');
const { safeJsonStringify } = require('../utils/jsonHelpers');

/**
 * Action Item Service
 * Handles creating and managing contractor action items from AI conversations
 */

/**
 * Create action item from AI conversation
 * @param {Object} params - Action item parameters
 * @returns {Object} - Created action item
 */
async function createActionItem({
  contractor_id,
  event_id = null,
  title,
  description = null,
  action_type,
  priority = 5,
  contractor_priority = null,
  ai_suggested_priority = null,
  due_date = null,
  reminder_time = null,
  related_partner_id = null,
  related_peer_contractor_id = null,
  related_speaker_id = null,
  related_sponsor_id = null,
  related_note_id = null,
  related_demo_booking_id = null,
  ai_reasoning = null,
  extraction_confidence = null,
  source_message_id = null,
  conversation_context = {}
}) {
  try {
    console.log('[ActionItemService] Creating action item for contractor', contractor_id, ':', title);

    const result = await query(`
      INSERT INTO contractor_action_items (
        contractor_id, event_id, title, description, action_type,
        priority, contractor_priority, ai_suggested_priority,
        due_date, reminder_time, status,
        related_partner_id, related_peer_contractor_id, related_speaker_id,
        related_sponsor_id, related_note_id, related_demo_booking_id,
        ai_generated, ai_reasoning, extraction_confidence,
        source_message_id, conversation_context,
        created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pending',
        $11, $12, $13, $14, $15, $16, true, $17, $18, $19, $20,
        NOW(), NOW()
      )
      RETURNING *
    `, [
      contractor_id, event_id, title, description, action_type,
      priority, contractor_priority, ai_suggested_priority,
      due_date, reminder_time,
      related_partner_id, related_peer_contractor_id, related_speaker_id,
      related_sponsor_id, related_note_id, related_demo_booking_id,
      ai_reasoning, extraction_confidence,
      source_message_id, safeJsonStringify(conversation_context)
    ]);

    console.log('[ActionItemService] ✅ Action item created:', result.rows[0].id);
    return result.rows[0];

  } catch (error) {
    console.error('[ActionItemService] ❌ Error creating action item:', error);
    throw error;
  }
}

/**
 * Update action item status
 * @param {number} action_item_id - Action item ID
 * @param {number} contractor_id - Contractor ID (for audit trail)
 * @param {string} new_status - New status
 * @param {string} update_note - Note about the update
 * @returns {Object} - Updated action item
 */
async function updateActionItemStatus(action_item_id, contractor_id, new_status, update_note = null) {
  try {
    console.log('[ActionItemService] Updating action item', action_item_id, 'to status:', new_status);

    // Get current status for audit trail
    const currentResult = await query(`
      SELECT status FROM contractor_action_items WHERE id = $1
    `, [action_item_id]);

    if (currentResult.rows.length === 0) {
      throw new Error('Action item not found');
    }

    const old_status = currentResult.rows[0].status;

    // Log the update in action_item_updates table
    await query(`
      INSERT INTO action_item_updates (
        action_item_id, contractor_id, update_type,
        old_value, new_value, update_note,
        updated_by, update_source, created_at
      ) VALUES ($1, $2, 'status_change', $3, $4, $5, 'ai_concierge', 'conversation', NOW())
    `, [action_item_id, contractor_id, old_status, new_status, update_note]);

    // Update the action item
    const result = await query(`
      UPDATE contractor_action_items
      SET status = $1,
          completed_at = CASE WHEN $1 = 'completed' THEN NOW() ELSE completed_at END,
          updated_at = NOW()
      WHERE id = $2 AND contractor_id = $3
      RETURNING *
    `, [new_status, action_item_id, contractor_id]);

    console.log('[ActionItemService] ✅ Status updated successfully');
    return result.rows[0];

  } catch (error) {
    console.error('[ActionItemService] ❌ Error updating status:', error);
    throw error;
  }
}

/**
 * Get pending action items for contractor
 * @param {number} contractor_id - Contractor ID
 * @param {number} limit - Max results
 * @returns {Array} - Array of pending action items
 */
async function getPendingActionItems(contractor_id, limit = 10) {
  try {
    const result = await query(`
      SELECT * FROM contractor_action_items
      WHERE contractor_id = $1 AND status = 'pending'
      ORDER BY priority ASC, due_date ASC NULLS LAST
      LIMIT $2
    `, [contractor_id, limit]);

    return result.rows;

  } catch (error) {
    console.error('[ActionItemService] Error getting pending action items:', error);
    throw error;
  }
}

/**
 * Get action items for specific event
 * @param {number} contractor_id - Contractor ID
 * @param {number} event_id - Event ID
 * @returns {Array} - Array of action items from event
 */
async function getEventActionItems(contractor_id, event_id) {
  try {
    const result = await query(`
      SELECT * FROM contractor_action_items
      WHERE contractor_id = $1 AND event_id = $2
      ORDER BY contractor_priority ASC NULLS LAST, priority ASC
    `, [contractor_id, event_id]);

    return result.rows;

  } catch (error) {
    console.error('[ActionItemService] Error getting event action items:', error);
    throw error;
  }
}

/**
 * Get action item by ID
 * @param {number} action_item_id - Action item ID
 * @returns {Object} - Action item object
 */
async function getActionItemById(action_item_id) {
  try {
    const result = await query(`
      SELECT * FROM contractor_action_items WHERE id = $1
    `, [action_item_id]);

    return result.rows[0] || null;

  } catch (error) {
    console.error('[ActionItemService] Error getting action item:', error);
    throw error;
  }
}

module.exports = {
  createActionItem,
  updateActionItemStatus,
  getPendingActionItems,
  getEventActionItems,
  getActionItemById
};
