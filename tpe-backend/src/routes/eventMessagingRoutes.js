const express = require('express');
const router = express.Router();
const eventMessagingController = require('../controllers/eventMessagingController');
const { protect } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * Event Messaging Routes
 * All routes require authentication
 */

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

module.exports = router;