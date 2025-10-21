// Message Handler Registry for Event Orchestration
// Registers all SMS route handlers with the AI Router

const aiRouter = require('../aiRouter');
const aiConciergeController = require('../../controllers/aiConciergeController');
const aiKnowledgeService = require('../aiKnowledgeService');
const { query } = require('../../config/database');
const { safeJsonParse } = require('../../utils/jsonHelpers');
const { processMessageForSMS } = require('../../utils/smsHelpers');
const { detectTimezone } = require('../../utils/timezoneDetector');

/**
 * Register all event orchestration handlers
 */
function registerAllHandlers() {
  console.log('[HandlerRegistry] Registering all message handlers...');

  // Import handlers
  const speakerHandlers = require('./speakerHandlers');
  const sponsorHandlers = require('./sponsorHandlers');
  const pcrHandlers = require('./pcrHandlers');
  const attendanceHandlers = require('./attendanceHandlers');
  const peerMatchingHandlers = require('./peerMatchingHandlers');
  const checkInHandlers = require('./checkInHandlers');
  const adminCommandHandlers = require('./adminCommandHandlers');

  // Register speaker handlers
  aiRouter.registerHandler('speaker_details', speakerHandlers.handleSpeakerDetails);
  aiRouter.registerHandler('speaker_feedback', speakerHandlers.handleSpeakerFeedback);

  // Register sponsor handlers
  aiRouter.registerHandler('sponsor_details', sponsorHandlers.handleSponsorDetails);
  aiRouter.registerHandler('sponsor_batch_response', sponsorHandlers.handleSponsorBatchResponse);

  // Register PCR handlers
  aiRouter.registerHandler('pcr_response', pcrHandlers.handlePCRResponse);

  // Register attendance confirmation handler
  aiRouter.registerHandler('attendance_confirmation', attendanceHandlers.handleAttendanceConfirmation);

  // Register peer matching handlers
  aiRouter.registerHandler('peer_match_response', peerMatchingHandlers.handlePeerMatchResponse);

  // Register check-in handlers
  aiRouter.registerHandler('event_checkin', checkInHandlers.handleEventCheckIn);

  // Register admin command handler
  aiRouter.registerHandler('admin_command', adminCommandHandlers.handleAdminCommand);

  // Register general question handler (AI Concierge)
  aiRouter.registerHandler('general_question', handleGeneralQuestion);

  // Register fallback handlers
  aiRouter.registerHandler('clarification_needed', handleClarificationRequest);
  aiRouter.registerHandler('error_handler', handleError);

  console.log('[HandlerRegistry] All handlers registered successfully');
}

/**
 * General question handler
 * Routes general questions to AI Concierge for intelligent, context-aware responses
 * DATABASE-CHECKED: contractors columns verified on 2025-10-06
 */
async function handleGeneralQuestion(smsData, classification) {
  console.log('[Handler] General question:', smsData.messageText);

  try {
    // Get full contractor context from database
    // CRITICAL: Wrap array fields with to_json() to convert PostgreSQL arrays to JSON
    const contractorResult = await query(
      `SELECT id, name, company_name,
              to_json(focus_areas) as focus_areas,
              revenue_tier, team_size,
              to_json(business_goals) as business_goals,
              email, phone, timezone
       FROM contractors WHERE id = $1`,
      [smsData.contractor.id]
    );

    if (contractorResult.rows.length === 0) {
      throw new Error('Contractor not found');
    }

    const contractor = contractorResult.rows[0];

    // Auto-detect and save timezone if not set
    if (!contractor.timezone && contractor.phone) {
      const detectedTimezone = detectTimezone(contractor.phone);
      console.log(`[Handler] Auto-detected timezone ${detectedTimezone} for contractor ${contractor.id} from phone ${contractor.phone}`);

      // Save timezone to database
      await query(
        'UPDATE contractors SET timezone = $1 WHERE id = $2',
        [detectedTimezone, contractor.id]
      );

      // Update local contractor object
      contractor.timezone = detectedTimezone;
    }

    // Prepare contractor data for AI Concierge
    const contractorData = {
      id: contractor.id,  // CRITICAL: Required for AI function calls (action items, follow-ups, etc.)
      name: contractor.name,
      company_name: contractor.company_name,
      focus_areas: safeJsonParse(contractor.focus_areas, []),
      revenue_tier: contractor.revenue_tier,
      team_size: contractor.team_size,
      business_goals: safeJsonParse(contractor.business_goals, [])
    };

    console.log('[Handler] Calling AI Concierge for contractor:', contractor.name);
    console.log('[Handler] smsData keys:', Object.keys(smsData));
    console.log('[Handler] smsData.eventContext:', smsData.eventContext);

    // Get event context if contractor is at an event
    let eventContext = null;
    if (smsData.eventContext?.id) {
      console.log('[Handler] Loading event context for event:', smsData.eventContext.id);
      eventContext = await aiKnowledgeService.getCurrentEventContext(
        smsData.eventContext.id,
        smsData.contractor.id
      );
    } else {
      console.log('[Handler] ⚠️ No eventContext in smsData - AI will not have event details!');
    }

    // Generate AI response using AI Concierge with full event context
    const aiResponse = await aiConciergeController.generateAIResponse(
      smsData.messageText,
      contractorData,
      smsData.contractor.id,
      eventContext,  // Pass event context so AI knows actual speakers/sponsors/schedule
      contractor.timezone || 'America/New_York'  // Pass contractor's timezone for date calculations
    );

    // Extract response content (handles both string and object responses)
    const responseContent = typeof aiResponse === 'object' && aiResponse.content
      ? aiResponse.content
      : aiResponse;

    console.log('[Handler] AI Concierge response generated:', responseContent.substring(0, 100) + '...');

    // CRITICAL: Strip markdown formatting for SMS (asterisks don't work in plain text)
    const smsCleanedContent = responseContent
      .replace(/\*\*([^*]+)\*\*/g, '$1')  // Remove **bold**
      .replace(/\*([^*]+)\*/g, '$1');      // Remove *italic*

    // Process for SMS with multi-message support (CRITICAL: enforces GHL limits)
    const smsResult = processMessageForSMS(smsCleanedContent, {
      allowMultiSMS: true,
      maxMessages: 3,
      context: {
        messageType: 'ai_concierge_response',
        contractorId: smsData.contractor.id
      }
    });

    console.log(`[Handler] Processed AI response: ${smsResult.messages.length} message(s), split: ${smsResult.wasSplit}, truncated: ${smsResult.wasTruncated}`);

    // CRITICAL: Detect if AI is requesting structured data (PCR, attendance, etc.)
    // This allows AI to drive workflows without needing perfect routing
    const detectedIntent = await detectAIIntent(responseContent, smsData, eventContext);

    console.log('[Handler] Detected intent from AI response:', detectedIntent);

    return {
      success: true,
      action: 'send_message',
      messages: smsResult.messages,  // Array of messages (not single message)
      phone: smsData.phone,
      contractor_id: smsData.contractor.id,
      message_type: detectedIntent.message_type || 'ai_concierge_response',
      response_sent: true,
      multi_sms: smsResult.wasSplit,
      sms_count: smsResult.messages.length,
      personalization_data: detectedIntent.personalization_data || {
        ai_model: 'gpt-4',
        original_question: smsData.messageText,
        confidence: classification.confidence
      }
    };

  } catch (error) {
    console.error('[Handler] Error in AI Concierge integration:', error);

    // Fallback to clarification request if AI fails
    const message = `Hi ${smsData.contractor.name.split(' ')[0]}! I'm having trouble processing your question right now. Could you try asking about:
- Speaker details
- Event schedule
- Sponsor information
Or contact support if this persists.`;

    return {
      success: false,
      action: 'send_message',
      message,
      phone: smsData.phone,
      contractor_id: smsData.contractor.id,
      message_type: 'error_fallback',
      response_sent: true,
      error: error.message
    };
  }
}

/**
 * Detect structured intent from AI response
 * Enables AI to drive workflows (PCR requests, attendance checks, etc.) without perfect routing
 */
async function detectAIIntent(aiResponse, smsData, eventContext) {
  try {
    const responseLower = aiResponse.toLowerCase();

    // Detect PCR request pattern
    if (/rate|rating|1-5|score/.test(responseLower) && eventContext) {
      console.log('[IntentDetector] PCR pattern detected in AI response');

      // Extract entity names from response
      const sponsors = eventContext.sponsors || [];
      const speakers = eventContext.fullSchedule || [];

      // Check for sponsor mentions
      for (const sponsor of sponsors) {
        if (responseLower.includes(sponsor.sponsor_name.toLowerCase())) {
          console.log('[IntentDetector] ✅ Sponsor PCR request:', sponsor.sponsor_name);
          return {
            message_type: 'sponsor_pcr_request',
            personalization_data: {
              sponsor_id: sponsor.id,
              sponsor_name: sponsor.sponsor_name,
              connection_person: { company: sponsor.sponsor_name }
            }
          };
        }
      }

      // Check for speaker mentions
      for (const speaker of speakers) {
        if (responseLower.includes(speaker.name.toLowerCase())) {
          console.log('[IntentDetector] ✅ Speaker PCR request:', speaker.name);
          return {
            message_type: 'speaker_pcr_request',
            personalization_data: {
              speaker_id: speaker.id,
              speaker_name: speaker.name,
              connection_person: { name: speaker.name },
              session_title: speaker.session_title
            }
          };
        }
      }

      // Generic PCR if no entity matched
      console.log('[IntentDetector] Generic PCR request detected');
      return {
        message_type: 'pcr_clarification',
        personalization_data: null
      };
    }

    // Detect attendance confirmation pattern
    if (/did you attend|were you there|make it to/i.test(responseLower) && eventContext) {
      console.log('[IntentDetector] Attendance check detected');
      return {
        message_type: 'attendance_check',
        personalization_data: null
      };
    }

    // Detect sponsor batch check
    if (/which sponsor|what booths|visit.*sponsor/i.test(responseLower) && eventContext) {
      console.log('[IntentDetector] Sponsor batch check detected');
      return {
        message_type: 'sponsor_batch_check',
        personalization_data: null
      };
    }

    // Detect peer matching introduction/response
    if (/would you like to connect|introduce you to|fellow contractor|peer match/i.test(responseLower) && eventContext) {
      console.log('[IntentDetector] Peer matching introduction detected');
      return {
        message_type: 'peer_matching_introduction',
        personalization_data: null
      };
    }

    // No structured intent detected - regular conversation
    return {
      message_type: 'ai_concierge_response',
      personalization_data: null
    };

  } catch (error) {
    console.error('[IntentDetector] Error detecting intent:', error);
    return {
      message_type: 'ai_concierge_response',
      personalization_data: null
    };
  }
}

/**
 * Clarification request handler
 * Sends a message asking the user to clarify their intent
 */
async function handleClarificationRequest(smsData, classification) {
  console.log('[Handler] Clarification needed for message:', smsData.messageText);

  const message = `Hi ${smsData.contractor.name.split(' ')[0]}! I didn't quite understand your message. Could you clarify what you're looking for? You can ask about speakers, sponsors, or event details.`;

  // Send clarification message via outbound endpoint
  return {
    success: true,
    action: 'send_message',
    message,
    phone: smsData.phone,
    contractor_id: smsData.contractor.id,
    message_type: 'clarification_request',
    response_sent: true
  };
}

/**
 * Error handler
 * Sends a generic error message
 */
async function handleError(smsData, classification) {
  console.error('[Handler] Error in routing:', classification.ai_reasoning);

  const message = `Hi ${smsData.contractor.name.split(' ')[0]}! Sorry, we're experiencing a technical issue. Please try again in a moment or contact support if this persists.`;

  return {
    success: false,
    action: 'send_message',
    message,
    phone: smsData.phone,
    contractor_id: smsData.contractor.id,
    message_type: 'error_response',
    response_sent: true,
    error: classification.ai_reasoning
  };
}

module.exports = {
  registerAllHandlers
};
