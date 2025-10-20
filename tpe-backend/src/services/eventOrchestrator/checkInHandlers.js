// DATABASE-CHECKED: event_attendees, event_messages columns verified on 2025-10-06
const { query } = require('../../config/database');
const { safeJsonParse, safeJsonStringify } = require('../../utils/jsonHelpers');
const { processMessageForSMS } = require('../../utils/smsHelpers');
const aiConciergeController = require('../../controllers/aiConciergeController');

/**
 * Handle event check-in related questions and requests
 * When contractor asks about check-in status, event info, schedule, etc.
 *
 * Examples:
 * - "Am I checked in?"
 * - "What's my check-in status?"
 * - "What event am I at?"
 * - "When does the event start?"
 * - "Where do I check in?"
 */
async function handleEventCheckIn(smsData, classification) {
  try {
    console.log('[CheckInHandler] Processing event check-in question:', smsData.messageText);

    // 🛡️ CRITICAL: Try table lookup first, but ALWAYS fallback to AI Concierge if it fails
    let attendance = null;

    try {
      // Get contractor's event attendance record
      // DATABASE-CHECKED: event_attendees columns verified, using events.name (NOT event_name)
      const attendanceResult = await query(`
        SELECT
          ea.id,
          ea.event_id,
          ea.contractor_id,
          ea.check_in_time,
          ea.check_in_method,
          ea.profile_completion_status,
          ea.sms_opt_in,
          ea.real_phone,
          e.name as event_name,
          e.date as event_date,
          e.location as venue_name,
          e.location as venue_address
        FROM event_attendees ea
        LEFT JOIN events e ON ea.event_id = e.id
        WHERE ea.contractor_id = $1
          AND ea.event_id = $2
        LIMIT 1
      `, [smsData.contractor.id, smsData.eventContext?.id]);

      attendance = attendanceResult.rows.length > 0 ? attendanceResult.rows[0] : null;

    } catch (queryError) {
      console.error('[CheckInHandler] Database query failed:', queryError.message);
      console.log('[CheckInHandler] ✅ ROUTING TO AI CONCIERGE (database error)');

      // Fallback to AI Concierge for ANY database error
      return await routeToAIConcierge(smsData, 'database_error', {
        error: queryError.message,
        original_question: smsData.messageText
      });
    }

    // Use AI to analyze what they're asking about
    const analysisPrompt = `Analyze this contractor's question about event check-in/status:

Message: "${smsData.messageText}"

Determine what they're asking about:
1. Check-in status? (have they checked in yet)
2. Event information? (what event, where, when)
3. Profile completion? (need to complete profile)
4. General event question?

Respond in JSON:
{
  "question_type": "check_in_status|event_info|profile_completion|general_event",
  "specific_ask": "description of what they want to know",
  "confidence": 0-100
}`;

    const analysisResponse = await aiConciergeController.generateAIResponse(
      analysisPrompt,
      smsData.contractor,
      smsData.contractor.id
    );

    // Parse AI analysis
    let analysis;
    try {
      analysis = typeof analysisResponse === 'string'
        ? JSON.parse(analysisResponse)
        : analysisResponse;
    } catch (e) {
      console.log('[CheckInHandler] AI response not JSON, using fallback detection');
      analysis = fallbackQuestionDetection(smsData.messageText);
    }

    console.log('[CheckInHandler] Analysis:', analysis);

    // Route based on question type
    if (analysis.question_type === 'check_in_status') {
      return await handleCheckInStatusQuery(smsData, attendance);

    } else if (analysis.question_type === 'profile_completion') {
      return await handleProfileCompletionQuery(smsData, attendance);

    } else if (analysis.question_type === 'event_info') {
      return await handleEventInfoQuery(smsData, attendance, analysis.specific_ask);

    } else {
      // General event question - route to AI Concierge with event context
      return await handleGeneralEventQuestion(smsData, attendance, analysis.specific_ask);
    }

  } catch (error) {
    console.error('[CheckInHandler] Error handling event check-in:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Fallback question detection if AI analysis fails
 */
function fallbackQuestionDetection(messageText) {
  const text = messageText.toLowerCase();

  // Detect question type
  const checkInKeywords = ['check in', 'checked in', 'check-in', 'am i in', 'did i check'];
  const profileKeywords = ['profile', 'complete', 'finish', 'update info', 'my info'];
  const eventInfoKeywords = ['what event', 'where', 'when', 'location', 'address', 'venue', 'time'];

  let questionType = 'general_event';
  if (checkInKeywords.some(kw => text.includes(kw))) questionType = 'check_in_status';
  if (profileKeywords.some(kw => text.includes(kw))) questionType = 'profile_completion';
  if (eventInfoKeywords.some(kw => text.includes(kw))) questionType = 'event_info';

  return {
    question_type: questionType,
    specific_ask: messageText,
    confidence: 70
  };
}

/**
 * Handle check-in status query
 */
async function handleCheckInStatusQuery(smsData, attendance) {
  if (!attendance || !attendance.check_in_time) {
    // Not checked in yet
    const firstName = smsData.contractor.name.split(' ')[0];
    const message = `Hi ${firstName}! You're not checked in yet. Please visit the registration desk with your QR code (check your email) to check in and unlock your personalized agenda!`;

    return {
      success: true,
      action: 'send_message',
      messages: [message],
      phone: smsData.phone,
      contractor_id: smsData.contractor.id,
      message_type: 'check_in_status_not_checked_in',
      response_sent: true,
      checked_in: false
    };
  }

  // Already checked in
  const checkInTime = new Date(attendance.check_in_time);
  const timeAgo = getTimeAgo(checkInTime);

  const prompt = `I just asked about my check-in status at the ${attendance.event_name}.

I checked in ${timeAgo} via ${attendance.check_in_method}.

Please confirm my check-in and:
- Welcome me (if recent check-in)
- Remind me about the event experience
- Encourage me to engage with sessions/sponsors/networking

PERSONALITY & TONE:
- Sound like their moderately laid back cool cousin on mom's side
- Witty one-liners are great IF they stay relevant to the topic
- Encouraging and motivating
- Straight to the point while being clever and concise
- CRITICAL: Value first - never sacrifice delivering value for wit
- If adding cleverness reduces value, skip the wit and deliver value

SMS CONSTRAINTS:
- Maximum 320 characters
- NO signatures or sign-offs
- End naturally without formal closing`;

  const aiResponse = await aiConciergeController.generateAIResponse(
    prompt,
    smsData.contractor,
    smsData.contractor.id
  );

  const smsResult = processMessageForSMS(aiResponse, {
    allowMultiSMS: false,
    maxMessages: 1
  });

  await saveOutboundMessage({
    contractor_id: smsData.contractor.id,
    event_id: attendance.event_id,
    message_type: 'check_in_status_confirmed',
    personalization_data: {
      check_in_time: attendance.check_in_time,
      check_in_method: attendance.check_in_method
    },
    ghl_contact_id: smsData.ghl_contact_id,
    ghl_location_id: smsData.ghl_location_id,
    message_content: smsResult.messages.join(' ')
  });

  return {
    success: true,
    action: 'send_message',
    messages: smsResult.messages,
    phone: smsData.phone,
    contractor_id: smsData.contractor.id,
    message_type: 'check_in_status_confirmed',
    response_sent: true,
    checked_in: true
  };
}

/**
 * Handle profile completion query
 */
async function handleProfileCompletionQuery(smsData, attendance) {
  if (!attendance) {
    const message = `Hi! I don't have a record of your registration for an active event. Please check with the event organizers if you believe this is an error.`;

    return {
      success: true,
      action: 'send_message',
      messages: [message],
      phone: smsData.phone,
      contractor_id: smsData.contractor.id,
      message_type: 'no_event_registration',
      response_sent: true
    };
  }

  if (attendance.profile_completion_status === 'complete') {
    const message = `Great news! Your event profile is complete. You're all set to get the most personalized experience at ${attendance.event_name}!`;

    return {
      success: true,
      action: 'send_message',
      messages: [message],
      phone: smsData.phone,
      contractor_id: smsData.contractor.id,
      message_type: 'profile_already_complete',
      response_sent: true,
      profile_complete: true
    };
  }

  // Profile not complete
  const message = `Your profile isn't complete yet! Visit a profile completion kiosk or reply PROFILE to finish. This helps us personalize your ${attendance.event_name} experience with relevant sessions and connections.`;

  return {
    success: true,
    action: 'send_message',
    messages: [message],
    phone: smsData.phone,
    contractor_id: smsData.contractor.id,
    message_type: 'profile_incomplete',
    response_sent: true,
    profile_complete: false
  };
}

/**
 * Handle event information query
 */
async function handleEventInfoQuery(smsData, attendance, specificAsk) {
  if (!attendance) {
    const message = `Hi! I don't see you registered for an active event. If you have questions about Power100 events, visit power100.io or contact support@power100.io`;

    return {
      success: true,
      action: 'send_message',
      messages: [message],
      phone: smsData.phone,
      contractor_id: smsData.contractor.id,
      message_type: 'no_event_info',
      response_sent: true
    };
  }

  const prompt = `I'm asking about event information: "${specificAsk}"

Event Details:
- Event: ${attendance.event_name}
- Date: ${new Date(attendance.event_date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
- Venue: ${attendance.venue_name}
- Address: ${attendance.venue_address}

Please answer my question with relevant event details:
- Be specific and helpful
- Include location/time if relevant
- Keep me engaged

PERSONALITY & TONE:
- Sound like their moderately laid back cool cousin on mom's side
- Witty one-liners are great IF they stay relevant to the topic
- Encouraging and motivating
- Straight to the point while being clever and concise
- CRITICAL: Value first - never sacrifice delivering value for wit
- If adding cleverness reduces value, skip the wit and deliver value

SMS CONSTRAINTS:
- Maximum 320 characters (can use 2 messages if needed)
- NO signatures or sign-offs
- End naturally without formal closing`;

  const aiResponse = await aiConciergeController.generateAIResponse(
    prompt,
    smsData.contractor,
    smsData.contractor.id
  );

  const smsResult = processMessageForSMS(aiResponse, {
    allowMultiSMS: true,
    maxMessages: 2,
    context: { messageType: 'event_info_response' }
  });

  await saveOutboundMessage({
    contractor_id: smsData.contractor.id,
    event_id: attendance.event_id,
    message_type: 'event_info_response',
    personalization_data: {
      event_name: attendance.event_name,
      question_asked: specificAsk
    },
    ghl_contact_id: smsData.ghl_contact_id,
    ghl_location_id: smsData.ghl_location_id,
    message_content: smsResult.messages.join(' ')
  });

  return {
    success: true,
    action: 'send_message',
    messages: smsResult.messages,
    phone: smsData.phone,
    contractor_id: smsData.contractor.id,
    message_type: 'event_info_response',
    response_sent: true,
    multi_sms: smsResult.wasSplit
  };
}

/**
 * Handle general event question with AI Concierge
 */
async function handleGeneralEventQuestion(smsData, attendance, specificAsk) {
  const eventContext = attendance ? `
Event Context:
- Event: ${attendance.event_name}
- Check-in Status: ${attendance.check_in_time ? 'Checked in' : 'Not checked in'}
- Profile: ${attendance.profile_completion_status}
` : 'No active event registration found';

  const prompt = `I'm at the Power100 event and I asked: "${specificAsk}"

${eventContext}

Please help me with my question:
- Be specific and actionable
- Use event context if relevant
- Keep me engaged with the event

PERSONALITY & TONE:
- Sound like their moderately laid back cool cousin on mom's side
- Witty one-liners are great IF they stay relevant to the topic
- Encouraging and motivating
- Straight to the point while being clever and concise
- CRITICAL: Value first - never sacrifice delivering value for wit
- If adding cleverness reduces value, skip the wit and deliver value

SMS CONSTRAINTS:
- Maximum 320 characters (can use 2 messages if needed)
- NO signatures or sign-offs
- End naturally without formal closing`;

  const aiResponse = await aiConciergeController.generateAIResponse(
    prompt,
    smsData.contractor,
    smsData.contractor.id
  );

  const smsResult = processMessageForSMS(aiResponse, {
    allowMultiSMS: true,
    maxMessages: 2
  });

  await saveOutboundMessage({
    contractor_id: smsData.contractor.id,
    event_id: attendance?.event_id,
    message_type: 'general_event_question',
    personalization_data: {
      question_asked: specificAsk
    },
    ghl_contact_id: smsData.ghl_contact_id,
    ghl_location_id: smsData.ghl_location_id,
    message_content: smsResult.messages.join(' ')
  });

  return {
    success: true,
    action: 'send_message',
    messages: smsResult.messages,
    phone: smsData.phone,
    contractor_id: smsData.contractor.id,
    message_type: 'general_event_question',
    response_sent: true,
    multi_sms: smsResult.wasSplit
  };
}

/**
 * Get human-readable time ago string
 */
function getTimeAgo(date) {
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
}

/**
 * Save outbound message to database
 */
async function saveOutboundMessage({ contractor_id, event_id, message_type, personalization_data, ghl_contact_id, ghl_location_id, message_content }) {
  try {
    await query(`
      INSERT INTO event_messages (
        contractor_id,
        event_id,
        message_type,
        direction,
        personalization_data,
        ghl_contact_id,
        phone,
        actual_send_time,
        message_content
      ) VALUES ($1, $2, $3, 'outbound', $4, $5, $6, CURRENT_TIMESTAMP, $7)
    `, [
      contractor_id,
      event_id || null,
      message_type,
      safeJsonStringify(personalization_data),
      ghl_contact_id,
      ghl_location_id,
      message_content || 'Message content not provided'
    ]);

    console.log('[CheckInHandler] Outbound message saved to database');
  } catch (error) {
    console.error('[CheckInHandler] Error saving outbound message:', error);
  }
}

/**
 * 🤖 FALLBACK ROUTE TO AI CONCIERGE
 *
 * This is the CRITICAL safety net that ensures users ALWAYS get an answer.
 * If immediate table lookup fails OR question needs broader context,
 * this routes the question directly to the AI Concierge which has access
 * to ALL database tables and can answer ANY question.
 *
 * This is the "whole point of the AI Concierge" - comprehensive, reliable answers.
 */
async function routeToAIConcierge(smsData, reason, context = {}) {
  console.log(`[CheckInHandler] 🤖 Routing to AI Concierge - Reason: ${reason}`);

  try {
    // Build enhanced prompt with event context if available
    const enhancedPrompt = `I'm a contractor who just asked: "${smsData.messageText}"

Context:
- I'm ${smsData.contractor.name} from ${smsData.contractor.company_name || 'my company'}
- I'm asking about an event-related question
${smsData.eventContext ? `- Event ID: ${smsData.eventContext.id}` : '- No specific event context'}
${context.error ? `- System note: Table lookup failed (${context.error})` : ''}

Please answer my question using ALL available data from the database:
- Event information (name, date, location, schedule)
- My registration and check-in status
- Any other relevant context

PERSONALITY & TONE:
- Sound like their moderately laid back cool cousin on mom's side
- Witty one-liners are great IF they stay relevant to the topic
- Encouraging and motivating
- Straight to the point while being clever and concise
- CRITICAL: Value first - never sacrifice delivering value for wit
- If adding cleverness reduces value, skip the wit and deliver value

SMS CONSTRAINTS:
- Maximum 320 characters (can use 2 messages if needed)
- NO technical error messages to the user
- NO signatures or sign-offs
- End naturally without formal closing`;

    // 🎯 CRITICAL: Pass event context to AI Concierge so it knows about the ACTUAL event
    // Get event details with speakers and sponsors
    let eventDetails = null;
    if (smsData.eventContext?.id) {
      try {
        const eventResult = await query(`
          SELECT
            e.id,
            e.name,
            e.date,
            e.location,
            e.description,
            e.topics
          FROM events e
          WHERE e.id = $1
        `, [smsData.eventContext.id]);

        if (eventResult.rows.length > 0) {
          eventDetails = eventResult.rows[0];

          // Get speakers for this event
          const speakersResult = await query(`
            SELECT name, session_title, session_time, company
            FROM event_speakers
            WHERE event_id = $1
            ORDER BY session_time
          `, [smsData.eventContext.id]);

          // Get sponsors for this event
          const sponsorsResult = await query(`
            SELECT sponsor_name, booth_number
            FROM event_sponsors
            WHERE event_id = $1
          `, [smsData.eventContext.id]);

          eventDetails.speakers = speakersResult.rows;
          eventDetails.sponsors = sponsorsResult.rows;
          eventDetails.eventStatus = 'during_event'; // Mark as active event

          console.log('[CheckInHandler] ✅ Event context loaded:', eventDetails.name, 'with', eventDetails.speakers.length, 'speakers and', eventDetails.sponsors.length, 'sponsors');
        }
      } catch (eventErr) {
        console.error('[CheckInHandler] Error fetching event details:', eventErr);
      }
    }

    // Call AI Concierge with event context as 4th parameter
    // generateAIResponse signature: (userInput, contractor, contractorId, eventContext)
    // Event context will be merged into knowledge base as currentEvent
    const aiResponse = await aiConciergeController.generateAIResponse(
      enhancedPrompt,
      smsData.contractor,
      smsData.contractor.id,
      eventDetails  // Pass event details as 4th parameter - will be added to knowledgeBase.currentEvent
    );

    // Extract response content
    const responseContent = typeof aiResponse === 'object' && aiResponse.content
      ? aiResponse.content
      : aiResponse;

    // Process for SMS (may split into multiple messages)
    const smsResult = processMessageForSMS(responseContent, {
      allowMultiSMS: true,
      maxMessages: 2
    });

    console.log('[CheckInHandler] ✅ AI Concierge response generated:', smsResult.messages.length, 'message(s)');

    // Save outbound message if possible (don't fail if this fails)
    try {
      await saveOutboundMessage({
        contractor_id: smsData.contractor.id,
        event_id: smsData.eventContext?.id || null,
        message_type: 'ai_concierge_fallback',
        personalization_data: {
          fallback_reason: reason,
          original_question: smsData.messageText,
          context
        },
        ghl_contact_id: smsData.ghl_contact_id,
        ghl_location_id: smsData.ghl_location_id,
        message_content: smsResult.messages.join(' ')
      });
    } catch (saveError) {
      console.error('[CheckInHandler] Error saving AI Concierge response (non-fatal):', saveError);
    }

    return {
      success: true,
      action: 'send_message',
      messages: smsResult.messages,
      phone: smsData.phone,
      contractor_id: smsData.contractor.id,
      message_type: 'ai_concierge_fallback',
      response_sent: true,
      multi_sms: smsResult.wasSplit,
      fallback_reason: reason
    };

  } catch (aiError) {
    console.error('[CheckInHandler] AI Concierge fallback also failed:', aiError);

    // Last resort: Send helpful error message
    const firstName = smsData.contractor.name.split(' ')[0];
    const fallbackMessage = `Hi ${firstName}! I'm having trouble accessing event information right now. Please try again in a moment, or contact support@power100.io if this persists. We're here to help!`;

    return {
      success: false,
      action: 'send_message',
      messages: [fallbackMessage],
      phone: smsData.phone,
      contractor_id: smsData.contractor.id,
      message_type: 'error_fallback',
      response_sent: true,
      error: aiError.message
    };
  }
}

module.exports = {
  handleEventCheckIn
};
