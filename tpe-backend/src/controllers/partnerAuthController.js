const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { query } = require('../config/database.sqlite');
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
      INSERT INTO partner_users (partner_id, email, password_hash, is_active)
      VALUES ($1, $2, $3, 1)
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

// Partner login (simplified for demo - uses partners directly)
const partnerLogin = async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return next(new AppError('Please provide email and password', 400));
  }

  try {
    console.log('🔐 Partner login attempt for:', email);
    
    // Demo credentials check
    if (email === 'demo@techflow.com' && password === 'Demo123!') {
      // Find the partner in partners table
      const partnerResult = await query(
        'SELECT * FROM partners WHERE contact_email = $1',
        [email]
      );

      let partner;
      if (partnerResult.rows.length === 0) {
        // Create demo partner if doesn't exist
        const insertResult = await query(`
          INSERT INTO partners (
            company_name, contact_email, website, is_active, power_confidence_score, score_trend
          ) VALUES ($1, $2, $3, $4, $5, $6)
        `, ['TechFlow Solutions', email, 'https://techflow.com', 1, 87, 'up']);
        
        partner = {
          id: insertResult.lastInsertRowid,
          company_name: 'TechFlow Solutions',
          contact_email: email,
          power_confidence_score: 87,
          score_trend: 'up',
          is_active: 1
        };
      } else {
        partner = partnerResult.rows[0];
      }

      // Generate token
      const token = signPartnerToken(partner.id, partner.id);

      console.log('🎉 Demo login successful for:', partner.company_name);

      res.status(200).json({
        success: true,
        token,
        partner: {
          id: partner.id,
          company_name: partner.company_name,
          email: partner.contact_email
        }
      });
      return;
    }

    // For non-demo logins, return error
    console.log('❌ Invalid credentials provided');
    return next(new AppError('Invalid email or password', 401));

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
    
    // Use direct database connection for consistency
    const sqlite3 = require('sqlite3').verbose();
    const { open } = require('sqlite');
    
    const db = await open({
      filename: './power100.db',
      driver: sqlite3.Database
    });
    
    // Get partner profile
    const partner = await db.get(`
      SELECT pu.email, pu.last_login, pu.created_at,
             sp.company_name, sp.description, sp.website, sp.logo_url,
             sp.power_confidence_score, sp.is_active
      FROM partner_users pu
      JOIN partners sp ON pu.partner_id = sp.id
      WHERE pu.id = ?
    `, [req.partnerUser.id]);


    if (!partner) {
      await db.close();
      return next(new AppError('Partner not found', 404));
    }

    // Get analytics data for this partner
    const analytics = await db.all(`
      SELECT metric_type, metric_value, period_start, period_end
      FROM partner_analytics
      WHERE partner_id = ?
      ORDER BY calculated_at DESC
    `, [req.partnerUser.partnerId]);

    // Get leads count for this month
    const thisMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format
    const leadsThisMonth = await db.get(`
      SELECT COUNT(*) as count
      FROM partner_leads
      WHERE partner_id = ? AND created_at LIKE ?
    `, [req.partnerUser.partnerId, `${thisMonth}%`]);

    // Get demo requests count
    const demoRequests = await db.get(`
      SELECT COUNT(*) as count
      FROM partner_leads
      WHERE partner_id = ? AND stage IN ('demo_requested', 'demo_scheduled')
    `, [req.partnerUser.partnerId]);

    await db.close();

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
    // Use direct database connection for consistency
    const sqlite3 = require('sqlite3').verbose();
    const { open } = require('sqlite');
    
    const db = await open({
      filename: './power100.db',
      driver: sqlite3.Database
    });

    // Get current user with password
    const user = await db.get(
      'SELECT password_hash FROM partner_users WHERE id = ?',
      [req.partnerUser.id]
    );

    if (!user) {
      await db.close();
      return next(new AppError('User not found', 404));
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password_hash);

    if (!isCurrentPasswordValid) {
      await db.close();
      return next(new AppError('Current password is incorrect', 401));
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, 12);

    // Update password
    await db.run(
      'UPDATE partner_users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [newPasswordHash, req.partnerUser.id]
    );

    await db.close();

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