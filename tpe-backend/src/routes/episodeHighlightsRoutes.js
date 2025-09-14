const express = require('express');
const router = express.Router();
const episodeHighlightsController = require('../controllers/episodeHighlightsController');
const { flexibleProtect: authenticateToken } = require('../middleware/flexibleAuth');

// All routes require authentication
router.use(authenticateToken);

// POST / - create highlight
router.post('/', episodeHighlightsController.create);

// GET /:id - get highlight by id
router.get('/:id', episodeHighlightsController.getById);

// GET /episode/:episodeId - get by episode
router.get('/episode/:episodeId', episodeHighlightsController.getByEpisodeId);

// GET /type/:type - get by type
router.get('/type/:type', episodeHighlightsController.getByType);

// GET /top - get top highlights
router.get('/top', episodeHighlightsController.getTop);

// PUT /:id - update highlight
router.put('/:id', episodeHighlightsController.update);

// DELETE /:id - delete highlight
router.delete('/:id', episodeHighlightsController.delete);

module.exports = router;