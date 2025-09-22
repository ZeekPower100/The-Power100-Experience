const VideoAnalysis = require('../models/videoAnalysis');

const videoAnalysisController = {
  // Create new video analysis
  async create(req, res) {
    try {
      const analysis = await VideoAnalysis.create(req.body);
      res.status(201).json({
        success: true,
        data: analysis
      });
    } catch (error) {
      console.error('Error creating video analysis:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  // Get analysis by ID
  async getById(req, res) {
    try {
      const analysis = await VideoAnalysis.findById(req.params.id);
      if (!analysis) {
        return res.status(404).json({
          success: false,
          error: 'Analysis not found'
        });
      }
      res.json({
        success: true,
        data: analysis
      });
    } catch (error) {
      console.error('Error fetching analysis:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  // Get analysis by video ID
  async getByVideoId(req, res) {
    try {
      const analyses = await VideoAnalysis.findByVideoId(req.params.videoId);
      res.json({
        success: true,
        data: analyses,
        count: analyses.length
      });
    } catch (error) {
      console.error('Error fetching analysis by video:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  // Get analyses by type
  async getByType(req, res) {
    try {
      const analyses = await VideoAnalysis.findByType(req.params.type);
      res.json({
        success: true,
        data: analyses,
        count: analyses.length
      });
    } catch (error) {
      console.error('Error fetching analyses by type:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  // Update analysis
  async update(req, res) {
    try {
      const analysis = await VideoAnalysis.update(req.params.id, req.body);
      if (!analysis) {
        return res.status(404).json({
          success: false,
          error: 'Analysis not found'
        });
      }
      res.json({
        success: true,
        data: analysis
      });
    } catch (error) {
      console.error('Error updating analysis:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  // Delete analysis
  async delete(req, res) {
    try {
      const analysis = await VideoAnalysis.delete(req.params.id);
      if (!analysis) {
        return res.status(404).json({
          success: false,
          error: 'Analysis not found'
        });
      }
      res.json({
        success: true,
        data: analysis,
        message: 'Analysis deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting analysis:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  // Get high quality demos
  async getHighQualityDemos(req, res) {
    try {
      const minScore = parseFloat(req.query.min_score) || 0.8;
      const demos = await VideoAnalysis.getHighQualityDemos(minScore);
      res.json({
        success: true,
        data: demos,
        count: demos.length,
        min_score: minScore
      });
    } catch (error) {
      console.error('Error fetching high quality demos:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  // Get authentic testimonials
  async getAuthenticTestimonials(req, res) {
    try {
      const minScore = parseFloat(req.query.min_score) || 0.8;
      const testimonials = await VideoAnalysis.getAuthenticTestimonials(minScore);
      res.json({
        success: true,
        data: testimonials,
        count: testimonials.length,
        min_score: minScore
      });
    } catch (error) {
      console.error('Error fetching authentic testimonials:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  // Get analysis statistics
  async getStats(req, res) {
    try {
      const stats = await VideoAnalysis.getAnalysisStats();
      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Error fetching analysis stats:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  // Process video for analysis (trigger analysis pipeline)
  async processVideo(req, res) {
    try {
      const { video_url, partner_id, analysis_type = 'demo_analysis' } = req.body;

      if (!video_url) {
        return res.status(400).json({
          success: false,
          error: 'Video URL is required'
        });
      }

      // Import the video analysis service
      const VideoAnalysisService = require('../services/videoAnalysisService');
      const videoService = new VideoAnalysisService();

      // Get partner info if provided
      let partnerInfo = {};
      if (partner_id) {
        const { query } = require('../config/database');
        const { safeJsonParse } = require('../utils/jsonHelpers');

        const partnerResult = await query(
          'SELECT company_name, capabilities, focus_areas_served FROM partners WHERE id = $1',
          [partner_id]
        );

        if (partnerResult.rows.length > 0) {
          const partner = partnerResult.rows[0];
          partnerInfo = {
            company_name: partner.company_name,
            capabilities: safeJsonParse(partner.capabilities, []),
            focus_areas: safeJsonParse(partner.focus_areas_served, [])
          };
        }
      }

      // Perform the analysis
      const analysisResult = await videoService.analyzePartnerDemoVideo(video_url, partnerInfo);

      if (analysisResult.success) {
        // First, create or find video_content record
        const { query } = require('../config/database');

        // Check if video already exists
        let videoResult = await query(
          'SELECT id FROM video_content WHERE file_url = $1',
          [video_url]
        );

        let videoId;
        if (videoResult.rows.length === 0) {
          // Create new video_content record
          const insertResult = await query(`
            INSERT INTO video_content (
              entity_type, entity_id, video_type, title, file_url, thumbnail_url
            ) VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id
          `, [
            'partner',
            partner_id || 0,
            'demo',
            'Partner Demo Video',
            video_url,
            analysisResult.metadata?.thumbnailUrl || ''
          ]);
          videoId = insertResult.rows[0].id;
        } else {
          videoId = videoResult.rows[0].id;
        }

        // Store in video_analysis table
        const analysisData = {
          video_id: videoId,
          analysis_type: analysis_type,
          transcript: analysisResult.hasTranscript ? analysisResult.analysis?.transcript || '' : '',
          transcript_confidence: analysisResult.hasTranscript ? 0.9 : 0,
          visual_quality_score: (analysisResult.insights?.quality_score || 0) / 100,
          demo_structure_score: (analysisResult.analysis?.demo_quality_score || 0) / 100,
          value_prop_clarity: (analysisResult.analysis?.value_proposition_strength || 0) / 100,
          feature_coverage: (analysisResult.analysis?.feature_coverage || 0) / 100,
          key_talking_points: analysisResult.insights?.key_features || [],
          unique_value_props: analysisResult.insights?.strengths || [],
          use_cases_mentioned: analysisResult.insights?.focus_areas || [],
          frames_analyzed: analysisResult.frameCount || 0,
          ai_models_used: analysisResult.hasTranscript ? ['gpt-4o', 'whisper-1'] : ['gpt-4o'],
          analysis_date: new Date()
        };

        const createdAnalysis = await VideoAnalysis.create(analysisData);

        // Update partner record if partner_id provided
        if (partner_id) {
          const { query } = require('../config/database');
          const { safeJsonStringify } = require('../utils/jsonHelpers');

          await query(`
            UPDATE partners
            SET
              demo_video_url = $1,
              demo_analysis = $2,
              demo_quality_score = $3,
              updated_at = CURRENT_TIMESTAMP
            WHERE id = $4
          `, [
            video_url,
            safeJsonStringify(analysisResult),
            Math.round(analysisResult.insights?.quality_score || 0),
            partner_id
          ]);
        }

        res.json({
          success: true,
          message: 'Video analyzed successfully',
          data: {
            analysis_id: createdAnalysis.id,
            video_url,
            quality_score: analysisResult.insights?.quality_score,
            insights: analysisResult.insights,
            analysis: createdAnalysis
          }
        });
      } else {
        res.status(500).json({
          success: false,
          error: analysisResult.error || 'Analysis failed',
          video_url
        });
      }
    } catch (error) {
      console.error('Error processing video:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  // Process all pending videos
  async processPendingVideos(req, res) {
    try {
      const { partner_id } = req.body;
      const { query } = require('../config/database');

      // Get pending videos (optionally filtered by partner)
      let queryText = `
        SELECT vc.*, p.company_name, p.capabilities
        FROM video_content vc
        LEFT JOIN partners p ON (vc.entity_type = 'partner' AND vc.entity_id = p.id)
        WHERE vc.ai_processing_status = 'pending'
      `;
      const queryParams = [];

      if (partner_id) {
        queryText += ' AND vc.entity_id = $1 AND vc.entity_type = \'partner\'';
        queryParams.push(partner_id);
      }

      queryText += ' ORDER BY vc.created_at ASC LIMIT 5'; // Process max 5 at a time

      const pendingVideos = await query(queryText, queryParams);

      if (pendingVideos.rows.length === 0) {
        return res.json({
          success: true,
          message: 'No pending videos to process',
          processed: 0
        });
      }

      console.log(`📹 Processing ${pendingVideos.rows.length} pending videos`);

      const VideoAnalysisService = require('../services/videoAnalysisService');
      const videoService = new VideoAnalysisService();
      const { safeJsonParse, safeJsonStringify } = require('../utils/jsonHelpers');

      const results = [];

      for (const video of pendingVideos.rows) {
        try {
          console.log(`Processing video ${video.id}: ${video.file_url}`);

          // Mark as processing
          await query(
            'UPDATE video_content SET ai_processing_status = $1 WHERE id = $2',
            ['processing', video.id]
          );

          // Prepare partner info
          const partnerInfo = video.company_name ? {
            company_name: video.company_name,
            capabilities: safeJsonParse(video.capabilities, [])
          } : {};

          // Analyze the video
          const analysisResult = await videoService.analyzePartnerDemoVideo(
            video.file_url,
            partnerInfo
          );

          if (analysisResult.success) {
            // Update video_content with results
            await query(`
              UPDATE video_content SET
                ai_processing_status = 'completed',
                ai_summary = $1,
                ai_insights = $2,
                ai_engagement_score = $3,
                last_ai_analysis = NOW(),
                updated_at = NOW()
              WHERE id = $4
            `, [
              analysisResult.insights?.scoring_reasoning || 'Analysis complete',
              safeJsonStringify(analysisResult.insights || {}),
              analysisResult.insights?.quality_score || 0,
              video.id
            ]);

            // Update partner if applicable
            if (video.entity_type === 'partner' && video.entity_id) {
              await query(`
                UPDATE partners SET
                  demo_quality_score = $1,
                  demo_analysis = $2,
                  updated_at = NOW()
                WHERE id = $3
              `, [
                Math.round(analysisResult.insights?.quality_score || 0),
                safeJsonStringify(analysisResult),
                video.entity_id
              ]);
            }

            results.push({
              video_id: video.id,
              url: video.file_url,
              status: 'completed',
              quality_score: analysisResult.insights?.quality_score
            });
          } else {
            // Mark as failed
            await query(
              'UPDATE video_content SET ai_processing_status = $1, updated_at = NOW() WHERE id = $2',
              ['failed', video.id]
            );

            results.push({
              video_id: video.id,
              url: video.file_url,
              status: 'failed',
              error: analysisResult.error
            });
          }
        } catch (error) {
          console.error(`Error processing video ${video.id}:`, error);

          await query(
            'UPDATE video_content SET ai_processing_status = $1, updated_at = NOW() WHERE id = $2',
            ['failed', video.id]
          );

          results.push({
            video_id: video.id,
            url: video.file_url,
            status: 'failed',
            error: error.message
          });
        }
      }

      const successful = results.filter(r => r.status === 'completed').length;

      res.json({
        success: true,
        message: `Processed ${successful} of ${pendingVideos.rows.length} videos`,
        processed: pendingVideos.rows.length,
        successful,
        results
      });

    } catch (error) {
      console.error('Error processing pending videos:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
};

module.exports = videoAnalysisController;