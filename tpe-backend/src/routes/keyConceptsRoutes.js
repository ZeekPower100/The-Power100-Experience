const express = require('express');
const router = express.Router();
const keyConceptsController = require('../controllers/keyConceptsController');
const { flexibleProtect } = require('../middleware/flexibleAuth');

// Create key concept
router.post('/', flexibleProtect, keyConceptsController.create);

// Get concept stats
router.get('/stats', flexibleProtect, keyConceptsController.getStats);

// Search concepts by name
router.get('/search', flexibleProtect, keyConceptsController.searchByName);

// Get top concepts for a book
router.get('/book/:bookId/top', flexibleProtect, keyConceptsController.getTopConcepts);

// Get a specific key concept
router.get('/:id', flexibleProtect, keyConceptsController.getById);

// Get related concepts
router.get('/:id/related', flexibleProtect, keyConceptsController.getRelatedConcepts);

// Get concepts by book ID
router.get('/book/:bookId', flexibleProtect, keyConceptsController.getByBookId);

// Get concepts by category
router.get('/category/:category', flexibleProtect, keyConceptsController.getByCategory);

// Update key concept
router.put('/:id', flexibleProtect, keyConceptsController.update);

// Delete key concept
router.delete('/:id', flexibleProtect, keyConceptsController.delete);

module.exports = router;