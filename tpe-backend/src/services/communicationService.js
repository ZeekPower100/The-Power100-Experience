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

/**
 * Send an internal operator alert (email + SMS) for important events:
 * new EC signup, new show-guest form, new contractor conversion, etc.
 *
 * Default recipients: Greg + Zeek (override via OPERATOR_ALERT_EMAILS /
 * OPERATOR_ALERT_PHONES env vars; comma-separated). The defaults are
 * canonical and codified — every signup/conversion event in the project
 * MUST call this, even if the contributor-facing email/SMS already fired.
 *
 * @param {object} args
 * @param {string} args.event       — short slug, e.g. 'ec_signup', 'show_guest_form'
 * @param {string} args.title       — one-line headline ("New EC Signup: Nick Zindel")
 * @param {object} args.fields      — key/value pairs to render in the alert body
 * @param {string} [args.cta_url]   — optional follow-up link
 * @param {object} [args.drc]       — { company_id, user_id } for audit logging
 * @param {boolean} [args.smsOnly]  — skip email (rare; default sends both)
 * @param {boolean} [args.emailOnly] — skip SMS
 */
async function sendOperatorAlert(args) {
  if (!args || !args.event || !args.title) {
    return { ok: false, error: 'event and title are required' };
  }

  // Defaults: Greg + Zeek. Overridable per-call via args.recipients, or globally
  // via env. CSV format. Default emails/phones live here so the policy is in code.
  const DEFAULT_EMAILS = ['greg@power100.io', 'zeek@power100.io'];
  const DEFAULT_PHONES = ['+17274304341', '+18108934075'];

  const emails = args.recipients?.emails ||
    (process.env.OPERATOR_ALERT_EMAILS ? process.env.OPERATOR_ALERT_EMAILS.split(',').map(s => s.trim()).filter(Boolean) : DEFAULT_EMAILS);
  const phones = args.recipients?.phones ||
    (process.env.OPERATOR_ALERT_PHONES ? process.env.OPERATOR_ALERT_PHONES.split(',').map(s => s.trim()).filter(Boolean) : DEFAULT_PHONES);

  // Build email body
  const fields = args.fields || {};
  const fieldRows = Object.entries(fields)
    .filter(([_, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `<tr><td style="padding:6px 12px 6px 0;color:#6c757d;vertical-align:top;font-size:13px;">${_escapeHtml(k)}</td><td style="padding:6px 0;color:#000;font-size:14px;font-weight:500;">${_escapeHtml(String(v))}</td></tr>`)
    .join('');
  const cta = args.cta_url ? `<p style="margin:24px 0 0;"><a href="${args.cta_url}" style="display:inline-block;padding:10px 20px;background:#FB0401;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px;">View in Admin</a></p>` : '';

  const html = `<!doctype html><html><body style="margin:0;padding:24px;background:#f8f9fa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<table role="presentation" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,0.06);">
  <tr><td style="padding:24px 32px;background:#000;color:#fff;">
    <div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#FB0401;font-weight:700;margin-bottom:8px;">Power100 · Operator Alert</div>
    <div style="font-size:22px;font-weight:700;line-height:1.25;">${_escapeHtml(args.title)}</div>
  </td></tr>
  <tr><td style="padding:28px 32px;">
    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;">${fieldRows}</table>
    ${cta}
    <p style="margin:24px 0 0;color:#9ca3af;font-size:11px;">event: ${_escapeHtml(args.event)} · ${new Date().toISOString()}</p>
  </td></tr>
</table></body></html>`;

  // SMS body — short, scannable
  const smsLines = [args.title];
  for (const [k, v] of Object.entries(fields)) {
    if (v === undefined || v === null || v === '') continue;
    smsLines.push(`${k}: ${v}`);
    if (smsLines.join('\n').length > 280) break;
  }
  if (args.cta_url) smsLines.push(args.cta_url);
  const smsBody = smsLines.join('\n');

  const results = { event: args.event, emails: [], sms: [] };

  if (!args.smsOnly) {
    for (const to of emails) {
      try {
        const r = await sendEmail({
          to, subject: `[P100 Alert] ${args.title}`, html,
          drc: args.drc ? { ...args.drc, subject_override: `Operator Alert: ${args.title}` } : null,
          category: 'operator_alert',
        });
        results.emails.push({ to, ok: !!r?.ok, provider: r?.provider });
      } catch (e) { results.emails.push({ to, ok: false, error: e.message }); }
    }
  }

  if (!args.emailOnly) {
    for (const to of phones) {
      try {
        const r = await sendSms({ to, body: smsBody, drc: args.drc });
        results.sms.push({ to, ok: !!r?.ok, provider: r?.provider });
      } catch (e) { results.sms.push({ to, ok: false, error: e.message }); }
    }
  }

  results.ok = results.emails.every(r => r.ok) && results.sms.every(r => r.ok);
  return results;
}

function _escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

module.exports = { sendEmail, sendSms, sendOperatorAlert };
