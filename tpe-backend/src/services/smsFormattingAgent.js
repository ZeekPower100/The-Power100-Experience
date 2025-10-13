/**
 * SMS Formatting Agent
 *
 * Intelligent SMS message formatting using AI to determine optimal delivery strategy.
 * Prioritizes "bursts" (3-message sequences) when appropriate, single messages when sufficient.
 *
 * CONCEPT: Like a semi-auto rifle on burst mode - fires 3 rounds in quick succession
 * when needed, single shots when precise targeting is better.
 *
 * CRITICAL LIMITS:
 * - GHL has 1600 character hard limit per message
 * - We enforce 1300 character safety limit
 * - Preferred format: 3-message "burst" for complex info
 * - Single message when concise answer is sufficient
 */

const openAIService = require('./openAIService');

// SMS Constraints
const GHL_HARD_LIMIT = 1600;
const SAFETY_LIMIT = 1300;
const PREFERRED_BURST_SIZE = 3;
const SINGLE_MESSAGE_IDEAL = 320;

/**
 * Analyze message and determine optimal SMS formatting strategy
 *
 * @param {string} message - The AI-generated response
 * @param {object} context - Context about the conversation
 * @returns {object} - Formatting decision with strategy and split messages
 */
async function analyzeAndFormatSMS(message, context = {}) {
  const startTime = Date.now();

  console.log('[SMSFormatAgent] Analyzing message for optimal formatting...');
  console.log('[SMSFormatAgent] Message length:', message.length, 'chars');
  console.log('[SMSFormatAgent] Context:', context.messageType || 'general');

  // FAST PATH: Message fits in single SMS perfectly
  if (message.length <= SINGLE_MESSAGE_IDEAL) {
    console.log('[SMSFormatAgent] ✅ Single message (fits perfectly)');
    return {
      strategy: 'single',
      messages: [message],
      reasoning: 'Message fits in single SMS, no splitting needed',
      burst: false,
      processingTimeMs: Date.now() - startTime
    };
  }

  // SAFETY CHECK: Message exceeds safety limit
  if (message.length > SAFETY_LIMIT) {
    console.warn('[SMSFormatAgent] ⚠️ Message exceeds 1300 char safety limit:', message.length);

    // Truncate and send as burst with warning
    const truncated = message.substring(0, SAFETY_LIMIT);
    const burstMessages = await intelligentSplit(truncated, PREFERRED_BURST_SIZE, context);

    return {
      strategy: 'burst_truncated',
      messages: burstMessages,
      reasoning: 'Message too long, truncated to safety limit and split into burst',
      burst: true,
      wasTruncated: true,
      originalLength: message.length,
      processingTimeMs: Date.now() - startTime
    };
  }

  // AI DECISION: Should this be a burst or single message?
  const decision = await decideFormattingStrategy(message, context);

  if (decision.strategy === 'single') {
    // AI says keep it single - might need light truncation
    const singleMessage = message.length <= SINGLE_MESSAGE_IDEAL
      ? message
      : await intelligentTruncate(message, SINGLE_MESSAGE_IDEAL, context);

    console.log('[SMSFormatAgent] ✅ Single message (AI decision)');
    return {
      strategy: 'single',
      messages: [singleMessage],
      reasoning: decision.reasoning,
      burst: false,
      wasTruncated: singleMessage.length < message.length,
      processingTimeMs: Date.now() - startTime
    };
  }

  // BURST MODE: Split into 3 messages intelligently
  console.log('[SMSFormatAgent] 🎯 BURST MODE (3 messages)');
  const burstMessages = await intelligentSplit(message, PREFERRED_BURST_SIZE, context);

  return {
    strategy: 'burst',
    messages: burstMessages,
    reasoning: decision.reasoning,
    burst: true,
    burstSize: burstMessages.length,
    processingTimeMs: Date.now() - startTime
  };
}

/**
 * AI decides if message should be single or burst
 */
async function decideFormattingStrategy(message, context) {
  const prompt = `You are an SMS formatting expert. Analyze this message and decide the optimal delivery strategy.

MESSAGE TO ANALYZE:
"${message}"

CONTEXT:
- Message Type: ${context.messageType || 'general'}
- Message Length: ${message.length} characters
- Previous Message Type: ${context.previousMessageType || 'none'}

STRATEGY OPTIONS:
1. SINGLE - One concise message (best for: confirmations, simple answers, yes/no, status checks)
2. BURST - Three-message sequence (best for: recommendations, detailed info, lists, explanations)

BURST MODE is like a semi-auto rifle on burst setting - fires 3 rounds in quick succession when you need impact.
Use SINGLE when precision matters more than volume.

DECISION CRITERIA:
- Information density (multiple points = burst, one point = single)
- Urgency (urgent = single, informational = burst)
- Complexity (simple = single, detailed = burst)
- Natural sections (if message has 2-3 clear sections = burst)

Respond in JSON:
{
  "strategy": "single" or "burst",
  "reasoning": "Why this strategy is optimal",
  "confidence": 0-100
}`;

  try {
    const response = await openAIService.generateChatCompletion([
      { role: 'system', content: 'You are an expert at SMS communication strategy.' },
      { role: 'user', content: prompt }
    ], {
      model: 'gpt-4-turbo',
      temperature: 0.3,
      response_format: { type: 'json_object' }
    });

    const decision = JSON.parse(response);
    console.log('[SMSFormatAgent] AI Decision:', decision.strategy, '-', decision.reasoning);

    return decision;

  } catch (error) {
    console.error('[SMSFormatAgent] Error in AI decision, defaulting to burst:', error);
    return {
      strategy: 'burst',
      reasoning: 'AI decision failed, defaulting to burst mode for safety',
      confidence: 50
    };
  }
}

/**
 * Intelligently split message into N chunks with natural breakpoints
 */
async function intelligentSplit(message, targetChunks = 3, context = {}) {
  const prompt = `Split this message into exactly ${targetChunks} SMS messages with NATURAL breakpoints.

MESSAGE:
"${message}"

RULES:
1. Split at natural breakpoints (end of thought, bullet points, sections)
2. Each chunk should be ~${Math.floor(message.length / targetChunks)} characters
3. DO NOT split mid-sentence unless absolutely necessary
4. Keep related information together
5. First message should hook attention
6. Last message should have call-to-action or conclusion
7. Add [...continues] at end of messages 1 & 2
8. Add [continued] at start of messages 2 & 3

Respond with JSON array of exactly ${targetChunks} messages:
["message 1 [...continues]", "[continued] message 2 [...continues]", "[continued] message 3"]`;

  try {
    const response = await openAIService.generateChatCompletion([
      { role: 'system', content: 'You are an expert at splitting messages naturally for SMS burst delivery.' },
      { role: 'user', content: prompt }
    ], {
      model: 'gpt-4-turbo',
      temperature: 0.2,
      response_format: { type: 'json_object' }
    });

    const result = JSON.parse(response);
    const messages = result.messages || Object.values(result);

    console.log('[SMSFormatAgent] Split into', messages.length, 'messages:',
                messages.map(m => m.length + ' chars').join(', '));

    return messages.slice(0, targetChunks); // Ensure we only return target number

  } catch (error) {
    console.error('[SMSFormatAgent] Error in intelligent split, using fallback:', error);
    return fallbackSplit(message, targetChunks);
  }
}

/**
 * Intelligently truncate message to fit single SMS
 */
async function intelligentTruncate(message, maxLength = SINGLE_MESSAGE_IDEAL, context = {}) {
  const prompt = `Condense this message to fit in a single SMS (max ${maxLength} characters) while preserving key information.

ORIGINAL MESSAGE:
"${message}"

RULES:
1. Keep the most important information
2. Maintain natural flow
3. Remove filler words and redundancy
4. End with call-to-action if present
5. Must be under ${maxLength} characters

Return ONLY the condensed message (no JSON, just the text).`;

  try {
    const condensed = await openAIService.generateChatCompletion([
      { role: 'system', content: 'You are an expert at condensing messages for SMS while preserving meaning.' },
      { role: 'user', content: prompt }
    ], {
      model: 'gpt-4-turbo',
      temperature: 0.3,
      max_tokens: 150
    });

    console.log('[SMSFormatAgent] Truncated:', message.length, '→', condensed.length, 'chars');

    return condensed.trim();

  } catch (error) {
    console.error('[SMSFormatAgent] Error in intelligent truncate, using hard truncate:', error);
    return message.substring(0, maxLength - 3) + '...';
  }
}

/**
 * Fallback split (no AI) - simple character-based splitting
 */
function fallbackSplit(message, targetChunks = 3) {
  const chunkSize = Math.ceil(message.length / targetChunks);
  const messages = [];

  for (let i = 0; i < targetChunks; i++) {
    const start = i * chunkSize;
    const end = start + chunkSize;
    let chunk = message.substring(start, end).trim();

    // Add indicators
    if (i < targetChunks - 1) chunk += ' [...continues]';
    if (i > 0) chunk = '[continued] ' + chunk;

    messages.push(chunk);
  }

  return messages;
}

/**
 * Quick validation check for formatted messages
 */
function validateFormattedMessages(messages) {
  for (const msg of messages) {
    if (msg.length > GHL_HARD_LIMIT) {
      console.error('[SMSFormatAgent] ❌ Message exceeds GHL hard limit:', msg.length);
      return false;
    }
  }
  return true;
}

module.exports = {
  analyzeAndFormatSMS,
  decideFormattingStrategy,
  intelligentSplit,
  intelligentTruncate,
  validateFormattedMessages,
  // Export constants for reference
  GHL_HARD_LIMIT,
  SAFETY_LIMIT,
  PREFERRED_BURST_SIZE,
  SINGLE_MESSAGE_IDEAL
};
