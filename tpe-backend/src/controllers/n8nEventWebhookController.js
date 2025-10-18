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
  : (process.env.N8N_DEV_WEBHOOK_URL || 'https://n8n.srv918843.hstgr.cloud');

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
    const webhookPath = process.env.NODE_ENV === 'production'
      ? '/webhook/event-checkin'
      : '/webhook/event-checkin-dev';
    const response = await fetch(`${N8N_WEBHOOK_BASE}${webhookPath}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: safeJsonStringify(payload)
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
      body: safeJsonStringify(payload)
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
      body: safeJsonStringify(payload)
    });

    return response.ok;
  } catch (error) {
    console.error('Error triggering n8n scheduled messages:', error);
    return false;
  }
};

// Trigger n8n for AI speaker recommendations
const triggerSpeakerRecommendationSMS = async (eventId, contractorId, recommendations) => {
  try {
    // Get contractor details
    const contractorResult = await query(`
      SELECT c.*, ea.real_phone, ea.sms_opt_in
      FROM contractors c
      LEFT JOIN event_attendees ea ON c.id = ea.contractor_id AND ea.event_id = $1
      WHERE c.id = $2
    `, [eventId, contractorId]);

    if (contractorResult.rows.length === 0) {
      return false;
    }

    const contractor = contractorResult.rows[0];
    const phone = contractor.real_phone || contractor.phone;

    if (!phone || !contractor.sms_opt_in) {
      console.log('Contractor not opted in or no phone number');
      return false;
    }

    // Format speaker recommendations for SMS
    const speakerList = recommendations.slice(0, 3).map((speaker, idx) =>
      `${idx + 1}. ${speaker.name} (${speaker.company}): "${speaker.session.title || 'TBD'}" - ${speaker.why || speaker.quick_reasons[0] || 'Highly recommended'}`
    ).join('\n');

    const payload = {
      event_type: 'speaker_recommendation',
      event_id: eventId,
      contractor_id: contractorId,
      phone: phone,
      message_template: `🎯 Your top 3 speakers for today:\n\n${speakerList}\n\nReply with speaker number for session details.`,
      personalization_data: {
        contractor_name: contractor.name,
        company_name: contractor.company_name,
        recommendations: recommendations
      }
    };

    // Store in event_messages table
    await query(`
      INSERT INTO event_messages (
        event_id,
        contractor_id,
        message_type,
        message_category,
        scheduled_time,
        message_content,
        personalization_data,
        status,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, NOW(), $5, $6, 'pending', NOW(), NOW())
    `, [
      eventId,
      contractorId,
      'speaker_recommendation',
      'recommendation',
      payload.message_template,
      safeJsonStringify(payload.personalization_data)
    ]);

    // Send to n8n webhook
    const webhookPath = process.env.NODE_ENV === 'production'
      ? '/webhook/speaker-alerts'
      : '/webhook/speaker-alerts-dev';
    const response = await fetch(`${N8N_WEBHOOK_BASE}${webhookPath}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: safeJsonStringify(payload)
    });

    return response.ok;
  } catch (error) {
    console.error('Error triggering speaker recommendation SMS:', error);
    return false;
  }
};

// Trigger n8n for AI sponsor recommendations with talking points
const triggerSponsorRecommendationSMS = async (eventId, contractorId, recommendations) => {
  try {
    // Get contractor details using EXACT column names
    const contractorResult = await query(`
      SELECT c.*, ea.real_phone, ea.sms_opt_in
      FROM contractors c
      LEFT JOIN event_attendees ea ON c.id = ea.contractor_id AND ea.event_id = $1
      WHERE c.id = $2
    `, [eventId, contractorId]);

    if (contractorResult.rows.length === 0) {
      return false;
    }

    const contractor = contractorResult.rows[0];
    const phone = contractor.real_phone || contractor.phone;

    if (!phone || !contractor.sms_opt_in) {
      console.log('Contractor not opted in or no phone number');
      return false;
    }

    // Format sponsor recommendations with booth info
    const sponsorList = recommendations.slice(0, 3).map((sponsor, idx) => {
      const boothInfo = sponsor.booth_number ? `Booth ${sponsor.booth_number}` : sponsor.booth_location || 'See map';
      const contact = sponsor.booth_contact ? ` - ${sponsor.booth_contact.greeting}` : '';
      return `${idx + 1}. ${sponsor.company_name} (${boothInfo})${contact}`;
    }).join('\n');

    // Get first talking point for teaser
    const firstTalkingPoint = recommendations[0]?.talking_points?.[0] || 'Visit to learn about their solutions';

    const payload = {
      event_type: 'sponsor_recommendation',
      event_id: eventId,
      contractor_id: contractorId,
      phone: phone,
      message_template: `🤝 Top sponsors to visit:\n\n${sponsorList}\n\nConversation starter: "${firstTalkingPoint}"\n\nReply 1-3 for full talking points.`,
      personalization_data: {
        contractor_name: contractor.name,
        company_name: contractor.company_name,
        recommendations: recommendations
      }
    };

    // Store in event_messages table with EXACT column names
    await query(`
      INSERT INTO event_messages (
        event_id,
        contractor_id,
        message_type,
        message_category,
        scheduled_time,
        message_content,
        personalization_data,
        status,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, NOW(), $5, $6, 'pending', NOW(), NOW())
    `, [
      eventId,
      contractorId,
      'sponsor_recommendation',
      'recommendation',
      payload.message_template,
      safeJsonStringify(payload.personalization_data)
    ]);

    // Send to n8n webhook
    const webhookPath = process.env.NODE_ENV === 'production'
      ? '/webhook/event-sponsor-recommendations'
      : '/webhook/event-sponsor-recommendations-dev';
    const response = await fetch(`${N8N_WEBHOOK_BASE}${webhookPath}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: safeJsonStringify(payload)
    });

    return response.ok;
  } catch (error) {
    console.error('Error triggering sponsor recommendation SMS:', error);
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

// ============================================================
// EMAIL WEBHOOK FUNCTIONS (Parallel to SMS)
// ============================================================

/**
 * Trigger registration confirmation email
 * 2 variants: new user (with profile completion prompt) vs existing user
 */
const triggerRegistrationConfirmationEmail = async (eventId, contractorId, hasExistingProfile = false) => {
  try {
    // Get contractor and event details
    const contractorResult = await query(`
      SELECT c.*, ea.real_email
      FROM contractors c
      LEFT JOIN event_attendees ea ON c.id = ea.contractor_id AND ea.event_id = $1
      WHERE c.id = $2
    `, [eventId, contractorId]);

    if (contractorResult.rows.length === 0) {
      return false;
    }

    const contractor = contractorResult.rows[0];
    const email = contractor.real_email || contractor.email;

    if (!email) {
      console.log('No email address found for contractor');
      return false;
    }

    // Get event details
    const eventResult = await query(`
      SELECT name, date, location
      FROM events
      WHERE id = $1
    `, [eventId]);

    if (eventResult.rows.length === 0) {
      return false;
    }

    const event = eventResult.rows[0];

    // Different message based on profile status
    const subject = hasExistingProfile
      ? `You're registered for ${event.name}!`
      : `Complete your profile for ${event.name}`;

    const messageContent = hasExistingProfile
      ? `Great news! You're confirmed for ${event.name} on ${event.date} at ${event.location}. Your personalized agenda is processing and we'll send it to you soon. Get ready for an amazing experience!`
      : `You're registered for ${event.name}! To receive your personalized agenda and extract maximum value from the event, please complete your profile. We'll use this to match you with the perfect speakers, sponsors, and networking opportunities.`;

    const payload = {
      event_type: 'registration_confirmation',
      event_id: eventId,
      contractor_id: contractorId,
      to_email: email,
      from_email: process.env.EVENT_FROM_EMAIL || 'events@power100.io',
      subject: subject,
      message_content: messageContent,
      has_existing_profile: hasExistingProfile,
      personalization_data: {
        contractor_name: contractor.first_name || contractor.email.split('@')[0],
        company_name: contractor.company_name,
        event_name: event.name,
        event_date: event.date,
        event_location: event.location
      }
    };

    // Store in event_messages table
    await query(`
      INSERT INTO event_messages (
        event_id,
        contractor_id,
        message_type,
        message_category,
        channel,
        from_email,
        to_email,
        subject,
        message_content,
        personalization_data,
        status,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, 'confirmation', 'email', $4, $5, $6, $7, $8, 'pending', NOW(), NOW())
    `, [
      eventId,
      contractorId,
      'registration_confirmation',
      payload.from_email,
      payload.to_email,
      payload.subject,
      payload.message_content,
      safeJsonStringify(payload.personalization_data)
    ]);

    // Send to n8n webhook
    const webhookPath = process.env.NODE_ENV === 'production'
      ? '/webhook/event-registration-email'
      : '/webhook/event-registration-email-dev';
    const response = await fetch(`${N8N_WEBHOOK_BASE}${webhookPath}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: safeJsonStringify(payload)
    });

    return response.ok;
  } catch (error) {
    console.error('Error triggering registration confirmation email:', error);
    return false;
  }
};

/**
 * Trigger profile completion email
 */
const triggerProfileCompletionEmail = async (eventId, contractorId) => {
  try {
    // Get contractor details
    const contractorResult = await query(`
      SELECT c.*, ea.real_email
      FROM contractors c
      LEFT JOIN event_attendees ea ON c.id = ea.contractor_id AND ea.event_id = $1
      WHERE c.id = $2
    `, [eventId, contractorId]);

    if (contractorResult.rows.length === 0) {
      return false;
    }

    const contractor = contractorResult.rows[0];
    const email = contractor.real_email || contractor.email;

    if (!email) {
      console.log('No email address found for contractor');
      return false;
    }

    // Get event details
    const eventResult = await query(`
      SELECT name, date, location
      FROM events
      WHERE id = $1
    `, [eventId]);

    if (eventResult.rows.length === 0) {
      return false;
    }

    const event = eventResult.rows[0];

    const payload = {
      event_type: 'profile_completion',
      event_id: eventId,
      contractor_id: contractorId,
      to_email: email,
      from_email: process.env.EVENT_FROM_EMAIL || 'events@power100.io',
      subject: `Profile complete! Your ${event.name} agenda is being prepared`,
      message_content: `Thanks for completing your profile! We're now generating your personalized agenda for ${event.name}. You'll receive your custom recommendations for speakers, sponsors, and networking opportunities shortly. Get ready for a breakthrough experience!`,
      personalization_data: {
        contractor_name: contractor.first_name || contractor.email.split('@')[0],
        company_name: contractor.company_name,
        event_name: event.name,
        event_date: event.date,
        event_location: event.location
      }
    };

    // Store in event_messages table
    await query(`
      INSERT INTO event_messages (
        event_id,
        contractor_id,
        message_type,
        message_category,
        channel,
        from_email,
        to_email,
        subject,
        message_content,
        personalization_data,
        status,
        created_at,
        updated_at
      ) VALUES ($1, $2, 'profile_completion', 'confirmation', 'email', $3, $4, $5, $6, $7, 'pending', NOW(), NOW())
    `, [
      eventId,
      contractorId,
      payload.from_email,
      payload.to_email,
      payload.subject,
      payload.message_content,
      safeJsonStringify(payload.personalization_data)
    ]);

    // Send to n8n webhook
    const webhookPath = process.env.NODE_ENV === 'production'
      ? '/webhook/event-profile-completion-email'
      : '/webhook/event-profile-completion-email-dev';
    const response = await fetch(`${N8N_WEBHOOK_BASE}${webhookPath}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: safeJsonStringify(payload)
    });

    return response.ok;
  } catch (error) {
    console.error('Error triggering profile completion email:', error);
    return false;
  }
};

/**
 * Trigger personalized agenda email
 */
const triggerPersonalizedAgendaEmail = async (eventId, contractorId, agendaData) => {
  try {
    // Get contractor details
    const contractorResult = await query(`
      SELECT c.*, ea.real_email
      FROM contractors c
      LEFT JOIN event_attendees ea ON c.id = ea.contractor_id AND ea.event_id = $1
      WHERE c.id = $2
    `, [eventId, contractorId]);

    if (contractorResult.rows.length === 0) {
      return false;
    }

    const contractor = contractorResult.rows[0];
    const email = contractor.real_email || contractor.email;

    if (!email) {
      console.log('No email address found for contractor');
      return false;
    }

    // Get event details
    const eventResult = await query(`
      SELECT name, date, location
      FROM events
      WHERE id = $1
    `, [eventId]);

    if (eventResult.rows.length === 0) {
      return false;
    }

    const event = eventResult.rows[0];

    const payload = {
      event_type: 'personalized_agenda',
      event_id: eventId,
      contractor_id: contractorId,
      to_email: email,
      from_email: process.env.EVENT_FROM_EMAIL || 'events@power100.io',
      subject: `Your personalized agenda for ${event.name} is ready!`,
      message_content: `Your custom event experience is ready! We've matched you with speakers, sponsors, and networking opportunities based on your profile. Check your agenda to maximize your breakthrough at ${event.name}.`,
      personalization_data: {
        contractor_name: contractor.first_name || contractor.email.split('@')[0],
        company_name: contractor.company_name,
        event_name: event.name,
        event_date: event.date,
        event_location: event.location,
        agenda_data: agendaData
      }
    };

    // Store in event_messages table
    await query(`
      INSERT INTO event_messages (
        event_id,
        contractor_id,
        message_type,
        message_category,
        channel,
        from_email,
        to_email,
        subject,
        message_content,
        personalization_data,
        status,
        created_at,
        updated_at
      ) VALUES ($1, $2, 'personalized_agenda', 'agenda', 'email', $3, $4, $5, $6, $7, 'pending', NOW(), NOW())
    `, [
      eventId,
      contractorId,
      payload.from_email,
      payload.to_email,
      payload.subject,
      payload.message_content,
      safeJsonStringify(payload.personalization_data)
    ]);

    // Send to n8n webhook
    const webhookPath = process.env.NODE_ENV === 'production'
      ? '/webhook/event-personalized-agenda-email'
      : '/webhook/event-personalized-agenda-email-dev';
    const response = await fetch(`${N8N_WEBHOOK_BASE}${webhookPath}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: safeJsonStringify(payload)
    });

    return response.ok;
  } catch (error) {
    console.error('Error triggering personalized agenda email:', error);
    return false;
  }
};

/**
 * Trigger check-in reminder email
 */
const triggerCheckInReminderEmail = async (eventId, contractorId, reminderType, personalizationData) => {
  try {
    // Get contractor details
    const contractorResult = await query(`
      SELECT c.*, ea.real_email
      FROM contractors c
      LEFT JOIN event_attendees ea ON c.id = ea.contractor_id AND ea.event_id = $1
      WHERE c.id = $2
    `, [eventId, contractorId]);

    if (contractorResult.rows.length === 0) {
      return false;
    }

    const contractor = contractorResult.rows[0];
    const email = contractor.real_email || contractor.email;

    if (!email) {
      console.log('No email address found for contractor');
      return false;
    }

    // Create message content based on reminder type
    let subject = '';
    let messageContent = '';

    switch (reminderType) {
      case 'check_in_reminder_night_before':
        subject = `Tomorrow's the big day - ${personalizationData.event_name}!`;
        messageContent = `Hi ${personalizationData.first_name}! Tomorrow's the big day - ${personalizationData.event_name} starts at ${personalizationData.event_time}. Location: ${personalizationData.location}. See you there!`;
        break;

      case 'check_in_reminder_1_hour':
        subject = `${personalizationData.event_name} starts in 1 hour!`;
        messageContent = `Alright, ${personalizationData.first_name}! You have just enough time to grab a coffee and a quick bite before we need to be at the event in an hour. Let's get ready to breakthrough. The time is now!`;
        break;

      case 'check_in_reminder_event_start':
        subject = `${personalizationData.event_name} is starting NOW!`;
        messageContent = `${personalizationData.event_name} is starting NOW! Head to ${personalizationData.location} for check-in. Let's make today count!`;
        break;

      default:
        subject = `Reminder: ${personalizationData.event_name}`;
        messageContent = `Reminder about ${personalizationData.event_name}`;
    }

    const payload = {
      event_type: 'check_in_reminder',
      event_id: eventId,
      contractor_id: contractorId,
      reminder_type: reminderType,
      to_email: email,
      from_email: process.env.EVENT_FROM_EMAIL || 'events@power100.io',
      subject: subject,
      message_content: messageContent,
      personalization_data: personalizationData
    };

    // Store in event_messages table
    await query(`
      INSERT INTO event_messages (
        event_id,
        contractor_id,
        message_type,
        message_category,
        channel,
        from_email,
        to_email,
        subject,
        message_content,
        personalization_data,
        status,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, 'reminder', 'email', $4, $5, $6, $7, $8, 'pending', NOW(), NOW())
    `, [
      eventId,
      contractorId,
      reminderType,
      payload.from_email,
      payload.to_email,
      payload.subject,
      payload.message_content,
      safeJsonStringify(payload.personalization_data)
    ]);

    // Send to n8n webhook
    const webhookPath = process.env.NODE_ENV === 'production'
      ? '/webhook/event-check-in-reminder-email'
      : '/webhook/event-check-in-reminder-email-dev';
    const response = await fetch(`${N8N_WEBHOOK_BASE}${webhookPath}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: safeJsonStringify(payload)
    });

    return response.ok;
  } catch (error) {
    console.error('Error triggering check-in reminder email:', error);
    return false;
  }
};

/**
 * Trigger scheduled email messages (batch)
 * Similar to triggerScheduledMessages but for email channel
 */
const triggerScheduledEmailMessages = async (messages) => {
  try {
    const payload = {
      event_type: 'scheduled_batch_email',
      messages: messages.map(msg => ({
        message_id: msg.id,
        event_id: msg.event_id,
        contractor_id: msg.contractor_id,
        message_type: msg.message_type,
        from_email: msg.from_email,
        to_email: msg.to_email,
        subject: msg.subject,
        message_content: msg.message_content,
        personalization_data: safeJsonParse(msg.personalization_data, {})
      }))
    };

    const response = await fetch(`${N8N_WEBHOOK_BASE}/webhook/event-scheduled-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: safeJsonStringify(payload)
    });

    return response.ok;
  } catch (error) {
    console.error('Error triggering scheduled email messages:', error);
    return false;
  }
};

module.exports = {
  // SMS Functions
  triggerCheckInSMS,
  triggerMassSMS,
  triggerScheduledMessages,
  triggerSpeakerRecommendationSMS,
  triggerSponsorRecommendationSMS,
  receiveInboundSMS,
  receiveDeliveryStatus,

  // Email Functions
  triggerRegistrationConfirmationEmail,
  triggerProfileCompletionEmail,
  triggerPersonalizedAgendaEmail,
  triggerCheckInReminderEmail,
  triggerScheduledEmailMessages
};