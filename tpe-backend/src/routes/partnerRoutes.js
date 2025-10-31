const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { protect } = require('../middleware/auth');
const partnerController = require('../controllers/partnerController');
const { asyncHandler } = require('../middleware/errorHandler');
const powerCardsIntegrationService = require('../services/powerCardsIntegrationService');

// Validation middleware
const validatePartner = [
  body('company_name').notEmpty().trim().withMessage('Company name is required'),
  body('contact_email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('focus_areas_served').isArray().withMessage('Focus areas must be an array'),
  body('target_revenue_range').isArray().withMessage('Revenue ranges must be an array'),
  body('geographic_regions').optional().isArray().withMessage('Geographic regions must be an array'),
  body('key_differentiators').optional().isArray().withMessage('Key differentiators must be an array'),
  body('client_testimonials').optional().isArray().withMessage('Client testimonials must be an array'),
  body('power_confidence_score').optional().isNumeric().withMessage('PowerConfidence score must be a number'),
  body('is_active').optional().isBoolean().withMessage('Active status must be boolean'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];

// Public routes
router.get('/active', asyncHandler(partnerController.getActivePartners));

// Protected routes (admin only) - specific paths BEFORE :id routes
router.get('/pending/list', protect, asyncHandler(partnerController.getPendingPartners));
router.get('/stats/overview', protect, asyncHandler(partnerController.getPartnerStats));
router.post('/search', protect, asyncHandler(partnerController.searchPartners));
router.get('/', protect, asyncHandler(partnerController.getAllPartners));
router.post('/', protect, validatePartner, asyncHandler(partnerController.createPartner));
router.put('/:id/toggle-status', protect, asyncHandler(partnerController.togglePartnerStatus));
router.put('/:id/approve', protect, asyncHandler(partnerController.approvePartner));
router.delete('/:id', protect, asyncHandler(partnerController.deletePartner));

// PCR (PowerConfidence Rating) routes - specific paths BEFORE :id routes
router.post('/pcr/recalculate-all', protect, asyncHandler(partnerController.recalculateAllPCR));
router.post('/:id/calculate-pcr', protect, asyncHandler(partnerController.calculatePCR));
router.patch('/:id/engagement-tier', protect, asyncHandler(partnerController.updateEngagementTier));

// Phase 2: Momentum & Badge routes - specific paths BEFORE :id routes
router.post('/momentum/recalculate-all', protect, asyncHandler(partnerController.recalculateAllMomentum));
router.post('/badges/recalculate-all', protect, asyncHandler(partnerController.recalculateAllBadges));
router.post('/:id/recalculate-momentum', protect, asyncHandler(partnerController.recalculateMomentum));
router.post('/:id/recalculate-badges', protect, asyncHandler(partnerController.recalculateBadges));
router.get('/:id/badges', asyncHandler(partnerController.getBadges));

// Phase 3: PowerCards Integration routes - specific paths BEFORE :id routes
/**
 * POST /api/partners/powercard-campaign/:campaignId/process
 * Process completed PowerCards campaign and update all partner scores
 * Admin only - triggers quarterly data integration and momentum/badge/PCR recalculation
 */
router.post('/powercard-campaign/:campaignId/process',
  protect,
  asyncHandler(async (req, res) => {
    const { campaignId } = req.params;

    console.log(`[API] Processing PowerCards campaign ${campaignId}`);

    const results = await powerCardsIntegrationService.processCampaignCompletion(
      parseInt(campaignId)
    );

    res.json({
      success: true,
      message: `PowerCards campaign processed: ${results.succeeded} partners updated, ${results.failed} failed`,
      data: results
    });
  })
);

/**
 * GET /api/partners/:id/quarterly-performance
 * Get quarterly performance history for partner dashboard
 * Used by partner portal to display quarterly performance charts
 */
router.get('/:id/quarterly-performance',
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const limit = parseInt(req.query.limit) || 4;

    console.log(`[API] Getting quarterly performance for partner ${id}`);

    const performance = await powerCardsIntegrationService.getPartnerQuarterlyPerformance(
      parseInt(id),
      limit
    );

    res.json({
      success: true,
      data: performance
    });
  })
);

// Public routes for partner profile completion (accessed via email link)
// NOTE: Must come LAST to avoid matching specific routes like /pending/list
router.get('/:id', asyncHandler(partnerController.getPartner));
router.put('/:id', asyncHandler(partnerController.updatePartner));

module.exports = router;