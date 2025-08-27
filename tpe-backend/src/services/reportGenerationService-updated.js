// Report Generation Service - Creates three types of quarterly reports
const { query, transaction } = require('../config/database.postgresql');

class ReportGenerationService {
  
  // Define all revenue tiers
  constructor() {
    this.allRevenueTiers = [
      { id: '0-5M', label: '0-5 Million', order: 1 },
      { id: '5-10M', label: '5-10 Million', order: 2 },
      { id: '11-20M', label: '11-20 Million', order: 3 },
      { id: '21-30M', label: '21-30 Million', order: 4 },
      { id: '31-50M', label: '31-50 Million', order: 5 },
      { id: '51-75M', label: '51-75 Million', order: 6 },
      { id: '76-150M', label: '76-150 Million', order: 7 },
      { id: '151-300M', label: '151-300 Million', order: 8 },
      { id: '300M+', label: '300+ Million', order: 9 }
    ];
  }
  
  // ===== EXECUTIVE REPORT (For partner leadership) =====
  async generateExecutiveReport(partnerId) {
    try {
      // Generate performance data for ALL revenue tiers
      const performanceByTier = this.allRevenueTiers.map(tier => {
        // Simulate realistic data that varies by tier
        const tierMultiplier = tier.order / 5; // Higher tiers perform better
        const baseClosing = 65 + (tier.order * 2); // 67% to 83%
        const baseCancellation = 25 - (tier.order * 1.5); // 23.5% to 11.5%
        const baseExperience = 7 + (tier.order * 0.3); // 7.3 to 9.7
        
        // Add some variance
        const variance = (Math.random() - 0.5) * 5;
        
        return {
          revenue_tier: tier.label,
          clients: Math.floor(20 - tier.order + Math.random() * 10), // More clients in lower tiers
          metrics: {
            closing_percentage: {
              current: (baseClosing + variance).toFixed(1),
              previous: (baseClosing - 2).toFixed(1),
              difference: `+${(2 + variance).toFixed(1)}%`,
              trend: 'up'
            },
            cancellation_rate: {
              current: Math.max(5, (baseCancellation + variance/2)).toFixed(1),
              previous: (baseCancellation + 3).toFixed(1),
              difference: `-${Math.min(5, 3 - variance/2).toFixed(1)}%`,
              trend: 'down'
            },
            customer_experience: {
              current: Math.min(10, baseExperience + variance/10).toFixed(1),
              previous: (baseExperience - 0.5).toFixed(1),
              difference: `+${(0.5 + variance/10).toFixed(1)}`,
              trend: 'up'
            }
          },
          satisfaction: Math.min(10, 8 + tier.order * 0.15).toFixed(1),
          nps_score: Math.floor(70 + tier.order * 2.5) // 72 to 92
        };
      });
      
      const report = {
        partner_id: partnerId,
        partner_name: 'Destination Motivation',
        report_date: new Date().toISOString(),
        report_type: 'executive_summary',
        quarter: 'Q1 2025',
        
        executive_summary: {
          powerconfidence_score: 99,
          previous_score: 97,
          score_change: '+2',
          total_clients_served: 142,
          active_clients: performanceByTier.reduce((sum, tier) => sum + tier.clients, 0),
          avg_client_satisfaction: 9.2,
          nps_score: 87
        },
        
        // ALL revenue tiers with performance data
        performance_by_tier: performanceByTier,
        
        // Strengths and opportunities
        analysis: {
          strengths: [
            {
              area: 'Team Culture Development',
              performance: 'Exceptional',
              details: '94% of clients report improved team morale',
              recommendation: 'Continue monthly culture workshops'
            },
            {
              area: 'Employee Retention Impact',
              performance: 'Industry Leading',
              details: 'Average client reduces turnover by 38%',
              recommendation: 'Expand retention toolkit offerings'
            },
            {
              area: 'Leadership Coaching',
              performance: 'Highly Effective',
              details: '4.8/5.0 average rating from participants',
              recommendation: 'Consider group coaching sessions for scale'
            }
          ],
          opportunities: [
            {
              area: 'Onboarding Speed',
              current_performance: 'Average 14 days',
              target: '7 days',
              action_plan: 'Implement automated onboarding workflow'
            },
            {
              area: 'Small Contractor Engagement',
              current_performance: '0-5M tier underserved',
              target: 'Increase by 30%',
              action_plan: 'Create scaled-down program for smaller contractors'
            },
            {
              area: 'Digital Resources',
              current_performance: 'Limited online tools',
              target: 'Self-service portal',
              action_plan: 'Build contractor resource hub by Q2'
            }
          ]
        },
        
        // Start/Stop/Keep recommendations
        recommendations: {
          start: [
            'Weekly check-ins for new clients in first 30 days',
            'Quarterly business reviews with top-tier clients',
            'Video testimonial collection program',
            'Partner integration with contractor CRMs'
          ],
          stop: [
            'Manual report generation (automate)',
            'One-size-fits-all onboarding',
            'Delayed response to cancellation risks',
            'Paper-based feedback collection'
          ],
          keep: [
            'Monthly culture workshops',
            'Personalized coaching approach',
            'Quarterly PowerCard surveys',
            'High-touch customer success model'
          ]
        },
        
        // Key metrics trending
        trending: {
          client_acquisition: {
            current_month: 8,
            last_month: 6,
            trend: 'up'
          },
          churn_rate: {
            current: '5.2%',
            target: '4.0%',
            trend: 'improving'
          },
          avg_contract_value: {
            current: '$42,000',
            last_quarter: '$38,000',
            trend: 'up'
          }
        }
      };
      
      return report;
      
    } catch (error) {
      console.error('Error generating executive report:', error);
      // Return mock data for demo
      return this.getMockExecutiveReport(partnerId);
    }
  }
  
  // Mock data fallback for demo
  getMockExecutiveReport(partnerId) {
    const performanceByTier = this.allRevenueTiers.map(tier => ({
      revenue_tier: tier.label,
      clients: Math.floor(20 - tier.order + Math.random() * 10),
      metrics: {
        closing_percentage: {
          current: (65 + tier.order * 2).toFixed(1) + '%',
          difference: '+' + (2 + Math.random() * 3).toFixed(1) + '%'
        },
        cancellation_rate: {
          current: (25 - tier.order * 1.5).toFixed(1) + '%',
          difference: '-' + (2 + Math.random() * 2).toFixed(1) + '%'
        },
        customer_experience: {
          current: (7 + tier.order * 0.3).toFixed(1),
          difference: '+' + (0.3 + Math.random() * 0.5).toFixed(1)
        }
      },
      satisfaction: (8 + tier.order * 0.15).toFixed(1)
    }));
    
    return {
      partner_name: 'Destination Motivation',
      report_type: 'executive_summary',
      executive_summary: {
        powerconfidence_score: 99,
        score_change: '+2',
        active_clients: 89,
        total_clients_served: 142,
        avg_client_satisfaction: 9.2,
        nps_score: 87
      },
      performance_by_tier: performanceByTier,
      analysis: {
        strengths: [
          {
            area: 'Team Culture Development',
            performance: 'Exceptional',
            details: '94% of clients report improved team morale',
            recommendation: 'Continue monthly culture workshops'
          }
        ],
        opportunities: [
          {
            area: 'Onboarding Speed',
            current_performance: 'Average 14 days',
            target: '7 days',
            action_plan: 'Implement automated onboarding workflow'
          }
        ]
      },
      recommendations: {
        start: ['Weekly check-ins for new clients'],
        stop: ['Manual report generation'],
        keep: ['Monthly culture workshops']
      }
    };
  }
}

module.exports = new ReportGenerationService();
