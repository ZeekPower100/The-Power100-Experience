// DATABASE-CHECKED: contractors, ai_learning_events verified October 17, 2025
// INTEGRATION: n8n webhook → GHL Email service (SAME PATTERN AS SMS)
// WEBHOOK URLS:
//   - Production: https://n8n.srv918843.hstgr.cloud/webhook/email-outbound
//   - Development: https://n8n.srv918843.hstgr.cloud/webhook/email-outbound-dev
// VERIFIED DATABASE FIELDS:
// - contractors.email (VARCHAR)
// - contractors.first_name (VARCHAR)
// - contractors.last_name (VARCHAR)
// - ai_learning_events.event_type (VARCHAR) - Uses 'email_sent'
// VERIFIED WEBHOOK PAYLOAD: { message_id, to_email, to_name, subject, body, template, contractor_id }

const { z } = require('zod');
const { tool } = require('@langchain/core/tools');
const { query } = require('../../../config/database');
const axios = require('axios');
const AIActionGuards = require('../../guards/aiActionGuards');
const { wrapICEmailTemplate, IC_BRAND } = require('../../innerCircleEmailTemplates');
const GuardLogger = require('../../guards/guardLogger');

/**
 * Zod schema for email sending validation
 * Follows DynamicStructuredTool pattern used by all AI Concierge tools
 */
const SendEmailSchema = z.object({
  contractorId: z.number().int().positive().describe('The contractor ID to send email to'),
  subject: z.string().min(1).max(200).describe('Email subject line (max 200 characters)'),
  message: z.string().min(1).describe('The email message content (supports plain text and basic HTML)'),
  emailType: z.enum([
    'event_info',
    'sponsor_info',
    'session_details',
    'networking_opportunity',
    'action_item',
    'follow_up',
    'resource_share',
    'general'
  ]).describe('Type of email being sent - helps categorize and track communications')
});

/**
 * Send email to contractor via n8n webhook → GoHighLevel (SAME PATTERN AS SMS)
 *
 * This tool allows AI Concierge agents to send emails in real-time during conversations.
 * It complements (does not replace) the existing Event Orchestration automated email system.
 *
 * Integration Pattern:
 * - Uses n8n webhook → GHL (same pattern as emailScheduler.js lines 113, 227, 370, etc.)
 * - Environment-aware: production vs development webhook URLs
 * - Logs all email actions to ai_learning_events for continuous learning
 * - Includes AI Action Guards for rate limiting and permission checks
 *
 * @param {Object} params - Email parameters
 * @param {number} params.contractorId - Contractor ID from database
 * @param {string} params.subject - Email subject line
 * @param {string} params.message - Email message content
 * @param {string} params.emailType - Type of email (event_info, sponsor_info, etc.)
 * @returns {string} JSON string with success status and details
 */
const sendEmailFunction = async ({ contractorId, subject, message, emailType }) => {
  const startTime = Date.now();

  try {
    // Guard check: Verify AI has permission to send email
    // Check IC members first to avoid ID collision with contractors table
    const permissionCheck = await AIActionGuards.canSendEmail(contractorId, { checkIcFirst: true });
    if (!permissionCheck.allowed) {
      await GuardLogger.logRejection({
        guardType: 'email_permission',
        contractorId,
        reason: permissionCheck.reason,
        details: { emailType, subject }
      });

      return JSON.stringify({
        success: false,
        error: 'Permission denied',
        reason: permissionCheck.reason,
        suggestion: 'Rate limit may have been reached or contractor has opted out of emails'
      });
    }

    // Get recipient email and name — check IC members first (avoids ID collision with contractors)
    let contractor;
    let isInnerCircle = false;

    // Check inner_circle_members first (IC agent passes member_id as contractorId)
    const memberResult = await query(
      'SELECT email, name, phone FROM inner_circle_members WHERE id = $1',
      [contractorId]
    );
    if (memberResult.rows.length) {
      const member = memberResult.rows[0];
      const nameParts = (member.name || '').split(' ');
      contractor = {
        email: member.email,
        first_name: nameParts[0] || '',
        last_name: nameParts.slice(1).join(' ') || '',
        phone: member.phone
      };
      isInnerCircle = true;
    } else {
      // Fallback: check contractors table
      const contractorResult = await query(
        'SELECT email, first_name, last_name, phone FROM contractors WHERE id = $1',
        [contractorId]
      );
      if (contractorResult.rows.length) {
        contractor = contractorResult.rows[0];
      }
    }

    if (!contractor) {
      return JSON.stringify({
        success: false,
        error: 'Recipient not found',
        contractorId
      });
    }

    if (!contractor.email) {
      return JSON.stringify({
        success: false,
        error: 'No email address on file',
        suggestion: 'Ask them to provide email address or use SMS if phone number available',
        contractorId
      });
    }

    // Build recipient name for personalization
    const contractorName = `${contractor.first_name || ''} ${contractor.last_name || ''}`.trim() || 'Valued Member';

    // Format email with HTML — use IC-branded template for IC members, standard for contractors
    let htmlContent;
    if (isInnerCircle) {
      // IC dark theme with gold accents, inline styles
      const icContent = `
        <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: ${IC_BRAND.white};">
          Hi <strong>${contractorName}</strong>,
        </p>
        <div style="margin: 0 0 32px 0; font-size: 15px; line-height: 1.8; color: ${IC_BRAND.dimText}; white-space: pre-wrap;">${message}</div>
        <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid ${IC_BRAND.border};">
          <p style="margin: 0; font-size: 14px; color: ${IC_BRAND.gold}; font-weight: 600;">Your AI Business Concierge</p>
          <p style="margin: 4px 0 0 0; font-size: 13px; color: ${IC_BRAND.mutedText};">Power100 Inner Circle</p>
        </div>
      `;
      htmlContent = wrapICEmailTemplate(icContent);
    } else {
      // Standard concierge template with inline styles
      htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; background-color: #f4f4f4;">
  <div style="max-width: 600px; margin: 0 auto;">
    <div style="background: linear-gradient(135deg, #FB0401 0%, #c70300 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
      <h2 style="margin: 0; font-size: 22px;">The Power100 Experience</h2>
      <p style="margin: 5px 0 0 0; font-size: 14px; opacity: 0.9;">AI Concierge</p>
    </div>
    <div style="background: #ffffff; padding: 30px; border-left: 1px solid #e0e0e0; border-right: 1px solid #e0e0e0;">
      <p style="margin: 0 0 16px 0; font-size: 16px;">Hi ${contractorName},</p>
      <div style="white-space: pre-wrap; line-height: 1.8; font-size: 15px; color: #333;">${message}</div>
      <div style="margin-top: 24px; padding-top: 20px; border-top: 2px solid #e0e0e0;">
        <p style="margin: 0; font-style: italic; color: #6c757d;"><strong>Your AI Business Concierge</strong><br>The Power100 Experience<br><em>Always here to help you succeed</em></p>
      </div>
    </div>
    <div style="background: #f8f9fa; padding: 20px; border-radius: 0 0 8px 8px; text-align: center; font-size: 12px; color: #6c757d; border: 1px solid #e0e0e0; border-top: none;">
      <p style="margin: 0 0 4px 0;">This email was sent by your AI Concierge at The Power100 Experience.</p>
      <p style="margin: 0;">If you have questions or prefer different communication methods, just let us know!</p>
    </div>
  </div>
</body>
</html>
      `.trim();
    }

    // Determine webhook URL based on environment (same pattern as emailScheduler.js)
    const N8N_WEBHOOK_BASE = process.env.N8N_WEBHOOK_BASE || 'https://n8n.srv918843.hstgr.cloud';
    const N8N_ENV = process.env.NODE_ENV === 'production' ? '' : '-dev';
    const n8nWebhook = `${N8N_WEBHOOK_BASE}/webhook/email-outbound${N8N_ENV}`;

    console.log(`[AI Concierge Email] Sending via ${process.env.NODE_ENV || 'development'} webhook: ${n8nWebhook}`);

    // Create n8n payload — sender identity based on context
    const senderEmail = isInnerCircle ? 'innercircle@outreach.power100.io' : 'concierge@outreach.power100.io';
    const senderName = isInnerCircle ? 'Power100 Inner Circle' : 'Power100 Concierge';
    const n8nPayload = {
      from_email: senderEmail,
      from_name: senderName,
      to_email: contractor.email,
      to_name: contractorName,
      subject: subject,
      body: htmlContent,
      template: 'ai_concierge_message',
      contractor_id: contractorId,
      email_type: emailType,
      sent_by: 'ai_concierge',
      timestamp: new Date().toISOString()
    };

    // Send email via n8n webhook → GHL
    const webhookResponse = await axios.post(n8nWebhook, n8nPayload, {
      timeout: 10000 // 10 second timeout
    });

    const responseTime = Date.now() - startTime;

    // Log successful email to ai_learning_events (non-blocking — don't let logging break success)
    try {
      await query(`
        INSERT INTO ai_learning_events (
          event_type,
          contractor_id,
          action_taken,
          outcome,
          context,
          created_at
        ) VALUES ($1, $2, $3, $4, $5, NOW())
      `, [
        'email_sent',
        contractorId,
        `Sent ${emailType} email via AI Concierge`,
        'success',
        JSON.stringify({
          emailType,
          subject,
          messageLength: message.length,
          to: contractor.email,
          responseTime,
          webhookStatus: webhookResponse.status,
          isInnerCircle,
          environment: process.env.NODE_ENV || 'development'
        })
      ]);
    } catch (logErr) {
      console.error('[AI Concierge Email] Non-blocking log error:', logErr.message);
    }

    return JSON.stringify({
      success: true,
      sent_to: contractor.email,
      contractor_name: contractorName,
      subject: subject,
      email_type: emailType,
      message_length: message.length,
      response_time_ms: responseTime,
      environment: process.env.NODE_ENV || 'development'
    });

  } catch (error) {
    const responseTime = Date.now() - startTime;

    // Log failed email attempt for debugging and learning
    await query(`
      INSERT INTO ai_learning_events (
        event_type,
        contractor_id,
        action_taken,
        outcome,
        context,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, NOW())
    `, [
      'email_failed',
      contractorId,
      `Failed to send ${emailType} email via AI Concierge`,
      'error',
      JSON.stringify({
        emailType,
        subject,
        error: error.message,
        responseTime,
        stack: error.stack
      })
    ]).catch(err => {
      console.error('Failed to log email error to ai_learning_events:', err);
    });

    return JSON.stringify({
      success: false,
      error: error.message,
      email_type: emailType,
      subject: subject,
      suggestion: 'Email service may be temporarily unavailable. Consider using SMS instead or try again later.',
      response_time_ms: responseTime
    });
  }
};

/**
 * LangChain DynamicStructuredTool for email sending
 * Binds to AI Concierge agents via model.bindTools()
 */
const sendEmailTool = tool(sendEmailFunction, {
  name: 'send_email',
  description: `Send an email to a contractor via their registered email address.

Use this tool when:
- Contractor requests detailed information that requires formatting
- Sharing resources, links, or documents that are better suited for email
- Following up on conversations with comprehensive summaries
- Sending event details, sponsor information, or session schedules
- Contractor prefers email communication (check their preferences first)
- SMS is not appropriate due to message length or content type

Important guidelines:
- Write clear, professional subject lines that explain the email's purpose
- Keep messages well-structured and easy to read
- Always provide value - don't send unnecessary emails
- Respect rate limits - don't spam contractors with multiple emails
- Use appropriate emailType to help track and categorize communications
- Personalize content when possible using contractor's name and context
- Include relevant links, resources, or action items clearly

Environment-aware: Automatically uses production or development webhook based on NODE_ENV

Returns: JSON with success status, delivery details, and error messages if applicable`,
  schema: SendEmailSchema
});

module.exports = sendEmailTool;
