const express = require('express');
const router = express.Router();
const podcastEpisodesController = require('../controllers/podcastEpisodesController');
const { flexibleProtect: authenticateToken } = require('../middleware/flexibleAuth');
const podcastProcessingService = require('../services/podcastProcessingService');
const { query } = require('../config/database');
const { AppError } = require('../middleware/errorHandler');

// All routes require authentication
router.use(authenticateToken);

// ========== SPECIFIC ROUTES FIRST (before parametric routes) ==========

// GET /recent - get recent episodes
router.get('/recent', podcastEpisodesController.getRecent);

// GET /high-relevance - get high relevance episodes (moved here from below)
router.get('/high-relevance', async (req, res, next) => {
  try {
    const { min_score = 0.7, limit = 10 } = req.query;

    const episodes = await query(`
      SELECT
        pe.id,
        pe.title,
        pe.audio_url,
        et.ai_summary,
        et.contractor_relevance_score,
        et.practical_value_score,
        ps.name as show_name
      FROM episode_transcripts et
      JOIN podcast_episodes pe ON et.episode_id = pe.id
      JOIN podcast_shows ps ON pe.show_id = ps.id
      WHERE et.contractor_relevance_score >= $1
      ORDER BY et.contractor_relevance_score DESC
      LIMIT $2
    `, [parseFloat(min_score), parseInt(limit)]);

    res.json({
      success: true,
      min_score,
      count: episodes.rows.length,
      episodes: episodes.rows
    });

  } catch (error) {
    next(error);
  }
});

// GET /search/transcripts - search transcripts
router.get('/search/transcripts', async (req, res, next) => {
  try {
    const { q, limit = 20 } = req.query;

    if (!q) {
      throw new AppError('Search query (q) is required', 400);
    }

    const results = await podcastProcessingService.searchTranscripts(q, limit);

    res.json({
      success: true,
      query: q,
      count: results.length,
      results
    });

  } catch (error) {
    next(error);
  }
});

// GET /transcript-status/:status - get by transcript status
router.get('/transcript-status/:status', async (req, res, next) => {
  try {
    const { status } = req.params;
    const validStatuses = ['pending', 'processing', 'completed', 'failed'];

    if (!validStatuses.includes(status)) {
      throw new AppError('Invalid status. Must be: pending, processing, completed, or failed', 400);
    }

    const episodes = await query(`
      SELECT
        pe.id,
        pe.title,
        pe.audio_url,
        pe.show_id,
        pe.transcript_status,
        pe.created_at,
        ps.name as show_name
      FROM podcast_episodes pe
      LEFT JOIN podcast_shows ps ON pe.show_id = ps.id
      WHERE pe.transcript_status = $1
      ORDER BY pe.created_at DESC
    `, [status]);

    res.json({
      success: true,
      status,
      count: episodes.rows.length,
      episodes: episodes.rows
    });

  } catch (error) {
    next(error);
  }
});

// POST /process - process single episode
router.post('/process', async (req, res, next) => {
  try {
    const { audio_url, show_id, metadata } = req.body;

    if (!audio_url || !show_id) {
      throw new AppError('audio_url and show_id are required', 400);
    }

    // Check if show exists
    const showExists = await query(
      'SELECT id FROM podcast_shows WHERE id = $1',
      [show_id]
    );

    if (showExists.rows.length === 0) {
      throw new AppError('Podcast show not found', 404);
    }

    // Process the episode
    const result = await podcastProcessingService.processEpisodeFromUrl({
      episodeUrl: audio_url,
      podcastId: show_id,
      metadata: metadata || {}
    });

    res.json({
      success: true,
      message: 'Episode processing started',
      data: result
    });

  } catch (error) {
    next(error);
  }
});

// POST /process-feed - process RSS feed
router.post('/process-feed', async (req, res, next) => {
  try {
    const { rss_feed_url, show_id } = req.body;

    if (!rss_feed_url || !show_id) {
      throw new AppError('rss_feed_url and show_id are required', 400);
    }

    // Process the RSS feed
    const result = await podcastProcessingService.processRssFeed(
      rss_feed_url,
      show_id
    );

    res.json({
      success: true,
      message: `Processed ${result.newEpisodesProcessed} new episodes`,
      data: result
    });

  } catch (error) {
    next(error);
  }
});

// POST /bulk-process - bulk process episodes
router.post('/bulk-process', async (req, res, next) => {
  try {
    const { episodes } = req.body;

    if (!Array.isArray(episodes) || episodes.length === 0) {
      throw new AppError('Episodes array is required', 400);
    }

    const results = [];
    const errors = [];

    for (const episode of episodes) {
      try {
        const result = await podcastProcessingService.processEpisodeFromUrl({
          episodeUrl: episode.audio_url,
          podcastId: episode.show_id,
          metadata: episode.metadata || {}
        });
        results.push({
          audio_url: episode.audio_url,
          success: true,
          result
        });
      } catch (error) {
        errors.push({
          audio_url: episode.audio_url,
          success: false,
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      processed: results.length,
      failed: errors.length,
      results,
      errors
    });

  } catch (error) {
    next(error);
  }
});

// ========== PARAMETRIC ROUTES (must be after specific routes) ==========

// GET /show/:showId - get episodes by show
router.get('/show/:showId', podcastEpisodesController.getByShowId);

// GET /guest/:guestName - get by guest
router.get('/guest/:guestName', podcastEpisodesController.getByGuest);

// GET /:episode_id/transcript - get episode transcript
router.get('/:episode_id/transcript', async (req, res, next) => {
  try {
    const { episode_id } = req.params;

    const transcript = await query(`
      SELECT
        et.*,
        pe.title as episode_title,
        ps.name as show_name
      FROM episode_transcripts et
      JOIN podcast_episodes pe ON et.episode_id = pe.id
      JOIN podcast_shows ps ON pe.show_id = ps.id
      WHERE et.episode_id = $1
    `, [episode_id]);

    if (transcript.rows.length === 0) {
      throw new AppError('Transcript not found for this episode', 404);
    }

    res.json({
      success: true,
      transcript: transcript.rows[0]
    });

  } catch (error) {
    next(error);
  }
});

// POST / - create episode
router.post('/', podcastEpisodesController.create);

// GET /:id - get episode by id
router.get('/:id', podcastEpisodesController.getById);

// PUT /:id - update episode
router.put('/:id', podcastEpisodesController.update);

// DELETE /:id - delete episode
router.delete('/:id', podcastEpisodesController.delete);

module.exports = router;