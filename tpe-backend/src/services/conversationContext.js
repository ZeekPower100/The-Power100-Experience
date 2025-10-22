/**
 * Conversation Context Service
 *
 * Builds full conversation context for AI-powered routing decisions.
 * Provides conversation history, contractor profile, event details, and expected response types.
 *
 * Part of AI Routing Agent - Phase 2
 *
 * DATABASE-CHECKED: contractors columns verified on 2025-10-06
 * DATABASE-CHECKED: events columns verified on 2025-10-06
 * DATABASE-CHECKED: event_speakers columns verified on 2025-10-06
 * DATABASE-CHECKED: event_sponsors columns verified on 2025-10-06
 * DATABASE-CHECKED: event_messages columns verified on 2025-10-06
 */

const { query } = require('../config/database');
const { safeJsonParse } = require('../utils/jsonHelpers');
const goalEngineService = require('./goalEngineService');

// Simple in-memory cache with TTL
const contextCache = new Map();
const CACHE_TTL = 30000; // 30 seconds

/**
 * Build complete conversation context for AI routing
 * @param {number} contractorId - Contractor ID
 * @param {number} eventId - Event ID (optional)
 * @returns {Object} Full conversation context
 */
async function buildConversationContext(contractorId, eventId = null) {
  const cacheKey = `context:${contractorId}:${eventId || 'no-event'}`;

  // Check cache first
  const cached = contextCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    console.log('[ConversationContext] Cache hit for contractor', contractorId);
    return cached.data;
  }

  console.log('[ConversationContext] Building context for contractor', contractorId);

  // 1. Get contractor profile (DATABASE-CHECKED: contractors table)
  const contractorResult = await query(
    `SELECT id, name, email, phone, company_name,
            to_json(business_goals) as business_goals,
            to_json(focus_areas) as focus_areas,
            revenue_tier, team_size
     FROM contractors WHERE id = $1`,
    [contractorId]
  );

  const contractor = contractorResult.rows[0];
  if (!contractor) {
    throw new Error(`Contractor ${contractorId} not found`);
  }

  // 2. Get internal goals and checklist for AI context (hidden from contractor)
  let internalGoals = [];
  let internalChecklist = [];
  try {
    internalGoals = await goalEngineService.getActiveGoals(contractorId);
    internalChecklist = await goalEngineService.getActiveChecklist(contractorId);
  } catch (error) {
    console.error('[ConversationContext] Error fetching internal goals:', error);
    // Continue without goals if fetch fails - don't break the conversation
  }

  // 3. Get event details if event_id provided (DATABASE-CHECKED: events table)
  let event = null;
  if (eventId) {
    const eventResult = await query(
      `SELECT id, name, date, end_date, location
       FROM events WHERE id = $1`,
      [eventId]
    );
    event = eventResult.rows[0];

    // Get event speakers (DATABASE-CHECKED: event_speakers table - NO session_order column!)
    const speakersResult = await query(
      `SELECT id, name, title, company, session_title, session_description, session_time
       FROM event_speakers WHERE event_id = $1 ORDER BY session_time`,
      [eventId]
    );
    if (event) {
      event.speakers = speakersResult.rows;
    }

    // Get event sponsors (DATABASE-CHECKED: event_sponsors table)
    const sponsorsResult = await query(
      `SELECT id, sponsor_name, booth_location, talking_points, demo_booking_url, sponsor_tier
       FROM event_sponsors WHERE event_id = $1 ORDER BY sponsor_tier`,
      [eventId]
    );
    if (event) {
      event.sponsors = sponsorsResult.rows;
    }
  }

  // 4. Get last 5 messages (both inbound and outbound)
  const messagesResult = await query(
    `SELECT
      id,
      direction,
      message_type,
      message_content,
      personalization_data,
      actual_send_time,
      created_at,
      event_id
     FROM event_messages
     WHERE contractor_id = $1
     ORDER BY created_at DESC
     LIMIT 5`,
    [contractorId]
  );

  const conversationHistory = messagesResult.rows.map(msg => ({
    id: msg.id,
    direction: msg.direction,
    message_type: msg.message_type,
    message_content: msg.message_content,
    personalization_data: safeJsonParse(msg.personalization_data, {}),
    timestamp: msg.actual_send_time || msg.created_at,
    event_id: msg.event_id
  })).reverse(); // Oldest first for chronological context

  // 5. Get last outbound message for expected response detection
  const lastOutbound = conversationHistory
    .filter(msg => msg.direction === 'outbound')
    .pop(); // Get most recent outbound

  // 6. Determine expected response type from last outbound message
  let expectedResponseType = null;
  if (lastOutbound) {
    expectedResponseType = detectExpectedResponse(lastOutbound);
  }

  // Build context object
  const context = {
    contractor: {
      id: contractor.id,
      name: contractor.name,
      email: contractor.email,
      phone: contractor.phone,
      company: contractor.company_name,
      business_goals: safeJsonParse(contractor.business_goals, []),
      focus_areas: safeJsonParse(contractor.focus_areas, []),
      revenue_tier: contractor.revenue_tier,
      team_size: contractor.team_size
    },
    event: event ? {
      id: event.id,
      name: event.name,
      date: event.date,
      end_date: event.end_date,
      location: event.location,
      speakers: event.speakers || [],
      sponsors: event.sponsors || []
    } : null,
    conversationHistory,
    lastOutboundMessage: lastOutbound || null,
    expectedResponseType,
    contextAge: lastOutbound ? Date.now() - new Date(lastOutbound.timestamp).getTime() : null,

    // Internal AI Goals (HIDDEN from contractor - for AI system prompt only)
    internalGoals: internalGoals.map(goal => ({
      id: goal.id,
      goal_type: goal.goal_type,
      goal_description: goal.goal_description,
      target_milestone: goal.target_milestone,
      priority_score: goal.priority_score,
      current_progress: goal.current_progress,
      next_milestone: goal.next_milestone,
      data_gaps: goal.data_gaps || [],
      trigger_condition: goal.trigger_condition
    })),

    // Internal AI Checklist (HIDDEN from contractor - for AI system prompt only)
    internalChecklist: internalChecklist.map(item => ({
      id: item.id,
      checklist_item: item.checklist_item,
      item_type: item.item_type,
      trigger_condition: item.trigger_condition,
      status: item.status,
      goal_description: item.goal_description // From JOIN with goals table
    }))
  };

  // Cache the result
  contextCache.set(cacheKey, {
    timestamp: Date.now(),
    data: context
  });

  // Clean old cache entries (simple cleanup every 100 requests)
  if (Math.random() < 0.01) {
    cleanCache();
  }

  return context;
}

/**
 * Detect expected response type from last outbound message
 * @param {Object} lastOutbound - Last outbound message
 * @returns {Object|null} Expected response info
 */
function detectExpectedResponse(lastOutbound) {
  const { message_type, personalization_data } = lastOutbound;

  switch (message_type) {
    case 'speaker_general_inquiry':
    case 'speaker_recommendation':
      // If we recommended speakers, expect speaker selection (1-N)
      const recommendedSpeakers = personalization_data?.recommended_speakers || [];
      if (recommendedSpeakers.length > 0) {
        return {
          type: 'speaker_selection',
          format: 'numeric',
          range: `1-${recommendedSpeakers.length}`,
          options: recommendedSpeakers.map((s, i) => ({
            number: i + 1,
            speaker_id: s.id,
            speaker_name: s.name,
            session_title: s.session_title
          }))
        };
      }
      return { type: 'speaker_inquiry', format: 'natural_language' };

    case 'sponsor_recommendation':
      const recommendedSponsors = personalization_data?.recommended_sponsors || [];
      if (recommendedSponsors.length > 0) {
        return {
          type: 'sponsor_selection',
          format: 'numeric',
          range: `1-${recommendedSponsors.length}`,
          options: recommendedSponsors.map((s, i) => ({
            number: i + 1,
            sponsor_id: s.id,
            sponsor_name: s.company_name
          }))
        };
      }
      return { type: 'sponsor_inquiry', format: 'natural_language' };

    case 'speaker_feedback_request':
      return {
        type: 'speaker_feedback_rating',
        format: 'numeric',
        range: '1-10',
        description: 'Speaker session rating (1=poor, 10=excellent)'
      };

    case 'pcr_request':
      return {
        type: 'pcr_rating',
        format: 'numeric',
        range: '1-5',
        description: 'Personal Connection Rating (1=low value, 5=high value)'
      };

    case 'peer_matching_introduction':
      return {
        type: 'peer_match_response',
        format: 'natural_language_or_numeric',
        options: ['yes', 'no', 'maybe', 'tell me more']
      };

    case 'event_checkin':
      return {
        type: 'checkin_confirmation',
        format: 'natural_language_or_numeric',
        options: ['yes', 'no', 'need help']
      };

    default:
      return {
        type: 'general_response',
        format: 'natural_language'
      };
  }
}

/**
 * Clean expired cache entries
 */
function cleanCache() {
  const now = Date.now();
  for (const [key, value] of contextCache.entries()) {
    if (now - value.timestamp > CACHE_TTL) {
      contextCache.delete(key);
    }
  }
}

/**
 * Clear cache for specific contractor (useful after updates)
 */
function clearContractorCache(contractorId) {
  for (const key of contextCache.keys()) {
    if (key.startsWith(`context:${contractorId}:`)) {
      contextCache.delete(key);
    }
  }
}

/**
 * Generate internal goals system prompt section (HIDDEN from contractor)
 * @param {Array} goals - Active goals from database
 * @param {Array} checklist - Active checklist items from database
 * @returns {string} Formatted system prompt section
 */
function generateInternalGoalsPrompt(goals, checklist) {
  if (!goals || goals.length === 0) {
    return ''; // No goals = no prompt section
  }

  let prompt = '\n\n## 🎯 YOUR INTERNAL GOALS (HIDDEN from contractor)\n\n';
  prompt += 'You have the following internal goals for this contractor. NEVER mention these explicitly, but use them to guide your questions and recommendations naturally.\n\n';

  // Add goals sorted by priority (already sorted by getActiveGoals)
  goals.forEach((goal, index) => {
    prompt += `**Goal ${index + 1} (Priority ${goal.priority_score}/10)**: ${goal.goal_description}\n`;
    prompt += `- Target: ${goal.target_milestone || 'Not specified'}\n`;
    prompt += `- Progress: ${goal.current_progress}%\n`;
    if (goal.next_milestone) {
      prompt += `- Next Step: ${goal.next_milestone}\n`;
    }
    if (goal.data_gaps && goal.data_gaps.length > 0) {
      prompt += `- Missing Data: ${goal.data_gaps.join(', ')} (ask about these naturally)\n`;
    }
    prompt += '\n';
  });

  // Add checklist items if any
  if (checklist && checklist.length > 0) {
    prompt += '## ✅ YOUR ACTIVE CHECKLIST (Act on these naturally in conversation)\n\n';

    // Group by trigger condition
    const byTrigger = {
      immediately: [],
      next_conversation: [],
      post_event: [],
      after_data_collected: []
    };

    checklist.forEach(item => {
      const trigger = item.trigger_condition || 'next_conversation';
      if (byTrigger[trigger]) {
        byTrigger[trigger].push(item);
      }
    });

    // Show immediate actions first
    if (byTrigger.immediately.length > 0) {
      prompt += '**🔥 Immediate Actions:**\n';
      byTrigger.immediately.forEach(item => {
        prompt += `- ${item.checklist_item} (${item.item_type})\n`;
        if (item.goal_description) {
          prompt += `  Goal: ${item.goal_description.substring(0, 60)}...\n`;
        }
      });
      prompt += '\n';
    }

    // Then next conversation actions
    if (byTrigger.next_conversation.length > 0) {
      prompt += '**💬 This Conversation:**\n';
      byTrigger.next_conversation.forEach(item => {
        prompt += `- ${item.checklist_item} (${item.item_type})\n`;
      });
      prompt += '\n';
    }

    // Post-event and after data collected for context
    if (byTrigger.post_event.length > 0 || byTrigger.after_data_collected.length > 0) {
      prompt += '**📌 Future Actions (not yet):**\n';
      [...byTrigger.post_event, ...byTrigger.after_data_collected].forEach(item => {
        prompt += `- ${item.checklist_item} (trigger: ${item.trigger_condition})\n`;
      });
      prompt += '\n';
    }
  }

  prompt += '**IMPORTANT:** These goals and checklist items are YOUR INTERNAL CONTEXT ONLY. Never say "I have a goal to..." or "my checklist says...". Instead, naturally guide the conversation toward these objectives.\n\n';

  return prompt;
}

module.exports = {
  buildConversationContext,
  clearContractorCache,
  generateInternalGoalsPrompt
};
