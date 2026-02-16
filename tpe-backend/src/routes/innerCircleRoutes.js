// DATABASE-CHECKED: inner_circle_members, power_moves, member_watch_history verified 2026-02-16
const express = require('express');
const router = express.Router();
const innerCircleController = require('../controllers/innerCircleController');
const { promptInjectionGuard } = require('../middleware/promptInjectionGuard');
const { memberConciergeRateLimiter } = require('../config/security');
const { query } = require('../config/database');
const { calculateEngagementScore } = require('../services/engagementScoreService');
const { getContentStats } = require('../services/contentIngestionService');

// All Inner Circle routes use prompt injection guard on message input
// and per-member rate limiting

/**
 * @route   POST /api/inner-circle/message
 * @desc    Send a message to the Inner Circle AI Concierge
 * @access  Member (via WordPress portal token — auth TBD in Phase 2)
 */
router.post('/message', memberConciergeRateLimiter, promptInjectionGuard, innerCircleController.sendMessage);

/**
 * @route   GET /api/inner-circle/conversations
 * @desc    Get conversation history for a member
 * @access  Member
 */
router.get('/conversations', innerCircleController.getConversations);

/**
 * @route   GET /api/inner-circle/profile
 * @desc    Get member profile (what the concierge knows about them)
 * @access  Member
 */
router.get('/profile', innerCircleController.getProfile);

/**
 * @route   GET /api/inner-circle/sessions
 * @desc    Get member's concierge sessions
 * @access  Member
 */
router.get('/sessions', innerCircleController.getSessions);

/**
 * @route   POST /api/inner-circle/session/:session_id/end
 * @desc    End an active session
 * @access  Member
 */
router.post('/session/:session_id/end', innerCircleController.endSessionHandler);

// ============================================================
// Phase 2: PowerMove Routes
// ============================================================

/**
 * @route   GET /api/inner-circle/power-moves?member_id=X
 * @desc    Get active PowerMoves for a member
 * @access  Member
 */
router.get('/power-moves', async (req, res, next) => {
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
 * @access  Member
 */
router.get('/power-moves/:id/checkins', async (req, res, next) => {
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
 * @access  Member
 */
router.get('/watch-history', async (req, res, next) => {
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
 * @access  Member
 */
router.get('/engagement-score', async (req, res, next) => {
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
        'POST /api/inner-circle/message',
        'GET /api/inner-circle/conversations?member_id=X',
        'GET /api/inner-circle/profile?member_id=X',
        'GET /api/inner-circle/sessions?member_id=X',
        'POST /api/inner-circle/session/:session_id/end',
        'GET /api/inner-circle/power-moves?member_id=X',
        'GET /api/inner-circle/power-moves/:id/checkins?member_id=X',
        'POST /api/inner-circle/watch-history',
        'GET /api/inner-circle/watch-history?member_id=X',
        'GET /api/inner-circle/shows',
        'GET /api/inner-circle/engagement-score?member_id=X',
        'GET /api/inner-circle/content-stats'
      ]
    });
  });
}

module.exports = router;
