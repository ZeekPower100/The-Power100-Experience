// DATABASE-CHECKED: companies, company_intel, communications verified 2026-03-15
// ================================================================
// Generate Talking Points Tool (LangGraph Rankings Rep Agent)
// ================================================================
// Purpose: Create personalized conversation starters using intel
// ================================================================

const { z } = require('zod');
const { tool } = require('@langchain/core/tools');
const rankingsDbService = require('../../../rankingsDbService');

const GenerateTalkingPointsSchema = z.object({
  company_id: z.number().int().describe('The company ID to generate talking points for'),
  context: z.string().optional().describe('Additional context like "cold call", "follow-up", "re-engagement"')
});

const generateTalkingPointsFunction = async ({ company_id, context = 'general' }) => {
  console.log(`[Generate Talking Points] Company ${company_id}, context: ${context}`);

  try {
    const [company, intel, comms] = await Promise.all([
      rankingsDbService.getCompany(company_id),
      rankingsDbService.getCompanyIntel(company_id),
      rankingsDbService.getCompanyCommunications(company_id, 5)
    ]);

    if (!company) {
      return JSON.stringify({
        success: false,
        error: `Company ${company_id} not found`
      });
    }

    // Build talking points data for AI to use
    const talkingPointsData = {
      company: {
        name: company.company_name,
        ceoName: company.ceo_name,
        ceoTitle: company.ceo_title,
        city: company.city,
        state: company.state,
        score: company.score,
        rankGrade: company.rank_grade,
        rating: company.rating,
        reviewCount: company.review_count,
        revenue: company.estimated_revenue,
        employees: company.employee_count_max,
        yearsInBusiness: company.years_in_business,
        services: company.services,
        communityInvolvement: company.community_involvement,
        isClient: company.is_client,
        pillar: company.pillar_name,
        marketType: company.market_type
      },
      intel: intel.slice(0, 5).map(i => ({
        type: i.intel_type,
        title: i.title,
        content: i.content,
        source: i.source_platform,
        date: i.gathered_at
      })),
      recentComms: comms.slice(0, 3).map(c => ({
        type: c.comm_type,
        direction: c.direction,
        subject: c.subject,
        summary: c.ai_summary,
        date: c.created_at
      })),
      outreachContext: context
    };

    return JSON.stringify({
      success: true,
      company_id,
      talkingPointsData,
      instruction: `Use this data to generate personalized talking points for a ${context} conversation with ${company.company_name}. Reference specific data points (rating, revenue, intel) to show you've done your homework. Address the CEO by name (${company.ceo_name || 'unknown'}).`
    });
  } catch (error) {
    console.error('[Generate Talking Points] Error:', error.message);
    return JSON.stringify({
      success: false,
      error: error.message
    });
  }
};

const generateTalkingPointsTool = tool(
  generateTalkingPointsFunction,
  {
    name: 'generate_talking_points',
    description: `Gather company data, intel, and communication history to generate personalized talking points for calls or emails.

Use this tool when:
- Preparing for a sales call
- Writing a personalized email opener
- Needing conversation starters based on recent intel

Returns: JSON with company data, intel, and recent comms — use to craft personalized talking points.`,
    schema: GenerateTalkingPointsSchema
  }
);

module.exports = generateTalkingPointsTool;
