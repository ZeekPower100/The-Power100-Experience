const express = require('express');
const router = express.Router();
const schedulerController = require('../controllers/schedulerController');

/**
 * Scheduler Routes
 * Endpoints for proactive follow-up scheduling
 */

// POST /api/scheduler/process - Process all due follow-ups
router.post('/process', schedulerController.processScheduledFollowUps);

// GET /api/scheduler/stats - Get scheduler statistics
router.get('/stats', schedulerController.getSchedulerStats);

// GET /api/scheduler/due - Get due follow-ups (without sending)
router.get('/due', schedulerController.getDueFollowUps);

module.exports = router;
