const { Pool } = require('pg');

// Function to generate memorable SMS code from event name
function generateSMSCode(name, date, id) {
  // Remove common words
  const stopWords = ['the', 'a', 'an', 'and', 'or', 'of', 'in', 'on', 'at', 'to', 'for', 'with'];

  // Clean the name: remove non-alphanumeric except spaces
  let cleanName = name.replace(/[^A-Za-z0-9 ]/g, '');

  // Split into words and filter out stop words and numbers
  const words = cleanName.split(/\s+/)
    .filter(word => word.length > 0)
    .filter(word => !stopWords.includes(word.toLowerCase()))
    .filter(word => !/^\d+$/.test(word)); // Remove pure numbers

  // Extract first letter of each word
  const acronym = words.map(word => word[0].toUpperCase()).join('');

  // Add year or ID
  const year = date ? new Date(date).getFullYear().toString() : id.toString().padStart(2, '0');

  // Combine: acronym + year (max 20 chars)
  let code = (acronym + year).substring(0, 20);

  return code;
}

async function updateSMSCodes(isProduction = false) {
  const pool = new Pool(isProduction ? {
    host: 'tpe-database-production.cmtcsi0kytrf.us-east-1.rds.amazonaws.com',
    database: 'tpedb',
    user: 'tpeadmin',
    password: 'dBP0wer100!!',
    port: 5432,
    ssl: { rejectUnauthorized: false }
  } : {
    host: 'localhost',
    database: 'tpedb',
    user: 'postgres',
    password: 'TPXP0stgres!!',
    port: 5432
  });

  try {
    console.log(`\n${isProduction ? 'PRODUCTION' : 'LOCAL DEV'} Database:`);
    console.log('='.repeat(50));

    // Get all events
    const result = await pool.query('SELECT id, name, date FROM events ORDER BY id');

    // Generate codes and check for duplicates
    const codeMap = new Map();
    const updates = [];

    for (const event of result.rows) {
      let code = generateSMSCode(event.name, event.date, event.id);

      // Handle duplicates by adding ID suffix
      if (codeMap.has(code)) {
        code = code.substring(0, 18) + event.id.toString().padStart(2, '0');
      }

      codeMap.set(code, event.id);
      updates.push({ id: event.id, name: event.name, code });

      console.log(`ID ${event.id}: "${event.name}" → ${code}`);
    }

    // Update database
    console.log('\nUpdating database...');
    for (const update of updates) {
      await pool.query(
        'UPDATE events SET sms_event_code = $1 WHERE id = $2',
        [update.code, update.id]
      );
    }

    console.log(`✅ Updated ${updates.length} events`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

// Run for both local dev and production
async function main() {
  console.log('🔄 Generating Memorable SMS Event Codes');
  console.log('='.repeat(50));

  // Local dev first
  await updateSMSCodes(false);

  // Then production
  await updateSMSCodes(true);

  console.log('\n✅ All done!');
}

main();
