const express = require('express');
const router = express.Router();
const extractedContentController = require('../controllers/extractedContentController');
const { flexibleProtect } = require('../middleware/flexibleAuth');

// Create extracted content
router.post('/', flexibleProtect, extractedContentController.create);

// Get content stats
router.get('/stats', flexibleProtect, extractedContentController.getStats);

// Get full text for a document
router.get('/document/:documentUploadId/full-text', flexibleProtect, extractedContentController.getFullText);

// Get content by content type
router.get('/document/:documentUploadId/type/:contentType', flexibleProtect, extractedContentController.getByContentType);

// Get a specific extracted content
router.get('/:id', flexibleProtect, extractedContentController.getById);

// Get content by document upload ID
router.get('/document/:documentUploadId', flexibleProtect, extractedContentController.getByDocumentUploadId);

// Get content by job ID
router.get('/job/:jobId', flexibleProtect, extractedContentController.getByJobId);

// Update extracted content
router.put('/:id', flexibleProtect, extractedContentController.update);

// Delete specific extracted content
router.delete('/:id', flexibleProtect, extractedContentController.delete);

// Delete all content for a document
router.delete('/document/:documentUploadId', flexibleProtect, extractedContentController.deleteByDocumentUploadId);

module.exports = router;