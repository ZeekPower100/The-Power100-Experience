// DATABASE-CHECKED: event_agenda_items, event_speakers columns verified October 28, 2025
// ================================================================
// VERIFIED FIELD NAMES (event_agenda_items - 25 columns):
// - id, event_id, title (VARCHAR NOT NULL), synopsis (TEXT nullable)
// - focus_areas (JSONB), key_takeaways (JSONB), target_audience (JSONB)
// - speaker_id (INTEGER nullable) ⚠️ USE LEFT JOIN
// - start_time, end_time (TIMESTAMP), location, track (VARCHAR)
// - item_type (VARCHAR), status (VARCHAR), ai_summary (TEXT), ai_keywords (JSONB)
// ================================================================
// VERIFIED FIELD NAMES (event_speakers - 23 columns):
// - id, name (VARCHAR NOT NULL), title, company (VARCHAR nullable)
// - bio, session_title, session_description (TEXT nullable)
// - focus_areas (JSONB), target_audience (JSONB)
// - ai_summary (TEXT), ai_key_points (JSONB), relevance_keywords (JSONB)
// - pcr_score (NUMERIC), headshot_url (VARCHAR)
// ================================================================
// CRITICAL DATA TYPES:
// - focus_areas: JSONB array (use safeJsonParse, NOT JSON.parse)
// - key_takeaways: JSONB array (use safeJsonParse)
// - ai_keywords: JSONB array (use safeJsonParse)
// - speaker_id: INTEGER nullable (check if row.speaker_id before accessing speaker fields)
// - synopsis: TEXT nullable (may not exist)
// ================================================================
// LEFT JOIN REQUIREMENT:
// FROM event_agenda_items ai
// LEFT JOIN event_speakers es ON ai.speaker_id = es.id
// Always check: if (row.speaker_id) { ... use speaker fields }
// ================================================================

const { query } = require('../../config/database');
const { safeJsonParse } = require('../../utils/jsonHelpers');

/**
 * Get all event sessions with unified agenda + speaker data
 * LEFT JOIN ensures we get sessions even without speaker_id
 *
 * @param {number} eventId - Event ID
 * @returns {Promise<Array>} Unified session objects with all available data
 */
async function getEventSessions(eventId) {
  const result = await query(`
    SELECT
      -- Agenda item data (ALWAYS available)
      ai.id as agenda_item_id,
      ai.event_id,
      ai.title as session_title,
      ai.synopsis as session_synopsis,
      ai.description as session_description,
      ai.focus_areas as agenda_focus_areas,
      ai.key_takeaways as agenda_key_takeaways,
      ai.target_audience as agenda_target_audience,
      ai.skill_level,
      ai.start_time,
      ai.end_time,
      ai.location,
      ai.track,
      ai.capacity,
      ai.item_type,
      ai.ai_summary as agenda_ai_summary,
      ai.ai_keywords as agenda_ai_keywords,

      -- Speaker data (may be NULL if no speaker_id)
      ai.speaker_id,
      es.name as speaker_name,
      es.title as speaker_title,
      es.company as speaker_company,
      es.bio as speaker_bio,
      es.headshot_url as speaker_headshot,
      es.session_title as speaker_session_title,
      es.session_description as speaker_session_description,
      es.focus_areas as speaker_focus_areas,
      es.target_audience as speaker_target_audience,
      es.pcr_score as speaker_pcr_score,
      es.ai_summary as speaker_ai_summary,
      es.ai_key_points as speaker_ai_key_points,
      es.relevance_keywords as speaker_relevance_keywords

    FROM event_agenda_items ai
    LEFT JOIN event_speakers es ON ai.speaker_id = es.id
    WHERE ai.event_id = $1
      AND ai.item_type = 'session'
      AND ai.status IN ('scheduled', 'confirmed', 'tentative')
    ORDER BY ai.start_time
  `, [eventId]);

  // Parse JSONB fields and create unified session objects
  return result.rows.map(row => {
    // Combine focus areas from both sources
    const agendaFocusAreas = safeJsonParse(row.agenda_focus_areas, []);
    const speakerFocusAreas = safeJsonParse(row.speaker_focus_areas, []);
    const combinedFocusAreas = [...new Set([...agendaFocusAreas, ...speakerFocusAreas])];

    // Combine target audience from both sources
    const agendaTargetAudience = safeJsonParse(row.agenda_target_audience, []);
    const speakerTargetAudience = safeJsonParse(row.speaker_target_audience, []);
    const combinedTargetAudience = [...new Set([...agendaTargetAudience, ...speakerTargetAudience])];

    // Combine AI insights
    const agendaKeywords = safeJsonParse(row.agenda_ai_keywords, []);
    const speakerKeywords = safeJsonParse(row.speaker_relevance_keywords, []);
    const combinedKeywords = [...new Set([...agendaKeywords, ...speakerKeywords])];

    return {
      // Core identifiers
      agenda_item_id: row.agenda_item_id,
      event_id: row.event_id,
      speaker_id: row.speaker_id, // May be NULL

      // Session content (prioritize agenda, fallback to speaker)
      title: row.session_title || row.speaker_session_title,
      synopsis: row.session_synopsis,
      description: row.session_description || row.speaker_session_description,

      // Matching signals (combined from both sources)
      focus_areas: combinedFocusAreas,
      target_audience: combinedTargetAudience,
      keywords: combinedKeywords,
      key_takeaways: safeJsonParse(row.agenda_key_takeaways, []),
      skill_level: row.skill_level,

      // Logistics
      start_time: row.start_time,
      end_time: row.end_time,
      location: row.location,
      track: row.track,
      capacity: row.capacity,

      // Speaker info (may all be NULL)
      speaker: row.speaker_id ? {
        id: row.speaker_id,
        name: row.speaker_name,
        title: row.speaker_title,
        company: row.speaker_company,
        bio: row.speaker_bio,
        headshot_url: row.speaker_headshot,
        pcr_score: row.speaker_pcr_score
      } : null,

      // AI summaries (use best available)
      ai_summary: row.speaker_ai_summary || row.agenda_ai_summary,
      ai_key_points: safeJsonParse(row.speaker_ai_key_points, []),

      // Data completeness flags (for debugging/analytics)
      has_speaker_data: !!row.speaker_id,
      has_session_content: !!(row.session_synopsis || row.session_description),
      data_richness_score: calculateDataRichness(row)
    };
  });
}

/**
 * Calculate how much data we have for this session (0-1 score)
 * Used to prioritize data-rich sessions in recommendations
 */
function calculateDataRichness(row) {
  let score = 0;
  let maxScore = 0;

  // Session content signals (weight: 0.5)
  maxScore += 0.5;
  if (row.session_synopsis) score += 0.15;
  if (row.session_description) score += 0.15;
  if (row.agenda_focus_areas) {
    const focusAreas = safeJsonParse(row.agenda_focus_areas, []);
    if (focusAreas.length > 0) score += 0.1;
  }
  if (row.agenda_key_takeaways) {
    const keyTakeaways = safeJsonParse(row.agenda_key_takeaways, []);
    if (keyTakeaways.length > 0) score += 0.1;
  }

  // Speaker data signals (weight: 0.5)
  maxScore += 0.5;
  if (row.speaker_id) {
    if (row.speaker_bio) score += 0.2;
    if (row.speaker_company) score += 0.1;
    if (row.speaker_focus_areas) {
      const speakerFocusAreas = safeJsonParse(row.speaker_focus_areas, []);
      if (speakerFocusAreas.length > 0) score += 0.1;
    }
    if (row.speaker_ai_summary) score += 0.1;
  }

  return score / maxScore; // Normalize to 0-1
}

/**
 * Get single session with unified data
 * @param {number} agendaItemId - Agenda item ID
 * @returns {Promise<Object|null>} Unified session object or null
 */
async function getSessionById(agendaItemId) {
  const result = await query(`
    SELECT
      ai.id as agenda_item_id,
      ai.event_id,
      ai.title as session_title,
      ai.synopsis as session_synopsis,
      ai.description as session_description,
      ai.focus_areas as agenda_focus_areas,
      ai.key_takeaways as agenda_key_takeaways,
      ai.start_time,
      ai.end_time,
      ai.location,
      ai.speaker_id,
      es.name as speaker_name,
      es.title as speaker_title,
      es.bio as speaker_bio,
      es.company as speaker_company,
      es.session_title as speaker_session_title,
      es.session_description as speaker_session_description,
      es.ai_summary as speaker_ai_summary
    FROM event_agenda_items ai
    LEFT JOIN event_speakers es ON ai.speaker_id = es.id
    WHERE ai.id = $1
  `, [agendaItemId]);

  if (result.rows.length === 0) return null;

  const row = result.rows[0];
  return {
    agenda_item_id: row.agenda_item_id,
    event_id: row.event_id,
    speaker_id: row.speaker_id, // Add speaker_id to return object
    title: row.session_title || row.speaker_session_title,
    synopsis: row.session_synopsis,
    description: row.session_description || row.speaker_session_description,
    focus_areas: safeJsonParse(row.agenda_focus_areas, []),
    key_takeaways: safeJsonParse(row.agenda_key_takeaways, []),
    keywords: [], // Empty array for getSessionById (agenda doesn't have keywords field)
    start_time: row.start_time,
    end_time: row.end_time,
    location: row.location,
    speaker: row.speaker_id ? {
      id: row.speaker_id,
      name: row.speaker_name,
      title: row.speaker_title,
      bio: row.speaker_bio,
      company: row.speaker_company,
      ai_summary: row.speaker_ai_summary
    } : null,
    has_speaker_data: !!row.speaker_id
  };
}

module.exports = {
  getEventSessions,
  getSessionById
};
