const router = require('express').Router();
const eventOrchestratorController = require('../src/controllers/eventOrchestratorController');
const { adminOnly } = require('../src/middleware/auth');

/**
 * Event Orchestrator Routes
 * Real-time event engagement and learning system
 */

// Speaker alerts
router.post('/speaker-alert',
  adminOnly,
  eventOrchestratorController.sendSpeakerAlert
);

// Sponsor engagement
router.post('/sponsor-engagement',
  adminOnly,
  eventOrchestratorController.sendSponsorEngagement
);

// Peer connections
router.post('/peer-connection',
  adminOnly,
  eventOrchestratorController.createPeerConnection
);

// Auto-match peers
router.post('/auto-match-peers',
  adminOnly,
  eventOrchestratorController.autoMatchPeers
);

module.exports = router;