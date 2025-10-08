// DATABASE-CHECKED: contractor_followup_schedules (21 columns) verified on 2025-10-07

const { Queue } = require('bullmq');
const Redis = require('ioredis');

/**
 * Follow-Up Queue Configuration
 * Uses BullMQ for precise scheduling of contractor follow-ups
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

// Create the follow-up queue
const followUpQueue = new Queue('contractor-followups', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3, // Retry up to 3 times if job fails
    backoff: {
      type: 'exponential',
      delay: 5000 // Start with 5 second delay, doubles each retry
    },
    removeOnComplete: {
      count: 1000, // Keep last 1000 completed jobs for monitoring
      age: 24 * 3600 // Remove after 24 hours
    },
    removeOnFail: {
      count: 5000, // Keep last 5000 failed jobs for debugging
      age: 7 * 24 * 3600 // Remove after 7 days
    }
  }
});

/**
 * Schedule a follow-up to be sent at exact time
 * @param {Object} followUpData - Follow-up data from database
 * @returns {Object} - Bull job
 */
async function scheduleFollowUp(followUpData) {
  try {
    const {
      id,
      contractor_id,
      scheduled_time,
      followup_type,
      message_template,
      message_tone,
      action_item_id,
      event_id
    } = followUpData;

    console.log(`[FollowUpQueue] Scheduling follow-up ${id} for ${scheduled_time}`);

    // Calculate delay in milliseconds
    const scheduledDate = new Date(scheduled_time);
    const now = new Date();
    const delay = scheduledDate.getTime() - now.getTime();

    // If already past due, set delay to 0 (execute immediately)
    const actualDelay = Math.max(0, delay);

    // Add job to queue
    const job = await followUpQueue.add(
      'send-followup',
      {
        followup_id: id,
        contractor_id,
        followup_type,
        message_template,
        message_tone,
        action_item_id,
        event_id,
        scheduled_time: scheduledDate.toISOString()
      },
      {
        delay: actualDelay,
        jobId: `followup-${id}`, // Unique job ID prevents duplicates
        priority: followup_type === 'urgent' ? 1 : 10 // Urgent follow-ups get priority
      }
    );

    console.log(`[FollowUpQueue] ✅ Job ${job.id} scheduled for ${scheduledDate.toISOString()} (delay: ${actualDelay}ms)`);
    return job;

  } catch (error) {
    console.error('[FollowUpQueue] ❌ Error scheduling follow-up:', error);
    throw error;
  }
}

/**
 * Cancel a scheduled follow-up
 * @param {number} followup_id - Follow-up ID
 * @returns {boolean} - Success
 */
async function cancelFollowUp(followup_id) {
  try {
    const jobId = `followup-${followup_id}`;
    const job = await followUpQueue.getJob(jobId);

    if (job) {
      await job.remove();
      console.log(`[FollowUpQueue] ✅ Cancelled job ${jobId}`);
      return true;
    } else {
      console.log(`[FollowUpQueue] Job ${jobId} not found (may have already executed)`);
      return false;
    }

  } catch (error) {
    console.error('[FollowUpQueue] Error cancelling follow-up:', error);
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
      followUpQueue.getWaitingCount(),
      followUpQueue.getActiveCount(),
      followUpQueue.getCompletedCount(),
      followUpQueue.getFailedCount(),
      followUpQueue.getDelayedCount()
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
    console.error('[FollowUpQueue] Error getting stats:', error);
    throw error;
  }
}

/**
 * Get upcoming follow-ups (next 24 hours)
 * @returns {Array} - Array of upcoming jobs
 */
async function getUpcomingFollowUps() {
  try {
    const jobs = await followUpQueue.getJobs(['delayed', 'waiting'], 0, 100);

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
        followup_id: job.data.followup_id,
        contractor_id: job.data.contractor_id,
        scheduled_time: job.data.scheduled_time,
        followup_type: job.data.followup_type,
        state: job.getState()
      }));

    return upcoming;

  } catch (error) {
    console.error('[FollowUpQueue] Error getting upcoming follow-ups:', error);
    throw error;
  }
}

/**
 * Reschedule a follow-up to new time
 * @param {number} followup_id - Follow-up ID
 * @param {Date} new_scheduled_time - New scheduled time
 * @param {Object} updatedData - Updated follow-up data
 * @returns {Object} - New job
 */
async function rescheduleFollowUp(followup_id, new_scheduled_time, updatedData) {
  try {
    // Cancel existing job
    await cancelFollowUp(followup_id);

    // Schedule new job
    const job = await scheduleFollowUp({
      ...updatedData,
      id: followup_id,
      scheduled_time: new_scheduled_time
    });

    console.log(`[FollowUpQueue] ✅ Rescheduled follow-up ${followup_id} to ${new_scheduled_time}`);
    return job;

  } catch (error) {
    console.error('[FollowUpQueue] Error rescheduling follow-up:', error);
    throw error;
  }
}

// Queue event listeners for monitoring
followUpQueue.on('completed', (job) => {
  console.log(`[FollowUpQueue] ✅ Job ${job.id} completed successfully`);
});

followUpQueue.on('failed', (job, err) => {
  console.error(`[FollowUpQueue] ❌ Job ${job.id} failed:`, err.message);
});

followUpQueue.on('error', (err) => {
  console.error('[FollowUpQueue] Queue error:', err);
});

module.exports = {
  followUpQueue,
  scheduleFollowUp,
  cancelFollowUp,
  rescheduleFollowUp,
  getQueueStats,
  getUpcomingFollowUps
};
