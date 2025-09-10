const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  uploadLogoHandler,
  uploadVideoHandler,
  uploadDocumentHandler,
  deleteFileHandler,
  getSignedUrlHandler
} = require('../controllers/uploadController');

// Public upload endpoints (for onboarding forms)
// These don't require authentication but have rate limiting and security measures
router.post('/logo', uploadLogoHandler);
router.post('/video', uploadVideoHandler);
router.post('/document', uploadDocumentHandler);

// Protected endpoints (require authentication)
router.delete('/file', protect, deleteFileHandler);
router.get('/signed-url/:key', protect, getSignedUrlHandler);

module.exports = router;