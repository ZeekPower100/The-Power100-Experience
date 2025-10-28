// DATABASE-CHECKED: event_messages columns verified October 28, 2025
// ================================================================
// VERIFIED FIELD NAMES (event_messages - 28 columns):
// - contractor_id, event_id (INTEGER)
// - message_type (VARCHAR NOT NULL) - use 'session_recommendation'
// - message_content (TEXT NOT NULL) - always required, no nulls allowed
// - personalization_data (JSONB) - stores recommendation structure
// - scheduled_time (TIMESTAMP)
// - status (VARCHAR), direction (VARCHAR)
// - ghl_contact_id, ghl_location_id (VARCHAR)
// ================================================================
// PERSONALIZATION_DATA STRUCTURE (JSONB):
// {
//   recommended_sessions: [{
//     agenda_item_id: NUMBER (always present),
//     speaker_id: NUMBER or NULL (may not exist),
//     speaker_name: STRING or NULL,
//     session_title: STRING,
//     match_score: NUMBER,
//     match_reasons: ARRAY of STRINGS,
//     data_source: STRING ('session_content' | 'speaker_data' | 'both'),
//     session_time: ISO TIMESTAMP,
//     session_location: STRING
//   }]
// }
// ================================================================

const { query } = require('../../config/database');
const { safeJsonStringify } = require('../../utils/jsonHelpers');

/**
 * Save session recommendation to event_messages
 * NOW includes agenda_item_id for session-based tracking
 *
 * @param {Object} params - Message parameters
 * @returns {Promise<number>} Message ID
 */
async function saveSessionRecommendation(params) {
  const {
    contractor_id,
    event_id,
    recommended_sessions, // Array of session objects
    ghl_contact_id,
    ghl_location_id,
    scheduled_time
  } = params;

  console.log('[SessionMessage] Saving session recommendation for contractor:', contractor_id);

  // Build personalization_data with BOTH agenda_item_id and speaker_id
  const personalizationData = {
    recommended_sessions: recommended_sessions.map(s => ({
      agenda_item_id: s.agenda_item_id, // NEW: Track by agenda item
      speaker_id: s.speaker_id || null, // May be null
      speaker_name: s.speaker?.name || null,
      session_title: s.title,
      match_score: s.match_score,
      match_reasons: s.match_reasons || [],
      data_source: s.data_source, // NEW: What data was used
      session_time: s.start_time,
      session_location: s.location
    }))
  };

  // Generate message content
  const messageContent = buildRecommendationMessage(recommended_sessions);

  console.log('[SessionMessage] Storing', recommended_sessions.length, 'session recommendations');

  const result = await query(`
    INSERT INTO event_messages (
      contractor_id,
      event_id,
      message_type,
      message_content,
      personalization_data,
      ghl_contact_id,
      ghl_location_id,
      scheduled_time,
      status,
      direction,
      created_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'scheduled', 'outbound', NOW())
    RETURNING id
  `, [
    contractor_id,
    event_id,
    'session_recommendation', // Changed from 'speaker_recommendation'
    messageContent,
    safeJsonStringify(personalizationData),
    ghl_contact_id || null,
    ghl_location_id || null,
    scheduled_time || new Date()
  ]);

  const messageId = result.rows[0].id;
  console.log('[SessionMessage] Session recommendation saved with ID:', messageId);

  return messageId;
}

/**
 * Build user-friendly message text from recommendations
 * Works with or without speaker names
 */
function buildRecommendationMessage(sessions) {
  const lines = [
    "🎯 Here are your top 3 recommended sessions at the event:"
  ];

  sessions.forEach((s, idx) => {
    const speakerInfo = s.speaker ? ` by ${s.speaker.name}` : '';
    const time = s.start_time ? ` at ${new Date(s.start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}` : '';

    lines.push(`\n${idx + 1}. "${s.title}"${speakerInfo}${time}`);
    if (s.match_reasons && s.match_reasons.length > 0) {
      lines.push(`   Why: ${s.match_reasons[0]}`);
    }
  });

  lines.push("\n\nReply with a number (1-3) to learn more about that session!");

  return lines.join('\n');
}

module.exports = {
  saveSessionRecommendation
};
