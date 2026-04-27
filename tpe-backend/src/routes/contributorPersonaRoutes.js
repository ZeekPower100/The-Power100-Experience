const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/contributorPersonaController');

// Single endpoint — no auth middleware (HMAC bridge verified in controller)
router.post('/ask', ctrl.ask);

module.exports = router;
