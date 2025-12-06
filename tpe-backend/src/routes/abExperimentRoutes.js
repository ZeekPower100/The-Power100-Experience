/**
 * A/B Experiment Routes
 * Endpoints for managing A/B experiments and viewing results
 */
const express = require('express');
const router = express.Router();
const abExperimentController = require('../controllers/abExperimentController');
const { asyncHandler } = require('../middleware/errorHandler');

// Dashboard overview
router.get('/dashboard', asyncHandler(abExperimentController.getDashboardSummary));

// Get all experiments
router.get('/', asyncHandler(abExperimentController.getAllExperiments));

// Get single experiment results
router.get('/:id', asyncHandler(abExperimentController.getExperimentResults));

// Create new experiment
router.post('/', asyncHandler(abExperimentController.createExperiment));

// Start experiment
router.post('/:id/start', asyncHandler(abExperimentController.startExperiment));

// Complete experiment
router.post('/:id/complete', asyncHandler(abExperimentController.completeExperiment));

// Assign user to variant
router.post('/:id/assign', asyncHandler(abExperimentController.assignUserToVariant));

// Record conversion
router.post('/:id/convert', asyncHandler(abExperimentController.recordConversion));

// Get user's variant
router.get('/:id/variant/:userId', asyncHandler(abExperimentController.getUserVariant));

// Delete draft experiment
router.delete('/:id', asyncHandler(abExperimentController.deleteExperiment));

module.exports = router;
