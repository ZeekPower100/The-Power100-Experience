const express = require('express');
const router = express.Router();
const contractorContentEngagementController = require('../controllers/contractorContentEngagementController');
const { flexibleProtect: authenticateToken } = require('../middleware/flexibleAuth');

// All routes require authentication
router.use(authenticateToken);

// POST / - create engagement
router.post('/', contractorContentEngagementController.create);

// GET /contractor/:contractorId - get all engagements
router.get('/contractor/:contractorId', contractorContentEngagementController.getByContractorId);

// GET /:id - get single engagement
router.get('/:id', contractorContentEngagementController.getById);

// PUT /:id - update engagement
router.put('/:id', contractorContentEngagementController.update);

// PUT /:id/progress - update progress
router.put('/:id/progress', contractorContentEngagementController.updateProgress);

// PUT /:id/rating - add rating
router.put('/:id/rating', contractorContentEngagementController.addRating);

// GET /contractor/:contractorId/completed - get completed
router.get('/contractor/:contractorId/completed', contractorContentEngagementController.getCompleted);

// GET /contractor/:contractorId/stats - get stats
router.get('/contractor/:contractorId/stats', contractorContentEngagementController.getStats);

// DELETE /:id - delete
router.delete('/:id', contractorContentEngagementController.delete);

module.exports = router;