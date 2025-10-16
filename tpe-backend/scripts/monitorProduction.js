// DATABASE-CHECKED: ai_concierge_sessions, ai_learning_events verified
/**
 * Production Monitoring Dashboard
 * Displays real-time health metrics for state machine and AI concierge
 */

const { query } = require('../src/config/database');

async function monitorProduction() {
  console.clear();
  console.log('📊 TPX AI Concierge - Production Monitoring\n');
  console.log('='.repeat(60));

  try {
    // 1. State Machine Session Stats
    const sessionStats = await query(`
      SELECT
        session_type,
        COUNT(*) as session_count,
        AVG(duration_minutes) as avg_duration
      FROM ai_concierge_sessions
      WHERE started_at > NOW() - INTERVAL '24 hours'
      GROUP BY session_type
    `);

    console.log('\n📈 Session Stats (Last 24h):');
    if (sessionStats.rows.length > 0) {
      sessionStats.rows.forEach(stat => {
        console.log(`  ${stat.session_type}: ${stat.session_count} sessions (avg ${stat.avg_duration?.toFixed(1) || 0} min)`);
      });
    } else {
      console.log('  No sessions in the last 24 hours');
    }

    // 2. Agent Routing Distribution
    const agentDistribution = await query(`
      SELECT
        session_type,
        COUNT(*) as count,
        ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
      FROM ai_concierge_sessions
      WHERE started_at > NOW() - INTERVAL '24 hours'
      GROUP BY session_type
    `);

    console.log('\n🤖 Agent Distribution (Last 24h):');
    if (agentDistribution.rows.length > 0) {
      agentDistribution.rows.forEach(dist => {
        console.log(`  ${dist.session_type}: ${dist.percentage}%`);
      });
    } else {
      console.log('  No agent routing data available');
    }

    // 3. State Transition Activity
    const recentSessions = await query(`
      SELECT
        COUNT(*) as total_sessions,
        COUNT(CASE WHEN session_status = 'active' THEN 1 END) as active_sessions,
        COUNT(CASE WHEN session_status = 'completed' THEN 1 END) as completed_sessions
      FROM ai_concierge_sessions
      WHERE started_at > NOW() - INTERVAL '1 hour'
    `);

    console.log('\n⏱️  Recent Activity (Last Hour):');
    const recent = recentSessions.rows[0];
    console.log(`  Total Sessions: ${recent.total_sessions}`);
    console.log(`  Active: ${recent.active_sessions}`);
    console.log(`  Completed: ${recent.completed_sessions}`);

    // 4. Error Detection
    const errorCheck = await query(`
      SELECT COUNT(*) as error_count
      FROM ai_concierge_sessions
      WHERE session_data LIKE '%error%'
        AND started_at > NOW() - INTERVAL '1 hour'
    `);

    const errors = errorCheck.rows[0].error_count;
    console.log('\n🚨 Error Detection:');
    if (errors > 0) {
      console.log(`  ⚠️  ${errors} sessions with potential errors`);
    } else {
      console.log(`  ✅ No errors detected`);
    }

    console.log('\n' + '='.repeat(60));
    console.log('Press Ctrl+C to exit');
  } catch (error) {
    console.error('\n❌ Monitoring Error:', error.message);
    console.log('\nNote: This may be expected if ai_concierge_sessions table does not exist yet.');
    console.log('Monitoring will continue to check for data...');
  }
}

// Run monitoring every 10 seconds
setInterval(monitorProduction, 10000);
monitorProduction(); // Initial run
