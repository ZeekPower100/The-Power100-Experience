// Test Event Message Queue
// Send a test message to verify BullMQ + outboundScheduler integration

const { scheduleEventMessage } = require('./tpe-backend/src/queues/eventMessageQueue');
const { query } = require('./tpe-backend/src/config/database');

async function testEventMessage() {
  console.log('🧪 Testing Event Message Queue System...\n');

  try {
    // Get test contractor
    const contractorResult = await query(`
      SELECT id, phone, name, email
      FROM contractors
      WHERE phone = $1
    `, ['+18108934075']);

    if (contractorResult.rows.length === 0) {
      console.error('❌ Test contractor not found (phone: 18108934075)');
      process.exit(1);
    }

    const contractor = contractorResult.rows[0];
    console.log('✅ Found test contractor:', contractor.name);

    // Create test message in database
    const messageResult = await query(`
      INSERT INTO event_messages (
        event_id,
        contractor_id,
        message_type,
        message_category,
        scheduled_time,
        message_content,
        personalization_data,
        phone,
        status,
        direction,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, NOW() + INTERVAL '10 seconds', $5, $6, $7, 'scheduled', 'outbound', NOW(), NOW())
      RETURNING id, scheduled_time
    `, [
      41, // Event ID (Business Growth Expo)
      contractor.id,
      'test_message',
      'test',
      'Hi {firstName}! This is a test message from the Event Message Queue system. If you receive this, BullMQ + outboundScheduler integration is working! 🎉',
      JSON.stringify({
        test: true,
        timestamp: new Date().toISOString()
      }),
      contractor.phone
    ]);

    const message = messageResult.rows[0];
    console.log('✅ Created test message in database (ID:', message.id + ')');
    console.log('📅 Scheduled for:', message.scheduled_time);

    // Schedule message in BullMQ
    const job = await scheduleEventMessage({
      id: message.id,
      event_id: 41,
      contractor_id: contractor.id,
      message_type: 'test_message',
      message_category: 'test',
      scheduled_time: message.scheduled_time,
      message_content: 'Hi {firstName}! This is a test message from the Event Message Queue system. If you receive this, BullMQ + outboundScheduler integration is working! 🎉',
      personalization_data: JSON.stringify({
        test: true,
        timestamp: new Date().toISOString()
      }),
      phone: contractor.phone,
      ghl_contact_id: null,
      ghl_location_id: null
    });

    console.log('✅ Message scheduled in BullMQ (Job ID:', job.id + ')');
    console.log('\n📱 Message will be sent to', contractor.phone, 'in ~10 seconds');
    console.log('\n⏳ Make sure the event message worker is running:');
    console.log('   node tpe-backend/src/workers/eventMessageWorker.js');
    console.log('\n👀 Watch for:');
    console.log('   1. Worker log: "Processing message..."');
    console.log('   2. SMS received on phone');
    console.log('   3. Database updated: status = "sent"');

    // Check message status after 15 seconds
    setTimeout(async () => {
      const statusResult = await query(`
        SELECT id, status, actual_send_time, error_message
        FROM event_messages
        WHERE id = $1
      `, [message.id]);

      const updatedMessage = statusResult.rows[0];
      console.log('\n📊 Message Status After 15s:');
      console.log('   Status:', updatedMessage.status);
      console.log('   Sent At:', updatedMessage.actual_send_time || 'Not sent yet');

      if (updatedMessage.error_message) {
        console.log('   Error:', updatedMessage.error_message);
      }

      if (updatedMessage.status === 'sent') {
        console.log('\n✅ TEST PASSED! Message sent successfully!');
      } else if (updatedMessage.status === 'failed') {
        console.log('\n❌ TEST FAILED! Message failed to send.');
      } else {
        console.log('\n⏳ Still processing... Check worker logs.');
      }

      process.exit(0);
    }, 15000);

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testEventMessage();
