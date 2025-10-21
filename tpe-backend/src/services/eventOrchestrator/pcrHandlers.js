// DATABASE-CHECKED: event_messages, event_pcr_scores, event_notes columns verified on 2025-10-18
const { query } = require('../../config/database');
const { safeJsonParse, safeJsonStringify } = require('../../utils/jsonHelpers');
const { processMessageForSMS } = require('../../utils/smsHelpers');
const aiConciergeController = require('../../controllers/aiConciergeController');
const aiKnowledgeService = require('../aiKnowledgeService');
const eventNoteService = require('../eventNoteService');

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
      // Not a valid rating - this should have been handled by AI Concierge with intent detection
      // If we're here, something went wrong - return error
      console.log('[PCRHandler] ERROR: Invalid PCR rating received, should have been caught by AI Concierge');
      return {
        success: false,
        error: 'Invalid PCR rating - expected 1-5'
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

    // Find ANY PCR request type (speaker, sponsor, peer match, clarification, or generic)
    const pcrRequest = pendingMessages.find(m =>
      m.message_type === 'pcr_request' ||
      m.message_type === 'speaker_pcr_request' ||
      m.message_type === 'sponsor_pcr_request' ||
      m.message_type === 'peer_match_pcr_request' ||
      m.message_type === 'overall_event_pcr_request' ||
      m.message_type === 'pcr_clarification'  // Also accept clarification messages
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
    // Intent detector already formatted this correctly
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

    // CRITICAL: Save to event_pcr_scores FIRST (so AVG calculation works)
    await savePCRToTrackingTable(pcrType, pcrRating, personalizationData, smsData);

    // THEN update entity table with the average from event_pcr_scores
    await savePCRToEntityTable(pcrType, pcrRating, personalizationData, smsData);

    // Save contextual notes to event_notes if message has insights
    await savePCRNotes(pcrRating, pcrType, personalizationData, smsData);

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

PERSONALITY & TONE:
- Sound like their moderately laid back cool cousin on mom's side
- Witty one-liners are great IF they stay relevant to the topic
- Encouraging and motivating
- Straight to the point while being clever and concise
- CRITICAL: Value first - never sacrifice delivering value for wit
- If adding cleverness reduces value, skip the wit and deliver value

SMS CONSTRAINTS:
- Maximum 320 characters (SMS limit enforced by GHL)
- NO signatures, sign-offs, or team names
- End naturally without formal closing`;

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
        // Update speaker's PCR score with AVERAGE from event_pcr_scores (0-1 scale)
        const speakerId = personalizationData.speaker_id;
        if (speakerId) {
          await query(`
            UPDATE event_speakers
            SET pcr_score = (
              SELECT AVG(final_pcr_score)
              FROM event_pcr_scores
              WHERE pcr_type = 'speaker'
                AND entity_id = $1
            ),
            updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
          `, [speakerId]);
          console.log(`[PCRHandler] Updated speaker ${speakerId} PCR score from event_pcr_scores average`);
        }
        break;

      case 'sponsor_pcr_request':
        // Update sponsor's PCR score with AVERAGE from event_pcr_scores (0-1 scale)
        const sponsorId = personalizationData.sponsor_id;
        if (sponsorId) {
          await query(`
            UPDATE event_sponsors
            SET pcr_score = (
              SELECT AVG(final_pcr_score)
              FROM event_pcr_scores
              WHERE pcr_type = 'sponsor'
                AND entity_id = $1
            ),
            updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
          `, [sponsorId]);
          console.log(`[PCRHandler] Updated sponsor ${sponsorId} PCR score from event_pcr_scores average`);
        }
        break;

      case 'peer_match_pcr_request':
        // Update peer match PCR score with AVERAGE from event_pcr_scores (0-1 scale)
        const peerMatchId = personalizationData.peer_match_id;
        if (peerMatchId) {
          await query(`
            UPDATE event_peer_matches
            SET pcr_score = (
              SELECT AVG(final_pcr_score)
              FROM event_pcr_scores
              WHERE pcr_type = 'peer_match'
                AND entity_id = $1
            ),
            updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
          `, [peerMatchId]);
          console.log(`[PCRHandler] Updated peer match ${peerMatchId} PCR score from event_pcr_scores average`);
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

/**
 * Save PCR to event_pcr_scores tracking table
 * DATABASE-CHECKED: event_pcr_scores columns verified on 2025-10-18
 */
async function savePCRToTrackingTable(pcrType, pcrRating, personalizationData, smsData) {
  try {
    // Map message type to pcr_type string
    const pcrTypeMap = {
      'speaker_pcr_request': 'speaker',
      'sponsor_pcr_request': 'sponsor',
      'peer_match_pcr_request': 'peer_match',
      'overall_event_pcr_request': 'event',
      'pcr_request': 'unknown'
    };

    const dbPcrType = pcrTypeMap[pcrType] || 'unknown';

    // Get entity details based on type
    let entityId = null;
    let entityName = 'Unknown';

    if (dbPcrType === 'speaker') {
      entityId = personalizationData.speaker_id;
      entityName = personalizationData.connection_person?.name || 'Speaker';
    } else if (dbPcrType === 'sponsor') {
      entityId = personalizationData.sponsor_id;
      entityName = personalizationData.connection_person?.company || 'Sponsor';
    } else if (dbPcrType === 'peer_match') {
      entityId = personalizationData.peer_match_id;
      entityName = personalizationData.connection_person?.name || 'Peer';
    } else if (dbPcrType === 'event') {
      entityId = smsData.eventContext?.id;
      entityName = smsData.eventContext?.name || 'Event';
    }

    if (!entityId) {
      console.warn('[PCRHandler] No entity ID found for PCR tracking, skipping event_pcr_scores save');
      return;
    }

    // Calculate sentiment from rating (1-2=negative, 3=neutral, 4-5=positive)
    const sentimentScore = pcrRating <= 2 ? 0.0 : pcrRating === 3 ? 0.5 : 1.0;
    const sentiment = pcrRating <= 2 ? 'negative' : pcrRating === 3 ? 'neutral' : 'positive';

    // Calculate final PCR score (rating already 1-5, normalize to 0-1)
    const normalizedRating = pcrRating / 5;
    const finalPcrScore = (normalizedRating * 0.7) + (sentimentScore * 0.3);

    // UPSERT to event_pcr_scores
    await query(`
      INSERT INTO event_pcr_scores (
        event_id, contractor_id, pcr_type, entity_id, entity_name,
        explicit_score, sentiment_score, final_pcr_score,
        response_received, sentiment_analysis, confidence_level,
        responded_at, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT (event_id, contractor_id, pcr_type, entity_id)
      DO UPDATE SET
        explicit_score = EXCLUDED.explicit_score,
        sentiment_score = EXCLUDED.sentiment_score,
        final_pcr_score = EXCLUDED.final_pcr_score,
        response_received = EXCLUDED.response_received,
        sentiment_analysis = EXCLUDED.sentiment_analysis,
        confidence_level = EXCLUDED.confidence_level,
        responded_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
    `, [
      smsData.eventContext?.id,
      smsData.contractor.id,
      dbPcrType,
      entityId,
      entityName,
      pcrRating, // Already 1-5 scale
      sentimentScore,
      finalPcrScore,
      smsData.messageText,
      JSON.stringify({
        sentiment: sentiment,
        rating: pcrRating,
        pcr_type: dbPcrType
      }),
      1.0 // High confidence for explicit numeric ratings
    ]);

    console.log(`[PCRHandler] ✅ Saved PCR ${pcrRating}/5 (final: ${finalPcrScore.toFixed(2)}) to event_pcr_scores for ${dbPcrType}`);
  } catch (error) {
    console.error('[PCRHandler] Error saving PCR to tracking table:', error);
    // Don't throw - already saved to event_messages
  }
}

/**
 * Save PCR contextual notes to event_notes
 * DATABASE-CHECKED: event_notes columns verified on 2025-10-18
 */
async function savePCRNotes(pcrRating, pcrType, personalizationData, smsData) {
  try {
    // Only save notes if message has more than just a number
    const messageText = smsData.messageText.trim();
    const isJustNumber = /^\d+$/.test(messageText);

    if (isJustNumber) {
      console.log('[PCRHandler] Message is just a number, skipping note save');
      return;
    }

    // Determine note type based on PCR type
    const noteTypeMap = {
      'speaker_pcr_request': 'speaker_note',
      'sponsor_pcr_request': 'sponsor_note',
      'peer_match_pcr_request': 'peer_connection',
      'overall_event_pcr_request': 'insight',
      'pcr_request': 'general'
    };

    const noteType = noteTypeMap[pcrType] || 'general';

    // Extract relevant IDs
    const speakerId = pcrType === 'speaker_pcr_request' ? personalizationData.speaker_id : null;
    const sponsorId = pcrType === 'sponsor_pcr_request' ? personalizationData.sponsor_id : null;

    // Determine if high rating indicates potential follow-up
    const requiresFollowup = pcrRating >= 4;

    await eventNoteService.captureEventNote({
      event_id: smsData.eventContext?.id,
      contractor_id: smsData.contractor.id,
      note_text: messageText,
      note_type: noteType,
      speaker_id: speakerId,
      sponsor_id: sponsorId,
      session_context: personalizationData.connection_person?.session_title || null,
      ai_categorization: pcrRating >= 4 ? 'positive' : pcrRating === 3 ? 'neutral' : 'negative',
      ai_tags: [
        `pcr_${pcrRating}`,
        pcrType.replace('_pcr_request', ''),
        pcrRating >= 4 ? 'high_rating' : pcrRating <= 2 ? 'low_rating' : 'medium_rating'
      ],
      ai_priority_score: pcrRating >= 4 ? 0.8 : pcrRating <= 2 ? 0.7 : 0.5,
      requires_followup: requiresFollowup,
      extracted_entities: {
        pcr_rating: pcrRating,
        entity_name: personalizationData.connection_person?.name || personalizationData.connection_person?.company,
        pcr_type: pcrType
      },
      conversation_context: {
        message_text: messageText,
        pcr_rating: pcrRating,
        entity_context: personalizationData
      }
    });

    console.log(`[PCRHandler] ✅ Saved PCR contextual note to event_notes`);
  } catch (error) {
    console.error('[PCRHandler] Error saving PCR notes:', error);
    // Don't throw - note save is optional
  }
}

module.exports = {
  handlePCRResponse
};
