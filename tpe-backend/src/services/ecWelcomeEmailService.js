/**
 * EC Welcome Email — branded HTML template, fires on EC signup.
 *
 * Uses communicationService (SendGrid primary, n8n+GHL fallback) so domain
 * reputation builds on info@power100.io while keeping a safety net.
 *
 * Sent automatically from ecDrcIntegrationService.handleSignup() — every
 * paid EC who completes the form lands this in their inbox within seconds.
 */
const comms = require('./communicationService');

const CALENDLY_URL = process.env.CALENDLY_POWERCHAT_URL || 'https://calendly.com/d/cvmv-39t-7qs/powerchat-production-call';

function buildHtml({ firstName, planLabel, calendlyUrl }) {
  const safeName = (firstName || 'there').replace(/</g, '&lt;');
  const plan = planLabel ? ` (${planLabel})` : '';
  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#222;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f5f5f5" style="padding:32px 16px;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" border="0" bgcolor="#ffffff" style="max-width:600px;border-radius:12px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,0.06);">
      <!-- Header -->
      <tr><td style="background:linear-gradient(135deg,#0e0e0e 0%,#1a1a1a 100%);padding:32px;text-align:center;">
        <div style="display:inline-block;background:rgba(251,4,1,0.15);color:#ff5d5b;padding:6px 14px;border-radius:999px;font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:14px;">Welcome to Power100</div>
        <h1 style="color:#ffffff;margin:0;font-size:30px;font-weight:800;letter-spacing:-0.5px;">You're In, ${safeName}.</h1>
      </td></tr>

      <!-- Body -->
      <tr><td style="padding:32px;font-size:16px;line-height:1.55;color:#222;">
        <p style="margin:0 0 16px;">Welcome aboard as a Power100 Expert Contributor${plan}. We're fired up to have you in the network.</p>
        <p style="margin:0 0 16px;">The next step is a quick onboarding PowerChat with our CEO, <strong>Greg Cummings</strong>. He'll walk you through what's coming, get the details on your contributor profile, and make sure your launch is set up to land with maximum impact.</p>

        <!-- CTA -->
        <table cellpadding="0" cellspacing="0" border="0" align="center" style="margin:28px auto;">
          <tr><td bgcolor="#FB0401" style="border-radius:999px;">
            <a href="${calendlyUrl}" target="_blank" style="display:inline-block;padding:14px 32px;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;letter-spacing:0.3px;border-radius:999px;">Schedule Your Onboarding PowerChat →</a>
          </td></tr>
        </table>

        <p style="margin:0 0 16px;font-size:14px;color:#555;">A few things to expect after the call:</p>
        <ul style="margin:0 0 20px;padding-left:20px;font-size:14px;color:#555;line-height:1.65;">
          <li>Your contributor profile goes live on <a href="https://power100.io" style="color:#FB0401;text-decoration:none;">power100.io</a>, the staging revamp site, and inside Inner Circle.</li>
          <li>Your AI persona panel goes live so members can ask you anything 24/7 in your voice.</li>
          <li>Your assigned rep stays in touch to coordinate launch announcements and content scheduling.</li>
        </ul>

        <p style="margin:0 0 8px;">Reply to this email any time — it routes straight to our team.</p>
        <p style="margin:24px 0 0;color:#555;">— The Power100 Team</p>
      </td></tr>

      <!-- Footer -->
      <tr><td style="background:#fafafa;padding:20px;text-align:center;font-size:11px;color:#999;border-top:1px solid #eee;">
        Power100 · The nation's CEO ranking and media platform for the home improvement industry<br>
        <a href="https://power100.io" style="color:#999;text-decoration:none;">power100.io</a>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;
}

function buildText({ firstName, calendlyUrl }) {
  const safeName = firstName || 'there';
  return `You're in, ${safeName}.

Welcome aboard as a Power100 Expert Contributor. The next step is a quick onboarding PowerChat with our CEO, Greg Cummings.

Schedule your call: ${calendlyUrl}

A few things to expect after the call:
- Your contributor profile goes live on power100.io, the staging revamp site, and inside Inner Circle
- Your AI persona panel goes live so members can ask you anything in your voice
- Your assigned rep stays in touch to coordinate launch announcements

Reply to this email any time.
— The Power100 Team`;
}

/**
 * Send welcome email to a paid EC.
 * @param {object} contributor - expert_contributors row (needs first_name, last_name, email, rankings_company_id, assigned_rep_id, plan_id)
 */
async function sendEcWelcomeEmail(contributor) {
  if (!contributor || !contributor.email) {
    console.warn('[ecWelcomeEmail] Skipped — no email on row', contributor?.id);
    return { ok: false, error: 'no email' };
  }
  // Skip placeholder addresses — these come from auto-created rows that haven't captured a real address yet
  if (/@placeholder\.power100\.io$/i.test(contributor.email)) {
    console.warn('[ecWelcomeEmail] Skipped — placeholder email on row', contributor.id);
    return { ok: false, error: 'placeholder email' };
  }

  const planLabels = { 1: 'EC Individual', 2: 'EC Partner', 3: 'EC Partner Plus', 4: 'EC Enterprise' };
  const planLabel = planLabels[contributor.plan_id] || '';

  const subject = `Welcome to Power100, ${contributor.first_name} — Schedule Your Onboarding PowerChat`;
  const html = buildHtml({ firstName: contributor.first_name, planLabel, calendlyUrl: CALENDLY_URL });
  const text = buildText({ firstName: contributor.first_name, calendlyUrl: CALENDLY_URL });

  const result = await comms.sendEmail({
    to:      contributor.email,
    subject,
    html,
    text,
    fromName: 'Greg Cummings, Power100',
    replyTo: 'info@power100.io',
    category: 'ec_welcome',
    drc: {
      company_id: contributor.rankings_company_id || null,
      user_id:    contributor.assigned_rep_id || null,
      contributor_id: contributor.id,
      subject_override: `EC Welcome Email Sent: ${contributor.first_name} ${contributor.last_name}`,
    },
  });

  if (result.ok) {
    console.log(`[ecWelcomeEmail] ✓ sent to ${contributor.email} via ${result.provider} (msg ${result.message_id})`);
  } else {
    console.error(`[ecWelcomeEmail] ✗ failed for ${contributor.email}:`, result.error);
  }
  return result;
}

module.exports = { sendEcWelcomeEmail, buildHtml, buildText };
