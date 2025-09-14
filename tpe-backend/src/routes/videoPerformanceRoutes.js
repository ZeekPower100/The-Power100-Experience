const express = require('express');
const router = express.Router();
const { flexibleProtect: authenticateToken } = require('../middleware/flexibleAuth');
const videoPerformanceController = require('../controllers/videoPerformanceController');

// Protected routes - all require authentication
router.use(authenticateToken);

// CRUD operations
router.post('/', videoPerformanceController.create);
router.get('/stats', videoPerformanceController.getStats);
router.get('/top-performers', videoPerformanceController.getTopPerformers);
router.get('/high-engagement', videoPerformanceController.getHighEngagement);
router.get('/video/:videoId', videoPerformanceController.getByVideoId);
router.get('/video/:videoId/find-or-create', videoPerformanceController.findOrCreate);
router.get('/:id', videoPerformanceController.getById);
router.put('/:id', videoPerformanceController.update);
router.delete('/:id', videoPerformanceController.delete);

// Performance tracking endpoints
router.post('/video/:videoId/view', videoPerformanceController.incrementView);
router.post('/video/:videoId/feedback', videoPerformanceController.addFeedback);
router.post('/video/:videoId/conversion', videoPerformanceController.recordConversion);
router.post('/video/:videoId/demo-request', videoPerformanceController.recordDemoRequest);
router.patch('/video/:videoId/engagement', videoPerformanceController.updateEngagement);

module.exports = router;