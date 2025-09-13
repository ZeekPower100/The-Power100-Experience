/**
 * AUTH MIDDLEWARE - NOW WITH FLEXIBLE TOKEN SUPPORT
 * 
 * This file now exports the flexible auth middleware that handles:
 * - Admin tokens (from admin_users table)
 * - Partner tokens (from strategic_partners/partner_users tables)
 * - Contractor tokens (from contractors table)
 * 
 * This prevents "User no longer exists" errors when non-admin users access the system
 */

// Re-export everything from flexibleAuth for backwards compatibility
const flexibleAuth = require('./flexibleAuth');

module.exports = flexibleAuth;

// Old implementation preserved below for reference (commented out)
/*
const jwt = require('jsonwebtoken');
const { query } = require('../config/database');
const { AppError } = require('./errorHandler');

// ORIGINAL IMPLEMENTATION - ONLY WORKED FOR ADMIN USERS
// This caused "User no longer exists" errors for contractors/partners
const protect = async (req, res, next) => {
  let token;

  // Check for token in headers
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  // Check for token in cookies
  if (!token && req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token) {
    return next(new AppError('Not authorized to access this route', 401));
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // PROBLEM: This ONLY checks admin_users table
    // Contractor and partner tokens would fail here
    const result = await query(
      'SELECT id, email, name as full_name, is_active FROM admin_users WHERE id = $1',
      [decoded.id]
    );

    if (result.rows.length === 0) {
      // This is where "User no longer exists" error came from
      return next(new AppError('User no longer exists', 401));
    }

    const user = result.rows[0];

    if (!user.is_active) {
      return next(new AppError('User account is deactivated', 401));
    }

    // Add user to request object
    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error.message);
    return next(new AppError('Not authorized to access this route', 401));
  }
};
*/