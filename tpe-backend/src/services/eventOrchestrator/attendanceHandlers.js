// DATABASE-CHECKED: event_messages columns verified on 2025-10-06
const { query } = require('../../config/database');
const { safeJsonParse, safeJsonStringify } = require('../../utils/jsonHelpers');
const { processMessageForSMS } = require('../../utils/smsHelpers');
const aiConciergeController = require('../../controllers/aiConciergeController');

/**
 * Handle attendance confirmation response
 * When contractor replies to "Did you attend [Session/Event]?" question
 *
 * Flow:
 * 1. Outbound: "Did you attend Jennifer Chen's AI in Construction session?"
 * 2. Response: "Yes! It was amazing 9/10" OR "Yes" OR "No"
 * 3. Extract: Attendance (Yes/No) + Optional PCR (if provided)
 * 4. If YES with PCR → Save PCR, send thank you
 * 5. If YES without PCR → Trigger PCR request
 * 6. If NO → Acknowledge, no PCR needed
 */
async function handleAttendanceConfirmation(smsData, classification) {
  try {
    console.log('[AttendanceHandler] Processing attendance confirmation:', smsData.messageText);

    const messageText = smsData.messageText.trim().toLowerCase();

    // Use AI to analyze the response for attendance confirmation and optional PCR
    const analysisPrompt = `Analyze this contractor's response to an attendance question:

Message: "${smsData.messageText}"

Determine:
1. Did they confirm attendance? (YES/NO/UNCLEAR)
2. Is there a PowerConfidence Rating (PCR) included? (1-5 scale or 1-10 scale)
3. What's the sentiment? (positive/neutral/negative)

Respond in JSON:
{
  "attended": "yes|no|unclear",
  "pcr_rating": null or number (1-5 scale, convert 10-point to 5-point if needed),
  "sentiment": "positive|neutral|negative",
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
      console.log('[AttendanceHandler] AI response not JSON, using fallback detection');
      analysis = fallbackAttendanceDetection(messageText);
    }

    console.log('[AttendanceHandler] Analysis:', analysis);

    // Get the pending attendance check message
    let pendingMessages = classification.context_data?.pending_messages || [];

    if (pendingMessages.length === 0) {
      console.log('[AttendanceHandler] No pending messages from router, querying database directly');
      const messagesResult = await query(`
        SELECT
          id,
          message_type,
          personalization_data,
          actual_send_time
        FROM event_messages
        WHERE contractor_id = $1
          AND direction = 'outbound'
          AND message_type IN ('attendance_check', 'speaker_alert', 'sponsor_recommendation')
          AND actual_send_time > NOW() - INTERVAL '24 hours'
        ORDER BY actual_send_time DESC
        LIMIT 5
      `, [smsData.contractor.id]);

      pendingMessages = messagesResult.rows;
      console.log('[AttendanceHandler] Found', pendingMessages.length, 'messages from database');
    }

    const attendanceCheck = pendingMessages.find(m =>
      m.message_type === 'attendance_check' ||
      m.message_type === 'speaker_alert' ||
      m.message_type === 'sponsor_recommendation'
    );

    if (!attendanceCheck) {
      console.log('[AttendanceHandler] No attendance check found, treating as general response');
      return await handleGeneralAttendanceResponse(smsData, analysis);
    }

    // Parse personalization data to understand what they're confirming attendance for
    const personalizationData = safeJsonParse(attendanceCheck.personalization_data);
    const attendanceContext = {
      type: personalizationData?.attendance_type || 'unknown', // 'speaker', 'sponsor', 'event'
      name: personalizationData?.session_name || personalizationData?.speaker_name || personalizationData?.sponsor_name || 'session',
      id: personalizationData?.session_id || personalizationData?.speaker_id || personalizationData?.sponsor_id
    };

    console.log('[AttendanceHandler] Attendance context:', attendanceContext);

    // Calculate sentiment score (0-1 scale)
    const sentimentScore = analysis.sentiment === 'positive' ? 0.8 :
                          analysis.sentiment === 'neutral' ? 0.5 : 0.2;

    // Update the original attendance check message
    await query(`
      UPDATE event_messages
      SET
        response_received = $1,
        response_time = CURRENT_TIMESTAMP,
        sentiment_score = $2,
        action_taken = $3,
        pcr_score = $4,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $5
    `, [
      smsData.messageText,
      sentimentScore,
      analysis.attended === 'yes' ? 'confirmed_attendance' :
      analysis.attended === 'no' ? 'declined_attendance' : 'unclear_response',
      analysis.pcr_rating ? (analysis.pcr_rating * 20) : null, // Convert 1-5 to 1-100 scale
      attendanceCheck.id
    ]);

    console.log('[AttendanceHandler] Updated attendance check message');

    // Route based on attendance confirmation
    if (analysis.attended === 'no') {
      // They didn't attend - acknowledge and move on
      return await handleNonAttendance(smsData, attendanceContext);

    } else if (analysis.attended === 'yes') {
      // They attended!
      if (analysis.pcr_rating) {
        // PCR included in response - save and thank them
        return await handleAttendanceWithPCR(smsData, attendanceContext, analysis.pcr_rating, sentimentScore);
      } else {
        // No PCR yet - request it
        return await handleAttendanceWithoutPCR(smsData, attendanceContext, sentimentScore);
      }

    } else {
      // Unclear response - ask for clarification
      return await handleUnclearAttendance(smsData, attendanceContext);
    }

  } catch (error) {
    console.error('[AttendanceHandler] Error handling attendance confirmation:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Fallback attendance detection if AI analysis fails
 */
function fallbackAttendanceDetection(messageText) {
  const text = messageText.toLowerCase();

  // Detect attendance
  const yesKeywords = ['yes', 'yeah', 'yep', 'absolutely', 'definitely', 'attended', 'was there', 'went to'];
  const noKeywords = ['no', 'nope', 'didn\'t', 'missed', 'couldn\'t make', 'not attend'];

  let attended = 'unclear';
  if (yesKeywords.some(kw => text.includes(kw))) attended = 'yes';
  if (noKeywords.some(kw => text.includes(kw))) attended = 'no';

  // Detect PCR (look for X/5 or X/10 or just numbers)
  let pcrRating = null;
  const pcrMatch5 = text.match(/(\d)[\/\s]*(?:out of|\/)\s*5/);
  const pcrMatch10 = text.match(/(\d{1,2})[\/\s]*(?:out of|\/)\s*10/);
  const singleDigit = text.match(/\b([1-5])\b/);

  if (pcrMatch5) {
    pcrRating = parseInt(pcrMatch5[1]);
  } else if (pcrMatch10) {
    pcrRating = Math.round(parseInt(pcrMatch10[1]) / 2); // Convert 10-point to 5-point
  } else if (singleDigit && attended === 'yes') {
    pcrRating = parseInt(singleDigit[1]);
  }

  // Detect sentiment
  const positiveWords = ['amazing', 'great', 'excellent', 'loved', 'awesome', 'fantastic', 'helpful'];
  const negativeWords = ['bad', 'poor', 'waste', 'boring', 'useless', 'terrible'];

  let sentiment = 'neutral';
  if (positiveWords.some(w => text.includes(w))) sentiment = 'positive';
  if (negativeWords.some(w => text.includes(w))) sentiment = 'negative';

  return {
    attended,
    pcr_rating: pcrRating,
    sentiment,
    confidence: 70
  };
}

/**
 * Handle when contractor didn't attend
 */
async function handleNonAttendance(smsData, attendanceContext) {
  const prompt = `I just told you I didn't attend "${attendanceContext.name}" at the Power100 Summit.

Please send me a brief acknowledgment that:
- Shows you understand I couldn't make it
- Encourages me to check out other sessions/opportunities
- Keeps me engaged with the event
- Stays positive and supportive

CRITICAL SMS CONSTRAINTS:
- Maximum 320 characters
- Be warm and encouraging
- No guilt or pressure
- NO fluff or filler words`;

  const aiResponse = await aiConciergeController.generateAIResponse(
    prompt,
    smsData.contractor,
    smsData.contractor.id
  );

  const smsResult = processMessageForSMS(aiResponse, {
    allowMultiSMS: false,
    maxMessages: 1,
    context: { messageType: 'non_attendance_acknowledgment' }
  });

  await saveOutboundMessage({
    contractor_id: smsData.contractor.id,
    event_id: smsData.eventContext?.id,
    message_type: 'non_attendance_acknowledgment',
    personalization_data: { attendance_context: attendanceContext },
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
    message_type: 'non_attendance_acknowledgment',
    response_sent: true,
    attended: false
  };
}

/**
 * Handle when contractor attended AND provided PCR
 */
async function handleAttendanceWithPCR(smsData, attendanceContext, pcrRating, sentimentScore) {
  const prompt = `I just confirmed I attended "${attendanceContext.name}" and rated it ${pcrRating}/5.

Please send me a thank you message that:
- Thanks me for attending and providing feedback
- ${pcrRating >= 4 ? 'Acknowledges this was valuable and encourages following up' : ''}
- ${pcrRating <= 2 ? 'Acknowledges my feedback and suggests other sessions I might enjoy' : ''}
- Keeps me engaged with the event

CRITICAL SMS CONSTRAINTS:
- Maximum 320 characters
- Be warm and appreciative
- ${pcrRating >= 4 ? 'Suggest a next step' : 'Stay positive'}
- NO fluff or filler words`;

  const aiResponse = await aiConciergeController.generateAIResponse(
    prompt,
    smsData.contractor,
    smsData.contractor.id
  );

  const smsResult = processMessageForSMS(aiResponse, {
    allowMultiSMS: false,
    maxMessages: 1,
    context: { messageType: 'attendance_pcr_thank_you', pcrRating }
  });

  await saveOutboundMessage({
    contractor_id: smsData.contractor.id,
    event_id: smsData.eventContext?.id,
    message_type: 'attendance_pcr_thank_you',
    personalization_data: {
      attendance_context: attendanceContext,
      pcr_rating: pcrRating,
      sentiment_score: sentimentScore
    },
    ghl_contact_id: smsData.ghl_contact_id,
    ghl_location_id: smsData.ghl_location_id,
    message_content: smsResult.messages.join(' ')
  });

  // Track PCR submission
  await trackPCRSubmission({
    contractor_id: smsData.contractor.id,
    event_id: smsData.eventContext?.id,
    pcr_rating: pcrRating,
    attendance_context: attendanceContext,
    sentiment_score: sentimentScore
  });

  return {
    success: true,
    action: 'send_message',
    messages: smsResult.messages,
    phone: smsData.phone,
    contractor_id: smsData.contractor.id,
    message_type: 'attendance_pcr_thank_you',
    response_sent: true,
    attended: true,
    pcr_rating: pcrRating
  };
}

/**
 * Handle when contractor attended but DIDN'T provide PCR
 */
async function handleAttendanceWithoutPCR(smsData, attendanceContext, sentimentScore) {
  const prompt = `I just confirmed I attended "${attendanceContext.name}" at the Power100 Summit.

Please ask me to rate my experience on a 1-5 scale:
- Thank me briefly for attending
- Ask for a PowerConfidence Rating (1-5)
- Explain what the rating means (1=not valuable, 5=extremely valuable)
- Keep it conversational and quick

CRITICAL SMS CONSTRAINTS:
- Maximum 320 characters
- Be warm and conversational
- Make the ask clear and easy
- NO fluff or filler words`;

  const aiResponse = await aiConciergeController.generateAIResponse(
    prompt,
    smsData.contractor,
    smsData.contractor.id
  );

  const smsResult = processMessageForSMS(aiResponse, {
    allowMultiSMS: false,
    maxMessages: 1,
    context: { messageType: 'pcr_request', attendanceContext }
  });

  // Save the PCR request as a pending message
  await saveOutboundMessage({
    contractor_id: smsData.contractor.id,
    event_id: smsData.eventContext?.id,
    message_type: 'pcr_request',
    personalization_data: {
      attendance_context: attendanceContext,
      sentiment_score: sentimentScore,
      requested_after_attendance: true
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
    message_type: 'pcr_request',
    response_sent: true,
    attended: true,
    pcr_requested: true
  };
}

/**
 * Handle unclear attendance response
 */
async function handleUnclearAttendance(smsData, attendanceContext) {
  const firstName = smsData.contractor.name.split(' ')[0];
  const message = `Hi ${firstName}! I want to make sure I understood correctly - did you attend "${attendanceContext.name}"? Please reply YES or NO so I can follow up appropriately.`;

  return {
    success: true,
    action: 'send_message',
    messages: [message],
    phone: smsData.phone,
    contractor_id: smsData.contractor.id,
    message_type: 'attendance_clarification',
    response_sent: true
  };
}

/**
 * Handle general attendance response when no specific check is found
 */
async function handleGeneralAttendanceResponse(smsData, analysis) {
  const prompt = `I just sent you a message about event attendance: "${smsData.messageText}"

But I don't have a specific attendance check pending. Please respond appropriately:
- If I'm asking about a session, help me find it
- If I'm giving feedback, acknowledge it
- Be helpful and engaging

CRITICAL SMS CONSTRAINTS:
- Maximum 320 characters
- Be conversational and helpful
- NO fluff or filler words`;

  const aiResponse = await aiConciergeController.generateAIResponse(
    prompt,
    smsData.contractor,
    smsData.contractor.id
  );

  const smsResult = processMessageForSMS(aiResponse, {
    allowMultiSMS: false,
    maxMessages: 1
  });

  return {
    success: true,
    action: 'send_message',
    messages: smsResult.messages,
    phone: smsData.phone,
    contractor_id: smsData.contractor.id,
    message_type: 'general_attendance_response',
    response_sent: true
  };
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

    console.log('[AttendanceHandler] Outbound message saved to database');
  } catch (error) {
    console.error('[AttendanceHandler] Error saving outbound message:', error);
  }
}

/**
 * Track PCR submission for AI learning
 */
async function trackPCRSubmission(submission) {
  try {
    await query(`
      INSERT INTO ai_learning_events (
        event_type,
        contractor_id,
        event_id,
        event_interaction_type,
        context,
        action_taken,
        outcome,
        success_score,
        learned_insight,
        related_entities,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `, [
      'event_attendance_pcr',
      submission.contractor_id,
      submission.event_id,
      'pcr_with_attendance',
      `Contractor attended and rated ${submission.attendance_context.name} as ${submission.pcr_rating}/5`,
      'pcr_captured_with_attendance',
      'rating_received',
      submission.pcr_rating / 5, // Normalize to 0-1 scale
      `PCR of ${submission.pcr_rating}/5 for ${submission.attendance_context.type}: ${submission.attendance_context.name}`,
      safeJsonStringify({
        pcr_rating: submission.pcr_rating,
        attendance_context: submission.attendance_context,
        sentiment_score: submission.sentiment_score
      })
    ]);

    console.log('[AttendanceHandler] Tracked PCR submission for AI learning');
  } catch (error) {
    console.error('[AttendanceHandler] Error tracking PCR submission:', error);
  }
}

module.exports = {
  handleAttendanceConfirmation
};
