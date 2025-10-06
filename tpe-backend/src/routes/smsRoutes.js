// SMS Campaign Routes & Event Orchestration
const express = require('express');
const router = express.Router();
const {
  getSmsCampaigns,
  createSmsCampaign,
  launchSmsCampaign,
  getSmsAnalytics,
  handleInbound,
  sendOutbound
} = require('../controllers/smsController');

const { protect } = require('../middleware/auth');
const { flexibleProtect } = require('../middleware/flexibleAuth');

// Event orchestration routes (n8n webhook access with API key)
router.post('/inbound', flexibleProtect, handleInbound);
router.post('/outbound', flexibleProtect, sendOutbound);

// SMS Campaign routes require authentication
router.use(protect);

// SMS Campaigns
router.get('/campaigns', getSmsCampaigns);
router.post('/campaigns', createSmsCampaign);
router.post('/campaigns/:id/launch', launchSmsCampaign);

// SMS Analytics
router.get('/analytics', getSmsAnalytics);

module.exports = router;