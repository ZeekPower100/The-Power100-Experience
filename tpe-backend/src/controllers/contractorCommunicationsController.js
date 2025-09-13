const ContractorCommunications = require('../models/contractorCommunications');

// Create new communication
exports.create = async (req, res) => {
  try {
    const communication = await ContractorCommunications.create(req.body);
    res.status(201).json({ success: true, data: communication });
  } catch (error) {
    console.error('Error creating communication:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get all communications for contractor
exports.getByContractorId = async (req, res) => {
  try {
    const communications = await ContractorCommunications.findByContractorId(req.params.contractorId);
    res.json({ success: true, data: communications });
  } catch (error) {
    console.error('Error fetching communications:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get single communication
exports.getById = async (req, res) => {
  try {
    const communication = await ContractorCommunications.findById(req.params.id);
    if (!communication) {
      return res.status(404).json({ success: false, error: 'Communication not found' });
    }
    res.json({ success: true, data: communication });
  } catch (error) {
    console.error('Error fetching communication:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Update communication status
exports.updateStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['sent', 'delivered', 'opened', 'clicked', 'replied', 'failed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid status' });
    }
    const communication = await ContractorCommunications.updateStatus(req.params.id, status);
    if (!communication) {
      return res.status(404).json({ success: false, error: 'Communication not found' });
    }
    res.json({ success: true, data: communication });
  } catch (error) {
    console.error('Error updating status:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get recent communications
exports.getRecent = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const communications = await ContractorCommunications.findRecent(req.params.contractorId, limit);
    res.json({ success: true, data: communications });
  } catch (error) {
    console.error('Error fetching recent communications:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get unread communications
exports.getUnread = async (req, res) => {
  try {
    const communications = await ContractorCommunications.findUnread(req.params.contractorId);
    res.json({ success: true, data: communications });
  } catch (error) {
    console.error('Error fetching unread communications:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get communication stats
exports.getStats = async (req, res) => {
  try {
    const stats = await ContractorCommunications.getStats(req.params.contractorId);
    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Delete communication
exports.delete = async (req, res) => {
  try {
    const communication = await ContractorCommunications.delete(req.params.id);
    if (!communication) {
      return res.status(404).json({ success: false, error: 'Communication not found' });
    }
    res.json({ success: true, data: communication });
  } catch (error) {
    console.error('Error deleting communication:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};