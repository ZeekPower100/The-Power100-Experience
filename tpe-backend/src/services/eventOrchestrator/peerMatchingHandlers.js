// DATABASE-CHECKED: event_peer_matches, event_messages columns verified on 2025-10-06
const { query } = require('../../config/database');
const { safeJsonParse, safeJsonStringify } = require('../../utils/jsonHelpers');
const { processMessageForSMS } = require('../../utils/smsHelpers');
const aiConciergeController = require('../../controllers/aiConciergeController');

/**
 * Handle peer match response
 * When contractor replies to peer match introduction
 *
 * Flow:
 * 1. Outbound: "🤝 Meet Sarah Martinez (Miami). You both face scaling challenges. She's at Table 6."
 * 2. Response: "Interested!" OR "Not now" OR "Tell me more"
 * 3. Update peer match record with response
 * 4. If both interested → facilitate connection
 * 5. If not interested → acknowledge and track
 */
async function handlePeerMatchResponse(smsData, classification) {
  try {
    console.log('[PeerMatchHandler] Processing peer match response:', smsData.messageText);

    const messageText = smsData.messageText.trim().toLowerCase();

    // Use AI to analyze the response for interest level
    const analysisPrompt = `Analyze this contractor's response to a peer networking match introduction:

Message: "${smsData.messageText}"

Determine:
1. Are they interested in connecting? (YES/NO/MAYBE/ASKING_FOR_MORE_INFO)
2. What's their sentiment? (positive/neutral/negative)
3. Is there a specific question or concern?

Respond in JSON:
{
  "interested": "yes|no|maybe|asking_more",
  "sentiment": "positive|neutral|negative",
  "question": "extracted question if any" or null,
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
      console.log('[PeerMatchHandler] AI response not JSON, using fallback detection');
      analysis = fallbackInterestDetection(messageText);
    }

    console.log('[PeerMatchHandler] Analysis:', analysis);

    // Get the pending peer match introduction message
    let pendingMessages = classification.context_data?.pending_messages || [];

    if (pendingMessages.length === 0) {
      console.log('[PeerMatchHandler] No pending messages from router, querying database directly');
      const messagesResult = await query(`
        SELECT
          id,
          message_type,
          personalization_data,
          actual_send_time
        FROM event_messages
        WHERE contractor_id = $1
          AND direction = 'outbound'
          AND message_type = 'peer_match_introduction'
          AND actual_send_time > NOW() - INTERVAL '24 hours'
        ORDER BY actual_send_time DESC
        LIMIT 3
      `, [smsData.contractor.id]);

      pendingMessages = messagesResult.rows;
      console.log('[PeerMatchHandler] Found', pendingMessages.length, 'peer match messages from database');
    }

    const peerMatchIntro = pendingMessages.find(m => m.message_type === 'peer_match_introduction');

    if (!peerMatchIntro) {
      console.log('[PeerMatchHandler] No peer match introduction found');
      return await handleGeneralPeerMatchQuestion(smsData, analysis);
    }

    // Parse personalization data to get peer match details
    const personalizationData = safeJsonParse(peerMatchIntro.personalization_data);
    const matchId = personalizationData?.match_id;
    const peerContractorId = personalizationData?.peer_contractor_id;
    const peerName = personalizationData?.peer_name;
    const matchReason = personalizationData?.match_reason;

    if (!matchId) {
      console.log('[PeerMatchHandler] ERROR: No match_id in personalization data');
      return {
        success: false,
        error: 'No match_id found in peer match introduction'
      };
    }

    // Get the peer match record
    // DATABASE-CHECKED: event_peer_matches columns verified
    const matchResult = await query(`
      SELECT
        id,
        contractor1_id,
        contractor2_id,
        match_score,
        match_reason,
        contractor1_response,
        contractor2_response,
        connection_made
      FROM event_peer_matches
      WHERE id = $1
    `, [matchId]);

    if (matchResult.rows.length === 0) {
      return {
        success: false,
        error: `Peer match ${matchId} not found`
      };
    }

    const peerMatch = matchResult.rows[0];

    // Determine which contractor this is (contractor1 or contractor2)
    const isContractor1 = peerMatch.contractor1_id === smsData.contractor.id;
    const responseField = isContractor1 ? 'contractor1_response' : 'contractor2_response';
    const otherResponseField = isContractor1 ? 'contractor2_response' : 'contractor1_response';

    // Convert interest to boolean
    const isInterested = analysis.interested === 'yes' || analysis.interested === 'maybe';

    // Update the peer match record with this contractor's response
    await query(`
      UPDATE event_peer_matches
      SET
        ${responseField} = $1,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `, [isInterested, matchId]);

    console.log('[PeerMatchHandler] Updated peer match response:', responseField, '=', isInterested);

    // Check if both contractors have responded positively
    const otherContractorResponse = peerMatch[otherResponseField];
    const bothInterested = isInterested && otherContractorResponse === true;

    if (bothInterested) {
      // Both interested! Mark connection_made = true and facilitate
      await query(`
        UPDATE event_peer_matches
        SET
          connection_made = true,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [matchId]);

      console.log('[PeerMatchHandler] Both contractors interested - connection made!');
    }

    // Route based on interest level
    if (analysis.interested === 'asking_more') {
      // They want more info
      return await handlePeerMatchInfoRequest(smsData, peerMatch, peerName, matchReason, analysis.question);

    } else if (analysis.interested === 'yes') {
      // They're interested!
      return await handlePeerMatchInterested(smsData, peerMatch, peerName, matchReason, bothInterested);

    } else if (analysis.interested === 'maybe') {
      // They're on the fence
      return await handlePeerMatchMaybe(smsData, peerMatch, peerName, matchReason);

    } else {
      // Not interested
      return await handlePeerMatchNotInterested(smsData, peerMatch, peerName);
    }

  } catch (error) {
    console.error('[PeerMatchHandler] Error handling peer match response:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Fallback interest detection if AI analysis fails
 */
function fallbackInterestDetection(messageText) {
  const text = messageText.toLowerCase();

  // Detect interest
  const yesKeywords = ['yes', 'yeah', 'interested', 'absolutely', 'definitely', 'sounds good', 'let\'s do it', 'connect'];
  const noKeywords = ['no', 'not interested', 'pass', 'not now', 'maybe later'];
  const maybeKeywords = ['maybe', 'not sure', 'thinking about it', 'let me think'];
  const questionKeywords = ['?', 'tell me more', 'who is', 'what do', 'how do', 'why', 'where'];

  let interested = 'no';
  if (yesKeywords.some(kw => text.includes(kw))) interested = 'yes';
  if (maybeKeywords.some(kw => text.includes(kw))) interested = 'maybe';
  if (noKeywords.some(kw => text.includes(kw))) interested = 'no';
  if (questionKeywords.some(kw => text.includes(kw))) interested = 'asking_more';

  // Detect sentiment
  const positiveWords = ['great', 'awesome', 'perfect', 'excited', 'love', 'appreciate'];
  const negativeWords = ['busy', 'not sure', 'concerned', 'worried'];

  let sentiment = 'neutral';
  if (positiveWords.some(w => text.includes(w))) sentiment = 'positive';
  if (negativeWords.some(w => text.includes(w))) sentiment = 'negative';

  return {
    interested,
    sentiment,
    question: interested === 'asking_more' ? messageText : null,
    confidence: 70
  };
}

/**
 * Handle when contractor wants more info about the peer match
 */
async function handlePeerMatchInfoRequest(smsData, peerMatch, peerName, matchReason, question) {
  const prompt = `I just received a peer networking match recommendation to connect with ${peerName}.

Match Reason: ${matchReason}

I asked: "${question || 'Tell me more'}"

Please provide helpful information about:
- Why this match makes sense for my business
- What we might collaborate on or discuss
- How this connection could benefit me

CRITICAL SMS CONSTRAINTS:
- Maximum 320 characters (can use 2 messages if needed)
- Be specific about the match value
- Encourage connection
- NO fluff or filler words`;

  const aiResponse = await aiConciergeController.generateAIResponse(
    prompt,
    smsData.contractor,
    smsData.contractor.id
  );

  const smsResult = processMessageForSMS(aiResponse, {
    allowMultiSMS: true,
    maxMessages: 2,
    context: { messageType: 'peer_match_info', matchId: peerMatch.id }
  });

  await saveOutboundMessage({
    contractor_id: smsData.contractor.id,
    event_id: smsData.eventContext?.id,
    message_type: 'peer_match_info',
    personalization_data: {
      match_id: peerMatch.id,
      peer_name: peerName,
      question_asked: question
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
    message_type: 'peer_match_info',
    response_sent: true,
    multi_sms: smsResult.wasSplit
  };
}

/**
 * Handle when contractor is interested in peer match
 */
async function handlePeerMatchInterested(smsData, peerMatch, peerName, matchReason, bothInterested) {
  const prompt = `I just confirmed I'm interested in connecting with ${peerName} based on our shared focus on ${matchReason}.

${bothInterested ? `${peerName} is also interested!` : `${peerName} hasn't responded yet.`}

Please send me a ${bothInterested ? 'confirmation that we\'re both interested and next steps to connect' : 'acknowledgment that my interest is noted and we\'ll connect when they respond'}

CRITICAL SMS CONSTRAINTS:
- Maximum 320 characters
- ${bothInterested ? 'Provide clear next steps (exchange contact info, suggest meeting location)' : 'Set expectation for when we\'ll follow up'}
- Be encouraging
- NO fluff or filler words`;

  const aiResponse = await aiConciergeController.generateAIResponse(
    prompt,
    smsData.contractor,
    smsData.contractor.id
  );

  const smsResult = processMessageForSMS(aiResponse, {
    allowMultiSMS: false,
    maxMessages: 1,
    context: { messageType: 'peer_match_interested', matchId: peerMatch.id }
  });

  await saveOutboundMessage({
    contractor_id: smsData.contractor.id,
    event_id: smsData.eventContext?.id,
    message_type: 'peer_match_interested',
    personalization_data: {
      match_id: peerMatch.id,
      peer_name: peerName,
      both_interested: bothInterested
    },
    ghl_contact_id: smsData.ghl_contact_id,
    ghl_location_id: smsData.ghl_location_id,
    message_content: smsResult.messages.join(' ')
  });

  // Track peer match interest
  await trackPeerMatchInteraction({
    contractor_id: smsData.contractor.id,
    event_id: smsData.eventContext?.id,
    match_id: peerMatch.id,
    action: 'expressed_interest',
    both_interested: bothInterested
  });

  return {
    success: true,
    action: 'send_message',
    messages: smsResult.messages,
    phone: smsData.phone,
    contractor_id: smsData.contractor.id,
    message_type: 'peer_match_interested',
    response_sent: true,
    both_interested: bothInterested
  };
}

/**
 * Handle when contractor is maybe interested
 */
async function handlePeerMatchMaybe(smsData, peerMatch, peerName, matchReason) {
  const firstName = smsData.contractor.name.split(' ')[0];
  const message = `Hi ${firstName}! No pressure - I'll check back with you later about connecting with ${peerName}. If you change your mind, just let me know! There are other great networking opportunities here too.`;

  await saveOutboundMessage({
    contractor_id: smsData.contractor.id,
    event_id: smsData.eventContext?.id,
    message_type: 'peer_match_maybe',
    personalization_data: {
      match_id: peerMatch.id,
      peer_name: peerName
    },
    ghl_contact_id: smsData.ghl_contact_id,
    ghl_location_id: smsData.ghl_location_id,
    message_content: message
  });

  return {
    success: true,
    action: 'send_message',
    messages: [message],
    phone: smsData.phone,
    contractor_id: smsData.contractor.id,
    message_type: 'peer_match_maybe',
    response_sent: true
  };
}

/**
 * Handle when contractor is not interested
 */
async function handlePeerMatchNotInterested(smsData, peerMatch, peerName) {
  const firstName = smsData.contractor.name.split(' ')[0];
  const message = `Got it, ${firstName}! No problem - not every match is the right fit. I'll keep finding other networking opportunities that align better with your goals. Enjoy the event!`;

  await saveOutboundMessage({
    contractor_id: smsData.contractor.id,
    event_id: smsData.eventContext?.id,
    message_type: 'peer_match_not_interested',
    personalization_data: {
      match_id: peerMatch.id,
      peer_name: peerName
    },
    ghl_contact_id: smsData.ghl_contact_id,
    ghl_location_id: smsData.ghl_location_id,
    message_content: message
  });

  // Track declined match for AI learning
  await trackPeerMatchInteraction({
    contractor_id: smsData.contractor.id,
    event_id: smsData.eventContext?.id,
    match_id: peerMatch.id,
    action: 'declined_match',
    both_interested: false
  });

  return {
    success: true,
    action: 'send_message',
    messages: [message],
    phone: smsData.phone,
    contractor_id: smsData.contractor.id,
    message_type: 'peer_match_not_interested',
    response_sent: true
  };
}

/**
 * Handle general peer match question when no specific match is found
 */
async function handleGeneralPeerMatchQuestion(smsData, analysis) {
  const prompt = `I'm asking about peer networking matches at the Power100 Summit: "${smsData.messageText}"

Please help me:
- Understand how peer matching works
- See if there are any matches for me
- Learn about networking opportunities

CRITICAL SMS CONSTRAINTS:
- Maximum 320 characters
- Be helpful and encouraging
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
    message_type: 'peer_match_general_question',
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

    console.log('[PeerMatchHandler] Outbound message saved to database');
  } catch (error) {
    console.error('[PeerMatchHandler] Error saving outbound message:', error);
  }
}

/**
 * Track peer match interaction for AI learning
 */
async function trackPeerMatchInteraction(interaction) {
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
      'event_peer_match_interaction',
      interaction.contractor_id,
      interaction.event_id,
      'peer_match_response',
      `Contractor ${interaction.action} peer match`,
      interaction.action,
      interaction.both_interested ? 'mutual_interest' : 'response_logged',
      interaction.both_interested ? 1.0 : 0.5,
      `Peer match ${interaction.action}${interaction.both_interested ? ' - both interested, connection facilitated' : ''}`,
      safeJsonStringify({
        match_id: interaction.match_id,
        action: interaction.action,
        both_interested: interaction.both_interested
      })
    ]);

    console.log('[PeerMatchHandler] Tracked peer match interaction for AI learning');
  } catch (error) {
    console.error('[PeerMatchHandler] Error tracking peer match interaction:', error);
  }
}

module.exports = {
  handlePeerMatchResponse
};
