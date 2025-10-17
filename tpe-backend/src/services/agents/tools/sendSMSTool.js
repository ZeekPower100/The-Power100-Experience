// DATABASE-CHECKED: contractors, ai_learning_events verified October 17, 2025
// INTEGRATION: n8n webhook → GHL SMS service (ALREADY WORKING)
// WEBHOOK URLS:
//   - Production: https://n8n.srv918843.hstgr.cloud/webhook/backend-to-ghl
//   - Development: https://n8n.srv918843.hstgr.cloud/webhook/backend-to-ghl-dev
// VERIFIED DATABASE FIELDS:
// - contractors.phone (VARCHAR)
// - contractors.first_name (VARCHAR)
// - ai_learning_events.event_type (VARCHAR) - Uses 'sms_sent'
// VERIFIED WEBHOOK PAYLOAD: { send_via_ghl: { phone, message, contractor_id, message_type } }

const { z } = require('zod');
const { tool } = require('@langchain/core/tools');
const { query } = require('../../../config/database');
const axios = require('axios');
const AIActionGuards = require('../../guards/aiActionGuards');
const GuardLogger = require('../../guards/guardLogger');

/**
 * Zod schema for SMS sending validation
 * Follows DynamicStructuredTool pattern used by all AI Concierge tools
 */
const SendSMSSchema = z.object({
  contractorId: z.number().int().positive().describe('The contractor ID to send SMS to'),
  message: z.string().min(1).max(1600).describe('The SMS message content to send (max 1600 characters for multi-part SMS)'),
  messageType: z.enum([
    'event_info',
    'sponsor_info',
    'session_alert',
    'networking_tip',
    'action_item',
    'follow_up',
    'general'
  ]).describe('Type of SMS message being sent - helps categorize and track communications')
});

/**
 * Send SMS to contractor via n8n webhook → GoHighLevel
 *
 * This tool allows AI Concierge agents to send SMS messages in real-time during conversations.
 * It complements (does not replace) the existing Event Orchestration automated SMS system.
 *
 * Integration Pattern:
 * - Uses same n8n webhook as eventOrchestratorAutomation.js (lines 66-68)
 * - Webhook routes to GoHighLevel SMS service
 * - Environment-aware: production vs development webhook URLs
 * - Logs all SMS actions to ai_learning_events for continuous learning
 * - Includes AI Action Guards for rate limiting and permission checks
 *
 * @param {Object} params - SMS parameters
 * @param {number} params.contractorId - Contractor ID from database
 * @param {string} params.message - SMS message content
 * @param {string} params.messageType - Type of message (event_info, sponsor_info, etc.)
 * @returns {string} JSON string with success status and details
 */
const sendSMSFunction = async ({ contractorId, message, messageType }) => {
  const startTime = Date.now();

  try {
    // Guard check: Verify AI has permission to send SMS
    const permissionCheck = await AIActionGuards.canSendSMS(contractorId);
    if (!permissionCheck.allowed) {
      await GuardLogger.logRejection({
        guardType: 'sms_permission',
        contractorId,
        reason: permissionCheck.reason,
        details: { messageType, messageLength: message.length }
      });

      return JSON.stringify({
        success: false,
        error: 'Permission denied',
        reason: permissionCheck.reason,
        suggestion: 'Rate limit may have been reached or contractor has opted out of SMS'
      });
    }

    // Get contractor phone number and name
    const contractorResult = await query(
      'SELECT phone, first_name, last_name, email FROM contractors WHERE id = $1',
      [contractorId]
    );

    if (!contractorResult.rows.length) {
      return JSON.stringify({
        success: false,
        error: 'Contractor not found',
        contractorId
      });
    }

    const contractor = contractorResult.rows[0];

    if (!contractor.phone) {
      return JSON.stringify({
        success: false,
        error: 'No phone number on file for this contractor',
        suggestion: 'Ask contractor to provide phone number or use email instead',
        contractorId
      });
    }

    // Determine webhook URL based on environment (same pattern as eventOrchestratorAutomation.js)
    const n8nWebhook = process.env.NODE_ENV === 'production'
      ? 'https://n8n.srv918843.hstgr.cloud/webhook/backend-to-ghl'
      : 'https://n8n.srv918843.hstgr.cloud/webhook/backend-to-ghl-dev';

    console.log(`[AI Concierge SMS] Sending via ${process.env.NODE_ENV || 'development'} webhook: ${n8nWebhook}`);

    // Send SMS via n8n webhook → GoHighLevel
    const webhookResponse = await axios.post(n8nWebhook, {
      send_via_ghl: {
        phone: contractor.phone,
        message: message,
        contractor_id: contractorId,
        contractor_name: `${contractor.first_name || ''} ${contractor.last_name || ''}`.trim(),
        message_type: messageType,
        sent_by: 'ai_concierge',
        timestamp: new Date().toISOString()
      }
    }, {
      timeout: 10000 // 10 second timeout
    });

    const responseTime = Date.now() - startTime;

    // Log successful SMS to ai_learning_events for continuous learning
    await query(`
      INSERT INTO ai_learning_events (
        event_type,
        contractor_id,
        action_taken,
        outcome,
        metadata,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, NOW())
    `, [
      'sms_sent',
      contractorId,
      `Sent ${messageType} SMS via AI Concierge`,
      'success',
      JSON.stringify({
        messageType,
        messageLength: message.length,
        phone: contractor.phone,
        responseTime,
        webhookStatus: webhookResponse.status,
        environment: process.env.NODE_ENV || 'development'
      })
    ]);

    // Log success to guard system
    await GuardLogger.logSuccess({
      guardType: 'sms_sent',
      contractorId,
      details: {
        messageType,
        messageLength: message.length,
        responseTime
      }
    });

    return JSON.stringify({
      success: true,
      sent_to: contractor.phone,
      contractor_name: `${contractor.first_name || ''} ${contractor.last_name || ''}`.trim(),
      message_type: messageType,
      message_length: message.length,
      response_time_ms: responseTime,
      environment: process.env.NODE_ENV || 'development'
    });

  } catch (error) {
    const responseTime = Date.now() - startTime;

    // Log failed SMS attempt for debugging and learning
    await query(`
      INSERT INTO ai_learning_events (
        event_type,
        contractor_id,
        action_taken,
        outcome,
        metadata,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, NOW())
    `, [
      'sms_failed',
      contractorId,
      `Failed to send ${messageType} SMS via AI Concierge`,
      'error',
      JSON.stringify({
        messageType,
        error: error.message,
        responseTime,
        stack: error.stack
      })
    ]).catch(err => {
      console.error('Failed to log SMS error to ai_learning_events:', err);
    });

    return JSON.stringify({
      success: false,
      error: error.message,
      message_type: messageType,
      suggestion: 'SMS service may be temporarily unavailable. Consider using email instead.',
      response_time_ms: responseTime
    });
  }
};

/**
 * LangChain DynamicStructuredTool for SMS sending
 * Binds to AI Concierge agents via model.bindTools()
 */
const sendSMSTool = tool(sendSMSFunction, {
  name: 'send_sms',
  description: `Send an SMS message to a contractor via their registered phone number.

Use this tool when:
- Contractor requests immediate notification or reminder
- Time-sensitive event information needs to be shared quickly
- Following up on action items that require urgency
- Sending networking tips or session alerts during events
- Contractor prefers SMS communication (check their preferences first)

Important guidelines:
- Keep messages concise and valuable (under 160 characters ideal for single SMS)
- Always provide context in the message (who you are, why you're texting)
- Respect rate limits - don't spam contractors with multiple SMS in short time
- Use appropriate messageType to help track and categorize communications
- If SMS fails, consider using send_email tool as fallback

Environment-aware: Automatically uses production or development webhook based on NODE_ENV

Returns: JSON with success status, delivery details, and error messages if applicable`,
  schema: SendSMSSchema
});

module.exports = sendSMSTool;
