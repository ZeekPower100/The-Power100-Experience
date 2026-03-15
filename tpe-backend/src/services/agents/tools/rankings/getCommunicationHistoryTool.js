// DATABASE-CHECKED: communications, users verified 2026-03-15
// ================================================================
// Get Communication History Tool (LangGraph Rankings Rep Agent)
// ================================================================
// Purpose: Fetch all communications for a company
// ================================================================

const { z } = require('zod');
const { tool } = require('@langchain/core/tools');
const rankingsDbService = require('../../../rankingsDbService');

const GetCommunicationHistorySchema = z.object({
  company_id: z.number().int().describe('The company ID to fetch communications for'),
  limit: z.number().int().min(1).max(50).default(20).describe('Max number of communications to return (default 20)')
});

const getCommunicationHistoryFunction = async ({ company_id, limit = 20 }) => {
  console.log(`[Get Communication History] Fetching comms for company ${company_id}, limit ${limit}`);

  try {
    const comms = await rankingsDbService.getCompanyCommunications(company_id, limit);

    return JSON.stringify({
      success: true,
      company_id,
      total: comms.length,
      communications: comms.map(c => ({
        id: c.id,
        type: c.comm_type,
        direction: c.direction,
        subject: c.subject,
        content: c.content,
        status: c.status,
        repName: c.rep_name,
        callDuration: c.call_duration,
        callDisposition: c.call_disposition,
        aiGenerated: c.ai_generated,
        aiSummary: c.ai_summary,
        date: c.created_at
      })),
      summary: comms.length === 0
        ? 'No communication history found. This is a fresh account — start with an introductory outreach.'
        : `${comms.length} communications on file. Most recent: ${comms[0].comm_type} on ${new Date(comms[0].created_at).toLocaleDateString()}`
    });
  } catch (error) {
    console.error('[Get Communication History] Error:', error.message);
    return JSON.stringify({
      success: false,
      error: error.message
    });
  }
};

const getCommunicationHistoryTool = tool(
  getCommunicationHistoryFunction,
  {
    name: 'get_communication_history',
    description: `Fetch the communication history for a company — calls, emails, SMS — with rep attribution and AI summaries.

Use this tool when:
- Reviewing what's been said before contacting
- Checking last touch date
- Understanding the relationship history

Returns: JSON with communications sorted by date (newest first).`,
    schema: GetCommunicationHistorySchema
  }
);

module.exports = getCommunicationHistoryTool;
