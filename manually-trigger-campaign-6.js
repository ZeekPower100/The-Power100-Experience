// Manually trigger campaign 6 processing after schema fixes
require('dotenv').config({ path: './tpe-backend/.env.development' });
const powerCardsIntegrationService = require('./tpe-backend/src/services/powerCardsIntegrationService');
const { query } = require('./tpe-backend/src/config/database');

(async () => {
  try {
    const campaignId = 6;

    console.log(`\n🔧 Manually triggering processCampaignCompletion for campaign ${campaignId}...`);
    console.log(`This simulates what Phase 2 auto-trigger should do.\n`);

    // Process campaign
    const result = await powerCardsIntegrationService.processCampaignCompletion(campaignId);

    console.log('✅ Campaign processing complete!');
    console.log('Result:', JSON.stringify(result, null, 2));

    // Update status to completed (what auto-trigger does)
    await query(`
      UPDATE power_card_campaigns
      SET status = 'completed', updated_at = NOW()
      WHERE id = $1
    `, [campaignId]);

    console.log('\n✅ Campaign status updated to "completed"');

    // Check final status
    const campaignResult = await query(`
      SELECT id, campaign_name, total_responses, status
      FROM power_card_campaigns
      WHERE id = $1
    `, [campaignId]);

    console.log('\n📊 Final Campaign Status:');
    console.log(campaignResult.rows[0]);

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
})();
