const express = require('express');
const router = express.Router();
const recommendationController = require('../controllers/recommendationController');
const { flexibleProtect } = require('../middleware/flexibleAuth');

// Generate recommendations for a contractor
router.get('/contractors/:contractor_id/recommendations', flexibleProtect, recommendationController.generateRecommendations);

// Contractor preferences
router.get('/contractors/:contractor_id/preferences', flexibleProtect, recommendationController.getPreferences);
router.put('/contractors/:contractor_id/preferences', flexibleProtect, recommendationController.updatePreferences);

// Trending content
router.get('/trending', flexibleProtect, recommendationController.getTrending);

// Similar content
router.get('/similar/:entity_type/:entity_id', flexibleProtect, recommendationController.getSimilarContent);

// Track recommendation interactions
router.post('/recommendations/:recommendation_id/track', flexibleProtect, recommendationController.trackInteraction);

// Configuration management (admin only)
router.get('/config', flexibleProtect, recommendationController.getConfig);
router.get('/config/:config_name', flexibleProtect, recommendationController.getConfig);
router.put('/config/:config_name', flexibleProtect, recommendationController.updateConfig);

// Background job triggers (admin only)
router.post('/calculate-similarities', flexibleProtect, recommendationController.calculateSimilarities);
router.post('/update-trending', flexibleProtect, recommendationController.updateTrending);

// Performance metrics
router.get('/metrics', flexibleProtect, recommendationController.getPerformanceMetrics);

module.exports = router;