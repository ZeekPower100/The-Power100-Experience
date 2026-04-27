/**
 * Unified Communication Service
 *
 * The single chokepoint for ALL email + SMS sent from the TPE project.
 * - Email: SendGrid (primary) → n8n/GHL webhook (fallback)
 * - SMS:   Twilio   (primary) → n8n/GHL webhook (fallback)
 *
 * Every send is logged to the DRC `communications` table in the rankings DB
 * with the `provider` actually used + status — so the rep dashboard sees the
 * full communication history regardless of which channel delivered.
 *
 * Sender domain `info@power100.io` is shared with Power100-Ranking-System
 * (single SendGrid account) so every email sent through this helper builds
 * the SAME domain reputation as the rep-sent emails from the DRC dashboard.
 *
 * Why a fallback at all: if SendGrid has an outage or returns 5xx, the email
 * still goes out via n8n+GHL (the path that already works). We never silently
 * drop a transactional message. Switch primary via env flag if needed:
 *   EMAIL_PROVIDER_PRIMARY=sendgrid|ghl
 *   SMS_PROVIDER_PRIMARY=twilio|ghl
 */
const sgMail = require('@sendgrid/mail');
const twilio = require('twilio');
const axios = require('axios');
const rankingsDbService = require('./rankingsDbService');

const SG_KEY    = process.env.SENDGRID_API_KEY;
const SG_FROM   = process.env.SENDGRID_DEFAULT_FROM      || 'info@power100.io';
const SG_NAME   = process.env.SENDGRID_DEFAULT_FROM_NAME || 'Power100';

const TW_SID    = process.env.TWILIO_ACCOUNT_SID;
const TW_TOKEN  = process.env.TWILIO_AUTH_TOKEN;
const TW_FROM   = process.env.TWILIO_PHONE_NUMBER;

const N8N_EMAIL_FALLBACK = process.env.N8N_EMAIL_FALLBACK_WEBHOOK || '';
const N8N_SMS_FALLBACK   = process.env.N8N_SMS_FALLBACK_WEBHOOK   || '';

const EMAIL_PRIMARY = (process.env.EMAIL_PROVIDER_PRIMARY || 'sendgrid').toLowerCase();
const SMS_PRIMARY   = (process.env.SMS_PROVIDER_PRIMARY   || 'twilio').toLowerCase();

if (SG_KEY) sgMail.setApiKey(SG_KEY);
const _twilioClient = (TW_SID && TW_TOKEN) ? twilio(TW_SID, TW_TOKEN) : null;

/**
 * Send an email through the unified pipeline.
 * @param {object} args
 * @param {string|string[]} args.to        — recipient email(s)
 * @param {string} args.subject
 * @param {string} [args.html]             — HTML body
 * @param {string} [args.text]             — plain-text fallback
 * @param {string} [args.from]             — override sender (default info@power100.io)
 * @param {string} [args.fromName]         — override sender name (default "Power100")
 * @param {string} [args.replyTo]          — reply-to address
 * @param {object[]} [args.headers]        — extra headers e.g. [{key, value}]
 * @param {string} [args.category]         — SendGrid category for analytics (e.g. 'ec_welcome')
 * @param {object} [args.drc]              — { company_id, user_id, contributor_id, subject_override }
 * @returns {Promise<{ok, provider, message_id?, error?, fallback_used?}>}
 */
async function sendEmail(args) {
  const startedAt = Date.now();
  if (!args || !args.to || !args.subject || (!args.html && !args.text)) {
    return { ok: false, error: 'to, subject, and (html|text) are required' };
  }

  const tryOrder = EMAIL_PRIMARY === 'ghl' ? ['ghl', 'sendgrid'] : ['sendgrid', 'ghl'];
  let result = null;
  let fallbackUsed = false;

  for (const provider of tryOrder) {
    try {
      if (provider === 'sendgrid') {
        result = await _sendViaSendGrid(args);
      } else if (provider === 'ghl') {
        if (!N8N_EMAIL_FALLBACK) throw new Error('N8N_EMAIL_FALLBACK_WEBHOOK not set');
        result = await _sendViaN8nFallback(N8N_EMAIL_FALLBACK, {
          channel: 'email',
          to: args.to, from: args.from || SG_FROM, subject: args.subject,
          html: args.html, text: args.text,
        });
      }
      if (result?.ok) break;
    } catch (e) {
      result = { ok: false, error: String(e.message || e) };
    }
    fallbackUsed = true; // one attempt failed, will try next
  }
  fallbackUsed = fallbackUsed && result?.ok; // only true if a fallback actually succeeded

  // Log to DRC communications (best effort — never throw)
  if (args.drc?.company_id) {
    try {
      await rankingsDbService.logCommunication({
        company_id: args.drc.company_id,
        user_id: args.drc.user_id || null,
        comm_type: 'email',
        direction: 'outbound',
        subject: args.drc.subject_override || args.subject,
        content: `[provider=${result?.provider || 'none'}${fallbackUsed ? ' fallback' : ''}] To: ${Array.isArray(args.to) ? args.to.join(', ') : args.to}\n\n${args.text || _stripHtml(args.html || '').slice(0, 2000)}`,
        status: result?.ok ? (fallbackUsed ? 'sent_via_fallback' : 'sent') : 'failed',
        ai_generated: !!args.aiGenerated,
        ai_summary: args.category ? `category=${args.category} latency=${Date.now() - startedAt}ms` : null,
      });
    } catch (e) {
      console.warn('[communicationService] DRC log failed (non-fatal):', e.message);
    }
  }

  return result;
}

/**
 * Send an SMS through the unified pipeline.
 * @param {object} args
 * @param {string} args.to                 — recipient phone (E.164)
 * @param {string} args.body
 * @param {string} [args.from]             — override sender number
 * @param {object} [args.drc]              — { company_id, user_id, contributor_id }
 */
async function sendSms(args) {
  const startedAt = Date.now();
  if (!args || !args.to || !args.body) return { ok: false, error: 'to and body are required' };

  const tryOrder = SMS_PRIMARY === 'ghl' ? ['ghl', 'twilio'] : ['twilio', 'ghl'];
  let result = null;
  let fallbackUsed = false;

  for (const provider of tryOrder) {
    try {
      if (provider === 'twilio') {
        result = await _sendViaTwilio(args);
      } else if (provider === 'ghl') {
        if (!N8N_SMS_FALLBACK) throw new Error('N8N_SMS_FALLBACK_WEBHOOK not set');
        result = await _sendViaN8nFallback(N8N_SMS_FALLBACK, {
          channel: 'sms', to: args.to, from: args.from || TW_FROM, body: args.body,
        });
      }
      if (result?.ok) break;
    } catch (e) {
      result = { ok: false, error: String(e.message || e) };
    }
    fallbackUsed = true;
  }
  fallbackUsed = fallbackUsed && result?.ok;

  if (args.drc?.company_id) {
    try {
      await rankingsDbService.logCommunication({
        company_id: args.drc.company_id,
        user_id: args.drc.user_id || null,
        comm_type: 'sms',
        direction: 'outbound',
        subject: 'SMS',
        content: `[provider=${result?.provider || 'none'}${fallbackUsed ? ' fallback' : ''}] To: ${args.to}\n${args.body}`,
        status: result?.ok ? (fallbackUsed ? 'sent_via_fallback' : 'sent') : 'failed',
        ai_summary: `latency=${Date.now() - startedAt}ms`,
      });
    } catch (e) {
      console.warn('[communicationService] DRC log failed (non-fatal):', e.message);
    }
  }

  return result;
}

// ── Internal: provider implementations ─────────────────────────────────────

async function _sendViaSendGrid(args) {
  if (!SG_KEY) throw new Error('SENDGRID_API_KEY not set');
  const msg = {
    to:      args.to,
    from:    { email: args.from || SG_FROM, name: args.fromName || SG_NAME },
    subject: args.subject,
    html:    args.html || undefined,
    text:    args.text || (args.html ? _stripHtml(args.html) : undefined),
  };
  if (args.replyTo) msg.replyTo = args.replyTo;
  if (args.category) msg.categories = [args.category];
  if (Array.isArray(args.headers) && args.headers.length) {
    msg.headers = {};
    for (const h of args.headers) if (h.key && h.value != null) msg.headers[h.key] = String(h.value);
  }
  // Standard List-Unsubscribe so deliverability is happy
  msg.headers = msg.headers || {};
  if (!msg.headers['List-Unsubscribe']) {
    msg.headers['List-Unsubscribe'] = '<mailto:info@power100.io?subject=Unsubscribe>';
  }

  const [resp] = await sgMail.send(msg);
  const messageId = resp?.headers?.['x-message-id'] || null;
  return { ok: true, provider: 'sendgrid', message_id: messageId };
}

async function _sendViaTwilio(args) {
  if (!_twilioClient) throw new Error('TWILIO_ACCOUNT_SID/AUTH_TOKEN not set');
  const r = await _twilioClient.messages.create({
    to:   args.to,
    from: args.from || TW_FROM,
    body: args.body,
  });
  return { ok: true, provider: 'twilio', message_id: r.sid };
}

async function _sendViaN8nFallback(webhookUrl, payload) {
  const r = await axios.post(webhookUrl, payload, { timeout: 12000 });
  if (r.status >= 200 && r.status < 300) {
    return { ok: true, provider: 'n8n_ghl', message_id: r.data?.message_id || null };
  }
  return { ok: false, provider: 'n8n_ghl', error: `HTTP ${r.status}` };
}

function _stripHtml(html) {
  return String(html || '').replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

module.exports = { sendEmail, sendSms };
