const express = require('express');
const router = express.Router();
const { flexibleProtect: authenticateToken } = require('../middleware/flexibleAuth');
const demoSegmentsController = require('../controllers/demoSegmentsController');

// Protected routes - all require authentication
router.use(authenticateToken);

// CRUD operations
router.post('/', demoSegmentsController.create);
router.post('/batch', demoSegmentsController.createBatch);
router.get('/high-scoring', demoSegmentsController.getHighScoring);
router.get('/needing-improvement', demoSegmentsController.getNeedingImprovement);
router.get('/type/:type', demoSegmentsController.getByType);
router.get('/video/:videoId', demoSegmentsController.getByVideoId);
router.get('/video/:videoId/stats', demoSegmentsController.getStats);
router.get('/:id', demoSegmentsController.getById);
router.put('/:id', demoSegmentsController.update);
router.delete('/:id', demoSegmentsController.delete);
router.delete('/video/:videoId', demoSegmentsController.deleteByVideoId);

module.exports = router;