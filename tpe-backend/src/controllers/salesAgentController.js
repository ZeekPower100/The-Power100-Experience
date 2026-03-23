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
const { ChatOpenAI } = require('@langchain/openai');

// Agent cache — keyed by rep-company pair
const agentCache = new Map();

/**
 * Fast direct GPT-4o call with pre-fetched context (no agent loop)
 * Used for email/SMS generation where speed matters and tools aren't needed
 * Typical: 2-5 seconds vs 15-60+ seconds with the full agent
 */
async function fastGenerate(userId, companyId, taskPrompt) {
  const startTime = Date.now();

  // Pre-fetch all context in parallel (same data the agent would gather via tools)
  const [company, comms, notes, intel, rep] = await Promise.all([
    rankingsDbService.getCompany(companyId),
    rankingsDbService.getCompanyCommunications(companyId, 10),
    rankingsDbService.getCompanyNotes(companyId),
    rankingsDbService.getCompanyIntel(companyId),
    userId ? rankingsDbService.getRepUser(userId) : null
  ]);

  if (!company) {
    throw new Error(`Company ${companyId} not found in rankings database`);
  }

  // Build context string
  const ctx = [];
  ctx.push(`Company: ${company.company_name} | ${company.city}, ${company.state}`);
  if (company.ceo_name) ctx.push(`CEO: ${company.ceo_name}${company.ceo_title ? ` (${company.ceo_title})` : ''}`);
  if (company.estimated_revenue) ctx.push(`Revenue: ~$${(company.estimated_revenue / 1000000).toFixed(1)}M`);
  if (company.employee_count_max) ctx.push(`Employees: ~${company.employee_count_max}`);
  if (company.rating) ctx.push(`Google: ${company.rating} stars (${company.review_count} reviews)`);
  if (company.years_in_business) ctx.push(`Years in business: ${company.years_in_business}`);
  if (company.website) ctx.push(`Website: ${company.website}`);
  if (company.pillar_name) ctx.push(`Pillar: ${company.pillar_name}`);
  ctx.push(`Status: ${company.status} | Client: ${company.is_client ? 'Yes' : 'No'}`);
  if (company.score) ctx.push(`Score: ${company.score} | Grade: ${company.rank_grade || 'N/A'}`);

  if (comms && comms.length > 0) {
    ctx.push(`\nRecent communications (${comms.length}):`);
    for (const c of comms.slice(0, 5)) {
      const d = new Date(c.created_at).toLocaleDateString();
      ctx.push(`  - ${d}: ${c.comm_type} (${c.direction})${c.subject ? ` — ${c.subject}` : ''}${c.ai_summary ? ` | ${c.ai_summary}` : ''}`);
    }
  } else {
    ctx.push('\nNo prior communications — untouched account.');
  }

  if (intel && intel.length > 0) {
    ctx.push('\nRecent intel:');
    for (const i of intel.slice(0, 3)) {
      ctx.push(`  - [${i.intel_type}] ${i.title || (i.content || '').substring(0, 100)}`);
    }
  }

  const pinnedNotes = (notes || []).filter(n => n.is_pinned);
  if (pinnedNotes.length > 0) {
    ctx.push('\nPinned notes:');
    for (const n of pinnedNotes) {
      ctx.push(`  - ${(n.content || '').substring(0, 200)}`);
    }
  }

  const repName = rep ? (rep.full_name || rep.username) : 'Rep';

  const systemPrompt = `You are the Power100 AI Sales Assistant. You write professional, personalized sales content for home improvement industry account executives.

Rep: ${repName}

Account context:
${ctx.join('\n')}`;

  const model = new ChatOpenAI({
    modelName: 'gpt-4o',
    temperature: 0.4,
    openAIApiKey: process.env.OPENAI_API_KEY,
    timeout: 25000
  });

  const result = await model.invoke([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: taskPrompt }
  ]);

  const elapsed = Date.now() - startTime;
  console.log(`[Sales Agent Controller] fastGenerate completed in ${elapsed}ms`);

  return typeof result.content === 'string' ? result.content : JSON.stringify(result.content);
}

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
   * Uses fast direct GPT-4o call (no agent loop) — typically 2-5s vs 15-60s
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

      console.log(`[Sales Agent Controller] Email draft request from rep ${user_id} for company ${company_id}`);

      const emailPrompt = `Generate a personalized email for this account.
Purpose: ${purpose || 'outreach'}
${additional_context ? `Additional context: ${additional_context}` : ''}

Use the company's data, intel, and communication history to make it personal and compelling. Include a clear subject line. The email should sound natural, not templated.

Format:
Subject: [subject line]

[email body]`;

      const response = await fastGenerate(user_id, company_id, emailPrompt);

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
   * Uses fast direct GPT-4o call (no agent loop) — typically 2-5s vs 15-60s
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

      console.log(`[Sales Agent Controller] SMS draft request from rep ${user_id} for company ${company_id}`);

      const smsPrompt = `Generate a short, professional SMS message for this account.
Purpose: ${purpose || 'follow-up'}
${additional_context ? `Additional context: ${additional_context}` : ''}

Keep it under 160 characters if possible. Make it personal using company/CEO name. Include a clear call-to-action.`;

      const response = await fastGenerate(user_id, company_id, smsPrompt);

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
  },

  /**
   * POST /api/sales-agent/send-daily-reports
   * Receive daily performance reports from ranking system and email to reps
   * Called nightly after report generation
   */
  async sendDailyReports(req, res, next) {
    try {
      const { reports } = req.body;

      if (!reports || !Array.isArray(reports) || reports.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'reports array is required and must not be empty'
        });
      }

      console.log(`[Sales Agent Controller] Processing ${reports.length} daily reports`);

      const results = [];
      const axios = require('axios');

      const webhookUrl = process.env.NODE_ENV === 'production'
        ? 'https://n8n.srv918843.hstgr.cloud/webhook/email-outbound'
        : 'https://n8n.srv918843.hstgr.cloud/webhook/email-outbound-dev';

      for (const report of reports) {
        const { user_id, user_name, user_email, report_date, metrics, ai_analysis } = report;

        if (!user_email || !user_name) {
          results.push({ user_id, success: false, error: 'Missing user_email or user_name' });
          continue;
        }

        try {
          // Build the email HTML
          const emailHtml = buildDailyReportEmail(user_name, report_date, metrics, ai_analysis);

          // Send via n8n webhook (same pattern as all TPX emails)
          await axios.post(webhookUrl, {
            message_id: `daily-report-${user_id}-${report_date}`,
            to_email: user_email,
            to_name: user_name,
            subject: `Your Power100 Daily Performance Report — ${report_date}`,
            body: emailHtml,
            template: 'daily_report',
            from_name: 'Power100',
            from_email: 'info@power100.io'
          }, {
            timeout: 10000
          });

          console.log(`[Sales Agent Controller] Daily report sent to ${user_email}`);
          results.push({ user_id, success: true, email: user_email });
        } catch (emailError) {
          console.error(`[Sales Agent Controller] Failed to send report to ${user_email}:`, emailError.message);
          results.push({ user_id, success: false, error: emailError.message });
        }
      }

      const sent = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;

      return res.status(200).json({
        success: true,
        total: reports.length,
        sent,
        failed,
        results
      });
    } catch (error) {
      console.error('[Sales Agent Controller] Error in sendDailyReports:', error.message);
      next(error);
    }
  }
};

/**
 * Build HTML email for daily performance report
 */
function buildDailyReportEmail(userName, reportDate, metrics, aiAnalysis) {
  const m = metrics || {};
  const ai = aiAnalysis || {};

  const firstName = userName.split(' ')[0];

  // Metric rows
  const metricRows = [
    { label: 'Session Time', value: `${m.total_session_minutes || 0} min`, icon: '&#128337;' },
    { label: 'Accounts Viewed', value: `${m.unique_accounts_viewed || 0} unique / ${m.accounts_viewed || 0} total`, icon: '&#128188;' },
    { label: 'Calls Logged', value: m.calls_logged || 0, icon: '&#128222;' },
    { label: 'Emails Logged', value: m.emails_logged || 0, icon: '&#128231;' },
    { label: 'SMS Logged', value: m.sms_logged || 0, icon: '&#128172;' },
    { label: 'Notes Created', value: m.notes_created || 0, icon: '&#128221;' },
    { label: 'Tasks Created', value: m.tasks_created || 0, icon: '&#9745;' },
    { label: 'Tasks Completed', value: m.tasks_completed || 0, icon: '&#9989;' },
    { label: 'AI Briefings', value: m.briefings_requested || 0, icon: '&#129302;' },
    { label: 'Outreach Volume', value: m.outreach_volume || 0, icon: '&#128640;' }
  ];

  const metricsHtml = metricRows.map(r =>
    `<tr><td style="padding:8px 12px;border-bottom:1px solid #eee;font-size:14px;">${r.icon} ${r.label}</td><td style="padding:8px 12px;border-bottom:1px solid #eee;font-size:14px;font-weight:bold;text-align:right;">${r.value}</td></tr>`
  ).join('');

  // AI coaching section
  let coachingHtml = '';
  if (ai && ai.status !== 'error') {
    const score = ai.performance_score || 0;
    const scoreColor = score >= 70 ? '#28a745' : score >= 40 ? '#ffc107' : '#dc3545';

    const strengths = (ai.strengths || []).map(s => `<li style="margin-bottom:4px;">${s}</li>`).join('');
    const improvements = (ai.improvements || []).map(s => `<li style="margin-bottom:4px;">${s}</li>`).join('');
    const suggestions = (ai.specific_suggestions || []).map(s => `<li style="margin-bottom:4px;">${s}</li>`).join('');

    coachingHtml = `
      <div style="margin-top:24px;padding:20px;background:#f8f9fa;border-radius:12px;">
        <h3 style="margin:0 0 12px;color:#333;font-size:16px;">AI Performance Coaching</h3>
        <div style="text-align:center;margin-bottom:16px;">
          <span style="display:inline-block;background:${scoreColor};color:#fff;font-size:28px;font-weight:bold;padding:12px 24px;border-radius:12px;">${score}/100</span>
          <div style="color:#666;font-size:13px;margin-top:4px;">Performance Score ${ai.trend ? '(' + ai.trend + ')' : ''}</div>
        </div>
        ${strengths ? `<div style="margin-bottom:12px;"><strong style="color:#28a745;">Strengths:</strong><ul style="margin:4px 0;padding-left:20px;">${strengths}</ul></div>` : ''}
        ${improvements ? `<div style="margin-bottom:12px;"><strong style="color:#ffc107;">Areas to Improve:</strong><ul style="margin:4px 0;padding-left:20px;">${improvements}</ul></div>` : ''}
        ${suggestions ? `<div style="margin-bottom:12px;"><strong style="color:#17a2b8;">Suggestions:</strong><ul style="margin:4px 0;padding-left:20px;">${suggestions}</ul></div>` : ''}
        ${ai.motivational_note ? `<div style="margin-top:16px;padding:12px;background:#fff;border-left:4px solid #28a745;border-radius:4px;font-style:italic;color:#555;">${ai.motivational_note}</div>` : ''}
      </div>`;
  }

  return `
    <div style="max-width:600px;margin:0 auto;font-family:Arial,sans-serif;color:#333;">
      <div style="background:#000;padding:20px;text-align:center;border-radius:12px 12px 0 0;">
        <h1 style="color:#FB0401;margin:0;font-size:22px;">POWER100</h1>
        <p style="color:#fff;margin:4px 0 0;font-size:13px;">Daily Performance Report</p>
      </div>
      <div style="padding:24px;background:#fff;border:1px solid #eee;">
        <p style="font-size:15px;margin-bottom:16px;">Hey ${firstName},</p>
        <p style="font-size:14px;color:#666;margin-bottom:20px;">Here is your performance summary for <strong>${reportDate}</strong>.</p>
        <table style="width:100%;border-collapse:collapse;background:#fff;border-radius:8px;overflow:hidden;border:1px solid #eee;">
          <thead><tr><th style="padding:10px 12px;background:#f8f9fa;text-align:left;font-size:13px;color:#666;">Metric</th><th style="padding:10px 12px;background:#f8f9fa;text-align:right;font-size:13px;color:#666;">Value</th></tr></thead>
          <tbody>${metricsHtml}</tbody>
        </table>
        ${coachingHtml}
        <div style="margin-top:24px;text-align:center;">
          <p style="font-size:13px;color:#999;">Keep pushing, ${firstName}. Every call counts.</p>
        </div>
      </div>
      <div style="background:#f8f9fa;padding:12px;text-align:center;border-radius:0 0 12px 12px;border:1px solid #eee;border-top:none;">
        <p style="margin:0;font-size:11px;color:#999;">Power100 Ranking System | AI Sales Assistant</p>
      </div>
    </div>`;
}

module.exports = salesAgentController;
