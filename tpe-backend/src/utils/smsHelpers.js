/**
 * SMS Helper Utilities
 * Handles intelligent SMS message splitting and formatting
 */

const MAX_SMS_LENGTH = 320; // Safe limit under GHL's 1600 char limit
const MULTI_SMS_INDICATOR = '[...continues]';
const MULTI_SMS_CONTINUATION = '[continued]';

/**
 * Split a long message into multiple SMS-friendly chunks
 * Intelligently breaks at sentence boundaries when possible
 *
 * @param {string} message - The full message to split
 * @param {number} maxLength - Maximum length per SMS (default 320)
 * @returns {string[]} - Array of message chunks
 */
function splitIntoSMS(message, maxLength = MAX_SMS_LENGTH) {
  if (message.length <= maxLength) {
    return [message];
  }

  const messages = [];
  let remaining = message;

  while (remaining.length > 0) {
    let chunk;

    if (remaining.length <= maxLength) {
      // Last chunk - fits entirely
      chunk = remaining;
      remaining = '';
    } else {
      // Need to split - try to find a good break point
      let breakPoint = maxLength - MULTI_SMS_INDICATOR.length - 1;

      // Try to break at sentence end (. ! ?)
      const sentenceEnd = remaining.substring(0, breakPoint).lastIndexOf('. ');
      if (sentenceEnd > breakPoint * 0.7) { // At least 70% of max length
        breakPoint = sentenceEnd + 1; // Include the period
      } else {
        // Try to break at word boundary
        const lastSpace = remaining.substring(0, breakPoint).lastIndexOf(' ');
        if (lastSpace > breakPoint * 0.8) { // At least 80% of max length
          breakPoint = lastSpace;
        }
      }

      chunk = remaining.substring(0, breakPoint).trim() + ' ' + MULTI_SMS_INDICATOR;
      remaining = MULTI_SMS_CONTINUATION + ' ' + remaining.substring(breakPoint).trim();
    }

    messages.push(chunk);

    // Safety: prevent infinite loops
    if (messages.length > 5) {
      console.warn('[SMS] Hit safety limit of 5 messages, truncating');
      break;
    }
  }

  return messages;
}

/**
 * Ask AI if message should be split into multiple SMS
 * AI decides if information value justifies multiple messages
 *
 * @param {string} message - The full AI response
 * @param {object} context - Context about the conversation
 * @returns {boolean} - Whether to allow multi-SMS
 */
function shouldAllowMultiSMS(message, context = {}) {
  // Auto-allow if message is moderately long but not excessive
  if (message.length <= MAX_SMS_LENGTH * 2) {
    return true; // Up to 2 messages is reasonable
  }

  // Check for information density indicators
  const hasMultipleTopics = (message.match(/\d\./g) || []).length >= 2; // Numbered lists
  const hasSessionDetails = message.includes('Session:') || message.includes('Time:') || message.includes('Location:');
  const hasImportantInfo = message.includes('important') || message.includes('critical') || message.includes('must');

  // Allow up to 3 messages if content is information-dense
  if (hasMultipleTopics || hasSessionDetails || hasImportantInfo) {
    return message.length <= MAX_SMS_LENGTH * 3;
  }

  // Default: allow up to 2 messages for general responses
  return message.length <= MAX_SMS_LENGTH * 2;
}

/**
 * Process AI response for SMS delivery
 * Handles length checking, splitting, and truncation
 *
 * @param {string} message - The AI-generated message
 * @param {object} options - Processing options
 * @returns {object} - { messages: string[], wasSplit: boolean, wasTruncated: boolean }
 */
function processMessageForSMS(message, options = {}) {
  const {
    allowMultiSMS = true,
    maxMessages = 3,
    context = {}
  } = options;

  // Single message fits - perfect!
  if (message.length <= MAX_SMS_LENGTH) {
    return {
      messages: [message],
      wasSplit: false,
      wasTruncated: false,
      totalLength: message.length
    };
  }

  // Check if we should allow multi-SMS
  if (allowMultiSMS && shouldAllowMultiSMS(message, context)) {
    const messages = splitIntoSMS(message, MAX_SMS_LENGTH);

    // Respect max messages limit
    if (messages.length > maxMessages) {
      console.log(`[SMS] Split resulted in ${messages.length} messages, truncating to ${maxMessages}`);
      const truncated = messages.slice(0, maxMessages);
      truncated[truncated.length - 1] = truncated[truncated.length - 1].replace(MULTI_SMS_INDICATOR, '...'); // Remove continuation indicator on last message

      return {
        messages: truncated,
        wasSplit: true,
        wasTruncated: true,
        totalLength: message.length,
        originalMessageCount: messages.length
      };
    }

    return {
      messages,
      wasSplit: true,
      wasTruncated: false,
      totalLength: message.length
    };
  }

  // Can't split or shouldn't split - truncate to single message
  console.log(`[SMS] Message too long (${message.length} chars), truncating to ${MAX_SMS_LENGTH}`);
  const truncated = message.substring(0, MAX_SMS_LENGTH - 3) + '...';

  return {
    messages: [truncated],
    wasSplit: false,
    wasTruncated: true,
    totalLength: message.length
  };
}

module.exports = {
  MAX_SMS_LENGTH,
  splitIntoSMS,
  shouldAllowMultiSMS,
  processMessageForSMS
};
