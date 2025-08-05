const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { protect, optionalAuth } = require('../middleware/auth');
const contractorController = require('../controllers/contractorController');
const { asyncHandler } = require('../middleware/errorHandler');

// Validation middleware
const validateContractor = [
  body('name').notEmpty().trim().withMessage('Name is required'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('phone').notEmpty().trim().withMessage('Phone number is required'),
  body('company_name').notEmpty().trim().withMessage('Company name is required'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];

// Public routes
router.post('/verify-start', validateContractor, asyncHandler(contractorController.startVerification));
router.post('/verify-code', asyncHandler(contractorController.verifyCode));
router.put('/:id/profile', asyncHandler(contractorController.updateProfile));
router.get('/:id/matches', asyncHandler(contractorController.getMatches));
router.post('/:id/complete', asyncHandler(contractorController.completeFlow));

// Protected routes (admin only)
router.use(protect);
router.get('/', asyncHandler(contractorController.getAllContractors));
router.post('/search', asyncHandler(contractorController.searchContractors));
router.get('/stats/overview', asyncHandler(contractorController.getStats));
router.get('/:id', asyncHandler(contractorController.getContractor));
router.delete('/:id', asyncHandler(contractorController.deleteContractor));

module.exports = router;