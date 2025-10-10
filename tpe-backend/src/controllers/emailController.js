// DATABASE-CHECKED: event_messages table (28 columns) verified on 2025-10-09
// Email Inbound/Outbound Handler Controller
const { query } = require('../config/database');
const { safeJsonStringify } = require('../utils/jsonHelpers');

/**
 * Handle inbound email from GHL webhook via n8n
 * This is the single entry point for ALL inbound emails
 *
 * Database fields used (from event_messages table):
 * - contractor_id, event_id, message_type, direction, channel
 * - message_content, personalization_data
 * - ghl_contact_id, ghl_message_id, ghl_location_id
 * - phone, actual_send_time, status
 * - from_email, to_email, subject (NEW)
 */
const handleInboundEmail = async (req, res, next) => {
  try {
    console.log('[EMAIL] Inbound email received:', req.body);

    // Parse n8n formatted payload (matches n8n workflow output)
    const {
      from_email,
      to_email,
      subject,
      message_content,
      ghl_contact_id,
      ghl_message_id,
      ghl_conversation_id,
      timestamp
    } = req.body;

    if (!from_email || !message_content) {
      return res.status(400).json({
        success: false,
        error: 'from_email and message_content are required'
      });
    }

    // Step 1: Lookup contractor by email
    const contractorResult = await query(`
      SELECT
        id,
        CONCAT(first_name, ' ', last_name) as name,
        company_name,
        email,
        phone
      FROM contractors
      WHERE email = $1
      LIMIT 1
    `, [from_email]);

    if (contractorResult.rows.length === 0) {
      console.log('[EMAIL] Contractor not found for email:', from_email);

      // Still log the message even if contractor not found
      await query(`
        INSERT INTO event_messages (
          message_type,
          direction,
          channel,
          message_content,
          from_email,
          to_email,
          subject,
          personalization_data,
          ghl_contact_id,
          ghl_message_id,
          status,
          actual_send_time
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_TIMESTAMP)
      `, [
        'unknown',
        'inbound',
        'email',
        message_content,
        from_email,
        to_email,
        subject,
        safeJsonStringify({ ghl_conversation_id }),
        ghl_contact_id,
        ghl_message_id,
        'unmatched'
      ]);

      return res.json({
        success: true,
        message: 'Email logged but contractor not found',
        matched: false
      });
    }

    const contractor = contractorResult.rows[0];
    console.log('[EMAIL] Contractor found:', contractor.id, contractor.name);

    // Step 2: Get current event context (if any)
    const eventResult = await query(`
      SELECT e.id, e.name as event_name, e.date as event_date
      FROM events e
      JOIN event_attendees ea ON e.id = ea.event_id
      WHERE ea.contractor_id = $1
        AND e.date >= CURRENT_DATE - INTERVAL '1 day'
        AND e.date <= CURRENT_DATE + INTERVAL '30 days'
      ORDER BY e.date ASC
      LIMIT 1
    `, [contractor.id]);

    const eventContext = eventResult.rows.length > 0 ? eventResult.rows[0] : null;

    // Step 3: Log inbound email to event_messages table
    // Using EXACT column names from database schema
    const messageResult = await query(`
      INSERT INTO event_messages (
        contractor_id,
        event_id,
        message_type,
        direction,
        channel,
        message_content,
        from_email,
        to_email,
        subject,
        personalization_data,
        ghl_contact_id,
        ghl_message_id,
        phone,
        status,
        actual_send_time
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, CURRENT_TIMESTAMP)
      RETURNING id
    `, [
      contractor.id,
      eventContext?.id || null,
      'email_reply',
      'inbound',
      'email',
      message_content,
      from_email,
      to_email,
      subject,
      safeJsonStringify({
        ghl_conversation_id,
        event_name: eventContext?.event_name,
        event_date: eventContext?.event_date
      }),
      ghl_contact_id,
      ghl_message_id,
      contractor.phone,
      'received'
    ]);

    const messageId = messageResult.rows[0].id;
    console.log('[EMAIL] Inbound email logged to database, ID:', messageId);

    // Step 4: Return success response
    res.json({
      success: true,
      message: 'Email received and logged successfully',
      message_id: messageId,
      contractor_id: contractor.id,
      contractor_name: contractor.name,
      event_id: eventContext?.id,
      event_name: eventContext?.event_name,
      matched: true
    });

  } catch (error) {
    console.error('[EMAIL] Error handling inbound email:', error);
    next(error);
  }
};

/**
 * Send outbound email via n8n to GHL
 * Called by email schedulers to send event-related emails
 */
const sendOutboundEmail = async (req, res, next) => {
  try {
    console.log('[EMAIL] Outbound email request:', req.body);

    const {
      contractor_id,
      to_email,
      subject,
      body,
      template,
      event_id,
      ghl_contact_id,
      ghl_location_id
    } = req.body;

    if (!to_email || !body) {
      return res.status(400).json({
        success: false,
        error: 'to_email and body are required'
      });
    }

    // Get contractor info
    let contractor_name = null;
    let contractor_phone = null;

    if (contractor_id) {
      const contractorResult = await query(`
        SELECT CONCAT(first_name, ' ', last_name) as name, phone
        FROM contractors
        WHERE id = $1
      `, [contractor_id]);

      if (contractorResult.rows.length > 0) {
        contractor_name = contractorResult.rows[0].name;
        contractor_phone = contractorResult.rows[0].phone;
      }
    }

    // Get event info
    let event_name = null;
    if (event_id) {
      const eventResult = await query(`
        SELECT name FROM events WHERE id = $1
      `, [event_id]);

      if (eventResult.rows.length > 0) {
        event_name = eventResult.rows[0].name;
      }
    }

    // Save to event_messages table using EXACT database column names
    const messageResult = await query(`
      INSERT INTO event_messages (
        contractor_id,
        event_id,
        message_type,
        direction,
        channel,
        message_content,
        to_email,
        subject,
        personalization_data,
        ghl_contact_id,
        ghl_location_id,
        phone,
        status,
        scheduled_time,
        actual_send_time
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING id
    `, [
      contractor_id,
      event_id || null,
      template || 'email',
      'outbound',
      'email',
      body,
      to_email,
      subject || 'Power100 Event Update',
      safeJsonStringify({ template, event_name }),
      ghl_contact_id,
      ghl_location_id || 'Jlq8gw3IEjAQu39n4c0s',
      contractor_phone,
      'sent'
    ]);

    const messageId = messageResult.rows[0].id;
    console.log('[EMAIL] Outbound email logged to database, ID:', messageId);

    // Return payload for n8n to send via GHL
    res.json({
      success: true,
      message_id: messageId,
      send_via_ghl: {
        contractor_id,
        to_email,
        to_name: contractor_name,
        subject: subject || 'Power100 Event Update',
        body,
        template: template || 'event_email',
        ghl_contact_id,
        ghl_location_id: ghl_location_id || 'Jlq8gw3IEjAQu39n4c0s',
        event_id,
        event_name
      }
    });

  } catch (error) {
    console.error('[EMAIL] Error sending outbound email:', error);
    next(error);
  }
};

module.exports = {
  handleInboundEmail,
  sendOutboundEmail
};
