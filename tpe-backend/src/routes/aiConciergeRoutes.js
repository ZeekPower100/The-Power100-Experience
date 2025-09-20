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

  // Schema discovery endpoints
  router.get('/schema/discover', async (req, res) => {
    try {
      const schemaDiscovery = require('../services/schemaDiscoveryService');
      const schema = await schemaDiscovery.discoverSchema();
      res.json({
        success: true,
        tablesDiscovered: Object.keys(schema).length,
        schema
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  router.get('/schema/summary', async (req, res) => {
    try {
      const schemaDiscovery = require('../services/schemaDiscoveryService');
      const summary = await schemaDiscovery.getSchemaSummary();
      res.json({
        success: true,
        summary
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  router.get('/schema/ai-relevant', async (req, res) => {
    try {
      const schemaDiscovery = require('../services/schemaDiscoveryService');
      const relevantSchema = await schemaDiscovery.getAIRelevantSchema();
      res.json({
        success: true,
        tablesRelevant: Object.keys(relevantSchema).length,
        schema: relevantSchema
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // Force refresh schema cache
  router.post('/schema/refresh', async (req, res) => {
    try {
      const schemaDiscovery = require('../services/schemaDiscoveryService');
      const schema = await schemaDiscovery.forceRefresh();
      res.json({
        success: true,
        message: 'Schema cache refreshed',
        tablesDiscovered: Object.keys(schema).length,
        refreshedAt: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });
}

module.exports = router;