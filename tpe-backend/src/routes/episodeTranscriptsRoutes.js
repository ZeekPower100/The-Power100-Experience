const express = require('express');
const router = express.Router();
const episodeTranscriptsController = require('../controllers/episodeTranscriptsController');
const { flexibleProtect: authenticateToken } = require('../middleware/flexibleAuth');

// All routes require authentication
router.use(authenticateToken);

// POST / - create transcript
router.post('/', episodeTranscriptsController.create);

// GET /:id - get transcript by id
router.get('/:id', episodeTranscriptsController.getById);

// GET /episode/:episodeId - get by episode
router.get('/episode/:episodeId', episodeTranscriptsController.getByEpisodeId);

// PUT /:id/status - update status
router.put('/:id/status', episodeTranscriptsController.updateStatus);

// POST /search - search transcripts
router.post('/search', episodeTranscriptsController.search);

// PUT /:id - update transcript
router.put('/:id', episodeTranscriptsController.update);

// DELETE /:id - delete transcript
router.delete('/:id', episodeTranscriptsController.delete);

module.exports = router;