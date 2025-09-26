const router = require('express').Router();
const eventMessageSchedulerController = require('../src/controllers/eventMessageSchedulerController');
const { adminOnly } = require('../src/middleware/auth');

/**
 * Event Message Scheduler Routes
 * Automated message processing and monitoring
 */

// Process scheduled messages (called by cron/n8n)
router.post('/process',
  eventMessageSchedulerController.processScheduledMessages
);

// CEO override - delay all messages
router.post('/delay',
  adminOnly,
  eventMessageSchedulerController.applyEventDelay
);

// Get message queue status
router.get('/status/:event_id',
  adminOnly,
  eventMessageSchedulerController.getMessageQueueStatus
);

// Get orchestration metrics
router.get('/metrics/:event_id',
  adminOnly,
  eventMessageSchedulerController.getOrchestrationMetrics
);

// Track SMS response (webhook)
router.post('/track-response',
  eventMessageSchedulerController.trackMessageResponse
);

module.exports = router;