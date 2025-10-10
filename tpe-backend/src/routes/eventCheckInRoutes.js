const express = require('express');
const router = express.Router();
const eventCheckInController = require('../controllers/eventCheckInController');
const { protect } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * Event Check-In Routes
 * All routes require authentication
 */

// Public endpoints (for QR code scanning and event profile pages)
router.post('/check-in', asyncHandler(eventCheckInController.checkInAttendee));
router.post('/complete-profile', asyncHandler(eventCheckInController.completeProfile)); // Needed for profile page
router.get('/attendee', asyncHandler(eventCheckInController.getAttendeeInfo)); // Needed for profile page

// Protected endpoints
router.use(protect);

// Registration
router.post('/register', asyncHandler(eventCheckInController.registerAttendee));

// Mass check-in (admin only - for stage coordination)
router.post('/mass-check-in', asyncHandler(eventCheckInController.massCheckIn));

// Get attendees
router.get('/event/:eventId/attendees', asyncHandler(eventCheckInController.getEventAttendees));

module.exports = router;