/**
 * AI Behavioral Tracking Routes
 * API endpoints for AI-powered contractor insights and analytics
 */

const express = require('express');
const router = express.Router();
const aiTrackingController = require('../controllers/aiTrackingController');
const { protect } = require('../middleware/auth');

// All routes require authentication
router.use(protect);

// ==========================================
// ENGAGEMENT EVENT TRACKING
// ==========================================

// Track single engagement event
router.post('/contractors/:contractor_id/events', aiTrackingController.trackEvent);

// Track bulk events
router.post('/contractors/:contractor_id/events/bulk', aiTrackingController.trackBulkEvents);

// ==========================================
// BUSINESS GOALS & CHALLENGES
// ==========================================

// Manage business goals
router.post('/contractors/:contractor_id/goals', aiTrackingController.upsertBusinessGoals);

// Track challenges
router.post('/contractors/:contractor_id/challenges', aiTrackingController.trackChallenges);

// ==========================================
// RECOMMENDATIONS & CONTENT
// ==========================================

// Track recommendations
router.post('/contractors/:contractor_id/recommendations', aiTrackingController.trackRecommendation);

// Update recommendation engagement
router.patch('/recommendations/:recommendation_id/engagement', aiTrackingController.updateRecommendationEngagement);

// Track content engagement
router.post('/contractors/:contractor_id/content-engagement', aiTrackingController.trackContentEngagement);

// ==========================================
// ANALYTICS & INSIGHTS
// ==========================================

// Get complete AI profile for contractor
router.get('/contractors/:contractor_id/ai-profile', aiTrackingController.getContractorAIProfile);

// Get engagement analytics
router.get('/contractors/:contractor_id/analytics', aiTrackingController.getEngagementAnalytics);

// Get at-risk contractors
router.get('/analytics/at-risk', aiTrackingController.getAtRiskContractors);

// Get power users
router.get('/analytics/power-users', aiTrackingController.getPowerUsers);

// ==========================================
// PREFERENCES & INTERACTIONS
// ==========================================

// Update contractor preferences
router.patch('/contractors/:contractor_id/preferences', aiTrackingController.updatePreferences);

// Log AI interactions
router.post('/contractors/:contractor_id/ai-interactions', aiTrackingController.logAIInteraction);

module.exports = router;