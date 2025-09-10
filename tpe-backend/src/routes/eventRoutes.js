const express = require('express');
const router = express.Router();
const eventController = require('../controllers/eventController');
const { protect } = require('../middleware/auth');

// Public routes (for submissions)
router.post('/submit', eventController.createEvent);

// Protected routes
router.use(protect);

// Get pending events (must come before /:id)
router.get('/pending', eventController.getPendingEvents);

// Get all events
router.get('/', eventController.getAllEvents);

// Approve event
router.put('/:id/approve', eventController.approveEvent);

// Get single event
router.get('/:id', eventController.getEvent);

// Update event
router.put('/:id', eventController.updateEvent);

// Delete event
router.delete('/:id', eventController.deleteEvent);

module.exports = router;