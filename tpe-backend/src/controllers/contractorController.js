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
    'SELECT id, verification_status FROM contractors WHERE email = ? OR phone = ?',
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

  // Create or update contractor (SQLite doesn't support ON CONFLICT with complex updates)
  // Try to update first, then insert if no rows affected
  const updateResult = await query(`
    UPDATE contractors SET 
      name = ?, phone = ?, company_name = ?, company_website = ?, 
      verification_code = ?, verification_expires_at = ?, updated_at = CURRENT_TIMESTAMP
    WHERE email = ?
  `, [name, phone, company_name, company_website, verificationCode, expiresAt, email]);
  
  let contractor;
  if (updateResult.rowCount === 0) {
    // Insert new contractor
    const insertResult = await query(`
      INSERT INTO contractors (name, email, phone, company_name, company_website, verification_code, verification_expires_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [name, email, phone, company_name, company_website, verificationCode, expiresAt]);
    
    // Get the inserted contractor
    const selectResult = await query('SELECT id, name, email, phone, company_name FROM contractors WHERE email = ?', [email]);
    contractor = selectResult.rows[0];
  } else {
    // Get the updated contractor
    const selectResult = await query('SELECT id, name, email, phone, company_name FROM contractors WHERE email = ?', [email]);
    contractor = selectResult.rows[0];
  }

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
    'SELECT * FROM contractors WHERE id = ?',
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

  // Check if code matches (allow 123456 in development)
  const isDevelopmentCode = process.env.NODE_ENV === 'development' && code === '123456';
  
  if (!isDevelopmentCode && contractor.verification_code !== code) {
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
     WHERE id = ?`,
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
      setClause.push(`${key} = ?`);
      
      // Handle JSON fields - stringify arrays and objects
      let value = updates[key];
      if (key === 'focus_areas' || key === 'services_offered') {
        if (Array.isArray(value) || typeof value === 'object') {
          value = JSON.stringify(value);
        }
      }
      
      values.push(value);
      paramCount++;
    }
  });

  if (setClause.length === 0) {
    return res.status(400).json({ error: 'No valid fields to update' });
  }

  values.push(id);

  console.log('🔧 Update query:', `UPDATE contractors SET ${setClause.join(', ')}, updated_at = datetime('now') WHERE id = ?`);
  console.log('🔧 Update values:', values);

  const updateResult = await query(
    `UPDATE contractors 
     SET ${setClause.join(', ')}, updated_at = datetime('now') 
     WHERE id = ?`,
    values
  );
  
  console.log('🔧 Update result:', updateResult);

  // Get the updated contractor
  const result = await query('SELECT * FROM contractors WHERE id = ?', [id]);
  
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
    'SELECT * FROM contractors WHERE id = ?',
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
       WHERE id = ?`,
      [id]
    );

    // Create demo booking if partner selected
    if (selected_partner_id) {
      const scheduledDate = new Date();
      scheduledDate.setDate(scheduledDate.getDate() + 2); // Schedule 2 days out

      await client.query(
        `INSERT INTO demo_bookings (contractor_id, partner_id, scheduled_date)
         VALUES (?, ?, ?)`,
        [id, selected_partner_id, scheduledDate]
      );

      // Send introduction email
      const contractorResult = await client.query(
        'SELECT * FROM contractors WHERE id = ?',
        [id]
      );
      const partnerResult = await client.query(
        'SELECT * FROM strategic_partners WHERE id = ?',
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

  console.log('🔍 getAllContractors called with params:', { stage, limit, offset });

  let queryText = `SELECT * FROM contractors`;
  const conditions = [];
  const values = [];

  if (stage) {
    conditions.push(`current_stage = ?`);
    values.push(stage);
  }

  if (conditions.length > 0) {
    queryText += ' WHERE ' + conditions.join(' AND ');
  }

  queryText += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
  values.push(limit, offset);

  console.log('🔍 Final query:', queryText);
  console.log('🔍 Query values:', values);

  const result = await query(queryText, values);
  
  console.log('🔍 Query result:', { rowCount: result.rows?.length || result.length, firstRow: result.rows?.[0] || result[0] });

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
    WHERE c.id = ?
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
    'DELETE FROM contractors WHERE id = ? RETURNING id',
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

// Advanced search for contractors (admin)
const searchContractors = async (req, res, next) => {
  const {
    query: searchQuery = '',
    stage,
    focusAreas = [],
    revenueRange = [],
    verificationStatus,
    teamSizeMin,
    teamSizeMax,
    readinessIndicators = [],
    dateFrom,
    dateTo,
    limit = 50,
    offset = 0,
    sortBy = 'created_at',
    sortOrder = 'DESC'
  } = req.body;

  console.log('🔍 Advanced contractor search:', { searchQuery, stage, focusAreas, revenueRange });

  // Build dynamic WHERE conditions
  const conditions = [];
  const values = [];
  let paramIndex = 1;

  // Text search across multiple fields
  if (searchQuery) {
    conditions.push(`(
      name LIKE ? OR 
      email LIKE ? OR 
      company_name LIKE ? OR 
      service_area LIKE ?
    )`);
    const searchTerm = `%${searchQuery}%`;
    values.push(searchTerm, searchTerm, searchTerm, searchTerm);
    paramIndex += 4;
  }

  // Stage filter
  if (stage) {
    conditions.push(`current_stage = ?`);
    values.push(stage);
    paramIndex++;
  }

  // Focus areas filter (JSON field)
  if (focusAreas.length > 0) {
    const focusConditions = focusAreas.map(() => `focus_areas LIKE ?`);
    conditions.push(`(${focusConditions.join(' OR ')}) AND focus_areas != '[object Object]'`);
    focusAreas.forEach(area => {
      values.push(`%"${area}"%`);
      paramIndex++;
    });
  }

  // Revenue range filter
  if (revenueRange.length > 0) {
    const revenueConditions = revenueRange.map(() => `annual_revenue = ?`);
    conditions.push(`(${revenueConditions.join(' OR ')})`);
    values.push(...revenueRange);
    paramIndex += revenueRange.length;
  }

  // Verification status filter
  if (verificationStatus) {
    conditions.push(`verification_status = ?`);
    values.push(verificationStatus);
    paramIndex++;
  }

  // Team size range
  if (teamSizeMin !== undefined) {
    conditions.push(`team_size >= ?`);
    values.push(teamSizeMin);
    paramIndex++;
  }
  if (teamSizeMax !== undefined) {
    conditions.push(`team_size <= ?`);
    values.push(teamSizeMax);
    paramIndex++;
  }

  // Readiness indicators
  if (readinessIndicators.length > 0) {
    const readinessConditions = [];
    if (readinessIndicators.includes('increased_tools')) {
      readinessConditions.push('increased_tools = 1');
    }
    if (readinessIndicators.includes('increased_people')) {
      readinessConditions.push('increased_people = 1');
    }
    if (readinessIndicators.includes('increased_activity')) {
      readinessConditions.push('increased_activity = 1');
    }
    if (readinessConditions.length > 0) {
      conditions.push(`(${readinessConditions.join(' AND ')})`);
    }
  }

  // Date range filter
  if (dateFrom) {
    conditions.push(`created_at >= ?`);
    values.push(dateFrom);
    paramIndex++;
  }
  if (dateTo) {
    conditions.push(`created_at <= ?`);
    values.push(dateTo);
    paramIndex++;
  }

  // Build final query
  let queryText = `SELECT * FROM contractors`;
  if (conditions.length > 0) {
    queryText += ` WHERE ${conditions.join(' AND ')}`;
  }

  // Add sorting
  const allowedSortFields = ['created_at', 'updated_at', 'name', 'company_name', 'current_stage', 'team_size'];
  const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'created_at';
  const order = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
  queryText += ` ORDER BY ${sortField} ${order}`;

  // Add pagination
  queryText += ` LIMIT ? OFFSET ?`;
  values.push(limit, offset);

  // Get total count for pagination
  let countQuery = `SELECT COUNT(*) as total FROM contractors`;
  if (conditions.length > 0) {
    countQuery += ` WHERE ${conditions.join(' AND ')}`;
  }
  const countValues = values.slice(0, -2); // Remove limit and offset for count

  console.log('🔍 Search query:', queryText);
  console.log('🔍 Search values:', values);

  const [results, countResult] = await Promise.all([
    query(queryText, values),
    query(countQuery, countValues)
  ]);

  // Parse JSON fields for each contractor
  const parsedContractors = results.rows.map(contractor => ({
    ...contractor,
    focus_areas: typeof contractor.focus_areas === 'string' && contractor.focus_areas !== '[object Object]'
      ? JSON.parse(contractor.focus_areas || '[]')
      : Array.isArray(contractor.focus_areas) ? contractor.focus_areas : [],
    services_offered: typeof contractor.services_offered === 'string' && contractor.services_offered !== '[object Object]'
      ? JSON.parse(contractor.services_offered || '[]')
      : Array.isArray(contractor.services_offered) ? contractor.services_offered : []
  }));

  const total = countResult.rows[0].total;
  const hasMore = offset + limit < total;

  res.status(200).json({
    success: true,
    contractors: parsedContractors,
    pagination: {
      total,
      limit,
      offset,
      hasMore,
      totalPages: Math.ceil(total / limit),
      currentPage: Math.floor(offset / limit) + 1
    }
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
  getStats,
  searchContractors
};