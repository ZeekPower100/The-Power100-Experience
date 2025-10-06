/**
 * AI-Powered Routing Classifier
 *
 * Uses GPT-4 to analyze conversation context and make intelligent routing decisions.
 * Solves the ambiguous response problem (e.g., "1" could be speaker selection OR PCR rating).
 *
 * Part of AI Routing Agent - Phase 3
 */

const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Available message handlers (dynamically imported to avoid circular deps)
const AVAILABLE_HANDLERS = {
  speaker_details: 'User wants details about a specific speaker session',
  speaker_feedback: 'User providing rating/feedback for a speaker (1-10 scale)',
  sponsor_details: 'User wants information about a specific sponsor booth',
  pcr_response: 'User providing Personal Connection Rating (1-5 scale)',
  peer_match_response: 'User responding to peer introduction/networking opportunity',
  event_checkin: 'User checking in or asking about event logistics',
  general_question: 'General event question - route to AI Concierge'
};

/**
 * Classify inbound message using AI with full conversation context
 * @param {string} inboundMessage - The message from the user
 * @param {Object} conversationContext - Full conversation context from conversationContext.js
 * @returns {Object} Classification result with route, confidence, and reasoning
 */
async function classifyWithContext(inboundMessage, conversationContext) {
  const startTime = Date.now();

  try {
    // Build AI prompt with full context
    const prompt = buildClassificationPrompt(inboundMessage, conversationContext);

    console.log('[AI Classifier] Sending to GPT-4...');

    // Call OpenAI GPT-4 Turbo
    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: 'You are an SMS routing system for event orchestration. Analyze conversation context to determine the correct message handler route. Always respond with valid JSON only.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.2, // Low temperature for deterministic routing
      max_tokens: 150,  // Just need JSON response
      response_format: { type: 'json_object' }
    });

    const aiResponse = response.choices[0].message.content;
    console.log('[AI Classifier] GPT-4 Response:', aiResponse);

    // Parse AI response
    const classification = JSON.parse(aiResponse);

    // Validate and normalize response
    const result = {
      route: classification.route || 'general_question',
      confidence: parseFloat(classification.confidence) || 0.5,
      reasoning: classification.reasoning || 'AI classification completed',
      intent: classification.intent || classification.route,
      classification_time_ms: Date.now() - startTime
    };

    // Validate confidence is between 0 and 1
    if (result.confidence < 0 || result.confidence > 1) {
      console.warn('[AI Classifier] Invalid confidence score:', result.confidence);
      result.confidence = Math.max(0, Math.min(1, result.confidence));
    }

    // Validate route exists
    if (!AVAILABLE_HANDLERS[result.route]) {
      console.warn('[AI Classifier] Unknown route:', result.route, '- defaulting to general_question');
      result.route = 'general_question';
      result.confidence = 0.3;
      result.reasoning += ' (Unknown route - fallback to general)';
    }

    console.log(`[AI Classifier] Result: ${result.route} (${(result.confidence * 100).toFixed(0)}% confidence) in ${result.classification_time_ms}ms`);

    return result;

  } catch (error) {
    console.error('[AI Classifier] Error:', error.message);

    // Graceful fallback on error
    return {
      route: 'general_question',
      confidence: 0.3,
      reasoning: `AI classification failed: ${error.message}`,
      intent: 'unknown',
      classification_time_ms: Date.now() - startTime,
      error: error.message
    };
  }
}

/**
 * Build comprehensive AI classification prompt
 * @param {string} inboundMessage - User's message
 * @param {Object} context - Conversation context
 * @returns {string} Formatted prompt for GPT-4
 */
function buildClassificationPrompt(inboundMessage, context) {
  const {
    contractor,
    event,
    conversationHistory,
    lastOutboundMessage,
    expectedResponseType,
    contextAge
  } = context;

  // Format conversation history
  const historyText = conversationHistory.map((msg, i) => {
    const direction = msg.direction === 'outbound' ? 'SYSTEM' : 'USER';
    const timestamp = new Date(msg.timestamp).toLocaleTimeString();
    const content = msg.message_content?.substring(0, 200) || '[no content]';
    return `[${timestamp}] ${direction}: "${content}${msg.message_content?.length > 200 ? '...' : ''}"`;
  }).join('\n');

  // Format expected response type
  let expectedResponseText = 'Unknown - analyze context';
  if (expectedResponseType) {
    expectedResponseText = `${expectedResponseType.type} (${expectedResponseType.format})`;
    if (expectedResponseType.range) {
      expectedResponseText += ` - Valid range: ${expectedResponseType.range}`;
    }
    if (expectedResponseType.options) {
      const optionsText = expectedResponseType.options
        .map(opt => typeof opt === 'object' ? `${opt.number}: ${opt.speaker_name || opt.sponsor_name}` : opt)
        .join(', ');
      expectedResponseText += ` - Options: ${optionsText}`;
    }
  }

  // Format last outbound message details
  const lastMessageText = lastOutboundMessage
    ? `Type: ${lastOutboundMessage.message_type}\nContent: "${lastOutboundMessage.message_content?.substring(0, 300)}..."`
    : 'No previous outbound messages';

  // Build the prompt
  const prompt = `You are routing an SMS response in an event orchestration system.

CONVERSATION HISTORY (last ${conversationHistory.length} messages):
${historyText}

LAST SYSTEM MESSAGE SENT (${contextAge ? Math.floor(contextAge / 1000) + ' seconds ago' : 'unknown'}):
${lastMessageText}

EXPECTED RESPONSE TYPE:
${expectedResponseText}

CONTRACTOR CONTEXT:
- Name: ${contractor.name || 'Unknown'}
- Company: ${contractor.company || 'Unknown'}
- Focus Areas: ${contractor.focus_areas?.join(', ') || 'None'}
${event ? `
EVENT CONTEXT:
- Event: ${event.name}
- Location: ${event.location}
- Speakers: ${event.speakers?.length || 0}
- Sponsors: ${event.sponsors?.length || 0}` : ''}

AVAILABLE HANDLERS:
${Object.entries(AVAILABLE_HANDLERS).map(([route, desc]) => `- ${route}: ${desc}`).join('\n')}

USER JUST REPLIED: "${inboundMessage}"

ROUTING RULES:
1. If the expected response is "speaker_selection" and user sends a number, route to "speaker_details"
2. If the expected response is "pcr_rating" and user sends a number 1-5, route to "pcr_response"
3. If the expected response is "speaker_feedback_rating" and user sends a number 1-10, route to "speaker_feedback"
4. If user asks about a speaker by name or mentions session topics, route to "speaker_details"
5. If user asks about sponsors or booths, route to "sponsor_details"
6. If the context is stale (>24 hours) and message is ambiguous, route to "general_question"
7. For natural language questions, analyze intent from conversation history

Return ONLY valid JSON in this exact format:
{
  "intent": "brief description of what user wants",
  "route": "handler_name",
  "confidence": 0.95,
  "reasoning": "why this route was chosen based on conversation context"
}`;

  return prompt;
}

/**
 * Determine if confidence score meets threshold for routing
 * @param {number} confidence - Confidence score (0-1)
 * @returns {string} Action to take
 */
function getConfidenceAction(confidence) {
  if (confidence >= 0.9) return 'route_directly';
  if (confidence >= 0.7) return 'route_with_logging';
  if (confidence >= 0.5) return 'route_with_warning';
  return 'clarification_needed';
}

module.exports = {
  classifyWithContext,
  getConfidenceAction,
  AVAILABLE_HANDLERS
};
