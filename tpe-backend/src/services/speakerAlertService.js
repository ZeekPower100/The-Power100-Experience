const { query } = require('../config/database');
const { safeJsonParse, safeJsonStringify } = require('../utils/jsonHelpers');
const eventAIOrchestrationService = require('./eventAIOrchestrationService');

/**
 * Speaker Alert Service
 * Handles 15-minute pre-session notifications for event attendees
 * Sends personalized SMS alerts based on focus area relevance
 * ALL FIELD NAMES MATCH DATABASE COLUMNS EXACTLY
 */
class SpeakerAlertService {
  /**
   * Check for upcoming sessions and send alerts
   * This should be called every minute by a cron job
   */
  async checkAndSendAlerts() {
    try {
      // Find all sessions starting in the next 15-16 minutes
      // We use a 1-minute window to account for cron timing
      const upcomingSessions = await query(`
        SELECT
          eai.id,
          eai.event_id,
          eai.title,
          eai.start_time,
          eai.location,
          eai.synopsis,
          eai.focus_areas,
          eai.speaker_id,
          es.name as speaker_name,
          es.title as speaker_title,
          es.company as speaker_company,
          e.name as event_name
        FROM event_agenda_items eai
        LEFT JOIN event_speakers es ON eai.speaker_id = es.id
        LEFT JOIN events e ON eai.event_id = e.id
        WHERE
          eai.start_time BETWEEN NOW() + INTERVAL '15 minutes' AND NOW() + INTERVAL '16 minutes'
          AND eai.item_type IN ('keynote', 'session', 'workshop', 'panel')
          AND eai.status = 'confirmed'
          AND eai.speaker_id IS NOT NULL
      `);

      if (upcomingSessions.rows.length === 0) {
        console.log('[SpeakerAlerts] No upcoming sessions in the next 15 minutes');
        return { sessions_found: 0, alerts_sent: 0 };
      }

      console.log(`[SpeakerAlerts] Found ${upcomingSessions.rows.length} upcoming sessions`);

      let totalAlertsSent = 0;

      for (const session of upcomingSessions.rows) {
        const alertsSent = await this.sendSessionAlerts(session);
        totalAlertsSent += alertsSent;
      }

      return {
        sessions_found: upcomingSessions.rows.length,
        alerts_sent: totalAlertsSent
      };
    } catch (error) {
      console.error('[SpeakerAlerts] Error checking for alerts:', error);
      throw error;
    }
  }

  /**
   * Send alerts for a specific session to relevant attendees
   */
  async sendSessionAlerts(session) {
    try {
      const sessionFocusAreas = safeJsonParse(session.focus_areas, []);

      // Find attendees who:
      // 1. Are checked in to the event
      // 2. Have opted in for SMS
      // 3. Have matching focus areas OR the session is marked as mandatory
      const relevantAttendees = await query(`
        SELECT DISTINCT
          ea.contractor_id,
          ea.real_phone,
          c.name as contractor_name,
          c.company_name,
          c.focus_areas as contractor_focus_areas
        FROM event_attendees ea
        JOIN contractors c ON ea.contractor_id = c.id
        WHERE
          ea.event_id = $1
          AND ea.check_in_time IS NOT NULL
          AND ea.sms_opt_in = true
          AND (ea.real_phone IS NOT NULL OR c.phone IS NOT NULL)
          AND NOT EXISTS (
            -- Don't send if we already sent an alert for this session
            SELECT 1 FROM event_messages em
            WHERE em.event_id = $1
            AND em.contractor_id = ea.contractor_id
            AND em.message_type = 'speaker_alert'
            AND em.personalization_data->>'session_id' = $2
            AND em.created_at > NOW() - INTERVAL '30 minutes'
          )
      `, [session.event_id, session.id.toString()]);

      if (relevantAttendees.rows.length === 0) {
        console.log(`[SpeakerAlerts] No relevant attendees for session ${session.id}`);
        return 0;
      }

      let alertsSent = 0;

      for (const attendee of relevantAttendees.rows) {
        // Check if this session matches the attendee's focus areas
        const contractorFocusAreas = attendee.contractor_focus_areas?.split(',') || [];
        const hasMatchingFocus = sessionFocusAreas.some(area =>
          contractorFocusAreas.includes(area)
        );

        // Skip if no matching focus areas (unless mandatory session)
        if (!hasMatchingFocus && sessionFocusAreas.length > 0) {
          continue;
        }

        // Send the alert
        const sent = await this.sendIndividualAlert(session, attendee);
        if (sent) alertsSent++;
      }

      console.log(`[SpeakerAlerts] Sent ${alertsSent} alerts for session ${session.id}`);
      return alertsSent;
    } catch (error) {
      console.error(`[SpeakerAlerts] Error sending alerts for session ${session.id}:`, error);
      return 0;
    }
  }

  /**
   * Send an individual alert to an attendee
   */
  async sendIndividualAlert(session, attendee) {
    try {
      const phone = attendee.real_phone || attendee.phone;
      const startTime = new Date(session.start_time);
      const timeStr = startTime.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });

      // Build personalized message
      const message = this.buildAlertMessage(session, attendee, timeStr);

      // Store the message in event_messages using EXACT column names
      await query(`
        INSERT INTO event_messages (
          event_id,
          contractor_id,
          message_type,
          message_category,
          scheduled_time,
          actual_send_time,
          message_content,
          personalization_data,
          status,
          created_at,
          updated_at
        ) VALUES ($1, $2, $3, $4, $5, NOW(), $6, $7, 'pending', NOW(), NOW())
      `, [
        session.event_id,
        attendee.contractor_id,
        'speaker_alert',
        'alert',
        startTime,
        message,
        safeJsonStringify({
          session_id: session.id,
          speaker_name: session.speaker_name,
          location: session.location
        })
      ]);

      // Send via n8n webhook
      const payload = {
        event_type: 'speaker_alert',
        event_id: session.event_id,
        contractor_id: attendee.contractor_id,
        phone: phone,
        message: message,
        session_info: {
          id: session.id,
          title: session.title,
          speaker: session.speaker_name,
          time: timeStr,
          location: session.location
        }
      };

      // Send to n8n webhook (adjust URL as needed)
      const N8N_WEBHOOK_BASE = process.env.NODE_ENV === 'production'
        ? (process.env.N8N_WEBHOOK_URL || 'https://n8n.srv918843.hstgr.cloud')
        : (process.env.N8N_DEV_WEBHOOK_URL || 'http://localhost:5678');

      const response = await fetch(`${N8N_WEBHOOK_BASE}/webhook/event-speaker-alert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: safeJsonStringify(payload)
      });

      if (response.ok) {
        // Update message status to sent using EXACT column names
        await query(`
          UPDATE event_messages
          SET status = 'sent', actual_send_time = NOW(), updated_at = NOW()
          WHERE event_id = $1
          AND contractor_id = $2
          AND message_type = 'speaker_alert'
          AND personalization_data->>'session_id' = $3
          ORDER BY created_at DESC
          LIMIT 1
        `, [session.event_id, attendee.contractor_id, session.id.toString()]);

        return true;
      } else {
        console.error(`[SpeakerAlerts] Failed to send webhook for contractor ${attendee.contractor_id}`);
        return false;
      }
    } catch (error) {
      console.error(`[SpeakerAlerts] Error sending individual alert:`, error);
      return false;
    }
  }

  /**
   * Build personalized alert message
   */
  buildAlertMessage(session, attendee, timeStr) {
    const firstName = attendee.contractor_name?.split(' ')[0] || 'there';
    const location = session.location || 'Main Hall';

    // Different message formats based on context
    const templates = [
      `⏰ ${firstName}, ${session.speaker_name} is about to speak at ${timeStr} in ${location}! "${session.title}" - Don't miss it!`,
      `🎤 Starting in 15 min: ${session.speaker_name} on "${session.title}" - ${location} at ${timeStr}. See you there, ${firstName}!`,
      `📍 ${session.speaker_name} takes the stage in 15 minutes! "${session.title}" - ${location}. Head over now to get a good seat!`
    ];

    // Pick a template based on session ID (consistent per session)
    const templateIndex = session.id % templates.length;
    let message = templates[templateIndex];

    // Add synopsis if short enough
    if (session.synopsis && session.synopsis.length < 50) {
      message += ` ${session.synopsis}`;
    }

    // Add focus area relevance if applicable
    const focusAreas = safeJsonParse(session.focus_areas, []);
    if (focusAreas.length > 0) {
      message += ` Perfect for your ${focusAreas[0]} focus!`;
    }

    return message;
  }

  /**
   * Test alert system with mock data
   */
  async testAlertSystem(event_id, contractor_id) {
    try {
      // Get a real upcoming session using EXACT column names
      const testSession = await query(`
        SELECT
          eai.*,
          es.name as speaker_name,
          es.title as speaker_title,
          es.company as speaker_company
        FROM event_agenda_items eai
        LEFT JOIN event_speakers es ON eai.speaker_id = es.id
        WHERE
          eai.event_id = $1
          AND eai.speaker_id IS NOT NULL
        ORDER BY eai.start_time DESC
        LIMIT 1
      `, [event_id]);

      if (testSession.rows.length === 0) {
        return { success: false, error: 'No sessions found for this event' };
      }

      // Get contractor info using EXACT column names
      const contractor = await query(`
        SELECT c.*, ea.real_phone, ea.sms_opt_in
        FROM contractors c
        LEFT JOIN event_attendees ea ON c.id = ea.contractor_id AND ea.event_id = $1
        WHERE c.id = $2
      `, [event_id, contractor_id]);

      if (contractor.rows.length === 0) {
        return { success: false, error: 'Contractor not found' };
      }

      // Send test alert
      const sent = await this.sendIndividualAlert(
        testSession.rows[0],
        contractor.rows[0]
      );

      return {
        success: sent,
        message: sent ? 'Test alert sent successfully' : 'Failed to send test alert',
        session: testSession.rows[0].title,
        speaker: testSession.rows[0].speaker_name
      };
    } catch (error) {
      console.error('[SpeakerAlerts] Test failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Process scheduled speaker alerts
   * Called by cron job every minute
   */
  async processScheduledAlerts() {
    try {
      console.log('[SpeakerAlerts] Processing scheduled alerts...');
      const result = await this.checkAndSendAlerts();
      console.log('[SpeakerAlerts] Processing complete:', result);
      return result;
    } catch (error) {
      console.error('[SpeakerAlerts] Error processing scheduled alerts:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = new SpeakerAlertService();