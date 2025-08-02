const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const bookingController = require('../controllers/bookingController');
const { asyncHandler } = require('../middleware/errorHandler');

// Protected routes (admin only)
router.use(protect);
router.get('/', asyncHandler(bookingController.getAllBookings));
router.get('/:id', asyncHandler(bookingController.getBooking));
router.put('/:id', asyncHandler(bookingController.updateBooking));
router.delete('/:id', asyncHandler(bookingController.deleteBooking));
router.get('/stats/overview', asyncHandler(bookingController.getBookingStats));

module.exports = router;