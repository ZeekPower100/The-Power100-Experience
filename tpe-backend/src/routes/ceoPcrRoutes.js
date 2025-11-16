// DATABASE-CHECKED: Routes for CEO PCR calculation November 14, 2025
const express = require('express');
const router = express.Router();
const ceoPcrService = require('../services/ceoPcrService');
const { query } = require('../config/database');

/**
 * CEO PCR Calculation Routes
 * Base path: /api/ceo-pcr
 */

/**
 * Calculate CEO PCR for a contractor
 * POST /api/ceo-pcr/calculate
 * Body: { contractor_id, campaign_id, quarter, year }
 */
router.post('/calculate', async (req, res, next) => {
  try {
    const { contractor_id, campaign_id, quarter, year } = req.body;

    // Validation
    if (!contractor_id || !campaign_id || !quarter || !year) {
      return res.status(400).json({
        success: false,
        error: 'contractor_id, campaign_id, quarter, and year are required'
      });
    }

    // Validate quarter format
    const validQuarters = ['Q1', 'Q2', 'Q3', 'Q4'];
    if (!validQuarters.includes(quarter)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid quarter. Must be Q1, Q2, Q3, or Q4'
      });
    }

    console.log(`[CEO PCR Routes] Calculating CEO PCR for contractor ${contractor_id}, ${quarter}-${year}`);

    const result = await ceoPcrService.calculateCeoPCR(
      contractor_id,
      campaign_id,
      quarter,
      year
    );

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('[CEO PCR Routes] Error calculating CEO PCR:', error);
    next(error);
  }
});

/**
 * Get CEO PCR history for a contractor
 * GET /api/ceo-pcr/contractor/:contractorId/history
 */
router.get('/contractor/:contractorId/history', async (req, res, next) => {
  try {
    const { contractorId } = req.params;

    // DATABASE FIELDS: ceo_pcr_scores (all columns)
    const result = await query(`
      SELECT
        id,
        contractor_id,
        quarter,
        year,
        total_employees,
        total_responses,
        response_rate,
        leadership_score,
        culture_score,
        growth_score,
        satisfaction_score,
        nps_score,
        base_score,
        trend_modifier,
        final_ceo_pcr,
        campaign_id,
        calculated_at,
        created_at
      FROM ceo_pcr_scores
      WHERE contractor_id = $1
      ORDER BY year DESC, quarter DESC
    `, [contractorId]);

    res.json({
      success: true,
      scores: result.rows,
      total: result.rows.length
    });
  } catch (error) {
    console.error('[CEO PCR Routes] Error fetching CEO PCR history:', error);
    next(error);
  }
});

/**
 * Get CEO PCR score for specific quarter
 * GET /api/ceo-pcr/contractor/:contractorId/:quarter/:year
 */
router.get('/contractor/:contractorId/:quarter/:year', async (req, res, next) => {
  try {
    const { contractorId, quarter, year } = req.params;

    // DATABASE FIELDS: ceo_pcr_scores (all columns)
    const result = await query(`
      SELECT
        id,
        contractor_id,
        quarter,
        year,
        total_employees,
        total_responses,
        response_rate,
        leadership_score,
        culture_score,
        growth_score,
        satisfaction_score,
        nps_score,
        base_score,
        trend_modifier,
        final_ceo_pcr,
        campaign_id,
        calculated_at,
        created_at
      FROM ceo_pcr_scores
      WHERE contractor_id = $1 AND quarter = $2 AND year = $3
    `, [contractorId, quarter, year]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'CEO PCR score not found for this quarter'
      });
    }

    res.json({
      success: true,
      score: result.rows[0]
    });
  } catch (error) {
    console.error('[CEO PCR Routes] Error fetching CEO PCR score:', error);
    next(error);
  }
});

/**
 * Get current CEO PCR for a contractor
 * GET /api/ceo-pcr/contractor/:contractorId/current
 */
router.get('/contractor/:contractorId/current', async (req, res, next) => {
  try {
    const { contractorId } = req.params;

    // DATABASE FIELDS: contractors (CEO PCR fields)
    const result = await query(`
      SELECT
        id,
        company_name,
        current_ceo_pcr,
        previous_ceo_pcr,
        ceo_pcr_trend,
        total_employees,
        last_employee_survey,
        ceo_pcr_last_calculated
      FROM contractors
      WHERE id = $1
    `, [contractorId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Contractor not found'
      });
    }

    res.json({
      success: true,
      contractor: result.rows[0]
    });
  } catch (error) {
    console.error('[CEO PCR Routes] Error fetching current CEO PCR:', error);
    next(error);
  }
});

/**
 * Recalculate ALL CEO PCRs (admin only)
 * POST /api/ceo-pcr/recalculate-all
 */
router.post('/recalculate-all', async (req, res, next) => {
  try {
    console.log('[CEO PCR Routes] Starting recalculation of all CEO PCRs...');

    // Get all contractors with employee counts
    const contractorsResult = await query(`
      SELECT
        c.id,
        c.company_name,
        COUNT(ce.id) as employee_count
      FROM contractors c
      LEFT JOIN company_employees ce ON c.id = ce.contractor_id AND ce.is_active = true
      WHERE c.is_active = true
      GROUP BY c.id, c.company_name
      HAVING COUNT(ce.id) > 0
    `);

    const contractors = contractorsResult.rows;
    const results = [];
    const errors = [];

    for (const contractor of contractors) {
      try {
        // Find the most recent campaign for this contractor
        const campaignResult = await query(`
          SELECT id, quarter, year
          FROM power_card_campaigns
          WHERE contractor_id = $1
          ORDER BY created_at DESC
          LIMIT 1
        `, [contractor.id]);

        if (campaignResult.rows.length === 0) {
          console.log(`[CEO PCR Routes] ⚠️  No campaigns found for contractor ${contractor.id}`);
          continue;
        }

        const campaign = campaignResult.rows[0];

        // Calculate CEO PCR
        const result = await ceoPcrService.calculateCeoPCR(
          contractor.id,
          campaign.id,
          campaign.quarter,
          campaign.year
        );

        results.push({
          contractor_id: contractor.id,
          company_name: contractor.company_name,
          final_ceo_pcr: result.finalCeoPcr
        });

        console.log(`[CEO PCR Routes] ✅ Calculated CEO PCR for ${contractor.company_name}: ${result.finalCeoPcr}`);
      } catch (err) {
        console.error(`[CEO PCR Routes] ❌ Error calculating CEO PCR for contractor ${contractor.id}:`, err);
        errors.push({
          contractor_id: contractor.id,
          company_name: contractor.company_name,
          error: err.message
        });
      }
    }

    console.log(`[CEO PCR Routes] ✅ Recalculation complete: ${results.length} successful, ${errors.length} errors`);

    res.json({
      success: true,
      calculated: results.length,
      errors: errors.length,
      results,
      error_details: errors
    });
  } catch (error) {
    console.error('[CEO PCR Routes] Error recalculating all CEO PCRs:', error);
    next(error);
  }
});

module.exports = router;
