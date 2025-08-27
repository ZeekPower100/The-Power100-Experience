// Report Generation Service - Creates contractor, executive, and public reports
const { query } = require('../config/database');

class ReportGenerationService {
  
  // ===== CONTRACTOR REPORT (Variance-based comparison) =====
  async generateContractorReport(contractorId, partnerId) {
    try {
      // Get contractor details
      const contractorResult = await query(
        'SELECT * FROM contractors WHERE id = $1',
        [contractorId]
      );
      
      if (contractorResult.rows.length === 0) {
        throw new Error('Contractor not found');
      }
      
      const contractor = contractorResult.rows[0];
      const contractorRevenue = contractor.revenue_tier || '$1M-$5M';
      
      // Get partner details
      const partnerResult = await query(
        'SELECT * FROM partners WHERE id = $1',
        [partnerId]
      );
      
      const partner = partnerResult.rows[0];
      
      // Format report data with variance only (no actual numbers)
      const report = {
        contractor: {
          name: contractor.name,
          company: contractor.company_name,
          revenue_tier: contractorRevenue
        },
        partner: {
          name: partner.company_name,
          powerconfidence_score: partner.powerconfidence_score
        },
        report_date: new Date().toISOString(),
        quarter: 'Q1 2025',
        
        current_tier_performance: {
          tier: contractorRevenue,
          metrics: {
            closing_percentage: {
              variance: '+6.2%',
              trend: 'up',
              comparison: 'Above tier average'
            },
            cancellation_rate: {
              variance: '-3.8%',
              trend: 'down',
              comparison: 'Better than 72% of peers'
            },
            customer_experience: {
              variance: '+4.5%',
              trend: 'up',
              comparison: 'Top quartile performance'
            }
          },
          peer_insights: [
            'Companies in your tier using Destination Motivation saw average closing rate improvements of 5.8%',
            '68% of contractors in your tier improved customer satisfaction scores',
            'Team retention increased for 82% of similar-sized contractors'
          ]
        },
        
        next_tier_performance: {
          tier: '$5M-$10M',
          metrics: {
            closing_percentage: {
              variance: '+8.3%',
              trend: 'up'
            },
            cancellation_rate: {
              variance: '-5.2%',
              trend: 'down'
            },
            customer_experience: {
              variance: '+7.1%',
              trend: 'up'
            }
          }
        },
        
        best_practices: [
          'Schedule monthly team culture assessments',
          'Implement DM recognition program framework',
          'Use quarterly pulse surveys',
          'Apply 5-star recruitment methodology'
        ]
      };
      
      return report;
    } catch (error) {
      console.error('Error generating contractor report:', error);
      throw error;
    }
  }
  
  // ===== EXECUTIVE REPORT =====
  async generateExecutiveReport(partnerId) {
    try {
      const report = {
        partner_name: 'Destination Motivation',
        report_date: new Date().toISOString(),
        executive_summary: {
          powerconfidence_score: 99,
          previous_score: 97,
          score_change: '+2',
          total_clients_served: 142,
          active_clients: 89,
          avg_client_satisfaction: 9.2,
          nps_score: 87
        },
        
        performance_by_tier: [
          {
            revenue_tier: '$5M-$10M',
            clients: 38,
            metrics: {
              closing_percentage: { current: 78, industry_avg: 65, difference: '+13%' },
              cancellation_rate: { current: 12, industry_avg: 22, difference: '-10%' },
              customer_experience: { current: 9.1, industry_avg: 7.5, difference: '+1.6' }
            }
          }
        ],
        
        analysis: {
          strengths: [
            { area: 'Team Culture Development', performance: 'Exceptional' },
            { area: 'Retention Programs', performance: 'Industry Leading' }
          ],
          opportunities: [
            { area: 'Onboarding Speed', current_performance: 'Average 14 days', target: '7 days' }
          ]
        },
        
        recommendations: {
          start: ['Weekly check-ins with at-risk clients'],
          stop: ['Manual report generation'],
          keep: ['Personalized coaching sessions', 'Culture workshops']
        }
      };
      
      return report;
    } catch (error) {
      console.error('Error generating executive report:', error);
      throw error;
    }
  }
  
  // ===== PUBLIC PCR REPORT =====
  async generatePublicPCRReport(partnerId) {
    try {
      const report = {
        partner: {
          name: 'Destination Motivation',
          tagline: 'Building Winning Teams That Stay'
        },
        
        powerconfidence_score: {
          current: 99,
          label: 'Elite Partner',
          percentile: '99th percentile',
          description: 'Top 1% of all strategic partners'
        },
        
        key_metrics: [
          { metric: '38%', label: 'Average Turnover Reduction' },
          { metric: '94%', label: 'Client Satisfaction Rate' },
          { metric: '142', label: 'Contractors Transformed' }
        ],
        
        testimonials: [
          {
            quote: 'DM transformed our culture. Turnover down 40%!',
            author: 'John Smith',
            company: 'ABC Contracting'
          }
        ]
      };
      
      return report;
    } catch (error) {
      console.error('Error generating PCR report:', error);
      throw error;
    }
  }
}

module.exports = new ReportGenerationService();
