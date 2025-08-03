const { query } = require('../config/database');
const { AppError } = require('../middleware/errorHandler');

// Get all active partners (public)
const getActivePartners = async (req, res, next) => {
  const result = await query(`
    SELECT id, company_name, description, logo_url, website, 
           focus_areas_served, target_revenue_range, power_confidence_score,
           key_differentiators, pricing_model
    FROM strategic_partners 
    WHERE is_active = true 
    ORDER BY power_confidence_score DESC
  `);

  res.status(200).json({
    success: true,
    count: result.rows.length,
    partners: result.rows
  });
};

// Get single partner (public)
const getPartner = async (req, res, next) => {
  const { id } = req.params;

  const result = await query(`
    SELECT p.*,
           COUNT(DISTINCT b.id) as total_bookings,
           COUNT(DISTINCT b.id) FILTER (WHERE b.status = 'completed') as completed_bookings,
           COUNT(DISTINCT m.contractor_id) as total_matches
    FROM strategic_partners p
    LEFT JOIN demo_bookings b ON p.id = b.partner_id
    LEFT JOIN contractor_partner_matches m ON p.id = m.partner_id
    WHERE p.id = ?
    GROUP BY p.id
  `, [id]);

  if (result.rows.length === 0) {
    return next(new AppError('Partner not found', 404));
  }

  res.status(200).json({
    success: true,
    partner: result.rows[0]
  });
};

// Get all partners (admin)
const getAllPartners = async (req, res, next) => {
  const { active, limit = 50, offset = 0 } = req.query;

  try {
    let queryText = 'SELECT * FROM strategic_partners';
    const values = [];

    if (active !== undefined) {
      queryText += ' WHERE is_active = ?';
      values.push(active === 'true' ? 1 : 0);
    }

    queryText += ' ORDER BY power_confidence_score DESC';
    
    if (limit) {
      queryText += ' LIMIT ?';
      values.push(parseInt(limit));
    }
    
    if (offset) {
      queryText += ' OFFSET ?';
      values.push(parseInt(offset));
    }

    const result = await query(queryText, values);

    res.status(200).json({
      success: true,
      count: result.rows.length,
      partners: result.rows
    });
  } catch (error) {
    console.error('getAllPartners error:', error);
    return next(error);
  }
};

// Create partner (admin)
const createPartner = async (req, res, next) => {
  const {
    company_name, description, logo_url, website, contact_email,
    contact_phone, power100_subdomain, focus_areas_served, target_revenue_range,
    geographic_regions, power_confidence_score, key_differentiators, 
    pricing_model, onboarding_process, client_testimonials, is_active,
    last_quarterly_report, onboarding_url, demo_booking_url
  } = req.body;

  const result = await query(`
    INSERT INTO strategic_partners (
      company_name, description, logo_url, website, contact_email,
      contact_phone, power100_subdomain, focus_areas_served, target_revenue_range,
      geographic_regions, power_confidence_score, key_differentiators, 
      pricing_model, onboarding_process, client_testimonials, is_active,
      last_quarterly_report, onboarding_url, demo_booking_url
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    RETURNING *
  `, [
    company_name, 
    description, 
    logo_url, 
    website, 
    contact_email,
    contact_phone,
    power100_subdomain,
    JSON.stringify(focus_areas_served || []),
    JSON.stringify(target_revenue_range || []),
    JSON.stringify(geographic_regions || []),
    power_confidence_score || 0,
    JSON.stringify(key_differentiators || []),
    pricing_model,
    onboarding_process,
    JSON.stringify(client_testimonials || []),
    is_active !== undefined ? is_active : true,
    last_quarterly_report,
    onboarding_url,
    demo_booking_url
  ]);

  res.status(201).json({
    success: true,
    partner: result.rows[0]
  });
};

// Update partner (admin)
const updatePartner = async (req, res, next) => {
  const { id } = req.params;
  const updates = req.body;

  // Build dynamic update query
  const allowedFields = [
    'company_name', 'description', 'logo_url', 'website', 'contact_email',
    'contact_phone', 'focus_areas_served', 'target_revenue_range',
    'power_confidence_score', 'key_differentiators', 'pricing_model',
    'onboarding_url', 'demo_booking_url', 'is_active'
  ];

  const setClause = [];
  const values = [];
  let paramCount = 1;

  Object.keys(updates).forEach(key => {
    if (allowedFields.includes(key)) {
      setClause.push(`${key} = $${paramCount}`);
      values.push(updates[key]);
      paramCount++;
    }
  });

  if (setClause.length === 0) {
    return res.status(400).json({ error: 'No valid fields to update' });
  }

  values.push(id);

  const result = await query(
    `UPDATE strategic_partners 
     SET ${setClause.join(', ')}, updated_at = CURRENT_TIMESTAMP 
     WHERE id = $${paramCount}
     RETURNING *`,
    values
  );

  if (result.rows.length === 0) {
    return next(new AppError('Partner not found', 404));
  }

  res.status(200).json({
    success: true,
    partner: result.rows[0]
  });
};

// Delete partner (admin)
const deletePartner = async (req, res, next) => {
  const { id } = req.params;

  // First check if partner exists
  const existingPartner = await query('SELECT id FROM strategic_partners WHERE id = ?', [id]);
  if (existingPartner.rows.length === 0) {
    return next(new AppError('Partner not found', 404));
  }

  // Delete the partner
  await query('DELETE FROM strategic_partners WHERE id = ?', [id]);

  res.status(200).json({
    success: true,
    message: 'Partner deleted successfully'
  });
};

// Toggle partner status (admin)
const togglePartnerStatus = async (req, res, next) => {
  const { id } = req.params;

  const result = await query(`
    UPDATE strategic_partners 
    SET is_active = NOT is_active, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
    RETURNING id, is_active
  `, [id]);

  if (result.rows.length === 0) {
    return next(new AppError('Partner not found', 404));
  }

  res.status(200).json({
    success: true,
    partner: result.rows[0]
  });
};

// Get partner statistics (admin)
const getPartnerStats = async (req, res, next) => {
  const stats = await query(`
    SELECT 
      COUNT(*) as total_partners,
      COUNT(*) FILTER (WHERE is_active = true) as active_partners,
      COUNT(*) FILTER (WHERE is_active = false) as inactive_partners,
      AVG(power_confidence_score) as avg_confidence_score,
      COUNT(DISTINCT UNNEST(focus_areas_served)) as unique_focus_areas,
      (
        SELECT json_agg(json_build_object(
          'partner_name', p.company_name,
          'booking_count', COUNT(b.id)
        ) ORDER BY COUNT(b.id) DESC)
        FROM strategic_partners p
        LEFT JOIN demo_bookings b ON p.id = b.partner_id
        GROUP BY p.id
        LIMIT 5
      ) as top_partners_by_bookings
    FROM strategic_partners
  `);

  res.status(200).json({
    success: true,
    stats: stats.rows[0]
  });
};

module.exports = {
  getActivePartners,
  getPartner,
  getAllPartners,
  createPartner,
  updatePartner,
  deletePartner,
  togglePartnerStatus,
  getPartnerStats
};