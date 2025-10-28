// Test Partner Profile Completeness Check
const { checkPartnerProfileCompleteness } = require('./src/services/eventOrchestrator/eventRegistrationService');

async function testPartnerProfileCompleteness() {
  console.log('🧪 Testing Partner Profile Completeness Check\n');
  console.log('='.repeat(60));

  // Test partners with known incomplete profiles
  const testPartnerIds = [2, 3, 5, 94]; // MarketPro, FieldForce, Test Logo, TechFlow Solutions

  for (const partnerId of testPartnerIds) {
    console.log(`\n📋 Testing Partner ID: ${partnerId}`);
    console.log('-'.repeat(60));

    try {
      const result = await checkPartnerProfileCompleteness(partnerId);

      console.log(`Exists: ${result.exists ? '✅ YES' : '❌ NO'}`);
      console.log(`Profile Complete: ${result.isComplete ? '✅ YES' : '❌ NO'}`);

      if (result.exists && result.partner) {
        console.log(`\nPartner Details:`);
        console.log(`  - Company: ${result.partner.company_name}`);
        console.log(`  - Email: ${result.partner.primary_email || 'MISSING'}`);
        console.log(`  - Contact: ${result.partner.primary_contact || 'MISSING'}`);
        console.log(`  - Description: ${result.partner.company_description ? 'OK' : 'MISSING'}`);
        console.log(`  - Value Prop: ${result.partner.value_proposition ? 'OK' : 'MISSING'}`);
        console.log(`  - Focus Areas: ${result.partner.focus_areas && result.partner.focus_areas !== '[]' ? 'OK' : 'MISSING'}`);
        console.log(`  - Service Areas: ${result.partner.service_areas && result.partner.service_areas !== '[]' ? 'OK' : 'MISSING'}`);
        console.log(`  - Target Revenue: ${result.partner.target_revenue_audience ? 'OK' : 'MISSING'}`);
        console.log(`  - Differentiators: ${result.partner.key_differentiators || result.partner.ai_generated_differentiators ? 'OK' : 'MISSING'}`);

        if (!result.isComplete) {
          console.log(`\n⚠️  INCOMPLETE - Would trigger profile completion email`);
        } else {
          console.log(`\n✅ COMPLETE - No email needed`);
        }
      }
    } catch (error) {
      console.error(`❌ Error testing partner ${partnerId}:`, error.message);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ Test complete!\n');
  process.exit(0);
}

testPartnerProfileCompleteness().catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});
