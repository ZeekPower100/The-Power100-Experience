// Communication Routes - Webhook endpoints for n8n/GHL integration
const express = require('express');
const router = express.Router();
const {
  receiveCommunication,
  getContractorCommunications,
  updateMessageStatus
} = require('../controllers/communicationController');
const { protect } = require('../middleware/auth');

// Webhook endpoint (no auth required for webhooks)
router.post('/webhook', receiveCommunication);

// Update message status (webhook)
router.post('/status/:messageId', updateMessageStatus);

// Protected endpoints
router.get('/contractor/:contractorId', protect, getContractorCommunications);

module.exports = router;