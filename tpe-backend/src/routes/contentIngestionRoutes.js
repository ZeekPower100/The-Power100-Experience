// DATABASE-CHECKED: video_content, podcast_episodes, shows columns verified on 2026-02-18
// ================================================================
// Content Ingestion Routes
// ================================================================
// Purpose: API endpoints for the video content ingestion pipeline.
//          Accepts YouTube URLs, fetches metadata, inserts into DB,
//          triggers AI enrichment, and fires n8n webhook on completion.
//
// Auth: API key (n8n and internal services)
// ================================================================

const express = require('express');
const router = express.Router();
const axios = require('axios');
const { apiKeyOnly } = require('../middleware/flexibleAuth');
const { query } = require('../config/database');
const { safeJsonStringify } = require('../utils/jsonHelpers');

// Services
const youtubeService = require('../services/youtubeMetadataService');
const contentIngestion = require('../services/contentIngestionService');
const enrichmentService = require('../services/showEpisodeEnrichmentService');

const N8N_WEBHOOK_BASE = process.env.N8N_WEBHOOK_BASE || 'https://n8n.srv918843.hstgr.cloud';
const N8N_ENV = process.env.NODE_ENV === 'production' ? '' : '-dev';

/**
 * POST /api/content/ingest
 * Full pipeline: YouTube URL → metadata → DB insert → transcript → AI enrichment → n8n webhook
 *
 * Body: {
 *   youtubeUrl: string (required),
 *   showId: number (required — maps to shows.id),
 *   episodeNumber: number (optional — auto-increments if not provided),
 *   featuredNames: string[] (optional),
 *   skipEnrichment: boolean (optional — skip AI enrichment, default false)
 * }
 */
router.post('/ingest', apiKeyOnly, async (req, res) => {
  const { youtubeUrl, showId, episodeNumber, featuredNames, skipEnrichment = false } = req.body;

  if (!youtubeUrl || !showId) {
    return res.status(400).json({
      success: false,
      error: 'youtubeUrl and showId are required'
    });
  }

  console.log(`[Content Ingestion API] Starting ingestion: ${youtubeUrl} → show ${showId}`);

  try {
    // Step 1: Validate show exists
    const showResult = await query(
      'SELECT id, name, slug, wp_term_slug, hosts, format FROM shows WHERE id = $1 AND is_active = true',
      [showId]
    );

    if (showResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: `Show ID ${showId} not found or inactive` });
    }

    const show = showResult.rows[0];

    // Step 2: Extract video ID
    const videoId = youtubeService.extractVideoId(youtubeUrl);
    if (!videoId) {
      return res.status(400).json({ success: false, error: 'Could not extract YouTube video ID from URL' });
    }

    // Step 3: Check for duplicate (already ingested)
    const existingResult = await query(
      "SELECT id FROM video_content WHERE file_url LIKE $1",
      [`%${videoId}%`]
    );

    if (existingResult.rows.length > 0) {
      return res.status(409).json({
        success: false,
        error: 'This video has already been ingested',
        existingId: existingResult.rows[0].id
      });
    }

    // Step 4: Fetch YouTube metadata
    console.log('[Content Ingestion API] Fetching YouTube metadata...');
    const metadata = await youtubeService.fetchYouTubeMetadata(videoId);

    // Step 5: Determine episode number
    let epNumber = episodeNumber;
    if (!epNumber) {
      const countResult = await query(
        'SELECT COALESCE(MAX(episode_number), 0) + 1 as next_ep FROM video_content WHERE show_id = $1',
        [showId]
      );
      epNumber = countResult.rows[0].next_ep;
    }

    // Step 6: Ingest into video_content + podcast_episodes
    console.log('[Content Ingestion API] Inserting into database...');
    const ingestionResult = await contentIngestion.ingestShowEpisode({
      showId,
      title: metadata.title,
      description: metadata.description,
      episodeNumber: epNumber,
      featuredNames: featuredNames || [],
      videoUrl: youtubeUrl,
      audioUrl: null,
      durationSeconds: metadata.durationSeconds,
      publishDate: metadata.publishDate
    });

    if (!ingestionResult.success) {
      return res.status(500).json({ success: false, error: 'Database ingestion failed', details: ingestionResult.error });
    }

    const videoContentId = ingestionResult.videoId;

    // Step 7: Update thumbnail
    await query(
      'UPDATE video_content SET thumbnail_url = $2, upload_date = $3 WHERE id = $1',
      [videoContentId, metadata.thumbnailUrl, metadata.publishDate]
    );

    // Respond immediately (enrichment runs async)
    const responsePayload = {
      success: true,
      videoContentId,
      videoId,
      showId,
      showName: show.name,
      episodeNumber: epNumber,
      title: metadata.title,
      durationFormatted: metadata.durationFormatted,
      thumbnailUrl: metadata.thumbnailUrl,
      enrichmentStatus: skipEnrichment ? 'skipped' : 'started'
    };

    res.status(201).json(responsePayload);

    // Step 8: AI Enrichment (async — runs after response is sent)
    if (!skipEnrichment) {
      console.log('[Content Ingestion API] Starting async AI enrichment...');
      try {
        const enrichmentResult = await enrichmentService.enrichShowEpisode({
          videoContentId,
          youtubeUrl,
          metadata: {
            title: metadata.title,
            description: metadata.description,
            showId,
            showName: show.name,
            hosts: show.hosts,
            episodeNumber: epNumber,
            durationFormatted: metadata.durationFormatted
          }
        });

        if (enrichmentResult.success) {
          console.log('[Content Ingestion API] AI enrichment complete — firing n8n webhook');

          // Step 9: Fire video-analysis-complete webhook to n8n
          await fireCompletionWebhook({
            videoContentId,
            videoId,
            show,
            episodeNumber: epNumber,
            metadata,
            enrichment: enrichmentResult.enrichment
          });
        } else {
          console.error('[Content Ingestion API] AI enrichment failed:', enrichmentResult.error);
        }
      } catch (enrichError) {
        console.error('[Content Ingestion API] Enrichment error:', enrichError.message);
      }
    }

  } catch (error) {
    console.error('[Content Ingestion API] Pipeline error:', error.message);

    // Only send error if headers haven't been sent (response not yet returned)
    if (!res.headersSent) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }
});

/**
 * POST /api/content/ingest/batch
 * Ingest multiple YouTube URLs for the same show
 *
 * Body: {
 *   showId: number (required),
 *   videos: [{ youtubeUrl: string, episodeNumber?: number, featuredNames?: string[] }]
 * }
 */
router.post('/ingest/batch', apiKeyOnly, async (req, res) => {
  const { showId, videos } = req.body;

  if (!showId || !videos || !Array.isArray(videos) || videos.length === 0) {
    return res.status(400).json({ success: false, error: 'showId and videos array are required' });
  }

  console.log(`[Content Ingestion API] Batch ingestion: ${videos.length} videos for show ${showId}`);

  const results = [];
  for (const video of videos) {
    try {
      const videoId = youtubeService.extractVideoId(video.youtubeUrl);
      if (!videoId) {
        results.push({ youtubeUrl: video.youtubeUrl, success: false, error: 'Invalid YouTube URL' });
        continue;
      }

      // Check duplicate
      const existing = await query("SELECT id FROM video_content WHERE file_url LIKE $1", [`%${videoId}%`]);
      if (existing.rows.length > 0) {
        results.push({ youtubeUrl: video.youtubeUrl, success: false, error: 'Already ingested', existingId: existing.rows[0].id });
        continue;
      }

      // Fetch metadata
      const metadata = await youtubeService.fetchYouTubeMetadata(videoId);

      // Determine episode number
      let epNumber = video.episodeNumber;
      if (!epNumber) {
        const countResult = await query(
          'SELECT COALESCE(MAX(episode_number), 0) + 1 as next_ep FROM video_content WHERE show_id = $1',
          [showId]
        );
        epNumber = countResult.rows[0].next_ep;
      }

      // Ingest
      const ingestionResult = await contentIngestion.ingestShowEpisode({
        showId,
        title: metadata.title,
        description: metadata.description,
        episodeNumber: epNumber,
        featuredNames: video.featuredNames || [],
        videoUrl: video.youtubeUrl,
        audioUrl: null,
        durationSeconds: metadata.durationSeconds,
        publishDate: metadata.publishDate
      });

      if (ingestionResult.success) {
        // Update thumbnail
        await query(
          'UPDATE video_content SET thumbnail_url = $2, upload_date = $3 WHERE id = $1',
          [ingestionResult.videoId, metadata.thumbnailUrl, metadata.publishDate]
        );
      }

      results.push({
        youtubeUrl: video.youtubeUrl,
        success: ingestionResult.success,
        videoContentId: ingestionResult.videoId,
        title: metadata.title,
        episodeNumber: epNumber
      });

    } catch (error) {
      results.push({ youtubeUrl: video.youtubeUrl, success: false, error: error.message });
    }
  }

  const successCount = results.filter(r => r.success).length;
  console.log(`[Content Ingestion API] Batch complete: ${successCount}/${videos.length} succeeded`);

  res.json({
    success: true,
    total: videos.length,
    succeeded: successCount,
    failed: videos.length - successCount,
    results
  });
});

/**
 * POST /api/content/enrich/:id
 * Manually trigger AI enrichment for an existing video_content row
 */
router.post('/enrich/:id', apiKeyOnly, async (req, res) => {
  const videoContentId = parseInt(req.params.id);

  try {
    const result = await enrichmentService.reEnrichEpisode(videoContentId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/content/pipeline-status
 * Check the status of all content in the pipeline
 */
router.get('/pipeline-status', apiKeyOnly, async (req, res) => {
  try {
    const statusResult = await query(`
      SELECT
        ai_processing_status,
        COUNT(*) as count
      FROM video_content
      WHERE show_id IS NOT NULL
      GROUP BY ai_processing_status
      ORDER BY count DESC
    `);

    const showStats = await query(`
      SELECT s.id, s.name, s.slug, s.wp_term_slug, s.episode_count,
        COUNT(vc.id) as actual_videos,
        COUNT(CASE WHEN vc.ai_processing_status = 'enriched' THEN 1 END) as enriched_count
      FROM shows s
      LEFT JOIN video_content vc ON s.id = vc.show_id
      WHERE s.is_active = true
      GROUP BY s.id
      ORDER BY s.id
    `);

    res.json({
      success: true,
      processingStatus: statusResult.rows,
      shows: showStats.rows
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Fire the video-analysis-complete webhook to n8n
 * Payload field names aligned with WordPress IC REST API (/wp-json/ic/v1/content)
 * so n8n can passthrough with minimal transformation.
 *
 * WordPress expects: title, video_url, youtube_id, show_slug, pillar_slug,
 *   duration, recording_date, speakers[], timestamps[], takeaways[],
 *   tags[], thumbnail_url, tpx_video_id
 */
async function fireCompletionWebhook({ videoContentId, videoId, show, episodeNumber, metadata, enrichment }) {
  const webhookUrl = `${N8N_WEBHOOK_BASE}/webhook/video-analysis-complete${N8N_ENV}`;

  // Convert pillar name to slug (WordPress taxonomy expects lowercase slug)
  const pillarSlug = (enrichment.insights?.pillar || 'growth').toLowerCase().replace(/\s+/g, '-');

  const payload = {
    // WordPress ic_content fields (aligned with WP REST API field names)
    title: metadata.title,
    video_url: `https://www.youtube.com/watch?v=${videoId}`,
    youtube_id: videoId,
    show_slug: show.wp_term_slug || show.slug,
    pillar_slug: pillarSlug,
    episode_number: episodeNumber,
    duration: metadata.durationFormatted,
    duration_seconds: metadata.durationSeconds,
    recording_date: metadata.publishDate,
    thumbnail_url: metadata.thumbnailUrl,
    description: metadata.description,
    excerpt: enrichment.excerpt || '',
    summary: enrichment.summary || '',

    // Arrays for ACF repeater fields
    speakers: enrichment.insights?.speakers || [],
    timestamps: enrichment.insights?.chapters || [],
    takeaways: enrichment.insights?.key_takeaways || [],
    tags: enrichment.insights?.tags || [],

    // TPX cross-reference IDs (stored as WP post meta)
    tpx_video_id: videoContentId,
    tpx_show_id: show.id,

    // Additional context for n8n (not consumed by WP directly)
    target_audience: enrichment.insights?.target_audience || {},
    content_value_score: enrichment.insights?.content_value_score || 0,
    enriched_at: new Date().toISOString(),
    source: 'tpx-content-pipeline'
  };

  try {
    console.log(`[Content Ingestion API] Firing webhook: ${webhookUrl}`);
    await axios.post(webhookUrl, payload, { timeout: 10000 });
    console.log('[Content Ingestion API] n8n webhook fired successfully');
  } catch (error) {
    console.error('[Content Ingestion API] n8n webhook failed:', error.message);
    // Don't throw — webhook failure shouldn't fail the whole pipeline
  }
}

module.exports = router;
