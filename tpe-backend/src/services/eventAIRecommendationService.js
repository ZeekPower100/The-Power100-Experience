const { query } = require('../config/database');
const { safeJsonParse, safeJsonStringify } = require('../utils/jsonHelpers');
const openAIService = require('./openAIService');

/**
 * Event AI Recommendation Service
 * Provides intelligent recommendations for event attendees
 * ALL FIELD NAMES MATCH DATABASE EXACTLY
 */
class EventAIRecommendationService {
  /**
   * Generate top speaker recommendations for an attendee
   * Using EXACT database column names
   */
  async recommendSpeakers(eventId, contractorId, limit = 3) {
    try {
      // Get contractor profile using EXACT column names
      const contractor = await query(`
        SELECT
          c.id,
          c.company_name,
          c.revenue_tier,  -- NOT revenue_range
          c.team_size,
          c.focus_areas,   -- TEXT field, not JSONB
          c.first_name,
          c.last_name
        FROM contractors c
        WHERE c.id = $1
      `, [contractorId]);

      if (contractor.rows.length === 0) {
        throw new Error('Contractor not found');
      }

      const contractorProfile = contractor.rows[0];
      // Parse focus_areas from TEXT field (stored as JSON string)
      const focusAreas = safeJsonParse(contractorProfile.focus_areas, []);

      // Get all speakers with agenda items - using EXACT column names
      const speakers = await query(`
        SELECT
          es.id,
          es.name,
          es.title,
          es.company,
          es.bio,
          es.session_title,
          es.session_description,
          es.session_time,
          es.focus_areas,  -- JSONB in event_speakers
          es.pcr_score,
          es.ai_summary,
          es.ai_key_points,
          eai.title as agenda_title,
          eai.synopsis,
          eai.key_takeaways,  -- JSONB
          eai.start_time,
          eai.location,
          eai.track,
          eai.focus_areas as agenda_focus_areas  -- JSONB
        FROM event_speakers es
        LEFT JOIN event_agenda_items eai ON es.id = eai.speaker_id
        WHERE es.event_id = $1
        ORDER BY es.pcr_score DESC NULLS LAST
      `, [eventId]);

      if (speakers.rows.length === 0) {
        return { recommendations: [], message: 'No speakers found for this event' };
      }

      // Score each speaker based on relevance
      const scoredSpeakers = await this.scoreSpeakers(
        speakers.rows,
        contractorProfile,
        focusAreas
      );

      // Get top speakers
      const topSpeakers = scoredSpeakers
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);

      // Generate AI explanations for WHY these speakers are recommended
      const recommendationsWithWhy = await this.generateSpeakerWhyExplanations(
        topSpeakers,
        contractorProfile
      );

      // Track recommendations for learning
      await this.trackRecommendations(
        contractorId,
        eventId,
        'speaker',
        recommendationsWithWhy
      );

      return {
        recommendations: recommendationsWithWhy,
        contractor_context: {
          focus_areas: focusAreas,
          company: contractorProfile.company_name,
          size: contractorProfile.team_size
        }
      };
    } catch (error) {
      console.error('Error generating speaker recommendations:', error);
      throw error;
    }
  }

  /**
   * Score speakers based on contractor profile
   */
  async scoreSpeakers(speakers, contractorProfile, focusAreas) {
    const scoredSpeakers = [];

    for (const speaker of speakers) {
      let score = 0;
      const reasons = [];

      // Parse JSONB fields
      const speakerFocusAreas = safeJsonParse(speaker.focus_areas, []);
      const agendaFocusAreas = safeJsonParse(speaker.agenda_focus_areas, []);
      const keyTakeaways = safeJsonParse(speaker.key_takeaways, []);
      const aiKeyPoints = safeJsonParse(speaker.ai_key_points, []);

      // Combine all focus areas from speaker and agenda
      const allSpeakerFocusAreas = [...new Set([...speakerFocusAreas, ...agendaFocusAreas])];

      // Score based on focus area match (40 points max)
      const focusMatches = allSpeakerFocusAreas.filter(area =>
        focusAreas.some(contractorArea =>
          area.toLowerCase().includes(contractorArea.toLowerCase()) ||
          contractorArea.toLowerCase().includes(area.toLowerCase())
        )
      );

      if (focusMatches.length > 0) {
        score += focusMatches.length * 15;
        reasons.push(`Addresses your focus areas: ${focusMatches.join(', ')}`);
      } else {
        // Fallback: Analyze session content for contractor focus area keywords
        const sessionContent = `${speaker.session_title || ''} ${speaker.session_description || ''} ${speaker.synopsis || ''}`.toLowerCase();
        const focusAreaKeywords = this.getFocusAreaKeywords(focusAreas);

        const contentMatches = focusAreaKeywords.filter(keyword =>
          sessionContent.includes(keyword.toLowerCase())
        );

        if (contentMatches.length > 0) {
          // Give partial credit (10 points per match, max 30) when content is relevant
          score += Math.min(contentMatches.length * 10, 30);
          reasons.push(`Session content relevant to: ${contentMatches.slice(0, 3).join(', ')}`);
        }
      }

      // Score based on PCR rating (20 points max)
      if (speaker.pcr_score) {
        const pcrPoints = (parseFloat(speaker.pcr_score) / 100) * 20;
        score += pcrPoints;
        if (speaker.pcr_score >= 80) {
          reasons.push(`Highly rated speaker (${speaker.pcr_score}% satisfaction)`);
        }
      }

      // Score based on business relevance (20 points max)
      const revenueTier = contractorProfile.revenue_tier;
      if (speaker.session_title || speaker.agenda_title) {
        // Check if session content matches business size
        const relevantKeywords = this.getRelevantKeywords(revenueTier, contractorProfile.team_size);
        const sessionContent = `${speaker.session_title || ''} ${speaker.session_description || ''} ${speaker.synopsis || ''}`.toLowerCase();

        const hasRelevantContent = relevantKeywords.some(keyword =>
          sessionContent.includes(keyword)
        );

        if (hasRelevantContent) {
          score += 20;
          reasons.push('Content specifically relevant to your business size');
        }
      }

      // Score based on actionable takeaways (20 points max)
      const totalTakeaways = keyTakeaways.length + aiKeyPoints.length;
      if (totalTakeaways > 0) {
        score += Math.min(totalTakeaways * 5, 20);
        reasons.push(`${totalTakeaways} actionable takeaways`);
      }

      // Bonus for AI summary presence (10 points)
      if (speaker.ai_summary) {
        score += 10;
        reasons.push('AI-enhanced content available');
      }

      scoredSpeakers.push({
        ...speaker,
        score,
        match_reasons: reasons
      });
    }

    return scoredSpeakers;
  }

  /**
   * Generate AI explanations for why speakers are recommended
   */
  async generateSpeakerWhyExplanations(speakers, contractorProfile) {
    const recommendations = [];

    for (const speaker of speakers) {
      try {
        // Build context for AI with CORRECT field names
        const context = {
          speaker_name: speaker.name,
          speaker_title: speaker.title,
          speaker_company: speaker.company,
          session_title: speaker.session_title || speaker.agenda_title,
          session_description: speaker.session_description || speaker.synopsis,
          key_takeaways: safeJsonParse(speaker.key_takeaways, []),
          ai_key_points: safeJsonParse(speaker.ai_key_points, []),
          contractor_company: contractorProfile.company_name,
          contractor_revenue: contractorProfile.revenue_tier,  // Using correct field name
          contractor_team_size: contractorProfile.team_size,
          contractor_focus_areas: safeJsonParse(contractorProfile.focus_areas, []),
          match_reasons: speaker.match_reasons
        };

        // Generate personalized WHY explanation
        const prompt = `
          You are an AI event advisor. Generate a concise, personalized explanation (2-3 sentences max)
          for why ${context.contractor_company} should attend this speaker's session.

          Speaker: ${context.speaker_name} (${context.speaker_title} at ${context.speaker_company})
          Session: ${context.session_title}

          Contractor Context:
          - Company: ${context.contractor_company}
          - Revenue Tier: ${context.contractor_revenue}
          - Team Size: ${context.contractor_team_size}
          - Focus Areas: ${context.contractor_focus_areas.join(', ')}

          Match Reasons: ${context.match_reasons.join('. ')}

          Make it specific and actionable. Focus on the value they'll get.
        `;

        const whyExplanation = await openAIService.generateCompletion(prompt, {
          max_tokens: 150,
          temperature: 0.7
        });

        recommendations.push({
          speaker_id: speaker.id,
          name: speaker.name,
          title: speaker.title,
          company: speaker.company,
          session: {
            title: speaker.session_title || speaker.agenda_title,
            time: speaker.start_time || speaker.session_time,
            location: speaker.location,
            track: speaker.track
          },
          score: speaker.score,
          why: whyExplanation,
          quick_reasons: speaker.match_reasons.slice(0, 3),
          key_takeaways: [
            ...safeJsonParse(speaker.key_takeaways, []).slice(0, 2),
            ...safeJsonParse(speaker.ai_key_points, []).slice(0, 1)
          ]
        });
      } catch (error) {
        console.error(`Error generating WHY for speaker ${speaker.name}:`, error);
        // Fall back to basic reasons
        recommendations.push({
          speaker_id: speaker.id,
          name: speaker.name,
          title: speaker.title,
          company: speaker.company,
          session: {
            title: speaker.session_title || speaker.agenda_title,
            time: speaker.start_time || speaker.session_time,
            location: speaker.location,
            track: speaker.track
          },
          score: speaker.score,
          why: speaker.match_reasons.join('. '),
          quick_reasons: speaker.match_reasons.slice(0, 3),
          key_takeaways: safeJsonParse(speaker.key_takeaways, []).slice(0, 3)
        });
      }
    }

    return recommendations;
  }

  /**
   * Generate top sponsor recommendations with talking points
   * Using EXACT database column names
   */
  async recommendSponsors(eventId, contractorId, limit = 3) {
    try {
      // Get contractor profile with CORRECT column names
      const contractor = await query(`
        SELECT
          id,
          company_name,
          revenue_tier,
          team_size,
          focus_areas
        FROM contractors
        WHERE id = $1
      `, [contractorId]);

      if (contractor.rows.length === 0) {
        throw new Error('Contractor not found');
      }

      const contractorProfile = contractor.rows[0];
      const focusAreas = safeJsonParse(contractorProfile.focus_areas, []);

      // Get event sponsors with their partner details - EXACT column names
      const sponsors = await query(`
        SELECT
          es.id,
          es.partner_id,
          es.sponsor_name,
          es.sponsor_tier,
          es.booth_number,
          es.booth_location,
          es.booth_representatives,  -- JSONB
          es.focus_areas_served,     -- JSONB
          es.talking_points,
          es.demo_booking_url,
          es.special_offers,
          es.target_contractor_profile,  -- JSONB
          es.pcr_score,
          es.ai_matching_notes,
          sp.company_name as partner_company_name,
          sp.value_proposition,
          sp.service_areas,  -- CORRECT column name
          sp.powerconfidence_score,  -- CORRECT column name
          sp.ai_summary,
          sp.ai_generated_differentiators  -- CORRECT column name
        FROM event_sponsors es
        LEFT JOIN strategic_partners sp ON es.partner_id = sp.id
        WHERE es.event_id = $1
      `, [eventId]);

      if (sponsors.rows.length === 0) {
        return { recommendations: [], message: 'No sponsors found for this event' };
      }

      // Score and rank sponsors
      const scoredSponsors = await this.scoreSponsors(
        sponsors.rows,
        contractorProfile,
        focusAreas
      );

      // Get top sponsors
      const topSponsors = scoredSponsors
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);

      // Generate AI talking points for each sponsor
      const recommendationsWithTalkingPoints = await this.generateSponsorTalkingPoints(
        topSponsors,
        contractorProfile
      );

      // Track recommendations
      await this.trackRecommendations(
        contractorId,
        eventId,
        'sponsor',
        recommendationsWithTalkingPoints
      );

      return {
        recommendations: recommendationsWithTalkingPoints,
        contractor_context: {
          focus_areas: focusAreas,
          company: contractorProfile.company_name,
          current_needs: this.identifyCurrentNeeds(contractorProfile)
        }
      };
    } catch (error) {
      console.error('Error generating sponsor recommendations:', error);
      throw error;
    }
  }

  /**
   * Score sponsors based on contractor needs
   */
  async scoreSponsors(sponsors, contractorProfile, focusAreas) {
    const scoredSponsors = [];

    for (const sponsor of sponsors) {
      let score = 0;
      const reasons = [];

      // Parse JSONB fields
      const sponsorFocusAreas = safeJsonParse(sponsor.focus_areas_served, []);
      const serviceAreas = safeJsonParse(sponsor.service_areas, []);  // CORRECT column name
      const targetProfile = safeJsonParse(sponsor.target_contractor_profile, {});
      const boothReps = safeJsonParse(sponsor.booth_representatives, []);

      // Use sponsor_name or partner_company_name
      const companyName = sponsor.sponsor_name || sponsor.partner_company_name;

      // Focus area match (40 points max)
      const focusMatches = sponsorFocusAreas.filter(area =>
        focusAreas.some(contractorArea =>
          area.toLowerCase().includes(contractorArea.toLowerCase()) ||
          contractorArea.toLowerCase().includes(area.toLowerCase())
        )
      );

      if (focusMatches.length > 0) {
        score += focusMatches.length * 15;
        reasons.push(`Serves your focus areas: ${focusMatches.join(', ')}`);
      } else {
        // Fallback: Analyze talking points and special offers for contractor focus area keywords
        const talkingPoints = typeof sponsor.talking_points === 'string' ? sponsor.talking_points : '';
        const specialOffers = typeof sponsor.special_offers === 'string' ? sponsor.special_offers : '';
        const sponsorContent = `${talkingPoints} ${specialOffers}`.toLowerCase();
        const focusAreaKeywords = this.getFocusAreaKeywords(focusAreas);

        const contentMatches = focusAreaKeywords.filter(keyword =>
          sponsorContent.includes(keyword.toLowerCase())
        );

        if (contentMatches.length > 0) {
          // Give partial credit (10 points per match, max 30) when content is relevant
          score += Math.min(contentMatches.length * 10, 30);
          reasons.push(`Offerings relevant to: ${contentMatches.slice(0, 3).join(', ')}`);
        }
      }

      // PCR Score or PowerConfidence Rating rating (20 points max)
      const ratingScore = sponsor.pcr_score || sponsor.powerconfidence_score;  // CORRECT column name
      if (ratingScore) {
        score += (parseFloat(ratingScore) / 100) * 20;
        if (ratingScore >= 80) {
          reasons.push(`Highly rated partner (${ratingScore}% satisfaction)`);
        }
      }

      // Revenue tier match (20 points max)
      if (targetProfile.revenue_tier) {
        // Check if target profile includes contractor's revenue tier
        const targetTiers = Array.isArray(targetProfile.revenue_tier)
          ? targetProfile.revenue_tier
          : [targetProfile.revenue_tier];

        if (targetTiers.includes(contractorProfile.revenue_tier)) {
          score += 20;
          reasons.push('Specializes in companies of your size');
        }
      }

      // Service area relevance (20 points max)
      if (serviceAreas && serviceAreas.length > 0) {
        const relevantServiceAreas = serviceAreas.filter(serviceArea =>
          focusAreas.some(area =>
            serviceArea.toLowerCase().includes(area.toLowerCase()) ||
            area.toLowerCase().includes(serviceArea.toLowerCase())
          )
        );
        if (relevantServiceAreas.length > 0) {
          score += 20;
          reasons.push(`Relevant expertise: ${relevantServiceAreas.join(', ')}`);
        }
      }

      // AI matching notes bonus (10 points)
      if (sponsor.ai_matching_notes) {
        score += 10;
        reasons.push('AI-optimized matching available');
      }

      scoredSponsors.push({
        ...sponsor,
        company_name: companyName,
        score,
        match_reasons: reasons,
        booth_contacts: boothReps
      });
    }

    return scoredSponsors;
  }

  /**
   * Generate AI talking points for sponsor interactions
   */
  async generateSponsorTalkingPoints(sponsors, contractorProfile) {
    const recommendations = [];

    for (const sponsor of sponsors) {
      try {
        // Use existing talking points if available
        if (sponsor.talking_points) {
          // Use safe JSON parse with fallback handling
          let existingPoints = safeJsonParse(sponsor.talking_points, null);
          if (!existingPoints) {
            // It's not JSON, treat as string and split by newlines or periods
            existingPoints = sponsor.talking_points
              .split(/[.\n]/)
              .filter(p => p.trim())
              .slice(0, 3);
          }

          if (Array.isArray(existingPoints) && existingPoints.length > 0) {
            // Use existing talking points
            const boothContacts = sponsor.booth_contacts || [];
            const primaryContact = boothContacts[0] || null;

            recommendations.push({
              sponsor_id: sponsor.id,
              partner_id: sponsor.partner_id,
              company_name: sponsor.company_name,
              booth_number: sponsor.booth_number,
              booth_location: sponsor.booth_location,
              booth_contact: primaryContact ? {
                name: primaryContact.name,
                title: primaryContact.title,
                greeting: `Ask for ${primaryContact.name}, ${primaryContact.title}`
              } : null,
              score: sponsor.score,
              why: sponsor.match_reasons.join('. '),
              talking_points: existingPoints,
              value_proposition: sponsor.value_proposition,
              demo_booking_url: sponsor.demo_booking_url,
              special_offers: sponsor.special_offers
            });
            continue;
          }
        }

        // Generate new talking points if none exist
        const prompt = `
          Generate 3 specific talking points for a contractor to use when visiting a sponsor booth at an event.

          Contractor Profile:
          - Company: ${contractorProfile.company_name}
          - Revenue Tier: ${contractorProfile.revenue_tier}
          - Team Size: ${contractorProfile.team_size}
          - Focus Areas: ${safeJsonParse(contractorProfile.focus_areas, []).join(', ')}

          Sponsor/Partner:
          - Company: ${sponsor.company_name}
          - Value Proposition: ${sponsor.value_proposition || 'Strategic partner'}
          - Service Areas: ${safeJsonParse(sponsor.service_areas, []).join(', ')}
          ${sponsor.ai_summary ? `- About: ${sponsor.ai_summary}` : ''}
          ${sponsor.ai_matching_notes ? `- Matching Notes: ${sponsor.ai_matching_notes}` : ''}

          Generate 3 conversation starters that:
          1. Show the contractor did their homework
          2. Focus on specific business challenges
          3. Lead to a meaningful conversation about solutions

          Format as JSON array of strings. Keep each under 30 words.
        `;

        const response = await openAIService.generateCompletion(prompt, {
          max_tokens: 200,
          temperature: 0.8,
          response_format: { type: "json_object" }
        });

        let talkingPoints;
        const parsed = safeJsonParse(response, null);
        if (parsed) {
          talkingPoints = parsed.talking_points || parsed.points || Object.values(parsed).flat();
        } else {
          // Fallback to generic talking points
          talkingPoints = [
            `I'm interested in how you help ${contractorProfile.revenue_tier} contractors`,
            `We're focusing on ${contractorProfile.focus_areas[0] || 'growth'} - what solutions do you recommend?`,
            `Tell me about your work with contractors in our revenue range`
          ];
        }

        // Get booth contact info
        const boothContacts = sponsor.booth_contacts || [];
        const primaryContact = boothContacts[0] || null;

        recommendations.push({
          sponsor_id: sponsor.id,
          partner_id: sponsor.partner_id,
          company_name: sponsor.company_name,
          booth_number: sponsor.booth_number,
          booth_location: sponsor.booth_location,
          booth_contact: primaryContact ? {
            name: primaryContact.name,
            title: primaryContact.title,
            greeting: `Ask for ${primaryContact.name}, ${primaryContact.title}`
          } : null,
          score: sponsor.score,
          why: sponsor.match_reasons.join('. '),
          talking_points: talkingPoints,
          value_proposition: sponsor.value_proposition,
          demo_booking_url: sponsor.demo_booking_url,
          special_offers: sponsor.special_offers
        });
      } catch (error) {
        console.error(`Error generating talking points for ${sponsor.company_name}:`, error);
        // Fallback
        recommendations.push({
          sponsor_id: sponsor.id,
          partner_id: sponsor.partner_id,
          company_name: sponsor.company_name,
          booth_number: sponsor.booth_number,
          booth_location: sponsor.booth_location,
          score: sponsor.score,
          why: sponsor.match_reasons.join('. '),
          talking_points: [
            `I'd like to learn about your solutions for ${contractorProfile.revenue_tier} contractors`,
            `How do you help with ${contractorProfile.focus_areas?.[0] || 'contractor growth'}?`,
            `What makes you different from other partners in this space?`
          ],
          value_proposition: sponsor.value_proposition,
          demo_booking_url: sponsor.demo_booking_url,
          special_offers: sponsor.special_offers
        });
      }
    }

    return recommendations;
  }

  /**
   * Get relevant keywords based on business size
   * Using CORRECT revenue_tier values from database
   */
  getRelevantKeywords(revenueTier, teamSize) {
    const keywords = [];

    // Map revenue tiers to relevant keywords
    if (revenueTier === 'Under $1M' || revenueTier === '$1M-$5M') {
      keywords.push('scale', 'growth', 'systems', 'process', 'foundation');
    } else if (revenueTier === '$5M-$10M') {
      keywords.push('optimization', 'leadership', 'expansion', 'efficiency', 'scaling');
    } else if (revenueTier === '$10M-$25M' || revenueTier === '$25M+') {
      keywords.push('enterprise', 'strategic', 'acquisition', 'market leadership', 'innovation');
    }

    // Team size keywords (handle both string and number)
    const teamSizeNum = typeof teamSize === 'string' ? parseInt(teamSize) : teamSize;
    if (teamSizeNum < 10) {
      keywords.push('small team', 'lean', 'efficiency', 'startup');
    } else if (teamSizeNum < 50) {
      keywords.push('team building', 'culture', 'management', 'growth');
    } else {
      keywords.push('organizational', 'departments', 'corporate structure', 'enterprise');
    }

    return keywords;
  }

  /**
   * Map contractor focus areas to searchable keywords for content matching
   */
  getFocusAreaKeywords(focusAreas) {
    const keywordMap = {
      // Growth-related focus areas
      'greenfield_growth': ['growth', 'new market', 'expansion', 'revenue', 'opportunities', 'new customers'],
      'scaling': ['scale', 'scaling', 'expansion', 'growth', 'increase', 'multiply'],

      // Sales focus areas
      'controlling_lead_flow': ['lead', 'pipeline', 'sales process', 'conversion', 'sales funnel', 'marketing'],
      'hiring_sales_leadership': ['sales', 'leadership', 'hiring', 'team building', 'sales manager', 'recruiting'],
      'sales_growth': ['sales', 'revenue', 'growth', 'selling', 'closing', 'deals'],

      // Operational focus areas
      'operational_efficiency': ['efficiency', 'operations', 'process', 'systems', 'streamline', 'optimize'],
      'business_development': ['business', 'development', 'strategy', 'growth', 'partnerships'],

      // Team and culture
      'team_building': ['team', 'culture', 'hiring', 'retention', 'people', 'management'],
      'leadership': ['leadership', 'management', 'leading', 'vision', 'strategy'],

      // Financial
      'profitability': ['profit', 'margin', 'financial', 'revenue', 'cash flow', 'ROI'],
      'cash_flow': ['cash', 'financial', 'budget', 'finance', 'money'],

      // Market positioning
      'market_differentiation': ['differentiate', 'unique', 'competitive', 'positioning', 'brand'],
      'competitive_advantage': ['competitive', 'advantage', 'differentiation', 'unique', 'positioning']
    };

    const keywords = [];

    for (const focusArea of focusAreas) {
      // Normalize focus area (remove underscores, lowercase)
      const normalizedArea = focusArea.toLowerCase().replace(/_/g, ' ');

      // Add the focus area itself as a keyword
      keywords.push(normalizedArea);

      // Add mapped keywords if they exist
      if (keywordMap[focusArea]) {
        keywords.push(...keywordMap[focusArea]);
      }
    }

    return [...new Set(keywords)]; // Remove duplicates
  }

  /**
   * Identify current needs based on profile
   */
  identifyCurrentNeeds(contractorProfile) {
    const needs = [];

    // Based on revenue tier
    const revenueTier = contractorProfile.revenue_tier;
    if (revenueTier === 'Under $1M' || revenueTier === '$1M-$5M') {
      needs.push('systems', 'processes', 'initial growth', 'foundation building');
    } else if (revenueTier === '$5M-$10M') {
      needs.push('scaling', 'team building', 'market expansion', 'operational efficiency');
    } else if (revenueTier === '$10M-$25M' || revenueTier === '$25M+') {
      needs.push('optimization', 'innovation', 'market leadership', 'strategic partnerships');
    }

    // Based on team size transitions
    const teamSizeNum = typeof contractorProfile.team_size === 'string'
      ? parseInt(contractorProfile.team_size)
      : contractorProfile.team_size;

    if (teamSizeNum >= 10 && teamSizeNum <= 20) {
      needs.push('management structure', 'delegation', 'process documentation');
    } else if (teamSizeNum >= 50) {
      needs.push('department organization', 'corporate governance', 'leadership development');
    }

    // Add focus areas as needs
    const focusAreas = safeJsonParse(contractorProfile.focus_areas, []);
    needs.push(...focusAreas.map(area => area.toLowerCase()));

    return [...new Set(needs)]; // Remove duplicates
  }

  /**
   * Track recommendations for learning
   */
  async trackRecommendations(contractorId, eventId, type, recommendations) {
    try {
      for (const rec of recommendations) {
        await query(`
          INSERT INTO ai_learning_events (
            event_type,
            contractor_id,
            event_id,
            context,
            action_taken,
            related_entities,
            created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
        `, [
          'event_recommendation',
          contractorId,
          eventId,
          `event_${eventId}_${type}`,
          `recommended_${type}_${rec.speaker_id || rec.sponsor_id}`,
          safeJsonStringify({
            type,
            score: rec.score,
            reasons: rec.why || rec.match_reasons
          })
        ]);
      }
    } catch (error) {
      console.error('Error tracking recommendations:', error);
      // Don't throw - tracking failures shouldn't break recommendations
    }
  }

  /**
   * Get personalized event agenda
   * Combines all recommendations into a custom agenda
   */
  async getPersonalizedAgenda(eventId, contractorId) {
    try {
      // Get top 3 speaker recommendations (TPX standard)
      const speakerRecs = await this.recommendSpeakers(eventId, contractorId, 3);

      // Get top 3 sponsor recommendations (TPX standard)
      const sponsorRecs = await this.recommendSponsors(eventId, contractorId, 3);

      // Get all agenda items for the event
      const agenda = await query(`
        SELECT
          id,
          start_time,
          end_time,
          item_type,
          title,
          location,
          is_mandatory
        FROM event_agenda_items
        WHERE event_id = $1
        ORDER BY start_time
      `, [eventId]);

      // Build personalized agenda
      const personalizedAgenda = {
        recommended_speakers: speakerRecs.recommendations,
        recommended_sponsors: sponsorRecs.recommendations,
        mandatory_sessions: agenda.rows.filter(item => item.is_mandatory),
        contractor_profile: {
          company: speakerRecs.contractor_context.company,
          focus_areas: speakerRecs.contractor_context.focus_areas,
          needs: sponsorRecs.contractor_context ? sponsorRecs.contractor_context.current_needs : []
        }
      };

      return personalizedAgenda;
    } catch (error) {
      console.error('Error generating personalized agenda:', error);
      throw error;
    }
  }
}

module.exports = new EventAIRecommendationService();