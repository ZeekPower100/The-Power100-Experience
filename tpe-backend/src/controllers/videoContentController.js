const VideoContent = require('../models/videoContent');
const axios = require('axios');

// Content fields that should trigger AI processing
const AI_TRIGGER_FIELDS = [
  'title',
  'description',
  'file_url',
  'entity_type',
  'entity_id',
  'video_type'
];

// Trigger AI processing via n8n webhook
async function triggerVideoAIProcessing(videoId, action, updates = {}) {
  try {
    // Only trigger if it's a new video or content fields changed
    const shouldTrigger = action === 'created' ||
                         Object.keys(updates).some(field => AI_TRIGGER_FIELDS.includes(field));

    if (!shouldTrigger) {
      console.log(`⏭️ Skipping AI processing for video ${videoId} - only metadata changed`);
      return;
    }

    const webhookUrl = process.env.N8N_VIDEO_WEBHOOK_URL;
    if (!webhookUrl) {
      console.warn('⚠️ N8N_VIDEO_WEBHOOK_URL not configured - skipping AI trigger');
      return;
    }

    console.log(`🔄 Triggering ${action} AI processing for video ${videoId}`);

    const response = await axios.post(webhookUrl, {
      video_id: videoId,
      ai_processing_status: 'pending',
      action,
      updated_fields: Object.keys(updates)
    });

    console.log(`✅ AI processing triggered for video ${videoId}`);
    return response.data;
  } catch (error) {
    console.error(`❌ Failed to trigger AI processing for video ${videoId}:`, error.message);
    // Don't throw - we don't want to fail the main operation if AI trigger fails
  }
}

const videoContentController = {
  // Create new video content
  async create(req, res) {
    try {
      const video = await VideoContent.create(req.body);

      // Trigger AI processing for new video
      triggerVideoAIProcessing(video.id, 'created');

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

      // Trigger AI processing if content fields changed
      triggerVideoAIProcessing(req.params.id, 'updated', req.body);

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