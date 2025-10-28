// DATABASE-CHECKED: contractor_users, contractors verified October 27, 2025
// ================================================================
// VERIFIED FIELD NAMES (from partner_users pattern):
// - password (NOT password_hash)
// - last_login (NOT last_login_at)
// - reset_token (NOT password_reset_token)
// - reset_token_expires (NOT password_reset_expires)
// - contractor_id (NOT contractors_id)
// - is_active (NOT active)
// ================================================================
// VERIFIED DATA TYPES:
// - password: VARCHAR(255) - stores bcrypt hash
// - is_active: BOOLEAN (true/false NOT 'true'/'false')
// - last_login: TIMESTAMP
// - contractor_id: INTEGER
// ================================================================
// PASSWORD SECURITY (copied from partnerAuthController.js):
// - Hashing: bcrypt.hash(password, 12)
// - Generation: 12 chars (uppercase, lowercase, number, symbol)
// - Comparison: bcrypt.compare(plainPassword, hashedPassword)
// ================================================================
// JWT CONFIGURATION (SAME as partner auth):
// - Secret: process.env.JWT_SECRET
// - Expiration: '7d'
// - Payload: { id, contractor_id, type: 'contractor' }
// ================================================================

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { query } = require('../config/database');
const { AppError } = require('../middleware/errorHandler');

// Generate JWT token for contractors
const signContractorToken = (contractorId, contractorUserId) => {
  return jwt.sign(
    {
      id: contractorUserId,
      contractor_id: contractorId,
      type: 'contractor' // Distinguish from admin/partner tokens
    },
    process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRE || '7d'
    }
  );
};

// Generate secure password (EXACT COPY from partner auth)
const generateSecurePassword = () => {
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
};

// Create contractor user account (called after profile completion)
const createContractorUser = async (contractorId, contractorEmail) => {
  try {
    console.log(`🔐 Creating contractor user account for contractor ${contractorId}`);

    // Check if contractor user already exists
    const existingUser = await query(
      'SELECT id FROM contractor_users WHERE contractor_id = $1',
      [contractorId]
    );

    if (existingUser.rows.length > 0) {
      throw new Error('Contractor user account already exists');
    }

    // Generate secure password (12 chars with all types)
    const plainPassword = generateSecurePassword();
    const passwordHash = await bcrypt.hash(plainPassword, 12); // EXACTLY 12 rounds

    // Get contractor name for user record
    const contractorResult = await query(
      'SELECT first_name, last_name FROM contractors WHERE id = $1',
      [contractorId]
    );

    const contractor = contractorResult.rows[0];

    // Create contractor user (using VERIFIED field names: password, is_active)
    const result = await query(`
      INSERT INTO contractor_users (
        contractor_id, email, password, first_name, last_name, is_active, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
      RETURNING id
    `, [
      contractorId,
      contractorEmail,
      passwordHash,
      contractor?.first_name || null,
      contractor?.last_name || null,
      true // is_active as BOOLEAN
    ]);

    const userId = result.rows[0].id;

    console.log(`✅ Created contractor user account for contractor ${contractorId}, user ID: ${userId}`);

    return {
      contractorId,
      userId,
      email: contractorEmail,
      password: plainPassword // Return plain password for email sending
    };

  } catch (error) {
    console.error('Failed to create contractor user:', error);
    throw error;
  }
};

// Contractor login
const contractorLogin = async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return next(new AppError('Please provide email and password', 400));
  }

  try {
    console.log('🔐 Contractor login attempt for:', email);

    // Find contractor user by email (using VERIFIED field name: password)
    const userResult = await query(
      'SELECT id, contractor_id, email, password, first_name, last_name, is_active FROM contractor_users WHERE email = $1',
      [email]
    );

    if (userResult.rows.length === 0) {
      console.log('❌ No contractor user found for email:', email);
      return next(new AppError('Invalid email or password', 401));
    }

    const user = userResult.rows[0];

    // Check if account is active (using BOOLEAN comparison)
    if (!user.is_active) {
      console.log('❌ Contractor account is inactive:', email);
      return next(new AppError('Account is inactive. Please contact support.', 401));
    }

    // Verify password (field name is 'password', not 'password_hash')
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      console.log('❌ Invalid password for email:', email);
      return next(new AppError('Invalid email or password', 401));
    }

    // Update last_login timestamp (using VERIFIED field name: last_login)
    await query(
      'UPDATE contractor_users SET last_login = NOW(), updated_at = NOW() WHERE id = $1',
      [user.id]
    );

    // Generate token
    const token = signContractorToken(user.contractor_id, user.id);

    console.log('✅ Contractor login successful for:', email);

    res.status(200).json({
      success: true,
      token,
      contractor: {
        id: user.contractor_id,
        userId: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name
      }
    });

  } catch (error) {
    console.error('❌ Contractor login error:', error);
    return next(error);
  }
};

// Contractor logout
const contractorLogout = async (req, res, next) => {
  res.cookie('contractorToken', '', {
    expires: new Date(Date.now() + 1),
    httpOnly: true
  });

  res.status(200).json({
    success: true,
    message: 'Logged out successfully'
  });
};

// Get current contractor user profile
const getContractorProfile = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      return next(new AppError('User not authenticated', 401));
    }

    console.log('📋 Getting contractor profile for user ID:', req.user.id);

    // Get contractor user profile with contractor data
    const profileResult = await query(`
      SELECT
        cu.id as user_id,
        cu.email,
        cu.first_name,
        cu.last_name,
        cu.last_login,
        cu.created_at,
        c.id as contractor_id,
        c.company_name,
        c.phone,
        c.focus_areas,
        c.revenue_tier,
        c.team_size,
        c.lifecycle_stage
      FROM contractor_users cu
      JOIN contractors c ON cu.contractor_id = c.id
      WHERE cu.id = $1
    `, [req.user.id]);

    if (profileResult.rows.length === 0) {
      return next(new AppError('Contractor profile not found', 404));
    }

    const profile = profileResult.rows[0];

    console.log('✅ Contractor profile retrieved for:', profile.email);

    res.status(200).json({
      success: true,
      profile: {
        userId: profile.user_id,
        contractorId: profile.contractor_id,
        email: profile.email,
        firstName: profile.first_name,
        lastName: profile.last_name,
        companyName: profile.company_name,
        phone: profile.phone,
        focusAreas: profile.focus_areas,
        revenueTier: profile.revenue_tier,
        teamSize: profile.team_size,
        lifecycleStage: profile.lifecycle_stage,
        lastLogin: profile.last_login,
        createdAt: profile.created_at
      }
    });

  } catch (error) {
    console.error('❌ Profile error:', error);
    return next(error);
  }
};

// Change contractor password
const changeContractorPassword = async (req, res, next) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return next(new AppError('Please provide current and new password', 400));
  }

  if (newPassword.length < 8) {
    return next(new AppError('New password must be at least 8 characters long', 400));
  }

  try {
    console.log('🔐 Password change request for user ID:', req.user.id);

    // Get current user with password (using VERIFIED field name: password)
    const userResult = await query(
      'SELECT password FROM contractor_users WHERE id = $1',
      [req.user.id]
    );

    if (userResult.rows.length === 0) {
      return next(new AppError('User not found', 404));
    }

    const user = userResult.rows[0];

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);

    if (!isCurrentPasswordValid) {
      console.log('❌ Invalid current password for user ID:', req.user.id);
      return next(new AppError('Current password is incorrect', 401));
    }

    // Hash new password (EXACTLY 12 rounds)
    const newPasswordHash = await bcrypt.hash(newPassword, 12);

    // Update password (using VERIFIED field name: password)
    await query(
      'UPDATE contractor_users SET password = $1, updated_at = NOW() WHERE id = $2',
      [newPasswordHash, req.user.id]
    );

    console.log('✅ Password updated successfully for user ID:', req.user.id);

    res.status(200).json({
      success: true,
      message: 'Password updated successfully'
    });

  } catch (error) {
    console.error('❌ Password change error:', error);
    return next(error);
  }
};

// Request password reset (generates reset token)
const requestPasswordReset = async (req, res, next) => {
  const { email } = req.body;

  if (!email) {
    return next(new AppError('Please provide email address', 400));
  }

  try {
    console.log('🔐 Password reset request for:', email);

    // Find user by email
    const userResult = await query(
      'SELECT id, contractor_id FROM contractor_users WHERE email = $1',
      [email]
    );

    if (userResult.rows.length === 0) {
      // Don't reveal if email exists or not (security)
      res.status(200).json({
        success: true,
        message: 'If an account exists with this email, you will receive password reset instructions'
      });
      return;
    }

    const user = userResult.rows[0];

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpires = new Date(Date.now() + 3600000); // 1 hour from now

    // Store reset token (using VERIFIED field names: reset_token, reset_token_expires)
    await query(
      'UPDATE contractor_users SET reset_token = $1, reset_token_expires = $2, updated_at = NOW() WHERE id = $3',
      [resetToken, resetTokenExpires, user.id]
    );

    console.log('✅ Reset token generated for user ID:', user.id);

    // TODO: Send email with reset link (Phase 4)
    // For now, just return success
    res.status(200).json({
      success: true,
      message: 'If an account exists with this email, you will receive password reset instructions',
      // In development, return token for testing
      ...(process.env.NODE_ENV === 'development' && { resetToken })
    });

  } catch (error) {
    console.error('❌ Password reset request error:', error);
    return next(error);
  }
};

// Reset password using token
const resetPassword = async (req, res, next) => {
  const { token, newPassword } = req.body;

  if (!token || !newPassword) {
    return next(new AppError('Please provide reset token and new password', 400));
  }

  if (newPassword.length < 8) {
    return next(new AppError('New password must be at least 8 characters long', 400));
  }

  try {
    console.log('🔐 Password reset with token');

    // Find user by reset token (using VERIFIED field names: reset_token, reset_token_expires)
    const userResult = await query(
      'SELECT id, reset_token_expires FROM contractor_users WHERE reset_token = $1',
      [token]
    );

    if (userResult.rows.length === 0) {
      return next(new AppError('Invalid or expired reset token', 400));
    }

    const user = userResult.rows[0];

    // Check if token is expired
    if (new Date() > new Date(user.reset_token_expires)) {
      console.log('❌ Reset token expired for user ID:', user.id);
      return next(new AppError('Reset token has expired', 400));
    }

    // Hash new password (EXACTLY 12 rounds)
    const newPasswordHash = await bcrypt.hash(newPassword, 12);

    // Update password and clear reset token (using VERIFIED field names)
    await query(
      'UPDATE contractor_users SET password = $1, reset_token = NULL, reset_token_expires = NULL, updated_at = NOW() WHERE id = $2',
      [newPasswordHash, user.id]
    );

    console.log('✅ Password reset successful for user ID:', user.id);

    res.status(200).json({
      success: true,
      message: 'Password reset successfully'
    });

  } catch (error) {
    console.error('❌ Password reset error:', error);
    return next(error);
  }
};

module.exports = {
  createContractorUser,
  contractorLogin,
  contractorLogout,
  getContractorProfile,
  changeContractorPassword,
  requestPasswordReset,
  resetPassword,
  generateSecurePassword,
  signContractorToken // Export for use in account creation service
};
