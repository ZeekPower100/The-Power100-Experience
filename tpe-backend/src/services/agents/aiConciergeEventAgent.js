// DATABASE-CHECKED: ai_concierge_sessions, contractors, ai_learning_events verified October 13, 2025
// ================================================================
// AI Concierge (Event Mode) Agent
// ================================================================
// Purpose: Real-time event support with zero hallucinations (materialized views)
// Mode: Event - Focus on current sessions, sponsors, note capture, follow-ups
// Tools: ALL 8 tools available (partnerMatch, eventSponsorMatch, eventSessions, captureNote, scheduleFollowup, sendSMS, sendEmail, peerMatch)
// ================================================================
// VERIFIED DATABASE FIELDS:
// - ai_concierge_sessions.contractor_id (NOT contractorId)
// - ai_concierge_sessions.session_id (character varying)
// - ai_concierge_sessions.session_type (NO CHECK constraint - can use 'event')
// - ai_concierge_sessions.session_status (NO CHECK constraint)
// - ai_concierge_sessions.session_data (text type)
// - ai_concierge_sessions.started_at (timestamp without time zone)
// - contractors.focus_areas (TEXT type - stored as JSON string, MUST parse)
// - contractors.business_goals (JSONB type - already JSON, do NOT parse)
// ================================================================

const { ChatOpenAI } = require('@langchain/openai');
const { StateGraph, MessagesAnnotation } = require('@langchain/langgraph');
const { MemorySaver } = require('@langchain/langgraph');
const { query } = require('../../config/database');
const goalEngineService = require('../goalEngineService');
const { generateInternalGoalsPrompt } = require('../conversationContext');

// Phase 3: LangSmith tracing
const { Client } = require('langsmith');
const langsmithClient = process.env.LANGSMITH_API_KEY ? new Client({
  apiKey: process.env.LANGSMITH_API_KEY
}) : null;

// Import all 9 tools (5 original + 2 communication + 1 peer matching + 1 data confirmation)
const partnerMatchTool = require('./tools/partnerMatchTool');
const eventSponsorMatchTool = require('./tools/eventSponsorMatchTool');
const eventSessionsTool = require('./tools/eventSessionsTool');
const captureNoteTool = require('./tools/captureNoteTool');
const scheduleFollowupTool = require('./tools/scheduleFollowupTool');
const sendSMSTool = require('./tools/sendSMSTool');
const sendEmailTool = require('./tools/sendEmailTool');
const peerMatchTool = require('./tools/peerMatchTool');
const { updateContractorTimezoneTool } = require('./tools/updateContractorTimezoneTool');

// AI Concierge Identity - Four Pillars (Event Context Priority)
const EVENT_AGENT_SYSTEM_PROMPT = `You are the AI Concierge for The Power100 Experience - a HIGHLY PERSONALIZED, home improvement industry-specific intelligent assistant.

# Your Four Pillars:
1. **TPX Ecosystem Guide** - Navigate partners, books, podcasts, events
2. **Event Orchestrator** - Real-time support at live events (PRIMARY FOCUS in Event Mode)
3. **Strategic Resource Matcher** - Connect contractors to verified partners
4. **Power100 Experience Navigator** - Maximize value from TPX platform

# What Makes You Special:
- You use FIRST-PARTY DATA from quarterly partner client feedback (PowerConfidence scores)
- You compare contractors to SIMILAR BUSINESSES in their revenue tier
- You know what WORKS based on actual data, not generic advice
- You're proactive - schedule follow-ups, anticipate needs, capture insights
- You understand their 12-18 month business goals intimately

# Event Mode Context:
- Focus on: Current sessions, sponsor recommendations, note capture, real-time guidance
- Temperature: 0.5 (precise, factual - zero hallucinations)
- Data Source: Phase 1 materialized views (mv_sessions_now, mv_sessions_next_60)
- You CAN still answer business questions (don't limit yourself to just event!)
- You're NOT limited by mode - you're "always the AI Concierge"

# Communication Style:
- Warm, professional, industry-specific (home improvement)
- Reference their business goals and focus areas naturally
- Use their name and company name when appropriate
- Be proactive with note capture and follow-up scheduling
- During events: Emphasize actionable, real-time information

# Tools Available:
- partner_match: Find strategic partners (yes, even during events!)
- event_sponsor_match: Recommend sponsors at THIS event with booth locations
- get_event_sessions: Show what's happening NOW or coming up next (zero hallucinations)
- capture_event_note: Capture insights, action items, observations during event
- schedule_followup: Schedule post-event recaps, surveys, follow-ups
- send_sms: Send SMS messages to contractors for urgent or time-sensitive information
- send_email: Send emails to contractors with detailed information, resources, or follow-ups
- find_peer_matches: Connect contractors with valuable peer networking opportunities at events
- update_contractor_timezone: Update contractor's timezone after they confirm or correct it

# Event Mode Best Practices:
- Capture notes proactively when contractor shares insights
- Recommend sponsors with specific booth numbers and talking points
- Schedule post-event follow-ups (recap, survey, partner introductions)
- Use lower temperature for factual accuracy (no guessing session times!)
- Proactively suggest peer matches for networking opportunities
- Check existing peer matches first before finding new ones
- Explain WHY peer matches would be valuable (based on match scores and reasons)

# Data Confirmation Protocol:
- ALWAYS confirm timezone before scheduling time-based actions
- When contractor confirms or corrects data, use update tools to ensure accuracy
- Never assume - always verify critical information like timezone, contact details, preferences

Remember: To the contractor, you're always "the AI Concierge" - event context is ADDITIVE, not limiting.`;

/**
 * Create AI Concierge Event Agent
 * Temperature: 0.5 (precise, factual for event data)
 * @param {number} contractorId - Optional contractor ID to inject internal goals
 */
function createEventAgent(contractorId = null) {
  console.log('[AI Concierge Event] Creating agent with all 8 tools (including SMS/Email/Peer Matching)');

  // Initialize ChatOpenAI model with LangSmith tracing and token usage tracking
  const modelConfig = {
    modelName: 'gpt-4',
    temperature: 0.5, // Lower temperature for factual event information
    openAIApiKey: process.env.OPENAI_API_KEY,
    streamUsage: true, // Enable token usage tracking
    streaming: false    // We don't need streaming, just token counts
  };

  // LangSmith tracing check
  if (process.env.LANGCHAIN_TRACING_V2 === 'true') {
    console.log('[AI Concierge Event] ✅ LangSmith tracing enabled');
    console.log(`[AI Concierge Event] 📊 Project: ${process.env.LANGCHAIN_PROJECT}`);
  } else {
    console.log('[AI Concierge Event] ⚠️  LangSmith tracing disabled');
  }

  const model = new ChatOpenAI(modelConfig);

  // Bind all 9 tools to model (Event Mode has access to ALL tools including SMS/Email/Peer Matching/Data Updates)
  const modelWithTools = model.bindTools([
    partnerMatchTool,
    eventSponsorMatchTool,
    eventSessionsTool,
    captureNoteTool,
    scheduleFollowupTool,
    sendSMSTool,
    sendEmailTool,
    peerMatchTool,
    updateContractorTimezoneTool
  ]);

  // Define agent function with dynamic system prompt
  async function callModel(state) {
    const { messages } = state;

    // Build dynamic system prompt with internal goals (if contractorId provided)
    let systemPrompt = EVENT_AGENT_SYSTEM_PROMPT;

    if (contractorId) {
      try {
        // Fetch internal goals and checklist for this contractor
        const internalGoals = await goalEngineService.getActiveGoals(contractorId);
        const internalChecklist = await goalEngineService.getActiveChecklist(contractorId);

        // Generate and append internal goals section to system prompt
        const goalsSection = generateInternalGoalsPrompt(internalGoals, internalChecklist);
        if (goalsSection) {
          systemPrompt += goalsSection;
          console.log(`[AI Concierge Event] ✅ Injected ${internalGoals.length} goals and ${internalChecklist.length} checklist items into system prompt`);
        }
      } catch (error) {
        console.error('[AI Concierge Event] ⚠️  Failed to inject internal goals:', error.message);
        // Continue without goals - don't break the conversation
      }
    }

    const response = await modelWithTools.invoke([
      { role: 'system', content: systemPrompt },
      ...messages
    ]);
    return { messages: [response] };
  }

  // Create state graph
  const workflow = new StateGraph(MessagesAnnotation)
    .addNode('agent', callModel)
    .addEdge('__start__', 'agent')
    .addEdge('agent', '__end__');

  // Compile with memory
  const checkpointer = new MemorySaver();
  const agent = workflow.compile({ checkpointer });

  console.log('[AI Concierge Event] Agent created successfully');
  return agent;
}

/**
 * Log agent session to database
 * Uses DATABASE VERIFIED field names
 */
async function logSession(contractorId, sessionId, eventId, sessionData) {
  try {
    const insertQuery = `
      INSERT INTO ai_concierge_sessions (
        contractor_id,           -- DATABASE VERIFIED
        session_id,              -- DATABASE VERIFIED
        session_type,            -- DATABASE VERIFIED (NO CHECK constraint)
        session_status,          -- DATABASE VERIFIED (NO CHECK constraint)
        session_data,            -- DATABASE VERIFIED (text type)
        started_at               -- DATABASE VERIFIED (timestamp)
      ) VALUES ($1, $2, 'event', 'active', $3, NOW())
      RETURNING id
    `;

    // Include event context in session_data
    const dataWithEvent = {
      ...sessionData,
      eventId
    };

    const result = await query(insertQuery, [
      contractorId,
      sessionId,
      JSON.stringify(dataWithEvent)
    ]);

    console.log(`[AI Concierge Event] Session logged: ${result.rows[0].id} (event: ${eventId})`);
    return result.rows[0].id;
  } catch (error) {
    console.error('[AI Concierge Event] Failed to log session:', error);
    // Don't throw - session logging failure shouldn't break agent
  }
}

/**
 * Update session with end time
 */
async function endSession(sessionId) {
  try {
    const updateQuery = `
      UPDATE ai_concierge_sessions
      SET
        ended_at = NOW(),                                          -- DATABASE VERIFIED
        duration_minutes = EXTRACT(EPOCH FROM (NOW() - started_at)) / 60,  -- DATABASE VERIFIED
        session_status = 'completed'                               -- DATABASE VERIFIED
      WHERE session_id = $1
      RETURNING id
    `;

    await query(updateQuery, [sessionId]);
    console.log(`[AI Concierge Event] Session ended: ${sessionId}`);
  } catch (error) {
    console.error('[AI Concierge Event] Failed to end session:', error);
  }
}

/**
 * Get contractor context for agent (with event context)
 * Uses DATABASE VERIFIED field names
 */
async function getContractorContext(contractorId, eventId = null) {
  try {
    const contractorQuery = `
      SELECT
        id,
        first_name,        -- DATABASE VERIFIED
        last_name,         -- DATABASE VERIFIED
        email,             -- DATABASE VERIFIED
        company_name,      -- DATABASE VERIFIED
        focus_areas,       -- DATABASE VERIFIED (TEXT type - JSON string)
        revenue_tier,      -- DATABASE VERIFIED
        team_size,         -- DATABASE VERIFIED
        business_goals     -- DATABASE VERIFIED (JSONB type)
      FROM contractors
      WHERE id = $1
    `;

    const result = await query(contractorQuery, [contractorId]);

    if (result.rows.length === 0) {
      throw new Error(`Contractor ${contractorId} not found`);
    }

    const contractor = result.rows[0];

    // Parse focus_areas (TEXT type stored as JSON string)
    let focusAreas = [];
    if (contractor.focus_areas) {
      try {
        focusAreas = JSON.parse(contractor.focus_areas);
      } catch (e) {
        // Fallback to comma-separated parsing
        focusAreas = contractor.focus_areas.split(',').map(area => area.trim());
      }
    }

    // business_goals is already JSONB - no parsing needed
    const businessGoals = contractor.business_goals || {};

    const context = {
      id: contractor.id,
      firstName: contractor.first_name,
      lastName: contractor.last_name,
      email: contractor.email,
      companyName: contractor.company_name,
      focusAreas,
      revenueTier: contractor.revenue_tier,
      teamSize: contractor.team_size,
      businessGoals
    };

    // Add event context if provided
    if (eventId) {
      context.eventId = eventId;
      context.isAtEvent = true;
    }

    return context;
  } catch (error) {
    console.error('[AI Concierge Event] Failed to get contractor context:', error);
    throw error;
  }
}

module.exports = {
  createEventAgent,
  logSession,
  endSession,
  getContractorContext
};
