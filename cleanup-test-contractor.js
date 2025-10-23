/**
 * Cleanup Test Contractor Event Data
 * Removes all event-related data for test contractor to prepare for fresh testing
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'tpe-backend', '.env.development') });

const { query } = require('./tpe-backend/src/config/database');

const TEST_PHONE = '+18108934075';

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
  magenta: '\x1b[35m'
};

function log(emoji, color, message) {
  console.log(`${colors[color]}${emoji} ${message}${colors.reset}`);
}

function section(title) {
  console.log('\n' + '='.repeat(80));
  log('📋', 'bright', title.toUpperCase());
  console.log('='.repeat(80));
}

async function cleanup() {
  try {
    section('Finding Test Contractor');

    // Find contractor
    const contractor = await query(`
      SELECT id, first_name, last_name, email, phone, company_name
      FROM contractors
      WHERE phone = $1
    `, [TEST_PHONE]);

    if (contractor.rows.length === 0) {
      log('❌', 'red', `No contractor found with phone: ${TEST_PHONE}`);
      process.exit(1);
    }

    const contractorData = contractor.rows[0];
    const contractorId = contractorData.id;

    log('✅', 'green', `Found contractor: ${contractorData.first_name} ${contractorData.last_name}`);
    log('📧', 'blue', `  Email: ${contractorData.email}`);
    log('📱', 'blue', `  Phone: ${contractorData.phone}`);
    log('🆔', 'blue', `  ID: ${contractorId}`);

    section('Checking Existing Event Data');

    // Check event_attendees
    const attendees = await query(`
      SELECT ea.id, ea.event_id, e.name as event_name, ea.registration_date, ea.check_in_time
      FROM event_attendees ea
      LEFT JOIN events e ON ea.event_id = e.id
      WHERE ea.contractor_id = $1
    `, [contractorId]);

    log('📊', 'blue', `Event Attendee Records: ${attendees.rows.length}`);
    attendees.rows.forEach(a => {
      log('  📅', 'yellow', `  Event: ${a.event_name || 'Unknown'} (ID: ${a.event_id})`);
      log('  🕒', 'yellow', `    Registered: ${a.registration_date || 'N/A'}`);
      log('  ✅', 'yellow', `    Checked in: ${a.check_in_time || 'Not checked in'}`);
    });

    // Check event_messages
    const messages = await query(`
      SELECT id, event_id, message_type, channel, status, scheduled_time, created_at
      FROM event_messages
      WHERE contractor_id = $1
      ORDER BY created_at DESC
    `, [contractorId]);

    log('📊', 'blue', `Event Message Records: ${messages.rows.length}`);
    if (messages.rows.length > 0) {
      const byType = {};
      messages.rows.forEach(m => {
        byType[m.message_type] = (byType[m.message_type] || 0) + 1;
      });
      Object.entries(byType).forEach(([type, count]) => {
        log('  📨', 'yellow', `  ${type}: ${count}`);
      });
    }

    // Check event_peer_matches
    const peerMatches = await query(`
      SELECT COUNT(*) as count FROM event_peer_matches
      WHERE contractor1_id = $1 OR contractor2_id = $1
    `, [contractorId]);

    log('📊', 'blue', `Event Peer Match Records: ${peerMatches.rows[0].count}`);

    // Check event_pcr_scores
    const pcrScores = await query(`
      SELECT COUNT(*) as count FROM event_pcr_scores WHERE contractor_id = $1
    `, [contractorId]);

    log('📊', 'blue', `PCR Score Records: ${pcrScores.rows[0].count}`);

    // Check event_notes
    const eventNotes = await query(`
      SELECT COUNT(*) as count FROM event_notes WHERE contractor_id = $1
    `, [contractorId]);

    log('📊', 'blue', `Event Note Records: ${eventNotes.rows[0].count}`);

    section('Cleaning Up Event Data');

    let totalDeleted = 0;

    // Delete event_pcr_scores
    const deletedPCR = await query(`
      DELETE FROM event_pcr_scores WHERE contractor_id = $1
    `, [contractorId]);
    const pcrCount = deletedPCR.rowCount || 0;
    totalDeleted += pcrCount;
    log('🗑️', 'yellow', `Deleted ${pcrCount} PCR score records`);

    // Delete event_peer_matches
    const deletedPeers = await query(`
      DELETE FROM event_peer_matches
      WHERE contractor1_id = $1 OR contractor2_id = $1
    `, [contractorId]);
    const peerCount = deletedPeers.rowCount || 0;
    totalDeleted += peerCount;
    log('🗑️', 'yellow', `Deleted ${peerCount} event peer match records`);

    // Delete event_notes
    const deletedNotes = await query(`
      DELETE FROM event_notes WHERE contractor_id = $1
    `, [contractorId]);
    const notesCount = deletedNotes.rowCount || 0;
    totalDeleted += notesCount;
    log('🗑️', 'yellow', `Deleted ${notesCount} event note records`);

    // Delete event_messages
    const deletedMessages = await query(`
      DELETE FROM event_messages WHERE contractor_id = $1
    `, [contractorId]);
    const msgCount = deletedMessages.rowCount || 0;
    totalDeleted += msgCount;
    log('🗑️', 'yellow', `Deleted ${msgCount} event message records`);

    // Delete event_attendees (must be last due to foreign keys)
    const deletedAttendees = await query(`
      DELETE FROM event_attendees WHERE contractor_id = $1
    `, [contractorId]);
    const attendeeCount = deletedAttendees.rowCount || 0;
    totalDeleted += attendeeCount;
    log('🗑️', 'yellow', `Deleted ${attendeeCount} event attendee records`);

    section('Verification');

    // Verify cleanup
    const verification = await query(`
      SELECT
        (SELECT COUNT(*) FROM event_attendees WHERE contractor_id = $1) as attendees,
        (SELECT COUNT(*) FROM event_messages WHERE contractor_id = $1) as messages,
        (SELECT COUNT(*) FROM event_pcr_scores WHERE contractor_id = $1) as pcr_scores,
        (SELECT COUNT(*) FROM event_peer_matches WHERE contractor1_id = $1 OR contractor2_id = $1) as peers,
        (SELECT COUNT(*) FROM event_notes WHERE contractor_id = $1) as notes
    `, [contractorId]);

    const counts = verification.rows[0];
    const allClean = Object.values(counts).every(count => parseInt(count) === 0);

    if (allClean) {
      log('✅', 'green', 'ALL EVENT DATA CLEANED SUCCESSFULLY!');
      log('📊', 'blue', 'Verification counts:');
      log('  📅', 'blue', `  Event Attendees: ${counts.attendees}`);
      log('  📨', 'blue', `  Event Messages: ${counts.messages}`);
      log('  📊', 'blue', `  PCR Scores: ${counts.pcr_scores}`);
      log('  👥', 'blue', `  Peer Matches: ${counts.peers}`);
      log('  📝', 'blue', `  Event Notes: ${counts.notes}`);
    } else {
      log('⚠️', 'yellow', 'Some records may still exist:');
      Object.entries(counts).forEach(([key, count]) => {
        if (parseInt(count) > 0) {
          log('  ❌', 'red', `  ${key}: ${count}`);
        }
      });
    }

    section('Summary');
    log('🗑️', 'magenta', `Total Records Deleted: ${totalDeleted}`);
    log('✅', 'green', `Contractor ${contractorData.first_name} ${contractorData.last_name} is ready for fresh event testing!`);
    log('📱', 'blue', `Phone: ${TEST_PHONE}`);
    log('🆔', 'blue', `Contractor ID: ${contractorId}`);

    console.log('\n');
    log('🎯', 'bright', 'READY FOR LIVE EVENT ORCHESTRATION TEST!');
    console.log('\n');

    process.exit(0);

  } catch (error) {
    log('❌', 'red', `Cleanup failed: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

cleanup();
