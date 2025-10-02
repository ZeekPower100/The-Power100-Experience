const { query } = require('../config/database');
const { safeJsonParse, safeJsonStringify } = require('../utils/jsonHelpers');
const eventAIRecommendationService = require('./eventAIRecommendationService');
const {
  triggerSpeakerRecommendationSMS,
  triggerSponsorRecommendationSMS
} = require('../controllers/n8nEventWebhookController');

/**
 * Event AI Orchestration Service
 * Combines AI recommendations with SMS delivery
 * ALL FIELD NAMES MATCH DATABASE COLUMNS EXACTLY
 */
class EventAIOrchestrationService {
  /**
   * Send AI speaker recommendations via SMS
   * Uses EXACT database column names
   */
  async sendSpeakerRecommendations(event_id, contractor_id, options = {}) {
    try {
      const { limit = 3, send_immediately = true } = options;

      // Check if contractor is opted in for SMS
      const attendeeCheck = await query(`
        SELECT
          ea.sms_opt_in,
          ea.real_phone,
          c.phone,
          c.company_name,
          c.name
        FROM event_attendees ea
        JOIN contractors c ON ea.contractor_id = c.id
        WHERE ea.event_id = $1 AND ea.contractor_id = $2
      `, [event_id, contractor_id]);

      if (attendeeCheck.rows.length === 0) {
        return {
          success: false,
          error: 'Contractor not registered for this event'
        };
      }

      const attendee = attendeeCheck.rows[0];

      // Check SMS opt-in status
      if (!attendee.sms_opt_in) {
        return {
          success: false,
          error: 'Contractor has not opted in for SMS'
        };
      }

      // Get AI recommendations
      const recommendations = await eventAIRecommendationService.recommendSpeakers(
        event_id,
        contractor_id,
        limit
      );

      if (!recommendations.recommendations || recommendations.recommendations.length === 0) {
        return {
          success: false,
          error: 'No speaker recommendations available'
        };
      }

      // Send via SMS if requested
      if (send_immediately) {
        const smsSent = await triggerSpeakerRecommendationSMS(
          event_id,
          contractor_id,
          recommendations.recommendations
        );

        // Update event_messages status
        if (smsSent) {
          await query(`
            UPDATE event_messages
            SET
              status = 'sent',
              actual_send_time = NOW(),
              updated_at = NOW()
            WHERE id = (
              SELECT id
              FROM event_messages
              WHERE event_id = $1
                AND contractor_id = $2
                AND message_type = 'speaker_recommendation'
                AND status = 'pending'
              ORDER BY created_at DESC
              LIMIT 1
            )
          `, [event_id, contractor_id]);
        }

        return {
          success: smsSent,
          recommendations: recommendations.recommendations,
          message: smsSent ? 'Speaker recommendations sent via SMS' : 'Failed to send SMS'
        };
      } else {
        // Just return recommendations without sending
        return {
          success: true,
          recommendations: recommendations.recommendations,
          message: 'Speaker recommendations generated (not sent)'
        };
      }
    } catch (error) {
      console.error('Error in sendSpeakerRecommendations:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Send AI sponsor recommendations with talking points via SMS
   * Uses EXACT database column names
   */
  async sendSponsorRecommendations(event_id, contractor_id, options = {}) {
    try {
      const { limit = 3, send_immediately = true } = options;

      // Check if contractor is opted in using EXACT column names
      const attendeeCheck = await query(`
        SELECT
          ea.sms_opt_in,
          ea.real_phone,
          c.phone,
          c.company_name,
          c.name
        FROM event_attendees ea
        JOIN contractors c ON ea.contractor_id = c.id
        WHERE ea.event_id = $1 AND ea.contractor_id = $2
      `, [event_id, contractor_id]);

      if (attendeeCheck.rows.length === 0) {
        return {
          success: false,
          error: 'Contractor not registered for this event'
        };
      }

      const attendee = attendeeCheck.rows[0];

      if (!attendee.sms_opt_in) {
        return {
          success: false,
          error: 'Contractor has not opted in for SMS'
        };
      }

      // Get AI recommendations
      const recommendations = await eventAIRecommendationService.recommendSponsors(
        event_id,
        contractor_id,
        limit
      );

      if (!recommendations.recommendations || recommendations.recommendations.length === 0) {
        return {
          success: false,
          error: 'No sponsor recommendations available'
        };
      }

      // Send via SMS if requested
      if (send_immediately) {
        const smsSent = await triggerSponsorRecommendationSMS(
          event_id,
          contractor_id,
          recommendations.recommendations
        );

        // Update event_messages status with EXACT column names
        if (smsSent) {
          await query(`
            UPDATE event_messages
            SET
              status = 'sent',
              actual_send_time = NOW(),
              updated_at = NOW()
            WHERE id = (
              SELECT id
              FROM event_messages
              WHERE event_id = $1
                AND contractor_id = $2
                AND message_type = 'sponsor_recommendation'
                AND status = 'pending'
              ORDER BY created_at DESC
              LIMIT 1
            )
          `, [event_id, contractor_id]);
        }

        return {
          success: smsSent,
          recommendations: recommendations.recommendations,
          message: smsSent ? 'Sponsor recommendations sent via SMS' : 'Failed to send SMS'
        };
      } else {
        return {
          success: true,
          recommendations: recommendations.recommendations,
          message: 'Sponsor recommendations generated (not sent)'
        };
      }
    } catch (error) {
      console.error('Error in sendSponsorRecommendations:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Send complete personalized agenda via SMS
   * Breaks down into multiple messages if needed
   */
  async sendPersonalizedAgenda(event_id, contractor_id, options = {}) {
    try {
      const { send_immediately = true } = options;

      // Get personalized agenda
      const agenda = await eventAIRecommendationService.getPersonalizedAgenda(
        event_id,
        contractor_id
      );

      // Send speaker recommendations
      const speakerResult = await this.sendSpeakerRecommendations(
        event_id,
        contractor_id,
        { send_immediately, limit: 3 }
      );

      // Wait 30 seconds between messages to avoid overwhelming
      if (send_immediately && speakerResult.success) {
        await new Promise(resolve => setTimeout(resolve, 30000));
      }

      // Send sponsor recommendations
      const sponsorResult = await this.sendSponsorRecommendations(
        event_id,
        contractor_id,
        { send_immediately, limit: 3 }
      );

      return {
        success: speakerResult.success && sponsorResult.success,
        agenda: agenda,
        speaker_sms: speakerResult,
        sponsor_sms: sponsorResult,
        message: 'Personalized agenda sent via SMS'
      };
    } catch (error) {
      console.error('Error in sendPersonalizedAgenda:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Schedule AI recommendations for specific time
   * Uses event_messages table for scheduling
   */
  async scheduleRecommendations(event_id, contractor_id, scheduled_time, recommendation_types = ['speaker', 'sponsor']) {
    try {
      const results = [];

      for (const type of recommendation_types) {
        // Insert scheduled message with EXACT column names
        const result = await query(`
          INSERT INTO event_messages (
            event_id,
            contractor_id,
            message_type,
            message_category,
            scheduled_time,
            message_content,
            status,
            created_at,
            updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, 'scheduled', NOW(), NOW())
          RETURNING id
        `, [
          event_id,
          contractor_id,
          `${type}_recommendation`,
          'recommendation',
          scheduled_time,
          `Scheduled ${type} recommendations`
        ]);

        results.push({
          type,
          message_id: result.rows[0].id,
          scheduled_time
        });
      }

      return {
        success: true,
        scheduled_messages: results,
        message: `Scheduled ${recommendation_types.length} recommendation messages`
      };
    } catch (error) {
      console.error('Error scheduling recommendations:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Process scheduled recommendations
   * Called by cron job to send scheduled messages
   */
  async processScheduledRecommendations() {
    try {
      // Get all scheduled messages that are due
      const scheduledMessages = await query(`
        SELECT
          em.id,
          em.event_id,
          em.contractor_id,
          em.message_type,
          em.scheduled_time
        FROM event_messages em
        WHERE
          em.status = 'scheduled'
          AND em.scheduled_time <= NOW()
          AND em.message_category = 'recommendation'
        ORDER BY em.scheduled_time
        LIMIT 10
      `);

      const results = [];

      for (const message of scheduledMessages.rows) {
        let result;

        // Send appropriate recommendation type
        if (message.message_type === 'speaker_recommendation') {
          result = await this.sendSpeakerRecommendations(
            message.event_id,
            message.contractor_id,
            { send_immediately: true }
          );
        } else if (message.message_type === 'sponsor_recommendation') {
          result = await this.sendSponsorRecommendations(
            message.event_id,
            message.contractor_id,
            { send_immediately: true }
          );
        }

        // Update message status
        const status = result?.success ? 'sent' : 'failed';
        await query(`
          UPDATE event_messages
          SET
            status = $2,
            actual_send_time = CASE WHEN $2 = 'sent' THEN NOW() ELSE NULL END,
            error_message = $3,
            updated_at = NOW()
          WHERE id = $1
        `, [message.id, status, result?.error || null]);

        results.push({
          message_id: message.id,
          type: message.message_type,
          success: result?.success || false
        });
      }

      return {
        success: true,
        processed: results.length,
        results
      };
    } catch (error) {
      console.error('Error processing scheduled recommendations:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Handle inbound SMS responses to recommendations
   * Process contractor replies to speaker/sponsor recommendations
   */
  async handleRecommendationResponse(contractor_id, event_id, message_text) {
    try {
      // Parse response (looking for numbers 1-3 for selections)
      const selection = parseInt(message_text.trim());

      if (isNaN(selection) || selection < 1 || selection > 3) {
        return {
          success: false,
          response: 'Please reply with 1, 2, or 3 to select a recommendation'
        };
      }

      // Find the most recent recommendation message
      const recentRec = await query(`
        SELECT
          id,
          message_type,
          personalization_data
        FROM event_messages
        WHERE
          contractor_id = $1
          AND event_id = $2
          AND message_category = 'recommendation'
          AND status = 'sent'
          AND actual_send_time > NOW() - INTERVAL '1 hour'
        ORDER BY actual_send_time DESC
        LIMIT 1
      `, [contractor_id, event_id]);

      if (recentRec.rows.length === 0) {
        return {
          success: false,
          response: 'No recent recommendations found. Please request new recommendations.'
        };
      }

      const recommendation = recentRec.rows[0];
      const data = safeJsonParse(recommendation.personalization_data, {});
      const selectedItem = data.recommendations?.[selection - 1];

      if (!selectedItem) {
        return {
          success: false,
          response: 'Invalid selection. Please choose 1, 2, or 3.'
        };
      }

      // Generate detailed response based on type
      let response = '';
      if (recommendation.message_type === 'speaker_recommendation') {
        response = this.generateSpeakerDetails(selectedItem);
      } else if (recommendation.message_type === 'sponsor_recommendation') {
        response = this.generateSponsorDetails(selectedItem);
      }

      // Store the interaction
      await query(`
        INSERT INTO event_messages (
          event_id,
          contractor_id,
          message_type,
          message_category,
          message_content,
          response_received,
          response_time,
          status,
          created_at,
          updated_at
        ) VALUES ($1, $2, 'response', 'inbound', $3, $4, NOW(), 'received', NOW(), NOW())
      `, [event_id, contractor_id, response, message_text]);

      return {
        success: true,
        response,
        selected_item: selectedItem
      };
    } catch (error) {
      console.error('Error handling recommendation response:', error);
      return {
        success: false,
        response: 'Error processing your selection. Please try again.'
      };
    }
  }

  /**
   * Generate detailed speaker information for SMS response
   */
  generateSpeakerDetails(speaker) {
    const time = speaker.session?.time ?
      new Date(speaker.session.time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) :
      'TBD';

    const location = speaker.session?.location || 'Main Hall';
    const takeaways = speaker.key_takeaways?.slice(0, 2).join('\n• ') || '';

    return `📍 ${speaker.name} - ${speaker.session?.title || 'Session'}\n` +
           `⏰ Time: ${time}\n` +
           `📍 Location: ${location}\n` +
           `${takeaways ? `\n💡 Key Takeaways:\n• ${takeaways}` : ''}\n` +
           `\n${speaker.why || 'Highly recommended for your focus areas'}`;
  }

  /**
   * Generate detailed sponsor information with talking points
   */
  generateSponsorDetails(sponsor) {
    const booth = sponsor.booth_number ?
      `Booth ${sponsor.booth_number}` :
      sponsor.booth_location || 'See event map';

    const talkingPoints = sponsor.talking_points?.slice(0, 3)
      .map((point, idx) => `${idx + 1}. ${point}`)
      .join('\n') || '';

    const contact = sponsor.booth_contact?.name || '';

    return `🤝 ${sponsor.company_name}\n` +
           `📍 ${booth}\n` +
           `${contact ? `👤 Ask for: ${contact}\n` : ''}` +
           `\n💬 Conversation Starters:\n${talkingPoints}\n` +
           `${sponsor.special_offers ? `\n🎁 Special: ${sponsor.special_offers}` : ''}`;
  }
}

module.exports = new EventAIOrchestrationService();