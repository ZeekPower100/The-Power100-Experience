// ================================================================
// Heartbeat Configuration — Inner Circle Proactive Engagement
// ================================================================
// Purpose: Thresholds and schedule for the heartbeat engine
//          that drives proactive member outreach
// ================================================================

module.exports = {
  // PowerMove check-in triggers
  CHECKIN_OVERDUE_DAYS: 7,       // Days since last check-in before reaching out
  CHECKIN_URGENT_DAYS: 10,       // Days before more urgent nudge
  CHECKIN_CRITICAL_DAYS: 14,     // Days before concern message

  // PowerMove deadline triggers
  DEADLINE_WARNING_DAYS: 14,     // Days before deadline to warn
  DEADLINE_URGENT_DAYS: 7,       // Days before urgent reminder

  // Re-engagement triggers
  INACTIVE_DAYS: 14,             // Days without any interaction
  MAX_REENGAGEMENT_ATTEMPTS: 3,  // Stop after 3 attempts

  // Rate limits
  MAX_PROACTIVE_PER_DAY: 3,     // Max proactive messages per member per day
  SKIP_IF_ACTIVE_TODAY: true,   // Don't send if member already chatted today

  // Schedule
  SCAN_CRON: '0 9 * * *',       // 9 AM daily
  TIMEZONE: 'America/New_York'   // Default timezone
};
