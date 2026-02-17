// DATABASE-CHECKED: inner_circle_members, power_moves, member_watch_history verified 2026-02-16
const express = require('express');
const router = express.Router();
const axios = require('axios');
const innerCircleController = require('../controllers/innerCircleController');
const { promptInjectionGuard } = require('../middleware/promptInjectionGuard');
const { apiKeyOnly } = require('../middleware/flexibleAuth');
const { memberConciergeRateLimiter } = require('../config/security');
const { query } = require('../config/database');
const { calculateEngagementScore } = require('../services/engagementScoreService');
const { getContentStats } = require('../services/contentIngestionService');
const { sendICRegistrationComms, sendICPasswordResetComms } = require('../services/innerCircleEmailTemplates');

// n8n webhook configuration
const N8N_WEBHOOK_BASE = process.env.N8N_WEBHOOK_BASE || 'https://n8n.srv918843.hstgr.cloud';
const N8N_ENV = process.env.NODE_ENV === 'production' ? '' : '-dev';

// ============================================================
// WordPress Integration: Registration
// ============================================================

/**
 * @route   POST /api/inner-circle/register
 * @desc    Register a new Inner Circle member (called from WordPress)
 * @access  API Key (WordPress proxy)
 */
router.post('/register', apiKeyOnly, async (req, res, next) => {
  try {
    const { name, email, phone, business_type, revenue_tier, team_size, focus_areas, entry_source } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, error: 'email is required' });
    }
    if (!name) {
      return res.status(400).json({ success: false, error: 'name is required' });
    }

    // Check for duplicate email
    const existing = await query(
      'SELECT id FROM inner_circle_members WHERE email = $1',
      [email.toLowerCase().trim()]
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({
        success: false,
        error: 'Member with this email already exists',
        member_id: existing.rows[0].id
      });
    }

    // DATABASE VERIFIED: inner_circle_members columns
    const result = await query(`
      INSERT INTO inner_circle_members (
        email, name, phone, business_type, revenue_tier, team_size,
        focus_areas, entry_source, membership_status, onboarding_complete,
        registration_date, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active', false, NOW(), NOW(), NOW())
      RETURNING id, email, name, membership_status
    `, [
      email.toLowerCase().trim(),
      name.trim(),
      phone || null,
      business_type || null,
      revenue_tier || null,
      team_size || null,
      focus_areas ? JSON.stringify(focus_areas) : null,
      entry_source || 'wordpress'
    ]);

    const newMember = result.rows[0];
    console.log(`[Inner Circle] New member registered: ${newMember.id} (${newMember.email}) via ${entry_source || 'wordpress'}`);

    // Send registration confirmation email + SMS (async, non-blocking)
    sendICRegistrationComms(newMember.id).catch(err => {
      console.warn(`[Inner Circle] Registration comms failed (non-blocking): ${err.message}`);
    });

    // Fire n8n webhook for CRM sync (async, non-blocking)
    const webhookUrl = `${N8N_WEBHOOK_BASE}/webhook/ic-member-registration${N8N_ENV}`;
    axios.post(webhookUrl, {
      member_id: newMember.id,
      email: newMember.email,
      name: newMember.name,
      phone: phone || null,
      business_type: business_type || null,
      revenue_tier: revenue_tier || null,
      entry_source: entry_source || 'wordpress',
      registered_at: new Date().toISOString()
    }, { timeout: 10000 }).catch(err => {
      console.warn(`[Inner Circle] n8n webhook failed (non-blocking): ${err.message}`);
    });

    res.status(201).json({
      success: true,
      member: newMember
    });
  } catch (error) {
    console.error('[Inner Circle] Registration error:', error);
    next(error);
  }
});

/**
 * @route   POST /api/inner-circle/password-reset
 * @desc    Send password reset email + SMS to an IC member (called from WordPress)
 * @access  API Key (WordPress proxy)
 */
router.post('/password-reset', apiKeyOnly, async (req, res, next) => {
  try {
    const { email, reset_url, expires_in } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, error: 'email is required' });
    }
    if (!reset_url) {
      return res.status(400).json({ success: false, error: 'reset_url is required' });
    }

    // Find member by email
    const memberResult = await query(
      'SELECT id, name, email, phone FROM inner_circle_members WHERE email = $1',
      [email.toLowerCase().trim()]
    );

    if (!memberResult.rows.length) {
      // Don't reveal whether email exists (security best practice)
      return res.json({ success: true, message: 'If this email is registered, a reset link has been sent.' });
    }

    const member = memberResult.rows[0];
    const results = await sendICPasswordResetComms(member.id, reset_url, expires_in || '1 hour');

    console.log(`[Inner Circle] Password reset comms sent for member ${member.id}: email=${results.email}, sms=${results.sms}`);

    res.json({
      success: true,
      message: 'If this email is registered, a reset link has been sent.',
      comms: results
    });
  } catch (error) {
    console.error('[Inner Circle] Password reset error:', error);
    next(error);
  }
});

// ============================================================
// WordPress Integration: Authenticated Member Routes
// ============================================================

/**
 * @route   POST /api/inner-circle/message
 * @desc    Send a message to the Inner Circle AI Concierge
 * @access  API Key (WordPress proxy)
 */
router.post('/message', apiKeyOnly, memberConciergeRateLimiter, promptInjectionGuard, innerCircleController.sendMessage);

/**
 * @route   GET /api/inner-circle/conversations
 * @desc    Get conversation history for a member
 * @access  API Key (WordPress proxy)
 */
router.get('/conversations', apiKeyOnly, innerCircleController.getConversations);

/**
 * @route   GET /api/inner-circle/profile
 * @desc    Get member profile (what the concierge knows about them)
 * @access  API Key (WordPress proxy)
 */
router.get('/profile', apiKeyOnly, innerCircleController.getProfile);

/**
 * @route   GET /api/inner-circle/sessions
 * @desc    Get member's concierge sessions
 * @access  API Key (WordPress proxy)
 */
router.get('/sessions', apiKeyOnly, innerCircleController.getSessions);

/**
 * @route   POST /api/inner-circle/session/:session_id/end
 * @desc    End an active session
 * @access  API Key (WordPress proxy)
 */
router.post('/session/:session_id/end', apiKeyOnly, innerCircleController.endSessionHandler);

// ============================================================
// Phase 2: PowerMove Routes
// ============================================================

/**
 * @route   GET /api/inner-circle/power-moves?member_id=X
 * @desc    Get active PowerMoves for a member
 * @access  API Key (WordPress proxy)
 */
router.get('/power-moves', apiKeyOnly, async (req, res, next) => {
  try {
    const memberId = parseInt(req.query.member_id);
    const status = req.query.status || 'active,in_progress';
    if (!memberId) return res.status(400).json({ success: false, error: 'member_id required' });

    const statuses = status.split(',').map(s => s.trim());
    const result = await query(`
      SELECT id, title, description, pillar, fiscal_target, fiscal_metric,
             starting_value, target_value, current_value, start_date, target_date,
             completed_date, status, action_steps, total_checkins, last_checkin_date,
             streak_weeks, engagement_score, created_at
      FROM power_moves
      WHERE member_id = $1 AND status = ANY($2)
      ORDER BY created_at DESC
    `, [memberId, statuses]);

    res.json({ success: true, powerMoves: result.rows, count: result.rows.length });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/inner-circle/power-moves/:id/checkins
 * @desc    Get check-in history for a PowerMove
 * @access  API Key (WordPress proxy)
 */
router.get('/power-moves/:id/checkins', apiKeyOnly, async (req, res, next) => {
  try {
    const powerMoveId = parseInt(req.params.id);
    const memberId = parseInt(req.query.member_id);
    if (!memberId) return res.status(400).json({ success: false, error: 'member_id required' });

    const result = await query(`
      SELECT id, week_number, checkin_date, checkin_source, progress_update,
             current_value, blockers, wins, ai_coaching_response, ai_sentiment
      FROM power_move_checkins
      WHERE power_move_id = $1 AND member_id = $2
      ORDER BY week_number ASC
    `, [powerMoveId, memberId]);

    res.json({ success: true, checkins: result.rows, count: result.rows.length });
  } catch (error) {
    next(error);
  }
});

// ============================================================
// Phase 2: Watch History Routes
// ============================================================

/**
 * @route   POST /api/inner-circle/watch-history
 * @desc    n8n webhook endpoint — UPSERT watch progress from WordPress portal
 * @access  Webhook (n8n)
 */
router.post('/watch-history', async (req, res, next) => {
  try {
    const { member_id, content_id, content_type, show_id, watch_progress, watch_time_seconds, source } = req.body;

    if (!member_id || !content_id || !content_type) {
      return res.status(400).json({ success: false, error: 'member_id, content_id, content_type required' });
    }

    const completed = (watch_progress || 0) >= 95;

    const result = await query(`
      INSERT INTO member_watch_history (
        member_id, content_id, content_type, show_id,
        watch_progress, total_watch_time_seconds, completed, source
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (member_id, content_id, content_type) DO UPDATE SET
        watch_progress = GREATEST(member_watch_history.watch_progress, EXCLUDED.watch_progress),
        total_watch_time_seconds = member_watch_history.total_watch_time_seconds + COALESCE(EXCLUDED.total_watch_time_seconds, 0),
        watch_count = member_watch_history.watch_count + 1,
        completed = EXCLUDED.completed OR member_watch_history.completed,
        last_watched_at = NOW(),
        updated_at = NOW()
      RETURNING id, watch_progress, completed, watch_count
    `, [
      parseInt(member_id), parseInt(content_id), content_type,
      show_id ? parseInt(show_id) : null,
      watch_progress || 0, watch_time_seconds || 0, completed,
      source || 'portal'
    ]);

    res.json({ success: true, watchHistory: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/inner-circle/watch-history?member_id=X
 * @desc    Get member's watch history
 * @access  API Key (WordPress proxy)
 */
router.get('/watch-history', apiKeyOnly, async (req, res, next) => {
  try {
    const memberId = parseInt(req.query.member_id);
    const limit = parseInt(req.query.limit) || 20;
    if (!memberId) return res.status(400).json({ success: false, error: 'member_id required' });

    const result = await query(`
      SELECT mwh.*, COALESCE(vc.title, pe.title) as title,
             s.name as show_name
      FROM member_watch_history mwh
      LEFT JOIN video_content vc ON mwh.content_id = vc.id AND mwh.content_type = 'video'
      LEFT JOIN podcast_episodes pe ON mwh.content_id = pe.id AND mwh.content_type = 'podcast'
      LEFT JOIN shows s ON mwh.show_id = s.id
      WHERE mwh.member_id = $1
      ORDER BY mwh.last_watched_at DESC
      LIMIT $2
    `, [memberId, limit]);

    res.json({ success: true, watchHistory: result.rows, count: result.rows.length });
  } catch (error) {
    next(error);
  }
});

// ============================================================
// Phase 2: Content & Shows Routes
// ============================================================

/**
 * @route   GET /api/inner-circle/shows
 * @desc    Get all active shows
 * @access  Member
 */
router.get('/shows', async (req, res, next) => {
  try {
    const result = await query(
      'SELECT id, name, slug, hosts, description, format, episode_count FROM shows WHERE is_active = true ORDER BY id'
    );
    res.json({ success: true, shows: result.rows });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/inner-circle/engagement-score?member_id=X
 * @desc    Calculate and return engagement score
 * @access  API Key (WordPress proxy)
 */
router.get('/engagement-score', apiKeyOnly, async (req, res, next) => {
  try {
    const memberId = parseInt(req.query.member_id);
    if (!memberId) return res.status(400).json({ success: false, error: 'member_id required' });

    const score = await calculateEngagementScore(memberId);
    res.json({ success: true, memberId, engagementScore: score });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/inner-circle/content-stats
 * @desc    Get content statistics (shows, videos, podcasts)
 * @access  Member
 */
router.get('/content-stats', async (req, res, next) => {
  try {
    const stats = await getContentStats();
    res.json({ success: true, stats });
  } catch (error) {
    next(error);
  }
});

// Development test route
if (process.env.NODE_ENV === 'development') {
  router.get('/test', (req, res) => {
    res.json({
      success: true,
      message: 'Inner Circle API is working (Phase 2)',
      endpoints: [
        'POST /api/inner-circle/register [API Key]',
        'POST /api/inner-circle/message [API Key]',
        'GET /api/inner-circle/conversations?member_id=X [API Key]',
        'GET /api/inner-circle/profile?member_id=X [API Key]',
        'GET /api/inner-circle/sessions?member_id=X [API Key]',
        'POST /api/inner-circle/session/:session_id/end [API Key]',
        'GET /api/inner-circle/power-moves?member_id=X [API Key]',
        'GET /api/inner-circle/power-moves/:id/checkins?member_id=X [API Key]',
        'POST /api/inner-circle/watch-history [Open - n8n webhook]',
        'GET /api/inner-circle/watch-history?member_id=X [API Key]',
        'GET /api/inner-circle/shows [Open]',
        'GET /api/inner-circle/engagement-score?member_id=X [API Key]',
        'GET /api/inner-circle/content-stats [Open]'
      ]
    });
  });
}

module.exports = router;
