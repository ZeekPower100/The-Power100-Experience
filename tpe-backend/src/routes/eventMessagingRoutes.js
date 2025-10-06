const express = require('express');
const router = express.Router();
const eventMessagingController = require('../controllers/eventMessagingController');
const { protect } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * Event Messaging Routes
 */

// n8n webhook callback - NO authentication required
router.post('/webhook-response', asyncHandler(eventMessagingController.webhookResponse));

// Speaker feedback from n8n - NO authentication required
router.post('/speaker-feedback', asyncHandler(eventMessagingController.logSpeakerFeedback));

// SMS Router endpoints - NO authentication required (used by n8n)
router.get('/pending-context', asyncHandler(eventMessagingController.getPendingContext));
router.post('/routing-log', asyncHandler(eventMessagingController.logRoutingDecision));

// Test endpoint for n8n webhook - NO authentication required for testing
router.post('/test-speaker-alert', asyncHandler(async (req, res) => {
  const { event_id, contractor_id } = req.body;
  const { triggerSpeakerRecommendationSMS } = require('../controllers/n8nEventWebhookController');

  // Create test recommendations
  const testRecommendations = [
    {
      name: "John Smith",
      company: "Tech Innovations",
      session: {
        title: "Growing Your Construction Business with AI",
        time: "2:00 PM",
        location: "Main Stage"
      },
      why: "Aligns with your growth goals",
      quick_reasons: ["AI expertise", "Construction focus"]
    },
    {
      name: "Jane Doe",
      company: "BuildSmart Solutions",
      session: {
        title: "Scaling Your Operations",
        time: "3:30 PM",
        location: "Workshop Room A"
      },
      why: "Helps with operational efficiency",
      quick_reasons: ["Operations expert", "Proven results"]
    },
    {
      name: "Bob Wilson",
      company: "Growth Partners LLC",
      session: {
        title: "Building High-Performance Teams",
        time: "4:00 PM",
        location: "Breakout Room 2"
      },
      why: "Team development expertise",
      quick_reasons: ["Leadership coach", "Team building"]
    }
  ];

  const success = await triggerSpeakerRecommendationSMS(event_id, contractor_id, testRecommendations);

  res.json({
    success,
    message: success ? 'Speaker alert test triggered successfully' : 'Failed to trigger speaker alert test',
    event_id,
    contractor_id,
    recommendations_sent: testRecommendations.length
  });
}));

// All other routes require authentication
router.use(protect);

// Schedule a message for an attendee
router.post('/schedule', asyncHandler(eventMessagingController.scheduleMessage));

// Mass schedule messages for multiple attendees
router.post('/mass-schedule', asyncHandler(eventMessagingController.massScheduleMessages));

// CEO delay override
router.post('/delay-override', asyncHandler(eventMessagingController.applyDelayOverride));

// Send pending messages
router.post('/send-pending', asyncHandler(eventMessagingController.sendPendingMessages));

// Get message queue for an event
router.get('/event/:eventId/queue', asyncHandler(eventMessagingController.getMessageQueue));

// Update message status
router.put('/message/:messageId/status', asyncHandler(eventMessagingController.updateMessageStatus));

// ==================== PEER MATCHING ROUTES ====================

// Find peer matches for a contractor at an event
router.get('/event/:eventId/contractor/:contractorId/peer-matches', asyncHandler(eventMessagingController.findPeerMatches));

// Create a peer match
router.post('/event/:eventId/peer-match', asyncHandler(eventMessagingController.createPeerMatch));

// Send peer introduction via SMS
router.post('/peer-match/:matchId/introduction', asyncHandler(eventMessagingController.sendPeerIntroduction));

// Record contractor response to peer introduction
router.post('/peer-match/:matchId/response', asyncHandler(eventMessagingController.recordPeerResponse));

// Record that connection was made
router.post('/peer-match/:matchId/connection', asyncHandler(eventMessagingController.recordPeerConnection));

// Get all matches for a contractor at an event
router.get('/event/:eventId/contractor/:contractorId/matches', asyncHandler(eventMessagingController.getContractorMatches));

module.exports = router;