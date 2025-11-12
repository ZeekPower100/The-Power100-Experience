// Setup and Test Quarterly PowerCard Communications
// Creates a test quarterly campaign and tests Email + SMS notifications

require('dotenv').config({ path: './tpe-backend/.env.development' });
const { query } = require('./tpe-backend/src/config/database');
const powerCardService = require('./tpe-backend/src/services/powerCardService');

async function setupAndTest() {
  console.log('\n🧪 Setup and Test: Quarterly PowerCard Communications (Email + SMS)\n');

  try {
    // Step 1: Create a PowerCard template for FieldForce (if doesn't exist)
    console.log('Step 1: Checking for PowerCard template...');

    let templateResult = await query(`
      SELECT id FROM power_card_templates
      WHERE partner_id = 3 AND partner_type = 'strategic_partner'
      ORDER BY id DESC
      LIMIT 1
    `);

    let templateId;
    if (templateResult.rows.length === 0) {
      console.log('   Creating new PowerCard template for FieldForce...');

      const templateData = {
        partner_id: 3,
        partner_type: 'strategic_partner',
        metric_1_name: 'Communication Quality',
        metric_1_question: 'How would you rate the quality and responsiveness of communication?',
        metric_1_type: 'rating',
        metric_2_name: 'Service Delivery',
        metric_2_question: 'How satisfied are you with the service delivery and execution?',
        metric_2_type: 'rating',
        metric_3_name: 'Value for Investment',
        metric_3_question: 'How would you rate the value you received for your investment?',
        metric_3_type: 'rating',
        include_satisfaction_score: true,
        include_recommendation_score: true,
        include_culture_questions: false
      };

      const template = await powerCardService.createTemplate(templateData);
      templateId = template.id;
      console.log(`   ✅ Template created: ID ${templateId}`);
    } else {
      templateId = templateResult.rows[0].id;
      console.log(`   ✅ Using existing template: ID ${templateId}`);
    }

    // Step 2: Create a quarterly campaign
    console.log('\nStep 2: Creating quarterly PowerCard campaign...');

    const now = new Date();
    const quarter = `Q${Math.floor(now.getMonth() / 3) + 1}`;
    const year = now.getFullYear();

    const campaignData = {
      campaign_name: `FieldForce Quarterly ${quarter} ${year} TEST`,
      quarter,
      year,
      start_date: now,
      end_date: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      reminder_date: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
      status: 'active'
    };

    const campaign = await powerCardService.createCampaign(campaignData);
    console.log(`   ✅ Campaign created: ${campaign.campaign_name} (ID: ${campaign.id})`);

    // Step 3: Add test recipients with phone numbers
    console.log('\nStep 3: Adding test recipients with phone numbers...');

    const recipients = [
      {
        recipient_type: 'contractor_client',
        recipient_id: null,
        recipient_email: 'broach@theskyisthelimitfunding.com',
        recipient_name: 'Brandon Roacho',
        recipient_phone: '+18108934075',
        company_id: 3,
        company_type: 'strategic_partner',
        revenue_tier: null
      }
    ];

    const recipientRecords = await powerCardService.addRecipients(
      campaign.id,
      templateId,
      recipients
    );

    console.log(`   ✅ Added ${recipientRecords.length} recipients`);

    // Update recipients with phone numbers
    for (const rec of recipientRecords) {
      await query(`
        UPDATE power_card_recipients
        SET recipient_phone = $1
        WHERE id = $2
      `, [recipients[0].recipient_phone, rec.id]);
    }

    // Update campaign total_sent count
    await query(`
      UPDATE power_card_campaigns
      SET total_sent = $1
      WHERE id = $2
    `, [recipientRecords.length, campaign.id]);

    // Step 4: Send notifications using the new method
    console.log('\nStep 4: Sending Email + SMS notifications...');
    console.log('-----------------------------------------------');

    const result = await powerCardService.sendCampaignNotifications(campaign.id, 3);

    // Step 5: Display results
    console.log('\n📊 Communication Results:');
    console.log(`   Campaign: ${campaign.campaign_name}`);
    console.log(`   Campaign ID: ${campaign.id}`);
    console.log(`   Total Recipients: ${result.totalRecipients}`);
    console.log(`   Emails Sent: ${result.emailsSent}`);
    console.log(`   SMS Sent: ${result.smsSent}`);

    if (result.communicationErrors && result.communicationErrors.length > 0) {
      console.log(`   ⚠️  Errors: ${result.communicationErrors.length}`);
      result.communicationErrors.forEach(err => {
        console.log(`      - ${err.recipient}: ${err.error}`);
      });
    }

    // Step 6: Verify database records
    console.log('\n📋 Database Verification:');

    const messagesResult = await query(`
      SELECT channel, status, COUNT(*) as count
      FROM power_card_messages
      WHERE campaign_id = $1
      GROUP BY channel, status
    `, [campaign.id]);

    console.log('   Messages logged:');
    messagesResult.rows.forEach(row => {
      console.log(`   - ${row.channel}: ${row.count} (${row.status})`);
    });

    const recipientsStatusResult = await query(`
      SELECT status, COUNT(*) as count
      FROM power_card_recipients
      WHERE campaign_id = $1
      GROUP BY status
    `, [campaign.id]);

    console.log('   Recipients status:');
    recipientsStatusResult.rows.forEach(row => {
      console.log(`   - ${row.status}: ${row.count}`);
    });

    // Step 7: Display survey link
    const surveyLinkResult = await query(`
      SELECT survey_link
      FROM power_card_recipients
      WHERE campaign_id = $1
      LIMIT 1
    `, [campaign.id]);

    if (surveyLinkResult.rows.length > 0) {
      const surveyUrl = `http://localhost:3002/power-cards/survey/${surveyLinkResult.rows[0].survey_link}`;
      console.log(`\n🔗 Survey Link: ${surveyUrl}`);
    }

    console.log('\n✅ Test Complete!');
    console.log('\nNext Steps:');
    console.log('1. Check your email at broach@theskyisthelimitfunding.com');
    console.log('2. Check your phone (810) 893-4075 for SMS');
    console.log('3. Both should have the PowerCard survey link');
    console.log('4. Click the survey link to verify it works\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

setupAndTest();
