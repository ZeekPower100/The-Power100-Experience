const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  processPartnerAI,
  processAllPendingPartners,
  generateContextualDifferentiators,
  markPartnersForReprocessing,
  triggerPartnerReprocessing
} = require('../services/aiProcessingService');
const { query } = require('../config/database.postgresql');

// Process a specific partner
router.post('/process-partner/:id', protect, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await processPartnerAI(id);

    res.json({
      success: true,
      message: 'Partner processed successfully',
      result
    });
  } catch (error) {
    console.error('Error processing partner:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Process all pending partners
router.post('/process-all-pending', protect, async (req, res) => {
  try {
    const { includeTestData = false } = req.body;
    const results = await processAllPendingPartners(includeTestData);

    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    res.json({
      success: true,
      message: `Processed ${results.length} partners`,
      summary: {
        total: results.length,
        successful,
        failed
      },
      results
    });
  } catch (error) {
    console.error('Error processing pending partners:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Generate contextual differentiators for a match
router.post('/contextual-match', protect, async (req, res) => {
  try {
    const { partnerId, contractorId } = req.body;

    // Fetch partner and contractor data
    const [partnerResult, contractorResult] = await Promise.all([
      query('SELECT * FROM strategic_partners WHERE id = $1', [partnerId]),
      query('SELECT * FROM contractors WHERE id = $1', [contractorId])
    ]);

    if (partnerResult.rows.length === 0 || contractorResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Partner or contractor not found'
      });
    }

    const differentiators = await generateContextualDifferentiators(
      partnerResult.rows[0],
      contractorResult.rows[0]
    );

    res.json({
      success: true,
      differentiators
    });
  } catch (error) {
    console.error('Error generating contextual differentiators:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get AI processing status for all partners
router.get('/status', protect, async (req, res) => {
  try {
    const result = await query(`
      SELECT
        ai_processing_status as status,
        COUNT(*) as count,
        AVG(ai_confidence_score) as avg_confidence
      FROM strategic_partners
      GROUP BY ai_processing_status
      ORDER BY ai_processing_status
    `);

    const totals = await query(`
      SELECT
        COUNT(*) as total_partners,
        COUNT(CASE WHEN is_test_data = true THEN 1 END) as test_partners,
        COUNT(CASE WHEN is_test_data = false THEN 1 END) as real_partners,
        COUNT(CASE WHEN ai_processing_status = 'completed' THEN 1 END) as processed,
        AVG(CASE WHEN ai_processing_status = 'completed' THEN ai_confidence_score END) as overall_confidence
      FROM strategic_partners
    `);

    res.json({
      success: true,
      statusBreakdown: result.rows,
      summary: totals.rows[0]
    });
  } catch (error) {
    console.error('Error fetching AI processing status:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Mark a partner as test data
router.patch('/mark-test/:id', protect, async (req, res) => {
  try {
    const { id } = req.params;
    const { isTestData } = req.body;

    await query(
      'UPDATE strategic_partners SET is_test_data = $1 WHERE id = $2',
      [isTestData, id]
    );

    res.json({
      success: true,
      message: `Partner ${id} marked as ${isTestData ? 'test' : 'real'} data`
    });
  } catch (error) {
    console.error('Error updating test data flag:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Trigger reprocessing for a specific partner
router.post('/reprocess/:id', protect, async (req, res) => {
  try {
    const { id } = req.params;

    await triggerPartnerReprocessing(id);
    const result = await processPartnerAI(id);

    res.json({
      success: true,
      message: 'Partner reprocessed successfully',
      result
    });
  } catch (error) {
    console.error('Error reprocessing partner:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Mark old partners for reprocessing
router.post('/mark-for-reprocessing', protect, async (req, res) => {
  try {
    const { daysOld = 30 } = req.body;

    const result = await markPartnersForReprocessing(daysOld);

    res.json({
      success: true,
      message: `Marked ${result.count} partners for reprocessing`,
      result
    });
  } catch (error) {
    console.error('Error marking partners for reprocessing:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;