const { safeJsonParse, safeJsonStringify } = require('../utils/jsonHelpers');

const db = require('../config/database');

// Helper function to sync speakers to event_speakers table
async function syncEventSpeakers(eventId, speakerProfiles) {
  try {
    // Clear existing speakers for this event
    await db.query('DELETE FROM event_speakers WHERE event_id = $1', [eventId]);

    if (!speakerProfiles) return;

    // Parse speaker profiles if it's a string
    const speakers = typeof speakerProfiles === 'string'
      ? safeJsonParse(speakerProfiles)
      : speakerProfiles;

    if (!Array.isArray(speakers)) return;

    // Insert each speaker - using EXACT database column names
    for (const speaker of speakers) {
      if (typeof speaker === 'string') {
        // Simple string format: "Speaker Name - Title - Company"
        const parts = speaker.split(' - ').map(s => s.trim());
        const name = parts[0] || speaker;
        const title = parts[1] || '';
        const company = parts[2] || '';

        await db.query(
          `INSERT INTO event_speakers (
            event_id,
            name,
            title,
            company,
            bio,
            session_title,
            created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
          [eventId, name, title, company, '', '']
        );
      } else if (typeof speaker === 'object') {
        // Object format with more details - map to exact database columns
        await db.query(
          `INSERT INTO event_speakers (
            event_id,
            name,
            title,
            company,
            bio,
            headshot_url,
            session_title,
            session_description,
            session_time,
            session_duration_minutes,
            session_location,
            created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())`,
          [
            eventId,
            speaker.name || speaker.speaker_name || '',
            speaker.title || speaker.speaker_title || '',
            speaker.company || speaker.speaker_company || '',
            speaker.bio || speaker.speaker_bio || '',
            speaker.headshot_url || speaker.image_url || speaker.photo || '',
            speaker.session_title || speaker.topic || '',
            speaker.session_description || speaker.description || '',
            speaker.session_time || null,
            speaker.session_duration_minutes || speaker.duration || null,
            speaker.session_location || speaker.room || ''
          ]
        );
      }
    }
  } catch (error) {
    console.error('Error syncing event speakers:', error);
    // Don't throw - this is a secondary operation
  }
}

// Helper function to sync sponsors to event_sponsors table
async function syncEventSponsors(eventId, sponsors) {
  try {
    // Clear existing sponsors for this event
    await db.query('DELETE FROM event_sponsors WHERE event_id = $1', [eventId]);

    if (!sponsors) return;

    // Parse sponsors if it's a string
    const sponsorList = typeof sponsors === 'string'
      ? safeJsonParse(sponsors)
      : sponsors;

    if (!Array.isArray(sponsorList)) return;

    // Insert each sponsor - using EXACT database column names
    for (const sponsor of sponsorList) {
      if (typeof sponsor === 'string') {
        // Simple string format: just the sponsor name
        // Try to find matching partner
        let partnerId = null;
        const partnerResult = await db.query(
          'SELECT id FROM strategic_partners WHERE LOWER(company_name) = LOWER($1) LIMIT 1',
          [sponsor]
        );
        if (partnerResult.rows.length > 0) {
          partnerId = partnerResult.rows[0].id;
        }

        await db.query(
          `INSERT INTO event_sponsors (
            event_id,
            partner_id,
            sponsor_name,
            sponsor_tier,
            booth_number,
            booth_location,
            created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
          [eventId, partnerId, sponsor, 'standard', '', '']
        );
      } else if (typeof sponsor === 'object') {
        // Object format with more details
        // Try to match sponsor to partner by name
        let partnerId = null;
        if (sponsor.name || sponsor.sponsor_name || sponsor.company) {
          const searchName = sponsor.name || sponsor.sponsor_name || sponsor.company;
          const partnerResult = await db.query(
            'SELECT id FROM strategic_partners WHERE LOWER(company_name) = LOWER($1) LIMIT 1',
            [searchName]
          );
          if (partnerResult.rows.length > 0) {
            partnerId = partnerResult.rows[0].id;
          }
        }

        const sponsorName = sponsor.name || sponsor.sponsor_name || sponsor.company || '';

        await db.query(
          `INSERT INTO event_sponsors (
            event_id,
            partner_id,
            sponsor_name,
            sponsor_tier,
            booth_number,
            booth_location,
            special_offers,
            demo_booking_url,
            presentation_title,
            presentation_time,
            created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())`,
          [
            eventId,
            partnerId || sponsor.partner_id || null,
            sponsorName,
            sponsor.tier || sponsor.sponsor_tier || 'standard',
            sponsor.booth_number || sponsor.booth || '',
            sponsor.booth_location || sponsor.location || '',
            sponsor.special_offers || sponsor.offers || '',
            sponsor.demo_booking_url || sponsor.booking_url || '',
            sponsor.presentation_title || sponsor.presentation || '',
            sponsor.presentation_time || null
          ]
        );
      }
    }
  } catch (error) {
    console.error('Error syncing event sponsors:', error);
    // Don't throw - this is a secondary operation
  }
}

// Get all events
exports.getAllEvents = async (req, res) => {
  try {
    const query = `
      SELECT * FROM events 
      ORDER BY date ASC
    `;
    const result = await db.query(query);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
};

// Get pending events
exports.getPendingEvents = async (req, res) => {
  try {
    const query = `
      SELECT * FROM events 
      WHERE status = 'pending_review'
      ORDER BY created_at DESC
    `;
    const result = await db.query(query);
    res.json({ events: result.rows });
  } catch (error) {
    console.error('Error fetching pending events:', error);
    res.status(500).json({ error: 'Failed to fetch pending events' });
  }
};

// Approve event
exports.approveEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const query = `
      UPDATE events 
      SET status = 'approved'
      WHERE id = $1
      RETURNING *
    `;
    const result = await db.query(query, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error approving event:', error);
    res.status(500).json({ error: 'Failed to approve event' });
  }
};

// Get single event
exports.getEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const query = 'SELECT * FROM events WHERE id = $1';
    const result = await db.query(query, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching event:', error);
    res.status(500).json({ error: 'Failed to fetch event' });
  }
};

// Create new event
exports.createEvent = async (req, res) => {
  console.log('Received event data:', safeJsonStringify(req.body, null, 2));
  
  try {
    const {
      name,
      date,
      end_date,
      registration_deadline,
      location,
      format,
      description,
      expected_attendance,
      website,
      logo_url,
      focus_areas_covered,
      
      // New fields
      target_audience,
      topics,
      price_range,
      registration_url,
      organizer_name,
      organizer_email,
      organizer_phone,
      organizer_company,
      event_type,
      duration,
      past_attendee_testimonials,
      success_metrics,
      speaker_profiles,
      agenda_highlights,
      networking_quality_score,
      submission_type,
      status,
      
      // Missing fields that need to be captured
      hotel_block_url,
      target_revenue,
      sponsors,
      pre_registered_attendees,
      networking_opportunities,
      session_recordings,
      post_event_support,
      implementation_support,
      follow_up_resources,
      poc_customer_name,
      poc_customer_email,
      poc_customer_phone,
      poc_media_name,
      poc_media_email,
      poc_media_phone,
      
      is_active = true
    } = req.body;

    // Check which columns exist in the database
    const checkColumnsQuery = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'events'
    `;
    const columnsResult = await db.query(checkColumnsQuery);
    const existingColumns = columnsResult.rows.map(row => row.column_name);

    // Build dynamic insert query based on existing columns
    const fields = [];
    const values = [];
    const placeholders = [];
    let placeholderIndex = 1;

    // Add fields that exist in the database
    const fieldsToInsert = {
      name,
      date,
      registration_deadline,
      location,
      format,
      description,
      expected_attendance,
      website,
      logo_url,
      focus_areas_covered,
      is_active
    };

    // Add new fields if columns exist
    if (existingColumns.includes('end_date')) fieldsToInsert.end_date = end_date;
    if (existingColumns.includes('target_audience')) fieldsToInsert.target_audience = target_audience;
    if (existingColumns.includes('topics')) fieldsToInsert.topics = topics;
    if (existingColumns.includes('price_range')) fieldsToInsert.price_range = price_range;
    if (existingColumns.includes('registration_url')) fieldsToInsert.registration_url = registration_url;
    if (existingColumns.includes('organizer_name')) fieldsToInsert.organizer_name = organizer_name;
    if (existingColumns.includes('organizer_email')) fieldsToInsert.organizer_email = organizer_email;
    if (existingColumns.includes('organizer_phone')) fieldsToInsert.organizer_phone = organizer_phone;
    if (existingColumns.includes('organizer_company')) fieldsToInsert.organizer_company = organizer_company;
    if (existingColumns.includes('event_type')) fieldsToInsert.event_type = event_type;
    if (existingColumns.includes('duration')) fieldsToInsert.duration = duration;
    if (existingColumns.includes('past_attendee_testimonials')) fieldsToInsert.past_attendee_testimonials = past_attendee_testimonials;
    if (existingColumns.includes('success_metrics')) fieldsToInsert.success_metrics = success_metrics;
    if (existingColumns.includes('speaker_profiles')) fieldsToInsert.speaker_profiles = speaker_profiles;
    if (existingColumns.includes('agenda_highlights')) fieldsToInsert.agenda_highlights = agenda_highlights;
    if (existingColumns.includes('networking_quality_score')) fieldsToInsert.networking_quality_score = networking_quality_score;
    if (existingColumns.includes('submission_type')) fieldsToInsert.submission_type = submission_type;
    if (existingColumns.includes('status')) fieldsToInsert.status = status;
    
    // Add the missing fields that weren't being saved
    if (existingColumns.includes('hotel_block_url')) fieldsToInsert.hotel_block_url = hotel_block_url;
    if (existingColumns.includes('target_revenue')) fieldsToInsert.target_revenue = target_revenue;
    if (existingColumns.includes('sponsors')) fieldsToInsert.sponsors = sponsors;
    if (existingColumns.includes('pre_registered_attendees')) fieldsToInsert.pre_registered_attendees = pre_registered_attendees;
    if (existingColumns.includes('networking_opportunities')) fieldsToInsert.networking_opportunities = networking_opportunities;
    if (existingColumns.includes('session_recordings')) fieldsToInsert.session_recordings = session_recordings;
    if (existingColumns.includes('post_event_support')) fieldsToInsert.post_event_support = post_event_support;
    if (existingColumns.includes('implementation_support')) fieldsToInsert.implementation_support = implementation_support;
    if (existingColumns.includes('follow_up_resources')) fieldsToInsert.follow_up_resources = follow_up_resources;
    if (existingColumns.includes('poc_customer_name')) fieldsToInsert.poc_customer_name = poc_customer_name;
    if (existingColumns.includes('poc_customer_email')) fieldsToInsert.poc_customer_email = poc_customer_email;
    if (existingColumns.includes('poc_customer_phone')) fieldsToInsert.poc_customer_phone = poc_customer_phone;
    if (existingColumns.includes('poc_media_name')) fieldsToInsert.poc_media_name = poc_media_name;
    if (existingColumns.includes('poc_media_email')) fieldsToInsert.poc_media_email = poc_media_email;
    if (existingColumns.includes('poc_media_phone')) fieldsToInsert.poc_media_phone = poc_media_phone;

    // Build the query dynamically
    for (const [key, value] of Object.entries(fieldsToInsert)) {
      if (value !== undefined && value !== null && value !== '') {
        fields.push(key);
        
        // Handle array/JSON fields that need to be stringified
        if (['networking_opportunities', 'follow_up_resources', 'ai_tags', 'historical_attendance', 
             'roi_tracking', 'speaker_credentials'].includes(key)) {
          // JSONB fields - pass as-is, PostgreSQL will handle
          values.push(value);
        } else if (['target_revenue', 'sponsors', 'pre_registered_attendees'].includes(key)) {
          // TEXT fields that store arrays - stringify them
          values.push(Array.isArray(value) ? safeJsonStringify(value) : value);
        } else {
          values.push(value);
        }
        
        placeholders.push(`$${placeholderIndex++}`);
      }
    }

    if (fields.length === 0) {
      return res.status(400).json({ error: 'No valid fields to insert' });
    }

    const insertQuery = `
      INSERT INTO events (${fields.join(', ')})
      VALUES (${placeholders.join(', ')})
      RETURNING *
    `;

    const result = await db.query(insertQuery, values);
    const newEvent = result.rows[0];

    // Sync speakers to event_speakers table
    if (newEvent.speaker_profiles) {
      await syncEventSpeakers(newEvent.id, newEvent.speaker_profiles);
    }

    // Sync sponsors to event_sponsors table
    if (newEvent.sponsors) {
      await syncEventSponsors(newEvent.id, newEvent.sponsors);
    }

    res.status(201).json(newEvent);
  } catch (error) {
    console.error('Error creating event:', error);
    res.status(500).json({ error: 'Failed to create event', details: error.message });
  }
};

// Update event
exports.updateEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Remove id from updates if present
    delete updates.id;

    // Check which columns exist in the database
    const checkColumnsQuery = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'events'
    `;
    const columnsResult = await db.query(checkColumnsQuery);
    const existingColumns = columnsResult.rows.map(row => row.column_name);

    // Build dynamic update query
    const setClause = [];
    const values = [];
    let placeholderIndex = 1;

    for (const [key, value] of Object.entries(updates)) {
      if (existingColumns.includes(key)) {
        setClause.push(`${key} = $${placeholderIndex++}`);
        values.push(value);
      }
    }

    if (setClause.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    values.push(id); // Add id as the last parameter
    const updateQuery = `
      UPDATE events
      SET ${setClause.join(', ')}
      WHERE id = $${placeholderIndex}
      RETURNING *
    `;

    const result = await db.query(updateQuery, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const updatedEvent = result.rows[0];

    // Sync speakers to event_speakers table if updated
    if (updates.speaker_profiles !== undefined) {
      await syncEventSpeakers(updatedEvent.id, updatedEvent.speaker_profiles);
    }

    // Sync sponsors to event_sponsors table if updated
    if (updates.sponsors !== undefined) {
      await syncEventSponsors(updatedEvent.id, updatedEvent.sponsors);
    }

    res.json(updatedEvent);
  } catch (error) {
    console.error('Error updating event:', error);
    res.status(500).json({ error: 'Failed to update event', details: error.message });
  }
};

// Delete event
exports.deleteEvent = async (req, res) => {
  try {
    const { id } = req.params;

    const query = 'DELETE FROM events WHERE id = $1 RETURNING id';
    const result = await db.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    res.json({ message: 'Event deleted successfully', id: result.rows[0].id });
  } catch (error) {
    console.error('Error deleting event:', error);
    res.status(500).json({ error: 'Failed to delete event' });
  }
};

// AI Recommendation Methods - ALL SNAKE_CASE TO MATCH DATABASE
const eventAIRecommendationService = require('../services/eventAIRecommendationService');
const eventAIOrchestrationService = require('../services/eventAIOrchestrationService');

// Get AI speaker recommendations for a contractor
exports.getAISpeakerRecommendations = async (req, res) => {
  try {
    const { id: event_id } = req.params;
    const { contractor_id, limit = 3 } = req.query;  // snake_case parameters

    if (!contractor_id) {
      return res.status(400).json({ error: 'contractor_id is required' });
    }

    const recommendations = await eventAIRecommendationService.recommendSpeakers(
      event_id,
      contractor_id,
      parseInt(limit)
    );

    res.json({
      success: true,
      event_id: event_id,  // snake_case
      contractor_id: contractor_id,  // snake_case
      ...recommendations
    });
  } catch (error) {
    console.error('Error getting AI speaker recommendations:', error);
    res.status(500).json({
      error: 'Failed to generate speaker recommendations',
      details: error.message
    });
  }
};

// Get AI sponsor recommendations with talking points
exports.getAISponsorRecommendations = async (req, res) => {
  try {
    const { id: event_id } = req.params;
    const { contractor_id, limit = 3 } = req.query;  // snake_case parameters

    if (!contractor_id) {
      return res.status(400).json({ error: 'contractor_id is required' });
    }

    const recommendations = await eventAIRecommendationService.recommendSponsors(
      event_id,
      contractor_id,
      parseInt(limit)
    );

    res.json({
      success: true,
      event_id: event_id,  // snake_case
      contractor_id: contractor_id,  // snake_case
      ...recommendations
    });
  } catch (error) {
    console.error('Error getting AI sponsor recommendations:', error);
    res.status(500).json({
      error: 'Failed to generate sponsor recommendations',
      details: error.message
    });
  }
};

// Get personalized event agenda
exports.getPersonalizedAgenda = async (req, res) => {
  try {
    const { id: event_id } = req.params;
    const { contractor_id } = req.query;  // snake_case parameter

    if (!contractor_id) {
      return res.status(400).json({ error: 'contractor_id is required' });
    }

    const agenda = await eventAIRecommendationService.getPersonalizedAgenda(
      event_id,
      contractor_id
    );

    res.json({
      success: true,
      event_id: event_id,  // snake_case
      contractor_id: contractor_id,  // snake_case
      personalized_agenda: agenda
    });
  } catch (error) {
    console.error('Error getting personalized agenda:', error);
    res.status(500).json({
      error: 'Failed to generate personalized agenda',
      details: error.message
    });
  }
};

// Test AI recommendations (admin endpoint)
exports.testAIRecommendations = async (req, res) => {
  try {
    const { id: event_id } = req.params;

    // Get a test contractor (first one in database)
    const test_contractor = await db.query(
      'SELECT id, company_name FROM contractors LIMIT 1'
    );

    if (test_contractor.rows.length === 0) {
      return res.status(404).json({ error: 'No contractors found for testing' });
    }

    const contractor_id = test_contractor.rows[0].id;
    const company_name = test_contractor.rows[0].company_name;

    // Generate all types of recommendations
    const [speakers, sponsors, agenda] = await Promise.all([
      eventAIRecommendationService.recommendSpeakers(event_id, contractor_id, 3),
      eventAIRecommendationService.recommendSponsors(event_id, contractor_id, 3),
      eventAIRecommendationService.getPersonalizedAgenda(event_id, contractor_id)
    ]);

    res.json({
      success: true,
      test_mode: true,
      test_contractor: {
        id: contractor_id,
        company: company_name
      },
      recommendations: {
        speakers: speakers.recommendations,
        sponsors: sponsors.recommendations,
        personalized_agenda: agenda
      },
      message: 'AI recommendations generated successfully for testing'
    });
  } catch (error) {
    console.error('Error testing AI recommendations:', error);
    res.status(500).json({
      error: 'Failed to test AI recommendations',
      details: error.message
    });
  }
};

// Send AI speaker recommendations via SMS
/**
 * @api {post} /events/:id/ai/speakers/sms Send speaker recommendations via SMS
 * @apiParam {Number} contractor_id Contractor ID (request body)
 * @apiParam {Boolean} send_immediately Whether to send immediately (request body, not DB field)
 */
exports.sendAISpeakerRecommendationsSMS = async (req, res) => {
  try {
    const { id: event_id } = req.params;
    const { contractor_id, send_immediately = true } = req.body;  // API params, not DB fields

    if (!contractor_id) {
      return res.status(400).json({ error: 'contractor_id is required' });
    }

    const result = await eventAIOrchestrationService.sendSpeakerRecommendations(
      event_id,
      contractor_id,
      { send_immediately }
    );

    if (!result.success) {
      return res.status(400).json({
        error: result.error || 'Failed to send speaker recommendations'
      });
    }

    res.json({
      success: true,
      event_id: event_id,
      contractor_id: contractor_id,
      ...result
    });
  } catch (error) {
    console.error('Error sending AI speaker recommendations via SMS:', error);
    res.status(500).json({
      error: 'Failed to send speaker recommendations via SMS',
      details: error.message
    });
  }
};

// Send AI sponsor recommendations via SMS
/**
 * @api {post} /events/:id/ai/sponsors/sms Send sponsor recommendations via SMS
 * @apiParam {Number} contractor_id Contractor ID (request body)
 * @apiParam {Boolean} send_immediately Whether to send immediately (request body, not DB field)
 */
exports.sendAISponsorRecommendationsSMS = async (req, res) => {
  try {
    const { id: event_id } = req.params;
    const { contractor_id, send_immediately = true } = req.body;  // API params, not DB fields

    if (!contractor_id) {
      return res.status(400).json({ error: 'contractor_id is required' });
    }

    const result = await eventAIOrchestrationService.sendSponsorRecommendations(
      event_id,
      contractor_id,
      { send_immediately }
    );

    if (!result.success) {
      return res.status(400).json({
        error: result.error || 'Failed to send sponsor recommendations'
      });
    }

    res.json({
      success: true,
      event_id: event_id,
      contractor_id: contractor_id,
      ...result
    });
  } catch (error) {
    console.error('Error sending AI sponsor recommendations via SMS:', error);
    res.status(500).json({
      error: 'Failed to send sponsor recommendations via SMS',
      details: error.message
    });
  }
};

// Send complete personalized agenda via SMS
/**
 * @api {post} /events/:id/ai/agenda/sms Send personalized agenda via SMS
 * @apiParam {Number} contractor_id Contractor ID (request body)
 * @apiParam {Boolean} send_immediately Whether to send immediately (request body, not DB field)
 */
exports.sendPersonalizedAgendaSMS = async (req, res) => {
  try {
    const { id: event_id } = req.params;
    const { contractor_id, send_immediately = true } = req.body;  // API params, not DB fields

    if (!contractor_id) {
      return res.status(400).json({ error: 'contractor_id is required' });
    }

    const result = await eventAIOrchestrationService.sendPersonalizedAgenda(
      event_id,
      contractor_id,
      { send_immediately }
    );

    if (!result.success) {
      return res.status(400).json({
        error: result.error || 'Failed to send personalized agenda'
      });
    }

    res.json({
      success: true,
      event_id: event_id,
      contractor_id: contractor_id,
      ...result
    });
  } catch (error) {
    console.error('Error sending personalized agenda via SMS:', error);
    res.status(500).json({
      error: 'Failed to send personalized agenda via SMS',
      details: error.message
    });
  }
};

// Schedule AI recommendations for later
/**
 * @api {post} /events/:id/ai/schedule Schedule AI recommendations
 * @apiParam {Number} contractor_id Contractor ID (request body)
 * @apiParam {String} scheduled_time When to send (request body, not DB field)
 * @apiParam {Array} recommendation_types Types to send: ['speaker', 'sponsor'] (request body, not DB field)
 */
exports.scheduleAIRecommendations = async (req, res) => {
  try {
    const { id: event_id } = req.params;
    // API request parameters, not database fields
    const { contractor_id, scheduled_time, recommendation_types } = req.body;
    const types = recommendation_types || ['speaker', 'sponsor'];

    if (!contractor_id || !scheduled_time) {
      return res.status(400).json({
        error: 'contractor_id and scheduled_time are required'
      });
    }

    const result = await eventAIOrchestrationService.scheduleRecommendations(
      event_id,
      contractor_id,
      scheduled_time,
      types
    );

    if (!result.success) {
      return res.status(400).json({
        error: result.error || 'Failed to schedule recommendations'
      });
    }

    res.json({
      success: true,
      event_id: event_id,
      contractor_id: contractor_id,
      ...result
    });
  } catch (error) {
    console.error('Error scheduling AI recommendations:', error);
    res.status(500).json({
      error: 'Failed to schedule AI recommendations',
      details: error.message
    });
  }
};