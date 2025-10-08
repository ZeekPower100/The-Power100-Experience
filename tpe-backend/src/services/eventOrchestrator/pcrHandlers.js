// DATABASE-CHECKED: event_messages columns verified on 2025-10-06
const { query } = require('../../config/database');
const { safeJsonParse, safeJsonStringify } = require('../../utils/jsonHelpers');
const { processMessageForSMS } = require('../../utils/smsHelpers');
const aiConciergeController = require('../../controllers/aiConciergeController');

/**
 * Handle PCR (Personal Connection Rating) response
 * When contractor replies with 1-5 rating after meeting someone
 */
async function handlePCRResponse(smsData, classification) {
  try {
    console.log('[PCRHandler] Processing PCR rating response:', smsData.messageText);

    // Extract PCR rating from message (1-5)
    // Support both "4" and "I'd rate them a 4" formats
    let pcrRating;
    const messageText = smsData.messageText.trim().toLowerCase();

    // Try direct number first
    pcrRating = parseInt(messageText);

    // If that fails, try extracting from natural language
    if (isNaN(pcrRating)) {
      const numberMatch = messageText.match(/\b([1-5])\b/);
      if (numberMatch) {
        pcrRating = parseInt(numberMatch[1]);
      }
    }

    if (isNaN(pcrRating) || pcrRating < 1 || pcrRating > 5) {
      // If they're asking a general question about PCR (not giving a rating),
      // route to AI Concierge for a conversational response
      console.log('[PCRHandler] Not a PCR rating - routing to AI Concierge for general PCR question');

      const prompt = `I'm at the Power100 Summit 2025 event and I just received a message: "${smsData.messageText}"

I was expecting a Personal Connection Rating (1-5) but got this instead. Please help me understand what they're asking.

SMS RESPONSE GUIDELINES:
- Target 320 characters per message
- Be conversational and helpful
- If they're asking what PCR is, explain it briefly
- If they need help rating, guide them to respond with 1-5
- Be friendly and encouraging`;

      const aiResponse = await aiConciergeController.generateAIResponse(
        prompt,
        smsData.contractor,
        smsData.contractor.id
      );

      const smsResult = processMessageForSMS(aiResponse, {
        allowMultiSMS: true,
        maxMessages: 2,
        context: {
          messageType: 'pcr_clarification',
          contractorId: smsData.contractor.id
        }
      });

      return {
        success: true,
        action: 'send_message',
        messages: smsResult.messages,
        phone: smsData.phone,
        contractor_id: smsData.contractor.id,
        message_type: 'pcr_clarification',
        response_sent: true,
        multi_sms: smsResult.wasSplit,
        sms_count: smsResult.messages.length
      };
    }

    // Get the pending PCR request message to find who they're rating
    let pendingMessages = classification.context_data?.pending_messages || [];
    console.log('[PCRHandler] Pending messages from classification:', pendingMessages.length);

    if (pendingMessages.length === 0) {
      console.log('[PCRHandler] No pending messages from router, querying database directly');
      const messagesResult = await query(`
        SELECT
          id,
          message_type,
          personalization_data,
          actual_send_time
        FROM event_messages
        WHERE contractor_id = $1
          AND direction = 'outbound'
          AND actual_send_time > NOW() - INTERVAL '24 hours'
        ORDER BY actual_send_time DESC
        LIMIT 5
      `, [smsData.contractor.id]);

      pendingMessages = messagesResult.rows;
      console.log('[PCRHandler] Found', pendingMessages.length, 'messages from database');
    }

    console.log('[PCRHandler] Message types:', pendingMessages.map(m => m.message_type).join(', '));

    // Find ANY PCR request type (speaker, sponsor, peer match, or generic)
    const pcrRequest = pendingMessages.find(m =>
      m.message_type === 'pcr_request' ||
      m.message_type === 'speaker_pcr_request' ||
      m.message_type === 'sponsor_pcr_request' ||
      m.message_type === 'peer_match_pcr_request' ||
      m.message_type === 'overall_event_pcr_request'
    );

    if (!pcrRequest) {
      console.log('[PCRHandler] ERROR: No PCR request found');
      return {
        success: false,
        error: 'No PCR request found in context'
      };
    }

    const pcrType = pcrRequest.message_type;
    console.log('[PCRHandler] PCR Type:', pcrType);

    // Parse personalization_data to get connection details
    const personalizationData = safeJsonParse(pcrRequest.personalization_data);
    const connectionPerson = personalizationData?.connection_person || {};
    const connectionContext = personalizationData?.connection_context || {};

    // Update the original PCR request message with the rating
    // DATABASE-CHECKED: event_messages.pcr_score column verified
    await query(`
      UPDATE event_messages
      SET pcr_score = $1,
          response_received = $2,
          response_time = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
    `, [pcrRating, smsData.messageText, pcrRequest.id]);

    console.log('[PCRHandler] Updated PCR request message with rating:', pcrRating);

    // ALSO update the appropriate entity table based on PCR type
    await savePCRToEntityTable(pcrType, pcrRating, personalizationData, smsData);

    // Generate AI Concierge thank you response based on rating AND type
    const prompt = buildPCRThankYouPrompt(pcrRating, pcrType, connectionPerson, connectionContext, smsData.contractor);
    const aiResponse = await aiConciergeController.generateAIResponse(
      prompt,
      smsData.contractor,
      smsData.contractor.id
    );

    const smsResult = processMessageForSMS(aiResponse, {
      allowMultiSMS: false, // Thank you messages should be concise
      maxMessages: 1,
      context: {
        messageType: 'pcr_thank_you',
        pcrRating: pcrRating
      }
    });

    console.log(`[PCRHandler] Processed PCR thank you: ${smsResult.messages.length} message(s), split: ${smsResult.wasSplit}`);

    // Save outbound thank you message
    await saveOutboundMessage({
      contractor_id: smsData.contractor.id,
      event_id: smsData.eventContext?.id,
      message_type: 'pcr_thank_you',
      personalization_data: {
        pcr_rating: pcrRating,
        connection_person: connectionPerson,
        original_request_id: pcrRequest.id
      },
      ghl_contact_id: smsData.ghl_contact_id,
      ghl_location_id: smsData.ghl_location_id,
      message_content: smsResult.messages.join(' ')
    });

    // Track PCR submission for analytics
    await trackPCRSubmission({
      contractor_id: smsData.contractor.id,
      event_id: smsData.eventContext?.id,
      pcr_rating: pcrRating,
      connection_person: connectionPerson,
      connection_context: connectionContext,
      request_message_id: pcrRequest.id
    });

    return {
      success: true,
      action: 'send_message',
      messages: smsResult.messages,
      phone: smsData.phone,
      contractor_id: smsData.contractor.id,
      message_type: 'pcr_thank_you',
      response_sent: true,
      pcr_rating: pcrRating,
      multi_sms: smsResult.wasSplit,
      sms_count: smsResult.messages.length
    };

  } catch (error) {
    console.error('[PCRHandler] Error handling PCR response:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Build prompt for AI Concierge to generate PCR thank you response
 * Now type-aware for speakers, sponsors, peer matches, and overall event
 */
function buildPCRThankYouPrompt(pcrRating, pcrType, connectionPerson, connectionContext, contractor) {
  const ratingDescriptions = {
    5: 'excellent',
    4: 'great',
    3: 'good',
    2: 'okay',
    1: 'not a strong fit'
  };

  const description = ratingDescriptions[pcrRating] || 'connection';

  // Type-specific context
  let typeContext = '';
  let entityName = connectionPerson.name || 'someone';

  switch(pcrType) {
    case 'speaker_pcr_request':
      typeContext = `I just rated speaker ${entityName}'s session at the Power100 Summit 2025 as ${pcrRating}/5 (${description}).`;
      break;
    case 'sponsor_pcr_request':
      typeContext = `I just rated my interaction with sponsor ${connectionPerson.company || entityName} at the Power100 Summit 2025 as ${pcrRating}/5 (${description}).`;
      break;
    case 'peer_match_pcr_request':
      typeContext = `I just rated my peer connection with ${entityName} at the Power100 Summit 2025 as ${pcrRating}/5 (${description}).`;
      break;
    case 'overall_event_pcr_request':
      typeContext = `I just rated my overall Power100 Summit 2025 experience as ${pcrRating}/5 (${description}).`;
      break;
    default:
      typeContext = `I just rated my connection with ${entityName} at the Power100 Summit 2025 as ${pcrRating}/5 (${description}).`;
  }

  let prompt = `${typeContext}

CONTEXT:
${connectionPerson.company ? `Company: ${connectionPerson.company}` : ''}
${connectionPerson.session_title ? `Session: ${connectionPerson.session_title}` : ''}
${connectionContext.meeting_context ? `Context: ${connectionContext.meeting_context}` : ''}

Please send me a brief thank you message that:
- Thanks me for providing the rating
- ${pcrRating >= 4 ? 'Acknowledges this was valuable and encourages follow-up action' : ''}
- ${pcrRating <= 2 ? 'Acknowledges the feedback and encourages continued engagement' : ''}
- ${pcrType === 'speaker_pcr_request' && pcrRating >= 4 ? 'Suggests implementing insights from the session' : ''}
- ${pcrType === 'sponsor_pcr_request' && pcrRating >= 4 ? 'Encourages booking a demo or follow-up call' : ''}
- ${pcrType === 'peer_match_pcr_request' && pcrRating >= 4 ? 'Suggests exchanging contact info for future collaboration' : ''}

CRITICAL SMS CONSTRAINTS:
- Maximum 320 characters (SMS limit enforced by GHL)
- Be warm and conversational
- NO fluff or filler words
- Sign off naturally`;

  return prompt;
}

/**
 * Save outbound message to database
 * CRITICAL: Saves actual message content for AI routing context
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

    console.log('[PCRHandler] Outbound message saved to database');
  } catch (error) {
    console.error('[PCRHandler] Error saving outbound message:', error);
  }
}

/**
 * Track PCR submission for AI learning and analytics
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
      'event_pcr_submission',
      submission.contractor_id,
      submission.event_id,
      'pcr_rating_submitted',
      `Contractor rated connection as ${submission.pcr_rating}/5`,
      'pcr_rating_recorded',
      'rating_received',
      submission.pcr_rating / 5, // Normalize to 0-1 scale for success_score
      `PCR rating of ${submission.pcr_rating}/5 for connection with ${submission.connection_person?.name || 'unknown'}`,
      safeJsonStringify({
        pcr_rating: submission.pcr_rating,
        connection_person: submission.connection_person,
        connection_context: submission.connection_context,
        request_message_id: submission.request_message_id
      })
    ]);

    console.log('[PCRHandler] Tracked PCR submission for AI learning');
  } catch (error) {
    console.error('[PCRHandler] Error tracking PCR submission:', error);
  }
}

/**
 * Save PCR rating to the appropriate entity table based on type
 * DATABASE-CHECKED: event_speakers.pcr_score, event_sponsors.pcr_score, event_peer_matches.pcr_score verified
 */
async function savePCRToEntityTable(pcrType, pcrRating, personalizationData, smsData) {
  try {
    switch(pcrType) {
      case 'speaker_pcr_request':
        // Update speaker's PCR score and increment total ratings
        const speakerId = personalizationData.speaker_id;
        if (speakerId) {
          await query(`
            UPDATE event_speakers
            SET pcr_score = COALESCE(
              (pcr_score * total_ratings + $1) / (total_ratings + 1),
              $1
            ),
            total_ratings = COALESCE(total_ratings, 0) + 1,
            updated_at = CURRENT_TIMESTAMP
            WHERE id = $2
          `, [pcrRating, speakerId]);
          console.log(`[PCRHandler] Updated speaker ${speakerId} PCR score`);
        }
        break;

      case 'sponsor_pcr_request':
        // Update sponsor's PCR score
        const sponsorId = personalizationData.sponsor_id;
        if (sponsorId) {
          await query(`
            UPDATE event_sponsors
            SET pcr_score = $1,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $2
          `, [pcrRating, sponsorId]);
          console.log(`[PCRHandler] Updated sponsor ${sponsorId} PCR score`);
        }
        break;

      case 'peer_match_pcr_request':
        // Update peer match PCR score
        const peerMatchId = personalizationData.peer_match_id;
        if (peerMatchId) {
          await query(`
            UPDATE event_peer_matches
            SET pcr_score = $1,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $2
          `, [pcrRating, peerMatchId]);
          console.log(`[PCRHandler] Updated peer match ${peerMatchId} PCR score`);
        }
        break;

      case 'overall_event_pcr_request':
        // Create entry in event_pcr_ratings table (or update events table if we add that column)
        console.log('[PCRHandler] Overall event PCR - storing in event_messages only (no dedicated column yet)');
        break;

      default:
        // Generic PCR - already saved to event_messages
        console.log('[PCRHandler] Generic PCR type - stored in event_messages only');
    }
  } catch (error) {
    console.error('[PCRHandler] Error saving PCR to entity table:', error);
    // Don't throw - already saved to event_messages which is primary source
  }
}

module.exports = {
  handlePCRResponse
};
