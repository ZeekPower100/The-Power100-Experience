const AiSuccessStory = require('../models/aiSuccessStory');

const aiSuccessStoryController = {
  // Create success story
  async create(req, res) {
    try {
      const storyData = req.body;
      const story = await AiSuccessStory.create(storyData);

      res.json({ success: true, data: story });
    } catch (error) {
      console.error('Error creating success story:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create success story'
      });
    }
  },

  // Get story by ID
  async getById(req, res) {
    try {
      const { id } = req.params;
      const story = await AiSuccessStory.findById(id);

      if (!story) {
        return res.status(404).json({
          success: false,
          error: 'Story not found'
        });
      }

      res.json({ success: true, data: story });
    } catch (error) {
      console.error('Error fetching story:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch story'
      });
    }
  },

  // Get stories by contractor
  async getByContractor(req, res) {
    try {
      const { contractorId } = req.params;
      const stories = await AiSuccessStory.findByContractor(contractorId);

      res.json({ success: true, data: stories });
    } catch (error) {
      console.error('Error fetching contractor stories:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch contractor stories'
      });
    }
  },

  // Get stories by type
  async getByType(req, res) {
    try {
      const { type } = req.params;
      const stories = await AiSuccessStory.findByType(type);

      res.json({ success: true, data: stories });
    } catch (error) {
      console.error('Error fetching stories by type:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch stories by type'
      });
    }
  },

  // Update story
  async update(req, res) {
    try {
      const { id } = req.params;
      const updates = req.body;

      const story = await AiSuccessStory.update(id, updates);

      res.json({ success: true, data: story });
    } catch (error) {
      console.error('Error updating story:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update story'
      });
    }
  },

  // Verify story
  async verify(req, res) {
    try {
      const { id } = req.params;
      const { verificationMethod } = req.body;

      const story = await AiSuccessStory.verify(id, verificationMethod);

      res.json({ success: true, data: story });
    } catch (error) {
      console.error('Error verifying story:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to verify story'
      });
    }
  },

  // Get verified stories
  async getVerified(req, res) {
    try {
      const { limit = 20 } = req.query;
      const stories = await AiSuccessStory.getVerifiedStories(limit);

      res.json({ success: true, data: stories });
    } catch (error) {
      console.error('Error fetching verified stories:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch verified stories'
      });
    }
  },

  // Get top ROI stories
  async getTopROI(req, res) {
    try {
      const { minROI = 100, limit = 10 } = req.query;
      const stories = await AiSuccessStory.getTopROIStories(minROI, limit);

      res.json({ success: true, data: stories });
    } catch (error) {
      console.error('Error fetching top ROI stories:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch top ROI stories'
      });
    }
  },

  // Get stories by timeframe
  async getByTimeframe(req, res) {
    try {
      const { timeframe } = req.params;
      const { limit = 20 } = req.query;

      const stories = await AiSuccessStory.getStoriesByTimeframe(timeframe, limit);

      res.json({ success: true, data: stories });
    } catch (error) {
      console.error('Error fetching stories by timeframe:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch stories by timeframe'
      });
    }
  },

  // Get stories related to partner
  async getRelatedToPartner(req, res) {
    try {
      const { partnerId } = req.params;
      const stories = await AiSuccessStory.getRelatedToPartner(partnerId);

      res.json({ success: true, data: stories });
    } catch (error) {
      console.error('Error fetching partner-related stories:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch partner-related stories'
      });
    }
  },

  // Get stories related to book
  async getRelatedToBook(req, res) {
    try {
      const { bookId } = req.params;
      const stories = await AiSuccessStory.getRelatedToBook(bookId);

      res.json({ success: true, data: stories });
    } catch (error) {
      console.error('Error fetching book-related stories:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch book-related stories'
      });
    }
  },

  // Get stories related to podcast
  async getRelatedToPodcast(req, res) {
    try {
      const { podcastId } = req.params;
      const stories = await AiSuccessStory.getRelatedToPodcast(podcastId);

      res.json({ success: true, data: stories });
    } catch (error) {
      console.error('Error fetching podcast-related stories:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch podcast-related stories'
      });
    }
  },

  // Get stories related to event
  async getRelatedToEvent(req, res) {
    try {
      const { eventId } = req.params;
      const stories = await AiSuccessStory.getRelatedToEvent(eventId);

      res.json({ success: true, data: stories });
    } catch (error) {
      console.error('Error fetching event-related stories:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch event-related stories'
      });
    }
  },

  // Get stories with video testimonials
  async getWithVideo(req, res) {
    try {
      const { limit = 20 } = req.query;
      const stories = await AiSuccessStory.getStoriesWithVideo(limit);

      res.json({ success: true, data: stories });
    } catch (error) {
      console.error('Error fetching stories with video:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch stories with video'
      });
    }
  },

  // Get story statistics
  async getStats(req, res) {
    try {
      const stats = await AiSuccessStory.getStoryStats();

      res.json({ success: true, data: stats });
    } catch (error) {
      console.error('Error fetching story stats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch story stats'
      });
    }
  }
};

module.exports = aiSuccessStoryController;