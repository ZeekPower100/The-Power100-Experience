const express = require('express');
const router = express.Router();
const multer = require('multer');
const aiConciergeController = require('../controllers/aiConciergeController');
const { flexibleProtect } = require('../middleware/flexibleAuth');

// Configure multer for memory storage (no permanent files)
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 25 * 1024 * 1024 // 25MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept images, audio, and documents
    const allowedMimes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/webm',
      'application/pdf', 'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];

    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Supported: images, audio, PDF, Word documents'));
    }
  }
});

/**
 * @route   GET /api/ai-concierge/access-status
 * @desc    Check if contractor has access to AI Concierge
 * @access  Protected
 */
router.get('/access-status', flexibleProtect, aiConciergeController.checkAccess);

/**
 * @route   GET /api/ai-concierge/conversations
 * @desc    Get conversation history for authenticated contractor
 * @access  Protected
 */
router.get('/conversations', flexibleProtect, aiConciergeController.getConversations);

/**
 * @route   POST /api/ai-concierge/message
 * @desc    Send a message to AI Concierge (with optional media)
 * @access  Protected
 */
router.post('/message', flexibleProtect, upload.single('media'), aiConciergeController.sendMessage);

/**
 * @route   DELETE /api/ai-concierge/conversations
 * @desc    Clear all conversation history for authenticated contractor
 * @access  Protected
 */
router.delete('/conversations', flexibleProtect, aiConciergeController.clearConversations);

/**
 * @route   GET /api/ai-concierge/session/:session_id?
 * @desc    Get or create a session
 * @access  Protected
 */
router.get('/session/:session_id?', flexibleProtect, aiConciergeController.getSession);

/**
 * @route   POST /api/ai-concierge/session/:session_id/end
 * @desc    End a session
 * @access  Protected
 */
router.post('/session/:session_id/end', flexibleProtect, aiConciergeController.endSession);

// Development test routes
if (process.env.NODE_ENV === 'development') {
  router.get('/test', (req, res) => {
    res.json({
      success: true,
      message: 'AI Concierge API is working',
      environment: process.env.NODE_ENV,
      endpoints: [
        'GET /api/ai-concierge/access-status',
        'GET /api/ai-concierge/conversations',
        'POST /api/ai-concierge/message',
        'DELETE /api/ai-concierge/conversations',
        'GET /api/ai-concierge/session/:session_id?',
        'POST /api/ai-concierge/session/:session_id/end'
      ]
    });
  });

  // Test knowledge base loading
  router.get('/test-knowledge', aiConciergeController.testKnowledgeBase);
}

module.exports = router;