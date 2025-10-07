// DATABASE-CHECKED: event_sponsors, event_messages columns verified on 2025-10-06
const { query } = require('../../config/database');
const { safeJsonParse, safeJsonStringify } = require('../../utils/jsonHelpers');
const { processMessageForSMS } = require('../../utils/smsHelpers');
const aiConciergeController = require('../../controllers/aiConciergeController');

/**
 * Handle sponsor booth details request
 * When contractor replies 1-3 to sponsor recommendation
 */
async function handleSponsorDetails(smsData, classification) {
  try {
    console.log('[SponsorHandler] Processing sponsor details request:', smsData.messageText);

    // Extract sponsor number from message (1-3)
    // Support both "2" and "Tell me about sponsor 2" formats
    let sponsorNum;
    const messageText = smsData.messageText.trim().toLowerCase();

    // Try direct number first
    sponsorNum = parseInt(messageText);

    // If that fails, try extracting from natural language
    if (isNaN(sponsorNum)) {
      const numberMatch = messageText.match(/\b([1-3])\b/);
      if (numberMatch) {
        sponsorNum = parseInt(numberMatch[1]);
      }
    }

    if (isNaN(sponsorNum) || sponsorNum < 1 || sponsorNum > 3) {
      // If they're asking a general question about sponsors (not selecting a number),
      // route to AI Concierge for a conversational response
      console.log('[SponsorHandler] Not a sponsor number - routing to AI Concierge for general sponsor question');

      const prompt = `I'm at the Power100 Summit 2025 event and I just asked: "${smsData.messageText}"

Please help me understand what sponsors are available and recommended for me based on my business goals and interests.

SMS RESPONSE GUIDELINES:
- Target 320 characters per message, but you CAN use 2-3 messages if needed
- If the information is valuable enough, split into multiple messages naturally
- Each message should be a complete thought
- Focus on most relevant sponsors for my business goals
- Include booth locations when helpful
- Be conversational and engaging
- End with clear call-to-action`;

      const aiResponse = await aiConciergeController.generateAIResponse(
        prompt,
        smsData.contractor,
        smsData.contractor.id
      );

      // Process for SMS with intelligent multi-message support
      const smsResult = processMessageForSMS(aiResponse, {
        allowMultiSMS: true,
        maxMessages: 3,
        context: {
          messageType: 'sponsor_general_inquiry',
          contractorId: smsData.contractor.id
        }
      });

      console.log(`[SponsorHandler] Processed sponsor inquiry: ${smsResult.messages.length} message(s), split: ${smsResult.wasSplit}, truncated: ${smsResult.wasTruncated}`);

      return {
        success: true,
        action: 'send_message',
        messages: smsResult.messages,
        phone: smsData.phone,
        contractor_id: smsData.contractor.id,
        message_type: 'sponsor_general_inquiry',
        response_sent: true,
        multi_sms: smsResult.wasSplit,
        sms_count: smsResult.messages.length
      };
    }

    // Get the pending sponsor recommendation message to find which sponsors were recommended
    let pendingMessages = classification.context_data?.pending_messages || [];
    console.log('[SponsorHandler] Pending messages from classification:', pendingMessages.length);

    if (pendingMessages.length === 0) {
      console.log('[SponsorHandler] No pending messages from router, querying database directly');
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
      console.log('[SponsorHandler] Found', pendingMessages.length, 'messages from database');
    }

    console.log('[SponsorHandler] Message types:', pendingMessages.map(m => m.message_type).join(', '));

    const sponsorRecommendation = pendingMessages.find(m => m.message_type === 'sponsor_recommendation');

    if (!sponsorRecommendation) {
      console.log('[SponsorHandler] ERROR: No sponsor_recommendation found');
      return {
        success: false,
        error: 'No sponsor recommendation found in context'
      };
    }

    // Parse personalization_data to get recommended sponsors
    const personalizationData = safeJsonParse(sponsorRecommendation.personalization_data);
    const recommendedSponsors = personalizationData?.recommended_sponsors || [];

    if (recommendedSponsors.length === 0) {
      return {
        success: false,
        error: 'No sponsors found in recommendation'
      };
    }

    // Get the selected sponsor (1-based index)
    const selectedSponsor = recommendedSponsors[sponsorNum - 1];

    if (!selectedSponsor) {
      return {
        success: false,
        error: `Sponsor ${sponsorNum} not found in recommendations`
      };
    }

    // Fetch full sponsor details from database
    // DATABASE-CHECKED: event_sponsors columns verified
    const sponsorResult = await query(`
      SELECT
        id,
        sponsor_name,
        sponsor_tier,
        booth_number,
        booth_location,
        talking_points,
        special_offers,
        demo_booking_url,
        activation_type,
        presentation_time,
        presentation_title
      FROM event_sponsors
      WHERE id = $1
    `, [selectedSponsor.sponsor_id]);

    // Merge database data with recommendation data (prioritize database if available)
    const sponsor = sponsorResult.rows.length > 0
      ? sponsorResult.rows[0]
      : {
          id: selectedSponsor.sponsor_id,
          sponsor_name: selectedSponsor.sponsor_name || selectedSponsor.name,
          booth_location: selectedSponsor.booth_location,
          talking_points: selectedSponsor.talking_points || null,
          special_offers: null,
          demo_booking_url: null,
          activation_type: null,
          presentation_time: null,
          presentation_title: null
        };

    // Build comprehensive context for AI Concierge
    const eventContext = {
      event_id: smsData.eventContext?.id,
      sponsor_requested: {
        number: sponsorNum,
        sponsor_id: sponsor.id,
        sponsor_name: sponsor.sponsor_name,
        booth_location: sponsor.booth_location,
        booth_number: sponsor.booth_number,
        talking_points: sponsor.talking_points,
        special_offers: sponsor.special_offers
      },
      all_recommended_sponsors: recommendedSponsors,
      previous_sponsor_requests: await getRecentConversationHistory(smsData.contractor.id, classification.context_data?.pending_messages)
    };

    // Generate AI Concierge response with full contractor context and event knowledge
    const prompt = buildSponsorDetailsPrompt(sponsor, sponsorNum, recommendedSponsors, eventContext);
    const aiResponse = await aiConciergeController.generateAIResponse(
      prompt,
      smsData.contractor,
      smsData.contractor.id
    );

    // Process for SMS with intelligent multi-message support
    const smsResult = processMessageForSMS(aiResponse, {
      allowMultiSMS: true,
      maxMessages: 2,
      context: {
        messageType: 'sponsor_details',
        sponsorId: sponsor.id
      }
    });

    console.log(`[SponsorHandler] Processed sponsor details: ${smsResult.messages.length} message(s), split: ${smsResult.wasSplit}, truncated: ${smsResult.wasTruncated}`);

    // Save outbound message with full personalization_data and ACTUAL message content
    await saveOutboundMessage({
      contractor_id: smsData.contractor.id,
      event_id: smsData.eventContext?.id,
      message_type: 'sponsor_details_response',
      personalization_data: {
        sponsor_id: sponsor.id,
        sponsor_name: sponsor.sponsor_name,
        booth_location: sponsor.booth_location,
        requested_sponsor_number: sponsorNum,
        demo_booking_url: sponsor.demo_booking_url
      },
      ghl_contact_id: smsData.ghl_contact_id,
      ghl_location_id: smsData.ghl_location_id,
      message_content: smsResult.messages.join(' ')
    });

    // Track learning event for AI Concierge
    await trackSponsorInteraction({
      contractor_id: smsData.contractor.id,
      event_id: smsData.eventContext?.id,
      sponsor_id: sponsor.id,
      sponsor_name: sponsor.sponsor_name,
      booth_location: sponsor.booth_location,
      action: 'requested_sponsor_details',
      sponsor_number: sponsorNum,
      is_follow_up: eventContext.previous_sponsor_requests.hasAskedAboutSponsors,
      previous_sponsors: eventContext.previous_sponsor_requests.askedSponsors || []
    });

    return {
      success: true,
      action: 'send_message',
      messages: smsResult.messages,
      phone: smsData.phone,
      contractor_id: smsData.contractor.id,
      message_type: 'sponsor_details_response',
      response_sent: true,
      sponsor_id: sponsor.id,
      multi_sms: smsResult.wasSplit,
      sms_count: smsResult.messages.length
    };

  } catch (error) {
    console.error('[SponsorHandler] Error handling sponsor details:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Build prompt for AI Concierge to generate sponsor details response
 */
function buildSponsorDetailsPrompt(sponsor, sponsorNum, recommendedSponsors, eventContext) {
  const isFollowUp = eventContext.previous_sponsor_requests.hasAskedAboutSponsors;
  const previousSponsors = eventContext.previous_sponsor_requests.askedSponsors || [];

  let prompt = `I'm at an event and just asked about Sponsor ${sponsorNum}`;

  if (isFollowUp && previousSponsors.length > 0) {
    prompt += ` (I previously asked about sponsor ${previousSponsors.join(' and ')})`;
  }

  prompt += `.

SPONSOR ${sponsorNum} DETAILS:
Company: ${sponsor.sponsor_name}
${sponsor.booth_location ? `Booth Location: ${sponsor.booth_location}` : ''}
${sponsor.booth_number ? `Booth Number: ${sponsor.booth_number}` : ''}
${sponsor.talking_points ? `Key Topics: ${sponsor.talking_points}` : ''}
${sponsor.special_offers ? `Special Offers: ${sponsor.special_offers}` : ''}
${sponsor.demo_booking_url ? `Demo Booking: ${sponsor.demo_booking_url}` : ''}
${sponsor.presentation_time ? `Presentation Time: ${sponsor.presentation_time}` : ''}
${sponsor.presentation_title ? `Presentation: "${sponsor.presentation_title}"` : ''}

ALL RECOMMENDED SPONSORS:
${recommendedSponsors.map((s, idx) => `${idx + 1}. ${s.sponsor_name || s.name}`).join('\n')}

Please share the booth details for Sponsor ${sponsorNum} in a helpful, conversational way. ${isFollowUp ? 'Acknowledge that I\'m exploring multiple sponsors naturally.' : ''}

CRITICAL SMS CONSTRAINTS:
- Maximum 320 characters (SMS limit enforced by GHL)
- Provide booth location and key info
- Be conversational and helpful
- Connect to my business goals briefly
- End with a clear call-to-action (visit booth, book demo)
- NO fluff or filler words`;

  return prompt;
}

/**
 * Get recent conversation history for context
 */
async function getRecentConversationHistory(contractorId, pendingMessages = []) {
  try {
    // Find which sponsors they've already asked about
    const sponsorDetailsMessages = pendingMessages.filter(m => m.message_type === 'sponsor_details_response');
    const askedSponsors = sponsorDetailsMessages.map(m => {
      const data = safeJsonParse(m.personalization_data);
      return data?.requested_sponsor_number;
    }).filter(Boolean);

    return {
      askedSponsors,
      hasAskedAboutSponsors: askedSponsors.length > 0,
      messageCount: pendingMessages.length
    };
  } catch (error) {
    console.error('[SponsorHandler] Error getting conversation history:', error);
    return {
      askedSponsors: [],
      hasAskedAboutSponsors: false,
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
      message_content || 'Message content not provided'
    ]);

    console.log('[SponsorHandler] Outbound message saved to database');
  } catch (error) {
    console.error('[SponsorHandler] Error saving outbound message:', error);
  }
}

/**
 * Track sponsor interaction for AI learning
 */
async function trackSponsorInteraction(interaction) {
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
      'event_sponsor_interaction',
      interaction.contractor_id,
      interaction.event_id,
      'sponsor_details_request',
      `Contractor asked about sponsor ${interaction.sponsor_number}`,
      interaction.action,
      'details_provided',
      0,
      `Contractor interested in ${interaction.sponsor_name} at ${interaction.booth_location}`,
      safeJsonStringify({
        sponsor_id: interaction.sponsor_id,
        sponsor_name: interaction.sponsor_name,
        booth_location: interaction.booth_location,
        sponsor_number: interaction.sponsor_number,
        is_follow_up: interaction.is_follow_up,
        previous_sponsors: interaction.previous_sponsors
      })
    ]);

    console.log('[SponsorHandler] Tracked sponsor interaction for AI learning');
  } catch (error) {
    console.error('[SponsorHandler] Error tracking sponsor interaction:', error);
  }
}

module.exports = {
  handleSponsorDetails
};
