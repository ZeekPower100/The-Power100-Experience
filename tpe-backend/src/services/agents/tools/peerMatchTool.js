// DATABASE-CHECKED: contractors, event_peer_matches verified October 17, 2025
// INTEGRATION: Uses peerMatchingService.js for intelligent contractor matching
// VERIFIED DATABASE FIELDS:
// - contractors.id, first_name, last_name, email, phone, company_name, focus_areas, revenue_tier
// - event_peer_matches.contractor_id, matched_contractor_id, event_id, match_score, match_reason
// PEER MATCHING ALGORITHM: Focus overlap (40%), Geographic separation (25%), Business scale (20%), Industry alignment (15%)

const { z } = require('zod');
const { tool } = require('@langchain/core/tools');
const { query } = require('../../../config/database');
const peerMatchingService = require('../../peerMatchingService');
const AIActionGuards = require('../../guards/aiActionGuards');
const GuardLogger = require('../../guards/guardLogger');

/**
 * Zod schema for peer matching validation
 * Follows DynamicStructuredTool pattern used by all AI Concierge tools
 */
const PeerMatchSchema = z.object({
  contractorId: z.number().int().positive().describe('The contractor ID to find peer matches for'),
  eventId: z.number().int().positive().describe('The event ID where peer matching is happening'),
  maxMatches: z.number().int().positive().max(5).optional().describe('Maximum number of peer matches to return (default: 3, max: 5)'),
  checkExistingFirst: z.boolean().optional().describe('Whether to check for existing peer matches first (default: true)')
});

/**
 * Find peer matches for contractor at event
 *
 * This tool allows AI Concierge to help contractors find valuable peer connections at events.
 * It intelligently matches based on business focus, geographic separation, and growth stage.
 *
 * Matching Strategy:
 * 1. First checks if contractor already has peer matches in database (event_peer_matches table)
 * 2. If no existing matches or contractor wants more options, runs matching algorithm
 * 3. Returns matches with scores, reasons, and contact information
 * 4. Logs all matching actions to ai_learning_events for continuous improvement
 *
 * @param {Object} params - Peer matching parameters
 * @param {number} params.contractorId - Contractor ID from database
 * @param {number} params.eventId - Event ID where matching is happening
 * @param {number} [params.maxMatches=3] - Maximum number of matches to return (max: 5)
 * @param {boolean} [params.checkExistingFirst=true] - Check existing matches first
 * @returns {string} JSON string with match results, scores, reasons, and contact info
 */
const peerMatchFunction = async ({ contractorId, eventId, maxMatches = 3, checkExistingFirst = true }) => {
  const startTime = Date.now();

  try {
    // Guard check: Verify AI has permission to perform peer matching
    const permissionCheck = await AIActionGuards.canPerformAction('peer_matching', contractorId);
    if (!permissionCheck.allowed) {
      await GuardLogger.logRejection({
        guardType: 'peer_matching_permission',
        contractorId,
        reason: permissionCheck.reason,
        details: { eventId, maxMatches }
      });

      return JSON.stringify({
        success: false,
        error: 'Permission denied',
        reason: permissionCheck.reason,
        suggestion: 'Rate limit may have been reached or peer matching is disabled for this contractor'
      });
    }

    // Get contractor information
    const contractorResult = await query(
      'SELECT id, first_name, last_name, email, phone, company_name, focus_areas FROM contractors WHERE id = $1',
      [contractorId]
    );

    if (!contractorResult.rows.length) {
      return JSON.stringify({
        success: false,
        error: 'Contractor not found',
        contractorId
      });
    }

    const contractor = contractorResult.rows[0];
    const contractorName = `${contractor.first_name || ''} ${contractor.last_name || ''}`.trim();

    // Step 1: Check for existing peer matches if requested
    let existingMatches = [];
    if (checkExistingFirst) {
      const existingMatchesResult = await query(`
        SELECT
          epm.id as match_id,
          epm.matched_contractor_id,
          epm.match_score,
          epm.match_reason,
          epm.created_at,
          c.first_name,
          c.last_name,
          c.company_name,
          c.email,
          c.phone,
          c.focus_areas,
          c.revenue_tier
        FROM event_peer_matches epm
        JOIN contractors c ON c.id = epm.matched_contractor_id
        WHERE epm.contractor_id = $1
          AND epm.event_id = $2
          AND epm.match_status = 'active'
        ORDER BY epm.match_score DESC
        LIMIT $3
      `, [contractorId, eventId, maxMatches]);

      if (existingMatchesResult.rows.length > 0) {
        existingMatches = existingMatchesResult.rows.map(match => ({
          matchId: match.match_id,
          contractorId: match.matched_contractor_id,
          name: `${match.first_name || ''} ${match.last_name || ''}`.trim(),
          companyName: match.company_name,
          email: match.email,
          phone: match.phone,
          focusAreas: match.focus_areas ? JSON.parse(match.focus_areas) : [],
          revenueTier: match.revenue_tier,
          matchScore: match.match_score,
          matchReason: match.match_reason,
          matchType: 'existing',
          createdAt: match.created_at
        }));
      }
    }

    // Step 2: Find new peer matches using matching algorithm
    const newMatches = await peerMatchingService.findPeerMatches(contractorId, eventId, {
      minScore: 0.6,
      maxMatches: maxMatches,
      excludeExisting: checkExistingFirst
    });

    // Combine existing and new matches
    const allMatches = [...existingMatches, ...newMatches];

    // Sort by match score and limit to maxMatches
    const finalMatches = allMatches
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, maxMatches);

    const responseTime = Date.now() - startTime;

    // Log successful peer matching to ai_learning_events
    await query(`
      INSERT INTO ai_learning_events (
        event_type,
        contractor_id,
        action_taken,
        outcome,
        metadata,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, NOW())
    `, [
      'peer_matching_performed',
      contractorId,
      `Found ${finalMatches.length} peer matches for ${contractorName} at event ${eventId}`,
      'success',
      JSON.stringify({
        eventId,
        existingMatchesFound: existingMatches.length,
        newMatchesFound: newMatches.length,
        totalMatches: finalMatches.length,
        maxMatches,
        responseTime,
        topMatchScore: finalMatches.length > 0 ? finalMatches[0].matchScore : 0
      })
    ]);

    // Log success to guard system
    await GuardLogger.logSuccess({
      guardType: 'peer_matching_performed',
      contractorId,
      details: {
        eventId,
        matchesFound: finalMatches.length,
        responseTime
      }
    });

    return JSON.stringify({
      success: true,
      contractor: {
        id: contractorId,
        name: contractorName,
        companyName: contractor.company_name
      },
      eventId: eventId,
      totalMatches: finalMatches.length,
      matches: finalMatches.map(match => ({
        matchId: match.matchId || null,
        contractorId: match.contractorId,
        name: match.name,
        companyName: match.companyName,
        contactInfo: {
          email: match.email,
          phone: match.phone
        },
        focusAreas: match.focusAreas,
        revenueTier: match.revenueTier,
        matchScore: Math.round(match.matchScore * 100), // Convert to percentage
        matchReason: match.matchReason,
        matchType: match.matchType || 'new',
        createdAt: match.createdAt || new Date().toISOString()
      })),
      responseTime: responseTime,
      suggestions: finalMatches.length === 0
        ? 'No suitable peer matches found at this event. Try broadening search criteria or check other events.'
        : `Found ${finalMatches.length} great peer connection${finalMatches.length > 1 ? 's' : ''}! The top match has a ${Math.round(finalMatches[0].matchScore * 100)}% compatibility score.`
    });

  } catch (error) {
    const responseTime = Date.now() - startTime;

    // Log failed peer matching attempt
    await query(`
      INSERT INTO ai_learning_events (
        event_type,
        contractor_id,
        action_taken,
        outcome,
        metadata,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, NOW())
    `, [
      'peer_matching_failed',
      contractorId,
      `Failed to find peer matches at event ${eventId}`,
      'error',
      JSON.stringify({
        eventId,
        error: error.message,
        responseTime,
        stack: error.stack
      })
    ]).catch(err => {
      console.error('Failed to log peer matching error to ai_learning_events:', err);
    });

    return JSON.stringify({
      success: false,
      error: error.message,
      eventId: eventId,
      suggestion: 'Peer matching service may be temporarily unavailable. Try again or contact support.',
      responseTime: responseTime
    });
  }
};

/**
 * LangChain DynamicStructuredTool for peer matching
 * Binds to AI Concierge agents via model.bindTools()
 */
const peerMatchTool = tool(peerMatchFunction, {
  name: 'find_peer_matches',
  description: `Find peer matches for a contractor at an event based on business compatibility.

Use this tool when:
- Contractor asks to meet other contractors with similar business goals
- Contractor wants networking recommendations at the event
- Contractor is looking for peer connections for collaboration or learning
- Contractor asks "who should I connect with?" or similar questions
- You want to proactively suggest valuable peer connections

Matching Algorithm:
- Focus Area Overlap (40% weight): Contractors working on similar business goals
- Geographic Separation (25% weight): Non-competing markets (different states/regions)
- Business Scale (20% weight): Similar revenue tier and team size for peer learning
- Industry Alignment (15% weight): Compatible business models and service offerings

Important guidelines:
- ALWAYS check existing peer matches first (checkExistingFirst: true by default)
- If contractor already has matches, present those before finding new ones
- If contractor wants MORE matches or DIFFERENT matches, find new ones
- Match scores are percentages (0-100%) indicating compatibility
- Higher scores = better compatibility for networking and collaboration
- Provide match reasons to help contractor understand WHY they'd be good connections
- Include contact information so contractor can reach out
- Respect privacy - only share contact info of contractors at the SAME event
- Maximum 5 matches per request to avoid overwhelming contractor

Returns: JSON with match scores, compatibility reasons, contact info, and networking suggestions`,
  schema: PeerMatchSchema
});

module.exports = peerMatchTool;
