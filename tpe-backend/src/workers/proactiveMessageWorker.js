// ============================================================================
// DATABASE-CHECKED: Proactive Message Worker
// ============================================================================
// TABLES USED: ai_proactive_messages (14 columns), contractors (phone, first_name, email)
// PURPOSE: BullMQ worker for sending scheduled proactive messages via SMS/Email
//
// RUNS EVERY 5 MINUTES:
// - Queries unsent messages from ai_proactive_messages (sent_at IS NULL)
// - Sends each message via n8n webhook
// - Updates sent_at timestamp
// - Tracks delivery status
//
// VERIFIED: October 23, 2025
// ============================================================================

const { Worker } = require('bullmq');
const Redis = require('ioredis');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env.development') });

const { query } = require('../config/database');

// Redis connection for worker
const connection = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null,
  enableReadyCheck: false
});

// ============================================================================
// MAIN PROCESSING FUNCTION
// ============================================================================

/**
 * Process proactive message sending job
 * Called every 5 minutes by the scheduler
 */
async function sendPendingProactiveMessages(job) {
  console.log(`[ProactiveMessageWorker] 🚀 Starting proactive message delivery cycle`);
  console.log(`[ProactiveMessageWorker] Job ID: ${job.id}, Started at: ${new Date().toISOString()}`);

  const results = {
    messages_checked: 0,
    messages_sent: 0,
    messages_failed: 0,
    errors: []
  };

  try {
    // ========================================================================
    // STEP 1: Get Unsent Messages
    // ========================================================================
    console.log(`[ProactiveMessageWorker] 📨 Step 1: Fetching unsent proactive messages...`);

    const unsentResult = await query(`
      SELECT
        pm.id,
        pm.contractor_id,
        pm.message_type,
        pm.message_content,
        pm.ai_reasoning,
        pm.context_data,
        c.phone,
        c.first_name,
        c.last_name,
        c.email
      FROM ai_proactive_messages pm
      INNER JOIN contractors c ON c.id = pm.contractor_id
      WHERE pm.sent_at IS NULL
      ORDER BY pm.created_at ASC
      LIMIT 20
    `);

    results.messages_checked = unsentResult.rows.length;
    console.log(`[ProactiveMessageWorker] Found ${results.messages_checked} unsent messages`);

    if (unsentResult.rows.length === 0) {
      console.log(`[ProactiveMessageWorker] No messages to send at this time`);
      return results;
    }

    // ========================================================================
    // STEP 2: Send Each Message
    // ========================================================================
    console.log(`[ProactiveMessageWorker] 📤 Step 2: Sending messages...`);

    for (const message of unsentResult.rows) {
      try {
        // Build webhook payload (matches event orchestrator format)
        const payload = {
          send_via_ghl: {
            phone: message.phone,
            message: message.message_content,
            timestamp: new Date().toISOString()
          },
          // Additional metadata for tracking
          metadata: {
            contractor_id: message.contractor_id,
            message_type: message.message_type,
            message_id: message.id,
            contractor_name: `${message.first_name} ${message.last_name}`,
            ai_reasoning: message.ai_reasoning,
            source: 'phase3_ige_proactive'
          }
        };

        // Get n8n webhook URL (same pattern as event orchestrator)
        const n8nWebhookUrl = process.env.NODE_ENV === 'production'
          ? 'https://n8n.srv918843.hstgr.cloud/webhook/backend-to-ghl'
          : 'https://n8n.srv918843.hstgr.cloud/webhook/backend-to-ghl-dev';

        console.log(`[ProactiveMessageWorker] Sending message ${message.id} to ${message.phone}...`);
        console.log(`[ProactiveMessageWorker] Webhook: ${n8nWebhookUrl}`);

        // Send to n8n webhook
        const response = await fetch(n8nWebhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          throw new Error(`n8n webhook failed: ${response.status} ${response.statusText}`);
        }

        // Mark message as sent
        await query(`
          UPDATE ai_proactive_messages
          SET sent_at = NOW(), updated_at = NOW()
          WHERE id = $1
        `, [message.id]);

        results.messages_sent++;
        console.log(`[ProactiveMessageWorker] ✅ Message ${message.id} sent successfully`);

        // Rate limiting - wait 2 seconds between messages
        await new Promise(resolve => setTimeout(resolve, 2000));

      } catch (error) {
        results.messages_failed++;
        console.error(`[ProactiveMessageWorker] ❌ Failed to send message ${message.id}:`, error.message);

        results.errors.push({
          message_id: message.id,
          contractor_id: message.contractor_id,
          error: error.message
        });

        // Continue with next message even if one fails
      }
    }

    // ========================================================================
    // STEP 3: Summary
    // ========================================================================
    console.log(`[ProactiveMessageWorker] 🎉 Message delivery cycle complete`);
    console.log(`[ProactiveMessageWorker] Results:`, JSON.stringify(results, null, 2));

    return results;

  } catch (error) {
    console.error(`[ProactiveMessageWorker] ❌ CRITICAL ERROR in message delivery:`, error);
    results.errors.push({
      step: 'critical',
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
}

// ============================================================================
// BULL WORKER CONFIGURATION
// ============================================================================

const worker = new Worker(
  'proactive-messages',
  async (job) => {
    return await sendPendingProactiveMessages(job);
  },
  {
    connection: connection,
    concurrency: 1, // Process one job at a time
    limiter: {
      max: 1,
      duration: 60000 // Max 1 job per minute
    }
  }
);

// ============================================================================
// EVENT HANDLERS
// ============================================================================

worker.on('ready', () => {
  const webhookUrl = process.env.NODE_ENV === 'production'
    ? 'https://n8n.srv918843.hstgr.cloud/webhook/backend-to-ghl'
    : 'https://n8n.srv918843.hstgr.cloud/webhook/backend-to-ghl-dev';

  console.log('[ProactiveMessageWorker] 🚀 Proactive Message Worker started and ready');
  console.log('[ProactiveMessageWorker] Queue: proactive-messages');
  console.log('[ProactiveMessageWorker] Redis:', process.env.REDIS_HOST || 'localhost');
  console.log('[ProactiveMessageWorker] Concurrency: 1');
  console.log('[ProactiveMessageWorker] Rate limit: 1 job/minute');
  console.log('[ProactiveMessageWorker] n8n Webhook:', webhookUrl);
  console.log('[ProactiveMessageWorker] Environment:', process.env.NODE_ENV || 'development');
});

worker.on('active', (job) => {
  console.log(`[ProactiveMessageWorker] 🔄 Processing job ${job.id}`);
});

worker.on('completed', (job, result) => {
  console.log(`[ProactiveMessageWorker] ✅ Job ${job.id} completed successfully`);
  console.log(`[ProactiveMessageWorker] Summary:`, {
    messages_checked: result.messages_checked,
    messages_sent: result.messages_sent,
    messages_failed: result.messages_failed,
    errors: result.errors.length
  });
});

worker.on('failed', (job, error) => {
  console.error(`[ProactiveMessageWorker] ❌ Job ${job.id} failed:`, error.message);
  console.error(`[ProactiveMessageWorker] Stack:`, error.stack);
});

worker.on('error', (error) => {
  console.error('[ProactiveMessageWorker] ❌ Worker error:', error);
});

// ============================================================================
// GRACEFUL SHUTDOWN
// ============================================================================

process.on('SIGTERM', async () => {
  console.log('[ProactiveMessageWorker] 👋 SIGTERM received, shutting down gracefully...');
  await worker.close();
  await connection.quit();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('[ProactiveMessageWorker] 👋 SIGINT received, shutting down gracefully...');
  await worker.close();
  await connection.quit();
  process.exit(0);
});

console.log('[ProactiveMessageWorker] 🎯 Proactive Message Worker initialized');
