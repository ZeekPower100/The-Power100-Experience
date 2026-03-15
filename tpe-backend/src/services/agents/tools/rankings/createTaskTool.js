// DATABASE-CHECKED: account_tasks verified 2026-03-15
// ================================================================
// Create Task Tool (LangGraph Rankings Rep Agent)
// ================================================================
// Purpose: Create follow-up tasks for accounts
// ================================================================

const { z } = require('zod');
const { tool } = require('@langchain/core/tools');
const rankingsDbService = require('../../../rankingsDbService');

const CreateTaskSchema = z.object({
  company_id: z.number().int().describe('The company ID'),
  user_id: z.number().int().optional().describe('The rep user ID to assign the task to'),
  task_type: z.enum(['call', 'email', 'sms', 'follow_up', 'research', 'meeting', 'proposal']).describe('Type of task'),
  title: z.string().describe('Brief task title (e.g., "Follow up on proposal discussion")'),
  description: z.string().optional().describe('Detailed task description'),
  priority: z.enum(['low', 'medium', 'high']).default('medium').describe('Task priority'),
  due_date: z.string().optional().describe('Due date in YYYY-MM-DD format'),
  ai_reasoning: z.string().optional().describe('AI reasoning for why this task was recommended'),
  ai_talking_points: z.string().optional().describe('Suggested talking points for the task')
});

const createTaskFunction = async (params) => {
  console.log(`[Create Task] Creating ${params.task_type} task for company ${params.company_id}`);

  try {
    const result = await rankingsDbService.createAccountTask({
      company_id: params.company_id,
      user_id: params.user_id || null,
      task_type: params.task_type,
      title: params.title,
      description: params.description || null,
      priority: params.priority || 'medium',
      due_date: params.due_date || null,
      ai_generated: true,
      ai_reasoning: params.ai_reasoning || null,
      ai_talking_points: params.ai_talking_points || null
    });

    return JSON.stringify({
      success: true,
      task_id: result.id,
      message: `Task "${params.title}" created for company ${params.company_id} (${params.priority} priority)`
    });
  } catch (error) {
    console.error('[Create Task] Error:', error.message);
    return JSON.stringify({
      success: false,
      error: error.message
    });
  }
};

const createTaskTool = tool(
  createTaskFunction,
  {
    name: 'create_task',
    description: `Create a follow-up task for an account in the rankings database.

Use this tool when:
- Scheduling a follow-up call or email
- Creating action items from a conversation
- Setting reminders for account activities

Returns: JSON with the created task ID.`,
    schema: CreateTaskSchema
  }
);

module.exports = createTaskTool;
