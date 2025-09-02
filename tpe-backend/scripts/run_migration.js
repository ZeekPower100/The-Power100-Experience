const fs = require('fs');
const path = require('path');
const { connectDB, query } = require('../src/config/database');

async function runMigration() {
  try {
    console.log('🚀 Running comprehensive onboarding fields migration...');
    
    // Connect to database
    await connectDB();
    
    // Individual ALTER TABLE statements
    const alterStatements = [
      // Company Information
      "ALTER TABLE strategic_partners ADD COLUMN established_year TEXT",
      "ALTER TABLE strategic_partners ADD COLUMN employee_count TEXT",
      "ALTER TABLE strategic_partners ADD COLUMN ownership_type TEXT",
      "ALTER TABLE strategic_partners ADD COLUMN company_description TEXT",
      
      // CEO Contact
      "ALTER TABLE strategic_partners ADD COLUMN ceo_contact_name TEXT",
      "ALTER TABLE strategic_partners ADD COLUMN ceo_contact_email TEXT",
      "ALTER TABLE strategic_partners ADD COLUMN ceo_contact_phone TEXT",
      "ALTER TABLE strategic_partners ADD COLUMN ceo_contact_title TEXT",
      
      // CX Contact
      "ALTER TABLE strategic_partners ADD COLUMN cx_contact_name TEXT",
      "ALTER TABLE strategic_partners ADD COLUMN cx_contact_email TEXT",
      "ALTER TABLE strategic_partners ADD COLUMN cx_contact_phone TEXT",
      "ALTER TABLE strategic_partners ADD COLUMN cx_contact_title TEXT",
      
      // Sales Contact
      "ALTER TABLE strategic_partners ADD COLUMN sales_contact_name TEXT",
      "ALTER TABLE strategic_partners ADD COLUMN sales_contact_email TEXT",
      "ALTER TABLE strategic_partners ADD COLUMN sales_contact_phone TEXT",
      "ALTER TABLE strategic_partners ADD COLUMN sales_contact_title TEXT",
      
      // Onboarding Contact
      "ALTER TABLE strategic_partners ADD COLUMN onboarding_contact_name TEXT",
      "ALTER TABLE strategic_partners ADD COLUMN onboarding_contact_email TEXT",
      "ALTER TABLE strategic_partners ADD COLUMN onboarding_contact_phone TEXT",
      "ALTER TABLE strategic_partners ADD COLUMN onboarding_contact_title TEXT",
      
      // Marketing Contact
      "ALTER TABLE strategic_partners ADD COLUMN marketing_contact_name TEXT",
      "ALTER TABLE strategic_partners ADD COLUMN marketing_contact_email TEXT",
      "ALTER TABLE strategic_partners ADD COLUMN marketing_contact_phone TEXT",
      "ALTER TABLE strategic_partners ADD COLUMN marketing_contact_title TEXT",
      
      // Target Audience
      "ALTER TABLE strategic_partners ADD COLUMN target_revenue_audience TEXT",
      "ALTER TABLE strategic_partners ADD COLUMN service_areas TEXT",
      "ALTER TABLE strategic_partners ADD COLUMN service_areas_other TEXT",
      
      // Competitive Analysis
      "ALTER TABLE strategic_partners ADD COLUMN service_category TEXT",
      "ALTER TABLE strategic_partners ADD COLUMN value_proposition TEXT",
      "ALTER TABLE strategic_partners ADD COLUMN why_clients_choose_you TEXT",
      "ALTER TABLE strategic_partners ADD COLUMN why_clients_choose_competitors TEXT",
      
      // Business Focus
      "ALTER TABLE strategic_partners ADD COLUMN focus_areas_12_months TEXT",
      
      // Technology Stack
      "ALTER TABLE strategic_partners ADD COLUMN tech_stack_crm TEXT",
      "ALTER TABLE strategic_partners ADD COLUMN tech_stack_project_management TEXT",
      "ALTER TABLE strategic_partners ADD COLUMN tech_stack_communication TEXT",
      "ALTER TABLE strategic_partners ADD COLUMN tech_stack_analytics TEXT",
      "ALTER TABLE strategic_partners ADD COLUMN tech_stack_marketing TEXT",
      "ALTER TABLE strategic_partners ADD COLUMN tech_stack_financial TEXT",
      
      // Marketing & Partnership
      "ALTER TABLE strategic_partners ADD COLUMN sponsored_events TEXT",
      "ALTER TABLE strategic_partners ADD COLUMN podcast_appearances TEXT",
      "ALTER TABLE strategic_partners ADD COLUMN books_read_recommended TEXT",
      "ALTER TABLE strategic_partners ADD COLUMN best_working_partnerships TEXT",
      
      // Client Demos & References
      "ALTER TABLE strategic_partners ADD COLUMN client_demos TEXT",
      "ALTER TABLE strategic_partners ADD COLUMN client_references TEXT",
      "ALTER TABLE strategic_partners ADD COLUMN employee_references TEXT"
    ];
    
    let successCount = 0;
    let skipCount = 0;
    
    for (const statement of alterStatements) {
      try {
        await query(statement);
        const fieldName = statement.match(/ADD COLUMN (\w+)/i)?.[1];
        console.log('✅ Added field:', fieldName);
        successCount++;
      } catch (error) {
        if (error.message.includes('duplicate column name')) {
          const fieldName = statement.match(/ADD COLUMN (\w+)/i)?.[1];
          console.log('⏭️  Field already exists:', fieldName);
          skipCount++;
        } else {
          console.error('❌ Error:', error.message);
        }
      }
    }
    
    // Set default empty JSON arrays for array fields
    console.log('\n🔧 Setting default values...');
    const updateStatements = [
      "UPDATE strategic_partners SET target_revenue_audience = '[]' WHERE target_revenue_audience IS NULL",
      "UPDATE strategic_partners SET service_areas = '[]' WHERE service_areas IS NULL", 
      "UPDATE strategic_partners SET focus_areas_12_months = '[]' WHERE focus_areas_12_months IS NULL",
      "UPDATE strategic_partners SET tech_stack_crm = '[]' WHERE tech_stack_crm IS NULL",
      "UPDATE strategic_partners SET tech_stack_project_management = '[]' WHERE tech_stack_project_management IS NULL",
      "UPDATE strategic_partners SET tech_stack_communication = '[]' WHERE tech_stack_communication IS NULL",
      "UPDATE strategic_partners SET tech_stack_analytics = '[]' WHERE tech_stack_analytics IS NULL",
      "UPDATE strategic_partners SET tech_stack_marketing = '[]' WHERE tech_stack_marketing IS NULL",
      "UPDATE strategic_partners SET tech_stack_financial = '[]' WHERE tech_stack_financial IS NULL",
      "UPDATE strategic_partners SET sponsored_events = '[]' WHERE sponsored_events IS NULL",
      "UPDATE strategic_partners SET podcast_appearances = '[]' WHERE podcast_appearances IS NULL",
      "UPDATE strategic_partners SET client_demos = '[]' WHERE client_demos IS NULL",
      "UPDATE strategic_partners SET client_references = '[]' WHERE client_references IS NULL"
    ];
    
    for (const statement of updateStatements) {
      try {
        await query(statement);
      } catch (error) {
        console.log('⚠️  Update error:', error.message);
      }
    }
    
    console.log(`\n✅ Migration complete! Added ${successCount} fields, skipped ${skipCount} existing fields.`);
    
    // Verify fields exist for New Life Bruh
    console.log('\n🔍 Verifying New Life Bruh (ID 22) has new fields available:');
    const testQuery = `
      SELECT 
        id,
        company_name,
        established_year,
        ceo_contact_name,
        target_revenue_audience,
        tech_stack_crm
      FROM strategic_partners 
      WHERE id = 22 
      LIMIT 1
    `;
    
    const result = await query(testQuery);
    if (result.rows && result.rows[0]) {
      const partner = result.rows[0];
      console.log('- ID:', partner.id);
      console.log('- Company:', partner.company_name);
      console.log('- Established Year:', partner.established_year || 'NULL (ready for data)');
      console.log('- CEO Contact:', partner.ceo_contact_name || 'NULL (ready for data)');
      console.log('- Target Revenue:', partner.target_revenue_audience || 'NULL (ready for data)');
      console.log('- Tech Stack CRM:', partner.tech_stack_crm || 'NULL (ready for data)');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();