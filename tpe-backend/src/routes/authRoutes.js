const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const authController = require('../controllers/authController');
const { asyncHandler } = require('../middleware/errorHandler');
const { protect } = require('../middleware/auth');

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

// Public routes
router.post('/login', validateLogin, asyncHandler(authController.login));
router.post('/logout', asyncHandler(authController.logout));

// Protected routes
router.get('/me', protect, asyncHandler(authController.getMe));
router.put('/update-password', protect, asyncHandler(authController.updatePassword));

module.exports = router;