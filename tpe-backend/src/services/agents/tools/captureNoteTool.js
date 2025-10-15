// DATABASE-CHECKED: event_notes columns verified October 13, 2025
// ================================================================
// Capture Note Tool (LangGraph Agent Tool)
// ================================================================
// Purpose: Capture contractor notes, observations, and feedback during events
// Uses: event_notes table with AI categorization and follow-up tracking
// Context: ONLY during events when contractor shares information
// ================================================================
// PHASE 3 DAY 4: AI Action Guards integrated for permission and rate limiting
// ================================================================

const { z } = require('zod');
const { tool } = require('@langchain/core/tools');
const { query } = require('../../../config/database');
const AIActionGuards = require('../../guards/aiActionGuards');
const GuardLogger = require('../../guards/guardLogger');

// Zod schema for input validation
// DATABASE VERIFIED: note_type values from CHECK constraint in database
const CaptureNoteSchema = z.object({
  contractorId: z.number().int().positive().describe('The contractor ID'),
  eventId: z.number().int().positive().describe('The event ID where note was captured'),
  noteText: z.string().min(1).describe('The actual note content to capture'),  // DATABASE VERIFIED: note_text
  noteType: z.enum([
    'general',            // DATABASE VERIFIED: General thoughts or observations
    'contact',            // DATABASE VERIFIED: Contact information or networking note
    'insight',            // DATABASE VERIFIED: Business insight or realization
    'action_item',        // DATABASE VERIFIED: Something contractor needs to do
    'speaker_note',       // DATABASE VERIFIED: Note about a speaker or session
    'sponsor_note',       // DATABASE VERIFIED: Note about a sponsor/exhibitor
    'peer_connection'     // DATABASE VERIFIED: Connection with another attendee
  ]).describe('Type of note being captured'),
  speakerId: z.number().int().positive().optional().describe('Speaker ID if note is about a specific speaker'),
  sponsorId: z.number().int().positive().optional().describe('Sponsor ID if note is about a specific sponsor'),
  requiresFollowup: z.boolean().default(false).describe('Whether this note requires follow-up action')
});

/**
 * Capture Note Tool Function
 * Called by LangGraph agent when contractor shares information during an event
 */
const captureNoteFunction = async ({
  contractorId,
  eventId,
  noteText,
  noteType,
  speakerId,
  sponsorId,
  requiresFollowup = false
}) => {
  console.log(`[Capture Note Tool] Capturing ${noteType} note for contractor ${contractorId} at event ${eventId}`);

  try {
    // PHASE 3 DAY 4: GUARD CHECK 1 - Permission Check
    const permissionCheck = await AIActionGuards.canCreateActionItem(contractorId);
    await GuardLogger.logGuardCheck(contractorId, 'capture_note_permission', permissionCheck);

    if (!permissionCheck.allowed) {
      console.log(`[Capture Note Tool] ❌ Permission denied: ${permissionCheck.reason}`);
      return JSON.stringify({
        success: false,
        error: 'Permission denied',
        message: `Cannot capture note: ${permissionCheck.reason}`,
        guardBlocked: true,
        contractorId,
        eventId
      });
    }

    // PHASE 3 DAY 4: GUARD CHECK 2 - Rate Limit Check
    // Using 'message_send' rate limit (50 per hour) for note captures
    const rateLimitCheck = await AIActionGuards.checkRateLimit(contractorId, 'message_send');
    await GuardLogger.logGuardCheck(contractorId, 'capture_note_rate_limit', rateLimitCheck);

    if (!rateLimitCheck.allowed) {
      console.log(`[Capture Note Tool] ❌ Rate limit exceeded: ${rateLimitCheck.reason}`);
      return JSON.stringify({
        success: false,
        error: 'Rate limit exceeded',
        message: `Too many notes captured recently. Try again in ${Math.ceil(rateLimitCheck.retryAfter / 60)} minutes.`,
        guardBlocked: true,
        retryAfter: rateLimitCheck.retryAfter,
        contractorId,
        eventId
      });
    }

    console.log(`[Capture Note Tool] ✅ All guards passed - proceeding with note capture`);

    // ALL GUARDS PASSED - Proceed with database operation
    // Insert note using DATABASE VERIFIED field names
    const insertQuery = `
      INSERT INTO event_notes (
        contractor_id,
        event_id,
        note_text,              -- DATABASE VERIFIED: note_text (not note_content!)
        note_type,
        speaker_id,
        sponsor_id,
        requires_followup,
        captured_at,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW(), NOW())
      RETURNING id, captured_at
    `;

    const result = await query(insertQuery, [
      contractorId,
      eventId,
      noteText,
      noteType,
      speakerId || null,
      sponsorId || null,
      requiresFollowup
    ]);

    const noteId = result.rows[0].id;
    const capturedAt = result.rows[0].captured_at;

    console.log(`[Capture Note Tool] Note captured successfully with ID: ${noteId}`);

    // Log to ai_learning_events for continuous improvement
    await logLearningEvent({
      eventType: 'note_capture',
      contractorId,
      eventId,
      context: `Captured ${noteType} note during event`,
      actionTaken: 'capture_note',
      outcome: 'note_saved',
      successScore: 1.0,
      learnedInsight: `Contractor engaged with ${noteType}: "${noteText.substring(0, 50)}${noteText.length > 50 ? '...' : ''}"`,
      confidenceLevel: 0.9,
      relatedEntities: {
        noteId,
        noteType,
        requiresFollowup,
        speakerId: speakerId || null,
        sponsorId: sponsorId || null
      }
    });

    return JSON.stringify({
      success: true,
      noteId,
      capturedAt,
      noteType,
      requiresFollowup,
      message: requiresFollowup
        ? 'Note captured! I\'ll follow up with you about this.'
        : 'Note captured successfully!',
      eventId,
      contractorId
    });

  } catch (error) {
    console.error('[Capture Note Tool] Error:', error);

    // Log failed learning event
    await logLearningEvent({
      eventType: 'note_capture',
      contractorId,
      eventId,
      context: `Attempted to capture ${noteType} note`,
      actionTaken: 'capture_note_failed',
      outcome: 'error',
      successScore: 0,
      learnedInsight: `Error: ${error.message}`,
      confidenceLevel: 0
    });

    return JSON.stringify({
      success: false,
      error: error.message,
      noteType,
      eventId,
      contractorId
    });
  }
};

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
const captureNoteTool = tool(
  captureNoteFunction,
  {
    name: 'capture_event_note',
    description: `Capture contractor notes, observations, feedback, and action items during events.

Use this tool when:
- Contractor shares feedback about a speaker or session
- Contractor expresses interest in a sponsor/partner
- Contractor has an insight, idea, or observation
- Contractor mentions an action item or follow-up needed
- Contractor asks a question they want answered later
- Contractor identifies a networking opportunity

IMPORTANT: This tool is for EVENT-SPECIFIC notes only.
- Stores in event_notes table with full context
- Tracks speaker_id and sponsor_id relationships
- Flags notes that require follow-up
- All notes are timestamped with captured_at

Note Types (DATABASE VERIFIED):
- general: General thoughts or observations
- contact: Contact information or networking note
- insight: Business insight or realization
- action_item: Something contractor needs to do
- speaker_note: Note about a speaker or session
- sponsor_note: Note about a sponsor/exhibitor
- peer_connection: Connection with another attendee

The tool automatically:
- Timestamps the note with exact capture time
- Links to speaker or sponsor if mentioned
- Flags for follow-up if action needed
- Logs to ai_learning_events for learning

Returns: JSON with note ID, capture time, and confirmation message.

Automatically logs to ai_learning_events for continuous improvement.`,
    schema: CaptureNoteSchema
  }
);

module.exports = captureNoteTool;
