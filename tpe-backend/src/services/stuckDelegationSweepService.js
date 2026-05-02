// DATABASE-CHECKED: expert_contributors (self_delegated, last_stuck_alert_sent_at, pipeline_stage, payment_status, delegation_completed) verified 2026-05-02
// ================================================================
// Stuck-Delegation Sweep — daily 8 AM ET nudge to operators
// ================================================================
// Purpose: Find expert_contributors rows that have been parked at
//          pipeline_stage='delegation_sent' / payment_status='pending_delegation'
//          for >= 3 days and fire an operator alert (email + SMS to Greg + Zeek)
//          so they can reach out directly.
//
// Re-nag cadence: 7 days. After firing once, last_stuck_alert_sent_at gates
//                 the row from re-alerting until 7 days have passed.
//
// Self-delegated rows surface with a different headline so operators know the
// submitter IS the delegate (no third party to chase).
// ================================================================

const { Queue, Worker } = require('bullmq');
const Redis = require('ioredis');
const { query } = require('../config/database');
const { sendOperatorAlert } = require('./communicationService');

const STUCK_DAYS_THRESHOLD = 3;       // First alert fires once row is >= 3 days old
const RENAG_DAYS = 7;                  // Re-alert cadence after the first nudge
const SCAN_CRON = '0 8 * * *';         // 08:00 daily
const SCAN_TZ = 'America/New_York';    // EST/EDT — auto-DST aware

const connection = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null,
});

const stuckQueue = new Queue('stuck-delegation-sweep', { connection });

/**
 * Scan tpedb for stuck-delegation rows and fire operator alerts.
 * Returns { found, alerted, skipped } stats.
 */
async function processStuckDelegationSweep() {
  const stats = { found: 0, alerted: 0, skipped: 0, errors: 0 };
  try {
    const result = await query(`
      SELECT id, first_name, last_name, email, company,
             delegated_to_name, delegated_to_email, self_delegated,
             pipeline_stage, payment_status, created_at,
             last_stuck_alert_sent_at,
             EXTRACT(EPOCH FROM (NOW() - created_at))/86400 AS days_old,
             wp_page_url, assigned_rep_id
      FROM expert_contributors
      WHERE pipeline_stage = 'delegation_sent'
        AND payment_status = 'pending_delegation'
        AND COALESCE(delegation_completed, false) = false
        AND created_at < NOW() - INTERVAL '${STUCK_DAYS_THRESHOLD} days'
        AND (
          last_stuck_alert_sent_at IS NULL
          OR last_stuck_alert_sent_at < NOW() - INTERVAL '${RENAG_DAYS} days'
        )
      ORDER BY created_at ASC
    `);

    stats.found = result.rows.length;
    console.log(`[StuckDelegationSweep] Found ${stats.found} stuck-delegation rows`);

    for (const row of result.rows) {
      try {
        const days = Math.floor(parseFloat(row.days_old));
        const isFirstAlert = !row.last_stuck_alert_sent_at;
        const headline = row.self_delegated
          ? `EC Self-Delegated & Stuck: ${row.first_name} ${row.last_name} (${days}d)`
          : `EC Stuck at Delegation: ${row.first_name} ${row.last_name} (${days}d)`;

        const fields = {
          'Name':            `${row.first_name} ${row.last_name}`,
          'Email':           row.email,
          'Company':         row.company || '(not set)',
          'Delegated To':    row.delegated_to_name
            ? `${row.delegated_to_name} <${row.delegated_to_email || '?'}>`
            : (row.delegated_to_email || '(none)'),
          'Self-Delegated':  row.self_delegated ? 'YES — submitter IS the delegate' : 'no',
          'Pipeline Stage':  row.pipeline_stage,
          'Payment Status':  row.payment_status,
          'Days Parked':     `${days} days (since ${new Date(row.created_at).toISOString().slice(0, 10)})`,
          'Assigned Rep':    row.assigned_rep_id ? `rep#${row.assigned_rep_id}` : 'unassigned',
          'Alert Type':      isFirstAlert ? 'first nudge' : `re-nag (every ${RENAG_DAYS}d)`,
          'Suggested Action': row.self_delegated
            ? 'Reach out directly — they are blocking themselves on the delegation form.'
            : 'Confirm delegate received the form and is unblocked.',
        };

        const alertResult = await sendOperatorAlert({
          event: 'ec_stuck_delegation',
          title: headline,
          fields,
          cta_url: row.wp_page_url || 'https://staging.power100.io/contributor-delegate/',
        });

        if (alertResult && alertResult.ok) {
          await query(
            `UPDATE expert_contributors SET last_stuck_alert_sent_at = NOW() WHERE id = $1`,
            [row.id]
          );
          stats.alerted++;
          console.log(`[StuckDelegationSweep] Alerted EC#${row.id} (${row.first_name} ${row.last_name}) — ${days}d parked${row.self_delegated ? ' [SELF]' : ''}`);
        } else {
          stats.errors++;
          console.warn(`[StuckDelegationSweep] Alert send failed for EC#${row.id}:`, alertResult);
        }
      } catch (e) {
        stats.errors++;
        console.error(`[StuckDelegationSweep] Row error EC#${row.id}:`, e.message);
      }
    }

    stats.skipped = stats.found - stats.alerted - stats.errors;
    console.log(`[StuckDelegationSweep] Sweep complete:`, stats);
    return stats;
  } catch (e) {
    console.error('[StuckDelegationSweep] Sweep failed:', e.message);
    return { ...stats, fatal: e.message };
  }
}

/**
 * Initialize the BullMQ scheduler. Idempotent — safe to call repeatedly.
 */
async function initializeStuckDelegationScheduler() {
  try {
    console.log('[StuckDelegationSweep] Initializing scheduler...');

    // Clear any existing repeatable job to avoid duplicates after redeploys
    const repeatableJobs = await stuckQueue.getRepeatableJobs();
    for (const job of repeatableJobs) {
      await stuckQueue.removeRepeatableByKey(job.key);
    }

    await stuckQueue.add(
      'daily-stuck-delegation-sweep',
      { type: 'scheduled' },
      {
        repeat: { pattern: SCAN_CRON, tz: SCAN_TZ },
        removeOnComplete: { count: 30 },
        removeOnFail: { count: 30 },
      }
    );

    const worker = new Worker('stuck-delegation-sweep', async (job) => {
      console.log(`[StuckDelegationSweep] Processing job: ${job.name}`);
      return await processStuckDelegationSweep();
    }, { connection });

    worker.on('completed', (job, result) => {
      console.log(`[StuckDelegationSweep] Job ${job.id} completed:`, result);
    });
    worker.on('failed', (job, err) => {
      console.error(`[StuckDelegationSweep] Job ${job?.id} failed:`, err.message);
    });

    console.log(`[StuckDelegationSweep] Scheduler initialized — cron '${SCAN_CRON}' tz ${SCAN_TZ}`);
  } catch (e) {
    console.error('[StuckDelegationSweep] Failed to initialize scheduler:', e.message);
    console.log('[StuckDelegationSweep] Service will run without scheduler — manual trigger via processStuckDelegationSweep()');
  }
}

module.exports = {
  initializeStuckDelegationScheduler,
  processStuckDelegationSweep,
  STUCK_DAYS_THRESHOLD,
  RENAG_DAYS,
  SCAN_CRON,
  SCAN_TZ,
};
