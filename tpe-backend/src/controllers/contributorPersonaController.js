/**
 * Contributor AI Persona Controller
 *
 * Single endpoint: POST /api/contributor-persona/ask
 *
 * Auth: HMAC bridge token from IC. The IC contributor lander template prints a
 * signed nonce (HMAC-SHA256 of "{member_wp_id}:{ts}" using IC_PERSONA_BRIDGE_SECRET)
 * into the page. Browser sends member_wp_id + ts + nonce on every request; we
 * recompute and compare. ts must be within last 4 hours.
 *
 * If IC_PERSONA_BRIDGE_SECRET is not set, falls back to "open" mode (logs + rate
 * limits still apply by member_wp_id, but no signature check) — useful for local
 * dev only.
 */
const crypto = require('crypto');
const personaService = require('../services/contributorPersonaService');

const BRIDGE_SECRET = process.env.IC_PERSONA_BRIDGE_SECRET || '';
const TS_WINDOW_SEC = 4 * 60 * 60;

function verifyBridge({ member_wp_id, ts, nonce }) {
  if (!BRIDGE_SECRET) return { ok: true, dev: true };
  if (!member_wp_id || !ts || !nonce) return { ok: false, reason: 'missing bridge fields' };
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - Number(ts)) > TS_WINDOW_SEC) return { ok: false, reason: 'token expired' };
  const expected = crypto.createHmac('sha256', BRIDGE_SECRET)
    .update(`${member_wp_id}:${ts}`).digest('hex');
  if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(String(nonce)))) {
    return { ok: false, reason: 'bad signature' };
  }
  return { ok: true };
}

async function ask(req, res) {
  try {
    const {
      ic_id, message, conversation,
      member_wp_id, member_email, ts, nonce, model,
    } = req.body || {};

    if (!ic_id || !message) {
      return res.status(400).json({ ok: false, error: 'ic_id and message are required' });
    }
    if (typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ ok: false, error: 'message must be a non-empty string' });
    }
    if (message.length > 2000) {
      return res.status(400).json({ ok: false, error: 'message too long (max 2000 chars)' });
    }

    const auth = verifyBridge({ member_wp_id, ts, nonce });
    if (!auth.ok) return res.status(401).json({ ok: false, error: `auth: ${auth.reason}` });

    const result = await personaService.chat({
      icId:        Number(ic_id),
      message:     message.trim(),
      conversation: Array.isArray(conversation) ? conversation : [],
      member:      { wp_id: Number(member_wp_id) || null, email: member_email || null },
      context:     { ip: req.ip, userAgent: req.get('user-agent') },
      model,
    });

    if (!result.ok && result.rateLimited) {
      return res.status(429).json(result);
    }
    if (!result.ok) {
      return res.status(500).json(result);
    }
    return res.json(result);
  } catch (e) {
    console.error('[persona ask] fatal:', e);
    return res.status(500).json({ ok: false, error: e.message || 'fatal' });
  }
}

module.exports = { ask };
