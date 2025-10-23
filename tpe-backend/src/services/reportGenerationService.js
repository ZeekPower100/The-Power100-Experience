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
        `SELECT
          id, company_name, description, value_proposition, website, logo_url,
          powerconfidence_score, is_active, status,
          to_json(focus_areas) as focus_areas,
          to_json(service_areas) as service_areas,
          to_json(focus_areas_served) as focus_areas_served,
          to_json(target_revenue_range) as target_revenue_range,
          to_json(client_testimonials) as client_testimonials,
          to_json(ai_tags) as ai_tags,
          ai_summary, key_differentiators, testimonials,
          client_count, established_year
        FROM strategic_partners WHERE id = $1`,
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
          total_clients_served: 500,
          active_clients: 89,
          avg_client_satisfaction: 9.2,
          nps_score: 87
        },
        
                performance_by_tier: [
          {
            revenue_tier: '$0-$5M',
            clients: 18,
            metrics: {
              closing_percentage: { current: 68, industry_avg: 65, difference: '+3%' },
              cancellation_rate: { current: 20, industry_avg: 22, difference: '-2%' },
              customer_experience: { current: 8.5, industry_avg: 7.5, difference: '+1.0' }
            },
            satisfaction: '8/10'
          },
          {
            revenue_tier: '$5M-$10M',
            clients: 38,
            metrics: {
              closing_percentage: { current: 74, industry_avg: 65, difference: '+9%' },
              cancellation_rate: { current: 15, industry_avg: 22, difference: '-7%' },
              customer_experience: { current: 8.9, industry_avg: 7.5, difference: '+1.4' }
            },
            satisfaction: '9/10'
          },
          {
            revenue_tier: '$11M-$20M',
            clients: 45,
            metrics: {
              closing_percentage: { current: 78, industry_avg: 65, difference: '+13%' },
              cancellation_rate: { current: 12, industry_avg: 22, difference: '-10%' },
              customer_experience: { current: 9.1, industry_avg: 7.5, difference: '+1.6' }
            },
            satisfaction: '9/10'
          },
          {
            revenue_tier: '$21M-$30M',
            clients: 22,
            metrics: {
              closing_percentage: { current: 82, industry_avg: 65, difference: '+17%' },
              cancellation_rate: { current: 10, industry_avg: 22, difference: '-12%' },
              customer_experience: { current: 9.3, industry_avg: 7.5, difference: '+1.8' }
            },
            satisfaction: '10/10'
          },
          {
            revenue_tier: '$31M-$50M',
            clients: 19,
            metrics: {
              closing_percentage: { current: 85, industry_avg: 65, difference: '+20%' },
              cancellation_rate: { current: 8, industry_avg: 22, difference: '-14%' },
              customer_experience: { current: 9.5, industry_avg: 7.5, difference: '+2.0' }
            },
            satisfaction: '10/10'
          },
          {
            revenue_tier: '$51M-$75M',
            clients: 12,
            metrics: {
              closing_percentage: { current: 87, industry_avg: 65, difference: '+22%' },
              cancellation_rate: { current: 7, industry_avg: 22, difference: '-15%' },
              customer_experience: { current: 9.6, industry_avg: 7.5, difference: '+2.1' }
            },
            satisfaction: '10/10'
          },
          {
            revenue_tier: '$76M-$150M',
            clients: 8,
            metrics: {
              closing_percentage: { current: 89, industry_avg: 65, difference: '+24%' },
              cancellation_rate: { current: 6, industry_avg: 22, difference: '-16%' },
              customer_experience: { current: 9.7, industry_avg: 7.5, difference: '+2.2' }
            },
            satisfaction: '10/10'
          },
          {
            revenue_tier: '$151M-$300M',
            clients: 5,
            metrics: {
              closing_percentage: { current: 91, industry_avg: 65, difference: '+26%' },
              cancellation_rate: { current: 5, industry_avg: 22, difference: '-17%' },
              customer_experience: { current: 9.8, industry_avg: 7.5, difference: '+2.3' }
            },
            satisfaction: '10/10'
          },
          {
            revenue_tier: '$300M+',
            clients: 3,
            metrics: {
              closing_percentage: { current: 93, industry_avg: 65, difference: '+28%' },
              cancellation_rate: { current: 4, industry_avg: 22, difference: '-18%' },
              customer_experience: { current: 9.9, industry_avg: 7.5, difference: '+2.4' }
            },
            satisfaction: '10/10'
          }
        ],
        
                
        analysis: {
          strengths: [
            { 
              area: 'Enterprise Client Performance ($151M+)', 
              performance: 'Exceptional - 93% closing rate, 4% cancellation',
              details: 'Top-tier clients showing industry-leading metrics across all KPIs',
              recommendation: 'Develop case studies from enterprise success stories'
            },
            { 
              area: 'Mid-Market Excellence ($31M-$75M)', 
              performance: 'Outstanding - 85-87% closing rates',
              details: 'Sweet spot for DM services with highest satisfaction scores',
              recommendation: 'Package mid-market solutions as flagship offering'
            },
            {
              area: 'Consistent Cancellation Reduction',
              performance: 'Industry Leading - Average 14% below industry',
              details: 'All revenue tiers showing significant cancellation improvements',
              recommendation: 'Highlight retention methodology in marketing'
            }
          ],
          opportunities: [
            { 
              area: 'Small Contractor Engagement ($0-$5M)', 
              current_performance: 'Only +3% closing improvement',
              target: '+10% improvement minimum',
              action_plan: 'Develop scaled coaching programs for smaller contractors'
            },
            {
              area: 'Client Distribution Balance',
              current_performance: '500+ total clients, heavily weighted $11M-$20M',
              target: 'More even distribution across tiers',
              action_plan: 'Targeted outreach to underserved revenue segments'
            }
          ]
        },
        
        recommendations: {
          start: [
            'Tiered service packages matching revenue segments',
            'Monthly virtual workshops for $0-$10M contractors',
            'Enterprise advisory board with $300M+ clients'
          ],
          stop: [
            'One-size-fits-all coaching approach',
            'Manual performance tracking for large client base'
          ],
          keep: [
            'Quarterly PowerCard surveys with 3 key metrics focus',
            'Personalized coaching for $31M+ revenue tier',
            'Industry variance reporting methodology'
          ]
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
      // Get partner data from database if available
      let partnerData = null;
      try {
        const { query } = require('../config/database');
        const result = await query(
          `SELECT
            id, company_name, description, value_proposition, website, logo_url,
            powerconfidence_score, is_active, status,
            to_json(focus_areas) as focus_areas,
            to_json(service_areas) as service_areas,
            to_json(focus_areas_served) as focus_areas_served,
            to_json(client_testimonials) as client_testimonials,
            to_json(ai_tags) as ai_tags,
            ai_summary, key_differentiators, testimonials,
            client_count, established_year
          FROM strategic_partners WHERE id = $1`,
          [partnerId]
        );
        if (result.rows.length > 0) {
          partnerData = result.rows[0];
        }
      } catch (err) {
        console.log('Could not fetch partner data:', err);
      }

      const report = {
        partner: {
          name: partnerData?.company_name || 'Destination Motivation',
          tagline: partnerData?.value_proposition || 'Building Winning Teams That Stay',
          videos: partnerData?.landing_page_videos || []
        },
        
        powerconfidence_score: {
          current: 99,
          label: 'Elite Partner',
          percentile: '99th percentile',
          description: 'Top 1% of all strategic partners'
        },
        
        key_metrics: [
          { metric: '+12%', label: 'Avg. Closing Rate Increase' },
          { metric: '-6.8%', label: 'Avg. Cancel Rate Reduction' },
          { metric: '9.2/10', label: 'Customer Experience Score' },
        { metric: '500+', label: 'Verified Contractors Helped' }
        ],
        
        testimonials: [
          {
            quote: 'DM transformed our culture. Turnover down 40%!',
            author: 'John Smith',
            company: 'ABC Contracting',
            revenue_tier: '31-50M'
          },
          {
            quote: 'The leadership training was a game-changer for our managers.',
            author: 'Sarah Johnson',
            company: 'Premier Builders',
            revenue_tier: '11-20M'
          },
          {
            quote: 'Employee satisfaction scores up 35% in just 6 months!',
            author: 'Mike Davis',
            company: 'Excel Construction',
            revenue_tier: '51-75M'
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
