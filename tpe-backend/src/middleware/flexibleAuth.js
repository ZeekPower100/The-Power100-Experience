const jwt = require('jsonwebtoken');
const { query } = require('../config/database');
const { AppError } = require('./errorHandler');

/**
 * FLEXIBLE AUTHENTICATION MIDDLEWARE
 * Handles multiple token types: admin, partner, contractor
 * Prevents "User no longer exists" errors by checking the correct table
 */

// Identify token type and validate accordingly
const identifyAndValidateToken = async (token) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Debug logging (can be removed in production)
    console.log('🔍 Token decoded:', { 
      hasId: !!decoded.id, 
      hasPartnerId: !!decoded.partnerId,
      hasContractorId: !!decoded.contractorId,
      type: decoded.type 
    });

    // CONTRACTOR TOKEN - has contractorId field
    if (decoded.contractorId) {
      const result = await query(
        'SELECT id, CONCAT(first_name, \' \', last_name) as name, email, phone, company_name, current_stage as stage FROM contractors WHERE id = $1',
        [decoded.contractorId]
      );

      if (result.rows.length === 0) {
        console.log('❌ Contractor not found:', decoded.contractorId);
        return null;
      }

      return {
        type: 'contractor',
        user: {
          ...result.rows[0],
          userType: 'contractor',
          contractorId: result.rows[0].id
        }
      };
    }

    // PARTNER TOKEN - has partnerId and type='partner'
    if (decoded.partnerId || decoded.type === 'partner') {
      // Partner tokens may have both partnerId and a user id
      const partnerId = decoded.partnerId;
      const userId = decoded.id; // This is the partner_user id

      // First check if partner exists and is active
      const partnerResult = await query(
        'SELECT id, company_name, is_active FROM strategic_partners WHERE id = $1',
        [partnerId]
      );

      if (partnerResult.rows.length === 0 || !partnerResult.rows[0].is_active) {
        console.log('❌ Partner not found or inactive:', partnerId);
        return null;
      }

      // If there's a user ID, get user details
      let userData = {};
      if (userId) {
        const userResult = await query(
          'SELECT id, email, first_name, last_name, role FROM partner_users WHERE id = $1 AND partner_id = $2',
          [userId, partnerId]
        );
        if (userResult.rows.length > 0) {
          userData = {
            ...userResult.rows[0],
            name: `${userResult.rows[0].first_name || ''} ${userResult.rows[0].last_name || ''}`.trim()
          };
        }
      }

      return {
        type: 'partner',
        user: {
          ...userData,
          partnerId: partnerId,
          partnerName: partnerResult.rows[0].company_name,
          userType: 'partner'
        }
      };
    }

    // ADMIN TOKEN - has id field only (legacy format)
    if (decoded.id && !decoded.type) {
      const result = await query(
        'SELECT id, email, name as full_name, is_active FROM admin_users WHERE id = $1',
        [decoded.id]
      );

      if (result.rows.length === 0) {
        console.log('❌ Admin user not found:', decoded.id);
        return null;
      }

      const user = result.rows[0];
      if (!user.is_active) {
        console.log('❌ Admin user inactive:', decoded.id);
        return null;
      }

      return {
        type: 'admin',
        user: {
          ...user,
          userType: 'admin'
        }
      };
    }

    // Unknown token format
    console.log('⚠️ Unknown token format:', decoded);
    return null;

  } catch (error) {
    console.error('Token validation error:', error.message);
    return null;
  }
};

// Flexible protect middleware - works with any token type OR API key
const flexibleProtect = async (req, res, next) => {
  // Development mode bypass for AI Concierge
  console.log('🔍 Request path in middleware:', req.path, 'Original URL:', req.originalUrl);
  if (process.env.NODE_ENV === 'development' && (req.originalUrl.includes('/ai-concierge') || req.baseUrl?.includes('/ai-concierge')) && !req.headers.authorization) {
    console.log('🔧 Dev mode: Bypassing auth for AI Concierge');
    req.contractor = { id: '1', name: 'Test User', company_name: 'Test Company' };
    return next();
  }

  // CHECK FOR API KEY FIRST (for n8n webhooks)
  const apiKey = req.headers['x-api-key'];
  if (apiKey) {
    console.log('🔑 API Key detected, validating...');
    console.log('🔍 Received key:', apiKey);
    console.log('🔍 Expected key:', process.env.TPX_N8N_API_KEY);
    console.log('🔍 Keys match:', apiKey === process.env.TPX_N8N_API_KEY);
    if (apiKey === process.env.TPX_N8N_API_KEY) {
      console.log('✅ API Key valid - granting access');
      req.apiKeyAuth = true;
      return next();
    } else {
      console.log('❌ Invalid API Key');
      return next(new AppError('Invalid API key', 401));
    }
  }

  let token;

  // Check for token in headers
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  // Check for token in cookies
  if (!token && req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  // Debug logging
  console.log('🔐 Flexible auth check - Token present:', !!token, 'Path:', req.path, 'Method:', req.method);

  if (!token) {
    return next(new AppError('Not authorized to access this route', 401));
  }

  const validationResult = await identifyAndValidateToken(token);

  if (!validationResult) {
    return next(new AppError('Invalid or expired token', 401));
  }

  // Add user and type to request
  req.user = validationResult.user;
  req.userType = validationResult.type;

  // For contractors, also set req.contractor for backward compatibility
  if (validationResult.type === 'contractor') {
    req.contractor = validationResult.user;
  }

  console.log('✅ Auth successful:', {
    type: req.userType,
    userId: req.user.id || req.user.contractorId,
    email: req.user.email
  });

  next();
};

// Admin-only middleware - requires admin token
const adminOnly = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token && req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token) {
    return next(new AppError('Admin access required', 403));
  }

  const validationResult = await identifyAndValidateToken(token);

  if (!validationResult || validationResult.type !== 'admin') {
    return next(new AppError('Admin access required', 403));
  }

  req.user = validationResult.user;
  req.userType = 'admin';
  next();
};

// Partner-only middleware
const partnerOnly = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token && req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token) {
    return next(new AppError('Partner access required', 403));
  }

  const validationResult = await identifyAndValidateToken(token);

  if (!validationResult || validationResult.type !== 'partner') {
    return next(new AppError('Partner access required', 403));
  }

  req.user = validationResult.user;
  req.userType = 'partner';
  req.partnerId = validationResult.user.partnerId;
  next();
};

// Contractor-only middleware
const contractorOnly = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token && req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token) {
    return next(new AppError('Contractor access required', 403));
  }

  const validationResult = await identifyAndValidateToken(token);

  if (!validationResult || validationResult.type !== 'contractor') {
    return next(new AppError('Contractor access required', 403));
  }

  req.user = validationResult.user;
  req.userType = 'contractor';
  req.contractorId = validationResult.user.contractorId;
  next();
};

// Partner OR Admin middleware - accepts both partner and admin tokens
const protectPartnerOrAdmin = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token && req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token) {
    return next(new AppError('Authentication required', 401));
  }

  const validationResult = await identifyAndValidateToken(token);

  if (!validationResult) {
    return next(new AppError('Invalid or expired token', 401));
  }

  // Accept either partner or admin tokens
  if (validationResult.type !== 'partner' && validationResult.type !== 'admin') {
    return next(new AppError('Partner or Admin access required', 403));
  }

  req.user = validationResult.user;
  req.userType = validationResult.type;

  // Set context-specific properties for backward compatibility
  if (validationResult.type === 'partner') {
    req.partnerId = validationResult.user.partnerId;
  }

  console.log('✅ Partner/Admin auth successful:', {
    type: req.userType,
    userId: req.user.id,
    partnerId: req.partnerId || 'N/A'
  });

  next();
};

// Optional auth - adds user if token is valid but doesn't require it
const optionalFlexibleAuth = async (req, res, next) => {
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

  const validationResult = await identifyAndValidateToken(token);

  if (validationResult) {
    req.user = validationResult.user;
    req.userType = validationResult.type;
  }

  next();
};

// Backwards compatibility exports
// These match the old auth.js exports but use flexible logic
module.exports = {
  // New flexible methods
  flexibleProtect,
  adminOnly,
  partnerOnly,
  contractorOnly,
  protectPartnerOrAdmin,
  optionalFlexibleAuth,

  // Backwards compatibility (maps to flexible versions)
  protect: flexibleProtect,  // This is the key fix - protect now handles all token types
  authorize: (...roles) => flexibleProtect, // For now, just use flexible protect
  optionalAuth: optionalFlexibleAuth,
  authenticateAdmin: adminOnly,

  // Utility function for other modules
  identifyAndValidateToken
};