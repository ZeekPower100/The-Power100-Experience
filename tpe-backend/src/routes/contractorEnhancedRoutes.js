// Enhanced Contractor Routes for Advanced Search and Management
const express = require('express');
const router = express.Router();
const {
  getEnhancedContractorList,
  getContractorDetailedView
} = require('../controllers/contractorEnhancedController');

const { authenticateAdmin } = require('../middleware/auth');

// Apply admin authentication to all routes
router.use(authenticateAdmin);

// GET /api/contractors-enhanced/list - Enhanced contractor list for admin management
router.get('/list', getEnhancedContractorList);

// GET /api/contractors-enhanced/:contractorId/view - Detailed contractor view
router.get('/:contractorId/view', getContractorDetailedView);

module.exports = router;