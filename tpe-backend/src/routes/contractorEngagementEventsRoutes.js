const express = require('express');
const router = express.Router();
const contractorEngagementEventsController = require('../controllers/contractorEngagementEventsController');
const { flexibleProtect: authenticateToken } = require('../middleware/flexibleAuth');

// All routes require authentication
router.use(authenticateToken);

// POST / - create event
router.post('/', contractorEngagementEventsController.create);

// POST /batch - batch create
router.post('/batch', contractorEngagementEventsController.batchCreate);

// GET /contractor/:contractorId - get all events
router.get('/contractor/:contractorId', contractorEngagementEventsController.getByContractorId);

// GET /contractor/:contractorId/type/:eventType - get by type
router.get('/contractor/:contractorId/type/:eventType', contractorEngagementEventsController.getByEventType);

// GET /session/:sessionId - get by session
router.get('/session/:sessionId', contractorEngagementEventsController.getBySessionId);

// GET /:id - get single event
router.get('/:id', contractorEngagementEventsController.getById);

// GET /contractor/:contractorId/recent - get recent
router.get('/contractor/:contractorId/recent', contractorEngagementEventsController.getRecent);

// GET /contractor/:contractorId/counts - get event counts
router.get('/contractor/:contractorId/counts', contractorEngagementEventsController.getEventCounts);

// GET /contractor/:contractorId/patterns - get patterns
router.get('/contractor/:contractorId/patterns', contractorEngagementEventsController.getEngagementPatterns);

module.exports = router;