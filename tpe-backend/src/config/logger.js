/**
 * Winston Logger Configuration for TPE Backend
 * Production-ready structured logging with daily rotation
 */

const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define colors for each log level
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue',
};

winston.addColors(colors);

// Determine log level based on environment
const level = () => {
  const env = process.env.NODE_ENV || 'development';
  const isDevelopment = env === 'development';
  return isDevelopment ? 'debug' : process.env.LOG_LEVEL || 'info';
};

// Define log format
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Console format (human-readable for development)
const consoleFormat = winston.format.combine(
  winston.format.colorize({ all: true }),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(
    (info) => `${info.timestamp} [${info.level}]: ${info.message}${info.stack ? '\n' + info.stack : ''}`
  )
);

// Define transports
const transports = [];

// Console transport (always enabled in development)
if (process.env.NODE_ENV !== 'production') {
  transports.push(
    new winston.transports.Console({
      format: consoleFormat,
    })
  );
}

// Daily rotate file transport for combined logs
transports.push(
  new DailyRotateFile({
    filename: path.join(__dirname, '../../logs/combined-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '14d', // Keep logs for 14 days
    format,
  })
);

// Daily rotate file transport for error logs only
transports.push(
  new DailyRotateFile({
    level: 'error',
    filename: path.join(__dirname, '../../logs/error-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '30d', // Keep error logs for 30 days
    format,
  })
);

// Daily rotate file transport for HTTP request logs
transports.push(
  new DailyRotateFile({
    level: 'http',
    filename: path.join(__dirname, '../../logs/http-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '7d', // Keep HTTP logs for 7 days
    format,
  })
);

// Create the logger
const logger = winston.createLogger({
  level: level(),
  levels,
  format,
  transports,
  // Don't exit on uncaught exceptions
  exitOnError: false,
});

// Create a stream object with a 'write' function for Morgan HTTP logging
logger.stream = {
  write: (message) => {
    logger.http(message.trim());
  },
};

/**
 * Helper function to log HTTP requests with additional context
 */
logger.logRequest = (req, res, responseTime) => {
  const logData = {
    method: req.method,
    url: req.originalUrl || req.url,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('user-agent'),
    statusCode: res.statusCode,
    responseTime: `${responseTime}ms`,
  };

  // Add user info if authenticated
  if (req.user) {
    logData.userId = req.user.id;
    logData.userType = req.userType;
  }

  const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'http';
  logger.log(level, `${req.method} ${req.originalUrl} ${res.statusCode} - ${responseTime}ms`, logData);
};

/**
 * Helper function to log security events
 */
logger.logSecurity = (event, details = {}) => {
  logger.warn('SECURITY_EVENT', {
    event,
    timestamp: new Date().toISOString(),
    ...details,
  });
};

/**
 * Helper function to log database queries (for debugging)
 */
logger.logQuery = (query, params, duration) => {
  if (process.env.LOG_QUERIES === 'true') {
    logger.debug('DATABASE_QUERY', {
      query,
      params,
      duration: `${duration}ms`,
    });
  }
};

/**
 * Helper function to log authentication events
 */
logger.logAuth = (event, details = {}) => {
  logger.info('AUTH_EVENT', {
    event,
    timestamp: new Date().toISOString(),
    ...details,
  });
};

/**
 * Helper function to log API calls with detailed context
 */
logger.logAPI = (endpoint, method, status, user = null, error = null) => {
  const logData = {
    endpoint,
    method,
    status,
    timestamp: new Date().toISOString(),
  };

  if (user) {
    logData.user = {
      id: user.id,
      type: user.userType || 'unknown',
    };
  }

  if (error) {
    logData.error = {
      message: error.message,
      stack: error.stack,
    };
  }

  const level = status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info';
  logger.log(level, `API ${method} ${endpoint} - ${status}`, logData);
};

// Log unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('UNHANDLED_REJECTION', {
    reason: reason instanceof Error ? reason.message : reason,
    stack: reason instanceof Error ? reason.stack : undefined,
    promise,
  });
});

// Log uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('UNCAUGHT_EXCEPTION', {
    message: error.message,
    stack: error.stack,
  });
  // Give Winston time to write the log before exiting
  setTimeout(() => {
    process.exit(1);
  }, 1000);
});

module.exports = logger;
