// DATABASE-CHECKED: contractor_followup_schedules (21 columns) verified on 2025-10-07
// DATABASE-CHECKED: contractors (phone, first_name, last_name, email) verified on 2025-10-07

const { Worker } = require('bullmq');
const Redis = require('ioredis');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const proactiveSchedulerService = require('../services/proactiveSchedulerService');
const followUpService = require('../services/followUpService');
const { query } = require('../config/database');

/**
 * Bull Worker for Follow-Up Processing
 * Processes scheduled follow-ups at their exact scheduled time
 */

// Redis connection for worker
const connection = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null,
  enableReadyCheck: false
});

// Process function - executes when job is due
async function processFollowUp(job) {
  const { followup_id, contractor_id, followup_type, scheduled_time } = job.data;

  console.log(`[FollowUpWorker] 🚀 Processing follow-up ${followup_id} for contractor ${contractor_id}`);
  console.log(`[FollowUpWorker] Scheduled time: ${scheduled_time}, Actual time: ${new Date().toISOString()}`);

  try {
    // Get full follow-up data from database
    const followUpResult = await query(`
      SELECT
        fs.*,
        c.phone,
        c.first_name,
        c.last_name,
        c.email,
        ai.title as action_item_title,
        ai.status as action_item_status,
        ai.completed_at as action_item_completed_at
      FROM contractor_followup_schedules fs
      INNER JOIN contractors c ON fs.contractor_id = c.id
      LEFT JOIN contractor_action_items ai ON fs.action_item_id = ai.id
      WHERE fs.id = $1
    `, [followup_id]);

    if (followUpResult.rows.length === 0) {
      console.error(`[FollowUpWorker] ❌ Follow-up ${followup_id} not found in database`);
      return { success: false, error: 'Follow-up not found' };
    }

    const followUp = followUpResult.rows[0];

    // Check if already sent
    if (followUp.status === 'sent') {
      console.log(`[FollowUpWorker] ⏭️ Follow-up ${followup_id} already sent, skipping`);
      return { success: true, skipped: true, reason: 'already_sent' };
    }

    // Check if cancelled
    if (followUp.status === 'cancelled') {
      console.log(`[FollowUpWorker] ⏭️ Follow-up ${followup_id} cancelled, skipping`);
      return { success: true, skipped: true, reason: 'cancelled' };
    }

    // Check if should skip due to completed action item
    if (followUp.skip_if_completed && followUp.action_item_status === 'completed') {
      console.log(`[FollowUpWorker] ⏭️ Skipping follow-up ${followup_id} - action item completed`);

      // Mark as cancelled with reason
      await query(`
        UPDATE contractor_followup_schedules
        SET status = 'cancelled',
            updated_at = NOW()
        WHERE id = $1
      `, [followup_id]);

      return { success: true, skipped: true, reason: 'action_item_completed' };
    }

    // Build contractor object
    const contractor = {
      id: followUp.contractor_id,
      phone: followUp.phone,
      first_name: followUp.first_name,
      last_name: followUp.last_name,
      email: followUp.email
    };

    // Personalize message if needed
    const message = await proactiveSchedulerService.personalizeMessage(followUp, contractor);

    // Send the message
    const sendResult = await proactiveSchedulerService.sendFollowUpMessage(followUp, message);

    if (sendResult.success) {
      // Mark as sent
      await followUpService.markFollowUpSent(followup_id, 'bull_worker');

      console.log(`[FollowUpWorker] ✅ Follow-up ${followup_id} processed successfully`);

      return {
        success: true,
        followup_id,
        contractor_id,
        message_sent: message,
        sent_at: new Date().toISOString()
      };
    } else {
      console.error(`[FollowUpWorker] ❌ Failed to send follow-up ${followup_id}:`, sendResult.error);
      throw new Error(sendResult.error);
    }

  } catch (error) {
    console.error(`[FollowUpWorker] ❌ Error processing follow-up ${followup_id}:`, error);
    throw error; // Bull will retry
  }
}

// Create the worker
const worker = new Worker(
  'contractor-followups',
  processFollowUp,
  {
    connection,
    concurrency: 5, // Process up to 5 follow-ups simultaneously
    limiter: {
      max: 10, // Max 10 jobs per minute (to respect SMS rate limits)
      duration: 60000
    }
  }
);

// Worker event listeners
worker.on('completed', (job, result) => {
  if (result.skipped) {
    console.log(`[FollowUpWorker] ⏭️ Job ${job.id} skipped:`, result.reason);
  } else {
    console.log(`[FollowUpWorker] ✅ Job ${job.id} completed successfully`);
  }
});

worker.on('failed', (job, err) => {
  console.error(`[FollowUpWorker] ❌ Job ${job.id} failed after ${job.attemptsMade} attempts:`, err.message);

  // If all retries exhausted, log to error tracking
  if (job.attemptsMade >= job.opts.attempts) {
    console.error(`[FollowUpWorker] 🔴 Job ${job.id} PERMANENTLY FAILED - manual intervention required`);
  }
});

worker.on('error', (err) => {
  console.error('[FollowUpWorker] Worker error:', err);
});

worker.on('ready', () => {
  console.log('[FollowUpWorker] ✅ Worker ready and listening for jobs');
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('[FollowUpWorker] Received SIGTERM, closing worker...');
  await worker.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('[FollowUpWorker] Received SIGINT, closing worker...');
  await worker.close();
  process.exit(0);
});

console.log('[FollowUpWorker] 🚀 Follow-Up Worker started');
console.log('[FollowUpWorker] Redis:', process.env.REDIS_HOST || 'localhost');
console.log('[FollowUpWorker] Concurrency: 5');
console.log('[FollowUpWorker] Rate limit: 10 jobs/minute');

module.exports = worker;
