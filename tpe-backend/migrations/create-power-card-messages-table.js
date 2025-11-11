// Migration: Create power_card_messages table
// Purpose: Track all PowerCard email and SMS communications
// Pattern: Following event_messages architecture for consistency

const { query } = require('../src/config/database');

async function up() {
  console.log('Creating power_card_messages table...');

  await query(`
    CREATE TABLE IF NOT EXISTS power_card_messages (
      id SERIAL PRIMARY KEY,
      campaign_id INTEGER REFERENCES power_card_campaigns(id),
      recipient_id INTEGER REFERENCES power_card_recipients(id),
      message_type VARCHAR(100) NOT NULL,
      direction VARCHAR(50) DEFAULT 'outbound',
      channel VARCHAR(50) NOT NULL,
      scheduled_time TIMESTAMP,
      actual_send_time TIMESTAMP,
      personalization_data JSONB,
      recipient_email VARCHAR(255),
      recipient_phone VARCHAR(50),
      message_content TEXT,
      status VARCHAR(50) DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      sent_at TIMESTAMP
    )
  `);

  console.log('Creating indexes...');

  await query(`
    CREATE INDEX IF NOT EXISTS idx_power_card_messages_campaign
    ON power_card_messages(campaign_id)
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_power_card_messages_recipient
    ON power_card_messages(recipient_id)
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_power_card_messages_status
    ON power_card_messages(status)
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_power_card_messages_channel
    ON power_card_messages(channel)
  `);

  console.log('✅ power_card_messages table created successfully');
}

async function down() {
  console.log('Dropping power_card_messages table...');

  await query(`DROP TABLE IF EXISTS power_card_messages CASCADE`);

  console.log('✅ power_card_messages table dropped');
}

// Run migration if called directly
if (require.main === module) {
  (async () => {
    try {
      await up();
      process.exit(0);
    } catch (error) {
      console.error('Migration failed:', error);
      process.exit(1);
    }
  })();
}

module.exports = { up, down };
