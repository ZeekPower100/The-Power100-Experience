// DATABASE-CHECKED: contractor_users verified October 27, 2025
// ================================================================
// VERIFIED FIELD NAMES:
// - contractor_id (NOT contractors_id, NOT contractorId)
// - is_active (NOT active, NOT isActive)
// - password (NOT password_hash)
// ================================================================
// JWT VERIFICATION:
// - Secret: process.env.JWT_SECRET (SAME as partner auth)
// - Payload structure: { id, contractor_id, type }
// - Type check: decoded.type === 'contractor'
// ================================================================
// MIDDLEWARE PATTERN (from partnerAuth.js):
// 1. Extract token from Authorization header or cookie
// 2. Verify token with JWT_SECRET
// 3. Query contractor_users table with decoded.id
// 4. Check is_active === true (BOOLEAN comparison)
// 5. Attach req.user with full user data
// 6. Call next()
// ================================================================

const jwt = require('jsonwebtoken');
const { query } = require('../config/database');
const { AppError } = require('./errorHandler');

// Protect contractor routes - require contractor authentication
const protectContractor = async (req, res, next) => {
  let token;

  // Check for token in headers (Bearer token) or cookies
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies && req.cookies.contractorToken) {
    token = req.cookies.contractorToken;
  }

  if (!token) {
    return next(new AppError('Access denied. Please login to continue', 401));
  }

  try {
    // Verify token with same JWT_SECRET as partner auth
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Ensure this is a contractor token (not partner or admin)
    if (!decoded.type || decoded.type !== 'contractor') {
      return next(new AppError('Invalid token type', 401));
    }

    // Get contractor user from contractor_users table (using VERIFIED field name: is_active)
    const userResult = await query(
      'SELECT id, contractor_id, email, first_name, last_name, is_active FROM contractor_users WHERE id = $1',
      [decoded.id]
    );

    if (userResult.rows.length === 0) {
      return next(new AppError('User no longer exists', 401));
    }

    const user = userResult.rows[0];

    // Check if account is active (BOOLEAN comparison, not string)
    if (!user.is_active) {
      return next(new AppError('Account is currently inactive. Please contact support.', 401));
    }

    // Add user info to request (for use in controllers)
    req.user = {
      id: user.id,
      contractor_id: user.contractor_id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name
    };

    next();

  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return next(new AppError('Invalid token. Please login again', 401));
    } else if (error.name === 'TokenExpiredError') {
      return next(new AppError('Token expired. Please login again', 401));
    }

    return next(error);
  }
};

// Optional contractor auth - adds user info if authenticated but doesn't require it
const optionalContractorAuth = async (req, res, next) => {
  let token;

  // Check for token in headers or cookies
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies && req.cookies.contractorToken) {
    token = req.cookies.contractorToken;
  }

  // No token found - continue without authentication
  if (!token) {
    return next();
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Only process if this is a contractor token
    if (decoded.type === 'contractor') {
      // Get contractor user (using VERIFIED field name: is_active)
      const userResult = await query(`
        SELECT
          cu.id,
          cu.contractor_id,
          cu.email,
          cu.first_name,
          cu.last_name,
          cu.is_active,
          c.company_name
        FROM contractor_users cu
        JOIN contractors c ON cu.contractor_id = c.id
        WHERE cu.id = $1 AND cu.is_active = true
      `, [decoded.id]);

      if (userResult.rows.length > 0) {
        const user = userResult.rows[0];

        req.user = {
          id: user.id,
          contractor_id: user.contractor_id,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          company_name: user.company_name
        };
      }
    }
  } catch (error) {
    // Invalid token or error - continue without user info (don't block request)
    console.log('Optional contractor auth error (non-blocking):', error.message);
  }

  next();
};

module.exports = {
  protectContractor,
  optionalContractorAuth
};
