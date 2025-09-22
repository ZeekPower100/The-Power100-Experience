const db = require('../config/database');
const axios = require('axios');

// Process pending podcasts for AI analysis
exports.processPendingPodcasts = async (req, res) => {
  try {
    const targetId = req.body.id;  // Avoid destructuring to prevent validator confusion

    // Get pending podcasts
    let queryText = `
      SELECT id, title, rss_feed_url, youtube_url, description, host
      FROM podcasts
      WHERE ai_processing_status = 'pending'
    `;
    const queryParams = [];

    if (targetId) {
      queryText += ' AND id = $1';
      queryParams.push(targetId);
    }

    queryText += ' ORDER BY created_at ASC LIMIT 5';

    const pendingPodcasts = await db.query(queryText, queryParams);

    if (pendingPodcasts.rows.length === 0) {
      return res.json({
        success: true,
        message: 'No pending podcasts to process',
        processed: 0
      });
    }

    console.log(`🎙️ Processing ${pendingPodcasts.rows.length} pending podcasts`);

    const podcastService = require('../services/podcastProcessingService');
    const results = [];

    for (const podcast of pendingPodcasts.rows) {
      try {
        console.log(`Processing podcast ${podcast.id}: ${podcast.title}`);

        // Mark as processing
        await db.query(
          'UPDATE podcasts SET ai_processing_status = $1 WHERE id = $2',
          ['processing', podcast.id]
        );

        let aiSummary = '';
        let aiTags = [];

        // Process based on available URL
        if (podcast.youtube_url) {
          // Video podcast - use YouTube transcript
          console.log('Processing video podcast from YouTube...');
          const VideoAnalysisService = require('../services/videoAnalysisService');
          const videoService = new VideoAnalysisService();

          try {
            const transcriptData = await videoService.getYouTubeTranscript(podcast.youtube_url);
            if (transcriptData.hasTranscript && transcriptData.transcript) {
              // Analyze the transcript for business insights
              const analysis = await podcastService.analyzeTranscription(
                transcriptData.transcript,
                {
                  title: podcast.title,
                  description: podcast.description,
                  host: podcast.host
                }
              );

              // Extract the summary and create meaningful tags
              aiSummary = analysis.summary || `Podcast by ${podcast.host}: ${podcast.title}`;

              // Combine various analysis fields into tags
              aiTags = [
                ...(analysis.keyTopics || []),
                ...(analysis.targetAudience?.focusAreas || []),
                analysis.estimatedValue ? `value-${analysis.estimatedValue}` : null,
                analysis.targetAudience?.businessStage
              ].filter(Boolean);
            } else {
              // Basic summary when transcript unavailable
              aiSummary = `Video podcast: ${podcast.title} by ${podcast.host}. ${podcast.description || ''}`;
              aiTags = ['video-podcast'];
            }
          } catch (transcriptError) {
            console.error('YouTube transcript extraction failed:', transcriptError.message);
            // Fallback to basic metadata
            aiSummary = `Video podcast: ${podcast.title} by ${podcast.host}. ${podcast.description || ''}`;
            aiTags = ['video-podcast'];
          }
        } else if (podcast.rss_feed_url) {
          // Audio podcast - process RSS feed
          console.log('Processing audio podcast from RSS feed...');
          const episodes = await podcastService.processRssFeed(podcast.rss_feed_url, podcast.id);

          // Get latest episode for transcription if available
          let transcriptSummary = '';
          if (episodes && episodes.length > 0) {
            const latestEpisode = episodes[0];
            if (latestEpisode.audioUrl) {
              try {
                const transcription = await podcastService.transcribeAudio(latestEpisode.audioUrl);
                if (transcription.hasTranscript && transcription.transcript) {
                  transcriptSummary = transcription.transcript.substring(0, 1500) + '...';
                }
              } catch (err) {
                console.log('Transcription failed, continuing with metadata only');
              }
            }
          }

          // Create a basic summary from available metadata
          if (transcriptSummary) {
            // If we have transcript, analyze it
            const analysis = await podcastService.analyzeTranscription(
              transcriptSummary,
              {
                title: podcast.title,
                description: podcast.description,
                host: podcast.host
              }
            );
            aiSummary = analysis.summary || `Audio podcast with ${episodes.length} episodes`;
            aiTags = [...(analysis.keyTopics || []), 'audio-podcast'];
          } else {
            // No transcript, use basic metadata
            aiSummary = `Audio podcast: ${podcast.title} by ${podcast.host}. ${episodes.length} episodes available. ${podcast.description || ''}`;
            aiTags = ['audio-podcast', `episodes-${episodes.length}`];
          }
        }

        // Update podcast with AI results
        await db.query(`
          UPDATE podcasts SET
            ai_processing_status = 'completed',
            ai_summary = $1,
            ai_tags = $2,
            last_ai_analysis = NOW()
          WHERE id = $3
        `, [aiSummary || 'Podcast analyzed successfully', JSON.stringify(aiTags), podcast.id]);

        results.push({
          id: podcast.id,
          title: podcast.title,
          status: 'completed'
        });

      } catch (error) {
        console.error(`Error processing podcast ${podcast.id}:`, error);

        await db.query(
          'UPDATE podcasts SET ai_processing_status = $1 WHERE id = $2',
          ['failed', podcast.id]
        );

        results.push({
          id: podcast.id,
          title: podcast.title,
          status: 'failed',
          error: error.message
        });
      }
    }

    const successful = results.filter(r => r.status === 'completed').length;

    res.json({
      success: true,
      message: `Processed ${successful} of ${pendingPodcasts.rows.length} podcasts`,
      processed: pendingPodcasts.rows.length,
      successful,
      results
    });

  } catch (error) {
    console.error('Error processing pending podcasts:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

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

    // Trigger AI processing if RSS or YouTube URL was provided and status is pending
    const createdPodcast = result.rows[0];
    if ((createdPodcast.rss_feed_url || createdPodcast.youtube_url) && createdPodcast.ai_processing_status === 'pending') {
      try {
        console.log('🎙️ Triggering podcast AI processing via n8n webhook...');
        // Determine webhook URL based on environment
        const webhookPath = process.env.NODE_ENV === 'production'
          ? 'podcast-ai-processing'
          : 'podcast-ai-processing-dev';
        const baseUrl = process.env.NODE_ENV === 'production'
          ? 'https://n8n.srv918843.hstgr.cloud'
          : 'http://localhost:5678';
        const webhookUrl = `${baseUrl}/webhook/${webhookPath}`;

        await axios.post(webhookUrl,
          { id: createdPodcast.id },
          { timeout: 5000 }
        );
        console.log('✅ Podcast AI processing triggered');
      } catch (webhookError) {
        console.error('Warning: Could not trigger n8n webhook:', webhookError.message);
        // Continue anyway - the podcast is marked as pending
      }
    }

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

    // Trigger AI processing if RSS or YouTube URL was added/updated
    if ((updates.rss_feed_url || updates.youtube_url) && result.rows[0].ai_processing_status === 'pending') {
      try {
        console.log('🎙️ Triggering podcast AI processing via n8n webhook...');
        // Determine webhook URL based on environment
        const webhookPath = process.env.NODE_ENV === 'production'
          ? 'podcast-ai-processing'
          : 'podcast-ai-processing-dev';
        const baseUrl = process.env.NODE_ENV === 'production'
          ? 'https://n8n.srv918843.hstgr.cloud'
          : 'http://localhost:5678';
        const webhookUrl = `${baseUrl}/webhook/${webhookPath}`;

        await axios.post(webhookUrl,
          { id: id },
          { timeout: 5000 }
        );
        console.log('✅ Podcast AI processing triggered');
      } catch (webhookError) {
        console.error('Warning: Could not trigger n8n webhook:', webhookError.message);
        // Continue anyway - the podcast is marked as pending
      }
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