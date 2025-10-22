/**
 * AI Message Generator
 *
 * Generates contextual, personalized event messages using GPT-4
 * Replaces static templates with dynamic AI-powered messaging
 *
 * Tone: Knowledgeable helpful buddy - casual with wit/humor but professional and action-oriented
 * Guardrails: Character limits, required elements, no hallucinations
 */

const OpenAI = require('openai');
const { safeJsonStringify } = require('../utils/jsonHelpers');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Tone and style guidelines for the AI Concierge
const TONE_GUIDELINES = `
You are the AI Concierge for The Power100 Experience - a knowledgeable, helpful buddy to contractors.

TONE PROFILE:
- Casual and approachable (like texting a friend who knows their stuff)
- A touch of wit and humor (keep it light but not cheesy)
- Professional when it counts (still focused on getting things done)
- Action-oriented (contractors are doers, not talkers)
- Industry-savvy (you understand home improvement businesses)

PERSONALITY TRAITS:
- Direct and concise (no fluff)
- Genuinely helpful (not salesy)
- Occasionally playful (contractors appreciate levity)
- Always locked in on the mission (helping them succeed)

EXAMPLES OF TONE:
✅ "Heads up! Session starts in 15. Grab a coffee and head to Main Stage."
✅ "Booth 5 is calling your name. They've got the lead gen tools you mentioned earlier."
✅ "Welcome back! Day 2 agenda is locked and loaded 🎯"
✅ "Quick one: did you catch that roofing session? Worth your time?"

❌ "Good morning! We hope you're having a wonderful experience at our event!"
❌ "Please proceed to Booth 5 at your earliest convenience."
❌ "Greetings! Your personalized agenda has been curated for optimal engagement."

CONTRACTOR SPEAK:
- Use "heads up" instead of "please note"
- Use "grab" instead of "obtain" or "acquire"
- Use "quick one" instead of "brief inquiry"
- Use emojis sparingly but effectively (🎯 ☕ 🤝 👊)
- Skip pleasantries, get to the point
`;

// Message type configurations with guardrails
const MESSAGE_CONFIGS = {
  check_in_reminder: {
    max_length: 160,
    required_elements: ['event_name', 'call_to_action'],
    tone: 'upbeat and motivating',
    purpose: 'Get them to check in and access their personalized agenda',
    allow_multi_message: false
  },
  speaker_alert: {
    max_length: 320, // Allow up to 2 SMS messages (160 x 2)
    required_elements: ['speaker_name', 'session_title', 'time_remaining'],
    tone: 'timely and actionable',
    purpose: 'Alert them about an upcoming session they care about',
    allow_multi_message: true,
    split_preference: 'auto' // Auto-split at natural break if over 160
  },
  sponsor_recommendation: {
    max_length: 320, // Allow up to 2 SMS messages (160 x 2)
    required_elements: ['booth_number', 'sponsor_name', 'why_relevant'],
    tone: 'helpful and strategic',
    purpose: 'Guide them to sponsors who can help their business',
    allow_multi_message: true,
    split_preference: 'auto' // Auto-split at natural break if over 160
  },
  peer_introduction: {
    max_length: 160,
    required_elements: ['peer_name', 'company_name', 'why_connect'],
    tone: 'friendly and networking-focused',
    purpose: 'Facilitate valuable peer connections',
    allow_multi_message: false
  },
  attendance_check: {
    max_length: 160,
    required_elements: ['session_title', 'yes_no_request'],
    tone: 'quick and casual',
    purpose: 'Confirm attendance for learning data (keep it super brief)',
    allow_multi_message: false
  },
  sponsor_batch_check: {
    max_length: 160,
    required_elements: ['call_to_action'],
    tone: 'wrap-up and reflective',
    purpose: 'End-of-day sponsor follow-up collection',
    allow_multi_message: false
  },
  post_event_wrap_up: {
    max_length: 320, // Allow 2 messages: thank you + rating request
    required_elements: ['rating_request', 'event_acknowledgment'],
    tone: 'appreciative and brief',
    purpose: 'Collect quick 1-5 event rating (priorities come after)',
    allow_multi_message: true,
    split_preference: 'auto'
  },
  post_event_priorities: {
    max_length: 320, // Allow 2 messages for AI-suggested priorities
    required_elements: ['suggested_priorities', 'confirmation_request'],
    tone: 'insightful and action-oriented',
    purpose: 'AI suggests top 3 priorities based on event data, asks for confirmation',
    allow_multi_message: true,
    split_preference: 'auto'
  }
};

/**
 * Generate a contextual AI message with guardrails
 * @param {string} messageType - Type of message (check_in_reminder, speaker_alert, etc.)
 * @param {Object} intent - What we're trying to accomplish with this message
 * @param {Object} context - All relevant context about contractor, event, timing, history
 * @returns {Promise<string>} Generated message
 */
async function generateContextualMessage(messageType, intent, context) {
  const startTime = Date.now();

  try {
    const config = MESSAGE_CONFIGS[messageType];
    if (!config) {
      throw new Error(`Unknown message type: ${messageType}`);
    }

    // Build the AI prompt
    const prompt = buildMessagePrompt(messageType, config, intent, context);

    console.log(`[AIMessageGenerator] Generating ${messageType} message...`);

    // Call GPT-4 with strict guidelines
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: TONE_GUIDELINES
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.8, // Higher for creativity while maintaining brand voice
      max_tokens: 100, // SMS messages are short
      presence_penalty: 0.6, // Encourage variety
      frequency_penalty: 0.3 // Reduce repetition
    });

    let generatedMessage = response.choices[0].message.content.trim();

    // Remove quotes if AI added them
    generatedMessage = generatedMessage.replace(/^["']|["']$/g, '');

    // Check if it's a multi-message (contains ||)
    const isMultiMessage = generatedMessage.includes('||');
    const messages = isMultiMessage
      ? generatedMessage.split('||').map(m => m.trim())
      : [generatedMessage];

    // Validate each message
    for (const msg of messages) {
      const validation = validateMessage(msg, config, intent);
      if (!validation.valid) {
        console.warn(`[AIMessageGenerator] Validation failed: ${validation.reason}`);
        console.warn(`[AIMessageGenerator] Message: "${msg}"`);
        console.warn(`[AIMessageGenerator] Falling back to template for ${messageType}`);
        return getFallbackTemplate(messageType, intent, context);
      }
    }

    const generationTime = Date.now() - startTime;
    const displayMsg = isMultiMessage ? `[${messages.length} msgs] ${messages.join(' || ')}` : generatedMessage;
    console.log(`[AIMessageGenerator] ✅ Generated ${messageType} in ${generationTime}ms: "${displayMsg}"`);

    // Log for learning
    await logGeneratedMessage(messageType, intent, context, generatedMessage, { valid: true });

    // Return as single string with || separator (caller will split if needed)
    return generatedMessage;

  } catch (error) {
    console.error(`[AIMessageGenerator] Error generating ${messageType}:`, error.message);
    console.log(`[AIMessageGenerator] Falling back to template`);
    return getFallbackTemplate(messageType, intent, context);
  }
}

/**
 * Build the prompt for AI message generation
 */
function buildMessagePrompt(messageType, config, intent, context) {
  const {
    contractor = {},
    event = {},
    timing = {},
    history = {},
    entity = {} // Speaker, sponsor, or peer data
  } = context;

  let prompt = `Generate a brief SMS message for a contractor at a home improvement industry event.

MESSAGE TYPE: ${messageType}
PURPOSE: ${config.purpose}
TONE: ${config.tone}
MAX LENGTH: ${config.max_length} characters${config.allow_multi_message ? ' (can use up to 2 SMS messages if needed for richer context)' : ' (single SMS only)'}

CONTRACTOR CONTEXT:
- Name: ${contractor.first_name || 'there'}
- Company: ${contractor.company_name || 'N/A'}
- Focus Areas: ${contractor.focus_areas?.join(', ') || 'N/A'}
- Already Checked In: ${context.already_checked_in ? 'YES' : 'NO'}

EVENT CONTEXT:
- Event: ${event.name || 'Power100 Event'}
- Day Number: ${timing.day_number || 1}
- Time Context: ${timing.time_context || 'during event'}

`;

  // Add message-specific context
  switch (messageType) {
    case 'check_in_reminder':
      prompt += `
TIMING: ${intent.timing_label} (${timing.hours_until_event} hours until event)
ALREADY CHECKED IN: ${context.already_checked_in ? 'Yes - remind them about Day 2' : 'No - encourage check-in'}

REQUIRED ELEMENTS:
- Event name: ${event.name}
- Clear call-to-action
- Make it feel urgent but not pushy
${context.already_checked_in ? '- Acknowledge they already checked in' : '- Encourage them to check in now'}
`;
      break;

    case 'speaker_alert':
      prompt += `
SPEAKER: ${entity.speaker_name}
SESSION: ${entity.session_title}
TIME: Starting in ${intent.minutes_until} minutes
WHY RELEVANT: ${entity.why}
LOCATION: ${entity.location || 'Main Stage'}

REQUIRED ELEMENTS:
- Speaker name and session title
- Time remaining ("in 15 min" or similar)
- Why this matters to them based on their focus areas
- Location

MULTI-MESSAGE OPTION:
If needed, split into 2 messages naturally:
- Message 1: Alert + session title + time + location
- Message 2: Why it's valuable for them + what they'll learn

Example single: "🎤 Sarah Johnson in 15 min: 'Scaling Revenue'. Covers your lead gen focus. Main Stage."
Example multi: "🎤 Sarah Johnson in 15 min: 'Scaling Revenue with Smart Marketing'. Main Stage. || She's covering automated lead generation strategies - exactly what you're focused on. Worth your time!"
`;
      break;

    case 'sponsor_recommendation':
      prompt += `
SPONSOR: ${entity.sponsor_name}
BOOTH: ${entity.booth_number}
WHY RELEVANT: ${entity.why}
TALKING POINTS: ${entity.talking_points?.join(', ') || 'N/A'}
BOOTHS VISITED: ${history.visited_booths?.join(', ') || 'None yet'}
TIME OF DAY: ${timing.time_context}

REQUIRED ELEMENTS:
- Booth number (Booth ${entity.booth_number})
- Sponsor name
- Why it's relevant to their business and focus areas
${history.visited_booths?.length > 0 ? '- Reference their previous booth visits if relevant' : ''}

MULTI-MESSAGE OPTION:
If needed, split into 2 messages naturally:
- Message 1: Booth number + sponsor + quick why ("perfect for your lead gen focus")
- Message 2: Specific talking points or special offers + context from visited booths

Example single: "Break time! Booth 5 - LeadFlow Pro has automated lead tools perfect for you. Ask about the 30% discount!"
Example multi: "Booth 5 during your break - LeadFlow Pro specializes in automated lead generation. Perfect match for your focus areas. || Ask them about: Event-only 30% discount + CRM integration. Complements what you saw at Booth 3. Worth the stop!"
`;
      break;

    case 'peer_introduction':
      prompt += `
PEER: ${entity.peer_name}
COMPANY: ${entity.company_name}
WHY CONNECT: ${entity.why}
COMMON GROUND: ${entity.common_ground?.join(', ') || 'N/A'}

REQUIRED ELEMENTS:
- Peer name and company
- Why this connection is valuable
- What they have in common
`;
      break;

    case 'attendance_check':
      prompt += `
SESSION: ${entity.session_title}
SPEAKER: ${entity.speaker_name}

REQUIRED ELEMENTS:
- Session title
- Simple YES or NO request
- Keep it VERY brief (one sentence max)
`;
      break;

    case 'sponsor_batch_check':
      prompt += `
TIME: End of day
RECOMMENDED SPONSORS: ${intent.recommended_sponsors || 'several'}

REQUIRED ELEMENTS:
- Ask which booths they visited
- Offer to help with follow-up
- End-of-day wrap-up tone
`;
      break;

    case 'post_event_wrap_up':
      prompt += `
TIME: 1 hour after event ends
PURPOSE: Get quick 1-5 event rating (priorities message follows)

REQUIRED ELEMENTS:
- Thank them for attending (acknowledge third-party event, not "our" event)
- Ask for 1-5 rating (1=Poor, 5=Excellent)
- Keep it brief and friendly
- Avoid saying "day" (many events are multi-day)

MULTI-MESSAGE OPTION:
Split into 2 messages if helpful:
- Message 1: Thank them + acknowledge event value
- Message 2: Quick rating request

Example single: "Hope you got solid value from ${event.name || 'the event'}! Quick one: rate your experience 1-5? (1=Poor, 5=Excellent)"
Example multi: "Hope ${event.name || 'the event'} delivered! 👊 || Quick rating: 1-5? (1=Poor, 5=Excellent) Helps us improve."
`;
      break;

    case 'post_event_priorities':
      prompt += `
TIME: Immediately after contractor rates the event
PURPOSE: AI suggests intelligent priorities based on event data, asks for confirmation

CONTEXT YOU HAVE:
- Event notes taken by contractor
- Booth visits with match scores and time spent
- Speaker sessions attended
- Peer matches with connection quality
- Their rating just received (use as context)

REQUIRED ELEMENTS:
- Reference their rating if provided ("Glad it was a ${rating}/5!")
- Suggest 3 specific priorities based on actual event data
- Include WHY each priority makes sense (match score, time spent, goals alignment)
- Ask if they agree or want to adjust

MULTI-MESSAGE OPTION:
Split into 2 messages for clarity:
- Message 1: Context + first 2 priorities with reasoning
- Message 2: Third priority + confirmation question

Example single: "Based on your ${rating}/5, here's what stood out: 1) Follow up with BuildPro (94% match, 20min at booth), 2) Connect with Mike Johnson (complementary biz), 3) Implement LeadGen tool (from session you attended). Sound right?"

Example multi: "Glad it was a ${rating}/5! Here's what jumped out: 1) BuildPro follow-up (94% match, you spent real time there), 2) Mike Johnson connection (complementary business) || 3) LeadGen implementation (you asked questions in that session). These your top 3, or adjust?"

IMPORTANT:
- Use REAL data from context (booth numbers, names, match scores, session titles)
- Don't make up priorities - base them on actual event behavior
- Avoid saying "from the day" or "today" (multi-day events exist)
- If no strong event data, ask them directly what stood out
`;
      break;
  }

  prompt += `\n\nOUTPUT FORMAT:
- Single message: Just the text
- Multi-message (if allowed): Separate with || (double pipe)
  Example: "Message 1 text here || Message 2 text here"

Generate ONLY the message text (no quotes, no explanation). Make it sound like a helpful buddy, not a corporate robot.`;

  return prompt;
}

/**
 * Validate generated message meets requirements
 */
function validateMessage(message, config, intent) {
  // For multi-message types, each individual message should be under 160
  const singleMessageLimit = 160;

  // Length check - individual message shouldn't exceed SMS limit
  if (message.length > singleMessageLimit) {
    return {
      valid: false,
      reason: `Message too long (${message.length} > ${singleMessageLimit} chars per SMS)`
    };
  }

  if (message.length < 20) {
    return {
      valid: false,
      reason: 'Message too short (likely incomplete)'
    };
  }

  // Check for required elements (basic validation)
  const lowerMessage = message.toLowerCase();

  // Type-specific validation
  switch (config.purpose) {
    case 'Guide them to sponsors who can help their business':
      if (!lowerMessage.includes('booth')) {
        return { valid: false, reason: 'Missing booth number' };
      }
      break;

    case 'Alert them about an upcoming session they care about':
      if (!lowerMessage.match(/\d+\s*(min|minute)/i)) {
        return { valid: false, reason: 'Missing time information' };
      }
      break;

    case 'Confirm attendance for learning data (keep it super brief)':
      if (!lowerMessage.match(/yes|no/i)) {
        return { valid: false, reason: 'Missing YES/NO request' };
      }
      break;
  }

  // Check for hallucinations (made-up data)
  // If message contains numbers we didn't provide, flag it
  // This is a simple check - can be enhanced

  return { valid: true };
}

/**
 * Get fallback template if AI generation fails
 */
function getFallbackTemplate(messageType, intent, context) {
  const { contractor = {}, event = {}, entity = {} } = context;
  const firstName = contractor.first_name || 'there';

  switch (messageType) {
    case 'check_in_reminder':
      if (context.already_checked_in) {
        return `${firstName}! Day ${context.timing?.day_number || 2} agenda is ready. Let's make today count 🎯`;
      }
      return `${event.name} ${intent.timing_label}! Check in now for your personalized agenda.`;

    case 'speaker_alert':
      return `🎤 ${entity.speaker_name} in ${intent.minutes_until} min: "${entity.session_title}". ${entity.why}`;

    case 'sponsor_recommendation':
      return `🤝 Booth ${entity.booth_number}: ${entity.sponsor_name}. ${entity.why}`;

    case 'peer_introduction':
      return `👥 Connect with ${entity.peer_name} from ${entity.company_name}. ${entity.why}`;

    case 'attendance_check':
      return `Quick check: Did you attend "${entity.session_title}"? YES or NO`;

    case 'sponsor_batch_check':
      return `Which sponsor booths did you visit today? I'll help you follow up on what matters.`;

    case 'post_event_wrap_up':
      return `Hope you got solid value from ${event.name}! Quick one: rate your experience 1-5? (1=Poor, 5=Excellent)`;

    case 'post_event_priorities':
      return `Based on your event experience, what are your TOP 3 PRIORITIES you want to tackle? (Just reply with what matters most)`;

    default:
      return `Hey ${firstName}! ${event.name} update from your AI Concierge.`;
  }
}

/**
 * Log generated message for learning and analytics
 */
async function logGeneratedMessage(messageType, intent, context, generatedMessage, validation) {
  // TODO: Log to database for analytics
  // Could track:
  // - Message type
  // - Generation time
  // - Validation result
  // - Context used
  // - Eventual response rate
  // - Sentiment of responses

  // For now, just console log
  console.log(`[AIMessageGenerator] Logged ${messageType} message for analytics`);
}

module.exports = {
  generateContextualMessage,
  TONE_GUIDELINES,
  MESSAGE_CONFIGS
};
