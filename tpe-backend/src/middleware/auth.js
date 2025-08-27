const jwt = require('jsonwebtoken');
const { query } = require('../config/database');
const { AppError } = require('./errorHandler');

// Protect routes - require authentication
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

    // Check if admin user still exists
    const result = await query(
      'SELECT id, email, name as full_name, is_active FROM admin_users WHERE id = $1',
      [decoded.id]
    );

    if (result.rows.length === 0) {
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

// Grant access to specific roles (for future role-based access)
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('Not authorized to access this route', 401));
    }

    // For now, all authenticated users are admins
    // In the future, you can add role checking here
    next();
  };
};

// Optional auth - adds user to req if authenticated but doesn't require it
const optionalAuth = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token && req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token) {
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const result = await query(
      'SELECT id, email, full_name, is_active FROM admin_users WHERE id = $1 AND is_active = true',
      [decoded.id]
    );

    if (result.rows.length > 0) {
      req.user = result.rows[0];
    }
  } catch (error) {
    // Invalid token, continue without user
  }

  next();
};

// Admin only middleware (all users in admin_users are admins)
const adminOnly = (req, res, next) => {
  // Since all users in admin_users are admins, just check if authenticated
  if (!req.user) {
    return res.status(403).json({
      success: false,
      message: 'Admin access required'
    });
  }
  next();
};

// Shortcut for admin authentication (all users in admin_users are admins)
const authenticateAdmin = protect;

module.exports = {
  protect,
  authorize,
  optionalAuth,
  authenticateAdmin,
  adminOnly
};