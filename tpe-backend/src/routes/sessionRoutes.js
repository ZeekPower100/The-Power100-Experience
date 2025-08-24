const express = require('express');
const sessionController = require('../controllers/sessionController');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

// Create contractor session
router.post('/create', asyncHandler(sessionController.createSession));

// Restore contractor session
router.post('/restore', asyncHandler(sessionController.restoreSession));

// Refresh contractor session token
router.post('/refresh', asyncHandler(sessionController.refreshSession));

// Clear contractor session
router.post('/clear', asyncHandler(sessionController.clearSession));

module.exports = router;