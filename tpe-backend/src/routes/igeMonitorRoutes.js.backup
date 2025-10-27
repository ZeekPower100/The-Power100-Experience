// ============================================================================
// IGE Monitor Routes
// ============================================================================
// PURPOSE: API routes for Internal Goal Engine monitoring dashboard
// ============================================================================

const express = require('express');
const router = express.Router();
const igeMonitorController = require('../controllers/igeMonitorController');

// System Overview Routes
router.get('/system-health', igeMonitorController.getSystemHealth);
router.get('/recent-activity', igeMonitorController.getRecentActivity);
router.get('/system-alerts', igeMonitorController.getSystemAlerts);

// Contractor IGE Routes
router.get('/contractor/:id/summary', igeMonitorController.getContractorIGESummary);
router.get('/contractor/:id/goals', igeMonitorController.getContractorGoals);
router.get('/contractor/:id/messages', igeMonitorController.getContractorMessages);
router.get('/contractor/:id/questions', igeMonitorController.getContractorQuestions);
router.get('/contractor/:id/trust-timeline', igeMonitorController.getContractorTrustTimeline);

// Entity Detail Routes
router.get('/goal/:id', igeMonitorController.getGoalDetail);
router.get('/message/:id', igeMonitorController.getMessageDetail);
router.get('/question/:id', igeMonitorController.getQuestionDetail);

module.exports = router;
