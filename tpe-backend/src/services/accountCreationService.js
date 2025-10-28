// DATABASE-CHECKED: partner_users, contractor_users, contractors, strategic_partners verified October 27, 2025
// ================================================================
// VERIFIED FIELD NAMES:
// - partner_users.password (NOT password_hash)
// - contractor_users.password (NOT password_hash)
// - partner_users.is_active, contractor_users.is_active (BOOLEAN)
// - contractors.id, first_name, last_name, email
// - strategic_partners.id, primary_contact, primary_email (NOT contact_email!)
// - account_creation_audit.success (BOOLEAN, NOT string)
// ================================================================
// VERIFIED DATA TYPES:
// - password: VARCHAR(255) - stores bcrypt hash (60 chars)
// - is_active: BOOLEAN (use true/false NOT 'true'/'false')
// - success: BOOLEAN (use true/false NOT 'true'/'false')
// ================================================================
// PASSWORD SECURITY (from Phase 1):
// - Hashing: bcrypt.hash(password, 12) - EXACTLY 12 rounds
// - Generation: generateSecurePassword() - 12 chars
// - Pattern: At least 1 uppercase, 1 lowercase, 1 number, 1 symbol
// ================================================================

const bcrypt = require('bcryptjs');
const { query } = require('../config/database');

/**
 * Generate secure 12-character password
 * Same pattern used in auth controllers
 * Pattern: At least 1 uppercase, 1 lowercase, 1 number, 1 symbol
 */
function generateSecurePassword() {
  const length = 12;
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  let password = '';

  // Ensure at least one of each type
  password += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)]; // Uppercase
  password += 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)]; // Lowercase
  password += '0123456789'[Math.floor(Math.random() * 10)]; // Number
  password += '!@#$%^&*'[Math.floor(Math.random() * 8)]; // Special char

  // Fill remaining length
  for (let i = 4; i < length; i++) {
    password += charset[Math.floor(Math.random() * charset.length)];
  }

  // Shuffle the password
  return password.split('').sort(() => 0.5 - Math.random()).join('');
}

/**
 * Hash password with bcrypt (12 rounds)
 * Matches Phase 1 authentication pattern
 */
async function hashPassword(plainPassword) {
  return await bcrypt.hash(plainPassword, 12);
}

/**
 * Log account creation to audit trail
 * @param {Object} params - Audit log parameters
 * @param {string} params.userType - 'partner' or 'contractor'
 * @param {number} params.userId - partner_id or contractor_id
 * @param {number} params.userAccountId - partner_users.id or contractor_users.id
 * @param {string} params.email - User email
 * @param {string} params.createdBy - 'system', 'admin', etc.
 * @param {string} params.triggerSource - 'profile_completion', 'manual_admin_creation', etc.
 * @param {string} params.passwordSentVia - 'email', 'sms', 'manual', etc.
 * @param {boolean} params.success - true or false (BOOLEAN, NOT string)
 * @param {string} params.errorMessage - Error message if success = false
 */
async function logAccountCreation(params) {
  const {
    userType,
    userId,
    userAccountId,
    email,
    createdBy = 'system',
    triggerSource,
    passwordSentVia = null,
    success,
    errorMessage = null
  } = params;

  try {
    // DATABASE-CHECKED: Using verified field names from account_creation_audit table
    await query(`
      INSERT INTO account_creation_audit (
        user_type, user_id, user_account_id, email,
        created_by, trigger_source, password_sent_via,
        success, error_message, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
    `, [
      userType,
      userId,
      userAccountId,
      email,
      createdBy,
      triggerSource,
      passwordSentVia,
      success, // BOOLEAN: true or false, NOT 'true' or 'false'
      errorMessage
    ]);

    console.log(`📋 Audit log created for ${userType} account: ${email}`);
  } catch (error) {
    console.error('Failed to log account creation:', error);
    // Don't throw - logging failure shouldn't block account creation
  }
}

/**
 * Check if account already exists
 * @param {string} email - Email to check
 * @param {string} userType - 'partner' or 'contractor'
 * @returns {boolean} - true if account exists, false otherwise
 */
async function accountExists(email, userType) {
  const table = userType === 'partner' ? 'partner_users' : 'contractor_users';

  try {
    const result = await query(
      `SELECT id FROM ${table} WHERE email = $1`,
      [email]
    );

    return result.rows.length > 0;
  } catch (error) {
    console.error(`Error checking if ${userType} account exists:`, error);
    throw error;
  }
}

/**
 * Create partner user account
 * @param {number} partnerId - strategic_partners.id
 * @param {string} email - Partner email
 * @param {Object} options - Additional options
 * @param {string} options.createdBy - 'system', 'admin', etc.
 * @param {string} options.triggerSource - 'profile_completion', 'manual_admin_creation', etc.
 * @returns {Object} - { success, userId, email, password, error }
 */
async function createPartnerAccount(partnerId, email, options = {}) {
  const {
    createdBy = 'system',
    triggerSource = 'profile_completion'
  } = options;

  try {
    console.log(`🔐 Creating partner account for partner ${partnerId}`);

    // Check if account already exists
    if (await accountExists(email, 'partner')) {
      const error = 'Partner account already exists for this email';
      console.log(`⚠️  ${error}: ${email}`);

      // Log to audit (success = false, but not a critical error)
      await logAccountCreation({
        userType: 'partner',
        userId: partnerId,
        userAccountId: null,
        email,
        createdBy,
        triggerSource,
        success: false, // BOOLEAN false, NOT 'false'
        errorMessage: error
      });

      return {
        success: false,
        error,
        userId: null,
        email,
        password: null
      };
    }

    // Get partner info for first_name, last_name
    // DATABASE-CHECKED: Using verified field names from strategic_partners table
    const partnerResult = await query(
      'SELECT primary_contact, primary_email FROM strategic_partners WHERE id = $1',
      [partnerId]
    );

    if (partnerResult.rows.length === 0) {
      throw new Error('Partner not found');
    }

    const partner = partnerResult.rows[0];

    // Split primary_contact into first/last name (if available)
    const nameParts = partner.primary_contact?.split(' ') || [];
    const firstName = nameParts[0] || null;
    const lastName = nameParts.slice(1).join(' ') || null;

    // Generate and hash password
    const plainPassword = generateSecurePassword();
    const hashedPassword = await hashPassword(plainPassword);

    // Create partner user
    // DATABASE-CHECKED: Using exact field names from partner_users table
    const result = await query(`
      INSERT INTO partner_users (
        partner_id, email, password, first_name, last_name, is_active, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, true, NOW(), NOW())
      RETURNING id
    `, [partnerId, email, hashedPassword, firstName, lastName]);

    const userId = result.rows[0].id;

    console.log(`✅ Partner account created: ID ${userId}, Email ${email}`);

    // Log to audit
    await logAccountCreation({
      userType: 'partner',
      userId: partnerId,
      userAccountId: userId,
      email,
      createdBy,
      triggerSource,
      success: true, // BOOLEAN true, NOT 'true'
      errorMessage: null
    });

    return {
      success: true,
      userId,
      partnerId,
      email,
      password: plainPassword, // Return for email sending
      error: null
    };

  } catch (error) {
    console.error('Failed to create partner account:', error);

    // Log failure to audit
    await logAccountCreation({
      userType: 'partner',
      userId: partnerId,
      userAccountId: null,
      email,
      createdBy,
      triggerSource,
      success: false, // BOOLEAN false, NOT 'false'
      errorMessage: error.message
    });

    return {
      success: false,
      error: error.message,
      userId: null,
      email,
      password: null
    };
  }
}

/**
 * Create contractor user account
 * @param {number} contractorId - contractors.id
 * @param {string} email - Contractor email
 * @param {Object} options - Additional options
 * @param {string} options.createdBy - 'system', 'admin', etc.
 * @param {string} options.triggerSource - 'profile_completion', 'manual_admin_creation', etc.
 * @returns {Object} - { success, userId, email, password, error }
 */
async function createContractorAccount(contractorId, email, options = {}) {
  const {
    createdBy = 'system',
    triggerSource = 'profile_completion'
  } = options;

  try {
    console.log(`🔐 Creating contractor account for contractor ${contractorId}`);

    // Check if account already exists
    if (await accountExists(email, 'contractor')) {
      const error = 'Contractor account already exists for this email';
      console.log(`⚠️  ${error}: ${email}`);

      // Log to audit (success = false, but not a critical error)
      await logAccountCreation({
        userType: 'contractor',
        userId: contractorId,
        userAccountId: null,
        email,
        createdBy,
        triggerSource,
        success: false, // BOOLEAN false, NOT 'false'
        errorMessage: error
      });

      return {
        success: false,
        error,
        userId: null,
        email,
        password: null
      };
    }

    // Get contractor info for first_name, last_name
    // DATABASE-CHECKED: Using verified field names from contractors table
    const contractorResult = await query(
      'SELECT first_name, last_name FROM contractors WHERE id = $1',
      [contractorId]
    );

    if (contractorResult.rows.length === 0) {
      throw new Error('Contractor not found');
    }

    const contractor = contractorResult.rows[0];

    // Generate and hash password
    const plainPassword = generateSecurePassword();
    const hashedPassword = await hashPassword(plainPassword);

    // Create contractor user
    // DATABASE-CHECKED: Using exact field names from contractor_users table
    const result = await query(`
      INSERT INTO contractor_users (
        contractor_id, email, password, first_name, last_name, is_active, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, true, NOW(), NOW())
      RETURNING id
    `, [contractorId, email, hashedPassword, contractor.first_name, contractor.last_name]);

    const userId = result.rows[0].id;

    console.log(`✅ Contractor account created: ID ${userId}, Email ${email}`);

    // Log to audit
    await logAccountCreation({
      userType: 'contractor',
      userId: contractorId,
      userAccountId: userId,
      email,
      createdBy,
      triggerSource,
      success: true, // BOOLEAN true, NOT 'true'
      errorMessage: null
    });

    return {
      success: true,
      userId,
      contractorId,
      email,
      password: plainPassword, // Return for email sending
      error: null
    };

  } catch (error) {
    console.error('Failed to create contractor account:', error);

    // Log failure to audit
    await logAccountCreation({
      userType: 'contractor',
      userId: contractorId,
      userAccountId: null,
      email,
      createdBy,
      triggerSource,
      success: false, // BOOLEAN false, NOT 'false'
      errorMessage: error.message
    });

    return {
      success: false,
      error: error.message,
      userId: null,
      email,
      password: null
    };
  }
}

module.exports = {
  createPartnerAccount,
  createContractorAccount,
  generateSecurePassword,
  hashPassword,
  accountExists,
  logAccountCreation
};
