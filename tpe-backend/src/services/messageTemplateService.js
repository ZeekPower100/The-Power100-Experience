// ============================================================================
// DATABASE-CHECKED: Phase 3 Day 7 - Message Template Library
// ============================================================================
// TABLES USED: contractors, ai_proactive_messages, ai_concierge_goals,
//              business_growth_patterns, contractor_pattern_matches
// PURPOSE: Natural message generation with personalization
//
// FEATURES:
// 1. Library of natural message templates (casual & professional)
// 2. Personalization with contractor name, past interactions, pattern data
// 3. Context-aware message selection
// 4. A/B testing support for message styles
// 5. Anti-robotic phrasing (no "please provide", "as per", etc.)
//
// VERIFIED: October 23, 2025
// ============================================================================

const { query } = require('../config/database');

// ============================================================================
// MESSAGE STYLE CONSTANTS
// ============================================================================

const MESSAGE_STYLE = {
  CASUAL: 'casual',
  PROFESSIONAL: 'professional',
  FRIENDLY: 'friendly'
};

const MESSAGE_TYPE = {
  CHECK_IN: 'check_in',
  MILESTONE_FOLLOW_UP: 'milestone_follow_up',
  RESOURCE_SUGGESTION: 'resource_suggestion',
  ENCOURAGEMENT: 'encouragement',
  COURSE_CORRECTION: 'course_correction',
  CELEBRATION: 'celebration'
};

// Anti-robotic phrases to NEVER use
const FORBIDDEN_PHRASES = [
  'as per',
  'please provide',
  'I am here to',
  'let me help you',
  'based on my analysis',
  'according to my data',
  'as an AI',
  'please be advised',
  'kindly',
  'at your earliest convenience'
];

// ============================================================================
// TEMPLATE LIBRARY
// ============================================================================

const TEMPLATES = {
  // CHECK-IN MESSAGES
  check_in: {
    casual: [
      "Hey {name}, just checking in! How's {goal} coming along?",
      "{name}, thinking about you. Any updates on {goal}?",
      "Quick check-in, {name} - how's progress on {goal}?",
      "{name}, how's it going with {goal}? Want to talk through anything?"
    ],
    professional: [
      "{name}, wanted to check in on your progress with {goal}. How are things developing?",
      "Hi {name}, following up on {goal}. What's your current status?",
      "{name}, I'd love to hear how {goal} is progressing.",
      "Checking in on {goal}, {name}. What's been happening on your end?"
    ],
    friendly: [
      "Hey {name}! Just wanted to see how {goal} is going for you.",
      "{name}, hope you're doing well! Any movement on {goal}?",
      "Hi {name}, been thinking about your {goal}. How's that shaping up?",
      "{name}, quick question - how's {goal} going lately?"
    ]
  },

  // MILESTONE FOLLOW-UP
  milestone_follow_up: {
    casual: [
      "{name}, remember when you mentioned {milestone}? How did that turn out?",
      "Hey {name}, circling back on {milestone}. What's the latest?",
      "{name}, curious about {milestone} - any progress there?",
      "Quick follow-up on {milestone}, {name}. Where are you with that now?"
    ],
    professional: [
      "{name}, following up on {milestone} from our last conversation. What's the status?",
      "Hi {name}, wanted to check progress on {milestone}. How's it developing?",
      "{name}, I'm following up on {milestone}. What's been happening?",
      "Touching base about {milestone}, {name}. Where do things stand?"
    ],
    friendly: [
      "Hey {name}! How did {milestone} work out for you?",
      "{name}, been wondering about {milestone}. Any updates?",
      "Hi {name}, hope {milestone} went well! Want to share how it turned out?",
      "{name}, just checking - did {milestone} happen yet?"
    ]
  },

  // RESOURCE SUGGESTION
  resource_suggestion: {
    casual: [
      "{name}, found something that might help with {goal}: {resource}. Interested?",
      "Hey {name}, ran across {resource} and thought of {goal}. Want the link?",
      "{name}, this might be useful for {goal}: {resource}. Check it out?",
      "Saw {resource} and immediately thought of your {goal}, {name}. Worth a look?"
    ],
    professional: [
      "{name}, I came across {resource} that may support your work on {goal}. Would you like more information?",
      "Hi {name}, {resource} seems relevant to {goal}. Shall I send details?",
      "{name}, found {resource} that aligns with {goal}. Would this be helpful?",
      "Thought you might find {resource} valuable for {goal}, {name}. Interested?"
    ],
    friendly: [
      "Hey {name}! Found {resource} that could help with {goal}. Want to check it out?",
      "{name}, this looks perfect for {goal}: {resource}. Interested?",
      "Hi {name}, saw {resource} and thought you'd appreciate it for {goal}!",
      "{name}, {resource} might be exactly what you need for {goal}. What do you think?"
    ]
  },

  // ENCOURAGEMENT
  encouragement: {
    casual: [
      "{name}, {progress_metric} is solid progress on {goal}. Keep it up!",
      "Nice work on {goal}, {name}! {progress_metric} shows you're moving forward.",
      "{name}, you're making real progress on {goal} - {progress_metric}!",
      "Love seeing {progress_metric} for {goal}, {name}. You're doing great!"
    ],
    professional: [
      "{name}, {progress_metric} represents strong progress toward {goal}.",
      "Excellent work on {goal}, {name}. {progress_metric} demonstrates clear advancement.",
      "{name}, your progress on {goal} is noteworthy. {progress_metric} shows momentum.",
      "Impressive progress on {goal}, {name}. {progress_metric} reflects your commitment."
    ],
    friendly: [
      "Hey {name}! {progress_metric} is awesome progress on {goal}!",
      "{name}, you're killing it with {goal}! {progress_metric} is great!",
      "So happy to see {progress_metric} for {goal}, {name}!",
      "{name}, {progress_metric} shows you're really moving on {goal}!"
    ]
  },

  // COURSE CORRECTION
  course_correction: {
    casual: [
      "{name}, noticed {issue} with {goal}. Want to talk through it?",
      "Hey {name}, {issue} might be slowing down {goal}. Thoughts?",
      "{name}, quick question about {goal} - {issue} came up. Can we address it?",
      "Spotted {issue} that could impact {goal}, {name}. Worth discussing?"
    ],
    professional: [
      "{name}, I've identified {issue} that may affect {goal}. Should we address this?",
      "Hi {name}, {issue} has emerged regarding {goal}. Can we discuss?",
      "{name}, {issue} requires attention for {goal}. When can we talk?",
      "Flagging {issue} for your awareness on {goal}, {name}. Shall we review?"
    ],
    friendly: [
      "Hey {name}, heads up - {issue} might be affecting {goal}. Want to chat?",
      "{name}, noticed {issue} with {goal}. Can I help?",
      "Hi {name}, {issue} popped up for {goal}. Let's figure it out together?",
      "{name}, caught {issue} early for {goal}. Want to tackle it?"
    ]
  },

  // CELEBRATION
  celebration: {
    casual: [
      "{name}, {achievement} is huge! Congrats on {goal}!",
      "Awesome work, {name}! {achievement} for {goal} is a big win!",
      "{name}, {achievement}! That's major progress on {goal}!",
      "Yes! {achievement}, {name}! {goal} is really coming together!"
    ],
    professional: [
      "{name}, congratulations on {achievement}. This is significant progress toward {goal}.",
      "Excellent achievement, {name}. {achievement} represents a major milestone for {goal}.",
      "{name}, {achievement} is an impressive accomplishment for {goal}.",
      "Well done on {achievement}, {name}. {goal} is advancing beautifully."
    ],
    friendly: [
      "Hey {name}! {achievement} is fantastic! So proud of your work on {goal}!",
      "{name}, amazing! {achievement} shows how far you've come with {goal}!",
      "Congrats on {achievement}, {name}! {goal} is looking great!",
      "{name}, celebrate {achievement}! You've earned it with {goal}!"
    ]
  }
};

// ============================================================================
// GENERATE PERSONALIZED MESSAGE
// ============================================================================

/**
 * Generate a personalized proactive message
 *
 * @param {Object} messageConfig - Message configuration
 * @param {number} messageConfig.contractor_id - Contractor ID
 * @param {string} messageConfig.message_type - Type of message
 * @param {string} messageConfig.style - Message style (casual/professional/friendly)
 * @param {Object} messageConfig.context - Context data for personalization
 * @returns {Promise<Object>} Generated message with personalization
 */
async function generatePersonalizedMessage(messageConfig) {
  const {
    contractor_id,
    message_type,
    style = MESSAGE_STYLE.FRIENDLY,
    context = {}
  } = messageConfig;

  try {
    // Get contractor details
    const contractor = await getContractorDetails(contractor_id);

    // Get templates for message type and style
    const templates = TEMPLATES[message_type];
    if (!templates) {
      throw new Error(`No templates found for message type: ${message_type}`);
    }

    const styleTemplates = templates[style];
    if (!styleTemplates) {
      throw new Error(`No templates found for style: ${style}`);
    }

    // Select random template (for A/B testing)
    const template = styleTemplates[Math.floor(Math.random() * styleTemplates.length)];

    // Build personalization data
    const personalization = await buildPersonalizationData(contractor_id, context);

    // Generate message
    const message = personalizeTemplate(template, {
      name: contractor.first_name || 'there',
      ...personalization
    });

    // Validate message (check for forbidden phrases)
    const validation = validateMessage(message);

    if (!validation.is_valid) {
      console.warn(`Message contains forbidden phrases: ${validation.forbidden_found.join(', ')}`);
      // Try another template
      const altTemplate = styleTemplates[(Math.floor(Math.random() * styleTemplates.length) + 1) % styleTemplates.length];
      const altMessage = personalizeTemplate(altTemplate, {
        name: contractor.first_name || 'there',
        ...personalization
      });
      return {
        message_content: altMessage,
        style: style,
        template_used: altTemplate,
        personalization_data: personalization,
        ai_reasoning: `Generated ${message_type} message in ${style} style`,
        validation: validateMessage(altMessage)
      };
    }

    return {
      message_content: message,
      style: style,
      template_used: template,
      personalization_data: personalization,
      ai_reasoning: `Generated ${message_type} message in ${style} style`,
      validation: validation
    };
  } catch (error) {
    console.error('Error generating personalized message:', error);
    throw error;
  }
}

// ============================================================================
// GET CONTRACTOR DETAILS
// ============================================================================

/**
 * Get contractor details for personalization
 *
 * @param {number} contractorId - Contractor ID
 * @returns {Promise<Object>} Contractor details
 */
async function getContractorDetails(contractorId) {
  try {
    const result = await query(
      'SELECT first_name, last_name, company_name FROM contractors WHERE id = $1',
      [contractorId]
    );

    if (result.rows.length === 0) {
      throw new Error(`Contractor ${contractorId} not found`);
    }

    return result.rows[0];
  } catch (error) {
    console.error('Error getting contractor details:', error);
    throw error;
  }
}

// ============================================================================
// BUILD PERSONALIZATION DATA
// ============================================================================

/**
 * Build personalization data from contractor history and context
 *
 * @param {number} contractorId - Contractor ID
 * @param {Object} context - Additional context
 * @returns {Promise<Object>} Personalization data
 */
async function buildPersonalizationData(contractorId, context) {
  const data = {};

  // Goal information
  if (context.goal_id) {
    const goalResult = await query(
      'SELECT goal_description FROM ai_concierge_goals WHERE id = $1',
      [context.goal_id]
    );
    if (goalResult.rows.length > 0) {
      data.goal = goalResult.rows[0].goal_description;
    }
  }

  // Milestone information
  if (context.milestone) {
    data.milestone = context.milestone;
  }

  // Resource information
  if (context.resource) {
    data.resource = context.resource;
  }

  // Progress metric
  if (context.progress_metric) {
    data.progress_metric = context.progress_metric;
  }

  // Issue/challenge
  if (context.issue) {
    data.issue = context.issue;
  }

  // Achievement
  if (context.achievement) {
    data.achievement = context.achievement;
  }

  // Pattern data
  if (context.include_pattern_data) {
    const patternData = await getPatternData(contractorId);
    if (patternData) {
      data.pattern_insight = patternData.insight;
    }
  }

  return data;
}

// ============================================================================
// GET PATTERN DATA
// ============================================================================

/**
 * Get pattern data for personalization
 *
 * @param {number} contractorId - Contractor ID
 * @returns {Promise<Object|null>} Pattern data
 */
async function getPatternData(contractorId) {
  try {
    const result = await query(
      `SELECT
        p.pattern_name,
        p.success_indicators,
        pm.match_score
       FROM contractor_pattern_matches pm
       JOIN business_growth_patterns p ON p.id = pm.pattern_id
       WHERE pm.contractor_id = $1
       ORDER BY pm.match_score DESC
       LIMIT 1`,
      [contractorId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const pattern = result.rows[0];
    return {
      pattern_name: pattern.pattern_name,
      match_score: pattern.match_score,
      insight: `Contractors following similar patterns typically ${pattern.success_indicators}`
    };
  } catch (error) {
    console.error('Error getting pattern data:', error);
    return null;
  }
}

// ============================================================================
// PERSONALIZE TEMPLATE
// ============================================================================

/**
 * Replace placeholders in template with personalization data
 *
 * @param {string} template - Message template
 * @param {Object} data - Personalization data
 * @returns {string} Personalized message
 */
function personalizeTemplate(template, data) {
  let message = template;

  for (const [key, value] of Object.entries(data)) {
    const placeholder = `{${key}}`;
    if (message.includes(placeholder)) {
      message = message.replace(new RegExp(placeholder, 'g'), value || '');
    }
  }

  // Remove any remaining placeholders
  message = message.replace(/\{[^}]+\}/g, '');

  // Clean up extra spaces
  message = message.replace(/\s+/g, ' ').trim();

  return message;
}

// ============================================================================
// VALIDATE MESSAGE
// ============================================================================

/**
 * Validate message for forbidden phrases and quality
 *
 * @param {string} message - Message to validate
 * @returns {Object} Validation result
 */
function validateMessage(message) {
  const messageLower = message.toLowerCase();
  const forbiddenFound = [];

  for (const phrase of FORBIDDEN_PHRASES) {
    if (messageLower.includes(phrase.toLowerCase())) {
      forbiddenFound.push(phrase);
    }
  }

  return {
    is_valid: forbiddenFound.length === 0,
    forbidden_found: forbiddenFound,
    message_length: message.length,
    quality_score: calculateQualityScore(message, forbiddenFound.length)
  };
}

/**
 * Calculate message quality score
 *
 * @param {string} message - Message text
 * @param {number} forbiddenCount - Count of forbidden phrases
 * @returns {number} Quality score (1-5)
 */
function calculateQualityScore(message, forbiddenCount) {
  let score = 5;

  // Deduct for forbidden phrases
  score -= forbiddenCount;

  // Deduct if too short or too long
  if (message.length < 20) score -= 1;
  if (message.length > 300) score -= 1;

  // Deduct if contains multiple question marks or exclamation marks
  const questionMarks = (message.match(/\?/g) || []).length;
  const exclamationMarks = (message.match(/!/g) || []).length;

  if (questionMarks > 2) score -= 1;
  if (exclamationMarks > 2) score -= 1;

  return Math.max(1, Math.min(5, score));
}

// ============================================================================
// GET RECOMMENDED STYLE
// ============================================================================

/**
 * Get recommended message style based on contractor engagement
 *
 * @param {number} contractorId - Contractor ID
 * @returns {Promise<string>} Recommended style
 */
async function getRecommendedStyle(contractorId) {
  try {
    // Check past message response rates by style
    const result = await query(
      `SELECT
        context_data->>'style' as style,
        COUNT(*) as sent_count,
        COUNT(contractor_response) as response_count,
        ROUND((COUNT(contractor_response)::decimal / COUNT(*)) * 100) as response_rate
       FROM ai_proactive_messages
       WHERE contractor_id = $1
         AND sent_at IS NOT NULL
       GROUP BY context_data->>'style'
       ORDER BY response_rate DESC
       LIMIT 1`,
      [contractorId]
    );

    if (result.rows.length === 0 || !result.rows[0].style) {
      // No history - default to friendly
      return MESSAGE_STYLE.FRIENDLY;
    }

    return result.rows[0].style;
  } catch (error) {
    console.error('Error getting recommended style:', error);
    return MESSAGE_STYLE.FRIENDLY;
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  MESSAGE_STYLE,
  MESSAGE_TYPE,
  TEMPLATES,
  generatePersonalizedMessage,
  getContractorDetails,
  buildPersonalizationData,
  getPatternData,
  personalizeTemplate,
  validateMessage,
  getRecommendedStyle
};
