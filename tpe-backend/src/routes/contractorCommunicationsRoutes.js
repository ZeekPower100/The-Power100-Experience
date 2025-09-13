const express = require('express');
const router = express.Router();
const contractorCommunicationsController = require('../controllers/contractorCommunicationsController');
const { flexibleProtect: authenticateToken } = require('../middleware/flexibleAuth');

// All routes require authentication
router.use(authenticateToken);

// POST / - create communication
router.post('/', contractorCommunicationsController.create);

// GET /contractor/:contractorId - get all communications
router.get('/contractor/:contractorId', contractorCommunicationsController.getByContractorId);

// GET /:id - get single communication
router.get('/:id', contractorCommunicationsController.getById);

// PUT /:id/status - update status
router.put('/:id/status', contractorCommunicationsController.updateStatus);

// GET /contractor/:contractorId/recent - get recent
router.get('/contractor/:contractorId/recent', contractorCommunicationsController.getRecent);

// GET /contractor/:contractorId/unread - get unread
router.get('/contractor/:contractorId/unread', contractorCommunicationsController.getUnread);

// GET /contractor/:contractorId/stats - get stats
router.get('/contractor/:contractorId/stats', contractorCommunicationsController.getStats);

// DELETE /:id - delete
router.delete('/:id', contractorCommunicationsController.delete);

module.exports = router;