const express = require('express');
const router = express.Router();
const { submitEventFeedback } = require('../controllers/eventFeedbackController');

// Public anonymous endpoint — no auth (rate-limited via the global /api/ limiter).
// Used by power100.io/grosso-closers-camp-2026-feedback/ + future event-feedback forms.
router.post('/', submitEventFeedback);

module.exports = router;
