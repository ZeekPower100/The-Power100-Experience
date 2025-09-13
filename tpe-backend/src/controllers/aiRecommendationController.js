const AiRecommendation = require('../models/aiRecommendation');

const aiRecommendationController = {
  // Create a new recommendation
  async create(req, res) {
    try {
      const recommendationData = req.body;
      const recommendation = await AiRecommendation.create(recommendationData);

      res.json({ success: true, data: recommendation });
    } catch (error) {
      console.error('Error creating AI recommendation:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create AI recommendation'
      });
    }
  },

  // Get recommendation by ID
  async getById(req, res) {
    try {
      const { id } = req.params;
      const recommendation = await AiRecommendation.findById(id);

      if (!recommendation) {
        return res.status(404).json({
          success: false,
          error: 'Recommendation not found'
        });
      }

      res.json({ success: true, data: recommendation });
    } catch (error) {
      console.error('Error fetching recommendation:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch recommendation'
      });
    }
  },

  // Get recommendations for a contractor
  async getByContractor(req, res) {
    try {
      const { contractorId } = req.params;
      const { limit = 10 } = req.query;

      const recommendations = await AiRecommendation.findByContractor(contractorId, limit);

      res.json({ success: true, data: recommendations });
    } catch (error) {
      console.error('Error fetching contractor recommendations:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch contractor recommendations'
      });
    }
  },

  // Get recommendations for a specific entity
  async getByEntity(req, res) {
    try {
      const { entityType, entityId } = req.params;
      const recommendations = await AiRecommendation.findByEntity(entityType, entityId);

      res.json({ success: true, data: recommendations });
    } catch (error) {
      console.error('Error fetching entity recommendations:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch entity recommendations'
      });
    }
  },

  // Update engagement status
  async updateEngagement(req, res) {
    try {
      const { id } = req.params;
      const { status, feedback } = req.body;

      const recommendation = await AiRecommendation.updateEngagement(id, status, feedback);

      res.json({ success: true, data: recommendation });
    } catch (error) {
      console.error('Error updating engagement:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update engagement'
      });
    }
  },

  // Record outcome and revenue impact
  async recordOutcome(req, res) {
    try {
      const { id } = req.params;
      const { outcome, revenueImpact } = req.body;

      const recommendation = await AiRecommendation.recordOutcome(id, outcome, revenueImpact);

      res.json({ success: true, data: recommendation });
    } catch (error) {
      console.error('Error recording outcome:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to record outcome'
      });
    }
  },

  // Get engagement statistics
  async getEngagementStats(req, res) {
    try {
      const { contractorId } = req.query;
      const stats = await AiRecommendation.getEngagementStats(contractorId);

      res.json({ success: true, data: stats });
    } catch (error) {
      console.error('Error fetching engagement stats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch engagement stats'
      });
    }
  },

  // Get top performing recommendations
  async getTopPerforming(req, res) {
    try {
      const { limit = 10 } = req.query;
      const recommendations = await AiRecommendation.getTopPerformingRecommendations(limit);

      res.json({ success: true, data: recommendations });
    } catch (error) {
      console.error('Error fetching top performing recommendations:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch top performing recommendations'
      });
    }
  },

  // Get recent recommendations
  async getRecent(req, res) {
    try {
      const { limit = 20 } = req.query;
      const recommendations = await AiRecommendation.getRecentRecommendations(limit);

      res.json({ success: true, data: recommendations });
    } catch (error) {
      console.error('Error fetching recent recommendations:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch recent recommendations'
      });
    }
  },

  // Get recommendations by status
  async getByStatus(req, res) {
    try {
      const { status } = req.params;
      const { limit = 100 } = req.query;

      const recommendations = await AiRecommendation.getByStatus(status, limit);

      res.json({ success: true, data: recommendations });
    } catch (error) {
      console.error('Error fetching recommendations by status:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch recommendations by status'
      });
    }
  },

  // Batch create recommendations
  async batchCreate(req, res) {
    try {
      const { recommendations } = req.body;
      const created = [];

      for (const rec of recommendations) {
        const recommendation = await AiRecommendation.create(rec);
        created.push(recommendation);
      }

      res.json({ success: true, data: created });
    } catch (error) {
      console.error('Error batch creating recommendations:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to batch create recommendations'
      });
    }
  }
};

module.exports = aiRecommendationController;