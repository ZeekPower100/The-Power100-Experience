// DATABASE-CHECKED: Routes for account creation service - October 27, 2025
// ================================================================
// PURPOSE: Admin-only API endpoints for manual account creation
// ================================================================
// ENDPOINTS:
// - POST /api/account-creation/partner (admin only)
// - POST /api/account-creation/contractor (admin only)
// ================================================================
// AUTHENTICATION: Requires admin JWT token via protect middleware
// ================================================================

const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { protect } = require('../middleware/auth'); // Admin middleware
const { asyncHandler } = require('../middleware/errorHandler');
const {
  createPartnerAccount,
  createContractorAccount
} = require('../services/accountCreationService');

// Validation middleware for partner account creation
const validatePartnerAccount = [
  body('partnerId')
    .isInt({ min: 1 })
    .withMessage('Valid partner ID is required'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }
    next();
  }
];

// Validation middleware for contractor account creation
const validateContractorAccount = [
  body('contractorId')
    .isInt({ min: 1 })
    .withMessage('Valid contractor ID is required'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }
    next();
  }
];

// ================================================================
// PROTECTED ROUTES - Admin only (require JWT token)
// ================================================================

/**
 * Create partner user account
 * POST /api/account-creation/partner
 *
 * Request body:
 * {
 *   "partnerId": 1,
 *   "email": "partner@example.com"
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "message": "Partner account created successfully",
 *   "userId": 123,
 *   "email": "partner@example.com",
 *   "password": "Abc123!@#xyz"
 * }
 */
router.post('/partner',
  protect, // Admin authentication required
  validatePartnerAccount,
  asyncHandler(async (req, res) => {
    const { partnerId, email } = req.body;

    const result = await createPartnerAccount(partnerId, email, {
      createdBy: 'admin',
      triggerSource: 'manual_admin_creation'
    });

    if (result.success) {
      res.status(201).json({
        success: true,
        message: 'Partner account created successfully',
        userId: result.userId,
        email: result.email,
        password: result.password // Only return via API, not email yet (Phase 4)
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.error
      });
    }
  })
);

/**
 * Create contractor user account
 * POST /api/account-creation/contractor
 *
 * Request body:
 * {
 *   "contractorId": 168,
 *   "email": "contractor@example.com"
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "message": "Contractor account created successfully",
 *   "userId": 456,
 *   "email": "contractor@example.com",
 *   "password": "Xyz789!@#abc"
 * }
 */
router.post('/contractor',
  protect, // Admin authentication required
  validateContractorAccount,
  asyncHandler(async (req, res) => {
    const { contractorId, email } = req.body;

    const result = await createContractorAccount(contractorId, email, {
      createdBy: 'admin',
      triggerSource: 'manual_admin_creation'
    });

    if (result.success) {
      res.status(201).json({
        success: true,
        message: 'Contractor account created successfully',
        userId: result.userId,
        email: result.email,
        password: result.password // Only return via API, not email yet (Phase 4)
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.error
      });
    }
  })
);

module.exports = router;
