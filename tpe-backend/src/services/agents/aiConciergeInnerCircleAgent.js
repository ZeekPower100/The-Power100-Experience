// DATABASE-CHECKED: inner_circle_members, ai_concierge_sessions, power_moves, member_watch_history verified 2026-02-16
// ================================================================
// AI Concierge (Inner Circle Mode) Agent — Phase 2
// ================================================================
// Purpose: Personalized coaching and guidance for Inner Circle members
// Mode: Inner Circle — Focus on onboarding, PowerMoves, content, partner gating
// Tools (10): updateMemberProfile, recommendContent, managePowerMove,
//             powerMoveCheckin, partnerMatch, captureNote,
//             scheduleFollowup, sendEmail, sendSMS, webSearch
// ================================================================
// VERIFIED DATABASE FIELDS:
// - inner_circle_members.id (PK)
// - inner_circle_members.name, email
// - inner_circle_members.business_type, revenue_tier, team_size
// - inner_circle_members.focus_areas (JSONB)
// - inner_circle_members.onboarding_complete (BOOLEAN)
// - inner_circle_members.onboarding_data (JSONB)
// - inner_circle_members.coaching_preferences (JSONB)
// - inner_circle_members.partner_recommendation_unlocked (BOOLEAN)
// - inner_circle_members.power_moves_active (JSONB)
// - inner_circle_members.power_moves_completed (INTEGER)
// - inner_circle_members.content_interactions (JSONB)
// - inner_circle_members.ai_summary (TEXT)
// - inner_circle_members.ai_engagement_score (NUMERIC)
// - inner_circle_members.membership_status (VARCHAR)
// - ai_concierge_sessions.member_id (FK to inner_circle_members)
// - power_moves.* (Phase 2)
// - member_watch_history.* (Phase 2)
// ================================================================

const { ChatOpenAI } = require('@langchain/openai');
const { StateGraph, MessagesAnnotation } = require('@langchain/langgraph');
const { MemorySaver } = require('@langchain/langgraph');
const { ToolNode } = require('@langchain/langgraph/prebuilt');
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
const managePowerMoveTool = require('./tools/managePowerMoveTool');
const powerMoveCheckinTool = require('./tools/powerMoveCheckinTool');

// Shared tools (reused from Standard Agent)
const partnerMatchTool = require('./tools/partnerMatchTool');
const captureNoteTool = require('./tools/captureNoteTool');
const scheduleFollowupTool = require('./tools/scheduleFollowupTool');
const sendSMSTool = require('./tools/sendSMSTool');
const sendEmailTool = require('./tools/sendEmailTool');
const webSearchTool = require('./tools/webSearchTool');

// All tools array (used by both model binding and ToolNode)
const ALL_TOOLS = [
  updateMemberProfileTool,
  recommendContentTool,
  managePowerMoveTool,
  powerMoveCheckinTool,
  partnerMatchTool,
  captureNoteTool,
  scheduleFollowupTool,
  sendSMSTool,
  sendEmailTool,
  webSearchTool
];

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
- manage_power_move: Create, update, complete, or abandon PowerMoves
- power_move_checkin: Record weekly progress check-ins on active PowerMoves
- partner_match: Find strategic partners (ONLY if partner_recommendation_unlocked = true)
- capture_event_note: Capture insights and action items
- schedule_followup: Schedule proactive check-ins and reminders
- send_sms: Send SMS for time-sensitive updates
- send_email: Send emails with detailed resources or follow-ups
- web_search: Supplement knowledge with real-time web search (DATABASE-FIRST ONLY!)

# PowerMove Workflow
When a member wants to create a PowerMove:
1. Help them define it clearly (title, pillar, fiscal target, starting value, target value)
2. Use manage_power_move with action 'create' — this auto-unlocks partner recommendations
3. Generate an 8-week action plan and include it in the actionSteps parameter
4. Immediately respond with motivational recognition + the 8-week plan (Week 0 response)
5. Use power_move_checkin to record the Week 0 check-in
6. Schedule the first weekly check-in via schedule_followup

# Partner Gating Rules (CRITICAL)
- Check context for partner_recommendation_unlocked status
- If FALSE: Do NOT recommend partners. Guide member toward creating a PowerMove first.
- If TRUE: Only recommend partners when genuinely tied to their active PowerMove goals.
- Auto-unlock happens automatically when member creates their first PowerMove via manage_power_move

# Database-First Strategy
- ALWAYS check member context and database FIRST before web search
- Only use web_search if internal data is insufficient
- Present database data prominently, web results as supplemental`;

/**
 * Get full member context for system prompt injection
 * Includes watch history and active PowerMove details (Phase 2)
 * @param {number} memberId
 * @returns {Promise<object|null>} Member context for prompt injection
 */
async function getMemberContext(memberId) {
  try {
    const member = await getMemberProfile(memberId);
    if (!member) return null;

    // Phase 2: Fetch active PowerMoves with details
    let activePowerMoves = [];
    try {
      const pmResult = await query(`
        SELECT id, title, pillar, fiscal_target, starting_value, target_value,
               current_value, start_date, target_date, status, action_steps,
               total_checkins, last_checkin_date, streak_weeks, engagement_score
        FROM power_moves
        WHERE member_id = $1 AND status IN ('active', 'in_progress')
        ORDER BY created_at DESC
      `, [memberId]);
      activePowerMoves = pmResult.rows;
    } catch (e) {
      console.error('[AI Concierge Inner Circle] Failed to fetch PowerMoves:', e.message);
    }

    // Phase 2: Fetch recent watch history (last 30 days)
    let recentWatchHistory = [];
    try {
      const whResult = await query(`
        SELECT mwh.content_id, mwh.content_type, mwh.watch_progress, mwh.completed,
               mwh.last_watched_at, mwh.source,
               COALESCE(vc.title, pe.title) as title,
               COALESCE(vc.ai_summary, pe.ai_summary) as ai_summary,
               s.name as show_name
        FROM member_watch_history mwh
        LEFT JOIN video_content vc ON mwh.content_id = vc.id AND mwh.content_type = 'video'
        LEFT JOIN podcast_episodes pe ON mwh.content_id = pe.id AND mwh.content_type = 'podcast'
        LEFT JOIN shows s ON mwh.show_id = s.id
        WHERE mwh.member_id = $1 AND mwh.last_watched_at > NOW() - INTERVAL '30 days'
        ORDER BY mwh.last_watched_at DESC
        LIMIT 10
      `, [memberId]);
      recentWatchHistory = whResult.rows;
    } catch (e) {
      console.error('[AI Concierge Inner Circle] Failed to fetch watch history:', e.message);
    }

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
      aiEngagementScore: member.ai_engagement_score || 0,
      membershipStatus: member.membership_status || 'active',
      // Phase 2 additions
      activePowerMoves,
      recentWatchHistory
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
  sections.push(`- **Engagement Score**: ${memberCtx.aiEngagementScore}/100`);

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

  // Phase 2: Active PowerMove details
  if (memberCtx.activePowerMoves && memberCtx.activePowerMoves.length > 0) {
    sections.push(`\n## Active PowerMoves`);
    for (const pm of memberCtx.activePowerMoves) {
      const daysLeft = Math.ceil((new Date(pm.target_date) - new Date()) / (1000 * 60 * 60 * 24));
      const daysSinceCheckin = pm.last_checkin_date
        ? Math.floor((new Date() - new Date(pm.last_checkin_date)) / (1000 * 60 * 60 * 24))
        : null;

      sections.push(`### ${pm.title} (ID: ${pm.id})`);
      sections.push(`- Pillar: ${pm.pillar}`);
      if (pm.fiscal_target) sections.push(`- Target: ${pm.fiscal_target}`);
      if (pm.starting_value && pm.target_value) {
        sections.push(`- Progress: ${pm.starting_value} → ${pm.current_value || pm.starting_value} → ${pm.target_value}`);
      }
      sections.push(`- Days remaining: ${daysLeft}`);
      sections.push(`- Check-ins: ${pm.total_checkins || 0} | Streak: ${pm.streak_weeks || 0} weeks`);
      if (daysSinceCheckin !== null) {
        sections.push(`- Last check-in: ${daysSinceCheckin} day${daysSinceCheckin !== 1 ? 's' : ''} ago`);
        if (daysSinceCheckin >= 7) sections.push(`- **OVERDUE FOR CHECK-IN** — reach out proactively!`);
      }

      // Show current week's action step
      if (pm.action_steps && pm.action_steps.length > 0) {
        const daysSinceStart = Math.floor((new Date() - new Date(pm.start_date)) / (1000 * 60 * 60 * 24));
        const currentWeek = Math.floor(daysSinceStart / 7);
        const currentStep = pm.action_steps.find(s => s.week === currentWeek);
        if (currentStep) {
          sections.push(`- **This week's planned action (Week ${currentWeek})**: ${currentStep.action} [${currentStep.status}]`);
        }
      }
    }
  }

  // Partner gating
  sections.push(`\n- **Partner Recommendations**: ${memberCtx.partnerUnlocked ? 'UNLOCKED' : 'LOCKED (guide toward PowerMove first)'}`);

  // Phase 2: Recent watch history
  if (memberCtx.recentWatchHistory && memberCtx.recentWatchHistory.length > 0) {
    sections.push(`\n## Recent Watch History (Last 30 Days)`);
    for (const w of memberCtx.recentWatchHistory) {
      const daysAgo = Math.floor((new Date() - new Date(w.last_watched_at)) / (1000 * 60 * 60 * 24));
      const status = w.completed ? '100% complete' : `${w.watch_progress}%`;
      const showLabel = w.show_name ? ` (${w.show_name})` : '';
      sections.push(`- "${w.title}"${showLabel} — ${status}, ${daysAgo} day${daysAgo !== 1 ? 's' : ''} ago`);
    }
    sections.push(`Use this to: reference content they've watched, avoid recommending completed content, nudge partially-watched content.`);
  }

  // AI summary if available
  if (memberCtx.aiSummary) {
    sections.push(`\n## AI Summary of This Member`);
    sections.push(memberCtx.aiSummary);
  }

  return sections.join('\n');
}

/**
 * Routing function: determines if we should call tools or end
 */
function shouldContinue(state) {
  const lastMessage = state.messages[state.messages.length - 1];
  // If the model returned tool calls, route to the tools node
  if (lastMessage.tool_calls && lastMessage.tool_calls.length > 0) {
    return 'tools';
  }
  // Otherwise, end the conversation turn
  return '__end__';
}

/**
 * Create AI Concierge Inner Circle Agent
 * Temperature: 0.8 (warmer, more encouraging tone)
 * Includes tool execution loop (Phase 2 fix)
 * @param {number} memberId - Member ID for context injection
 */
function createInnerCircleAgent(memberId = null) {
  console.log(`[AI Concierge Inner Circle] Creating agent with ${ALL_TOOLS.length} tools`);

  const modelConfig = {
    modelName: 'gpt-4o',
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

  // Bind all tools to the model
  const modelWithTools = model.bindTools(ALL_TOOLS);

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

    // 3. Inject member context (includes PowerMoves + watch history)
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

  // Create tool execution node
  const toolNode = new ToolNode(ALL_TOOLS);

  // Create state graph WITH tool execution loop
  const workflow = new StateGraph(MessagesAnnotation)
    .addNode('agent', callModel)
    .addNode('tools', toolNode)
    .addEdge('__start__', 'agent')
    .addConditionalEdges('agent', shouldContinue)
    .addEdge('tools', 'agent');

  // Compile with memory
  const checkpointer = new MemorySaver();
  const agent = workflow.compile({ checkpointer });

  console.log('[AI Concierge Inner Circle] Agent created successfully with tool execution loop');
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
