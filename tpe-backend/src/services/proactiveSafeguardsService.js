// ============================================================================
// DATABASE-CHECKED: Phase 3 Day 7 - Proactive Behavior Safeguards
// ============================================================================
// TABLES USED: ai_proactive_messages, ai_trust_indicators, contractors
// PURPOSE: Prevent spam, respect trust, implement emergency stops
//
// SAFEGUARDS IMPLEMENTED:
// 1. Max 1 proactive message per 2 days (anti-spam)
// 2. Pause after 3 ignored messages in a row (1 week cooldown)
// 3. Pause if trust score < 20 (rebuild trust first)
// 4. Emergency stop mechanism (contractor complains)
// 5. Graduated response based on engagement history
//
// VERIFIED: October 23, 2025
// ============================================================================

const { query } = require('../config/database');

// ============================================================================
// CONSTANTS
// ============================================================================

const SAFEGUARD_RULES = {
  MIN_DAYS_BETWEEN_MESSAGES: 2,
  MAX_IGNORED_IN_ROW: 3,
  IGNORED_PAUSE_DAYS: 7,
  MIN_TRUST_SCORE: 20,
  COMPLAINT_PAUSE_DAYS: 30
};

const PAUSE_REASONS = {
  SPAM_PREVENTION: 'spam_prevention',
  IGNORED_MESSAGES: 'ignored_messages',
  LOW_TRUST: 'low_trust',
  CONTRACTOR_COMPLAINT: 'contractor_complaint',
  MANUAL_PAUSE: 'manual_pause'
};

// ============================================================================
// CHECK IF CONTRACTOR CAN RECEIVE MESSAGE
// ============================================================================

/**
 * Check if contractor can receive a proactive message
 * Implements all safeguards and returns detailed status
 *
 * @param {number} contractorId - Contractor ID
 * @returns {Promise<Object>} Can send status with reason
 */
async function canSendProactiveMessage(contractorId) {
  try {
    const checks = {
      can_send: true,
      reasons: [],
      details: {}
    };

    // SAFEGUARD 1: Check last message time (2-day minimum)
    const lastMessageCheck = await checkLastMessageTime(contractorId);
    checks.details.last_message = lastMessageCheck;

    if (!lastMessageCheck.can_send) {
      checks.can_send = false;
      checks.reasons.push({
        rule: 'MIN_DAYS_BETWEEN_MESSAGES',
        message: `Must wait ${lastMessageCheck.hours_remaining} more hours before next message`,
        severity: 'blocking'
      });
    }

    // SAFEGUARD 2: Check ignored message count
    const ignoredCheck = await checkIgnoredMessages(contractorId);
    checks.details.ignored_messages = ignoredCheck;

    if (!ignoredCheck.can_send) {
      checks.can_send = false;
      checks.reasons.push({
        rule: 'MAX_IGNORED_IN_ROW',
        message: `${ignoredCheck.ignored_count} messages ignored in a row. Paused for ${ignoredCheck.days_remaining} more days`,
        severity: 'blocking'
      });
    }

    // SAFEGUARD 3: Check trust score
    const trustCheck = await checkTrustScore(contractorId);
    checks.details.trust_score = trustCheck;

    if (!trustCheck.can_send) {
      checks.can_send = false;
      checks.reasons.push({
        rule: 'MIN_TRUST_SCORE',
        message: `Trust score too low (${trustCheck.current_score}). Must be above ${SAFEGUARD_RULES.MIN_TRUST_SCORE}`,
        severity: 'blocking'
      });
    }

    // SAFEGUARD 4: Check for complaints/emergency stop
    const complaintCheck = await checkComplaintStatus(contractorId);
    checks.details.complaints = complaintCheck;

    if (!complaintCheck.can_send) {
      checks.can_send = false;
      checks.reasons.push({
        rule: 'CONTRACTOR_COMPLAINT',
        message: `Contractor complained. Paused until ${complaintCheck.pause_until}`,
        severity: 'critical'
      });
    }

    return checks;
  } catch (error) {
    console.error('Error checking if can send proactive message:', error);
    // Default to safe: don't send if error
    return {
      can_send: false,
      reasons: [{ rule: 'ERROR', message: error.message, severity: 'critical' }],
      details: {}
    };
  }
}

// ============================================================================
// SAFEGUARD 1: LAST MESSAGE TIME CHECK
// ============================================================================

/**
 * Check if enough time has passed since last proactive message
 *
 * @param {number} contractorId - Contractor ID
 * @returns {Promise<Object>} Time check status
 */
async function checkLastMessageTime(contractorId) {
  try {
    const result = await query(
      `SELECT
        sent_at,
        EXTRACT(EPOCH FROM (NOW() - sent_at)) / 3600 as hours_since_last
       FROM ai_proactive_messages
       WHERE contractor_id = $1
         AND sent_at IS NOT NULL
       ORDER BY sent_at DESC
       LIMIT 1`,
      [contractorId]
    );

    if (result.rows.length === 0) {
      return {
        can_send: true,
        last_message_date: null,
        hours_since_last: null,
        hours_remaining: 0
      };
    }

    const hoursSinceLast = parseFloat(result.rows[0].hours_since_last);
    const minHoursRequired = SAFEGUARD_RULES.MIN_DAYS_BETWEEN_MESSAGES * 24;
    const hoursRemaining = Math.max(0, minHoursRequired - hoursSinceLast);

    return {
      can_send: hoursSinceLast >= minHoursRequired,
      last_message_date: result.rows[0].sent_at,
      hours_since_last: Math.floor(hoursSinceLast),
      hours_remaining: Math.ceil(hoursRemaining)
    };
  } catch (error) {
    console.error('Error checking last message time:', error);
    return { can_send: false, error: error.message };
  }
}

// ============================================================================
// SAFEGUARD 2: IGNORED MESSAGES CHECK
// ============================================================================

/**
 * Check if contractor has ignored too many messages in a row
 *
 * @param {number} contractorId - Contractor ID
 * @returns {Promise<Object>} Ignored messages status
 */
async function checkIgnoredMessages(contractorId) {
  try {
    // Get recent messages (last 10)
    const result = await query(
      `SELECT
        id,
        sent_at,
        contractor_response,
        response_received_at
       FROM ai_proactive_messages
       WHERE contractor_id = $1
         AND sent_at IS NOT NULL
       ORDER BY sent_at DESC
       LIMIT 10`,
      [contractorId]
    );

    if (result.rows.length === 0) {
      return {
        can_send: true,
        ignored_count: 0,
        total_recent: 0
      };
    }

    // Count consecutive ignored messages (starting from most recent)
    let ignoredCount = 0;
    for (const message of result.rows) {
      if (!message.contractor_response) {
        ignoredCount++;
      } else {
        break; // Stop at first responded message
      }
    }

    // Check if we hit the limit
    const hitLimit = ignoredCount >= SAFEGUARD_RULES.MAX_IGNORED_IN_ROW;

    if (hitLimit) {
      // Check when the pause period ends
      const oldestIgnored = result.rows[ignoredCount - 1];
      const pauseUntil = new Date(oldestIgnored.sent_at);
      pauseUntil.setDate(pauseUntil.getDate() + SAFEGUARD_RULES.IGNORED_PAUSE_DAYS);

      const daysRemaining = Math.ceil((pauseUntil - new Date()) / (1000 * 60 * 60 * 24));

      return {
        can_send: daysRemaining <= 0,
        ignored_count: ignoredCount,
        total_recent: result.rows.length,
        pause_until: pauseUntil,
        days_remaining: Math.max(0, daysRemaining)
      };
    }

    return {
      can_send: true,
      ignored_count: ignoredCount,
      total_recent: result.rows.length
    };
  } catch (error) {
    console.error('Error checking ignored messages:', error);
    return { can_send: false, error: error.message };
  }
}

// ============================================================================
// SAFEGUARD 3: TRUST SCORE CHECK
// ============================================================================

/**
 * Check if contractor's trust score is above minimum threshold
 *
 * @param {number} contractorId - Contractor ID
 * @returns {Promise<Object>} Trust score status
 */
async function checkTrustScore(contractorId) {
  try {
    const result = await query(
      `SELECT cumulative_trust_score
       FROM ai_trust_indicators
       WHERE contractor_id = $1
       ORDER BY recorded_at DESC
       LIMIT 1`,
      [contractorId]
    );

    if (result.rows.length === 0) {
      // No trust data yet - start at neutral (50)
      return {
        can_send: true,
        current_score: 50,
        min_required: SAFEGUARD_RULES.MIN_TRUST_SCORE,
        status: 'neutral_default'
      };
    }

    const currentScore = parseFloat(result.rows[0].cumulative_trust_score);
    const canSend = currentScore >= SAFEGUARD_RULES.MIN_TRUST_SCORE;

    return {
      can_send: canSend,
      current_score: currentScore,
      min_required: SAFEGUARD_RULES.MIN_TRUST_SCORE,
      status: canSend ? 'sufficient' : 'too_low'
    };
  } catch (error) {
    console.error('Error checking trust score:', error);
    return { can_send: false, error: error.message };
  }
}

// ============================================================================
// SAFEGUARD 4: COMPLAINT/EMERGENCY STOP CHECK
// ============================================================================

/**
 * Check if contractor has complained or requested a stop
 *
 * @param {number} contractorId - Contractor ID
 * @returns {Promise<Object>} Complaint status
 */
async function checkComplaintStatus(contractorId) {
  try {
    // Check for explicit complaints in contractor preferences
    const prefResult = await query(
      `SELECT
        ai_proactive_paused,
        ai_pause_reason,
        ai_pause_until
       FROM contractors
       WHERE id = $1`,
      [contractorId]
    );

    if (prefResult.rows.length === 0) {
      return { can_send: true, has_complaint: false };
    }

    const prefs = prefResult.rows[0];

    // Check if paused
    if (prefs.ai_proactive_paused) {
      const pauseUntil = prefs.ai_pause_until ? new Date(prefs.ai_pause_until) : null;
      const isPastPause = pauseUntil && new Date() > pauseUntil;

      if (isPastPause) {
        // Pause period expired - can send
        return {
          can_send: true,
          had_complaint: true,
          pause_expired: true,
          pause_reason: prefs.ai_pause_reason
        };
      }

      return {
        can_send: false,
        has_complaint: true,
        pause_reason: prefs.ai_pause_reason,
        pause_until: pauseUntil
      };
    }

    // Check for negative feedback in recent messages
    const feedbackResult = await query(
      `SELECT COUNT(*) as negative_count
       FROM ai_trust_indicators
       WHERE contractor_id = $1
         AND indicator_type IN ('negative_feedback', 'ignored_suggestion')
         AND recorded_at > NOW() - INTERVAL '7 days'`,
      [contractorId]
    );

    const negativeCount = parseInt(feedbackResult.rows[0].negative_count);

    if (negativeCount >= 3) {
      return {
        can_send: false,
        has_complaint: false,
        high_negative_feedback: true,
        negative_count: negativeCount,
        recommendation: 'Pause proactive messaging until trust improves'
      };
    }

    return {
      can_send: true,
      has_complaint: false
    };
  } catch (error) {
    console.error('Error checking complaint status:', error);
    return { can_send: false, error: error.message };
  }
}

// ============================================================================
// EMERGENCY STOP
// ============================================================================

/**
 * Emergency stop - pause all proactive messaging for contractor
 *
 * @param {number} contractorId - Contractor ID
 * @param {string} reason - Reason for emergency stop
 * @param {number} pauseDays - Days to pause (default 30)
 * @returns {Promise<Object>} Stop confirmation
 */
async function emergencyStop(contractorId, reason, pauseDays = SAFEGUARD_RULES.COMPLAINT_PAUSE_DAYS) {
  try {
    const pauseUntil = new Date();
    pauseUntil.setDate(pauseUntil.getDate() + pauseDays);

    // Update contractor preferences
    await query(
      `UPDATE contractors
       SET ai_proactive_paused = true,
           ai_pause_reason = $1,
           ai_pause_until = $2,
           updated_at = NOW()
       WHERE id = $3`,
      [reason, pauseUntil, contractorId]
    );

    // Log trust event
    const trustMemoryService = require('./trustMemoryService');
    await trustMemoryService.trackTrustEvent({
      contractor_id: contractorId,
      indicator_type: 'negative_feedback',
      description: `Emergency stop: ${reason}`
    });

    return {
      stopped: true,
      contractor_id: contractorId,
      reason: reason,
      pause_until: pauseUntil,
      pause_days: pauseDays
    };
  } catch (error) {
    console.error('Error executing emergency stop:', error);
    throw error;
  }
}

// ============================================================================
// RESUME PROACTIVE MESSAGING
// ============================================================================

/**
 * Resume proactive messaging for contractor
 *
 * @param {number} contractorId - Contractor ID
 * @returns {Promise<Object>} Resume confirmation
 */
async function resumeProactiveMessaging(contractorId) {
  try {
    await query(
      `UPDATE contractors
       SET ai_proactive_paused = false,
           ai_pause_reason = NULL,
           ai_pause_until = NULL,
           updated_at = NOW()
       WHERE id = $1`,
      [contractorId]
    );

    return {
      resumed: true,
      contractor_id: contractorId,
      message: 'Proactive messaging resumed'
    };
  } catch (error) {
    console.error('Error resuming proactive messaging:', error);
    throw error;
  }
}

// ============================================================================
// GET SAFEGUARD STATUS
// ============================================================================

/**
 * Get comprehensive safeguard status for contractor
 *
 * @param {number} contractorId - Contractor ID
 * @returns {Promise<Object>} Complete safeguard status
 */
async function getSafeguardStatus(contractorId) {
  try {
    const canSend = await canSendProactiveMessage(contractorId);

    return {
      contractor_id: contractorId,
      can_send_message: canSend.can_send,
      blocking_reasons: canSend.reasons.filter(r => r.severity === 'blocking' || r.severity === 'critical'),
      all_checks: canSend.details,
      summary: generateSafeguardSummary(canSend)
    };
  } catch (error) {
    console.error('Error getting safeguard status:', error);
    throw error;
  }
}

/**
 * Generate human-readable safeguard summary
 *
 * @param {Object} checks - Check results
 * @returns {string} Summary message
 */
function generateSafeguardSummary(checks) {
  if (checks.can_send) {
    return 'All safeguards passed. Safe to send proactive message.';
  }

  const criticalReasons = checks.reasons.filter(r => r.severity === 'critical');
  const blockingReasons = checks.reasons.filter(r => r.severity === 'blocking');

  if (criticalReasons.length > 0) {
    return `CRITICAL: ${criticalReasons[0].message}`;
  }

  if (blockingReasons.length > 0) {
    return `BLOCKED: ${blockingReasons.map(r => r.message).join('; ')}`;
  }

  return 'Unable to send proactive message.';
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  SAFEGUARD_RULES,
  PAUSE_REASONS,
  canSendProactiveMessage,
  checkLastMessageTime,
  checkIgnoredMessages,
  checkTrustScore,
  checkComplaintStatus,
  emergencyStop,
  resumeProactiveMessaging,
  getSafeguardStatus
};
