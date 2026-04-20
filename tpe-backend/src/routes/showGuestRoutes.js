const express = require('express');
const router = express.Router();
const {
  createShowGuestToken,
  getShowGuestByToken,
  submitShowGuestForm,
  submitShowGuestFormPublic,
  uploadShowGuestHeadshot,
  uploadShowGuestPublicHeadshot,
  createShowGuestDelegate
} = require('../controllers/showGuestController');
const {
  uploadShowGuestHeadshotMiddleware,
  uploadShowGuestPublicHeadshotMiddleware
} = require('../middleware/fileUpload');

// Admin creates a token + pending contributor row for a show guest
router.post('/create-token', createShowGuestToken);

// Public form-load (prefill by token — used by the delegate flow)
router.get('/token/:token', getShowGuestByToken);

// Public form-submit via delegation token (UPDATEs existing row)
router.post('/token/:token/submit', submitShowGuestForm);

// Public form-submit, no token (INSERT a new row OR update by email match)
router.post('/submit', submitShowGuestFormPublic);

// Public delegate-request: guest kicks off delegation from the main form
router.post('/delegate/create', createShowGuestDelegate);

// Public headshot upload via delegation token — field name "headshot"
router.post(
  '/token/:token/upload-headshot',
  uploadShowGuestHeadshotMiddleware.single('headshot'),
  uploadShowGuestHeadshot
);

// Public headshot upload, no token — field name "headshot"
router.post(
  '/upload-headshot',
  uploadShowGuestPublicHeadshotMiddleware.single('headshot'),
  uploadShowGuestPublicHeadshot
);

module.exports = router;
