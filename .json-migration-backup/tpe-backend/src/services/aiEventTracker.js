/**
 * AI Event Tracking Service
 * Utility service for automatic event tracking throughout the application
 */

const pool = require('../config/database');

class AIEventTracker {
  /**
   * Track a simple event
   */
  static async trackEvent(contractorId, eventType, data = {}, channel = 'web') {
    try {
      await pool.query(
        `INSERT INTO contractor_engagement_events 
         (contractor_id, event_type, event_data, channel, created_at)
         VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)`,
        [contractorId, eventType, JSON.stringify(data), channel]
      );
      return true;
    } catch (error) {
      console.error('Error tracking event:', error);
      return false;
    }
  }

  /**
   * Track login event
   */
  static async trackLogin(contractorId, channel = 'web') {
    return this.trackEvent(contractorId, 'login', {
      timestamp: new Date().toISOString()
    }, channel);
  }

  /**
   * Track page view
   */
  static async trackPageView(contractorId, page, additionalData = {}) {
    return this.trackEvent(contractorId, 'page_view', {
      page,
      ...additionalData
    });
  }

  /**
   * Track form submission
   */
  static async trackFormSubmit(contractorId, formName, data = {}) {
    return this.trackEvent(contractorId, 'form_submit', {
      form: formName,
      ...data
    });
  }

  /**
   * Track partner match view
   */
  static async trackPartnerMatchView(contractorId, partnerId, matchScore) {
    return this.trackEvent(contractorId, 'partner_match_view', {
      partner_id: partnerId,
      match_score: matchScore
    });
  }

  /**
   * Track demo booking
   */
  static async trackDemoBooking(contractorId, partnerId) {
    return this.trackEvent(contractorId, 'demo_booking', {
      partner_id: partnerId
    });
  }

  /**
   * Track email interaction
   */
  static async trackEmailInteraction(contractorId, action, emailId) {
    return this.trackEvent(contractorId, `email_${action}`, {
      email_id: emailId
    }, 'email');
  }

  /**
   * Track SMS interaction
   */
  static async trackSMSInteraction(contractorId, action, messageId) {
    return this.trackEvent(contractorId, `sms_${action}`, {
      message_id: messageId
    }, 'sms');
  }

  /**
   * Track content recommendation
   */
  static async recommendContent(contractorId, contentType, contentId, contentName, reason, confidence = 50) {
    try {
      await pool.query(
        `INSERT INTO contractor_recommendations 
         (contractor_id, entity_type, entity_id, entity_name, reason, confidence_score)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [contractorId, contentType, contentId, contentName, reason, confidence]
      );
      return true;
    } catch (error) {
      console.error('Error tracking recommendation:', error);
      return false;
    }
  }

  /**
   * Track content engagement
   */
  static async trackContentEngagement(contractorId, contentType, contentId, contentTitle, engagementType, progress = 0) {
    try {
      await pool.query(
        `INSERT INTO contractor_content_engagement 
         (contractor_id, content_type, content_id, content_title, engagement_type, progress)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (contractor_id, content_type, content_id) 
         DO UPDATE SET 
           engagement_type = EXCLUDED.engagement_type,
           progress = GREATEST(contractor_content_engagement.progress, EXCLUDED.progress),
           updated_at = CURRENT_TIMESTAMP`,
        [contractorId, contentType, contentId, contentTitle, engagementType, progress]
      );
      return true;
    } catch (error) {
      console.error('Error tracking content engagement:', error);
      return false;
    }
  }

  /**
   * Log business goal
   */
  static async logBusinessGoal(contractorId, goal, priority = 3, timeline = null) {
    try {
      await pool.query(
        `INSERT INTO contractor_business_goals 
         (contractor_id, goal, priority, timeline)
         VALUES ($1, $2, $3, $4)`,
        [contractorId, goal, priority, timeline]
      );
      return true;
    } catch (error) {
      console.error('Error logging business goal:', error);
      return false;
    }
  }

  /**
   * Log challenge
   */
  static async logChallenge(contractorId, challenge, severity = 'medium') {
    try {
      await pool.query(
        `INSERT INTO contractor_challenges 
         (contractor_id, challenge, severity)
         VALUES ($1, $2, $3)`,
        [contractorId, challenge, severity]
      );
      return true;
    } catch (error) {
      console.error('Error logging challenge:', error);
      return false;
    }
  }

  /**
   * Log communication
   */
  static async logCommunication(contractorId, channel, direction, subject, content, status = 'sent') {
    try {
      await pool.query(
        `INSERT INTO contractor_communications 
         (contractor_id, channel, direction, subject, content, status)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [contractorId, channel, direction, subject, content, status]
      );
      return true;
    } catch (error) {
      console.error('Error logging communication:', error);
      return false;
    }
  }

  /**
   * Get contractor's current metrics
   */
  static async getContractorMetrics(contractorId) {
    try {
      const result = await pool.query(
        `SELECT 
          engagement_score, 
          churn_risk, 
          growth_potential, 
          lifecycle_stage, 
          next_best_action
         FROM contractors 
         WHERE id = $1`,
        [contractorId]
      );
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error getting contractor metrics:', error);
      return null;
    }
  }

  /**
   * Get engagement summary
   */
  static async getEngagementSummary(contractorId, days = 7) {
    try {
      const result = await pool.query(
        `SELECT 
          COUNT(*) as total_events,
          COUNT(DISTINCT DATE_TRUNC('day', created_at)) as active_days,
          COUNT(DISTINCT session_id) as unique_sessions,
          array_agg(DISTINCT event_type) as event_types,
          array_agg(DISTINCT channel) as channels
         FROM contractor_engagement_events
         WHERE contractor_id = $1 
         AND created_at > CURRENT_DATE - INTERVAL '${days} days'`,
        [contractorId]
      );
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error getting engagement summary:', error);
      return null;
    }
  }
}

module.exports = AIEventTracker;