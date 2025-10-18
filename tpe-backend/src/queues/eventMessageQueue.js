// DATABASE-CHECKED: event_messages (28 columns) verified on 2025-10-17
// Fields: id, event_id, contractor_id, message_type, message_category, scheduled_time,
//         actual_send_time, message_content, personalization_data, response_received,
//         response_time, sentiment_score, pcr_score, action_taken, delay_minutes, status,
//         error_message, created_at, updated_at, ghl_contact_id, ghl_message_id, phone,
//         direction, ghl_location_id, channel, from_email, to_email, subject

const { Queue } = require('bullmq');
const Redis = require('ioredis');

/**
 * Event Message Queue Configuration
 * Uses BullMQ for precise scheduling of event orchestration messages
 * Handles: check-in reminders, speaker alerts, sponsor recommendations, PCR requests, wrap-ups
 */

// Redis connection configuration
const redisConnection = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null, // Required for BullMQ
  enableReadyCheck: false,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  }
});

// Create the event message queue
const eventMessageQueue = new Queue('event-messages', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3, // Retry up to 3 times if job fails
    backoff: {
      type: 'exponential',
      delay: 5000 // Start with 5 second delay, doubles each retry
    },
    removeOnComplete: {
      count: 2000, // Keep last 2000 completed jobs for monitoring
      age: 48 * 3600 // Remove after 48 hours
    },
    removeOnFail: {
      count: 5000, // Keep last 5000 failed jobs for debugging
      age: 7 * 24 * 3600 // Remove after 7 days
    }
  }
});

/**
 * Schedule an event message to be sent at exact time
 * @param {Object} messageData - Message data from database (using EXACT field names)
 * @returns {Object} - Bull job
 */
async function scheduleEventMessage(messageData) {
  try {
    const {
      id,
      event_id,
      contractor_id,
      message_type,
      message_category,
      scheduled_time,
      message_content,
      personalization_data,
      phone,
      ghl_contact_id,
      ghl_location_id
    } = messageData;

    console.log(`[EventMessageQueue] Scheduling message ${id} (${message_type}) for ${scheduled_time}`);

    // Calculate delay in milliseconds
    const scheduledDate = new Date(scheduled_time);
    const now = new Date();
    const delay = scheduledDate.getTime() - now.getTime();

    // If already past due, set delay to 0 (execute immediately)
    const actualDelay = Math.max(0, delay);

    // Determine priority based on message type
    let priority = 10; // Default
    if (message_type === 'check_in_reminder_event_start') priority = 1; // Highest
    else if (message_type === 'speaker_alert') priority = 2;
    else if (message_type === 'check_in_reminder_1_hour') priority = 3;
    else if (message_type === 'sponsor_recommendation') priority = 5;
    else if (message_type === 'pcr_request') priority = 7;
    else if (message_type === 'check_in_reminder_night_before') priority = 8;

    // Add job to queue
    const job = await eventMessageQueue.add(
      'send-event-message',
      {
        message_id: id,
        event_id,
        contractor_id,
        message_type,
        message_category,
        message_content,
        personalization_data,
        phone,
        ghl_contact_id,
        ghl_location_id,
        scheduled_time: scheduledDate.toISOString()
      },
      {
        delay: actualDelay,
        jobId: `event-message-${id}`, // Unique job ID prevents duplicates
        priority
      }
    );

    console.log(`[EventMessageQueue] ✅ Job ${job.id} scheduled for ${scheduledDate.toISOString()} (delay: ${actualDelay}ms, priority: ${priority})`);
    return job;

  } catch (error) {
    console.error('[EventMessageQueue] ❌ Error scheduling message:', error);
    throw error;
  }
}

/**
 * Cancel a scheduled event message
 * @param {number} message_id - Event message ID
 * @returns {boolean} - Success
 */
async function cancelEventMessage(message_id) {
  try {
    const jobId = `event-message-${message_id}`;
    const job = await eventMessageQueue.getJob(jobId);

    if (job) {
      await job.remove();
      console.log(`[EventMessageQueue] ✅ Cancelled job ${jobId}`);
      return true;
    } else {
      console.log(`[EventMessageQueue] Job ${jobId} not found (may have already executed)`);
      return false;
    }

  } catch (error) {
    console.error('[EventMessageQueue] Error cancelling message:', error);
    throw error;
  }
}

/**
 * Reschedule an event message to new time
 * @param {number} message_id - Event message ID
 * @param {Date} new_scheduled_time - New scheduled time
 * @param {Object} updatedData - Updated message data
 * @returns {Object} - New job
 */
async function rescheduleEventMessage(message_id, new_scheduled_time, updatedData) {
  try {
    // Cancel existing job
    await cancelEventMessage(message_id);

    // Schedule new job
    const job = await scheduleEventMessage({
      ...updatedData,
      id: message_id,
      scheduled_time: new_scheduled_time
    });

    console.log(`[EventMessageQueue] ✅ Rescheduled message ${message_id} to ${new_scheduled_time}`);
    return job;

  } catch (error) {
    console.error('[EventMessageQueue] Error rescheduling message:', error);
    throw error;
  }
}

/**
 * Schedule multiple messages in bulk (efficient batch scheduling)
 * @param {Array} messagesData - Array of message data objects
 * @returns {Array} - Array of scheduled jobs
 */
async function scheduleBulkEventMessages(messagesData) {
  try {
    console.log(`[EventMessageQueue] Scheduling ${messagesData.length} messages in bulk...`);

    const jobs = await Promise.all(
      messagesData.map(messageData => scheduleEventMessage(messageData))
    );

    console.log(`[EventMessageQueue] ✅ Bulk scheduled ${jobs.length} messages`);
    return jobs;

  } catch (error) {
    console.error('[EventMessageQueue] Error in bulk scheduling:', error);
    throw error;
  }
}

/**
 * Get queue statistics
 * @returns {Object} - Queue stats
 */
async function getQueueStats() {
  try {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      eventMessageQueue.getWaitingCount(),
      eventMessageQueue.getActiveCount(),
      eventMessageQueue.getCompletedCount(),
      eventMessageQueue.getFailedCount(),
      eventMessageQueue.getDelayedCount()
    ]);

    return {
      waiting,
      active,
      completed,
      failed,
      delayed,
      total: waiting + active + delayed
    };

  } catch (error) {
    console.error('[EventMessageQueue] Error getting stats:', error);
    throw error;
  }
}

/**
 * Get upcoming messages (next 24 hours)
 * @returns {Array} - Array of upcoming jobs
 */
async function getUpcomingMessages() {
  try {
    const jobs = await eventMessageQueue.getJobs(['delayed', 'waiting'], 0, 100);

    // Filter to next 24 hours and sort by scheduled time
    const now = Date.now();
    const next24Hours = now + (24 * 60 * 60 * 1000);

    const upcoming = jobs
      .filter(job => {
        const scheduledTime = new Date(job.data.scheduled_time).getTime();
        return scheduledTime <= next24Hours;
      })
      .sort((a, b) => {
        const aTime = new Date(a.data.scheduled_time).getTime();
        const bTime = new Date(b.data.scheduled_time).getTime();
        return aTime - bTime;
      })
      .map(job => ({
        job_id: job.id,
        message_id: job.data.message_id,
        event_id: job.data.event_id,
        contractor_id: job.data.contractor_id,
        message_type: job.data.message_type,
        scheduled_time: job.data.scheduled_time,
        priority: job.opts.priority,
        state: job.getState()
      }));

    return upcoming;

  } catch (error) {
    console.error('[EventMessageQueue] Error getting upcoming messages:', error);
    throw error;
  }
}

/**
 * Clear all scheduled messages for an event (for rescheduling)
 * @param {number} event_id - Event ID
 * @returns {number} - Count of cancelled jobs
 */
async function clearEventMessages(event_id) {
  try {
    console.log(`[EventMessageQueue] Clearing all messages for event ${event_id}...`);

    const jobs = await eventMessageQueue.getJobs(['delayed', 'waiting']);
    const eventJobs = jobs.filter(job => job.data.event_id === event_id);

    await Promise.all(eventJobs.map(job => job.remove()));

    console.log(`[EventMessageQueue] ✅ Cleared ${eventJobs.length} messages for event ${event_id}`);
    return eventJobs.length;

  } catch (error) {
    console.error('[EventMessageQueue] Error clearing event messages:', error);
    throw error;
  }
}

/**
 * Clear all scheduled messages for a contractor (for cancellation)
 * @param {number} event_id - Event ID
 * @param {number} contractor_id - Contractor ID
 * @returns {number} - Count of cancelled jobs
 */
async function clearContractorMessages(event_id, contractor_id) {
  try {
    console.log(`[EventMessageQueue] Clearing messages for contractor ${contractor_id} at event ${event_id}...`);

    const jobs = await eventMessageQueue.getJobs(['delayed', 'waiting']);
    const contractorJobs = jobs.filter(job =>
      job.data.event_id === event_id && job.data.contractor_id === contractor_id
    );

    await Promise.all(contractorJobs.map(job => job.remove()));

    console.log(`[EventMessageQueue] ✅ Cleared ${contractorJobs.length} messages for contractor ${contractor_id}`);
    return contractorJobs.length;

  } catch (error) {
    console.error('[EventMessageQueue] Error clearing contractor messages:', error);
    throw error;
  }
}

// Queue event listeners for monitoring
eventMessageQueue.on('completed', (job) => {
  console.log(`[EventMessageQueue] ✅ Job ${job.id} completed successfully`);
});

eventMessageQueue.on('failed', (job, err) => {
  console.error(`[EventMessageQueue] ❌ Job ${job.id} failed:`, err.message);
});

eventMessageQueue.on('error', (err) => {
  console.error('[EventMessageQueue] Queue error:', err);
});

// Log queue ready
console.log('[EventMessageQueue] 🚀 Event Message Queue initialized');

module.exports = {
  eventMessageQueue,
  scheduleEventMessage,
  scheduleBulkEventMessages,
  cancelEventMessage,
  rescheduleEventMessage,
  clearEventMessages,
  clearContractorMessages,
  getQueueStats,
  getUpcomingMessages
};
