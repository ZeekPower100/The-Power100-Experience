// DATABASE-CHECKED: event_notes (20 columns) verified on 2025-10-07
// Columns: id, event_id, contractor_id, note_text, note_type, extracted_entities,
// session_context, speaker_id, sponsor_id, ai_categorization, ai_priority_score,
// ai_tags, captured_at, session_time, conversation_context, requires_followup,
// followup_completed, followup_completed_at, created_at, updated_at

const { query } = require('../config/database');
const { safeJsonStringify } = require('../utils/jsonHelpers');

/**
 * Event Note Service
 * Handles capturing and retrieving contractor notes during events
 *
 * VALID NOTE TYPES (database constraint):
 * - 'general' (DEFAULT FALLBACK)
 * - 'contact'
 * - 'insight'
 * - 'action_item'
 * - 'speaker_note'
 * - 'sponsor_note'
 * - 'peer_connection'
 */

/**
 * Capture a note from contractor during event
 * @param {Object} params - Note parameters
 * @returns {Object} - Created note object
 */
async function captureEventNote({
  event_id,
  contractor_id,
  note_text,
  extracted_entities = {},
  session_context = null,
  speaker_id = null,
  sponsor_id = null,
  note_type = 'general',
  ai_categorization = null,
  ai_tags = [],
  ai_priority_score = 0.5,
  requires_followup = false,
  conversation_context = {}
}) {
  try {
    console.log('[EventNoteService] Capturing note for contractor', contractor_id, 'at event', event_id);

    // DEFENSIVE: Valid note types - fallback to 'general' if invalid/null
    const validNoteTypes = ['general', 'contact', 'insight', 'action_item', 'speaker_note', 'sponsor_note', 'peer_connection'];
    const safeNoteType = (note_type && validNoteTypes.includes(note_type)) ? note_type : 'general';

    if (safeNoteType !== note_type) {
      console.warn(`[EventNoteService] Invalid note_type '${note_type}' - defaulting to 'general'`);
    }

    const result = await query(`
      INSERT INTO event_notes (
        event_id, contractor_id, note_text, extracted_entities,
        session_context, speaker_id, sponsor_id, note_type,
        ai_categorization, ai_tags, ai_priority_score,
        requires_followup, conversation_context,
        captured_at, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13,
        NOW(), NOW(), NOW()
      )
      RETURNING *
    `, [
      event_id,
      contractor_id,
      note_text,
      safeJsonStringify(extracted_entities),
      session_context,
      speaker_id,
      sponsor_id,
      safeNoteType,
      ai_categorization,
      safeJsonStringify(ai_tags),
      ai_priority_score,
      requires_followup,
      safeJsonStringify(conversation_context)
    ]);

    console.log('[EventNoteService] ✅ Note captured successfully:', result.rows[0].id);
    return result.rows[0];

  } catch (error) {
    console.error('[EventNoteService] ❌ Error capturing note:', error);
    throw error;
  }
}

/**
 * Get all notes for contractor at event
 * @param {number} event_id - Event ID
 * @param {number} contractor_id - Contractor ID
 * @returns {Array} - Array of note objects
 */
async function getEventNotes(event_id, contractor_id) {
  try {
    const result = await query(`
      SELECT * FROM event_notes
      WHERE event_id = $1 AND contractor_id = $2
      ORDER BY captured_at DESC
    `, [event_id, contractor_id]);

    return result.rows;

  } catch (error) {
    console.error('[EventNoteService] Error getting notes:', error);
    throw error;
  }
}

/**
 * Get notes requiring follow-up
 * @param {number} contractor_id - Contractor ID
 * @returns {Array} - Array of notes requiring follow-up
 */
async function getNotesRequiringFollowup(contractor_id) {
  try {
    const result = await query(`
      SELECT * FROM event_notes
      WHERE contractor_id = $1
        AND requires_followup = true
        AND followup_completed = false
      ORDER BY ai_priority_score DESC, captured_at DESC
    `, [contractor_id]);

    return result.rows;

  } catch (error) {
    console.error('[EventNoteService] Error getting notes requiring followup:', error);
    throw error;
  }
}

/**
 * Mark note follow-up as completed
 * @param {number} note_id - Note ID
 * @returns {Object} - Updated note
 */
async function markNoteFollowupCompleted(note_id) {
  try {
    const result = await query(`
      UPDATE event_notes
      SET followup_completed = true,
          followup_completed_at = NOW(),
          updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `, [note_id]);

    return result.rows[0];

  } catch (error) {
    console.error('[EventNoteService] Error marking followup completed:', error);
    throw error;
  }
}

module.exports = {
  captureEventNote,
  getEventNotes,
  getNotesRequiringFollowup,
  markNoteFollowupCompleted
};
