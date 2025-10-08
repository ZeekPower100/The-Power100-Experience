const proactiveSchedulerService = require('../services/proactiveSchedulerService');

/**
 * Scheduler Controller
 * Handles proactive follow-up scheduling endpoints
 */

/**
 * Trigger scheduler to process due follow-ups
 * POST /api/scheduler/process
 */
async function processScheduledFollowUps(req, res) {
  try {
    console.log('[SchedulerController] Processing scheduled follow-ups...');

    const results = await proactiveSchedulerService.processDueFollowUps();

    res.status(200).json({
      success: true,
      message: 'Follow-ups processed successfully',
      results
    });

  } catch (error) {
    console.error('[SchedulerController] Error processing follow-ups:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Get scheduler statistics
 * GET /api/scheduler/stats
 */
async function getSchedulerStats(req, res) {
  try {
    const stats = await proactiveSchedulerService.getSchedulerStats();

    res.status(200).json({
      success: true,
      stats
    });

  } catch (error) {
    console.error('[SchedulerController] Error getting stats:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Get due follow-ups (without sending)
 * GET /api/scheduler/due
 */
async function getDueFollowUps(req, res) {
  try {
    const followUps = await proactiveSchedulerService.getDueFollowUps();

    res.status(200).json({
      success: true,
      count: followUps.length,
      followUps
    });

  } catch (error) {
    console.error('[SchedulerController] Error getting due follow-ups:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

module.exports = {
  processScheduledFollowUps,
  getSchedulerStats,
  getDueFollowUps
};
