const { execSync } = require('child_process');

function runQuery(sql) {
  const singleLineSql = sql.replace(/\s+/g, ' ').trim();
  try {
    const result = execSync(`".\\quick-db.bat" "${singleLineSql}"`, {
      encoding: 'utf8',
      shell: 'cmd.exe'
    });
    return result;
  } catch (error) {
    console.error('Query error:', error.message);
    return null;
  }
}

console.log('🔍 Checking PCR messages for Event 56\n');

console.log('📊 All scheduled messages for event 56:');
runQuery('SELECT id, contractor_id, message_type, channel, scheduled_time, status FROM event_messages WHERE event_id = 56 ORDER BY scheduled_time;');

console.log('\n📊 PCR-specific messages:');
runQuery("SELECT id, contractor_id, message_type, channel, scheduled_time, status FROM event_messages WHERE event_id = 56 AND message_type LIKE '%pcr%' ORDER BY scheduled_time;");

console.log('\n📅 Agenda items for event 56:');
runQuery('SELECT id, item_type, title, start_time FROM event_agenda_items WHERE event_id = 56 AND item_type = \'session\' ORDER BY start_time;');
