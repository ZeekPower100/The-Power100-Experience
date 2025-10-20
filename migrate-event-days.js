/**
 * Migration: Add event_days table for multi-day event timing support
 * Purpose: Handle events with different start/end times per day
 * Date: 2025-10-20
 */

const { execSync } = require('child_process');

function runQuery(sql) {
  // Collapse SQL to single line and remove extra whitespace
  const singleLineSql = sql.replace(/\s+/g, ' ').trim();
  console.log(`   Executing: ${singleLineSql.substring(0, 80)}...`);
  try {
    const result = execSync(`".\\quick-db.bat" "${singleLineSql}"`, {
      encoding: 'utf8',
      shell: 'cmd.exe'
    });
    console.log(result);
    return result;
  } catch (error) {
    console.error('Query error:', error.stderr || error.message);
    throw error;
  }
}

function main() {
  console.log('🚀 Starting event_days table migration\n');
  console.log('=' .repeat(60));
  console.log('');

  // Create event_days table
  console.log('📊 Creating event_days table...');
  runQuery(`
    CREATE TABLE IF NOT EXISTS event_days (
      id SERIAL PRIMARY KEY,
      event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      day_date DATE NOT NULL,
      start_time TIME NOT NULL,
      end_time TIME NOT NULL,
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(event_id, day_date)
    );
  `);

  // Create indexes
  console.log('📑 Creating indexes...');
  runQuery('CREATE INDEX IF NOT EXISTS idx_event_days_event_id ON event_days(event_id);');
  runQuery('CREATE INDEX IF NOT EXISTS idx_event_days_date ON event_days(day_date);');

  // Add comments
  console.log('📝 Adding table comments...');
  runQuery(`COMMENT ON TABLE event_days IS 'Stores daily timing information for events. Supports multi-day events with variable start/end times per day.';`);
  runQuery(`COMMENT ON COLUMN event_days.day_date IS 'The specific date for this event day';`);
  runQuery(`COMMENT ON COLUMN event_days.start_time IS 'Event start time for this day (e.g., 09:00:00)';`);
  runQuery(`COMMENT ON COLUMN event_days.end_time IS 'Event end time for this day (e.g., 17:00:00)';`);
  runQuery(`COMMENT ON COLUMN event_days.notes IS 'Optional notes about this specific day (e.g., Registration opens at 8 AM)';`);

  console.log('');
  console.log('=' .repeat(60));
  console.log('\n✅ MIGRATION COMPLETE!');
  console.log('\n📊 event_days table structure:');
  console.log('   - id: Primary key');
  console.log('   - event_id: Foreign key to events table');
  console.log('   - day_date: Specific date for this event day');
  console.log('   - start_time: Event start time (e.g., 09:00:00)');
  console.log('   - end_time: Event end time (e.g., 17:00:00)');
  console.log('   - notes: Optional day-specific notes');
  console.log('   - created_at, updated_at: Timestamps');
  console.log('\n💡 Usage Examples:');
  console.log('\n   Single-day event:');
  console.log(`   INSERT INTO event_days (event_id, day_date, start_time, end_time)`);
  console.log(`   VALUES (1, '2025-10-20', '09:00:00', '17:00:00');`);
  console.log('\n   Multi-day event (different times):');
  console.log(`   INSERT INTO event_days (event_id, day_date, start_time, end_time) VALUES`);
  console.log(`   (2, '2025-11-01', '08:00:00', '18:00:00'),`);
  console.log(`   (2, '2025-11-02', '09:00:00', '17:00:00'),`);
  console.log(`   (2, '2025-11-03', '10:00:00', '15:00:00');`);
}

try {
  main();
} catch (error) {
  console.error('\n❌ Migration failed:', error.message);
  process.exit(1);
}
