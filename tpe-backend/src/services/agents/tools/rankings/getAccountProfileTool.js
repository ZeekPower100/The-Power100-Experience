// DATABASE-CHECKED: companies, pillars verified 2026-03-15
// ================================================================
// Get Account Profile Tool (LangGraph Rankings Rep Agent)
// ================================================================
// Purpose: Fetch full company profile + scoring from rankings DB
// ================================================================

const { z } = require('zod');
const { tool } = require('@langchain/core/tools');
const rankingsDbService = require('../../../rankingsDbService');

const GetAccountProfileSchema = z.object({
  company_id: z.number().int().describe('The company ID to look up in the rankings database')
});

const getAccountProfileFunction = async ({ company_id }) => {
  console.log(`[Get Account Profile] Fetching company ${company_id}`);

  try {
    const company = await rankingsDbService.getCompany(company_id);

    if (!company) {
      return JSON.stringify({
        success: false,
        error: `Company ${company_id} not found in rankings database`
      });
    }

    return JSON.stringify({
      success: true,
      company: {
        id: company.id,
        name: company.company_name,
        city: company.city,
        state: company.state,
        address: company.address,
        website: company.website,
        phone: company.phone,
        email: company.email,
        ceo: {
          name: company.ceo_name,
          title: company.ceo_title,
          linkedin: company.ceo_linkedin
        },
        metrics: {
          rating: company.rating,
          reviewCount: company.review_count,
          score: company.score,
          rankGrade: company.rank_grade,
          estimatedRevenue: company.estimated_revenue,
          employeeRange: company.employee_count_min && company.employee_count_max
            ? `${company.employee_count_min}-${company.employee_count_max}`
            : null,
          yearsInBusiness: company.years_in_business,
          foundedYear: company.founded_year,
          locationCount: company.location_count
        },
        pillar: {
          id: company.pillar_id,
          name: company.pillar_name,
          slug: company.pillar_slug
        },
        social: {
          linkedin: company.company_linkedin,
          facebook: company.facebook,
          twitter: company.twitter,
          instagram: company.instagram
        },
        status: company.status,
        isClient: company.is_client,
        isHip200: company.is_hip200,
        services: company.services,
        scoringFactors: company.scoring_factors,
        communityInvolvement: company.community_involvement,
        marketType: company.market_type,
        metroArea: company.metro_area
      }
    });
  } catch (error) {
    console.error('[Get Account Profile] Error:', error.message);
    return JSON.stringify({
      success: false,
      error: error.message
    });
  }
};

const getAccountProfileTool = tool(
  getAccountProfileFunction,
  {
    name: 'get_account_profile',
    description: `Fetch the full company profile from the rankings database, including CEO info, scoring factors, revenue, employees, services, and rank grade.

Use this tool when:
- Opening an account to see full details
- Preparing for a call or outreach
- Needing company metrics for talking points

Returns: JSON with company profile, CEO info, metrics, pillar, and social links.`,
    schema: GetAccountProfileSchema
  }
);

module.exports = getAccountProfileTool;
