// Debug endpoint for token testing
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { query } = require('../config/database');
const { identifyAndValidateToken } = require('../middleware/flexibleAuth');

/**
 * POST /api/debug/token
 * Test token validation
 */
router.post('/token', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'Token is required'
      });
    }

    // Decode token
    const decoded = jwt.decode(token);

    // Verify token
    let verified = null;
    try {
      verified = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      verified = { error: error.message };
    }

    // Validate using middleware function
    const validationResult = await identifyAndValidateToken(token);

    res.json({
      success: true,
      decoded,
      verified,
      validationResult,
      jwt_secret_length: process.env.JWT_SECRET?.length,
      jwt_secret_first_chars: process.env.JWT_SECRET?.substring(0, 10)
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack
    });
  }
});

module.exports = router;
