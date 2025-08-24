// Power Cards Service - Manages quarterly feedback surveys and PowerConfidence scoring
const { query, transaction } = require('../config/database.sqlite');
const crypto = require('crypto');

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
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
      WHERE t.id = ?
    `, [templateId]);

    return result.rows[0] || null;
  }

  // Get all templates for a partner
  async getTemplatesByPartner(partnerId, partnerType = 'strategic_partner') {
    const result = await query(`
      SELECT * FROM power_card_templates
      WHERE partner_id = ? AND partner_type = ? AND is_active = 1
      ORDER BY created_at DESC
    `, [partnerId, partnerType]);

    return result.rows;
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
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [campaign_name, quarter, year, start_date, end_date, reminder_date, status]);

    if (result.rowCount > 0) {
      return this.getCampaignById(result.rows[0]?.id || result.lastID);
    }
    return null;
  }

  // Get campaign by ID
  async getCampaignById(campaignId) {
    const result = await query(`
      SELECT * FROM power_card_campaigns WHERE id = ?
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
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
    return transaction(async (client) => {
      // First, get the recipient info from survey link
      const recipientResult = await client.query(`
        SELECT * FROM power_card_recipients WHERE survey_link = ?
      `, [surveyLink]);

      if (recipientResult.rows.length === 0) {
        throw new Error('Invalid survey link');
      }

      const recipient = recipientResult.rows[0];

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
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
        WHERE id = ?
      `, [recipient.id]);

      // Update campaign stats
      await client.query(`
        UPDATE power_card_campaigns 
        SET total_responses = total_responses + 1,
            response_rate = (total_responses + 1) * 100.0 / NULLIF(total_sent, 0)
        WHERE id = ?
      `, [recipient.campaign_id]);

      return {
        success: true,
        response_id: responseResult.rows[0]?.id || responseResult.lastID
      };
    });
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
      WHERE pt.partner_id = ? AND pr.campaign_id = ?
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
      WHERE partner_id = ? AND partner_type = ?
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
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
      SET power_confidence_score = ?,
          last_feedback_update = CURRENT_TIMESTAMP,
          total_feedback_responses = ?,
          average_satisfaction = ?
      WHERE id = ?
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
      WHERE pt.partner_id = ? AND pcr.campaign_id = ? AND pcr.status != 'pending'
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
      WHERE campaign_id = ?
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
      WHERE pcr.revenue_tier = ? AND pr.campaign_id = ?
      GROUP BY pt.partner_id, sp.company_name
      HAVING response_count >= 3
      ORDER BY avg_satisfaction DESC
    `, [revenueTier, campaignId]);

    return result.rows;
  }
}

module.exports = new PowerCardService();