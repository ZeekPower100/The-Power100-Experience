// PowerConfidence API Routes - Integration with Power Cards feedback
const express = require('express');
const powerConfidenceService = require('../services/powerConfidenceService');
const { protect } = require('../middleware/auth');

const router = express.Router();

// ===== POWERCONFIDENCE CALCULATION =====

// Calculate PowerConfidence scores for entire campaign (Admin only)
router.post('/campaigns/:campaignId/calculate', protect, async (req, res) => {
  try {
    const { campaignId } = req.params;
    
    const results = await powerConfidenceService.calculatePowerConfidenceScores(campaignId);
    
    res.json({
      success: true,
      message: `PowerConfidence scores calculated for ${results.length} partners`,
      results
    });
  } catch (error) {
    console.error('Error calculating PowerConfidence scores:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to calculate PowerConfidence scores',
      error: error.message
    });
  }
});

// Calculate PowerConfidence score for specific partner (Admin only)
router.post('/partners/:partnerId/calculate', protect, async (req, res) => {
  try {
    const { partnerId } = req.params;
    const { campaign_id, partner_type = 'strategic_partner' } = req.body;
    
    if (!campaign_id) {
      return res.status(400).json({
        success: false,
        message: 'Campaign ID is required'
      });
    }
    
    const scoreData = await powerConfidenceService.calculatePartnerScore(
      partnerId, 
      campaign_id, 
      partner_type
    );
    
    if (scoreData) {
      res.json({
        success: true,
        message: 'PowerConfidence score calculated successfully',
        data: scoreData
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Insufficient responses to calculate PowerConfidence score (minimum 3 required)'
      });
    }
  } catch (error) {
    console.error('Error calculating partner PowerConfidence score:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to calculate PowerConfidence score',
      error: error.message
    });
  }
});

// ===== REPORTING =====

// Generate quarterly PowerConfidence report
router.get('/campaigns/:campaignId/report', protect, async (req, res) => {
  try {
    const { campaignId } = req.params;
    
    const report = await powerConfidenceService.generateQuarterlyReport(campaignId);
    
    res.json({
      success: true,
      report
    });
  } catch (error) {
    console.error('Error generating PowerConfidence report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate PowerConfidence report',
      error: error.message
    });
  }
});

// Get partner scores summary for a campaign
router.get('/campaigns/:campaignId/scores', protect, async (req, res) => {
  try {
    const { campaignId } = req.params;
    
    const scores = await powerConfidenceService.getPartnerScoresSummary(campaignId);
    
    res.json({
      success: true,
      scores
    });
  } catch (error) {
    console.error('Error fetching partner scores:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch partner scores',
      error: error.message
    });
  }
});

// Get industry benchmarks by revenue tier
router.get('/campaigns/:campaignId/benchmarks', protect, async (req, res) => {
  try {
    const { campaignId } = req.params;
    
    const benchmarks = await powerConfidenceService.getIndustryBenchmarks(campaignId);
    
    res.json({
      success: true,
      benchmarks
    });
  } catch (error) {
    console.error('Error fetching industry benchmarks:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch industry benchmarks',
      error: error.message
    });
  }
});

// Get variance analysis (Greg's key metric)
router.get('/campaigns/:campaignId/variance', protect, async (req, res) => {
  try {
    const { campaignId } = req.params;
    
    const variance = await powerConfidenceService.getVarianceAnalysis(campaignId);
    
    res.json({
      success: true,
      variance
    });
  } catch (error) {
    console.error('Error fetching variance analysis:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch variance analysis',
      error: error.message
    });
  }
});

// Get top performers for a campaign
router.get('/campaigns/:campaignId/top-performers', protect, async (req, res) => {
  try {
    const { campaignId } = req.params;
    
    const topPerformers = await powerConfidenceService.getTopPerformers(campaignId);
    
    res.json({
      success: true,
      top_performers: topPerformers
    });
  } catch (error) {
    console.error('Error fetching top performers:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch top performers',
      error: error.message
    });
  }
});

// Get improvement opportunities
router.get('/campaigns/:campaignId/improvements', protect, async (req, res) => {
  try {
    const { campaignId } = req.params;
    
    const opportunities = await powerConfidenceService.getImprovementOpportunities(campaignId);
    
    res.json({
      success: true,
      improvement_opportunities: opportunities
    });
  } catch (error) {
    console.error('Error fetching improvement opportunities:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch improvement opportunities',
      error: error.message
    });
  }
});

// ===== PARTNER SCORE HISTORY =====

// Get PowerConfidence score history for a partner
router.get('/partners/:partnerId/history', protect, async (req, res) => {
  try {
    const { partnerId } = req.params;
    const { partner_type = 'strategic_partner', limit = 12 } = req.query;
    
    const { query } = require('../config/database.sqlite');
    
    const result = await query(`
      SELECT 
        pch.*,
        pcc.campaign_name,
        pcc.quarter
      FROM power_confidence_history_v2 pch
      JOIN power_card_campaigns pcc ON pch.campaign_id = pcc.id
      WHERE pch.partner_id = ? AND pch.partner_type = ?
      ORDER BY pch.calculated_at DESC
      LIMIT ?
    `, [partnerId, partner_type, parseInt(limit)]);
    
    res.json({
      success: true,
      history: result.rows
    });
  } catch (error) {
    console.error('Error fetching PowerConfidence history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch PowerConfidence history',
      error: error.message
    });
  }
});

// Get current PowerConfidence score for a partner
router.get('/partners/:partnerId/current', protect, async (req, res) => {
  try {
    const { partnerId } = req.params;
    const { partner_type = 'strategic_partner' } = req.query;
    
    const { query } = require('../config/database.sqlite');
    
    if (partner_type === 'strategic_partner') {
      const result = await query(`
        SELECT 
          power_confidence_score as current_score,
          last_feedback_update,
          total_feedback_responses,
          average_satisfaction,
          feedback_trend
        FROM strategic_partners
        WHERE id = ?
      `, [partnerId]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Partner not found'
        });
      }
      
      res.json({
        success: true,
        current_score: result.rows[0]
      });
    } else {
      // For other partner types, get from history
      const result = await query(`
        SELECT 
          new_score as current_score,
          calculated_at as last_update,
          response_count,
          customer_satisfaction_avg as average_satisfaction
        FROM power_confidence_history_v2
        WHERE partner_id = ? AND partner_type = ?
        ORDER BY calculated_at DESC
        LIMIT 1
      `, [partnerId, partner_type]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'No PowerConfidence data found for this partner'
        });
      }
      
      res.json({
        success: true,
        current_score: result.rows[0]
      });
    }
  } catch (error) {
    console.error('Error fetching current PowerConfidence score:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch current PowerConfidence score',
      error: error.message
    });
  }
});

module.exports = router;