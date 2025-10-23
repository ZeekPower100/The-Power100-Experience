// ============================================================================
// Phase 3 IGE Queue - Hourly Automation Scheduler
// ============================================================================
// PURPOSE: Schedules Phase 3 IGE automation to run every hour
// ============================================================================

const { Queue } = require('bullmq');
const Redis = require('ioredis');

const connection = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null
});

// Create IGE automation queue
const igeQueue = new Queue('ige-automation', { connection });

/**
 * Initialize the IGE automation scheduler
 * Adds a repeatable job that runs every hour
 */
async function initializeIGEScheduler() {
  try {
    console.log('[IGEQueue] 🚀 Initializing Phase 3 IGE scheduler...');

    // Remove any existing repeatable jobs to avoid duplicates
    const repeatableJobs = await igeQueue.getRepeatableJobs();
    for (const job of repeatableJobs) {
      await igeQueue.removeRepeatableByKey(job.key);
      console.log(`[IGEQueue] 🗑️  Removed existing repeatable job: ${job.key}`);
    }

    // Add new repeatable job - runs every hour at minute 0
    await igeQueue.add(
      'ige-hourly-automation',
      {
        timestamp: new Date().toISOString(),
        type: 'scheduled'
      },
      {
        repeat: {
          pattern: '0 * * * *' // Every hour at minute 0 (cron format)
        },
        removeOnComplete: {
          count: 10 // Keep last 10 completed jobs
        },
        removeOnFail: {
          count: 20 // Keep last 20 failed jobs
        }
      }
    );

    console.log('[IGEQueue] ✅ IGE scheduler initialized successfully');
    console.log('[IGEQueue] 📅 Schedule: Every hour at minute 0');
    console.log('[IGEQueue] ⏰ Next run: Top of the next hour');

    // Also add an immediate job for testing (optional)
    if (process.env.IGE_RUN_ON_STARTUP === 'true') {
      await igeQueue.add(
        'ige-immediate-run',
        {
          timestamp: new Date().toISOString(),
          type: 'immediate'
        }
      );
      console.log('[IGEQueue] 🏃 Added immediate job for startup run');
    }

  } catch (error) {
    console.error('[IGEQueue] ❌ Error initializing IGE scheduler:', error);
    throw error;
  }
}

module.exports = {
  igeQueue,
  initializeIGEScheduler
};
