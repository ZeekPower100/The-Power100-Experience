// DATABASE-CHECKED: strategic_partners, partner_analytics, partner_leads, contractor_partner_matches, feedback_surveys, feedback_responses, contractors columns verified October 24, 2025
// ================================================================
// VERIFIED FIELD NAMES:
// - power_confidence_score (NOT powerconfidence_score)
// - previous_powerconfidence_score
// - score_trend
// - industry_rank
// - average_satisfaction
// - total_contractor_engagements
// - match_score (NOT score)
// - match_reasons (NOT reasons)
// - is_primary_match (NOT is_primary)
// ================================================================

const { query } = require('../config/database');
const { safeJsonParse, safeJsonStringify } = require('../utils/jsonHelpers');

/**
 * Get partner's dashboard data with real database queries
 * NO MOCK DATA - All data from database
 */
const getPartnerDashboard = async (req, res) => {
  try {
    // partnerId comes from JWT token via partnerAuth middleware
    const partnerId = req.partnerUser.partnerId;

    console.log(`[Partner Portal] Fetching dashboard for partner ${partnerId}`);

    // Main partner data query
    const partnerQuery = `
      SELECT
        id,
        company_name,
        contact_email,
        power_confidence_score,
        previous_powerconfidence_score,
        score_trend,
        industry_rank,
        category_rank,
        average_satisfaction,
        total_feedback_responses,
        avg_contractor_satisfaction,
        total_contractor_engagements,
        completed_bookings,
        total_bookings,
        total_matches
      FROM strategic_partners
      WHERE id = $1 AND is_active = true
    `;

    const partnerResult = await query(partnerQuery, [partnerId]);

    if (partnerResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Partner not found or inactive'
      });
    }

    const partner = partnerResult.rows[0];

    // Active contractors count (contractors with activity in last 30 days)
    const activeContractorsQuery = `
      SELECT COUNT(DISTINCT cpm.contractor_id) as active_contractors
      FROM contractor_partner_matches cpm
      INNER JOIN contractors c ON c.id = cpm.contractor_id
      WHERE cpm.partner_id = $1
        AND cpm.is_primary_match = true
        AND c.last_activity_at > NOW() - INTERVAL '30 days'
    `;

    const activeResult = await query(activeContractorsQuery, [partnerId]);
    const activeContractors = activeResult.rows[0]?.active_contractors || 0;

    // Recent feedback count (last 90 days)
    const feedbackQuery = `
      SELECT COUNT(*) as recent_feedback_count
      FROM feedback_responses fr
      INNER JOIN feedback_surveys fs ON fs.id = fr.survey_id
      WHERE fs.partner_id = $1
        AND fr.created_at > NOW() - INTERVAL '90 days'
    `;

    const feedbackResult = await query(feedbackQuery, [partnerId]);
    const recentFeedbackCount = feedbackResult.rows[0]?.recent_feedback_count || 0;

    // Total partners in category for ranking context
    const totalPartnersQuery = `
      SELECT COUNT(*) as total
      FROM strategic_partners
      WHERE is_active = true
    `;

    const totalPartnersResult = await query(totalPartnersQuery);
    const totalPartners = totalPartnersResult.rows[0]?.total || 0;

    // Build response with real data (NO MOCK DATA)
    const dashboardData = {
      id: partner.id,
      company_name: partner.company_name,
      contact_email: partner.contact_email,
      power_confidence_score: partner.power_confidence_score || 0,
      score_trend: partner.score_trend || 'stable',
      industry_rank: partner.industry_rank || 0,
      total_partners_in_category: totalPartners,
      recent_feedback_count: recentFeedbackCount,
      avg_satisfaction: parseFloat(partner.average_satisfaction || 0),
      total_contractors: partner.total_contractor_engagements || 0,
      active_contractors: parseInt(activeContractors)
    };

    console.log(`[Partner Portal] Dashboard data fetched successfully for ${partner.company_name}`);

    res.json({
      success: true,
      partner: dashboardData
    });

  } catch (error) {
    console.error('[Partner Portal] Error fetching dashboard:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard data',
      error: error.message
    });
  }
};

/**
 * Get quarterly PowerConfidence score history
 * Uses partner_analytics table with metric_type = 'powerconfidence_score'
 */
const getQuarterlyScores = async (req, res) => {
  try {
    const partnerId = req.partnerUser.partnerId;

    console.log(`[Partner Portal] Fetching quarterly scores for partner ${partnerId}`);

    const quarterlyQuery = `
      SELECT
        period_start,
        period_end,
        metric_value as score,
        metadata
      FROM partner_analytics
      WHERE partner_id = $1
        AND metric_type = 'powerconfidence_score'
      ORDER BY period_end DESC
      LIMIT 4
    `;

    const result = await query(quarterlyQuery, [partnerId]);

    // Format quarters (Q1 2024, Q2 2024, etc.)
    const quarterlyScores = result.rows.map(row => {
      const endDate = new Date(row.period_end);
      const quarter = `Q${Math.ceil((endDate.getMonth() + 1) / 3)} ${endDate.getFullYear()}`;

      return {
        quarter,
        score: parseInt(row.metric_value || row.score),
        period_start: row.period_start,
        period_end: row.period_end,
        feedback_count: row.metadata ? JSON.parse(row.metadata).feedback_count || 0 : 0
      };
    });

    console.log(`[Partner Portal] Found ${quarterlyScores.length} quarterly scores`);

    res.json({
      success: true,
      quarterly_scores: quarterlyScores
    });

  } catch (error) {
    console.error('[Partner Portal] Error fetching quarterly scores:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch quarterly scores',
      error: error.message
    });
  }
};

/**
 * Get category breakdown scores
 * Uses partner_analytics table with metric_type starting with 'category_'
 */
const getCategoryScores = async (req, res) => {
  try {
    const partnerId = req.partnerUser.partnerId;

    console.log(`[Partner Portal] Fetching category scores for partner ${partnerId}`);

    const categoryQuery = `
      SELECT
        metric_type,
        metric_value as score,
        metadata
      FROM partner_analytics
      WHERE partner_id = $1
        AND metric_type LIKE 'category_%'
        AND period_end = (
          SELECT MAX(period_end)
          FROM partner_analytics
          WHERE partner_id = $1 AND metric_type LIKE 'category_%'
        )
      ORDER BY metric_value DESC
    `;

    const result = await query(categoryQuery, [partnerId]);

    // Format category scores
    const categoryScores = result.rows.map(row => {
      // Extract category name from metric_type (e.g., 'category_service_quality' → 'Service Quality')
      const categoryName = row.metric_type
        .replace('category_', '')
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');

      const metadata = row.metadata ? JSON.parse(row.metadata) : {};

      return {
        category: categoryName,
        score: parseInt(row.score),
        trend: metadata.trend || 'stable',
        feedback_count: metadata.feedback_count || 0
      };
    });

    console.log(`[Partner Portal] Found ${categoryScores.length} category scores`);

    res.json({
      success: true,
      category_scores: categoryScores
    });

  } catch (error) {
    console.error('[Partner Portal] Error fetching category scores:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch category scores',
      error: error.message
    });
  }
};

/**
 * Get recent contractor feedback
 * Uses feedback_surveys + feedback_responses tables
 */
const getRecentFeedback = async (req, res) => {
  try {
    const partnerId = req.partnerUser.partnerId;

    console.log(`[Partner Portal] Fetching feedback for partner ${partnerId}`);

    // Feedback summary statistics
    const summaryQuery = `
      SELECT
        COUNT(*) as total_responses,
        AVG(fr.rating) as avg_rating,
        COUNT(CASE WHEN fr.rating >= 8 THEN 1 END) as positive_count,
        COUNT(CASE WHEN fr.rating <= 5 THEN 1 END) as negative_count
      FROM feedback_responses fr
      INNER JOIN feedback_surveys fs ON fs.id = fr.survey_id
      WHERE fs.partner_id = $1
        AND fr.created_at > NOW() - INTERVAL '90 days'
    `;

    const summaryResult = await query(summaryQuery, [partnerId]);
    const summary = summaryResult.rows[0];

    // Recent feedback comments (last 10)
    const commentsQuery = `
      SELECT
        fr.rating,
        fr.comments,
        fr.contractor_name,
        fr.created_at
      FROM feedback_responses fr
      INNER JOIN feedback_surveys fs ON fs.id = fr.survey_id
      WHERE fs.partner_id = $1
        AND fr.comments IS NOT NULL
        AND fr.comments != ''
      ORDER BY fr.created_at DESC
      LIMIT 10
    `;

    const commentsResult = await query(commentsQuery, [partnerId]);

    const feedbackData = {
      summary: {
        total_responses: parseInt(summary.total_responses || 0),
        avg_rating: parseFloat(summary.avg_rating || 0).toFixed(1),
        positive_count: parseInt(summary.positive_count || 0),
        negative_count: parseInt(summary.negative_count || 0),
        positive_percentage: summary.total_responses > 0
          ? Math.round((summary.positive_count / summary.total_responses) * 100)
          : 0
      },
      recent_comments: commentsResult.rows.map(row => ({
        rating: row.rating,
        comment: row.comments,
        contractor_name: row.contractor_name,
        date: row.created_at
      }))
    };

    console.log(`[Partner Portal] Found ${feedbackData.summary.total_responses} feedback responses`);

    res.json({
      success: true,
      feedback: feedbackData
    });

  } catch (error) {
    console.error('[Partner Portal] Error fetching feedback:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch feedback data',
      error: error.message
    });
  }
};

/**
 * Get contractor statistics
 * Uses contractor_partner_matches table
 */
const getContractorStats = async (req, res) => {
  try {
    const partnerId = req.partnerUser.partnerId;

    console.log(`[Partner Portal] Fetching contractor stats for partner ${partnerId}`);

    // Total unique contractors
    const totalQuery = `
      SELECT COUNT(DISTINCT contractor_id) as total_contractors
      FROM contractor_partner_matches
      WHERE partner_id = $1
    `;

    const totalResult = await query(totalQuery, [partnerId]);

    // Active contractors (last 30 days)
    const activeQuery = `
      SELECT COUNT(DISTINCT cpm.contractor_id) as active_contractors
      FROM contractor_partner_matches cpm
      INNER JOIN contractors c ON c.id = cpm.contractor_id
      WHERE cpm.partner_id = $1
        AND c.last_activity_at > NOW() - INTERVAL '30 days'
    `;

    const activeResult = await query(activeQuery, [partnerId]);

    // Primary matches (contractors where this partner is primary)
    const primaryQuery = `
      SELECT COUNT(*) as primary_matches
      FROM contractor_partner_matches
      WHERE partner_id = $1
        AND is_primary_match = true
    `;

    const primaryResult = await query(primaryQuery, [partnerId]);

    const stats = {
      total_contractors: parseInt(totalResult.rows[0]?.total_contractors || 0),
      active_contractors: parseInt(activeResult.rows[0]?.active_contractors || 0),
      primary_matches: parseInt(primaryResult.rows[0]?.primary_matches || 0)
    };

    console.log(`[Partner Portal] Contractor stats: ${stats.total_contractors} total, ${stats.active_contractors} active`);

    res.json({
      success: true,
      stats
    });

  } catch (error) {
    console.error('[Partner Portal] Error fetching contractor stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch contractor statistics',
      error: error.message
    });
  }
};

/**
 * Export partner's performance report
 * Uses real data from database (NO MOCK DATA)
 */
const exportPartnerReport = async (req, res) => {
  try {
    const partnerId = req.partnerUser.partnerId;
    const { format = 'pdf' } = req.body;

    console.log(`[Partner Portal] Exporting ${format} report for partner ${partnerId}`);

    // Get partner data
    const partnerResult = await query(
      'SELECT * FROM strategic_partners WHERE id = $1',
      [partnerId]
    );

    if (partnerResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Partner not found'
      });
    }

    const partner = partnerResult.rows[0];

    // Get quarterly scores
    const quarterlyResult = await query(`
      SELECT period_start, period_end, metric_value as score
      FROM partner_analytics
      WHERE partner_id = $1 AND metric_type = 'powerconfidence_score'
      ORDER BY period_end DESC
      LIMIT 4
    `, [partnerId]);

    // Get category scores
    const categoryResult = await query(`
      SELECT metric_type, metric_value as score
      FROM partner_analytics
      WHERE partner_id = $1 AND metric_type LIKE 'category_%'
      ORDER BY metric_value DESC
    `, [partnerId]);

    const exportData = {
      partner: {
        company_name: partner.company_name,
        contact_email: partner.contact_email,
        power_confidence_score: partner.power_confidence_score,
        score_trend: partner.score_trend,
        industry_rank: partner.industry_rank,
        generated_at: new Date().toISOString()
      },
      quarterly_scores: quarterlyResult.rows,
      category_scores: categoryResult.rows,
      performance_summary: {
        total_contractors: partner.total_contractor_engagements || 0,
        avg_satisfaction: parseFloat(partner.average_satisfaction || 0),
        total_feedback: partner.total_feedback_responses || 0
      }
    };

    res.json({
      success: true,
      data: exportData,
      format,
      filename: `PowerConfidence_${partner.company_name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.${format}`
    });

  } catch (error) {
    console.error('[Partner Portal] Error exporting report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export report',
      error: error.message
    });
  }
};

/**
 * Get partner profile for editing
 * Returns all editable fields + read-only display fields
 */
const getPartnerProfile = async (req, res) => {
  // DATABASE-CHECKED: strategic_partners

  try {
    // Handle both partner and admin authentication
    // Partners: partnerId from JWT token (req.partnerId set by protectPartnerOrAdmin middleware)
    // Admins: partnerId from query params or body
    const partnerId = req.partnerId || req.query.partnerId || req.body.id || req.body.partnerId;

    if (!partnerId) {
      return res.status(400).json({
        success: false,
        message: 'Partner ID is required'
      });
    }

    console.log(`[Partner Portal] Fetching profile for partner ${partnerId} (userType: ${req.userType})`);

    const profileQuery = `
      SELECT
        id,
        company_name,
        company_description,
        value_proposition,
        contact_email,
        contact_phone,
        website,
        logo_url,
        services_offered,
        focus_areas,
        service_areas,
        service_category,
        geographic_regions,
        compliance_certifications,

        -- Read-only display fields
        power_confidence_score,
        score_trend,
        industry_rank,
        average_satisfaction,
        total_contractor_engagements,

        updated_at
      FROM strategic_partners
      WHERE id = $1 AND is_active = true
    `;

    const result = await query(profileQuery, [partnerId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Partner profile not found'
      });
    }

    const profile = result.rows[0];

    // Parse JSON text fields (focus_areas, service_areas, geographic_regions are TEXT storing JSON)
    profile.focus_areas = safeJsonParse(profile.focus_areas) || [];
    profile.service_areas = safeJsonParse(profile.service_areas) || [];
    profile.geographic_regions = safeJsonParse(profile.geographic_regions) || [];

    // services_offered is already an array (PostgreSQL ARRAY type - no parsing needed)

    console.log(`[Partner Portal] Profile fetched successfully for ${profile.company_name}`);

    res.json({
      success: true,
      profile
    });

  } catch (error) {
    console.error('[Partner Portal] Error fetching profile:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch profile',
      error: error.message
    });
  }
};

/**
 * Update partner profile
 * Accepts editable fields only, validates input
 */
const updatePartnerProfile = async (req, res) => {
  // DATABASE-CHECKED: strategic_partners

  try {
    // Handle both partner and admin authentication
    // Partners: partnerId from JWT token (req.partnerId set by protectPartnerOrAdmin middleware)
    // Admins: partnerId from request body
    const partnerId = req.partnerId || req.body.id || req.body.partnerId;

    if (!partnerId) {
      return res.status(400).json({
        success: false,
        message: 'Partner ID is required'
      });
    }

    const {
      company_name,
      company_description,
      value_proposition,
      contact_email,
      contact_phone,
      website,
      logo_url,
      services_offered,
      focus_areas,
      service_areas,
      service_category,
      geographic_regions,
      compliance_certifications
    } = req.body;

    console.log(`[Partner Portal] Updating profile for partner ${partnerId} (userType: ${req.userType})`);

    // Basic validation
    if (!company_name || company_name.trim().length < 3) {
      return res.status(400).json({
        success: false,
        message: 'Company name is required (minimum 3 characters)'
      });
    }

    if (!contact_email || !contact_email.includes('@')) {
      return res.status(400).json({
        success: false,
        message: 'Valid email is required'
      });
    }

    const updateQuery = `
      UPDATE strategic_partners
      SET
        company_name = $2,
        company_description = $3,
        value_proposition = $4,
        contact_email = $5,
        contact_phone = $6,
        website = $7,
        logo_url = $8,
        services_offered = $9,
        focus_areas = $10,
        service_areas = $11,
        service_category = $12,
        geographic_regions = $13,
        compliance_certifications = $14,
        updated_at = NOW()
      WHERE id = $1 AND is_active = true
      RETURNING *
    `;

    const result = await query(updateQuery, [
      partnerId,
      company_name.trim(),
      company_description || null,
      value_proposition || null,
      contact_email.trim(),
      contact_phone || null,
      website || null,
      logo_url || null,
      services_offered || [],  // PostgreSQL ARRAY - no stringification needed
      safeJsonStringify(focus_areas || []),  // JSON text field - needs stringification
      safeJsonStringify(service_areas || []),  // JSON text field
      service_category || null,
      safeJsonStringify(geographic_regions || []),  // JSON text field
      compliance_certifications || null
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Partner not found or update failed'
      });
    }

    const updatedProfile = result.rows[0];

    // Parse JSON fields for response
    updatedProfile.focus_areas = safeJsonParse(updatedProfile.focus_areas) || [];
    updatedProfile.service_areas = safeJsonParse(updatedProfile.service_areas) || [];
    updatedProfile.geographic_regions = safeJsonParse(updatedProfile.geographic_regions) || [];

    console.log(`[Partner Portal] Profile updated successfully for ${updatedProfile.company_name}`);

    res.json({
      success: true,
      message: 'Profile updated successfully',
      profile: updatedProfile
    });

  } catch (error) {
    console.error('[Partner Portal] Error updating profile:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile',
      error: error.message
    });
  }
};

/**
 * Upload partner logo
 * File upload handled by multer middleware
 */
const uploadLogo = async (req, res) => {
  // DATABASE-CHECKED: strategic_partners

  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    // Handle both partner and admin authentication
    // Partners: partnerId from JWT token (req.partnerId set by protectPartnerOrAdmin middleware)
    // Admins: partnerId from request body
    const partnerId = req.partnerId || req.body.partnerId || req.body.id;

    if (!partnerId) {
      return res.status(400).json({
        success: false,
        message: 'Partner ID is required'
      });
    }

    const logoUrl = `/uploads/partner-logos/${req.file.filename}`;

    console.log(`[Partner Portal] Uploading logo for partner ${partnerId} (userType: ${req.userType}): ${logoUrl}`);

    // Update logo_url in database
    const updateQuery = `
      UPDATE strategic_partners
      SET logo_url = $2, updated_at = NOW()
      WHERE id = $1 AND is_active = true
      RETURNING logo_url
    `;

    const result = await query(updateQuery, [partnerId, logoUrl]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Partner not found'
      });
    }

    console.log(`[Partner Portal] Logo uploaded successfully for partner ${partnerId}`);

    res.json({
      success: true,
      message: 'Logo uploaded successfully',
      logo_url: result.rows[0].logo_url
    });

  } catch (error) {
    console.error('[Partner Portal] Error uploading logo:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload logo',
      error: error.message
    });
  }
};

/**
 * Get field options for dropdowns
 * Returns predefined options for multi-select fields
 */
const getFieldOptions = (req, res) => {
  const options = {
    focus_areas: [
      'Growth Acceleration',
      'Cash Flow Management',
      'Team Development',
      'Process Optimization',
      'Digital Transformation',
      'Market Expansion',
      'Strategic Planning',
      'Leadership Development'
    ],
    service_areas: [
      'Technology',
      'Marketing',
      'Operations',
      'Finance',
      'Human Resources',
      'Sales',
      'Customer Service',
      'Legal'
    ],
    service_categories: [
      'Technology Solutions',
      'Business Consulting',
      'Marketing & Growth',
      'Financial Services',
      'Operational Excellence',
      'Human Capital',
      'Legal & Compliance'
    ],
    geographic_regions: [
      'North America',
      'South America',
      'Europe',
      'Asia',
      'Africa',
      'Australia',
      'Remote/Virtual'
    ]
  };

  res.json({
    success: true,
    options
  });
};

// ================================================================
// PHASE 3: LEAD MANAGEMENT & CONTRACTOR PIPELINE
// ================================================================

/**
 * Get partner's leads (contractor matches) with filtering
 * Phase 3: Lead Management
 */
const getPartnerLeads = async (req, res) => {
  try {
    // Handle both partner and admin authentication
    const partnerId = req.partnerId || req.query.partnerId || req.body.partnerId;

    if (!partnerId) {
      return res.status(400).json({
        success: false,
        message: 'Partner ID is required'
      });
    }

    console.log(`[Partner Portal] Fetching leads for partner ${partnerId}`);

    // Extract filter parameters
    const {
      engagement_stage,
      status,
      min_score,
      max_score,
      search,
      primary_only,
      page = 1,
      limit = 50
    } = req.query;

    // Build WHERE clauses
    const whereClauses = ['cpm.partner_id = $1'];
    const params = [partnerId];
    let paramCounter = 2;

    if (engagement_stage) {
      whereClauses.push(`cpm.engagement_stage = $${paramCounter}`);
      params.push(engagement_stage);
      paramCounter++;
    }

    if (status) {
      whereClauses.push(`cpm.status = $${paramCounter}`);
      params.push(status);
      paramCounter++;
    }

    if (min_score) {
      whereClauses.push(`cpm.match_score >= $${paramCounter}`);
      params.push(parseFloat(min_score));
      paramCounter++;
    }

    if (max_score) {
      whereClauses.push(`cpm.match_score <= $${paramCounter}`);
      params.push(parseFloat(max_score));
      paramCounter++;
    }

    if (primary_only === 'true') {
      whereClauses.push(`cpm.is_primary_match = true`);
    }

    if (search) {
      whereClauses.push(`(
        LOWER(c.first_name) LIKE $${paramCounter} OR
        LOWER(c.last_name) LIKE $${paramCounter} OR
        LOWER(c.company_name) LIKE $${paramCounter} OR
        LOWER(c.email) LIKE $${paramCounter}
      )`);
      params.push(`%${search.toLowerCase()}%`);
      paramCounter++;
    }

    const whereClause = whereClauses.join(' AND ');

    // Calculate offset for pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM contractor_partner_matches cpm
      JOIN contractors c ON c.id = cpm.contractor_id
      WHERE ${whereClause}
    `;

    const countResult = await query(countQuery, params);
    const totalLeads = parseInt(countResult.rows[0].total);

    // Get leads with contractor details
    const leadsQuery = `
      SELECT
        cpm.id,
        cpm.contractor_id,
        cpm.match_score,
        cpm.match_reasons,
        cpm.is_primary_match,
        cpm.engagement_stage,
        cpm.status,
        cpm.last_contact_date,
        cpm.next_follow_up_date,
        cpm.notes,
        cpm.created_at,
        cpm.updated_at,
        c.first_name,
        c.last_name,
        c.email,
        c.phone,
        c.company_name,
        c.team_size,
        c.revenue_tier,
        c.focus_areas
      FROM contractor_partner_matches cpm
      JOIN contractors c ON c.id = cpm.contractor_id
      WHERE ${whereClause}
      ORDER BY cpm.created_at DESC
      LIMIT $${paramCounter} OFFSET $${paramCounter + 1}
    `;

    params.push(parseInt(limit), offset);

    const leadsResult = await query(leadsQuery, params);

    // Parse JSON fields
    const leads = leadsResult.rows.map(lead => ({
      ...lead,
      match_reasons: safeJsonParse(lead.match_reasons, []),
      focus_areas: safeJsonParse(lead.focus_areas, []),
      notes: safeJsonParse(lead.notes, [])
    }));

    res.json({
      success: true,
      leads,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalLeads,
        totalPages: Math.ceil(totalLeads / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('[Partner Portal] Error fetching partner leads:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch partner leads',
      error: error.message
    });
  }
};

/**
 * Get detailed information for a specific lead
 * Phase 3: Lead Management
 */
const getLeadDetails = async (req, res) => {
  try {
    // Handle both partner and admin authentication
    const partnerId = req.partnerId || req.query.partnerId || req.body.partnerId;
    const { leadId } = req.params;

    if (!partnerId) {
      return res.status(400).json({
        success: false,
        message: 'Partner ID is required'
      });
    }

    if (!leadId) {
      return res.status(400).json({
        success: false,
        message: 'Lead ID is required'
      });
    }

    console.log(`[Partner Portal] Fetching lead details for lead ${leadId}, partner ${partnerId}`);

    const leadQuery = `
      SELECT
        cpm.id,
        cpm.partner_id,
        cpm.contractor_id,
        cpm.match_score,
        cpm.match_reasons,
        cpm.is_primary_match,
        cpm.engagement_stage,
        cpm.status,
        cpm.last_contact_date,
        cpm.next_follow_up_date,
        cpm.notes,
        cpm.created_at,
        cpm.updated_at,
        c.first_name,
        c.last_name,
        c.email,
        c.phone,
        c.company_name,
        c.team_size,
        c.revenue_tier,
        c.focus_areas,
        c.readiness_indicators,
        c.tags
      FROM contractor_partner_matches cpm
      JOIN contractors c ON c.id = cpm.contractor_id
      WHERE cpm.id = $1 AND cpm.partner_id = $2
    `;

    const result = await query(leadQuery, [leadId, partnerId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Lead not found or access denied'
      });
    }

    const lead = result.rows[0];

    // Parse JSON fields
    const leadDetails = {
      ...lead,
      match_reasons: safeJsonParse(lead.match_reasons, []),
      focus_areas: safeJsonParse(lead.focus_areas, []),
      readiness_indicators: safeJsonParse(lead.readiness_indicators, {}),
      tags: safeJsonParse(lead.tags, []),
      notes: safeJsonParse(lead.notes, [])
    };

    res.json({
      success: true,
      lead: leadDetails
    });

  } catch (error) {
    console.error('[Partner Portal] Error fetching lead details:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch lead details',
      error: error.message
    });
  }
};

/**
 * Update lead status (engagement stage, status, follow-up dates)
 * Phase 3: Lead Management
 */
const updateLeadStatus = async (req, res) => {
  try {
    // Handle both partner and admin authentication
    const partnerId = req.partnerId || req.body.partnerId;
    const { leadId } = req.params;
    const { engagement_stage, status, next_follow_up_date } = req.body;

    if (!partnerId) {
      return res.status(400).json({
        success: false,
        message: 'Partner ID is required'
      });
    }

    if (!leadId) {
      return res.status(400).json({
        success: false,
        message: 'Lead ID is required'
      });
    }

    console.log(`[Partner Portal] Updating lead status for lead ${leadId}, partner ${partnerId}`);

    // Verify lead belongs to partner
    const verifyQuery = `
      SELECT id FROM contractor_partner_matches
      WHERE id = $1 AND partner_id = $2
    `;
    const verifyResult = await query(verifyQuery, [leadId, partnerId]);

    if (verifyResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Lead not found or access denied'
      });
    }

    // Build update query
    const updateFields = [];
    const updateParams = [];
    let paramCounter = 1;

    if (engagement_stage) {
      updateFields.push(`engagement_stage = $${paramCounter}`);
      updateParams.push(engagement_stage);
      paramCounter++;
    }

    if (status) {
      updateFields.push(`status = $${paramCounter}`);
      updateParams.push(status);
      paramCounter++;
    }

    if (next_follow_up_date !== undefined) {
      updateFields.push(`next_follow_up_date = $${paramCounter}`);
      updateParams.push(next_follow_up_date || null);
      paramCounter++;
    }

    // Always update last_contact_date when status changes
    if (engagement_stage || status) {
      updateFields.push(`last_contact_date = NOW()`);
    }

    // Always update updated_at
    updateFields.push(`updated_at = NOW()`);

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields to update'
      });
    }

    updateParams.push(leadId, partnerId);

    const updateQuery = `
      UPDATE contractor_partner_matches
      SET ${updateFields.join(', ')}
      WHERE id = $${paramCounter} AND partner_id = $${paramCounter + 1}
      RETURNING id, engagement_stage, status, last_contact_date, next_follow_up_date, updated_at
    `;

    const updateResult = await query(updateQuery, updateParams);

    res.json({
      success: true,
      message: 'Lead status updated successfully',
      lead: updateResult.rows[0]
    });

  } catch (error) {
    console.error('[Partner Portal] Error updating lead status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update lead status',
      error: error.message
    });
  }
};

/**
 * Add a note/activity to a lead
 * Phase 3: Lead Management
 */
const addLeadNote = async (req, res) => {
  try {
    // Handle both partner and admin authentication
    const partnerId = req.partnerId || req.body.partnerId;
    const { leadId } = req.params;
    const { note_type = 'note', content } = req.body;

    if (!partnerId) {
      return res.status(400).json({
        success: false,
        message: 'Partner ID is required'
      });
    }

    if (!leadId) {
      return res.status(400).json({
        success: false,
        message: 'Lead ID is required'
      });
    }

    if (!content || !content.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Note content is required'
      });
    }

    console.log(`[Partner Portal] Adding note to lead ${leadId}, partner ${partnerId}`);

    // Verify lead belongs to partner
    const verifyQuery = `
      SELECT id, notes FROM contractor_partner_matches
      WHERE id = $1 AND partner_id = $2
    `;
    const verifyResult = await query(verifyQuery, [leadId, partnerId]);

    if (verifyResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Lead not found or access denied'
      });
    }

    // Parse existing notes
    const existingNotes = safeJsonParse(verifyResult.rows[0].notes, []);

    // Create new note
    const newNote = {
      id: Date.now(),
      type: note_type,
      content: content.trim(),
      created_at: new Date().toISOString(),
      created_by: partnerId
    };

    // Add to beginning of array (most recent first)
    const updatedNotes = [newNote, ...existingNotes];

    // Update in database
    const updateQuery = `
      UPDATE contractor_partner_matches
      SET notes = $1, updated_at = NOW()
      WHERE id = $2 AND partner_id = $3
      RETURNING id, notes, updated_at
    `;

    const updateResult = await query(updateQuery, [
      safeJsonStringify(updatedNotes),
      leadId,
      partnerId
    ]);

    res.json({
      success: true,
      message: 'Note added successfully',
      notes: safeJsonParse(updateResult.rows[0].notes, [])
    });

  } catch (error) {
    console.error('[Partner Portal] Error adding lead note:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add note',
      error: error.message
    });
  }
};

/**
 * Get lead pipeline statistics for partner
 * Phase 3: Lead Management
 */
const getLeadStats = async (req, res) => {
  try {
    // Handle both partner and admin authentication
    const partnerId = req.partnerId || req.query.partnerId || req.body.partnerId;

    if (!partnerId) {
      return res.status(400).json({
        success: false,
        message: 'Partner ID is required'
      });
    }

    console.log(`[Partner Portal] Fetching lead stats for partner ${partnerId}`);

    // Get overall stats
    const overallStatsQuery = `
      SELECT
        COUNT(*) as total_leads,
        COUNT(*) FILTER (WHERE status = 'active') as active_leads,
        COUNT(*) FILTER (WHERE is_primary_match = true) as primary_matches,
        ROUND(AVG(match_score), 1) as avg_match_score
      FROM contractor_partner_matches
      WHERE partner_id = $1
    `;

    const overallStats = await query(overallStatsQuery, [partnerId]);

    // Get stage breakdown
    const stageStatsQuery = `
      SELECT
        engagement_stage,
        COUNT(*) as count
      FROM contractor_partner_matches
      WHERE partner_id = $1 AND status = 'active'
      GROUP BY engagement_stage
      ORDER BY
        CASE engagement_stage
          WHEN 'new' THEN 1
          WHEN 'contacted' THEN 2
          WHEN 'meeting_scheduled' THEN 3
          WHEN 'proposal_sent' THEN 4
          WHEN 'negotiating' THEN 5
          WHEN 'won' THEN 6
          WHEN 'lost' THEN 7
          WHEN 'nurturing' THEN 8
          ELSE 9
        END
    `;

    const stageStats = await query(stageStatsQuery, [partnerId]);

    // Get overdue follow-ups
    const overdueQuery = `
      SELECT COUNT(*) as overdue_count
      FROM contractor_partner_matches
      WHERE partner_id = $1
        AND status = 'active'
        AND next_follow_up_date IS NOT NULL
        AND next_follow_up_date < NOW()
    `;

    const overdueStats = await query(overdueQuery, [partnerId]);

    res.json({
      success: true,
      stats: {
        overview: overallStats.rows[0],
        by_stage: stageStats.rows,
        overdue_follow_ups: parseInt(overdueStats.rows[0].overdue_count)
      }
    });

  } catch (error) {
    console.error('[Partner Portal] Error fetching lead stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch lead statistics',
      error: error.message
    });
  }
};

module.exports = {
  getPartnerDashboard,
  getQuarterlyScores,
  getCategoryScores,
  getRecentFeedback,
  getContractorStats,
  exportPartnerReport,
  getPartnerProfile,
  updatePartnerProfile,
  uploadLogo,
  getFieldOptions,
  // Phase 3: Lead Management
  getPartnerLeads,
  getLeadDetails,
  updateLeadStatus,
  addLeadNote,
  getLeadStats
};
