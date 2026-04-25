// DATABASE-CHECKED: expert_contributors columns verified on 2026-03-20
const { query } = require('../config/database');
const axios = require('axios');
const ecDrcIntegration = require('../services/ecDrcIntegrationService');

const N8N_EMAIL_WEBHOOK = process.env.NODE_ENV === 'production'
  ? 'https://n8n.srv918843.hstgr.cloud/webhook/email-outbound'
  : 'https://n8n.srv918843.hstgr.cloud/webhook/email-outbound-dev';

const N8N_SMS_WEBHOOK = process.env.NODE_ENV === 'production'
  ? 'https://n8n.srv918843.hstgr.cloud/webhook/backend-to-ghl'
  : 'https://n8n.srv918843.hstgr.cloud/webhook/backend-to-ghl-dev';

/**
 * Send welcome email and SMS to new expert contributor
 * Non-blocking — failures don't affect the API response
 */
async function sendWelcomeMessages(contributor) {
  const firstName = contributor.first_name || 'there';
  const fullName = ((contributor.first_name || '') + ' ' + (contributor.last_name || '')).trim();
  const email = contributor.email;
  const phone = contributor.phone;

  // Generate booking link for onboarding call (non-blocking)
  let bookingUrl = null;
  try {
    const rankingsDbService = require('../services/rankingsDbService');
    const booking = await rankingsDbService.createBookingLink({
      company_id: contributor.rankings_company_id || null,
      appointment_type: 'onboarding-call',
      invitee_name: fullName,
      invitee_email: email,
      created_by: contributor.assigned_rep_id || 2
    });
    if (booking) bookingUrl = booking.url;
  } catch (err) {
    console.error('[Expert Contributor] Booking link generation failed:', err.message);
  }

  // Build booking CTA block if link was generated
  const bookingBlock = bookingUrl
    ? `<div style="margin:24px 0;padding:20px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;text-align:center;">
            <p style="font-size:14px;color:#333;margin-bottom:12px;font-weight:600;">Schedule Your Onboarding Call with Greg</p>
            <p style="font-size:13px;color:#555;margin-bottom:16px;">Book a time to discuss your contributor page, PowerChat feature, and content strategy.</p>
            <a href="${bookingUrl}" style="display:inline-block;padding:12px 32px;background:#FB0401;color:#fff;text-decoration:none;border-radius:6px;font-size:14px;font-weight:600;">Book Your Onboarding Call</a>
          </div>`
    : '';

  // Welcome Email
  try {
    const emailHtml = `
      <div style="max-width:600px;margin:0 auto;font-family:Arial,sans-serif;color:#333;">
        <div style="background:#000;padding:24px;text-align:center;border-radius:12px 12px 0 0;">
          <img src="https://power100.io/wp-content/uploads/2026/01/Power100-Icon-Hi-Res-and-Large-1.png" alt="Power100" style="width:48px;margin-bottom:8px;"><h1 style="color:#FB0401;margin:0;font-size:24px;">POWER100</h1>
          <p style="color:#fff;margin:6px 0 0;font-size:13px;">Authority Contributor Program</p>
        </div>
        <div style="padding:28px;background:#fff;border:1px solid #eee;">
          <p style="font-size:16px;margin-bottom:16px;">Welcome, ${firstName}!</p>
          <p style="font-size:14px;color:#555;line-height:1.7;margin-bottom:16px;">Thank you for joining the Power100 Authority Contributor Network. You have just taken a major step in positioning yourself and your company as a verified leader in the home improvement industry.</p>
          <p style="font-size:14px;color:#555;line-height:1.7;margin-bottom:16px;">As an Authority Contributor, here is what you can expect:</p>
          <ul style="font-size:14px;color:#555;line-height:1.8;padding-left:20px;margin-bottom:16px;">
            <li>A dedicated contributor page on Power100.io showcasing your leadership</li>
            <li>A PowerChat video feature with Power100 CEO Greg Cummings</li>
            <li>Published press release articles highlighting your story and expertise</li>
            <li>Short-form video clips for social media distribution</li>
            <li>Third-party authority positioning that sets you apart in the industry</li>
          </ul>
          ${bookingBlock}
          <p style="font-size:14px;color:#555;line-height:1.7;margin-bottom:16px;">Our team is now building your contributor page. We will reach out to you personally once it is complete and ready for your review.</p>
          <p style="font-size:14px;color:#555;line-height:1.7;">Welcome to the network, ${firstName}. We are excited to have you.</p>
          <p style="font-size:14px;color:#333;margin-top:24px;font-weight:600;">Greg Cummings<br><span style="font-weight:400;color:#777;">CEO, Power100</span></p>
        </div>
        <div style="background:#f8f9fa;padding:12px;text-align:center;border-radius:0 0 12px 12px;border:1px solid #eee;border-top:none;">
          <p style="margin:0;font-size:11px;color:#999;">Power100 Authority Contributor Program | power100.io</p>
        </div>
      </div>`;

    await axios.post(N8N_EMAIL_WEBHOOK, {
      message_id: 'ec-welcome-' + contributor.id,
      to_email: email,
      to_name: firstName,
      subject: 'Welcome to the Power100 Authority Contributor Network',
      body: emailHtml,
      template: 'ec_welcome',
      from_name: 'Power100',
      from_email: 'info@power100.io'
    }, { timeout: 10000 });

    console.log('[Expert Contributor] Welcome email sent to ' + email);
  } catch (err) {
    console.error('[Expert Contributor] Welcome email failed:', err.message);
  }

  // Welcome SMS — varies based on delegation status
  if (phone) {
    const isDelegated = contributor.delegated_to_email || contributor.onboarding_contact_email;
    const smsMessage = isDelegated
      ? 'Welcome to the Power100 Authority Contributor Network, ' + firstName + '! Your team has been notified and we will keep you posted as your profile is completed. - Power100 Team'
      : 'Welcome to the Power100 Authority Contributor Network, ' + firstName + '! Thank you for joining. Our team is building your contributor page now and we will notify you as soon as it is ready for review. - Power100 Team';

    try {
      await axios.post(N8N_SMS_WEBHOOK, {
        send_via_ghl: {
          phone: phone,
          message: smsMessage,
          message_type: 'ec_welcome',
          contractor_id: contributor.id
        }
      }, { timeout: 10000 });

      console.log('[Expert Contributor] Welcome SMS sent to ' + phone);
    } catch (err) {
      console.error('[Expert Contributor] Welcome SMS failed:', err.message);
    }
  }
}

/**
 * Send completion SMS to the contributor when delegate finishes profile
 */
async function sendCompletionSMS(contributor) {
  const phone = contributor.phone;
  const firstName = (contributor.first_name || 'there');

  if (!phone) return;

  try {
    await axios.post(N8N_SMS_WEBHOOK, {
      send_via_ghl: {
        phone: phone,
        message: 'Great news, ' + firstName + '! Your Authority Contributor profile is complete and your Power100 page is now being built. We will notify you when it is live. - Power100 Team',
        message_type: 'ec_delegation_complete',
        contractor_id: contributor.id
      }
    }, { timeout: 10000 });

    console.log('[Expert Contributor] Completion SMS sent to ' + phone);
  } catch (err) {
    console.error('[Expert Contributor] Completion SMS failed:', err.message);
  }
}

/**
 * Send delegation emails to all 3 roles:
 * 1. Leader — CC on everything, confirmation that delegation is set up
 * 2. Article Writer — heads-up email with benefit points
 * 3. Onboarding Contact — action email with profile completion link
 */
async function sendDelegationEmails(contributor, token) {
  const ceoName = `${contributor.first_name || ''} ${contributor.last_name || ''}`.trim();
  const ceoEmail = contributor.email;
  const companyName = contributor.company || 'your company';
  const delegateLink = `https://power100.io/contributor-delegate/?token=${token}`;

  const emailHeader = '<div style="background:#000;padding:24px;text-align:center;border-radius:12px 12px 0 0;"><img src="https://power100.io/wp-content/uploads/2026/01/Power100-Icon-Hi-Res-and-Large-1.png" alt="Power100" style="width:48px;margin-bottom:8px;"><h1 style="color:#FB0401;margin:0;font-size:24px;">POWER100</h1><p style="color:#fff;margin:6px 0 0;font-size:13px;">Authority Contributor Program</p></div>';
  const emailFooter = '<div style="background:#f8f9fa;padding:12px;text-align:center;border-radius:0 0 12px 12px;border:1px solid #eee;border-top:none;"><p style="margin:0;font-size:11px;color:#999;">Power100 Authority Contributor Program | power100.io</p></div>';
  const wrap = (body) => '<div style="max-width:600px;margin:0 auto;font-family:Arial,sans-serif;color:#333;">' + emailHeader + '<div style="padding:28px;background:#fff;border:1px solid #eee;">' + body + '</div>' + emailFooter + '</div>';

  // === EMAIL 1: Article Writer ===
  const awName = contributor.article_writer_name;
  const awEmail = contributor.article_writer_email;
  if (awEmail && awEmail !== ceoEmail) {
    try {
      const awBody = `<p style="font-size:16px;margin-bottom:16px;">Hi ${(awName || 'there').split(' ')[0]},</p>
        <p style="font-size:14px;color:#555;line-height:1.7;margin-bottom:16px;"><strong>${ceoName}</strong> has joined the <strong>Power100 Authority Contributor Network</strong> and has designated you as the content contact for <strong>${companyName}</strong>.</p>
        <p style="font-size:14px;color:#555;line-height:1.7;margin-bottom:16px;">Here is what this means for you and the company:</p>
        <ul style="font-size:14px;color:#555;line-height:1.8;padding-left:20px;margin-bottom:16px;">
          <li>Power100 will be publishing authority articles positioning ${ceoName} as an industry leader</li>
          <li>These articles build third-party credibility that AI search engines use to recommend your company</li>
          <li>Your leader will be in touch with you about content collaboration and article topics</li>
          <li>This is a strategic investment in long-term authority positioning for ${companyName}</li>
        </ul>
        <p style="font-size:14px;color:#555;line-height:1.7;">${ceoName} will be reaching out to discuss next steps. If you have any questions in the meantime, feel free to reply to this email.</p>`;
      await axios.post(N8N_EMAIL_WEBHOOK, {
        message_id: 'ec-delegate-article-' + contributor.id,
        to_email: awEmail, to_name: awName || 'Team Member',
        subject: ceoName + ' has joined Power100 — You have been designated as content contact',
        body: wrap(awBody), template: 'ec_delegation_article', from_name: 'Power100', from_email: 'info@power100.io'
      }, { timeout: 10000 });
      console.log('[Expert Contributor] Article writer email sent to ' + awEmail);
    } catch (err) { console.error('[Expert Contributor] Article writer email failed:', err.message); }
  }

  // === EMAIL 2: Onboarding Contact ===
  const obName = contributor.onboarding_contact_name || contributor.delegated_to_name;
  const obEmail = contributor.onboarding_contact_email || contributor.delegated_to_email;
  if (obEmail && obEmail !== ceoEmail) {
    try {
      const obBody = `<p style="font-size:16px;margin-bottom:16px;">Hi ${(obName || 'there').split(' ')[0]},</p>
        <p style="font-size:14px;color:#555;line-height:1.7;margin-bottom:16px;"><strong>${ceoName}</strong> has joined the <strong>Power100 Authority Contributor Network</strong> and has delegated you to complete their contributor profile for <strong>${companyName}</strong>.</p>
        <p style="font-size:14px;color:#555;line-height:1.7;margin-bottom:16px;">This profile will be used to build a dedicated Authority Contributor page on Power100.io featuring:</p>
        <ul style="font-size:14px;color:#555;line-height:1.8;padding-left:20px;margin-bottom:16px;">
          <li>Leadership bio, credentials, and industry expertise</li>
          <li>PowerChat video features with Power100 CEO Greg Cummings</li>
          <li>Published press release articles and media content</li>
          <li>Third-party authority signals that position ${companyName} in AI search</li>
        </ul>
        <p style="font-size:14px;color:#555;line-height:1.7;margin-bottom:24px;">Please click the button below to complete the profile:</p>
        <div style="text-align:center;margin-bottom:24px;"><a href="${delegateLink}" style="display:inline-block;background:#FB0401;color:#fff;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:15px;font-weight:600;">Complete ${ceoName}'s Profile</a></div>
        <p style="font-size:13px;color:#888;line-height:1.6;">This link is unique and secure. You can use it anytime. If you have questions, reply to this email.</p>`;
      await axios.post(N8N_EMAIL_WEBHOOK, {
        message_id: 'ec-delegate-onboard-' + contributor.id,
        to_email: obEmail, to_name: obName || 'Team Member',
        subject: ceoName + ' has asked you to complete their Power100 Authority Profile',
        body: wrap(obBody), template: 'ec_delegation_onboard', from_name: 'Power100', from_email: 'info@power100.io'
      }, { timeout: 10000 });
      console.log('[Expert Contributor] Onboarding email sent to ' + obEmail);
    } catch (err) { console.error('[Expert Contributor] Onboarding email failed:', err.message); }
  }

  // === EMAIL 3: Leader — CC copies of what was sent ===
  if (ceoEmail) {
    try {
      const leaderBody = `<p style="font-size:16px;margin-bottom:16px;">Hi ${(contributor.first_name || 'there')},</p>
        <p style="font-size:14px;color:#555;line-height:1.7;margin-bottom:16px;">Your delegation has been set up. Here is a summary of what your team is receiving:</p>
        ${awEmail && awEmail !== ceoEmail ? '<div style="background:#f8f9fa;border-radius:8px;padding:16px;margin-bottom:16px;"><p style="font-size:13px;color:#333;margin:0 0 4px;font-weight:600;">Article Contact: ' + (awName || awEmail) + '</p><p style="font-size:13px;color:#666;margin:0;">Received a heads-up email about the authority articles and content collaboration.</p></div>' : ''}
        ${obEmail && obEmail !== ceoEmail ? '<div style="background:#f8f9fa;border-radius:8px;padding:16px;margin-bottom:16px;"><p style="font-size:13px;color:#333;margin:0 0 4px;font-weight:600;">Onboarding Contact: ' + (obName || obEmail) + '</p><p style="font-size:13px;color:#666;margin:0;">Received the secure link to complete your contributor profile on your behalf.</p></div>' : ''}
        <p style="font-size:14px;color:#555;line-height:1.7;margin-bottom:16px;">If any of these contacts were not expected, or if you need to make changes, please reply to this email and we will update your delegation immediately.</p>
        <p style="font-size:14px;color:#555;line-height:1.7;">For your reference, here is the profile completion link that was sent to your onboarding contact:</p>
        <div style="text-align:center;margin:20px 0;"><a href="${delegateLink}" style="display:inline-block;background:#FB0401;color:#fff;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:15px;font-weight:600;">Profile Completion Link</a></div>`;
      await axios.post(N8N_EMAIL_WEBHOOK, {
        message_id: 'ec-delegate-leader-' + contributor.id,
        to_email: ceoEmail, to_name: contributor.first_name || 'Leader',
        subject: 'Power100 Delegation Confirmed — Your team has been notified',
        body: wrap(leaderBody), template: 'ec_delegation_leader', from_name: 'Power100', from_email: 'info@power100.io'
      }, { timeout: 10000 });
      console.log('[Expert Contributor] Leader delegation summary sent to ' + ceoEmail);
    } catch (err) { console.error('[Expert Contributor] Leader delegation email failed:', err.message); }
  }
}

/**
 * Send article request email to the contributor (or article writer if delegated)
 * CC's Rey (rey@power100.io) as the content point of contact
 * Fires alongside welcome email — separate message, operational tone
 */
async function sendArticleRequestEmail(contributor) {
  const ceoName = `${contributor.first_name || ''} ${contributor.last_name || ''}`.trim();
  const companyName = contributor.company || 'your company';

  // Send to article writer if delegated, otherwise to the contributor directly
  const recipientEmail = contributor.article_writer_email || contributor.email;
  const recipientName = contributor.article_writer_name || ceoName;
  const firstName = (recipientName || 'there').split(' ')[0];
  const isDelegate = recipientEmail !== contributor.email;

  const LOGO = 'https://power100.io/wp-content/uploads/2026/01/Power100-Icon-Hi-Res-and-Large-1.png';

  const emailHtml = `
    <div style="max-width:600px;margin:0 auto;font-family:Arial,sans-serif;color:#333;">
      <div style="background:#000;padding:24px;text-align:center;border-radius:12px 12px 0 0;">
        <img src="${LOGO}" alt="Power100" style="width:48px;margin-bottom:8px;">
        <h1 style="color:#FB0401;margin:0;font-size:24px;">POWER100</h1>
        <p style="color:#fff;margin:6px 0 0;font-size:13px;">Authority Contributor Program</p>
      </div>
      <div style="padding:28px;background:#fff;border:1px solid #eee;">
        <p style="font-size:16px;margin-bottom:16px;">Hi ${firstName},</p>
        ${isDelegate
          ? `<p style="font-size:14px;color:#555;line-height:1.7;margin-bottom:16px;">As the content contact for <strong>${ceoName}</strong> at <strong>${companyName}</strong>, we wanted to touch base about getting the first article going.</p>`
          : `<p style="font-size:14px;color:#555;line-height:1.7;margin-bottom:16px;">Now that you are part of the Power100 Authority Contributor Network, we are excited to start building your content footprint.</p>`
        }
        <p style="font-size:14px;color:#555;line-height:1.7;margin-bottom:16px;">One of the most impactful elements of the program is the authority articles we publish on your behalf. Each month, we provide a topic that contributors write about from the perspective of their own expertise and experience. This keeps the content relevant, timely, and uniquely yours.</p>
        <p style="font-size:14px;color:#555;line-height:1.7;margin-bottom:16px;">To get things moving, we would love to have your first article within the first week. It does not need to be perfect — our editorial team will polish it. What matters most is your voice and your perspective.</p>
        <p style="font-size:14px;color:#555;line-height:1.7;margin-bottom:16px;">Your dedicated Content Director is <strong>Rey</strong> (cc'd on this email) — he will provide you with your monthly topic and is your go-to for anything related to articles, content strategy, and submissions. Feel free to reach out to him directly at <a href="mailto:rey@power100.io" style="color:#FB0401;">rey@power100.io</a>.</p>
        <p style="font-size:14px;color:#555;line-height:1.7;">We are looking forward to amplifying ${isDelegate ? ceoName + "'s" : 'your'} story. Let us know if you have any questions.</p>
        <p style="font-size:14px;color:#333;margin-top:24px;font-weight:600;">The Power100 Content Team</p>
      </div>
      <div style="background:#f8f9fa;padding:12px;text-align:center;border-radius:0 0 12px 12px;border:1px solid #eee;border-top:none;">
        <p style="margin:0;font-size:11px;color:#999;">Power100 Authority Contributor Program | power100.io</p>
      </div>
    </div>`;

  try {
    await axios.post(N8N_EMAIL_WEBHOOK, {
      message_id: 'ec-article-request-' + contributor.id,
      to_email: recipientEmail,
      to_name: recipientName,
      subject: 'Your First Authority Article — Let Us Get Started',
      body: emailHtml,
      template: 'ec_article_request',
      from_name: 'Power100',
      from_email: 'info@power100.io',
      cc_email: 'rey@power100.io'
    }, { timeout: 10000 });

    console.log('[Expert Contributor] Article request email sent to ' + recipientEmail + ' (cc: rey@power100.io)');
  } catch (err) {
    console.error('[Expert Contributor] Article request email failed:', err.message);
  }
}

/**
 * Send notification to leader and delegation contacts that the profile is complete
 */
async function sendDelegationCompleteEmail(contributor) {
  const ceoName = `${contributor.first_name || ''} ${contributor.last_name || ''}`.trim();
  const companyName = contributor.company || '';
  const LOGO = 'https://power100.io/wp-content/uploads/2026/01/Power100-Icon-Hi-Res-and-Large-1.png';

  const emailHeader = `<div style="background:#000;padding:24px;text-align:center;border-radius:12px 12px 0 0;"><img src="${LOGO}" alt="Power100" style="width:48px;margin-bottom:8px;"><h1 style="color:#FB0401;margin:0;font-size:24px;">POWER100</h1><p style="color:#fff;margin:6px 0 0;font-size:13px;">Authority Contributor Program</p></div>`;
  const emailFooter = `<div style="background:#f8f9fa;padding:12px;text-align:center;border-radius:0 0 12px 12px;border:1px solid #eee;border-top:none;"><p style="margin:0;font-size:11px;color:#999;">Power100 Authority Contributor Program | power100.io</p></div>`;
  const wrap = (body) => `<div style="max-width:600px;margin:0 auto;font-family:Arial,sans-serif;color:#333;">${emailHeader}<div style="padding:28px;background:#fff;border:1px solid #eee;">${body}</div>${emailFooter}</div>`;

  // Build recipient list — leader + article writer + onboarding contact (deduplicated)
  const recipients = new Set();
  const emailMap = {};

  if (contributor.email) {
    recipients.add(contributor.email);
    emailMap[contributor.email] = ceoName;
  }
  if (contributor.article_writer_email) {
    recipients.add(contributor.article_writer_email);
    emailMap[contributor.article_writer_email] = contributor.article_writer_name || 'Team Member';
  }
  if (contributor.onboarding_contact_email) {
    recipients.add(contributor.onboarding_contact_email);
    emailMap[contributor.onboarding_contact_email] = contributor.onboarding_contact_name || 'Team Member';
  }

  for (const email of recipients) {
    const name = emailMap[email];
    const firstName = (name || 'there').split(' ')[0];
    const isLeader = email === contributor.email;

    const body = `<p style="font-size:16px;margin-bottom:16px;">Hi ${firstName},</p>
      <p style="font-size:14px;color:#555;line-height:1.7;margin-bottom:16px;">${isLeader
        ? `Great news — your Authority Contributor profile for <strong>${companyName}</strong> has been completed${contributor.delegate_payment ? ' and payment has been processed' : ''}. Our team is now building your dedicated Authority Contributor page on Power100.io.`
        : `The Authority Contributor profile for <strong>${ceoName}</strong> at <strong>${companyName}</strong> has been completed${contributor.delegate_payment ? ' and payment has been processed' : ''}. The Power100 team is now building the contributor page.`
      }</p>
      <p style="font-size:14px;color:#555;line-height:1.7;">We will notify everyone when the page is live and ready for review.</p>
      <p style="font-size:14px;color:#333;margin-top:24px;font-weight:600;">The Power100 Team</p>`;

    try {
      await axios.post(N8N_EMAIL_WEBHOOK, {
        message_id: 'ec-complete-notify-' + contributor.id + '-' + Date.now(),
        to_email: email,
        to_name: name,
        subject: 'Authority Contributor Profile Complete — ' + (isLeader ? 'Your Page Is Being Built' : ceoName + "'s Page Is Being Built"),
        body: wrap(body),
        template: 'ec_delegation_complete',
        from_name: 'Power100',
        from_email: 'info@power100.io'
      }, { timeout: 10000 });
      console.log('[Expert Contributor] Completion notification sent to ' + email);
    } catch (err) {
      console.error('[Expert Contributor] Completion notification failed for ' + email + ':', err.message);
    }
  }
}

const createExpertContributor = async (req, res) => {
  try {
    const {
      stripe_customer_id, stripe_subscription_id, payment_status, plan, amount_cents,
      first_name, last_name, email, phone, company, title_position,
      contributor_type, form_tier, linkedin_url, website_url,
      hero_quote, bio, years_in_industry, revenue_value, geographic_reach,
      custom_stat, credentials, expertise_topics, recognition,
      company_description, notes, videos, testimonials, source,
      delegated_to_name, delegated_to_email,
      article_writer_name, article_writer_email, article_writer_phone, article_writer_position,
      onboarding_contact_name, onboarding_contact_email, onboarding_contact_phone, onboarding_contact_position,
      delegate_payment, geo_keywords, distribution_contacts
    } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, error: 'Email is required' });
    }

    // Check for existing record by email
    const existing = await query(
      'SELECT id, stripe_customer_id FROM expert_contributors WHERE email = $1',
      [email]
    );

    if (existing.rows.length > 0) {
      // Update existing record with new payment/profile data
      const result = await query(`
        UPDATE expert_contributors SET
          stripe_customer_id = COALESCE($1, stripe_customer_id),
          stripe_subscription_id = COALESCE($2, stripe_subscription_id),
          payment_status = COALESCE($3, payment_status),
          plan = COALESCE($4, plan),
          amount_cents = COALESCE($5, amount_cents),
          first_name = COALESCE($6, first_name),
          last_name = COALESCE($7, last_name),
          phone = COALESCE($8, phone),
          company = COALESCE($9, company),
          title_position = COALESCE($10, title_position),
          contributor_type = COALESCE($11, contributor_type),
          form_tier = COALESCE($12, form_tier),
          linkedin_url = COALESCE($13, linkedin_url),
          website_url = COALESCE($14, website_url),
          hero_quote = COALESCE($15, hero_quote),
          bio = COALESCE($16, bio),
          years_in_industry = COALESCE($17, years_in_industry),
          revenue_value = COALESCE($18, revenue_value),
          geographic_reach = COALESCE($19, geographic_reach),
          custom_stat = COALESCE($20, custom_stat),
          credentials = COALESCE($21, credentials),
          expertise_topics = COALESCE($22, expertise_topics),
          recognition = COALESCE($23, recognition),
          company_description = COALESCE($24, company_description),
          notes = COALESCE($25, notes),
          videos = COALESCE($26, videos),
          testimonials = COALESCE($27, testimonials),
          geo_keywords = COALESCE($28, geo_keywords),
          distribution_contacts = COALESCE($29, distribution_contacts),
          updated_at = NOW()
        WHERE email = $30
        RETURNING *
      `, [
        stripe_customer_id, stripe_subscription_id, payment_status, plan, amount_cents,
        first_name, last_name, phone, company, title_position,
        contributor_type, form_tier, linkedin_url, website_url,
        hero_quote, bio, years_in_industry, revenue_value, geographic_reach,
        custom_stat, credentials, expertise_topics, recognition,
        company_description, notes,
        videos ? JSON.stringify(videos) : null,
        testimonials ? JSON.stringify(testimonials) : null,
        geo_keywords ? JSON.stringify(geo_keywords) : null,
        distribution_contacts ? JSON.stringify(distribution_contacts) : null,
        email
      ]);

      // Send welcome messages if payment just succeeded
      if (payment_status === 'succeeded') {
        sendWelcomeMessages(result.rows[0]).catch(e => console.error('[Expert Contributor] Welcome messages error:', e.message));
      }

      return res.status(200).json({ success: true, contributor: result.rows[0], updated: true });
    }

    // Insert new record
    // Generate delegation token if delegating
    const delegationToken = delegated_to_email
      ? Buffer.from(`${email}:${Date.now()}:${Math.random().toString(36).substring(2)}`).toString('base64url')
      : null;

    const result = await query(`
      INSERT INTO expert_contributors (
        stripe_customer_id, stripe_subscription_id, payment_status, plan, amount_cents,
        first_name, last_name, email, phone, company, title_position,
        contributor_type, form_tier, linkedin_url, website_url,
        hero_quote, bio, years_in_industry, revenue_value, geographic_reach,
        custom_stat, credentials, expertise_topics, recognition,
        company_description, notes, videos, testimonials, source,
        delegated_to_name, delegated_to_email, delegation_token,
        article_writer_name, article_writer_email, article_writer_phone, article_writer_position,
        onboarding_contact_name, onboarding_contact_email, onboarding_contact_phone, onboarding_contact_position,
        delegate_payment, geo_keywords, distribution_contacts
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
        $21, $22, $23, $24, $25, $26, $27, $28, $29,
        $30, $31, $32,
        $33, $34, $35, $36,
        $37, $38, $39, $40,
        $41, $42, $43
      ) RETURNING *
    `, [
      stripe_customer_id, stripe_subscription_id, payment_status || 'incomplete', plan || 'individual', amount_cents,
      first_name, last_name, email, phone, company, title_position,
      contributor_type, form_tier, linkedin_url, website_url,
      hero_quote, bio, years_in_industry, revenue_value, geographic_reach,
      custom_stat, credentials, expertise_topics, recognition,
      company_description, notes,
      videos ? JSON.stringify(videos) : '[]',
      testimonials ? JSON.stringify(testimonials) : '[]',
      source || 'presentation_page',
      delegated_to_name || null,
      delegated_to_email || null,
      delegationToken,
      article_writer_name || null,
      article_writer_email || null,
      article_writer_phone || null,
      article_writer_position || null,
      onboarding_contact_name || null,
      onboarding_contact_email || null,
      onboarding_contact_phone || null,
      onboarding_contact_position || null,
      delegate_payment || false,
      geo_keywords ? JSON.stringify(geo_keywords) : '[]',
      distribution_contacts ? JSON.stringify(distribution_contacts) : '[]'
    ]);

    // Send welcome email and SMS (non-blocking)
    if (result.rows[0].payment_status === 'succeeded') {
      sendWelcomeMessages(result.rows[0]).catch(e => console.error('[Expert Contributor] Welcome messages error:', e.message));
      // Article request email — fires for all contributors (paid or delegation)
      sendArticleRequestEmail(result.rows[0]).catch(e => console.error('[Expert Contributor] Article request email error:', e.message));
    }

    // For delegation with payment pending — send article request + welcome SMS since they're onboard
    if (result.rows[0].payment_status === 'pending_delegation') {
      sendWelcomeMessages(result.rows[0]).catch(e => console.error('[Expert Contributor] Welcome messages error:', e.message));
      sendArticleRequestEmail(result.rows[0]).catch(e => console.error('[Expert Contributor] Article request email error:', e.message));
    }

    // Send delegation emails if delegated (3 role-based emails)
    if (delegationToken && (delegated_to_email || onboarding_contact_email)) {
      sendDelegationEmails(result.rows[0], delegationToken).catch(e => console.error('[Expert Contributor] Delegation emails error:', e.message));
    }

    // EC-DRC Integration: match company, assign rep, create DRC tasks/notes
    ecDrcIntegration.handleSignup(result.rows[0]).catch(e =>
      console.error('[EC-DRC] Signup integration error:', e.message)
    );

    return res.status(201).json({ success: true, contributor: result.rows[0], created: true });
  } catch (err) {
    console.error('Error creating expert contributor:', err);
    return res.status(500).json({ success: false, error: 'Failed to save contributor' });
  }
};

const updatePaymentStatus = async (req, res) => {
  try {
    const { email, stripe_customer_id, payment_status } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, error: 'Email is required' });
    }

    const result = await query(`
      UPDATE expert_contributors SET
        payment_status = $1,
        stripe_customer_id = COALESCE($2, stripe_customer_id),
        status = CASE WHEN $1 = 'succeeded' THEN 'active' ELSE status END,
        updated_at = NOW()
      WHERE email = $3
      RETURNING id, email, payment_status, status
    `, [payment_status, stripe_customer_id, email]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Contributor not found' });
    }

    return res.status(200).json({ success: true, contributor: result.rows[0] });
  } catch (err) {
    console.error('Error updating payment status:', err);
    return res.status(500).json({ success: false, error: 'Failed to update payment status' });
  }
};

/**
 * GET /api/expert-contributors/delegate/:token
 * Look up contributor by delegation token — used by the delegate completion page
 */
const getDelegateProfile = async (req, res) => {
  try {
    const { token } = req.params;
    if (!token) return res.status(400).json({ success: false, error: 'Token is required' });

    const result = await query(
      'SELECT id, first_name, last_name, email, company, title_position, contributor_type, form_tier, delegation_completed, delegate_payment, plan, amount_cents FROM expert_contributors WHERE delegation_token = $1',
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Invalid or expired delegation link' });
    }

    const contributor = result.rows[0];
    if (contributor.delegation_completed) {
      return res.status(400).json({ success: false, error: 'This profile has already been completed', contributor: { first_name: contributor.first_name, last_name: contributor.last_name, company: contributor.company } });
    }

    return res.status(200).json({
      success: true,
      contributor: {
        id: contributor.id,
        first_name: contributor.first_name,
        last_name: contributor.last_name,
        email: contributor.email,
        company: contributor.company,
        title_position: contributor.title_position,
        contributor_type: contributor.contributor_type,
        form_tier: contributor.form_tier,
        delegate_payment: contributor.delegate_payment || false,
        plan: contributor.plan,
        amount_cents: contributor.amount_cents
      }
    });
  } catch (err) {
    console.error('Error looking up delegate profile:', err);
    return res.status(500).json({ success: false, error: 'Failed to look up profile' });
  }
};

/**
 * POST /api/expert-contributors/delegate/:token/complete
 * Complete the contributor profile via delegation
 */
const completeDelegateProfile = async (req, res) => {
  try {
    const { token } = req.params;
    if (!token) return res.status(400).json({ success: false, error: 'Token is required' });

    // Verify token exists and not already completed
    const existing = await query(
      'SELECT id, delegation_completed FROM expert_contributors WHERE delegation_token = $1',
      [token]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Invalid or expired delegation link' });
    }
    if (existing.rows[0].delegation_completed) {
      return res.status(400).json({ success: false, error: 'This profile has already been completed' });
    }

    const {
      hero_quote, bio, years_in_industry, revenue_value, geographic_reach,
      custom_stat, credentials, expertise_topics, recognition,
      company_description, notes, videos, testimonials,
      linkedin_url, website_url, geo_keywords, distribution_contacts
    } = req.body;

    const result = await query(`
      UPDATE expert_contributors SET
        hero_quote = COALESCE($1, hero_quote),
        bio = COALESCE($2, bio),
        years_in_industry = COALESCE($3, years_in_industry),
        revenue_value = COALESCE($4, revenue_value),
        geographic_reach = COALESCE($5, geographic_reach),
        custom_stat = COALESCE($6, custom_stat),
        credentials = COALESCE($7, credentials),
        expertise_topics = COALESCE($8, expertise_topics),
        recognition = COALESCE($9, recognition),
        company_description = COALESCE($10, company_description),
        notes = COALESCE($11, notes),
        videos = COALESCE($12, videos),
        testimonials = COALESCE($13, testimonials),
        linkedin_url = COALESCE($14, linkedin_url),
        website_url = COALESCE($15, website_url),
        geo_keywords = COALESCE($16, geo_keywords),
        distribution_contacts = COALESCE($17, distribution_contacts),
        delegation_completed = true,
        updated_at = NOW()
      WHERE delegation_token = $18
      RETURNING *
    `, [
      hero_quote, bio, years_in_industry, revenue_value, geographic_reach,
      custom_stat, credentials, expertise_topics, recognition,
      company_description, notes,
      videos ? JSON.stringify(videos) : null,
      testimonials ? JSON.stringify(testimonials) : null,
      linkedin_url, website_url,
      geo_keywords ? JSON.stringify(geo_keywords) : null,
      distribution_contacts ? JSON.stringify(distribution_contacts) : null,
      token
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Profile not found' });
    }

    const completed = result.rows[0];
    console.log('[Expert Contributor] Delegate profile completed for:', completed.email);

    // If payment was delegated and this completion means payment succeeded, update status
    if (completed.delegate_payment) {
      await query(
        "UPDATE expert_contributors SET payment_status = 'succeeded', status = 'active', updated_at = NOW() WHERE id = $1",
        [completed.id]
      );
      completed.payment_status = 'succeeded';
      console.log('[Expert Contributor] Payment status updated to succeeded for delegate completion');
    }

    // Fire welcome messages now that profile + payment are complete
    if (completed.payment_status === 'succeeded' || completed.delegate_payment) {
      sendWelcomeMessages(completed).catch(function(e) { console.error('[Expert Contributor] Welcome messages error:', e.message); });
      sendArticleRequestEmail(completed).catch(function(e) { console.error('[Expert Contributor] Article request email error:', e.message); });
    }

    // Notify delegation contacts that profile is complete
    sendDelegationCompleteEmail(completed).catch(function(e) { console.error('[Expert Contributor] Delegation complete email error:', e.message); });
    sendCompletionSMS(completed).catch(function(e) { console.error('[Expert Contributor] Completion SMS error:', e.message); });

    // EC-DRC Integration: log profile completion, create follow-up tasks
    ecDrcIntegration.handleProfileComplete(completed).catch(function(e) {
      console.error('[EC-DRC] Profile complete integration error:', e.message);
    });

    return res.status(200).json({ success: true, message: 'Profile completed successfully', contributor: completed });
  } catch (err) {
    console.error('Error completing delegate profile:', err);
    return res.status(500).json({ success: false, error: 'Failed to complete profile' });
  }
};

/**
 * POST /api/expert-contributors/:id/link-company
 * Manually link an EC to a rankings company when fuzzy match fails
 * Body: { rankings_company_id }
 */
const linkCompany = async (req, res) => {
  try {
    const { id } = req.params;
    const { rankings_company_id } = req.body;

    if (!rankings_company_id) {
      return res.status(400).json({ success: false, error: 'rankings_company_id is required' });
    }

    // Verify the company exists in rankings DB
    const rankingsDbService = require('../services/rankingsDbService');
    const company = await rankingsDbService.getCompany(rankings_company_id);
    if (!company) {
      return res.status(404).json({ success: false, error: 'Company not found in rankings database' });
    }

    // Assign rep via the same 3-tier fallback
    let repId = await rankingsDbService.getLastRepForCompany(rankings_company_id);
    if (!repId && company.pillar_id) {
      repId = await rankingsDbService.getRepByPillar(company.pillar_id);
    }
    if (!repId) repId = 2; // Greg default

    const result = await query(
      `UPDATE expert_contributors SET rankings_company_id = $1, assigned_rep_id = $2, updated_at = NOW() WHERE id = $3 RETURNING *`,
      [rankings_company_id, repId, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Contributor not found' });
    }

    console.log(`[EC-DRC] Manual company link: EC ${id} → Company ${rankings_company_id}, Rep ${repId}`);
    return res.status(200).json({
      success: true,
      contributor: result.rows[0],
      linked_company: { id: company.id, company_name: company.company_name, city: company.city, state: company.state },
      assigned_rep_id: repId
    });
  } catch (err) {
    console.error('Error linking company:', err);
    return res.status(500).json({ success: false, error: 'Failed to link company' });
  }
};

/**
 * POST /api/expert-contributors/:id/page-live
 * Called when the WP page goes live — fires DRC page-live actions
 * Body: { wp_page_url }
 */
const markPageLive = async (req, res) => {
  try {
    const { id } = req.params;
    const { wp_page_url } = req.body;

    // Update wp_page_url if provided
    if (wp_page_url) {
      await query(
        'UPDATE expert_contributors SET wp_page_url = $1, updated_at = NOW() WHERE id = $2',
        [wp_page_url, id]
      );
    }

    const result = await query('SELECT * FROM expert_contributors WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Contributor not found' });
    }

    const contributor = result.rows[0];

    // Fire DRC page-live actions (non-blocking)
    ecDrcIntegration.handlePageLive(contributor, wp_page_url || contributor.wp_page_url).catch(e =>
      console.error('[EC-DRC] Page live integration error:', e.message)
    );

    // Auto-link IC leader to EC page (non-blocking)
    try {
      const contributorEnrichment = require('../services/contributorEnrichmentService');
      const fullName = `${contributor.first_name} ${contributor.last_name}`.trim();
      contributorEnrichment.enrichSingleLeader(fullName).catch(e =>
        console.error('[EC-IC] Auto-link error:', e.message)
      );
    } catch (e) { /* enrichment service not critical */ }

    return res.status(200).json({ success: true, message: 'Page marked as live', contributor });
  } catch (err) {
    console.error('Error marking page live:', err);
    return res.status(500).json({ success: false, error: 'Failed to mark page live' });
  }
};

/**
 * GET /api/expert-contributors/:id/drc-status
 * Returns integration status: company match, assigned rep, pipeline stage
 */
const getDrcStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      'SELECT id, first_name, last_name, company, email, rankings_company_id, assigned_rep_id, pipeline_stage FROM expert_contributors WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Contributor not found' });
    }

    const ec = result.rows[0];
    const response = {
      contributor_id: ec.id,
      name: `${ec.first_name} ${ec.last_name}`.trim(),
      company: ec.company,
      pipeline_stage: ec.pipeline_stage,
      pipeline_stages: ['outreach', 'production_call', 'powerchat', 'campaign', 'ec_pitch', 'signup', 'delegation_sent', 'profile_complete', 'page_live', 'active'],
      rankings_company_id: ec.rankings_company_id,
      assigned_rep_id: ec.assigned_rep_id,
      company_details: null,
      rep_details: null
    };

    // Live lookups from rankings DB
    if (ec.rankings_company_id) {
      const rankingsDbService = require('../services/rankingsDbService');
      const company = await rankingsDbService.getCompany(ec.rankings_company_id);
      if (company) {
        response.company_details = {
          id: company.id,
          company_name: company.company_name,
          city: company.city,
          state: company.state,
          pillar_name: company.pillar_name
        };
      }
    }

    if (ec.assigned_rep_id) {
      const rankingsDbService = require('../services/rankingsDbService');
      const rep = await rankingsDbService.getRepUser(ec.assigned_rep_id);
      if (rep) {
        response.rep_details = {
          id: rep.id,
          full_name: rep.full_name,
          email: rep.email
        };
      }
    }

    return res.status(200).json({ success: true, drc_status: response });
  } catch (err) {
    console.error('Error getting DRC status:', err);
    return res.status(500).json({ success: false, error: 'Failed to get DRC status' });
  }
};

/**
 * GET /api/expert-contributors/by-rep/:rankings_user_id
 *
 * Returns the EC pipeline owned by a given rankings rep — drives the
 * "Your EC Pipeline" widget on the DRC dashboard. Auth: X-API-Key
 * (TPX_SALES_AGENT_API_KEY), same pattern as /api/sales-agent/*.
 *
 * Rep attribution: `expert_contributors.assigned_rep_id` is a rankings_db
 * user id, set by linkCompany() via rankingsDbService.getLastRepForCompany().
 *
 * Performance: single tpedb query (indexed on assigned_rep_id) + one batched
 * companies lookup against rankings_db. DRC caches client-side ~60s.
 *
 * `days_in_stage` uses `updated_at` as a proxy. Stage transitions update the
 * EC row, so this is accurate as long as nothing else mutates the row in a
 * given stage. TODO: add a real `stage_changed_at` column for precision.
 */
const getEcsByRep = async (req, res) => {
  try {
    const repId = parseInt(req.params.rankings_user_id, 10);
    if (!Number.isFinite(repId) || repId <= 0) {
      return res.status(400).json({ success: false, error: 'Invalid rankings_user_id' });
    }

    const { rows: ecs } = await query(
      `SELECT
         id                  AS ec_id,
         rankings_company_id,
         pipeline_stage,
         created_at          AS signup_date,
         amount_cents,
         wp_page_url         AS page_live_url,
         updated_at,
         GREATEST(0, FLOOR(EXTRACT(EPOCH FROM (NOW() - updated_at)) / 86400))::int
                              AS days_in_stage
       FROM expert_contributors
       WHERE assigned_rep_id = $1
       ORDER BY updated_at DESC`,
      [repId]
    );

    // Batch-resolve company names from rankings_db (single query, not N).
    const companyIds = ecs
      .map(r => r.rankings_company_id)
      .filter(id => Number.isFinite(id));
    let nameById = {};
    if (companyIds.length > 0) {
      const { rankingsQuery } = require('../config/database.rankings');
      const { rows: companies } = await rankingsQuery(
        `SELECT id, company_name FROM companies WHERE id = ANY($1::int[])`,
        [companyIds]
      );
      nameById = companies.reduce((acc, c) => { acc[c.id] = c.company_name; return acc; }, {});
    }

    const ecsOut = ecs.map(r => ({
      ec_id: r.ec_id,
      rankings_company_id: r.rankings_company_id,
      company_name: r.rankings_company_id ? (nameById[r.rankings_company_id] || null) : null,
      pipeline_stage: r.pipeline_stage,
      days_in_stage: r.days_in_stage,
      signup_date: r.signup_date ? new Date(r.signup_date).toISOString().slice(0, 10) : null,
      monthly_rate: r.amount_cents != null ? Math.round(r.amount_cents / 100) : null,
      page_live_url: r.page_live_url || null
    }));

    const counts_by_stage = ecsOut.reduce((acc, e) => {
      if (e.pipeline_stage) acc[e.pipeline_stage] = (acc[e.pipeline_stage] || 0) + 1;
      return acc;
    }, {});

    return res.json({
      ecs: ecsOut,
      counts_by_stage,
      total: ecsOut.length
    });
  } catch (err) {
    console.error('[EC by-rep] Error:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch ECs by rep' });
  }
};

/**
 * POST /api/expert-contributors/from-form
 *
 * Called by the n8n adapter (workflow C7z6043tUdhxrnhx "EC Intake Form Adapter")
 * AFTER it has already created the WordPress draft page on power100.io. Closes
 * the gap between the form-driven lander pipeline and the TPE backend, so
 * form-submitted ECs land in tpedb and flow into the DRC pipeline like
 * presentation-page signups do.
 *
 * Auth: X-API-Key (TPX_SALES_AGENT_API_KEY) — same as DRC dashboard endpoints.
 *
 * Body matches the form payload (first_name, last_name, email, etc.) plus:
 *   - wp_page_id     (int)    — created by the page-creator workflow
 *   - wp_page_url    (string) — derived from page_slug
 *   - assigned_rep_id (int|null) — captured from ?rep=NN URL param on the form
 *
 * Behavior:
 *   1. Creates the expert_contributors row (or updates if email already exists),
 *      with contributor_class='expert_contributor', source='public_form',
 *      pipeline_stage='page_live', payment_status='form_submitted'.
 *   2. Fires handleSignup → company match + auto-assign rep (3-tier fallback)
 *      + DRC tasks/notes. If assigned_rep_id was passed in, that one wins.
 *   3. Fires handlePageLive → DRC page-live actions (since the page already
 *      exists by the time we get here).
 *   4. Auto-links IC leader term to the EC page (via contributorEnrichmentService).
 *
 * Returns: { success, ec_id, created|updated, contributor }
 */
const createFromForm = async (req, res) => {
  try {
    const {
      first_name, last_name, email, phone, company, title_position,
      contributor_type, form_tier, linkedin_url, website_url,
      hero_quote, bio, years_in_industry, revenue_value, geographic_reach,
      custom_stat, credentials, expertise_topics, recognition,
      company_description, videos, testimonials,
      headshot_url, wp_page_id, wp_page_url, assigned_rep_id
    } = req.body;

    if (!email) return res.status(400).json({ success: false, error: 'Email is required' });
    if (!first_name || !last_name) return res.status(400).json({ success: false, error: 'first_name and last_name are required' });
    if (!company) return res.status(400).json({ success: false, error: 'company is required' });

    // Form's contributor_type is one of: 'ceo' | 'partner' | 'industry_leader'
    // tpedb's contributor_type is one of: 'ec_individual' | 'ec_partner' | 'ec_partner_plus' | 'ec_enterprise'
    // Map by form_tier (full|medium|lean) within the type, defaulting sensibly.
    const tier = form_tier || 'full';
    let internalType = 'ec_individual';
    if (contributor_type === 'partner') internalType = 'ec_partner';
    else if (tier === 'lean') internalType = 'ec_individual';
    else if (tier === 'medium') internalType = 'ec_individual';
    else internalType = 'ec_individual';

    const repIdParam = assigned_rep_id != null && Number.isFinite(parseInt(assigned_rep_id, 10))
      ? parseInt(assigned_rep_id, 10)
      : null;

    const existing = await query('SELECT id FROM expert_contributors WHERE email = $1', [email]);

    let result;
    let wasUpdate = false;

    if (existing.rows.length > 0) {
      wasUpdate = true;
      result = await query(`
        UPDATE expert_contributors SET
          first_name = COALESCE($1, first_name),
          last_name = COALESCE($2, last_name),
          phone = COALESCE($3, phone),
          company = COALESCE($4, company),
          title_position = COALESCE($5, title_position),
          contributor_type = COALESCE($6, contributor_type),
          form_tier = COALESCE($7, form_tier),
          linkedin_url = COALESCE($8, linkedin_url),
          website_url = COALESCE($9, website_url),
          hero_quote = COALESCE($10, hero_quote),
          bio = COALESCE($11, bio),
          years_in_industry = COALESCE($12, years_in_industry),
          revenue_value = COALESCE($13, revenue_value),
          geographic_reach = COALESCE($14, geographic_reach),
          custom_stat = COALESCE($15, custom_stat),
          credentials = COALESCE($16, credentials),
          expertise_topics = COALESCE($17, expertise_topics),
          recognition = COALESCE($18, recognition),
          company_description = COALESCE($19, company_description),
          videos = COALESCE($20, videos),
          testimonials = COALESCE($21, testimonials),
          headshot_url = COALESCE($22, headshot_url),
          wp_page_id = COALESCE($23, wp_page_id),
          wp_page_url = COALESCE($24, wp_page_url),
          assigned_rep_id = COALESCE($25, assigned_rep_id),
          contributor_class = 'expert_contributor',
          source = COALESCE(source, 'public_form'),
          pipeline_stage = 'page_live',
          payment_status = COALESCE(payment_status, 'form_submitted'),
          updated_at = NOW()
        WHERE email = $26
        RETURNING *
      `, [
        first_name, last_name, phone, company, title_position,
        internalType, tier, linkedin_url, website_url,
        hero_quote, bio, years_in_industry, revenue_value, geographic_reach,
        custom_stat, credentials, expertise_topics, recognition,
        company_description,
        videos ? JSON.stringify(videos) : null,
        testimonials ? JSON.stringify(testimonials) : null,
        headshot_url || null,
        wp_page_id || null, wp_page_url || null,
        repIdParam,
        email
      ]);
    } else {
      result = await query(`
        INSERT INTO expert_contributors (
          first_name, last_name, email, phone, company, title_position,
          contributor_type, form_tier, linkedin_url, website_url,
          hero_quote, bio, years_in_industry, revenue_value, geographic_reach,
          custom_stat, credentials, expertise_topics, recognition,
          company_description, videos, testimonials, headshot_url,
          wp_page_id, wp_page_url, assigned_rep_id,
          contributor_class, source, pipeline_stage, payment_status
        ) VALUES (
          $1, $2, $3, $4, $5, $6,
          $7, $8, $9, $10,
          $11, $12, $13, $14, $15,
          $16, $17, $18, $19,
          $20, $21, $22, $23,
          $24, $25, $26,
          'expert_contributor', 'public_form', 'page_live', 'form_submitted'
        ) RETURNING *
      `, [
        first_name, last_name, email, phone, company, title_position,
        internalType, tier, linkedin_url, website_url,
        hero_quote, bio, years_in_industry, revenue_value, geographic_reach,
        custom_stat, credentials, expertise_topics, recognition,
        company_description,
        videos ? JSON.stringify(videos) : '[]',
        testimonials ? JSON.stringify(testimonials) : '[]',
        headshot_url || null,
        wp_page_id || null, wp_page_url || null,
        repIdParam
      ]);
    }

    const contributor = result.rows[0];

    // DRC integration — must run sequentially because handleSignup hardcodes
    // pipeline_stage='signup' and handlePageLive sets it to 'page_live'. If they
    // race, handleSignup wins last and the row gets stuck in 'signup' even
    // though the page is already live. Chain via .then() so the endpoint still
    // returns fast but stages settle in the correct order.
    ecDrcIntegration.handleSignup(contributor)
      .then(async () => {
        if (!wp_page_url) return;
        // Re-read contributor — handleSignup may have set rankings_company_id,
        // which handlePageLive needs to fire its DRC actions.
        const fresh = await query('SELECT * FROM expert_contributors WHERE id = $1', [contributor.id]);
        if (fresh.rows.length > 0) {
          await ecDrcIntegration.handlePageLive(fresh.rows[0], wp_page_url);
        }
      })
      .then(() => {
        if (!wp_page_url) return;
        try {
          const contributorEnrichment = require('../services/contributorEnrichmentService');
          const fullName = `${contributor.first_name} ${contributor.last_name}`.trim();
          return contributorEnrichment.enrichSingleLeader(fullName);
        } catch (e) { /* enrichment service not critical */ }
      })
      .catch(e => console.error('[EC-DRC from-form] Integration chain error:', e.message));

    return res.status(wasUpdate ? 200 : 201).json({
      success: true,
      ec_id: contributor.id,
      created: !wasUpdate,
      updated: wasUpdate,
      contributor
    });
  } catch (err) {
    console.error('Error creating EC from form:', err);
    return res.status(500).json({ success: false, error: 'Failed to create EC from form' });
  }
};

/**
 * POST /api/expert-contributors/upsert-from-episode
 *
 * Called by the IC `ic_sync_speaker_taxonomies` PHP hook on every ic_content
 * episode publish. Body shape (one POST per speaker):
 *   { name, title, company, photo_url, episode_post_id }
 *
 * Behavior: ensures a minimal expert_contributors row exists (looked up by
 * name+company, contributor_class='contributor'), then upserts the lander on
 * staging.power100.io. Idempotent — safe to fire on every episode save.
 *
 * Auth: X-API-Key (TPX_SALES_AGENT_API_KEY) — same as DRC dashboard.
 *
 * Returns: { success, ec_id, wp_page_id, wp_page_url, action }
 */
const upsertFromEpisode = async (req, res) => {
  try {
    const { name, title, company, photo_url, episode_post_id } = req.body || {};
    if (!name || !String(name).trim()) {
      return res.status(400).json({ success: false, error: 'name is required' });
    }
    const enrich = require('../services/contributorEnrichmentService');
    const row = await enrich.ensureContributorRowFromEpisode({
      name: String(name).trim(),
      title: title ? String(title).trim() : null,
      company: company ? String(company).trim() : null,
      photo_url: photo_url ? String(photo_url).trim() : null,
      episode_post_id: episode_post_id || null,
    });
    const result = await enrich.upsertContributorLander(row, { source: 'episode_publish' });
    return res.json({
      success: true,
      ec_id: row.id,
      wp_page_id: result.wp_page_id,
      wp_page_url: result.wp_page_url,
      action: result.action,
    });
  } catch (err) {
    console.error('[upsertFromEpisode] error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

module.exports = { createExpertContributor, updatePaymentStatus, getDelegateProfile, completeDelegateProfile, linkCompany, markPageLive, getDrcStatus, getEcsByRep, createFromForm, upsertFromEpisode };
