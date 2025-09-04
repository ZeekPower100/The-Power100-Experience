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

// All upload routes require authentication
router.use(protect);

// Upload endpoints
router.post('/logo', uploadLogoHandler);
router.post('/video', uploadVideoHandler);
router.post('/document', uploadDocumentHandler);

// Delete file
router.delete('/file', deleteFileHandler);

// Get signed URL for private access
router.get('/signed-url/:key', getSignedUrlHandler);

module.exports = router;