// DATABASE-CHECKED: ai_concierge_sessions, contractors, ai_learning_events verified October 13, 2025
// ================================================================
// AI Concierge (Standard Mode) Agent
// ================================================================
// Purpose: Highly personalized, home improvement industry-specific intelligent assistant
// Mode: Standard (non-event) - Focus on business goals, partner connections, resources
// Tools: ALL 5 tools available (partnerMatch, eventSponsorMatch, eventSessions, captureNote, scheduleFollowup)
// ================================================================
// VERIFIED DATABASE FIELDS:
// - ai_concierge_sessions.contractor_id (NOT contractorId)
// - ai_concierge_sessions.session_id (character varying)
// - ai_concierge_sessions.session_type (NO CHECK constraint - can use 'standard')
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

// Phase 3: LangSmith tracing
const { Client } = require('langsmith');
const langsmithClient = process.env.LANGSMITH_API_KEY ? new Client({
  apiKey: process.env.LANGSMITH_API_KEY
}) : null;

// Import all 5 tools
const partnerMatchTool = require('./tools/partnerMatchTool');
const eventSponsorMatchTool = require('./tools/eventSponsorMatchTool');
const eventSessionsTool = require('./tools/eventSessionsTool');
const captureNoteTool = require('./tools/captureNoteTool');
const scheduleFollowupTool = require('./tools/scheduleFollowupTool');

// AI Concierge Identity - Four Pillars
const STANDARD_AGENT_SYSTEM_PROMPT = `You are the AI Concierge for The Power100 Experience - a HIGHLY PERSONALIZED, home improvement industry-specific intelligent assistant.

# Your Four Pillars:
1. **TPX Ecosystem Guide** - Navigate partners, books, podcasts, events
2. **Event Orchestrator** - Support contractors at live events (even in Standard Mode)
3. **Strategic Resource Matcher** - Connect contractors to verified partners
4. **Power100 Experience Navigator** - Maximize value from TPX platform

# What Makes You Special:
- You use FIRST-PARTY DATA from quarterly partner client feedback (PowerConfidence scores)
- You compare contractors to SIMILAR BUSINESSES in their revenue tier
- You know what WORKS based on actual data, not generic advice
- You're proactive - schedule follow-ups, anticipate needs, suggest resources
- You understand their 12-18 month business goals intimately

# Standard Mode Context:
- Focus on: Business goals, partner connections, resource recommendations
- Temperature: 0.7 (warm, conversational, strategic)
- You CAN answer event questions if asked (don't refuse - you have the tools!)
- You're NOT limited by mode - you're "always the AI Concierge"

# Communication Style:
- Warm, professional, industry-specific (home improvement)
- Reference their business goals and focus areas naturally
- Use their name and company name when appropriate
- Be proactive with follow-ups and recommendations

# Tools Available:
- partner_match: Find strategic partners matching their business needs
- event_sponsor_match: Recommend sponsors at events (yes, even in Standard Mode!)
- get_event_sessions: Show what's happening at events right now
- capture_event_note: Capture insights, action items, observations
- schedule_followup: Schedule proactive check-ins, reminders, resource recommendations

Remember: To the contractor, you're always "the AI Concierge" - not limited by mode.`;

/**
 * Create AI Concierge Standard Agent
 * Temperature: 0.7 (strategic, conversational)
 */
function createStandardAgent() {
  console.log('[AI Concierge Standard] Creating agent with all 5 tools');

  // Initialize ChatOpenAI model with LangSmith tracing
  const modelConfig = {
    modelName: 'gpt-4',
    temperature: 0.7, // Warmer for strategic conversations
    openAIApiKey: process.env.OPENAI_API_KEY
  };

  // LangSmith tracing check
  if (process.env.LANGCHAIN_TRACING_V2 === 'true') {
    console.log('[AI Concierge Standard] ✅ LangSmith tracing enabled');
    console.log(`[AI Concierge Standard] 📊 Project: ${process.env.LANGCHAIN_PROJECT}`);
  } else {
    console.log('[AI Concierge Standard] ⚠️  LangSmith tracing disabled');
  }

  const model = new ChatOpenAI(modelConfig);

  // Bind all 5 tools to model (Standard Mode has access to ALL tools)
  const modelWithTools = model.bindTools([
    partnerMatchTool,
    eventSponsorMatchTool,
    eventSessionsTool,
    captureNoteTool,
    scheduleFollowupTool
  ]);

  // Define agent function
  async function callModel(state) {
    const { messages } = state;
    const response = await modelWithTools.invoke([
      { role: 'system', content: STANDARD_AGENT_SYSTEM_PROMPT },
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

  console.log('[AI Concierge Standard] Agent created successfully');
  return agent;
}

/**
 * Log agent session to database
 * Uses DATABASE VERIFIED field names
 */
async function logSession(contractorId, sessionId, sessionData) {
  try {
    const insertQuery = `
      INSERT INTO ai_concierge_sessions (
        contractor_id,           -- DATABASE VERIFIED
        session_id,              -- DATABASE VERIFIED
        session_type,            -- DATABASE VERIFIED (NO CHECK constraint)
        session_status,          -- DATABASE VERIFIED (NO CHECK constraint)
        session_data,            -- DATABASE VERIFIED (text type)
        started_at               -- DATABASE VERIFIED (timestamp)
      ) VALUES ($1, $2, 'standard', 'active', $3, NOW())
      RETURNING id
    `;

    const result = await query(insertQuery, [
      contractorId,
      sessionId,
      JSON.stringify(sessionData)
    ]);

    console.log(`[AI Concierge Standard] Session logged: ${result.rows[0].id}`);
    return result.rows[0].id;
  } catch (error) {
    console.error('[AI Concierge Standard] Failed to log session:', error);
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
    console.log(`[AI Concierge Standard] Session ended: ${sessionId}`);
  } catch (error) {
    console.error('[AI Concierge Standard] Failed to end session:', error);
  }
}

/**
 * Get contractor context for agent
 * Uses DATABASE VERIFIED field names
 */
async function getContractorContext(contractorId) {
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

    return {
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
  } catch (error) {
    console.error('[AI Concierge Standard] Failed to get contractor context:', error);
    throw error;
  }
}

module.exports = {
  createStandardAgent,
  logSession,
  endSession,
  getContractorContext
};
