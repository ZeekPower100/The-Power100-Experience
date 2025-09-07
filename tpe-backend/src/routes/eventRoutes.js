const express = require('express');
const router = express.Router();
const eventController = require('../controllers/eventController');
const { protect } = require('../middleware/auth');

// All event routes require authentication
router.use(protect);

// Get all events
router.get('/', eventController.getAllEvents);

// Get single event
router.get('/:id', eventController.getEvent);

// Create new event
router.post('/', eventController.createEvent);

// Update event
router.put('/:id', eventController.updateEvent);

// Delete event
router.delete('/:id', eventController.deleteEvent);

module.exports = router;