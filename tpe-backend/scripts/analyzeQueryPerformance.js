// DATABASE-CHECKED: pg_stat_statements verified
/**
 * Query Performance Analyzer
 * Identifies slow queries and suggests optimizations
 */

const { query } = require('../src/config/database');

async function analyzeQueryPerformance() {
  console.log('🔍 Analyzing Query Performance...\n');
  console.log('='.repeat(60));

  try {
    // Enable pg_stat_statements if not already enabled
    console.log('\n📊 Checking pg_stat_statements extension...');
    try {
      await query('CREATE EXTENSION IF NOT EXISTS pg_stat_statements');
      console.log('✅ pg_stat_statements extension enabled');
    } catch (error) {
      console.log('ℹ️  pg_stat_statements may already be enabled or unavailable');
      console.log('   Note: This extension requires superuser privileges or pre-configuration');
    }

    // Find slowest queries
    console.log('\n📊 Analyzing Top 10 Slowest Queries...\n');
    try {
      const slowQueries = await query(`
        SELECT
          substring(query from 1 for 100) as short_query,
          calls,
          total_exec_time,
          mean_exec_time,
          max_exec_time
        FROM pg_stat_statements
        WHERE query NOT LIKE '%pg_stat_statements%'
        ORDER BY mean_exec_time DESC
        LIMIT 10
      `);

      if (slowQueries.rows.length > 0) {
        slowQueries.rows.forEach((row, index) => {
          console.log(`${index + 1}. ${row.short_query}...`);
          console.log(`   Calls: ${row.calls}`);
          console.log(`   Mean time: ${parseFloat(row.mean_exec_time).toFixed(2)}ms`);
          console.log(`   Max time: ${parseFloat(row.max_exec_time).toFixed(2)}ms`);
          console.log('');
        });
      } else {
        console.log('   No query statistics available yet.');
        console.log('   Run some queries to populate pg_stat_statements data.\n');
      }
    } catch (error) {
      console.log('⚠️  Could not retrieve slow query stats');
      console.log(`   Reason: ${error.message}`);
      console.log('   This is normal if pg_stat_statements is not enabled.\n');
    }

    // Check missing indexes
    console.log('='.repeat(60));
    console.log('\n🔎 Analyzing Tables with High Sequential Scans...\n');

    const missingIndexes = await query(`
      SELECT
        schemaname,
        tablename,
        seq_scan,
        seq_tup_read,
        idx_scan,
        CASE
          WHEN seq_scan > 0 THEN seq_tup_read / seq_scan
          ELSE 0
        END as avg_seq_read
      FROM pg_stat_user_tables
      WHERE seq_scan > 0
        AND schemaname = 'public'
      ORDER BY seq_scan DESC
      LIMIT 10
    `);

    if (missingIndexes.rows.length > 0) {
      missingIndexes.rows.forEach(row => {
        const indexRatio = row.idx_scan && row.seq_scan
          ? (row.idx_scan / (row.idx_scan + row.seq_scan) * 100).toFixed(1)
          : 0;

        console.log(`  Table: ${row.tablename}`);
        console.log(`  Sequential scans: ${row.seq_scan}`);
        console.log(`  Index scans: ${row.idx_scan || 0}`);
        console.log(`  Avg rows per scan: ${parseInt(row.avg_seq_read) || 0}`);
        console.log(`  Index usage: ${indexRatio}%`);

        if (parseFloat(indexRatio) < 50 && row.seq_scan > 100) {
          console.log(`  ⚠️  Consider adding indexes - low index usage with high scan count`);
        }
        console.log('');
      });
    } else {
      console.log('   No sequential scan data available yet.\n');
    }

    // Check current indexes
    console.log('='.repeat(60));
    console.log('\n📋 Current Indexes on Key Tables...\n');

    const indexes = await query(`
      SELECT
        tablename,
        indexname,
        indexdef
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND tablename IN ('ai_concierge_sessions', 'contractor_event_registrations', 'contractors')
      ORDER BY tablename, indexname
    `);

    if (indexes.rows.length > 0) {
      let currentTable = '';
      indexes.rows.forEach(row => {
        if (row.tablename !== currentTable) {
          if (currentTable !== '') console.log('');
          console.log(`  Table: ${row.tablename}`);
          currentTable = row.tablename;
        }
        console.log(`    - ${row.indexname}`);
      });
      console.log('');
    } else {
      console.log('   No indexes found on key tables.\n');
    }

    // Recommendations
    console.log('='.repeat(60));
    console.log('\n💡 Optimization Recommendations:\n');
    console.log('1. Add indexes for frequently queried columns');
    console.log('   - ai_concierge_sessions: contractor_id, session_status, started_at');
    console.log('   - contractor_event_registrations: contractor_id, event_status, event_date');
    console.log('');
    console.log('2. Consider partial indexes for common WHERE conditions');
    console.log('   - WHERE session_status = \'active\'');
    console.log('   - WHERE started_at > NOW() - INTERVAL \'24 hours\'');
    console.log('');
    console.log('3. Use INCLUDE clause for covering indexes');
    console.log('   - Include frequently selected columns in index');
    console.log('');
    console.log('4. Run ANALYZE after index creation to update query planner stats');
    console.log('');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('\n❌ Analysis Error:', error.message);
    console.log('\nNote: Some features require database privileges or extensions.');
  }
}

analyzeQueryPerformance()
  .then(() => {
    console.log('\n✅ Query performance analysis complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  });
