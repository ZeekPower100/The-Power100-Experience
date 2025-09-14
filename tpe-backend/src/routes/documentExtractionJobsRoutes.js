const express = require('express');
const router = express.Router();
const documentExtractionJobsController = require('../controllers/documentExtractionJobsController');
const { flexibleProtect } = require('../middleware/flexibleAuth');

// Create a new extraction job
router.post('/', flexibleProtect, documentExtractionJobsController.create);

// Get job stats
router.get('/stats', flexibleProtect, documentExtractionJobsController.getStats);

// Get next queued job
router.get('/next-queued', flexibleProtect, documentExtractionJobsController.getNextQueued);

// Get jobs by status
router.get('/status/:status', flexibleProtect, documentExtractionJobsController.getByStatus);

// Get a specific extraction job
router.get('/:id', flexibleProtect, documentExtractionJobsController.getById);

// Get jobs by document upload ID
router.get('/document/:documentUploadId', flexibleProtect, documentExtractionJobsController.getByDocumentUploadId);

// Start a job
router.patch('/:id/start', flexibleProtect, documentExtractionJobsController.startJob);

// Complete a job
router.patch('/:id/complete', flexibleProtect, documentExtractionJobsController.completeJob);

// Fail a job
router.patch('/:id/fail', flexibleProtect, documentExtractionJobsController.failJob);

// Update an extraction job
router.put('/:id', flexibleProtect, documentExtractionJobsController.update);

// Delete an extraction job
router.delete('/:id', flexibleProtect, documentExtractionJobsController.delete);

module.exports = router;