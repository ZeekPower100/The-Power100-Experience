const express = require('express');
const router = express.Router();
const documentUploadsController = require('../controllers/documentUploadsController');
const { flexibleProtect } = require('../middleware/flexibleAuth');

// Create a new document upload
router.post('/', flexibleProtect, documentUploadsController.create);

// Get upload stats
router.get('/stats', flexibleProtect, documentUploadsController.getStats);

// Get uploads by status
router.get('/status/:status', flexibleProtect, documentUploadsController.getByStatus);

// Get a specific document upload
router.get('/:id', flexibleProtect, documentUploadsController.getById);

// Get uploads by book ID
router.get('/book/:bookId', flexibleProtect, documentUploadsController.getByBookId);

// Update a document upload
router.put('/:id', flexibleProtect, documentUploadsController.update);

// Update upload status
router.patch('/:id/status', flexibleProtect, documentUploadsController.updateStatus);

// Delete a document upload
router.delete('/:id', flexibleProtect, documentUploadsController.delete);

module.exports = router;