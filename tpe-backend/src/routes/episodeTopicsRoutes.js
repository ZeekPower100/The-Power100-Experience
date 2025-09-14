const express = require('express');
const router = express.Router();
const episodeTopicsController = require('../controllers/episodeTopicsController');
const { flexibleProtect: authenticateToken } = require('../middleware/flexibleAuth');

// All routes require authentication
router.use(authenticateToken);

// POST / - create episode-topic link
router.post('/', episodeTopicsController.create);

// GET /:id - get by id
router.get('/:id', episodeTopicsController.getById);

// GET /episode/:episodeId - get by episode
router.get('/episode/:episodeId', episodeTopicsController.getByEpisodeId);

// GET /relevance/:threshold - get by relevance
router.get('/relevance/:threshold', episodeTopicsController.getByRelevance);

// PUT /:id - update link
router.put('/:id', episodeTopicsController.update);

// DELETE /:id - delete link
router.delete('/:id', episodeTopicsController.delete);

module.exports = router;