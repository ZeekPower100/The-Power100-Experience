/**
 * Security Configuration for TPE Backend
 * Production-ready security middleware configuration
 */

const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

/**
 * Enhanced Helmet Configuration
 * Implements security headers as per OWASP best practices
 */
const helmetConfig = helmet({
  // Content Security Policy
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"], // Allow inline scripts for Next.js
      styleSrc: ["'self'", "'unsafe-inline'"], // Allow inline styles
      imgSrc: ["'self'", "data:", "https:", "blob:"], // Allow external images
      connectSrc: ["'self'", process.env.FRONTEND_URL || "https://tpx.power100.io"],
      fontSrc: ["'self'", "data:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },

  // HTTP Strict Transport Security (HSTS)
  // Force HTTPS for 1 year, include subdomains
  hsts: {
    maxAge: 31536000, // 1 year in seconds
    includeSubDomains: true,
    preload: true,
  },

  // Prevent MIME type sniffing
  noSniff: true,

  // Prevent clickjacking
  frameguard: {
    action: 'deny',
  },

  // Remove X-Powered-By header
  hidePoweredBy: true,

  // XSS Protection (legacy browsers)
  xssFilter: true,

  // Referrer Policy
  referrerPolicy: {
    policy: 'strict-origin-when-cross-origin',
  },

  // DNS Prefetch Control
  dnsPrefetchControl: {
    allow: false,
  },

  // Disable IE8's insecure features
  ieNoOpen: true,

  // Cross-Origin policies
  crossOriginEmbedderPolicy: false, // Disabled for compatibility with CDNs
  crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
  crossOriginResourcePolicy: { policy: 'cross-origin' },
});

/**
 * Production-Ready Rate Limiting Configuration
 * Stricter limits for production, looser for development
 */
const createRateLimiter = () => {
  const isProduction = process.env.NODE_ENV === 'production';

  return rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || (15 * 60 * 1000), // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || (isProduction ? 100 : 1000), // Stricter in production
    message: {
      error: 'Too many requests from this IP, please try again later.',
      retryAfter: '15 minutes',
    },
    standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
    legacyHeaders: false, // Disable `X-RateLimit-*` headers
    // Skip rate limiting for health checks
    skip: (req) => req.path === '/health' || req.path === '/api/health',
    // Custom handler for rate limit exceeded
    handler: (req, res) => {
      console.warn(`⚠️ Rate limit exceeded for IP: ${req.ip}`);
      res.status(429).json({
        error: 'Too many requests',
        message: 'You have exceeded the rate limit. Please try again later.',
        retryAfter: Math.ceil(req.rateLimit.resetTime / 1000),
      });
    },
  });
};

/**
 * Stricter Rate Limiting for Authentication Endpoints
 * Prevent brute force attacks on login/register
 */
const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Only 5 attempts per 15 minutes
  message: {
    error: 'Too many authentication attempts',
    message: 'Account locked. Please try again in 15 minutes.',
  },
  skipSuccessfulRequests: true, // Don't count successful logins
});

/**
 * CORS Configuration
 * Restrict to known origins in production
 */
const getCorsOptions = () => {
  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3002',
    'https://tpx.power100.io',
    'http://tpx.power100.io',
    process.env.FRONTEND_URL,
  ].filter(Boolean);

  // In production, only allow HTTPS origins
  const filteredOrigins = process.env.NODE_ENV === 'production'
    ? allowedOrigins.filter(origin => origin.startsWith('https://') || origin.includes('localhost'))
    : allowedOrigins;

  return {
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin) return callback(null, true);

      if (filteredOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.warn(`⚠️ CORS blocked origin: ${origin}`);
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    optionsSuccessStatus: 200,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
  };
};

/**
 * Input Sanitization Middleware
 * Prevent XSS attacks through request body sanitization
 */
const sanitizeInput = (req, res, next) => {
  // Recursively sanitize object properties
  const sanitizeObject = (obj) => {
    if (!obj || typeof obj !== 'object') return obj;

    Object.keys(obj).forEach(key => {
      if (typeof obj[key] === 'string') {
        // Remove potential XSS vectors
        obj[key] = obj[key]
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          .replace(/javascript:/gi, '')
          .replace(/on\w+=/gi, '');
      } else if (typeof obj[key] === 'object') {
        obj[key] = sanitizeObject(obj[key]);
      }
    });

    return obj;
  };

  if (req.body) {
    req.body = sanitizeObject(req.body);
  }

  next();
};

/**
 * Security Headers Middleware
 * Add additional custom security headers
 */
const securityHeaders = (req, res, next) => {
  // Prevent caching of sensitive data
  if (req.path.includes('/api/admin') || req.path.includes('/api/auth')) {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
  }

  // Add custom security headers
  res.set('X-Content-Type-Options', 'nosniff');
  res.set('X-Frame-Options', 'DENY');
  res.set('X-XSS-Protection', '1; mode=block');
  res.set('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

  next();
};

/**
 * Per-Member Concierge Rate Limiting
 * Limits AI concierge messages per member per day.
 * Uses member_id from request body as the rate limit key.
 */
const memberConciergeRateLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24-hour rolling window
  max: parseInt(process.env.MEMBER_DAILY_MESSAGE_LIMIT) || 50,
  keyGenerator: (req) => {
    // Use member_id if present, fall back to IP
    return req.body?.member_id ? `member:${req.body.member_id}` : req.ip;
  },
  skip: (req) => {
    // Only apply to requests with member_id (Inner Circle members)
    // Contractor requests use the general rate limiter
    return !req.body?.member_id;
  },
  message: {
    error: 'Daily conversation limit reached',
    message: "You've reached your daily conversation limit. It resets tomorrow — in the meantime, check out your PowerMoves!",
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    console.warn(`[MEMBER_RATE_LIMIT] Member ${req.body?.member_id} exceeded daily concierge limit`);
    res.status(429).json({
      error: 'Daily conversation limit reached',
      message: "You've reached your daily conversation limit. It resets tomorrow — in the meantime, check out your PowerMoves!",
    });
  },
});

module.exports = {
  helmetConfig,
  createRateLimiter,
  authRateLimiter,
  memberConciergeRateLimiter,
  getCorsOptions,
  sanitizeInput,
  securityHeaders,
};
