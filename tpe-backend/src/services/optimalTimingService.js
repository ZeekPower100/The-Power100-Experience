// DATABASE-CHECKED: contractor_followup_schedules columns verified on 2025-12-03
// Columns: id, contractor_id, action_item_id, event_id, scheduled_time, followup_type,
// message_template, message_tone, status, sent_at, response_received_at, response_text,
// ai_should_personalize, ai_context_hints, skip_if_completed, is_recurring,
// recurrence_interval_days, next_occurrence_id, created_at, updated_at, sent_by

// DATABASE-CHECKED: contractor_engagement_events columns verified on 2025-12-03
// Columns: id, contractor_id, event_type, event_data, channel, session_id, created_at

// DATABASE-CHECKED: contractor_ai_profiles columns verified on 2025-12-03
// Columns: id, contractor_id, preferred_channels, communication_frequency, best_contact_times,
// timezone, content_types, session_length, learning_depth, business_goals, current_challenges,
// engagement_score, churn_risk, growth_potential, lifecycle_stage, next_best_action,
// last_interaction, total_interactions, successful_recommendations, total_recommendations,
// created_at, updated_at

// DATABASE-CHECKED: contractors columns verified on 2025-12-03
// Columns used: id, timezone

const { query } = require('../config/database');
const { safeJsonParse, safeJsonStringify } = require('../utils/jsonHelpers');

/**
 * Optimal Timing Service
 * ML-based prediction of best times to send proactive AI Concierge messages
 *
 * SCOPE: Only for AI Concierge proactive communications (check-ins, recommendations, reminders)
 * NOT FOR: PowerCards (quarterly schedule), Event messaging (fixed times)
 */

// Default timezone if none specified
const DEFAULT_TIMEZONE = 'America/New_York';

// Minimum data points needed for reliable predictions
const MIN_RESPONSE_DATA_POINTS = 5;
const MIN_ENGAGEMENT_DATA_POINTS = 10;

// Weight for recency (more recent patterns weighted higher)
const RECENCY_DECAY_DAYS = 30; // Patterns older than this get reduced weight

/**
 * Analyze response patterns from follow-up history
 * Calculates which hours of day have fastest response times
 * @param {number} contractorId - Contractor ID
 * @returns {Object} - Response pattern analysis
 */
async function analyzeResponsePatterns(contractorId) {
  try {
    console.log(`[OptimalTiming] Analyzing response patterns for contractor ${contractorId}`);

    // Query follow-ups that have both sent_at and response_received_at
    // Group by hour of day to find patterns
    const result = await query(`
      SELECT
        EXTRACT(HOUR FROM sent_at) as send_hour,
        EXTRACT(DOW FROM sent_at) as day_of_week,
        COUNT(*) as total_sent,
        COUNT(response_received_at) as total_responded,
        AVG(
          CASE WHEN response_received_at IS NOT NULL
          THEN EXTRACT(EPOCH FROM (response_received_at - sent_at)) / 60
          END
        ) as avg_response_minutes,
        MIN(
          CASE WHEN response_received_at IS NOT NULL
          THEN EXTRACT(EPOCH FROM (response_received_at - sent_at)) / 60
          END
        ) as min_response_minutes,
        MAX(sent_at) as most_recent_send
      FROM contractor_followup_schedules
      WHERE contractor_id = $1
        AND status = 'sent'
        AND sent_at IS NOT NULL
        AND sent_at >= NOW() - INTERVAL '90 days'
      GROUP BY EXTRACT(HOUR FROM sent_at), EXTRACT(DOW FROM sent_at)
      ORDER BY avg_response_minutes ASC NULLS LAST
    `, [contractorId]);

    const patterns = result.rows;

    if (patterns.length < MIN_RESPONSE_DATA_POINTS) {
      console.log(`[OptimalTiming] Insufficient response data (${patterns.length} < ${MIN_RESPONSE_DATA_POINTS})`);
      return {
        hasEnoughData: false,
        dataPoints: patterns.length,
        patterns: []
      };
    }

    // Calculate response rate and score for each hour/day combo
    const scoredPatterns = patterns.map(p => {
      const responseRate = p.total_responded / p.total_sent;
      const avgMinutes = parseFloat(p.avg_response_minutes) || 999;

      // Score: Higher response rate and lower response time = better
      // Response rate weighted 60%, speed weighted 40%
      const responseScore = responseRate * 60;
      const speedScore = Math.max(0, 40 - (avgMinutes / 10)); // Faster = higher score

      return {
        hour: parseInt(p.send_hour),
        dayOfWeek: parseInt(p.day_of_week), // 0 = Sunday, 6 = Saturday
        totalSent: parseInt(p.total_sent),
        totalResponded: parseInt(p.total_responded),
        responseRate: responseRate,
        avgResponseMinutes: avgMinutes,
        score: responseScore + speedScore,
        mostRecentSend: p.most_recent_send
      };
    });

    // Sort by score descending
    scoredPatterns.sort((a, b) => b.score - a.score);

    console.log(`[OptimalTiming] Found ${scoredPatterns.length} response patterns`);

    return {
      hasEnoughData: true,
      dataPoints: patterns.length,
      patterns: scoredPatterns,
      bestHour: scoredPatterns[0]?.hour,
      bestDayOfWeek: scoredPatterns[0]?.dayOfWeek
    };

  } catch (error) {
    console.error('[OptimalTiming] Error analyzing response patterns:', error);
    throw error;
  }
}

/**
 * Analyze engagement patterns from engagement events
 * Identifies when contractor is most active on the platform
 * @param {number} contractorId - Contractor ID
 * @returns {Object} - Engagement pattern analysis
 */
async function analyzeEngagementPatterns(contractorId) {
  try {
    console.log(`[OptimalTiming] Analyzing engagement patterns for contractor ${contractorId}`);

    // Query engagement events grouped by hour and day of week
    const result = await query(`
      SELECT
        EXTRACT(HOUR FROM created_at) as activity_hour,
        EXTRACT(DOW FROM created_at) as day_of_week,
        COUNT(*) as event_count,
        COUNT(DISTINCT DATE(created_at)) as active_days,
        MAX(created_at) as most_recent_activity
      FROM contractor_engagement_events
      WHERE contractor_id = $1
        AND created_at >= NOW() - INTERVAL '60 days'
      GROUP BY EXTRACT(HOUR FROM created_at), EXTRACT(DOW FROM created_at)
      ORDER BY event_count DESC
    `, [contractorId]);

    const patterns = result.rows;

    if (patterns.length < MIN_ENGAGEMENT_DATA_POINTS) {
      console.log(`[OptimalTiming] Insufficient engagement data (${patterns.length} < ${MIN_ENGAGEMENT_DATA_POINTS})`);
      return {
        hasEnoughData: false,
        dataPoints: patterns.length,
        patterns: []
      };
    }

    // Calculate activity score for each hour/day combo
    const totalEvents = patterns.reduce((sum, p) => sum + parseInt(p.event_count), 0);

    const scoredPatterns = patterns.map(p => {
      const eventCount = parseInt(p.event_count);
      const activeDays = parseInt(p.active_days);

      // Score based on event frequency and consistency
      const frequencyScore = (eventCount / totalEvents) * 70;
      const consistencyScore = (activeDays / 60) * 30; // How many days they're active at this hour

      return {
        hour: parseInt(p.activity_hour),
        dayOfWeek: parseInt(p.day_of_week),
        eventCount: eventCount,
        activeDays: activeDays,
        score: frequencyScore + consistencyScore,
        mostRecentActivity: p.most_recent_activity
      };
    });

    // Sort by score descending
    scoredPatterns.sort((a, b) => b.score - a.score);

    console.log(`[OptimalTiming] Found ${scoredPatterns.length} engagement patterns`);

    return {
      hasEnoughData: true,
      dataPoints: patterns.length,
      patterns: scoredPatterns,
      peakHour: scoredPatterns[0]?.hour,
      peakDayOfWeek: scoredPatterns[0]?.dayOfWeek
    };

  } catch (error) {
    console.error('[OptimalTiming] Error analyzing engagement patterns:', error);
    throw error;
  }
}

/**
 * Get contractor's timezone
 * Checks contractor_ai_profiles first, then contractors table
 * @param {number} contractorId - Contractor ID
 * @returns {string} - Timezone string
 */
async function getContractorTimezone(contractorId) {
  try {
    // Check AI profile first (user preference)
    const profileResult = await query(`
      SELECT timezone FROM contractor_ai_profiles WHERE contractor_id = $1
    `, [contractorId]);

    if (profileResult.rows[0]?.timezone) {
      return profileResult.rows[0].timezone;
    }

    // Fall back to contractors table
    const contractorResult = await query(`
      SELECT timezone FROM contractors WHERE id = $1
    `, [contractorId]);

    return contractorResult.rows[0]?.timezone || DEFAULT_TIMEZONE;

  } catch (error) {
    console.error('[OptimalTiming] Error getting timezone:', error);
    return DEFAULT_TIMEZONE;
  }
}

/**
 * Predict optimal send time for a contractor
 * Combines response patterns + engagement patterns with weighted scoring
 * @param {number} contractorId - Contractor ID
 * @param {string} messageType - Type of message (check_in, reminder, recommendation, etc.)
 * @returns {Object} - Prediction with hour, dayOfWeek, confidence
 */
async function predictOptimalSendTime(contractorId, messageType = 'general') {
  try {
    console.log(`[OptimalTiming] Predicting optimal time for contractor ${contractorId}, type: ${messageType}`);

    // Get both pattern analyses
    const [responseAnalysis, engagementAnalysis] = await Promise.all([
      analyzeResponsePatterns(contractorId),
      analyzeEngagementPatterns(contractorId)
    ]);

    // Check if we have any data
    const hasResponseData = responseAnalysis.hasEnoughData;
    const hasEngagementData = engagementAnalysis.hasEnoughData;

    if (!hasResponseData && !hasEngagementData) {
      console.log('[OptimalTiming] No historical data, using defaults');
      return {
        hour: 10, // Default: 10 AM
        dayOfWeek: null, // Any day
        confidence: 0.1,
        source: 'default',
        reason: 'No historical data available'
      };
    }

    // Build combined hour scores (0-23)
    const hourScores = new Array(24).fill(0);
    const hourDataPoints = new Array(24).fill(0);

    // Weight response data at 60% (direct signal of engagement)
    if (hasResponseData) {
      responseAnalysis.patterns.forEach(p => {
        hourScores[p.hour] += p.score * 0.6;
        hourDataPoints[p.hour]++;
      });
    }

    // Weight engagement data at 40% (activity signal)
    if (hasEngagementData) {
      engagementAnalysis.patterns.forEach(p => {
        hourScores[p.hour] += p.score * 0.4;
        hourDataPoints[p.hour]++;
      });
    }

    // Find best hour
    let bestHour = 10; // Default
    let bestScore = 0;
    for (let hour = 0; hour < 24; hour++) {
      if (hourScores[hour] > bestScore) {
        bestScore = hourScores[hour];
        bestHour = hour;
      }
    }

    // Calculate confidence based on data quality
    const totalDataPoints = (responseAnalysis.dataPoints || 0) + (engagementAnalysis.dataPoints || 0);
    const confidence = Math.min(0.95, totalDataPoints / 50); // Max 95% confidence

    // Determine best day of week (if patterns show one)
    let bestDayOfWeek = null;
    if (hasResponseData && responseAnalysis.patterns.length > 0) {
      // Find the day with best score for the best hour
      const bestHourPatterns = responseAnalysis.patterns.filter(p => p.hour === bestHour);
      if (bestHourPatterns.length > 0) {
        bestHourPatterns.sort((a, b) => b.score - a.score);
        bestDayOfWeek = bestHourPatterns[0].dayOfWeek;
      }
    }

    const result = {
      hour: bestHour,
      dayOfWeek: bestDayOfWeek,
      confidence: parseFloat(confidence.toFixed(2)),
      source: hasResponseData && hasEngagementData ? 'combined' : (hasResponseData ? 'response' : 'engagement'),
      reason: `Based on ${totalDataPoints} data points from ${hasResponseData ? 'response history' : ''}${hasResponseData && hasEngagementData ? ' and ' : ''}${hasEngagementData ? 'engagement patterns' : ''}`,
      score: bestScore,
      analysisDetails: {
        responsePatterns: responseAnalysis.hasEnoughData ? responseAnalysis.patterns.slice(0, 5) : [],
        engagementPatterns: engagementAnalysis.hasEnoughData ? engagementAnalysis.patterns.slice(0, 5) : []
      }
    };

    console.log(`[OptimalTiming] Prediction: ${bestHour}:00, confidence ${result.confidence}`);
    return result;

  } catch (error) {
    console.error('[OptimalTiming] Error predicting optimal time:', error);
    // Return safe default on error
    return {
      hour: 10,
      dayOfWeek: null,
      confidence: 0.1,
      source: 'error_fallback',
      reason: 'Error during prediction, using default'
    };
  }
}

/**
 * Calculate the next optimal time slot for a contractor
 * Returns a specific Date object for scheduling
 * @param {number} contractorId - Contractor ID
 * @param {string} messageType - Type of message
 * @param {Date} notBefore - Earliest allowed time (default: now)
 * @returns {Date} - Optimal scheduled time
 */
async function calculateNextOptimalSlot(contractorId, messageType = 'general', notBefore = null) {
  try {
    const prediction = await predictOptimalSendTime(contractorId, messageType);
    const timezone = await getContractorTimezone(contractorId);

    const now = notBefore || new Date();
    const targetHour = prediction.hour;
    const targetDayOfWeek = prediction.dayOfWeek;

    // Start with today
    let targetDate = new Date(now);

    // Set to target hour (in UTC, will need timezone adjustment in production)
    targetDate.setHours(targetHour, 0, 0, 0);

    // If target time already passed today, move to tomorrow
    if (targetDate <= now) {
      targetDate.setDate(targetDate.getDate() + 1);
    }

    // If specific day of week is preferred, find next occurrence
    if (targetDayOfWeek !== null) {
      const currentDayOfWeek = targetDate.getDay();
      if (currentDayOfWeek !== targetDayOfWeek) {
        const daysUntilTarget = (targetDayOfWeek - currentDayOfWeek + 7) % 7;
        targetDate.setDate(targetDate.getDate() + (daysUntilTarget || 7));
      }
    }

    console.log(`[OptimalTiming] Next optimal slot for contractor ${contractorId}: ${targetDate.toISOString()}`);

    return {
      scheduledTime: targetDate,
      prediction: prediction,
      timezone: timezone
    };

  } catch (error) {
    console.error('[OptimalTiming] Error calculating next slot:', error);
    // Return a safe default: tomorrow at 10 AM
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);
    return {
      scheduledTime: tomorrow,
      prediction: { hour: 10, confidence: 0.1, source: 'error_fallback' },
      timezone: DEFAULT_TIMEZONE
    };
  }
}

/**
 * Update contractor's AI profile with learned timing preferences
 * Called periodically to persist learned patterns
 * @param {number} contractorId - Contractor ID
 * @returns {Object} - Updated profile data
 */
async function updateContractorTimingProfile(contractorId) {
  try {
    const prediction = await predictOptimalSendTime(contractorId);

    if (prediction.confidence < 0.3) {
      console.log(`[OptimalTiming] Confidence too low (${prediction.confidence}) to update profile`);
      return null;
    }

    // Map hour to time period for best_contact_times field
    const hourToTimePeriod = (hour) => {
      if (hour >= 6 && hour < 12) return 'morning';
      if (hour >= 12 && hour < 17) return 'afternoon';
      if (hour >= 17 && hour < 21) return 'evening';
      return 'night';
    };

    const bestTimePeriod = hourToTimePeriod(prediction.hour);

    // Update the AI profile with learned timing
    const result = await query(`
      UPDATE contractor_ai_profiles
      SET best_contact_times = $1,
          updated_at = NOW()
      WHERE contractor_id = $2
      RETURNING id, best_contact_times
    `, [
      safeJsonStringify([bestTimePeriod]),
      contractorId
    ]);

    if (result.rows.length === 0) {
      console.log(`[OptimalTiming] No AI profile found for contractor ${contractorId}`);
      return null;
    }

    console.log(`[OptimalTiming] Updated profile for contractor ${contractorId}: ${bestTimePeriod}`);
    return {
      contractorId,
      bestContactTimes: [bestTimePeriod],
      prediction
    };

  } catch (error) {
    console.error('[OptimalTiming] Error updating timing profile:', error);
    throw error;
  }
}

/**
 * Get timing statistics for analytics/monitoring
 * @returns {Object} - System-wide timing statistics
 */
async function getTimingStatistics() {
  try {
    const result = await query(`
      SELECT
        EXTRACT(HOUR FROM sent_at) as hour,
        COUNT(*) as total_sent,
        COUNT(response_received_at) as total_responded,
        ROUND(AVG(
          CASE WHEN response_received_at IS NOT NULL
          THEN EXTRACT(EPOCH FROM (response_received_at - sent_at)) / 60
          END
        )::numeric, 2) as avg_response_minutes
      FROM contractor_followup_schedules
      WHERE status = 'sent'
        AND sent_at IS NOT NULL
        AND sent_at >= NOW() - INTERVAL '30 days'
      GROUP BY EXTRACT(HOUR FROM sent_at)
      ORDER BY hour
    `);

    return {
      hourlyStats: result.rows,
      generatedAt: new Date().toISOString()
    };

  } catch (error) {
    console.error('[OptimalTiming] Error getting statistics:', error);
    throw error;
  }
}

module.exports = {
  analyzeResponsePatterns,
  analyzeEngagementPatterns,
  predictOptimalSendTime,
  calculateNextOptimalSlot,
  updateContractorTimingProfile,
  getContractorTimezone,
  getTimingStatistics
};
