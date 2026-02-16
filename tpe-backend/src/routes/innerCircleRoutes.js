// DATABASE-CHECKED: inner_circle_members verified 2026-02-16
const express = require('express');
const router = express.Router();
const innerCircleController = require('../controllers/innerCircleController');
const { promptInjectionGuard } = require('../middleware/promptInjectionGuard');
const { memberConciergeRateLimiter } = require('../config/security');

// All Inner Circle routes use prompt injection guard on message input
// and per-member rate limiting

/**
 * @route   POST /api/inner-circle/message
 * @desc    Send a message to the Inner Circle AI Concierge
 * @access  Member (via WordPress portal token — auth TBD in Phase 2)
 */
router.post('/message', memberConciergeRateLimiter, promptInjectionGuard, innerCircleController.sendMessage);

/**
 * @route   GET /api/inner-circle/conversations
 * @desc    Get conversation history for a member
 * @access  Member
 */
router.get('/conversations', innerCircleController.getConversations);

/**
 * @route   GET /api/inner-circle/profile
 * @desc    Get member profile (what the concierge knows about them)
 * @access  Member
 */
router.get('/profile', innerCircleController.getProfile);

/**
 * @route   GET /api/inner-circle/sessions
 * @desc    Get member's concierge sessions
 * @access  Member
 */
router.get('/sessions', innerCircleController.getSessions);

/**
 * @route   POST /api/inner-circle/session/:session_id/end
 * @desc    End an active session
 * @access  Member
 */
router.post('/session/:session_id/end', innerCircleController.endSessionHandler);

// Development test route
if (process.env.NODE_ENV === 'development') {
  router.get('/test', (req, res) => {
    res.json({
      success: true,
      message: 'Inner Circle API is working',
      endpoints: [
        'POST /api/inner-circle/message',
        'GET /api/inner-circle/conversations?member_id=X',
        'GET /api/inner-circle/profile?member_id=X',
        'GET /api/inner-circle/sessions?member_id=X',
        'POST /api/inner-circle/session/:session_id/end'
      ]
    });
  });
}

module.exports = router;
