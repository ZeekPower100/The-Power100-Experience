// PowerConfidence Integration Service - Connects Power Cards feedback to scoring
const { query, transaction } = require('../config/database.sqlite');
const powerCardService = require('./powerCardService');

class PowerConfidenceService {

  // ===== POWERCONFIDENCE SCORE CALCULATION =====

  // Main PowerConfidence calculation triggered by campaign completion
  async calculatePowerConfidenceScores(campaignId) {
    try {
      console.log(`🔄 Starting PowerConfidence calculation for campaign ${campaignId}`);
      
      // Get all partners with responses in this campaign
      const partnersResult = await query(`
        SELECT DISTINCT 
          pt.partner_id,
          pt.partner_type,
          sp.company_name,
          COUNT(pr.id) as response_count
        FROM power_card_responses pr
        JOIN power_card_recipients pcr ON pr.recipient_id = pcr.id
        JOIN power_card_templates pt ON pr.template_id = pt.id
        LEFT JOIN strategic_partners sp ON pt.partner_id = sp.id
        WHERE pr.campaign_id = ?
        GROUP BY pt.partner_id, pt.partner_type
        HAVING response_count >= 3
        ORDER BY response_count DESC
      `, [campaignId]);

      const results = [];

      for (const partner of partnersResult.rows) {
        const scoreData = await this.calculatePartnerScore(
          partner.partner_id, 
          campaignId, 
          partner.partner_type
        );
        
        if (scoreData) {
          results.push({
            partner_id: partner.partner_id,
            partner_name: partner.company_name,
            partner_type: partner.partner_type,
            ...scoreData
          });
          
          console.log(`✅ Calculated score for ${partner.company_name}: ${scoreData.score}`);
        }
      }

      // Generate aggregated analytics
      await this.generateAnalytics(campaignId);
      
      console.log(`🎉 PowerConfidence calculation complete. Updated ${results.length} partners.`);
      return results;

    } catch (error) {
      console.error('❌ PowerConfidence calculation failed:', error);
      throw error;
    }
  }

  // Calculate PowerConfidence score for a specific partner
  async calculatePartnerScore(partnerId, campaignId, partnerType = 'strategic_partner') {
    return transaction(async (client) => {
      // Get all responses for this partner in this campaign
      const responseResult = await client.query(`
        SELECT 
          pr.*,
          pt.metric_1_name, pt.metric_2_name, pt.metric_3_name,
          pcr.revenue_tier
        FROM power_card_responses pr
        JOIN power_card_recipients pcr ON pr.recipient_id = pcr.id
        JOIN power_card_templates pt ON pr.template_id = pt.id
        WHERE pt.partner_id = ? AND pr.campaign_id = ?
      `, [partnerId, campaignId]);

      const responses = responseResult.rows;
      
      if (responses.length < 3) {
        console.log(`⚠️  Partner ${partnerId} has insufficient responses (${responses.length})`);
        return null;
      }

      // Calculate component averages
      const components = this.calculateScoreComponents(responses);
      
      // Apply Greg's weighting formula
      const powerConfidenceScore = this.applyWeightingFormula(components);
      
      // Get previous score for variance calculation
      const previousScore = await this.getPreviousScore(partnerId, partnerType, client);
      const scoreChange = powerConfidenceScore - (previousScore || 0);
      const variance = previousScore ? ((scoreChange / previousScore) * 100) : 0;

      // Get peer comparison data
      const peerAverage = await this.calculatePeerAverage(
        responses[0]?.revenue_tier, 
        campaignId, 
        partnerId, 
        client
      );
      const varianceFromPeers = peerAverage ? 
        ((powerConfidenceScore - peerAverage) / peerAverage * 100) : 0;

      // Save to PowerConfidence history
      const historyResult = await client.query(`
        INSERT INTO power_confidence_history_v2 (
          partner_id, partner_type, campaign_id,
          previous_score, new_score, score_change,
          customer_satisfaction_avg, nps_score,
          metric_1_avg, metric_2_avg, metric_3_avg,
          employee_satisfaction_avg, response_count, response_rate,
          revenue_tier, variance_from_peer_avg
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        partnerId, partnerType, campaignId,
        previousScore, powerConfidenceScore, scoreChange,
        components.satisfaction, components.nps,
        components.metric_1, components.metric_2, components.metric_3,
        components.culture, responses.length, 
        await this.calculateResponseRate(partnerId, campaignId, client),
        responses[0]?.revenue_tier, varianceFromPeers
      ]);

      // Update partner's current PowerConfidence score
      if (partnerType === 'strategic_partner') {
        await client.query(`
          UPDATE strategic_partners 
          SET power_confidence_score = ?,
              last_feedback_update = CURRENT_TIMESTAMP,
              total_feedback_responses = total_feedback_responses + ?,
              average_satisfaction = ?,
              feedback_trend = ?
          WHERE id = ?
        `, [
          powerConfidenceScore, 
          responses.length, 
          components.satisfaction,
          this.determineTrend(scoreChange),
          partnerId
        ]);
      }

      return {
        score: powerConfidenceScore,
        previousScore,
        scoreChange,
        variance,
        varianceFromPeers,
        responseCount: responses.length,
        components,
        trend: this.determineTrend(scoreChange)
      };
    });
  }

  // Calculate individual score components
  calculateScoreComponents(responses) {
    const calculateAvg = (field) => {
      const values = responses
        .map(r => r[field])
        .filter(v => v !== null && v !== undefined);
      return values.length > 0 ? 
        values.reduce((sum, val) => sum + val, 0) / values.length : 0;
    };

    return {
      satisfaction: calculateAvg('satisfaction_score'),
      nps: calculateAvg('recommendation_score'),
      metric_1: calculateAvg('metric_1_score'),
      metric_2: calculateAvg('metric_2_score'),
      metric_3: calculateAvg('metric_3_score'),
      culture: calculateAvg('culture_score')
    };
  }

  // Apply Greg's PowerConfidence weighting formula
  applyWeightingFormula(components) {
    // Greg's emphasis: Focus on variance and customer satisfaction
    // Weighting: 40% satisfaction, 25% NPS, 25% custom metrics, 10% culture
    const customMetricsAvg = (components.metric_1 + components.metric_2 + components.metric_3) / 3;
    
    const score = (
      (components.satisfaction * 0.40) +
      (components.nps * 0.25) +
      (customMetricsAvg * 0.25) +
      (components.culture * 0.10)
    );

    // Convert to 100-point scale and round
    return Math.round(score * 10);
  }

  // Get previous PowerConfidence score
  async getPreviousScore(partnerId, partnerType, client) {
    const result = await client.query(`
      SELECT new_score FROM power_confidence_history_v2
      WHERE partner_id = ? AND partner_type = ?
      ORDER BY calculated_at DESC LIMIT 1
    `, [partnerId, partnerType]);

    return result.rows[0]?.new_score || null;
  }

  // Calculate peer average for variance comparison
  async calculatePeerAverage(revenueTier, campaignId, excludePartnerId, client) {
    if (!revenueTier) return null;

    const result = await client.query(`
      SELECT AVG(pch.new_score) as peer_average
      FROM power_confidence_history_v2 pch
      WHERE pch.campaign_id = ? 
        AND pch.revenue_tier = ? 
        AND pch.partner_id != ?
    `, [campaignId, revenueTier, excludePartnerId]);

    return result.rows[0]?.peer_average || null;
  }

  // Calculate response rate for this partner
  async calculateResponseRate(partnerId, campaignId, client) {
    const result = await client.query(`
      SELECT 
        COUNT(*) as total_sent,
        COUNT(CASE WHEN pcr.status = 'completed' THEN 1 END) as completed
      FROM power_card_recipients pcr
      JOIN power_card_templates pt ON pcr.template_id = pt.id
      WHERE pt.partner_id = ? AND pcr.campaign_id = ?
    `, [partnerId, campaignId]);

    const { total_sent, completed } = result.rows[0];
    return total_sent > 0 ? (completed / total_sent * 100) : 0;
  }

  // Determine trend direction
  determineTrend(scoreChange) {
    if (scoreChange > 2) return 'up';
    if (scoreChange < -2) return 'down';
    return 'stable';
  }

  // ===== ANALYTICS GENERATION =====

  // Generate aggregated analytics for anonymous reporting
  async generateAnalytics(campaignId) {
    try {
      console.log(`📊 Generating analytics for campaign ${campaignId}`);

      // Get revenue tiers with sufficient data
      const tiersResult = await query(`
        SELECT DISTINCT pcr.revenue_tier
        FROM power_card_recipients pcr
        JOIN power_card_responses pr ON pcr.id = pr.recipient_id
        WHERE pr.campaign_id = ? AND pcr.revenue_tier IS NOT NULL
        GROUP BY pcr.revenue_tier
        HAVING COUNT(pr.id) >= 5
      `, [campaignId]);

      for (const tier of tiersResult.rows) {
        await this.generateTierAnalytics(campaignId, tier.revenue_tier);
      }

      console.log(`✅ Analytics generation complete for ${tiersResult.rows.length} revenue tiers`);
    } catch (error) {
      console.error('❌ Analytics generation failed:', error);
      throw error;
    }
  }

  // Generate analytics for a specific revenue tier
  async generateTierAnalytics(campaignId, revenueTier) {
    const result = await query(`
      SELECT 
        COUNT(pr.id) as total_responses,
        AVG(pr.satisfaction_score) as avg_satisfaction,
        AVG(pr.recommendation_score) as avg_nps,
        AVG(pr.metric_1_score) as avg_metric_1,
        AVG(pr.metric_2_score) as avg_metric_2,
        AVG(pr.metric_3_score) as avg_metric_3,
        
        -- Percentiles (simplified calculation)
        MIN(pr.satisfaction_score) as min_satisfaction,
        MAX(pr.satisfaction_score) as max_satisfaction
      FROM power_card_responses pr
      JOIN power_card_recipients pcr ON pr.recipient_id = pcr.id
      WHERE pr.campaign_id = ? AND pcr.revenue_tier = ?
    `, [campaignId, revenueTier]);

    const stats = result.rows[0];
    
    if (stats.total_responses >= 5) {
      // Calculate variance from previous quarter
      const previousResult = await query(`
        SELECT avg_satisfaction FROM power_card_analytics
        WHERE revenue_tier = ?
        ORDER BY created_at DESC LIMIT 1
      `, [revenueTier]);

      const previousAvg = previousResult.rows[0]?.avg_satisfaction;
      const varianceFromLastQuarter = previousAvg ? 
        ((stats.avg_satisfaction - previousAvg) / previousAvg * 100) : 0;

      // Insert analytics record
      await query(`
        INSERT INTO power_card_analytics (
          campaign_id, revenue_tier, total_responses,
          avg_satisfaction, avg_nps, avg_metric_1, avg_metric_2, avg_metric_3,
          variance_from_last_quarter, trend_direction,
          percentile_25, percentile_50, percentile_75
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        campaignId, revenueTier, stats.total_responses,
        stats.avg_satisfaction, stats.avg_nps, 
        stats.avg_metric_1, stats.avg_metric_2, stats.avg_metric_3,
        varianceFromLastQuarter,
        this.determineTrend(varianceFromLastQuarter),
        stats.min_satisfaction, // Simplified percentiles
        stats.avg_satisfaction,
        stats.max_satisfaction
      ]);
    }
  }

  // ===== REPORTING =====

  // Generate quarterly PowerConfidence report
  async generateQuarterlyReport(campaignId) {
    const reportData = {
      campaign: await this.getCampaignInfo(campaignId),
      partnerScores: await this.getPartnerScoresSummary(campaignId),
      industryBenchmarks: await this.getIndustryBenchmarks(campaignId),
      varianceAnalysis: await this.getVarianceAnalysis(campaignId),
      topPerformers: await this.getTopPerformers(campaignId),
      improvementOpportunities: await this.getImprovementOpportunities(campaignId)
    };

    return reportData;
  }

  // Get campaign information
  async getCampaignInfo(campaignId) {
    const result = await query(`
      SELECT * FROM power_card_campaigns WHERE id = ?
    `, [campaignId]);

    return result.rows[0];
  }

  // Get partner scores summary
  async getPartnerScoresSummary(campaignId) {
    const result = await query(`
      SELECT 
        pch.partner_id,
        sp.company_name,
        pch.new_score,
        pch.score_change,
        pch.response_count,
        pch.variance_from_peer_avg
      FROM power_confidence_history_v2 pch
      LEFT JOIN strategic_partners sp ON pch.partner_id = sp.id
      WHERE pch.campaign_id = ?
      ORDER BY pch.new_score DESC
    `, [campaignId]);

    return result.rows;
  }

  // Get industry benchmarks by revenue tier
  async getIndustryBenchmarks(campaignId) {
    const result = await query(`
      SELECT 
        revenue_tier,
        avg_satisfaction,
        avg_nps,
        total_responses,
        trend_direction
      FROM power_card_analytics
      WHERE campaign_id = ?
      ORDER BY 
        CASE revenue_tier
          WHEN 'under_500k' THEN 1
          WHEN '500k_1m' THEN 2
          WHEN '1m_5m' THEN 3
          WHEN '5m_10m' THEN 4
          WHEN '10m_25m' THEN 5
          WHEN '25m_50m' THEN 6
          WHEN '50m_100m' THEN 7
          WHEN '100m_plus' THEN 8
          ELSE 9
        END
    `, [campaignId]);

    return result.rows;
  }

  // Get variance analysis (Greg's key focus)
  async getVarianceAnalysis(campaignId) {
    const result = await query(`
      SELECT 
        AVG(ABS(score_change)) as avg_absolute_change,
        COUNT(CASE WHEN score_change > 0 THEN 1 END) as improving_count,
        COUNT(CASE WHEN score_change < 0 THEN 1 END) as declining_count,
        COUNT(CASE WHEN ABS(score_change) <= 2 THEN 1 END) as stable_count,
        MAX(score_change) as biggest_improvement,
        MIN(score_change) as biggest_decline
      FROM power_confidence_history_v2
      WHERE campaign_id = ?
    `, [campaignId]);

    return result.rows[0];
  }

  // Get top performers
  async getTopPerformers(campaignId) {
    const result = await query(`
      SELECT 
        sp.company_name,
        pch.new_score,
        pch.score_change,
        pch.customer_satisfaction_avg,
        pch.nps_score
      FROM power_confidence_history_v2 pch
      LEFT JOIN strategic_partners sp ON pch.partner_id = sp.id
      WHERE pch.campaign_id = ?
      ORDER BY pch.new_score DESC
      LIMIT 5
    `, [campaignId]);

    return result.rows;
  }

  // Get improvement opportunities
  async getImprovementOpportunities(campaignId) {
    const result = await query(`
      SELECT 
        sp.company_name,
        pch.new_score,
        pch.score_change,
        pch.customer_satisfaction_avg,
        pch.nps_score,
        CASE 
          WHEN pch.customer_satisfaction_avg < 6 THEN 'Customer Satisfaction'
          WHEN pch.nps_score < 5 THEN 'Net Promoter Score'
          WHEN pch.score_change < -5 THEN 'Overall Performance Decline'
          ELSE 'Stable Performance'
        END as improvement_area
      FROM power_confidence_history_v2 pch
      LEFT JOIN strategic_partners sp ON pch.partner_id = sp.id
      WHERE pch.campaign_id = ? AND (
        pch.customer_satisfaction_avg < 6 OR
        pch.nps_score < 5 OR
        pch.score_change < -5
      )
      ORDER BY pch.new_score ASC
      LIMIT 10
    `, [campaignId]);

    return result.rows;
  }
}

module.exports = new PowerConfidenceService();