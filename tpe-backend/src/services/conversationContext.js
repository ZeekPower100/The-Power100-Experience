/**
 * Conversation Context Service
 *
 * Builds full conversation context for AI-powered routing decisions.
 * Provides conversation history, contractor profile, event details, and expected response types.
 *
 * Part of AI Routing Agent - Phase 2
 */

const { query } = require('../config/database');
const { safeJsonParse } = require('../utils/jsonHelpers');

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
    `SELECT id, name, email, phone, company_name, business_goals, focus_areas, revenue_tier, team_size
     FROM contractors WHERE id = $1`,
    [contractorId]
  );

  const contractor = contractorResult.rows[0];
  if (!contractor) {
    throw new Error(`Contractor ${contractorId} not found`);
  }

  // 2. Get event details if event_id provided (DATABASE-CHECKED: events table)
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

  // 3. Get last 5 messages (both inbound and outbound)
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

  // 4. Get last outbound message for expected response detection
  const lastOutbound = conversationHistory
    .filter(msg => msg.direction === 'outbound')
    .pop(); // Get most recent outbound

  // 5. Determine expected response type from last outbound message
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
    contextAge: lastOutbound ? Date.now() - new Date(lastOutbound.timestamp).getTime() : null
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

module.exports = {
  buildConversationContext,
  clearContractorCache
};
