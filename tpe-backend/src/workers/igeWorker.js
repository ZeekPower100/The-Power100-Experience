// ============================================================================
// DATABASE-CHECKED: Phase 3 IGE Worker
// ============================================================================
// TABLES USED: ai_proactive_messages, ai_question_log, ai_concierge_goals,
//              ai_trust_indicators, contractors
// PURPOSE: BullMQ worker for Phase 3 Internal Goal Engine automation
//
// RUNS EVERY HOUR:
// - Evaluates proactive message triggers
// - Adjusts goals based on contractor behavior
// - Auto-cancels completed follow-ups
// - Analyzes abandoned goals
//
// VERIFIED: October 23, 2025
// ============================================================================

const { Worker } = require('bullmq');
const Redis = require('ioredis');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env.development') });

// Import Phase 3 services
const proactiveMessageService = require('../services/proactiveMessageService');
const enhancedFollowUpService = require('../services/enhancedFollowUpService');
const goalEvolutionService = require('../services/goalEvolutionService');
const trustMemoryService = require('../services/trustMemoryService');
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
 * Process Phase 3 IGE automation job
 * Called every hour by the scheduler
 */
async function processIGEAutomation(job) {
  console.log(`[IGEWorker] 🚀 Starting Phase 3 IGE automation cycle`);
  console.log(`[IGEWorker] Job ID: ${job.id}, Started at: ${new Date().toISOString()}`);

  const results = {
    proactive_messages_evaluated: 0,
    proactive_messages_scheduled: 0,
    goals_adjusted: 0,
    followups_cancelled: 0,
    abandoned_goals_analyzed: 0,
    errors: []
  };

  try {
    // ========================================================================
    // STEP 1: Evaluate Proactive Message Triggers
    // ========================================================================
    console.log(`[IGEWorker] 📨 Step 1: Evaluating proactive message triggers...`);

    try {
      const triggerResults = await proactiveMessageService.evaluateProactiveTriggers();
      results.proactive_messages_evaluated = triggerResults.contractors_evaluated || 0;
      results.proactive_messages_scheduled = triggerResults.messages_scheduled || 0;

      console.log(`[IGEWorker] ✅ Proactive triggers: ${results.proactive_messages_evaluated} contractors evaluated, ${results.proactive_messages_scheduled} messages scheduled`);
    } catch (error) {
      console.error(`[IGEWorker] ❌ Error evaluating proactive triggers:`, error);
      results.errors.push({ step: 'proactive_triggers', error: error.message });
    }

    // ========================================================================
    // STEP 2: Adjust Goals Based on Contractor Behavior
    // ========================================================================
    console.log(`[IGEWorker] 🎯 Step 2: Adjusting goals based on behavior...`);

    try {
      // Get all contractors with active goals
      const contractorsResult = await query(`
        SELECT DISTINCT contractor_id
        FROM ai_concierge_goals
        WHERE status = 'active'
      `);

      for (const row of contractorsResult.rows) {
        try {
          await goalEvolutionService.adjustGoalsBasedOnBehavior(row.contractor_id);
          results.goals_adjusted++;
        } catch (error) {
          console.error(`[IGEWorker] ❌ Error adjusting goals for contractor ${row.contractor_id}:`, error);
          results.errors.push({
            step: 'goal_adjustment',
            contractor_id: row.contractor_id,
            error: error.message
          });
        }
      }

      console.log(`[IGEWorker] ✅ Goals adjusted for ${results.goals_adjusted} contractors`);
    } catch (error) {
      console.error(`[IGEWorker] ❌ Error in goal adjustment step:`, error);
      results.errors.push({ step: 'goal_adjustment_query', error: error.message });
    }

    // ========================================================================
    // STEP 3: Auto-Cancel Completed Follow-Ups
    // ========================================================================
    console.log(`[IGEWorker] 🔄 Step 3: Auto-cancelling completed follow-ups...`);

    try {
      const cancelResults = await enhancedFollowUpService.autoCancelCompletedFollowUps();
      results.followups_cancelled = cancelResults.cancelled_count || 0;

      console.log(`[IGEWorker] ✅ Cancelled ${results.followups_cancelled} completed follow-ups`);
    } catch (error) {
      console.error(`[IGEWorker] ❌ Error auto-cancelling follow-ups:`, error);
      results.errors.push({ step: 'auto_cancel_followups', error: error.message });
    }

    // ========================================================================
    // STEP 4: Analyze Abandoned Goals
    // ========================================================================
    console.log(`[IGEWorker] 📊 Step 4: Analyzing abandoned goals...`);

    try {
      const abandonedResults = await goalEvolutionService.analyzeAbandonedGoals();
      results.abandoned_goals_analyzed = abandonedResults.analyzed_count || 0;

      console.log(`[IGEWorker] ✅ Analyzed ${results.abandoned_goals_analyzed} abandoned goals`);
    } catch (error) {
      console.error(`[IGEWorker] ❌ Error analyzing abandoned goals:`, error);
      results.errors.push({ step: 'analyze_abandoned_goals', error: error.message });
    }

    // ========================================================================
    // COMPLETE
    // ========================================================================
    console.log(`[IGEWorker] 🎉 Phase 3 IGE automation cycle complete`);
    console.log(`[IGEWorker] Results:`, JSON.stringify(results, null, 2));

    return results;

  } catch (error) {
    console.error(`[IGEWorker] ❌ CRITICAL ERROR in IGE automation:`, error);
    results.errors.push({ step: 'critical', error: error.message, stack: error.stack });
    throw error;
  }
}

// ============================================================================
// BULL WORKER CONFIGURATION
// ============================================================================

const worker = new Worker(
  'ige-automation',
  async (job) => {
    return await processIGEAutomation(job);
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
  console.log('[IGEWorker] 🚀 IGE Worker started and ready');
  console.log('[IGEWorker] Queue: ige-automation');
  console.log('[IGEWorker] Redis:', process.env.REDIS_HOST || 'localhost');
  console.log('[IGEWorker] Concurrency: 1');
  console.log('[IGEWorker] Rate limit: 1 job/minute');
});

worker.on('active', (job) => {
  console.log(`[IGEWorker] 🔄 Processing job ${job.id}`);
});

worker.on('completed', (job, result) => {
  console.log(`[IGEWorker] ✅ Job ${job.id} completed successfully`);
  console.log(`[IGEWorker] Summary:`, {
    messages_scheduled: result.proactive_messages_scheduled,
    goals_adjusted: result.goals_adjusted,
    followups_cancelled: result.followups_cancelled,
    errors: result.errors.length
  });
});

worker.on('failed', (job, error) => {
  console.error(`[IGEWorker] ❌ Job ${job.id} failed:`, error.message);
  console.error(`[IGEWorker] Stack:`, error.stack);
});

worker.on('error', (error) => {
  console.error('[IGEWorker] ❌ Worker error:', error);
});

// ============================================================================
// GRACEFUL SHUTDOWN
// ============================================================================

process.on('SIGTERM', async () => {
  console.log('[IGEWorker] 👋 SIGTERM received, shutting down gracefully...');
  await worker.close();
  await connection.quit();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('[IGEWorker] 👋 SIGINT received, shutting down gracefully...');
  await worker.close();
  await connection.quit();
  process.exit(0);
});

console.log('[IGEWorker] 🎯 Phase 3 IGE Worker initialized');
