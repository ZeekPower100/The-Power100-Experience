const express = require('express');
const router = express.Router();
const chapterAnalysisController = require('../controllers/chapterAnalysisController');
const { flexibleProtect } = require('../middleware/flexibleAuth');

// Create chapter analysis
router.post('/', flexibleProtect, chapterAnalysisController.create);

// Get book summary
router.get('/book/:bookId/summary', flexibleProtect, chapterAnalysisController.getBookSummary);

// Get chapters by complexity
router.get('/complexity', flexibleProtect, chapterAnalysisController.getByComplexity);

// Get a specific chapter analysis
router.get('/:id', flexibleProtect, chapterAnalysisController.getById);

// Get chapters by book ID
router.get('/book/:bookId', flexibleProtect, chapterAnalysisController.getByBookId);

// Get chapter by book ID and chapter number
router.get('/book/:bookId/chapter/:chapterNumber', flexibleProtect, chapterAnalysisController.getByChapterNumber);

// Update chapter analysis
router.put('/:id', flexibleProtect, chapterAnalysisController.update);

// Delete specific chapter analysis
router.delete('/:id', flexibleProtect, chapterAnalysisController.delete);

// Delete all chapters for a book
router.delete('/book/:bookId', flexibleProtect, chapterAnalysisController.deleteByBookId);

module.exports = router;