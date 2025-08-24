// Verification Routes - SMS verification code handling
const express = require('express');
const router = express.Router();
const {
  sendVerificationCode,
  verifyCode,
  resendVerificationCode,
  handleVerificationReply
} = require('../controllers/verificationController');

// Send verification code to contractor
// POST /api/verification/send
router.post('/send', sendVerificationCode);

// Verify code entered by contractor
// POST /api/verification/verify
router.post('/verify', verifyCode);

// Resend verification code
// POST /api/verification/resend
router.post('/resend', resendVerificationCode);

// Webhook for SMS replies (no auth for GHL webhooks)
// POST /api/verification/webhook/reply
router.post('/webhook/reply', handleVerificationReply);

module.exports = router;