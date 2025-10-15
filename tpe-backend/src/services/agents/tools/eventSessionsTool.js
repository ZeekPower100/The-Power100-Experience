// DATABASE-CHECKED: mv_sessions_now columns verified October 13, 2025
// ================================================================
// Event Sessions Tool (LangGraph Agent Tool)
// ================================================================
// Purpose: Get sessions happening right now or coming up next at contractor's event
// Uses: Phase 1 materialized view (mv_sessions_now) - 0% hallucination rate
// Context: ONLY for contractors at active events
// ================================================================
// PHASE 3 DAY 4: AI Action Guards integrated for rate limiting
// ================================================================

const { z } = require('zod');
const { tool } = require('@langchain/core/tools');
const { query } = require('../../../config/database');
const AIActionGuards = require('../../guards/aiActionGuards');
const GuardLogger = require('../../guards/guardLogger');

// Zod schema for input validation
const EventSessionsSchema = z.object({
  contractorId: z.number().int().positive().describe('The contractor ID'),
  eventId: z.number().int().positive().describe('The event ID the contractor is attending'),
  timeWindow: z.enum(['now', 'next_60']).default('now').describe('Get sessions happening now or in next 60 minutes')
});

/**
 * Event Sessions Tool Function
 * Called by LangGraph agent when contractor needs to know what sessions are happening
 */
const eventSessionsFunction = async ({ contractorId, eventId, timeWindow = 'now' }) => {
  console.log(`[Event Sessions Tool] Getting ${timeWindow} sessions for contractor ${contractorId} at event ${eventId}`);

  try {
    // PHASE 3 DAY 4: GUARD CHECK - Rate Limit Check
    // Using 'partner_lookup' rate limit (100 per hour) for session queries (read-only, high frequency allowed)
    const rateLimitCheck = await AIActionGuards.checkRateLimit(contractorId, 'partner_lookup');
    await GuardLogger.logGuardCheck(contractorId, 'event_sessions_rate_limit', rateLimitCheck);

    if (!rateLimitCheck.allowed) {
      console.log(`[Event Sessions Tool] ❌ Rate limit exceeded: ${rateLimitCheck.reason}`);
      return JSON.stringify({
        success: false,
        error: 'Rate limit exceeded',
        message: `Too many session queries recently. Try again in ${Math.ceil(rateLimitCheck.retryAfter / 60)} minutes.`,
        guardBlocked: true,
        retryAfter: rateLimitCheck.retryAfter,
        timeWindow,
        eventId,
        contractorId
      });
    }

    console.log(`[Event Sessions Tool] ✅ Rate limit check passed - proceeding with session query`);

    // ALL GUARDS PASSED - Proceed with session query
    // Determine which materialized view to query
    const viewName = timeWindow === 'now' ? 'mv_sessions_now' : 'mv_sessions_next_60';

    // Query Phase 1 materialized view (already pre-computed and filtered)
    // DATABASE VERIFIED: All column names match mv_sessions_now exactly
    const sessionsQuery = `
      SELECT
        session_id,
        event_id,
        speaker_name,
        session_title,
        session_time,
        session_end,
        focus_areas,
        session_location,
        session_description,
        contractor_id,
        event_name,
        event_timezone,
        relevance_score,
        focus_area_match_count
      FROM ${viewName}
      WHERE event_id = $1
        AND contractor_id = $2
      ORDER BY relevance_score DESC
      LIMIT 5
    `;

    const result = await query(sessionsQuery, [eventId, contractorId]);

    console.log(`[Event Sessions Tool] Found ${result.rows.length} sessions for ${timeWindow}`);

    if (result.rows.length === 0) {
      // No sessions found - might be between sessions or event hasn't started
      return JSON.stringify({
        success: true,
        sessions: [],
        message: timeWindow === 'now'
          ? 'No sessions happening right now. Check upcoming sessions or take a break!'
          : 'No sessions scheduled in the next 60 minutes.',
        timeWindow,
        eventId,
        contractorId
      });
    }

    // Format sessions for agent response
    const sessions = result.rows.map(session => ({
      sessionId: session.session_id,
      speakerName: session.speaker_name,
      sessionTitle: session.session_title,
      startTime: session.session_time,
      endTime: session.session_end,
      location: session.session_location,
      description: session.session_description,
      focusAreas: session.focus_areas,
      relevanceScore: parseFloat(session.relevance_score),
      focusAreaMatches: session.focus_area_match_count,
      whyRelevant: generateRelevanceExplanation(session)
    }));

    // Log to ai_learning_events for continuous improvement
    await logLearningEvent({
      eventType: 'event_session_query',
      contractorId,
      eventId,
      context: `Queried ${timeWindow} sessions`,
      actionTaken: `returned_${sessions.length}_sessions`,
      outcome: 'sessions_found',
      successScore: sessions.length > 0 ? 1.0 : 0.5,
      learnedInsight: `Top session: ${sessions[0]?.sessionTitle} (relevance: ${sessions[0]?.relevanceScore})`,
      confidenceLevel: 0.9,
      relatedEntities: {
        timeWindow,
        sessionCount: sessions.length,
        topSessions: sessions.slice(0, 3).map(s => s.sessionId)
      }
    });

    console.log(`[Event Sessions Tool] Returning ${sessions.length} sessions, top relevance: ${sessions[0]?.relevanceScore}`);

    return JSON.stringify({
      success: true,
      sessions,
      timeWindow,
      eventId,
      contractorId,
      message: `Found ${sessions.length} ${timeWindow === 'now' ? 'active' : 'upcoming'} sessions matching your interests`
    });

  } catch (error) {
    console.error('[Event Sessions Tool] Error:', error);

    // Log failed learning event
    await logLearningEvent({
      eventType: 'event_session_query',
      contractorId,
      eventId,
      context: `Attempted to query ${timeWindow} sessions`,
      actionTaken: 'query_failed',
      outcome: 'error',
      successScore: 0,
      learnedInsight: `Error: ${error.message}`,
      confidenceLevel: 0
    });

    return JSON.stringify({
      success: false,
      error: error.message,
      timeWindow,
      eventId,
      contractorId
    });
  }
};

/**
 * Generate human-readable explanation of why session is relevant
 */
function generateRelevanceExplanation(session) {
  const reasons = [];

  if (session.focus_area_match_count > 0) {
    reasons.push(`Matches ${session.focus_area_match_count} of your focus areas`);
  }

  if (session.relevance_score >= 90) {
    reasons.push('Highly recommended for your business goals');
  } else if (session.relevance_score >= 70) {
    reasons.push('Good fit for your business profile');
  }

  if (session.focus_areas && Array.isArray(session.focus_areas) && session.focus_areas.length > 0) {
    reasons.push(`Covers: ${session.focus_areas.slice(0, 2).join(', ')}`);
  }

  return reasons.length > 0 ? reasons.join('. ') : 'Relevant to event attendees';
}

/**
 * Log learning event to ai_learning_events table
 * Tracks agent actions for continuous improvement
 */
async function logLearningEvent(eventData) {
  const {
    eventType,
    contractorId,
    eventId,
    context,
    actionTaken,
    outcome,
    successScore,
    learnedInsight,
    confidenceLevel,
    relatedEntities = null
  } = eventData;

  try {
    const insertQuery = `
      INSERT INTO ai_learning_events (
        event_type,
        contractor_id,
        event_id,
        context,
        action_taken,
        outcome,
        success_score,
        learned_insight,
        confidence_level,
        related_entities,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
      RETURNING id
    `;

    const result = await query(insertQuery, [
      eventType,
      contractorId,
      eventId,
      context,
      actionTaken,
      outcome,
      successScore,
      learnedInsight,
      confidenceLevel,
      relatedEntities ? JSON.stringify(relatedEntities) : null
    ]);

    console.log(`[Learning Event] Logged event ID: ${result.rows[0].id}`);
  } catch (error) {
    console.error('[Learning Event] Failed to log:', error);
    // Don't throw - logging failure shouldn't break the tool
  }
}

// Create the LangChain tool
const eventSessionsTool = tool(
  eventSessionsFunction,
  {
    name: 'get_event_sessions',
    description: `Get sessions happening RIGHT NOW or COMING UP NEXT at the contractor's event.

Use this tool when:
- Contractor asks "what's happening now?" or "what sessions are on?"
- Contractor wants to know what's coming up next
- Contractor needs recommendations for which session to attend
- Contractor asks about specific speakers or topics at the event

IMPORTANT: This tool ONLY works during active events.
- Queries Phase 1 materialized views (mv_sessions_now, mv_sessions_next_60)
- Data is pre-computed and refreshed every 30 seconds
- Results are already filtered and scored for this specific contractor
- Zero hallucinations - all data comes directly from database

The tool returns:
- Sessions happening RIGHT NOW (timeWindow: 'now')
- Sessions in NEXT 60 MINUTES (timeWindow: 'next_60')
- Pre-calculated relevance scores based on contractor's focus areas
- Session details: speaker, title, location, description, timing

Returns: JSON with session details, relevance scores, and personalized recommendations.

Automatically logs to ai_learning_events for continuous improvement.`,
    schema: EventSessionsSchema
  }
);

module.exports = eventSessionsTool;
