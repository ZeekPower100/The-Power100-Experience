// DATABASE-CHECKED: power_rankings_db verified 2026-03-15
// ================================================================
// Sales Agent Routes
// ================================================================
// Purpose: API routes for Rankings Rep Agent (sales enablement AI)
// Auth: API Key (X-API-Key header) — called by Ranking System dashboard
// Base path: /api/sales-agent
// ================================================================

const express = require('express');
const router = express.Router();
const salesAgentController = require('../controllers/salesAgentController');
const { promptInjectionGuard } = require('../middleware/promptInjectionGuard');
const rateLimit = require('express-rate-limit');

// Rate limiter for sales agent endpoints (more generous than public)
const salesAgentRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // 30 requests per minute per IP
  message: { success: false, error: 'Too many requests. Please slow down.' }
});

/**
 * API Key authentication middleware
 * Validates X-API-Key header against TPX_SALES_AGENT_API_KEY env var
 */
function salesAgentApiKeyAuth(req, res, next) {
  const apiKey = req.headers['x-api-key'];

  if (!apiKey) {
    return res.status(401).json({
      success: false,
      error: 'API key required. Set X-API-Key header.'
    });
  }

  if (apiKey !== process.env.TPX_SALES_AGENT_API_KEY) {
    return res.status(403).json({
      success: false,
      error: 'Invalid API key.'
    });
  }

  next();
}

// Apply API key auth and rate limiting to all routes
router.use(salesAgentApiKeyAuth);
router.use(salesAgentRateLimiter);

// ============================================================
// Sales Agent Endpoints
// ============================================================

/**
 * @route   POST /api/sales-agent/message
 * @desc    Chat with the AI about an account
 * @access  API Key
 * @body    { user_id: number, company_id: number, message: string }
 * @returns { success: boolean, response: string }
 */
router.post('/message',
  promptInjectionGuard,
  (req, res, next) => salesAgentController.sendMessage(req, res, next)
);

/**
 * @route   POST /api/sales-agent/briefing
 * @desc    Generate account briefing (next action, talking points, intel)
 * @access  API Key
 * @body    { user_id: number, company_id: number }
 * @returns { success: boolean, briefing: string }
 */
router.post('/briefing',
  (req, res, next) => salesAgentController.generateBriefing(req, res, next)
);

/**
 * @route   POST /api/sales-agent/generate-email
 * @desc    Generate email draft for account
 * @access  API Key
 * @body    { user_id: number, company_id: number, purpose?: string, additional_context?: string }
 * @returns { success: boolean, email_draft: string }
 */
router.post('/generate-email',
  (req, res, next) => salesAgentController.generateEmail(req, res, next)
);

/**
 * @route   POST /api/sales-agent/generate-sms
 * @desc    Generate SMS draft for account
 * @access  API Key
 * @body    { user_id: number, company_id: number, purpose?: string, additional_context?: string }
 * @returns { success: boolean, sms_draft: string }
 */
router.post('/generate-sms',
  (req, res, next) => salesAgentController.generateSms(req, res, next)
);

/**
 * @route   POST /api/sales-agent/summarize-call
 * @desc    Summarize a call transcript
 * @access  API Key
 * @body    { user_id: number, company_id: number, transcript?: string, call_notes?: string }
 * @returns { success: boolean, summary: string }
 */
router.post('/summarize-call',
  promptInjectionGuard,
  (req, res, next) => salesAgentController.summarizeCall(req, res, next)
);

/**
 * @route   POST /api/sales-agent/company-intel
 * @desc    Fetch/refresh company intelligence (direct DB, no agent)
 * @access  API Key
 * @body    { company_id: number }
 * @returns { success: boolean, company: object, intel: array, recent_comms: array }
 */
router.post('/company-intel',
  (req, res, next) => salesAgentController.getCompanyIntel(req, res, next)
);

module.exports = router;
