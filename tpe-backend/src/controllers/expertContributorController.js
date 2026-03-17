// DATABASE-CHECKED: expert_contributors columns verified on 2026-03-11
const { query } = require('../config/database');
const axios = require('axios');

const N8N_EMAIL_WEBHOOK = process.env.NODE_ENV === 'production'
  ? 'https://n8n.srv918843.hstgr.cloud/webhook/email-outbound'
  : 'https://n8n.srv918843.hstgr.cloud/webhook/email-outbound-dev';

const N8N_SMS_WEBHOOK = process.env.NODE_ENV === 'production'
  ? 'https://n8n.srv918843.hstgr.cloud/webhook/sms-outbound'
  : 'https://n8n.srv918843.hstgr.cloud/webhook/sms-outbound-dev';

/**
 * Send welcome email and SMS to new expert contributor
 * Non-blocking — failures don't affect the API response
 */
async function sendWelcomeMessages(contributor) {
  const firstName = contributor.first_name || 'there';
  const email = contributor.email;
  const phone = contributor.phone;

  // Welcome Email
  try {
    const emailHtml = `
      <div style="max-width:600px;margin:0 auto;font-family:Arial,sans-serif;color:#333;">
        <div style="background:#000;padding:24px;text-align:center;border-radius:12px 12px 0 0;">
          <h1 style="color:#FB0401;margin:0;font-size:24px;">POWER100</h1>
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
      template: 'ec_welcome'
    }, { timeout: 10000 });

    console.log('[Expert Contributor] Welcome email sent to ' + email);
  } catch (err) {
    console.error('[Expert Contributor] Welcome email failed:', err.message);
  }

  // Welcome SMS
  if (phone) {
    try {
      await axios.post(N8N_SMS_WEBHOOK, {
        message_id: 'ec-welcome-sms-' + contributor.id,
        to_phone: phone,
        to_name: firstName,
        message: 'Welcome to the Power100 Authority Contributor Network, ' + firstName + '! Thank you for joining. Our team is building your contributor page now and we will notify you as soon as it is ready for review. - Power100 Team'
      }, { timeout: 10000 });

      console.log('[Expert Contributor] Welcome SMS sent to ' + phone);
    } catch (err) {
      console.error('[Expert Contributor] Welcome SMS failed:', err.message);
    }
  }
}

/**
 * Send delegation email to the team member who will complete the profile
 */
async function sendDelegationEmail(contributor, token) {
  const delegateName = contributor.delegated_to_name || 'Team Member';
  const delegateEmail = contributor.delegated_to_email;
  const ceoName = `${contributor.first_name || ''} ${contributor.last_name || ''}`.trim();
  const companyName = contributor.company || 'your company';

  if (!delegateEmail) return;

  const delegateLink = `https://power100.io/contributor-delegate/?token=${token}`;

  try {
    const emailHtml = `
      <div style="max-width:600px;margin:0 auto;font-family:Arial,sans-serif;color:#333;">
        <div style="background:#000;padding:24px;text-align:center;border-radius:12px 12px 0 0;">
          <h1 style="color:#FB0401;margin:0;font-size:24px;">POWER100</h1>
          <p style="color:#fff;margin:6px 0 0;font-size:13px;">Authority Contributor Program</p>
        </div>
        <div style="padding:28px;background:#fff;border:1px solid #eee;">
          <p style="font-size:16px;margin-bottom:16px;">Hi ${delegateName.split(' ')[0]},</p>
          <p style="font-size:14px;color:#555;line-height:1.7;margin-bottom:16px;"><strong>${ceoName}</strong> from <strong>${companyName}</strong> has joined the Power100 Authority Contributor Network and has designated you to complete their contributor profile.</p>
          <p style="font-size:14px;color:#555;line-height:1.7;margin-bottom:16px;">This profile will be used to build their dedicated Authority Contributor page on Power100.io, featuring their leadership story, credentials, and media content.</p>
          <p style="font-size:14px;color:#555;line-height:1.7;margin-bottom:24px;">Please click the link below to complete the profile:</p>
          <div style="text-align:center;margin-bottom:24px;">
            <a href="${delegateLink}" style="display:inline-block;background:#FB0401;color:#fff;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:15px;font-weight:600;">Complete ${ceoName}'s Profile</a>
          </div>
          <p style="font-size:13px;color:#888;line-height:1.6;margin-bottom:0;">If you have any questions, reply to this email or reach out to our team. This link is unique to this request and can be used anytime.</p>
        </div>
        <div style="background:#f8f9fa;padding:12px;text-align:center;border-radius:0 0 12px 12px;border:1px solid #eee;border-top:none;">
          <p style="margin:0;font-size:11px;color:#999;">Power100 Authority Contributor Program | power100.io</p>
        </div>
      </div>`;

    await axios.post(N8N_EMAIL_WEBHOOK, {
      message_id: 'ec-delegate-' + contributor.id,
      to_email: delegateEmail,
      to_name: delegateName,
      subject: `${ceoName} has asked you to complete their Power100 Authority Profile`,
      body: emailHtml,
      template: 'ec_delegation'
    }, { timeout: 10000 });

    console.log('[Expert Contributor] Delegation email sent to ' + delegateEmail);
  } catch (err) {
    console.error('[Expert Contributor] Delegation email failed:', err.message);
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
      delegated_to_name, delegated_to_email
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
          updated_at = NOW()
        WHERE email = $28
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
        delegated_to_name, delegated_to_email, delegation_token
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
        $21, $22, $23, $24, $25, $26, $27, $28, $29,
        $30, $31, $32
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
      delegationToken
    ]);

    // Send welcome email and SMS (non-blocking)
    if (result.rows[0].payment_status === 'succeeded') {
      sendWelcomeMessages(result.rows[0]).catch(e => console.error('[Expert Contributor] Welcome messages error:', e.message));
    }

    // Send delegation email if delegated
    if (delegated_to_email && delegationToken) {
      sendDelegationEmail(result.rows[0], delegationToken).catch(e => console.error('[Expert Contributor] Delegation email error:', e.message));
    }

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

module.exports = { createExpertContributor, updatePaymentStatus };
