// DATABASE-CHECKED: communications verified 2026-03-15
// ================================================================
// Log Communication Tool (LangGraph Rankings Rep Agent)
// ================================================================
// Purpose: Write to communications table after call/email/SMS
// ================================================================

const { z } = require('zod');
const { tool } = require('@langchain/core/tools');
const rankingsDbService = require('../../../rankingsDbService');

const LogCommunicationSchema = z.object({
  company_id: z.number().int().describe('The company ID'),
  user_id: z.number().int().optional().describe('The rep user ID'),
  comm_type: z.enum(['call', 'email', 'sms']).describe('Type of communication'),
  direction: z.enum(['inbound', 'outbound']).default('outbound').describe('Direction of communication'),
  subject: z.string().optional().describe('Subject line (for emails) or brief topic'),
  content: z.string().describe('The communication content or call notes'),
  status: z.enum(['completed', 'no_answer', 'voicemail', 'scheduled', 'draft']).default('completed').describe('Communication status'),
  call_duration: z.number().int().optional().describe('Call duration in seconds'),
  call_disposition: z.string().optional().describe('Call outcome (e.g., "interested", "not interested", "callback requested")'),
  ai_summary: z.string().optional().describe('AI-generated summary of the communication')
});

const logCommunicationFunction = async (params) => {
  console.log(`[Log Communication] Logging ${params.comm_type} for company ${params.company_id}`);

  try {
    const result = await rankingsDbService.logCommunication({
      company_id: params.company_id,
      user_id: params.user_id || null,
      comm_type: params.comm_type,
      direction: params.direction || 'outbound',
      subject: params.subject || null,
      content: params.content,
      status: params.status || 'completed',
      call_duration: params.call_duration || null,
      call_disposition: params.call_disposition || null,
      ai_generated: true,
      ai_summary: params.ai_summary || null
    });

    return JSON.stringify({
      success: true,
      communication_id: result.id,
      message: `${params.comm_type} logged successfully for company ${params.company_id}`
    });
  } catch (error) {
    console.error('[Log Communication] Error:', error.message);
    return JSON.stringify({
      success: false,
      error: error.message
    });
  }
};

const logCommunicationTool = tool(
  logCommunicationFunction,
  {
    name: 'log_communication',
    description: `Record a communication (call, email, or SMS) in the rankings database.

Use this tool when:
- After completing a call with notes
- After sending an email
- After sending an SMS
- Recording a voicemail left

Returns: JSON with the created communication ID.`,
    schema: LogCommunicationSchema
  }
);

module.exports = logCommunicationTool;
