const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { protectPartner } = require('../middleware/partnerAuth');
const partnerAuthController = require('../controllers/partnerAuthController');
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

// Public partner auth routes
router.post('/login', validateLogin, asyncHandler(partnerAuthController.partnerLogin));
router.post('/logout', asyncHandler(partnerAuthController.partnerLogout));

// Test endpoint to verify middleware
router.get('/test', protectPartner, (req, res) => {
  res.json({
    success: true,
    message: 'Middleware working',
    partnerUser: req.partnerUser
  });
});

// Protected partner routes
router.use(protectPartner);
router.get('/profile', asyncHandler(partnerAuthController.getPartnerProfile));
router.put('/change-password', validatePasswordChange, asyncHandler(partnerAuthController.changePartnerPassword));

module.exports = router;