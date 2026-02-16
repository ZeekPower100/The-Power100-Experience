// DATABASE-CHECKED: contractor_engagement_events columns verified on 2025-12-07
// Columns: id, contractor_id, event_type, event_data (jsonb), channel, session_id, created_at
// DATABASE-CHECKED: contractors columns verified on 2025-12-07
// Lookup columns: id, email

const express = require('express');
const router = express.Router();
const AIEventTracker = require('../services/aiEventTracker');
const { query } = require('../config/database');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * POST /api/engagement/email-open
 * Called by n8n when GHL reports an email open
 * GHL Webhook → n8n → This endpoint
 */
router.post('/email-open', asyncHandler(async (req, res) => {
  const {
    contractor_id,
    email_id,
    email,           // Fallback lookup by email
    campaign_id,
    campaign_name,
    opened_at
  } = req.body;

  console.log('[Engagement] Email open event received:', { contractor_id, email_id, email });

  // Find contractor ID if not provided (lookup by email)
  let contractorId = contractor_id;
  if (!contractorId && email) {
    const result = await query('SELECT id FROM contractors WHERE email = $1', [email]);
    if (result.rows.length > 0) {
      contractorId = result.rows[0].id;
    }
  }

  if (!contractorId) {
    return res.status(400).json({
      success: false,
      error: 'contractor_id required or valid email for lookup'
    });
  }

  // Track the email open using AIEventTracker
  // This inserts into contractor_engagement_events (contractor_id, event_type, event_data, channel)
  await AIEventTracker.trackEmailInteraction(contractorId, 'open', email_id || campaign_id);

  // Also track with more metadata
  await AIEventTracker.trackEvent(contractorId, 'email_opened', {
    email_id,
    campaign_id,
    campaign_name,
    opened_at: opened_at || new Date().toISOString()
  }, 'email');

  res.json({
    success: true,
    tracked: 'email_open',
    contractor_id: contractorId,
    timestamp: new Date().toISOString()
  });
}));

/**
 * POST /api/engagement/link-click
 * Called by n8n when GHL reports a link click
 */
router.post('/link-click', asyncHandler(async (req, res) => {
  const {
    contractor_id,
    email,           // Fallback lookup
    link_url,
    link_id,
    email_id,
    campaign_id,
    campaign_name,
    clicked_at
  } = req.body;

  console.log('[Engagement] Link click event received:', { contractor_id, link_url });

  // Find contractor ID if not provided
  let contractorId = contractor_id;
  if (!contractorId && email) {
    const result = await query('SELECT id FROM contractors WHERE email = $1', [email]);
    if (result.rows.length > 0) {
      contractorId = result.rows[0].id;
    }
  }

  if (!contractorId) {
    return res.status(400).json({
      success: false,
      error: 'contractor_id required or valid email for lookup'
    });
  }

  // Track the link click
  await AIEventTracker.trackEmailInteraction(contractorId, 'click', email_id || link_id);

  // Track detailed event
  await AIEventTracker.trackEvent(contractorId, 'link_clicked', {
    link_url,
    link_id,
    email_id,
    campaign_id,
    campaign_name,
    clicked_at: clicked_at || new Date().toISOString()
  }, 'email');

  res.json({
    success: true,
    tracked: 'link_click',
    contractor_id: contractorId,
    link_url,
    timestamp: new Date().toISOString()
  });
}));

/**
 * POST /api/engagement/session
 * Called by frontend to track session events (page views, clicks, time on page)
 */
router.post('/session', asyncHandler(async (req, res) => {
  const {
    contractor_id,
    event,           // 'page_view', 'button_click', 'time_on_page', 'scroll_depth'
    page,
    data,            // Additional event-specific data
    session_id,
    timestamp
  } = req.body;

  if (!contractor_id || !event) {
    return res.status(400).json({
      success: false,
      error: 'contractor_id and event are required'
    });
  }

  console.log('[Engagement] Session event:', { contractor_id, event, page });

  // Track the session event
  await AIEventTracker.trackEvent(contractor_id, event, {
    page,
    session_id,
    ...data,
    timestamp: timestamp || new Date().toISOString()
  }, 'web');

  res.json({
    success: true,
    tracked: event,
    contractor_id,
    timestamp: new Date().toISOString()
  });
}));

/**
 * POST /api/engagement/batch
 * Batch track multiple events at once (for frontend efficiency)
 */
router.post('/batch', asyncHandler(async (req, res) => {
  const { contractor_id, events } = req.body;

  if (!contractor_id || !Array.isArray(events)) {
    return res.status(400).json({
      success: false,
      error: 'contractor_id and events array required'
    });
  }

  console.log('[Engagement] Batch events:', { contractor_id, count: events.length });

  let tracked = 0;
  for (const event of events) {
    try {
      await AIEventTracker.trackEvent(
        contractor_id,
        event.type,
        event.data || {},
        event.channel || 'web'
      );
      tracked++;
    } catch (err) {
      console.error('[Engagement] Failed to track event:', err.message);
    }
  }

  res.json({
    success: true,
    tracked,
    total: events.length,
    timestamp: new Date().toISOString()
  });
}));

/**
 * GET /api/engagement/summary/:contractorId
 * Get engagement summary for a contractor (for debugging/admin)
 */
router.get('/summary/:contractorId', asyncHandler(async (req, res) => {
  const { contractorId } = req.params;
  const { days = 7 } = req.query;

  const summary = await AIEventTracker.getEngagementSummary(contractorId, parseInt(days));
  const metrics = await AIEventTracker.getContractorMetrics(contractorId);

  res.json({
    success: true,
    contractor_id: contractorId,
    period_days: parseInt(days),
    summary,
    metrics
  });
}));

module.exports = router;
