// DATABASE-CHECKED: contractors table (69 columns), event_attendees table (16 columns), events table verified on 2025-10-06

const { query } = require('../../config/database');
const { safeJsonParse, safeJsonStringify } = require('../../utils/jsonHelpers');
const axios = require('axios');

/**
 * Event Registration & Onboarding Service
 * Handles contractor registration for events - alternative entry point to TPX system
 * Collects same data as contractor flow, grants AI Concierge access after completion
 */

/**
 * Urgency Levels for Time-Based Registration Intelligence
 */
const URGENCY_LEVELS = {
  IMMEDIATE: 'immediate',      // < 1 hour - Event starting NOW
  VERY_URGENT: 'very_urgent',  // < 2 hours - Skip night-before, urgent reminder
  URGENT: 'urgent',            // < 24 hours - Same-day messaging
  NORMAL: 'normal'             // > 24 hours - Normal reminder schedule
};

/**
 * Register contractor(s) for event - handles both new and existing contractors
 * @param {number} eventId - Event ID
 * @param {object|array} registrationData - Single registration or array for bulk
 * @returns {object} - Registration results
 */
async function registerContractors(eventId, registrationData) {
  try {
    console.log('[EventRegistration] Processing registrations for event', eventId);

    // Handle both single and bulk registrations
    const registrations = Array.isArray(registrationData) ? registrationData : [registrationData];
    const results = {
      success: [],
      failed: [],
      messages_sent: 0
    };

    for (const data of registrations) {
      try {
        const result = await registerSingleContractor(eventId, data);
        results.success.push(result);
        if (result.message_sent) results.messages_sent++;
      } catch (error) {
        console.error('[EventRegistration] Failed to register:', data.email, error.message);
        results.failed.push({
          email: data.email,
          error: error.message
        });
      }
    }

    console.log(`[EventRegistration] Completed: ${results.success.length} successful, ${results.failed.length} failed`);
    return results;

  } catch (error) {
    console.error('[EventRegistration] Error in registerContractors:', error);
    throw error;
  }
}

/**
 * Calculate urgency level based on hours until event
 * @param {Date} eventDate - Event start date/time
 * @returns {string} - Urgency level constant
 */
function calculateUrgencyLevel(eventDate) {
  const now = new Date();
  const hoursUntilEvent = (eventDate - now) / (1000 * 60 * 60);

  if (hoursUntilEvent < 1) {
    return URGENCY_LEVELS.IMMEDIATE;
  } else if (hoursUntilEvent < 2) {
    return URGENCY_LEVELS.VERY_URGENT;
  } else if (hoursUntilEvent < 24) {
    return URGENCY_LEVELS.URGENT;
  } else {
    return URGENCY_LEVELS.NORMAL;
  }
}

/**
 * Register single contractor for event
 * Decision tree: existing complete → existing incomplete → new contractor
 * INTELLIGENT: Adjusts messaging urgency based on time until event
 */
async function registerSingleContractor(eventId, data) {
  const { email, phone, first_name, last_name, company_name } = data;

  // Step 1: Get event date to calculate urgency
  const eventResult = await query(`
    SELECT date FROM events WHERE id = $1
  `, [eventId]);

  if (eventResult.rows.length === 0) {
    throw new Error('Event not found');
  }

  const eventDate = new Date(eventResult.rows[0].date);
  const urgencyLevel = calculateUrgencyLevel(eventDate);
  const hoursUntilEvent = Math.floor((eventDate - new Date()) / (1000 * 60 * 60));

  console.log(`[EventRegistration] Urgency level: ${urgencyLevel} (${hoursUntilEvent} hours until event)`);

  // Step 2: Check if contractor exists
  const existingContractor = await findContractorByEmailOrPhone(email, phone);

  if (existingContractor) {
    // Existing contractor - check profile completeness
    return await handleExistingContractor(eventId, existingContractor, urgencyLevel, hoursUntilEvent);
  } else {
    // New contractor - create record and trigger profile completion
    return await handleNewContractor(eventId, data, urgencyLevel, hoursUntilEvent);
  }
}

/**
 * Find contractor by email or phone
 */
async function findContractorByEmailOrPhone(email, phone) {
  try {
    const result = await query(`
      SELECT
        id, first_name, last_name, email, phone, company_name,
        focus_areas, revenue_tier, team_size,
        current_stage, lifecycle_stage, onboarding_source
      FROM contractors
      WHERE email = $1 OR phone = $2
      LIMIT 1
    `, [email, phone]);

    return result.rows.length > 0 ? result.rows[0] : null;
  } catch (error) {
    console.error('[EventRegistration] Error finding contractor:', error);
    throw error;
  }
}

/**
 * Handle existing contractor registration
 * Checks if profile is complete, sends appropriate message
 * INTELLIGENT: Uses urgency level for time-sensitive messaging
 */
async function handleExistingContractor(eventId, contractor, urgencyLevel, hoursUntilEvent) {
  console.log('[EventRegistration] Existing contractor:', contractor.id, contractor.email);

  // Check if already registered for this event
  const existingAttendee = await query(`
    SELECT id FROM event_attendees
    WHERE event_id = $1 AND contractor_id = $2
  `, [eventId, contractor.id]);

  if (existingAttendee.rows.length > 0) {
    console.log('[EventRegistration] Contractor already registered for event');
    return {
      contractor_id: contractor.id,
      event_id: eventId,
      status: 'already_registered',
      message_sent: false
    };
  }

  // Check profile completeness
  const isComplete = checkProfileCompleteness(contractor);

  // Create event_attendees record
  const attendeeResult = await query(`
    INSERT INTO event_attendees (
      event_id, contractor_id, registration_date,
      profile_completion_status, sms_opt_in, created_at, updated_at
    ) VALUES ($1, $2, NOW(), $3, true, NOW(), NOW())
    RETURNING id
  `, [eventId, contractor.id, isComplete ? 'completed' : 'pending']);

  const attendeeId = attendeeResult.rows[0].id;

  // Send appropriate message with urgency awareness
  let messageSent = false;
  if (isComplete) {
    // Profile complete - send personalized agenda immediately
    await sendPersonalizedAgenda(eventId, contractor.id, urgencyLevel, hoursUntilEvent);
    messageSent = true;
  } else {
    // Profile incomplete - send profile completion request with urgency
    await sendProfileCompletionRequest(eventId, contractor.id, contractor, urgencyLevel, hoursUntilEvent);
    messageSent = true;
  }

  return {
    contractor_id: contractor.id,
    attendee_id: attendeeId,
    event_id: eventId,
    status: isComplete ? 'complete_sent_agenda' : 'incomplete_sent_request',
    message_sent: messageSent,
    urgency_level: urgencyLevel
  };
}

/**
 * Handle new contractor registration
 * Creates contractor record and triggers full profile completion
 * INTELLIGENT: Uses urgency level for time-sensitive messaging
 */
async function handleNewContractor(eventId, data, urgencyLevel, hoursUntilEvent) {
  console.log('[EventRegistration] New contractor:', data.email);

  // Create contractor record with minimal data
  const contractorResult = await query(`
    INSERT INTO contractors (
      first_name, last_name, email, phone, company_name,
      onboarding_source, is_verified, sms_opt_in, ai_coach_opt_in,
      verification_status, current_stage, lifecycle_stage,
      created_at, updated_at
    ) VALUES ($1, $2, $3, $4, $5, 'event_registration', false, true, true, 'pending', 'onboarding', 'onboarding', NOW(), NOW())
    RETURNING id
  `, [
    data.first_name || null,
    data.last_name || null,
    data.email,
    data.phone || null,
    data.company_name || null
  ]);

  const contractorId = contractorResult.rows[0].id;

  // Create event_attendees record
  const attendeeResult = await query(`
    INSERT INTO event_attendees (
      event_id, contractor_id, registration_date,
      profile_completion_status, sms_opt_in, created_at, updated_at
    ) VALUES ($1, $2, NOW(), 'pending', true, NOW(), NOW())
    RETURNING id
  `, [eventId, contractorId]);

  const attendeeId = attendeeResult.rows[0].id;

  // Send profile completion request with urgency awareness (collect ALL contractor flow data)
  await sendProfileCompletionRequest(eventId, contractorId, {
    id: contractorId,
    first_name: data.first_name,
    email: data.email,
    phone: data.phone
  }, urgencyLevel, hoursUntilEvent);

  return {
    contractor_id: contractorId,
    attendee_id: attendeeId,
    event_id: eventId,
    status: 'new_contractor_created',
    message_sent: true,
    urgency_level: urgencyLevel
  };
}

/**
 * Check if contractor profile is complete
 * Same requirements as contractor flow
 */
function checkProfileCompleteness(contractor) {
  const required = ['focus_areas', 'revenue_tier', 'team_size'];

  for (const field of required) {
    if (!contractor[field] || contractor[field] === '' || contractor[field] === '[]' || contractor[field] === 'null') {
      console.log(`[EventRegistration] Missing required field: ${field}`);
      return false;
    }
  }

  return true;
}

/**
 * Send profile completion request via SMS
 * Collects missing data needed for AI Concierge
 * INTELLIGENT: Adjusts message urgency based on time until event
 */
async function sendProfileCompletionRequest(eventId, contractorId, contractor, urgencyLevel = 'normal', hoursUntilEvent = null) {
  try {
    // Get event details
    const eventResult = await query(`
      SELECT name, date, location, sms_event_code
      FROM events WHERE id = $1
    `, [eventId]);

    if (eventResult.rows.length === 0) {
      throw new Error('Event not found');
    }

    const event = eventResult.rows[0];
    const firstName = contractor.first_name || 'there';

    // Build urgency-aware message
    let message;

    switch (urgencyLevel) {
      case URGENCY_LEVELS.IMMEDIATE:
        // Event starting NOW - ultra urgent
        message = `⚡ ${firstName}! ${event.name} is STARTING NOW!\n\n` +
          `URGENT: Complete your profile in the next few minutes to get your personalized agenda:\n\n` +
          `Reply with:\n` +
          `1️⃣ Top 3 business focus areas\n` +
          `2️⃣ Revenue range\n` +
          `3️⃣ Team size\n\n` +
          `Example: "Sales, Operations, Marketing | $1-2M | 10-20"\n\n` +
          `Do this NOW to get matched with speakers & sponsors! ⚡`;
        break;

      case URGENCY_LEVELS.VERY_URGENT:
        // Less than 2 hours - very urgent
        message = `🚨 ${firstName}! ${event.name} starts in ${hoursUntilEvent} hour${hoursUntilEvent === 1 ? '' : 's'}!\n\n` +
          `Complete your profile NOW to get your personalized agenda before the event:\n\n` +
          `Reply with:\n` +
          `1️⃣ Top 3 business focus areas\n` +
          `2️⃣ Revenue range\n` +
          `3️⃣ Team size\n\n` +
          `Example: "Sales, Operations, Marketing | $1-2M | 10-20"\n\n` +
          `Quick! Get matched with the right speakers & sponsors! 🚨`;
        break;

      case URGENCY_LEVELS.URGENT:
        // Less than 24 hours - same day urgent
        message = `Hi ${firstName}! 🎉 You're registered for ${event.name} - EVENT TODAY!\n\n` +
          `Complete your profile to unlock your personalized agenda with AI-powered recommendations:\n\n` +
          `Reply with:\n` +
          `1️⃣ Top 3 business focus areas\n` +
          `2️⃣ Annual revenue range\n` +
          `3️⃣ Team size\n\n` +
          `Example: "Sales, Operations, Marketing | $1-2M | 10-20 employees"\n\n` +
          `Do this today to get matched with perfect sessions & sponsors!`;
        break;

      case URGENCY_LEVELS.NORMAL:
      default:
        // More than 24 hours - normal message
        message = `Hi ${firstName}! 🎉 You're registered for ${event.name}!\n\n` +
          `To unlock your personalized agenda with AI-powered speaker & sponsor recommendations, complete your profile:\n\n` +
          `Reply with:\n` +
          `1️⃣ Your top 3 business focus areas\n` +
          `2️⃣ Annual revenue range\n` +
          `3️⃣ Team size\n\n` +
          `Example: "Sales, Operations, Marketing | $1-2M | 10-20 employees"\n\n` +
          `This helps us match you with the perfect sessions & sponsors!`;
        break;
    }

    // Save to event_messages
    const messageResult = await query(`
      INSERT INTO event_messages (
        event_id, contractor_id, message_type, direction,
        scheduled_time, actual_send_time,
        phone, message_content, status,
        personalization_data, created_at, updated_at
      ) VALUES ($1, $2, 'profile_completion_request', 'outbound', NOW(), NOW(), $3, $4, 'sent', $5, NOW(), NOW())
      RETURNING id
    `, [
      eventId,
      contractorId,
      contractor.phone,
      message,
      safeJsonStringify({
        sms_event_code: event.sms_event_code,
        registration_trigger: true,
        urgency_level: urgencyLevel,
        hours_until_event: hoursUntilEvent
      })
    ]);

    console.log(`[EventRegistration] Profile completion request sent (${urgencyLevel}):`, messageResult.rows[0].id);

    // Send via n8n webhook
    await sendViaWebhook(contractor.phone, [message]);

    return messageResult.rows[0].id;

  } catch (error) {
    console.error('[EventRegistration] Error sending profile completion request:', error);
    throw error;
  }
}

/**
 * Send personalized agenda via SMS
 * Generated from AI-matched speakers and sponsors
 * INTELLIGENT: Adjusts message urgency based on time until event
 */
async function sendPersonalizedAgenda(eventId, contractorId, urgencyLevel = 'normal', hoursUntilEvent = null) {
  try {
    // Get contractor profile
    const contractorResult = await query(`
      SELECT first_name, last_name, phone, focus_areas, revenue_tier, team_size
      FROM contractors WHERE id = $1
    `, [contractorId]);

    if (contractorResult.rows.length === 0) {
      throw new Error('Contractor not found');
    }

    const contractor = contractorResult.rows[0];
    const firstName = contractor.first_name || 'there';
    const focusAreas = safeJsonParse(contractor.focus_areas) || [];

    // Get event details
    const eventResult = await query(`
      SELECT name, date, location, sms_event_code
      FROM events WHERE id = $1
    `, [eventId]);

    const event = eventResult.rows[0];

    // Get top 3 speakers based on focus areas
    const speakersResult = await query(`
      SELECT id, name, title, company, session_title, session_time, session_location, focus_areas
      FROM event_speakers
      WHERE event_id = $1
      ORDER BY
        CASE
          WHEN focus_areas::text LIKE ANY($2) THEN 1
          ELSE 2
        END,
        session_time ASC
      LIMIT 3
    `, [eventId, focusAreas.map(fa => `%${fa}%`)]);

    // Get top 3 sponsors based on focus areas
    const sponsorsResult = await query(`
      SELECT
        es.id, es.sponsor_name, es.booth_number, es.booth_location,
        es.booth_representatives, es.focus_areas_served,
        sp.company_name, sp.value_proposition
      FROM event_sponsors es
      LEFT JOIN strategic_partners sp ON es.partner_id = sp.id
      WHERE es.event_id = $1
      ORDER BY
        CASE
          WHEN es.focus_areas_served::text LIKE ANY($2) THEN 1
          ELSE 2
        END
      LIMIT 3
    `, [eventId, focusAreas.map(fa => `%${fa}%`)]);

    // Build urgency-aware personalized agenda message
    let agendaMessage;

    switch (urgencyLevel) {
      case URGENCY_LEVELS.IMMEDIATE:
        agendaMessage = `⚡ ${firstName}, ${event.name} is STARTING NOW! Here's your personalized agenda:\n\n`;
        break;

      case URGENCY_LEVELS.VERY_URGENT:
        agendaMessage = `🚨 ${firstName}, ${event.name} starts in ${hoursUntilEvent} hour${hoursUntilEvent === 1 ? '' : 's'}! Your agenda:\n\n`;
        break;

      case URGENCY_LEVELS.URGENT:
        agendaMessage = `🎉 ${firstName}, ${event.name} is TODAY! Your personalized agenda:\n\n`;
        break;

      case URGENCY_LEVELS.NORMAL:
      default:
        agendaMessage = `🎉 ${firstName}, your personalized ${event.name} agenda is ready!\n\n`;
        break;
    }

    // Add speakers
    if (speakersResult.rows.length > 0) {
      agendaMessage += `🎤 TOP SPEAKERS FOR YOU:\n\n`;
      speakersResult.rows.forEach((speaker, index) => {
        agendaMessage += `${index + 1}. ${speaker.name} - ${speaker.company}\n`;
        agendaMessage += `   "${speaker.session_title}"\n`;
        agendaMessage += `   📍 ${speaker.session_location} | ⏰ ${new Date(speaker.session_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}\n\n`;
      });
    }

    // Add sponsors
    if (sponsorsResult.rows.length > 0) {
      agendaMessage += `🤝 TOP SPONSORS FOR YOU:\n\n`;
      sponsorsResult.rows.forEach((sponsor, index) => {
        const reps = safeJsonParse(sponsor.booth_representatives) || [];
        const repInfo = reps.length > 0 ? `Ask for ${reps[0].name} (${reps[0].title})` : 'Visit their booth';
        agendaMessage += `${index + 1}. ${sponsor.sponsor_name}\n`;
        agendaMessage += `   📍 Booth ${sponsor.booth_number} | ${repInfo}\n\n`;
      });
    }

    // Urgency-aware closing message
    switch (urgencyLevel) {
      case URGENCY_LEVELS.IMMEDIATE:
        agendaMessage += `Check in NOW and start networking! ⚡`;
        break;

      case URGENCY_LEVELS.VERY_URGENT:
        agendaMessage += `Check in when you arrive - see you soon! 🚨`;
        break;

      case URGENCY_LEVELS.URGENT:
        agendaMessage += `Check in when you arrive today. Enjoy the event! 🚀`;
        break;

      case URGENCY_LEVELS.NORMAL:
      default:
        agendaMessage += `We'll send reminders before each session. See you there! 🚀`;
        break;
    }

    // Split into multiple SMS if needed (320 chars per message)
    const messages = splitIntoSMS(agendaMessage);

    // Save to event_messages
    const messageResult = await query(`
      INSERT INTO event_messages (
        event_id, contractor_id, message_type, direction,
        scheduled_time, actual_send_time,
        phone, message_content, status,
        personalization_data, created_at, updated_at
      ) VALUES ($1, $2, 'pre_event_agenda', 'outbound', NOW(), NOW(), $3, $4, 'sent', $5, NOW(), NOW())
      RETURNING id
    `, [
      eventId,
      contractorId,
      contractor.phone,
      messages.join(' '),
      safeJsonStringify({
        sms_event_code: event.sms_event_code,
        urgency_level: urgencyLevel,
        hours_until_event: hoursUntilEvent,
        speakers: speakersResult.rows.map(s => ({ id: s.id, name: s.name, session_title: s.session_title })),
        sponsors: sponsorsResult.rows.map(s => ({ id: s.id, name: s.sponsor_name, booth_number: s.booth_number }))
      })
    ]);

    console.log(`[EventRegistration] Personalized agenda sent (${urgencyLevel}):`, messageResult.rows[0].id, `(${messages.length} SMS)`);

    // Send via n8n webhook
    await sendViaWebhook(contractor.phone, messages);

    return messageResult.rows[0].id;

  } catch (error) {
    console.error('[EventRegistration] Error sending personalized agenda:', error);
    throw error;
  }
}

/**
 * Split long message into multiple SMS (320 chars each)
 */
function splitIntoSMS(message, maxLength = 320) {
  if (message.length <= maxLength) return [message];

  const messages = [];
  let remaining = message;

  while (remaining.length > 0) {
    if (remaining.length <= maxLength) {
      messages.push(remaining);
      break;
    }

    // Find last space before maxLength
    let splitIndex = remaining.lastIndexOf(' ', maxLength);
    if (splitIndex === -1) splitIndex = maxLength;

    messages.push(remaining.substring(0, splitIndex).trim());
    remaining = remaining.substring(splitIndex).trim();
  }

  return messages;
}

/**
 * Send SMS via n8n webhook (outbound endpoint)
 * Uses environment-aware webhook path
 */
async function sendViaWebhook(phone, messages) {
  try {
    const n8nWebhookUrl = process.env.NODE_ENV === 'production'
      ? 'https://n8n.srv918843.hstgr.cloud/webhook/backend-to-ghl'
      : 'https://n8n.srv918843.hstgr.cloud/webhook/backend-to-ghl-dev';

    for (const message of messages) {
      await axios.post(n8nWebhookUrl, {
        phone,
        message,
        timestamp: new Date().toISOString()
      });
    }

    console.log('[EventRegistration] SMS sent via webhook:', { phone, count: messages.length });
  } catch (error) {
    console.error('[EventRegistration] Error sending via webhook:', error.message);
    // Don't throw - we've already saved to database, can retry later
  }
}

module.exports = {
  registerContractors,
  registerSingleContractor,
  sendProfileCompletionRequest,
  sendPersonalizedAgenda
};
