// DATABASE-CHECKED: companies, communications, account_tasks, company_intel verified 2026-03-15
// ================================================================
// Recommend Next Action Tool (LangGraph Rankings Rep Agent)
// ================================================================
// Purpose: AI recommends the best next action for an account
// ================================================================

const { z } = require('zod');
const { tool } = require('@langchain/core/tools');
const rankingsDbService = require('../../../rankingsDbService');

const RecommendNextActionSchema = z.object({
  company_id: z.number().int().describe('The company ID to analyze'),
  user_id: z.number().int().optional().describe('The rep user ID (for task creation context)')
});

const recommendNextActionFunction = async ({ company_id, user_id }) => {
  console.log(`[Recommend Next Action] Analyzing company ${company_id}`);

  try {
    // Gather context
    const [company, comms, tasks, intel] = await Promise.all([
      rankingsDbService.getCompany(company_id),
      rankingsDbService.getCompanyCommunications(company_id, 10),
      rankingsDbService.getCompanyTasks(company_id, 'pending'),
      rankingsDbService.getCompanyIntel(company_id)
    ]);

    if (!company) {
      return JSON.stringify({
        success: false,
        error: `Company ${company_id} not found`
      });
    }

    // Analyze communication recency
    const lastComm = comms.length > 0 ? comms[0] : null;
    const daysSinceLastContact = lastComm
      ? Math.floor((Date.now() - new Date(lastComm.created_at).getTime()) / (1000 * 60 * 60 * 24))
      : null;

    // Build recommendation context
    const context = {
      company: {
        name: company.company_name,
        status: company.status,
        isClient: company.is_client,
        score: company.score,
        rankGrade: company.rank_grade,
        ceoName: company.ceo_name,
        revenue: company.estimated_revenue,
        employees: company.employee_count_max
      },
      lastContact: lastComm ? {
        type: lastComm.comm_type,
        direction: lastComm.direction,
        daysAgo: daysSinceLastContact,
        disposition: lastComm.call_disposition,
        summary: lastComm.ai_summary || lastComm.subject
      } : null,
      openTasks: tasks.length,
      pendingTasks: tasks.slice(0, 3).map(t => ({
        title: t.title,
        type: t.task_type,
        priority: t.priority,
        dueDate: t.due_date
      })),
      recentIntel: intel.slice(0, 3).map(i => ({
        type: i.intel_type,
        title: i.title,
        date: i.gathered_at
      })),
      totalComms: comms.length
    };

    // Determine recommended action
    let recommendation;
    if (!lastComm) {
      recommendation = {
        action: 'initial_outreach',
        channel: 'email',
        urgency: 'high',
        reasoning: 'No prior communication. Start with an introductory email referencing their ranking and industry position.'
      };
    } else if (daysSinceLastContact > 30) {
      recommendation = {
        action: 're_engagement',
        channel: 'call',
        urgency: 'high',
        reasoning: `Last contact was ${daysSinceLastContact} days ago. A call re-engagement is recommended to maintain the relationship.`
      };
    } else if (daysSinceLastContact > 14) {
      recommendation = {
        action: 'follow_up',
        channel: 'email',
        urgency: 'medium',
        reasoning: `${daysSinceLastContact} days since last contact. Send a follow-up with value-add content or intel.`
      };
    } else if (tasks.length > 0) {
      const topTask = tasks[0];
      recommendation = {
        action: 'complete_task',
        channel: topTask.task_type === 'call' ? 'call' : 'email',
        urgency: topTask.priority === 'high' ? 'high' : 'medium',
        reasoning: `Pending task: "${topTask.title}" (${topTask.priority} priority). Complete this before new outreach.`
      };
    } else if (intel.length > 0) {
      recommendation = {
        action: 'intel_based_outreach',
        channel: 'email',
        urgency: 'medium',
        reasoning: `Fresh intel available: "${intel[0].title}". Use this for personalized outreach.`
      };
    } else {
      recommendation = {
        action: 'relationship_nurture',
        channel: 'email',
        urgency: 'low',
        reasoning: 'Account is in good standing. Send value-add content to strengthen the relationship.'
      };
    }

    return JSON.stringify({
      success: true,
      company_id,
      recommendation,
      context,
      message: `Recommended: ${recommendation.action} via ${recommendation.channel} (${recommendation.urgency} urgency)`
    });
  } catch (error) {
    console.error('[Recommend Next Action] Error:', error.message);
    return JSON.stringify({
      success: false,
      error: error.message
    });
  }
};

const recommendNextActionTool = tool(
  recommendNextActionFunction,
  {
    name: 'recommend_next_action',
    description: `Analyze an account's communication history, open tasks, and intel to recommend the best next action.

Use this tool when:
- The rep asks "What should I do with this account?"
- Preparing a daily or weekly action plan
- Deciding whether to call, email, or SMS

Returns: JSON with recommended action, channel, urgency, reasoning, and account context.`,
    schema: RecommendNextActionSchema
  }
);

module.exports = recommendNextActionTool;
