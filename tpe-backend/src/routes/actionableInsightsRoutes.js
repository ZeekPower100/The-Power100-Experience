const express = require('express');
const router = express.Router();
const actionableInsightsController = require('../controllers/actionableInsightsController');
const { flexibleProtect } = require('../middleware/flexibleAuth');

// Create actionable insight
router.post('/', flexibleProtect, actionableInsightsController.create);

// Get insight stats
router.get('/stats', flexibleProtect, actionableInsightsController.getStats);

// Get quick wins
router.get('/quick-wins', flexibleProtect, actionableInsightsController.getQuickWins);

// Get a specific actionable insight
router.get('/:id', flexibleProtect, actionableInsightsController.getById);

// Get insights by book ID
router.get('/book/:bookId', flexibleProtect, actionableInsightsController.getByBookId);

// Get insights by chapter analysis ID
router.get('/chapter/:chapterAnalysisId', flexibleProtect, actionableInsightsController.getByChapterAnalysisId);

// Get insights by type
router.get('/type/:type', flexibleProtect, actionableInsightsController.getByType);

// Get insights by difficulty
router.get('/difficulty/:difficulty', flexibleProtect, actionableInsightsController.getByDifficulty);

// Get insights by ROI
router.get('/roi/:roi', flexibleProtect, actionableInsightsController.getByROI);

// Get insights by focus area
router.get('/focus-area/:focusArea', flexibleProtect, actionableInsightsController.getByFocusArea);

// Update actionable insight
router.put('/:id', flexibleProtect, actionableInsightsController.update);

// Delete actionable insight
router.delete('/:id', flexibleProtect, actionableInsightsController.delete);

module.exports = router;