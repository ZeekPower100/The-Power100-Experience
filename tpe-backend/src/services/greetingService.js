// DATABASE-CHECKED: inner_circle_members(last_concierge_interaction), member_watch_history, power_moves(streak_weeks), video_content, shows verified 2026-03-01
// ================================================================
// Inner Circle Greeting Service (Hybrid AI + Template)
// ================================================================
// Gathers member context from DB, then uses GPT-4o-mini to generate
// a personalized, natural greeting with an engaging CTA.
// Falls back to template if AI call fails.
// Greeting is cached per session — persists until new login.
// Cost: ~$0.0001 per greeting (one call per session).
// ================================================================

const OpenAI = require('openai');
const { query } = require('../config/database');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// In-memory session greeting cache: { memberId -> { greeting, generatedAt, sessionId } }
const greetingCache = new Map();

const SYSTEM_PROMPT = `You are the AI concierge for The Power 100 Experience Inner Circle — a premium community for home improvement contractors. You're greeting a member when they open the portal.

Your job: Write a short, warm, personalized greeting (2-3 sentences max) using the member context provided. Always end with an inviting question or call-to-action that encourages them to engage with you.

Rules:
- Use their first name naturally
- Reference something specific from their context (new content, PowerMove progress, watch streak, etc.)
- Always close with an engaging CTA like "What can I help you with today?", "What are you looking to tackle today?", "Anything I can help you find?", "Ready to keep the momentum going?", "What's on your mind today?" — vary it each time
- Keep it conversational and confident, not corporate or robotic
- Never use emojis
- Never mention you're an AI
- If they're brand new (no watch history), welcome them warmly and offer to help them get started
- 2-3 sentences max. Be concise.`;

const greetingService = {

  async getGreeting(memberId, sessionId) {
    const cached = greetingCache.get(memberId);
    if (cached && cached.sessionId === sessionId) {
      return cached.greeting;
    }

    const greeting = await this.generateGreeting(memberId);
    greetingCache.set(memberId, { greeting, generatedAt: new Date(), sessionId });
    return greeting;
  },

  async generateGreeting(memberId) {
    // Fetch all context in parallel
    const [memberResult, newContentResult, watchStatsResult, activePowerMoveResult] = await Promise.all([
      query(`SELECT name, last_concierge_interaction FROM inner_circle_members WHERE id = $1`, [memberId]),
      query(`
        SELECT COUNT(*) as new_count
        FROM video_content
        WHERE is_active = true
          AND upload_date > COALESCE(
            (SELECT last_concierge_interaction FROM inner_circle_members WHERE id = $1),
            NOW() - INTERVAL '7 days'
          )
      `, [memberId]),
      query(`
        SELECT COUNT(*) as total_watched,
               SUM(total_watch_time_seconds) as total_seconds,
               COUNT(CASE WHEN completed = true THEN 1 END) as completed_count,
               MAX(last_watched_at) as last_watched
        FROM member_watch_history
        WHERE member_id = $1
      `, [memberId]),
      query(`
        SELECT title, streak_weeks, status
        FROM power_moves
        WHERE member_id = $1 AND status = 'active'
        ORDER BY updated_at DESC
        LIMIT 1
      `, [memberId])
    ]);

    const member = memberResult.rows[0];
    if (!member) return { message: 'Welcome to the Inner Circle. What can I help you with today?', context: {} };

    const firstName = member.name ? member.name.split(' ')[0] : 'there';
    const newCount = parseInt(newContentResult.rows[0]?.new_count || 0);
    const totalWatched = parseInt(watchStatsResult.rows[0]?.total_watched || 0);
    const completedCount = parseInt(watchStatsResult.rows[0]?.completed_count || 0);
    const totalSeconds = parseInt(watchStatsResult.rows[0]?.total_seconds || 0);
    const totalHours = Math.floor(totalSeconds / 3600);
    const activePowerMove = activePowerMoveResult.rows[0] || null;

    const hour = new Date().getHours();
    const timeOfDay = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';

    // Build context object for AI and response
    const context = {
      first_name: firstName,
      time_of_day: timeOfDay,
      new_content_count: newCount,
      total_episodes_watched: totalWatched,
      completed_episodes: completedCount,
      total_watch_hours: totalHours,
      is_new_viewer: totalWatched === 0,
      active_power_move: activePowerMove ? {
        title: activePowerMove.title,
        week: activePowerMove.streak_weeks || 1
      } : null
    };

    // Try AI generation, fall back to template
    try {
      const aiMessage = await this.generateWithAI(context);
      return { message: aiMessage, context, generated_at: new Date().toISOString(), source: 'ai' };
    } catch (error) {
      console.error('[Greeting] AI generation failed, using template fallback:', error.message);
      const templateMessage = this.buildTemplateFallback(context);
      return { message: templateMessage, context, generated_at: new Date().toISOString(), source: 'template' };
    }
  },

  async generateWithAI(context) {
    const userPrompt = `Member context:
- Name: ${context.first_name}
- Time of day: ${context.time_of_day}
- New episodes since last visit: ${context.new_content_count}
- Total episodes watched: ${context.total_episodes_watched}
- Episodes completed: ${context.completed_episodes}
- Total watch hours: ${context.total_watch_hours}
- First-time viewer: ${context.is_new_viewer}
- Active PowerMove: ${context.active_power_move ? `"${context.active_power_move.title}" (week ${context.active_power_move.week})` : 'None'}

Write the greeting now.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt }
      ],
      max_tokens: 80,
      temperature: 0.9
    });

    return response.choices[0].message.content.trim();
  },

  buildTemplateFallback(ctx) {
    const parts = [];

    if (ctx.time_of_day === 'morning') parts.push(`Good morning, ${ctx.first_name}.`);
    else if (ctx.time_of_day === 'afternoon') parts.push(`Good afternoon, ${ctx.first_name}.`);
    else parts.push(`Good evening, ${ctx.first_name}.`);

    if (ctx.new_content_count > 0) {
      const plural = ctx.new_content_count === 1 ? 'episode has' : 'episodes have';
      parts.push(`${ctx.new_content_count} new ${plural} dropped since your last visit.`);
    } else if (ctx.active_power_move) {
      parts.push(`Your PowerMove "${ctx.active_power_move.title}" is on week ${ctx.active_power_move.week}.`);
    } else if (ctx.is_new_viewer) {
      parts.push(`Glad to have you here.`);
    }

    parts.push('What can I help you with today?');
    return parts.join(' ');
  },

  clearGreeting(memberId) {
    greetingCache.delete(memberId);
  }
};

module.exports = greetingService;
