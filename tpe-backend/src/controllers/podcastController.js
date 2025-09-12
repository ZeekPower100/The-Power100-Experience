const db = require('../config/database');

// Get all podcasts
exports.getAllPodcasts = async (req, res) => {
  try {
    const query = `
      SELECT * FROM podcasts 
      ORDER BY title ASC
    `;
    const result = await db.query(query);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching podcasts:', error);
    res.status(500).json({ error: 'Failed to fetch podcasts' });
  }
};

// Get pending podcasts
exports.getPendingPodcasts = async (req, res) => {
  try {
    const query = `
      SELECT * FROM podcasts 
      WHERE status = 'pending_review'
      ORDER BY created_at DESC
    `;
    const result = await db.query(query);
    res.json({ podcasts: result.rows });
  } catch (error) {
    console.error('Error fetching pending podcasts:', error);
    res.status(500).json({ error: 'Failed to fetch pending podcasts' });
  }
};

// Approve podcast
exports.approvePodcast = async (req, res) => {
  try {
    const { id } = req.params;
    const query = `
      UPDATE podcasts 
      SET status = 'approved'
      WHERE id = $1
      RETURNING *
    `;
    const result = await db.query(query, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Podcast not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error approving podcast:', error);
    res.status(500).json({ error: 'Failed to approve podcast' });
  }
};

// Get single podcast
exports.getPodcast = async (req, res) => {
  try {
    const { id } = req.params;
    const query = 'SELECT * FROM podcasts WHERE id = $1';
    const result = await db.query(query, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Podcast not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching podcast:', error);
    res.status(500).json({ error: 'Failed to fetch podcast' });
  }
};

// Create new podcast
exports.createPodcast = async (req, res) => {
  try {
    const {
      title,
      host,
      frequency,
      description,
      website,
      logo_url,
      focus_areas_covered,
      topics,
      target_audience,
      
      // New fields
      episode_count,
      average_episode_length,
      format,
      host_email,
      host_phone,
      host_linkedin,
      host_company,
      host_bio,
      spotify_url,
      apple_podcasts_url,
      youtube_url,
      other_platform_urls,
      accepts_guest_requests,
      guest_requirements,
      typical_guest_profile,
      booking_link,
      subscriber_count,
      download_average,
      notable_guests,
      testimonials,
      
      // Submitter fields
      submitter_name,
      submitter_email,
      submitter_phone,
      submitter_company,
      is_host,
      
      // Additional fields
      total_episodes,
      target_revenue,
      
      submission_type,
      status,
      
      is_active = true
    } = req.body;

    // Check which columns exist in the database
    const checkColumnsQuery = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'podcasts'
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
      title,
      host,
      frequency,
      description,
      website,
      logo_url,
      focus_areas_covered,
      topics,
      target_audience,
      is_active
    };

    // Add new fields if columns exist
    if (existingColumns.includes('episode_count')) fieldsToInsert.episode_count = episode_count;
    if (existingColumns.includes('average_episode_length')) fieldsToInsert.average_episode_length = average_episode_length;
    if (existingColumns.includes('format')) fieldsToInsert.format = format;
    if (existingColumns.includes('host_email')) fieldsToInsert.host_email = host_email;
    if (existingColumns.includes('host_phone')) fieldsToInsert.host_phone = host_phone;
    if (existingColumns.includes('host_linkedin')) fieldsToInsert.host_linkedin = host_linkedin;
    if (existingColumns.includes('host_company')) fieldsToInsert.host_company = host_company;
    if (existingColumns.includes('host_bio')) fieldsToInsert.host_bio = host_bio;
    if (existingColumns.includes('spotify_url')) fieldsToInsert.spotify_url = spotify_url;
    if (existingColumns.includes('apple_podcasts_url')) fieldsToInsert.apple_podcasts_url = apple_podcasts_url;
    if (existingColumns.includes('youtube_url')) fieldsToInsert.youtube_url = youtube_url;
    if (existingColumns.includes('other_platform_urls')) fieldsToInsert.other_platform_urls = other_platform_urls;
    if (existingColumns.includes('accepts_guest_requests')) fieldsToInsert.accepts_guest_requests = accepts_guest_requests;
    if (existingColumns.includes('guest_requirements')) fieldsToInsert.guest_requirements = guest_requirements;
    if (existingColumns.includes('typical_guest_profile')) fieldsToInsert.typical_guest_profile = typical_guest_profile;
    if (existingColumns.includes('booking_link')) fieldsToInsert.booking_link = booking_link;
    if (existingColumns.includes('subscriber_count')) fieldsToInsert.subscriber_count = subscriber_count;
    if (existingColumns.includes('download_average')) fieldsToInsert.download_average = download_average;
    if (existingColumns.includes('notable_guests')) fieldsToInsert.notable_guests = notable_guests;
    if (existingColumns.includes('testimonials')) fieldsToInsert.testimonials = testimonials;
    
    // Submitter fields
    if (existingColumns.includes('submitter_name')) fieldsToInsert.submitter_name = submitter_name;
    if (existingColumns.includes('submitter_email')) fieldsToInsert.submitter_email = submitter_email;
    if (existingColumns.includes('submitter_phone')) fieldsToInsert.submitter_phone = submitter_phone;
    if (existingColumns.includes('submitter_company')) fieldsToInsert.submitter_company = submitter_company;
    if (existingColumns.includes('is_host')) fieldsToInsert.is_host = is_host;
    
    // Additional fields
    if (existingColumns.includes('total_episodes')) fieldsToInsert.total_episodes = total_episodes;
    if (existingColumns.includes('target_revenue')) fieldsToInsert.target_revenue = target_revenue;
    
    if (existingColumns.includes('submission_type')) fieldsToInsert.submission_type = submission_type;
    if (existingColumns.includes('status')) fieldsToInsert.status = status;

    // Build the query dynamically
    for (const [key, value] of Object.entries(fieldsToInsert)) {
      if (value !== undefined && value !== null && value !== '') {
        fields.push(key);
        values.push(value);
        placeholders.push(`$${placeholderIndex++}`);
      }
    }

    if (fields.length === 0) {
      return res.status(400).json({ error: 'No valid fields to insert' });
    }

    const insertQuery = `
      INSERT INTO podcasts (${fields.join(', ')})
      VALUES (${placeholders.join(', ')})
      RETURNING *
    `;

    const result = await db.query(insertQuery, values);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating podcast:', error);
    res.status(500).json({ error: 'Failed to create podcast', details: error.message });
  }
};

// Update podcast
exports.updatePodcast = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Remove id from updates if present
    delete updates.id;

    // Check which columns exist in the database
    const checkColumnsQuery = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'podcasts'
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
      UPDATE podcasts
      SET ${setClause.join(', ')}
      WHERE id = $${placeholderIndex}
      RETURNING *
    `;

    const result = await db.query(updateQuery, values);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Podcast not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating podcast:', error);
    res.status(500).json({ error: 'Failed to update podcast', details: error.message });
  }
};

// Delete podcast
exports.deletePodcast = async (req, res) => {
  try {
    const { id } = req.params;
    
    const query = 'DELETE FROM podcasts WHERE id = $1 RETURNING id';
    const result = await db.query(query, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Podcast not found' });
    }
    
    res.json({ message: 'Podcast deleted successfully', id: result.rows[0].id });
  } catch (error) {
    console.error('Error deleting podcast:', error);
    res.status(500).json({ error: 'Failed to delete podcast' });
  }
};