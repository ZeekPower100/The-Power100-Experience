// DATABASE-CHECKED: ai_concierge_sessions verified
// State Machine Diagram API Routes

const express = require('express');
const router = express.Router();
const { generateMermaidDiagram, getMachineMetadata } = require('../services/stateMachineDiagramGenerator');
const { query } = require('../config/database');

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

/**
 * GET /api/state-machine/monitoring
 * Get production monitoring metrics for dashboard
 */
router.get('/monitoring', async (req, res) => {
  try {
    // 1. Session Stats (Last 24h)
    const sessionStats = await query(`
      SELECT
        session_type,
        COUNT(*) as session_count,
        AVG(duration_minutes) as avg_duration
      FROM ai_concierge_sessions
      WHERE started_at > NOW() - INTERVAL '24 hours'
      GROUP BY session_type
    `);

    // 2. Agent Routing Distribution (Last 24h)
    const agentDistribution = await query(`
      SELECT
        session_type,
        COUNT(*) as count,
        ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
      FROM ai_concierge_sessions
      WHERE started_at > NOW() - INTERVAL '24 hours'
      GROUP BY session_type
    `);

    // 3. Recent Activity (Last Hour)
    const recentSessions = await query(`
      SELECT
        COUNT(*) as total_sessions,
        COUNT(CASE WHEN session_status = 'active' THEN 1 END) as active_sessions,
        COUNT(CASE WHEN session_status = 'completed' THEN 1 END) as completed_sessions
      FROM ai_concierge_sessions
      WHERE started_at > NOW() - INTERVAL '1 hour'
    `);

    // 4. Error Detection (Last Hour)
    const errorCheck = await query(`
      SELECT COUNT(*) as error_count
      FROM ai_concierge_sessions
      WHERE session_data LIKE '%error%'
        AND started_at > NOW() - INTERVAL '1 hour'
    `);

    // 5. Total System Stats
    const totalStats = await query(`
      SELECT
        COUNT(*) as total_sessions,
        MIN(started_at) as first_session,
        MAX(started_at) as last_session
      FROM ai_concierge_sessions
    `);

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      metrics: {
        sessionStats: sessionStats.rows,
        agentDistribution: agentDistribution.rows,
        recentActivity: recentSessions.rows[0],
        errorCount: errorCheck.rows[0].error_count,
        totalStats: totalStats.rows[0]
      }
    });
  } catch (error) {
    console.error('[StateMachine] Error getting monitoring data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get monitoring data',
      message: error.message
    });
  }
});

module.exports = router;
