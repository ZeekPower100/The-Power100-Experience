// DATABASE-CHECKED: power_rankings_db (companies, communications, account_notes, account_tasks, company_intel, users) verified 2026-03-15
// ================================================================
// AI Concierge (Rankings Rep Mode) Agent
// ================================================================
// Purpose: Sales enablement AI for Rankings System sales reps
// Mode: Rankings Rep — Account research, outreach scripts, objection handling
// Tools (11): getAccountProfile, getCompanyIntel, getCommunicationHistory,
//             recommendNextAction, generateTalkingPoints, logCommunication,
//             createTask, createNote, webSearch, sendEmail, sendSMS
// ================================================================
// RANKINGS DATABASE TABLES USED:
// - companies (76 columns, scored/ranked)
// - communications (17 columns, call/email/sms logs)
// - account_notes (7 columns, manual + AI notes)
// - account_tasks (11 columns, follow-ups + AI tasks)
// - company_intel (9 columns, news/social/expansions)
// - users (9 columns, rep profiles)
// - user_pillar_assignments (FK to pillars)
// - pillars (12 columns, market segments)
// ================================================================

const { ChatOpenAI } = require('@langchain/openai');
const { StateGraph, MessagesAnnotation } = require('@langchain/langgraph');
const { MemorySaver } = require('@langchain/langgraph');
const { ToolNode } = require('@langchain/langgraph/prebuilt');
const rankingsDbService = require('../rankingsDbService');
const skillLoader = require('../skillLoaderService');

// Rankings-specific tools
const getAccountProfileTool = require('./tools/rankings/getAccountProfileTool');
const getCompanyIntelTool = require('./tools/rankings/getCompanyIntelTool');
const getCommunicationHistoryTool = require('./tools/rankings/getCommunicationHistoryTool');
const recommendNextActionTool = require('./tools/rankings/recommendNextActionTool');
const generateTalkingPointsTool = require('./tools/rankings/generateTalkingPointsTool');
const logCommunicationTool = require('./tools/rankings/logCommunicationTool');
const createTaskTool = require('./tools/rankings/createTaskTool');
const createNoteTool = require('./tools/rankings/createNoteTool');

// Shared tools (reused from existing tools)
const webSearchTool = require('./tools/webSearchTool');
const sendEmailTool = require('./tools/sendEmailTool');
const sendSMSTool = require('./tools/sendSMSTool');

// All tools array
const ALL_TOOLS = [
  getAccountProfileTool,
  getCompanyIntelTool,
  getCommunicationHistoryTool,
  recommendNextActionTool,
  generateTalkingPointsTool,
  logCommunicationTool,
  createTaskTool,
  createNoteTool,
  webSearchTool,
  sendEmailTool,
  sendSMSTool
];

// Base system prompt — skills and account context are appended dynamically
const RANKINGS_REP_AGENT_SYSTEM_PROMPT = `You are the Power100 AI Sales Assistant — an intelligent sales enablement tool for home improvement industry account executives.

# Your Identity
You are professional, data-driven, and action-oriented. You speak like an experienced sales strategist who helps reps close deals and build relationships. You are NOT a generic chatbot — you know the account data, communication history, and industry context intimately.

# Your Role
1. **Account Researcher** — Provide comprehensive account intelligence and company profiles
2. **Outreach Strategist** — Generate personalized call scripts, emails, and SMS messages
3. **Sales Coach** — Recommend next actions, handle objections, and optimize outreach cadence
4. **Activity Logger** — Record communications, create tasks, and maintain account notes
5. **Intel Analyst** — Surface relevant company news, expansions, and opportunities

# The Power100 Ranking System Context
The Power100 Ranking System scores and ranks home improvement companies across market pillars (roofing, HVAC, plumbing, etc.). Sales reps work assigned pillars, reaching out to highly-ranked companies to offer Power100 services and partnerships.

Key concepts:
- **Pillars**: Market segments (e.g., roofing, HVAC, plumbing, windows/doors)
- **Score/Rank Grade**: Composite score based on reviews, revenue, tenure, employees, community involvement
- **Scoring Factors**: Individual breakdowns (review_score, revenue_score, tenure_score, etc.)
- **is_client**: Whether the company is already a Power100 client
- **is_hip200**: Whether the company is in the HIP 200 list

# Communication Style
- Be concise and professional — reps are busy
- Lead with actionable insights, not filler
- Reference specific data points (score, revenue, review count) to make outreach credible
- When generating scripts, make them natural — not robotic
- Use the CEO's name when available
- Frame everything around value to the prospect

# Tools Available
- get_account_profile: Full company profile with scoring from rankings DB
- get_company_intel: Recent news, social activity, expansions
- get_communication_history: All calls, emails, SMS with the account
- recommend_next_action: AI-recommended next step with reasoning
- generate_talking_points: Personalized conversation starters using intel
- log_communication: Record a call, email, or SMS after it happens
- create_task: Create follow-up tasks for the account
- create_note: Save account notes (manual or AI-generated)
- web_search: Real-time web search for supplemental intel
- send_email: Send emails on behalf of the rep
- send_sms: Send SMS messages

# Workflow Patterns

## Account Briefing
When asked to brief on an account:
1. Fetch account profile (get_account_profile)
2. Fetch company intel (get_company_intel)
3. Fetch communication history (get_communication_history)
4. Recommend next action (recommend_next_action)
5. Present a structured briefing with key metrics, recent activity, intel highlights, and recommended action

## Call Preparation
When preparing for a call:
1. Generate talking points (generate_talking_points)
2. Review communication history for context
3. Present: opener, value proposition, potential objections, closing strategy

## After a Call/Email/SMS
When the rep reports completing an outreach:
1. Log the communication (log_communication)
2. Create follow-up task if needed (create_task)
3. Add any strategic notes (create_note)
4. Recommend the next step

# Data-First Strategy
- ALWAYS check rankings database FIRST before web search
- The rankings DB has rich company data — use it
- Only use web_search if DB intel is thin or stale
- Present DB data prominently, web results as supplemental`;

/**
 * Get rep context for system prompt injection
 * @param {number} userId - Rep user ID
 * @returns {Promise<object|null>}
 */
async function getRepContext(userId) {
  try {
    const rep = await rankingsDbService.getRepUser(userId);
    if (!rep) return null;

    return {
      id: rep.id,
      name: rep.full_name || rep.username,
      email: rep.email,
      role: rep.role,
      pillars: rep.pillars || []
    };
  } catch (error) {
    console.error('[AI Concierge Rankings Rep] Failed to get rep context:', error.message);
    return null;
  }
}

/**
 * Get company context for system prompt injection
 * @param {number} companyId - Company ID
 * @returns {Promise<object|null>}
 */
async function getCompanyContext(companyId) {
  try {
    const [company, comms, notes, intel, tasks] = await Promise.all([
      rankingsDbService.getCompany(companyId),
      rankingsDbService.getCompanyCommunications(companyId, 10),
      rankingsDbService.getCompanyNotes(companyId),
      rankingsDbService.getCompanyIntel(companyId),
      rankingsDbService.getCompanyTasks(companyId, null)
    ]);

    if (!company) return null;

    return { company, comms, notes, intel, tasks };
  } catch (error) {
    console.error('[AI Concierge Rankings Rep] Failed to get company context:', error.message);
    return null;
  }
}

/**
 * Build the company/rep context section for system prompt injection
 * @param {object} repCtx - Rep context
 * @param {object} companyCtx - Company context
 * @returns {string} Formatted context section
 */
function buildRankingsRepPrompt(repCtx, companyCtx) {
  const sections = [];

  // Rep context
  if (repCtx) {
    sections.push(`\n\n# Current Rep Context`);
    sections.push(`- **Rep Name**: ${repCtx.name}`);
    sections.push(`- **Rep ID**: ${repCtx.id}`);
    sections.push(`- **Role**: ${repCtx.role}`);
    if (repCtx.pillars && repCtx.pillars.length > 0) {
      sections.push(`- **Assigned Pillars**: ${repCtx.pillars.map(p => p.name).join(', ')}`);
    }
  }

  // Company context
  if (companyCtx && companyCtx.company) {
    const c = companyCtx.company;
    sections.push(`\n\n# Current Account Context`);
    sections.push(`- **Company**: ${c.company_name}`);
    sections.push(`- **Company ID**: ${c.id}`);
    sections.push(`- **Location**: ${c.city}, ${c.state}`);
    sections.push(`- **Status**: ${c.status} | Client: ${c.is_client ? 'Yes' : 'No'}`);

    if (c.ceo_name) sections.push(`- **CEO**: ${c.ceo_name}${c.ceo_title ? ` (${c.ceo_title})` : ''}`);
    if (c.score) sections.push(`- **Score**: ${c.score} | Grade: ${c.rank_grade || 'N/A'}`);
    if (c.estimated_revenue) sections.push(`- **Est. Revenue**: $${(c.estimated_revenue / 1000000).toFixed(1)}M`);
    if (c.employee_count_max) sections.push(`- **Employees**: ~${c.employee_count_max}`);
    if (c.rating) sections.push(`- **Google Rating**: ${c.rating} (${c.review_count} reviews)`);
    if (c.years_in_business) sections.push(`- **Years in Business**: ${c.years_in_business}`);
    if (c.pillar_name) sections.push(`- **Pillar**: ${c.pillar_name}`);
    if (c.website) sections.push(`- **Website**: ${c.website}`);

    // Communication summary
    if (companyCtx.comms && companyCtx.comms.length > 0) {
      const lastComm = companyCtx.comms[0];
      const daysAgo = Math.floor((Date.now() - new Date(lastComm.created_at).getTime()) / (1000 * 60 * 60 * 24));
      sections.push(`\n## Recent Communications (${companyCtx.comms.length} total)`);
      sections.push(`- Last contact: ${lastComm.comm_type} (${lastComm.direction}) — ${daysAgo} day${daysAgo !== 1 ? 's' : ''} ago`);
      for (const comm of companyCtx.comms.slice(0, 5)) {
        const commDate = new Date(comm.created_at).toLocaleDateString();
        sections.push(`  - ${commDate}: ${comm.comm_type} (${comm.direction})${comm.subject ? ` — ${comm.subject}` : ''}${comm.ai_summary ? ` | ${comm.ai_summary}` : ''}`);
      }
    } else {
      sections.push(`\n## Communications: None — this is an untouched account`);
    }

    // Intel
    if (companyCtx.intel && companyCtx.intel.length > 0) {
      sections.push(`\n## Recent Intel`);
      for (const item of companyCtx.intel.slice(0, 5)) {
        sections.push(`- [${item.intel_type}] ${item.title || item.content.substring(0, 100)}`);
      }
    }

    // Open tasks
    const openTasks = (companyCtx.tasks || []).filter(t => t.status === 'pending');
    if (openTasks.length > 0) {
      sections.push(`\n## Open Tasks (${openTasks.length})`);
      for (const task of openTasks.slice(0, 5)) {
        const dueLabel = task.due_date ? ` — due ${new Date(task.due_date).toLocaleDateString()}` : '';
        sections.push(`- [${task.priority}] ${task.title}${dueLabel}`);
      }
    }

    // Pinned notes
    const pinnedNotes = (companyCtx.notes || []).filter(n => n.is_pinned);
    if (pinnedNotes.length > 0) {
      sections.push(`\n## Pinned Notes`);
      for (const note of pinnedNotes) {
        sections.push(`- ${note.content.substring(0, 200)}`);
      }
    }
  }

  return sections.join('\n');
}

/**
 * Routing function: determines if we should call tools or end
 */
function shouldContinue(state) {
  const lastMessage = state.messages[state.messages.length - 1];
  if (lastMessage.tool_calls && lastMessage.tool_calls.length > 0) {
    return 'tools';
  }
  return '__end__';
}

/**
 * Create AI Concierge Rankings Rep Agent
 * Temperature: 0.4 (precise, professional — not warm like IC's 0.8)
 * @param {number} userId - Rep user ID
 * @param {number} companyId - Company ID being worked
 */
function createRankingsRepAgent(userId = null, companyId = null) {
  console.log(`[AI Concierge Rankings Rep] Creating agent with ${ALL_TOOLS.length} tools for rep ${userId}, company ${companyId}`);

  const modelConfig = {
    modelName: 'gpt-4o',
    temperature: 0.4, // Professional, precise — sales context
    openAIApiKey: process.env.OPENAI_API_KEY,
    streamUsage: true,
    streaming: false
  };

  if (process.env.LANGCHAIN_TRACING_V2 === 'true') {
    console.log('[AI Concierge Rankings Rep] LangSmith tracing enabled');
  }

  const model = new ChatOpenAI(modelConfig);
  const modelWithTools = model.bindTools(ALL_TOOLS);

  // Agent function with dynamic system prompt
  async function callModel(state) {
    const { messages } = state;

    let systemPrompt = RANKINGS_REP_AGENT_SYSTEM_PROMPT;

    // Inject skills
    try {
      const skillExtension = await skillLoader.buildPromptExtension('rankings_rep');
      if (skillExtension) {
        systemPrompt += `\n\n${skillExtension}`;
        console.log('[AI Concierge Rankings Rep] Injected skills into system prompt');
      }
    } catch (error) {
      console.error('[AI Concierge Rankings Rep] Failed to inject skills:', error.message);
    }

    // Inject rep + company context
    try {
      const repCtx = userId ? await getRepContext(userId) : null;
      const companyCtx = companyId ? await getCompanyContext(companyId) : null;
      const contextSection = buildRankingsRepPrompt(repCtx, companyCtx);
      if (contextSection) {
        systemPrompt += contextSection;
        console.log(`[AI Concierge Rankings Rep] Injected context for rep ${userId}, company ${companyId}`);
      }
    } catch (error) {
      console.error('[AI Concierge Rankings Rep] Failed to inject context:', error.message);
    }

    const response = await modelWithTools.invoke([
      { role: 'system', content: systemPrompt },
      ...messages
    ]);
    return { messages: [response] };
  }

  // Create tool execution node
  const toolNode = new ToolNode(ALL_TOOLS);

  // Create state graph with tool execution loop
  const workflow = new StateGraph(MessagesAnnotation)
    .addNode('agent', callModel)
    .addNode('tools', toolNode)
    .addEdge('__start__', 'agent')
    .addConditionalEdges('agent', shouldContinue)
    .addEdge('tools', 'agent');

  const checkpointer = new MemorySaver();
  const agent = workflow.compile({ checkpointer });

  console.log('[AI Concierge Rankings Rep] Agent created successfully with tool execution loop');
  return agent;
}

module.exports = {
  createRankingsRepAgent,
  getRepContext,
  getCompanyContext,
  buildRankingsRepPrompt
};
