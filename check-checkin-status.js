const { execSync } = require('child_process');

const result = execSync(`".\\quick-db.bat" "SELECT contractor_id, check_in_status, check_in_time FROM event_attendees WHERE event_id = 56;"`, {
  encoding: 'utf8',
  shell: 'cmd.exe'
});

console.log('Check-in status for Event 56:');
console.log(result);
