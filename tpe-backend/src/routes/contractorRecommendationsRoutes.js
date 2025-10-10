const express = require('express');
const router = express.Router();
const contractorRecommendationsController = require('../controllers/contractorRecommendationsController');
const { flexibleProtect: authenticateToken } = require('../middleware/flexibleAuth');

// Public routes (for event agenda pages)
// GET /contractor/:contractorId - get all recommendations (needed for event agenda)
router.get('/contractor/:contractorId', contractorRecommendationsController.getByContractorId);

// GET /contractor/:contractorId/type/:entityType - get by type (needed for event agenda)
router.get('/contractor/:contractorId/type/:entityType', contractorRecommendationsController.getByEntityType);

// All other routes require authentication
router.use(authenticateToken);

// POST / - create recommendation
router.post('/', contractorRecommendationsController.create);

// POST /batch - batch create
router.post('/batch', contractorRecommendationsController.batchCreate);

// GET /contractor/:contractorId - get all recommendations
router.get('/contractor/:contractorId', contractorRecommendationsController.getByContractorId);

// GET /contractor/:contractorId/type/:entityType - get by type
router.get('/contractor/:contractorId/type/:entityType', contractorRecommendationsController.getByEntityType);

// GET /:id - get single recommendation
router.get('/:id', contractorRecommendationsController.getById);

// PUT /:id - update recommendation
router.put('/:id', contractorRecommendationsController.update);

// PUT /:id/engagement - update engagement
router.put('/:id/engagement', contractorRecommendationsController.updateEngagement);

// PUT /:id/feedback - add feedback
router.put('/:id/feedback', contractorRecommendationsController.addFeedback);

// GET /contractor/:contractorId/pending - get pending
router.get('/contractor/:contractorId/pending', contractorRecommendationsController.getPending);

// GET /contractor/:contractorId/stats - get stats
router.get('/contractor/:contractorId/stats', contractorRecommendationsController.getStats);

// GET /contractor/:contractorId/conversion - get conversion rate
router.get('/contractor/:contractorId/conversion', contractorRecommendationsController.getConversionRate);

// DELETE /:id - delete
router.delete('/:id', contractorRecommendationsController.delete);

module.exports = router;