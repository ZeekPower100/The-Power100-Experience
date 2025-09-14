const VideoPerformance = require('../models/videoPerformance');

const videoPerformanceController = {
  // Create new video performance record
  async create(req, res) {
    try {
      const performance = await VideoPerformance.create(req.body);
      res.status(201).json({
        success: true,
        data: performance
      });
    } catch (error) {
      console.error('Error creating video performance:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  // Get performance by ID
  async getById(req, res) {
    try {
      const performance = await VideoPerformance.findById(req.params.id);
      if (!performance) {
        return res.status(404).json({
          success: false,
          error: 'Performance record not found'
        });
      }
      res.json({
        success: true,
        data: performance
      });
    } catch (error) {
      console.error('Error fetching performance:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  // Get performance by video ID
  async getByVideoId(req, res) {
    try {
      const performance = await VideoPerformance.findByVideoId(req.params.videoId);
      if (!performance) {
        return res.status(404).json({
          success: false,
          error: 'Performance record not found for this video'
        });
      }
      res.json({
        success: true,
        data: performance
      });
    } catch (error) {
      console.error('Error fetching performance by video:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  // Find or create performance record
  async findOrCreate(req, res) {
    try {
      const { videoId } = req.params;
      const performance = await VideoPerformance.findOrCreate(videoId);
      res.json({
        success: true,
        data: performance
      });
    } catch (error) {
      console.error('Error finding or creating performance:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  // Update performance
  async update(req, res) {
    try {
      const performance = await VideoPerformance.update(req.params.id, req.body);
      if (!performance) {
        return res.status(404).json({
          success: false,
          error: 'Performance record not found'
        });
      }
      res.json({
        success: true,
        data: performance
      });
    } catch (error) {
      console.error('Error updating performance:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  // Increment view count
  async incrementView(req, res) {
    try {
      const { videoId } = req.params;
      const performance = await VideoPerformance.incrementView(videoId);
      if (!performance) {
        // Create new performance record if it doesn't exist
        const newPerformance = await VideoPerformance.create({
          video_id: videoId,
          views_count: 1
        });
        return res.json({
          success: true,
          data: newPerformance
        });
      }
      res.json({
        success: true,
        data: performance
      });
    } catch (error) {
      console.error('Error incrementing view:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  // Add feedback
  async addFeedback(req, res) {
    try {
      const { videoId } = req.params;
      const { isPositive } = req.body;
      const performance = await VideoPerformance.incrementFeedback(videoId, isPositive);
      if (!performance) {
        return res.status(404).json({
          success: false,
          error: 'Performance record not found'
        });
      }
      res.json({
        success: true,
        data: performance
      });
    } catch (error) {
      console.error('Error adding feedback:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  // Record conversion
  async recordConversion(req, res) {
    try {
      const { videoId } = req.params;
      const performance = await VideoPerformance.incrementConversion(videoId);
      if (!performance) {
        return res.status(404).json({
          success: false,
          error: 'Performance record not found'
        });
      }
      res.json({
        success: true,
        data: performance
      });
    } catch (error) {
      console.error('Error recording conversion:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  // Record demo request
  async recordDemoRequest(req, res) {
    try {
      const { videoId } = req.params;
      const performance = await VideoPerformance.incrementDemoRequest(videoId);
      if (!performance) {
        return res.status(404).json({
          success: false,
          error: 'Performance record not found'
        });
      }
      res.json({
        success: true,
        data: performance
      });
    } catch (error) {
      console.error('Error recording demo request:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  // Delete performance record
  async delete(req, res) {
    try {
      const performance = await VideoPerformance.delete(req.params.id);
      if (!performance) {
        return res.status(404).json({
          success: false,
          error: 'Performance record not found'
        });
      }
      res.json({
        success: true,
        data: performance,
        message: 'Performance record deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting performance:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  // Get top performing videos
  async getTopPerformers(req, res) {
    try {
      const limit = parseInt(req.query.limit) || 10;
      const videos = await VideoPerformance.getTopPerformers(limit);
      res.json({
        success: true,
        data: videos,
        count: videos.length
      });
    } catch (error) {
      console.error('Error fetching top performers:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  // Get high engagement videos
  async getHighEngagement(req, res) {
    try {
      const minRate = parseFloat(req.query.min_rate) || 0.7;
      const videos = await VideoPerformance.getHighEngagement(minRate);
      res.json({
        success: true,
        data: videos,
        count: videos.length,
        min_rate: minRate
      });
    } catch (error) {
      console.error('Error fetching high engagement videos:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  // Get performance statistics
  async getStats(req, res) {
    try {
      const stats = await VideoPerformance.getPerformanceStats();
      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Error fetching performance stats:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  // Update engagement metrics
  async updateEngagement(req, res) {
    try {
      const { videoId } = req.params;
      const { engagement_rate, avg_watch_time_seconds, drop_off_points } = req.body;

      const updateData = {};
      if (engagement_rate !== undefined) updateData.engagement_rate = engagement_rate;
      if (avg_watch_time_seconds !== undefined) updateData.avg_watch_time_seconds = avg_watch_time_seconds;
      if (drop_off_points !== undefined) updateData.drop_off_points = drop_off_points;

      const performance = await VideoPerformance.findByVideoId(videoId);
      if (!performance) {
        return res.status(404).json({
          success: false,
          error: 'Performance record not found'
        });
      }

      const updated = await VideoPerformance.update(performance.id, updateData);
      res.json({
        success: true,
        data: updated
      });
    } catch (error) {
      console.error('Error updating engagement:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
};

module.exports = videoPerformanceController;