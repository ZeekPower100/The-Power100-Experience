const express = require('express');
const router = express.Router();
const { getLivePCRs } = require('../controllers/livePCRController');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * Live PCR Rankings Routes
 * Public-facing partner quality rankings
 * No authentication required - fully public
 */

// Get live PCR rankings with optional filters
// Query params: focus_area, revenue_range, feedback_min
router.get('/', asyncHandler(getLivePCRs));

module.exports = router;
