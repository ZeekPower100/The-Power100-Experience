// DATABASE-CHECKED: strategic_partners, power_card_templates, power_card_campaigns, power_card_recipients columns verified November 11, 2025
// ================================================================
// Pre-Onboarding PowerCard Service (Phase 1)
// ================================================================
// Purpose: Generate PowerCard campaigns when partners complete Step 8 onboarding
// Flow: Step 8 Complete → Parse References → Create Campaign → Send Emails
// ================================================================

const { query } = require('../config/database');
const powerCardService = require('./powerCardService');
const axios = require('axios');
const { safeJsonStringify } = require('../utils/jsonHelpers');
const { buildTags } = require('../utils/tagBuilder');

/**
 * Parse reference text field into structured array
 *
 * Expected format: "Name <email@example.com>, Another Name <another@example.com>"
 *
 * @param {string} referencesText - Comma-separated references in "Name <email>" format
 * @returns {Array} Array of {name, email} objects
 */
function parseReferences(referencesText) {
  if (!referencesText || typeof referencesText !== 'string' || referencesText.trim() === '') {
    return [];
  }

  // Split by comma
  const refs = referencesText.split(',').map(ref => ref.trim());

  // Parse each reference with regex: "Name <email>"
  const parsed = refs
    .map(ref => {
      // Match pattern: "Any Text <email@domain.com>"
      const match = ref.match(/^(.+?)\s*<(.+?)>$/);

      if (match) {
        const name = match[1].trim();
        const email = match[2].trim();

        // Validate email has @ symbol
        if (email.includes('@')) {
          return { name, email };
        }
      }

      // If no match or invalid email, return null
      return null;
    })
    .filter(ref => ref !== null);

  console.log(`[Pre-Onboarding PowerCard] Parsed ${parsed.length} valid references from text`);
  return parsed;
}

/**
 * Get current quarter and year
 *
 * @returns {Object} {quarter: 'Q1', year: 2025}
 */
function getCurrentQuarter() {
  const now = new Date();
  const month = now.getMonth(); // 0-11
  const year = now.getFullYear();

  let quarter;
  if (month >= 0 && month <= 2) quarter = 'Q1';
  else if (month >= 3 && month <= 5) quarter = 'Q2';
  else if (month >= 6 && month <= 8) quarter = 'Q3';
  else quarter = 'Q4';

  return { quarter, year };
}

/**
 * Generate Pre-Onboarding PowerCard Campaign
 *
 * This is the main function called when partner completes Step 8.
 *
 * FLOW:
 * 1. Get partner data from database
 * 2. Parse client_references and employee_references
 * 3. Create PowerCard template (using existing service)
 * 4. Create PowerCard campaign (using existing service)
 * 5. Add recipients (using existing service)
 * 6. Send emails with unique survey links
 *
 * @param {number} partnerId - Strategic partner ID
 * @returns {Object} Campaign generation results
 */
async function generatePreOnboardingCampaign(partnerId) {
  console.log(`[Pre-Onboarding PowerCard] Starting campaign generation for partner ${partnerId}`);

  try {
    // STEP 1: Get partner data
    const partnerResult = await query(`
      SELECT
        id, company_name, logo_url,
        client_references, employee_references,
        focus_areas_served, is_active
      FROM strategic_partners
      WHERE id = $1
    `, [partnerId]);

    if (partnerResult.rows.length === 0) {
      throw new Error(`Partner ${partnerId} not found`);
    }

    const partner = partnerResult.rows[0];

    if (!partner.is_active) {
      console.log(`[Pre-Onboarding PowerCard] ⚠️ Partner ${partnerId} is not active, skipping`);
      return { success: false, reason: 'Partner not active' };
    }

    console.log(`[Pre-Onboarding PowerCard] Processing partner: ${partner.company_name}`);

    // STEP 2: Parse references from TEXT fields
    const customerRefs = parseReferences(partner.client_references);
    const employeeRefs = parseReferences(partner.employee_references);

    const totalRecipients = customerRefs.length + employeeRefs.length;

    if (totalRecipients === 0) {
      console.log(`[Pre-Onboarding PowerCard] ⚠️ No valid references found for partner ${partnerId}`);
      return {
        success: false,
        reason: 'No valid references found',
        customerCount: 0,
        employeeCount: 0
      };
    }

    console.log(`[Pre-Onboarding PowerCard] Found ${customerRefs.length} customers + ${employeeRefs.length} employees = ${totalRecipients} total`);

    // STEP 3: Create PowerCard template with standard pre-onboarding questions
    const templateData = {
      partner_id: partnerId,
      partner_type: 'strategic_partner',
      metric_1_name: 'Communication Quality',
      metric_1_question: 'How would you rate the quality and responsiveness of communication?',
      metric_1_type: 'rating',
      metric_2_name: 'Service Delivery',
      metric_2_question: 'How satisfied are you with the service delivery and execution?',
      metric_2_type: 'rating',
      metric_3_name: 'Value for Investment',
      metric_3_question: 'How would you rate the value you received for your investment?',
      metric_3_type: 'rating',
      include_satisfaction_score: true,
      include_recommendation_score: true,
      include_culture_questions: false
    };

    console.log(`[Pre-Onboarding PowerCard] Creating template...`);
    const template = await powerCardService.createTemplate(templateData);

    if (!template || !template.id) {
      throw new Error('Failed to create PowerCard template');
    }

    console.log(`[Pre-Onboarding PowerCard] ✅ Template created: ID ${template.id}`);

    // STEP 4: Create PowerCard campaign
    const { quarter, year } = getCurrentQuarter();
    const campaignName = `${partner.company_name} Pre-Onboarding ${quarter} ${year}`;

    const now = new Date();
    const endDate = new Date(now);
    endDate.setDate(endDate.getDate() + 30); // 30 days from now

    const campaignData = {
      campaign_name: campaignName,
      quarter,
      year,
      start_date: now,
      end_date: endDate,
      reminder_date: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
      status: 'active' // Active immediately, waiting for responses
    };

    console.log(`[Pre-Onboarding PowerCard] Creating campaign: ${campaignName}`);
    const campaign = await powerCardService.createCampaign(campaignData);

    if (!campaign || !campaign.id) {
      throw new Error('Failed to create PowerCard campaign');
    }

    console.log(`[Pre-Onboarding PowerCard] ✅ Campaign created: ID ${campaign.id}`);

    // STEP 5: Add recipients (customers and employees)
    const recipients = [];

    // Add customer recipients (using database constraint value: 'contractor_client')
    customerRefs.forEach(ref => {
      recipients.push({
        recipient_type: 'contractor_client',
        recipient_id: null, // Anonymous - no contractor ID
        recipient_email: ref.email,
        recipient_name: ref.name,
        company_id: partnerId,
        company_type: 'strategic_partner',
        revenue_tier: null
      });
    });

    // Add employee recipients (using database constraint value: 'partner_employee')
    employeeRefs.forEach(ref => {
      recipients.push({
        recipient_type: 'partner_employee',
        recipient_id: null, // Anonymous - no employee ID
        recipient_email: ref.email,
        recipient_name: ref.name,
        company_id: partnerId,
        company_type: 'strategic_partner',
        revenue_tier: null
      });
    });

    console.log(`[Pre-Onboarding PowerCard] Adding ${recipients.length} recipients...`);
    const recipientResults = await powerCardService.addRecipients(
      campaign.id,
      template.id,
      recipients
    );

    console.log(`[Pre-Onboarding PowerCard] ✅ Added ${recipientResults.length} recipients`);

    // Update campaign total_sent count
    await query(`
      UPDATE power_card_campaigns
      SET total_sent = $1
      WHERE id = $2
    `, [recipientResults.length, campaign.id]);

    // STEP 6: Send EMAIL + SMS notifications with unique survey links
    // Architecture: Backend → n8n → GHL (following event orchestration pattern)
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3002';
    const n8nWebhookBase = process.env.N8N_WEBHOOK_BASE || 'https://n8n.srv918843.hstgr.cloud';
    const n8nEnv = process.env.NODE_ENV === 'production' ? '' : '-dev';

    let emailsSent = 0;
    let smsSent = 0;
    const communicationErrors = [];

    for (const recipientData of recipientResults) {
      try {
        const surveyUrl = `${frontendUrl}/power-cards/survey/${recipientData.survey_link}`;
        const firstName = recipientData.recipient_name.split(' ')[0];

        // Build email HTML content
        const emailSubject = `${partner.company_name} wants your feedback`;
        const emailBody = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Your Feedback Matters!</h2>
            <p>Hi ${firstName},</p>
            <p>${partner.company_name} values your opinion and would appreciate your honest feedback about your experience.</p>
            <p>This brief survey takes just 3-5 minutes to complete and your responses are completely anonymous.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${surveyUrl}"
                 style="background-color: #28a745; color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; display: inline-block;">
                Take Survey Now
              </a>
            </div>
            <p style="color: #666; font-size: 14px;">
              Your feedback helps ${partner.company_name} continue improving their services and delivering exceptional value.
            </p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            <p style="color: #999; font-size: 12px;">
              This survey is powered by The Power100 Experience. If you have questions, please contact us.
            </p>
          </div>
        `;

        // Build SMS message
        const smsMessage = `Hi ${firstName}! ${partner.company_name} wants your feedback. Take a quick 3-min survey: ${surveyUrl}`;

        // Save EMAIL message to database
        const emailMessageResult = await query(`
          INSERT INTO power_card_messages (
            campaign_id, recipient_id, message_type, direction, channel,
            scheduled_time, actual_send_time, personalization_data,
            recipient_email, message_content, status
          ) VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, $6, $7, $8, $9)
          RETURNING id
        `, [
          campaign.id,
          recipientData.id,
          'survey_invitation',
          'outbound',
          'email',
          safeJsonStringify({
            email_subject: emailSubject,
            partner_name: partner.company_name,
            survey_url: surveyUrl
          }),
          recipientData.recipient_email,
          emailBody,
          'pending'
        ]);

        const emailMessageId = emailMessageResult.rows[0].id;

        // Send EMAIL via n8n webhook
        const emailWebhook = `${n8nWebhookBase}/webhook/email-outbound${n8nEnv}`;
        const emailTags = buildTags({
          category: 'powercard',
          type: 'survey-invitation',
          recipient: 'external',
          channel: 'email',
          status: 'sent',
          entityId: campaign.id
        });

        try {
          await axios.post(emailWebhook, {
            message_id: emailMessageId,
            to_email: recipientData.recipient_email,
            to_name: recipientData.recipient_name,
            subject: emailSubject,
            body: emailBody,
            template: 'powercard_survey_invitation',
            tags: emailTags,
            campaign_id: campaign.id,
            partner_id: partnerId
          }, { timeout: 10000 });

          // Update email message status
          await query(`
            UPDATE power_card_messages
            SET status = 'sent', sent_at = NOW()
            WHERE id = $1
          `, [emailMessageId]);

          emailsSent++;
          console.log(`[Pre-Onboarding PowerCard] ✅ Email sent to ${recipientData.recipient_email}`);
        } catch (emailError) {
          // Dev-friendly: Don't fail if n8n webhook not set up yet
          if (emailError.response?.status === 404) {
            console.log(`[Pre-Onboarding PowerCard] ⚠️  n8n email webhook not found (dev mode - this is ok)`);
          } else {
            console.warn(`[Pre-Onboarding PowerCard] ⚠️  Email webhook error:`, emailError.message);
          }
        }

        // Save SMS message to database
        const smsMessageResult = await query(`
          INSERT INTO power_card_messages (
            campaign_id, recipient_id, message_type, direction, channel,
            scheduled_time, actual_send_time, personalization_data,
            recipient_phone, message_content, status
          ) VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, $6, $7, $8, $9)
          RETURNING id
        `, [
          campaign.id,
          recipientData.id,
          'survey_invitation',
          'outbound',
          'sms',
          safeJsonStringify({
            partner_name: partner.company_name,
            survey_url: surveyUrl
          }),
          recipientData.recipient_phone || recipientData.recipient_email, // Fallback to email if no phone
          smsMessage,
          'pending'
        ]);

        const smsMessageId = smsMessageResult.rows[0].id;

        // Send SMS via n8n webhook (if phone exists)
        if (recipientData.recipient_phone) {
          const smsWebhook = process.env.NODE_ENV === 'production'
            ? `${n8nWebhookBase}/webhook/backend-to-ghl`
            : `${n8nWebhookBase}/webhook/backend-to-ghl-dev`;

          const smsTags = buildTags({
            category: 'powercard',
            type: 'survey-invitation',
            recipient: 'external',
            channel: 'sms',
            status: 'sent',
            entityId: campaign.id
          });

          try {
            await axios.post(smsWebhook, {
              send_via_ghl: {
                phone: recipientData.recipient_phone,
                message: smsMessage,
                timestamp: new Date().toISOString(),
                tags: smsTags
              }
            }, { timeout: 10000 });

            // Update SMS message status
            await query(`
              UPDATE power_card_messages
              SET status = 'sent', sent_at = NOW()
              WHERE id = $1
            `, [smsMessageId]);

            smsSent++;
            console.log(`[Pre-Onboarding PowerCard] ✅ SMS sent to ${recipientData.recipient_phone}`);
          } catch (smsError) {
            // Dev-friendly: Don't fail if n8n webhook not set up yet
            if (smsError.response?.status === 404) {
              console.log(`[Pre-Onboarding PowerCard] ⚠️  n8n SMS webhook not found (dev mode - this is ok)`);
            } else {
              console.warn(`[Pre-Onboarding PowerCard] ⚠️  SMS webhook error:`, smsError.message);
            }
          }
        }

        // Update recipient status to 'sent'
        await query(`
          UPDATE power_card_recipients
          SET status = 'sent', sent_at = NOW()
          WHERE id = $1
        `, [recipientData.id]);

      } catch (error) {
        console.error(`[Pre-Onboarding PowerCard] ❌ Failed to send notifications to ${recipientData.recipient_email}:`, error.message);
        communicationErrors.push({
          recipient: recipientData.recipient_email,
          error: error.message
        });
      }
    }

    console.log(`[Pre-Onboarding PowerCard] ✅ Campaign generation complete!`);
    console.log(`[Pre-Onboarding PowerCard] Summary: ${emailsSent} emails + ${smsSent} SMS sent to ${recipientResults.length} recipients`);

    return {
      success: true,
      campaignId: campaign.id,
      campaignName: campaign.campaign_name,
      templateId: template.id,
      totalRecipients: recipientResults.length,
      customerCount: customerRefs.length,
      employeeCount: employeeRefs.length,
      emailsSent,
      smsSent,
      communicationErrors: communicationErrors.length > 0 ? communicationErrors : undefined
    };

  } catch (error) {
    console.error(`[Pre-Onboarding PowerCard] ❌ Campaign generation failed for partner ${partnerId}:`, error);
    throw error;
  }
}

/**
 * Check if partner already has a pre-onboarding campaign
 *
 * @param {number} partnerId - Strategic partner ID
 * @returns {boolean} True if campaign already exists
 */
async function hasPreOnboardingCampaign(partnerId) {
  const result = await query(`
    SELECT c.id
    FROM power_card_campaigns c
    JOIN power_card_templates t ON c.id = (
      SELECT campaign_id FROM power_card_recipients WHERE template_id = t.id LIMIT 1
    )
    WHERE t.partner_id = $1
      AND c.campaign_name LIKE '%Pre-Onboarding%'
    LIMIT 1
  `, [partnerId]);

  return result.rows.length > 0;
}

module.exports = {
  generatePreOnboardingCampaign,
  parseReferences,
  hasPreOnboardingCampaign
};
