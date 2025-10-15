// DATABASE-CHECKED: ai_interactions verified October 14, 2025
// ================================================================
// Token Analytics Routes - Phase 3 Day 2 Enhancement
// ================================================================
// Purpose: REST API routes for token usage analytics
// Base Path: /api/analytics/tokens
// ================================================================

const express = require('express');
const router = express.Router();
const tokenAnalyticsController = require('../controllers/tokenAnalyticsController');

// Get token usage for specific contractor
// GET /api/analytics/tokens/contractor/:contractorId?days=30
router.get('/contractor/:contractorId', tokenAnalyticsController.getContractorUsage);

// Get token usage trends (contractor or system-wide)
// GET /api/analytics/tokens/trends?contractorId=1&days=7
router.get('/trends', tokenAnalyticsController.getTrends);

// Get system-wide token usage
// GET /api/analytics/tokens/system?days=30
router.get('/system', tokenAnalyticsController.getSystemUsage);

// Get comprehensive summary (contractor + system + trends)
// GET /api/analytics/tokens/summary?contractorId=1&days=30
router.get('/summary', tokenAnalyticsController.getSummary);

module.exports = router;
