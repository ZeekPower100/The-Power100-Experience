/**
 * Update Event 56 timing to start in 10 minutes with same accelerated schedule
 */

const { execSync } = require('child_process');

// Calculate new times
const now = new Date();
const eventStartTime = new Date(now.getTime() + (10 * 60 * 1000)); // 10 minutes from now
const eventEndTime = new Date(eventStartTime.getTime() + (18 * 60 * 1000)); // 18 minutes later

// Format for PostgreSQL
const eventDate = eventStartTime.toISOString().split('T')[0]; // YYYY-MM-DD
const startTimeStr = eventStartTime.toTimeString().split(' ')[0]; // HH:MM:SS
const endTimeStr = eventEndTime.toTimeString().split(' ')[0]; // HH:MM:SS

console.log('🕐 Current time:', now.toLocaleTimeString());
console.log('🚀 Event will start:', eventStartTime.toLocaleTimeString(), '(in 10 minutes)');
console.log('🏁 Event will end:', eventEndTime.toLocaleTimeString(), '(18 minutes later)');
console.log('');

// Update event_days
const updateSql = `UPDATE event_days SET day_date = '${eventDate}', start_time = '${startTimeStr}', end_time = '${endTimeStr}' WHERE event_id = 56;`;

console.log('📝 Updating event_days...');
try {
  const result = execSync(`".\\quick-db.bat" "${updateSql}"`, {
    encoding: 'utf8',
    shell: 'cmd.exe'
  });
  console.log(result);
  console.log('✅ Event timing updated successfully!');
  console.log('');
  console.log('📋 Event Schedule:');
  console.log(`   Start: ${eventStartTime.toLocaleTimeString()}`);
  console.log(`   End: ${eventEndTime.toLocaleTimeString()}`);
  console.log(`   Duration: 18 minutes (accelerated)`);
} catch (error) {
  console.error('❌ Error updating event timing:', error.message);
  process.exit(1);
}
