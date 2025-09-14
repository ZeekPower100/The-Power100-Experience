const express = require('express');
const router = express.Router();
const { flexibleProtect: authenticateToken } = require('../middleware/flexibleAuth');
const videoContentController = require('../controllers/videoContentController');

// Public routes (if any)

// Protected routes
router.use(authenticateToken); // Apply authentication to all routes below

// CRUD operations
router.post('/', videoContentController.create);
router.get('/', videoContentController.getAll);
router.get('/stats', videoContentController.getStats);
router.get('/active', videoContentController.getActive);
router.get('/pending', videoContentController.getPending);
router.get('/status/:status', videoContentController.getByStatus);
router.get('/type/:type', videoContentController.getByType);
router.get('/entity/:entity_type/:entity_id', videoContentController.getByEntity);
router.get('/:id', videoContentController.getById);
router.put('/:id', videoContentController.update);
router.patch('/:id/status', videoContentController.updateStatus);
router.delete('/:id', videoContentController.delete);

module.exports = router;