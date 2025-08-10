// SMS Campaign and Subscription Routes
const express = require('express');
const router = express.Router();
const {
  getSmsSubscriptions,
  createSmsSubscription,
  handleSmsOptOut,
  getSmsCampaigns,
  createSmsCampaign,
  launchSmsCampaign,
  getSmsAnalytics
} = require('../controllers/smsController');

const { authenticateAdmin } = require('../middleware/auth');

// Public routes (no authentication required)
router.post('/opt-out', handleSmsOptOut); // Public opt-out endpoint

// Admin-only routes
router.use(authenticateAdmin); // Apply admin authentication to all routes below

// SMS subscriptions management
router.get('/subscriptions', getSmsSubscriptions);
router.post('/subscriptions', createSmsSubscription);

// SMS campaigns management
router.get('/campaigns', getSmsCampaigns);
router.post('/campaigns', createSmsCampaign);
router.post('/campaigns/:campaignId/launch', launchSmsCampaign);

// SMS analytics
router.get('/analytics', getSmsAnalytics);

module.exports = router;