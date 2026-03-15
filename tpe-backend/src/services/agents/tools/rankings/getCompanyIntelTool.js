// DATABASE-CHECKED: company_intel verified 2026-03-15
// ================================================================
// Get Company Intel Tool (LangGraph Rankings Rep Agent)
// ================================================================
// Purpose: Fetch recent intelligence (news, social, expansions)
// ================================================================

const { z } = require('zod');
const { tool } = require('@langchain/core/tools');
const rankingsDbService = require('../../../rankingsDbService');

const GetCompanyIntelSchema = z.object({
  company_id: z.number().int().describe('The company ID to fetch intel for')
});

const getCompanyIntelFunction = async ({ company_id }) => {
  console.log(`[Get Company Intel] Fetching intel for company ${company_id}`);

  try {
    const intel = await rankingsDbService.getCompanyIntel(company_id);

    return JSON.stringify({
      success: true,
      company_id,
      intel_count: intel.length,
      intel: intel.map(item => ({
        id: item.id,
        type: item.intel_type,
        title: item.title,
        content: item.content,
        source: item.source_platform,
        sourceUrl: item.source_url,
        publishedAt: item.published_at,
        gatheredAt: item.gathered_at
      })),
      message: intel.length === 0
        ? 'No recent intel found. Consider using web_search to gather fresh information.'
        : `Found ${intel.length} intel items. Use these for personalized outreach.`
    });
  } catch (error) {
    console.error('[Get Company Intel] Error:', error.message);
    return JSON.stringify({
      success: false,
      error: error.message
    });
  }
};

const getCompanyIntelTool = tool(
  getCompanyIntelFunction,
  {
    name: 'get_company_intel',
    description: `Fetch recent intelligence about a company — news, social media activity, expansions, awards, etc.

Use this tool when:
- Preparing personalized outreach
- Looking for conversation starters
- Checking for recent company developments

Returns: JSON with intel items including type, title, content, and source.`,
    schema: GetCompanyIntelSchema
  }
);

module.exports = getCompanyIntelTool;
