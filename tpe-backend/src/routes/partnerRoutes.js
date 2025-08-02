const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { protect } = require('../middleware/auth');
const partnerController = require('../controllers/partnerController');
const { asyncHandler } = require('../middleware/errorHandler');

// Validation middleware
const validatePartner = [
  body('company_name').notEmpty().trim().withMessage('Company name is required'),
  body('contact_email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('focus_areas_served').isArray().withMessage('Focus areas must be an array'),
  body('target_revenue_range').isArray().withMessage('Revenue ranges must be an array'),
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
router.get('/:id', asyncHandler(partnerController.getPartner));

// Protected routes (admin only)
router.use(protect);
router.get('/', asyncHandler(partnerController.getAllPartners));
router.post('/', validatePartner, asyncHandler(partnerController.createPartner));
router.put('/:id', asyncHandler(partnerController.updatePartner));
router.delete('/:id', asyncHandler(partnerController.deletePartner));
router.put('/:id/toggle-status', asyncHandler(partnerController.togglePartnerStatus));
router.get('/stats/overview', asyncHandler(partnerController.getPartnerStats));

module.exports = router;