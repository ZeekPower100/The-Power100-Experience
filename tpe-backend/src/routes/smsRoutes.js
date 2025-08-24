// SMS Campaign Routes (Placeholder for PowerConfidence Dashboard)
const express = require('express');
const router = express.Router();
const {
  getSmsCampaigns,
  createSmsCampaign,
  launchSmsCampaign,
  getSmsAnalytics
} = require('../controllers/feedbackController.simple');

const { protect } = require('../middleware/auth');

// All SMS routes require authentication
router.use(protect);

// SMS Campaigns
router.get('/campaigns', getSmsCampaigns);
router.post('/campaigns', createSmsCampaign);
router.post('/campaigns/:id/launch', launchSmsCampaign);

// SMS Analytics  
router.get('/analytics', getSmsAnalytics);

module.exports = router;