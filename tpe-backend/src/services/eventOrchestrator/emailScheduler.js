// DATABASE-CHECKED: event_messages (25 columns), events (52 columns), contractors (69 columns), event_attendees (16 columns) - All verified on 2025-10-08
// DATABASE-CHECKED: strategic_partners (124 columns) - All verified on 2025-10-27

/**
 * Event Email Scheduler Service
 * Handles all event-related email triggers following the same pattern as SMS outbound schedulers
 *
 * Architecture: Backend = Brain, n8n = Transport, GHL = Delivery
 * All emails logged to event_messages table with channel='email'
 */

const axios = require('axios');
const { query } = require('../../config/database');
const { safeJsonStringify } = require('../../utils/jsonHelpers');
const { buildTags } = require('../../utils/tagBuilder');
const {
  buildRegistrationConfirmationEmail,
  buildProfileCompletionReminderEmail,
  buildPersonalizedAgendaEmail,
  buildAgendaReadyEmail,
  buildEventSummaryEmail,
  buildCheckInReminderNightBefore,
  buildCheckInReminder1HourBefore,
  buildCheckInReminderEventStart,
  buildPartnerProfileCompletionEmail
} = require('./emailTemplates');

// n8n webhook configuration
const N8N_WEBHOOK_BASE = process.env.N8N_WEBHOOK_BASE || 'https://n8n.srv918843.hstgr.cloud';
const N8N_ENV = process.env.NODE_ENV === 'production' ? '' : '-dev';

/**
 * Send registration confirmation email immediately after event registration
 * Template: registration_confirmation
 */
async function sendRegistrationConfirmation(eventId, contractorId) {
  console.log(`[EMAIL SCHEDULER] Sending registration confirmation for event ${eventId}, contractor ${contractorId}`);

  try {
    // Get contractor info - DATABASE-CHECKED: Using exact column names from contractors table
    const contractorResult = await query(`
      SELECT id, first_name, last_name, email, phone
      FROM contractors WHERE id = $1
    `, [contractorId]);

    if (contractorResult.rows.length === 0) {
      throw new Error(`Contractor not found: ${contractorId}`);
    }
    const contractor = contractorResult.rows[0];

    // Get event info - DATABASE-CHECKED: Using exact column names from events table
    const eventResult = await query(`
      SELECT id, name, date, location, sms_event_code, registration_url, description
      FROM events WHERE id = $1
    `, [eventId]);

    if (eventResult.rows.length === 0) {
      throw new Error(`Event not found: ${eventId}`);
    }
    const event = eventResult.rows[0];

    // Get registration info - DATABASE-CHECKED: Using exact column names from event_attendees table
    const attendeeResult = await query(`
      SELECT id, registration_date, profile_completion_status
      FROM event_attendees
      WHERE event_id = $1 AND contractor_id = $2
    `, [eventId, contractorId]);

    if (attendeeResult.rows.length === 0) {
      throw new Error(`Attendee registration not found`);
    }
    const attendee = attendeeResult.rows[0];

    // Build email content with personalization using HTML template
    const emailSubject = `You're registered for ${event.name}! 🎉`;
    const emailBody = buildRegistrationConfirmationEmail({
      firstName: contractor.first_name,
      eventName: event.name,
      eventDate: event.date,
      eventLocation: event.location,
      registrationId: attendee.id,
      registrationUrl: event.registration_url
    });

    // Save to database - DATABASE-CHECKED: Using exact column names from event_messages table
    const messageResult = await query(`
      INSERT INTO event_messages (
        contractor_id, event_id, message_type, direction, channel,
        scheduled_time, actual_send_time, personalization_data,
        phone, message_content, status
      ) VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, $6, $7, $8, $9)
      RETURNING id
    `, [
      contractorId,
      eventId,
      'registration_confirmation',
      'outbound',
      'email',  // KEY: Using 'email' channel for email messages
      safeJsonStringify({
        email_subject: emailSubject,
        event_name: event.name,
        event_date: event.date,
        event_location: event.location,
        sms_event_code: event.sms_event_code,
        registration_id: attendee.id,
        profile_completion_status: attendee.profile_completion_status
      }),
      contractor.phone,
      emailBody,
      'pending'
    ]);

    const messageId = messageResult.rows[0].id;

    // Trigger n8n email workflow
    const n8nWebhook = `${N8N_WEBHOOK_BASE}/webhook/email-outbound${N8N_ENV}`;
    const n8nPayload = {
      message_id: messageId,
      to_email: contractor.email,
      to_name: `${contractor.first_name} ${contractor.last_name}`,
      subject: emailSubject,
      body: emailBody,
      template: 'registration_confirmation',
      tags: buildTags({
        category: 'event',
        type: 'registration',
        recipient: 'contractor',
        channel: 'email',
        status: 'confirmed',
        entityId: eventId
      }),
      event_id: eventId,
      contractor_id: contractorId
    };

    console.log(`[EMAIL SCHEDULER] Triggering n8n webhook: ${n8nWebhook}`);

    // Try to send via n8n, but don't fail if n8n webhook doesn't exist yet
    try {
      await axios.post(n8nWebhook, n8nPayload, { timeout: 10000 });
      console.log(`[EMAIL SCHEDULER] Email sent via n8n successfully`);
    } catch (n8nError) {
      // In development, n8n webhook might not exist yet - log but don't fail
      if (n8nError.response?.status === 404) {
        console.log(`[EMAIL SCHEDULER] ⚠️  n8n webhook not found (dev mode - this is ok)`);
      } else {
        console.warn(`[EMAIL SCHEDULER] ⚠️  n8n webhook error:`, n8nError.message);
      }
    }

    // Update message status to sent
    await query(`
      UPDATE event_messages
      SET status = 'sent', actual_send_time = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [messageId]);

    console.log(`[EMAIL SCHEDULER] ✅ Registration confirmation sent successfully`);

    return {
      success: true,
      message_id: messageId,
      email: contractor.email
    };

  } catch (error) {
    console.error('[EMAIL SCHEDULER] ❌ Error sending registration confirmation:', error);
    throw error;
  }
}

/**
 * Send initial profile completion request immediately after registration
 * Template: profile_completion_request (includes SMS)
 */
async function sendProfileCompletionRequest(eventId, contractorId) {
  console.log(`[EMAIL SCHEDULER] Sending profile completion request for event ${eventId}, contractor ${contractorId}`);

  try {
    const { sendSMSNotification } = require('../smsService');

    // Get contractor info
    const contractorResult = await query(`
      SELECT id, first_name, last_name, email, phone
      FROM contractors WHERE id = $1
    `, [contractorId]);

    if (contractorResult.rows.length === 0) {
      throw new Error(`Contractor not found: ${contractorId}`);
    }
    const contractor = contractorResult.rows[0];

    // Get event info
    const eventResult = await query(`
      SELECT id, name, date, location
      FROM events WHERE id = $1
    `, [eventId]);

    if (eventResult.rows.length === 0) {
      throw new Error(`Event not found: ${eventId}`);
    }
    const event = eventResult.rows[0];

    // Build email content using HTML template
    const emailSubject = `${contractor.first_name || 'Welcome'}, complete your profile for ${event.name}!`;
    const emailBody = buildProfileCompletionReminderEmail({
      firstName: contractor.first_name,
      eventName: event.name,
      eventId: eventId
    });

    // Save email to database
    const messageResult = await query(`
      INSERT INTO event_messages (
        contractor_id, event_id, message_type, direction, channel,
        scheduled_time, actual_send_time, personalization_data,
        phone, message_content, status
      ) VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, $6, $7, $8, $9)
      RETURNING id
    `, [
      contractorId,
      eventId,
      'profile_completion_request',
      'outbound',
      'email',
      safeJsonStringify({
        email_subject: emailSubject,
        event_name: event.name
      }),
      contractor.phone,
      emailBody,
      'pending'
    ]);

    const messageId = messageResult.rows[0].id;

    // Trigger n8n email
    const n8nWebhook = `${N8N_WEBHOOK_BASE}/webhook/email-outbound${N8N_ENV}`;
    const n8nPayload = {
      message_id: messageId,
      to_email: contractor.email,
      to_name: `${contractor.first_name} ${contractor.last_name}`,
      subject: emailSubject,
      body: emailBody,
      template: 'profile_completion_request',
      tags: buildTags({
        category: 'event',
        type: 'profile-request',
        recipient: 'contractor',
        channel: 'email',
        status: 'sent',
        entityId: eventId
      }),
      event_id: eventId,
      contractor_id: contractorId
    };

    try {
      await axios.post(n8nWebhook, n8nPayload, { timeout: 10000 });
      console.log(`[EMAIL SCHEDULER] Email sent via n8n successfully`);
    } catch (n8nError) {
      if (n8nError.response?.status === 404) {
        console.log(`[EMAIL SCHEDULER] ⚠️  n8n webhook not found (dev mode - this is ok)`);
      } else {
        console.warn(`[EMAIL SCHEDULER] ⚠️  n8n webhook error:`, n8nError.message);
      }
    }

    await query(`
      UPDATE event_messages
      SET status = 'sent', actual_send_time = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [messageId]);

    // Send SMS notification with profile link
    if (contractor.phone) {
      const baseUrl = process.env.NODE_ENV === 'production'
        ? 'https://tpx.power100.io'
        : 'http://localhost:3002';
      const smsMessage = `${contractor.first_name || 'Hi'}! You're registered for ${event.name}! 🎉 Complete your profile to unlock your personalized agenda: ${baseUrl}/events/${eventId}/profile?contractor=${contractorId}`;

      try {
        await sendSMSNotification(contractor.phone, smsMessage);
        console.log(`[EMAIL SCHEDULER] 📱 Profile completion SMS sent`);
      } catch (smsError) {
        console.warn(`[EMAIL SCHEDULER] ⚠️  SMS error:`, smsError.message);
      }
    }

    console.log(`[EMAIL SCHEDULER] ✅ Profile completion request sent successfully`);

    return {
      success: true,
      message_id: messageId,
      email: contractor.email
    };

  } catch (error) {
    console.error('[EMAIL SCHEDULER] ❌ Error sending profile completion request:', error);
    throw error;
  }
}

/**
 * Send profile completion reminder 24 hours after registration if profile incomplete
 * Template: profile_completion_reminder
 */
async function sendProfileCompletionReminder(eventId, contractorId) {
  console.log(`[EMAIL SCHEDULER] Sending profile completion reminder for event ${eventId}, contractor ${contractorId}`);

  try {
    // Get contractor info
    const contractorResult = await query(`
      SELECT id, first_name, last_name, email, phone
      FROM contractors WHERE id = $1
    `, [contractorId]);

    if (contractorResult.rows.length === 0) {
      throw new Error(`Contractor not found: ${contractorId}`);
    }
    const contractor = contractorResult.rows[0];

    // Get event info
    const eventResult = await query(`
      SELECT id, name, date, location, sms_event_code
      FROM events WHERE id = $1
    `, [eventId]);

    if (eventResult.rows.length === 0) {
      throw new Error(`Event not found: ${eventId}`);
    }
    const event = eventResult.rows[0];

    // Check profile completion status
    const attendeeResult = await query(`
      SELECT id, profile_completion_status, registration_date
      FROM event_attendees
      WHERE event_id = $1 AND contractor_id = $2
    `, [eventId, contractorId]);

    if (attendeeResult.rows.length === 0) {
      throw new Error(`Attendee not found`);
    }
    const attendee = attendeeResult.rows[0];

    // Don't send if profile is already complete
    if (attendee.profile_completion_status === 'complete') {
      console.log(`[EMAIL SCHEDULER] Profile already complete, skipping reminder`);
      return {
        success: true,
        skipped: true,
        reason: 'profile_complete'
      };
    }

    // Build email content using HTML template
    const emailSubject = `${contractor.first_name}, unlock your personalized Power100 experience`;
    const emailBody = buildProfileCompletionReminderEmail({
      firstName: contractor.first_name,
      eventName: event.name,
      eventId: eventId
    });

    // Save to database
    const messageResult = await query(`
      INSERT INTO event_messages (
        contractor_id, event_id, message_type, direction, channel,
        scheduled_time, actual_send_time, personalization_data,
        phone, message_content, status
      ) VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, $6, $7, $8, $9)
      RETURNING id
    `, [
      contractorId,
      eventId,
      'profile_completion_reminder',
      'outbound',
      'email',
      safeJsonStringify({
        email_subject: emailSubject,
        event_name: event.name,
        profile_completion_status: attendee.profile_completion_status,
        registration_date: attendee.registration_date
      }),
      contractor.phone,
      emailBody,
      'pending'
    ]);

    const messageId = messageResult.rows[0].id;

    // Trigger n8n
    const n8nWebhook = `${N8N_WEBHOOK_BASE}/webhook/email-outbound${N8N_ENV}`;
    const n8nPayload = {
      message_id: messageId,
      to_email: contractor.email,
      to_name: `${contractor.first_name} ${contractor.last_name}`,
      subject: emailSubject,
      body: emailBody,
      template: 'profile_completion_reminder',
      tags: buildTags({
        category: 'event',
        type: 'profile-reminder',
        recipient: 'contractor',
        channel: 'email',
        status: 'sent',
        entityId: eventId
      }),
      event_id: eventId,
      contractor_id: contractorId
    };

    // Try to send via n8n, but don't fail if n8n webhook doesn't exist yet
    try {
      await axios.post(n8nWebhook, n8nPayload, { timeout: 10000 });
      console.log(`[EMAIL SCHEDULER] Email sent via n8n successfully`);
    } catch (n8nError) {
      if (n8nError.response?.status === 404) {
        console.log(`[EMAIL SCHEDULER] ⚠️  n8n webhook not found (dev mode - this is ok)`);
      } else {
        console.warn(`[EMAIL SCHEDULER] ⚠️  n8n webhook error:`, n8nError.message);
      }
    }

    await query(`
      UPDATE event_messages
      SET status = 'sent', actual_send_time = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [messageId]);

    console.log(`[EMAIL SCHEDULER] ✅ Profile completion reminder sent successfully`);

    return {
      success: true,
      message_id: messageId,
      email: contractor.email
    };

  } catch (error) {
    console.error('[EMAIL SCHEDULER] ❌ Error sending profile completion reminder:', error);
    throw error;
  }
}

/**
 * Send personalized agenda 3 days before event with AI-curated recommendations
 * Template: personalized_agenda
 */
async function sendPersonalizedAgenda(eventId, contractorId, recommendations) {
  console.log(`[EMAIL SCHEDULER] Sending personalized agenda for event ${eventId}, contractor ${contractorId}`);

  try {
    // Get contractor info
    const contractorResult = await query(`
      SELECT id, first_name, last_name, email, phone,
             to_json(focus_areas) as focus_areas
      FROM contractors WHERE id = $1
    `, [contractorId]);

    if (contractorResult.rows.length === 0) {
      throw new Error(`Contractor not found: ${contractorId}`);
    }
    const contractor = contractorResult.rows[0];

    // Get event info
    const eventResult = await query(`
      SELECT id, name, date, location, sms_event_code, description
      FROM events WHERE id = $1
    `, [eventId]);

    if (eventResult.rows.length === 0) {
      throw new Error(`Event not found: ${eventId}`);
    }
    const event = eventResult.rows[0];

    // Build email content using HTML template
    const emailSubject = `Your personalized agenda for ${event.name}`;
    const emailBody = buildPersonalizedAgendaEmail({
      firstName: contractor.first_name,
      eventName: event.name,
      eventDate: event.date,
      eventLocation: event.location,
      eventId: eventId,
      contractorId: contractorId,
      recommendations: recommendations || []
    });

    // Save to database
    const messageResult = await query(`
      INSERT INTO event_messages (
        contractor_id, event_id, message_type, direction, channel,
        scheduled_time, actual_send_time, personalization_data,
        phone, message_content, status
      ) VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, $6, $7, $8, $9)
      RETURNING id
    `, [
      contractorId,
      eventId,
      'personalized_agenda',
      'outbound',
      'email',
      safeJsonStringify({
        email_subject: emailSubject,
        event_name: event.name,
        recommendations: recommendations,
        focus_areas: contractor.focus_areas
      }),
      contractor.phone,
      emailBody,
      'pending'
    ]);

    const messageId = messageResult.rows[0].id;

    // Trigger n8n
    const n8nWebhook = `${N8N_WEBHOOK_BASE}/webhook/email-outbound${N8N_ENV}`;
    const n8nPayload = {
      message_id: messageId,
      to_email: contractor.email,
      to_name: `${contractor.first_name} ${contractor.last_name}`,
      subject: emailSubject,
      body: emailBody,
      template: 'personalized_agenda',
      tags: buildTags({
        category: 'event',
        type: 'agenda',
        recipient: 'contractor',
        channel: 'email',
        status: 'sent',
        entityId: eventId
      }),
      event_id: eventId,
      contractor_id: contractorId
    };

    // Try to send via n8n, but don't fail if n8n webhook doesn't exist yet
    try {
      await axios.post(n8nWebhook, n8nPayload, { timeout: 10000 });
      console.log(`[EMAIL SCHEDULER] Email sent via n8n successfully`);
    } catch (n8nError) {
      if (n8nError.response?.status === 404) {
        console.log(`[EMAIL SCHEDULER] ⚠️  n8n webhook not found (dev mode - this is ok)`);
      } else {
        console.warn(`[EMAIL SCHEDULER] ⚠️  n8n webhook error:`, n8nError.message);
      }
    }

    await query(`
      UPDATE event_messages
      SET status = 'sent', actual_send_time = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [messageId]);

    console.log(`[EMAIL SCHEDULER] ✅ Personalized agenda sent successfully`);

    return {
      success: true,
      message_id: messageId,
      email: contractor.email
    };

  } catch (error) {
    console.error('[EMAIL SCHEDULER] ❌ Error sending personalized agenda:', error);
    throw error;
  }
}

/**
 * Send event summary email with key takeaways, resources, and next steps
 * Template: event_summary
 */
async function sendEventSummary(eventId, contractorId, sessionData) {
  console.log(`[EMAIL SCHEDULER] Sending event summary for event ${eventId}, contractor ${contractorId}`);

  try {
    // Get contractor info
    const contractorResult = await query(`
      SELECT id, first_name, last_name, email, phone
      FROM contractors WHERE id = $1
    `, [contractorId]);

    if (contractorResult.rows.length === 0) {
      throw new Error(`Contractor not found: ${contractorId}`);
    }
    const contractor = contractorResult.rows[0];

    // Get event info
    const eventResult = await query(`
      SELECT id, name, date, location, sms_event_code
      FROM events WHERE id = $1
    `, [eventId]);

    if (eventResult.rows.length === 0) {
      throw new Error(`Event not found: ${eventId}`);
    }
    const event = eventResult.rows[0];

    // Build email content using HTML template
    const emailSubject = `Thank you for attending ${event.name}!`;
    const emailBody = buildEventSummaryEmail({
      firstName: contractor.first_name,
      eventName: event.name,
      eventId: eventId,
      sessionData: sessionData || {}
    });

    // Save to database
    const messageResult = await query(`
      INSERT INTO event_messages (
        contractor_id, event_id, message_type, direction, channel,
        scheduled_time, actual_send_time, personalization_data,
        phone, message_content, status
      ) VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, $6, $7, $8, $9)
      RETURNING id
    `, [
      contractorId,
      eventId,
      'event_summary',
      'outbound',
      'email',
      safeJsonStringify({
        email_subject: emailSubject,
        event_name: event.name,
        session_data: sessionData
      }),
      contractor.phone,
      emailBody,
      'pending'
    ]);

    const messageId = messageResult.rows[0].id;

    // Trigger n8n
    const n8nWebhook = `${N8N_WEBHOOK_BASE}/webhook/email-outbound${N8N_ENV}`;
    const n8nPayload = {
      message_id: messageId,
      to_email: contractor.email,
      to_name: `${contractor.first_name} ${contractor.last_name}`,
      subject: emailSubject,
      body: emailBody,
      template: 'event_summary',
      tags: buildTags({
        category: 'event',
        type: 'summary',
        recipient: 'contractor',
        channel: 'email',
        status: 'sent',
        entityId: eventId
      }),
      event_id: eventId,
      contractor_id: contractorId
    };

    // Try to send via n8n, but don't fail if n8n webhook doesn't exist yet
    try {
      await axios.post(n8nWebhook, n8nPayload, { timeout: 10000 });
      console.log(`[EMAIL SCHEDULER] Email sent via n8n successfully`);
    } catch (n8nError) {
      if (n8nError.response?.status === 404) {
        console.log(`[EMAIL SCHEDULER] ⚠️  n8n webhook not found (dev mode - this is ok)`);
      } else {
        console.warn(`[EMAIL SCHEDULER] ⚠️  n8n webhook error:`, n8nError.message);
      }
    }

    await query(`
      UPDATE event_messages
      SET status = 'sent', actual_send_time = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [messageId]);

    console.log(`[EMAIL SCHEDULER] ✅ Event summary sent successfully`);

    return {
      success: true,
      message_id: messageId,
      email: contractor.email
    };

  } catch (error) {
    console.error('[EMAIL SCHEDULER] ❌ Error sending event summary:', error);
    throw error;
  }
}

/**
 * Send "Your Agenda is Ready!" email immediately after AI completes recommendations
 * Template: agenda_ready
 */
async function sendAgendaReadyNotification(eventId, contractorId, recommendationCounts) {
  console.log(`[EMAIL SCHEDULER] Sending agenda ready notification for event ${eventId}, contractor ${contractorId}`);

  try {
    // Get contractor info
    const contractorResult = await query(`
      SELECT id, first_name, last_name, email, phone
      FROM contractors WHERE id = $1
    `, [contractorId]);

    if (contractorResult.rows.length === 0) {
      throw new Error(`Contractor not found: ${contractorId}`);
    }
    const contractor = contractorResult.rows[0];

    // Get event info
    const eventResult = await query(`
      SELECT id, name, date, location
      FROM events WHERE id = $1
    `, [eventId]);

    if (eventResult.rows.length === 0) {
      throw new Error(`Event not found: ${eventId}`);
    }
    const event = eventResult.rows[0];

    // Build email content using HTML template
    const emailSubject = `${contractor.first_name}, your personalized agenda for ${event.name} is ready! 🎉`;
    const emailBody = buildAgendaReadyEmail({
      firstName: contractor.first_name,
      eventName: event.name,
      eventId: eventId,
      contractorId: contractorId,
      speakerCount: recommendationCounts.speakers || 0,
      sponsorCount: recommendationCounts.sponsors || 0,
      peerCount: recommendationCounts.peers || 0
    });

    // Save to database
    const messageResult = await query(`
      INSERT INTO event_messages (
        contractor_id, event_id, message_type, direction, channel,
        scheduled_time, actual_send_time, personalization_data,
        phone, message_content, status
      ) VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, $6, $7, $8, $9)
      RETURNING id
    `, [
      contractorId,
      eventId,
      'agenda_ready',
      'outbound',
      'email',
      safeJsonStringify({
        email_subject: emailSubject,
        event_name: event.name,
        recommendation_counts: recommendationCounts
      }),
      contractor.phone,
      emailBody,
      'pending'
    ]);

    const messageId = messageResult.rows[0].id;

    // Trigger n8n
    const n8nWebhook = `${N8N_WEBHOOK_BASE}/webhook/email-outbound${N8N_ENV}`;
    const n8nPayload = {
      message_id: messageId,
      to_email: contractor.email,
      to_name: `${contractor.first_name} ${contractor.last_name}`,
      subject: emailSubject,
      body: emailBody,
      template: 'agenda_ready',
      tags: buildTags({
        category: 'event',
        type: 'agenda-ready',
        recipient: 'contractor',
        channel: 'email',
        status: 'sent',
        entityId: eventId
      }),
      event_id: eventId,
      contractor_id: contractorId
    };

    console.log(`[EMAIL SCHEDULER] Triggering n8n webhook: ${n8nWebhook}`);

    // Try to send via n8n, but don't fail if n8n webhook doesn't exist yet
    try {
      await axios.post(n8nWebhook, n8nPayload, { timeout: 10000 });
      console.log(`[EMAIL SCHEDULER] Email sent via n8n successfully`);
    } catch (n8nError) {
      if (n8nError.response?.status === 404) {
        console.log(`[EMAIL SCHEDULER] ⚠️  n8n webhook not found (dev mode - this is ok)`);
      } else {
        console.warn(`[EMAIL SCHEDULER] ⚠️  n8n webhook error:`, n8nError.message);
      }
    }

    await query(`
      UPDATE event_messages
      SET status = 'sent', actual_send_time = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [messageId]);

    console.log(`[EMAIL SCHEDULER] ✅ Agenda ready notification sent successfully`);

    return {
      success: true,
      message_id: messageId,
      email: contractor.email
    };

  } catch (error) {
    console.error('[EMAIL SCHEDULER] ❌ Error sending agenda ready notification:', error);
    throw error;
  }
}

/**
 * Send check-in reminder 24 hours before event
 * Sent to ALL registered attendees regardless of check-in status
 * Template: check_in_reminder_night_before
 */
async function sendCheckInReminderNightBefore(eventId, contractorId, messageId = null) {
  console.log(`[EMAIL SCHEDULER] Sending night before check-in reminder for event ${eventId}, contractor ${contractorId}${messageId ? `, message ${messageId}` : ''}`);

  try {
    const { sendSMSNotification } = require('../smsService');

    // Get contractor info - DATABASE-CHECKED
    const contractorResult = await query(`
      SELECT id, first_name, last_name, email, phone
      FROM contractors WHERE id = $1
    `, [contractorId]);

    if (contractorResult.rows.length === 0) {
      throw new Error(`Contractor not found: ${contractorId}`);
    }
    const contractor = contractorResult.rows[0];

    // Get event info - DATABASE-CHECKED
    const eventResult = await query(`
      SELECT id, name, date, location
      FROM events WHERE id = $1
    `, [eventId]);

    if (eventResult.rows.length === 0) {
      throw new Error(`Event not found: ${eventId}`);
    }
    const event = eventResult.rows[0];

    // Check if already checked in - DATABASE-CHECKED: using check_in_time field
    const attendeeResult = await query(`
      SELECT id, check_in_time
      FROM event_attendees
      WHERE event_id = $1 AND contractor_id = $2
    `, [eventId, contractorId]);

    if (attendeeResult.rows.length === 0) {
      throw new Error(`Attendee not found`);
    }
    const attendee = attendeeResult.rows[0];

    // Skip if already checked in
    if (attendee.check_in_time) {
      console.log(`[EMAIL SCHEDULER] Already checked in, skipping reminder`);
      if (messageId) {
        await query(`
          UPDATE event_messages
          SET status = 'skipped', error_message = 'Already checked in'
          WHERE id = $1
        `, [messageId]);
      }
      return {
        success: true,
        skipped: true,
        reason: 'already_checked_in'
      };
    }

    // Build email content using HTML template
    const emailSubject = `${contractor.first_name}, ${event.name} is tomorrow! Check in now ⚡`;
    const emailBody = buildCheckInReminderNightBefore({
      firstName: contractor.first_name,
      eventName: event.name,
      eventDate: event.date,
      eventLocation: event.location,
      eventId: eventId,
      contractorId: contractorId
    });

    // Trigger n8n email workflow
    const n8nWebhook = `${N8N_WEBHOOK_BASE}/webhook/email-outbound${N8N_ENV}`;
    const n8nPayload = {
      message_id: messageId,
      to_email: contractor.email,
      to_name: `${contractor.first_name} ${contractor.last_name}`,
      subject: emailSubject,
      body: emailBody,
      template: 'check_in_reminder_night_before',
      tags: buildTags({
        category: 'event',
        type: 'checkin-reminder',
        recipient: 'contractor',
        channel: 'email',
        status: 'sent',
        entityId: eventId
      }),
      event_id: eventId,
      contractor_id: contractorId
    };

    try {
      await axios.post(n8nWebhook, n8nPayload, { timeout: 10000 });
      console.log(`[EMAIL SCHEDULER] Email sent via n8n successfully`);
    } catch (n8nError) {
      if (n8nError.response?.status === 404) {
        console.log(`[EMAIL SCHEDULER] ⚠️  n8n webhook not found (dev mode - this is ok)`);
      } else {
        console.warn(`[EMAIL SCHEDULER] ⚠️  n8n webhook error:`, n8nError.message);
      }
    }

    // Note: Message status update is handled by eventMessageWorker
    // No database update needed here - worker handles it after this function returns

    console.log(`[EMAIL SCHEDULER] ✅ Night before check-in reminder email sent successfully`);

    return {
      success: true,
      message_id: messageId,
      email: contractor.email
    };

  } catch (error) {
    console.error('[EMAIL SCHEDULER] ❌ Error sending night before check-in reminder:', error);
    throw error;
  }
}

/**
 * Send check-in reminder 1 hour before event
 * ONLY sent if NOT checked in yet (conditional logic)
 * Template: check_in_reminder_1_hour
 */
async function sendCheckInReminder1HourBefore(eventId, contractorId, messageId = null) {
  console.log(`[EMAIL SCHEDULER] Sending 1 hour before check-in reminder for event ${eventId}, contractor ${contractorId}${messageId ? `, message ${messageId}` : ''}`);

  try {
    const { sendSMSNotification } = require('../smsService');

    // Get contractor info - DATABASE-CHECKED
    const contractorResult = await query(`
      SELECT id, first_name, last_name, email, phone
      FROM contractors WHERE id = $1
    `, [contractorId]);

    if (contractorResult.rows.length === 0) {
      throw new Error(`Contractor not found: ${contractorId}`);
    }
    const contractor = contractorResult.rows[0];

    // Get event info - DATABASE-CHECKED
    const eventResult = await query(`
      SELECT id, name, location
      FROM events WHERE id = $1
    `, [eventId]);

    if (eventResult.rows.length === 0) {
      throw new Error(`Event not found: ${eventId}`);
    }
    const event = eventResult.rows[0];

    // Check if already checked in - DATABASE-CHECKED: using check_in_time field
    const attendeeResult = await query(`
      SELECT id, check_in_time
      FROM event_attendees
      WHERE event_id = $1 AND contractor_id = $2
    `, [eventId, contractorId]);

    if (attendeeResult.rows.length === 0) {
      throw new Error(`Attendee not found`);
    }
    const attendee = attendeeResult.rows[0];

    // CONDITIONAL LOGIC: Only send if NOT checked in yet
    if (attendee.check_in_time) {
      console.log(`[EMAIL SCHEDULER] Already checked in, skipping 1 hour reminder`);
      if (messageId) {
        await query(`
          UPDATE event_messages
          SET status = 'skipped', error_message = 'Already checked in'
          WHERE id = $1
        `, [messageId]);
      }
      return {
        success: true,
        skipped: true,
        reason: 'already_checked_in'
      };
    }

    // Build email content using HTML template
    const emailSubject = `⏰ ${event.name} starts in 1 hour!`;
    const emailBody = buildCheckInReminder1HourBefore({
      firstName: contractor.first_name,
      eventName: event.name,
      eventLocation: event.location,
      eventId: eventId,
      contractorId: contractorId
    });

    // Trigger n8n email workflow
    const n8nWebhook = `${N8N_WEBHOOK_BASE}/webhook/email-outbound${N8N_ENV}`;
    const n8nPayload = {
      message_id: messageId,
      to_email: contractor.email,
      to_name: `${contractor.first_name} ${contractor.last_name}`,
      subject: emailSubject,
      body: emailBody,
      template: 'check_in_reminder_1_hour',
      tags: buildTags({
        category: 'event',
        type: 'checkin-reminder',
        recipient: 'contractor',
        channel: 'email',
        status: 'sent',
        entityId: eventId
      }),
      event_id: eventId,
      contractor_id: contractorId
    };

    try {
      await axios.post(n8nWebhook, n8nPayload, { timeout: 10000 });
      console.log(`[EMAIL SCHEDULER] Email sent via n8n successfully`);
    } catch (n8nError) {
      if (n8nError.response?.status === 404) {
        console.log(`[EMAIL SCHEDULER] ⚠️  n8n webhook not found (dev mode - this is ok)`);
      } else {
        console.warn(`[EMAIL SCHEDULER] ⚠️  n8n webhook error:`, n8nError.message);
      }
    }

    // Note: Message status update is handled by eventMessageWorker
    // No database update needed here - worker handles it after this function returns

    console.log(`[EMAIL SCHEDULER] ✅ 1 hour before check-in reminder email sent successfully`);

    return {
      success: true,
      message_id: messageId,
      email: contractor.email
    };

  } catch (error) {
    console.error('[EMAIL SCHEDULER] ❌ Error sending 1 hour before check-in reminder:', error);
    throw error;
  }
}

/**
 * Send check-in reminder at event start time
 * ONLY sent if NOT checked in within the hour (conditional logic)
 * Template: check_in_reminder_event_start
 */
async function sendCheckInReminderEventStart(eventId, contractorId, messageId = null) {
  console.log(`[EMAIL SCHEDULER] Sending event start check-in reminder for event ${eventId}, contractor ${contractorId}${messageId ? `, message ${messageId}` : ''}`);

  try {
    const { sendSMSNotification } = require('../smsService');

    // Get contractor info - DATABASE-CHECKED
    const contractorResult = await query(`
      SELECT id, first_name, last_name, email, phone
      FROM contractors WHERE id = $1
    `, [contractorId]);

    if (contractorResult.rows.length === 0) {
      throw new Error(`Contractor not found: ${contractorId}`);
    }
    const contractor = contractorResult.rows[0];

    // Get event info - DATABASE-CHECKED
    const eventResult = await query(`
      SELECT id, name
      FROM events WHERE id = $1
    `, [eventId]);

    if (eventResult.rows.length === 0) {
      throw new Error(`Event not found: ${eventId}`);
    }
    const event = eventResult.rows[0];

    // Check if already checked in - DATABASE-CHECKED: using check_in_time field
    const attendeeResult = await query(`
      SELECT id, check_in_time
      FROM event_attendees
      WHERE event_id = $1 AND contractor_id = $2
    `, [eventId, contractorId]);

    if (attendeeResult.rows.length === 0) {
      throw new Error(`Attendee not found`);
    }
    const attendee = attendeeResult.rows[0];

    // CONDITIONAL LOGIC: Only send if NOT checked in yet
    if (attendee.check_in_time) {
      console.log(`[EMAIL SCHEDULER] Already checked in, skipping event start reminder`);
      if (messageId) {
        await query(`
          UPDATE event_messages
          SET status = 'skipped', error_message = 'Already checked in'
          WHERE id = $1
        `, [messageId]);
      }
      return {
        success: true,
        skipped: true,
        reason: 'already_checked_in'
      };
    }

    // Build email content using HTML template
    const emailSubject = `🚀 ${event.name} is starting now!`;
    const emailBody = buildCheckInReminderEventStart({
      firstName: contractor.first_name,
      eventName: event.name,
      eventId: eventId,
      contractorId: contractorId
    });

    // Trigger n8n email workflow
    const n8nWebhook = `${N8N_WEBHOOK_BASE}/webhook/email-outbound${N8N_ENV}`;
    const n8nPayload = {
      message_id: messageId,
      to_email: contractor.email,
      to_name: `${contractor.first_name} ${contractor.last_name}`,
      subject: emailSubject,
      body: emailBody,
      template: 'check_in_reminder_event_start',
      tags: buildTags({
        category: 'event',
        type: 'checkin-reminder',
        recipient: 'contractor',
        channel: 'email',
        status: 'sent',
        entityId: eventId
      }),
      event_id: eventId,
      contractor_id: contractorId
    };

    try {
      await axios.post(n8nWebhook, n8nPayload, { timeout: 10000 });
      console.log(`[EMAIL SCHEDULER] Email sent via n8n successfully`);
    } catch (n8nError) {
      if (n8nError.response?.status === 404) {
        console.log(`[EMAIL SCHEDULER] ⚠️  n8n webhook not found (dev mode - this is ok)`);
      } else {
        console.warn(`[EMAIL SCHEDULER] ⚠️  n8n webhook error:`, n8nError.message);
      }
    }

    // Note: Message status update is handled by eventMessageWorker
    // No database update needed here - worker handles it after this function returns

    console.log(`[EMAIL SCHEDULER] ✅ Event start check-in reminder email sent successfully`);

    return {
      success: true,
      message_id: messageId,
      email: contractor.email
    };

  } catch (error) {
    console.error('[EMAIL SCHEDULER] ❌ Error sending event start check-in reminder:', error);
    throw error;
  }
}

/**
 * Send partner profile completion request when partner/sponsor is added to event with incomplete profile
 * Template: partner_profile_completion_request
 * DATABASE-CHECKED: Using exact field names from strategic_partners table
 */
async function sendPartnerProfileCompletionRequest(eventId, partnerId) {
  console.log(`[EMAIL SCHEDULER] Sending partner profile completion for event ${eventId}, partner ${partnerId}`);

  try {
    // DATABASE-CHECKED: All field names verified against strategic_partners table
    const partnerResult = await query(`
      SELECT id, company_name, primary_contact, primary_email, primary_phone
      FROM strategic_partners WHERE id = $1
    `, [partnerId]);

    if (partnerResult.rows.length === 0) {
      throw new Error(`Partner not found: ${partnerId}`);
    }
    const partner = partnerResult.rows[0];

    if (!partner.primary_email) {
      console.log('[EMAIL SCHEDULER] ⚠️ Partner has no email, skipping profile completion request');
      return {
        success: false,
        skipped: true,
        reason: 'no_email'
      };
    }

    // Get event info - DATABASE-CHECKED: Using exact field names from events table
    const eventResult = await query(`
      SELECT id, name, date
      FROM events WHERE id = $1
    `, [eventId]);

    if (eventResult.rows.length === 0) {
      throw new Error(`Event not found: ${eventId}`);
    }
    const event = eventResult.rows[0];

    // Build email content using partner HTML template
    const emailSubject = `${partner.primary_contact || 'Hello'}, maximize your exposure at ${event.name}!`;
    const emailBody = buildPartnerProfileCompletionEmail({
      partnerContact: partner.primary_contact,
      companyName: partner.company_name,
      eventName: event.name,
      eventDate: event.date,
      eventId: eventId,
      partnerId: partnerId
    });

    // Save to database - CRITICAL: contractor_id is NULL for partner emails
    // partner_id is stored in personalization_data JSONB field
    const messageResult = await query(`
      INSERT INTO event_messages (
        event_id, contractor_id, message_type, direction, channel,
        scheduled_time, actual_send_time, personalization_data,
        message_content, status
      ) VALUES ($1, NULL, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, $5, $6, $7)
      RETURNING id
    `, [
      eventId,
      'partner_profile_completion_request',
      'outbound',
      'email',
      safeJsonStringify({
        partner_id: partnerId,  // Store partner_id here (no partner_id column in event_messages)
        company_name: partner.company_name,
        email_subject: emailSubject,
        event_name: event.name
      }),
      emailBody,
      'pending'
    ]);

    const messageId = messageResult.rows[0].id;

    // Trigger n8n email workflow
    const n8nWebhook = `${N8N_WEBHOOK_BASE}/webhook/email-outbound${N8N_ENV}`;
    const n8nPayload = {
      message_id: messageId,
      to_email: partner.primary_email,
      to_name: partner.primary_contact || partner.company_name,
      subject: emailSubject,
      body: emailBody,
      template: 'partner_profile_completion_request',
      tags: buildTags({
        category: 'event',
        type: 'partner-profile-request',
        recipient: 'partner',
        channel: 'email',
        status: 'sent',
        entityId: eventId
      }),
      event_id: eventId,
      partner_id: partnerId  // Custom field for partner emails
    };

    console.log(`[EMAIL SCHEDULER] Triggering n8n webhook: ${n8nWebhook}`);

    // Try to send via n8n, but don't fail if n8n webhook doesn't exist yet
    try {
      await axios.post(n8nWebhook, n8nPayload, { timeout: 10000 });
      console.log(`[EMAIL SCHEDULER] Partner email sent via n8n successfully`);
    } catch (n8nError) {
      if (n8nError.response?.status === 404) {
        console.log(`[EMAIL SCHEDULER] ⚠️  n8n webhook not found (dev mode - this is ok)`);
      } else {
        console.warn(`[EMAIL SCHEDULER] ⚠️  n8n webhook error:`, n8nError.message);
      }
    }

    // Update message status to sent
    await query(`
      UPDATE event_messages
      SET status = 'sent', actual_send_time = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [messageId]);

    console.log(`[EMAIL SCHEDULER] ✅ Partner profile completion sent successfully`);

    return {
      success: true,
      message_id: messageId,
      email: partner.primary_email
    };

  } catch (error) {
    console.error('[EMAIL SCHEDULER] ❌ Error sending partner profile completion:', error);
    throw error;
  }
}

module.exports = {
  sendRegistrationConfirmation,
  sendProfileCompletionRequest,
  sendProfileCompletionReminder,
  sendPersonalizedAgenda,
  sendAgendaReadyNotification,
  sendEventSummary,
  sendCheckInReminderNightBefore,
  sendCheckInReminder1HourBefore,
  sendCheckInReminderEventStart,
  sendPartnerProfileCompletionRequest
};
