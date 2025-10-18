/**
 * Peer Matching Service - Event Orchestrator Phase 5
 *
 * Matches contractors at events with peers who have:
 * - Same focus areas (business challenges)
 * - Different geographic markets (non-competing)
 * - Similar business scale (revenue/team size)
 * - Same industry vertical
 *
 * Purpose: Facilitate valuable peer-to-peer connections at events
 */

const pool = require('../config/database');
const { safeJsonParse } = require('../utils/jsonHelpers');

class PeerMatchingService {
  /**
   * Find potential peer matches for a contractor at an event
   *
   * @param {number} contractorId - Contractor seeking matches
   * @param {number} eventId - Event context
   * @param {object} options - Matching preferences
   * @returns {Promise<Array>} Array of matched contractors with scores
   */
  async findPeerMatches(contractorId, eventId, options = {}) {
    const {
      maxMatches = 3,
      minScore = 0.6,
      excludeMatched = true
    } = options;

    try {
      // Get source contractor profile
      const sourceContractor = await this.getContractorProfile(contractorId);

      if (!sourceContractor) {
        throw new Error('Contractor not found');
      }

      // Get all event attendees (excluding source contractor)
      const attendees = await this.getEventAttendees(eventId, contractorId);

      // Calculate match scores for each attendee
      const scoredMatches = attendees.map(attendee => {
        const score = this.calculateMatchScore(sourceContractor, attendee);
        const reason = this.generateMatchReason(sourceContractor, attendee, score);

        return {
          ...attendee,
          matchScore: score.total,
          matchCriteria: score.breakdown,
          matchReason: reason,
          matchType: this.determineMatchType(score.breakdown)
        };
      });

      // Filter by minimum score and sort
      let matches = scoredMatches
        .filter(m => m.matchScore >= minScore)
        .sort((a, b) => b.matchScore - a.matchScore)
        .slice(0, maxMatches);

      // Optionally exclude already matched contractors
      if (excludeMatched) {
        matches = await this.filterExistingMatches(contractorId, eventId, matches);
      }

      return matches;
    } catch (error) {
      console.error('[PeerMatchingService] Error finding matches:', error);
      throw error;
    }
  }

  /**
   * Calculate comprehensive match score between two contractors
   *
   * Scoring weights:
   * - Focus Area Overlap: 35% (reduced from 40% to make room for job_title)
   * - Geographic Separation: 25%
   * - Business Scale Similarity: 20%
   * - Industry Alignment: 15%
   * - Job Title Match: 5% (bonus when both have job_title)
   */
  calculateMatchScore(contractor1, contractor2) {
    const breakdown = {};

    // 1. Focus Area Overlap (35%) - REQUIRED
    const focusAreaScore = this.scoreFocusAreaMatch(
      contractor1.focus_areas,
      contractor2.focus_areas
    );
    breakdown.focusAreas = focusAreaScore;

    // 2. Geographic Separation (25%) - Different markets
    const geoScore = this.scoreGeographicSeparation(
      contractor1.service_area,
      contractor2.service_area
    );
    breakdown.geographic = geoScore;

    // 3. Business Scale Similarity (20%)
    const scaleScore = this.scoreBusinessScale(
      {
        revenue: contractor1.revenue_tier || contractor1.annual_revenue,
        teamSize: contractor1.team_size
      },
      {
        revenue: contractor2.revenue_tier || contractor2.annual_revenue,
        teamSize: contractor2.team_size
      }
    );
    breakdown.businessScale = scaleScore;

    // 4. Industry Alignment (15%)
    const industryScore = this.scoreIndustryAlignment(
      contractor1.services_offered,
      contractor2.services_offered
    );
    breakdown.industry = industryScore;

    // 5. Job Title Match (5%) - OPTIONAL BONUS
    const jobTitleScore = this.scoreJobTitleMatch(
      contractor1.job_title,
      contractor2.job_title
    );
    breakdown.jobTitle = jobTitleScore;

    // Calculate weighted total
    // If job_title is missing for both, focusAreaScore gets its full weight (40%)
    const hasJobTitles = contractor1.job_title && contractor2.job_title;
    const total = hasJobTitles
      ? (
          (focusAreaScore * 0.35) +
          (geoScore * 0.25) +
          (scaleScore * 0.20) +
          (industryScore * 0.15) +
          (jobTitleScore * 0.05)
        )
      : (
          (focusAreaScore * 0.40) + // Full 40% when no job_title
          (geoScore * 0.25) +
          (scaleScore * 0.20) +
          (industryScore * 0.15)
        );

    return {
      total: Math.round(total * 100) / 100, // Round to 2 decimals
      breakdown
    };
  }

  /**
   * Score focus area overlap
   * Returns 0-1 score based on common focus areas
   * Normalizes both underscores and spaces for matching
   */
  scoreFocusAreaMatch(areas1, areas2) {
    const arr1 = Array.isArray(areas1) ? areas1 : safeJsonParse(areas1, []);
    const arr2 = Array.isArray(areas2) ? areas2 : safeJsonParse(areas2, []);

    if (arr1.length === 0 || arr2.length === 0) return 0;

    // Normalize function: lowercase + replace spaces/underscores with consistent format
    const normalize = (str) => str.toLowerCase().replace(/[\s_]+/g, '_');

    const set1 = new Set(arr1.map(a => normalize(a)));
    const set2 = new Set(arr2.map(a => normalize(a)));

    const intersection = [...set1].filter(x => set2.has(x));
    const union = new Set([...set1, ...set2]);

    // Jaccard similarity
    return intersection.length / union.size;
  }

  /**
   * Score geographic separation
   * Higher score = more separated (non-competing markets)
   */
  scoreGeographicSeparation(area1, area2) {
    // If either is null/empty, assume different (benefit of doubt)
    if (!area1 || !area2) return 0.7;

    const normalizedArea1 = (area1 || '').toLowerCase().trim();
    const normalizedArea2 = (area2 || '').toLowerCase().trim();

    // Exact same area = low score (competing market)
    if (normalizedArea1 === normalizedArea2) return 0.2;

    // Check for state-level overlap (e.g., "Dallas, TX" vs "Austin, TX")
    const state1 = this.extractState(normalizedArea1);
    const state2 = this.extractState(normalizedArea2);

    if (state1 && state2) {
      if (state1 === state2) return 0.5; // Same state, different cities
      return 1.0; // Different states = perfect separation
    }

    // If no state info, check for any substring overlap
    if (normalizedArea1.includes(normalizedArea2) || normalizedArea2.includes(normalizedArea1)) {
      return 0.4; // Some overlap
    }

    return 0.8; // Likely different markets
  }

  /**
   * Extract state abbreviation from location string
   */
  extractState(location) {
    const statePattern = /\b([A-Z]{2})\b/; // Match 2-letter state codes
    const match = location.toUpperCase().match(statePattern);
    return match ? match[1] : null;
  }

  /**
   * Score business scale similarity
   * Similar size = better peer match
   */
  scoreBusinessScale(scale1, scale2) {
    let score = 0;
    let factors = 0;

    // Revenue comparison
    if (scale1.revenue && scale2.revenue) {
      const revenueScore = this.compareRevenueTiers(scale1.revenue, scale2.revenue);
      score += revenueScore;
      factors++;
    }

    // Team size comparison
    if (scale1.teamSize && scale2.teamSize) {
      const teamScore = this.compareTeamSizes(scale1.teamSize, scale2.teamSize);
      score += teamScore;
      factors++;
    }

    return factors > 0 ? score / factors : 0.5; // Default 0.5 if no data
  }

  /**
   * Compare revenue tiers
   * Handles multiple database formats: "1M-5M", "2m_5m", "31_50_million", etc.
   */
  compareRevenueTiers(rev1, rev2) {
    // Normalize revenue string to numeric midpoint for comparison
    const normalizeRevenue = (rev) => {
      if (!rev) return null;

      const normalized = rev.toString().toLowerCase().trim();

      // Handle formats like "1M-5M" or "1m-5m"
      const dashFormat = normalized.match(/(\d+)m?-(\d+)m/i);
      if (dashFormat) {
        const low = parseInt(dashFormat[1]);
        const high = parseInt(dashFormat[2]);
        return (low + high) / 2; // Million midpoint
      }

      // Handle underscore formats like "1m_2m", "2m_5m", "500k_1m"
      const underscoreFormat = normalized.match(/(\d+)(k|m)_(\d+)(k|m)/i);
      if (underscoreFormat) {
        let low = parseInt(underscoreFormat[1]);
        let high = parseInt(underscoreFormat[3]);

        // Convert k to m
        if (underscoreFormat[2] === 'k') low = low / 1000;
        if (underscoreFormat[4] === 'k') high = high / 1000;

        return (low + high) / 2; // Million midpoint
      }

      // Handle "31_50_million" format
      const millionFormat = normalized.match(/(\d+)_(\d+)_million/);
      if (millionFormat) {
        const low = parseInt(millionFormat[1]);
        const high = parseInt(millionFormat[2]);
        return (low + high) / 2;
      }

      // Handle "under_500k"
      if (normalized.includes('under')) {
        return 0.25; // Assume 250k midpoint
      }

      // Handle "10m_plus" or ">10m"
      if (normalized.includes('plus') || normalized.includes('>')) {
        return 15; // Assume 15M midpoint for 10M+
      }

      return null;
    };

    const tier1Value = normalizeRevenue(rev1);
    const tier2Value = normalizeRevenue(rev2);

    if (tier1Value === null || tier2Value === null) return 0.5;

    // Calculate percentage difference
    const difference = Math.abs(tier1Value - tier2Value);
    const average = (tier1Value + tier2Value) / 2;
    const percentDiff = difference / average;

    // Score based on percentage difference
    if (percentDiff < 0.2) return 1.0;  // Within 20%
    if (percentDiff < 0.5) return 0.8;  // Within 50%
    if (percentDiff < 1.0) return 0.6;  // Within 100% (double/half)
    if (percentDiff < 2.0) return 0.4;  // Within 200%
    return 0.2; // More than 200% different
  }

  /**
   * Compare team sizes
   */
  compareTeamSizes(size1, size2) {
    if (!size1 || !size2) return 0.5;

    const difference = Math.abs(size1 - size2);
    const average = (size1 + size2) / 2;
    const percentDiff = difference / average;

    if (percentDiff < 0.2) return 1.0;  // Within 20%
    if (percentDiff < 0.5) return 0.8;  // Within 50%
    if (percentDiff < 1.0) return 0.5;  // Within 100%
    return 0.3; // More than 100% different
  }

  /**
   * Score industry alignment
   * Similar services = better peer match
   */
  scoreIndustryAlignment(services1, services2) {
    const arr1 = Array.isArray(services1) ? services1 : safeJsonParse(services1, []);
    const arr2 = Array.isArray(services2) ? services2 : safeJsonParse(services2, []);

    if (arr1.length === 0 || arr2.length === 0) return 0.5;

    const set1 = new Set(arr1.map(s => s.toLowerCase()));
    const set2 = new Set(arr2.map(s => s.toLowerCase()));

    const intersection = [...set1].filter(x => set2.has(x));

    // Higher overlap = better industry alignment
    return Math.min(intersection.length / Math.max(set1.size, set2.size), 1.0);
  }

  /**
   * Score job title match
   * Same or similar job titles = better peer match
   * Returns 0-1 score, or 0 if either is missing (doesn't penalize)
   */
  scoreJobTitleMatch(title1, title2) {
    // If either is missing, return 0 (no bonus, no penalty)
    if (!title1 || !title2) return 0;

    const normalized1 = title1.toLowerCase().trim();
    const normalized2 = title2.toLowerCase().trim();

    // Exact match
    if (normalized1 === normalized2) return 1.0;

    // Check for common title variations
    const titleSynonyms = {
      'owner': ['ceo', 'founder', 'president', 'principal'],
      'manager': ['director', 'supervisor', 'lead'],
      'operations': ['ops', 'project manager', 'pm'],
      'sales': ['business development', 'account executive', 'bd']
    };

    // Check if titles are synonymous
    for (const [key, synonyms] of Object.entries(titleSynonyms)) {
      const hasKey1 = normalized1.includes(key) || synonyms.some(s => normalized1.includes(s));
      const hasKey2 = normalized2.includes(key) || synonyms.some(s => normalized2.includes(s));

      if (hasKey1 && hasKey2) return 0.8; // Similar role category
    }

    // Partial string match (e.g., "Operations Manager" and "Project Manager")
    const words1 = normalized1.split(/\s+/);
    const words2 = normalized2.split(/\s+/);
    const commonWords = words1.filter(w => words2.includes(w) && w.length > 3);

    if (commonWords.length > 0) {
      return 0.5; // Some overlap in title
    }

    return 0; // No match, no bonus
  }

  /**
   * Generate human-readable match reason
   */
  generateMatchReason(contractor1, contractor2, score) {
    const reasons = [];

    // Focus area overlap
    const commonFocusAreas = this.getCommonFocusAreas(
      contractor1.focus_areas,
      contractor2.focus_areas
    );
    if (commonFocusAreas.length > 0) {
      reasons.push(`Both focused on ${commonFocusAreas.join(' and ')}`);
    }

    // Geographic separation
    if (score.breakdown.geographic > 0.7) {
      reasons.push(`Different markets (${contractor1.service_area || 'their area'} vs ${contractor2.service_area || 'their area'})`);
    }

    // Similar scale
    if (score.breakdown.businessScale > 0.7) {
      reasons.push('Similar business size');
    }

    // Industry alignment
    if (score.breakdown.industry > 0.6) {
      reasons.push('Same industry vertical');
    }

    return reasons.join('. ') + '.';
  }

  /**
   * Get common focus areas between two contractors
   * Uses same normalization as scoreFocusAreaMatch
   */
  getCommonFocusAreas(areas1, areas2) {
    const arr1 = Array.isArray(areas1) ? areas1 : safeJsonParse(areas1, []);
    const arr2 = Array.isArray(areas2) ? areas2 : safeJsonParse(areas2, []);

    // Normalize function: lowercase + replace spaces/underscores with consistent format
    const normalize = (str) => str.toLowerCase().replace(/[\s_]+/g, '_');

    const set2 = new Set(arr2.map(a => normalize(a)));
    return arr1.filter(a => set2.has(normalize(a)));
  }

  /**
   * Determine match type based on scoring breakdown
   */
  determineMatchType(breakdown) {
    if (breakdown.focusAreas > 0.8 && breakdown.geographic > 0.8) {
      return 'ideal_peer'; // Perfect match
    }
    if (breakdown.focusAreas > 0.6) {
      return 'focus_area_match'; // Similar challenges
    }
    if (breakdown.businessScale > 0.8) {
      return 'scale_match'; // Similar size
    }
    return 'general_match';
  }

  /**
   * Get contractor profile with all necessary fields
   */
  async getContractorProfile(contractorId) {
    const query = `
      SELECT
        id, first_name, last_name, email, phone,
        company_name, revenue_tier, annual_revenue, team_size,
        focus_areas, service_area, services_offered, job_title
      FROM contractors
      WHERE id = $1
    `;

    const result = await pool.query(query, [contractorId]);
    return result.rows[0];
  }

  /**
   * Get all attendees for an event (excluding specified contractor)
   */
  async getEventAttendees(eventId, excludeContractorId) {
    const query = `
      SELECT
        c.id, c.first_name, c.last_name, c.email, c.phone,
        c.company_name, c.revenue_tier, c.annual_revenue, c.team_size,
        c.focus_areas, c.service_area, c.services_offered, c.job_title
      FROM contractors c
      INNER JOIN event_attendees ea ON c.id = ea.contractor_id
      WHERE ea.event_id = $1
        AND c.id != $2
        AND ea.check_in_time IS NOT NULL
    `;

    const result = await pool.query(query, [eventId, excludeContractorId]);
    return result.rows;
  }

  /**
   * Filter out contractors already matched
   */
  async filterExistingMatches(contractorId, eventId, potentialMatches) {
    const query = `
      SELECT contractor2_id
      FROM event_peer_matches
      WHERE event_id = $1
        AND contractor1_id = $2
        AND introduction_sent_time IS NOT NULL
    `;

    const result = await pool.query(query, [eventId, contractorId]);
    const matchedIds = new Set(result.rows.map(r => r.contractor2_id));

    return potentialMatches.filter(m => !matchedIds.has(m.id));
  }

  /**
   * Create a peer match record
   * Ensures contractor1_id < contractor2_id to satisfy database constraint
   */
  async createPeerMatch(contractorId, peerId, eventId, matchData) {
    // Ensure contractor1_id < contractor2_id (database constraint)
    const contractor1_id = Math.min(contractorId, peerId);
    const contractor2_id = Math.max(contractorId, peerId);

    const query = `
      INSERT INTO event_peer_matches (
        event_id, contractor1_id, contractor2_id,
        match_type, match_criteria, match_score, match_reason,
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
      RETURNING *
    `;

    const values = [
      eventId,
      contractor1_id,
      contractor2_id,
      matchData.matchType,
      JSON.stringify(matchData.matchCriteria),
      matchData.matchScore,
      matchData.matchReason
    ];

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  /**
   * Update match with introduction details
   */
  async recordIntroduction(matchId, message) {
    const query = `
      UPDATE event_peer_matches
      SET
        introduction_sent_time = NOW(),
        introduction_message = $2,
        updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;

    const result = await pool.query(query, [matchId, message]);
    return result.rows[0];
  }

  /**
   * Record contractor response to introduction
   */
  async recordResponse(matchId, contractorId, response) {
    // Determine which contractor is responding
    const match = await this.getMatchById(matchId);

    const isContractor1 = match.contractor1_id === contractorId;
    const field = isContractor1 ? 'contractor1_response' : 'contractor2_response';

    const query = `
      UPDATE event_peer_matches
      SET
        ${field} = $2,
        updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;

    const result = await pool.query(query, [matchId, response]);
    return result.rows[0];
  }

  /**
   * Mark connection as made
   */
  async recordConnection(matchId, meetingDetails = {}) {
    const query = `
      UPDATE event_peer_matches
      SET
        connection_made = true,
        meeting_scheduled = $2,
        meeting_time = $3,
        meeting_location = $4,
        updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;

    const values = [
      matchId,
      meetingDetails.scheduled || false,
      meetingDetails.time || null,
      meetingDetails.location || null
    ];

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  /**
   * Get match by ID
   */
  async getMatchById(matchId) {
    const query = `SELECT * FROM event_peer_matches WHERE id = $1`;
    const result = await pool.query(query, [matchId]);
    return result.rows[0];
  }

  /**
   * Get all matches for a contractor at an event
   */
  async getContractorMatches(contractorId, eventId) {
    const query = `
      SELECT
        epm.*,
        c1.first_name as contractor1_first_name,
        c1.last_name as contractor1_last_name,
        c1.company_name as contractor1_company,
        c2.first_name as contractor2_first_name,
        c2.last_name as contractor2_last_name,
        c2.company_name as contractor2_company
      FROM event_peer_matches epm
      INNER JOIN contractors c1 ON epm.contractor1_id = c1.id
      INNER JOIN contractors c2 ON epm.contractor2_id = c2.id
      WHERE epm.event_id = $1
        AND (epm.contractor1_id = $2 OR epm.contractor2_id = $2)
      ORDER BY epm.match_score DESC
    `;

    const result = await pool.query(query, [eventId, contractorId]);
    return result.rows;
  }

  // ==================== SMS PROMPTS & MESSAGING ====================

  /**
   * Generate "Find Your Peer" SMS prompt
   *
   * @param {object} contractor - Contractor receiving the message
   * @param {object} peer - Matched peer contractor
   * @param {object} match - Match details (score, reason, etc)
   * @returns {string} Personalized SMS message
   */
  generatePeerIntroductionSMS(contractor, peer, match) {
    const firstName = contractor.first_name || 'there';
    const peerFirstName = peer.first_name || 'a fellow contractor';
    const peerLastName = peer.last_name || '';
    const peerCompany = peer.company_name || 'their company';
    const peerLocation = peer.service_area || 'a different market';

    // Get common focus areas for context
    const commonFocusAreas = this.getCommonFocusAreas(
      contractor.focus_areas,
      peer.focus_areas
    );

    const focusContext = commonFocusAreas.length > 0
      ? `both focused on ${this.formatFocusAreas(commonFocusAreas)}`
      : 'similar business challenges';

    const message = `Hey ${firstName}! 👋

🤝 Find Your Peer: I found someone perfect for you to meet!

${peerFirstName} ${peerLastName} from ${peerCompany} (${peerLocation}) - you're ${focusContext}.

They're in a non-competing market, so this is a great chance to share strategies!

Reply YES to get an intro, or LATER if you want to connect during a break.`;

    return message;
  }

  /**
   * Generate break-time coordination message
   */
  generateBreakTimePrompt(contractor, peer, breakTime, location) {
    const firstName = contractor.first_name || 'there';
    const peerFirstName = peer.first_name || 'your peer';

    return `Hey ${firstName}!

☕ Break time in 5 minutes!

Want to meet ${peerFirstName} at ${location}? They're waiting to connect with you.

Reply YES to confirm or SKIP if you need this break.`;
  }

  /**
   * Generate contact exchange message (after both parties agree)
   */
  generateContactExchangeSMS(contractor, peer) {
    const firstName = contractor.first_name || 'there';
    const peerFirstName = peer.first_name || '';
    const peerLastName = peer.last_name || '';
    const peerPhone = peer.phone || 'contact via event staff';
    const peerEmail = peer.email || '';
    const peerCompany = peer.company_name || '';

    let contactInfo = `📱 ${peerPhone}`;
    if (peerEmail) {
      contactInfo += `\n✉️ ${peerEmail}`;
    }

    return `Great news, ${firstName}! 🎉

${peerFirstName} ${peerLastName} (${peerCompany}) also wants to connect!

${contactInfo}

I've sent them your info too. Enjoy the conversation!`;
  }

  /**
   * Generate follow-up after connection is made
   */
  generatePostConnectionFollowUp(contractor, peer) {
    const firstName = contractor.first_name || 'there';
    const peerFirstName = peer.first_name || 'your peer';

    return `Hey ${firstName}!

How was your chat with ${peerFirstName}?

Reply with a quick rating (1-10) to help us make better matches in the future!`;
  }

  /**
   * Format focus areas list for SMS
   */
  formatFocusAreas(areas) {
    if (areas.length === 0) return '';
    if (areas.length === 1) return areas[0];
    if (areas.length === 2) return `${areas[0]} and ${areas[1]}`;

    // For 3+, show first 2 and count
    return `${areas[0]}, ${areas[1]}, and ${areas.length - 2} more`;
  }

  /**
   * Determine optimal timing for peer prompt
   * Returns suggested time slots during event
   */
  getSuggestedPromptTimes(eventSchedule) {
    const promptTimes = [];

    // Before sessions start (arrival time)
    if (eventSchedule.startTime) {
      const arrivalPrompt = new Date(eventSchedule.startTime);
      arrivalPrompt.setMinutes(arrivalPrompt.getMinutes() - 15);
      promptTimes.push({
        time: arrivalPrompt,
        context: 'arrival',
        message: 'Perfect timing to meet before the first session!'
      });
    }

    // During breaks
    if (eventSchedule.breaks && eventSchedule.breaks.length > 0) {
      eventSchedule.breaks.forEach(breakTime => {
        const breakPrompt = new Date(breakTime.start);
        breakPrompt.setMinutes(breakPrompt.getMinutes() - 5);
        promptTimes.push({
          time: breakPrompt,
          context: 'break',
          location: breakTime.location || 'the networking area',
          message: 'Break time - perfect for a quick peer chat!'
        });
      });
    }

    // During lunch
    if (eventSchedule.lunch) {
      const lunchPrompt = new Date(eventSchedule.lunch.start);
      lunchPrompt.setMinutes(lunchPrompt.getMinutes() + 5); // Give time to get food
      promptTimes.push({
        time: lunchPrompt,
        context: 'lunch',
        location: eventSchedule.lunch.location || 'the lunch area',
        message: 'Grab lunch together and talk shop!'
      });
    }

    // After event (networking time)
    if (eventSchedule.endTime) {
      const networkingPrompt = new Date(eventSchedule.endTime);
      networkingPrompt.setMinutes(networkingPrompt.getMinutes() - 30);
      promptTimes.push({
        time: networkingPrompt,
        context: 'networking',
        message: 'Last chance to connect before everyone leaves!'
      });
    }

    return promptTimes;
  }

  /**
   * Schedule peer introduction SMS
   * Integrates with event messaging system
   */
  async schedulePeerIntroductionSMS(matchId, timing = 'immediate') {
    const match = await this.getMatchById(matchId);

    if (!match) {
      throw new Error('Match not found');
    }

    // Get contractor profiles
    const contractor1 = await this.getContractorProfile(match.contractor1_id);
    const contractor2 = await this.getContractorProfile(match.contractor2_id);

    // Generate messages for both contractors
    const message1 = this.generatePeerIntroductionSMS(contractor1, contractor2, match);
    const message2 = this.generatePeerIntroductionSMS(contractor2, contractor1, match);

    // Determine send time based on timing preference
    let scheduledTime = new Date();
    if (timing === 'next_break') {
      // TODO: Get event schedule and find next break
      scheduledTime.setHours(scheduledTime.getHours() + 2);
    } else if (timing === 'lunch') {
      scheduledTime.setHours(12, 0, 0, 0);
    }
    // 'immediate' uses current time

    // Create SMS records (these would be sent via n8n/GHL)
    return {
      message1: {
        contractorId: contractor1.id,
        message: message1,
        scheduledTime,
        type: 'peer_introduction'
      },
      message2: {
        contractorId: contractor2.id,
        message: message2,
        scheduledTime,
        type: 'peer_introduction'
      }
    };
  }
}

module.exports = new PeerMatchingService();