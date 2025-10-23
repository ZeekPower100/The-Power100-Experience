// ============================================================================
// Proactive Message Queue - Every 5 Minutes Scheduler
// ============================================================================
// PURPOSE: Schedules proactive message delivery to run every 5 minutes
// ============================================================================

const { Queue } = require('bullmq');
const Redis = require('ioredis');

const connection = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null
});

// Create proactive messages queue
const proactiveMessageQueue = new Queue('proactive-messages', { connection });

/**
 * Initialize the proactive message delivery scheduler
 * Adds a repeatable job that runs every 5 minutes
 */
async function initializeProactiveMessageScheduler() {
  try {
    console.log('[ProactiveMessageQueue] 🚀 Initializing proactive message delivery scheduler...');

    // Remove any existing repeatable jobs to avoid duplicates
    const repeatableJobs = await proactiveMessageQueue.getRepeatableJobs();
    for (const job of repeatableJobs) {
      await proactiveMessageQueue.removeRepeatableByKey(job.key);
      console.log(`[ProactiveMessageQueue] 🗑️  Removed existing repeatable job: ${job.key}`);
    }

    // Add new repeatable job - runs every 5 minutes
    await proactiveMessageQueue.add(
      'send-proactive-messages',
      {
        timestamp: new Date().toISOString(),
        type: 'scheduled'
      },
      {
        repeat: {
          pattern: '*/5 * * * *' // Every 5 minutes (cron format)
        },
        removeOnComplete: {
          count: 10 // Keep last 10 completed jobs
        },
        removeOnFail: {
          count: 20 // Keep last 20 failed jobs
        }
      }
    );

    console.log('[ProactiveMessageQueue] ✅ Proactive message delivery scheduler initialized successfully');
    console.log('[ProactiveMessageQueue] 📅 Schedule: Every 5 minutes');
    console.log('[ProactiveMessageQueue] ⏰ Next run: Within 5 minutes');

    // Also add an immediate job for testing (optional)
    if (process.env.PROACTIVE_MESSAGES_RUN_ON_STARTUP === 'true') {
      await proactiveMessageQueue.add(
        'send-proactive-messages-immediate',
        {
          timestamp: new Date().toISOString(),
          type: 'immediate'
        }
      );
      console.log('[ProactiveMessageQueue] 🏃 Added immediate job for startup run');
    }

  } catch (error) {
    console.error('[ProactiveMessageQueue] ❌ Error initializing proactive message scheduler:', error);
    throw error;
  }
}

module.exports = {
  proactiveMessageQueue,
  initializeProactiveMessageScheduler
};
