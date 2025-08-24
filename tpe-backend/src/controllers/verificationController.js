// Verification Controller - Handles SMS verification codes via GHL
const { query } = require('../config/database.sqlite');
const crypto = require('crypto');

// Generate 6-digit verification code
const generateVerificationCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send verification code via GHL (through n8n)
const sendVerificationCode = async (req, res) => {
  try {
    const { contractorId, phone } = req.body;

    if (!contractorId || !phone) {
      return res.status(400).json({
        success: false,
        error: 'contractorId and phone are required'
      });
    }

    // Generate verification code
    const verificationCode = generateVerificationCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store verification code in database
    await query(
      `UPDATE contractors 
       SET verification_code = ?, 
           verification_expires_at = ?,
           verification_status = 'pending'
       WHERE id = ?`,
      [verificationCode, expiresAt.toISOString(), contractorId]
    );

    // Get contractor details
    const contractorResult = await query(
      'SELECT name, email, phone FROM contractors WHERE id = ?',
      [contractorId]
    );

    if (!contractorResult.rows || contractorResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Contractor not found'
      });
    }

    const contractor = contractorResult.rows[0];

    // Format phone number (remove special chars)
    const cleanPhone = phone.replace(/[^0-9+]/g, '');

    // Prepare webhook data for n8n/GHL
    const webhookData = {
      action: 'send_verification',
      contractorId: contractorId,
      name: contractor.name,
      phone: cleanPhone,
      verificationCode: verificationCode,
      message: `Your Power100 verification code is: ${verificationCode}. This code expires in 10 minutes.`,
      expiresAt: expiresAt.toISOString(),
      timestamp: new Date().toISOString()
    };

    console.log('📱 Sending verification code to:', cleanPhone);
    console.log('🔑 Code:', verificationCode);

    // In production, this would trigger n8n webhook
    // For now, return the data that would be sent
    res.json({
      success: true,
      message: 'Verification code sent',
      data: {
        contractorId: contractorId,
        phone: cleanPhone,
        expiresAt: expiresAt.toISOString(),
        // Remove code in production - only for testing
        verificationCode: process.env.NODE_ENV === 'development' ? verificationCode : undefined,
        webhookPayload: webhookData
      }
    });

  } catch (error) {
    console.error('❌ Error sending verification code:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send verification code',
      details: error.message
    });
  }
};

// Verify the code entered by user
const verifyCode = async (req, res) => {
  try {
    const { contractorId, code } = req.body;

    if (!contractorId || !code) {
      return res.status(400).json({
        success: false,
        error: 'contractorId and code are required'
      });
    }

    // Get stored verification data
    const result = await query(
      `SELECT verification_code, verification_expires_at, verification_status 
       FROM contractors 
       WHERE id = ?`,
      [contractorId]
    );

    if (!result.rows || result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Contractor not found'
      });
    }

    const contractor = result.rows[0];

    // Check if already verified
    if (contractor.verification_status === 'verified') {
      return res.json({
        success: true,
        message: 'Already verified',
        verified: true
      });
    }

    // Check expiration
    const now = new Date();
    const expiresAt = new Date(contractor.verification_expires_at);
    
    if (now > expiresAt) {
      return res.status(400).json({
        success: false,
        error: 'Verification code expired',
        expired: true
      });
    }

    // Verify code
    if (contractor.verification_code !== code) {
      return res.status(400).json({
        success: false,
        error: 'Invalid verification code',
        invalid: true
      });
    }

    // Mark as verified
    await query(
      `UPDATE contractors 
       SET verification_status = 'verified',
           opted_in_coaching = 1,
           current_stage = 'focus_selection',
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [contractorId]
    );

    // Log verification in communication_logs
    await query(
      `INSERT INTO communication_logs 
       (message_id, contractor_id, type, direction, status, body, metadata, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        `verify_${contractorId}_${Date.now()}`,
        contractorId,
        'sms',
        'inbound',
        'delivered',
        `Verification code: ${code}`,
        JSON.stringify({ action: 'verification_complete', verified: true }),
        new Date().toISOString()
      ]
    );

    res.json({
      success: true,
      message: 'Phone verified successfully',
      verified: true,
      nextStage: 'focus_selection'
    });

  } catch (error) {
    console.error('❌ Error verifying code:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to verify code',
      details: error.message
    });
  }
};

// Resend verification code
const resendVerificationCode = async (req, res) => {
  try {
    const { contractorId } = req.body;

    if (!contractorId) {
      return res.status(400).json({
        success: false,
        error: 'contractorId is required'
      });
    }

    // Get contractor phone
    const result = await query(
      'SELECT phone FROM contractors WHERE id = ?',
      [contractorId]
    );

    if (!result.rows || result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Contractor not found'
      });
    }

    const contractor = result.rows[0];

    // Call sendVerificationCode with phone
    req.body.phone = contractor.phone;
    return sendVerificationCode(req, res);

  } catch (error) {
    console.error('❌ Error resending verification code:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to resend verification code',
      details: error.message
    });
  }
};

// Handle SMS reply with verification code
const handleVerificationReply = async (req, res) => {
  try {
    const { phone, body, contactId } = req.body;

    if (!phone || !body) {
      return res.status(400).json({
        success: false,
        error: 'phone and body are required'
      });
    }

    // Extract code from message (assuming it's a 6-digit number)
    const codeMatch = body.match(/\b\d{6}\b/);
    if (!codeMatch) {
      return res.status(400).json({
        success: false,
        error: 'No verification code found in message'
      });
    }

    const code = codeMatch[0];

    // Find contractor by phone
    const cleanPhone = phone.replace(/[^0-9+]/g, '');
    const result = await query(
      `SELECT id FROM contractors 
       WHERE REPLACE(REPLACE(REPLACE(phone, '-', ''), ' ', ''), '(', '') LIKE ?
       AND verification_status = 'pending'
       ORDER BY created_at DESC
       LIMIT 1`,
      [`%${cleanPhone.slice(-10)}%`]
    );

    if (!result.rows || result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No pending verification found for this phone number'
      });
    }

    const contractorId = result.rows[0].id;

    // Verify the code
    req.body = { contractorId, code };
    return verifyCode(req, res);

  } catch (error) {
    console.error('❌ Error handling verification reply:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process verification reply',
      details: error.message
    });
  }
};

module.exports = {
  sendVerificationCode,
  verifyCode,
  resendVerificationCode,
  handleVerificationReply
};