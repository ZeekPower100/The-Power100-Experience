const express = require('express');
const router = express.Router();
const adminControlsController = require('../controllers/adminControlsController');
const { protect } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * Admin Controls Routes
 * Unified API for CEO/Admin event controls (web + SMS)
 */

// SMS Command Endpoints - NO authentication required (used by n8n)
router.post('/sms-command', asyncHandler(adminControlsController.executeSMSCommand));
router.post('/verify-admin', asyncHandler(adminControlsController.verifyAdmin));
router.post('/log-sms-command', asyncHandler(adminControlsController.logSMSCommand));

// All other routes require authentication
router.use(protect);

// Custom Admin Message
router.post('/custom-message', asyncHandler(adminControlsController.sendCustomMessage));

// Event Status
router.get('/event-status/:eventId', asyncHandler(adminControlsController.getEventStatus));

// Manual Check-In
router.post('/manual-checkin', asyncHandler(adminControlsController.manualCheckIn));

// Cancel Messages
router.post('/cancel-messages', asyncHandler(adminControlsController.cancelMessages));

// Event Control Center Endpoints
router.get('/active-events', asyncHandler(adminControlsController.getActiveEvents));
router.get('/event-message-stats', asyncHandler(adminControlsController.getEventMessageStats));
router.get('/recent-commands', asyncHandler(adminControlsController.getRecentSMSCommands));

// Event Detail Page Endpoints
router.get('/event/:eventId', asyncHandler(adminControlsController.getEventDetails));
router.get('/event/:eventId/messages', asyncHandler(adminControlsController.getEventMessageHistory));
router.get('/event/:eventId/upcoming', asyncHandler(adminControlsController.getUpcomingMessages));
router.get('/event/:eventId/failed', asyncHandler(adminControlsController.getFailedMessages));

module.exports = router;
