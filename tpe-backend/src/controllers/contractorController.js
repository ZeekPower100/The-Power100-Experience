const { safeJsonParse, safeJsonStringify } = require('../utils/jsonHelpers');

const { query, transaction } = require('../config/database');
const { AppError } = require('../middleware/errorHandler');
const { generateVerificationCode, sendSMSVerification } = require('../services/smsService');
const { matchContractorWithPartners } = require('../services/matchingService');
const { getEnhancedMatches } = require('../services/enhancedMatchingService');
const { sendPartnerIntroEmail } = require('../services/emailService');
const contactTaggingService = require('../services/contactTaggingService');
const outcomeTrackingService = require('../services/outcomeTrackingService');

// Start verification process
const startVerification = async (req, res, next) => {
  const { name, email, phone, company_name, company_website } = req.body;

  // Check if contractor already exists
  const existingResult = await query(`SELECT id, verification_status FROM contractors WHERE email = $1 OR phone = $2`, [email, phone]);

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
  // Try to update first, then insert if no rows affected
  const updateResult = await query(`
    UPDATE contractors SET 
      name = $1, phone = $2, company_name = $3, company_website = $4, 
      verification_code = $5, verification_expires_at = $6, updated_at = CURRENT_TIMESTAMP
    WHERE email = $7
  `, [name, phone, company_name, company_website, verificationCode, expiresAt, email]);
  
  let contractor;
  if (updateResult.rowCount === 0) {
    // Insert new contractor
    const insertResult = await query(`
      INSERT INTO contractors (name, email, phone, company_name, company_website, verification_code, verification_expires_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [name, email, phone, company_name, company_website, verificationCode, expiresAt]);
    
    // Get the inserted contractor
    const selectResult = await query(`SELECT id, CONCAT(first_name, ' ', last_name) as name, email, phone, company_name FROM contractors WHERE email = $1`, [email]);
    contractor = selectResult.rows[0];

    // Auto-tag new contractor
    await contactTaggingService.tagContractorOnboarding(contractor.id, email, ['new_signup']);
  } else {
    // Get the updated contractor
    const selectResult = await query(`SELECT id, CONCAT(first_name, ' ', last_name) as name, email, phone, company_name FROM contractors WHERE email = $1`, [email]);
    contractor = selectResult.rows[0];
    
    // Auto-tag returning contractor
    await contactTaggingService.tagContractorOnboarding(contractor.id, email, ['returning_signup']);
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

  const result = await query(`SELECT * FROM contractors WHERE id = $1`, [contractor_id]);

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
  const isDevelopmentCode = code === '123456'; // Allow test code
  
  if (!isDevelopmentCode && contractor.verification_code !== code) {
    return res.status(400).json({
      error: 'Invalid verification code'
    });
  }

  // Update contractor status
  await query(`UPDATE contractors 
     SET verification_status = 'verified', 
         workflow_step = 'focus_selection',
         sms_opt_in = true, ai_coach_opt_in = true,
         verification_code = NULL,
         verification_expires_at = NULL
     WHERE id = $1`, [contractor_id]);

  res.status(200).json({
    success: true,
    message: 'Phone number verified successfully'
  });
};

// Update contractor profile
const updateProfile = async (req, res, next) => {
  const { id } = req.params;
  const updates = req.body;
  console.log("=== UPDATE PROFILE REQUEST ===");
  console.log("Contractor ID:", id);
  console.log("Updates received:", safeJsonStringify(updates));
  console.log("focus_areas type:", typeof updates.focus_areas);
  console.log("focus_areas value:", updates.focus_areas);

  // Build dynamic update query - Include ALL contractor database fields
  const allowedFields = [
    // Basic Information
    'name', 'email', 'phone', 'company_name', 'company_website',
    
    // Location & Services
    'service_area', 'job_title', 'services_offered',
    
    // Business Focus
    'focus_areas', 'primary_focus_area',
    
    // Business Profile
    'annual_revenue', 'revenue_tier', 'team_size', 'readiness_indicators',
    
    // Readiness Indicators
    'increased_tools', 'increased_people', 'increased_activity',
    
    // Technology Stack
    'tech_stack_sales', 'tech_stack_operations', 'tech_stack_marketing',
    'tech_stack_customer_experience', 'tech_stack_project_management', 
    'tech_stack_accounting_finance',
    
    // Tech Stack Other Fields
    'tech_stack_sales_other', 'tech_stack_operations_other', 'tech_stack_marketing_other',
    'tech_stack_customer_experience_other', 'tech_stack_project_management_other',
    'tech_stack_accounting_finance_other',
    
    // Contact Tagging
    'contact_type', 'onboarding_source', 'associated_partner_id', 'email_domain', 'tags',
    
    // Verification & Flow
    'sms_opt_in', 'verification_status', 'workflow_step',
    
    // PowerConfidence & Feedback
    'feedback_completion_status'
  ];

  const setClause = [];
  const values = [];

  Object.keys(updates).forEach(key => {
    if (allowedFields.includes(key)) {
      setClause.push(`${key} = $${setClause.length + 1}`);
      
      // JSON fields that need serialization
      const jsonFields = [
        'focus_areas', 'readiness_indicators', 'services_offered', 'tags',
        'tech_stack_sales', 'tech_stack_operations', 'tech_stack_marketing',
        'tech_stack_customer_experience', 'tech_stack_project_management',
        'tech_stack_accounting_finance'
      ];
      
      if (jsonFields.includes(key)) {
        console.log(`Processing JSON field ${key}:`, updates[key], "Type:", typeof updates[key]);
        // Stringify arrays/objects for JSON storage
        values.push(typeof updates[key] === 'string' ? updates[key] : safeJsonStringify(updates[key] || []));
      } else {
        values.push(updates[key]);
      }
    }
  });

  if (setClause.length === 0) {
    return res.status(400).json({ error: 'No valid fields to update' });
  }

  values.push(id);

  console.log('Update SQL:', `UPDATE contractors SET ${setClause.join(', ')} , updated_at = CURRENT_TIMESTAMP WHERE id = $${values.length}`);
  console.log('Values:', values, 'ID:', id);
  
  try {
    const result = await query(`UPDATE contractors 
       SET ${setClause.join(', ')}, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $${values.length}
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
  } catch (error) {
    console.error('Update contractor error:', error);
    return next(new AppError('Failed to update contractor', 500));
  }
};

// Get contractor matches
const getMatches = async (req, res, next) => {
  const { id } = req.params;
  const { focusAreaIndex } = req.query; // Optional parameter to specify which focus area to use

  // Get contractor data
  const contractorResult = await query(
    'SELECT * FROM contractors WHERE id = $1', [id]);

  if (contractorResult.rows.length === 0) {
    return next(new AppError('Contractor not found', 404));
  }

  const contractor = contractorResult.rows[0];

  // Use enhanced matching that includes podcasts and events
  // Pass the focus area index if provided
  const enhancedResults = await getEnhancedMatches(contractor, focusAreaIndex);

  res.status(200).json({
    success: true,
    ...enhancedResults, // Spreads matches, podcastMatch, and eventMatch
    focusAreaIndex: focusAreaIndex || 0 // Return which focus area index was used
  });
};

// Complete contractor flow
const completeFlow = async (req, res, next) => {
  const { id } = req.params;
  const { selected_partner_id } = req.body;
  const flowStartTime = Date.now();

  await transaction(async (client) => {
    // Update contractor status
    await client.query(`UPDATE contractors
       SET workflow_step = 'completed',
           completed_at = CURRENT_TIMESTAMP
       WHERE id = $1`, [id]);

    // Create demo booking if partner selected
    if (selected_partner_id) {
      const scheduledDate = new Date();
      scheduledDate.setDate(scheduledDate.getDate() + 2); // Schedule 2 days out

      await client.query(`INSERT INTO demo_bookings (contractor_id, partner_id, scheduled_date)
         VALUES ($1, $2, $3)`, [id, selected_partner_id, scheduledDate]);

      // Track demo booking for ML learning
      try {
        await outcomeTrackingService.trackDemoBooked(id, selected_partner_id, {
          date: scheduledDate.toISOString().split('T')[0],
          time: scheduledDate.toISOString().split('T')[1],
          type: 'initial_demo',
          source: 'contractor_flow'
        });
        console.log(`[OutcomeTracking] Demo booking tracked for contractor ${id}`);
      } catch (trackingError) {
        console.error('[OutcomeTracking] Failed to track demo booking:', trackingError.message);
        // Don't fail the flow - tracking is non-critical
      }

      // Send introduction email
      const contractorResult = await client.query(`SELECT * FROM contractors WHERE id = $1`, [id]);
      const partnerResult = await client.query(`SELECT * FROM strategic_partners WHERE id = $1`, [selected_partner_id]);

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

  // Track flow completion for ML learning (outside transaction for performance)
  try {
    const completionTimeMs = Date.now() - flowStartTime;
    await outcomeTrackingService.trackFlowCompletion(id, {
      completionTime: Math.round(completionTimeMs / 1000), // seconds
      stepsCompleted: 5, // All 5 steps: verification, focus, profiling, matching, completion
      abandonedSteps: [],
      deviceType: req.headers['user-agent']?.includes('Mobile') ? 'mobile' : 'desktop',
      browser: req.headers['user-agent'] || 'unknown',
      referrer: req.headers['referer'] || 'direct'
    });
    console.log(`[OutcomeTracking] Flow completion tracked for contractor ${id}`);
  } catch (trackingError) {
    console.error('[OutcomeTracking] Failed to track flow completion:', trackingError.message);
    // Don't fail the response - tracking is non-critical
  }

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
  let paramCount = 0;

  if (stage) {
    conditions.push(`workflow_step = $${++paramCount}`);
    values.push(stage);
  }

  if (conditions.length > 0) {
    queryText += ' WHERE ' + conditions.join(' AND ');
  }

  queryText += ` ORDER BY created_at DESC LIMIT $${++paramCount} OFFSET $${++paramCount}`;
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
  
  console.log('🔍 getContractor called with ID:', id, 'Type:', typeof id);

  try {
    // Get basic contractor info
    console.log('🔍 About to query for contractor with ID:', id);
    
    // Use the absolute simplest query that works
    const contractorResult = await query(`
      SELECT id, CONCAT(first_name, ' ', last_name) as name FROM contractors WHERE id = $1
    `, [id]);
    
    console.log('🔍 Simple query result:', contractorResult.rows.length, contractorResult.rows[0]);
    
    console.log('🔍 getContractor query result:', {
      rowCount: contractorResult.rows.length,
      id: id,
      firstRow: contractorResult.rows[0]?.id,
      rawResult: contractorResult
    });

    if (contractorResult.rows.length === 0) {
      console.log('🔍 getContractor - No contractor found with ID:', id);
      return next(new AppError('Contractor not found', 404));
    }

    const contractor = contractorResult.rows[0];

    // Get matches separately
    const matchesResult = await query(`
      SELECT p.id, p.company_name, m.match_score, m.is_primary_match
      FROM contractor_partner_matches m
      LEFT JOIN strategic_partners p ON m.partner_id = p.id
      WHERE m.contractor_id = $1
    `, [id]);

    // Get bookings separately
    const bookingsResult = await query(`
      SELECT b.id, sp.company_name as partner_name, b.scheduled_date, b.status
      FROM demo_bookings b
      LEFT JOIN strategic_partners sp ON b.partner_id = sp.id
      WHERE b.contractor_id = $1
    `, [id]);

    // Combine results
    contractor.matches = matchesResult.rows || [];
    contractor.bookings = bookingsResult.rows || [];

    res.status(200).json({
      success: true,
      contractor: contractor
    });
  } catch (error) {
    return next(error);
  }
};

// Delete contractor (admin)
const deleteContractor = async (req, res, next) => {
  const { id } = req.params;

  const result = await query(`DELETE FROM contractors WHERE id = $1 RETURNING id`, [id]);

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

// Search contractors with advanced filters
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
    contact_type,
    onboarding_source,
    tags = [],
    dateFrom, 
    dateTo, 
    sortBy = 'created_at', 
    sortOrder = 'DESC', 
    limit = 20, 
    offset = 0 
  } = req.body;

  console.log('🔍 searchContractors called with:', safeJsonStringify(req.body, null, 2));

  try {
    let whereClause = '1=1';
    const values = [];
    let paramCounter = 1;
    console.log('🔍 DEBUG - Starting search');

    // Text search across multiple fields
    if (searchQuery && searchQuery.trim()) {
      whereClause += ` AND (
        name ILIKE $${paramCounter} OR 
        email ILIKE $${paramCounter + 1} OR 
        company_name ILIKE $${paramCounter + 2} OR 
        phone ILIKE $${paramCounter + 3}
      )`;
      const searchPattern = `%${searchQuery.trim()}%`;
      values.push(searchPattern, searchPattern, searchPattern, searchPattern);
      paramCounter += 4;
    }

    // Stage filter
    if (stage) {
      whereClause += ` AND current_stage = $${paramCounter}`;
      values.push(stage);
      paramCounter++;
    }

    // Verification status filter
    if (verificationStatus) {
      whereClause += ` AND verification_status = $${paramCounter}`;
      values.push(verificationStatus);
      paramCounter++;
    }

    // Contact type filter (new)
    if (contact_type) {
      whereClause += ` AND contact_type = $${paramCounter}`;
      values.push(contact_type);
      paramCounter++;
    }

    // Onboarding source filter (new)
    if (onboarding_source) {
      whereClause += ` AND onboarding_source = $${paramCounter}`;
      values.push(onboarding_source);
      paramCounter++;
    }

    // Tags filter (new) - check if any of the provided tags exist in the JSON tags field
    if (tags && tags.length > 0) {
      const tagConditions = tags.map(() => {
        const condition = `tags::text ILIKE $${paramCounter}`;
        paramCounter++;
        return condition;
      }).join(' OR ');
      whereClause += ` AND (${tagConditions})`;
      tags.forEach(tag => {
        values.push(`%"${tag}"%`);
      });
    }

    // Focus areas filter (JSON field)
    if (focusAreas && focusAreas.length > 0) {
      console.log('🔍 Contractor focus areas filter:', focusAreas);
      const focusConditions = focusAreas.map(() => {
        const condition = `(focus_areas IS NOT NULL AND focus_areas::text ILIKE $${paramCounter})`;
        paramCounter++;
        return condition;
      }).join(' OR ');
      whereClause += ` AND (${focusConditions})`;
      focusAreas.forEach(area => {
        // Try simpler pattern matching
        values.push(`%${area}%`);
        console.log('🔍 Searching for contractor focus area:', area, 'with pattern:', `%${area}%`);
      });
    }

    // Revenue range filter
    if (revenueRange && revenueRange.length > 0) {
      const revenueConditions = revenueRange.map(() => {
        const condition = `annual_revenue = $${paramCounter}`;
        paramCounter++;
        return condition;
      }).join(' OR ');
      whereClause += ` AND (${revenueConditions})`;
      values.push(...revenueRange);
    }

    // Team size range
    if (teamSizeMin !== undefined) {
      whereClause += ` AND team_size >= $${paramCounter}`;
      values.push(teamSizeMin);
      paramCounter++;
    }
    if (teamSizeMax !== undefined) {
      whereClause += ` AND team_size <= $${paramCounter}`;
      values.push(teamSizeMax);
      paramCounter++;
    }

    // Readiness indicators (stored as text 'true'/'false')
    if (readinessIndicators && readinessIndicators.length > 0) {
      const readinessConditions = readinessIndicators.map(indicator => `${indicator} = 'true'`).join(' OR ');
      whereClause += ` AND (${readinessConditions})`;
    }

    // Date range filter
    if (dateFrom) {
      whereClause += ` AND created_at >= $${paramCounter}`;
      values.push(dateFrom);
      paramCounter++;
    }
    if (dateTo) {
      whereClause += ` AND created_at <= $${paramCounter}`;
      values.push(dateTo + ' 23:59:59'); // Include full day
      paramCounter++;
    }

    // Validate sort parameters
    const allowedSortFields = ['created_at', 'updated_at', 'name', 'company_name', 'current_stage', 'team_size', 'email'];
    const validSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'created_at';
    const validSortOrder = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM contractors WHERE ${whereClause}`;
    console.log('🔍 Count query:', countQuery);
    console.log('🔍 Count values:', values);
    const countResult = await query(countQuery, values);
    const total = countResult.rows[0].total;

    // Apply search filters and sorting
    const contractorsResult = await query(
      `SELECT * FROM contractors WHERE ${whereClause} ORDER BY ${validSortBy} ${validSortOrder} LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}`,
      values
    );

    // Parse JSON fields safely
    const contractors = contractorsResult.rows.map(contractor => ({
      ...contractor,
      focus_areas: contractor.focus_areas ? 
        (contractor.focus_areas === '[object Object]' ? [] : 
         (typeof contractor.focus_areas === 'string' ? 
          safeJsonParse(contractor.focus_areas || '[]') : contractor.focus_areas)) : [],
      services_offered: contractor.services_offered ? 
        (contractor.services_offered === '[object Object]' ? [] : 
         (typeof contractor.services_offered === 'string' ? 
          safeJsonParse(contractor.services_offered || '[]') : contractor.services_offered)) : [],
      tags: contractor.tags ? 
        (typeof contractor.tags === 'string' ? 
         safeJsonParse(contractor.tags || '[]') : contractor.tags) : []
    }));

    // Calculate pagination info
    const totalPages = Math.ceil(total / limit);
    const currentPage = Math.floor(offset / limit) + 1;
    const hasMore = offset + limit < total;

    res.status(200).json({
      success: true,
      contractors,
      pagination: {
        total,
        limit,
        offset,
        hasMore,
        totalPages,
        currentPage
      },
      searchParams: {
        query: searchQuery,
        stage,
        focusAreas,
        revenueRange,
        verificationStatus,
        teamSizeMin,
        teamSizeMax,
        readinessIndicators,
        contact_type,
        onboarding_source,
        tags,
        dateFrom,
        dateTo,
        sortBy: validSortBy,
        sortOrder: validSortOrder
      }
    });

  } catch (error) {
    console.error('Search contractors error:', error);
    return next(error);
  }
};

// Lookup contractor by phone (n8n webhook helper)
const lookupByPhone = async (req, res, next) => {
  const { phone } = req.query;

  if (!phone) {
    return res.status(400).json({
      success: false,
      error: 'Phone number is required'
    });
  }

  try {
    // Clean phone number for matching
    const cleanPhone = phone.replace(/[^0-9+]/g, '');

    // Look up contractor by phone
    const result = await query(`
      SELECT id, first_name, last_name, CONCAT(first_name, ' ', last_name) as name, email, phone, company_name
      FROM contractors
      WHERE REPLACE(REPLACE(REPLACE(phone, '-', ''), ' ', ''), '(', '') LIKE $1
      LIMIT 1
    `, [`%${cleanPhone.slice(-10)}%`]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Contractor not found'
      });
    }

    const contractor = result.rows[0];

    res.status(200).json({
      success: true,
      contractor_id: contractor.id,
      name: contractor.name,
      email: contractor.email,
      phone: contractor.phone,
      company_name: contractor.company_name
    });
  } catch (error) {
    console.error('Lookup by phone error:', error);
    return next(error);
  }
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
  searchContractors,
  lookupByPhone
};