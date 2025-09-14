const VideoContent = require('../models/videoContent');

const videoContentController = {
  // Create new video content
  async create(req, res) {
    try {
      const video = await VideoContent.create(req.body);
      res.status(201).json({
        success: true,
        data: video
      });
    } catch (error) {
      console.error('Error creating video content:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  // Get video by ID
  async getById(req, res) {
    try {
      const video = await VideoContent.findById(req.params.id);
      if (!video) {
        return res.status(404).json({
          success: false,
          error: 'Video not found'
        });
      }
      res.json({
        success: true,
        data: video
      });
    } catch (error) {
      console.error('Error fetching video:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  // Get all videos
  async getAll(req, res) {
    try {
      const limit = parseInt(req.query.limit) || 100;
      const videos = await VideoContent.findAll(limit);
      res.json({
        success: true,
        data: videos,
        count: videos.length
      });
    } catch (error) {
      console.error('Error fetching videos:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  // Get videos by entity
  async getByEntity(req, res) {
    try {
      const { entity_type, entity_id } = req.params;
      const videos = await VideoContent.findByEntity(entity_type, entity_id);
      res.json({
        success: true,
        data: videos,
        count: videos.length
      });
    } catch (error) {
      console.error('Error fetching videos by entity:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  // Get videos by type
  async getByType(req, res) {
    try {
      const videos = await VideoContent.findByType(req.params.type);
      res.json({
        success: true,
        data: videos,
        count: videos.length
      });
    } catch (error) {
      console.error('Error fetching videos by type:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  // Get videos by processing status
  async getByStatus(req, res) {
    try {
      const videos = await VideoContent.findByStatus(req.params.status);
      res.json({
        success: true,
        data: videos,
        count: videos.length
      });
    } catch (error) {
      console.error('Error fetching videos by status:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  // Update video
  async update(req, res) {
    try {
      const video = await VideoContent.update(req.params.id, req.body);
      if (!video) {
        return res.status(404).json({
          success: false,
          error: 'Video not found'
        });
      }
      res.json({
        success: true,
        data: video
      });
    } catch (error) {
      console.error('Error updating video:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  // Update video processing status
  async updateStatus(req, res) {
    try {
      const { status } = req.body;
      const video = await VideoContent.updateStatus(req.params.id, status);
      if (!video) {
        return res.status(404).json({
          success: false,
          error: 'Video not found'
        });
      }
      res.json({
        success: true,
        data: video
      });
    } catch (error) {
      console.error('Error updating video status:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  // Delete video
  async delete(req, res) {
    try {
      const video = await VideoContent.delete(req.params.id);
      if (!video) {
        return res.status(404).json({
          success: false,
          error: 'Video not found'
        });
      }
      res.json({
        success: true,
        data: video,
        message: 'Video deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting video:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  // Get active videos
  async getActive(req, res) {
    try {
      const videos = await VideoContent.getActiveVideos();
      res.json({
        success: true,
        data: videos,
        count: videos.length
      });
    } catch (error) {
      console.error('Error fetching active videos:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  // Get pending videos for processing
  async getPending(req, res) {
    try {
      const videos = await VideoContent.getPendingVideos();
      res.json({
        success: true,
        data: videos,
        count: videos.length
      });
    } catch (error) {
      console.error('Error fetching pending videos:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  // Get video statistics
  async getStats(req, res) {
    try {
      const stats = await VideoContent.getVideoStats();
      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Error fetching video stats:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
};

module.exports = videoContentController;