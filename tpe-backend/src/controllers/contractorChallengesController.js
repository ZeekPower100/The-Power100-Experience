const ContractorChallenges = require('../models/contractorChallenges');

// Create new challenge
exports.create = async (req, res) => {
  try {
    const challenge = await ContractorChallenges.create(req.body);
    res.status(201).json({ success: true, data: challenge });
  } catch (error) {
    console.error('Error creating challenge:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get all challenges for contractor
exports.getByContractorId = async (req, res) => {
  try {
    const challenges = await ContractorChallenges.findByContractorId(req.params.contractorId);
    res.json({ success: true, data: challenges });
  } catch (error) {
    console.error('Error fetching challenges:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get single challenge
exports.getById = async (req, res) => {
  try {
    const challenge = await ContractorChallenges.findById(req.params.id);
    if (!challenge) {
      return res.status(404).json({ success: false, error: 'Challenge not found' });
    }
    res.json({ success: true, data: challenge });
  } catch (error) {
    console.error('Error fetching challenge:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Update challenge
exports.update = async (req, res) => {
  try {
    const challenge = await ContractorChallenges.update(req.params.id, req.body);
    if (!challenge) {
      return res.status(404).json({ success: false, error: 'Challenge not found' });
    }
    res.json({ success: true, data: challenge });
  } catch (error) {
    console.error('Error updating challenge:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Resolve challenge
exports.resolve = async (req, res) => {
  try {
    const challenge = await ContractorChallenges.resolve(req.params.id);
    if (!challenge) {
      return res.status(404).json({ success: false, error: 'Challenge not found' });
    }
    res.json({ success: true, data: challenge });
  } catch (error) {
    console.error('Error resolving challenge:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Delete challenge
exports.delete = async (req, res) => {
  try {
    const challenge = await ContractorChallenges.delete(req.params.id);
    if (!challenge) {
      return res.status(404).json({ success: false, error: 'Challenge not found' });
    }
    res.json({ success: true, data: challenge });
  } catch (error) {
    console.error('Error deleting challenge:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get unresolved challenges
exports.getUnresolved = async (req, res) => {
  try {
    const challenges = await ContractorChallenges.findUnresolved(req.params.contractorId);
    res.json({ success: true, data: challenges });
  } catch (error) {
    console.error('Error fetching unresolved challenges:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Add attempted solution
exports.addSolution = async (req, res) => {
  try {
    const { solution } = req.body;
    if (!solution) {
      return res.status(400).json({ success: false, error: 'Solution required' });
    }
    const challenge = await ContractorChallenges.addAttemptedSolution(req.params.id, solution);
    if (!challenge) {
      return res.status(404).json({ success: false, error: 'Challenge not found' });
    }
    res.json({ success: true, data: challenge });
  } catch (error) {
    console.error('Error adding solution:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};