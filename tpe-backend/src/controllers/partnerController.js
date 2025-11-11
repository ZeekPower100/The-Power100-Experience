const { safeJsonParse, safeJsonStringify } = require('../utils/jsonHelpers');
const { processPartnerAI } = require('../services/aiProcessingService');
const pcrService = require('../services/pcrCalculationService');
const momentumService = require('../services/momentumCalculationService');
const badgeService = require('../services/badgeEligibilityService');
const publicPCRService = require('../services/publicPCRService');

const { query } = require('../config/database');
const { AppError } = require('../middleware/errorHandler');

// Fields that should trigger AI processing when updated
const AI_TRIGGER_FIELDS = [
  'company_name',           // Used in AI summary
  'description',            // Core content for analysis
  'service_areas',          // Capabilities analysis
  'focus_areas_served',     // Target market analysis
  'case_studies',           // Success stories for insights
  'testimonials',           // Social proof for analysis
  'key_differentiators',    // Would regenerate if changed
  'target_revenue_range',   // Market positioning
  'ideal_client_profile',   // Target audience
  'client_demos'            // Demo videos for analysis
];

// Helper function to trigger AI processing directly (no n8n)
const triggerAIProcessing = async (partnerId, action, updates = {}) => {
  try {
    // Check if this is a new partner or if any AI trigger fields were updated
    const shouldTrigger = action === 'created' ||
                         Object.keys(updates).some(field => AI_TRIGGER_FIELDS.includes(field));

    if (!shouldTrigger) {
      console.log(`🤝 Partner ${partnerId}: No AI-relevant fields updated, skipping AI processing`);
      return;
    }

    console.log(`🤝 Processing partner AI for partner ${partnerId} (${action})`);

    // Call the AI processing service directly (no n8n webhook)
    const result = await processPartnerAI(partnerId);

    console.log(`✅ Partner AI processing completed successfully for partner ${partnerId}`);
    return result;
  } catch (error) {
    console.error(`⚠️ Failed to process partner AI for partner ${partnerId}:`, error.message);
    // Don't throw error to prevent blocking the main operation
  }
};

// Helper function to generate URL-safe slug from company name
const generateSlug = (companyName) => {
  return companyName
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-')      // Replace spaces with hyphens
    .replace(/-+/g, '-')       // Replace multiple hyphens with single hyphen
    .replace(/^-+|-+$/g, '');  // Remove leading/trailing hyphens
};

// Helper function to auto-generate public landing page when partner is approved
const autoGenerateLandingPage = async (partnerId, companyName) => {
  try {
    console.log(`🌐 Auto-generating landing page for partner ${partnerId}: ${companyName}`);

    // Generate base slug from company name
    let slug = generateSlug(companyName);
    let finalSlug = slug;
    let attempt = 1;

    // Check if slug is already taken and add number suffix if needed
    while (true) {
      const existingResult = await query(`
        SELECT id FROM strategic_partners
        WHERE public_url = $1 AND id != $2
      `, [finalSlug, partnerId]);

      if (existingResult.rows.length === 0) {
        // Slug is unique, set it on the partner
        await query(`
          UPDATE strategic_partners
          SET public_url = $1, updated_at = NOW()
          WHERE id = $2
        `, [finalSlug, partnerId]);

        console.log(`✅ Landing page URL generated: /pcr/${finalSlug}`);
        return finalSlug;
      }

      // Slug is taken, try with a number suffix
      attempt++;
      finalSlug = `${slug}-${attempt}`;
      console.log(`⚠️ Slug '${slug}' taken, trying '${finalSlug}'`);
    }
  } catch (error) {
    console.error(`⚠️ Failed to auto-generate landing page for partner ${partnerId}:`, error.message);
    // Don't throw error to prevent blocking the approval process
    return null;
  }
};

// Get all active partners (public)
const getActivePartners = async (req, res, next) => {
  const result = await query(`
    SELECT id, company_name, description, logo_url, website, 
           focus_areas_served, target_revenue_range, powerconfidence_score,
           key_differentiators, pricing_model
    FROM strategic_partners 
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
      SELECT * FROM strategic_partners WHERE id = $1
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
      FROM demo_bookings WHERE partner_id = $1
    `, [id]);

    // Get match stats
    const matchStats = await query(`
      SELECT COUNT(DISTINCT contractor_id) as total_matches
      FROM contractor_partner_matches WHERE partner_id = $1
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
    let queryText = 'SELECT * FROM strategic_partners';
    const values = [];
    let paramCount = 0;

    if (active !== undefined) {
      queryText += ` WHERE is_active = $${++paramCount}`;
      values.push(active === 'true');
    }

    queryText += ' ORDER BY powerconfidence_score DESC';
    
    if (limit) {
      queryText += ` LIMIT $${++paramCount}`;
      values.push(parseInt(limit));
    }
    
    if (offset) {
      queryText += ` OFFSET $${++paramCount}`;
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
    last_quarterly_report,
    
    // Comprehensive Onboarding Fields
    // Step 1: Company Information
    established_year, employee_count, client_count, ownership_type, company_description,
    
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
    sponsored_events, other_sponsored_events, podcast_appearances, other_podcast_appearances,
    books_read_recommended, best_working_partnerships,
    
    // Step 8: Client Demos & References
    client_demos, client_references,

    // AI Processing Fields
    is_test_data, ai_generated_differentiators, ai_processing_status,
    last_ai_analysis, ai_confidence_score
  } = req.body;

  const result = await query(`
    INSERT INTO strategic_partners (
      -- Basic fields
      company_name, description, logo_url, website, contact_email,
      contact_phone, power100_subdomain, focus_areas_served, target_revenue_range,
      geographic_regions, powerconfidence_score, key_differentiators,
      pricing_model, onboarding_process, client_testimonials, is_active,
      last_quarterly_report,

      -- Comprehensive onboarding fields
      established_year, employee_count, client_count, ownership_type, company_description,
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
      sponsored_events, other_sponsored_events, podcast_appearances, other_podcast_appearances,
      books_read_recommended, best_working_partnerships,
      client_demos, client_references,
      is_test_data, ai_generated_differentiators, ai_processing_status,
      last_ai_analysis, ai_confidence_score
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38, $39, $40, $41, $42, $43, $44, $45, $46, $47, $48, $49, $50, $51, $52, $53, $54, $55, $56, $57, $58, $59, $60, $61, $62, $63, $64, $65, $66, $67, $68, $69)
    RETURNING *
  `, [
    // Basic values
    company_name, description, logo_url, website, contact_email, contact_phone,
    power100_subdomain, safeJsonStringify(focus_areas_served || []), safeJsonStringify(target_revenue_range || []),
    safeJsonStringify(geographic_regions || []), powerconfidence_score || 0, safeJsonStringify(key_differentiators || []),
    pricing_model, onboarding_process, safeJsonStringify(client_testimonials || []), 
    is_active !== undefined ? is_active : true, last_quarterly_report,
    
    // Comprehensive onboarding values
    established_year, employee_count, client_count, ownership_type, company_description,
    ceo_contact_name, ceo_contact_email, ceo_contact_phone, ceo_contact_title,
    cx_contact_name, cx_contact_email, cx_contact_phone, cx_contact_title,
    sales_contact_name, sales_contact_email, sales_contact_phone, sales_contact_title,
    onboarding_contact_name, onboarding_contact_email, onboarding_contact_phone, onboarding_contact_title,
    marketing_contact_name, marketing_contact_email, marketing_contact_phone, marketing_contact_title,
    safeJsonStringify(target_revenue_audience || []), safeJsonStringify(service_areas || []), service_areas_other,
    service_category, value_proposition, why_clients_choose_you, why_clients_choose_competitors,
    safeJsonStringify(focus_areas_12_months || []),
    safeJsonStringify(tech_stack_crm || []), safeJsonStringify(tech_stack_project_management || []), safeJsonStringify(tech_stack_communication || []),
    safeJsonStringify(tech_stack_analytics || []), safeJsonStringify(tech_stack_marketing || []), safeJsonStringify(tech_stack_financial || []),
    safeJsonStringify(sponsored_events || []), safeJsonStringify(other_sponsored_events || []),
    safeJsonStringify(podcast_appearances || []), safeJsonStringify(other_podcast_appearances || []),
    books_read_recommended, best_working_partnerships,
    safeJsonStringify(client_demos || []), safeJsonStringify(client_references || []),
    is_test_data || false, ai_generated_differentiators || null, ai_processing_status || 'pending',
    last_ai_analysis || null, ai_confidence_score || null
  ]);

  // Trigger AI processing for new partner
  const newPartner = result.rows[0];
  await triggerAIProcessing(newPartner.id, 'created');

  // Calculate initial PCR score for new partner
  try {
    await pcrService.calculatePartnerPCR(newPartner.id);
    console.log(`[PCR] ✅ Initial PCR calculated for new partner ${newPartner.id}`);
  } catch (pcrError) {
    console.error(`[PCR] ⚠️  Failed to calculate initial PCR for partner ${newPartner.id}:`, pcrError.message);
    // Don't fail the whole creation if PCR calculation fails
  }

  // Process videos if client_demos URLs were provided
  console.log('🔍 DEBUG - client_demos value:', client_demos);
  console.log('🔍 DEBUG - client_demos type:', typeof client_demos);

  // Parse client_demos if it's a string (from req.body it might be an array already)
  const demosArray = typeof client_demos === 'string'
    ? safeJsonParse(client_demos, [])
    : (client_demos || []);

  console.log('🔍 DEBUG - demosArray:', demosArray);
  console.log('🔍 DEBUG - demosArray length:', demosArray.length);

  if (demosArray && demosArray.length > 0) {
    try {
      console.log(`📹 Processing ${demosArray.length} demo videos for new partner ${newPartner.id}`);
      const axios = require('axios');

      // Process each demo URL
      for (const demo of demosArray) {
        // Handle both string URLs and objects with URL property
        const demoUrl = typeof demo === 'string' ? demo : (demo.url || demo.video_url);

        if (demoUrl && demoUrl.includes('http')) {
          try {
            console.log(`  Processing video: ${demoUrl}`);
            const baseUrl = process.env.NODE_ENV === 'production'
              ? 'https://tpx.power100.io'
              : 'http://localhost:5000';
            const videoResponse = await axios.post(
              `${baseUrl}/api/video-analysis/process`,
              {
                video_url: demoUrl,
                partner_id: newPartner.id
              },
              {
                headers: {
                  'Authorization': req.headers.authorization,
                  'Content-Type': 'application/json'
                },
                timeout: 60000
              }
            );
            console.log(`  ✅ Video processed: ${videoResponse.data.message}`);
          } catch (videoError) {
            console.error(`  ⚠️ Failed to process video ${demoUrl}:`, videoError.message);
            // Continue processing other videos
          }
        }
      }
    } catch (error) {
      console.error(`⚠️ Video processing setup failed (non-blocking):`, error.message);
      // Don't fail the creation, just log the error
    }
  }

  res.status(201).json({
    success: true,
    partner: newPartner
  });
};

// Update partner (admin)
const updatePartner = async (req, res, next) => {
  const { id } = req.params;
  const updates = req.body;
  
  // Log the client_demos structure for debugging
  if (updates.client_demos) {
    console.log('📹 Updating client_demos:', safeJsonStringify(updates.client_demos, null, 2));
  }

  // Build dynamic update query - Include ALL database fields
  const allowedFields = [
    // Basic Information
    'company_name', 'description', 'logo_url', 'website', 'contact_email',
    'contact_phone', 'power100_subdomain',
    
    // Business Details
    'established_year', 'employee_count', 'client_count', 'ownership_type', 'company_description',
    
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
    'sponsored_events', 'other_sponsored_events', 'podcast_appearances', 'other_podcast_appearances',
    'books_read_recommended', 'best_working_partnerships',
    
    // Client Information
    'client_demos', 'client_references', 'client_testimonials',
    
    // Administrative
    'is_active', 'dashboard_access_enabled', 'last_dashboard_login',
    'onboarding_url', 'demo_booking_url', 'onboarding_process',
    'last_quarterly_report',
    
    // Landing Page Content
    'landing_page_videos',

    // AI Processing Fields
    'is_test_data', 'ai_generated_differentiators', 'ai_processing_status',
    'last_ai_analysis', 'ai_confidence_score'
  ];

  const setClause = [];
  const values = [];
  let paramCounter = 1;

  // Process each field
  Object.keys(updates).forEach(key => {
    if (allowedFields.includes(key)) {
      setClause.push(`${key} = $${paramCounter}`);
      paramCounter++;
      
      // Handle JSON fields - Arrays and objects need to be stringified
      const jsonFields = [
        'focus_areas_served', 'target_revenue_range', 'geographic_regions',
        'key_differentiators', 'service_areas', 'target_revenue_audience',
        'focus_areas_12_months', 'tech_stack_crm', 'tech_stack_project_management',
        'tech_stack_communication', 'tech_stack_analytics', 'tech_stack_marketing',
        'tech_stack_financial', 'sponsored_events', 'other_sponsored_events',
        'podcast_appearances', 'other_podcast_appearances',
        'client_demos', 'client_references', 'client_testimonials', 'landing_page_videos'
      ];
      
      if (jsonFields.includes(key)) {
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

  // Check if significant fields are being updated that should trigger AI reprocessing
  const significantFields = [
    'description', 'service_areas', 'focus_areas_served',
    'value_proposition', 'why_clients_choose_you', 'why_clients_choose_competitors',
    'target_revenue_range', 'client_count', 'client_testimonials',
    'sponsored_events', 'other_sponsored_events', 'podcast_appearances',
    'other_podcast_appearances', 'books_read_recommended', 'best_working_partnerships',
    'service_category', 'focus_areas_12_months'
  ];

  const hasSignificantChanges = Object.keys(updates).some(key =>
    significantFields.includes(key)
  );

  // If significant changes, reset AI processing status to trigger reprocessing
  if (hasSignificantChanges && !updates.hasOwnProperty('ai_processing_status')) {
    setClause.push(`ai_processing_status = $${paramCounter}`);
    values.push('pending');
    paramCounter++;
    console.log(`Partner ${id} marked for AI reprocessing due to significant changes`);
  }

  values.push(id);

  try {
    // Get the OLD client_demos BEFORE update (for video comparison)
    let oldDemoUrls = [];
    if (updates.client_demos) {
      const oldPartnerResult = await query(
        'SELECT client_demos FROM strategic_partners WHERE id = $1',
        [id]
      );
      const oldDemos = oldPartnerResult.rows[0] ? safeJsonParse(oldPartnerResult.rows[0].client_demos, []) : [];
      oldDemoUrls = oldDemos.map(d => typeof d === 'string' ? d : (d.url || d.video_url)).filter(Boolean);
    }

    // Admin-created partners are automatically approved
    req.body.status = 'approved';
    req.body.is_active = true;
    
    const result = await query(
      `UPDATE strategic_partners 
       SET ${setClause.join(', ')}, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $${paramCounter}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return next(new AppError('Partner not found', 404));
    }

    // Trigger AI processing if content fields were updated
    const updatedPartner = result.rows[0];
    await triggerAIProcessing(updatedPartner.id, 'updated', updates);

    // Process videos if client_demos was updated with new URLs
    if (updates.client_demos) {
      try {
        // Get the NEW demos
        const newDemos = safeJsonParse(updates.client_demos, []);
        const newDemoUrls = newDemos.map(d => typeof d === 'string' ? d : (d.url || d.video_url)).filter(Boolean);

        // Find which URLs are actually NEW (not in old list)
        const addedUrls = newDemoUrls.filter(url => !oldDemoUrls.includes(url));

        if (addedUrls.length > 0) {
          console.log(`📹 Processing ${addedUrls.length} NEW demo videos for partner ${id} (out of ${newDemoUrls.length} total)`);
          const axios = require('axios');

          for (const demoUrl of addedUrls) {
            if (demoUrl && demoUrl.includes('http')) {
              try {
                console.log(`  Processing NEW video: ${demoUrl}`);
                const baseUrl = process.env.NODE_ENV === 'production'
                  ? 'https://tpx.power100.io'
                  : 'http://localhost:5000';
                const videoResponse = await axios.post(
                  `${baseUrl}/api/video-analysis/process`,
                  {
                    video_url: demoUrl,
                    partner_id: id
                  },
                  {
                    headers: {
                      'Authorization': req.headers.authorization,
                      'Content-Type': 'application/json'
                    },
                    timeout: 60000
                  }
                );
                console.log(`  ✅ Video processed: ${videoResponse.data.message}`);
              } catch (videoError) {
                console.error(`  ⚠️ Failed to process video ${demoUrl}:`, videoError.message);
                // Continue processing other videos
              }
            }
          }
        } else {
          console.log(`📹 No new videos to process for partner ${id} (all ${newDemoUrls.length} videos already processed)`);
        }
      } catch (error) {
        console.error(`⚠️ Video processing setup failed (non-blocking):`, error.message);
        // Don't fail the update, just log the error
      }
    }

    // Recalculate PCR after profile update
    try {
      await pcrService.calculatePartnerPCR(parseInt(id));
      console.log(`[PCR] ✅ PCR recalculated after profile update for partner ${id}`);
    } catch (pcrError) {
      console.error(`[PCR] ⚠️  Failed to recalculate PCR for partner ${id}:`, pcrError.message);
      // Don't fail the whole update if PCR calculation fails
    }

    res.status(200).json({
      success: true,
      partner: updatedPartner
    });
  } catch (error) {
    console.error('❌ Update partner database error:', error.message);
    console.error('SQL Query details:', {
      setClause: setClause.join(', '),
      valuesCount: values.length,
      error: error.detail || error.message
    });
    return next(new AppError(`Failed to update partner: ${error.message}`, 500));
  }
};

// Delete partner (admin)
const deletePartner = async (req, res, next) => {
  const { id } = req.params;

  // First check if partner exists
  const existingPartner = await query('SELECT id FROM strategic_partners WHERE id = $1', [id]);
  if (existingPartner.rows.length === 0) {
    return next(new AppError('Partner not found', 404));
  }

  // Delete the partner
  await query('DELETE FROM strategic_partners WHERE id = $1', [id]);

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
    WHERE id = $1
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

// Search partners with advanced filters
const searchPartners = async (req, res, next) => {
  const { 
    query: searchQuery = '', 
    focusAreas = [], 
    revenueRanges = [], 
    isActive, 
    status,  // Add status filter
    confidenceScoreMin, 
    confidenceScoreMax, 
    dateFrom, 
    dateTo, 
    sortBy = 'created_at', 
    sortOrder = 'DESC', 
    limit = 20, 
    offset = 0 
  } = req.body;

  console.log('🔍 searchPartners called with:', safeJsonStringify(req.body, null, 2));

  try {
    let whereClause = '1=1';
    const values = [];
    let paramCounter = 1;

    // Text search across multiple fields - use correct column names
    if (searchQuery && searchQuery.trim()) {
      whereClause += ` AND (
        company_name ILIKE $${paramCounter} OR 
        description ILIKE $${paramCounter + 1} OR 
        company_description ILIKE $${paramCounter + 2} OR 
        contact_email ILIKE $${paramCounter + 3} OR 
        website ILIKE $${paramCounter + 4}
      )`;
      const searchPattern = `%${searchQuery.trim()}%`;
      values.push(searchPattern, searchPattern, searchPattern, searchPattern, searchPattern);
      paramCounter += 5;
    }

    // Active status filter
    if (isActive !== undefined) {
      whereClause += ` AND is_active = $${paramCounter}`;
      values.push(isActive);
      paramCounter++;
    }
    
    // Status filter (for pending/partial/approved partners)
    if (status) {
      if (Array.isArray(status)) {
        const statusPlaceholders = status.map(() => `$${paramCounter++}`).join(',');
        whereClause += ` AND status IN (${statusPlaceholders})`;
        values.push(...status);
      } else {
        whereClause += ` AND status = $${paramCounter}`;
        values.push(status);
        paramCounter++;
      }
    }

    // Focus areas filter (JSON field) - use correct column name
    if (focusAreas && focusAreas.length > 0) {
      console.log('🔍 Focus areas filter:', focusAreas);
      const focusConditions = focusAreas.map(() => {
        const condition = `(focus_areas_served IS NOT NULL AND focus_areas_served::text ILIKE $${paramCounter})`;
        paramCounter++;
        return condition;
      }).join(' OR ');
      whereClause += ` AND (${focusConditions})`;
      focusAreas.forEach(area => {
        // Try both formats - with quotes and without
        values.push(`%${area}%`);
        console.log('🔍 Searching for focus area:', area, 'with pattern:', `%${area}%`);
      });
    }

    // Revenue ranges filter (JSON field) - use correct column name
    if (revenueRanges && revenueRanges.length > 0) {
      const revenueConditions = revenueRanges.map(() => {
        const condition = `(target_revenue_range IS NOT NULL AND target_revenue_range::text ILIKE $${paramCounter})`;
        paramCounter++;
        return condition;
      }).join(' OR ');
      whereClause += ` AND (${revenueConditions})`;
      revenueRanges.forEach(range => {
        values.push(`%${range}%`);
        console.log('🔍 Searching for revenue range:', range);
      });
    }

    // PowerConfidence score range
    if (confidenceScoreMin !== undefined) {
      whereClause += ` AND powerconfidence_score >= $${paramCounter}`;
      values.push(confidenceScoreMin);
      paramCounter++;
    }
    if (confidenceScoreMax !== undefined) {
      whereClause += ` AND powerconfidence_score <= $${paramCounter}`;
      values.push(confidenceScoreMax);
      paramCounter++;
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
    const allowedSortFields = ['created_at', 'updated_at', 'company_name', 'powerconfidence_score', 'is_active'];
    const validSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'created_at';
    const validSortOrder = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM strategic_partners WHERE ${whereClause}`;
    console.log('🔍 Partner count query:', countQuery);
    console.log('🔍 Partner count values:', values);
    const countResult = await query(countQuery, values);
    const total = countResult.rows[0].total;

    // Apply search filters and sorting
    const partnersResult = await query(
      `SELECT * FROM strategic_partners WHERE ${whereClause} ORDER BY ${validSortBy} ${validSortOrder} LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}`,
      values
    );

    // Parse JSON fields safely and map database fields to frontend expectations
    const partners = partnersResult.rows.map(partner => {
      // Safe JSON parsing helper
      const safeParseJSON = (value, defaultValue = []) => {
        if (!value) return defaultValue;
        if (Array.isArray(value)) return value;
        if (typeof value === 'object' && value !== null) return value;
        if (typeof value === 'string') {
          // Handle special cases
          if (value === '[object Object]' || value === '{}' || value === '') return defaultValue;
          try {
            const parsed = safeJsonParse(value);
            return parsed || defaultValue;
          } catch (e) {
            console.warn(`Failed to parse JSON for partner ${partner.id}:`, value);
            return defaultValue;
          }
        }
        return defaultValue;
      };

      return {
        ...partner,
        // Map database fields to frontend expectations (if frontend uses different names)
        power_confidence_score: partner.powerconfidence_score || 0,
        // Parse JSON fields with better error handling
        focus_areas_served: safeParseJSON(partner.focus_areas_served, []),
        target_revenue_range: safeParseJSON(partner.target_revenue_range, [])
      };
    });

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

// Get pending partners (partial submissions)
const getPendingPartners = async (req, res, next) => {
  try {
    const queryText = `
      SELECT 
        id, company_name, ceo_contact_name, ceo_contact_email,
        status, completed_steps, created_at, is_active,
        value_proposition, website
      FROM strategic_partners
      WHERE status IN ('partial_submission', 'pending_review')
      ORDER BY created_at DESC
    `;
    
    const result = await query(queryText);
    
    res.json({
      success: true,
      partners: result.rows,
      total: result.rows.length
    });
  } catch (error) {
    console.error('Error fetching pending partners:', error);
    next(error);
  }
};

// Approve a pending partner
const approvePartner = async (req, res, next) => {
  const { id } = req.params;
  
  try {
    const queryText = `
      UPDATE strategic_partners
      SET is_active = true, 
          status = 'approved',
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING id, company_name, status, is_active
    `;
    
    const result = await query(queryText, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Partner not found'
      });
    }

    const approvedPartner = result.rows[0];

    // Auto-generate public landing page URL
    const landingPageSlug = await autoGenerateLandingPage(approvedPartner.id, approvedPartner.company_name);

    res.json({
      success: true,
      message: 'Partner approved successfully',
      partner: approvedPartner,
      landingPageUrl: landingPageSlug ? `/pcr/${landingPageSlug}` : null,
      landingPageStatus: landingPageSlug
        ? 'Landing page URL created and ready (will populate with data as reports are generated)'
        : 'Unable to generate landing page URL'
    });
  } catch (error) {
    console.error('Error approving partner:', error);
    next(error);
  }
};

// ================================================================
// PCR (PowerConfidence Rating) Endpoints
// ================================================================

/**
 * Calculate PCR score for a single partner
 * POST /api/partners/:id/calculate-pcr
 */
const calculatePCR = async (req, res, next) => {
  try {
    const partnerId = parseInt(req.params.id);

    if (!partnerId || isNaN(partnerId)) {
      return res.status(400).json({
        success: false,
        error: 'Valid partner ID is required'
      });
    }

    const result = await pcrService.calculatePartnerPCR(partnerId);

    res.json({
      success: true,
      message: 'PCR calculated successfully',
      data: result
    });
  } catch (error) {
    console.error('Error calculating PCR:', error);
    next(error);
  }
};

/**
 * Recalculate PCR scores for all active partners
 * POST /api/partners/pcr/recalculate-all
 */
const recalculateAllPCR = async (req, res, next) => {
  try {
    const results = await pcrService.recalculateAllPCR();

    res.json({
      success: true,
      message: `PCR recalculation complete: ${results.succeeded} succeeded, ${results.failed} failed`,
      data: results
    });
  } catch (error) {
    console.error('Error recalculating all PCR:', error);
    next(error);
  }
};

/**
 * Update engagement tier for a partner
 * PATCH /api/partners/:id/engagement-tier
 * Body: { tier: 'free' | 'verified' | 'gold', subscriptionStart?, subscriptionEnd? }
 */
const updateEngagementTier = async (req, res, next) => {
  try {
    const partnerId = parseInt(req.params.id);
    const { tier, subscriptionStart, subscriptionEnd } = req.body;

    if (!partnerId || isNaN(partnerId)) {
      return res.status(400).json({
        success: false,
        error: 'Valid partner ID is required'
      });
    }

    if (!tier || !['free', 'gold', 'platinum'].includes(tier)) {
      return res.status(400).json({
        success: false,
        error: 'Valid tier is required (free, gold, or platinum)'
      });
    }

    const result = await pcrService.updateEngagementTier(
      partnerId,
      tier,
      subscriptionStart ? new Date(subscriptionStart) : null,
      subscriptionEnd ? new Date(subscriptionEnd) : null
    );

    res.json({
      success: true,
      message: `Engagement tier updated to ${tier}`,
      data: result
    });
  } catch (error) {
    console.error('Error updating engagement tier:', error);
    next(error);
  }
};

// ================================================================
// Phase 2: Momentum & Badges Controller Methods
// ================================================================

/**
 * POST /api/partners/:id/recalculate-momentum
 * Recalculate momentum modifier for a single partner
 */
const recalculateMomentum = async (req, res, next) => {
  try {
    const partnerId = parseInt(req.params.id);

    if (isNaN(partnerId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid partner ID'
      });
    }

    const result = await momentumService.updatePartnerMomentum(partnerId);

    res.json({
      success: true,
      message: 'Momentum recalculated successfully',
      data: result
    });
  } catch (error) {
    console.error('Error recalculating momentum:', error);
    next(error);
  }
};

/**
 * POST /api/partners/momentum/recalculate-all
 * Recalculate momentum for all active partners (bulk operation)
 */
const recalculateAllMomentum = async (req, res, next) => {
  try {
    // Get all active partners
    const partnersResult = await query(`
      SELECT id FROM strategic_partners WHERE is_active = true
    `);

    const results = {
      total: partnersResult.rows.length,
      succeeded: 0,
      failed: 0,
      errors: []
    };

    for (const partner of partnersResult.rows) {
      try {
        await momentumService.updatePartnerMomentum(partner.id);
        results.succeeded++;
      } catch (error) {
        results.failed++;
        results.errors.push({
          partnerId: partner.id,
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      message: 'Bulk momentum recalculation complete',
      data: results
    });
  } catch (error) {
    console.error('Error in bulk momentum recalculation:', error);
    next(error);
  }
};

/**
 * POST /api/partners/:id/recalculate-badges
 * Recalculate badges for a single partner
 */
const recalculateBadges = async (req, res, next) => {
  try {
    const partnerId = parseInt(req.params.id);

    if (isNaN(partnerId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid partner ID'
      });
    }

    const result = await badgeService.updatePartnerBadges(partnerId);

    res.json({
      success: true,
      message: 'Badges recalculated successfully',
      data: result
    });
  } catch (error) {
    console.error('Error recalculating badges:', error);
    next(error);
  }
};

/**
 * POST /api/partners/badges/recalculate-all
 * Recalculate badges for all active partners (bulk operation)
 */
const recalculateAllBadges = async (req, res, next) => {
  try {
    const results = await badgeService.recalculateAllBadges();

    res.json({
      success: true,
      message: 'Bulk badge recalculation complete',
      data: results
    });
  } catch (error) {
    console.error('Error in bulk badge recalculation:', error);
    next(error);
  }
};

/**
 * GET /api/partners/:id/badges
 * Get current badges for a partner
 */
const getBadges = async (req, res, next) => {
  try {
    const partnerId = parseInt(req.params.id);

    if (isNaN(partnerId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid partner ID'
      });
    }

    const result = await query(`
      SELECT earned_badges, badge_last_updated
      FROM strategic_partners
      WHERE id = $1
    `, [partnerId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Partner not found'
      });
    }

    res.json({
      success: true,
      data: {
        badges: result.rows[0].earned_badges || [],
        lastUpdated: result.rows[0].badge_last_updated
      }
    });
  } catch (error) {
    console.error('Error fetching badges:', error);
    next(error);
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
  searchPartners,
  getPendingPartners,
  approvePartner,
  calculatePCR,
  recalculateAllPCR,
  updateEngagementTier,
  // Phase 2: Momentum & Badges
  recalculateMomentum,
  recalculateAllMomentum,
  recalculateBadges,
  recalculateAllBadges,
  getBadges
};