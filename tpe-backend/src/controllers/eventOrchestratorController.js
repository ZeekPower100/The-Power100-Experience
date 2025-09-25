const { query } = require('../config/database');
const { AppError } = require('../middleware/errorHandler');
const { safeJsonParse, safeJsonStringify } = require('../utils/jsonHelpers');

/**
 * Event Orchestrator Controller
 * Core learning and engagement system for TPE events
 * All field names EXACTLY match database schema - verified against information_schema
 */

// Send speaker alert to attendees with learning integration
const sendSpeakerAlert = async (req, res, next) => {
  const {
    event_id,
    speaker_id,
    message_template,
    alert_type,
    target_audience // 'all', 'checked_in', or array of contractor_ids
  } = req.body;

  try {
    // Get speaker details
    const speaker = await query(
      'SELECT * FROM event_speakers WHERE id = $1 AND event_id = $2',
      [speaker_id, event_id]
    );

    if (speaker.rows.length === 0) {
      throw new AppError('Speaker not found', 404);
    }

    // Build recipient query based on target_audience
    let recipientQuery;
    let recipientParams = [event_id];

    if (Array.isArray(target_audience)) {
      // Specific contractors
      recipientQuery = `
        SELECT DISTINCT
          c.id as contractor_id,
          c.name,
          c.phone,
          c.company_name,
          ea.sms_opt_in
        FROM event_attendees ea
        JOIN contractors c ON ea.contractor_id = c.id
        WHERE ea.event_id = $1
          AND c.id = ANY($2::int[])
          AND ea.sms_opt_in = true
      `;
      recipientParams.push(target_audience);
    } else if (target_audience === 'checked_in') {
      recipientQuery = `
        SELECT DISTINCT
          c.id as contractor_id,
          c.name,
          c.phone,
          c.company_name,
          ea.sms_opt_in
        FROM event_attendees ea
        JOIN contractors c ON ea.contractor_id = c.id
        WHERE ea.event_id = $1
          AND ea.check_in_time IS NOT NULL
          AND ea.sms_opt_in = true
      `;
    } else {
      // All registered attendees
      recipientQuery = `
        SELECT DISTINCT
          c.id as contractor_id,
          c.name,
          c.phone,
          c.company_name,
          ea.sms_opt_in
        FROM event_attendees ea
        JOIN contractors c ON ea.contractor_id = c.id
        WHERE ea.event_id = $1
          AND ea.sms_opt_in = true
      `;
    }

    const recipients = await query(recipientQuery, recipientParams);
    const speakerData = speaker.rows[0];
    const insertedMessages = [];

    // Create messages for each recipient
    for (const recipient of recipients.rows) {
      // Personalize message
      let personalizedMessage = message_template
        .replace('{{contractor_name}}', recipient.name)
        .replace('{{speaker_name}}', speakerData.name)
        .replace('{{speaker_title}}', speakerData.title || '')
        .replace('{{topic}}', speakerData.topic || 'their presentation')
        .replace('{{time}}', speakerData.presentation_time || 'soon');

      // Insert into event_messages table (fields match database exactly)
      const messageResult = await query(`
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
        ) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, $5, $6, $7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING id
      `, [
        event_id,
        recipient.contractor_id,
        'speaker_alert',
        alert_type || 'upcoming_speaker',
        personalizedMessage,
        safeJsonStringify({
          speaker_id: speaker_id,
          speaker_name: speakerData.name,
          recipient_name: recipient.name,
          company: recipient.company_name
        }),
        'pending' // Will be sent by n8n webhook
      ]);

      insertedMessages.push(messageResult.rows[0].id);

      // Create learning event (fields match ai_learning_events exactly)
      await query(`
        INSERT INTO ai_learning_events (
          event_type,
          contractor_id,
          context,
          recommendation,
          event_id,
          event_interaction_type,
          related_entities,
          created_at,
          updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `, [
        'speaker_alert_sent',
        recipient.contractor_id,
        `Speaker alert for ${speakerData.name} on ${speakerData.topic}`,
        personalizedMessage,
        event_id,
        'speaker_notification',
        safeJsonStringify({
          speaker_id: speaker_id,
          message_id: messageResult.rows[0].id
        })
      ]);
    }

    res.json({
      success: true,
      speaker: speakerData,
      recipients_count: recipients.rows.length,
      message_ids: insertedMessages,
      webhook_trigger: 'n8n_speaker_alerts' // For n8n processing
    });
  } catch (error) {
    next(error);
  }
};

// Send sponsor engagement message with learning
const sendSponsorEngagement = async (req, res, next) => {
  const {
    event_id,
    sponsor_id,
    message_template,
    engagement_type,
    matching_criteria // Optional: focus_areas, revenue_range, etc.
  } = req.body;

  try {
    // Get sponsor details
    const sponsor = await query(`
      SELECT
        es.*,
        sp.company_name as partner_company,
        sp.ai_summary,
        sp.key_differentiators
      FROM event_sponsors es
      LEFT JOIN strategic_partners sp ON es.partner_id = sp.id
      WHERE es.id = $1 AND es.event_id = $2
    `, [sponsor_id, event_id]);

    if (sponsor.rows.length === 0) {
      throw new AppError('Sponsor not found', 404);
    }

    const sponsorData = sponsor.rows[0];

    // Build recipient query based on matching criteria
    let recipientQuery = `
      SELECT DISTINCT
        c.id as contractor_id,
        c.name,
        c.phone,
        c.company_name,
        c.focus_areas,
        c.revenue_range,
        ea.sms_opt_in
      FROM event_attendees ea
      JOIN contractors c ON ea.contractor_id = c.id
      WHERE ea.event_id = $1
        AND ea.check_in_time IS NOT NULL
        AND ea.sms_opt_in = true
    `;
    const queryParams = [event_id];

    // Apply matching criteria if provided
    if (matching_criteria) {
      if (matching_criteria.focus_areas) {
        recipientQuery += ` AND c.focus_areas && $${queryParams.length + 1}::text[]`;
        queryParams.push(matching_criteria.focus_areas);
      }
      if (matching_criteria.revenue_range) {
        recipientQuery += ` AND c.revenue_range = $${queryParams.length + 1}`;
        queryParams.push(matching_criteria.revenue_range);
      }
    }

    recipientQuery += ' LIMIT 30'; // Reasonable limit for targeted engagement

    const recipients = await query(recipientQuery, queryParams);
    const insertedMessages = [];

    for (const recipient of recipients.rows) {
      // Personalize message
      let personalizedMessage = message_template
        .replace('{{contractor_name}}', recipient.name)
        .replace('{{sponsor_name}}', sponsorData.sponsor_name)
        .replace('{{sponsor_company}}', sponsorData.partner_company)
        .replace('{{booth_number}}', sponsorData.booth_number || 'main area')
        .replace('{{special_offer}}', sponsorData.special_offer || 'exclusive insights');

      // Insert message
      const messageResult = await query(`
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
        ) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, $5, $6, $7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING id
      `, [
        event_id,
        recipient.contractor_id,
        'sponsor_engagement',
        engagement_type || 'booth_visit',
        personalizedMessage,
        safeJsonStringify({
          sponsor_id: sponsor_id,
          partner_id: sponsorData.partner_id,
          sponsor_name: sponsorData.sponsor_name,
          matching_score: calculateMatchScore(recipient, sponsorData)
        }),
        'pending'
      ]);

      insertedMessages.push(messageResult.rows[0].id);

      // Create learning event
      await query(`
        INSERT INTO ai_learning_events (
          event_type,
          contractor_id,
          partner_id,
          context,
          recommendation,
          event_id,
          event_interaction_type,
          related_entities,
          created_at,
          updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `, [
        'sponsor_engagement_sent',
        recipient.contractor_id,
        sponsorData.partner_id,
        `Sponsor engagement from ${sponsorData.partner_company}`,
        personalizedMessage,
        event_id,
        'sponsor_outreach',
        safeJsonStringify({
          sponsor_id: sponsor_id,
          message_id: messageResult.rows[0].id,
          engagement_type: engagement_type
        })
      ]);
    }

    res.json({
      success: true,
      sponsor: sponsorData,
      recipients_count: recipients.rows.length,
      message_ids: insertedMessages,
      matching_criteria: matching_criteria,
      webhook_trigger: 'n8n_sponsor_engagement'
    });
  } catch (error) {
    next(error);
  }
};

// Intelligent peer matching and connection
const createPeerConnection = async (req, res, next) => {
  const {
    event_id,
    contractor1_id,
    contractor2_id,
    match_reason,
    introduction_template
  } = req.body;

  try {
    // Get both contractors' details
    const contractors = await query(`
      SELECT
        c.*,
        ea.table_number,
        ea.custom_responses
      FROM contractors c
      JOIN event_attendees ea ON c.id = ea.contractor_id
      WHERE ea.event_id = $1 AND c.id IN ($2, $3)
    `, [event_id, contractor1_id, contractor2_id]);

    if (contractors.rows.length !== 2) {
      throw new AppError('One or both contractors not found at event', 404);
    }

    const [contractor1, contractor2] = contractors.rows;

    // Calculate match score based on complementary factors
    const matchScore = calculatePeerMatchScore(contractor1, contractor2);

    // Create peer match record (fields match event_peer_matches exactly)
    const peerMatch = await query(`
      INSERT INTO event_peer_matches (
        event_id,
        contractor1_id,
        contractor2_id,
        match_type,
        match_criteria,
        match_score,
        match_reason,
        introduction_message,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING id
    `, [
      event_id,
      contractor1_id,
      contractor2_id,
      'orchestrated', // vs 'organic' for self-initiated
      safeJsonStringify({
        shared_focus_areas: findSharedFocusAreas(contractor1, contractor2),
        complementary_strengths: findComplementaryStrengths(contractor1, contractor2)
      }),
      matchScore,
      match_reason || generateMatchReason(contractor1, contractor2),
      introduction_template || generateIntroduction(contractor1, contractor2)
    ]);

    // Create messages for both contractors
    const message1 = (introduction_template || generateIntroduction(contractor1, contractor2))
      .replace('{{your_name}}', contractor1.name)
      .replace('{{peer_name}}', contractor2.name)
      .replace('{{peer_company}}', contractor2.company_name);

    const message2 = (introduction_template || generateIntroduction(contractor2, contractor1))
      .replace('{{your_name}}', contractor2.name)
      .replace('{{peer_name}}', contractor1.name)
      .replace('{{peer_company}}', contractor1.company_name);

    // Insert messages for both contractors
    for (const [contractor, message] of [[contractor1, message1], [contractor2, message2]]) {
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
        ) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, $5, $6, $7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `, [
        event_id,
        contractor.id,
        'peer_introduction',
        'networking',
        message,
        safeJsonStringify({
          peer_match_id: peerMatch.rows[0].id,
          peer_id: contractor.id === contractor1.id ? contractor2.id : contractor1.id,
          match_score: matchScore
        }),
        'pending'
      ]);
    }

    // Create learning events for both contractors
    for (const contractor of [contractor1, contractor2]) {
      const peer = contractor.id === contractor1.id ? contractor2 : contractor1;
      await query(`
        INSERT INTO ai_learning_events (
          event_type,
          contractor_id,
          context,
          recommendation,
          event_id,
          event_interaction_type,
          related_entities,
          created_at,
          updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `, [
        'peer_connection_created',
        contractor.id,
        `Matched with ${peer.name} from ${peer.company_name}`,
        match_reason || generateMatchReason(contractor1, contractor2),
        event_id,
        'peer_match',
        safeJsonStringify({
          peer_match_id: peerMatch.rows[0].id,
          peer_id: peer.id,
          match_score: matchScore
        })
      ]);
    }

    res.json({
      success: true,
      peer_match_id: peerMatch.rows[0].id,
      contractor1: { id: contractor1.id, name: contractor1.name, company: contractor1.company_name },
      contractor2: { id: contractor2.id, name: contractor2.name, company: contractor2.company_name },
      match_score: matchScore,
      match_reason: match_reason || generateMatchReason(contractor1, contractor2),
      webhook_trigger: 'n8n_peer_introduction'
    });
  } catch (error) {
    next(error);
  }
};

// Auto-match peers at event
const autoMatchPeers = async (req, res, next) => {
  const { event_id, max_matches = 10 } = req.body;

  try {
    // Get all checked-in attendees
    const attendees = await query(`
      SELECT
        c.*,
        ea.table_number
      FROM contractors c
      JOIN event_attendees ea ON c.id = ea.contractor_id
      WHERE ea.event_id = $1
        AND ea.check_in_time IS NOT NULL
        AND ea.sms_opt_in = true
      ORDER BY ea.check_in_time
    `, [event_id]);

    // Find best matches
    const matches = [];
    const matchedContractors = new Set();

    for (let i = 0; i < attendees.rows.length && matches.length < max_matches; i++) {
      if (matchedContractors.has(attendees.rows[i].id)) continue;

      let bestMatch = null;
      let bestScore = 0;

      for (let j = i + 1; j < attendees.rows.length; j++) {
        if (matchedContractors.has(attendees.rows[j].id)) continue;

        const score = calculatePeerMatchScore(attendees.rows[i], attendees.rows[j]);
        if (score > bestScore && score > 0.6) { // Minimum threshold
          bestScore = score;
          bestMatch = attendees.rows[j];
        }
      }

      if (bestMatch) {
        matches.push({
          contractor1: attendees.rows[i],
          contractor2: bestMatch,
          score: bestScore
        });
        matchedContractors.add(attendees.rows[i].id);
        matchedContractors.add(bestMatch.id);
      }
    }

    // Create matches
    const createdMatches = [];
    for (const match of matches) {
      const result = await createPeerConnection({
        body: {
          event_id,
          contractor1_id: match.contractor1.id,
          contractor2_id: match.contractor2.id,
          match_reason: `Matched based on complementary business focus and growth stage`
        }
      }, {
        json: (data) => createdMatches.push(data)
      }, next);
    }

    res.json({
      success: true,
      total_attendees: attendees.rows.length,
      matches_created: matches.length,
      matches: matches.map(m => ({
        contractor1: m.contractor1.name,
        contractor2: m.contractor2.name,
        score: m.score
      }))
    });
  } catch (error) {
    next(error);
  }
};

// Helper functions
function calculateMatchScore(contractor, sponsor) {
  let score = 0.5; // Base score

  // Check focus area alignment
  if (contractor.focus_areas && sponsor.key_differentiators) {
    const contractorFocus = safeJsonParse(contractor.focus_areas) || [];
    const sponsorStrengths = safeJsonParse(sponsor.key_differentiators) || [];

    for (const focus of contractorFocus) {
      if (sponsorStrengths.some(s => s.toLowerCase().includes(focus.toLowerCase()))) {
        score += 0.1;
      }
    }
  }

  return Math.min(score, 1.0);
}

function calculatePeerMatchScore(contractor1, contractor2) {
  let score = 0.3; // Base score for being at same event

  // Parse JSON fields safely
  const focus1 = safeJsonParse(contractor1.focus_areas) || [];
  const focus2 = safeJsonParse(contractor2.focus_areas) || [];

  // Shared focus areas (complementary is better than identical)
  const sharedFocus = focus1.filter(f => focus2.includes(f));
  if (sharedFocus.length === 1) score += 0.3; // One shared focus is ideal
  else if (sharedFocus.length > 1) score += 0.2; // Some overlap

  // Different revenue ranges can be complementary
  if (contractor1.revenue_range !== contractor2.revenue_range) {
    score += 0.2; // Different stages can learn from each other
  }

  // Same table number increases likelihood of interaction
  if (contractor1.table_number && contractor1.table_number === contractor2.table_number) {
    score += 0.2;
  }

  return Math.min(score, 1.0);
}

function findSharedFocusAreas(contractor1, contractor2) {
  const focus1 = safeJsonParse(contractor1.focus_areas) || [];
  const focus2 = safeJsonParse(contractor2.focus_areas) || [];
  return focus1.filter(f => focus2.includes(f));
}

function findComplementaryStrengths(contractor1, contractor2) {
  // Identify complementary aspects
  const strengths = [];

  if (contractor1.revenue_range !== contractor2.revenue_range) {
    strengths.push('Different growth stages');
  }

  if (contractor1.team_size !== contractor2.team_size) {
    strengths.push('Different team scales');
  }

  return strengths;
}

function generateMatchReason(contractor1, contractor2) {
  const shared = findSharedFocusAreas(contractor1, contractor2);
  const complementary = findComplementaryStrengths(contractor1, contractor2);

  let reason = 'Connected based on ';
  if (shared.length > 0) {
    reason += `shared interest in ${shared.join(', ')}`;
  }
  if (complementary.length > 0) {
    reason += shared.length > 0 ? ' and ' : '';
    reason += complementary.join(', ').toLowerCase();
  }

  return reason;
}

function generateIntroduction(contractorA, contractorB) {
  return `Hi {{your_name}}! Meet {{peer_name}} from {{peer_company}} - we thought you two should connect at today's event. You both share similar business goals and could benefit from each other's experience. Look for them near the registration area!`;
}

module.exports = {
  sendSpeakerAlert,
  sendSponsorEngagement,
  createPeerConnection,
  autoMatchPeers
};