const jwt = require('jsonwebtoken');
const { query } = require('../config/database');
const { AppError } = require('./errorHandler');

// Protect partner routes - require partner authentication
const protectPartner = async (req, res, next) => {
  let token;

  // Check for token in headers
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies && req.cookies.partnerToken) {
    token = req.cookies.partnerToken;
  }

  if (!token) {
    return next(new AppError('Access denied. Please login to continue', 401));
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Ensure this is a partner token
    if (!decoded.type || decoded.type !== 'partner') {
      return next(new AppError('Invalid token type', 401));
    }

    // Get partner from strategic_partners table
    const partnerResult = await query(
      'SELECT * FROM strategic_partners WHERE id = $1 AND is_active = 1',
      [decoded.partnerId]
    );

    if (partnerResult.rows.length === 0) {
      return next(new AppError('Partner no longer exists or is inactive', 401));
    }

    const partner = partnerResult.rows[0];

    // Check if partner is active
    if (!partner.is_active) {
      return next(new AppError('Partner account is currently inactive', 401));
    }

    // Add partner info to request
    req.partnerUser = {
      id: partner.id,
      partnerId: partner.id,
      email: partner.contact_email,
      companyName: partner.company_name
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

// Optional partner auth - adds partner info if authenticated but doesn't require it
const optionalPartnerAuth = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies && req.cookies.partnerToken) {
    token = req.cookies.partnerToken;
  }

  if (!token) {
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.type === 'partner') {
      // Use direct database connection for consistency
      const sqlite3 = require('sqlite3').verbose();
      const { open } = require('sqlite');
      
      const db = await open({
        filename: './power100.db',
        driver: sqlite3.Database
      });
      
      const partnerUser = await db.get(`
        SELECT pu.*, sp.is_active as partner_active, sp.company_name
        FROM partner_users pu
        JOIN strategic_partners sp ON pu.partner_id = sp.id
        WHERE pu.id = ? AND pu.is_active = 1 AND sp.is_active = 1
      `, [decoded.id]);

      await db.close();

      if (partnerUser) {
        req.partnerUser = {
          id: partnerUser.id,
          partnerId: partnerUser.partner_id,
          email: partnerUser.email,
          companyName: partnerUser.company_name
        };
      }
    }
  } catch (error) {
    // Invalid token, continue without partner user
  }

  next();
};

module.exports = {
  protectPartner,
  optionalPartnerAuth
};