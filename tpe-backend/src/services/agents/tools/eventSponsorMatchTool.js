// DATABASE-CHECKED: event_sponsors, strategic_partners, contractors columns verified October 13, 2025
// ================================================================
// Event Sponsor Match Tool (LangGraph Agent Tool)
// ================================================================
// Purpose: Find and recommend event sponsors/partners for a contractor at a live event
// Uses: Existing eventAIRecommendationService logic wrapped as LangGraph tool
// Context: ONLY for event-based sponsor recommendations with booth locations and talking points
// ================================================================

const { z } = require('zod');
const { tool } = require('@langchain/core/tools');
const eventAIRecommendationService = require('../../eventAIRecommendationService');

// Zod schema for input validation
const EventSponsorMatchSchema = z.object({
  eventId: z.number().int().positive().describe('The event ID where sponsors are present'),
  contractorId: z.number().int().positive().describe('The contractor ID requesting sponsor recommendations'),
  limit: z.number().int().positive().default(3).describe('Maximum number of sponsors to recommend (default: 3, max: 5)')
});

/**
 * Event Sponsor Match Tool Function
 * Called by LangGraph agent when contractor needs sponsor recommendations at an event
 */
const eventSponsorMatchFunction = async ({ eventId, contractorId, limit = 3 }) => {
  console.log(`[Event Sponsor Match Tool] Finding sponsor recommendations for contractor ${contractorId} at event ${eventId}`);

  try {
    // Call existing eventAIRecommendationService
    const result = await eventAIRecommendationService.recommendSponsors(
      eventId,
      contractorId,
      Math.min(limit, 5) // Cap at 5 to avoid overwhelming
    );

    // Check if recommendations were found
    if (!result.recommendations || result.recommendations.length === 0) {
      console.log('[Event Sponsor Match Tool] No sponsors found at this event');

      return JSON.stringify({
        success: true,
        sponsors: [],
        message: result.message || 'No sponsors are currently at this event.',
        eventId,
        contractorId
      });
    }

    // Format sponsors for agent response
    const sponsors = result.recommendations.map(sponsor => ({
      sponsorId: sponsor.sponsor_id,
      partnerId: sponsor.partner_id,
      companyName: sponsor.company_name,
      boothNumber: sponsor.booth_number,
      boothLocation: sponsor.booth_location,
      boothContact: sponsor.booth_contact ? {
        name: sponsor.booth_contact.name,
        title: sponsor.booth_contact.title,
        greeting: sponsor.booth_contact.greeting
      } : null,
      matchScore: sponsor.score,
      whyRecommended: sponsor.why,
      talkingPoints: sponsor.talking_points,
      valueProposition: sponsor.value_proposition,
      demoBookingUrl: sponsor.demo_booking_url,
      specialOffers: sponsor.special_offers
    }));

    // Extract contractor context for additional insights
    const contractorContext = result.contractor_context || {};

    console.log(`[Event Sponsor Match Tool] Found ${sponsors.length} sponsor recommendations, top score: ${sponsors[0]?.matchScore}`);

    return JSON.stringify({
      success: true,
      sponsors,
      contractorContext: {
        focusAreas: contractorContext.focus_areas || [],
        company: contractorContext.company,
        currentNeeds: contractorContext.current_needs || []
      },
      eventId,
      contractorId,
      message: `Found ${sponsors.length} sponsors at this event matching your business needs`
    });

  } catch (error) {
    console.error('[Event Sponsor Match Tool] Error:', error);

    return JSON.stringify({
      success: false,
      error: error.message,
      eventId,
      contractorId
    });
  }
};

// Create the LangChain tool
const eventSponsorMatchTool = tool(
  eventSponsorMatchFunction,
  {
    name: 'event_sponsor_match',
    description: `Find and recommend sponsors/partners who are present at a specific live event based on contractor needs.

Use this tool when:
- Contractor is AT AN EVENT and asks about sponsors/exhibitors to visit
- Contractor wants personalized booth recommendations at an event
- Contractor needs talking points for sponsor interactions at an event
- Contractor asks "which booths should I visit?" or "who should I talk to at this event?"

IMPORTANT: This tool is ONLY for EVENT-SPECIFIC sponsor recommendations.
- It matches contractors with sponsors who are PHYSICALLY PRESENT at the event
- Provides booth locations, numbers, and personalized talking points
- Different from general partner matching (which is for non-event scenarios)

The tool uses:
- Contractor's focus areas, revenue tier, and business goals
- Sponsor focus areas, PCR scores, and target profiles
- AI-generated personalized talking points
- Booth contact information and locations

Returns: JSON with sponsor recommendations including:
- Match scores and reasons
- Booth locations and contact information
- Personalized talking points for conversations
- Special offers and demo booking links

Automatically tracks recommendations to ai_learning_events for continuous improvement.`,
    schema: EventSponsorMatchSchema
  }
);

module.exports = eventSponsorMatchTool;
