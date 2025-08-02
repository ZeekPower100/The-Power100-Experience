const { query, transaction } = require('../config/database');
const { AppError } = require('../middleware/errorHandler');
const { generateVerificationCode, sendSMSVerification } = require('../services/smsService');
const { matchContractorWithPartners } = require('../services/matchingService');
const { sendPartnerIntroEmail } = require('../services/emailService');

// Start verification process
const startVerification = async (req, res, next) => {
  const { name, email, phone, company_name, company_website } = req.body;

  // Check if contractor already exists
  const existingResult = await query(
    'SELECT id, verification_status FROM contractors WHERE email = $1 OR phone = $2',
    [email, phone]
  );

  if (existingResult.rows.length > 0) {
    const existing = existingResult.rows[0];
    if (existing.verification_status === 'verified') {
      return res.status(400).json({
        error: 'An account with this email or phone already exists'
      });
    }
  }

  // Generate verification code
  const verificationCode = generateVerificationCode();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  // Create or update contractor
  const result = await query(`
    INSERT INTO contractors (name, email, phone, company_name, company_website, verification_code, verification_expires_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    ON CONFLICT (email) DO UPDATE SET
      name = EXCLUDED.name,
      phone = EXCLUDED.phone,
      company_name = EXCLUDED.company_name,
      company_website = EXCLUDED.company_website,
      verification_code = EXCLUDED.verification_code,
      verification_expires_at = EXCLUDED.verification_expires_at,
      updated_at = CURRENT_TIMESTAMP
    RETURNING id, name, email, phone, company_name
  `, [name, email, phone, company_name, company_website, verificationCode, expiresAt]);

  const contractor = result.rows[0];

  // Send SMS verification
  try {
    await sendSMSVerification(phone, verificationCode);
  } catch (error) {
    console.error('SMS sending failed:', error);
    // Continue even if SMS fails - in development
  }

  res.status(200).json({
    success: true,
    message: 'Verification code sent',
    contractor: {
      id: contractor.id,
      name: contractor.name,
      email: contractor.email,
      phone: contractor.phone,
      company_name: contractor.company_name
    }
  });
};

// Verify code
const verifyCode = async (req, res, next) => {
  const { contractor_id, code } = req.body;

  const result = await query(
    'SELECT * FROM contractors WHERE id = $1',
    [contractor_id]
  );

  if (result.rows.length === 0) {
    return next(new AppError('Contractor not found', 404));
  }

  const contractor = result.rows[0];

  // Check if code is expired
  if (new Date() > new Date(contractor.verification_expires_at)) {
    return res.status(400).json({
      error: 'Verification code has expired'
    });
  }

  // Check if code matches
  if (contractor.verification_code !== code) {
    return res.status(400).json({
      error: 'Invalid verification code'
    });
  }

  // Update contractor status
  await query(
    `UPDATE contractors 
     SET verification_status = 'verified', 
         current_stage = 'focus_selection',
         opted_in_coaching = true,
         verification_code = NULL,
         verification_expires_at = NULL
     WHERE id = $1`,
    [contractor_id]
  );

  res.status(200).json({
    success: true,
    message: 'Phone number verified successfully'
  });
};

// Update contractor profile
const updateProfile = async (req, res, next) => {
  const { id } = req.params;
  const updates = req.body;

  // Build dynamic update query
  const allowedFields = [
    'service_area', 'services_offered', 'focus_areas', 'primary_focus_area',
    'annual_revenue', 'team_size', 'increased_tools', 'increased_people',
    'increased_activity', 'current_stage'
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
    `UPDATE contractors 
     SET ${setClause.join(', ')}, updated_at = CURRENT_TIMESTAMP 
     WHERE id = $${paramCount}
     RETURNING *`,
    values
  );

  if (result.rows.length === 0) {
    return next(new AppError('Contractor not found', 404));
  }

  res.status(200).json({
    success: true,
    contractor: result.rows[0]
  });
};

// Get contractor matches
const getMatches = async (req, res, next) => {
  const { id } = req.params;

  // Get contractor data
  const contractorResult = await query(
    'SELECT * FROM contractors WHERE id = $1',
    [id]
  );

  if (contractorResult.rows.length === 0) {
    return next(new AppError('Contractor not found', 404));
  }

  const contractor = contractorResult.rows[0];

  // Find and save matches
  const matches = await matchContractorWithPartners(contractor);

  res.status(200).json({
    success: true,
    matches
  });
};

// Complete contractor flow
const completeFlow = async (req, res, next) => {
  const { id } = req.params;
  const { selected_partner_id } = req.body;

  await transaction(async (client) => {
    // Update contractor status
    await client.query(
      `UPDATE contractors 
       SET current_stage = 'completed', 
           completed_at = CURRENT_TIMESTAMP 
       WHERE id = $1`,
      [id]
    );

    // Create demo booking if partner selected
    if (selected_partner_id) {
      const scheduledDate = new Date();
      scheduledDate.setDate(scheduledDate.getDate() + 2); // Schedule 2 days out

      await client.query(
        `INSERT INTO demo_bookings (contractor_id, partner_id, scheduled_date)
         VALUES ($1, $2, $3)`,
        [id, selected_partner_id, scheduledDate]
      );

      // Send introduction email
      const contractorResult = await client.query(
        'SELECT * FROM contractors WHERE id = $1',
        [id]
      );
      const partnerResult = await client.query(
        'SELECT * FROM strategic_partners WHERE id = $1',
        [selected_partner_id]
      );

      if (contractorResult.rows.length > 0 && partnerResult.rows.length > 0) {
        try {
          await sendPartnerIntroEmail(
            contractorResult.rows[0],
            partnerResult.rows[0]
          );
        } catch (error) {
          console.error('Email sending failed:', error);
        }
      }
    }
  });

  res.status(200).json({
    success: true,
    message: 'Contractor flow completed successfully'
  });
};

// Get all contractors (admin)
const getAllContractors = async (req, res, next) => {
  const { stage, limit = 50, offset = 0 } = req.query;

  let queryText = `
    SELECT c.*, 
           COUNT(DISTINCT b.id) as booking_count,
           COUNT(DISTINCT m.id) as match_count
    FROM contractors c
    LEFT JOIN demo_bookings b ON c.id = b.contractor_id
    LEFT JOIN contractor_partner_matches m ON c.id = m.contractor_id
  `;

  const conditions = [];
  const values = [];

  if (stage) {
    conditions.push(`c.current_stage = $${values.length + 1}`);
    values.push(stage);
  }

  if (conditions.length > 0) {
    queryText += ' WHERE ' + conditions.join(' AND ');
  }

  queryText += ' GROUP BY c.id ORDER BY c.created_at DESC LIMIT $' + (values.length + 1) + ' OFFSET $' + (values.length + 2);
  values.push(limit, offset);

  const result = await query(queryText, values);

  res.status(200).json({
    success: true,
    count: result.rows.length,
    contractors: result.rows
  });
};

// Get single contractor (admin)
const getContractor = async (req, res, next) => {
  const { id } = req.params;

  const result = await query(`
    SELECT c.*,
           json_agg(DISTINCT jsonb_build_object(
             'id', p.id,
             'company_name', p.company_name,
             'match_score', m.match_score,
             'is_primary', m.is_primary_match
           )) FILTER (WHERE p.id IS NOT NULL) as matches,
           json_agg(DISTINCT jsonb_build_object(
             'id', b.id,
             'partner_name', sp.company_name,
             'scheduled_date', b.scheduled_date,
             'status', b.status
           )) FILTER (WHERE b.id IS NOT NULL) as bookings
    FROM contractors c
    LEFT JOIN contractor_partner_matches m ON c.id = m.contractor_id
    LEFT JOIN strategic_partners p ON m.partner_id = p.id
    LEFT JOIN demo_bookings b ON c.id = b.contractor_id
    LEFT JOIN strategic_partners sp ON b.partner_id = sp.id
    WHERE c.id = $1
    GROUP BY c.id
  `, [id]);

  if (result.rows.length === 0) {
    return next(new AppError('Contractor not found', 404));
  }

  res.status(200).json({
    success: true,
    contractor: result.rows[0]
  });
};

// Delete contractor (admin)
const deleteContractor = async (req, res, next) => {
  const { id } = req.params;

  const result = await query(
    'DELETE FROM contractors WHERE id = $1 RETURNING id',
    [id]
  );

  if (result.rows.length === 0) {
    return next(new AppError('Contractor not found', 404));
  }

  res.status(200).json({
    success: true,
    message: 'Contractor deleted successfully'
  });
};

// Get contractor statistics (admin)
const getStats = async (req, res, next) => {
  const stats = await query(`
    SELECT 
      COUNT(*) as total_contractors,
      COUNT(*) FILTER (WHERE current_stage = 'completed') as completed,
      COUNT(*) FILTER (WHERE current_stage = 'verification') as in_verification,
      COUNT(*) FILTER (WHERE current_stage = 'focus_selection') as in_focus_selection,
      COUNT(*) FILTER (WHERE current_stage = 'profiling') as in_profiling,
      COUNT(*) FILTER (WHERE current_stage = 'matching') as in_matching,
      COUNT(*) FILTER (WHERE created_at > CURRENT_DATE - INTERVAL '7 days') as new_this_week,
      COUNT(*) FILTER (WHERE created_at > CURRENT_DATE - INTERVAL '30 days') as new_this_month,
      AVG(CASE WHEN completed_at IS NOT NULL 
          THEN EXTRACT(EPOCH FROM (completed_at - created_at)) / 3600 
          ELSE NULL END) as avg_completion_hours
    FROM contractors
  `);

  res.status(200).json({
    success: true,
    stats: stats.rows[0]
  });
};

module.exports = {
  startVerification,
  verifyCode,
  updateProfile,
  getMatches,
  completeFlow,
  getAllContractors,
  getContractor,
  deleteContractor,
  getStats
};