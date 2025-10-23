/**
 * Complete Orchestration Flow Test
 * Tests the full journey: Registration → Check-In → Personalized Agenda + ALL 7 Message Schedulers
 */

const axios = require('axios');

const API_BASE = 'http://localhost:5000/api';
let ADMIN_TOKEN = '';

async function login() {
  console.log('🔐 Step 1: Logging in as admin...');
  const response = await axios.post(`${API_BASE}/auth/login`, {
    email: 'admin@power100.io',
    password: 'admin123'
  });
  ADMIN_TOKEN = response.data.token;
  console.log('✅ Logged in successfully\n');
}

async function registerContractor() {
  console.log('👤 Step 2: Registering zeek@power100.io for Event 56...');
  console.log('   This should trigger check-in reminder scheduling automatically\n');

  const response = await axios.post(`${API_BASE}/event-check-in/register`, {
    event_id: 56,
    email: 'zeek@power100.io',
    phone: '+12814607827',
    first_name: 'Zeek',
    last_name: 'Test',
    sms_opt_in: true,
    email_opt_in: true
  }, {
    headers: { Authorization: `Bearer ${ADMIN_TOKEN}` }
  });

  console.log('✅ Contractor registered successfully');
  console.log('   Response:', JSON.stringify(response.data, null, 2));
  console.log('');
}

async function checkInContractor() {
  console.log('🚪 Step 3: Checking in zeek@power100.io...');
  console.log('   This should trigger:');
  console.log('   - AI orchestration (personalized agenda generation)');
  console.log('   - ALL 7 message schedulers:');
  console.log('     1. Welcome message (immediate)');
  console.log('     2. Speaker alerts (15 min before sessions)');
  console.log('     3. Sponsor recommendations (2 min after each break)');
  console.log('     4. Peer introductions (5 min after lunch)');
  console.log('     5. PCR requests (7 min after sessions)');
  console.log('     6. Sponsor batch check (at event end)');
  console.log('     7. Overall event PCR (1 hour after event)\n');

  const response = await axios.post(`${API_BASE}/event-check-in/check-in`, {
    event_id: 56,
    contractor_id: 56,
    check_in_method: 'self_service'
  }, {
    headers: { Authorization: `Bearer ${ADMIN_TOKEN}` }
  });

  console.log('✅ Check-in successful');
  console.log('   Response:', JSON.stringify(response.data, null, 2));
  console.log('');
}

async function verifyScheduledMessages() {
  console.log('📊 Step 4: Verifying scheduled messages...\n');

  const { execSync } = require('child_process');

  const result = execSync(`".\\quick-db.bat" "SELECT message_type, scheduled_time, status FROM event_messages WHERE event_id = 56 AND contractor_id = 56 ORDER BY scheduled_time;"`, {
    encoding: 'utf8',
    shell: 'cmd.exe'
  });

  console.log(result);
}

async function main() {
  try {
    console.log('🚀 Starting Complete Orchestration Flow Test\n');
    console.log('=' .repeat(70));
    console.log('');

    await login();
    await registerContractor();

    console.log('⏰ Waiting 3 seconds before check-in...\n');
    await new Promise(resolve => setTimeout(resolve, 3000));

    await checkInContractor();
    await verifyScheduledMessages();

    console.log('=' .repeat(70));
    console.log('\n✅ TEST SETUP COMPLETE!');
    console.log('\n📋 Event Details:');
    console.log('   - Event ID: 56');
    console.log('   - Event Name: Business Growth Expo 2025');
    console.log('   - Start Time: ~10 minutes from registration (2:59 PM)');
    console.log('   - Duration: 18 minutes (accelerated)');
    console.log('   - End Time: ~3:17 PM');
    console.log('\n👤 Test Contractor:');
    console.log('   - Email: zeek@power100.io');
    console.log('   - Phone: +12814607827');
    console.log('   - Status: Checked In ✅');
    console.log('\n🤖 What Should Happen:');
    console.log('   - Welcome message should be sent immediately');
    console.log('   - All messages scheduled based on agenda timing');
    console.log('   - eventMessageWorker will process at scheduled times');
    console.log('   - Watch SMS on zeek\'s phone for real-time delivery');
    console.log('\n📱 Monitor Progress:');
    console.log('   - Backend logs: tail -f tpe-backend/backend-live.log');
    console.log('   - Worker logs: Check BullMQ processing');
    console.log('   - Database: Run query above to see scheduled_time vs actual_send_time');

  } catch (error) {
    console.error('\n❌ Error:', error.response?.data || error.message);
    if (error.response?.data?.stack) {
      console.error('\nStack:', error.response.data.stack);
    }
    process.exit(1);
  }
}

main();
