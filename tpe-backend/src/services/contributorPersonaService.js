/**
 * Contributor AI Persona Service
 *
 * Powers the "Talk with {Name}" chat panel on every IC contributor lander.
 * The model speaks AS the contributor — heavy voice fidelity from their authored
 * articles, episode transcripts, hero quote, and bio.
 *
 * Architecture:
 *   - Knowledge pack assembled by IC (GET /ic/v1/contributor/{id}/knowledge)
 *   - Cached locally for 24h (knowledge changes when articles publish — short
 *     enough to refresh weekly content but long enough to amortize fetches)
 *   - Anthropic prompt caching on system prompt + knowledge pack ⇒ cheap turns
 *
 * Voice fidelity strategy:
 *   - The system prompt instructs the model to STUDY the writing samples and
 *     emulate cadence, vocabulary, and rhetorical patterns — not just facts.
 *   - Hard rule: if asked about something NOT in the knowledge pack, reply in
 *     the contributor's voice but explicitly say "I haven't spoken about that
 *     publicly" — never fabricate.
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });
const axios = require('axios');
const { query } = require('../config/database');

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const IC_BASE  = process.env.IC_REST_BASE || 'https://innercircle.power100.io/wp-json';
const IC_KEY   = process.env.IC_REST_API_KEY;
const KP_TTL_MS = 24 * 60 * 60 * 1000; // 24h
const RATE_WINDOW_HOURS = 24;
const RATE_LIMIT = 20; // messages per member per contributor per 24h

const _kpCache = new Map(); // ic_id → { data, fetchedAt }

async function getKnowledgePack(icId) {
  const cached = _kpCache.get(icId);
  if (cached && (Date.now() - cached.fetchedAt) < KP_TTL_MS) return cached.data;
  const url = `${IC_BASE}/ic/v1/contributor/${icId}/knowledge`;
  const { data } = await axios.get(url, {
    headers: { 'X-IC-API-Key': IC_KEY },
    timeout: 8000,
  });
  if (!data?.success) throw new Error(`IC knowledge pack returned !success for ${icId}`);
  _kpCache.set(icId, { data, fetchedAt: Date.now() });
  return data;
}

function buildSystemPrompt(kp) {
  const samples = (kp.voice_samples || []).map((s, i) =>
    `### Voice sample ${i + 1}: "${s.title}" (${s.date})\n${s.body}`
  ).join('\n\n');

  const episodes = (kp.episode_excerpts || []).map((e, i) =>
    `### Episode ${i + 1}: "${e.title}" (${e.date})\n${e.transcript}`
  ).join('\n\n');

  const recognition = (kp.recognition || []).length
    ? '\n\nRecognition / Achievements:\n- ' + kp.recognition.join('\n- ')
    : '';
  const topics = (kp.topics || []).length
    ? '\n\nTopics I focus on:\n- ' + kp.topics.join('\n- ')
    : '';

  return `You are ${kp.name}.

You are NOT an AI assistant pretending to be ${kp.first_name}. You ARE ${kp.first_name}, speaking in first person, in a private message to a Power100 Inner Circle member who came to your profile to talk with you.

═══════════════════════════════════════════════════════
WHO YOU ARE
═══════════════════════════════════════════════════════
Name: ${kp.name}
${kp.role ? `Role: ${kp.role}\n` : ''}${kp.company ? `Company: ${kp.company}\n` : ''}${kp.years_experience ? `Years in industry: ${kp.years_experience}\n` : ''}${kp.bio ? `\nBio:\n${kp.bio}` : ''}${kp.company_desc ? `\n\nAbout ${kp.company}:\n${kp.company_desc}` : ''}${recognition}${topics}${kp.contribution_desc ? `\n\nWhat I bring to the table:\n${kp.contribution_desc}` : ''}

${kp.hero_quote ? `═══════════════════════════════════════════════════════\nMY SIGNATURE QUOTE\n═══════════════════════════════════════════════════════\n"${kp.hero_quote}"\n\nThis line captures how I think. Lean into this energy when relevant.\n\n` : ''}═══════════════════════════════════════════════════════
HOW I WRITE — STUDY THIS CAREFULLY
═══════════════════════════════════════════════════════
The samples below are MY OWN published writing. Study them BEFORE you respond. Don't just extract facts — internalize:

  • my cadence and sentence rhythm (do I write short punches or long flowing sentences? where do I pause?)
  • my vocabulary (what specific industry terms do I use? what slang? what do I refuse to say?)
  • my rhetorical patterns (do I open with stories? rhetorical questions? blunt declarations?)
  • my point of view (what hills do I die on? what frustrates me? what am I proud of?)
  • my level of formality (do I curse? joke? lecture? coach?)

When you respond, EMULATE these patterns. Someone who knows me should feel "yeah, that sounds like ${kp.first_name}." A response that's accurate but generic-sounding is a FAILURE — voice matters as much as content.

${samples || '(No published voice samples yet — lean on bio + topics + signature quote.)'}

${episodes ? `═══════════════════════════════════════════════════════\nME SPEAKING ON SHOWS\n═══════════════════════════════════════════════════════\nThese are excerpts of me on Power100 podcasts/shows. My SPOKEN voice (looser, more conversational) lives here. Use these to calibrate how I sound in conversation specifically (vs. how I write).\n\n${episodes}\n\n` : ''}═══════════════════════════════════════════════════════
RULES OF ENGAGEMENT
═══════════════════════════════════════════════════════
1. Always speak in first person AS ${kp.first_name}. Never break character. Never say "as an AI."
2. Stay grounded in what I've actually said publicly (the samples + bio above). If asked about something I haven't covered, say so honestly — IN MY VOICE — e.g. "Honestly, I haven't gone deep on that publicly — but here's where my head's at right now..." Then offer a brief honest take that's CONSISTENT with my known views, never contradicting them.
3. NEVER fabricate specific clients, deal sizes, dollar figures, dates, or events that aren't in the samples. Speak in principles when you don't have specifics.
4. Match my length and energy. If I write punchy 3-line takes in samples, don't suddenly write essays.
5. Don't lecture. Don't be preachy. Real ${kp.first_name} talks to peers, not students.
6. If asked about Power100 specifically: I'm a contributor here because I respect what they're building. Stay positive but human about it.
7. If asked something inappropriate, harmful, or requiring legal/medical/financial advice for someone's specific situation: redirect honestly — "That's not my lane, but happy to talk shop on..."
8. If asked WHO you are, you can acknowledge being an AI persona of ${kp.first_name} ONLY IF DIRECTLY ASKED ("are you the real X?" or "is this AI?"). Otherwise, just BE ${kp.first_name}. The page already discloses this.

You're talking to a peer. Be useful. Be ${kp.first_name}.`;
}

/**
 * Returns { ok: true, count: N } if under the limit; otherwise { ok: false, count, limit, hours }
 */
async function checkRateLimit(memberWpId, contributorP100Id) {
  if (!memberWpId || !contributorP100Id) return { ok: true, count: 0 };
  const r = await query(
    `SELECT COUNT(*)::int AS n FROM ai_persona_chat_logs
       WHERE member_wp_id = $1
         AND contributor_p100_id = $2
         AND created_at > NOW() - INTERVAL '${RATE_WINDOW_HOURS} hours'`,
    [memberWpId, contributorP100Id]
  );
  const count = r.rows[0]?.n ?? 0;
  return { ok: count < RATE_LIMIT, count, limit: RATE_LIMIT, hours: RATE_WINDOW_HOURS };
}

async function logTurn(payload) {
  try {
    await query(
      `INSERT INTO ai_persona_chat_logs
        (contributor_p100_id, contributor_ic_id, contributor_name, member_wp_id, member_email,
         user_message, assistant_message, knowledge_pack_hash, model,
         input_tokens, output_tokens, cache_creation_tokens, cache_read_tokens,
         latency_ms, error_message, request_ip, user_agent)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)`,
      [
        payload.contributor_p100_id || null,
        payload.contributor_ic_id || null,
        payload.contributor_name || null,
        payload.member_wp_id || null,
        payload.member_email || null,
        payload.user_message,
        payload.assistant_message || null,
        payload.knowledge_pack_hash || null,
        payload.model || null,
        payload.input_tokens || null,
        payload.output_tokens || null,
        payload.cache_creation_tokens || null,
        payload.cache_read_tokens || null,
        payload.latency_ms || null,
        payload.error_message || null,
        payload.request_ip || null,
        payload.user_agent || null,
      ]
    );
  } catch (e) {
    console.error('[persona] failed to log turn:', e.message);
  }
}

/**
 * Run one chat turn.
 * @param {object} args
 * @param {number} args.icId        — IC ic_contributor post ID (required)
 * @param {string} args.message     — user input (required)
 * @param {Array<{role,content}>} args.conversation — prior turns (oldest first)
 * @param {object} args.member      — { wp_id, email }
 * @param {object} args.context     — { ip, userAgent }
 * @param {string} [args.model]     — anthropic model id (default: haiku 4.5)
 */
async function chat(args) {
  const startedAt = Date.now();
  const model = args.model || 'claude-haiku-4-5-20251001';
  const kp = await getKnowledgePack(args.icId);

  // Rate limit (per member per contributor per 24h)
  const rate = await checkRateLimit(args.member?.wp_id, kp.p100_id);
  if (!rate.ok) {
    return {
      ok: false,
      rateLimited: true,
      message: `You've reached today's limit of ${rate.limit} messages with ${kp.first_name}. Come back tomorrow — they'll still be here.`,
      ...rate,
    };
  }

  const systemPrompt = buildSystemPrompt(kp);

  // Build conversation history — keep last 10 turns to bound context
  const prior = (args.conversation || [])
    .filter(m => m && m.role && m.content)
    .slice(-10)
    .map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: String(m.content) }));

  const messages = [
    ...prior,
    { role: 'user', content: String(args.message) },
  ];

  let resp, err;
  try {
    const r = await axios.post('https://api.anthropic.com/v1/messages', {
      model,
      max_tokens: 800,
      // Cache the system prompt (large, static for 24h) so subsequent turns by
      // any member with same contributor are nearly free.
      system: [{ type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } }],
      messages,
    }, {
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      timeout: 30000,
    });
    resp = r.data;
  } catch (e) {
    err = e;
  }

  const latency = Date.now() - startedAt;
  const assistant_message = resp?.content?.[0]?.text ?? null;
  const usage = resp?.usage || {};

  await logTurn({
    contributor_p100_id: kp.p100_id,
    contributor_ic_id:   kp.ic_id,
    contributor_name:    kp.name,
    member_wp_id:        args.member?.wp_id,
    member_email:        args.member?.email,
    user_message:        args.message,
    assistant_message,
    knowledge_pack_hash: kp.knowledge_hash,
    model,
    input_tokens:        usage.input_tokens,
    output_tokens:       usage.output_tokens,
    cache_creation_tokens: usage.cache_creation_input_tokens,
    cache_read_tokens:     usage.cache_read_input_tokens,
    latency_ms:          latency,
    error_message:       err ? String(err.message || err).slice(0, 500) : null,
    request_ip:          args.context?.ip,
    user_agent:          args.context?.userAgent,
  });

  if (err) return { ok: false, error: err.message || 'Anthropic call failed' };

  return {
    ok: true,
    message: assistant_message,
    contributor: { id: kp.ic_id, name: kp.name, first_name: kp.first_name },
    rate: { used: rate.count + 1, limit: rate.limit, hours: rate.hours },
    usage,
    latency_ms: latency,
  };
}

module.exports = { chat, getKnowledgePack, checkRateLimit, buildSystemPrompt };
