const express = require('express');
const router = express.Router();
const bookController = require('../controllers/bookController');
const { protect } = require('../middleware/auth');

// All book routes require authentication
router.use(protect);

// Get all books
router.get('/', bookController.getAllBooks);

// Get single book
router.get('/:id', bookController.getBook);

// Create new book
router.post('/', bookController.createBook);

// Update book
router.put('/:id', bookController.updateBook);

// Delete book
router.delete('/:id', bookController.deleteBook);

module.exports = router;