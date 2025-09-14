const express = require('express');
const router = express.Router();
const podcastShowsController = require('../controllers/podcastShowsController');
const { flexibleProtect: authenticateToken } = require('../middleware/flexibleAuth');

// All routes require authentication
router.use(authenticateToken);

// POST / - create show
router.post('/', podcastShowsController.create);

// GET / - get all shows
router.get('/', podcastShowsController.getAll);

// GET /:id - get show by id
router.get('/:id', podcastShowsController.getById);

// GET /category/:category - get by category
router.get('/category/:category', podcastShowsController.getByCategory);

// PUT /:id - update show
router.put('/:id', podcastShowsController.update);

// DELETE /:id - delete show
router.delete('/:id', podcastShowsController.delete);

module.exports = router;