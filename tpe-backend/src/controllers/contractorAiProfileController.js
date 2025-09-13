const ContractorAiProfile = require('../models/contractorAiProfile');

const contractorAiProfileController = {
  // Create or update contractor AI profile
  async createOrUpdate(req, res) {
    try {
      const { contractorId } = req.params;
      const profileData = { ...req.body, contractor_id: contractorId };

      // Check if profile exists
      let profile = await ContractorAiProfile.findByContractorId(contractorId);

      if (profile) {
        // Update existing profile
        profile = await ContractorAiProfile.update(profile.id, req.body);
      } else {
        // Create new profile
        profile = await ContractorAiProfile.create(profileData);
      }

      res.json({ success: true, data: profile });
    } catch (error) {
      console.error('Error creating/updating contractor AI profile:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create/update contractor AI profile'
      });
    }
  },

  // Get contractor AI profile
  async getByContractorId(req, res) {
    try {
      const { contractorId } = req.params;
      const profile = await ContractorAiProfile.findByContractorId(contractorId);

      if (!profile) {
        return res.status(404).json({
          success: false,
          error: 'Profile not found'
        });
      }

      res.json({ success: true, data: profile });
    } catch (error) {
      console.error('Error fetching contractor AI profile:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch contractor AI profile'
      });
    }
  },

  // Update contractor metrics
  async updateMetrics(req, res) {
    try {
      const { contractorId } = req.params;
      const metrics = req.body;

      const profile = await ContractorAiProfile.updateMetrics(contractorId, metrics);

      res.json({ success: true, data: profile });
    } catch (error) {
      console.error('Error updating contractor metrics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update contractor metrics'
      });
    }
  },

  // Update communication preferences
  async updatePreferences(req, res) {
    try {
      const { contractorId } = req.params;
      const preferences = req.body;

      // Find profile first
      const profile = await ContractorAiProfile.findByContractorId(contractorId);
      if (!profile) {
        return res.status(404).json({
          success: false,
          error: 'Profile not found'
        });
      }

      // Update preferences
      const updatedProfile = await ContractorAiProfile.update(profile.id, preferences);

      res.json({ success: true, data: updatedProfile });
    } catch (error) {
      console.error('Error updating preferences:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update preferences'
      });
    }
  },

  // Increment recommendation tracking
  async trackRecommendation(req, res) {
    try {
      const { contractorId } = req.params;
      const { wasSuccessful } = req.body;

      const profile = await ContractorAiProfile.incrementRecommendations(
        contractorId,
        wasSuccessful
      );

      res.json({ success: true, data: profile });
    } catch (error) {
      console.error('Error tracking recommendation:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to track recommendation'
      });
    }
  },

  // Get at-risk contractors
  async getAtRiskContractors(req, res) {
    try {
      const { riskThreshold = 70 } = req.query;
      const contractors = await ContractorAiProfile.getAtRiskContractors(riskThreshold);

      res.json({ success: true, data: contractors });
    } catch (error) {
      console.error('Error fetching at-risk contractors:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch at-risk contractors'
      });
    }
  },

  // Get contractors by lifecycle stage
  async getByLifecycleStage(req, res) {
    try {
      const { stage } = req.params;
      const contractors = await ContractorAiProfile.getByLifecycleStage(stage);

      res.json({ success: true, data: contractors });
    } catch (error) {
      console.error('Error fetching contractors by lifecycle stage:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch contractors by lifecycle stage'
      });
    }
  },

  // Get all profiles with pagination
  async getAll(req, res) {
    try {
      const { limit = 100, offset = 0 } = req.query;
      const profiles = await ContractorAiProfile.getAll(limit, offset);

      res.json({ success: true, data: profiles });
    } catch (error) {
      console.error('Error fetching all AI profiles:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch AI profiles'
      });
    }
  }
};

module.exports = contractorAiProfileController;