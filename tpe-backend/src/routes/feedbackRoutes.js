// PowerConfidence Feedback System Routes
const express = require('express');
const router = express.Router();
const {
  getFeedbackSurveys,
  createFeedbackSurvey,
  submitFeedbackResponse,
  getPartnerFeedbackAnalytics,
  updatePowerConfidenceScores,
  getPartnerPerformanceDashboard
} = require('../controllers/feedbackController.simple');

const { authenticateAdmin } = require('../middleware/auth');

// Public routes (no authentication required)
router.post('/submit-response', submitFeedbackResponse); // Public feedback submission

// Admin-only routes
router.use(authenticateAdmin); // Apply admin authentication to all routes below

// Feedback surveys management
router.get('/surveys', getFeedbackSurveys);
router.post('/surveys', createFeedbackSurvey);

// Partner feedback analytics
router.get('/analytics/partner/:partnerId', getPartnerFeedbackAnalytics);
router.get('/analytics/dashboard', getPartnerPerformanceDashboard);

// PowerConfidence score management
router.post('/powerconfidence/update', updatePowerConfidenceScores);

module.exports = router;