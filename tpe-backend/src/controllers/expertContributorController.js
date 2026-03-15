// DATABASE-CHECKED: expert_contributors columns verified on 2026-03-11
const { query } = require('../config/database');

const createExpertContributor = async (req, res) => {
  try {
    const {
      stripe_customer_id, stripe_subscription_id, payment_status, plan, amount_cents,
      first_name, last_name, email, phone, company, title_position,
      contributor_type, form_tier, linkedin_url, website_url,
      hero_quote, bio, years_in_industry, revenue_value, geographic_reach,
      custom_stat, credentials, expertise_topics, recognition,
      company_description, notes, videos, testimonials, source
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

      return res.status(200).json({ success: true, contributor: result.rows[0], updated: true });
    }

    // Insert new record
    const result = await query(`
      INSERT INTO expert_contributors (
        stripe_customer_id, stripe_subscription_id, payment_status, plan, amount_cents,
        first_name, last_name, email, phone, company, title_position,
        contributor_type, form_tier, linkedin_url, website_url,
        hero_quote, bio, years_in_industry, revenue_value, geographic_reach,
        custom_stat, credentials, expertise_topics, recognition,
        company_description, notes, videos, testimonials, source
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
        $21, $22, $23, $24, $25, $26, $27, $28, $29
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
      source || 'presentation_page'
    ]);

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
