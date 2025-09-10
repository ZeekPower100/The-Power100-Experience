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

const { connectDB } = require('./config/database');
const { errorHandler } = require('./middleware/errorHandler');
const dataCollectionService = require('./services/dataCollectionService');

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
const partnerAuthRoutes = require('./routes/partnerAuthRoutes');
const partnerPortalRoutes = require('./routes/partnerPortalRoutes');
const aiCoachRoutes = require('./routes/aiCoachRoutes');
const sessionRoutes = require('./routes/sessionRoutes');
const powerCardRoutes = require('./routes/powerCards');
const powerConfidenceRoutes = require('./routes/powerConfidence');
const reportRoutes = require('./routes/reports');
const contactTaggingRoutes = require('./routes/contactTagging');
const uploadRoutes = require('./routes/upload');
const bookRoutes = require('./routes/bookRoutes');
const eventRoutes = require('./routes/eventRoutes');
const podcastRoutes = require('./routes/podcastRoutes');

const app = express();

// Trust proxy for rate limiting behind reverse proxy
app.set("trust proxy", true);

// Connect to database
connectDB();

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
app.use('/api/sms', smsRoutes);
app.use('/api/partners-enhanced', partnerEnhancedRoutes);
app.use('/api/contractors-enhanced', contractorEnhancedRoutes);
app.use('/api/partner-auth', partnerAuthRoutes);
app.use('/api/partner-portal', partnerPortalRoutes);
app.use('/api/ai-coach', aiCoachRoutes);
app.use('/api/session', sessionRoutes);
app.use('/api/power-cards', powerCardRoutes);
app.use('/api/power-confidence', powerConfidenceRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/contact-tagging', contactTaggingRoutes);
app.use('/api/communications', require('./routes/communicationRoutes'));
app.use('/api/ghl-sync', require('./routes/ghlSyncRoutes'));
app.use('/api/verification', require('./routes/verificationRoutes'));
app.use('/api/emails', require('./routes/emailRoutes'));
app.use('/api/matching', require('./routes/matchingRoutes'));
app.use('/api/upload', uploadRoutes);
app.use('/api/books', bookRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/podcasts', podcastRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.originalUrl}`
  });
});

// Global error handler
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

module.exports = app;