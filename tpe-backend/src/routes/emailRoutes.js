// Email Routes - Handles email triggers and notifications
const express = require('express');
const axios = require('axios');
const router = express.Router();
const emailController = require('../controllers/emailController');
const { flexibleProtect } = require('../middleware/auth');

// Configuration
const N8N_WEBHOOK_BASE = process.env.N8N_WEBHOOK_BASE || 'https://n8n.srv918843.hstgr.cloud';

// Send welcome email after contractor verification
const sendWelcomeEmail = async (req, res) => {
  try {
    const {
      contractorId,
      email,
      firstName,
      lastName,
      contactId // GHL contact ID
    } = req.body;

    console.log('📧 Triggering welcome email for contractor:', contractorId);

    // Validate required fields
    if (!email || !firstName || !contractorId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: email, firstName, or contractorId'
      });
    }

    // Trigger n8n welcome email workflow
    const n8nPayload = {
      contractorId,
      email,
      firstName,
      lastName: lastName || '',
      contactId: contactId || null,
      triggerType: 'welcome_onboarding',
      timestamp: new Date().toISOString()
    };

    const response = await axios.post(
      `${N8N_WEBHOOK_BASE}/webhook/welcome-email`,
      n8nPayload,
      {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 30000 // 30 second timeout
      }
    );

    console.log('✅ Welcome email workflow triggered successfully');

    res.status(200).json({
      success: true,
      message: 'Welcome email sent successfully',
      workflowTriggered: true,
      contractorId: contractorId,
      email: email,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error sending welcome email:', error.message);
    
    res.status(500).json({
      success: false,
      error: 'Failed to send welcome email',
      details: error.response?.data || error.message
    });
  }
};

// Send stage progression notification
const sendStageNotification = async (req, res) => {
  try {
    const {
      contractorId,
      email,
      firstName,
      stage,
      nextSteps,
      contactId
    } = req.body;

    console.log('📧 Triggering stage notification for contractor:', contractorId, 'Stage:', stage);

    // Validate required fields
    if (!email || !firstName || !contractorId || !stage) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: email, firstName, contractorId, or stage'
      });
    }

    // Trigger n8n stage notification workflow (to be created)
    const n8nPayload = {
      contractorId,
      email,
      firstName,
      stage,
      nextSteps: nextSteps || [],
      contactId: contactId || null,
      triggerType: 'stage_progression',
      timestamp: new Date().toISOString()
    };

    // TODO: Create stage progression workflow
    console.log('🚧 Stage notification workflow not yet implemented');
    console.log('Payload would be:', n8nPayload);

    res.status(200).json({
      success: true,
      message: 'Stage notification queued (workflow pending)',
      workflowTriggered: false,
      contractorId: contractorId,
      stage: stage,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error sending stage notification:', error.message);
    
    res.status(500).json({
      success: false,
      error: 'Failed to send stage notification',
      details: error.response?.data || error.message
    });
  }
};

// Send partner delegation email
const sendPartnerDelegationEmail = async (req, res) => {
  try {
    const {
      partnerId,
      partnerName,
      delegateId,
      ceoName,
      delegateEmail,
      delegateName,
      delegationLink
    } = req.body;

    console.log('📧 Triggering partner delegation email for:', delegateEmail);

    // Validate required fields
    if (!delegateEmail || !delegateName || !partnerId || !partnerName) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: delegateEmail, delegateName, partnerId, or partnerName'
      });
    }

    // Generate secure delegation link if not provided
    const baseUrl = process.env.NODE_ENV === 'production'
      ? 'https://tpx.power100.io'
      : 'http://localhost:3002';
    const finalDelegationLink = delegationLink ||
      `${baseUrl}/partner/onboarding?step=8&partner=${partnerId}`;

    // Trigger n8n delegation email workflow
    const n8nPayload = {
      partnerId,
      partnerName,
      delegateId: delegateId || `delegate-${partnerId}-${Date.now()}`,
      ceoName: ceoName || 'CEO',
      delegateEmail,
      delegateName,
      delegationLink: finalDelegationLink,
      triggerType: 'partner_delegation',
      timestamp: new Date().toISOString()
    };

    const response = await axios.post(
      `${N8N_WEBHOOK_BASE}/webhook/partner-delegation-email`,
      n8nPayload,
      {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 30000 // 30 second timeout
      }
    );

    console.log('✅ Partner delegation email workflow triggered successfully');

    res.status(200).json({
      success: true,
      message: 'Delegation email sent successfully',
      workflowTriggered: true,
      partnerId: partnerId,
      delegateId: n8nPayload.delegateId,
      delegateEmail: delegateEmail,
      delegationLink: finalDelegationLink,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error sending delegation email:', error.message);
    
    // If n8n workflow doesn't exist yet, return a softer error
    if (error.response?.status === 404) {
      return res.status(200).json({
        success: true,
        message: 'Delegation email queued (workflow pending setup in n8n)',
        workflowTriggered: false,
        partnerId: req.body.partnerId,
        delegateEmail: req.body.delegateEmail,
        note: 'n8n workflow needs to be created at /webhook/partner-delegation-email'
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to send delegation email',
      details: error.response?.data || error.message
    });
  }
};

// Routes
router.post('/welcome', sendWelcomeEmail);
router.post('/stage-notification', sendStageNotification);
router.post('/partner-delegation', sendPartnerDelegationEmail);

// NEW: Event Email Orchestration Routes (n8n inbound/outbound)
router.post('/inbound', flexibleProtect, emailController.handleInboundEmail);
router.post('/outbound', flexibleProtect, emailController.sendOutboundEmail);

module.exports = router;