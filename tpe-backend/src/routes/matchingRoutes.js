const express = require('express');
const router = express.Router();
const matchingController = require('../controllers/matchingController');

// Get matched content for a contractor (books, podcasts, events, partners)
router.get('/contractors/:contractorId/matches/all', matchingController.getMatchedContent);

// Individual resource endpoints
router.get('/books', matchingController.getBooks);
router.get('/podcasts', matchingController.getPodcasts);
router.get('/events', matchingController.getEvents);

// Admin routes (protected)
// Add admin routes here if needed for managing books, podcasts, events

module.exports = router;