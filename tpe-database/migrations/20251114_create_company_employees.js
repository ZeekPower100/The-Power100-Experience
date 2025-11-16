// DATABASE-CHECKED: All field names verified against TPE naming conventions November 14, 2025
// ================================================================
// Migration: Create Company Employees Table
// Date: November 14, 2025
// Purpose: Track contractor employees for CEO PCR feedback collection
// ================================================================

const { query } = require('../../tpe-backend/src/config/database');

async function up() {
  console.log('Creating company_employees table...');

  await query(`
    CREATE TABLE IF NOT EXISTS company_employees (
      id SERIAL PRIMARY KEY,

      -- Contractor Linkage (DATABASE-CHECKED: contractors.id exists)
      contractor_id INTEGER NOT NULL REFERENCES contractors(id) ON DELETE CASCADE,

      -- Employee Information
      first_name VARCHAR(100) NOT NULL,
      last_name VARCHAR(100) NOT NULL,
      email VARCHAR(255) NOT NULL,
      phone VARCHAR(20),

      -- Job Details
      department VARCHAR(100),
      role_title VARCHAR(100),
      hire_date DATE,
      termination_date DATE,
      is_active BOOLEAN DEFAULT true,

      -- Communication Preferences
      sms_opt_in BOOLEAN DEFAULT true,
      email_opt_in BOOLEAN DEFAULT true,

      -- Survey Tracking
      last_survey_sent DATE,
      last_survey_completed DATE,
      total_surveys_completed INTEGER DEFAULT 0,

      -- Metadata
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),

      -- Constraints
      CONSTRAINT unique_employee_email UNIQUE(contractor_id, email)
    )
  `);

  console.log('Creating indexes for company_employees...');

  await query(`
    CREATE INDEX IF NOT EXISTS idx_employees_contractor
    ON company_employees(contractor_id)
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_employees_active
    ON company_employees(is_active)
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_employees_email
    ON company_employees(email)
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_employees_contractor_active
    ON company_employees(contractor_id, is_active)
  `);

  console.log('Adding comments to company_employees table...');

  await query(`
    COMMENT ON TABLE company_employees IS 'Stores contractor employees for CEO PCR feedback surveys'
  `);

  await query(`
    COMMENT ON COLUMN company_employees.contractor_id IS 'Links to contractors.id'
  `);

  await query(`
    COMMENT ON COLUMN company_employees.is_active IS 'False when employee is terminated'
  `);

  await query(`
    COMMENT ON COLUMN company_employees.sms_opt_in IS 'SMS survey reminders enabled'
  `);

  await query(`
    COMMENT ON COLUMN company_employees.email_opt_in IS 'Email survey invitations enabled'
  `);

  console.log('✅ company_employees table created successfully');
}

async function down() {
  console.log('Dropping company_employees table...');

  await query(`DROP TABLE IF EXISTS company_employees CASCADE`);

  console.log('✅ company_employees table dropped');
}

module.exports = { up, down };

// Run migration if executed directly
if (require.main === module) {
  up()
    .then(() => {
      console.log('Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}
