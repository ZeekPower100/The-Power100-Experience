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

// Test endpoint for profile completion email/SMS - NO authentication required for testing
router.post('/test-profile-completion', asyncHandler(async (req, res) => {
  const { event_id, contractor_id } = req.body;
  const { sendProfileCompletionRequest } = require('../services/eventOrchestrator/emailScheduler');

  try {
    const result = await sendProfileCompletionRequest(event_id, contractor_id);

    res.json({
      success: true,
      message: 'Profile completion notifications sent successfully',
      event_id,
      contractor_id,
      result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to send profile completion notifications',
      error: error.message
    });
  }
}));

// Test endpoint for agenda ready email/SMS - NO authentication required for testing
router.post('/test-agenda-ready', asyncHandler(async (req, res) => {
  const { event_id, contractor_id } = req.body;
  const { sendAgendaReadyNotification } = require('../services/eventOrchestrator/emailScheduler');
  const { sendSMSNotification } = require('../services/smsService');
  const { query } = require('../config/database');

  try {
    // Test recommendation counts
    const recommendationCounts = {
      speakers: 3,
      sponsors: 2,
      peers: 4
    };

    // Send email
    const emailResult = await sendAgendaReadyNotification(event_id, contractor_id, recommendationCounts);

    // Get contractor info for SMS
    const contractorResult = await query('SELECT first_name, phone FROM contractors WHERE id = $1', [contractor_id]);
    const contractor = contractorResult.rows[0];

    // Get event info for SMS
    const eventResult = await query('SELECT name FROM events WHERE id = $1', [event_id]);
    const event = eventResult.rows[0];

    let smsResult = null;
    if (contractor && contractor.phone) {
      const baseUrl = process.env.NODE_ENV === 'production'
        ? 'https://tpx.power100.io'
        : 'http://localhost:3002';
      const smsMessage = `${contractor.first_name || 'Hi'}! Your personalized agenda for ${event.name} is ready! 🎉 ${recommendationCounts.speakers} speakers, ${recommendationCounts.sponsors} sponsors, ${recommendationCounts.peers} networking matches. View now: ${baseUrl}/events/${event_id}/agenda?contractor=${contractor_id}`;
      smsResult = await sendSMSNotification(contractor.phone, smsMessage);
    }

    res.json({
      success: true,
      message: 'Agenda ready notifications sent successfully',
      event_id,
      contractor_id,
      email: emailResult,
      sms: smsResult
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to send agenda ready notifications',
      error: error.message
    });
  }
}));

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

// Test endpoint for check-in reminder - Night Before - NO authentication required for testing
router.post('/test-check-in-reminder-night-before', asyncHandler(async (req, res) => {
  const { event_id, contractor_id } = req.body;
  const { sendCheckInReminderNightBefore } = require('../services/eventOrchestrator/emailScheduler');

  try {
    const result = await sendCheckInReminderNightBefore(event_id, contractor_id);

    res.json({
      success: true,
      message: 'Night before check-in reminder sent successfully',
      event_id,
      contractor_id,
      result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to send night before check-in reminder',
      error: error.message
    });
  }
}));

// Test endpoint for check-in reminder - 1 Hour Before - NO authentication required for testing
router.post('/test-check-in-reminder-1-hour', asyncHandler(async (req, res) => {
  const { event_id, contractor_id } = req.body;
  const { sendCheckInReminder1HourBefore } = require('../services/eventOrchestrator/emailScheduler');

  try {
    const result = await sendCheckInReminder1HourBefore(event_id, contractor_id);

    res.json({
      success: true,
      message: '1 hour before check-in reminder sent successfully',
      event_id,
      contractor_id,
      result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to send 1 hour before check-in reminder',
      error: error.message
    });
  }
}));

// Test endpoint for check-in reminder - Event Start - NO authentication required for testing
router.post('/test-check-in-reminder-event-start', asyncHandler(async (req, res) => {
  const { event_id, contractor_id } = req.body;
  const { sendCheckInReminderEventStart } = require('../services/eventOrchestrator/emailScheduler');

  try {
    const result = await sendCheckInReminderEventStart(event_id, contractor_id);

    res.json({
      success: true,
      message: 'Event start check-in reminder sent successfully',
      event_id,
      contractor_id,
      result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to send event start check-in reminder',
      error: error.message
    });
  }
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

// ==================== OUTBOUND TRIGGERS ====================
// These require authentication (n8n will call with API key via flexibleProtect in smsRoutes)

// Trigger speaker alert for contractor
router.post('/trigger-speaker-alert', asyncHandler(eventMessagingController.triggerSpeakerAlert));

// Trigger sponsor recommendation for contractor
router.post('/trigger-sponsor-recommendation', asyncHandler(eventMessagingController.triggerSponsorRecommendation));

// Trigger PCR request for contractor after session
router.post('/trigger-pcr-request', asyncHandler(eventMessagingController.triggerPCRRequest));

// ==================== EMAIL TRIGGERS ====================
// Event email orchestrator triggers - DATABASE-CHECKED: All field names verified

// Trigger registration confirmation email
router.post('/trigger-registration-confirmation', asyncHandler(eventMessagingController.triggerRegistrationConfirmation));

// Trigger profile completion reminder email
router.post('/trigger-profile-completion-reminder', asyncHandler(eventMessagingController.triggerProfileCompletionReminder));

// Trigger personalized agenda email
router.post('/trigger-personalized-agenda', asyncHandler(eventMessagingController.triggerPersonalizedAgenda));

// Trigger event summary email
router.post('/trigger-event-summary', asyncHandler(eventMessagingController.triggerEventSummary));

// ==================== EVENT REGISTRATION ====================
// Registration & onboarding - alternative entry point to TPX system

// Register contractor(s) for event (single or bulk)
router.post('/event/:eventId/register', asyncHandler(eventMessagingController.registerForEvent));

// Resend personalized agenda to contractor
router.post('/event/:eventId/contractor/:contractorId/resend-agenda', asyncHandler(eventMessagingController.resendAgenda));

// ==================== POST-EVENT WRAP-UP ====================
// Post-event engagement and follow-up workflows

// Trigger post-event wrap-up (all attendees or specific contractor via body.contractorId)
router.post('/event/:eventId/post-event-wrap-up', asyncHandler(eventMessagingController.triggerPostEventWrapUp));

// Resend post-event wrap-up to specific contractor
router.post('/event/:eventId/contractor/:contractorId/resend-wrap-up', asyncHandler(eventMessagingController.resendPostEventWrapUp));

module.exports = router;