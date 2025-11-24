// DATABASE-CHECKED: contractors table - has_ceo_pcr_access, ceo_pcr_subscription_status fields
// ================================================================
// CEO PCR Access Middleware
// ================================================================
// Purpose: Protect CEO PCR endpoints - require active subscription
// ================================================================

const { query } = require('../config/database');

/**
 * Check if contractor has active CEO PCR access
 * Middleware for protecting CEO PCR routes
 */
async function checkCeoPcrAccess(req, res, next) {
  try {
    const { contractorId } = req.params;

    if (!contractorId) {
      return res.status(400).json({
        success: false,
        error: 'Contractor ID required'
      });
    }

    console.log(`[CEO PCR Access] Checking access for contractor ${contractorId}`);

    // DATABASE FIELDS: contractors (has_ceo_pcr_access, ceo_pcr_subscription_status, company_name)
    const result = await query(`
      SELECT
        id,
        company_name,
        has_ceo_pcr_access,
        ceo_pcr_subscription_status,
        ceo_pcr_subscription_tier,
        ceo_pcr_subscription_start
      FROM contractors
      WHERE id = $1
    `, [contractorId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Contractor not found'
      });
    }

    const contractor = result.rows[0];

    // Check if contractor has CEO PCR access
    if (!contractor.has_ceo_pcr_access) {
      console.log(`[CEO PCR Access] ❌ Access denied for ${contractor.company_name} - No CEO PCR access`);
      return res.status(403).json({
        success: false,
        error: 'CEO PCR access required',
        message: 'This feature requires an active CEO PowerConfidence Rating subscription.',
        access_granted: false,
        upgrade_url: '/contractor/upgrade/ceo-pcr',
        features: [
          'Anonymous employee feedback surveys',
          'CEO PowerConfidence Rating (0-105)',
          'Quarterly culture reports',
          'AI-powered recommendations',
          'Trend analysis & performance alerts'
        ]
      });
    }

    // Check if subscription is active
    if (contractor.ceo_pcr_subscription_status !== 'active') {
      console.log(`[CEO PCR Access] ❌ Access denied for ${contractor.company_name} - Subscription status: ${contractor.ceo_pcr_subscription_status}`);
      return res.status(403).json({
        success: false,
        error: 'Active subscription required',
        message: `Your CEO PCR subscription is ${contractor.ceo_pcr_subscription_status}. Please reactivate to continue.`,
        access_granted: false,
        subscription_status: contractor.ceo_pcr_subscription_status,
        reactivate_url: '/contractor/upgrade/ceo-pcr'
      });
    }

    // Access granted
    console.log(`[CEO PCR Access] ✅ Access granted for ${contractor.company_name} (${contractor.ceo_pcr_subscription_tier})`);

    // Attach contractor info to request for use in controllers
    req.ceoPcrContractor = contractor;

    next();
  } catch (error) {
    console.error('[CEO PCR Access] Error checking access:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to verify CEO PCR access'
    });
  }
}

/**
 * Check CEO PCR access status without blocking (for UI conditionals)
 * Returns access status in response, doesn't block request
 */
async function getCeoPcrAccessStatus(req, res, next) {
  try {
    const contractorId = req.params.contractorId || req.query.contractorId;

    if (!contractorId) {
      req.ceoPcrAccess = { hasAccess: false, status: 'no_contractor_id' };
      return next();
    }

    const result = await query(`
      SELECT
        has_ceo_pcr_access,
        ceo_pcr_subscription_status,
        ceo_pcr_subscription_tier
      FROM contractors
      WHERE id = $1
    `, [contractorId]);

    if (result.rows.length === 0) {
      req.ceoPcrAccess = { hasAccess: false, status: 'contractor_not_found' };
      return next();
    }

    const contractor = result.rows[0];
    req.ceoPcrAccess = {
      hasAccess: contractor.has_ceo_pcr_access && contractor.ceo_pcr_subscription_status === 'active',
      subscriptionStatus: contractor.ceo_pcr_subscription_status,
      subscriptionTier: contractor.ceo_pcr_subscription_tier
    };

    next();
  } catch (error) {
    console.error('[CEO PCR Access] Error getting access status:', error);
    req.ceoPcrAccess = { hasAccess: false, status: 'error' };
    next();
  }
}

/**
 * Check CEO PCR access from request body (for POST routes)
 * Same as checkCeoPcrAccess but reads contractor_id from req.body
 */
async function checkCeoPcrAccessFromBody(req, res, next) {
  try {
    const contractorId = req.body.contractor_id;

    if (!contractorId) {
      return res.status(400).json({
        success: false,
        error: 'contractor_id required in request body'
      });
    }

    // Temporarily attach to params for reuse of main function
    req.params.contractorId = contractorId;
    return checkCeoPcrAccess(req, res, next);
  } catch (error) {
    console.error('[CEO PCR Access] Error checking access from body:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to verify CEO PCR access'
    });
  }
}

module.exports = {
  checkCeoPcrAccess,
  checkCeoPcrAccessFromBody,
  getCeoPcrAccessStatus
};
