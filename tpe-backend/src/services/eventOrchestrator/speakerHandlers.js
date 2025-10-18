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
 * Handle speaker feedback/rating - AI-FIRST VERSION
 * Extracts rating, notes, and context naturally from contractor message
 * Generates conversational AI response instead of template
 */
async function handleSpeakerFeedback(smsData, classification) {
  try {
    console.log('[SpeakerHandler] Processing speaker feedback (AI-first):', smsData.messageText);

    // Get the pending speaker recommendation to find which speaker
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

    const speakerRecommendation = pendingMessages.find(m => m.message_type === 'speaker_recommendation');

    if (!speakerRecommendation) {
      console.log('[SpeakerHandler] ERROR: No speaker_recommendation found in last 24 hours');
      return {
        success: false,
        error: 'No speaker recommendation found in context - please rate a specific speaker after receiving a recommendation'
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

    // Get speaker details from database
    const speakerResult = await query(`
      SELECT id, name, session_title, session_description
      FROM event_speakers
      WHERE id = $1
    `, [speakerId]);

    const speaker = speakerResult.rows.length > 0 ? speakerResult.rows[0] : null;
    const speakerName = speaker?.name || 'this speaker';

    // Get full event context for AI
    let eventContext = null;
    if (smsData.eventContext?.id) {
      eventContext = await aiKnowledgeService.getCurrentEventContext(
        smsData.eventContext.id,
        smsData.contractor.id
      );
    }

    // AI EXTRACTION: Use AI to extract rating, sentiment, and contextual notes
    const extractionPrompt = `EXTRACT STRUCTURED DATA from this speaker feedback message:
"${smsData.messageText}"

Speaker they're rating: ${speakerName}

EXTRACT:
1. Rating (1-10 scale) - Look for numbers, "out of 10", or infer from sentiment
2. Key insights/notes - Important comments (e.g., "my COO needs to watch this")
3. Sentiment - positive/neutral/negative
4. Entities - People mentioned, action items, follow-up needs

RESPOND ONLY WITH JSON:
{
  "rating": <number 1-10 or null>,
  "confidence": <0-1>,
  "sentiment": "<positive|neutral|negative>",
  "key_insights": "<extracted important notes or null>",
  "entities": {
    "people_mentioned": ["list of people/roles"],
    "action_items": ["list of actions"],
    "requires_followup": <true|false>
  },
  "extracted_context": "<natural summary of their feedback>"
}`;

    const aiExtraction = await aiConciergeController.generateAIResponse(
      extractionPrompt,
      smsData.contractor,
      smsData.contractor.id,
      eventContext
    );

    // Parse AI extraction (safely)
    let extractedData;
    try {
      // Remove markdown code blocks if present
      const cleanJson = aiExtraction.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      extractedData = JSON.parse(cleanJson);
    } catch (parseError) {
      console.error('[SpeakerHandler] AI extraction parse error:', parseError);
      // Fallback to basic extraction
      const rating = parseInt(smsData.messageText.match(/\d+/)?.[0]);
      extractedData = {
        rating: isNaN(rating) ? null : rating,
        confidence: 0.5,
        sentiment: 'positive',
        key_insights: smsData.messageText,
        entities: { people_mentioned: [], action_items: [], requires_followup: false },
        extracted_context: smsData.messageText
      };
    }

    console.log('[SpeakerHandler] AI Extraction:', JSON.stringify(extractedData, null, 2));

    // Save rating to event_pcr_scores if extracted
    if (extractedData.rating && extractedData.rating >= 1 && extractedData.rating <= 10) {
      // Convert 1-10 scale to 1-5 scale for explicit_score (database constraint)
      // 1-2 → 1, 3-4 → 2, 5-6 → 3, 7-8 → 4, 9-10 → 5
      const explicitScore5Point = Math.ceil(extractedData.rating / 2);

      // Calculate sentiment score from sentiment (positive=1.0, neutral=0.5, negative=0.0)
      const sentimentScore = extractedData.sentiment === 'positive' ? 1.0 :
                            extractedData.sentiment === 'negative' ? 0.0 : 0.5;

      // Final PCR score combines explicit rating (normalized to 0-1) and sentiment
      const normalizedRating = extractedData.rating / 10;
      const finalPcrScore = (normalizedRating * 0.7) + (sentimentScore * 0.3);

      // Save to event_pcr_scores tracking table (UPSERT - update if exists)
      await query(`
        INSERT INTO event_pcr_scores (
          event_id,
          contractor_id,
          pcr_type,
          entity_id,
          entity_name,
          explicit_score,
          sentiment_score,
          final_pcr_score,
          response_received,
          sentiment_analysis,
          confidence_level,
          responded_at,
          created_at,
          updated_at
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
        'speaker',
        speakerId,
        speakerName,
        explicitScore5Point, // Use 1-5 scale
        sentimentScore,
        finalPcrScore,
        smsData.messageText,
        JSON.stringify({
          sentiment: extractedData.sentiment,
          key_insights: extractedData.key_insights,
          entities: extractedData.entities,
          extracted_context: extractedData.extracted_context,
          original_10_point_rating: extractedData.rating // Store original for reference
        }),
        extractedData.confidence
      ]);

      // Update speaker's pcr_score column with latest aggregated score
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

      console.log(`[SpeakerHandler] ✅ Saved PCR score ${extractedData.rating}/10 (${explicitScore5Point}/5, final: ${finalPcrScore.toFixed(2)}) for speaker ${speakerName}`);
    }

    // Save contextual notes to event_notes if insights extracted
    const eventNoteService = require('../eventNoteService');
    if (extractedData.key_insights || extractedData.entities.people_mentioned.length > 0) {
      await eventNoteService.captureEventNote({
        event_id: smsData.eventContext?.id,
        contractor_id: smsData.contractor.id,
        note_text: extractedData.key_insights || smsData.messageText,
        note_type: 'speaker_note',
        speaker_id: speakerId,
        session_context: speaker?.session_title,
        ai_categorization: extractedData.sentiment,
        ai_tags: [
          'speaker_feedback',
          ...extractedData.entities.people_mentioned,
          ...extractedData.entities.action_items
        ],
        ai_priority_score: extractedData.entities.requires_followup ? 0.8 : 0.5,
        requires_followup: extractedData.entities.requires_followup,
        extracted_entities: {
          speaker_id: speakerId,
          speaker_name: speakerName,
          rating: extractedData.rating,
          sentiment: extractedData.sentiment,
          ...extractedData.entities
        },
        conversation_context: {
          message_text: smsData.messageText,
          extracted_context: extractedData.extracted_context,
          ai_confidence: extractedData.confidence
        }
      });

      console.log('[SpeakerHandler] ✅ Saved contextual note to event_notes');
    }

    // AI RESPONSE: Generate conversational thank you acknowledging ALL aspects
    const responsePrompt = `I just gave speaker feedback at the event:
"${smsData.messageText}"

Speaker: ${speakerName}
${speaker?.session_title ? `Session: "${speaker.session_title}"` : ''}

Generate a natural, conversational thank you response that:
1. Acknowledges their rating (${extractedData.rating || 'feedback'})
2. References their specific comments naturally (e.g., about COO, action items)
3. Shows you understood the context
4. Is warm and appreciative
5. Fits in ~320 characters

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
      responsePrompt,
      smsData.contractor,
      smsData.contractor.id,
      eventContext
    );

    // Process for SMS
    const smsResult = processMessageForSMS(aiResponse, {
      allowMultiSMS: false,
      maxMessages: 1,
      context: {
        messageType: 'speaker_feedback_confirmation',
        speakerId: speakerId
      }
    });

    const message = smsResult.messages[0];

    // Save outbound message with ACTUAL AI-generated content
    await saveOutboundMessage({
      contractor_id: smsData.contractor.id,
      event_id: smsData.eventContext?.id,
      message_type: 'speaker_feedback_confirmation',
      personalization_data: {
        speaker_id: speakerId,
        speaker_name: speakerName,
        rating: extractedData.rating,
        key_insights: extractedData.key_insights,
        sentiment: extractedData.sentiment,
        ai_extraction: extractedData
      },
      ghl_contact_id: smsData.ghl_contact_id,
      ghl_location_id: smsData.ghl_location_id,
      message_content: message
    });

    return {
      success: true,
      action: 'send_message',
      message,
      phone: smsData.phone,
      contractor_id: smsData.contractor.id,
      message_type: 'speaker_feedback_confirmation',
      response_sent: true,
      rating: extractedData.rating,
      ai_extracted: extractedData
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
