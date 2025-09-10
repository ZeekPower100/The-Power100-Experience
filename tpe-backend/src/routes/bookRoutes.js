const express = require('express');
const router = express.Router();
const bookController = require('../controllers/bookController');
const { protect } = require('../middleware/auth');

// Public routes (for submissions)
router.post('/submit', bookController.createBook);

// Protected routes
router.use(protect);

// Get pending books (must come before /:id)
router.get('/pending', bookController.getPendingBooks);

// Get all books
router.get('/', bookController.getAllBooks);

// Approve book
router.put('/:id/approve', bookController.approveBook);

// Get single book
router.get('/:id', bookController.getBook);

// Update book
router.put('/:id', bookController.updateBook);

// Delete book
router.delete('/:id', bookController.deleteBook);

module.exports = router;