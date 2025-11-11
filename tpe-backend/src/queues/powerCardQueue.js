/**
 * PowerCard Queue
 * Handles automated quarterly PowerCard campaign generation and notifications
 */

const { Queue } = require('bullmq');
const Redis = require('ioredis');

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

// Create the PowerCard queue
const powerCardQueue = new Queue('power-card', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3, // Retry twice if job fails (quarterly campaigns are important)
    backoff: {
      type: 'exponential',
      delay: 30000 // Start with 30 second delay
    },
    removeOnComplete: {
      count: 1000, // Keep last 1000 completed jobs
      age: 90 * 24 * 3600 // Remove after 90 days (1 quarter)
    },
    removeOnFail: {
      count: 500, // Keep last 500 failed jobs
      age: 30 * 24 * 3600 // Remove after 30 days
    }
  }
});

/**
 * Initialize quarterly PowerCard automation
 * Runs on the 1st day of each quarter (Jan 1, Apr 1, Jul 1, Oct 1) at 9:00 AM
 * @returns {Object} - Job info
 */
async function initializeQuarterlyPowerCardScheduler() {
  try {
    console.log('[PowerCardQueue] Initializing quarterly PowerCard scheduler...');

    // Add repeatable job that runs quarterly
    // Cron: "0 9 1 1,4,7,10 *" = 9:00 AM on 1st of Jan, Apr, Jul, Oct
    const job = await powerCardQueue.add(
      'generate-quarterly-campaigns',
      {}, // No data needed
      {
        repeat: {
          pattern: '0 9 1 1,4,7,10 *', // 9 AM on first day of each quarter
          immediately: false // Don't run on startup
        },
        jobId: 'quarterly-powercard-generator', // Unique job ID
        priority: 2 // High priority
      }
    );

    console.log('[PowerCardQueue] ✅ Quarterly PowerCard scheduler initialized - runs quarterly at 9 AM');
    return job;

  } catch (error) {
    console.error('[PowerCardQueue] ❌ Error initializing quarterly scheduler:', error);
    throw error;
  }
}

/**
 * Manually trigger quarterly campaign generation for all active partners
 * @returns {Object} - Bull job
 */
async function triggerQuarterlyCampaigns() {
  try {
    console.log('[PowerCardQueue] Manually triggering quarterly campaign generation...');

    const job = await powerCardQueue.add(
      'generate-quarterly-campaigns',
      {
        manual_trigger: true,
        triggered_at: new Date().toISOString()
      },
      {
        priority: 1, // Highest priority for manual triggers
        jobId: `manual-quarterly-${Date.now()}` // Unique ID with timestamp
      }
    );

    console.log('[PowerCardQueue] ✅ Manual quarterly campaign generation queued');
    return job;

  } catch (error) {
    console.error('[PowerCardQueue] ❌ Error triggering quarterly campaigns:', error);
    throw error;
  }
}

/**
 * Schedule campaign notification sending for a specific campaign
 * @param {number} campaignId - Campaign ID
 * @param {number} partnerId - Partner ID
 * @param {Date} sendTime - When to send notifications (optional, default: immediate)
 * @returns {Object} - Bull job
 */
async function scheduleCampaignNotifications(campaignId, partnerId, sendTime = null) {
  try {
    console.log(`[PowerCardQueue] Scheduling notifications for campaign ${campaignId}...`);

    // Calculate delay if sendTime provided
    let delay = 0;
    if (sendTime) {
      const now = new Date();
      delay = Math.max(0, sendTime.getTime() - now.getTime());
    }

    const job = await powerCardQueue.add(
      'send-campaign-notifications',
      {
        campaign_id: campaignId,
        partner_id: partnerId,
        scheduled_time: sendTime ? sendTime.toISOString() : new Date().toISOString()
      },
      {
        delay,
        jobId: `notifications-${campaignId}`, // Unique job ID prevents duplicates
        priority: 3 // Medium-high priority
      }
    );

    const delayMsg = delay > 0 ? ` (delay: ${delay}ms)` : ' (immediate)';
    console.log(`[PowerCardQueue] ✅ Campaign notifications scheduled${delayMsg}`);
    return job;

  } catch (error) {
    console.error('[PowerCardQueue] ❌ Error scheduling campaign notifications:', error);
    throw error;
  }
}

/**
 * Cancel scheduled campaign notifications
 * @param {number} campaignId - Campaign ID
 * @returns {boolean} - Success
 */
async function cancelCampaignNotifications(campaignId) {
  try {
    const jobId = `notifications-${campaignId}`;
    const job = await powerCardQueue.getJob(jobId);

    if (job) {
      await job.remove();
      console.log(`[PowerCardQueue] ✅ Cancelled notifications for campaign ${campaignId}`);
      return true;
    } else {
      console.log(`[PowerCardQueue] Job ${jobId} not found (may have already executed)`);
      return false;
    }

  } catch (error) {
    console.error('[PowerCardQueue] Error cancelling job:', error);
    throw error;
  }
}

/**
 * Get queue statistics
 * @returns {Object} - Queue stats
 */
async function getPowerCardQueueStats() {
  try {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      powerCardQueue.getWaitingCount(),
      powerCardQueue.getActiveCount(),
      powerCardQueue.getCompletedCount(),
      powerCardQueue.getFailedCount(),
      powerCardQueue.getDelayedCount()
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
    console.error('[PowerCardQueue] Error getting stats:', error);
    throw error;
  }
}

/**
 * Get repeatable jobs info (for monitoring)
 * @returns {Array} - Repeatable jobs
 */
async function getRepeatableJobs() {
  try {
    const repeatableJobs = await powerCardQueue.getRepeatableJobs();
    return repeatableJobs;
  } catch (error) {
    console.error('[PowerCardQueue] Error getting repeatable jobs:', error);
    throw error;
  }
}

// Queue event listeners
powerCardQueue.on('completed', (job) => {
  console.log(`[PowerCardQueue] ✅ Job ${job.id} completed successfully`);
});

powerCardQueue.on('failed', (job, err) => {
  console.error(`[PowerCardQueue] ❌ Job ${job.id} failed:`, err.message);
});

powerCardQueue.on('error', (err) => {
  console.error('[PowerCardQueue] Queue error:', err);
});

console.log('[PowerCardQueue] 🚀 PowerCard Queue initialized');

module.exports = {
  powerCardQueue,
  initializeQuarterlyPowerCardScheduler,
  triggerQuarterlyCampaigns,
  scheduleCampaignNotifications,
  cancelCampaignNotifications,
  getPowerCardQueueStats,
  getRepeatableJobs
};
