const { query } = require('../config/database');

// Get partner's own PowerConfidence data
const getPartnerDashboard = async (req, res) => {
  try {
    const partnerId = req.partnerUser.id;

    // Get partner basic info and current score
    const partnerResult = await query(
      'SELECT * FROM partners WHERE id = $1',
      [partnerId]
    );

    if (partnerResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Partner not found'
      });
    }

    const partner = partnerResult.rows[0];

    // Get PowerConfidence history
    const historyResult = await query(`
      SELECT 
        quarter,
        score,
        feedback_count,
        created_at
      FROM powerconfidence_history 
      WHERE partner_id = $1 
      ORDER BY created_at DESC 
      LIMIT 8
    `, [partnerId]);

    // Get category scores (mock data for now)
    const categoryScores = [
      { category: 'Service Quality', score: Math.floor(Math.random() * 20) + 80, trend: 'up', feedback_count: 12 },
      { category: 'Communication', score: Math.floor(Math.random() * 20) + 80, trend: 'stable', feedback_count: 12 },
      { category: 'Results Delivered', score: Math.floor(Math.random() * 20) + 80, trend: 'up', feedback_count: 10 },
      { category: 'Value for Investment', score: Math.floor(Math.random() * 20) + 75, trend: 'down', feedback_count: 11 },
      { category: 'Technical Expertise', score: Math.floor(Math.random() * 20) + 85, trend: 'up', feedback_count: 12 }
    ];

    // Get industry ranking
    const rankingResult = await query(`
      SELECT COUNT(*) + 1 as rank
      FROM partners 
      WHERE power_confidence_score > $1 
      AND is_active = true
    `, [partner.power_confidence_score]);

    const totalPartnersResult = await query(`
      SELECT COUNT(*) as total
      FROM partners 
      WHERE is_active = true
    `);

    const dashboardData = {
      partner: {
        id: partner.id,
        company_name: partner.company_name,
        contact_email: partner.contact_email,
        power_confidence_score: partner.power_confidence_score || 87,
        score_trend: partner.score_trend || 'up',
        industry_rank: rankingResult.rows[0]?.rank || 4,
        total_partners_in_category: totalPartnersResult.rows[0]?.total || 16,
        recent_feedback_count: Math.floor(Math.random() * 15) + 5,
        avg_satisfaction: (Math.random() * 2 + 8).toFixed(1),
        total_contractors: Math.floor(Math.random() * 40) + 30,
        active_contractors: Math.floor(Math.random() * 20) + 20
      },
      scoreHistory: historyResult.rows.length > 0 ? historyResult.rows : [
        { quarter: 'Q1 2024', score: 82, feedback_count: 15 },
        { quarter: 'Q2 2024', score: 85, feedback_count: 18 },
        { quarter: 'Q3 2024', score: 83, feedback_count: 12 },
        { quarter: 'Q4 2024', score: partner.power_confidence_score || 87, feedback_count: 20 }
      ],
      categoryScores,
      insights: [
        {
          type: 'strength',
          category: 'Communication',
          description: 'Your communication scores are consistently high',
          recommendation: 'Continue this strength to maintain competitive advantage'
        },
        {
          type: 'opportunity',
          category: 'Response Time',
          description: 'Average response time could be improved',
          recommendation: 'Aim for under 4 hours to move into the top quartile'
        },
        {
          type: 'action',
          category: 'Reviews',
          description: 'Consider quarterly business reviews',
          recommendation: 'Schedule regular check-ins with top contractors'
        }
      ]
    };

    res.json({
      success: true,
      data: dashboardData
    });
  } catch (error) {
    console.error('Error fetching partner dashboard:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard data',
      error: error.message
    });
  }
};

// Get partner's feedback summary
const getPartnerFeedback = async (req, res) => {
  try {
    const partnerId = req.partnerUser.id;

    // Mock feedback data for now
    const feedbackData = {
      overall: {
        total_reviews: Math.floor(Math.random() * 50) + 20,
        avg_rating: (Math.random() * 1.5 + 3.5).toFixed(1),
        positive_sentiment: Math.floor(Math.random() * 20) + 75,
        nps_score: Math.floor(Math.random() * 40) + 50
      },
      strengths: [
        "Excellent communication throughout the project",
        "Deep technical expertise and problem-solving skills", 
        "Always delivers on time and within budget",
        "Great ROI tracking and reporting"
      ],
      improvements: [
        "Initial setup process could be more streamlined",
        "Would appreciate more frequent progress updates",
        "Documentation could be more comprehensive"
      ],
      recent_comments: [
        {
          date: '2025-01-05',
          rating: 5,
          comment: 'Outstanding partner, exceeded expectations',
          category: 'Service Quality'
        },
        {
          date: '2025-01-03',
          rating: 4,
          comment: 'Good overall experience, minor communication delays',
          category: 'Communication'
        },
        {
          date: '2024-12-28',
          rating: 5,
          comment: 'Excellent technical support and follow-up',
          category: 'Technical Expertise'
        }
      ]
    };

    res.json({
      success: true,
      data: feedbackData
    });
  } catch (error) {
    console.error('Error fetching partner feedback:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch feedback data',
      error: error.message
    });
  }
};

// Export partner's performance report
const exportPartnerReport = async (req, res) => {
  try {
    const partnerId = req.partnerUser.id;
    const { format = 'pdf' } = req.body;

    // Get partner data for export
    const partnerResult = await query(
      'SELECT * FROM partners WHERE id = $4',
      [partnerId]
    );

    if (partnerResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Partner not found'
      });
    }

    const partner = partnerResult.rows[0];

    // Prepare export data
    const exportData = {
      partner: {
        company_name: partner.company_name,
        contact_email: partner.contact_email,
        power_confidence_score: partner.power_confidence_score || 87,
        score_trend: partner.score_trend || 'up',
        generated_at: new Date().toISOString()
      },
      performance_summary: {
        industry_rank: 4,
        total_contractors: 45,
        active_contractors: 28,
        avg_satisfaction: 8.9,
        response_rate: 92
      },
      quarterly_scores: [
        { quarter: 'Q1 2024', score: 82 },
        { quarter: 'Q2 2024', score: 85 },
        { quarter: 'Q3 2024', score: 83 },
        { quarter: 'Q4 2024', score: partner.power_confidence_score || 87 }
      ]
    };

    res.json({
      success: true,
      data: exportData,
      format,
      filename: `PowerConfidence_${partner.company_name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.${format}`
    });
  } catch (error) {
    console.error('Error exporting partner report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export report',
      error: error.message
    });
  }
};

module.exports = {
  getPartnerDashboard,
  getPartnerFeedback,
  exportPartnerReport
};