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
      const { video_id } = req.body;

      // This would trigger the actual AI processing pipeline
      // For now, we'll return a placeholder response
      res.json({
        success: true,
        message: 'Video queued for analysis',
        data: {
          video_id,
          status: 'processing',
          estimated_time: '5-10 minutes'
        }
      });
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