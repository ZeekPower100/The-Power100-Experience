const express = require('express');
const router = express.Router();
const {
  createShowGuestToken,
  getShowGuestByToken,
  submitShowGuestForm
} = require('../controllers/showGuestController');

// Admin creates a token + pending contributor row for a show guest
router.post('/create-token', createShowGuestToken);

// Public form-load (prefill by token)
router.get('/token/:token', getShowGuestByToken);

// Public form-submit
router.post('/token/:token/submit', submitShowGuestForm);

module.exports = router;
