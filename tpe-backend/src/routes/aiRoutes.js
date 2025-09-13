const express = require('express');
const router = express.Router();
const { flexibleProtect: authenticateToken } = require('../middleware/flexibleAuth');

// Import all AI controllers
const contractorAiProfileController = require('../controllers/contractorAiProfileController');
const aiRecommendationController = require('../controllers/aiRecommendationController');
const aiContentAnalysisController = require('../controllers/aiContentAnalysisController');
const aiEventExperienceController = require('../controllers/aiEventExperienceController');
const aiSuccessStoryController = require('../controllers/aiSuccessStoryController');

// ========================================
// Contractor AI Profile Routes
// ========================================
router.post('/profiles/contractor/:contractorId', authenticateToken, contractorAiProfileController.createOrUpdate);
router.get('/profiles/contractor/:contractorId', authenticateToken, contractorAiProfileController.getByContractorId);
router.put('/profiles/contractor/:contractorId/metrics', authenticateToken, contractorAiProfileController.updateMetrics);
router.put('/profiles/contractor/:contractorId/preferences', authenticateToken, contractorAiProfileController.updatePreferences);
router.post('/profiles/contractor/:contractorId/track-recommendation', authenticateToken, contractorAiProfileController.trackRecommendation);
router.get('/profiles/at-risk', authenticateToken, contractorAiProfileController.getAtRiskContractors);
router.get('/profiles/lifecycle/:stage', authenticateToken, contractorAiProfileController.getByLifecycleStage);
router.get('/profiles', authenticateToken, contractorAiProfileController.getAll);

// ========================================
// AI Recommendations Routes
// ========================================
router.post('/recommendations', authenticateToken, aiRecommendationController.create);
router.post('/recommendations/batch', authenticateToken, aiRecommendationController.batchCreate);
router.get('/recommendations/:id', authenticateToken, aiRecommendationController.getById);
router.get('/recommendations/contractor/:contractorId', authenticateToken, aiRecommendationController.getByContractor);
router.get('/recommendations/entity/:entityType/:entityId', authenticateToken, aiRecommendationController.getByEntity);
router.put('/recommendations/:id/engagement', authenticateToken, aiRecommendationController.updateEngagement);
router.put('/recommendations/:id/outcome', authenticateToken, aiRecommendationController.recordOutcome);
router.get('/recommendations/stats/engagement', authenticateToken, aiRecommendationController.getEngagementStats);
router.get('/recommendations/stats/top-performing', authenticateToken, aiRecommendationController.getTopPerforming);
router.get('/recommendations/recent/all', authenticateToken, aiRecommendationController.getRecent);
router.get('/recommendations/status/:status', authenticateToken, aiRecommendationController.getByStatus);

// ========================================
// AI Content Analysis Routes
// ========================================
router.post('/content-analysis', authenticateToken, aiContentAnalysisController.create);
router.post('/content-analysis/trigger', authenticateToken, aiContentAnalysisController.triggerAnalysis);
router.get('/content-analysis/:id', authenticateToken, aiContentAnalysisController.getById);
router.get('/content-analysis/entity/:entityType/:entityId', authenticateToken, aiContentAnalysisController.getByEntity);
router.put('/content-analysis/:id/status', authenticateToken, aiContentAnalysisController.updateStatus);
router.put('/content-analysis/:id/results', authenticateToken, aiContentAnalysisController.updateResults);
router.get('/content-analysis/queue/pending', authenticateToken, aiContentAnalysisController.getPending);
router.get('/content-analysis/quality/high', authenticateToken, aiContentAnalysisController.getHighQuality);
router.get('/content-analysis/topic/:topic', authenticateToken, aiContentAnalysisController.getByTopic);
router.get('/content-analysis/relevant/:focusArea', authenticateToken, aiContentAnalysisController.getRelevantContent);
router.get('/content-analysis/review/required', authenticateToken, aiContentAnalysisController.getRequiringReview);
router.get('/content-analysis/stats/all', authenticateToken, aiContentAnalysisController.getStats);

// ========================================
// AI Event Experience Routes
// ========================================
router.post('/event-experiences/:eventId/:contractorId', authenticateToken, aiEventExperienceController.createOrGet);
router.get('/event-experiences/:id', authenticateToken, aiEventExperienceController.getById);
router.get('/event-experiences/contractor/:contractorId', authenticateToken, aiEventExperienceController.getByContractor);
router.get('/event-experiences/event/:eventId', authenticateToken, aiEventExperienceController.getByEvent);
router.put('/event-experiences/:id/pre-event', authenticateToken, aiEventExperienceController.updatePreEvent);
router.post('/event-experiences/:id/session', authenticateToken, aiEventExperienceController.addSession);
router.post('/event-experiences/:id/note', authenticateToken, aiEventExperienceController.addNote);
router.post('/event-experiences/:id/insight', authenticateToken, aiEventExperienceController.addInsight);
router.put('/event-experiences/:id/post-event', authenticateToken, aiEventExperienceController.updatePostEvent);
router.post('/event-experiences/:id/speaker-alert', authenticateToken, aiEventExperienceController.sendSpeakerAlert);
router.get('/event-experiences/engagement/high', authenticateToken, aiEventExperienceController.getHighEngagement);
router.get('/event-experiences/stats/:eventId', authenticateToken, aiEventExperienceController.getEventStats);
router.get('/event-experiences/history/:contractorId', authenticateToken, aiEventExperienceController.getContractorHistory);

// ========================================
// AI Success Stories Routes
// ========================================
router.post('/success-stories', authenticateToken, aiSuccessStoryController.create);
router.get('/success-stories/:id', authenticateToken, aiSuccessStoryController.getById);
router.get('/success-stories/contractor/:contractorId', authenticateToken, aiSuccessStoryController.getByContractor);
router.get('/success-stories/type/:type', authenticateToken, aiSuccessStoryController.getByType);
router.put('/success-stories/:id', authenticateToken, aiSuccessStoryController.update);
router.put('/success-stories/:id/verify', authenticateToken, aiSuccessStoryController.verify);
router.get('/success-stories/verified/all', authenticateToken, aiSuccessStoryController.getVerified);
router.get('/success-stories/roi/top', authenticateToken, aiSuccessStoryController.getTopROI);
router.get('/success-stories/timeframe/:timeframe', authenticateToken, aiSuccessStoryController.getByTimeframe);
router.get('/success-stories/related/partner/:partnerId', authenticateToken, aiSuccessStoryController.getRelatedToPartner);
router.get('/success-stories/related/book/:bookId', authenticateToken, aiSuccessStoryController.getRelatedToBook);
router.get('/success-stories/related/podcast/:podcastId', authenticateToken, aiSuccessStoryController.getRelatedToPodcast);
router.get('/success-stories/related/event/:eventId', authenticateToken, aiSuccessStoryController.getRelatedToEvent);
router.get('/success-stories/video/all', authenticateToken, aiSuccessStoryController.getWithVideo);
router.get('/success-stories/stats/all', authenticateToken, aiSuccessStoryController.getStats);

module.exports = router;