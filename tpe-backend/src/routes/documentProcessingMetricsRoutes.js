const express = require('express');
const router = express.Router();
const documentProcessingMetricsController = require('../controllers/documentProcessingMetricsController');
const { flexibleProtect } = require('../middleware/flexibleAuth');

// Create processing metrics
router.post('/', flexibleProtect, documentProcessingMetricsController.create);

// Get average metrics
router.get('/average', flexibleProtect, documentProcessingMetricsController.getAverageMetrics);

// Get processing stats
router.get('/stats', flexibleProtect, documentProcessingMetricsController.getProcessingStats);

// Get documents needing review
router.get('/needing-review', flexibleProtect, documentProcessingMetricsController.getNeedingReview);

// Get high quality documents
router.get('/high-quality', flexibleProtect, documentProcessingMetricsController.getHighQuality);

// Get a specific processing metrics
router.get('/:id', flexibleProtect, documentProcessingMetricsController.getById);

// Get metrics by document upload ID
router.get('/document/:documentUploadId', flexibleProtect, documentProcessingMetricsController.getByDocumentUploadId);

// Update processing metrics
router.put('/:id', flexibleProtect, documentProcessingMetricsController.update);

// Update processing progress
router.patch('/document/:documentUploadId/progress', flexibleProtect, documentProcessingMetricsController.updateProgress);

// Complete processing
router.patch('/document/:documentUploadId/complete', flexibleProtect, documentProcessingMetricsController.completeProcessing);

// Flag for review
router.patch('/document/:documentUploadId/flag-review', flexibleProtect, documentProcessingMetricsController.flagForReview);

// Delete processing metrics
router.delete('/:id', flexibleProtect, documentProcessingMetricsController.delete);

module.exports = router;