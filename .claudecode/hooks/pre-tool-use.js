/**
 * Pre-Tool-Use Hook for The Power100 Experience
 *
 * CRITICAL: This hook ensures database-first naming conventions are ALWAYS followed
 *
 * Triggers BEFORE any file creation or editing to remind Claude to:
 * 1. Check database schema FIRST using quick-db.bat
 * 2. Use EXACT snake_case column names from database
 * 3. Never assume field names - VERIFY in database
 * 4. Maintain 100% alignment between database, backend, and frontend
 *
 * This prevents the #1 cause of bugs: field name mismatches
 */

const fs = require('fs');
const path = require('path');

// Tools that modify files and need database alignment checks
const FILE_MODIFICATION_TOOLS = [
  'Write',
  'Edit',
  'MultiEdit',
  'NotebookEdit'
];

// File patterns that interact with database
const DATABASE_INTERACTION_PATTERNS = [
  /services\/.*\.js$/,           // Service files
  /controllers\/.*\.js$/,        // Controller files
  /models\/.*\.js$/,             // Model files
  /routes\/.*\.js$/,             // Route files
  /api\.ts$/,                    // Frontend API files
  /.*Form\.tsx$/,                // Form components
  /.*Page\.tsx$/,                // Page components that may interact with API
];

/**
 * Check if a file path is likely to interact with database
 */
function isLikelyDatabaseFile(filePath) {
  if (!filePath) return false;

  return DATABASE_INTERACTION_PATTERNS.some(pattern =>
    pattern.test(filePath)
  );
}

/**
 * Generate the reminder message
 */
function getDatabaseAlignmentReminder(toolName, filePath) {
  return `
╔════════════════════════════════════════════════════════════════════════╗
║  🔴 CRITICAL: DATABASE-FIRST NAMING CONVENTION CHECK REQUIRED          ║
╚════════════════════════════════════════════════════════════════════════╝

You are about to ${toolName === 'Write' ? 'CREATE' : 'EDIT'}: ${path.basename(filePath)}

⚠️  MANDATORY STEPS BEFORE PROCEEDING:

1️⃣  CHECK DATABASE SCHEMA FIRST:
   → Run: powershell -Command ".\\quick-db.bat \\"SELECT column_name FROM information_schema.columns WHERE table_name = 'TABLE_NAME' ORDER BY ordinal_position;\\""

2️⃣  USE EXACT COLUMN NAMES:
   → Database uses snake_case (event_id, contractor_id, pcr_type)
   → ALL code must match database EXACTLY
   → NEVER use camelCase for database fields

3️⃣  VERIFY FIELD NAMES:
   → Don't assume field names exist
   → Check information_schema.columns
   → Confirm spelling and exact format

4️⃣  MAINTAIN 100% ALIGNMENT:
   → Backend: Use exact database column names in queries
   → Frontend: Send exact field names in API calls
   → Types: Define interfaces with snake_case to match

✅ WHY THIS MATTERS:
   - 90% of bugs come from field name mismatches
   - "metadata" vs "personalization_data" = broken code
   - "messageType" vs "message_type" = validation errors
   - Database is THE SINGLE SOURCE OF TRUTH

📚 REFERENCE: CLAUDE.md lines 47-59 (DATABASE IS THE SOURCE OF TRUTH)

════════════════════════════════════════════════════════════════════════

🎯 ACTION REQUIRED: Confirm you have checked the database schema before proceeding.
`;
}

/**
 * Main hook function
 */
module.exports = async function preToolUse(context) {
  const { toolName, parameters } = context;

  // Check if this tool modifies files
  if (!FILE_MODIFICATION_TOOLS.includes(toolName)) {
    return; // Not a file modification tool, continue
  }

  // Get the file path from parameters
  const filePath = parameters.file_path || parameters.notebook_path;

  // Check if this file likely interacts with database
  if (!isLikelyDatabaseFile(filePath)) {
    return; // Not a database-related file, continue
  }

  // Extract table name hint from file path
  let tableHint = '';
  const fileName = path.basename(filePath, path.extname(filePath));

  // Try to extract entity name from common patterns
  const serviceMatch = fileName.match(/(.+)Service$/);
  const controllerMatch = fileName.match(/(.+)Controller$/);
  const formMatch = fileName.match(/(.+)Form$/);

  if (serviceMatch) {
    tableHint = ` (likely table: ${serviceMatch[1].toLowerCase()}s or ${serviceMatch[1].toLowerCase()})`;
  } else if (controllerMatch) {
    tableHint = ` (likely table: ${controllerMatch[1].toLowerCase()}s or ${controllerMatch[1].toLowerCase()})`;
  } else if (formMatch) {
    tableHint = ` (likely table: ${formMatch[1].toLowerCase()}s or ${formMatch[1].toLowerCase()})`;
  }

  // Display the reminder
  const reminder = getDatabaseAlignmentReminder(toolName, filePath);
  console.log(reminder);

  if (tableHint) {
    console.log(`💡 HINT: ${tableHint}\n`);
  }

  // Return the reminder to be displayed to the user
  return {
    message: `Database alignment check required for: ${path.basename(filePath)}`,
    details: reminder
  };
};