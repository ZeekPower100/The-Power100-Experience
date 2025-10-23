/**
 * Test Check-In Reminder Email
 * Tests the sendCheckInReminderNightBefore function
 */

const emailScheduler = require('./tpe-backend/src/services/eventOrchestrator/emailScheduler');

async function testCheckInEmail() {
  try {
    console.log('🧪 Testing Check-In Reminder Email...\n');

    const eventId = 48; // Business Growth Expo: LIVE TEST
    const contractorId = 56; // zeek@power100.io

    console.log(`Event ID: ${eventId}`);
    console.log(`Contractor ID: ${contractorId}`);
    console.log(`Email: zeek@power100.io\n`);

    console.log('📧 Sending "Night Before" check-in reminder email...\n');

    await emailScheduler.sendCheckInReminderNightBefore(eventId, contractorId);

    console.log('\n✅ Email sent successfully!');
    console.log('📬 Check your inbox at zeek@power100.io\n');

    process.exit(0);

  } catch (error) {
    console.error('❌ Error sending test email:', error);
    process.exit(1);
  }
}

testCheckInEmail();
