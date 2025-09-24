const { query } = require('../config/database');
const { AppError } = require('../middleware/errorHandler');
const { safeJsonParse, safeJsonStringify } = require('../utils/jsonHelpers');

/**
 * n8n Event Webhook Controller
 * Sends event data to n8n for GHL SMS integration
 * Database fields must match EXACTLY as defined in EVENT-DATABASE-SCHEMA.md
 */

// n8n webhook endpoints
// Production: Hosted n8n instance
// Local Dev: Local n8n instance or ngrok tunnel
const N8N_WEBHOOK_BASE = process.env.NODE_ENV === 'production'
  ? (process.env.N8N_WEBHOOK_URL || 'https://n8n.srv918843.hstgr.cloud')
  : (process.env.N8N_DEV_WEBHOOK_URL || 'http://localhost:5678');

// Trigger n8n for check-in SMS
const triggerCheckInSMS = async (attendeeData, contractorData) => {
  try {
    const payload = {
      event_type: 'check_in',
      attendee: {
        event_id: attendeeData.event_id,
        contractor_id: attendeeData.contractor_id,
        check_in_time: attendeeData.check_in_time,
        check_in_method: attendeeData.check_in_method,
        real_phone: attendeeData.real_phone,
        sms_opt_in: attendeeData.sms_opt_in
      },
      contractor: {
        name: contractorData.name,
        company_name: contractorData.company_name,
        phone: contractorData.phone,
        email: contractorData.email
      },
      message_template: `Welcome {{name}} from {{company_name}}! 🎉 You're checked in. Reply 'SAVE' to save our number, then we'll send your personalized event experience link.`,
      use_phone: attendeeData.real_phone || contractorData.phone
    };

    // Send to n8n webhook
    const response = await fetch(`${N8N_WEBHOOK_BASE}/webhook/event-check-in-sms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      console.error('n8n webhook failed:', await response.text());
    }

    return response.ok;
  } catch (error) {
    console.error('Error triggering n8n check-in SMS:', error);
    return false;
  }
};

// Trigger n8n for mass SMS
const triggerMassSMS = async (eventId, contractors, messageTemplate, messageType) => {
  try {
    const payload = {
      event_type: 'mass_send',
      event_id: eventId,
      message_type: messageType,
      message_template: messageTemplate,
      recipients: contractors.map(c => ({
        contractor_id: c.id,
        name: c.name,
        company_name: c.company_name,
        phone: c.phone
      }))
    };

    const response = await fetch(`${N8N_WEBHOOK_BASE}/webhook/event-mass-sms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    return response.ok;
  } catch (error) {
    console.error('Error triggering n8n mass SMS:', error);
    return false;
  }
};

// Trigger n8n for scheduled message batch
const triggerScheduledMessages = async (messages) => {
  try {
    const payload = {
      event_type: 'scheduled_batch',
      messages: messages.map(msg => ({
        message_id: msg.id,
        event_id: msg.event_id,
        contractor_id: msg.contractor_id,
        message_type: msg.message_type,
        message_content: msg.message_content,
        personalization_data: safeJsonParse(msg.personalization_data, {}),
        phone_number: msg.phone_number,
        can_send: msg.can_send
      }))
    };

    const response = await fetch(`${N8N_WEBHOOK_BASE}/webhook/event-scheduled-sms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    return response.ok;
  } catch (error) {
    console.error('Error triggering n8n scheduled messages:', error);
    return false;
  }
};

// Receive webhook from n8n/GHL for inbound SMS
const receiveInboundSMS = async (req, res, next) => {
  const { phone, message, contractor_id, event_id, timestamp } = req.body;

  try {
    // Find the most recent message to this contractor
    const recentMessage = await query(`
      SELECT id, message_type, message_category
      FROM event_messages
      WHERE
        contractor_id = $1
        AND event_id = $2
        AND status = 'sent'
        AND actual_send_time > NOW() - INTERVAL '1 hour'
      ORDER BY actual_send_time DESC
      LIMIT 1
    `, [contractor_id, event_id]);

    if (recentMessage.rows.length > 0) {
      const messageId = recentMessage.rows[0].id;

      // Analyze sentiment (simple for now, can enhance with OpenAI)
      let sentiment_score = 0;
      if (message.match(/great|excellent|amazing|love|awesome/i)) {
        sentiment_score = 0.8;
      } else if (message.match(/good|nice|okay|fine/i)) {
        sentiment_score = 0.5;
      } else if (message.match(/bad|terrible|awful|hate|worst/i)) {
        sentiment_score = -0.8;
      }

      // Extract PCR score if present (look for patterns like "8/10" or "9 out of 10")
      let pcr_score = null;
      const scoreMatch = message.match(/(\d+)\s*(?:\/|out of)\s*10/i);
      if (scoreMatch) {
        pcr_score = parseInt(scoreMatch[1]) * 10; // Convert to percentage
      }

      // Detect action taken
      let action_taken = null;
      if (message.match(/book|demo|schedule|meeting/i)) {
        action_taken = 'demo_booked';
      } else if (message.match(/yes|confirm|interested/i)) {
        action_taken = 'interest_expressed';
      }

      // Update the message record
      await query(`
        UPDATE event_messages
        SET
          response_received = $2,
          response_time = $3,
          sentiment_score = $4,
          pcr_score = $5,
          action_taken = $6,
          status = 'responded',
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [messageId, message, timestamp, sentiment_score, pcr_score, action_taken]);
    }

    // Store raw inbound message for reference
    await query(`
      INSERT INTO event_messages (
        event_id,
        contractor_id,
        message_type,
        message_category,
        message_content,
        actual_send_time,
        status,
        created_at
      ) VALUES ($1, $2, 'inbound', 'response', $3, $4, 'received', CURRENT_TIMESTAMP)
    `, [event_id, contractor_id, message, timestamp]);

    res.json({ success: true, message: 'Inbound SMS processed' });
  } catch (error) {
    next(error);
  }
};

// Receive delivery status from n8n/GHL
const receiveDeliveryStatus = async (req, res, next) => {
  const { message_id, status, error_message, delivered_at } = req.body;

  try {
    const dbStatus = status === 'delivered' ? 'sent' : 'failed';

    await query(`
      UPDATE event_messages
      SET
        status = $2,
        actual_send_time = $3,
        error_message = $4,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [message_id, dbStatus, delivered_at, error_message]);

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  triggerCheckInSMS,
  triggerMassSMS,
  triggerScheduledMessages,
  receiveInboundSMS,
  receiveDeliveryStatus
};