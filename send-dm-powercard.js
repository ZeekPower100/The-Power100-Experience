/**
 * Send Destination Motivation PowerCard to Test Contractor
 *
 * Usage: node send-dm-powercard.js
 */

require('dotenv').config({ path: './tpe-backend/.env.development' });
const { query } = require('./tpe-backend/src/config/database');
const powerCardService = require('./tpe-backend/src/services/powerCardService');

async function sendDMPowerCard() {
  console.log('🚀 Sending Destination Motivation PowerCard...\n');

  try {
    // Config
    const CAMPAIGN_ID = 1;  // Q1 2025 PowerConfidence Survey (Destination Motivation)
    const TEMPLATE_ID = 3;  // Destination Motivation template
    const PARTNER_ID = 1;   // Destination Motivation
    const CONTRACTOR_ID = 56; // Zeek Co
    const PHONE = '+18108934075';
    const NAME = 'Brandon Roacho';
    const EMAIL = 'brandon@zeekco.test'; // placeholder

    // Step 1: Check if recipient already exists for this campaign
    console.log('📋 Checking existing recipients...');
    const existingResult = await query(`
      SELECT id, survey_link, status
      FROM power_card_recipients
      WHERE campaign_id = $1 AND recipient_phone = $2
    `, [CAMPAIGN_ID, PHONE]);

    let surveyLink;
    let recipientId;

    if (existingResult.rows.length > 0) {
      const existing = existingResult.rows[0];
      console.log(`✅ Recipient already exists (ID: ${existing.id}, Status: ${existing.status})`);
      surveyLink = existing.survey_link;
      recipientId = existing.id;

      // Reset status to pending if already sent
      if (existing.status !== 'pending') {
        await query(`UPDATE power_card_recipients SET status = 'pending' WHERE id = $1`, [existing.id]);
        console.log('🔄 Reset recipient status to pending');
      }
    } else {
      // Step 2: Add recipient to campaign
      console.log('➕ Adding new recipient...');
      const recipients = [{
        recipient_type: 'contractor_client',
        recipient_id: CONTRACTOR_ID,
        recipient_email: EMAIL,
        recipient_name: NAME,
        recipient_phone: PHONE,
        company_id: CONTRACTOR_ID,
        company_type: 'contractor',
        revenue_tier: 'test'
      }];

      const added = await powerCardService.addRecipients(CAMPAIGN_ID, TEMPLATE_ID, recipients);
      console.log(`✅ Added recipient:`, added[0]);
      surveyLink = added[0].survey_link;
      recipientId = added[0].id;
    }

    // Step 3: Send notifications
    console.log('\n📤 Sending notifications...');
    const result = await powerCardService.sendCampaignNotifications(CAMPAIGN_ID, PARTNER_ID);

    console.log('\n✅ COMPLETE!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📱 SMS Sent: ${result.smsSent}`);
    console.log(`📧 Emails Sent: ${result.emailsSent}`);
    console.log(`👥 Total Recipients: ${result.totalRecipients}`);
    console.log(`🔗 Survey Link: ${surveyLink}`);
    console.log(`🌐 Full URL: ${process.env.FRONTEND_URL || 'http://localhost:3002'}/power-cards/survey/${surveyLink}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    if (result.communicationErrors?.length > 0) {
      console.log('\n⚠️  Errors:', result.communicationErrors);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  }

  process.exit(0);
}

sendDMPowerCard();
