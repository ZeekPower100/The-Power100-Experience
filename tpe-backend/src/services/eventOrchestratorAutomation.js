/**
 * Event Orchestrator Automation Service
 *
 * This is the TRUE Event Orchestrator - an AI-driven autopilot that:
 * 1. Triggers automatically on check-in
 * 2. Analyzes contractor profile against event data
 * 3. Sends personalized SMS at optimal times
 * 4. Learns from every interaction
 *
 * NO MANUAL INTERVENTION REQUIRED
 * All field names match database schema exactly
 */

const { query } = require('../config/database');
const aiKnowledgeService = require('./aiKnowledgeService');
const { safeJsonStringify, safeJsonParse } = require('../utils/jsonHelpers');
const { sendAgendaReadyNotification } = require('./eventOrchestrator/emailScheduler');
const { sendSMSNotification } = require('./smsService');
const { generateContextualMessage } = require('./aiMessageGenerator');
const axios = require('axios');

class EventOrchestratorAutomation {
  /**
   * Main entry point - triggered automatically on check-in
   * This is the autopilot that runs the entire event experience
   */
  async orchestrateEventExperience(contractor_id, event_id) {
    console.log(`🤖 AI Orchestrator activated for contractor ${contractor_id} at event ${event_id}`);

    try {
      // 1. Gather all context
      const context = await this.gatherCompleteContext(contractor_id, event_id);

      // 2. Generate AI recommendations
      const recommendations = await this.generateAIRecommendations(context);

      // 3. Schedule all messages for optimal timing
      await this.scheduleAllMessages(contractor_id, event_id, recommendations);

      // 4. Create learning event
      await this.createLearningEvent(contractor_id, event_id, 'check_in_orchestration', recommendations);

      // 5. Send "Agenda Ready" email and SMS notifications
      try {
        await sendAgendaReadyNotification(event_id, contractor_id, {
          speakers: recommendations.speakers.length,
          sponsors: recommendations.sponsors.length,
          peers: recommendations.peers.length
        });
        console.log(`📧 Agenda ready email sent to contractor ${contractor_id}`);
      } catch (emailError) {
        console.error(`❌ Failed to send agenda ready email:`, emailError);
        // Don't fail the orchestration if email fails
      }

      // 6. Send SMS notification with agenda link via n8n
      try {
        const contractor = await this.getContractorProfile(contractor_id);
        const event = await this.getEventDetails(event_id);

        if (contractor.phone) {
          // Use environment-specific URL
          const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3002';
          const smsMessage = `${contractor.first_name || 'Hi'}! Your personalized agenda for ${event.name} is ready! 🎉 ${recommendations.speakers.length} speakers, ${recommendations.sponsors.length} sponsors, ${recommendations.peers.length} networking matches. View now: ${baseUrl}/events/${event_id}/agenda?contractor=${contractor_id}`;

          // Send via n8n webhook (works in both dev and production)
          const axios = require('axios');
          const n8nWebhook = process.env.NODE_ENV === 'production'
            ? 'https://n8n.srv918843.hstgr.cloud/webhook/backend-to-ghl'
            : 'https://n8n.srv918843.hstgr.cloud/webhook/backend-to-ghl-dev';

          await axios.post(n8nWebhook, {
            send_via_ghl: {
              phone: contractor.phone,
              message: smsMessage,
              contractor_id: contractor_id,
              event_id: event_id,
              event_name: event.name,
              message_type: 'agenda_ready'
            }
          });

          console.log(`📱 Agenda ready SMS sent to contractor ${contractor_id}`);
        }
      } catch (smsError) {
        console.error(`❌ Failed to send agenda ready SMS:`, smsError);
        // Don't fail the orchestration if SMS fails
      }

      console.log(`✅ AI Orchestration complete for contractor ${contractor_id}`);
      return recommendations;
    } catch (error) {
      console.error('AI Orchestration error:', error);
      throw error;
    }
  }

  /**
   * Gather complete context for AI decision making
   */
  async gatherCompleteContext(contractor_id, event_id) {
    const [contractor, event, speakers, sponsors, attendees] = await Promise.all([
      this.getContractorProfile(contractor_id),
      this.getEventDetails(event_id),
      this.getEventSpeakers(event_id),
      this.getEventSponsors(event_id),
      this.getCheckedInAttendees(event_id)
    ]);

    return {
      contractor,
      event,
      speakers,
      sponsors,
      attendees,
      currentTime: new Date()
    };
  }

  /**
   * AI generates all recommendations based on context
   */
  async generateAIRecommendations(context) {
    const { contractor, event, speakers, sponsors, attendees } = context;

    // 1. Match speakers to contractor interests
    const speakerRecommendations = await this.matchSpeakers(contractor, speakers, event);

    // 2. Match sponsors to contractor needs
    const sponsorRecommendations = await this.matchSponsors(contractor, sponsors);

    // 3. Find ideal peer connections
    const peerRecommendations = await this.matchPeers(contractor, attendees);

    return {
      speakers: speakerRecommendations,
      sponsors: sponsorRecommendations,
      peers: peerRecommendations,
      generatedAt: new Date()
    };
  }

  /**
   * Match speakers based on AI analysis
   */
  async matchSpeakers(contractor, speakers, event) {
    const matches = [];

    for (const speaker of speakers) {
      // Calculate relevance score
      const score = this.calculateSpeakerRelevance(contractor, speaker);

      // Lower threshold for testing - if no high-scoring matches, include all speakers
      if (score > 20 || speakers.length <= 5) {
        matches.push({
          speaker_id: speaker.id,
          speaker_name: speaker.name,
          session_title: speaker.session_title,
          session_time: speaker.session_time,
          relevance_score: score,
          why: this.explainSpeakerMatch(contractor, speaker) || 'Industry expert speaker',
          alert_time: this.calculateAlertTime(speaker.session_time, event)
        });
      }
    }

    // Return top 3 speakers (or all if less than 3)
    return matches.sort((a, b) => b.relevance_score - a.relevance_score).slice(0, 3);
  }

  /**
   * Calculate when to send speaker alert
   * Accelerated events: 2 minutes before session
   * Normal events: 15 minutes before session
   */
  calculateAlertTime(session_time, event) {
    const alertTime = new Date(session_time);
    const minutesBefore = event.accelerated ? 2 : 15;
    alertTime.setMinutes(alertTime.getMinutes() - minutesBefore);
    return alertTime;
  }

  /**
   * Calculate speaker relevance to contractor
   */
  calculateSpeakerRelevance(contractor, speaker) {
    let score = 0;

    // Parse JSON fields safely
    const contractor_focus_areas = safeJsonParse(contractor.focus_areas, []);
    const speaker_focus_areas = safeJsonParse(speaker.focus_areas, []);
    const speaker_target_audience = safeJsonParse(speaker.target_audience, []);

    // Check focus area alignment
    for (const area of contractor_focus_areas) {
      if (speaker_focus_areas.includes(area)) {
        score += 30;
      }
    }

    // Check industry alignment
    if (speaker_target_audience.includes(contractor.business_type)) {
      score += 20;
    }

    // PCR score bonus
    if (speaker.pcr_score > 80) {
      score += 20;
    }

    // Previous engagement bonus (from learning data)
    const preferred_types = safeJsonParse(contractor.preferred_speaker_types, []);
    if (preferred_types.includes(speaker.session_category)) {
      score += 30;
    }

    return Math.min(score, 100);
  }

  /**
   * Explain why this speaker matches
   */
  explainSpeakerMatch(contractor, speaker) {
    const reasons = [];

    const contractor_focus_areas = safeJsonParse(contractor.focus_areas, []);
    const speaker_focus_areas = safeJsonParse(speaker.focus_areas, []);
    const speaker_target_audience = safeJsonParse(speaker.target_audience, []);

    const matchingAreas = contractor_focus_areas.filter(area => speaker_focus_areas.includes(area));
    if (matchingAreas.length > 0) {
      reasons.push(`Covers your focus areas: ${matchingAreas.join(', ')}`);
    }

    if (speaker.pcr_score > 80) {
      reasons.push(`Highly rated by peers (${speaker.pcr_score}% approval)`);
    }

    if (speaker_target_audience.includes(contractor.business_type)) {
      reasons.push(`Specifically for ${contractor.business_type} businesses`);
    }

    return reasons.join('. ');
  }

  /**
   * Match sponsors based on contractor needs
   */
  async matchSponsors(contractor, sponsors) {
    const matches = [];

    for (const sponsor of sponsors) {
      const score = this.calculateSponsorRelevance(contractor, sponsor);

      // Lower threshold for testing - if no high-scoring matches, include all sponsors
      if (score > 20 || sponsors.length <= 5) {
        matches.push({
          sponsor_id: sponsor.id,
          sponsor_name: sponsor.sponsor_name,
          booth_number: sponsor.booth_number,
          relevance_score: score,
          why: this.explainSponsorMatch(contractor, sponsor) || 'Event sponsor offering solutions',
          talking_points: this.generateTalkingPoints(contractor, sponsor)
        });
      }
    }

    return matches.sort((a, b) => b.relevance_score - a.relevance_score).slice(0, 3);
  }

  /**
   * Calculate sponsor relevance
   */
  calculateSponsorRelevance(contractor, sponsor) {
    let score = 0;

    const contractor_focus_areas = safeJsonParse(contractor.focus_areas, []);
    const sponsor_focus_areas = safeJsonParse(sponsor.focus_areas_served, []);
    const target_profile = safeJsonParse(sponsor.target_contractor_profile, {});

    // Focus area alignment
    for (const area of contractor_focus_areas) {
      if (sponsor_focus_areas.includes(area)) {
        score += 35;
      }
    }

    // Revenue tier alignment
    if (target_profile.revenue_range?.includes(contractor.revenue_tier)) {
      score += 25;
    }

    // PCR score
    if (sponsor.pcr_score > 75) {
      score += 20;
    }

    // Special offers
    if (sponsor.special_offers) {
      score += 20;
    }

    return Math.min(score, 100);
  }

  /**
   * Explain sponsor match reason
   */
  explainSponsorMatch(contractor, sponsor) {
    const reasons = [];

    const contractor_focus_areas = safeJsonParse(contractor.focus_areas, []);
    const sponsor_focus_areas = safeJsonParse(sponsor.focus_areas_served, []);

    const matchingAreas = contractor_focus_areas.filter(area => sponsor_focus_areas.includes(area));
    if (matchingAreas.length > 0) {
      reasons.push(`Helps with: ${matchingAreas.join(', ')}`);
    }

    if (sponsor.pcr_score > 75) {
      reasons.push(`Trusted by contractors (${sponsor.pcr_score}% satisfaction)`);
    }

    if (sponsor.special_offers) {
      reasons.push('Has event special offer');
    }

    return reasons.join('. ');
  }

  /**
   * Generate personalized talking points
   */
  generateTalkingPoints(contractor, sponsor) {
    const points = [];

    if (contractor.biggest_challenge) {
      points.push(`Ask about solutions for ${contractor.biggest_challenge}`);
    }

    if (contractor.growth_goals) {
      points.push(`Discuss how they can help with ${contractor.growth_goals}`);
    }

    if (sponsor.special_offers) {
      points.push(`Inquire about their event special: ${sponsor.special_offers}`);
    }

    return points;
  }

  /**
   * Find ideal peer connections
   */
  async matchPeers(contractor, attendees) {
    const matches = [];

    // Filter out self and find complementary businesses
    const peers = attendees.filter(a =>
      a.contractor_id !== contractor.id &&
      !this.areCompetitors(contractor, a)
    );

    for (const peer of peers) {
      const score = this.calculatePeerCompatibility(contractor, peer);

      if (score > 70) {
        matches.push({
          peer_id: peer.contractor_id,
          peer_name: peer.name,
          company_name: peer.company_name,
          compatibility_score: score,
          why: this.explainPeerMatch(contractor, peer),
          common_ground: this.findCommonGround(contractor, peer)
        });
      }
    }

    return matches.sort((a, b) => b.compatibility_score - a.compatibility_score).slice(0, 3);
  }

  /**
   * Check if two contractors are competitors
   */
  areCompetitors(contractor1, contractor2) {
    // Same business type AND same geographic area = competitors
    if (contractor1.business_type === contractor2.business_type) {
      if (contractor1.service_area === contractor2.service_area) {
        return true;
      }
    }
    return false;
  }

  /**
   * Calculate peer compatibility score
   */
  calculatePeerCompatibility(contractor1, contractor2) {
    let score = 0;

    // Similar revenue tier (but not exact)
    const revDiff = Math.abs((contractor1.revenue_tier || 0) - (contractor2.revenue_tier || 0));
    if (revDiff === 1) {
      score += 30; // One tier apart is ideal
    }

    // Complementary business types
    if (this.areComplementary(contractor1.business_type, contractor2.business_type)) {
      score += 40;
    }

    // Shared focus areas
    const focus1 = safeJsonParse(contractor1.focus_areas, []);
    const focus2 = safeJsonParse(contractor2.focus_areas, []);
    const shared = focus1.filter(a => focus2.includes(a)).length;
    score += shared * 10;

    // Different geographic areas (no competition)
    if (contractor1.service_area !== contractor2.service_area) {
      score += 20;
    }

    return Math.min(score, 100);
  }

  /**
   * Check if business types are complementary
   */
  areComplementary(type1, type2) {
    const complementaryPairs = {
      'Roofing': ['Siding', 'Windows', 'Gutters'],
      'Plumbing': ['HVAC', 'Electrical'],
      'Landscaping': ['Hardscaping', 'Pool Service'],
      'General Contractor': ['Architect', 'Interior Design']
    };

    return complementaryPairs[type1]?.includes(type2) ||
           complementaryPairs[type2]?.includes(type1);
  }

  /**
   * Explain peer match
   */
  explainPeerMatch(contractor, peer) {
    const reasons = [];

    if (this.areComplementary(contractor.business_type, peer.business_type)) {
      reasons.push(`Complementary business (${peer.business_type})`);
    }

    const focus1 = safeJsonParse(contractor.focus_areas, []);
    const focus2 = safeJsonParse(peer.focus_areas, []);
    const shared = focus1.filter(a => focus2.includes(a));
    if (shared.length > 0) {
      reasons.push(`Shared focus: ${shared.join(', ')}`);
    }

    if (contractor.service_area !== peer.service_area) {
      reasons.push('Non-competing territory');
    }

    return reasons.join('. ');
  }

  /**
   * Find common ground between contractors
   */
  findCommonGround(contractor1, contractor2) {
    const commonPoints = [];

    const focus1 = safeJsonParse(contractor1.focus_areas, []);
    const focus2 = safeJsonParse(contractor2.focus_areas, []);
    const shared = focus1.filter(a => focus2.includes(a));

    if (shared.length > 0) {
      commonPoints.push(`both focus on ${shared.join(' and ')}`);
    }

    if (contractor1.team_size === contractor2.team_size) {
      commonPoints.push(`both have ${contractor1.team_size} team members`);
    }

    return commonPoints;
  }

  /**
   * Schedule all messages with optimal timing
   * Called on check-in to schedule ALL event-day messages for this contractor
   */
  async scheduleAllMessages(contractor_id, event_id, recommendations) {
    const messages = [];

    // Get contractor data for AI message generation
    const contractor = await this.getContractorProfile(contractor_id);

    // 1. Welcome message (immediate - keep static, sets the tone)
    messages.push({
      message_type: 'welcome',
      scheduled_time: new Date(),
      message_content: this.generateWelcomeMessage(recommendations)
    });

    // 2. Speaker alerts (15 min before each session) - AI-generated
    for (const speaker of recommendations.speakers) {
      const speakerMessage = await this.generateSpeakerAlert(speaker, contractor);
      messages.push({
        message_type: 'speaker_alert',
        scheduled_time: speaker.alert_time,
        message_content: speakerMessage,
        related_entity_id: speaker.speaker_id
      });
    }

    // 3. Sponsor recommendations (2 min after EACH break starts - agenda-based timing)
    const sponsorRecommendationMessages = await this.scheduleSponsorRecommendations(contractor_id, event_id, recommendations.sponsors);
    messages.push(...sponsorRecommendationMessages);

    // 4. Peer introductions (5 min after lunch starts - agenda-based timing)
    const peerIntroductionMessage = await this.schedulePeerIntroduction(contractor_id, event_id, recommendations.peers);
    if (peerIntroductionMessage) {
      messages.push(peerIntroductionMessage);
    }

    // 5. PCR requests (7 min after each recommended session ends)
    // Get session end times from event_agenda_items for recommended speakers
    const pcrMessages = await this.schedulePCRForRecommendedSessions(contractor_id, event_id, recommendations.speakers);
    messages.push(...pcrMessages);

    // 6. End-of-day sponsor batch check (at event end)
    const sponsorBatchCheckMessage = await this.scheduleSponsorBatchCheck(contractor_id, event_id);
    if (sponsorBatchCheckMessage) {
      messages.push(sponsorBatchCheckMessage);
    }

    // 7. Overall event PCR (1 hour after event ends)
    const overallPCRMessage = await this.scheduleOverallEventPCR(contractor_id, event_id);
    if (overallPCRMessage) {
      messages.push(overallPCRMessage);
    }

    // Insert all scheduled messages into database
    for (const message of messages) {
      await this.scheduleMessage(contractor_id, event_id, message, recommendations);
    }

    console.log(`[EventOrchestrator] ✅ Scheduled ${messages.length} messages for contractor ${contractor_id}`);
    return messages;
  }

  /**
   * Schedule PCR requests for each recommended speaker session
   * 7 minutes after session ends
   */
  async schedulePCRForRecommendedSessions(contractor_id, event_id, recommendedSpeakers) {
    const messages = [];

    if (!recommendedSpeakers || recommendedSpeakers.length === 0) {
      console.log(`[EventOrchestrator] No recommended speakers, skipping PCR scheduling`);
      return messages;
    }

    console.log(`[EventOrchestrator] Scheduling PCR requests for ${recommendedSpeakers.length} recommended sessions`);

    // Get session end times from event_agenda_items for each recommended speaker
    for (const speaker of recommendedSpeakers) {
      try {
        const sessionResult = await query(`
          SELECT eai.end_time, es.session_title, es.name as speaker_name
          FROM event_agenda_items eai
          INNER JOIN event_speakers es ON eai.speaker_id = es.id
          WHERE eai.event_id = $1
            AND eai.speaker_id = $2
            AND eai.item_type = 'session'
          LIMIT 1
        `, [event_id, speaker.speaker_id]);

        if (sessionResult.rows.length > 0) {
          const session = sessionResult.rows[0];

          // Calculate PCR request time: 7 minutes after session ends
          const pcrRequestTime = new Date(session.end_time);
          pcrRequestTime.setMinutes(pcrRequestTime.getMinutes() + 7);

          messages.push({
            message_type: 'attendance_check',
            scheduled_time: pcrRequestTime,
            message_content: `📊 Quick check: Did you attend "${session.session_title}" by ${session.speaker_name}? Reply YES or NO.`,
            related_entity_id: speaker.speaker_id
          });

          console.log(`[EventOrchestrator] PCR scheduled for "${session.session_title}" at ${pcrRequestTime.toISOString()}`);
        }
      } catch (error) {
        console.error(`[EventOrchestrator] Error scheduling PCR for speaker ${speaker.speaker_id}:`, error);
      }
    }

    return messages;
  }

  /**
   * Schedule end-of-day sponsor batch check
   * At event end time
   */
  async scheduleSponsorBatchCheck(contractor_id, event_id) {
    try {
      console.log(`[EventOrchestrator] Scheduling end-of-day sponsor batch check`);

      // Get event end time from agenda (last agenda item end_time)
      const eventEndResult = await query(`
        SELECT MAX(end_time) as event_end_time
        FROM event_agenda_items
        WHERE event_id = $1
      `, [event_id]);

      if (eventEndResult.rows.length === 0 || !eventEndResult.rows[0].event_end_time) {
        console.log(`[EventOrchestrator] No agenda items found, skipping sponsor batch check`);
        return null;
      }

      const eventEndTime = new Date(eventEndResult.rows[0].event_end_time);

      console.log(`[EventOrchestrator] Sponsor batch check scheduled at ${eventEndTime.toISOString()}`);

      return {
        message_type: 'sponsor_batch_check',
        scheduled_time: eventEndTime,
        message_content: `🤝 Event wrap-up! Which sponsor booths did you visit today? I'll help you follow up on the conversations that matter most.`,
        related_entity_id: null
      };
    } catch (error) {
      console.error(`[EventOrchestrator] Error scheduling sponsor batch check:`, error);
      return null;
    }
  }

  /**
   * Schedule overall event PCR
   * 1 hour after event ends
   */
  async scheduleOverallEventPCR(contractor_id, event_id) {
    try {
      console.log(`[EventOrchestrator] Scheduling overall event PCR`);

      // Get event end time from agenda (last agenda item end_time)
      const eventEndResult = await query(`
        SELECT MAX(end_time) as event_end_time
        FROM event_agenda_items
        WHERE event_id = $1
      `, [event_id]);

      if (eventEndResult.rows.length === 0 || !eventEndResult.rows[0].event_end_time) {
        console.log(`[EventOrchestrator] No agenda items found, skipping overall event PCR`);
        return null;
      }

      const eventEndTime = new Date(eventEndResult.rows[0].event_end_time);

      // Schedule PCR 1 hour after event ends
      const pcrTime = new Date(eventEndTime.getTime() + (60 * 60 * 1000));

      console.log(`[EventOrchestrator] Overall event PCR scheduled at ${pcrTime.toISOString()}`);

      return {
        message_type: 'post_event_wrap_up',
        scheduled_time: pcrTime,
        message_content: `🎯 How was your overall experience today? Rate 1-5 (1=Poor, 5=Excellent). Your feedback helps us improve future events!`,
        related_entity_id: null
      };
    } catch (error) {
      console.error(`[EventOrchestrator] Error scheduling overall event PCR:`, error);
      return null;
    }
  }

  /**
   * Schedule sponsor recommendations for each break
   * 2 minutes after each break starts
   */
  async scheduleSponsorRecommendations(contractor_id, event_id, recommendedSponsors) {
    const messages = [];

    if (!recommendedSponsors || recommendedSponsors.length === 0) {
      console.log(`[EventOrchestrator] No recommended sponsors, skipping sponsor recommendation scheduling`);
      return messages;
    }

    try {
      console.log(`[EventOrchestrator] Scheduling sponsor recommendations for ${recommendedSponsors.length} sponsors`);

      // Get contractor data for AI message generation
      const contractor = await this.getContractorProfile(contractor_id);

      // Get all breaks/lunch from agenda
      const breaksResult = await query(`
        SELECT id, title, start_time, item_type
        FROM event_agenda_items
        WHERE event_id = $1
          AND item_type IN ('break', 'lunch')
        ORDER BY start_time ASC
      `, [event_id]);

      const breaks = breaksResult.rows;

      if (breaks.length === 0) {
        console.log(`[EventOrchestrator] No breaks found in agenda, skipping sponsor recommendations`);
        return messages;
      }

      console.log(`[EventOrchestrator] Found ${breaks.length} breaks in agenda`);

      // Schedule one sponsor recommendation per break with AI-generated messages
      let visitedBooths = []; // Track "visited" booths across messages for context
      for (const breakPeriod of breaks) {
        // Calculate recommendation time: 2 minutes after break starts
        const recommendationTime = new Date(breakPeriod.start_time);
        recommendationTime.setMinutes(recommendationTime.getMinutes() + 2);

        // Determine time context based on break type
        const timeContext = breakPeriod.item_type === 'lunch' ? 'lunch' : 'break';

        // AI-generated sponsor message with context
        const sponsorMessage = await this.generateSponsorMessage(
          recommendedSponsors,
          contractor,
          visitedBooths,
          timeContext
        );

        messages.push({
          message_type: 'sponsor_recommendation',
          scheduled_time: recommendationTime,
          message_content: sponsorMessage,
          related_entity_id: recommendedSponsors[0]?.sponsor_id || null
        });

        // Add booth to "visited" list for next message context
        if (recommendedSponsors[0]?.booth_number) {
          visitedBooths.push(recommendedSponsors[0].booth_number);
        }

        console.log(`[EventOrchestrator] Sponsor recommendation scheduled for break "${breakPeriod.title}" at ${recommendationTime.toISOString()}`);
      }

      return messages;
    } catch (error) {
      console.error(`[EventOrchestrator] Error scheduling sponsor recommendations:`, error);
      return messages;
    }
  }

  /**
   * Schedule peer introduction
   * 5 minutes after lunch starts (formerly called "2 minutes into lunch")
   */
  async schedulePeerIntroduction(contractor_id, event_id, recommendedPeers) {
    if (!recommendedPeers || recommendedPeers.length === 0) {
      console.log(`[EventOrchestrator] No recommended peers, skipping peer introduction scheduling`);
      return null;
    }

    try {
      console.log(`[EventOrchestrator] Scheduling peer introduction`);

      // Get contractor data for AI message generation
      const contractor = await this.getContractorProfile(contractor_id);

      // Get lunch time from agenda
      const lunchResult = await query(`
        SELECT start_time, title
        FROM event_agenda_items
        WHERE event_id = $1
          AND item_type = 'lunch'
        ORDER BY start_time ASC
        LIMIT 1
      `, [event_id]);

      if (lunchResult.rows.length === 0) {
        console.log(`[EventOrchestrator] No lunch found in agenda, skipping peer introduction`);
        return null;
      }

      const lunchTime = lunchResult.rows[0].start_time;

      // Calculate introduction time: 5 minutes after lunch starts
      const introductionTime = new Date(lunchTime);
      introductionTime.setMinutes(introductionTime.getMinutes() + 5);

      // AI-generated peer introduction message
      const peerMessage = await this.generatePeerMessage(recommendedPeers, contractor);

      console.log(`[EventOrchestrator] Peer introduction scheduled at ${introductionTime.toISOString()} (lunch + 5 min)`);

      return {
        message_type: 'peer_introduction',
        scheduled_time: introductionTime,
        message_content: peerMessage,
        related_entity_id: recommendedPeers[0]?.peer_id || null
      };
    } catch (error) {
      console.error(`[EventOrchestrator] Error scheduling peer introduction:`, error);
      return null;
    }
  }

  /**
   * Generate welcome message with personalized agenda
   */
  generateWelcomeMessage(recommendations) {
    const speakerCount = recommendations.speakers.length;
    const sponsorCount = recommendations.sponsors.length;
    const peerCount = recommendations.peers.length;

    return `Welcome to Power100! 🎯 Your AI has prepared your personalized agenda: ${speakerCount} must-see speakers, ${sponsorCount} relevant sponsors at their booths, and ${peerCount} ideal networking connections. I'll guide you throughout the day with timely alerts. Reply STOP to pause notifications.`;
  }

  /**
   * Generate AI-powered speaker alert message
   */
  async generateSpeakerAlert(speaker, contractor) {
    const messageContext = {
      contractor: {
        first_name: contractor.first_name
      },
      entity: {
        speaker_name: speaker.speaker_name,
        session_title: speaker.session_title,
        why: speaker.why,
        location: 'Main Stage'
      }
    };

    return await generateContextualMessage(
      'speaker_alert',
      {
        minutes_until: 15
      },
      messageContext
    );
  }

  /**
   * Generate AI-powered sponsor recommendation message
   */
  async generateSponsorMessage(sponsors, contractor, visitedBooths = [], timeContext = 'break') {
    if (sponsors.length === 0) return null;

    const topSponsor = sponsors[0];

    const messageContext = {
      contractor: {
        first_name: contractor.first_name
      },
      entity: {
        sponsor_name: topSponsor.sponsor_name,
        booth_number: topSponsor.booth_number,
        why: topSponsor.why,
        talking_points: topSponsor.talking_points || []
      },
      history: {
        visited_booths: visitedBooths
      },
      timing: {
        time_context: timeContext
      }
    };

    return await generateContextualMessage(
      'sponsor_recommendation',
      {},
      messageContext
    );
  }

  /**
   * Generate AI-powered peer introduction message
   */
  async generatePeerMessage(peers, contractor) {
    if (peers.length === 0) return null;

    const topPeer = peers[0];

    const messageContext = {
      contractor: {
        first_name: contractor.first_name
      },
      entity: {
        peer_name: topPeer.peer_name,
        company_name: topPeer.company_name,
        why: topPeer.why,
        common_ground: topPeer.common_ground || []
      }
    };

    return await generateContextualMessage(
      'peer_introduction',
      {},
      messageContext
    );
  }

  /**
   * Schedule a message in the database (matching exact DB fields)
   */
  async scheduleMessage(contractor_id, event_id, message, recommendations) {
    await query(`
      INSERT INTO event_messages (
        event_id,
        contractor_id,
        message_type,
        message_category,
        scheduled_time,
        message_content,
        personalization_data,
        status,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `, [
      event_id,
      contractor_id,
      message.message_type,
      'ai_orchestrated',
      message.scheduled_time,
      message.message_content,
      safeJsonStringify({
        recommendations_count: {
          speakers: recommendations.speakers.length,
          sponsors: recommendations.sponsors.length,
          peers: recommendations.peers.length
        },
        related_entity_id: message.related_entity_id || null
      }),
      'scheduled'
    ]);
  }

  /**
   * Create learning event for AI improvement
   */
  async createLearningEvent(contractor_id, event_id, action, recommendations) {
    await query(`
      INSERT INTO ai_learning_events (
        event_type,
        contractor_id,
        context,
        action_taken,
        outcome,
        success_score,
        learned_insight,
        event_id,
        event_interaction_type,
        related_entities,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `, [
      'event_orchestration',
      contractor_id,
      `event_${event_id}`,
      action,
      'recommendations_generated',
      0, // Will be updated based on engagement
      `Generated ${recommendations.speakers.length} speaker, ${recommendations.sponsors.length} sponsor, ${recommendations.peers.length} peer recommendations`,
      event_id,
      'ai_orchestration',
      safeJsonStringify({
        recommendations: {
          speakers: recommendations.speakers.length,
          sponsors: recommendations.sponsors.length,
          peers: recommendations.peers.length
        }
      })
    ]);
  }

  // Data fetching methods with exact DB field names
  async getContractorProfile(contractor_id) {
    const result = await query(`
      SELECT c.*, cap.*
      FROM contractors c
      LEFT JOIN contractor_ai_profiles cap ON c.id = cap.contractor_id
      WHERE c.id = $1
    `, [contractor_id]);
    return result.rows[0];
  }

  async getEventDetails(event_id) {
    const result = await query(`
      SELECT
        id, name, date, end_date, location, description,
        website, logo_url, status, sms_event_code, timezone,
        expected_attendance, format, registration_deadline,
        to_json(ai_tags) as ai_tags,
        to_json(focus_areas_covered) as focus_areas_covered,
        ai_summary, target_audience, event_type
      FROM events WHERE id = $1
    `, [event_id]);
    return result.rows[0];
  }

  async getEventSpeakers(event_id) {
    const result = await query(`
      SELECT
        es.*,
        eai.start_time as session_time,
        eai.end_time as session_end_time
      FROM event_speakers es
      LEFT JOIN event_agenda_items eai ON eai.speaker_id = es.id AND eai.event_id = es.event_id
      WHERE es.event_id = $1
      ORDER BY eai.start_time
    `, [event_id]);
    return result.rows;
  }

  async getEventSponsors(event_id) {
    const result = await query(`
      SELECT es.*, sp.*
      FROM event_sponsors es
      LEFT JOIN strategic_partners sp ON es.partner_id = sp.id
      WHERE es.event_id = $1
    `, [event_id]);
    return result.rows;
  }

  async getCheckedInAttendees(event_id) {
    const result = await query(`
      SELECT ea.*, c.*
      FROM event_attendees ea
      JOIN contractors c ON ea.contractor_id = c.id
      WHERE ea.event_id = $1 AND ea.check_in_time IS NOT NULL
    `, [event_id]);
    return result.rows;
  }

  /**
   * Process scheduled messages (called by cron job or n8n)
   */
  async processScheduledMessages() {
    const now = new Date();

    // Get all messages ready to send
    const result = await query(`
      SELECT * FROM event_messages
      WHERE status = 'scheduled'
      AND scheduled_time <= $1
      AND message_content IS NOT NULL
      ORDER BY scheduled_time
    `, [now]);

    for (const message of result.rows) {
      await this.sendScheduledMessage(message);
    }

    return { processed: result.rows.length };
  }

  /**
   * Send a scheduled message
   */
  async sendScheduledMessage(message) {
    try {
      // Get contractor phone and name
      const contractor = await query(
        'SELECT phone, name FROM contractors WHERE id = $1',
        [message.contractor_id]
      );

      if (!contractor.rows[0]?.phone) {
        console.error(`[EventOrchestrator] ❌ Contractor ${message.contractor_id} has no phone number`);
        await query(`
          UPDATE event_messages
          SET status = 'failed', error_message = 'No phone number'
          WHERE id = $1
        `, [message.id]);
        return;
      }

      const phone = contractor.rows[0].phone;
      const contractorName = contractor.rows[0].name;

      // Get message content (should already be in database)
      let messageText = message.message_content;

      // Personalize with contractor name
      const firstName = contractorName?.split(' ')[0] || 'there';
      messageText = messageText.replace(/\{firstName\}/g, firstName);
      messageText = messageText.replace(/\{name\}/g, contractorName || 'there');

      // Determine correct webhook URL based on environment
      const n8nWebhookUrl = process.env.NODE_ENV === 'production'
        ? 'https://n8n.srv918843.hstgr.cloud/webhook/backend-to-ghl'
        : 'https://n8n.srv918843.hstgr.cloud/webhook/backend-to-ghl-dev';

      console.log(`[EventOrchestrator] 📱 Sending SMS ${message.id} (${message.message_type}) to ${phone} via ${n8nWebhookUrl}`);

      // Send SMS via n8n webhook
      await axios.post(n8nWebhookUrl, {
        send_via_ghl: {
          phone,
          message: messageText,
          timestamp: new Date().toISOString(),
          message_type: message.message_type,
          message_id: message.id
        }
      });

      // Mark as sent in database
      await query(`
        UPDATE event_messages
        SET status = 'sent', actual_send_time = NOW()
        WHERE id = $1
      `, [message.id]);

      // Create learning event
      await this.createLearningEvent(
        message.contractor_id,
        message.event_id,
        `sent_${message.message_type}`,
        { message_id: message.id }
      );

      console.log(`[EventOrchestrator] ✅ SMS ${message.id} sent successfully to ${phone}`);

    } catch (error) {
      console.error('[EventOrchestrator] ❌ Error sending scheduled message:', error);
      await query(`
        UPDATE event_messages
        SET status = 'failed', error_message = $1
        WHERE id = $2
      `, [error.message, message.id]);
    }
  }

  /**
   * CEO Override - delay all messages by X minutes
   */
  async applyEventDelay(event_id, delay_minutes) {
    await query(`
      UPDATE event_messages
      SET
        scheduled_time = scheduled_time + INTERVAL '${delay_minutes} minutes',
        delay_minutes = COALESCE(delay_minutes, 0) + $1
      WHERE event_id = $2 AND status = 'scheduled'
    `, [delay_minutes, event_id]);

    return { success: true, message: `All messages delayed by ${delay_minutes} minutes` };
  }

  /**
   * Track message response and update learning
   */
  async trackMessageResponse(message_id, response_text, sentiment_score) {
    await query(`
      UPDATE event_messages
      SET
        response_received = $1,
        response_time = NOW(),
        sentiment_score = $2
      WHERE id = $3
    `, [response_text, sentiment_score, message_id]);

    // Update success score in learning based on response
    const message = await query('SELECT * FROM event_messages WHERE id = $1', [message_id]);
    if (message.rows[0]) {
      const successScore = sentiment_score > 0 ? 80 : 20;
      await query(`
        UPDATE ai_learning_events
        SET success_score = $1
        WHERE contractor_id = $2 AND context = $3
      `, [successScore, message.rows[0].contractor_id, `event_${message.rows[0].event_id}`]);
    }
  }
}

module.exports = new EventOrchestratorAutomation();