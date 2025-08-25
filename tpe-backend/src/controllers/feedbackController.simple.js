// Simplified PowerConfidence Feedback Controller for SQLite
const { query } = require('../config/database.sqlite');

// Get partner performance dashboard data (simplified for SQLite)
const getPartnerPerformanceDashboard = async (req, res) => {
  try {
    // Get existing partners from SQLite (using only existing columns)
    const partnersResult = await query(`
      SELECT id, company_name, power_confidence_score, is_active
      FROM partners 
      WHERE is_active = true 
      ORDER BY power_confidence_score DESC
    `);

    // Transform partners data for frontend
    const partnerSummary = partnersResult.rows.map(partner => ({
      id: partner.id,
      company_name: partner.company_name,
      power_confidence_score: partner.power_confidence_score || 75,
      average_satisfaction: (Math.random() * 2 + 8).toFixed(1), // Mock data
      total_feedback_responses: Math.floor(Math.random() * 10) + 2, // Mock data  
      feedback_trend: ['improving', 'stable', 'declining'][Math.floor(Math.random() * 3)], // Mock data
      total_contractors_matched: Math.floor(Math.random() * 20) + 5,
      completed_demos: Math.floor(Math.random() * 15) + 2,
      recent_satisfaction_avg: (Math.random() * 2 + 8).toFixed(1) // Mock data
    }));

    // Calculate system metrics based on actual partners
    const totalPartners = partnersResult.rows.length;
    const avgScore = totalPartners > 0 ? 
      partnersResult.rows.reduce((sum, p) => sum + (p.power_confidence_score || 75), 0) / totalPartners : 75;
    const totalResponses = Math.floor(Math.random() * 50) + 10; // Mock data
    
    const systemMetrics = {
      total_active_partners: totalPartners,
      avg_powerconfidence_score: Math.round(avgScore),
      total_feedback_responses: totalResponses,
      avg_system_satisfaction: 8.5,
      recent_responses: Math.floor(totalResponses * 0.3) || 5
    };

    // Mock quarterly trends
    const quarterlyTrends = [
      { quarter: '2025-Q1', partners_with_feedback: Math.min(3, totalPartners), total_responses: 12, avg_satisfaction: 8.7 },
      { quarter: '2024-Q4', partners_with_feedback: Math.min(4, totalPartners), total_responses: 15, avg_satisfaction: 8.4 },
      { quarter: '2024-Q3', partners_with_feedback: Math.min(2, totalPartners), total_responses: 8, avg_satisfaction: 8.2 }
    ];

    console.log(`PowerConfidence Dashboard: ${totalPartners} partners, avg score: ${Math.round(avgScore)}`);

    res.json({
      success: true,
      partnerSummary,
      systemMetrics,
      quarterlyTrends
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

// Stub functions for other endpoints (to be implemented later)
const getFeedbackSurveys = (req, res) => {
  res.json({ success: true, surveys: [], total: 0 });
};

const createFeedbackSurvey = (req, res) => {
  res.json({ success: true, message: 'Feedback surveys will be implemented in production' });
};

const submitFeedbackResponse = (req, res) => {
  res.json({ success: true, message: 'Thank you for your feedback! (Demo mode)' });
};

const getPartnerFeedbackAnalytics = (req, res) => {
  res.json({ 
    success: true, 
    analytics: { total_responses: 0 }, 
    trends: [], 
    recentFeedback: [], 
    scoreHistory: [] 
  });
};

const updatePowerConfidenceScores = (req, res) => {
  res.json({ success: true, message: 'PowerConfidence scores updated (Demo mode)' });
};

// SMS Campaign Management (Placeholder endpoints)
const getSmsCampaigns = (req, res) => {
  res.json({
    success: true,
    campaigns: [],
    total: 0
  });
};

const createSmsCampaign = (req, res) => {
  res.json({ 
    success: true, 
    campaign: { id: 1, ...req.body, status: 'pending' },
    message: 'SMS campaign created (Demo mode)' 
  });
};

const launchSmsCampaign = (req, res) => {
  res.json({ 
    success: true, 
    message: 'SMS campaign launched (Demo mode)' 
  });
};

const getSmsAnalytics = (req, res) => {
  res.json({
    success: true,
    campaignPerformance: {
      total_campaigns: 0,
      completed_campaigns: 0,
      total_messages_sent: 0,
      total_delivered: 0,
      avg_delivery_rate: 0,
      avg_response_rate: 0
    },
    subscriptionStats: {
      total_subscriptions: 0,
      active_subscriptions: 0,
      this_month_subscriptions: 0,
      opt_out_rate: 0
    }
  });
};

module.exports = {
  getFeedbackSurveys,
  createFeedbackSurvey,
  submitFeedbackResponse,
  getPartnerFeedbackAnalytics,
  updatePowerConfidenceScores,
  getPartnerPerformanceDashboard,
  // SMS endpoints
  getSmsCampaigns,
  createSmsCampaign,
  launchSmsCampaign,
  getSmsAnalytics
};