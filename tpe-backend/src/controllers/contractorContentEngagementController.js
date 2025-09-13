const ContractorContentEngagement = require('../models/contractorContentEngagement');

// Create new engagement
exports.create = async (req, res) => {
  try {
    const engagement = await ContractorContentEngagement.create(req.body);
    res.status(201).json({ success: true, data: engagement });
  } catch (error) {
    console.error('Error creating engagement:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get all engagements for contractor
exports.getByContractorId = async (req, res) => {
  try {
    const engagements = await ContractorContentEngagement.findByContractorId(req.params.contractorId);
    res.json({ success: true, data: engagements });
  } catch (error) {
    console.error('Error fetching engagements:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get single engagement
exports.getById = async (req, res) => {
  try {
    const engagement = await ContractorContentEngagement.findById(req.params.id);
    if (!engagement) {
      return res.status(404).json({ success: false, error: 'Engagement not found' });
    }
    res.json({ success: true, data: engagement });
  } catch (error) {
    console.error('Error fetching engagement:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Update engagement
exports.update = async (req, res) => {
  try {
    const engagement = await ContractorContentEngagement.update(req.params.id, req.body);
    if (!engagement) {
      return res.status(404).json({ success: false, error: 'Engagement not found' });
    }
    res.json({ success: true, data: engagement });
  } catch (error) {
    console.error('Error updating engagement:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Update progress
exports.updateProgress = async (req, res) => {
  try {
    const { progress, timeSpent } = req.body;
    if (progress === undefined || progress < 0 || progress > 100) {
      return res.status(400).json({ success: false, error: 'Invalid progress value' });
    }
    const engagement = await ContractorContentEngagement.updateProgress(req.params.id, progress, timeSpent);
    if (!engagement) {
      return res.status(404).json({ success: false, error: 'Engagement not found' });
    }
    res.json({ success: true, data: engagement });
  } catch (error) {
    console.error('Error updating progress:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Add rating
exports.addRating = async (req, res) => {
  try {
    const { rating, notes } = req.body;
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, error: 'Invalid rating (1-5 required)' });
    }
    const engagement = await ContractorContentEngagement.addRating(req.params.id, rating, notes);
    if (!engagement) {
      return res.status(404).json({ success: false, error: 'Engagement not found' });
    }
    res.json({ success: true, data: engagement });
  } catch (error) {
    console.error('Error adding rating:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get completed content
exports.getCompleted = async (req, res) => {
  try {
    const engagements = await ContractorContentEngagement.findCompleted(req.params.contractorId);
    res.json({ success: true, data: engagements });
  } catch (error) {
    console.error('Error fetching completed content:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get engagement stats
exports.getStats = async (req, res) => {
  try {
    const stats = await ContractorContentEngagement.getStats(req.params.contractorId);
    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Delete engagement
exports.delete = async (req, res) => {
  try {
    const engagement = await ContractorContentEngagement.delete(req.params.id);
    if (!engagement) {
      return res.status(404).json({ success: false, error: 'Engagement not found' });
    }
    res.json({ success: true, data: engagement });
  } catch (error) {
    console.error('Error deleting engagement:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};