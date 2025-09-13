const ContractorBusinessGoals = require('../models/contractorBusinessGoals');

// Create new business goal
exports.create = async (req, res) => {
  try {
    const goal = await ContractorBusinessGoals.create(req.body);
    res.status(201).json({ success: true, data: goal });
  } catch (error) {
    console.error('Error creating business goal:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get all goals for contractor
exports.getByContractorId = async (req, res) => {
  try {
    const goals = await ContractorBusinessGoals.findByContractorId(req.params.contractorId);
    res.json({ success: true, data: goals });
  } catch (error) {
    console.error('Error fetching goals:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get single goal
exports.getById = async (req, res) => {
  try {
    const goal = await ContractorBusinessGoals.findById(req.params.id);
    if (!goal) {
      return res.status(404).json({ success: false, error: 'Goal not found' });
    }
    res.json({ success: true, data: goal });
  } catch (error) {
    console.error('Error fetching goal:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Update goal
exports.update = async (req, res) => {
  try {
    const goal = await ContractorBusinessGoals.update(req.params.id, req.body);
    if (!goal) {
      return res.status(404).json({ success: false, error: 'Goal not found' });
    }
    res.json({ success: true, data: goal });
  } catch (error) {
    console.error('Error updating goal:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Update progress
exports.updateProgress = async (req, res) => {
  try {
    const { progress } = req.body;
    if (progress === undefined || progress < 0 || progress > 100) {
      return res.status(400).json({ success: false, error: 'Invalid progress value' });
    }
    const goal = await ContractorBusinessGoals.updateProgress(req.params.id, progress);
    if (!goal) {
      return res.status(404).json({ success: false, error: 'Goal not found' });
    }
    res.json({ success: true, data: goal });
  } catch (error) {
    console.error('Error updating progress:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Delete goal
exports.delete = async (req, res) => {
  try {
    const goal = await ContractorBusinessGoals.delete(req.params.id);
    if (!goal) {
      return res.status(404).json({ success: false, error: 'Goal not found' });
    }
    res.json({ success: true, data: goal });
  } catch (error) {
    console.error('Error deleting goal:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get incomplete goals
exports.getIncomplete = async (req, res) => {
  try {
    const goals = await ContractorBusinessGoals.findIncomplete(req.params.contractorId);
    res.json({ success: true, data: goals });
  } catch (error) {
    console.error('Error fetching incomplete goals:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};