const ContractorMetricsHistory = require('../models/contractorMetricsHistory');

// Create new metrics record
exports.create = async (req, res) => {
  try {
    const metrics = await ContractorMetricsHistory.create(req.body);
    res.status(201).json({ success: true, data: metrics });
  } catch (error) {
    console.error('Error creating metrics:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Batch create metrics
exports.batchCreate = async (req, res) => {
  try {
    const { metrics } = req.body;
    if (!Array.isArray(metrics) || metrics.length === 0) {
      return res.status(400).json({ success: false, error: 'Metrics array required' });
    }
    const created = await ContractorMetricsHistory.createBatch(metrics);
    res.status(201).json({ success: true, data: created });
  } catch (error) {
    console.error('Error batch creating metrics:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get all metrics for contractor
exports.getByContractorId = async (req, res) => {
  try {
    const metrics = await ContractorMetricsHistory.findByContractorId(req.params.contractorId);
    res.json({ success: true, data: metrics });
  } catch (error) {
    console.error('Error fetching metrics:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get latest metrics
exports.getLatest = async (req, res) => {
  try {
    const metrics = await ContractorMetricsHistory.findLatest(req.params.contractorId);
    if (!metrics) {
      return res.status(404).json({ success: false, error: 'No metrics found' });
    }
    res.json({ success: true, data: metrics });
  } catch (error) {
    console.error('Error fetching latest metrics:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get single metrics record
exports.getById = async (req, res) => {
  try {
    const metrics = await ContractorMetricsHistory.findById(req.params.id);
    if (!metrics) {
      return res.status(404).json({ success: false, error: 'Metrics not found' });
    }
    res.json({ success: true, data: metrics });
  } catch (error) {
    console.error('Error fetching metrics:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get metrics trend
exports.getTrend = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 30;
    const trend = await ContractorMetricsHistory.getTrend(req.params.contractorId, limit);
    res.json({ success: true, data: trend });
  } catch (error) {
    console.error('Error fetching trend:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get contractors at risk
exports.getAtRisk = async (req, res) => {
  try {
    const threshold = parseInt(req.query.threshold) || 70;
    const atRisk = await ContractorMetricsHistory.findAtRisk(threshold);
    res.json({ success: true, data: atRisk });
  } catch (error) {
    console.error('Error fetching at-risk contractors:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get high performers
exports.getHighPerformers = async (req, res) => {
  try {
    const threshold = parseInt(req.query.threshold) || 80;
    const highPerformers = await ContractorMetricsHistory.findHighPerformers(threshold);
    res.json({ success: true, data: highPerformers });
  } catch (error) {
    console.error('Error fetching high performers:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get average metrics
exports.getAverageMetrics = async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const averages = await ContractorMetricsHistory.getAverageMetrics(req.params.contractorId, days);
    res.json({ success: true, data: averages });
  } catch (error) {
    console.error('Error fetching average metrics:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get metric changes
exports.getMetricChanges = async (req, res) => {
  try {
    const changes = await ContractorMetricsHistory.getMetricChanges(req.params.contractorId);
    res.json({ success: true, data: changes });
  } catch (error) {
    console.error('Error fetching metric changes:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};