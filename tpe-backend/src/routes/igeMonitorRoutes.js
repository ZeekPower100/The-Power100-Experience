// ============================================================================
// IGE Monitor Routes
// ============================================================================
// PURPOSE: API routes for Internal Goal Engine monitoring dashboard
// ============================================================================

const express = require('express');
const router = express.Router();
const igeMonitorController = require('../controllers/igeMonitorController');
const igeContractorSearch = require('../controllers/igeContractorSearch');
const igeContractorDetail = require('../controllers/igeContractorDetail');
const igeManualGoalController = require('../controllers/igeManualGoalController');
const igeManualActionController = require('../controllers/igeManualActionController');
const igeManualMessageController = require('../controllers/igeManualMessageController');
const igeManualTrustController = require('../controllers/igeManualTrustController');
const igeBulkOperationsController = require('../controllers/igeBulkOperationsController');
const igeAnalyticsController = require('../controllers/igeAnalyticsController');

// System Overview Routes
router.get('/system-health', igeMonitorController.getSystemHealth);
router.get('/recent-activity', igeMonitorController.getRecentActivity);
router.get('/system-alerts', igeMonitorController.getSystemAlerts);

// Contractor Search Route (Phase 2)
router.get('/contractors/search', igeContractorSearch.searchContractors);
// Contractor Detail Route (Phase 2)
router.get('/contractor/:id', igeContractorDetail.getContractorDetail);
// ============================================================================
// PHASE 3A: Manual IGE Operations & Bulk Actions
// ============================================================================

// Manual Goal Operations
router.post('/contractor/:id/goal', igeManualGoalController.createGoal);
router.put('/goal/:id', igeManualGoalController.updateGoal);
router.delete('/goal/:id', igeManualGoalController.deleteGoal);

// Manual Action Operations
router.post('/contractor/:id/action', igeManualActionController.createAction);
router.put('/action/:id', igeManualActionController.updateAction);
router.delete('/action/:id', igeManualActionController.deleteAction);

// Manual Message Operations
router.post('/contractor/:id/message', igeManualMessageController.sendMessage);
router.put('/message/:id', igeManualMessageController.updateMessage);
router.delete('/message/:id', igeManualMessageController.deleteMessage);

// Manual Trust Adjustments
router.post('/contractor/:id/trust-adjustment', igeManualTrustController.adjustTrust);
router.get('/contractor/:id/trust-history', igeManualTrustController.getTrustHistory);

// Bulk Operations
router.post('/bulk/message', igeBulkOperationsController.bulkMessage);
router.post('/bulk/goal', igeBulkOperationsController.bulkGoal);
router.post('/bulk/action', igeBulkOperationsController.bulkAction);




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

// ============================================================================
// PHASE 3B: Analytics & Reporting
// ============================================================================

// System-Wide Analytics
router.get('/analytics/overview', igeAnalyticsController.getOverview);
router.get('/analytics/goals/summary', igeAnalyticsController.getGoalsSummary);
router.get('/analytics/actions/summary', igeAnalyticsController.getActionsSummary);
router.get('/analytics/messages/summary', igeAnalyticsController.getMessagesSummary);
router.get('/analytics/trust/summary', igeAnalyticsController.getTrustSummary);

// Time-Series Trends
router.get('/analytics/trends/:metric', igeAnalyticsController.getTrends);

// Contractor Segmentation
router.get('/analytics/segments/by-trust', igeAnalyticsController.getSegmentsByTrust);
router.get('/analytics/segments/by-engagement', igeAnalyticsController.getSegmentsByEngagement);

module.exports = router;
