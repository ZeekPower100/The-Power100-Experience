// DATABASE-CHECKED: event_speakers, event_messages columns verified on 2025-10-04
const { query } = require('../../config/database');
const { safeJsonParse, safeJsonStringify } = require('../../utils/jsonHelpers');
const { processMessageForSMS } = require('../../utils/smsHelpers');
const aiConciergeController = require('../../controllers/aiConciergeController');
const aiKnowledgeService = require('../aiKnowledgeService');

/**
 * Handle speaker session details request
 * When contractor replies 1-3 to speaker recommendation
 */
async function handleSpeakerDetails(smsData, classification) {
  try {
    console.log('[SpeakerHandler] Processing speaker details request:', smsData.messageText);

    // Extract speaker number from message (1-3)
    // Support both "2" and "What about speaker 2?" formats
    let speakerNum;
    const messageText = smsData.messageText.trim().toLowerCase();

    // Try direct number first
    speakerNum = parseInt(messageText);

    // If that fails, try extracting from natural language
    if (isNaN(speakerNum)) {
      const numberMatch = messageText.match(/\b([1-3])\b/);
      if (numberMatch) {
        speakerNum = parseInt(numberMatch[1]);
      }
    }

    if (isNaN(speakerNum) || speakerNum < 1 || speakerNum > 3) {
      // If they're asking a general question about speakers (not selecting a number),
      // route to AI Concierge for a conversational response
      console.log('[SpeakerHandler] Not a speaker number - routing to AI Concierge for general speaker question');

      const prompt = `I'm at the Power100 Summit 2025 event and I just asked: "${smsData.messageText}"

Please help me understand what speakers are available and recommended for me based on my business goals and interests.

SMS RESPONSE GUIDELINES:
- Target 320 characters per message, but you CAN use 2-3 messages if needed
- If the information is valuable enough, split into multiple messages naturally
- Each message should be a complete thought
- Focus on most relevant speakers for my business goals
- Include session times/locations when helpful
- Be conversational and engaging
- End with clear call-to-action`;

      // Get event context to pass to AI Concierge
      let eventContext = null;
      if (smsData.eventContext?.id) {
        eventContext = await aiKnowledgeService.getCurrentEventContext(
          smsData.eventContext.id,
          smsData.contractor.id
        );
      }

      const aiResponse = await aiConciergeController.generateAIResponse(
        prompt,
        smsData.contractor,
        smsData.contractor.id,
        eventContext  // Pass event context so AI knows actual speakers/sponsors
      );

      // Process for SMS with intelligent multi-message support
      const smsResult = processMessageForSMS(aiResponse, {
        allowMultiSMS: true,
        maxMessages: 3,
        context: {
          messageType: 'speaker_general_inquiry',
          contractorId: smsData.contractor.id
        }
      });

      console.log(`[SpeakerHandler] Processed speaker inquiry: ${smsResult.messages.length} message(s), split: ${smsResult.wasSplit}, truncated: ${smsResult.wasTruncated}`);

      return {
        success: true,
        action: 'send_message',
        messages: smsResult.messages, // Array of messages
        phone: smsData.phone,
        contractor_id: smsData.contractor.id,
        message_type: 'speaker_general_inquiry',
        response_sent: true,
        multi_sms: smsResult.wasSplit,
        sms_count: smsResult.messages.length
      };
    }

    // Get the pending speaker recommendation message to find which speakers were recommended
    // WORKAROUND: Query database directly if classification doesn't provide pending_messages
    let pendingMessages = classification.context_data?.pending_messages || [];
    console.log('[SpeakerHandler] Pending messages from classification:', pendingMessages.length);

    if (pendingMessages.length === 0) {
      console.log('[SpeakerHandler] No pending messages from router, querying database directly');
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
      console.log('[SpeakerHandler] Found', pendingMessages.length, 'messages from database');
    }

    console.log('[SpeakerHandler] Message types:', pendingMessages.map(m => m.message_type).join(', '));

    const speakerRecommendation = pendingMessages.find(m => m.message_type === 'speaker_recommendation');

    if (!speakerRecommendation) {
      console.log('[SpeakerHandler] ERROR: No speaker_recommendation found');
      return {
        success: false,
        error: 'No speaker recommendation found in context'
      };
    }

    // Parse personalization_data to get recommended speakers
    const personalizationData = safeJsonParse(speakerRecommendation.personalization_data);
    const recommendedSpeakers = personalizationData?.recommended_speakers || [];

    if (recommendedSpeakers.length === 0) {
      return {
        success: false,
        error: 'No speakers found in recommendation'
      };
    }

    // Get the selected speaker (1-based index)
    const selectedSpeaker = recommendedSpeakers[speakerNum - 1];

    if (!selectedSpeaker) {
      return {
        success: false,
        error: `Speaker ${speakerNum} not found in recommendations`
      };
    }

    // Try to fetch full speaker details from database
    const speakerResult = await query(`
      SELECT
        id,
        name,
        session_title,
        session_description,
        session_time,
        session_location,
        bio,
        company,
        title
      FROM event_speakers
      WHERE id = $1
    `, [selectedSpeaker.speaker_id]);

    // Merge database data with recommendation data (prioritize database if available)
    const speaker = speakerResult.rows.length > 0
      ? speakerResult.rows[0]
      : {
          id: selectedSpeaker.speaker_id,
          name: selectedSpeaker.name,
          session_title: selectedSpeaker.session_title,
          session_description: selectedSpeaker.session_description || null,
          session_time: selectedSpeaker.session_time || null,
          session_location: selectedSpeaker.session_location || null,
          bio: null,
          company: null,
          title: null
        };

    // Build comprehensive context for AI Concierge
    const localEventContext = {
      event_id: smsData.eventContext?.id,
      speaker_requested: {
        number: speakerNum,
        speaker_id: speaker.id,
        name: speaker.name,
        session_title: speaker.session_title,
        session_time: speaker.session_time,
        session_location: speaker.session_location,
        session_description: speaker.session_description
      },
      all_recommended_speakers: recommendedSpeakers,
      previous_speaker_requests: await getRecentConversationHistory(smsData.contractor.id, classification.context_data?.pending_messages)
    };

    // Get FULL event context to pass to AI Concierge
    let fullEventContext = null;
    if (smsData.eventContext?.id) {
      fullEventContext = await aiKnowledgeService.getCurrentEventContext(
        smsData.eventContext.id,
        smsData.contractor.id
      );
    }

    // Generate AI Concierge response with full contractor context and event knowledge
    const prompt = buildSpeakerDetailsPrompt(speaker, speakerNum, recommendedSpeakers, localEventContext);
    const aiResponse = await aiConciergeController.generateAIResponse(
      prompt,
      smsData.contractor,
      smsData.contractor.id,
      fullEventContext  // Pass full event context so AI knows actual speakers/sponsors
    );

    // Process for SMS with intelligent multi-message support
    const smsResult = processMessageForSMS(aiResponse, {
      allowMultiSMS: true,
      maxMessages: 2, // Speaker details should be more concise
      context: {
        messageType: 'speaker_details',
        speakerId: speaker.id
      }
    });

    console.log(`[SpeakerHandler] Processed speaker details: ${smsResult.messages.length} message(s), split: ${smsResult.wasSplit}, truncated: ${smsResult.wasTruncated}`);

    // Save outbound message with full personalization_data and ACTUAL message content
    await saveOutboundMessage({
      contractor_id: smsData.contractor.id,
      event_id: smsData.eventContext?.id,
      message_type: 'speaker_details_response',
      personalization_data: {
        speaker_id: speaker.id,
        speaker_name: speaker.name,
        session_title: speaker.session_title,
        requested_speaker_number: speakerNum,
        session_time: speaker.session_time,
        session_location: speaker.session_location
      },
      ghl_contact_id: smsData.ghl_contact_id,
      ghl_location_id: smsData.ghl_location_id,
      message_content: smsResult.messages.join(' ') // Save actual AI-generated message(s)
    });

    // Track learning event for AI Concierge
    await trackSpeakerInteraction({
      contractor_id: smsData.contractor.id,
      event_id: smsData.eventContext?.id,
      speaker_id: speaker.id,
      speaker_name: speaker.name,
      session_title: speaker.session_title,
      action: 'requested_speaker_details',
      speaker_number: speakerNum,
      is_follow_up: eventContext.previous_speaker_requests.hasAskedAboutSpeakers,
      previous_speakers: eventContext.previous_speaker_requests.askedSpeakers || []
    });

    return {
      success: true,
      action: 'send_message',
      messages: smsResult.messages, // Array of messages
      phone: smsData.phone,
      contractor_id: smsData.contractor.id,
      message_type: 'speaker_details_response',
      response_sent: true,
      speaker_id: speaker.id,
      multi_sms: smsResult.wasSplit,
      sms_count: smsResult.messages.length
    };

  } catch (error) {
    console.error('[SpeakerHandler] Error handling speaker details:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Handle speaker feedback/rating
 * When contractor replies 1-10 to speaker recommendation
 */
async function handleSpeakerFeedback(smsData, classification) {
  try {
    console.log('[SpeakerHandler] Processing speaker feedback:', smsData.messageText);

    // Extract rating from message (1-10)
    const rating = parseInt(smsData.messageText.trim());

    if (isNaN(rating) || rating < 1 || rating > 10) {
      return {
        success: false,
        error: 'Invalid rating (must be 1-10)'
      };
    }

    // Get the pending speaker recommendation to find which speaker
    const pendingMessages = classification.context_data?.pending_messages || [];
    const speakerRecommendation = pendingMessages.find(m => m.message_type === 'speaker_recommendation');

    if (!speakerRecommendation) {
      return {
        success: false,
        error: 'No speaker recommendation found in context'
      };
    }

    const personalizationData = safeJsonParse(speakerRecommendation.personalization_data);
    const speakerId = personalizationData?.speaker_id || personalizationData?.recommended_speakers?.[0]?.speaker_id;

    if (!speakerId) {
      return {
        success: false,
        error: 'Could not determine which speaker to rate'
      };
    }

    // Save speaker rating to database
    await query(`
      INSERT INTO speaker_ratings (
        contractor_id,
        speaker_id,
        event_id,
        rating,
        rating_source,
        created_at
      ) VALUES ($1, $2, $3, $4, 'sms', CURRENT_TIMESTAMP)
    `, [
      smsData.contractor.id,
      speakerId,
      smsData.eventContext?.id,
      rating
    ]);

    // Format thank you message
    const message = `Thanks for the feedback! Your ${rating}/10 rating has been recorded. We appreciate you taking the time to share your thoughts! 🙌`;

    // Save outbound message with ACTUAL content
    await saveOutboundMessage({
      contractor_id: smsData.contractor.id,
      event_id: smsData.eventContext?.id,
      message_type: 'speaker_feedback_confirmation',
      personalization_data: {
        speaker_id: speakerId,
        rating: rating
      },
      ghl_contact_id: smsData.ghl_contact_id,
      ghl_location_id: smsData.ghl_location_id,
      message_content: message // Save actual thank you message
    });

    return {
      success: true,
      action: 'send_message',
      message,
      phone: smsData.phone,
      contractor_id: smsData.contractor.id,
      message_type: 'speaker_feedback_confirmation',
      response_sent: true,
      rating
    };

  } catch (error) {
    console.error('[SpeakerHandler] Error handling speaker feedback:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Build prompt for AI Concierge to generate speaker details response
 * The AI Concierge already knows the contractor's full context, learning preferences, etc.
 */
function buildSpeakerDetailsPrompt(speaker, speakerNum, recommendedSpeakers, eventContext) {
  const isFollowUp = eventContext.previous_speaker_requests.hasAskedAboutSpeakers;
  const previousSpeakers = eventContext.previous_speaker_requests.askedSpeakers || [];

  let prompt = `I'm at an event and just asked about Speaker ${speakerNum}`;

  if (isFollowUp && previousSpeakers.length > 0) {
    prompt += ` (I previously asked about speaker ${previousSpeakers.join(' and ')})`;
  }

  prompt += `.

SPEAKER ${speakerNum} DETAILS:
Name: ${speaker.name}
${speaker.title ? `Title: ${speaker.title}` : ''}
${speaker.company ? `Company: ${speaker.company}` : ''}
Session: "${speaker.session_title}"
${speaker.session_time ? `Time: ${speaker.session_time}` : ''}
${speaker.session_location ? `Location: ${speaker.session_location}` : ''}
${speaker.session_description ? `Description: ${speaker.session_description}` : ''}

ALL RECOMMENDED SPEAKERS:
${recommendedSpeakers.map((s, idx) => `${idx + 1}. ${s.name} - "${s.session_title}"`).join('\n')}

Please share the session details for Speaker ${speakerNum} in a helpful, conversational way. ${isFollowUp ? 'Acknowledge that I\'m exploring multiple speakers naturally.' : ''}

CRITICAL SMS CONSTRAINTS:
- Maximum 320 characters (SMS limit enforced by GHL)
- Provide session time and location
- Be conversational and helpful
- Connect to my business goals briefly
- End with a clear call-to-action
- NO fluff or filler words`;

  return prompt;
}

/**
 * Get recent conversation history for context
 */
async function getRecentConversationHistory(contractorId, pendingMessages = []) {
  try {
    // Find which speakers they've already asked about
    const speakerDetailsMessages = pendingMessages.filter(m => m.message_type === 'speaker_details_response');
    const askedSpeakers = speakerDetailsMessages.map(m => {
      const data = safeJsonParse(m.personalization_data);
      return data?.requested_speaker_number;
    }).filter(Boolean);

    return {
      askedSpeakers,
      hasAskedAboutSpeakers: askedSpeakers.length > 0,
      messageCount: pendingMessages.length
    };
  } catch (error) {
    console.error('[SpeakerHandler] Error getting conversation history:', error);
    return {
      askedSpeakers: [],
      hasAskedAboutSpeakers: false,
      messageCount: 0
    };
  }
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
      message_content || 'Message content not provided' // Fallback for backwards compatibility
    ]);

    console.log('[SpeakerHandler] Outbound message saved to database');
  } catch (error) {
    console.error('[SpeakerHandler] Error saving outbound message:', error);
  }
}

/**
 * Track speaker interaction for AI learning
 * This feeds the contractor's AI profile and helps personalize future recommendations
 */
async function trackSpeakerInteraction(interaction) {
  try {
    // Save to ai_learning_events for pattern recognition
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
      'event_speaker_interaction',
      interaction.contractor_id,
      interaction.event_id,
      'speaker_details_request',
      `Contractor asked about speaker ${interaction.speaker_number}`,
      interaction.action,
      'details_provided',
      0, // Will be updated if they attend session or provide feedback
      `Contractor interested in "${interaction.session_title}" by ${interaction.speaker_name}`,
      safeJsonStringify({
        speaker_id: interaction.speaker_id,
        speaker_name: interaction.speaker_name,
        session_title: interaction.session_title,
        speaker_number: interaction.speaker_number,
        is_follow_up: interaction.is_follow_up,
        previous_speakers: interaction.previous_speakers
      })
    ]);

    console.log('[SpeakerHandler] Tracked speaker interaction for AI learning');
  } catch (error) {
    console.error('[SpeakerHandler] Error tracking speaker interaction:', error);
    // Don't fail the request if learning tracking fails
  }
}

module.exports = {
  handleSpeakerDetails,
  handleSpeakerFeedback
};
