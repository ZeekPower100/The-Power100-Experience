const { query } = require('../config/database');
const { AppError } = require('../middleware/errorHandler');

// Get all active partners (public)
const getActivePartners = async (req, res, next) => {
  const result = await query(`
    SELECT id, company_name, description, logo_url, website, 
           focus_areas_served, target_revenue_range, powerconfidence_score,
           key_differentiators, pricing_model
    FROM partners 
    WHERE is_active = true 
    ORDER BY powerconfidence_score DESC
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

  try {
    // Get basic partner info
    const partnerResult = await query(`
      SELECT * FROM partners WHERE id = ?
    `, [id]);

    if (partnerResult.rows.length === 0) {
      return next(new AppError('Partner not found', 404));
    }

    const partner = partnerResult.rows[0];

    // Get booking stats
    const bookingStats = await query(`
      SELECT 
        COUNT(*) as total_bookings,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_bookings
      FROM demo_bookings WHERE partner_id = ?
    `, [id]);

    // Get match stats
    const matchStats = await query(`
      SELECT COUNT(DISTINCT contractor_id) as total_matches
      FROM contractor_partner_matches WHERE partner_id = ?
    `, [id]);

    // Combine stats
    partner.total_bookings = bookingStats.rows[0]?.total_bookings || 0;
    partner.completed_bookings = bookingStats.rows[0]?.completed_bookings || 0;
    partner.total_matches = matchStats.rows[0]?.total_matches || 0;

    res.status(200).json({
      success: true,
      partner: partner
    });
  } catch (error) {
    return next(error);
  }
};

// Get all partners (admin)
const getAllPartners = async (req, res, next) => {
  const { active, limit = 50, offset = 0 } = req.query;

  try {
    let queryText = 'SELECT * FROM partners';
    const values = [];

    if (active !== undefined) {
      queryText += ' WHERE is_active = ?';
      values.push(active === 'true' ? 1 : 0);
    }

    queryText += ' ORDER BY powerconfidence_score DESC';
    
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

// Create partner (admin) - Updated with comprehensive onboarding fields
const createPartner = async (req, res, next) => {
  console.log('🔍 DEBUG - createPartner received data:', {
    body_keys: Object.keys(req.body),
    company_name: req.body.company_name,
    established_year: req.body.established_year,
    ceo_contact_name: req.body.ceo_contact_name,
    target_revenue_audience: req.body.target_revenue_audience,
    tech_stack_crm: req.body.tech_stack_crm,
    full_body: req.body
  });

  const {
    // Basic Info
    company_name, description, logo_url, website, contact_email,
    contact_phone, power100_subdomain, focus_areas_served, target_revenue_range,
    geographic_regions, powerconfidence_score, key_differentiators, 
    pricing_model, onboarding_process, client_testimonials, is_active,
    last_quarterly_report, onboarding_url, demo_booking_url,
    
    // Comprehensive Onboarding Fields
    // Step 1: Company Information
    established_year, employee_count, ownership_type, company_description,
    
    // Step 2: Contact Information (5 contact types)
    ceo_contact_name, ceo_contact_email, ceo_contact_phone, ceo_contact_title,
    cx_contact_name, cx_contact_email, cx_contact_phone, cx_contact_title,
    sales_contact_name, sales_contact_email, sales_contact_phone, sales_contact_title,
    onboarding_contact_name, onboarding_contact_email, onboarding_contact_phone, onboarding_contact_title,
    marketing_contact_name, marketing_contact_email, marketing_contact_phone, marketing_contact_title,
    
    // Step 3: Target Audience
    target_revenue_audience, service_areas, service_areas_other,
    
    // Step 4: Competitive Analysis
    service_category, value_proposition, why_clients_choose_you, why_clients_choose_competitors,
    
    // Step 5: Business Focus
    focus_areas_12_months,
    
    // Step 6: Technology Stack
    tech_stack_crm, tech_stack_project_management, tech_stack_communication,
    tech_stack_analytics, tech_stack_marketing, tech_stack_financial,
    
    // Step 7: Marketing & Partnership
    sponsored_events, podcast_appearances, books_read_recommended, best_working_partnerships,
    
    // Step 8: Client Demos & References
    client_demos, client_references
  } = req.body;

  const result = await query(`
    INSERT INTO partners (
      -- Basic fields
      company_name, description, logo_url, website, contact_email,
      contact_phone, power100_subdomain, focus_areas_served, target_revenue_range,
      geographic_regions, powerconfidence_score, key_differentiators, 
      pricing_model, onboarding_process, client_testimonials, is_active,
      last_quarterly_report, onboarding_url, demo_booking_url,
      
      -- Comprehensive onboarding fields
      established_year, employee_count, ownership_type, company_description,
      ceo_contact_name, ceo_contact_email, ceo_contact_phone, ceo_contact_title,
      cx_contact_name, cx_contact_email, cx_contact_phone, cx_contact_title,
      sales_contact_name, sales_contact_email, sales_contact_phone, sales_contact_title,
      onboarding_contact_name, onboarding_contact_email, onboarding_contact_phone, onboarding_contact_title,
      marketing_contact_name, marketing_contact_email, marketing_contact_phone, marketing_contact_title,
      target_revenue_audience, service_areas, service_areas_other,
      service_category, value_proposition, why_clients_choose_you, why_clients_choose_competitors,
      focus_areas_12_months,
      tech_stack_crm, tech_stack_project_management, tech_stack_communication,
      tech_stack_analytics, tech_stack_marketing, tech_stack_financial,
      sponsored_events, podcast_appearances, books_read_recommended, best_working_partnerships,
      client_demos, client_references
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    RETURNING *
  `, [
    // Basic values
    company_name, description, logo_url, website, contact_email, contact_phone,
    power100_subdomain, JSON.stringify(focus_areas_served || []), JSON.stringify(target_revenue_range || []),
    JSON.stringify(geographic_regions || []), powerconfidence_score || 0, JSON.stringify(key_differentiators || []),
    pricing_model, onboarding_process, JSON.stringify(client_testimonials || []), 
    is_active !== undefined ? is_active : true, last_quarterly_report, onboarding_url, demo_booking_url,
    
    // Comprehensive onboarding values
    established_year, employee_count, ownership_type, company_description,
    ceo_contact_name, ceo_contact_email, ceo_contact_phone, ceo_contact_title,
    cx_contact_name, cx_contact_email, cx_contact_phone, cx_contact_title,
    sales_contact_name, sales_contact_email, sales_contact_phone, sales_contact_title,
    onboarding_contact_name, onboarding_contact_email, onboarding_contact_phone, onboarding_contact_title,
    marketing_contact_name, marketing_contact_email, marketing_contact_phone, marketing_contact_title,
    JSON.stringify(target_revenue_audience || []), JSON.stringify(service_areas || []), service_areas_other,
    service_category, value_proposition, why_clients_choose_you, why_clients_choose_competitors,
    JSON.stringify(focus_areas_12_months || []),
    JSON.stringify(tech_stack_crm || []), JSON.stringify(tech_stack_project_management || []), JSON.stringify(tech_stack_communication || []),
    JSON.stringify(tech_stack_analytics || []), JSON.stringify(tech_stack_marketing || []), JSON.stringify(tech_stack_financial || []),
    JSON.stringify(sponsored_events || []), JSON.stringify(podcast_appearances || []), books_read_recommended, best_working_partnerships,
    JSON.stringify(client_demos || []), JSON.stringify(client_references || [])
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

  // Build dynamic update query - Include ALL database fields
  const allowedFields = [
    // Basic Information
    'company_name', 'description', 'logo_url', 'website', 'contact_email',
    'contact_phone', 'power100_subdomain',
    
    // Business Details
    'established_year', 'employee_count', 'ownership_type', 'company_description',
    
    // Service Information
    'focus_areas_served', 'target_revenue_range', 'geographic_regions',
    'service_areas', 'service_areas_other', 'service_category',
    'target_revenue_audience', 'focus_areas_12_months',
    
    // Value Proposition
    'value_proposition', 'why_clients_choose_you', 'why_clients_choose_competitors',
    'key_differentiators', 'pricing_model',
    
    // Performance Metrics
    'powerconfidence_score', 'previous_powerconfidence_score', 'score_trend',
    'industry_rank', 'category_rank',
    
    // Feedback & Reviews
    'last_feedback_update', 'total_feedback_responses', 'average_satisfaction',
    'feedback_trend', 'next_quarterly_review', 'avg_contractor_satisfaction',
    'total_contractor_engagements',
    
    // Contact Information
    'ceo_contact_name', 'ceo_contact_email', 'ceo_contact_phone', 'ceo_contact_title',
    'cx_contact_name', 'cx_contact_email', 'cx_contact_phone', 'cx_contact_title',
    'sales_contact_name', 'sales_contact_email', 'sales_contact_phone', 'sales_contact_title',
    'onboarding_contact_name', 'onboarding_contact_email', 'onboarding_contact_phone', 'onboarding_contact_title',
    'marketing_contact_name', 'marketing_contact_email', 'marketing_contact_phone', 'marketing_contact_title',
    
    // Technology Stack
    'tech_stack_crm', 'tech_stack_project_management', 'tech_stack_communication',
    'tech_stack_analytics', 'tech_stack_marketing', 'tech_stack_financial',
    
    // Marketing & Partnerships
    'sponsored_events', 'podcast_appearances', 'books_read_recommended',
    'best_working_partnerships',
    
    // Client Information
    'client_demos', 'client_references', 'client_testimonials',
    
    // Administrative
    'is_active', 'dashboard_access_enabled', 'last_dashboard_login',
    'onboarding_url', 'demo_booking_url', 'onboarding_process',
    'last_quarterly_report'
  ];

  const setClause = [];
  const values = [];

  // Process each field
  Object.keys(updates).forEach(key => {
    if (allowedFields.includes(key)) {
      setClause.push(`${key} = ?`);
      
      // Handle JSON fields - Arrays and objects need to be stringified
      const jsonFields = [
        'focus_areas_served', 'target_revenue_range', 'geographic_regions',
        'key_differentiators', 'service_areas', 'target_revenue_audience',
        'focus_areas_12_months', 'tech_stack_crm', 'tech_stack_project_management',
        'tech_stack_communication', 'tech_stack_analytics', 'tech_stack_marketing',
        'tech_stack_financial', 'sponsored_events', 'podcast_appearances',
        'client_demos', 'client_references', 'client_testimonials'
      ];
      
      if (jsonFields.includes(key)) {
        // Stringify arrays/objects for JSON storage
        values.push(typeof updates[key] === 'string' ? updates[key] : JSON.stringify(updates[key] || []));
      } else {
        values.push(updates[key]);
      }
    }
  });

  if (setClause.length === 0) {
    return res.status(400).json({ error: 'No valid fields to update' });
  }

  values.push(id);

  try {
    // Admin-created partners are automatically approved
    req.body.status = 'approved';
    req.body.is_active = true;
    
    const result = await query(
      `UPDATE partners 
       SET ${setClause.join(', ')}, updated_at = CURRENT_TIMESTAMP 
       WHERE id = ?
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
  } catch (error) {
    console.error('Update partner error:', error);
    return next(new AppError('Failed to update partner', 500));
  }
};

// Delete partner (admin)
const deletePartner = async (req, res, next) => {
  const { id } = req.params;

  // First check if partner exists
  const existingPartner = await query('SELECT id FROM partners WHERE id = ?', [id]);
  if (existingPartner.rows.length === 0) {
    return next(new AppError('Partner not found', 404));
  }

  // Delete the partner
  await query('DELETE FROM partners WHERE id = ?', [id]);

  res.status(200).json({
    success: true,
    message: 'Partner deleted successfully'
  });
};

// Toggle partner status (admin)
const togglePartnerStatus = async (req, res, next) => {
  const { id } = req.params;

  const result = await query(`
    UPDATE partners 
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
      AVG(powerconfidence_score) as avg_confidence_score,
      COUNT(DISTINCT UNNEST(focus_areas_served)) as unique_focus_areas,
      (
        SELECT json_agg(json_build_object(
          'partner_name', p.company_name,
          'booking_count', COUNT(b.id)
        ) ORDER BY COUNT(b.id) DESC)
        FROM partners p
        LEFT JOIN demo_bookings b ON p.id = b.partner_id
        GROUP BY p.id
        LIMIT 5
      ) as top_partners_by_bookings
    FROM partners
  `);

  res.status(200).json({
    success: true,
    stats: stats.rows[0]
  });
};

// Search partners with advanced filters
const searchPartners = async (req, res, next) => {
  const { 
    query: searchQuery = '', 
    focusAreas = [], 
    revenueRanges = [], 
    isActive, 
    confidenceScoreMin, 
    confidenceScoreMax, 
    dateFrom, 
    dateTo, 
    sortBy = 'created_at', 
    sortOrder = 'DESC', 
    limit = 20, 
    offset = 0 
  } = req.body;

  console.log('🔍 searchPartners called with:', req.body);

  try {
    let whereClause = '1=1';
    const values = [];
    let paramCount = 1;

    // Text search across multiple fields
    if (searchQuery && searchQuery.trim()) {
      whereClause += ` AND (
        company_name LIKE ? OR 
        description LIKE ? OR 
        contact_email LIKE ? OR 
        website LIKE ?
      )`;
      const searchPattern = `%${searchQuery.trim()}%`;
      values.push(searchPattern, searchPattern, searchPattern, searchPattern);
    }

    // Active status filter
    if (isActive !== undefined) {
      whereClause += ` AND is_active = ?`;
      values.push(isActive ? 1 : 0);
    }

    // Focus areas filter (JSON field)
    if (focusAreas && focusAreas.length > 0) {
      const focusConditions = focusAreas.map(() => `focus_areas_served LIKE ?`).join(' OR ');
      whereClause += ` AND (${focusConditions})`;
      focusAreas.forEach(area => {
        values.push(`%"${area}"%`);
      });
    }

    // Revenue ranges filter (JSON field)
    if (revenueRanges && revenueRanges.length > 0) {
      const revenueConditions = revenueRanges.map(() => `target_revenue_range LIKE ?`).join(' OR ');
      whereClause += ` AND (${revenueConditions})`;
      revenueRanges.forEach(range => {
        values.push(`%"${range}"%`);
      });
    }

    // PowerConfidence score range
    if (confidenceScoreMin !== undefined) {
      whereClause += ` AND powerconfidence_score >= ?`;
      values.push(confidenceScoreMin);
    }
    if (confidenceScoreMax !== undefined) {
      whereClause += ` AND powerconfidence_score <= ?`;
      values.push(confidenceScoreMax);
    }

    // Date range filter
    if (dateFrom) {
      whereClause += ` AND created_at >= ?`;
      values.push(dateFrom);
    }
    if (dateTo) {
      whereClause += ` AND created_at <= ?`;
      values.push(dateTo + ' 23:59:59'); // Include full day
    }

    // Validate sort parameters
    const allowedSortFields = ['created_at', 'updated_at', 'company_name', 'powerconfidence_score', 'is_active'];
    const validSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'created_at';
    const validSortOrder = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM partners WHERE ${whereClause}`;
    const countResult = await query(countQuery, values);
    const total = countResult.rows[0].total;

    // Use the simplest working query structure
    const partnersResult = await query(
      `SELECT * FROM partners ORDER BY created_at DESC LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}`,
      []
    );

    // Parse JSON fields safely
    const partners = partnersResult.rows.map(partner => ({
      ...partner,
      focus_areas_served: partner.focus_areas_served ? 
        (partner.focus_areas_served === '[object Object]' ? [] : 
         (typeof partner.focus_areas_served === 'string' ? 
          JSON.parse(partner.focus_areas_served || '[]') : partner.focus_areas_served)) : [],
      target_revenue_range: partner.target_revenue_range ? 
        (partner.target_revenue_range === '[object Object]' ? [] : 
         (typeof partner.target_revenue_range === 'string' ? 
          JSON.parse(partner.target_revenue_range || '[]') : partner.target_revenue_range)) : []
    }));

    // Calculate pagination info
    const totalPages = Math.ceil(total / limit);
    const currentPage = Math.floor(offset / limit) + 1;
    const hasMore = offset + limit < total;

    res.status(200).json({
      success: true,
      partners,
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
        focusAreas,
        revenueRanges,
        isActive,
        confidenceScoreMin,
        confidenceScoreMax,
        dateFrom,
        dateTo,
        sortBy: validSortBy,
        sortOrder: validSortOrder
      }
    });

  } catch (error) {
    console.error('Search partners error:', error);
    return next(error);
  }
};

module.exports = {
  getActivePartners,
  getPartner,
  getAllPartners,
  createPartner,
  updatePartner,
  deletePartner,
  togglePartnerStatus,
  getPartnerStats,
  searchPartners
};