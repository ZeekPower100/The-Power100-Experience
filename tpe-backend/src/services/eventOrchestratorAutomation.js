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
    const speakerRecommendations = await this.matchSpeakers(contractor, speakers);

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
  async matchSpeakers(contractor, speakers) {
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
          alert_time: this.calculateAlertTime(speaker.session_time)
        });
      }
    }

    // Return top 3 speakers (or all if less than 3)
    return matches.sort((a, b) => b.relevance_score - a.relevance_score).slice(0, 3);
  }

  /**
   * Calculate when to send speaker alert (15 minutes before)
   */
  calculateAlertTime(session_time) {
    const alertTime = new Date(session_time);
    alertTime.setMinutes(alertTime.getMinutes() - 15);
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
   */
  async scheduleAllMessages(contractor_id, event_id, recommendations) {
    const messages = [];

    // 1. Welcome message (immediate)
    messages.push({
      message_type: 'welcome',
      scheduled_time: new Date(),
      message_content: this.generateWelcomeMessage(recommendations)
    });

    // 2. Speaker alerts (15 min before each session)
    for (const speaker of recommendations.speakers) {
      messages.push({
        message_type: 'speaker_alert',
        scheduled_time: speaker.alert_time,
        message_content: this.generateSpeakerAlert(speaker),
        related_entity_id: speaker.speaker_id
      });
    }

    // 3. Sponsor recommendations (30 min after check-in)
    const sponsorTime = new Date();
    sponsorTime.setMinutes(sponsorTime.getMinutes() + 30);
    if (recommendations.sponsors.length > 0) {
      messages.push({
        message_type: 'sponsor_recommendation',
        scheduled_time: sponsorTime,
        message_content: this.generateSponsorMessage(recommendations.sponsors),
        related_entity_id: recommendations.sponsors[0].sponsor_id
      });
    }

    // 4. Peer introductions (45 min after check-in)
    const peerTime = new Date();
    peerTime.setMinutes(peerTime.getMinutes() + 45);
    if (recommendations.peers.length > 0) {
      messages.push({
        message_type: 'peer_introduction',
        scheduled_time: peerTime,
        message_content: this.generatePeerMessage(recommendations.peers),
        related_entity_id: recommendations.peers[0].peer_id
      });
    }

    // Insert all scheduled messages into database
    for (const message of messages) {
      await this.scheduleMessage(contractor_id, event_id, message, recommendations);
    }

    return messages;
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
   * Generate speaker alert message
   */
  generateSpeakerAlert(speaker) {
    return `🎤 Starting in 15 min: "${speaker.session_title}" by ${speaker.speaker_name}. ${speaker.why}. Location: Main Stage.`;
  }

  /**
   * Generate sponsor recommendation message
   */
  generateSponsorMessage(sponsors) {
    if (sponsors.length === 0) return null;

    const topSponsor = sponsors[0];
    let message = `🤝 Visit Booth ${topSponsor.booth_number}: ${topSponsor.sponsor_name}. ${topSponsor.why}.`;

    if (topSponsor.talking_points?.length > 0) {
      message += ` Ask about: ${topSponsor.talking_points[0]}`;
    }

    return message;
  }

  /**
   * Generate peer introduction message
   */
  generatePeerMessage(peers) {
    if (peers.length === 0) return null;

    const topPeer = peers[0];
    return `👥 Connect with ${topPeer.peer_name} from ${topPeer.company_name}. ${topPeer.why}. ${topPeer.common_ground?.length > 0 ? `You both ${topPeer.common_ground[0]}` : ''}`;
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
    const result = await query('SELECT * FROM events WHERE id = $1', [event_id]);
    return result.rows[0];
  }

  async getEventSpeakers(event_id) {
    const result = await query(`
      SELECT * FROM event_speakers
      WHERE event_id = $1
      ORDER BY session_time
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