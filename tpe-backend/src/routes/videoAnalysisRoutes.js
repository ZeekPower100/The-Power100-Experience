const express = require('express');
const router = express.Router();
const { flexibleProtect: authenticateToken } = require('../middleware/flexibleAuth');
const videoAnalysisController = require('../controllers/videoAnalysisController');

// Protected routes - all require authentication
router.use(authenticateToken);

// Process video (trigger analysis)
router.post('/process', videoAnalysisController.processVideo);

// CRUD operations
router.post('/', videoAnalysisController.create);
router.get('/stats', videoAnalysisController.getStats);
router.get('/demos/high-quality', videoAnalysisController.getHighQualityDemos);
router.get('/testimonials/authentic', videoAnalysisController.getAuthenticTestimonials);
router.get('/type/:type', videoAnalysisController.getByType);
router.get('/video/:videoId', videoAnalysisController.getByVideoId);
router.get('/:id', videoAnalysisController.getById);
router.put('/:id', videoAnalysisController.update);
router.delete('/:id', videoAnalysisController.delete);

module.exports = router;