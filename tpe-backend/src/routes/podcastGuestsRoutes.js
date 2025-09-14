const express = require('express');
const router = express.Router();
const podcastGuestsController = require('../controllers/podcastGuestsController');
const { flexibleProtect: authenticateToken } = require('../middleware/flexibleAuth');

// All routes require authentication
router.use(authenticateToken);

// POST / - create guest
router.post('/', podcastGuestsController.create);

// GET / - get all guests
router.get('/', podcastGuestsController.getAll);

// GET /:id - get guest by id
router.get('/:id', podcastGuestsController.getById);

// POST /search - search guests
router.post('/search', podcastGuestsController.search);

// GET /top - get top guests
router.get('/top', podcastGuestsController.getTop);

// PUT /:id - update guest
router.put('/:id', podcastGuestsController.update);

// DELETE /:id - delete guest
router.delete('/:id', podcastGuestsController.delete);

module.exports = router;