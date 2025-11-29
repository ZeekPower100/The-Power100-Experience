// Power Cards Service - Manages quarterly feedback surveys and PowerConfidence scoring
const { query, transaction } = require('../config/database');
const crypto = require('crypto');
const powerCardsIntegrationService = require('./powerCardsIntegrationService');
const axios = require('axios');
const { safeJsonStringify } = require('../utils/jsonHelpers');
const { buildTags } = require('../utils/tagBuilder');

class PowerCardService {
  
  // ===== POWER CARD TEMPLATES =====
  
  // Create a new Power Card template for a partner
  async createTemplate(templateData) {
    const {
      partner_id,
      partner_type = 'strategic_partner',
      metric_1_name,
      metric_1_question,
      metric_1_type = 'rating',
      metric_2_name,
      metric_2_question, 
      metric_2_type = 'rating',
      metric_3_name,
      metric_3_question,
      metric_3_type = 'rating',
      include_satisfaction_score = true,
      include_recommendation_score = true,
      include_culture_questions = false
    } = templateData;

    const result = await query(`
      INSERT INTO power_card_templates (
        partner_id, partner_type,
        metric_1_name, metric_1_question, metric_1_type,
        metric_2_name, metric_2_question, metric_2_type,
        metric_3_name, metric_3_question, metric_3_type,
        include_satisfaction_score, include_recommendation_score, include_culture_questions
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING id
    `, [
      partner_id, partner_type,
      metric_1_name, metric_1_question, metric_1_type,
      metric_2_name, metric_2_question, metric_2_type,
      metric_3_name, metric_3_question, metric_3_type,
      include_satisfaction_score, include_recommendation_score, include_culture_questions
    ]);

    if (result.rowCount > 0) {
      return this.getTemplateById(result.rows[0]?.id || result.lastID);
    }
    return null;
  }

  // Get template by ID
  async getTemplateById(templateId) {
    const result = await query(`
      SELECT t.*, p.company_name as partner_name
      FROM power_card_templates t
      LEFT JOIN strategic_partners p ON t.partner_id = p.id
      WHERE t.id = $1
    `, [templateId]);

    return result.rows[0] || null;
  }

  // Get all templates for a partner
  async getTemplatesByPartner(partnerId, partnerType = 'strategic_partner') {
    const result = await query(`
      SELECT * FROM power_card_templates
      WHERE partner_id = $1 AND partner_type = $2 AND is_active = 1
      ORDER BY created_at DESC
    `, [partnerId, partnerType]);

    return result.rows;
  }

  // Get template by survey link (for public survey page)
  async getTemplateBySurveyLink(surveyLink) {
    const result = await query(`
      SELECT
        t.id,
        t.partner_id,
        t.partner_type,
        t.metric_1_name,
        t.metric_1_question,
        t.metric_1_type,
        t.metric_2_name,
        t.metric_2_question,
        t.metric_2_type,
        t.metric_3_name,
        t.metric_3_question,
        t.metric_3_type,
        t.include_satisfaction_score,
        t.include_recommendation_score,
        t.include_culture_questions,
        p.company_name as partner_name,
        p.logo_url as partner_logo,
        r.status as recipient_status,
        r.recipient_name,
        c.campaign_name,
        c.status as campaign_status
      FROM power_card_recipients r
      JOIN power_card_templates t ON r.template_id = t.id
      JOIN power_card_campaigns c ON r.campaign_id = c.id
      LEFT JOIN strategic_partners p ON t.partner_id = p.id
      WHERE r.survey_link = $1
    `, [surveyLink]);

    if (result.rows.length === 0) {
      return null;
    }

    const data = result.rows[0];

    // Check if survey is still valid
    if (data.recipient_status === 'completed') {
      return { error: 'Survey already completed', completed: true };
    }

    if (data.campaign_status === 'closed') {
      return { error: 'Campaign has ended', closed: true };
    }

    return data;
  }

  // ===== POWER CARD CAMPAIGNS =====

  // Create a quarterly campaign
  async createCampaign(campaignData) {
    const {
      campaign_name,
      quarter,
      year,
      start_date,
      end_date,
      reminder_date,
      status = 'draft'
    } = campaignData;

    const result = await query(`
      INSERT INTO power_card_campaigns (
        campaign_name, quarter, year, start_date, end_date, reminder_date, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id
    `, [campaign_name, quarter, year, start_date, end_date, reminder_date, status]);

    if (result.rowCount > 0) {
      return this.getCampaignById(result.rows[0]?.id || result.lastID);
    }
    return null;
  }

  // Get campaign by ID
  async getCampaignById(campaignId) {
    const result = await query(`
      SELECT * FROM power_card_campaigns WHERE id = $1
    `, [campaignId]);

    return result.rows[0] || null;
  }

  // Get active campaigns
  async getActiveCampaigns() {
    const result = await query(`
      SELECT * FROM power_card_campaigns 
      WHERE status IN ('scheduled', 'active')
      ORDER BY start_date DESC
    `);

    return result.rows;
  }

  // ===== POWER CARD RECIPIENTS =====

  // Add recipients to a campaign
  async addRecipients(campaignId, templateId, recipients) {
    const recipientRecords = [];

    for (const recipient of recipients) {
      const surveyLink = this.generateSurveyLink(campaignId, templateId, recipient.recipient_id);
      
      const result = await query(`
        INSERT INTO power_card_recipients (
          campaign_id, template_id, recipient_type, recipient_id,
          recipient_email, recipient_name, company_id, company_type,
          revenue_tier, survey_link
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING id
      `, [
        campaignId, templateId, recipient.recipient_type, recipient.recipient_id,
        recipient.recipient_email, recipient.recipient_name,
        recipient.company_id, recipient.company_type,
        recipient.revenue_tier, surveyLink
      ]);

      if (result.rowCount > 0) {
        recipientRecords.push({
          id: result.rows[0]?.id || result.lastID,
          survey_link: surveyLink,
          ...recipient
        });
      }
    }

    return recipientRecords;
  }

  // Generate unique anonymous survey link
  generateSurveyLink(campaignId, templateId, recipientId) {
    const uniqueCode = crypto.randomBytes(16).toString('hex');
    return `power-card-${campaignId}-${templateId}-${uniqueCode}`;
  }

  // Get recipients for a campaign
  async getCampaignRecipients(campaignId, status = null) {
    let query_sql = `
      SELECT r.*, t.partner_id, p.company_name as partner_name
      FROM power_card_recipients r
      LEFT JOIN power_card_templates t ON r.template_id = t.id
      LEFT JOIN strategic_partners p ON t.partner_id = p.id
      WHERE r.campaign_id = ?
    `;
    const params = [campaignId];

    if (status) {
      query_sql += ` AND r.status = ?`;
      params.push(status);
    }

    query_sql += ` ORDER BY r.created_at DESC`;

    const result = await query(query_sql, params);
    return result.rows;
  }

  // ===== POWER CARD RESPONSES =====

  // Submit a survey response
  async submitResponse(surveyLink, responseData) {
    // Store campaign ID for post-transaction processing
    let campaignId = null;

    // Execute transaction for response submission
    const result = await transaction(async (client) => {
      // First, get the recipient info from survey link
      const recipientResult = await client.query(`
        SELECT * FROM power_card_recipients WHERE survey_link = $1
      `, [surveyLink]);

      if (recipientResult.rows.length === 0) {
        throw new Error('Invalid survey link');
      }

      const recipient = recipientResult.rows[0];
      campaignId = recipient.campaign_id; // Store for later

      // Check if already completed
      if (recipient.status === 'completed') {
        throw new Error('Survey already completed');
      }

      // Insert the response
      const responseResult = await client.query(`
        INSERT INTO power_card_responses (
          recipient_id, campaign_id, template_id,
          metric_1_response, metric_1_score,
          metric_2_response, metric_2_score,
          metric_3_response, metric_3_score,
          satisfaction_score, recommendation_score,
          culture_score, leadership_score, growth_opportunity_score,
          additional_feedback, improvement_suggestions,
          time_to_complete, device_type
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      `, [
        recipient.id, recipient.campaign_id, recipient.template_id,
        responseData.metric_1_response, responseData.metric_1_score,
        responseData.metric_2_response, responseData.metric_2_score,
        responseData.metric_3_response, responseData.metric_3_score,
        responseData.satisfaction_score, responseData.recommendation_score,
        responseData.culture_score, responseData.leadership_score, responseData.growth_opportunity_score,
        responseData.additional_feedback, responseData.improvement_suggestions,
        responseData.time_to_complete, responseData.device_type
      ]);

      // Update recipient status to completed
      await client.query(`
        UPDATE power_card_recipients
        SET status = 'completed', completed_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [recipient.id]);

      // Update campaign stats
      await client.query(`
        UPDATE power_card_campaigns
        SET total_responses = total_responses + 1,
            response_rate = (total_responses + 1) * 100.0 / NULLIF(total_sent, 0)
        WHERE id = $1
      `, [recipient.campaign_id]);

      return {
        success: true,
        response_id: responseResult.rows[0]?.id || responseResult.lastID
      };
    });

    // ================================================================
    // PHASE 2: EVENT-DRIVEN AUTO-TRIGGER FOR CAMPAIGN COMPLETION
    // ================================================================
    // After transaction commits successfully, check if campaign reached threshold
    // This runs asynchronously and does NOT block the response to the user

    if (campaignId) {
      setImmediate(async () => {
        try {
          // Get updated campaign stats
          const campaignResult = await query(`
            SELECT id, campaign_name, total_responses, status
            FROM power_card_campaigns
            WHERE id = $1
          `, [campaignId]);

          if (campaignResult.rows.length === 0) {
            console.log(`[Auto-Processing] Campaign ${campaignId} not found`);
            return;
          }

          const campaign = campaignResult.rows[0];
          const RESPONSE_THRESHOLD = 5; // Minimum responses to trigger processing

          console.log(`[Auto-Processing] Campaign ${campaign.id} (${campaign.campaign_name}): ${campaign.total_responses}/${RESPONSE_THRESHOLD} responses`);

          // Check if threshold reached AND campaign is still active
          if (campaign.total_responses >= RESPONSE_THRESHOLD && campaign.status === 'active') {
            console.log(`[Auto-Processing] ✅ Threshold reached! Processing campaign ${campaign.id}...`);

            // Trigger existing integration service (PowerConfidence calculation)
            const processingResult = await powerCardsIntegrationService.processCampaignCompletion(campaignId);

            // Update campaign status to completed
            await query(`
              UPDATE power_card_campaigns
              SET status = 'completed', updated_at = NOW()
              WHERE id = $1
            `, [campaignId]);

            console.log(`[Auto-Processing] ✅ Campaign ${campaign.id} completed successfully!`);
            console.log(`[Auto-Processing] Results: ${processingResult.totalPartners} partners processed, ${processingResult.succeeded} succeeded, ${processingResult.failed} failed`);
          } else if (campaign.status === 'completed') {
            console.log(`[Auto-Processing] Campaign ${campaign.id} already completed, skipping`);
          } else {
            console.log(`[Auto-Processing] Campaign ${campaign.id} at ${campaign.total_responses}/${RESPONSE_THRESHOLD} responses, waiting for more`);
          }
        } catch (error) {
          console.error(`[Auto-Processing] ❌ Failed to process campaign ${campaignId}:`, error.message);
          // Don't throw - this is a background task, shouldn't affect response submission
        }
      });
    }

    // Return result immediately (don't wait for auto-processing)
    return result;
  }

  // ===== POWERCONFIDENCE SCORE CALCULATION =====

  // Calculate PowerConfidence score for a partner based on campaign responses
  async calculatePowerConfidenceScore(partnerId, campaignId, partnerType = 'strategic_partner') {
    // Get all responses for this partner in this campaign
    const responseResult = await query(`
      SELECT 
        pr.*,
        pt.metric_1_name, pt.metric_2_name, pt.metric_3_name
      FROM power_card_responses pr
      JOIN power_card_recipients pcr ON pr.recipient_id = pcr.id
      JOIN power_card_templates pt ON pr.template_id = pt.id
      WHERE pt.partner_id = $1 AND pr.campaign_id = $2
    `, [partnerId, campaignId]);

    const responses = responseResult.rows;
    
    if (responses.length === 0) {
      return null; // No responses yet
    }

    // Calculate averages
    const averages = {
      satisfaction: this.calculateAverage(responses, 'satisfaction_score'),
      recommendation: this.calculateAverage(responses, 'recommendation_score'),
      metric_1: this.calculateAverage(responses, 'metric_1_score'),
      metric_2: this.calculateAverage(responses, 'metric_2_score'),
      metric_3: this.calculateAverage(responses, 'metric_3_score'),
      culture: this.calculateAverage(responses, 'culture_score'),
      leadership: this.calculateAverage(responses, 'leadership_score'),
      growth_opportunity: this.calculateAverage(responses, 'growth_opportunity_score')
    };

    // Calculate PowerConfidence score (weighted average)
    // 40% customer satisfaction, 30% NPS, 30% custom metrics
    const powerConfidenceScore = Math.round(
      (averages.satisfaction * 0.4) + 
      (averages.recommendation * 0.3) + 
      ((averages.metric_1 + averages.metric_2 + averages.metric_3) / 3 * 0.3)
    );

    // Get previous score for comparison
    const previousScoreResult = await query(`
      SELECT new_score FROM power_confidence_history_v2
      WHERE partner_id = $1 AND partner_type = $2
      ORDER BY calculated_at DESC LIMIT 1
    `, [partnerId, partnerType]);

    const previousScore = previousScoreResult.rows[0]?.new_score || 0;
    const scoreChange = powerConfidenceScore - previousScore;

    // Save to history
    await query(`
      INSERT INTO power_confidence_history_v2 (
        partner_id, partner_type, campaign_id,
        previous_score, new_score, score_change,
        customer_satisfaction_avg, nps_score,
        metric_1_avg, metric_2_avg, metric_3_avg,
        employee_satisfaction_avg, response_count, response_rate
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
    `, [
      partnerId, partnerType, campaignId,
      previousScore, powerConfidenceScore, scoreChange,
      averages.satisfaction, averages.recommendation,
      averages.metric_1, averages.metric_2, averages.metric_3,
      averages.culture, responses.length, 
      (responses.length / await this.getTotalSentForPartner(partnerId, campaignId)) * 100
    ]);

    // Update partner's PowerConfidence score
    await query(`
      UPDATE strategic_partners 
      SET power_confidence_score = $1,
          last_feedback_update = CURRENT_TIMESTAMP,
          total_feedback_responses = $2,
          average_satisfaction = $3
      WHERE id = $4
    `, [powerConfidenceScore, responses.length, averages.satisfaction, partnerId]);

    return {
      score: powerConfidenceScore,
      previousScore,
      scoreChange,
      responseCount: responses.length,
      averages
    };
  }

  // Helper method to calculate average of a field, ignoring null values
  calculateAverage(responses, field) {
    const validScores = responses
      .map(r => r[field])
      .filter(score => score !== null && score !== undefined);
    
    if (validScores.length === 0) return 0;
    
    return validScores.reduce((sum, score) => sum + score, 0) / validScores.length;
  }

  // Get total sent count for a partner in a campaign
  async getTotalSentForPartner(partnerId, campaignId) {
    const result = await query(`
      SELECT COUNT(*) as total_sent
      FROM power_card_recipients pcr
      JOIN power_card_templates pt ON pcr.template_id = pt.id
      WHERE pt.partner_id = $1 AND pcr.campaign_id = $2 AND pcr.status != 'pending'
    `, [partnerId, campaignId]);

    return result.rows[0]?.total_sent || 0;
  }

  // ===== ANALYTICS =====

  // Get Power Card analytics for a campaign
  async getCampaignAnalytics(campaignId) {
    const result = await query(`
      SELECT 
        COUNT(*) as total_recipients,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_responses,
        COUNT(CASE WHEN status = 'sent' THEN 1 END) as sent_count,
        COUNT(CASE WHEN status = 'opened' THEN 1 END) as opened_count,
        AVG(CASE WHEN completed_at IS NOT NULL THEN 
          (julianday(completed_at) - julianday(sent_at)) * 24 * 60 END) as avg_completion_time_minutes
      FROM power_card_recipients
      WHERE campaign_id = $1
    `, [campaignId]);

    const stats = result.rows[0];
    const responseRate = stats.total_recipients > 0 ? 
      (stats.completed_responses / stats.total_recipients * 100).toFixed(2) : 0;

    return {
      ...stats,
      response_rate: parseFloat(responseRate)
    };
  }

  // Get partner performance comparison
  async getPartnerPerformanceComparison(revenueTier, campaignId) {
    const result = await query(`
      SELECT
        pt.partner_id,
        sp.company_name,
        AVG(pr.satisfaction_score) as avg_satisfaction,
        AVG(pr.recommendation_score) as avg_nps,
        COUNT(pr.id) as response_count
      FROM power_card_responses pr
      JOIN power_card_recipients pcr ON pr.recipient_id = pcr.id
      JOIN power_card_templates pt ON pr.template_id = pt.id
      JOIN strategic_partners sp ON pt.partner_id = sp.id
      WHERE pcr.revenue_tier = $1 AND pr.campaign_id = $2
      GROUP BY pt.partner_id, sp.company_name
      HAVING response_count >= 3
      ORDER BY avg_satisfaction DESC
    `, [revenueTier, campaignId]);

    return result.rows;
  }

  // ===== COMMUNICATIONS =====

  /**
   * Send EMAIL + SMS notifications for a PowerCard campaign
   *
   * Architecture: Backend → Database Log → n8n Webhook → GHL Delivery
   *
   * @param {number} campaignId - The campaign ID to send notifications for
   * @param {number} partnerId - The partner ID (for getting partner name)
   * @returns {Object} Results with counts of emails/SMS sent
   */
  async sendCampaignNotifications(campaignId, partnerId) {
    console.log(`[PowerCard Communications] Sending notifications for campaign ${campaignId}...`);

    try {
      // Get campaign info
      const campaign = await this.getCampaignById(campaignId);
      if (!campaign) {
        throw new Error(`Campaign ${campaignId} not found`);
      }

      // Get partner info
      const partnerResult = await query(`
        SELECT id, company_name, logo_url
        FROM strategic_partners
        WHERE id = $1
      `, [partnerId]);

      if (partnerResult.rows.length === 0) {
        throw new Error(`Partner ${partnerId} not found`);
      }

      const partner = partnerResult.rows[0];

      // Get all recipients for this campaign
      const recipientsResult = await query(`
        SELECT id, recipient_name, recipient_email, recipient_phone, survey_link
        FROM power_card_recipients
        WHERE campaign_id = $1 AND status = 'pending'
      `, [campaignId]);

      const recipients = recipientsResult.rows;

      if (recipients.length === 0) {
        console.log(`[PowerCard Communications] ⚠️  No pending recipients for campaign ${campaignId}`);
        return {
          success: true,
          emailsSent: 0,
          smsSent: 0,
          message: 'No pending recipients'
        };
      }

      console.log(`[PowerCard Communications] Found ${recipients.length} pending recipients`);

      // Setup n8n webhooks
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3002';
      const n8nWebhookBase = process.env.N8N_WEBHOOK_BASE || 'https://n8n.srv918843.hstgr.cloud';
      const n8nEnv = process.env.NODE_ENV === 'production' ? '' : '-dev';

      let emailsSent = 0;
      let smsSent = 0;
      const communicationErrors = [];

      // Send notifications to each recipient
      for (const recipientData of recipients) {
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
            campaignId,
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
            entityId: campaignId
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
              campaign_id: campaignId,
              partner_id: partnerId
            }, { timeout: 10000 });

            // Update email message status
            await query(`
              UPDATE power_card_messages
              SET status = 'sent', sent_at = NOW()
              WHERE id = $1
            `, [emailMessageId]);

            emailsSent++;
            console.log(`[PowerCard Communications] ✅ Email sent to ${recipientData.recipient_email}`);
          } catch (emailError) {
            // Dev-friendly: Don't fail if n8n webhook not set up yet
            if (emailError.response?.status === 404) {
              console.log(`[PowerCard Communications] ⚠️  n8n email webhook not found (dev mode - this is ok)`);
            } else {
              console.warn(`[PowerCard Communications] ⚠️  Email webhook error:`, emailError.message);
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
            campaignId,
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
              entityId: campaignId
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
              console.log(`[PowerCard Communications] ✅ SMS sent to ${recipientData.recipient_phone}`);
            } catch (smsError) {
              // Dev-friendly: Don't fail if n8n webhook not set up yet
              if (smsError.response?.status === 404) {
                console.log(`[PowerCard Communications] ⚠️  n8n SMS webhook not found (dev mode - this is ok)`);
              } else {
                console.warn(`[PowerCard Communications] ⚠️  SMS webhook error:`, smsError.message);
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
          console.error(`[PowerCard Communications] ❌ Failed to send notifications to ${recipientData.recipient_email}:`, error.message);
          communicationErrors.push({
            recipient: recipientData.recipient_email,
            error: error.message
          });
        }
      }

      console.log(`[PowerCard Communications] ✅ Complete! ${emailsSent} emails + ${smsSent} SMS sent to ${recipients.length} recipients`);

      return {
        success: true,
        emailsSent,
        smsSent,
        totalRecipients: recipients.length,
        communicationErrors: communicationErrors.length > 0 ? communicationErrors : undefined
      };

    } catch (error) {
      console.error(`[PowerCard Communications] ❌ Failed:`, error);
      throw error;
    }
  }
}

module.exports = new PowerCardService();