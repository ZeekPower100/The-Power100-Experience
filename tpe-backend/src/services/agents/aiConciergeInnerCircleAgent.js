// DATABASE-CHECKED: inner_circle_members, ai_concierge_sessions verified 2026-02-16
// ================================================================
// AI Concierge (Inner Circle Mode) Agent
// ================================================================
// Purpose: Personalized coaching and guidance for Inner Circle members
// Mode: Inner Circle — Focus on onboarding, PowerMoves, content, partner gating
// Tools: updateMemberProfile, recommendContent, partnerMatch, captureNote,
//        scheduleFollowup, sendEmail, sendSMS, webSearch
// ================================================================
// VERIFIED DATABASE FIELDS:
// - inner_circle_members.id (PK)
// - inner_circle_members.name, email
// - inner_circle_members.business_type, revenue_tier, team_size
// - inner_circle_members.focus_areas (TEXT[])
// - inner_circle_members.onboarding_complete (BOOLEAN)
// - inner_circle_members.onboarding_data (JSONB)
// - inner_circle_members.coaching_preferences (JSONB)
// - inner_circle_members.partner_recommendation_unlocked (BOOLEAN)
// - inner_circle_members.power_moves_active (INTEGER)
// - inner_circle_members.power_moves_completed (INTEGER)
// - inner_circle_members.content_interactions (JSONB)
// - inner_circle_members.ai_summary (TEXT)
// - inner_circle_members.membership_status (VARCHAR)
// - ai_concierge_sessions.member_id (FK to inner_circle_members)
// ================================================================

const { ChatOpenAI } = require('@langchain/openai');
const { StateGraph, MessagesAnnotation } = require('@langchain/langgraph');
const { MemorySaver } = require('@langchain/langgraph');
const { getMemberProfile } = require('../memberScopedQuery');
const skillLoader = require('../skillLoaderService');
const { query } = require('../../config/database');

// Phase 3: LangSmith tracing
const { Client } = require('langsmith');
const langsmithClient = process.env.LANGSMITH_API_KEY ? new Client({
  apiKey: process.env.LANGSMITH_API_KEY
}) : null;

// Inner Circle-specific tools
const updateMemberProfileTool = require('./tools/updateMemberProfileTool');
const recommendContentTool = require('./tools/recommendContentTool');

// Shared tools (reused from Standard Agent)
const partnerMatchTool = require('./tools/partnerMatchTool');
const captureNoteTool = require('./tools/captureNoteTool');
const scheduleFollowupTool = require('./tools/scheduleFollowupTool');
const sendSMSTool = require('./tools/sendSMSTool');
const sendEmailTool = require('./tools/sendEmailTool');
const webSearchTool = require('./tools/webSearchTool');

// Base system prompt — skills and member context are appended dynamically
const INNER_CIRCLE_AGENT_SYSTEM_PROMPT = `You are the AI Concierge for The Power100 Experience Inner Circle — a personalized business coach and guide for free membership portal members.

# Your Identity
You are warm, encouraging, and action-oriented. You speak like a trusted mentor who genuinely cares about each member's success. You are NOT a generic chatbot — you know this member's business, goals, and progress intimately.

# Your Role
1. **Onboarding Guide** — Help new members set up their profile and understand the Inner Circle
2. **PowerMove Coach** — Guide members in creating and achieving 60-day fiscal milestones
3. **Resource Navigator** — Recommend books, podcasts, and content tied to their goals
4. **Partner Connector** — Connect members with verified partners (ONLY when unlocked and relevant)
5. **Accountability Partner** — Check in on progress, celebrate wins, provide encouragement

# The Four Pillars of PowerMoves
Members create PowerMoves tied to one of these pillars:
- **Growth** — Revenue, sales, marketing, customer acquisition
- **Culture** — Team building, hiring, leadership, company values
- **Community** — Networking, partnerships, industry involvement
- **Innovation** — Technology, processes, new services, efficiency

# Communication Style
- Use their first name naturally
- Be conversational, not corporate — "That's awesome!" not "Acknowledged."
- Reference their specific goals and PowerMoves
- Celebrate every win, no matter how small
- When they're stuck, break things down into small, actionable steps
- Be proactive — suggest next steps, don't just answer questions

# Tools Available
- update_member_profile: Save member data (onboarding answers, preferences, partner unlock)
- recommend_content: Find books, podcasts, and resources matching their goals
- partner_match: Find strategic partners (ONLY if partner_recommendation_unlocked = true)
- capture_event_note: Capture insights and action items
- schedule_followup: Schedule proactive check-ins and reminders
- send_sms: Send SMS for time-sensitive updates
- send_email: Send emails with detailed resources or follow-ups
- web_search: Supplement knowledge with real-time web search (DATABASE-FIRST ONLY!)

# Partner Gating Rules (CRITICAL)
- Check context for partner_recommendation_unlocked status
- If FALSE: Do NOT recommend partners. Guide member toward creating a PowerMove first.
- If TRUE: Only recommend partners when genuinely tied to their active PowerMove goals.
- Auto-unlock: When member creates their first PowerMove, use update_member_profile to set partner_recommendation_unlocked = true

# Database-First Strategy
- ALWAYS check member context and database FIRST before web search
- Only use web_search if internal data is insufficient
- Present database data prominently, web results as supplemental`;

/**
 * Get full member context for system prompt injection
 * @param {number} memberId
 * @returns {Promise<object|null>} Member context for prompt injection
 */
async function getMemberContext(memberId) {
  try {
    const member = await getMemberProfile(memberId);
    if (!member) return null;

    return {
      id: member.id,
      name: member.name,
      email: member.email,
      businessType: member.business_type,
      revenueTier: member.revenue_tier,
      teamSize: member.team_size,
      focusAreas: member.focus_areas || [],
      onboardingComplete: member.onboarding_complete || false,
      onboardingData: member.onboarding_data || {},
      coachingPreferences: member.coaching_preferences || {},
      partnerUnlocked: member.partner_recommendation_unlocked || false,
      powerMovesActive: member.power_moves_active || [],
      powerMovesCompleted: member.power_moves_completed || 0,
      contentInteractions: member.content_interactions || {},
      aiSummary: member.ai_summary || null,
      membershipStatus: member.membership_status || 'active'
    };
  } catch (error) {
    console.error('[AI Concierge Inner Circle] Failed to get member context:', error.message);
    return null;
  }
}

/**
 * Build the member context section for system prompt injection
 * @param {object} memberCtx - Member context from getMemberContext
 * @returns {string} Formatted context section
 */
function buildMemberContextPrompt(memberCtx) {
  if (!memberCtx) return '';

  const sections = [];

  sections.push(`\n\n# Current Member Context`);
  sections.push(`- **Name**: ${memberCtx.name}`);
  sections.push(`- **Member ID**: ${memberCtx.id}`);
  sections.push(`- **Membership Status**: ${memberCtx.membershipStatus}`);

  if (memberCtx.onboardingComplete) {
    sections.push(`- **Onboarding**: Complete`);
    if (memberCtx.businessType) sections.push(`- **Business Type**: ${memberCtx.businessType}`);
    if (memberCtx.revenueTier) sections.push(`- **Revenue Tier**: ${memberCtx.revenueTier}`);
    if (memberCtx.teamSize) sections.push(`- **Team Size**: ${memberCtx.teamSize}`);
    if (memberCtx.focusAreas?.length > 0) {
      sections.push(`- **Focus Areas**: ${Array.isArray(memberCtx.focusAreas) ? memberCtx.focusAreas.join(', ') : memberCtx.focusAreas}`);
    }
  } else {
    sections.push(`- **Onboarding**: NOT COMPLETE — guide them through onboarding naturally`);
  }

  // PowerMove status
  const activeCount = Array.isArray(memberCtx.powerMovesActive) ? memberCtx.powerMovesActive.length : 0;
  sections.push(`- **Active PowerMoves**: ${activeCount}`);
  sections.push(`- **Completed PowerMoves**: ${memberCtx.powerMovesCompleted}`);

  // Partner gating
  sections.push(`- **Partner Recommendations**: ${memberCtx.partnerUnlocked ? 'UNLOCKED' : 'LOCKED (guide toward PowerMove first)'}`);

  // AI summary if available
  if (memberCtx.aiSummary) {
    sections.push(`\n## AI Summary of This Member`);
    sections.push(memberCtx.aiSummary);
  }

  return sections.join('\n');
}

/**
 * Create AI Concierge Inner Circle Agent
 * Temperature: 0.8 (warmer, more encouraging tone)
 * @param {number} memberId - Member ID for context injection
 */
function createInnerCircleAgent(memberId = null) {
  console.log('[AI Concierge Inner Circle] Creating agent with 8 tools');

  const modelConfig = {
    modelName: 'gpt-4',
    temperature: 0.8, // Warmer for coaching conversations
    openAIApiKey: process.env.OPENAI_API_KEY,
    streamUsage: true,
    streaming: false
  };

  // LangSmith tracing check
  if (process.env.LANGCHAIN_TRACING_V2 === 'true') {
    console.log('[AI Concierge Inner Circle] LangSmith tracing enabled');
    console.log(`[AI Concierge Inner Circle] Project: ${process.env.LANGCHAIN_PROJECT}`);
  }

  const model = new ChatOpenAI(modelConfig);

  // Bind all 8 tools
  const modelWithTools = model.bindTools([
    updateMemberProfileTool,
    recommendContentTool,
    partnerMatchTool,
    captureNoteTool,
    scheduleFollowupTool,
    sendSMSTool,
    sendEmailTool,
    webSearchTool
  ]);

  // Agent function with dynamic system prompt (skills + member context)
  async function callModel(state) {
    const { messages } = state;

    // 1. Start with base system prompt
    let systemPrompt = INNER_CIRCLE_AGENT_SYSTEM_PROMPT;

    // 2. Inject active skills from database
    try {
      const skillExtension = await skillLoader.buildPromptExtension('inner_circle');
      if (skillExtension) {
        systemPrompt += `\n\n${skillExtension}`;
        console.log('[AI Concierge Inner Circle] Injected skills into system prompt');
      }
    } catch (error) {
      console.error('[AI Concierge Inner Circle] Failed to inject skills:', error.message);
    }

    // 3. Inject member context
    if (memberId) {
      try {
        const memberCtx = await getMemberContext(memberId);
        const memberSection = buildMemberContextPrompt(memberCtx);
        if (memberSection) {
          systemPrompt += memberSection;
          console.log(`[AI Concierge Inner Circle] Injected context for member ${memberId}`);
        }
      } catch (error) {
        console.error('[AI Concierge Inner Circle] Failed to inject member context:', error.message);
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

  console.log('[AI Concierge Inner Circle] Agent created successfully');
  return agent;
}

/**
 * Log Inner Circle session to database
 */
async function logSession(memberId, sessionId, sessionData) {
  try {
    const result = await query(`
      INSERT INTO ai_concierge_sessions (
        member_id,
        session_id,
        session_type,
        session_status,
        session_data,
        started_at
      ) VALUES ($1, $2, 'inner_circle', 'active', $3, NOW())
      ON CONFLICT (session_id) DO UPDATE SET
        session_data = EXCLUDED.session_data,
        updated_at = NOW()
      RETURNING id
    `, [
      memberId,
      sessionId,
      JSON.stringify(sessionData)
    ]);

    console.log(`[AI Concierge Inner Circle] Session logged: ${result.rows[0].id}`);
    return result.rows[0].id;
  } catch (error) {
    console.error('[AI Concierge Inner Circle] Failed to log session:', error.message);
  }
}

/**
 * End Inner Circle session
 */
async function endSession(sessionId) {
  try {
    await query(`
      UPDATE ai_concierge_sessions
      SET
        ended_at = NOW(),
        duration_minutes = EXTRACT(EPOCH FROM (NOW() - started_at)) / 60,
        session_status = 'completed'
      WHERE session_id = $1
      RETURNING id
    `, [sessionId]);

    console.log(`[AI Concierge Inner Circle] Session ended: ${sessionId}`);
  } catch (error) {
    console.error('[AI Concierge Inner Circle] Failed to end session:', error.message);
  }
}

module.exports = {
  createInnerCircleAgent,
  getMemberContext,
  buildMemberContextPrompt,
  logSession,
  endSession
};
