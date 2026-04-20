// DATABASE-CHECKED: expert_contributors columns verified on 2026-04-19
// Contributor-class = 'contributor' path for non-paying show guests.
// Shares the expert_contributors table with paying ECs.
const { query } = require('../config/database');
const crypto = require('crypto');

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
        invite_url: `/show-guest-onboarding/${existing.rows[0].delegation_token}`
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
      invite_url: `/show-guest-onboarding/${result.rows[0].delegation_token}`
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
              geo_keywords, contributor_class, contributor_type, source, status
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

// POST /api/show-guests/token/:token/submit
// Public. Submits the filled-out form and flips status to profile_complete.
const submitShowGuestForm = async (req, res) => {
  try {
    const { token } = req.params;
    const {
      first_name, last_name, phone, company, title_position,
      bio, hero_quote, linkedin_url, website_url, headshot_url,
      geo_keywords
    } = req.body;

    const keywords = Array.isArray(geo_keywords)
      ? geo_keywords.map(k => (typeof k === 'string' ? k.trim() : '')).filter(Boolean)
      : [];
    if (keywords.length < 5) {
      return res.status(400).json({
        success: false,
        error: 'Please provide at least 5 AI GEO long-tail phrases (10 recommended)'
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
         geo_keywords = $11::jsonb,
         status = 'profile_complete',
         updated_at = CURRENT_TIMESTAMP
       WHERE delegation_token = $12 AND contributor_class = 'contributor'
       RETURNING id, first_name, last_name, email`,
      [
        first_name, last_name, phone, company, title_position,
        bio, hero_quote, linkedin_url, website_url, headshot_url,
        JSON.stringify(keywords),
        token
      ]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, error: 'Invalid or expired token' });
    }
    return res.json({
      success: true,
      contributor_id: result.rows[0].id,
      message: 'Show guest profile submitted successfully'
    });
  } catch (err) {
    console.error('[showGuest] submitShowGuestForm error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

// POST /api/show-guests/token/:token/upload-headshot
// Public. multer middleware has already written the file to uploads/show-guest-headshots/.
// We verify the token exists + returns the public URL.
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

module.exports = {
  createShowGuestToken,
  getShowGuestByToken,
  submitShowGuestForm,
  uploadShowGuestHeadshot
};
