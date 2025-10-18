/**
 * Event Orchestration Queue
 * Handles event automation tasks like batch peer matching
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

// Create the event orchestration queue
const eventOrchestrationQueue = new Queue('event-orchestration', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 2, // Retry once if job fails
    backoff: {
      type: 'exponential',
      delay: 10000 // Start with 10 second delay
    },
    removeOnComplete: {
      count: 500, // Keep last 500 completed jobs
      age: 72 * 3600 // Remove after 72 hours
    },
    removeOnFail: {
      count: 1000, // Keep last 1000 failed jobs
      age: 7 * 24 * 3600 // Remove after 7 days
    }
  }
});

/**
 * Schedule batch peer matching for an event
 * @param {number} eventId - Event ID
 * @param {Date} matchingTime - When to run peer matching
 * @returns {Object} - Bull job
 */
async function scheduleBatchPeerMatchingJob(eventId, matchingTime) {
  try {
    console.log(`[EventOrchestrationQueue] Scheduling batch peer matching for event ${eventId} at ${matchingTime.toISOString()}`);

    // Calculate delay in milliseconds
    const now = new Date();
    const delay = matchingTime.getTime() - now.getTime();

    // If already past due, set delay to 0 (execute immediately)
    const actualDelay = Math.max(0, delay);

    // Add job to queue
    const job = await eventOrchestrationQueue.add(
      'batch-peer-matching',
      {
        event_id: eventId,
        scheduled_time: matchingTime.toISOString()
      },
      {
        delay: actualDelay,
        jobId: `batch-peer-matching-${eventId}`, // Unique job ID prevents duplicates
        priority: 5 // Medium priority
      }
    );

    console.log(`[EventOrchestrationQueue] ✅ Batch peer matching job scheduled for ${matchingTime.toISOString()} (delay: ${actualDelay}ms)`);
    return job;

  } catch (error) {
    console.error('[EventOrchestrationQueue] ❌ Error scheduling batch peer matching:', error);
    throw error;
  }
}

/**
 * Cancel a scheduled batch peer matching job
 * @param {number} eventId - Event ID
 * @returns {boolean} - Success
 */
async function cancelBatchPeerMatchingJob(eventId) {
  try {
    const jobId = `batch-peer-matching-${eventId}`;
    const job = await eventOrchestrationQueue.getJob(jobId);

    if (job) {
      await job.remove();
      console.log(`[EventOrchestrationQueue] ✅ Cancelled batch peer matching job for event ${eventId}`);
      return true;
    } else {
      console.log(`[EventOrchestrationQueue] Job ${jobId} not found (may have already executed)`);
      return false;
    }

  } catch (error) {
    console.error('[EventOrchestrationQueue] Error cancelling job:', error);
    throw error;
  }
}

/**
 * Initialize repeatable job for processing scheduled messages every minute
 * This is the CRITICAL automation that makes all scheduled messages send!
 * @returns {Object} - Job info
 */
async function initializeScheduledMessageProcessor() {
  try {
    console.log('[EventOrchestrationQueue] Initializing scheduled message processor (every 1 minute)...');

    // Add repeatable job that runs every minute
    const job = await eventOrchestrationQueue.add(
      'process-scheduled-messages',
      {}, // No data needed
      {
        repeat: {
          every: 60000, // Run every 60 seconds (1 minute)
          immediately: true // Start immediately on server start
        },
        jobId: 'scheduled-message-processor', // Unique job ID
        priority: 1 // Highest priority
      }
    );

    console.log('[EventOrchestrationQueue] ✅ Scheduled message processor initialized - runs every 1 minute');
    return job;

  } catch (error) {
    console.error('[EventOrchestrationQueue] ❌ Error initializing scheduled message processor:', error);
    throw error;
  }
}

/**
 * Get queue statistics
 * @returns {Object} - Queue stats
 */
async function getOrchestrationQueueStats() {
  try {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      eventOrchestrationQueue.getWaitingCount(),
      eventOrchestrationQueue.getActiveCount(),
      eventOrchestrationQueue.getCompletedCount(),
      eventOrchestrationQueue.getFailedCount(),
      eventOrchestrationQueue.getDelayedCount()
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
    console.error('[EventOrchestrationQueue] Error getting stats:', error);
    throw error;
  }
}

// Queue event listeners
eventOrchestrationQueue.on('completed', (job) => {
  console.log(`[EventOrchestrationQueue] ✅ Job ${job.id} completed successfully`);
});

eventOrchestrationQueue.on('failed', (job, err) => {
  console.error(`[EventOrchestrationQueue] ❌ Job ${job.id} failed:`, err.message);
});

eventOrchestrationQueue.on('error', (err) => {
  console.error('[EventOrchestrationQueue] Queue error:', err);
});

console.log('[EventOrchestrationQueue] 🚀 Event Orchestration Queue initialized');

module.exports = {
  eventOrchestrationQueue,
  scheduleBatchPeerMatchingJob,
  cancelBatchPeerMatchingJob,
  initializeScheduledMessageProcessor,
  getOrchestrationQueueStats
};
