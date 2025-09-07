const express = require('express');
const router = express.Router();
const podcastController = require('../controllers/podcastController');
const { protect } = require('../middleware/auth');

// All podcast routes require authentication
router.use(protect);

// Get all podcasts
router.get('/', podcastController.getAllPodcasts);

// Get single podcast
router.get('/:id', podcastController.getPodcast);

// Create new podcast
router.post('/', podcastController.createPodcast);

// Update podcast
router.put('/:id', podcastController.updatePodcast);

// Delete podcast
router.delete('/:id', podcastController.deletePodcast);

module.exports = router;