// DATABASE-CHECKED: No database operations
// State Machine Diagram API Routes

const express = require('express');
const router = express.Router();
const { generateMermaidDiagram, getMachineMetadata } = require('../services/stateMachineDiagramGenerator');

/**
 * GET /api/state-machine/diagram
 * Generate Mermaid diagram from current state machine configuration
 */
router.get('/diagram', (req, res) => {
  try {
    const diagram = generateMermaidDiagram();
    res.json({
      success: true,
      diagram
    });
  } catch (error) {
    console.error('[StateMachine] Error generating diagram:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate diagram',
      message: error.message
    });
  }
});

/**
 * GET /api/state-machine/metadata
 * Get state machine metadata (states, events, guards)
 */
router.get('/metadata', (req, res) => {
  try {
    const metadata = getMachineMetadata();
    res.json({
      success: true,
      metadata
    });
  } catch (error) {
    console.error('[StateMachine] Error getting metadata:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get metadata',
      message: error.message
    });
  }
});

module.exports = router;
