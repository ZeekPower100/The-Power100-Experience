const express = require('express');
const router = express.Router();
const contractorMetricsHistoryController = require('../controllers/contractorMetricsHistoryController');
const { flexibleProtect: authenticateToken } = require('../middleware/flexibleAuth');

// All routes require authentication
router.use(authenticateToken);

// POST / - create metrics
router.post('/', contractorMetricsHistoryController.create);

// POST /batch - batch create
router.post('/batch', contractorMetricsHistoryController.batchCreate);

// GET /contractor/:contractorId - get all metrics
router.get('/contractor/:contractorId', contractorMetricsHistoryController.getByContractorId);

// GET /contractor/:contractorId/latest - get latest
router.get('/contractor/:contractorId/latest', contractorMetricsHistoryController.getLatest);

// GET /:id - get single metrics
router.get('/:id', contractorMetricsHistoryController.getById);

// GET /contractor/:contractorId/trend - get trend
router.get('/contractor/:contractorId/trend', contractorMetricsHistoryController.getTrend);

// GET /at-risk - get at-risk contractors
router.get('/at-risk', contractorMetricsHistoryController.getAtRisk);

// GET /high-performers - get high performers
router.get('/high-performers', contractorMetricsHistoryController.getHighPerformers);

// GET /contractor/:contractorId/average - get average
router.get('/contractor/:contractorId/average', contractorMetricsHistoryController.getAverageMetrics);

// GET /contractor/:contractorId/changes - get changes
router.get('/contractor/:contractorId/changes', contractorMetricsHistoryController.getMetricChanges);

module.exports = router;