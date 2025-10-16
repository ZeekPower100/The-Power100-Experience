const express = require('express');
const router = express.Router();
const eventController = require('../controllers/eventController');
const { protect } = require('../middleware/auth');
const { flexibleProtect } = require('../middleware/flexibleAuth');

// Public routes (for submissions and event pages)
router.post('/submit', eventController.createEvent);

// n8n webhook helper (accepts API key)
router.get('/pcr/pending', flexibleProtect, eventController.getPendingPCR);

// Protected routes
router.use(protect);

// Get pending events (MUST come before /:id to avoid route conflict)
router.get('/pending', eventController.getPendingEvents);

// Public route - Get single event (needed for profile completion page)
// NOTE: This is after /pending to avoid /:id matching "/pending"
router.get('/:id', eventController.getEvent);

// Get all events
router.get('/', eventController.getAllEvents);

// Approve event
router.put('/:id/approve', eventController.approveEvent);

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

// Speaker Alert Routes - ALL SNAKE_CASE TO MATCH DATABASE
// Test speaker alert system
router.post('/:id/ai/speaker-alerts/test', eventController.testSpeakerAlerts);

// Manually check for upcoming sessions and send alerts
router.post('/:id/ai/speaker-alerts/check', eventController.checkSpeakerAlerts);

// PCR Scoring Routes - ALL SNAKE_CASE TO MATCH DATABASE
// Request PCR score for a recommendation
router.post('/:id/pcr/request', eventController.requestPCRScore);

// Process PCR score from SMS response
router.post('/:id/pcr/process', eventController.processPCRScore);

// Get overall event PCR score
router.get('/:id/pcr/overall', eventController.getEventPCR);

// Get PCR breakdown by type
router.get('/:id/pcr/breakdown', eventController.getPCRBreakdown);

// Analyze sentiment from any response
router.post('/pcr/analyze-sentiment', eventController.analyzeSentiment);

module.exports = router;