// DATABASE-CHECKED: expert_contributors columns verified on 2026-04-20
// Show-guest onboarding controller.
// Backs the public onboarding form at power100.io/show-guest-onboarding
// AND the delegation flow (delegate completes the form on behalf of guest).
// All rows live in expert_contributors with contributor_class='contributor',
// contributor_type='show_guest'.
const { query } = require('../config/database');
const crypto = require('crypto');
const axios = require('axios');

const N8N_EMAIL_WEBHOOK = process.env.NODE_ENV === 'production'
  ? 'https://n8n.srv918843.hstgr.cloud/webhook/email-outbound'
  : 'https://n8n.srv918843.hstgr.cloud/webhook/email-outbound-dev';

const N8N_SMS_WEBHOOK = process.env.NODE_ENV === 'production'
  ? 'https://n8n.srv918843.hstgr.cloud/webhook/backend-to-ghl'
  : 'https://n8n.srv918843.hstgr.cloud/webhook/backend-to-ghl-dev';

// Internal staff alerts — email/SMS fanout when a new guest onboards
const STAFF_EMAILS = ['zeek@power100.io', 'greg@power100.io'];
const STAFF_SMS_PHONES = ['+17274304341']; // Greg. Zeek can be added once his phone is confirmed.

/* ============================================================
   NOTIFICATIONS (all non-blocking — failures logged, not thrown)
   ============================================================ */

async function sendDelegateInviteEmail(contributor, token, inviter) {
  const delegateLink = `https://power100.io/show-guest-onboarding/?delegation_token=${token}`;
  const inviterName = ((inviter.first_name || '') + ' ' + (inviter.last_name || '')).trim() || inviter.email;
  const delegateName = contributor.delegated_to_name || 'there';
  const show = 'Outside The Lines';

  const header = '<div style="background:#000;padding:24px;text-align:center;border-radius:12px 12px 0 0;"><img src="https://power100.io/wp-content/uploads/2026/01/Power100-Icon-Hi-Res-and-Large-1.png" alt="Power100" style="width:48px;margin-bottom:8px;"><h1 style="color:#FB0401;margin:0;font-size:24px;">POWER100</h1><p style="color:#fff;margin:6px 0 0;font-size:13px;">Show Guest Onboarding</p></div>';
  const footer = '<div style="background:#f8f9fa;padding:12px;text-align:center;border-radius:0 0 12px 12px;border:1px solid #eee;border-top:none;"><p style="margin:0;font-size:11px;color:#999;">Power100 Show Guest Program | power100.io</p></div>';
  const body = `<p style="font-size:16px;margin-bottom:16px;">Hi ${delegateName.split(' ')[0]},</p>
    <p style="font-size:14px;color:#555;line-height:1.7;margin-bottom:16px;"><strong>${inviterName}</strong> has been invited to appear as a guest on the Power100 <strong>${show}</strong> podcast — and has delegated you to complete the guest onboarding profile on their behalf.</p>
    <p style="font-size:14px;color:#555;line-height:1.7;margin-bottom:16px;">This profile is used to build their Inner Circle contributor page on power100.io and to prepare for the interview.</p>
    <p style="font-size:14px;color:#555;line-height:1.7;margin-bottom:24px;">Please click below to complete the onboarding form:</p>
    <div style="text-align:center;margin-bottom:24px;"><a href="${delegateLink}" style="display:inline-block;background:#FB0401;color:#fff;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:15px;font-weight:600;">Complete ${inviterName}'s Onboarding</a></div>
    <p style="font-size:13px;color:#888;line-height:1.6;">The link is unique and secure. If you have questions, reply to this email.</p>`;

  try {
    await axios.post(N8N_EMAIL_WEBHOOK, {
      message_id: 'sg-delegate-invite-' + contributor.id,
      to_email: contributor.delegated_to_email,
      to_name: contributor.delegated_to_name || 'Team Member',
      subject: `${inviterName} has asked you to complete their Power100 show guest onboarding`,
      body: `<div style="max-width:600px;margin:0 auto;font-family:Arial,sans-serif;color:#333;">${header}<div style="padding:28px;background:#fff;border:1px solid #eee;">${body}</div>${footer}</div>`,
      template: 'sg_delegate_invite',
      from_name: 'Power100',
      from_email: 'info@power100.io'
    }, { timeout: 10000 });
    console.log('[showGuest] Delegate invite email sent to ' + contributor.delegated_to_email);
  } catch (err) {
    console.error('[showGuest] Delegate invite email failed:', err.message);
  }
}

async function notifyStaffOfNewGuest(contributor, isDelegateSubmission) {
  const fullName = ((contributor.first_name || '') + ' ' + (contributor.last_name || '')).trim();
  const company = contributor.company || '';
  const title = contributor.title_position || '';
  const show = 'Outside The Lines';

  // Email to staff
  const header = '<div style="background:#000;padding:24px;text-align:center;border-radius:12px 12px 0 0;"><img src="https://power100.io/wp-content/uploads/2026/01/Power100-Icon-Hi-Res-and-Large-1.png" alt="Power100" style="width:48px;margin-bottom:8px;"><h1 style="color:#FB0401;margin:0;font-size:24px;">POWER100</h1><p style="color:#fff;margin:6px 0 0;font-size:13px;">New Show Guest Onboarding</p></div>';
  const footer = '<div style="background:#f8f9fa;padding:12px;text-align:center;border-radius:0 0 12px 12px;border:1px solid #eee;border-top:none;"><p style="margin:0;font-size:11px;color:#999;">Power100 Internal Notification</p></div>';
  const body = `<p style="font-size:16px;margin-bottom:16px;font-weight:600;">New show guest onboarding ${isDelegateSubmission ? '(delegate submission)' : ''}</p>
    <table style="width:100%;border-collapse:collapse;font-size:14px;color:#333;">
      <tr><td style="padding:8px 0;color:#666;width:140px;">Name</td><td style="padding:8px 0;font-weight:600;">${fullName}</td></tr>
      <tr><td style="padding:8px 0;color:#666;">Email</td><td style="padding:8px 0;">${contributor.email || ''}</td></tr>
      <tr><td style="padding:8px 0;color:#666;">Phone</td><td style="padding:8px 0;">${contributor.phone || ''}</td></tr>
      <tr><td style="padding:8px 0;color:#666;">Company</td><td style="padding:8px 0;">${company}</td></tr>
      <tr><td style="padding:8px 0;color:#666;">Title</td><td style="padding:8px 0;">${title}</td></tr>
      <tr><td style="padding:8px 0;color:#666;">Show</td><td style="padding:8px 0;">${show}</td></tr>
      <tr><td style="padding:8px 0;color:#666;">Contributor ID</td><td style="padding:8px 0;">${contributor.id}</td></tr>
    </table>
    <p style="font-size:13px;color:#555;line-height:1.7;margin-top:16px;">Submitted at ${new Date().toISOString()}. The Power100 team can start building the Inner Circle contributor page and prep for the interview.</p>`;

  for (const toEmail of STAFF_EMAILS) {
    try {
      await axios.post(N8N_EMAIL_WEBHOOK, {
        message_id: 'sg-staff-' + contributor.id + '-' + toEmail.split('@')[0],
        to_email: toEmail,
        to_name: 'Power100 Team',
        subject: `New Show Guest: ${fullName}${company ? ' (' + company + ')' : ''}`,
        body: `<div style="max-width:600px;margin:0 auto;font-family:Arial,sans-serif;color:#333;">${header}<div style="padding:28px;background:#fff;border:1px solid #eee;">${body}</div>${footer}</div>`,
        template: 'sg_staff_notification',
        from_name: 'Power100',
        from_email: 'info@power100.io'
      }, { timeout: 10000 });
      console.log('[showGuest] Staff notification email sent to ' + toEmail);
    } catch (err) {
      console.error('[showGuest] Staff email to ' + toEmail + ' failed:', err.message);
    }
  }

  // SMS to staff
  const smsMsg = `New Power100 show guest onboarding: ${fullName}${company ? ' @ ' + company : ''}. View in admin. — Power100`;
  for (const phone of STAFF_SMS_PHONES) {
    try {
      await axios.post(N8N_SMS_WEBHOOK, {
        send_via_ghl: {
          phone: phone,
          message: smsMsg,
          message_type: 'sg_new_onboarding',
          contractor_id: contributor.id
        }
      }, { timeout: 10000 });
      console.log('[showGuest] Staff notification SMS sent to ' + phone);
    } catch (err) {
      console.error('[showGuest] Staff SMS to ' + phone + ' failed:', err.message);
    }
  }
}

/* ============================================================
   SHARED HELPERS
   ============================================================ */

function sanitizeKeywords(arr) {
  if (!Array.isArray(arr)) return [];
  return arr.map((k) => (typeof k === 'string' ? k.trim() : '')).filter(Boolean).slice(0, 10);
}

function sanitizeDistContacts(arr) {
  if (!Array.isArray(arr)) return [];
  const out = [];
  for (const row of arr) {
    if (!row || typeof row !== 'object') continue;
    const name = (row.name || '').toString().trim();
    const email = (row.email || '').toString().trim();
    if (!name || !email) continue;
    out.push({
      name: name.slice(0, 80),
      email: email.slice(0, 120),
      phone: (row.phone || '').toString().trim().slice(0, 40),
      role: (row.role || '').toString().trim().slice(0, 80)
    });
  }
  return out.slice(0, 20);
}

function sanitizeVideos(arr) {
  if (!Array.isArray(arr)) return [];
  const out = [];
  for (const row of arr) {
    if (!row || typeof row !== 'object') continue;
    const title = (row.title || '').toString().trim();
    const url = (row.url || '').toString().trim();
    if (!url) continue;
    out.push({
      title: title.slice(0, 160),
      url: url.slice(0, 500),
      description: (row.description || '').toString().trim().slice(0, 500)
    });
  }
  return out.slice(0, 10);
}

function sanitizeTestimonials(arr) {
  if (!Array.isArray(arr)) return [];
  const out = [];
  for (const row of arr) {
    if (!row || typeof row !== 'object') continue;
    const quote = (row.quote || '').toString().trim();
    if (!quote) continue;
    out.push({
      quote: quote.slice(0, 800),
      name: (row.name || '').toString().trim().slice(0, 80),
      company: (row.company || '').toString().trim().slice(0, 120),
      role: (row.role || '').toString().trim().slice(0, 120)
    });
  }
  return out.slice(0, 10);
}

// Returns true on honeypot hit (reject).
function isBotHit(req) {
  // Honeypot field name: company_website_confirm
  // Any value === bot.
  const hp = (req.body && req.body.company_website_confirm);
  if (hp && String(hp).trim() !== '') return true;
  return false;
}

/* ============================================================
   ENDPOINTS
   ============================================================ */

// POST /api/show-guests/create-token
// Admin-called. Creates a pending contributor row + returns invite URL.
// Body: { show_slug, episode_post_id, first_name, last_name, email }
const createShowGuestToken = async (req, res) => {
  try {
    const { show_slug, episode_post_id, first_name, last_name, email } = req.body;
    if (!show_slug || !episode_post_id || !first_name || !last_name || !email) {
      return res.status(400).json({
        success: false,
        error: 'show_slug, episode_post_id, first_name, last_name, email are required'
      });
    }
    const token = crypto.randomBytes(32).toString('hex');
    const source = `show:${show_slug}:${episode_post_id}`;

    const existing = await query(
      `SELECT id, delegation_token FROM expert_contributors
       WHERE email = $1 AND contributor_class = 'contributor'`,
      [email]
    );
    if (existing.rows.length > 0) {
      return res.json({
        success: true,
        already_exists: true,
        contributor_id: existing.rows[0].id,
        token: existing.rows[0].delegation_token,
        invite_url: `/show-guest-onboarding/?delegation_token=${existing.rows[0].delegation_token}`
      });
    }

    const result = await query(
      `INSERT INTO expert_contributors
        (first_name, last_name, email, contributor_class, contributor_type,
         source, status, delegation_token, created_at, updated_at)
       VALUES ($1, $2, $3, 'contributor', 'show_guest', $4, 'token_created', $5,
               CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING id, delegation_token`,
      [first_name, last_name, email, source, token]
    );

    return res.json({
      success: true,
      contributor_id: result.rows[0].id,
      token: result.rows[0].delegation_token,
      invite_url: `/show-guest-onboarding/?delegation_token=${result.rows[0].delegation_token}`
    });
  } catch (err) {
    console.error('[showGuest] createShowGuestToken error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

// GET /api/show-guests/token/:token
// Public. Returns the contributor profile for form prefill.
const getShowGuestByToken = async (req, res) => {
  try {
    const { token } = req.params;
    const result = await query(
      `SELECT id, first_name, last_name, email, phone, company, title_position,
              bio, hero_quote, linkedin_url, website_url, headshot_url,
              years_in_industry, revenue_value, geographic_reach, custom_stat,
              credentials, expertise_topics, recognition, company_description,
              videos, testimonials, distribution_contacts,
              geo_keywords, contributor_class, contributor_type, source, status,
              delegated_to_name, delegated_to_email,
              onboarding_contact_name, onboarding_contact_email, onboarding_contact_phone, onboarding_contact_position
       FROM expert_contributors
       WHERE delegation_token = $1 AND contributor_class = 'contributor'`,
      [token]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Invalid or expired token' });
    }
    return res.json({ success: true, contributor: result.rows[0] });
  } catch (err) {
    console.error('[showGuest] getShowGuestByToken error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

// Build the SQL UPDATE body shared between delegate submit + public submit.
function buildSubmitUpdate(body) {
  const {
    first_name, last_name, phone, company, title_position,
    bio, hero_quote, linkedin_url, website_url, headshot_url,
    years_in_industry, revenue_value, geographic_reach, custom_stat,
    credentials, expertise_topics, recognition, company_description,
    onboarding_contact_name, onboarding_contact_email, onboarding_contact_phone, onboarding_contact_position,
    videos, testimonials, geo_keywords, distribution_contacts
  } = body;

  const keywords = sanitizeKeywords(geo_keywords);
  const dist = sanitizeDistContacts(distribution_contacts);
  const vids = sanitizeVideos(videos);
  const tests = sanitizeTestimonials(testimonials);

  return {
    keywords, dist, vids, tests,
    values: [
      first_name, last_name, phone, company, title_position,
      bio, hero_quote, linkedin_url, website_url, headshot_url,
      years_in_industry, revenue_value, geographic_reach, custom_stat,
      credentials, expertise_topics, recognition, company_description,
      onboarding_contact_name, onboarding_contact_email, onboarding_contact_phone, onboarding_contact_position,
      JSON.stringify(vids), JSON.stringify(tests),
      JSON.stringify(keywords), JSON.stringify(dist)
    ]
  };
}

// POST /api/show-guests/token/:token/submit
// Delegation submit — updates the existing pending row.
const submitShowGuestForm = async (req, res) => {
  try {
    if (isBotHit(req)) {
      // Silently accept to not tip off bots.
      return res.json({ success: true });
    }

    const { token } = req.params;
    const u = buildSubmitUpdate(req.body);

    // Lenient minimum: at least 3 geo keywords (was 5 before; public form is also new to this field).
    if (u.keywords.length < 3) {
      return res.status(400).json({
        success: false,
        error: 'Please provide at least 3 AI GEO long-tail phrases (10 recommended)'
      });
    }

    const result = await query(
      `UPDATE expert_contributors SET
         first_name = COALESCE($1, first_name),
         last_name = COALESCE($2, last_name),
         phone = COALESCE($3, phone),
         company = COALESCE($4, company),
         title_position = COALESCE($5, title_position),
         bio = COALESCE($6, bio),
         hero_quote = COALESCE($7, hero_quote),
         linkedin_url = COALESCE($8, linkedin_url),
         website_url = COALESCE($9, website_url),
         headshot_url = COALESCE($10, headshot_url),
         years_in_industry = COALESCE($11, years_in_industry),
         revenue_value = COALESCE($12, revenue_value),
         geographic_reach = COALESCE($13, geographic_reach),
         custom_stat = COALESCE($14, custom_stat),
         credentials = COALESCE($15, credentials),
         expertise_topics = COALESCE($16, expertise_topics),
         recognition = COALESCE($17, recognition),
         company_description = COALESCE($18, company_description),
         onboarding_contact_name = COALESCE($19, onboarding_contact_name),
         onboarding_contact_email = COALESCE($20, onboarding_contact_email),
         onboarding_contact_phone = COALESCE($21, onboarding_contact_phone),
         onboarding_contact_position = COALESCE($22, onboarding_contact_position),
         videos = $23::jsonb,
         testimonials = $24::jsonb,
         geo_keywords = $25::jsonb,
         distribution_contacts = $26::jsonb,
         delegation_completed = TRUE,
         status = 'profile_complete',
         updated_at = CURRENT_TIMESTAMP
       WHERE delegation_token = $27 AND contributor_class = 'contributor'
       RETURNING id, first_name, last_name, email, phone, company, title_position`,
      [...u.values, token]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, error: 'Invalid or expired token' });
    }

    // Fire notifications (non-blocking).
    const row = result.rows[0];
    setImmediate(() => { notifyStaffOfNewGuest(row, true).catch(() => {}); });

    return res.json({
      success: true,
      contributor_id: row.id,
      message: 'Show guest profile submitted successfully'
    });
  } catch (err) {
    console.error('[showGuest] submitShowGuestForm error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

// POST /api/show-guests/submit
// PUBLIC — no token. Creates a new row OR updates existing contributor-class row
// with the same email.
const submitShowGuestFormPublic = async (req, res) => {
  try {
    if (isBotHit(req)) {
      return res.json({ success: true });
    }

    const { first_name, last_name, email } = req.body;
    if (!first_name || !last_name || !email) {
      return res.status(400).json({
        success: false,
        error: 'First name, last name, and email are required.'
      });
    }

    const u = buildSubmitUpdate(req.body);
    if (u.keywords.length < 3) {
      return res.status(400).json({
        success: false,
        error: 'Please provide at least 3 AI GEO long-tail phrases (10 recommended).'
      });
    }

    // Check for existing row with same email + contributor class.
    const existing = await query(
      `SELECT id, status FROM expert_contributors
       WHERE LOWER(email) = LOWER($1) AND contributor_class = 'contributor'`,
      [email]
    );

    let row;
    if (existing.rows.length > 0) {
      // Update the existing row.
      const id = existing.rows[0].id;
      const result = await query(
        `UPDATE expert_contributors SET
           first_name = $1, last_name = $2,
           phone = $3, company = $4, title_position = $5,
           bio = $6, hero_quote = $7,
           linkedin_url = $8, website_url = $9,
           headshot_url = COALESCE($10, headshot_url),
           years_in_industry = $11, revenue_value = $12,
           geographic_reach = $13, custom_stat = $14,
           credentials = $15, expertise_topics = $16,
           recognition = $17, company_description = $18,
           onboarding_contact_name = $19, onboarding_contact_email = $20,
           onboarding_contact_phone = $21, onboarding_contact_position = $22,
           videos = $23::jsonb,
           testimonials = $24::jsonb,
           geo_keywords = $25::jsonb,
           distribution_contacts = $26::jsonb,
           status = 'profile_complete',
           updated_at = CURRENT_TIMESTAMP
         WHERE id = $27
         RETURNING id, first_name, last_name, email, phone, company, title_position`,
        [...u.values, id]
      );
      row = result.rows[0];
    } else {
      // Insert a new row.
      const result = await query(
        `INSERT INTO expert_contributors
           (first_name, last_name, email, phone, company, title_position,
            bio, hero_quote, linkedin_url, website_url, headshot_url,
            years_in_industry, revenue_value, geographic_reach, custom_stat,
            credentials, expertise_topics, recognition, company_description,
            onboarding_contact_name, onboarding_contact_email, onboarding_contact_phone, onboarding_contact_position,
            videos, testimonials, geo_keywords, distribution_contacts,
            contributor_class, contributor_type, source, status,
            created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6,
                 $7, $8, $9, $10, $11,
                 $12, $13, $14, $15,
                 $16, $17, $18, $19,
                 $20, $21, $22, $23,
                 $24::jsonb, $25::jsonb, $26::jsonb, $27::jsonb,
                 'contributor', 'show_guest', 'show-guest-onboarding-public', 'profile_complete',
                 CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         RETURNING id, first_name, last_name, email, phone, company, title_position`,
        [
          first_name, last_name, email,
          u.values[2], u.values[3], u.values[4],
          u.values[5], u.values[6], u.values[7], u.values[8], u.values[9],
          u.values[10], u.values[11], u.values[12], u.values[13],
          u.values[14], u.values[15], u.values[16], u.values[17],
          u.values[18], u.values[19], u.values[20], u.values[21],
          u.values[22], u.values[23], u.values[24], u.values[25]
        ]
      );
      row = result.rows[0];
    }

    // Fire notifications (non-blocking).
    setImmediate(() => { notifyStaffOfNewGuest(row, false).catch(() => {}); });

    return res.json({
      success: true,
      contributor_id: row.id,
      message: 'Show guest profile submitted successfully'
    });
  } catch (err) {
    console.error('[showGuest] submitShowGuestFormPublic error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

// POST /api/show-guests/token/:token/upload-headshot
// Public, token-gated. multer has already written the file.
const uploadShowGuestHeadshot = async (req, res) => {
  try {
    const { token } = req.params;
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded (expected field name "headshot")' });
    }

    const check = await query(
      `SELECT id FROM expert_contributors
       WHERE delegation_token = $1 AND contributor_class = 'contributor'`,
      [token]
    );
    if (check.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Invalid or expired token' });
    }

    const proto = req.protocol;
    const host = req.get('host');
    const publicUrl = `${proto}://${host}/uploads/show-guest-headshots/${req.file.filename}`;

    return res.json({
      success: true,
      url: publicUrl,
      filename: req.file.filename,
      size: req.file.size,
      mimetype: req.file.mimetype
    });
  } catch (err) {
    console.error('[showGuest] uploadShowGuestHeadshot error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

// POST /api/show-guests/upload-headshot
// PUBLIC — no token. Returns a URL the form pastes into its hidden headshot_url
// field. The file lives in /uploads/show-guest-headshots/ and is bound to the
// submission by that URL (the submit endpoint stores it on the row).
const uploadShowGuestPublicHeadshot = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded (expected field name "headshot")' });
    }
    const proto = req.protocol;
    const host = req.get('host');
    const publicUrl = `${proto}://${host}/uploads/show-guest-headshots/${req.file.filename}`;
    return res.json({
      success: true,
      url: publicUrl,
      filename: req.file.filename,
      size: req.file.size,
      mimetype: req.file.mimetype
    });
  } catch (err) {
    console.error('[showGuest] uploadShowGuestPublicHeadshot error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

// POST /api/show-guests/delegate/create
// PUBLIC. Body: { first_name, last_name, email, phone (optional),
//                 delegated_to_name, delegated_to_email }
// Creates a pending row with a delegation token + emails the delegate.
const createShowGuestDelegate = async (req, res) => {
  try {
    if (isBotHit(req)) {
      return res.json({ success: true });
    }

    const {
      first_name, last_name, email, phone,
      delegated_to_name, delegated_to_email
    } = req.body;

    if (!first_name || !last_name || !email) {
      return res.status(400).json({
        success: false,
        error: 'Guest first name, last name, and email are required.'
      });
    }
    if (!delegated_to_name || !delegated_to_email) {
      return res.status(400).json({
        success: false,
        error: "Delegate's name and email are required."
      });
    }

    // If we already have a row for this email + class, reuse its token.
    const existing = await query(
      `SELECT id, delegation_token, first_name, last_name, email
       FROM expert_contributors
       WHERE LOWER(email) = LOWER($1) AND contributor_class = 'contributor'`,
      [email]
    );

    let contributor;
    if (existing.rows.length > 0) {
      const id = existing.rows[0].id;
      let token = existing.rows[0].delegation_token;
      if (!token) {
        token = crypto.randomBytes(32).toString('hex');
      }
      const up = await query(
        `UPDATE expert_contributors SET
           first_name = $1, last_name = $2,
           phone = COALESCE($3, phone),
           delegated_to_name = $4, delegated_to_email = $5,
           delegation_token = $6,
           delegation_completed = FALSE,
           status = CASE WHEN status = 'profile_complete' THEN status ELSE 'token_created' END,
           updated_at = CURRENT_TIMESTAMP
         WHERE id = $7
         RETURNING id, first_name, last_name, email, delegation_token, delegated_to_name, delegated_to_email`,
        [first_name, last_name, phone || null, delegated_to_name, delegated_to_email, token, id]
      );
      contributor = up.rows[0];
    } else {
      const token = crypto.randomBytes(32).toString('hex');
      const ins = await query(
        `INSERT INTO expert_contributors
           (first_name, last_name, email, phone,
            delegated_to_name, delegated_to_email, delegation_token,
            contributor_class, contributor_type, source, status,
            created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7,
                 'contributor', 'show_guest',
                 'show-guest-onboarding-delegate', 'token_created',
                 CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         RETURNING id, first_name, last_name, email, delegation_token, delegated_to_name, delegated_to_email`,
        [first_name, last_name, email, phone || null, delegated_to_name, delegated_to_email, token]
      );
      contributor = ins.rows[0];
    }

    const inviter = { first_name, last_name, email };
    setImmediate(() => {
      sendDelegateInviteEmail(contributor, contributor.delegation_token, inviter).catch(() => {});
    });

    return res.json({
      success: true,
      contributor_id: contributor.id,
      delegation_token: contributor.delegation_token,
      delegate_url: `https://power100.io/show-guest-onboarding/?delegation_token=${contributor.delegation_token}`
    });
  } catch (err) {
    console.error('[showGuest] createShowGuestDelegate error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

module.exports = {
  createShowGuestToken,
  getShowGuestByToken,
  submitShowGuestForm,
  submitShowGuestFormPublic,
  uploadShowGuestHeadshot,
  uploadShowGuestPublicHeadshot,
  createShowGuestDelegate
};
