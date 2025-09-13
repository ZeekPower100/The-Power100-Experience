const { safeJsonParse, safeJsonStringify } = require('../utils/jsonHelpers');

const db = require('../config/database');

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
    res.status(201).json(result.rows[0]);
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
    
    res.json(result.rows[0]);
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