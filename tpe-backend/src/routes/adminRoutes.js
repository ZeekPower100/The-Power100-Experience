const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const adminController = require('../controllers/adminController');
const { asyncHandler } = require('../middleware/errorHandler');
const { getRealtimeMetrics, getHistoricalMetrics, resetMetricsCache } = require('../services/routingMetrics');

// All admin routes are protected
router.use(protect);

// Dashboard stats
router.get('/dashboard', asyncHandler(adminController.getDashboardStats));

// Routing metrics endpoints
router.get('/routing-metrics/realtime', asyncHandler(async (req, res) => {
  const metrics = getRealtimeMetrics();
  res.json({
    success: true,
    data: metrics
  });
}));

router.get('/routing-metrics/historical', asyncHandler(async (req, res) => {
  const hours = parseInt(req.query.hours) || 24;
  const metrics = await getHistoricalMetrics(hours);
  res.json({
    success: true,
    data: metrics
  });
}));

router.post('/routing-metrics/reset', asyncHandler(async (req, res) => {
  resetMetricsCache();
  res.json({
    success: true,
    message: 'Metrics cache reset successfully'
  });
}));

// Export data
router.get('/export/contractors', asyncHandler(adminController.exportContractors));
router.get('/export/partners', asyncHandler(adminController.exportPartners));
router.get('/export/bookings', asyncHandler(adminController.exportBookings));

module.exports = router;