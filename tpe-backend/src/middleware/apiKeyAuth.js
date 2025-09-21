/**
 * API KEY AUTHENTICATION MIDDLEWARE
 *
 * Simple API key authentication for n8n webhooks and automation services.
 * Uses a static API key from environment variables - doesn't expire.
 *
 * Usage:
 * - Set N8N_API_KEY in your .env file
 * - Pass the key in the X-API-Key header
 * - This is specifically for automation/webhook endpoints
 */

const { AppError } = require('./errorHandler');

const apiKeyAuth = async (req, res, next) => {
  try {
    // Check for API key in headers
    const apiKey = req.headers['x-api-key'] || req.headers['X-API-Key'];

    if (!apiKey) {
      return next(new AppError('API key required', 401));
    }

    // Get the expected API key from environment
    // Using hardcoded value for now due to env loading issues
    const validApiKey = 'tpx-n8n-automation-key-2025-power100-experience';

    // Debug logging
    console.log('Received API Key:', apiKey);
    console.log('Expected API Key:', validApiKey);

    // Validate the API key
    if (apiKey !== validApiKey) {
      console.error('Invalid API key attempted:', apiKey.substring(0, 10) + '...');
      console.error('Expected:', validApiKey);
      return next(new AppError('Invalid API key', 401));
    }

    // API key is valid - add automation context to request
    req.automation = {
      authenticated: true,
      source: 'n8n',
      apiKey: true
    };

    // For automation endpoints, we might want to set a default user context
    // This represents the "system" or "automation" user
    req.user = {
      id: 999999, // Special ID for automation
      email: 'automation@tpx.power100.io',
      name: 'N8N Automation',
      is_automation: true
    };

    next();
  } catch (error) {
    console.error('API Key auth error:', error);
    return next(new AppError('Authentication failed', 401));
  }
};

// Alternative middleware that allows both JWT and API key
const hybridAuth = async (req, res, next) => {
  // Check if API key is present
  const apiKey = req.headers['x-api-key'] || req.headers['X-API-Key'];

  if (apiKey) {
    // Use API key authentication
    return apiKeyAuth(req, res, next);
  } else {
    // Fall back to JWT authentication
    const flexibleAuth = require('./flexibleAuth');
    return flexibleAuth.protect(req, res, next);
  }
};

module.exports = {
  apiKeyAuth,
  hybridAuth
};