const express = require('express');
const router = express.Router();
const pcrAdminController = require('../controllers/pcrAdminController');

// Campaign processing
router.post('/power-cards/campaigns/:id/process', pcrAdminController.processCampaign);

// Analytics endpoints
router.get('/pcr/momentum-distribution', pcrAdminController.getMomentumDistribution);
router.get('/pcr/badge-distribution', pcrAdminController.getBadgeDistribution);
router.get('/pcr/performance-trends', pcrAdminController.getPerformanceTrends);

module.exports = router;
