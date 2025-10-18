/**
 * Event Orchestration Worker
 * Processes automated event tasks like batch peer matching
 */

const { Worker } = require('bullmq');
const Redis = require('ioredis');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const { runBatchPeerMatching } = require('../services/eventOrchestrator/peerMatchingBatchScheduler');

// Redis connection for worker
const connection = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null,
  enableReadyCheck: false
});

/**
 * Process orchestration job
 */
async function processOrchestrationJob(job) {
  const { event_id, scheduled_time } = job.data;

  console.log(`[EventOrchestrationWorker] 🚀 Processing ${job.name} for event ${event_id}`);
  console.log(`[EventOrchestrationWorker] Scheduled: ${scheduled_time}, Actual: ${new Date().toISOString()}`);

  try {
    if (job.name === 'batch-peer-matching') {
      // Run batch peer matching
      const result = await runBatchPeerMatching(event_id);

      console.log(`[EventOrchestrationWorker] ✅ Batch peer matching complete:`, {
        matches_created: result.matches_created,
        messages_scheduled: result.messages_scheduled
      });

      return {
        success: true,
        event_id,
        job_type: 'batch-peer-matching',
        ...result
      };
    }

    // Future: Add more orchestration job types here
    // - Automated speaker alerts
    // - Sponsor recommendation batching
    // - PCR request scheduling
    // - Wrap-up email generation

    throw new Error(`Unknown job type: ${job.name}`);

  } catch (error) {
    console.error(`[EventOrchestrationWorker] ❌ Error processing job:`, error);
    throw error; // BullMQ will retry
  }
}

// Create the worker
const worker = new Worker(
  'event-orchestration',
  processOrchestrationJob,
  {
    connection,
    concurrency: 5, // Process up to 5 jobs simultaneously
    limiter: {
      max: 10, // Max 10 jobs per minute
      duration: 60000
    }
  }
);

// Worker event listeners
worker.on('completed', (job, result) => {
  console.log(`[EventOrchestrationWorker] ✅ Job ${job.id} completed successfully`);
});

worker.on('failed', (job, err) => {
  console.error(`[EventOrchestrationWorker] ❌ Job ${job.id} failed after ${job.attemptsMade} attempts:`, err.message);

  // If all retries exhausted, log to error tracking
  if (job.attemptsMade >= job.opts.attempts) {
    console.error(`[EventOrchestrationWorker] 🔴 Job ${job.id} PERMANENTLY FAILED - manual intervention required`);
  }
});

worker.on('error', (err) => {
  console.error('[EventOrchestrationWorker] Worker error:', err);
});

worker.on('ready', () => {
  console.log('[EventOrchestrationWorker] ✅ Worker ready and listening for jobs');
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('[EventOrchestrationWorker] Received SIGTERM, closing worker...');
  await worker.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('[EventOrchestrationWorker] Received SIGINT, closing worker...');
  await worker.close();
  process.exit(0);
});

console.log('[EventOrchestrationWorker] 🚀 Event Orchestration Worker started');
console.log('[EventOrchestrationWorker] Redis:', process.env.REDIS_HOST || 'localhost');
console.log('[EventOrchestrationWorker] Concurrency: 5');

module.exports = worker;
