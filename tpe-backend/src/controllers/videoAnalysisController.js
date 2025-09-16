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
          ai_models_used: ['gpt-4o', 'whisper-1'],
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
  }
};

module.exports = videoAnalysisController;