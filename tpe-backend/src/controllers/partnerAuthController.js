const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { query } = require('../config/database');
const { AppError } = require('../middleware/errorHandler');

// Generate JWT token for partners
const signPartnerToken = (partnerId, partnerUserId) => {
  return jwt.sign(
    { 
      id: partnerUserId, 
      partnerId: partnerId,
      type: 'partner' // Distinguish from admin tokens
    }, 
    process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRE || '7d'
    }
  );
};

// Generate secure password
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

// Create partner user account (called by admin when creating partner)
const createPartnerUser = async (partnerId, partnerEmail) => {
  try {
    // Check if partner user already exists
    const existingUser = await query(
      'SELECT id FROM partner_users WHERE partner_id = $1',
      [partnerId]
    );

    if (existingUser.rows.length > 0) {
      throw new Error('Partner user account already exists');
    }

    // Generate secure password
    const plainPassword = generateSecurePassword();
    const passwordHash = await bcrypt.hash(plainPassword, 12);

    // Create partner user
    const result = await query(`
      INSERT INTO partner_users (partner_id, email, password, is_active)
      VALUES ($1, $2, $3, true)
    `, [partnerId, partnerEmail, passwordHash]);

    console.log(`🔐 Created partner user account for partner ${partnerId}`);
    
    return {
      partnerId,
      email: partnerEmail,
      password: plainPassword, // Return plain password for email sending
      userId: result.lastID
    };
    
  } catch (error) {
    console.error('Failed to create partner user:', error);
    throw error;
  }
};

// Partner login (matches contractor auth pattern)
const partnerLogin = async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return next(new AppError('Please provide email and password', 400));
  }

  try {
    console.log('🔐 Partner login attempt for:', email);

    // Find partner user by email (using VERIFIED field name: password)
    const userResult = await query(
      'SELECT id, partner_id, email, password, first_name, last_name, is_active FROM partner_users WHERE email = $1',
      [email]
    );

    if (userResult.rows.length === 0) {
      console.log('❌ No partner user found for email:', email);
      return next(new AppError('Invalid email or password', 401));
    }

    const user = userResult.rows[0];

    // Check if account is active (using BOOLEAN comparison)
    if (!user.is_active) {
      console.log('❌ Partner account is inactive:', email);
      return next(new AppError('Account is inactive. Please contact support.', 401));
    }

    // Verify password (field name is 'password', not 'password_hash')
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      console.log('❌ Invalid password for email:', email);
      return next(new AppError('Invalid email or password', 401));
    }

    // Get partner details from strategic_partners table
    const partnerResult = await query(
      'SELECT id, company_name FROM strategic_partners WHERE id = $1 AND is_active = true',
      [user.partner_id]
    );

    if (partnerResult.rows.length === 0) {
      console.log('❌ Partner not found or inactive for partner_id:', user.partner_id);
      return next(new AppError('Partner account not found or inactive', 401));
    }

    const partner = partnerResult.rows[0];

    // Update last_login timestamp (using VERIFIED field name: last_login)
    await query(
      'UPDATE partner_users SET last_login = NOW() WHERE id = $1',
      [user.id]
    );

    // Generate token
    const token = signPartnerToken(user.partner_id, user.id);

    console.log('✅ Partner login successful for:', email);

    res.status(200).json({
      success: true,
      token,
      partner: {
        id: user.partner_id,
        userId: user.id,
        email: user.email,
        company_name: partner.company_name,
        first_name: user.first_name,
        last_name: user.last_name
      }
    });

  } catch (error) {
    console.error('❌ Partner login error:', error);
    return next(error);
  }
};

// Partner logout
const partnerLogout = async (req, res, next) => {
  res.cookie('partnerToken', '', {
    expires: new Date(Date.now() + 1),
    httpOnly: true
  });

  res.status(200).json({
    success: true,
    message: 'Logged out successfully'
  });
};

// Get current partner user info with analytics
const getPartnerProfile = async (req, res, next) => {
  try {
    if (!req.partnerUser || !req.partnerUser.id) {
      return next(new AppError('Partner user not set by middleware', 401));
    }
    
    // Use PostgreSQL connection
    const { query } = require('../config/database');
    
    // Get partner profile (including Phase 2 & 3 fields)
    const partnerResult = await query(`
      SELECT pu.email, pu.last_login, pu.created_at,
             sp.id as partner_id,
             sp.company_name, sp.description, sp.website, sp.logo_url,
             sp.power_confidence_score, sp.is_active,
             sp.final_pcr_score, sp.base_pcr_score,
             sp.earned_badges, sp.momentum_modifier, sp.performance_trend,
             sp.quarterly_history, sp.quarters_tracked,
             sp.has_quarterly_data, sp.quarterly_feedback_score
      FROM partner_users pu
      JOIN strategic_partners sp ON pu.partner_id = sp.id
      WHERE pu.id = $1
    `, [req.partnerUser.id]);

    const partner = partnerResult.rows[0];

    if (!partner) {
      return next(new AppError('Partner not found', 404));
    }

    // Get analytics data for this partner
    const analyticsResult = await query(`
      SELECT metric_type, metric_value, period_start, period_end
      FROM partner_analytics
      WHERE partner_id = $1
      ORDER BY created_at DESC
    `, [req.partnerUser.partnerId]);

    const analytics = analyticsResult.rows;

    // Get leads count for this month
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const leadsResult = await query(`
      SELECT COUNT(*) as count
      FROM partner_leads
      WHERE partner_id = $1
        AND created_at >= $2
        AND created_at < $3
    `, [req.partnerUser.partnerId, startOfMonth, endOfMonth]);

    const leadsThisMonth = leadsResult.rows[0];

    // Get demo requests count
    const demoResult = await query(`
      SELECT COUNT(*) as count
      FROM partner_leads
      WHERE partner_id = $1 AND lead_status IN ('demo_requested', 'demo_scheduled')
    `, [req.partnerUser.partnerId]);

    const demoRequests = demoResult.rows[0];

    // Format analytics for frontend
    const analyticsMap = {};
    analytics.forEach(metric => {
      analyticsMap[metric.metric_type] = metric.metric_value;
    });

    const responseData = {
      ...partner,
      analytics: {
        leads_received: leadsThisMonth ? leadsThisMonth.count : analyticsMap.leads_received || 0,
        demos_requested: demoRequests ? demoRequests.count : analyticsMap.demos_requested || 0,
        conversion_rate: analyticsMap.conversion_rate || 0,
        power_confidence_score: partner.power_confidence_score || 0
      }
    };


    res.status(200).json({
      success: true,
      partner: responseData
    });

  } catch (error) {
    console.error('❌ Profile error:', error);
    return next(error);
  }
};

// Change partner password
const changePartnerPassword = async (req, res, next) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return next(new AppError('Please provide current and new password', 400));
  }

  if (newPassword.length < 8) {
    return next(new AppError('New password must be at least 8 characters long', 400));
  }

  try {
    // Use PostgreSQL connection
    const { query } = require('../config/database');

    // Get current user with password
    const userResult = await query(
      'SELECT password FROM partner_users WHERE id = $1',
      [req.partnerUser.id]
    );

    const user = userResult.rows[0];

    if (!user) {
      return next(new AppError('User not found', 404));
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);

    if (!isCurrentPasswordValid) {
      return next(new AppError('Current password is incorrect', 401));
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, 12);

    // Update password
    await query(
      'UPDATE partner_users SET password = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [newPasswordHash, req.partnerUser.id]
    );

    res.status(200).json({
      success: true,
      message: 'Password updated successfully'
    });

  } catch (error) {
    return next(error);
  }
};

module.exports = {
  createPartnerUser,
  partnerLogin,
  partnerLogout,
  getPartnerProfile,
  changePartnerPassword,
  generateSecurePassword
};