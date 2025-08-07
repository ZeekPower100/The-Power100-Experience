const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const { AppError } = require('../middleware/errorHandler');

// Direct database connection for authentication (bypasses wrapper issues)
let authDb = null;

const getAuthDb = async () => {
  if (!authDb) {
    authDb = await open({
      filename: './power100.db',
      driver: sqlite3.Database
    });
  }
  return authDb;
};

// Generate JWT token for partners
const signPartnerToken = (partnerId, partnerUserId) => {
  return jwt.sign(
    { 
      id: partnerUserId, 
      partnerId: partnerId,
      type: 'partner'
    }, 
    process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRE || '7d'
    }
  );
};

// Working partner login using direct database connection
const partnerLoginWorking = async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return next(new AppError('Please provide email and password', 400));
  }

  try {
    console.log('🔐 Partner login attempt for:', email);
    
    const db = await getAuthDb();
    
    // Get partner user with direct SQL query
    const user = await db.get(`
      SELECT pu.*, sp.company_name, sp.is_active as partner_active
      FROM partner_users pu
      JOIN strategic_partners sp ON pu.partner_id = sp.id
      WHERE pu.email = ? AND pu.is_active = 1
    `, [email]);

    console.log('🔍 Database query result:', user ? 'User found' : 'No user found');

    if (!user) {
      return next(new AppError('Invalid email or password', 401));
    }

    // Check if partner is active
    if (!user.partner_active) {
      return next(new AppError('Partner account is currently inactive', 401));
    }

    // Verify password
    console.log('🔍 Verifying password...');
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      console.log('❌ Password verification failed');
      return next(new AppError('Invalid email or password', 401));
    }

    console.log('✅ Password verified successfully');

    // Update last login
    await db.run(
      'UPDATE partner_users SET last_login = datetime("now") WHERE id = ?',
      [user.id]
    );

    // Generate token
    const token = signPartnerToken(user.partner_id, user.id);

    console.log('🎉 Login successful for:', user.company_name);

    // Set cookie (optional)
    res.cookie('partnerToken', token, {
      expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    });

    res.status(200).json({
      success: true,
      token,
      partner: {
        id: user.partner_id,
        company_name: user.company_name,
        email: user.email,
        last_login: user.last_login
      }
    });

  } catch (error) {
    console.error('❌ Partner login error:', error);
    return next(error);
  }
};

module.exports = {
  partnerLoginWorking
};