const express = require('express');
const router = express.Router();
const contractorChallengesController = require('../controllers/contractorChallengesController');
const { flexibleProtect: authenticateToken } = require('../middleware/flexibleAuth');

// All routes require authentication
router.use(authenticateToken);

// POST / - create challenge
router.post('/', contractorChallengesController.create);

// GET /contractor/:contractorId - get all challenges
router.get('/contractor/:contractorId', contractorChallengesController.getByContractorId);

// GET /:id - get single challenge
router.get('/:id', contractorChallengesController.getById);

// PUT /:id - update challenge
router.put('/:id', contractorChallengesController.update);

// PUT /:id/resolve - resolve challenge
router.put('/:id/resolve', contractorChallengesController.resolve);

// DELETE /:id - delete challenge
router.delete('/:id', contractorChallengesController.delete);

// GET /contractor/:contractorId/unresolved - get unresolved
router.get('/contractor/:contractorId/unresolved', contractorChallengesController.getUnresolved);

// PUT /:id/solution - add attempted solution
router.put('/:id/solution', contractorChallengesController.addSolution);

module.exports = router;