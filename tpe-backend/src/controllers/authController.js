const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../config/database');
const { AppError } = require('../middleware/errorHandler');

// Generate JWT token
const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};

// Create and send token response
const createSendToken = (user, statusCode, res) => {
  const token = signToken(user.id);

  const cookieOptions = {
    expires: new Date(
      Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 days
    ),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax'
  };

  res.cookie('token', token, cookieOptions);

  // Remove password from output
  user.password_hash = undefined;

  res.status(statusCode).json({
    success: true,
    token,
    user
  });
};

// Login
const login = async (req, res, next) => {
  const { email, password } = req.body;

  // Check if user exists
  const result = await query(
    'SELECT * FROM admin_users WHERE email = $1',
    [email]
  );

  if (result.rows.length === 0) {
    return next(new AppError('Invalid email or password', 401));
  }

  const user = result.rows[0];

  // Check if user is active
  if (!user.is_active) {
    return next(new AppError('Your account has been deactivated', 401));
  }

  // Check password
  const isPasswordValid = await bcrypt.compare(password, user.password);

  if (!isPasswordValid) {
    return next(new AppError('Invalid email or password', 401));
  }

  // Send token
  createSendToken(user, 200, res);
};

// Logout
const logout = async (req, res) => {
  res.cookie('token', 'loggedout', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true
  });

  res.status(200).json({
    success: true,
    message: 'Logged out successfully'
  });
};

// Get current user
const getMe = async (req, res) => {
  res.status(200).json({
    success: true,
    user: req.user
  });
};

// Update password
const updatePassword = async (req, res, next) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return next(new AppError('Please provide current and new password', 400));
  }

  // Get user with password
  const result = await query(
    'SELECT * FROM admin_users WHERE id = $1',
    [req.user.id]
  );

  const user = result.rows[0];

  // Check current password
  const isPasswordValid = await bcrypt.compare(currentPassword, user.password_hash);

  if (!isPasswordValid) {
    return next(new AppError('Current password is incorrect', 401));
  }

  // Hash new password
  const newPasswordHash = await bcrypt.hash(newPassword, 12);

  // Update password
  await query(
    'UPDATE admin_users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
    [newPasswordHash, req.user.id]
  );

  res.status(200).json({
    success: true,
    message: 'Password updated successfully'
  });
};

module.exports = {
  login,
  logout,
  getMe,
  updatePassword
};