const ContractorRecommendations = require('../models/contractorRecommendations');

// Create new recommendation
exports.create = async (req, res) => {
  try {
    const recommendation = await ContractorRecommendations.create(req.body);
    res.status(201).json({ success: true, data: recommendation });
  } catch (error) {
    console.error('Error creating recommendation:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Batch create recommendations
exports.batchCreate = async (req, res) => {
  try {
    const { recommendations } = req.body;
    if (!Array.isArray(recommendations) || recommendations.length === 0) {
      return res.status(400).json({ success: false, error: 'Recommendations array required' });
    }
    const created = await ContractorRecommendations.createBatch(recommendations);
    res.status(201).json({ success: true, data: created });
  } catch (error) {
    console.error('Error batch creating recommendations:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get all recommendations for contractor
exports.getByContractorId = async (req, res) => {
  try {
    const recommendations = await ContractorRecommendations.findByContractorId(req.params.contractorId);
    res.json({ success: true, data: recommendations });
  } catch (error) {
    console.error('Error fetching recommendations:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get recommendations by entity type
exports.getByEntityType = async (req, res) => {
  try {
    const recommendations = await ContractorRecommendations.findByEntityType(
      req.params.contractorId,
      req.params.entityType
    );
    res.json({ success: true, data: recommendations });
  } catch (error) {
    console.error('Error fetching recommendations by type:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get single recommendation
exports.getById = async (req, res) => {
  try {
    const recommendation = await ContractorRecommendations.findById(req.params.id);
    if (!recommendation) {
      return res.status(404).json({ success: false, error: 'Recommendation not found' });
    }
    res.json({ success: true, data: recommendation });
  } catch (error) {
    console.error('Error fetching recommendation:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Update recommendation
exports.update = async (req, res) => {
  try {
    const recommendation = await ContractorRecommendations.update(req.params.id, req.body);
    if (!recommendation) {
      return res.status(404).json({ success: false, error: 'Recommendation not found' });
    }
    res.json({ success: true, data: recommendation });
  } catch (error) {
    console.error('Error updating recommendation:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Update engagement status
exports.updateEngagement = async (req, res) => {
  try {
    const { engagement } = req.body;
    const validEngagements = ['pending', 'ignored', 'viewed', 'clicked', 'completed'];
    if (!validEngagements.includes(engagement)) {
      return res.status(400).json({ success: false, error: 'Invalid engagement status' });
    }
    const recommendation = await ContractorRecommendations.updateEngagement(req.params.id, engagement);
    if (!recommendation) {
      return res.status(404).json({ success: false, error: 'Recommendation not found' });
    }
    res.json({ success: true, data: recommendation });
  } catch (error) {
    console.error('Error updating engagement:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Add feedback
exports.addFeedback = async (req, res) => {
  try {
    const { feedback, outcome } = req.body;
    if (!feedback) {
      return res.status(400).json({ success: false, error: 'Feedback required' });
    }
    const recommendation = await ContractorRecommendations.addFeedback(req.params.id, feedback, outcome);
    if (!recommendation) {
      return res.status(404).json({ success: false, error: 'Recommendation not found' });
    }
    res.json({ success: true, data: recommendation });
  } catch (error) {
    console.error('Error adding feedback:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get pending recommendations
exports.getPending = async (req, res) => {
  try {
    const recommendations = await ContractorRecommendations.findPending(req.params.contractorId);
    res.json({ success: true, data: recommendations });
  } catch (error) {
    console.error('Error fetching pending recommendations:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get recommendation stats
exports.getStats = async (req, res) => {
  try {
    const stats = await ContractorRecommendations.getStats(req.params.contractorId);
    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get conversion rate
exports.getConversionRate = async (req, res) => {
  try {
    const rate = await ContractorRecommendations.getConversionRate(req.params.contractorId);
    res.json({ success: true, data: rate });
  } catch (error) {
    console.error('Error fetching conversion rate:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Delete recommendation
exports.delete = async (req, res) => {
  try {
    const recommendation = await ContractorRecommendations.delete(req.params.id);
    if (!recommendation) {
      return res.status(404).json({ success: false, error: 'Recommendation not found' });
    }
    res.json({ success: true, data: recommendation });
  } catch (error) {
    console.error('Error deleting recommendation:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};