const express = require('express');
const router = express.Router();
const eventController = require('../controllers/eventController');
const { protect } = require('../middleware/auth');

// Public routes (for submissions)
router.post('/submit', eventController.createEvent);

// Protected routes
router.use(protect);

// Get pending events (must come before /:id)
router.get('/pending', eventController.getPendingEvents);

// Get all events
router.get('/', eventController.getAllEvents);

// Approve event
router.put('/:id/approve', eventController.approveEvent);

// Get single event
router.get('/:id', eventController.getEvent);

// Update event
router.put('/:id', eventController.updateEvent);

// Delete event
router.delete('/:id', eventController.deleteEvent);

// AI Recommendation Routes - ALL SNAKE_CASE TO MATCH DATABASE
// Get AI speaker recommendations for an event
router.get('/:id/ai/speakers', eventController.getAISpeakerRecommendations);

// Get AI sponsor recommendations with talking points
router.get('/:id/ai/sponsors', eventController.getAISponsorRecommendations);

// Get personalized agenda for a contractor
router.get('/:id/ai/agenda', eventController.getPersonalizedAgenda);

// Test AI recommendations (admin endpoint)
router.get('/:id/ai/test', eventController.testAIRecommendations);

// AI + SMS Integration Routes - ALL SNAKE_CASE TO MATCH DATABASE
// Send AI speaker recommendations via SMS
router.post('/:id/ai/speakers/sms', eventController.sendAISpeakerRecommendationsSMS);

// Send AI sponsor recommendations via SMS
router.post('/:id/ai/sponsors/sms', eventController.sendAISponsorRecommendationsSMS);

// Send complete personalized agenda via SMS
router.post('/:id/ai/agenda/sms', eventController.sendPersonalizedAgendaSMS);

// Schedule AI recommendations for later
router.post('/:id/ai/schedule', eventController.scheduleAIRecommendations);

module.exports = router;