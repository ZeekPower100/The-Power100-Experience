const express = require('express');
const router = express.Router();
const eventCheckInController = require('../controllers/eventCheckInController');
const { protect } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * Event Check-In Routes
 * All routes require authentication
 */

// Public endpoints (for QR code scanning)
router.post('/check-in', asyncHandler(eventCheckInController.checkInAttendee));

// Protected endpoints
router.use(protect);

// Registration
router.post('/register', asyncHandler(eventCheckInController.registerAttendee));

// Mass check-in (admin only - for stage coordination)
router.post('/mass-check-in', asyncHandler(eventCheckInController.massCheckIn));

// Profile completion
router.post('/complete-profile', asyncHandler(eventCheckInController.completeProfile));

// Get attendees
router.get('/event/:eventId/attendees', asyncHandler(eventCheckInController.getEventAttendees));

module.exports = router;