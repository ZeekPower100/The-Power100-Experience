const express = require('express');
const router = express.Router();
const podcastController = require('../controllers/podcastController');
const { protect } = require('../middleware/auth');

// Public routes (for submissions)
router.post('/submit', podcastController.createPodcast);

// Protected routes
router.use(protect);

// Get pending podcasts (must come before /:id)
router.get('/pending', podcastController.getPendingPodcasts);

// Get all podcasts
router.get('/', podcastController.getAllPodcasts);

// Approve podcast
router.put('/:id/approve', podcastController.approvePodcast);

// Get single podcast
router.get('/:id', podcastController.getPodcast);

// Update podcast
router.put('/:id', podcastController.updatePodcast);

// Delete podcast
router.delete('/:id', podcastController.deletePodcast);

module.exports = router;