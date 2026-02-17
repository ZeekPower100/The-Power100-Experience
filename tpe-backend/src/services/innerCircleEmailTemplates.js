// DATABASE-CHECKED: inner_circle_members columns verified 2026-02-16
// ================================================================
// Inner Circle Email & SMS Templates
// ================================================================
// Purpose: Branded communication templates for IC member lifecycle
// Brand: Dark theme (#0A0A0A bg), Gold accent (#C8A951), Power100 Red (#FB0401)
// Fonts: Oswald (headlines), Inter (body) — via Google Fonts web-safe fallback
// Flow: Backend builds HTML → n8n webhook → GHL delivers
// ================================================================

const axios = require('axios');
const { query } = require('../config/database');

// n8n webhook configuration
const N8N_WEBHOOK_BASE = process.env.N8N_WEBHOOK_BASE || 'https://n8n.srv918843.hstgr.cloud';
const N8N_ENV = process.env.NODE_ENV === 'production' ? '' : '-dev';

// IC Brand Colors
const IC_BRAND = {
  black: '#0A0A0A',
  charcoal: '#141414',
  darkGray: '#1A1A1A',
  gold: '#C8A951',
  goldHover: '#D4B95E',
  red: '#FB0401',
  white: '#FFFFFF',
  dimText: '#B3B3B3',
  mutedText: '#666666',
  successGreen: '#00B05D',
  border: '#1F1F1F'
};

// Base64-encoded IC logo (gold Power100 icon in golden circle)
const fs = require('fs');
const path = require('path');
const IC_LOGO_BASE64 = fs.readFileSync(path.join(__dirname, 'ic-logo-base64.txt'), 'utf8').trim();

/**
 * Inner Circle base email template wrapper
 * Dark theme with gold accents — distinct from TPX white/red templates
 */
function wrapICEmailTemplate(content) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Power100 Inner Circle</title>
  <link href="https://fonts.googleapis.com/css2?family=Oswald:wght@700&family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
</head>
<body style="margin: 0; padding: 0; font-family: 'Inter', Arial, Helvetica, sans-serif; background-color: ${IC_BRAND.black}; color: ${IC_BRAND.white};">
  <div style="max-width: 600px; margin: 0 auto; background-color: ${IC_BRAND.charcoal};">

    <!-- Header with IC branding + logo -->
    <div style="background-color: ${IC_BRAND.black}; padding: 35px 40px; text-align: center; border-bottom: 2px solid ${IC_BRAND.gold};">
      <img src="data:image/png;base64,${IC_LOGO_BASE64}" alt="Power100 Inner Circle" width="80" height="80" style="display: block; margin: 0 auto 16px auto; width: 80px; height: 80px;" />
      <h1 style="margin: 0 0 6px 0; color: ${IC_BRAND.gold}; font-family: 'Oswald', Arial, sans-serif; font-size: 28px; font-weight: 700; letter-spacing: 4px; text-transform: uppercase;">
        INNER CIRCLE
      </h1>
      <p style="margin: 0; color: ${IC_BRAND.dimText}; font-size: 12px; letter-spacing: 2px; text-transform: uppercase;">
        by Power100
      </p>
    </div>

    <!-- Main content area -->
    <div style="padding: 40px 40px 50px 40px;">
      ${content}
    </div>

    <!-- Footer -->
    <div style="background-color: ${IC_BRAND.black}; padding: 25px 40px; text-align: center; border-top: 1px solid ${IC_BRAND.border};">
      <p style="margin: 0 0 8px 0; color: ${IC_BRAND.mutedText}; font-size: 13px;">
        &copy; ${new Date().getFullYear()} Power100. All rights reserved.
      </p>
      <p style="margin: 0; color: ${IC_BRAND.mutedText}; font-size: 11px;">
        You're receiving this because you're a Power100 Inner Circle member.
      </p>
    </div>

  </div>
</body>
</html>
  `.trim();
}

// ================================================================
// Registration Confirmation Email
// ================================================================

function buildICRegistrationEmail(data) {
  const { name, email } = data;
  const firstName = name.split(' ')[0];
  const portalUrl = 'https://innercircle.power100.io';

  const content = `
    <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: ${IC_BRAND.white};">
      Welcome, <strong>${firstName}</strong>.
    </p>

    <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: ${IC_BRAND.dimText};">
      You're officially part of the Power100 Inner Circle &mdash; a private community for contractors who are serious about growth, accountability, and building a business that lasts.
    </p>

    <!-- Gold accent box -->
    <div style="background-color: ${IC_BRAND.darkGray}; border-left: 4px solid ${IC_BRAND.gold}; padding: 20px 24px; margin: 0 0 28px 0; border-radius: 0 4px 4px 0;">
      <h2 style="margin: 0 0 14px 0; font-family: 'Oswald', Arial, sans-serif; font-size: 18px; color: ${IC_BRAND.gold}; text-transform: uppercase; letter-spacing: 2px;">
        What's Next
      </h2>
      <ul style="margin: 0; padding: 0 0 0 18px; font-size: 15px; line-height: 2; color: ${IC_BRAND.dimText};">
        <li>Log in to your <strong style="color: ${IC_BRAND.white};">Inner Circle Portal</strong></li>
        <li>Complete your <strong style="color: ${IC_BRAND.white};">business profile</strong> so your AI concierge knows your goals</li>
        <li>Launch your first <strong style="color: ${IC_BRAND.white};">PowerMove</strong> &mdash; an 8-week action plan tailored to your business</li>
        <li>Explore curated <strong style="color: ${IC_BRAND.white};">shows, podcasts, and resources</strong></li>
      </ul>
    </div>

    <p style="margin: 0 0 28px 0; font-size: 15px; line-height: 1.6; color: ${IC_BRAND.dimText};">
      Your AI concierge is ready when you are &mdash; it knows your business type, revenue tier, and goals. Just ask it anything.
    </p>

    <!-- CTA Button -->
    <div style="text-align: center; margin: 0 0 28px 0;">
      <a href="${portalUrl}" style="display: inline-block; background-color: ${IC_BRAND.gold}; color: ${IC_BRAND.black}; text-decoration: none; padding: 14px 40px; font-size: 16px; font-weight: 700; font-family: 'Oswald', Arial, sans-serif; letter-spacing: 2px; text-transform: uppercase; border-radius: 4px;">
        ENTER THE INNER CIRCLE
      </a>
    </div>

    <p style="margin: 0; font-size: 13px; color: ${IC_BRAND.mutedText}; text-align: center;">
      Your login email: <strong style="color: ${IC_BRAND.dimText};">${email}</strong>
    </p>
  `;

  return wrapICEmailTemplate(content);
}

// ================================================================
// Password Reset Email
// ================================================================

function buildICPasswordResetEmail(data) {
  const { name, resetUrl, expiresIn } = data;
  const firstName = name ? name.split(' ')[0] : 'Member';
  const expiry = expiresIn || '1 hour';

  const content = `
    <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: ${IC_BRAND.white};">
      Hi <strong>${firstName}</strong>,
    </p>

    <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: ${IC_BRAND.dimText};">
      We received a request to reset your Inner Circle password. Click the button below to set a new one.
    </p>

    <!-- CTA Button -->
    <div style="text-align: center; margin: 0 0 28px 0;">
      <a href="${resetUrl}" style="display: inline-block; background-color: ${IC_BRAND.gold}; color: ${IC_BRAND.black}; text-decoration: none; padding: 14px 40px; font-size: 16px; font-weight: 700; font-family: 'Oswald', Arial, sans-serif; letter-spacing: 2px; text-transform: uppercase; border-radius: 4px;">
        RESET PASSWORD
      </a>
    </div>

    <!-- Info box -->
    <div style="background-color: ${IC_BRAND.darkGray}; border-left: 4px solid ${IC_BRAND.gold}; padding: 16px 20px; margin: 0 0 24px 0; border-radius: 0 4px 4px 0;">
      <p style="margin: 0; font-size: 14px; color: ${IC_BRAND.dimText}; line-height: 1.6;">
        This link expires in <strong style="color: ${IC_BRAND.white};">${expiry}</strong>. If you didn't request a password reset, you can safely ignore this email &mdash; your account is secure.
      </p>
    </div>

    <p style="margin: 0; font-size: 13px; color: ${IC_BRAND.mutedText}; text-align: center;">
      If the button doesn't work, copy and paste this URL into your browser:<br>
      <span style="color: ${IC_BRAND.gold}; word-break: break-all;">${resetUrl}</span>
    </p>
  `;

  return wrapICEmailTemplate(content);
}

// ================================================================
// SMS Templates
// ================================================================

function buildICRegistrationSMS(data) {
  const firstName = data.name ? data.name.split(' ')[0] : 'there';
  return `Welcome to the Power100 Inner Circle, ${firstName}! Your membership is active. Log in at innercircle.power100.io to meet your AI concierge and launch your first PowerMove. - Power100`;
}

function buildICPasswordResetSMS(data) {
  const firstName = data.name ? data.name.split(' ')[0] : 'there';
  return `Hi ${firstName}, here's your Power100 Inner Circle password reset link: ${data.resetUrl} — This link expires in ${data.expiresIn || '1 hour'}. If you didn't request this, ignore this message.`;
}

// ================================================================
// Sending Functions (Backend → n8n → GHL)
// ================================================================

/**
 * Send IC registration confirmation email + SMS
 * Called from POST /api/inner-circle/register
 */
async function sendICRegistrationComms(memberId) {
  try {
    const memberResult = await query(
      'SELECT id, name, email, phone FROM inner_circle_members WHERE id = $1',
      [memberId]
    );

    if (!memberResult.rows.length) {
      console.warn(`[IC Comms] Member ${memberId} not found, skipping comms`);
      return { email: false, sms: false };
    }

    const member = memberResult.rows[0];
    const results = { email: false, sms: false };

    // Send registration email
    if (member.email) {
      const emailHtml = buildICRegistrationEmail({ name: member.name, email: member.email });
      const emailWebhook = `${N8N_WEBHOOK_BASE}/webhook/email-outbound${N8N_ENV}`;

      try {
        await axios.post(emailWebhook, {
          to_email: member.email,
          to_name: member.name,
          subject: 'Welcome to the Power100 Inner Circle',
          body: emailHtml,
          template: 'ic_registration_confirmation',
          member_id: member.id,
          tags: ['inner-circle', 'registration', 'welcome']
        }, { timeout: 10000 });

        results.email = true;
        console.log(`[IC Comms] Registration email sent to ${member.email}`);
      } catch (err) {
        console.warn(`[IC Comms] Email failed for ${member.email}: ${err.message}`);
      }
    }

    // Send registration SMS
    if (member.phone) {
      const smsMessage = buildICRegistrationSMS({ name: member.name });
      const smsWebhook = process.env.NODE_ENV === 'production'
        ? `${N8N_WEBHOOK_BASE}/webhook/backend-to-ghl`
        : `${N8N_WEBHOOK_BASE}/webhook/backend-to-ghl-dev`;

      try {
        await axios.post(smsWebhook, {
          send_via_ghl: {
            phone: member.phone,
            message: smsMessage,
            member_id: member.id,
            message_type: 'ic_registration_confirmation',
            sent_by: 'inner_circle_system',
            timestamp: new Date().toISOString()
          }
        }, { timeout: 10000 });

        results.sms = true;
        console.log(`[IC Comms] Registration SMS sent to ${member.phone}`);
      } catch (err) {
        console.warn(`[IC Comms] SMS failed for ${member.phone}: ${err.message}`);
      }
    }

    return results;
  } catch (error) {
    console.error(`[IC Comms] sendICRegistrationComms error:`, error.message);
    return { email: false, sms: false };
  }
}

/**
 * Send IC password reset email + SMS
 * Called from WordPress via API or n8n webhook
 */
async function sendICPasswordResetComms(memberId, resetUrl, expiresIn) {
  try {
    const memberResult = await query(
      'SELECT id, name, email, phone FROM inner_circle_members WHERE id = $1',
      [memberId]
    );

    if (!memberResult.rows.length) {
      console.warn(`[IC Comms] Member ${memberId} not found, skipping comms`);
      return { email: false, sms: false };
    }

    const member = memberResult.rows[0];
    const results = { email: false, sms: false };

    // Send password reset email
    if (member.email) {
      const emailHtml = buildICPasswordResetEmail({
        name: member.name,
        resetUrl,
        expiresIn: expiresIn || '1 hour'
      });
      const emailWebhook = `${N8N_WEBHOOK_BASE}/webhook/email-outbound${N8N_ENV}`;

      try {
        await axios.post(emailWebhook, {
          to_email: member.email,
          to_name: member.name,
          subject: 'Reset Your Inner Circle Password',
          body: emailHtml,
          template: 'ic_password_reset',
          member_id: member.id,
          tags: ['inner-circle', 'password-reset']
        }, { timeout: 10000 });

        results.email = true;
        console.log(`[IC Comms] Password reset email sent to ${member.email}`);
      } catch (err) {
        console.warn(`[IC Comms] Password reset email failed for ${member.email}: ${err.message}`);
      }
    }

    // Send password reset SMS
    if (member.phone) {
      const smsMessage = buildICPasswordResetSMS({
        name: member.name,
        resetUrl,
        expiresIn: expiresIn || '1 hour'
      });
      const smsWebhook = process.env.NODE_ENV === 'production'
        ? `${N8N_WEBHOOK_BASE}/webhook/backend-to-ghl`
        : `${N8N_WEBHOOK_BASE}/webhook/backend-to-ghl-dev`;

      try {
        await axios.post(smsWebhook, {
          send_via_ghl: {
            phone: member.phone,
            message: smsMessage,
            member_id: member.id,
            message_type: 'ic_password_reset',
            sent_by: 'inner_circle_system',
            timestamp: new Date().toISOString()
          }
        }, { timeout: 10000 });

        results.sms = true;
        console.log(`[IC Comms] Password reset SMS sent to ${member.phone}`);
      } catch (err) {
        console.warn(`[IC Comms] Password reset SMS failed for ${member.phone}: ${err.message}`);
      }
    }

    return results;
  } catch (error) {
    console.error(`[IC Comms] sendICPasswordResetComms error:`, error.message);
    return { email: false, sms: false };
  }
}

module.exports = {
  // Template builders (for testing/preview)
  buildICRegistrationEmail,
  buildICPasswordResetEmail,
  buildICRegistrationSMS,
  buildICPasswordResetSMS,
  // Sending functions
  sendICRegistrationComms,
  sendICPasswordResetComms,
  // Brand constants (for other modules)
  IC_BRAND,
  wrapICEmailTemplate
};
