// Migration: Add recipient_phone to power_card_recipients
// Purpose: Enable SMS notifications for PowerCard survey invitations

const { query } = require('../src/config/database');

async function up() {
  console.log('Adding recipient_phone column to power_card_recipients...');

  await query(`
    ALTER TABLE power_card_recipients
    ADD COLUMN IF NOT EXISTS recipient_phone VARCHAR(50)
  `);

  console.log('✅ recipient_phone column added successfully');
}

async function down() {
  console.log('Removing recipient_phone column from power_card_recipients...');

  await query(`
    ALTER TABLE power_card_recipients
    DROP COLUMN IF EXISTS recipient_phone
  `);

  console.log('✅ recipient_phone column removed');
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
