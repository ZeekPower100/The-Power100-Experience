// GHL Sync Routes - Handle contact synchronization and SMS campaigns
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  syncAllContactsToGHL,
  sendTargetedSMS
} = require('../controllers/ghlSyncController');

// Sync all contacts (contractors, partners, employees) to GHL
// GET /api/ghl-sync/contacts - Returns formatted contact data for GHL
router.get('/contacts', protect, syncAllContactsToGHL);

// Send targeted SMS campaigns
// POST /api/ghl-sync/sms - Send SMS to specific contact groups
router.post('/sms', protect, sendTargetedSMS);

// Webhook endpoint for n8n to trigger actual GHL API calls
// POST /api/ghl-sync/webhook-trigger - No auth for n8n webhooks
router.post('/webhook-trigger', (req, res) => {
  console.log('🔄 n8n webhook trigger received:', req.body);
  
  // n8n will send the contact data here to actually sync to GHL
  const { contacts, action } = req.body;
  
  if (!contacts || !Array.isArray(contacts)) {
    return res.status(400).json({
      success: false,
      error: 'contacts array is required'
    });
  }
  
  res.json({
    success: true,
    message: `Received ${contacts.length} contacts for ${action || 'sync'}`,
    processed: contacts.length,
    timestamp: new Date().toISOString()
  });
});

module.exports = router;