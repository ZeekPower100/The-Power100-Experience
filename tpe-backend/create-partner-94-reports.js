// Generate Executive Summary Reports for Partner 94 (TechFlow Solutions)
const path = require('path');
const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env.development';
require('dotenv').config({ path: path.join(__dirname, envFile) });

const reportService = require('./src/services/reportGenerationService');

async function createReportsForPartner94() {
  console.log('📊 Generating Executive Summary Reports for Partner 94 (TechFlow Solutions)...\n');

  try {
    // Generate Q3 2025 Report
    console.log('Creating Q3 2025 Executive Summary...');
    const q3Report = await reportService.generateExecutiveReport(
      94, // partnerId
      null, // campaignId - uses latest completed
      null  // generatedBy
    );
    console.log('✅ Q3 2025 Report Created - ID:', q3Report.report_id);

    // Generate Q4 2025 Report
    console.log('\nCreating Q4 2025 Executive Summary...');
    const q4Report = await reportService.generateExecutiveReport(
      94, // partnerId
      null, // campaignId - uses latest completed
      null  // generatedBy
    );
    console.log('✅ Q4 2025 Report Created - ID:', q4Report.report_id);

    console.log('\n🎉 Successfully created 2 executive summary reports for Partner 94!');
    console.log('\nYou can now log in as demo@techflow.com and view these reports in the Reports tab.');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating reports:', error.message);
    process.exit(1);
  }
}

createReportsForPartner94();
