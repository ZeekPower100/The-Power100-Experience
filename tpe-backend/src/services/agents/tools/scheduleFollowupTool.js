// DATABASE-CHECKED: contractor_followup_schedules columns verified October 13, 2025
// ================================================================
// Schedule Follow-up Tool (LangGraph Agent Tool)
// ================================================================
// Purpose: Schedule proactive follow-ups, reminders, and check-ins with contractors
// Uses: contractor_followup_schedules table with AI personalization
// Context: Any time - proactive scheduling for contractor success
// ================================================================
// PHASE 3 DAY 4: AI Action Guards integrated for permission and rate limiting
// ================================================================

const { z } = require('zod');
const { tool } = require('@langchain/core/tools');
const { query } = require('../../../config/database');
const AIActionGuards = require('../../guards/aiActionGuards');
const GuardLogger = require('../../guards/guardLogger');

// Zod schema for input validation
// DATABASE VERIFIED: followup_type values from expanded CHECK constraint (October 13, 2025)
const ScheduleFollowupSchema = z.object({
  contractorId: z.number().int().positive().describe('The contractor ID'),
  scheduledTime: z.string().describe('ISO 8601 datetime when to send the follow-up'),  // DATABASE VERIFIED: scheduled_time
  followupType: z.enum([
    // ORIGINAL 5 TYPES
    'check_in',                // DATABASE VERIFIED: General check-in or goal progress review
    'reminder',                // DATABASE VERIFIED: Reminder about upcoming event, demo, or action
    'status_update',           // DATABASE VERIFIED: Update on contractor's progress or status
    'offer_help',              // DATABASE VERIFIED: Proactive offer of assistance
    'completion_confirmation', // DATABASE VERIFIED: Confirm completion of action or milestone

    // AI CONCIERGE EXPANSION (Phase 2)
    'event_recap',             // DATABASE VERIFIED: Post-event summary and key takeaways
    'post_event_survey',       // DATABASE VERIFIED: Request feedback after event
    'partner_introduction',    // DATABASE VERIFIED: Follow up on partner connection
    'resource_recommendation'  // DATABASE VERIFIED: Share recommended books, podcasts, events
  ]).describe('Type of follow-up'),  // DATABASE VERIFIED: followup_type
  messageTemplate: z.string().min(1).describe('The message template to send'),  // DATABASE VERIFIED: message_template
  eventId: z.number().int().positive().optional().describe('Event ID if event-related'),
  actionItemId: z.number().int().positive().optional().describe('Action item ID if related to specific action'),
  aiShouldPersonalize: z.boolean().default(true).describe('Whether AI should personalize the message before sending'),
  aiContextHints: z.record(z.any()).optional().describe('Additional context for AI personalization')
});

/**
 * Schedule Follow-up Tool Function
 * Called by LangGraph agent when scheduling proactive follow-ups
 */
const scheduleFollowupFunction = async ({
  contractorId,
  scheduledTime,
  followupType,
  messageTemplate,
  eventId,
  actionItemId,
  aiShouldPersonalize = true,
  aiContextHints
}) => {
  console.log(`[Schedule Follow-up Tool] Scheduling ${followupType} for contractor ${contractorId} at ${scheduledTime}`);

  try {
    // PHASE 3 DAY 4: GUARD CHECK 1 - Permission Check
    const permissionCheck = await AIActionGuards.canCreateActionItem(contractorId);
    await GuardLogger.logGuardCheck(contractorId, 'schedule_followup_permission', permissionCheck);

    if (!permissionCheck.allowed) {
      console.log(`[Schedule Follow-up Tool] ❌ Permission denied: ${permissionCheck.reason}`);
      return JSON.stringify({
        success: false,
        error: 'Permission denied',
        message: `Cannot schedule follow-up: ${permissionCheck.reason}`,
        guardBlocked: true,
        contractorId
      });
    }

    // PHASE 3 DAY 4: GUARD CHECK 2 - Rate Limit Check
    // Using 'action_item_create' rate limit (10 per hour) for follow-up schedules
    const rateLimitCheck = await AIActionGuards.checkRateLimit(contractorId, 'action_item_create');
    await GuardLogger.logGuardCheck(contractorId, 'schedule_followup_rate_limit', rateLimitCheck);

    if (!rateLimitCheck.allowed) {
      console.log(`[Schedule Follow-up Tool] ❌ Rate limit exceeded: ${rateLimitCheck.reason}`);
      return JSON.stringify({
        success: false,
        error: 'Rate limit exceeded',
        message: `Too many follow-ups scheduled recently. Try again in ${Math.ceil(rateLimitCheck.retryAfter / 60)} minutes.`,
        guardBlocked: true,
        retryAfter: rateLimitCheck.retryAfter,
        contractorId
      });
    }

    console.log(`[Schedule Follow-up Tool] ✅ All guards passed - proceeding with follow-up scheduling`);

    // ALL GUARDS PASSED - Proceed with validation and database operation
    // Validate scheduled time is in the future
    const scheduledDate = new Date(scheduledTime);
    const now = new Date();

    if (scheduledDate <= now) {
      console.warn(`[Schedule Follow-up Tool] Scheduled time is in the past, adjusting to +1 hour from now`);
      scheduledDate.setHours(now.getHours() + 1);
    }

    // Insert follow-up schedule using DATABASE VERIFIED field names
    const insertQuery = `
      INSERT INTO contractor_followup_schedules (
        contractor_id,
        action_item_id,
        event_id,
        scheduled_time,          -- DATABASE VERIFIED: scheduled_time
        followup_type,           -- DATABASE VERIFIED: followup_type
        message_template,        -- DATABASE VERIFIED: message_template
        status,
        ai_should_personalize,
        ai_context_hints,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, 'scheduled', $7, $8, NOW(), NOW())
      RETURNING id, scheduled_time
    `;

    const result = await query(insertQuery, [
      contractorId,
      actionItemId || null,
      eventId || null,
      scheduledDate.toISOString(),
      followupType,
      messageTemplate,
      aiShouldPersonalize,
      aiContextHints ? JSON.stringify(aiContextHints) : null
    ]);

    const followupId = result.rows[0].id;
    const scheduledTimeActual = result.rows[0].scheduled_time;

    console.log(`[Schedule Follow-up Tool] Follow-up scheduled successfully with ID: ${followupId}`);

    // Calculate time until follow-up
    const timeUntil = new Date(scheduledTimeActual) - now;
    const hoursUntil = Math.round(timeUntil / (1000 * 60 * 60));
    const daysUntil = Math.round(timeUntil / (1000 * 60 * 60 * 24));

    let timeDescription;
    if (daysUntil > 1) {
      timeDescription = `in ${daysUntil} days`;
    } else if (hoursUntil > 1) {
      timeDescription = `in ${hoursUntil} hours`;
    } else {
      timeDescription = 'soon';
    }

    // Log to ai_learning_events for continuous improvement
    await logLearningEvent({
      eventType: 'followup_scheduled',
      contractorId,
      eventId: eventId || null,
      context: `Scheduled ${followupType} follow-up ${timeDescription}`,
      actionTaken: 'schedule_followup',
      outcome: 'followup_scheduled',
      successScore: 1.0,
      learnedInsight: `Follow-up type: ${followupType}, scheduled for ${scheduledTimeActual}`,
      confidenceLevel: 0.9,
      relatedEntities: {
        followupId,
        followupType,
        scheduledTime: scheduledTimeActual,
        hoursUntil,
        aiShouldPersonalize
      }
    });

    return JSON.stringify({
      success: true,
      followupId,
      scheduledTime: scheduledTimeActual,
      followupType,
      timeDescription,
      aiShouldPersonalize,
      message: `Follow-up scheduled ${timeDescription}! I'll reach out then.`,
      eventId: eventId || null,
      contractorId
    });

  } catch (error) {
    console.error('[Schedule Follow-up Tool] Error:', error);

    // Log failed learning event
    await logLearningEvent({
      eventType: 'followup_scheduled',
      contractorId,
      eventId: eventId || null,
      context: `Attempted to schedule ${followupType} follow-up`,
      actionTaken: 'schedule_followup_failed',
      outcome: 'error',
      successScore: 0,
      learnedInsight: `Error: ${error.message}`,
      confidenceLevel: 0
    });

    return JSON.stringify({
      success: false,
      error: error.message,
      followupType,
      eventId: eventId || null,
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
const scheduleFollowupTool = tool(
  scheduleFollowupFunction,
  {
    name: 'schedule_followup',
    description: `Schedule proactive follow-ups, reminders, and check-ins with contractors.

Use this tool when:
- Contractor mentions they want a reminder about something
- After capturing an action item that needs follow-up
- Post-event to send recap or survey
- Proactive check-ins on contractor goals or progress
- Reminding about upcoming demos or meetings
- Following up on partner introductions

IMPORTANT: This is for SCHEDULED future communication, not immediate responses.
- Schedules message to be sent at specific time
- AI can personalize message before sending (if enabled)
- Integrates with existing follow-up automation system
- Tracks status (scheduled, sent, responded, cancelled, deferred)

Follow-up Types (DATABASE VERIFIED - 9 types):
- check_in: General check-in or goal progress review
- reminder: Reminder about upcoming event, demo, or action
- status_update: Update on contractor's progress or status
- offer_help: Proactive offer of assistance
- completion_confirmation: Confirm completion of action or milestone
- event_recap: Post-event summary and key takeaways
- post_event_survey: Request feedback after event (PowerConfidence)
- partner_introduction: Follow up on partner connection from contractor flow
- resource_recommendation: Share recommended books, podcasts, events

AI Personalization:
- If aiShouldPersonalize = true: AI will customize message based on context
- Can include aiContextHints for additional personalization data
- Message template serves as base, AI enhances with contractor-specific details

The tool automatically:
- Validates scheduled time is in future (adjusts if not)
- Links to event or action item if provided
- Calculates human-readable time description
- Sets status to 'scheduled'
- Logs to ai_learning_events

Returns: JSON with follow-up ID, scheduled time, and confirmation message.

Automatically logs to ai_learning_events for continuous improvement.`,
    schema: ScheduleFollowupSchema
  }
);

module.exports = scheduleFollowupTool;
