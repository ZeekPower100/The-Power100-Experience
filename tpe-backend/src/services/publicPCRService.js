// DATABASE-CHECKED: strategic_partners, partner_reports columns verified November 2, 2025
// ================================================================
// VERIFIED FIELD NAMES (strategic_partners):
// - company_name (NOT companyName)
// - description (TEXT)
// - value_proposition (TEXT)
// - logo_url (NOT logoUrl)
// - website (VARCHAR)
// - final_pcr_score (NUMERIC)
// - earned_badges (JSONB, already parsed)
// - performance_trend (VARCHAR)
// - engagement_tier (VARCHAR)
// - key_differentiators (TEXT)
// - client_testimonials (JSONB, already parsed)
// - landing_page_videos (JSONB, already parsed)
// - is_active (BOOLEAN)
// ================================================================
// VERIFIED FIELD NAMES (partner_reports):
// - public_url (VARCHAR 100, UNIQUE)
// - view_count (INTEGER, default 0)
// - last_public_view_at (TIMESTAMP)
// - report_data (JSONB, already parsed)
// - quarter (VARCHAR)
// - year (INTEGER)
// - status (VARCHAR: 'draft', 'generated', 'delivered', 'viewed')
// ================================================================
// VERIFIED DATA TYPES:
// - earned_badges: JSONB (already parsed array from DB)
// - client_testimonials: JSONB (already parsed array)
// - landing_page_videos: JSONB (already parsed array)
// - view_count: INTEGER (atomic increments)
// - is_active: BOOLEAN (true/false)
// ================================================================
// PUBLIC PCR OPERATIONS:
// - getPublicPCRBySlug: Get partner data by public_url slug
// - getPublicPCRById: Get partner data by partner_id
// - incrementViewCount: Atomically increment view_count
// - getRecentReports: Get latest quarterly reports for partner
// ================================================================

const { query } = require('../config/database');

/**
 * Get public PCR data by URL slug (public_url)
 *
 * @param {string} publicUrl - Public URL slug for the partner
 * @returns {Object} Public PCR data
 */
async function getPublicPCRBySlug(publicUrl) {
  console.log(`[Public PCR] Getting PCR data for slug: ${publicUrl}`);

  // STEP 1: Get partner by public_url (directly from strategic_partners)
  // Landing pages exist as soon as partner is approved, regardless of reports
  const partnerResult = await query(`
    SELECT
      sp.id,
      sp.company_name,
      sp.description,
      sp.value_proposition,
      sp.logo_url,
      sp.website,
      sp.final_pcr_score,
      sp.earned_badges,
      sp.performance_trend,
      sp.engagement_tier,
      sp.key_differentiators,
      sp.client_testimonials,
      sp.landing_page_videos,
      sp.focus_areas_served
    FROM strategic_partners sp
    WHERE sp.public_url = $1
      AND sp.is_active = true
    LIMIT 1
  `, [publicUrl]);

  if (partnerResult.rows.length === 0) {
    throw new Error('Public PCR page not found or partner is inactive');
  }

  const partner = partnerResult.rows[0];

  // STEP 2: Get recent quarterly reports (last 4 quarters)
  const reportsResult = await query(`
    SELECT
      id,
      quarter,
      year,
      report_type,
      report_data,
      generation_date,
      view_count
    FROM partner_reports
    WHERE partner_id = $1
      AND status IN ('generated', 'delivered', 'viewed')
    ORDER BY year DESC,
             CASE quarter
               WHEN 'Q4' THEN 4
               WHEN 'Q3' THEN 3
               WHEN 'Q2' THEN 2
               WHEN 'Q1' THEN 1
             END DESC
    LIMIT 4
  `, [partner.id]);

  // STEP 3: Increment view count for this public URL (atomic)
  await query(`
    UPDATE partner_reports
    SET
      view_count = view_count + 1,
      last_public_view_at = NOW(),
      updated_at = NOW()
    WHERE public_url = $1
  `, [publicUrl]);

  console.log(`[Public PCR] ✅ Public PCR data retrieved for ${partner.company_name}`);

  return {
    partner: {
      id: partner.id,
      companyName: partner.company_name,
      description: partner.description,
      valueProposition: partner.value_proposition,
      logoUrl: partner.logo_url,
      website: partner.website,
      pcrScore: partner.final_pcr_score ? parseFloat(partner.final_pcr_score) : null,
      badges: partner.earned_badges || [],
      performanceTrend: partner.performance_trend,
      engagementTier: partner.engagement_tier,
      differentiators: partner.key_differentiators,
      testimonials: partner.client_testimonials || [],
      videos: partner.landing_page_videos || [],
      focus_areas_served: partner.focus_areas_served || []
    },
    recentReports: reportsResult.rows.map(r => ({
      id: r.id,
      quarter: r.quarter,
      year: r.year,
      reportType: r.report_type,
      reportData: r.report_data,
      generationDate: r.generation_date,
      viewCount: r.view_count
    }))
  };
}

/**
 * Get public PCR data by partner ID
 *
 * @param {number} partnerId - Partner ID
 * @returns {Object} Public PCR data
 */
async function getPublicPCRById(partnerId) {
  console.log(`[Public PCR] Getting PCR data for partner ID: ${partnerId}`);

  // STEP 1: Get partner data
  // Only return data for active partners
  const partnerResult = await query(`
    SELECT
      id,
      company_name,
      description,
      value_proposition,
      logo_url,
      website,
      final_pcr_score,
      earned_badges,
      performance_trend,
      engagement_tier,
      key_differentiators,
      client_testimonials,
      landing_page_videos,
      is_active
    FROM strategic_partners
    WHERE id = $1
      AND is_active = true
  `, [partnerId]);

  if (partnerResult.rows.length === 0) {
    throw new Error('Partner not found or inactive');
  }

  const partner = partnerResult.rows[0];

  // STEP 2: Get recent quarterly reports (last 4 quarters)
  const reportsResult = await query(`
    SELECT
      id,
      quarter,
      year,
      report_type,
      report_data,
      generation_date,
      view_count
    FROM partner_reports
    WHERE partner_id = $1
      AND status IN ('generated', 'delivered', 'viewed')
    ORDER BY year DESC,
             CASE quarter
               WHEN 'Q4' THEN 4
               WHEN 'Q3' THEN 3
               WHEN 'Q2' THEN 2
               WHEN 'Q1' THEN 1
             END DESC
    LIMIT 4
  `, [partnerId]);

  console.log(`[Public PCR] ✅ Public PCR data retrieved for ${partner.company_name}`);

  return {
    partner: {
      id: partner.id,
      companyName: partner.company_name,
      description: partner.description,
      valueProposition: partner.value_proposition,
      logoUrl: partner.logo_url,
      website: partner.website,
      pcrScore: partner.final_pcr_score ? parseFloat(partner.final_pcr_score) : null,
      badges: partner.earned_badges || [],
      performanceTrend: partner.performance_trend,
      engagementTier: partner.engagement_tier,
      differentiators: partner.key_differentiators,
      testimonials: partner.client_testimonials || [],
      videos: partner.landing_page_videos || [],
      focus_areas_served: partner.focus_areas_served || []
    },
    recentReports: reportsResult.rows.map(r => ({
      id: r.id,
      quarter: r.quarter,
      year: r.year,
      reportType: r.report_type,
      reportData: r.report_data,
      generationDate: r.generation_date,
      viewCount: r.view_count
    }))
  };
}

/**
 * Set public URL for a partner's reports
 *
 * NOTE: public_url has UNIQUE constraint, so only ONE report can have it.
 * We set it on the most recent report for the partner.
 *
 * @param {number} partnerId - Partner ID
 * @param {string} publicUrl - Public URL slug (e.g., 'fieldforce-pcr')
 * @returns {Object} Update result
 */
async function setPublicURL(partnerId, publicUrl) {
  console.log(`[Public PCR] Setting public URL for partner ${partnerId}: ${publicUrl}`);

  // Check if public_url is already taken by another partner
  const existingResult = await query(`
    SELECT id FROM partner_reports WHERE public_url = $1 AND partner_id != $2
  `, [publicUrl, partnerId]);

  if (existingResult.rows.length > 0) {
    throw new Error(`Public URL '${publicUrl}' is already in use by another partner`);
  }

  // Check if partner has any reports
  const reportsCheck = await query(`
    SELECT id FROM partner_reports WHERE partner_id = $1 LIMIT 1
  `, [partnerId]);

  if (reportsCheck.rows.length === 0) {
    throw new Error(`Partner ${partnerId} has no reports yet. Landing page cannot be created until first report is generated.`);
  }

  // Clear public_url from all reports for this partner first
  await query(`
    UPDATE partner_reports
    SET public_url = NULL, updated_at = NOW()
    WHERE partner_id = $1 AND public_url IS NOT NULL
  `, [partnerId]);

  // Set public_url on the most recent report for this partner
  // (public_url has UNIQUE constraint, so only ONE report can have it)
  const updateResult = await query(`
    UPDATE partner_reports
    SET public_url = $1, updated_at = NOW()
    WHERE id = (
      SELECT id FROM partner_reports
      WHERE partner_id = $2
      ORDER BY year DESC,
               CASE quarter
                 WHEN 'Q4' THEN 4
                 WHEN 'Q3' THEN 3
                 WHEN 'Q2' THEN 2
                 WHEN 'Q1' THEN 1
               END DESC
      LIMIT 1
    )
    RETURNING id
  `, [publicUrl, partnerId]);

  if (updateResult.rows.length === 0) {
    throw new Error(`Failed to set public URL for partner ${partnerId}. No reports found.`);
  }

  console.log(`[Public PCR] ✅ Public URL set successfully`);

  return {
    partnerId,
    publicUrl,
    message: 'Public URL set successfully'
  };
}

/**
 * Get public URL for a partner
 *
 * @param {number} partnerId - Partner ID
 * @returns {string|null} Public URL or null if not set
 */
async function getPublicURL(partnerId) {
  const result = await query(`
    SELECT public_url
    FROM partner_reports
    WHERE partner_id = $1
      AND public_url IS NOT NULL
    LIMIT 1
  `, [partnerId]);

  return result.rows[0]?.public_url || null;
}

module.exports = {
  getPublicPCRBySlug,
  getPublicPCRById,
  setPublicURL,
  getPublicURL
};
