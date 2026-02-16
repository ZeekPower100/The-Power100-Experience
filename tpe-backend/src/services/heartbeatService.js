// DATABASE-CHECKED: power_moves, inner_circle_members, ai_concierge_conversations verified 2026-02-16
// ================================================================
// Heartbeat Service — Inner Circle Proactive Engagement Engine
// ================================================================
// Purpose: Daily scan for members who need proactive outreach.
//          Runs via Bull queue on a cron schedule.
//          Scans for overdue check-ins, approaching deadlines,
//          inactive members, and re-engagement opportunities.
// ================================================================

const { Queue, Worker } = require('bullmq');
const Redis = require('ioredis');
const { query } = require('../config/database');
const config = require('../config/heartbeatConfig');
const { enqueueInLane, CommandLane } = require('./laneQueue');

const connection = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null
});

const heartbeatQueue = new Queue('heartbeat', { connection });

/**
 * Scan for PowerMoves with overdue check-ins
 * @returns {Array} Members needing check-in outreach
 */
async function scanOverdueCheckins() {
  try {
    const result = await query(`
      SELECT pm.id as power_move_id, pm.title, pm.pillar, pm.member_id,
             pm.last_checkin_date, pm.total_checkins, pm.streak_weeks,
             pm.target_date, pm.action_steps,
             icm.name as member_name, icm.email as member_email,
             EXTRACT(DAY FROM NOW() - pm.last_checkin_date) as days_since_checkin
      FROM power_moves pm
      JOIN inner_circle_members icm ON pm.member_id = icm.id
      WHERE pm.status IN ('active', 'in_progress')
        AND (
          pm.last_checkin_date IS NULL
          OR pm.last_checkin_date < NOW() - INTERVAL '${config.CHECKIN_OVERDUE_DAYS} days'
        )
        AND icm.membership_status = 'active'
      ORDER BY pm.last_checkin_date ASC NULLS FIRST
    `);

    return result.rows.map(row => ({
      ...row,
      urgency: !row.last_checkin_date ? 'first_checkin'
        : row.days_since_checkin >= config.CHECKIN_CRITICAL_DAYS ? 'critical'
        : row.days_since_checkin >= config.CHECKIN_URGENT_DAYS ? 'urgent'
        : 'overdue'
    }));
  } catch (error) {
    console.error('[Heartbeat] Failed to scan overdue check-ins:', error.message);
    return [];
  }
}

/**
 * Scan for PowerMoves approaching deadline
 * @returns {Array} PowerMoves nearing their target date
 */
async function scanApproachingDeadlines() {
  try {
    const result = await query(`
      SELECT pm.id as power_move_id, pm.title, pm.pillar, pm.member_id,
             pm.target_date, pm.current_value, pm.target_value,
             icm.name as member_name,
             EXTRACT(DAY FROM pm.target_date - NOW()) as days_remaining
      FROM power_moves pm
      JOIN inner_circle_members icm ON pm.member_id = icm.id
      WHERE pm.status IN ('active', 'in_progress')
        AND pm.target_date BETWEEN NOW() AND NOW() + INTERVAL '${config.DEADLINE_WARNING_DAYS} days'
        AND icm.membership_status = 'active'
      ORDER BY pm.target_date ASC
    `);

    return result.rows.map(row => ({
      ...row,
      urgency: row.days_remaining <= config.DEADLINE_URGENT_DAYS ? 'urgent' : 'warning'
    }));
  } catch (error) {
    console.error('[Heartbeat] Failed to scan approaching deadlines:', error.message);
    return [];
  }
}

/**
 * Scan for inactive members (no interaction in 14+ days)
 * @returns {Array} Members needing re-engagement
 */
async function scanInactiveMembers() {
  try {
    const result = await query(`
      SELECT icm.id as member_id, icm.name, icm.email,
             icm.last_concierge_interaction,
             icm.onboarding_complete,
             EXTRACT(DAY FROM NOW() - icm.last_concierge_interaction) as days_inactive,
             (SELECT COUNT(*) FROM power_moves pm WHERE pm.member_id = icm.id AND pm.status IN ('active', 'in_progress')) as active_pm_count
      FROM inner_circle_members icm
      WHERE icm.membership_status = 'active'
        AND (
          icm.last_concierge_interaction IS NULL
          OR icm.last_concierge_interaction < NOW() - INTERVAL '${config.INACTIVE_DAYS} days'
        )
      ORDER BY icm.last_concierge_interaction ASC NULLS FIRST
    `);

    return result.rows;
  } catch (error) {
    console.error('[Heartbeat] Failed to scan inactive members:', error.message);
    return [];
  }
}

/**
 * Check rate limit: don't exceed max proactive messages per day per member
 */
async function checkRateLimit(memberId) {
  try {
    const result = await query(`
      SELECT COUNT(*) as today_count
      FROM ai_concierge_conversations
      WHERE member_id = $1
        AND message_type = 'ai'
        AND created_at > NOW() - INTERVAL '1 day'
    `, [memberId]);

    const count = parseInt(result.rows[0].today_count);

    if (config.SKIP_IF_ACTIVE_TODAY && count > 0) {
      return { allowed: false, reason: 'Member already active today' };
    }

    if (count >= config.MAX_PROACTIVE_PER_DAY) {
      return { allowed: false, reason: `Rate limit reached (${count}/${config.MAX_PROACTIVE_PER_DAY})` };
    }

    return { allowed: true };
  } catch (error) {
    console.error('[Heartbeat] Rate limit check failed:', error.message);
    return { allowed: false, reason: 'Rate limit check error' };
  }
}

/**
 * Process the daily heartbeat scan
 */
async function processDailyScan() {
  const startTime = Date.now();
  console.log('[Heartbeat] Starting daily member scan...');

  const stats = {
    overdueCheckins: 0,
    approachingDeadlines: 0,
    inactiveMembers: 0,
    actionsEnqueued: 0,
    rateLimited: 0
  };

  try {
    // 1. Overdue check-ins
    const overdueCheckins = await scanOverdueCheckins();
    stats.overdueCheckins = overdueCheckins.length;
    console.log(`[Heartbeat] Found ${overdueCheckins.length} overdue check-ins`);

    for (const item of overdueCheckins) {
      const rateCheck = await checkRateLimit(item.member_id);
      if (!rateCheck.allowed) {
        stats.rateLimited++;
        continue;
      }

      await enqueueInLane(CommandLane.Cron, async () => {
        await query(`
          INSERT INTO ai_concierge_conversations (member_id, message_type, content, created_at)
          VALUES ($1, 'system', $2, NOW())
        `, [
          item.member_id,
          JSON.stringify({
            type: 'heartbeat_checkin',
            powerMoveId: item.power_move_id,
            powerMoveTitle: item.title,
            urgency: item.urgency,
            daysSinceCheckin: item.days_since_checkin
          })
        ]);
      });
      stats.actionsEnqueued++;
    }

    // 2. Approaching deadlines
    const deadlines = await scanApproachingDeadlines();
    stats.approachingDeadlines = deadlines.length;
    console.log(`[Heartbeat] Found ${deadlines.length} approaching deadlines`);

    for (const item of deadlines) {
      const rateCheck = await checkRateLimit(item.member_id);
      if (!rateCheck.allowed) {
        stats.rateLimited++;
        continue;
      }

      await enqueueInLane(CommandLane.Cron, async () => {
        await query(`
          INSERT INTO ai_concierge_conversations (member_id, message_type, content, created_at)
          VALUES ($1, 'system', $2, NOW())
        `, [
          item.member_id,
          JSON.stringify({
            type: 'heartbeat_deadline',
            powerMoveId: item.power_move_id,
            powerMoveTitle: item.title,
            urgency: item.urgency,
            daysRemaining: item.days_remaining
          })
        ]);
      });
      stats.actionsEnqueued++;
    }

    // 3. Inactive members
    const inactive = await scanInactiveMembers();
    stats.inactiveMembers = inactive.length;
    console.log(`[Heartbeat] Found ${inactive.length} inactive members`);

    for (const item of inactive) {
      const rateCheck = await checkRateLimit(item.member_id);
      if (!rateCheck.allowed) {
        stats.rateLimited++;
        continue;
      }

      await enqueueInLane(CommandLane.Cron, async () => {
        await query(`
          INSERT INTO ai_concierge_conversations (member_id, message_type, content, created_at)
          VALUES ($1, 'system', $2, NOW())
        `, [
          item.member_id,
          JSON.stringify({
            type: 'heartbeat_reengagement',
            daysInactive: item.days_inactive,
            hasActivePowerMoves: item.active_pm_count > 0,
            onboardingComplete: item.onboarding_complete
          })
        ]);
      });
      stats.actionsEnqueued++;
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`[Heartbeat] Scan complete in ${elapsed}s:`, stats);
    return stats;
  } catch (error) {
    console.error('[Heartbeat] Daily scan failed:', error.message);
    return stats;
  }
}

/**
 * Initialize the heartbeat scheduler
 */
async function initializeHeartbeatScheduler() {
  try {
    console.log('[Heartbeat] Initializing heartbeat scheduler...');

    // Remove existing repeatable jobs
    const repeatableJobs = await heartbeatQueue.getRepeatableJobs();
    for (const job of repeatableJobs) {
      await heartbeatQueue.removeRepeatableByKey(job.key);
    }

    // Add daily scan job
    await heartbeatQueue.add(
      'daily-member-scan',
      { timestamp: new Date().toISOString(), type: 'scheduled' },
      {
        repeat: { pattern: config.SCAN_CRON },
        removeOnComplete: { count: 30 },
        removeOnFail: { count: 30 }
      }
    );

    // Create worker to process heartbeat jobs
    const worker = new Worker('heartbeat', async (job) => {
      console.log(`[Heartbeat] Processing job: ${job.name}`);
      if (job.name === 'daily-member-scan') {
        return await processDailyScan();
      }
    }, { connection });

    worker.on('completed', (job, result) => {
      console.log(`[Heartbeat] Job ${job.id} completed:`, result);
    });

    worker.on('failed', (job, err) => {
      console.error(`[Heartbeat] Job ${job?.id} failed:`, err.message);
    });

    console.log(`[Heartbeat] Scheduler initialized. Cron: ${config.SCAN_CRON}`);
  } catch (error) {
    console.error('[Heartbeat] Failed to initialize scheduler:', error.message);
    console.log('[Heartbeat] Heartbeat will run without scheduler — manual trigger available');
  }
}

module.exports = {
  initializeHeartbeatScheduler,
  processDailyScan,
  scanOverdueCheckins,
  scanApproachingDeadlines,
  scanInactiveMembers
};
