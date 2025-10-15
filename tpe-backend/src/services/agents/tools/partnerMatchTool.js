// DATABASE-CHECKED: strategic_partners, contractors, ai_learning_events columns verified October 13, 2025
// ================================================================
// Partner Match Tool (LangGraph Agent Tool)
// ================================================================
// Purpose: Find and recommend strategic partners based on contractor needs
// Uses: Phase 0 hybrid search + partner database + learning events
// AI Model: Autonomous decision-making via LangGraph agent
// ================================================================
// PHASE 3 DAY 4: AI Action Guards integrated for rate limiting
// ================================================================

const { z } = require('zod');
const { tool } = require('@langchain/core/tools');
const hybridSearchService = require('../../hybridSearchService');
const { query } = require('../../../config/database');
const AIActionGuards = require('../../guards/aiActionGuards');
const GuardLogger = require('../../guards/guardLogger');

// Zod schema for input validation
const PartnerMatchSchema = z.object({
  contractorId: z.number().int().positive().describe('The contractor ID requesting partner matches'),
  focusAreas: z.array(z.string()).optional().describe('Business focus areas to match against (e.g., ["Sales & Marketing", "Operations"])'),
  revenueTier: z.string().optional().describe('Contractor revenue tier (e.g., "$250K-$500K")'),
  limit: z.number().int().positive().default(5).describe('Maximum number of partners to return (default: 5)')
});

/**
 * Partner Match Tool Function
 * Called by LangGraph agent when contractor needs partner recommendations
 */
const partnerMatchFunction = async ({ contractorId, focusAreas, revenueTier, limit = 5 }) => {
  console.log(`[Partner Match Tool] Finding matches for contractor ${contractorId}`);
  console.log(`[Partner Match Tool] Focus areas: ${focusAreas?.join(', ') || 'Not specified'}`);
  console.log(`[Partner Match Tool] Revenue tier: ${revenueTier || 'Not specified'}`);

  try {
    // PHASE 3 DAY 4: GUARD CHECK - Rate Limit Check
    // Using 'partner_lookup' rate limit (100 per hour) for partner matching
    const rateLimitCheck = await AIActionGuards.checkRateLimit(contractorId, 'partner_lookup');
    await GuardLogger.logGuardCheck(contractorId, 'partner_match_rate_limit', rateLimitCheck);

    if (!rateLimitCheck.allowed) {
      console.log(`[Partner Match Tool] ❌ Rate limit exceeded: ${rateLimitCheck.reason}`);
      return JSON.stringify({
        success: false,
        error: 'Rate limit exceeded',
        message: `Too many partner lookups recently. Try again in ${Math.ceil(rateLimitCheck.retryAfter / 60)} minutes.`,
        guardBlocked: true,
        retryAfter: rateLimitCheck.retryAfter,
        contractorId
      });
    }

    console.log(`[Partner Match Tool] ✅ Rate limit check passed - proceeding with partner matching`);

    // ALL GUARDS PASSED - Proceed with partner matching
    // Step 1: Get contractor details from database
    const contractorQuery = `
      SELECT
        id,
        first_name,
        last_name,
        email,
        company_name,
        focus_areas,
        revenue_tier,
        team_size,
        readiness_indicators,
        business_goals,
        current_challenges
      FROM contractors
      WHERE id = $1
    `;

    const contractorResult = await query(contractorQuery, [contractorId]);

    if (contractorResult.rows.length === 0) {
      return JSON.stringify({
        success: false,
        error: 'Contractor not found',
        contractorId
      });
    }

    const contractor = contractorResult.rows[0];

    // Parse focus areas from database (stored as JSON array string or comma-separated text)
    let contractorFocusAreas = focusAreas;
    if (!contractorFocusAreas && contractor.focus_areas) {
      try {
        // Try parsing as JSON array first
        contractorFocusAreas = JSON.parse(contractor.focus_areas);
      } catch (e) {
        // Fallback to comma-separated parsing
        contractorFocusAreas = contractor.focus_areas.split(',').map(area => area.trim());
      }
    }
    contractorFocusAreas = contractorFocusAreas || [];

    const contractorRevenueTier = revenueTier || contractor.revenue_tier;

    // Step 2: Build search query for hybrid search
    const searchQuery = `
      Contractor needs strategic partners for: ${contractorFocusAreas.join(', ')}
      Revenue tier: ${contractorRevenueTier}
      Team size: ${contractor.team_size || 'Not specified'}
    `;

    console.log(`[Partner Match Tool] Hybrid search query: ${searchQuery}`);

    // Step 3: Use Phase 0 hybrid search to find relevant partners
    const searchResults = await hybridSearchService.searchPartners(searchQuery, {
      contractorId: contractorId,
      limit: limit * 2 // Get extra results for filtering
    });

    console.log(`[Partner Match Tool] Found ${searchResults.length} initial matches from hybrid search`);

    // Step 4: Get full partner details for matched partners
    if (searchResults.length === 0) {
      // Log learning event: No matches found
      await logLearningEvent({
        eventType: 'partner_match',
        contractorId,
        context: searchQuery,
        recommendation: 'No partners found matching criteria',
        actionTaken: 'returned_empty_results',
        outcome: 'no_matches',
        successScore: 0,
        learnedInsight: 'Need more partners or broader search criteria',
        confidenceLevel: 0.5
      });

      return JSON.stringify({
        success: true,
        matches: [],
        message: 'No partners found matching your criteria. Try broadening your search.',
        contractorId,
        searchCriteria: {
          focusAreas: contractorFocusAreas,
          revenueTier: contractorRevenueTier
        }
      });
    }

    // Extract partner IDs from search results
    const partnerIds = searchResults.map(result => result.entityId);

    // Get full partner details
    const partnersQuery = `
      SELECT
        id,
        company_name,
        focus_areas,
        revenue_tiers,
        powerconfidence_score,
        is_active,
        ai_summary,
        value_proposition,
        key_differentiators,
        ideal_customer,
        geographical_coverage,
        website,
        contact_email,
        contact_phone,
        avg_contractor_satisfaction,
        total_contractor_engagements
      FROM strategic_partners
      WHERE id = ANY($1::int[])
        AND is_active = true
      ORDER BY powerconfidence_score DESC NULLS LAST
      LIMIT $2
    `;

    const partnersResult = await query(partnersQuery, [partnerIds, limit]);

    console.log(`[Partner Match Tool] Fetched ${partnersResult.rows.length} active partners with full details`);

    // Step 5: Calculate match scores and reasons
    const matches = partnersResult.rows.map(partner => {
      // Find the corresponding search result for hybrid score
      const searchResult = searchResults.find(sr => sr.entityId === partner.id);
      const hybridScore = searchResult ? searchResult.scores.hybrid : 0;

      // Calculate focus area overlap
      const partnerFocusAreas = partner.focus_areas ?
        partner.focus_areas.split(',').map(area => area.trim()) : [];

      const focusAreaOverlap = contractorFocusAreas.filter(area =>
        partnerFocusAreas.some(partnerArea =>
          partnerArea.toLowerCase().includes(area.toLowerCase()) ||
          area.toLowerCase().includes(partnerArea.toLowerCase())
        )
      );

      // Calculate revenue tier compatibility
      const partnerRevenueTiers = partner.revenue_tiers ?
        partner.revenue_tiers.split(',').map(tier => tier.trim()) : [];

      const revenueTierMatch = contractorRevenueTier && partnerRevenueTiers.length > 0 ?
        partnerRevenueTiers.some(tier => tier === contractorRevenueTier) : false;

      // Calculate final match score (0-100)
      const focusAreaScore = (focusAreaOverlap.length / Math.max(contractorFocusAreas.length, 1)) * 50;
      const revenueTierScore = revenueTierMatch ? 20 : 0;
      const hybridSearchScore = hybridScore * 20; // Scale hybrid score to 0-20 range
      const powerConfidenceScore = (partner.powerconfidence_score || 0) / 10; // Scale to 0-10 range

      const matchScore = Math.round(
        focusAreaScore + revenueTierScore + hybridSearchScore + powerConfidenceScore
      );

      // Generate match reasons
      const matchReasons = [];
      if (focusAreaOverlap.length > 0) {
        matchReasons.push(`Expertise in ${focusAreaOverlap.join(', ')}`);
      }
      if (revenueTierMatch) {
        matchReasons.push(`Serves businesses in your revenue tier (${contractorRevenueTier})`);
      }
      if (partner.powerconfidence_score >= 80) {
        matchReasons.push(`High PowerConfidence score (${partner.powerconfidence_score}/100)`);
      }
      if (partner.avg_contractor_satisfaction >= 4) {
        matchReasons.push(`Strong contractor satisfaction (${partner.avg_contractor_satisfaction}/5)`);
      }

      return {
        partnerId: partner.id,
        companyName: partner.company_name,
        matchScore,
        matchReasons,
        focusAreas: partnerFocusAreas,
        powerConfidenceScore: partner.powerconfidence_score,
        aiSummary: partner.ai_summary,
        valueProposition: partner.value_proposition,
        keyDifferentiators: partner.key_differentiators,
        website: partner.website,
        contactEmail: partner.contact_email,
        avgSatisfaction: partner.avg_contractor_satisfaction,
        totalEngagements: partner.total_contractor_engagements
      };
    });

    // Sort by match score
    matches.sort((a, b) => b.matchScore - a.matchScore);

    // Step 6: Log learning event for this match
    const topMatch = matches[0];
    await logLearningEvent({
      eventType: 'partner_match',
      contractorId,
      partnerId: topMatch.partnerId,
      context: searchQuery,
      recommendation: `Recommended ${topMatch.companyName} (score: ${topMatch.matchScore})`,
      actionTaken: 'returned_partner_matches',
      outcome: 'matches_found',
      successScore: topMatch.matchScore / 100, // Normalize to 0-1
      learnedInsight: `Top match reasons: ${topMatch.matchReasons.join('; ')}`,
      confidenceLevel: 0.8,
      relatedEntities: {
        partners: matches.map(m => m.partnerId),
        focusAreas: contractorFocusAreas
      }
    });

    console.log(`[Partner Match Tool] Returning ${matches.length} matches, top score: ${topMatch.matchScore}`);

    return JSON.stringify({
      success: true,
      matches,
      contractorId,
      searchCriteria: {
        focusAreas: contractorFocusAreas,
        revenueTier: contractorRevenueTier
      },
      message: `Found ${matches.length} strategic partners matching your needs`
    });

  } catch (error) {
    console.error('[Partner Match Tool] Error:', error);

    // Log failed learning event
    await logLearningEvent({
      eventType: 'partner_match',
      contractorId,
      context: 'Partner match attempt',
      recommendation: 'Failed to generate matches',
      actionTaken: 'error_occurred',
      outcome: 'error',
      successScore: 0,
      learnedInsight: `Error: ${error.message}`,
      confidenceLevel: 0
    });

    return JSON.stringify({
      success: false,
      error: error.message,
      contractorId
    });
  }
};

/**
 * Log learning event to ai_learning_events table
 * Tracks agent actions for continuous improvement
 */
async function logLearningEvent(eventData) {
  const {
    eventType,
    contractorId,
    partnerId = null,
    context,
    recommendation,
    actionTaken,
    outcome,
    successScore,
    learnedInsight,
    confidenceLevel,
    relatedEntities = null
  } = eventData;

  try {
    const insertQuery = `
      INSERT INTO ai_learning_events (
        event_type,
        contractor_id,
        partner_id,
        context,
        recommendation,
        action_taken,
        outcome,
        success_score,
        learned_insight,
        confidence_level,
        related_entities,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
      RETURNING id
    `;

    const result = await query(insertQuery, [
      eventType,
      contractorId,
      partnerId,
      context,
      recommendation,
      actionTaken,
      outcome,
      successScore,
      learnedInsight,
      confidenceLevel,
      relatedEntities ? JSON.stringify(relatedEntities) : null
    ]);

    console.log(`[Learning Event] Logged event ID: ${result.rows[0].id}`);
  } catch (error) {
    console.error('[Learning Event] Failed to log:', error);
    // Don't throw - logging failure shouldn't break the tool
  }
}

// Create the LangChain tool
const partnerMatchTool = tool(
  partnerMatchFunction,
  {
    name: 'partner_match',
    description: `Find and recommend strategic partners for a contractor based on their business needs.

Use this tool when:
- Contractor asks about finding partners for specific business areas
- Contractor needs recommendations for service providers
- Contractor wants to know which partners match their revenue/size/goals

The tool uses hybrid search (BM25 + vector) to find the most relevant partners,
then calculates match scores based on focus areas, revenue tier compatibility,
PowerConfidence scores, and contractor satisfaction ratings.

Returns: JSON with partner matches including scores, reasons, and contact info.`,
    schema: PartnerMatchSchema
  }
);

module.exports = partnerMatchTool;
