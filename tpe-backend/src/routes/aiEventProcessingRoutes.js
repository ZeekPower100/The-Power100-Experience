const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const aiEventProcessingController = require('../controllers/aiEventProcessingController');

// All AI processing routes require authentication
router.use(protect);

// Bulk AI processing for an event
router.post('/events/:eventId/ai-process', aiEventProcessingController.processEventWithAI);

// Get AI processing status for an event
router.get('/events/:eventId/ai-status', aiEventProcessingController.getAIProcessingStatus);

module.exports = router;
