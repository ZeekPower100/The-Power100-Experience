// DATABASE-CHECKED: power_rankings_db (companies, communications, users) verified 2026-03-15
// ================================================================
// Sales Agent Controller
// ================================================================
// Purpose: API controller for /api/sales-agent endpoints
// Handles: Rankings Rep Agent chat, briefings, email/SMS generation
// Agent: aiConciergeRankingsRepAgent (LangGraph, GPT-4o)
// ================================================================

const { v4: uuidv4 } = require('uuid');
const { createRankingsRepAgent } = require('../services/agents/aiConciergeRankingsRepAgent');
const rankingsDbService = require('../services/rankingsDbService');

// Agent cache — keyed by rep-company pair
const agentCache = new Map();

/**
 * Get or create a Rankings Rep Agent for a rep+company pair
 */
function getOrCreateAgent(userId, companyId) {
  const key = `srep-${userId}-${companyId}`;
  if (!agentCache.has(key)) {
    agentCache.set(key, createRankingsRepAgent(userId, companyId));
    console.log(`[Sales Agent Controller] Created agent for rep ${userId}, company ${companyId}`);
  }
  return agentCache.get(key);
}

/**
 * Invoke the agent with a message and return the response
 */
async function invokeAgent(userId, companyId, message) {
  const agent = getOrCreateAgent(userId, companyId);
  const threadId = `srep-${userId}-${companyId}`;

  const result = await agent.invoke(
    { messages: [{ role: 'user', content: message }] },
    { configurable: { thread_id: threadId } }
  );

  // Extract the last AI message
  const lastMessage = result.messages[result.messages.length - 1];
  return typeof lastMessage.content === 'string'
    ? lastMessage.content
    : JSON.stringify(lastMessage.content);
}

const salesAgentController = {
  /**
   * POST /api/sales-agent/message
   * Chat with the AI about an account
   */
  async sendMessage(req, res, next) {
    try {
      const { user_id, company_id, message } = req.body;

      if (!user_id || !company_id || !message) {
        return res.status(400).json({
          success: false,
          error: 'user_id, company_id, and message are required'
        });
      }

      console.log(`[Sales Agent Controller] Message from rep ${user_id} about company ${company_id}`);

      const response = await invokeAgent(user_id, company_id, message);

      return res.status(200).json({
        success: true,
        response,
        user_id,
        company_id
      });
    } catch (error) {
      console.error('[Sales Agent Controller] Error in sendMessage:', error.message);
      next(error);
    }
  },

  /**
   * POST /api/sales-agent/briefing
   * Generate account briefing
   */
  async generateBriefing(req, res, next) {
    try {
      const { user_id, company_id } = req.body;

      if (!user_id || !company_id) {
        return res.status(400).json({
          success: false,
          error: 'user_id and company_id are required'
        });
      }

      console.log(`[Sales Agent Controller] Briefing request from rep ${user_id} for company ${company_id}`);

      const briefingPrompt = `Give me a complete account briefing for this company. Include:
1. Company overview (key metrics, CEO, ranking, revenue)
2. Communication history summary (last contact, total touches, patterns)
3. Recent intel highlights
4. Open tasks
5. Recommended next action with reasoning

Format it clearly with sections. Be concise but thorough.`;

      const response = await invokeAgent(user_id, company_id, briefingPrompt);

      return res.status(200).json({
        success: true,
        briefing: response,
        user_id,
        company_id
      });
    } catch (error) {
      console.error('[Sales Agent Controller] Error in generateBriefing:', error.message);
      next(error);
    }
  },

  /**
   * POST /api/sales-agent/generate-email
   * Generate email draft for account
   */
  async generateEmail(req, res, next) {
    try {
      const { user_id, company_id, purpose, additional_context } = req.body;

      if (!user_id || !company_id) {
        return res.status(400).json({
          success: false,
          error: 'user_id and company_id are required'
        });
      }

      const emailPrompt = `Generate a personalized email for this account.
Purpose: ${purpose || 'outreach'}
${additional_context ? `Additional context: ${additional_context}` : ''}

Use the company's data, intel, and communication history to make it personal and compelling. Include a clear subject line. The email should sound natural, not templated.

Format:
Subject: [subject line]

[email body]`;

      const response = await invokeAgent(user_id, company_id, emailPrompt);

      return res.status(200).json({
        success: true,
        email_draft: response,
        user_id,
        company_id
      });
    } catch (error) {
      console.error('[Sales Agent Controller] Error in generateEmail:', error.message);
      next(error);
    }
  },

  /**
   * POST /api/sales-agent/generate-sms
   * Generate SMS draft for account
   */
  async generateSms(req, res, next) {
    try {
      const { user_id, company_id, purpose, additional_context } = req.body;

      if (!user_id || !company_id) {
        return res.status(400).json({
          success: false,
          error: 'user_id and company_id are required'
        });
      }

      const smsPrompt = `Generate a short, professional SMS message for this account.
Purpose: ${purpose || 'follow-up'}
${additional_context ? `Additional context: ${additional_context}` : ''}

Keep it under 160 characters if possible. Make it personal using company/CEO name. Include a clear call-to-action.`;

      const response = await invokeAgent(user_id, company_id, smsPrompt);

      return res.status(200).json({
        success: true,
        sms_draft: response,
        user_id,
        company_id
      });
    } catch (error) {
      console.error('[Sales Agent Controller] Error in generateSms:', error.message);
      next(error);
    }
  },

  /**
   * POST /api/sales-agent/summarize-call
   * Summarize a call transcript
   */
  async summarizeCall(req, res, next) {
    try {
      const { user_id, company_id, transcript, call_notes } = req.body;

      if (!user_id || !company_id || (!transcript && !call_notes)) {
        return res.status(400).json({
          success: false,
          error: 'user_id, company_id, and either transcript or call_notes are required'
        });
      }

      const summaryPrompt = `Summarize this call and extract action items.

${transcript ? `Call Transcript:\n${transcript}` : ''}
${call_notes ? `Call Notes:\n${call_notes}` : ''}

Provide:
1. Brief summary (2-3 sentences)
2. Key takeaways
3. Action items / follow-ups needed
4. Recommended next step
5. Any objections raised and how they were handled

After generating the summary, log this communication and create any follow-up tasks.`;

      const response = await invokeAgent(user_id, company_id, summaryPrompt);

      return res.status(200).json({
        success: true,
        summary: response,
        user_id,
        company_id
      });
    } catch (error) {
      console.error('[Sales Agent Controller] Error in summarizeCall:', error.message);
      next(error);
    }
  },

  /**
   * POST /api/sales-agent/company-intel
   * Fetch/refresh company intelligence (direct DB call, no agent)
   */
  async getCompanyIntel(req, res, next) {
    try {
      const { company_id } = req.body;

      if (!company_id) {
        return res.status(400).json({
          success: false,
          error: 'company_id is required'
        });
      }

      const [company, intel, comms] = await Promise.all([
        rankingsDbService.getCompany(company_id),
        rankingsDbService.getCompanyIntel(company_id),
        rankingsDbService.getCompanyCommunications(company_id, 5)
      ]);

      if (!company) {
        return res.status(404).json({
          success: false,
          error: `Company ${company_id} not found`
        });
      }

      return res.status(200).json({
        success: true,
        company: {
          id: company.id,
          name: company.company_name,
          score: company.score,
          rankGrade: company.rank_grade
        },
        intel,
        recent_comms: comms,
        last_contact: comms.length > 0 ? comms[0].created_at : null
      });
    } catch (error) {
      console.error('[Sales Agent Controller] Error in getCompanyIntel:', error.message);
      next(error);
    }
  }
};

module.exports = salesAgentController;
