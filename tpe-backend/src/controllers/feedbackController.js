// PowerConfidence Feedback System Controller
const { query } = require('../config/database.sqlite');

// Get all feedback surveys for a partner or contractor
const getFeedbackSurveys = async (req, res) => {
  try {
    const { partnerId, contractorId, status, quarter } = req.query;
    
    let queryText = `
      SELECT fs.*, 
             p.company_name as partner_name,
             c.name as contractor_name,
             c.email as contractor_email,
             sc.campaign_name as sms_campaign_name
      FROM feedback_surveys fs
      LEFT JOIN strategic_partners p ON fs.partner_id = p.id
      LEFT JOIN contractors c ON fs.contractor_id = c.id  
      LEFT JOIN sms_campaigns sc ON fs.sms_campaign_id = sc.id
      WHERE 1=1
    `;
    
    const params = [];
    
    if (partnerId) {
      params.push(partnerId);
      queryText += ` AND fs.partner_id = ?`;
    }
    
    if (contractorId) {
      params.push(contractorId);
      queryText += ` AND fs.contractor_id = ?`;
    }
    
    if (status) {
      params.push(status);
      queryText += ` AND fs.status = ?`;
    }
    
    if (quarter) {
      params.push(quarter);
      queryText += ` AND fs.quarter = ?`;
    }
    
    queryText += ' ORDER BY fs.created_at DESC';
    
    const result = await query(queryText, params);
    
    res.json({
      success: true,
      surveys: result.rows,
      total: result.rows.length
    });
  } catch (error) {
    console.error('Error fetching feedback surveys:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch feedback surveys',
      error: error.message
    });
  }
};

// Create a new feedback survey
const createFeedbackSurvey = async (req, res) => {
  try {
    const {
      partnerId,
      contractorId,
      surveyType,
      quarter,
      surveyUrl,
      expiresAt,
      smsCampaignId
    } = req.body;

    // Validate required fields
    if (!partnerId || !contractorId || !surveyType) {
      return res.status(400).json({
        success: false,
        message: 'Partner ID, contractor ID, and survey type are required'
      });
    }

    const result = await pool.query(`
      INSERT INTO feedback_surveys (
        partner_id, contractor_id, survey_type, quarter, 
        survey_url, expires_at, sms_campaign_id, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')
      RETURNING *
    `, [partnerId, contractorId, surveyType, quarter, surveyUrl, expiresAt, smsCampaignId]);

    // Update campaign stats if linked to SMS campaign
    if (smsCampaignId) {
      await pool.query(`
        UPDATE sms_campaigns 
        SET total_recipients = total_recipients + 1
        WHERE id = $1
      `, [smsCampaignId]);
    }

    res.status(201).json({
      success: true,
      survey: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating feedback survey:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create feedback survey',
      error: error.message
    });
  }
};

// Submit feedback response
const submitFeedbackResponse = async (req, res) => {
  try {
    const {
      surveyId,
      overallSatisfaction,
      communicationRating,
      serviceQualityRating,
      valueForMoneyRating,
      likelihoodToRecommend,
      positiveFeedback,
      improvementAreas,
      additionalComments,
      wouldUseAgain,
      meetingExpectations,
      responseTimeAcceptable,
      responseSource
    } = req.body;

    // Validate required fields
    if (!surveyId || !overallSatisfaction) {
      return res.status(400).json({
        success: false,
        message: 'Survey ID and overall satisfaction rating are required'
      });
    }

    // Get survey details
    const surveyResult = await pool.query(`
      SELECT partner_id, contractor_id, status FROM feedback_surveys WHERE id = $1
    `, [surveyId]);

    if (surveyResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Survey not found'
      });
    }

    const survey = surveyResult.rows[0];
    
    if (survey.status === 'responded') {
      return res.status(400).json({
        success: false,
        message: 'This survey has already been completed'
      });
    }

    // Insert feedback response
    const responseResult = await pool.query(`
      INSERT INTO feedback_responses (
        survey_id, partner_id, contractor_id,
        overall_satisfaction, communication_rating, service_quality_rating,
        value_for_money_rating, likelihood_to_recommend,
        positive_feedback, improvement_areas, additional_comments,
        would_use_again, meeting_expectations, response_time_acceptable,
        response_source, ip_address, user_agent
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      RETURNING *
    `, [
      surveyId, survey.partner_id, survey.contractor_id,
      overallSatisfaction, communicationRating, serviceQualityRating,
      valueForMoneyRating, likelihoodToRecommend,
      positiveFeedback, improvementAreas, additionalComments,
      wouldUseAgain, meetingExpectations, responseTimeAcceptable,
      responseSource || 'web',
      req.ip,
      req.get('User-Agent')
    ]);

    // Update survey status to responded
    await pool.query(`
      UPDATE feedback_surveys 
      SET status = 'responded', responded_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [surveyId]);

    // Update partner feedback statistics
    await pool.query(`
      UPDATE strategic_partners 
      SET total_feedback_responses = total_feedback_responses + 1,
          average_satisfaction = (
            SELECT AVG(overall_satisfaction) 
            FROM feedback_responses 
            WHERE partner_id = $1
          )
      WHERE id = $1
    `, [survey.partner_id]);

    res.status(201).json({
      success: true,
      response: responseResult.rows[0],
      message: 'Thank you for your feedback!'
    });
  } catch (error) {
    console.error('Error submitting feedback response:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit feedback response',
      error: error.message
    });
  }
};

// Get feedback analytics for a partner
const getPartnerFeedbackAnalytics = async (req, res) => {
  try {
    const { partnerId } = req.params;
    const { quarter, timeframe = '12months' } = req.query;

    // Base query for partner feedback analytics
    let timeCondition = '';
    if (quarter) {
      timeCondition = `AND fs.quarter = '${quarter}'`;
    } else {
      const months = timeframe === '3months' ? 3 : timeframe === '6months' ? 6 : 12;
      timeCondition = `AND fr.created_at > CURRENT_DATE - INTERVAL '${months} months'`;
    }

    const analyticsQuery = `
      SELECT 
        COUNT(*) as total_responses,
        AVG(fr.overall_satisfaction) as avg_satisfaction,
        AVG(fr.communication_rating) as avg_communication,
        AVG(fr.service_quality_rating) as avg_service_quality,
        AVG(fr.value_for_money_rating) as avg_value,
        AVG(fr.likelihood_to_recommend) as avg_recommendation,
        COUNT(CASE WHEN fr.would_use_again = true THEN 1 END) as would_use_again_count,
        COUNT(CASE WHEN fr.meeting_expectations = true THEN 1 END) as met_expectations_count,
        COUNT(CASE WHEN fr.response_time_acceptable = true THEN 1 END) as acceptable_response_count
      FROM feedback_responses fr
      JOIN feedback_surveys fs ON fr.survey_id = fs.id
      WHERE fr.partner_id = $1 ${timeCondition}
    `;

    const analyticsResult = await pool.query(analyticsQuery, [partnerId]);

    // Get feedback trends over time
    const trendsQuery = `
      SELECT 
        fs.quarter,
        COUNT(*) as response_count,
        AVG(fr.overall_satisfaction) as avg_satisfaction,
        AVG(fr.likelihood_to_recommend) as avg_recommendation
      FROM feedback_responses fr
      JOIN feedback_surveys fs ON fr.survey_id = fs.id
      WHERE fr.partner_id = $1
      GROUP BY fs.quarter
      ORDER BY fs.quarter DESC
      LIMIT 8
    `;

    const trendsResult = await pool.query(trendsQuery, [partnerId]);

    // Get recent qualitative feedback
    const recentFeedbackQuery = `
      SELECT 
        fr.positive_feedback,
        fr.improvement_areas,
        fr.additional_comments,
        fr.created_at,
        c.name as contractor_name
      FROM feedback_responses fr
      JOIN contractors c ON fr.contractor_id = c.id
      WHERE fr.partner_id = $1
      AND (fr.positive_feedback IS NOT NULL OR fr.improvement_areas IS NOT NULL)
      ORDER BY fr.created_at DESC
      LIMIT 10
    `;

    const recentFeedbackResult = await pool.query(recentFeedbackQuery, [partnerId]);

    // Get PowerConfidence score history
    const scoreHistoryQuery = `
      SELECT 
        old_score,
        new_score,
        score_change,
        feedback_count,
        quarter,
        created_at
      FROM powerconfidence_history
      WHERE partner_id = $1
      ORDER BY created_at DESC
      LIMIT 12
    `;

    const scoreHistoryResult = await pool.query(scoreHistoryQuery, [partnerId]);

    res.json({
      success: true,
      analytics: analyticsResult.rows[0],
      trends: trendsResult.rows,
      recentFeedback: recentFeedbackResult.rows,
      scoreHistory: scoreHistoryResult.rows
    });
  } catch (error) {
    console.error('Error fetching partner feedback analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch feedback analytics',
      error: error.message
    });
  }
};

// Trigger PowerConfidence score recalculation
const updatePowerConfidenceScores = async (req, res) => {
  try {
    const { partnerId, quarter } = req.body;

    if (partnerId) {
      // Update specific partner
      const newScore = await pool.query(`
        SELECT calculate_powerconfidence_score($1, $2) as new_score
      `, [partnerId, quarter || null]);

      const oldScoreResult = await pool.query(`
        SELECT power_confidence_score FROM strategic_partners WHERE id = $1
      `, [partnerId]);

      const oldScore = oldScoreResult.rows[0]?.power_confidence_score || 75;
      const calculatedScore = newScore.rows[0].new_score;

      // Update the partner's score
      await pool.query(`
        UPDATE strategic_partners 
        SET power_confidence_score = $1,
            last_feedback_update = CURRENT_TIMESTAMP,
            feedback_trend = CASE 
              WHEN $1 > $2 + 5 THEN 'improving'
              WHEN $1 < $2 - 5 THEN 'declining'
              ELSE 'stable'
            END
        WHERE id = $3
      `, [calculatedScore, oldScore, partnerId]);

      // Record in history
      await pool.query(`
        INSERT INTO powerconfidence_history (
          partner_id, old_score, new_score, score_change,
          calculation_method, quarter, calculated_by
        ) VALUES ($1, $2, $3, $4, 'manual_recalculation', $5, $6)
      `, [
        partnerId, oldScore, calculatedScore, calculatedScore - oldScore,
        quarter || `${new Date().getFullYear()}-Q${Math.ceil((new Date().getMonth() + 1) / 3)}`,
        req.adminUser?.id
      ]);

      res.json({
        success: true,
        partnerId,
        oldScore,
        newScore: calculatedScore,
        scoreChange: calculatedScore - oldScore
      });
    } else {
      // Update all partners
      await pool.query('SELECT update_partner_powerconfidence_scores()');

      res.json({
        success: true,
        message: 'PowerConfidence scores updated for all active partners'
      });
    }
  } catch (error) {
    console.error('Error updating PowerConfidence scores:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update PowerConfidence scores',
      error: error.message
    });
  }
};

// Get partner performance dashboard data
const getPartnerPerformanceDashboard = async (req, res) => {
  try {
    const { timeframe = '12months' } = req.query;

    // Get summary data from the view
    const summaryResult = await pool.query(`
      SELECT * FROM partner_performance_summary
      ORDER BY power_confidence_score DESC
    `);

    // Get overall system metrics
    const systemMetricsResult = await pool.query(`
      SELECT 
        COUNT(DISTINCT p.id) as total_active_partners,
        AVG(p.power_confidence_score) as avg_powerconfidence_score,
        COUNT(DISTINCT fr.id) as total_feedback_responses,
        AVG(fr.overall_satisfaction) as avg_system_satisfaction,
        COUNT(DISTINCT CASE WHEN fr.created_at > CURRENT_DATE - INTERVAL '30 days' THEN fr.id END) as recent_responses
      FROM strategic_partners p
      LEFT JOIN feedback_responses fr ON p.id = fr.partner_id
      WHERE p.is_active = true
    `);

    // Get quarterly trends
    const quarterlyTrendsResult = await pool.query(`
      SELECT 
        quarter,
        COUNT(DISTINCT partner_id) as partners_with_feedback,
        COUNT(*) as total_responses,
        AVG(overall_satisfaction) as avg_satisfaction
      FROM feedback_responses fr
      JOIN feedback_surveys fs ON fr.survey_id = fs.id
      WHERE fs.quarter IS NOT NULL
      GROUP BY quarter
      ORDER BY quarter DESC
      LIMIT 8
    `);

    res.json({
      success: true,
      partnerSummary: summaryResult.rows,
      systemMetrics: systemMetricsResult.rows[0],
      quarterlyTrends: quarterlyTrendsResult.rows
    });
  } catch (error) {
    console.error('Error fetching partner performance dashboard:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch partner performance dashboard',
      error: error.message
    });
  }
};

module.exports = {
  getFeedbackSurveys,
  createFeedbackSurvey,
  submitFeedbackResponse,
  getPartnerFeedbackAnalytics,
  updatePowerConfidenceScores,
  getPartnerPerformanceDashboard
};