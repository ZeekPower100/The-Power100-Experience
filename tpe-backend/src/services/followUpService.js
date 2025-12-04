// DATABASE-CHECKED: contractor_followup_schedules (21 columns) verified on 2025-10-07
// Columns: id, contractor_id, action_item_id, event_id, scheduled_time, followup_type,
// message_template, message_tone, status, sent_at, response_received_at, response_text,
// ai_should_personalize, ai_context_hints, skip_if_completed, is_recurring,
// recurrence_interval_days, next_occurrence_id, created_at, updated_at, sent_by

const { query } = require('../config/database');
const { safeJsonStringify } = require('../utils/jsonHelpers');
const { scheduleFollowUp: enqueueBullJob, cancelFollowUp: cancelBullJob } = require('../queues/followUpQueue');
const optimalTimingService = require('./optimalTimingService');

/**
 * Follow-Up Service
 * Handles scheduling and managing automated contractor follow-ups
 */

/**
 * Schedule a follow-up for contractor
 * @param {Object} params - Follow-up parameters
 * @param {boolean} params.use_optimal_timing - Use ML-based optimal timing (for AI Concierge messages only)
 * @returns {Object} - Created follow-up schedule
 */
async function scheduleFollowUp({
  contractor_id,
  action_item_id = null,
  event_id = null,
  scheduled_time,
  followup_type,
  message_template,
  message_tone = 'friendly',
  ai_context_hints = {},
  ai_should_personalize = true,
  skip_if_completed = true,
  is_recurring = false,
  recurrence_interval_days = null,
  use_optimal_timing = false
}) {
  try {
    let finalScheduledTime = scheduled_time;
    let timingPrediction = null;

    // Use ML-based optimal timing if requested and no specific time provided
    // NOTE: Only for AI Concierge proactive messages, NOT for PowerCards or Event messaging
    if (use_optimal_timing && !scheduled_time) {
      console.log('[FollowUpService] Using ML optimal timing for contractor', contractor_id);
      try {
        const optimalSlot = await optimalTimingService.calculateNextOptimalSlot(contractor_id, followup_type);
        finalScheduledTime = optimalSlot.scheduledTime;
        timingPrediction = optimalSlot.prediction;
        console.log(`[FollowUpService] ML predicted optimal time: ${finalScheduledTime.toISOString()} (confidence: ${timingPrediction.confidence})`);
      } catch (timingError) {
        console.error('[FollowUpService] Optimal timing failed, using fallback:', timingError.message);
        // Fallback: schedule for tomorrow at 10 AM
        finalScheduledTime = new Date();
        finalScheduledTime.setDate(finalScheduledTime.getDate() + 1);
        finalScheduledTime.setHours(10, 0, 0, 0);
      }
    }

    // Store timing prediction in context hints if ML was used
    let finalContextHints = ai_context_hints;
    if (timingPrediction) {
      finalContextHints = {
        ...ai_context_hints,
        ml_timing: {
          predicted_hour: timingPrediction.hour,
          confidence: timingPrediction.confidence,
          source: timingPrediction.source
        }
      };
    }

    console.log('[FollowUpService] Scheduling follow-up for contractor', contractor_id, 'at', finalScheduledTime);

    const result = await query(`
      INSERT INTO contractor_followup_schedules (
        contractor_id, action_item_id, event_id,
        scheduled_time, followup_type, message_template, message_tone,
        ai_context_hints, ai_should_personalize, status,
        skip_if_completed, is_recurring, recurrence_interval_days,
        created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, 'scheduled',
        $10, $11, $12, NOW(), NOW()
      )
      RETURNING *
    `, [
      contractor_id, action_item_id, event_id,
      finalScheduledTime, followup_type, message_template, message_tone,
      safeJsonStringify(finalContextHints), ai_should_personalize,
      skip_if_completed, is_recurring, recurrence_interval_days
    ]);

    const followUp = result.rows[0];
    console.log('[FollowUpService] ✅ Follow-up scheduled in DB:', followUp.id);

    // Add to Bull queue for precise execution
    try {
      await enqueueBullJob(followUp);
      console.log('[FollowUpService] ✅ Follow-up queued in Bull:', followUp.id);
    } catch (queueError) {
      console.error('[FollowUpService] ⚠️ Failed to queue in Bull (DB record exists):', queueError);
      // Don't throw - DB record is created, queue can be added manually if needed
    }

    return followUp;

  } catch (error) {
    console.error('[FollowUpService] ❌ Error scheduling follow-up:', error);
    throw error;
  }
}

/**
 * Get pending follow-ups due now or in the past
 * @param {number} limit - Max results to return
 * @returns {Array} - Array of pending follow-ups
 */
async function getPendingFollowUps(limit = 50) {
  try {
    const result = await query(`
      SELECT fs.*,
             ai.title as action_item_title,
             ai.status as action_item_status
      FROM contractor_followup_schedules fs
      LEFT JOIN contractor_action_items ai ON fs.action_item_id = ai.id
      WHERE fs.status = 'scheduled'
        AND fs.scheduled_time <= NOW()
        AND (
          fs.skip_if_completed = false
          OR ai.status IS NULL
          OR ai.status != 'completed'
        )
      ORDER BY fs.scheduled_time ASC
      LIMIT $1
    `, [limit]);

    return result.rows;

  } catch (error) {
    console.error('[FollowUpService] Error getting pending follow-ups:', error);
    throw error;
  }
}

/**
 * Mark follow-up as sent
 * @param {number} followup_id - Follow-up ID
 * @param {string} sent_by - Who/what sent it (ai_concierge, scheduler, manual_admin)
 * @returns {Object} - Updated follow-up
 */
async function markFollowUpSent(followup_id, sent_by = 'ai_concierge') {
  try {
    console.log('[FollowUpService] Marking follow-up', followup_id, 'as sent by', sent_by);

    const result = await query(`
      UPDATE contractor_followup_schedules
      SET status = 'sent',
          sent_at = NOW(),
          sent_by = $1,
          updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `, [sent_by, followup_id]);

    // If recurring, schedule next occurrence
    const followUp = result.rows[0];
    if (followUp.is_recurring && followUp.recurrence_interval_days) {
      const nextTime = new Date(followUp.scheduled_time);
      nextTime.setDate(nextTime.getDate() + followUp.recurrence_interval_days);

      // Create new follow-up for next recurrence
      const nextFollowUp = await scheduleFollowUp({
        contractor_id: followUp.contractor_id,
        action_item_id: followUp.action_item_id,
        event_id: followUp.event_id,
        scheduled_time: nextTime,
        followup_type: followUp.followup_type,
        message_template: followUp.message_template,
        message_tone: followUp.message_tone,
        ai_context_hints: followUp.ai_context_hints,
        ai_should_personalize: followUp.ai_should_personalize,
        skip_if_completed: followUp.skip_if_completed,
        is_recurring: true,
        recurrence_interval_days: followUp.recurrence_interval_days
      });

      // Link the recurrence
      await query(`
        UPDATE contractor_followup_schedules
        SET next_occurrence_id = $1,
            updated_at = NOW()
        WHERE id = $2
      `, [nextFollowUp.id, followup_id]);

      console.log('[FollowUpService] ✅ Recurring follow-up created for', nextTime);
    }

    console.log('[FollowUpService] ✅ Follow-up marked as sent');
    return result.rows[0];

  } catch (error) {
    console.error('[FollowUpService] ❌ Error marking follow-up sent:', error);
    throw error;
  }
}

/**
 * Record contractor response to follow-up
 * @param {number} followup_id - Follow-up ID
 * @param {string} response_text - Contractor's response
 * @returns {Object} - Updated follow-up
 */
async function recordFollowUpResponse(followup_id, response_text) {
  try {
    const result = await query(`
      UPDATE contractor_followup_schedules
      SET response_text = $1,
          response_received_at = NOW(),
          updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `, [response_text, followup_id]);

    console.log('[FollowUpService] ✅ Response recorded for follow-up', followup_id);
    return result.rows[0];

  } catch (error) {
    console.error('[FollowUpService] Error recording response:', error);
    throw error;
  }
}

/**
 * Get all follow-ups for contractor
 * @param {number} contractor_id - Contractor ID
 * @param {string} status - Optional status filter
 * @returns {Array} - Array of follow-ups
 */
async function getContractorFollowUps(contractor_id, status = null) {
  try {
    let sql = `
      SELECT * FROM contractor_followup_schedules
      WHERE contractor_id = $1
    `;
    const params = [contractor_id];

    if (status) {
      sql += ` AND status = $2`;
      params.push(status);
    }

    sql += ` ORDER BY scheduled_time DESC`;

    const result = await query(sql, params);
    return result.rows;

  } catch (error) {
    console.error('[FollowUpService] Error getting contractor follow-ups:', error);
    throw error;
  }
}

/**
 * Cancel/delete a scheduled follow-up
 * @param {number} followup_id - Follow-up ID
 * @returns {Object} - Updated follow-up
 */
async function cancelFollowUp(followup_id) {
  try {
    const result = await query(`
      UPDATE contractor_followup_schedules
      SET status = 'cancelled',
          updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `, [followup_id]);

    console.log('[FollowUpService] ✅ Follow-up cancelled in DB:', followup_id);

    // Cancel Bull job
    try {
      await cancelBullJob(followup_id);
      console.log('[FollowUpService] ✅ Follow-up removed from Bull queue:', followup_id);
    } catch (queueError) {
      console.error('[FollowUpService] ⚠️ Failed to cancel Bull job:', queueError);
      // Don't throw - DB update succeeded
    }

    return result.rows[0];

  } catch (error) {
    console.error('[FollowUpService] Error cancelling follow-up:', error);
    throw error;
  }
}

module.exports = {
  scheduleFollowUp,
  getPendingFollowUps,
  markFollowUpSent,
  recordFollowUpResponse,
  getContractorFollowUps,
  cancelFollowUp
};
