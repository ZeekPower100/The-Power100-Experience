// DATABASE-CHECKED: Integrates with ceoPcrReportingService November 14, 2025
// ================================================================
// AI CEO Culture Service
// ================================================================
// Purpose: Generate AI-powered culture recommendations based on CEO PCR scores
// ================================================================

const { getCeoDashboardData } = require('./ceoPcrReportingService');
const { query } = require('../config/database');

/**
 * Generate AI culture recommendations based on CEO PCR scores
 *
 * @param {number} contractorId - Contractor ID
 * @returns {Object} Recommendations and resources
 */
async function generateCultureRecommendations(contractorId) {
  console.log(`[AI CEO Culture] Generating recommendations for contractor ${contractorId}`);

  const data = await getCeoDashboardData(contractorId);

  if (!data.latest_quarter) {
    return {
      message: "No employee feedback data available yet. Launch your first quarterly survey to get started!",
      recommendations: [],
      resources: []
    };
  }

  const recommendations = [];
  const resources = [];
  const categoryScores = data.latest_quarter.category_scores;

  // Leadership recommendations
  if (categoryScores.leadership < 75) {
    recommendations.push({
      category: 'Leadership Development',
      priority: categoryScores.leadership < 65 ? 'high' : 'medium',
      current_score: categoryScores.leadership,
      target_score: 85,
      issue: 'Leadership effectiveness score is below target',
      root_causes: [
        'Communication gaps between leadership and team members',
        'Lack of visibility into company strategy and decision-making',
        'Limited accessibility to leadership for employee concerns'
      ],
      suggestions: [
        {
          action: 'Schedule regular one-on-one meetings with team members',
          impact: 'High',
          timeframe: 'Implement within 30 days'
        },
        {
          action: 'Increase transparency in company communications',
          impact: 'High',
          timeframe: 'Ongoing - start immediately'
        },
        {
          action: 'Implement open-door policy for employee concerns',
          impact: 'Medium',
          timeframe: 'Implement within 14 days'
        }
      ]
    });

    // Fetch relevant books from database
    const booksResult = await query(`
      SELECT id, title, author, description
      FROM books
      WHERE focus_areas_covered @> '["leadership"]'::jsonb
        AND is_active = true
      LIMIT 2
    `);

    booksResult.rows.forEach(book => {
      resources.push({
        type: 'book',
        id: book.id,
        title: book.title,
        author: book.author,
        description: book.description,
        reason: 'Proven strategies for building strong team culture and leadership skills',
        category: 'leadership'
      });
    });

    // Fetch relevant partners
    const partnersResult = await query(`
      SELECT id, company_name, value_proposition
      FROM strategic_partners
      WHERE focus_areas_served @> '["leadership"]'::jsonb
        AND is_active = true
        AND is_approved = true
      LIMIT 1
    `);

    partnersResult.rows.forEach(partner => {
      resources.push({
        type: 'partner',
        id: partner.id,
        name: partner.company_name,
        description: partner.value_proposition,
        reason: 'Leadership coaching and organizational development expertise',
        category: 'leadership'
      });
    });
  }

  // Culture recommendations
  if (categoryScores.culture < 75) {
    recommendations.push({
      category: 'Company Culture',
      priority: categoryScores.culture < 65 ? 'high' : 'medium',
      current_score: categoryScores.culture,
      target_score: 85,
      issue: 'Work environment and values alignment needs improvement',
      root_causes: [
        'Unclear or inconsistent company values',
        'Limited team cohesion and collaboration',
        'Work-life balance concerns'
      ],
      suggestions: [
        {
          action: 'Review and clarify company core values with team input',
          impact: 'High',
          timeframe: 'Complete within 60 days'
        },
        {
          action: 'Create regular team-building opportunities',
          impact: 'Medium',
          timeframe: 'Start monthly activities'
        },
        {
          action: 'Address work-life balance concerns through flexible policies',
          impact: 'High',
          timeframe: 'Evaluate and implement within 90 days'
        }
      ]
    });

    // Fetch culture-focused podcasts
    const podcastsResult = await query(`
      SELECT id, show_name, description
      FROM podcast_shows
      WHERE is_active = true
      LIMIT 1
    `);

    podcastsResult.rows.forEach(podcast => {
      resources.push({
        type: 'podcast',
        id: podcast.id,
        title: podcast.show_name,
        description: podcast.description,
        reason: 'Insights on building better workplace culture and employee engagement',
        category: 'culture'
      });
    });
  }

  // Growth & Development recommendations
  if (categoryScores.growth < 75) {
    recommendations.push({
      category: 'Employee Development',
      priority: categoryScores.growth < 65 ? 'high' : 'medium',
      current_score: categoryScores.growth,
      target_score: 85,
      issue: 'Career growth opportunities are limited',
      root_causes: [
        'Lack of clear career advancement paths',
        'Insufficient professional development opportunities',
        'Limited access to training and skill development'
      ],
      suggestions: [
        {
          action: 'Implement professional development program with budget allocation',
          impact: 'High',
          timeframe: 'Design within 60 days, launch within 90 days'
        },
        {
          action: 'Create clear career advancement paths and communicate them',
          impact: 'High',
          timeframe: 'Complete within 45 days'
        },
        {
          action: 'Offer training and certification opportunities',
          impact: 'Medium',
          timeframe: 'Start quarterly programs'
        }
      ]
    });

    // Fetch development-focused partners
    const devPartnersResult = await query(`
      SELECT id, company_name, value_proposition
      FROM strategic_partners
      WHERE focus_areas_served @> '["business_development"]'::jsonb
        AND is_active = true
        AND is_approved = true
      LIMIT 1
    `);

    devPartnersResult.rows.forEach(partner => {
      resources.push({
        type: 'partner',
        id: partner.id,
        name: partner.company_name,
        description: partner.value_proposition,
        reason: 'Employee training and development program expertise',
        category: 'growth'
      });
    });
  }

  // Satisfaction recommendations
  if (categoryScores.satisfaction < 75) {
    recommendations.push({
      category: 'Overall Satisfaction',
      priority: categoryScores.satisfaction < 65 ? 'high' : 'medium',
      current_score: categoryScores.satisfaction,
      target_score: 85,
      issue: 'General employee satisfaction needs improvement',
      root_causes: [
        'Compensation and benefits concerns',
        'Lack of recognition and appreciation',
        'Workplace environment or tools/resources issues'
      ],
      suggestions: [
        {
          action: 'Conduct anonymous survey on specific satisfaction drivers',
          impact: 'Medium',
          timeframe: 'Complete within 30 days'
        },
        {
          action: 'Implement employee recognition program',
          impact: 'Medium',
          timeframe: 'Launch within 45 days'
        },
        {
          action: 'Review compensation and benefits competitiveness',
          impact: 'High',
          timeframe: 'Complete analysis within 60 days'
        }
      ]
    });
  }

  // NPS recommendations
  if (categoryScores.nps < 75) {
    recommendations.push({
      category: 'Employee Advocacy',
      priority: categoryScores.nps < 65 ? 'high' : 'medium',
      current_score: categoryScores.nps,
      target_score: 85,
      issue: 'Employees unlikely to recommend company to others',
      root_causes: [
        'Combination of culture, growth, and satisfaction issues',
        'Lack of pride in company mission or achievements',
        'Negative perception of company reputation'
      ],
      suggestions: [
        {
          action: 'Address root causes in other low-scoring categories first',
          impact: 'High',
          timeframe: 'Ongoing priority'
        },
        {
          action: 'Celebrate company wins and communicate impact publicly',
          impact: 'Medium',
          timeframe: 'Start monthly communications'
        },
        {
          action: 'Create employee referral program with incentives',
          impact: 'Medium',
          timeframe: 'Launch within 60 days'
        }
      ]
    });
  }

  // Sort recommendations by priority
  recommendations.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });

  const summary = generateSummary(data);

  console.log(`[AI CEO Culture] ✅ Generated ${recommendations.length} recommendations and ${resources.length} resources`);

  return {
    current_score: data.current_ceo_pcr,
    trend: data.ceo_pcr_trend,
    summary,
    recommendations,
    resources,
    total_recommendations: recommendations.length,
    high_priority_count: recommendations.filter(r => r.priority === 'high').length
  };
}

/**
 * Generate AI summary of cultural health
 *
 * @param {Object} data - Dashboard data
 * @returns {string} AI-generated summary
 */
function generateSummary(data) {
  const score = data.current_ceo_pcr;
  const trend = data.ceo_pcr_trend;
  const trendModifier = data.latest_quarter?.trend_modifier || 0;

  if (trend === 'improving') {
    return `Your company culture is on an upward trajectory with a CEO PCR of ${score.toFixed(1)} (+${trendModifier} trend bonus). Employees are responding positively to your leadership efforts. Continue focusing on the areas that are working well while addressing any remaining gaps.`;
  }

  if (trend === 'declining') {
    return `Your CEO PCR of ${score.toFixed(1)} (${trendModifier} trend penalty) shows room for improvement. Employee satisfaction has declined for multiple consecutive quarters. Immediate action is recommended. Review the specific category scores below to identify priority areas for cultural enhancement.`;
  }

  if (trend === 'stable') {
    return `Your CEO PCR of ${score.toFixed(1)} indicates ${score > 80 ? 'strong' : score > 70 ? 'good' : 'developing'} company culture. The score is stable quarter-over-quarter. Maintain consistent focus on employee experience to sustain or improve this rating.`;
  }

  return `Your CEO PCR of ${score.toFixed(1)} is your first measured score. Use this as a baseline to track cultural improvements over time. Focus on the recommendations below to build a stronger workplace culture.`;
}

module.exports = {
  generateCultureRecommendations
};
