const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const adminController = require('../controllers/adminController');
const { asyncHandler } = require('../middleware/errorHandler');

// All admin routes are protected
router.use(protect);

// Dashboard stats
router.get('/dashboard', asyncHandler(adminController.getDashboardStats));

// Export data
router.get('/export/contractors', asyncHandler(adminController.exportContractors));
router.get('/export/partners', asyncHandler(adminController.exportPartners));
router.get('/export/bookings', asyncHandler(adminController.exportBookings));

module.exports = router;