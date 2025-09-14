const express = require('express');
const router = express.Router();
const podcastTopicsController = require('../controllers/podcastTopicsController');
const { flexibleProtect: authenticateToken } = require('../middleware/flexibleAuth');

// All routes require authentication
router.use(authenticateToken);

// POST / - create topic
router.post('/', podcastTopicsController.create);

// GET / - get all topics
router.get('/', podcastTopicsController.getAll);

// GET /:id - get topic by id
router.get('/:id', podcastTopicsController.getById);

// GET /trending - get trending topics
router.get('/trending', podcastTopicsController.getTrending);

// PUT /:id - update topic
router.put('/:id', podcastTopicsController.update);

// DELETE /:id - delete topic
router.delete('/:id', podcastTopicsController.delete);

module.exports = router;