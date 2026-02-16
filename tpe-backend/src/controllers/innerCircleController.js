// DATABASE-CHECKED: inner_circle_members, ai_concierge_sessions, ai_concierge_conversations verified 2026-02-16
// ================================================================
// Inner Circle Controller
// ================================================================
// Purpose: API controller for Inner Circle member concierge endpoints
// Handles: Member message processing, session management, profile access
// Agent: aiConciergeInnerCircleAgent (LangGraph)
// ================================================================

const { v4: uuidv4 } = require('uuid');
const { query } = require('../config/database');
const { getMemberProfile, getMemberSessions } = require('../services/memberScopedQuery');
const { createInnerCircleAgent, getMemberContext, logSession, endSession } = require('../services/agents/aiConciergeInnerCircleAgent');
const { promptInjectionGuard } = require('../middleware/promptInjectionGuard');
const stateMachineManager = require('../services/conciergeStateMachineManager');
const OpenAITracer = require('../services/openai/openaiTracer');

// Lazy-initialized agent per member (keyed by memberId)
const agentCache = new Map();

function getOrCreateAgent(memberId) {
  if (!agentCache.has(memberId)) {
    agentCache.set(memberId, createInnerCircleAgent(memberId));
    console.log(`[Inner Circle Controller] Created agent for member ${memberId}`);
  }
  return agentCache.get(memberId);
}

const innerCircleController = {
  /**
   * POST /api/inner-circle/message
   * Send a message to the Inner Circle AI Concierge
   */
  async sendMessage(req, res, next) {
    try {
      const { member_id, message, session_id } = req.body;

      if (!member_id) {
        return res.status(400).json({ success: false, error: 'member_id is required' });
      }
      if (!message) {
        return res.status(400).json({ success: false, error: 'message is required' });
      }

      const memberId = parseInt(member_id);

      // Verify member exists
      const member = await getMemberProfile(memberId);
      if (!member) {
        return res.status(404).json({ success: false, error: 'Member not found' });
      }

      // Create or reuse session
      let sessionId = session_id;
      if (!sessionId) {
        sessionId = `ic-${uuidv4()}`;
        await logSession(memberId, sessionId, { source: 'api', startedAt: new Date().toISOString() });
      }

      // Update state machine — route to inner_circle_agent
      await stateMachineManager.sendEvent(null, sessionId, 'MESSAGE_RECEIVED', {});
      const agentType = await stateMachineManager.getCurrentAgent(null, sessionId, memberId);
      console.log(`[Inner Circle Controller] State machine routed to: ${agentType} for member ${memberId}`);

      // Save user message
      await query(`
        INSERT INTO ai_concierge_conversations
          (member_id, message_type, content, created_at)
        VALUES ($1, 'user', $2, NOW())
      `, [memberId, message]);

      // Get agent and invoke
      const agent = getOrCreateAgent(memberId);

      // Get member context for system prompt injection
      const memberCtx = await getMemberContext(memberId);

      const agentResponse = await OpenAITracer.traceCall(
        memberId,
        'ai_concierge_inner_circle',
        message,
        async () => agent.invoke(
          {
            messages: [
              {
                role: 'system',
                content: JSON.stringify({ member: memberCtx })
              },
              {
                role: 'user',
                content: message
              }
            ]
          },
          {
            configurable: { thread_id: sessionId }
          }
        )
      );

      // Extract AI response
      const lastMessage = agentResponse.messages[agentResponse.messages.length - 1];
      const aiContent = typeof lastMessage.content === 'object' && lastMessage.content?.content
        ? lastMessage.content.content
        : lastMessage.content;

      // Save AI response
      await query(`
        INSERT INTO ai_concierge_conversations
          (member_id, message_type, content, created_at)
        VALUES ($1, 'ai', $2, NOW())
      `, [memberId, aiContent]);

      // Update member interaction stats
      await query(`
        UPDATE inner_circle_members
        SET last_concierge_interaction = NOW(),
            total_concierge_sessions = COALESCE(total_concierge_sessions, 0) + 1,
            updated_at = NOW()
        WHERE id = $1
      `, [memberId]);

      res.json({
        success: true,
        session_id: sessionId,
        aiResponse: {
          content: aiContent
        }
      });
    } catch (error) {
      console.error('[Inner Circle Controller] sendMessage error:', error);
      next(error);
    }
  },

  /**
   * GET /api/inner-circle/conversations?member_id=X
   * Get conversation history for a member
   */
  async getConversations(req, res, next) {
    try {
      const memberId = parseInt(req.query.member_id);
      const limit = parseInt(req.query.limit) || 50;
      const offset = parseInt(req.query.offset) || 0;

      if (!memberId) {
        return res.status(400).json({ success: false, error: 'member_id is required' });
      }

      const result = await query(`
        SELECT id, member_id, message_type, content, created_at
        FROM ai_concierge_conversations
        WHERE member_id = $1
        ORDER BY created_at ASC
        LIMIT $2 OFFSET $3
      `, [memberId, limit, offset]);

      const countResult = await query(
        'SELECT COUNT(*) as total FROM ai_concierge_conversations WHERE member_id = $1',
        [memberId]
      );

      res.json({
        success: true,
        conversations: result.rows,
        total: parseInt(countResult.rows[0].total),
        hasMore: offset + result.rows.length < parseInt(countResult.rows[0].total)
      });
    } catch (error) {
      console.error('[Inner Circle Controller] getConversations error:', error);
      next(error);
    }
  },

  /**
   * GET /api/inner-circle/profile?member_id=X
   * Get member profile (what the concierge knows about them)
   */
  async getProfile(req, res, next) {
    try {
      const memberId = parseInt(req.query.member_id);

      if (!memberId) {
        return res.status(400).json({ success: false, error: 'member_id is required' });
      }

      const member = await getMemberProfile(memberId);

      if (!member) {
        return res.status(404).json({ success: false, error: 'Member not found' });
      }

      // Return safe subset (no internal IDs or sensitive data)
      res.json({
        success: true,
        profile: {
          id: member.id,
          name: member.name,
          email: member.email,
          businessType: member.business_type,
          revenueTier: member.revenue_tier,
          teamSize: member.team_size,
          focusAreas: member.focus_areas,
          onboardingComplete: member.onboarding_complete,
          partnerUnlocked: member.partner_recommendation_unlocked,
          powerMovesActive: member.power_moves_active,
          powerMovesCompleted: member.power_moves_completed,
          membershipStatus: member.membership_status,
          totalSessions: member.total_concierge_sessions,
          lastInteraction: member.last_concierge_interaction
        }
      });
    } catch (error) {
      console.error('[Inner Circle Controller] getProfile error:', error);
      next(error);
    }
  },

  /**
   * GET /api/inner-circle/sessions?member_id=X
   * Get member's concierge sessions
   */
  async getSessions(req, res, next) {
    try {
      const memberId = parseInt(req.query.member_id);
      const limit = parseInt(req.query.limit) || 10;

      if (!memberId) {
        return res.status(400).json({ success: false, error: 'member_id is required' });
      }

      const sessions = await getMemberSessions(memberId, limit);

      res.json({
        success: true,
        sessions,
        count: sessions.length
      });
    } catch (error) {
      console.error('[Inner Circle Controller] getSessions error:', error);
      next(error);
    }
  },

  /**
   * POST /api/inner-circle/session/:session_id/end
   * End an active session
   */
  async endSessionHandler(req, res, next) {
    try {
      const { session_id } = req.params;

      if (!session_id) {
        return res.status(400).json({ success: false, error: 'session_id is required' });
      }

      await endSession(session_id);

      res.json({
        success: true,
        message: 'Session ended'
      });
    } catch (error) {
      console.error('[Inner Circle Controller] endSession error:', error);
      next(error);
    }
  }
};

module.exports = innerCircleController;
