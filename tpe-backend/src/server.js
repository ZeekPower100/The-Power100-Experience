// Test automated deployment with npm workspaces - August 30, 2025 23:15 - Verified working!
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const compression = require('compression');
const path = require('path');
const logger = require('./config/logger');
const {
  helmetConfig,
  createRateLimiter,
  authRateLimiter,
  getCorsOptions,
  sanitizeInput,
  securityHeaders
} = require('./config/security');

// Load environment variables based on NODE_ENV
const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env.development';
require('dotenv').config({ path: path.join(__dirname, '..', envFile) });

// DEBUG: Verify TPX_N8N_API_KEY is loaded
console.log('[STARTUP] TPX_N8N_API_KEY loaded:', process.env.TPX_N8N_API_KEY ? 'YES' : 'NO');

const { connectDB } = require('./config/database');
const { errorHandler } = require('./middleware/errorHandler');
const dataCollectionService = require('./services/dataCollectionService');
const { registerAllHandlers } = require('./services/eventOrchestrator/messageHandlerRegistry');
const { initializeScheduledMessageProcessor } = require('./queues/eventOrchestrationQueue');
const { initializeIGEScheduler } = require('./queues/igeQueue');
const { initializeProactiveMessageScheduler } = require('./queues/proactiveMessageQueue');
const { initializeQuarterlyPowerCardScheduler } = require('./queues/powerCardQueue');
const { initializeHeartbeatScheduler } = require('./services/heartbeatService');

// Import routes
const contractorRoutes = require('./routes/contractorRoutes');
const partnerRoutes = require('./routes/partnerRoutes');
const publicPartnerRoutes = require('./routes/publicPartnerRoutes');
const livePCRRoutes = require('./routes/livePCRRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const bulkRoutes = require('./routes/bulk');
const feedbackRoutes = require('./routes/feedbackRoutes');
const smsRoutes = require('./routes/smsRoutes');
const partnerEnhancedRoutes = require('./routes/partnerEnhancedRoutes');
const contractorEnhancedRoutes = require('./routes/contractorEnhancedRoutes');
const aiProcessingRoutes = require('./routes/aiProcessingRoutes');
const aiEventProcessingRoutes = require('./routes/aiEventProcessingRoutes');
const partnerAuthRoutes = require('./routes/partnerAuthRoutes');
const contractorAuthRoutes = require('./routes/contractorAuthRoutes');
const accountCreationRoutes = require('./routes/accountCreationRoutes');
const partnerPortalRoutes = require('./routes/partnerPortalRoutes');
const aiConciergeRoutes = require('./routes/aiConciergeRoutes');
const tokenAnalyticsRoutes = require('./routes/tokenAnalyticsRoutes');
const guardAnalyticsRoutes = require('./routes/guardAnalyticsRoutes');
const sessionRoutes = require('./routes/sessionRoutes');
const powerCardRoutes = require('./routes/powerCards');
const powerConfidenceRoutes = require('./routes/powerConfidence');
const pcrAdminRoutes = require('./routes/pcrAdminRoutes');
const questionLibraryRoutes = require('./routes/questionLibraryRoutes');
const reportRoutes = require('./routes/reports');
const debugRoutes = require('./routes/debug');
const contactTaggingRoutes = require('./routes/contactTagging');
const uploadRoutes = require('./routes/upload');
const eventCheckInRoutes = require('./routes/eventCheckInRoutes');
const eventMessagingRoutes = require('./routes/eventMessagingRoutes');
const adminControlsRoutes = require('./routes/adminControlsRoutes');
const bookRoutes = require('./routes/bookRoutes');
const eventRoutes = require('./routes/eventRoutes');
const podcastRoutes = require('./routes/podcastRoutes');
const aiRoutes = require('./routes/aiRoutes');
const schedulerRoutes = require('./routes/schedulerRoutes');
const stateMachineRoutes = require('./routes/stateMachineRoutes');
const igeMonitorRoutes = require('./routes/igeMonitorRoutes');
const employeeRoutes = require('./routes/employeeRoutes');
const ceoPcrRoutes = require('./routes/ceoPcrRoutes');
const ceoDashboardRoutes = require('./routes/ceoDashboardRoutes');
const abExperimentRoutes = require('./routes/abExperimentRoutes');
const engagementRoutes = require('./routes/engagementRoutes');
const innerCircleRoutes = require('./routes/innerCircleRoutes');
const skillRoutes = require('./routes/skillRoutes');

const app = express();

// Trust proxy for rate limiting behind reverse proxy
app.set("trust proxy", true);

// Connect to database
connectDB();

// Initialize Event View Refresher for Phase 1 (Event Truth Management)
const eventViewRefresher = require('./services/eventViewRefresher');
eventViewRefresher.initialize()
  .then(() => console.log('✅ Event View Refresher initialized and listening'))
  .catch(err => console.error('❌ Event View Refresher initialization failed:', err));

// Security middleware (Enhanced configuration)
app.use(helmetConfig);
app.use(securityHeaders);

// CORS configuration (Production-ready)
app.use(cors(getCorsOptions()));

// Rate limiting (General API endpoints)
const limiter = createRateLimiter();
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Input sanitization (XSS protection)
app.use(sanitizeInput);

// Serve uploaded files when AWS is not configured or in development
const isAWSConfigured = process.env.AWS_ACCESS_KEY_ID && 
                        process.env.AWS_SECRET_ACCESS_KEY && 
                        process.env.AWS_ACCESS_KEY_ID !== 'your-access-key-here';

if (!isAWSConfigured) {
  console.log('📁 Serving local uploads from:', path.join(__dirname, '..', 'uploads'));
  app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));
}

// Compression middleware
app.use(compression());

// HTTP Request logging with Winston
if (process.env.NODE_ENV !== 'test') {
  // Morgan logs HTTP requests to Winston stream
  app.use(morgan('combined', { stream: logger.stream }));

  // Custom request logging middleware for detailed tracking
  app.use((req, res, next) => {
    const start = Date.now();

    // Log when response is finished
    res.on('finish', () => {
      const duration = Date.now() - start;
      logger.logRequest(req, res, duration);
    });

    next();
  });
}

// Data collection middleware - track all API interactions
app.use(dataCollectionService.trackAPICall());

// Health check endpoints (both /health and /api/health for compatibility)
const healthCheck = (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    version: '1.0.0'
  });
};

app.get('/health', healthCheck);
app.get('/api/health', healthCheck);

// Request logger for debugging
app.use((req, res, next) => {
  if (req.method === 'PUT' || req.method === 'DELETE') {
    console.log(`🔍 ${req.method} ${req.originalUrl} - Auth: ${req.headers.authorization ? 'Present' : 'Missing'}`);
  }
  next();
});

// API Routes
app.use('/api/partners/public', publicPartnerRoutes);
app.use('/api/public/live-pcrs', livePCRRoutes);
app.use('/api/contractors', contractorRoutes);
app.use('/api/partners', partnerRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/ceo-pcr', ceoPcrRoutes);
app.use('/api/ceo-dashboard', ceoDashboardRoutes);
app.use('/api/bookings', bookingRoutes);
// Auth routes with stricter rate limiting (prevent brute force)
app.use('/api/auth', authRateLimiter, authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin', aiEventProcessingRoutes);
app.use('/api/bulk', bulkRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/ai-processing', aiProcessingRoutes);
app.use('/api/sms', smsRoutes);
app.use('/api/partners-enhanced', partnerEnhancedRoutes);
app.use('/api/contractors-enhanced', contractorEnhancedRoutes);
// Partner auth routes with stricter rate limiting
app.use('/api/partner-auth', authRateLimiter, partnerAuthRoutes);
// Contractor auth routes with stricter rate limiting
app.use('/api/contractor-auth', authRateLimiter, contractorAuthRoutes);
// Account creation routes (admin only - protected by middleware)
app.use('/api/account-creation', accountCreationRoutes);
app.use('/api/partner-portal', partnerPortalRoutes);
app.use('/api/ai-concierge', aiConciergeRoutes);
app.use('/api/analytics/tokens', tokenAnalyticsRoutes);
app.use('/api/analytics/guards', guardAnalyticsRoutes);
app.use('/api/session', sessionRoutes);
app.use('/api/power-cards', powerCardRoutes);
app.use('/api/power-confidence', powerConfidenceRoutes);
app.use('/api/admin', pcrAdminRoutes);
app.use('/api/question-library', questionLibraryRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/debug', debugRoutes);
app.use('/api/contact-tagging', contactTaggingRoutes);
app.use('/api/communications', require('./routes/communicationRoutes'));
app.use('/api/ghl-sync', require('./routes/ghlSyncRoutes'));
app.use('/api/verification', require('./routes/verificationRoutes'));
app.use('/api/email', require('./routes/emailRoutes'));
app.use('/api/matching', require('./routes/matchingRoutes'));
app.use('/api/upload', uploadRoutes);
app.use('/api/books', bookRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/ige-monitor', igeMonitorRoutes);
app.use('/api/podcasts', podcastRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/event-check-in', eventCheckInRoutes);
app.use('/api/event-messaging', eventMessagingRoutes);
app.use('/api/admin-controls', adminControlsRoutes);
app.use('/api/scheduler', schedulerRoutes);
app.use('/api/state-machine', stateMachineRoutes);
app.use('/api/event-orchestrator', require('../routes/eventOrchestratorRoutes'));
app.use('/api/ab-experiments', abExperimentRoutes);
app.use('/api/engagement', engagementRoutes);
app.use('/api/inner-circle', innerCircleRoutes);
app.use('/api/skills', skillRoutes);
app.use('/api/event-scheduler', require('../routes/eventMessageSchedulerRoutes'));
app.use('/api/event-agenda', require('../routes/eventAgendaRoutes'));

// Contractor Behavioral Tracking Routes
app.use('/api/contractor-business-goals', require('./routes/contractorBusinessGoalsRoutes'));
app.use('/api/contractor-challenges', require('./routes/contractorChallengesRoutes'));
app.use('/api/contractor-communications', require('./routes/contractorCommunicationsRoutes'));
app.use('/api/contractor-content-engagement', require('./routes/contractorContentEngagementRoutes'));
app.use('/api/contractor-engagement-events', require('./routes/contractorEngagementEventsRoutes'));
app.use('/api/contractor-metrics-history', require('./routes/contractorMetricsHistoryRoutes'));
app.use('/api/contractor-recommendations', require('./routes/contractorRecommendationsRoutes'));

// Podcast Transcription Routes
app.use('/api/podcast-shows', require('./routes/podcastShowsRoutes'));
app.use('/api/podcast-episodes', require('./routes/podcastEpisodesRoutes'));
app.use('/api/episode-transcripts', require('./routes/episodeTranscriptsRoutes'));
app.use('/api/episode-highlights', require('./routes/episodeHighlightsRoutes'));
app.use('/api/podcast-topics', require('./routes/podcastTopicsRoutes'));
app.use('/api/episode-topics', require('./routes/episodeTopicsRoutes'));
app.use('/api/podcast-guests', require('./routes/podcastGuestsRoutes'));

// Video Analysis Pipeline Routes
app.use('/api/video-content', require('./routes/videoContentRoutes'));
app.use('/api/video-analysis', require('./routes/videoAnalysisRoutes'));
app.use('/api/demo-segments', require('./routes/demoSegmentsRoutes'));
app.use('/api/video-performance', require('./routes/videoPerformanceRoutes'));

// Content Ingestion Pipeline Routes (YouTube → DB → AI enrichment → n8n → WordPress)
app.use('/api/content', require('./routes/contentIngestionRoutes'));

// Document Extraction Pipeline Routes
app.use('/api/document-uploads', require('./routes/documentUploadsRoutes'));
app.use('/api/document-extraction-jobs', require('./routes/documentExtractionJobsRoutes'));
app.use('/api/extracted-content', require('./routes/extractedContentRoutes'));
app.use('/api/chapter-analysis', require('./routes/chapterAnalysisRoutes'));
app.use('/api/key-concepts', require('./routes/keyConceptsRoutes'));
app.use('/api/actionable-insights', require('./routes/actionableInsightsRoutes'));
app.use('/api/document-processing-metrics', require('./routes/documentProcessingMetricsRoutes'));

// Recommendation System Routes
app.use('/api/recommendations', require('./routes/recommendationRoutes'));

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.originalUrl}`
  });
});

// Global error handler
app.use(errorHandler);

// Initialize event orchestration handlers
registerAllHandlers();

// Seed skills from SKILL.md files on startup
const skillLoader = require('./services/skillLoaderService');
skillLoader.seedFromFilesystem()
  .then((results) => {
    console.log(`✅ Skills seeded: ${results.seeded} new, ${results.updated} updated, ${results.errors.length} errors`);
  })
  .catch((err) => {
    console.error('❌ Failed to seed skills:', err.message);
  });

// 🔥 CRITICAL: Initialize scheduled message processor (runs every minute)
// This is THE automation that makes all scheduled messages send!
initializeScheduledMessageProcessor()
  .then(() => {
    console.log('✅ Scheduled message processor initialized successfully');
  })
  .catch((err) => {
    console.error('❌ Failed to initialize scheduled message processor:', err);
  });

// 🔥 CRITICAL: Initialize Phase 3 IGE scheduler (runs hourly)
// This is THE automation that makes Phase 3 Internal Goal Engine work!
initializeIGEScheduler()
  .then(() => {
    console.log('✅ Phase 3 IGE scheduler initialized successfully');
  })
  .catch((err) => {
    console.error('❌ Failed to initialize Phase 3 IGE scheduler:', err);
  });

// 🔥 CRITICAL: Initialize Proactive Message delivery scheduler (runs every 5 minutes)
// This sends the scheduled proactive messages to contractors via SMS!
initializeProactiveMessageScheduler()
  .then(() => {
    console.log('✅ Proactive message delivery scheduler initialized successfully');
  })
  .catch((err) => {
    console.error('❌ Failed to initialize proactive message delivery scheduler:', err);
  });

// 🔥 CRITICAL: Initialize Quarterly PowerCard scheduler (runs quarterly on 1st at 9 AM)
// This automatically generates PowerCard campaigns for all active partners every quarter!
initializeQuarterlyPowerCardScheduler()
  .then(() => {
    console.log('✅ Quarterly PowerCard scheduler initialized successfully - runs quarterly at 9 AM');
  })
  .catch((err) => {
    console.error('❌ Failed to initialize quarterly PowerCard scheduler:', err);
  });

// Initialize Inner Circle heartbeat scheduler (daily member scan for proactive outreach)
initializeHeartbeatScheduler()
  .then(() => {
    console.log('✅ Inner Circle heartbeat scheduler initialized - daily scan at 9 AM EST');
  })
  .catch((err) => {
    console.error('❌ Failed to initialize heartbeat scheduler:', err.message);
  });

// Start server
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT} in ${process.env.NODE_ENV || 'development'} mode`);

  // ============================================================================
  // DISABLED: Proactive Follow-Up Scheduler (setInterval-based)
  // ============================================================================
  // REASON: This is REDUNDANT with followUpWorker.js (BullMQ-based worker)
  //
  // ARCHITECTURE:
  // - followUpService.scheduleFollowUp() creates DB record + adds to Bull queue
  // - followUpWorker.js (BullMQ) processes jobs at EXACT scheduled time
  // - followUpWorker USES proactiveSchedulerService utility functions:
  //   - personalizeMessage() - AI message personalization
  //   - sendFollowUpMessage() - n8n webhook integration
  //
  // KEEP: proactiveSchedulerService.js file (utility functions needed)
  // DISABLED: proactiveSchedulerService.startScheduler() (redundant scheduler)
  //
  // If you need to re-enable interval-based scheduler: set ENABLE_FOLLOWUP_SCHEDULER=true
  // (Not recommended - BullMQ is superior: retry logic, job tracking, exact timing)
  // ============================================================================

  // if (process.env.ENABLE_FOLLOWUP_SCHEDULER === 'true') {
  //   const proactiveScheduler = require('./services/proactiveSchedulerService');
  //   proactiveScheduler.startScheduler();
  //   console.log('✅ Proactive follow-up scheduler started (interval-based)');
  // }
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM signal received: closing HTTP server');

  // Shutdown Event View Refresher first
  await eventViewRefresher.shutdown();

  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

module.exports = app;