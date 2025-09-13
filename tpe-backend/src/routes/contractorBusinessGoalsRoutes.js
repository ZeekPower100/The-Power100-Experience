const express = require('express');
const router = express.Router();
const contractorBusinessGoalsController = require('../controllers/contractorBusinessGoalsController');
const { flexibleProtect: authenticateToken } = require('../middleware/flexibleAuth');

// All routes require authentication
router.use(authenticateToken);

// POST / - create goal
router.post('/', contractorBusinessGoalsController.create);

// GET /contractor/:contractorId - get all goals for contractor
router.get('/contractor/:contractorId', contractorBusinessGoalsController.getByContractorId);

// GET /:id - get single goal
router.get('/:id', contractorBusinessGoalsController.getById);

// PUT /:id - update goal
router.put('/:id', contractorBusinessGoalsController.update);

// PUT /:id/progress - update progress
router.put('/:id/progress', contractorBusinessGoalsController.updateProgress);

// DELETE /:id - delete goal
router.delete('/:id', contractorBusinessGoalsController.delete);

// GET /contractor/:contractorId/incomplete - get incomplete goals
router.get('/contractor/:contractorId/incomplete', contractorBusinessGoalsController.getIncomplete);

module.exports = router;