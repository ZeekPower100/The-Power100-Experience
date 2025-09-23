const { safeJsonParse, safeJsonStringify } = require('../utils/jsonHelpers');

// Enhanced Partner Controller for PowerConfidence Dashboard Features
// Updated to match actual database schema
const { query } = require('../config/database');

// Get enhanced partner list with PowerConfidence scores for admin dashboard
const getEnhancedPartnerList = async (req, res) => {
  try {
    console.log('📋 Fetching enhanced partner list with PowerConfidence scores');
    
    // Use the exact same approach as the working getAllPartners
    const queryText = 'SELECT * FROM strategic_partners ORDER BY powerconfidence_score DESC';
    const result = await query(queryText);
    
    console.log('Enhanced query result - Has rows:', !!result.rows, 'Rows count:', result.rows ? result.rows.length : 0);
    
    // Make sure we have the rows
    if (!result.rows) {
      console.error('No rows property in result:', result);
      return res.json({
        success: true,
        partners: [],
        summary: {
          total_partners: 0,
          active_partners: 0,
          avg_powerconfidence: 0,
          high_performers: 0
        }
      });
    }
    
    const partners = result.rows;
    
    // Add mock recent feedback count for each partner (until real feedback system is implemented)
    const enhancedPartners = partners.map((partner, index) => ({
      ...partner,
      service_categories: partner.focus_areas || partner.service_category, // Map for frontend compatibility
      powerconfidence_score: partner.powerconfidence_score || 0,
      recent_feedback_count: Math.floor(Math.random() * 10) + 1,
      highest_priority_insight: Math.floor(Math.random() * 3) + 1, // 1-3 priority level
      score_trend: 'stable', // Default to stable
      trend_icon: '→',
      // Add missing fields that frontend expects
      avg_contractor_satisfaction: partner.avg_contractor_satisfaction || (85 + Math.random() * 15), // Mock 85-100
      total_contractor_engagements: partner.total_contractor_engagements || Math.floor(Math.random() * 50),
      geographic_regions: partner.geographical_coverage || partner.service_areas || 'National',
      target_revenue_range: partner.revenue_tiers || partner.target_revenue_audience || '1M-10M',
      contact_email: partner.primary_email || partner.contact_email || 'contact@partner.com',
      contact_phone: partner.primary_phone || partner.contact_phone || '',
      website: partner.website || ''
    }));

    console.log(`✅ Retrieved ${enhancedPartners.length} partners with PowerConfidence data`);

    res.json({
      success: true,
      partners: enhancedPartners,
      summary: {
        total_partners: enhancedPartners.length,
        active_partners: enhancedPartners.filter(p => p.is_active).length,
        avg_powerconfidence: Math.round(
          enhancedPartners.reduce((sum, p) => sum + p.powerconfidence_score, 0) / enhancedPartners.length
        ),
        high_performers: enhancedPartners.filter(p => p.powerconfidence_score >= 85).length
      }
    });

  } catch (error) {
    console.error('❌ Error fetching enhanced partner list:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch enhanced partner list',
      details: error.message
    });
  }
};

// Get detailed partner analytics for admin detail view
const getPartnerDetailedAnalytics = async (req, res) => {
  try {
    const { partnerId } = req.params;
    console.log(`🔍 Fetching detailed analytics for partner ID: ${partnerId}`);

    // Get basic partner info with PowerConfidence data
    const partnerQuery = `
      SELECT 
        *,
        COALESCE(powerconfidence_score, power_confidence_score, 75) as powerconfidence_score,
        COALESCE(previous_powerconfidence_score, power_confidence_score, 73) as previous_powerconfidence_score,
        COALESCE(score_trend, 'stable') as score_trend,
        COALESCE(total_contractor_engagements, 5) as total_contractor_engagements,
        COALESCE(avg_contractor_satisfaction, 7.8) as avg_contractor_satisfaction
      FROM strategic_partners
      WHERE id = ? AND is_active = true
    `;

    const partnerResult = await query(partnerQuery, [partnerId]);
    
    if (partnerResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Partner not found'
      });
    }

    const partner = partnerResult.rows[0];

    // Mock PowerConfidence history (4 quarters)
    const scoreHistory = [
      { quarter: '2025-Q1', score: partner.powerconfidence_score, date: '2025-03-15' },
      { quarter: '2024-Q4', score: partner.previous_powerconfidence_score, date: '2024-12-15' },
      { quarter: '2024-Q3', score: partner.previous_powerconfidence_score - 2, date: '2024-09-15' },
      { quarter: '2024-Q2', score: partner.previous_powerconfidence_score - 5, date: '2024-06-15' }
    ];

    // Mock category breakdown
    const categoryScores = {
      service: Math.max(65, partner.powerconfidence_score - 5 + Math.floor(Math.random() * 10)),
      communication: Math.max(65, partner.powerconfidence_score - 2 + Math.floor(Math.random() * 8)),
      results: Math.max(65, partner.powerconfidence_score - 8 + Math.floor(Math.random() * 12)),
      value: Math.max(65, partner.powerconfidence_score - 3 + Math.floor(Math.random() * 6))
    };

    // Mock insights based on partner performance
    const insights = [];
    if (categoryScores.service < 75) {
      insights.push({
        type: 'opportunity',
        category: 'service_quality',
        title: 'Service Delivery Enhancement',
        priority: 3,
        description: 'Recent feedback indicates opportunities to improve service delivery consistency'
      });
    }
    if (categoryScores.communication > 85) {
      insights.push({
        type: 'strength',
        category: 'communication',
        title: 'Excellent Communication',
        priority: 1,
        description: 'Consistently high marks for responsiveness and clarity'
      });
    }
    if (partner.score_trend === 'up') {
      insights.push({
        type: 'trend',
        category: 'overall',
        title: 'Positive Performance Trend',
        priority: 2,
        description: 'PowerConfidence score trending upward over recent quarters'
      });
    }

    // Mock feedback metrics
    const feedbackMetrics = {
      total_reviews: partner.total_contractor_engagements * 2,
      avg_rating: partner.avg_contractor_satisfaction,
      response_rate: Math.round(75 + Math.random() * 20), // 75-95%
      nps_score: Math.round((partner.avg_contractor_satisfaction - 5) * 20), // Convert to NPS-like
      recent_feedback_count: Math.floor(Math.random() * 8) + 2
    };

    // Mock engagement metrics
    const engagementMetrics = {
      demo_performance_score: Math.round(partner.powerconfidence_score * 0.9),
      contractor_retention_rate: Math.round(65 + Math.random() * 30), // 65-95%
      ai_coach_mentions: Math.floor(Math.random() * 15) + 5,
      support_ticket_volume: Math.floor(Math.random() * 5) // Low is better
    };

    const detailedAnalytics = {
      partner,
      powerconfidence: {
        current_score: partner.powerconfidence_score,
        previous_score: partner.previous_powerconfidence_score,
        trend: partner.score_trend,
        trend_icon: partner.score_trend === 'up' ? '↗' : 
                   partner.score_trend === 'down' ? '↘' : '→',
        score_history: scoreHistory,
        category_scores: categoryScores
      },
      insights: insights,
      feedback_metrics: feedbackMetrics,
      engagement_metrics: engagementMetrics,
      action_items: [
        {
          priority: 'high',
          title: 'Q2 Performance Review',
          description: 'Schedule quarterly review call to discuss recent performance trends',
          due_date: '2025-04-15'
        },
        {
          priority: 'medium', 
          title: 'Update Demo Content',
          description: 'Partner should refresh demo videos to reflect new features',
          due_date: '2025-04-30'
        }
      ]
    };

    console.log(`✅ Retrieved detailed analytics for ${partner.company_name}`);

    res.json({
      success: true,
      data: detailedAnalytics
    });

  } catch (error) {
    console.error('❌ Error fetching partner detailed analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch partner detailed analytics',
      details: error.message
    });
  }
};

// Update partner PowerConfidence score (for admin use)
const updatePartnerPowerConfidence = async (req, res) => {
  try {
    const { partnerId } = req.params;
    const { score, notes, category_scores } = req.body;

    console.log(`🔄 Updating PowerConfidence score for partner ID: ${partnerId}`);

    // Validate score
    if (!score || score < 0 || score > 100) {
      return res.status(400).json({
        success: false,
        error: 'Score must be between 0 and 100'
      });
    }

    // Get current score to set as previous
    const currentScoreQuery = `
      SELECT powerconfidence_score
      FROM strategic_partners
      WHERE id = ?
    `;
    const currentResult = await query(currentScoreQuery, [partnerId]);
    const previousScore = currentResult.rows[0]?.powerconfidence_score || 75;

    // Calculate trend
    const trend = score > previousScore ? 'up' : 
                  score < previousScore ? 'down' : 'stable';

    // Update partner record
    const updateQuery = `
      UPDATE strategic_partners
      SET 
        powerconfidence_score = ?,
        previous_powerconfidence_score = ?,
        score_trend = ?,
        last_score_update = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    await query(updateQuery, [score, previousScore, trend, partnerId]);

    // Add to history (if table exists)
    try {
      const historyQuery = `
        INSERT INTO powerconfidence_history (
          partner_id, score, quarter, category_scores, notes, calculated_by
        ) VALUES (?, ?, ?, ?, ?, ?)
      `;
      
      const quarter = `${new Date().getFullYear()}-Q${Math.ceil((new Date().getMonth() + 1) / 3)}`;
      await query(historyQuery, [
        partnerId, 
        score, 
        quarter, 
        safeJsonStringify(category_scores || {}),
        notes || 'Manual update via admin dashboard',
        'admin'
      ]);
    } catch (historyError) {
      console.log('⚠️ History table not available, skipping history entry');
    }

    console.log(`✅ Updated PowerConfidence score to ${score} for partner ${partnerId}`);

    res.json({
      success: true,
      message: 'PowerConfidence score updated successfully',
      data: {
        partner_id: partnerId,
        new_score: score,
        previous_score: previousScore,
        trend: trend
      }
    });

  } catch (error) {
    console.error('❌ Error updating PowerConfidence score:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update PowerConfidence score',
      details: error.message
    });
  }
};

module.exports = {
  getEnhancedPartnerList,
  getPartnerDetailedAnalytics,
  updatePartnerPowerConfidence
};