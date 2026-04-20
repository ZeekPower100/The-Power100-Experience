const express = require('express');
const router = express.Router();
const {
  createShowGuestToken,
  getShowGuestByToken,
  submitShowGuestForm,
  uploadShowGuestHeadshot
} = require('../controllers/showGuestController');
const { uploadShowGuestHeadshotMiddleware } = require('../middleware/fileUpload');

// Admin creates a token + pending contributor row for a show guest
router.post('/create-token', createShowGuestToken);

// Public form-load (prefill by token)
router.get('/token/:token', getShowGuestByToken);

// Public form-submit
router.post('/token/:token/submit', submitShowGuestForm);

// Public headshot upload — field name "headshot"
router.post(
  '/token/:token/upload-headshot',
  uploadShowGuestHeadshotMiddleware.single('headshot'),
  uploadShowGuestHeadshot
);

module.exports = router;
