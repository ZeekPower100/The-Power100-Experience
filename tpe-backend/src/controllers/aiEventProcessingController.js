// DATABASE-CHECKED: event_agenda_items and event_speakers columns verified on 2025-10-28
const { query } = require('../config/database.postgresql');
const { safeJsonStringify } = require('../utils/jsonHelpers');
const {
  batchProcessSessions,
  batchProcessSpeakers
} = require('../services/aiFocusAreaExtractor');

/**
 * Bulk process all sessions and speakers for an event with AI focus area extraction
 * POST /api/admin/events/:eventId/ai-process
 */
async function processEventWithAI(req, res) {
  const { eventId } = req.params;

  try {
    console.log(`[AI Event Processing] Starting AI processing for event ${eventId}...`);

    // Step 1: Fetch all sessions for this event (using verified database field names)
    const sessionsQuery = `
      SELECT
        id,
        event_id,
        title,
        description,
        synopsis,
        speaker_id,
        focus_areas
      FROM event_agenda_items
      WHERE event_id = $1 AND item_type = 'session'
      ORDER BY id
    `;

    const sessionsResult = await query(sessionsQuery, [eventId]);
    const sessions = sessionsResult.rows;

    console.log(`[AI Event Processing] Found ${sessions.length} sessions to process`);

    // Step 2: Fetch all speakers for this event (using verified database field names)
    const speakersQuery = `
      SELECT
        id,
        event_id,
        name,
        title,
        company,
        bio,
        focus_areas
      FROM event_speakers
      WHERE event_id = $1
      ORDER BY id
    `;

    const speakersResult = await query(speakersQuery, [eventId]);
    const speakers = speakersResult.rows;

    console.log(`[AI Event Processing] Found ${speakers.length} speakers to process`);

    // Step 3: Process sessions with AI
    const processedSessions = await batchProcessSessions(sessions);

    // Step 4: Update database with extracted focus areas for sessions
    let sessionsUpdated = 0;
    for (const session of processedSessions) {
      if (session.ai_processed && session.focus_areas.length > 0) {
        const updateSessionQuery = `
          UPDATE event_agenda_items
          SET focus_areas = $1
          WHERE id = $2
        `;
        await query(updateSessionQuery, [safeJsonStringify(session.focus_areas), session.id]);
        sessionsUpdated++;
      }
    }

    // Step 5: Process speakers with AI
    const processedSpeakers = await batchProcessSpeakers(speakers);

    // Step 6: Update database with extracted focus areas for speakers
    let speakersUpdated = 0;
    for (const speaker of processedSpeakers) {
      if (speaker.ai_processed && speaker.focus_areas.length > 0) {
        const updateSpeakerQuery = `
          UPDATE event_speakers
          SET focus_areas = $1
          WHERE id = $2
        `;
        await query(updateSpeakerQuery, [safeJsonStringify(speaker.focus_areas), speaker.id]);
        speakersUpdated++;
      }
    }

    console.log(`[AI Event Processing] ✅ Complete: ${sessionsUpdated} sessions and ${speakersUpdated} speakers updated`);

    // Return summary
    return res.json({
      success: true,
      message: 'AI processing complete',
      summary: {
        sessionsProcessed: sessions.length,
        sessionsUpdated: sessionsUpdated,
        sessionsFailed: processedSessions.filter(s => !s.ai_processed).length,
        speakersProcessed: speakers.length,
        speakersUpdated: speakersUpdated,
        speakersFailed: processedSpeakers.filter(s => !s.ai_processed).length
      },
      results: {
        sessions: processedSessions.map(s => ({
          id: s.id,
          title: s.title,
          focus_areas: s.focus_areas,
          ai_processed: s.ai_processed,
          error: s.ai_error || null
        })),
        speakers: processedSpeakers.map(s => ({
          id: s.id,
          name: s.name,
          focus_areas: s.focus_areas,
          ai_processed: s.ai_processed,
          error: s.ai_error || null
        }))
      }
    });

  } catch (error) {
    console.error('[AI Event Processing] ❌ Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to process event with AI',
      details: error.message
    });
  }
}

/**
 * Get AI processing status for an event
 * GET /api/admin/events/:eventId/ai-status
 */
async function getAIProcessingStatus(req, res) {
  const { eventId } = req.params;

  try {
    // Count sessions with and without focus areas (using verified database field names)
    const sessionsStatusQuery = `
      SELECT
        COUNT(*) as total,
        COUNT(CASE WHEN focus_areas IS NOT NULL AND focus_areas::text != '[]' THEN 1 END) as with_focus_areas
      FROM event_agenda_items
      WHERE event_id = $1 AND item_type = 'session'
    `;

    const sessionsStatus = await query(sessionsStatusQuery, [eventId]);

    // Count speakers with and without focus areas (using verified database field names)
    const speakersStatusQuery = `
      SELECT
        COUNT(*) as total,
        COUNT(CASE WHEN focus_areas IS NOT NULL AND focus_areas::text != '[]' THEN 1 END) as with_focus_areas
      FROM event_speakers
      WHERE event_id = $1
    `;

    const speakersStatus = await query(speakersStatusQuery, [eventId]);

    const sessions = sessionsStatus.rows[0];
    const speakers = speakersStatus.rows[0];

    return res.json({
      success: true,
      status: {
        sessions: {
          total: parseInt(sessions.total),
          processed: parseInt(sessions.with_focus_areas),
          pending: parseInt(sessions.total) - parseInt(sessions.with_focus_areas)
        },
        speakers: {
          total: parseInt(speakers.total),
          processed: parseInt(speakers.with_focus_areas),
          pending: parseInt(speakers.total) - parseInt(speakers.with_focus_areas)
        }
      }
    });

  } catch (error) {
    console.error('[AI Event Processing] Error getting status:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get AI processing status',
      details: error.message
    });
  }
}

module.exports = {
  processEventWithAI,
  getAIProcessingStatus
};
