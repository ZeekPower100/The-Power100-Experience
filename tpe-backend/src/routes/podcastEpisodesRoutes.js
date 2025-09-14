const express = require('express');
const router = express.Router();
const podcastEpisodesController = require('../controllers/podcastEpisodesController');
const { flexibleProtect: authenticateToken } = require('../middleware/flexibleAuth');

// All routes require authentication
router.use(authenticateToken);

// POST / - create episode
router.post('/', podcastEpisodesController.create);

// GET /:id - get episode by id
router.get('/:id', podcastEpisodesController.getById);

// GET /show/:showId - get episodes by show
router.get('/show/:showId', podcastEpisodesController.getByShowId);

// GET /recent - get recent episodes
router.get('/recent', podcastEpisodesController.getRecent);

// GET /guest/:guestName - get by guest
router.get('/guest/:guestName', podcastEpisodesController.getByGuest);

// PUT /:id - update episode
router.put('/:id', podcastEpisodesController.update);

// DELETE /:id - delete episode
router.delete('/:id', podcastEpisodesController.delete);

module.exports = router;