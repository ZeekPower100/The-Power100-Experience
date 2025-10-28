// DATABASE-CHECKED: contractor_users verified October 27, 2025
// ================================================================
// PATTERN: Exact copy of partnerAuthRoutes.js structure
// PURPOSE: Contractor authentication endpoints
// ================================================================

const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { protectContractor } = require('../middleware/contractorAuth');
const contractorAuthController = require('../controllers/contractorAuthController');
const { asyncHandler } = require('../middleware/errorHandler');

// Validation middleware
const validateLogin = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];

const validatePasswordChange = [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('New password must contain at least one uppercase letter, one lowercase letter, and one number'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];

const validatePasswordReset = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];

const validateResetPassword = [
  body('token').notEmpty().withMessage('Reset token is required'),
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('New password must contain at least one uppercase letter, one lowercase letter, and one number'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];

// Public contractor auth routes
router.post('/login', validateLogin, asyncHandler(contractorAuthController.contractorLogin));
router.post('/logout', asyncHandler(contractorAuthController.contractorLogout));
router.post('/request-reset', validatePasswordReset, asyncHandler(contractorAuthController.requestPasswordReset));
router.post('/reset-password', validateResetPassword, asyncHandler(contractorAuthController.resetPassword));

// Test endpoint to verify middleware
router.get('/test', protectContractor, (req, res) => {
  res.json({
    success: true,
    message: 'Contractor auth middleware working',
    user: req.user
  });
});

// Protected contractor routes (require authentication)
router.use(protectContractor);
router.get('/profile', asyncHandler(contractorAuthController.getContractorProfile));
router.put('/change-password', validatePasswordChange, asyncHandler(contractorAuthController.changeContractorPassword));

module.exports = router;
