// Test automated deployment with npm workspaces - August 30, 2025 23:15 - Verified working!
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const path = require('path');

// Load environment variables based on NODE_ENV
const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env.development';
require('dotenv').config({ path: path.join(__dirname, '..', envFile) });

// DEBUG: Verify TPX_N8N_API_KEY is loaded
console.log('[STARTUP] TPX_N8N_API_KEY loaded:', process.env.TPX_N8N_API_KEY ? 'YES' : 'NO');

const { connectDB } = require('./config/database');
const { errorHandler } = require('./middleware/errorHandler');
const dataCollectionService = require('./services/dataCollectionService');
const { registerAllHandlers } = require('./services/eventOrchestrator/messageHandlerRegistry');

// Import routes
const contractorRoutes = require('./routes/contractorRoutes');
const partnerRoutes = require('./routes/partnerRoutes');
const publicPartnerRoutes = require('./routes/publicPartnerRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const bulkRoutes = require('./routes/bulk');
const feedbackRoutes = require('./routes/feedbackRoutes');
const smsRoutes = require('./routes/smsRoutes');
const partnerEnhancedRoutes = require('./routes/partnerEnhancedRoutes');
const contractorEnhancedRoutes = require('./routes/contractorEnhancedRoutes');
const aiProcessingRoutes = require('./routes/aiProcessingRoutes');
const partnerAuthRoutes = require('./routes/partnerAuthRoutes');
const partnerPortalRoutes = require('./routes/partnerPortalRoutes');
const aiConciergeRoutes = require('./routes/aiConciergeRoutes');
const sessionRoutes = require('./routes/sessionRoutes');
const powerCardRoutes = require('./routes/powerCards');
const powerConfidenceRoutes = require('./routes/powerConfidence');
const reportRoutes = require('./routes/reports');
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

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: [
    'http://3.95.250.211:5000',
    'http://localhost:3000',
    'http://localhost:3001', 
    'http://localhost:3002',
    'https://tpx.power100.io',
    'http://tpx.power100.io',
    'http://3.95.250.211:3000',
    process.env.FRONTEND_URL
  ].filter(Boolean),
  credentials: true,
  optionsSuccessStatus: 200
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 1000, // Increased for development
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

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

// Logging middleware
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined'));
}

// Data collection middleware - track all API interactions
app.use(dataCollectionService.trackAPICall());

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    version: '1.0.0'
  });
});

// Request logger for debugging
app.use((req, res, next) => {
  if (req.method === 'PUT' || req.method === 'DELETE') {
    console.log(`🔍 ${req.method} ${req.originalUrl} - Auth: ${req.headers.authorization ? 'Present' : 'Missing'}`);
  }
  next();
});

// API Routes
app.use('/api/partners/public', publicPartnerRoutes);
app.use('/api/contractors', contractorRoutes);
app.use('/api/partners', partnerRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/bulk', bulkRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/ai-processing', aiProcessingRoutes);
app.use('/api/sms', smsRoutes);
app.use('/api/partners-enhanced', partnerEnhancedRoutes);
app.use('/api/contractors-enhanced', contractorEnhancedRoutes);
app.use('/api/partner-auth', partnerAuthRoutes);
app.use('/api/partner-portal', partnerPortalRoutes);
app.use('/api/ai-concierge', aiConciergeRoutes);
app.use('/api/session', sessionRoutes);
app.use('/api/power-cards', powerCardRoutes);
app.use('/api/power-confidence', powerConfidenceRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/contact-tagging', contactTaggingRoutes);
app.use('/api/communications', require('./routes/communicationRoutes'));
app.use('/api/ghl-sync', require('./routes/ghlSyncRoutes'));
app.use('/api/verification', require('./routes/verificationRoutes'));
app.use('/api/email', require('./routes/emailRoutes'));
app.use('/api/matching', require('./routes/matchingRoutes'));
app.use('/api/upload', uploadRoutes);
app.use('/api/books', bookRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/podcasts', podcastRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/event-check-in', eventCheckInRoutes);
app.use('/api/event-messaging', eventMessagingRoutes);
app.use('/api/admin-controls', adminControlsRoutes);
app.use('/api/scheduler', schedulerRoutes);
app.use('/api/event-orchestrator', require('../routes/eventOrchestratorRoutes'));
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

// Start server
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
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