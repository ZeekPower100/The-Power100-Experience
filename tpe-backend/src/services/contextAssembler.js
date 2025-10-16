/**
 * Context Assembler Service
 *
 * Purpose: Query materialized views and assemble typed context bundles for AI Concierge
 *
 * This service provides a clean API for retrieving pre-computed event context from
 * materialized views. It acts as the single source of truth for event-related context.
 *
 * Key Features:
 * - Query mv_sessions_now and mv_sessions_next_60
 * - Assemble typed context bundles (EventContext interface)
 * - Format for AI consumption with clear structure
 * - Support contractor-specific context queries
 *
 * Phase 1: Event Truth Management
 * Date: October 13, 2025
 *
 * Phase 5 Day 3: Caching Integration
 * Date: October 16, 2025
 * - Added Redis caching for event context (60 second TTL)
 * - Cache reduces database load for frequent event context queries
 */

const db = require('../config/database.postgresql');
const cacheService = require('./cacheService');

/**
 * @typedef {Object} SessionContext
 * @property {number} session_id - Session ID
 * @property {number} event_id - Event ID
 * @property {string} speaker_name - Speaker name
 * @property {string} session_title - Session title
 * @property {string} session_time - Session start time (ISO 8601)
 * @property {string} session_end - Session end time (ISO 8601)
 * @property {Array<string>} focus_areas - Session focus areas
 * @property {string} session_location - Session location
 * @property {string} session_description - Session description
 * @property {string} event_name - Event name
 * @property {string} event_timezone - Event timezone
 * @property {number} relevance_score - Relevance score (50-100)
 * @property {number} focus_area_match_count - Number of matching focus areas
 */

/**
 * @typedef {Object} UpcomingSessionContext
 * @property {number} session_id - Session ID
 * @property {number} event_id - Event ID
 * @property {string} speaker_name - Speaker name
 * @property {string} session_title - Session title
 * @property {string} session_time - Session start time (ISO 8601)
 * @property {string} session_end - Session end time (ISO 8601)
 * @property {Array<string>} focus_areas - Session focus areas
 * @property {string} session_location - Session location
 * @property {string} session_description - Session description
 * @property {string} event_name - Event name
 * @property {string} event_timezone - Event timezone
 * @property {number} minutes_until_start - Minutes until session starts
 * @property {number} match_count - Number of matching focus areas
 * @property {number} priority_score - Priority score (urgency + relevance)
 */

/**
 * @typedef {Object} EventContext
 * @property {Array<SessionContext>} sessions_now - Sessions happening right now
 * @property {Array<UpcomingSessionContext>} sessions_next_60 - Sessions in next 60 minutes
 * @property {number} total_active_sessions - Total sessions currently active
 * @property {number} total_upcoming_sessions - Total upcoming sessions
 * @property {string} context_timestamp - When context was assembled (ISO 8601)
 */

class ContextAssembler {
  /**
   * Get sessions happening RIGHT NOW for a contractor
   * @param {number} contractorId - Contractor ID
   * @returns {Promise<Array<SessionContext>>}
   */
  async getSessionsNow(contractorId) {
    try {
      const query = `
        SELECT
          session_id,
          event_id,
          speaker_name,
          session_title,
          session_time,
          session_end,
          focus_areas,
          session_location,
          session_description,
          event_name,
          event_timezone,
          relevance_score,
          focus_area_match_count
        FROM mv_sessions_now
        WHERE contractor_id = $1
        ORDER BY relevance_score DESC, focus_area_match_count DESC;
      `;

      const result = await db.query(query, [contractorId]);

      return result.rows.map(row => ({
        ...row,
        focus_areas: typeof row.focus_areas === 'string'
          ? JSON.parse(row.focus_areas)
          : row.focus_areas
      }));
    } catch (error) {
      console.error('Error getting sessions now:', error);
      throw error;
    }
  }

  /**
   * Get upcoming sessions in next 60 minutes for a contractor
   * @param {number} contractorId - Contractor ID
   * @returns {Promise<Array<UpcomingSessionContext>>}
   */
  async getSessionsNext60(contractorId) {
    try {
      const query = `
        SELECT
          session_id,
          event_id,
          speaker_name,
          session_title,
          session_time,
          session_end,
          focus_areas,
          session_location,
          session_description,
          event_name,
          event_timezone,
          minutes_until_start,
          match_count,
          priority_score
        FROM mv_sessions_next_60
        WHERE contractor_id = $1
        ORDER BY priority_score DESC, minutes_until_start ASC;
      `;

      const result = await db.query(query, [contractorId]);

      return result.rows.map(row => ({
        ...row,
        focus_areas: typeof row.focus_areas === 'string'
          ? JSON.parse(row.focus_areas)
          : row.focus_areas,
        minutes_until_start: parseFloat(row.minutes_until_start)
      }));
    } catch (error) {
      console.error('Error getting sessions next 60:', error);
      throw error;
    }
  }

  /**
   * Get complete event context for a contractor
   * Phase 5 Day 3: Added caching with 60 second TTL
   * @param {number} contractorId - Contractor ID
   * @returns {Promise<EventContext>}
   */
  async getEventContext(contractorId) {
    try {
      // Try cache first (Phase 5 Day 3: Caching integration)
      const cached = await cacheService.getEventContext(contractorId);
      if (cached) {
        console.log(`[Context Assembler] Using cached event context for contractor ${contractorId}`);
        return cached;
      }

      // Cache miss - query database
      console.log(`[Context Assembler] Cache miss - querying database for contractor ${contractorId}`);
      const [sessionsNow, sessionsNext60] = await Promise.all([
        this.getSessionsNow(contractorId),
        this.getSessionsNext60(contractorId)
      ]);

      const context = {
        sessions_now: sessionsNow,
        sessions_next_60: sessionsNext60,
        total_active_sessions: sessionsNow.length,
        total_upcoming_sessions: sessionsNext60.length,
        context_timestamp: new Date().toISOString()
      };

      // Cache for 60 seconds (event data changes frequently)
      await cacheService.cacheEventContext(contractorId, context);

      return context;
    } catch (error) {
      console.error('Error assembling event context:', error);
      throw error;
    }
  }

  /**
   * Format event context for AI consumption
   * Returns a human-readable text summary optimized for AI understanding
   * @param {EventContext} context - Event context object
   * @returns {string} Formatted context text
   */
  formatForAI(context) {
    const parts = [];

    parts.push(`EVENT CONTEXT (as of ${context.context_timestamp})`);
    parts.push('=' .repeat(60));

    // Sessions happening now
    if (context.total_active_sessions > 0) {
      parts.push('\n🔴 SESSIONS HAPPENING RIGHT NOW:');
      context.sessions_now.forEach((session, index) => {
        parts.push(`\n${index + 1}. "${session.session_title}" by ${session.speaker_name}`);
        parts.push(`   Event: ${session.event_name}`);
        parts.push(`   Location: ${session.session_location}`);
        parts.push(`   Time: ${new Date(session.session_time).toLocaleString('en-US', {
          timeZone: session.event_timezone
        })} - ${new Date(session.session_end).toLocaleString('en-US', {
          timeZone: session.event_timezone,
          hour: '2-digit',
          minute: '2-digit'
        })}`);
        if (session.focus_area_match_count > 0) {
          parts.push(`   ⭐ ${session.focus_area_match_count} of your focus areas match this session`);
        }
        parts.push(`   Relevance Score: ${session.relevance_score}/100`);
      });
    } else {
      parts.push('\n✅ No sessions happening right now');
    }

    // Upcoming sessions
    if (context.total_upcoming_sessions > 0) {
      parts.push('\n\n⏰ UPCOMING SESSIONS (Next 60 minutes):');
      context.sessions_next_60.forEach((session, index) => {
        const minutesRounded = Math.round(session.minutes_until_start);
        parts.push(`\n${index + 1}. "${session.session_title}" by ${session.speaker_name}`);
        parts.push(`   Event: ${session.event_name}`);
        parts.push(`   Location: ${session.session_location}`);
        parts.push(`   Starts in: ${minutesRounded} minutes`);
        parts.push(`   Time: ${new Date(session.session_time).toLocaleString('en-US', {
          timeZone: session.event_timezone,
          hour: '2-digit',
          minute: '2-digit'
        })}`);
        if (session.match_count > 0) {
          parts.push(`   ⭐ ${session.match_count} of your focus areas match this session`);
        }
        parts.push(`   Priority Score: ${session.priority_score}/100`);
      });
    } else {
      parts.push('\n\n✅ No sessions in the next 60 minutes');
    }

    parts.push('\n' + '='.repeat(60));

    return parts.join('\n');
  }

  /**
   * Get event context stats (useful for admin dashboard)
   * @returns {Promise<Object>}
   */
  async getContextStats() {
    try {
      const query = `
        SELECT
          (SELECT COUNT(DISTINCT contractor_id) FROM mv_sessions_now) as contractors_with_active_sessions,
          (SELECT COUNT(DISTINCT contractor_id) FROM mv_sessions_next_60) as contractors_with_upcoming_sessions,
          (SELECT COUNT(DISTINCT event_id) FROM mv_sessions_now) as events_with_active_sessions,
          (SELECT COUNT(DISTINCT event_id) FROM mv_sessions_next_60) as events_with_upcoming_sessions,
          (SELECT COUNT(*) FROM mv_sessions_now) as total_active_session_records,
          (SELECT COUNT(*) FROM mv_sessions_next_60) as total_upcoming_session_records;
      `;

      const result = await db.query(query);
      return result.rows[0];
    } catch (error) {
      console.error('Error getting context stats:', error);
      throw error;
    }
  }
}

module.exports = new ContextAssembler();
