// DATABASE-CHECKED: ab_experiments, ab_experiment_assignments columns verified December 5, 2025
/**
 * A/B Experiment Service
 * Manages experiments, variant assignments, and statistical analysis
 */
const { query, transaction } = require('../config/database');
const { safeJsonStringify } = require('../utils/jsonHelpers');

class ABExperimentService {
  /**
   * Create a new A/B experiment
   */
  async createExperiment({
    name,
    description,
    variants, // [{name: 'control', weight: 50}, {name: 'variant_a', weight: 50}]
    success_metric = 'conversion',
    target_sample_size = 100,
    created_by = null
  }) {
    const result = await query(`
      INSERT INTO ab_experiments (
        name, description, variants, success_metric,
        target_sample_size, created_by, status
      ) VALUES ($1, $2, $3, $4, $5, $6, 'draft')
      RETURNING *
    `, [
      name,
      description,
      safeJsonStringify(variants),
      success_metric,
      target_sample_size,
      created_by
    ]);

    return result.rows[0];
  }

  /**
   * Start an experiment (set to active)
   */
  async startExperiment(experimentId) {
    const result = await query(`
      UPDATE ab_experiments
      SET status = 'active', start_date = NOW(), updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `, [experimentId]);

    return result.rows[0];
  }

  /**
   * Stop/complete an experiment
   */
  async completeExperiment(experimentId) {
    const result = await query(`
      UPDATE ab_experiments
      SET status = 'completed', end_date = NOW(), updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `, [experimentId]);

    return result.rows[0];
  }

  /**
   * Assign a user to an experiment variant
   * Uses weighted random selection based on variant weights
   */
  async assignUserToVariant(experimentId, userId, userType = 'contractor') {
    // Check if user already assigned
    const existingResult = await query(`
      SELECT * FROM ab_experiment_assignments
      WHERE experiment_id = $1 AND user_id = $2 AND user_type = $3
    `, [experimentId, userId, userType]);

    if (existingResult.rows.length > 0) {
      return existingResult.rows[0]; // Return existing assignment
    }

    // Get experiment variants
    const experimentResult = await query(`
      SELECT variants FROM ab_experiments WHERE id = $1 AND status = 'active'
    `, [experimentId]);

    if (experimentResult.rows.length === 0) {
      throw new Error('Experiment not found or not active');
    }

    const variants = experimentResult.rows[0].variants;
    const selectedVariant = this.weightedRandomSelect(variants);

    // Create assignment
    const result = await query(`
      INSERT INTO ab_experiment_assignments (
        experiment_id, user_id, user_type, variant
      ) VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [experimentId, userId, userType, selectedVariant.name]);

    return result.rows[0];
  }

  /**
   * Record a conversion for an assignment
   */
  async recordConversion(experimentId, userId, userType = 'contractor', engagementScore = null, timeToAction = null) {
    const result = await query(`
      UPDATE ab_experiment_assignments
      SET converted = TRUE,
          converted_at = NOW(),
          engagement_score = COALESCE($4, engagement_score),
          time_to_action = COALESCE($5, time_to_action)
      WHERE experiment_id = $1 AND user_id = $2 AND user_type = $3
      RETURNING *
    `, [experimentId, userId, userType, engagementScore, timeToAction]);

    return result.rows[0];
  }

  /**
   * Get experiment results with statistical analysis
   */
  async getExperimentResults(experimentId) {
    // Get experiment details
    const experimentResult = await query(`
      SELECT * FROM ab_experiments WHERE id = $1
    `, [experimentId]);

    if (experimentResult.rows.length === 0) {
      return null;
    }

    const experiment = experimentResult.rows[0];

    // Get variant stats
    const statsResult = await query(`
      SELECT
        variant,
        COUNT(*) as total_users,
        COUNT(*) FILTER (WHERE converted = TRUE) as conversions,
        AVG(engagement_score) FILTER (WHERE engagement_score IS NOT NULL) as avg_engagement,
        AVG(time_to_action) FILTER (WHERE time_to_action IS NOT NULL) as avg_time_to_action
      FROM ab_experiment_assignments
      WHERE experiment_id = $1
      GROUP BY variant
    `, [experimentId]);

    const variantStats = statsResult.rows.map(row => ({
      variant: row.variant,
      totalUsers: parseInt(row.total_users),
      conversions: parseInt(row.conversions),
      conversionRate: row.total_users > 0 ? row.conversions / row.total_users : 0,
      avgEngagement: row.avg_engagement ? parseFloat(row.avg_engagement) : null,
      avgTimeToAction: row.avg_time_to_action ? parseFloat(row.avg_time_to_action) : null
    }));

    // Calculate statistical significance
    const significanceResult = this.calculateStatisticalSignificance(variantStats);

    // Get total participants
    const totalResult = await query(`
      SELECT COUNT(*) as total FROM ab_experiment_assignments WHERE experiment_id = $1
    `, [experimentId]);

    return {
      experiment: {
        id: experiment.id,
        name: experiment.name,
        description: experiment.description,
        status: experiment.status,
        startDate: experiment.start_date,
        endDate: experiment.end_date,
        targetSampleSize: experiment.target_sample_size,
        successMetric: experiment.success_metric
      },
      totalParticipants: parseInt(totalResult.rows[0].total),
      variantStats,
      statisticalSignificance: significanceResult,
      recommendation: this.generateRecommendation(variantStats, significanceResult)
    };
  }

  /**
   * Calculate statistical significance using two-proportion z-test
   * Compares each variant against control (first variant)
   */
  calculateStatisticalSignificance(variantStats) {
    if (variantStats.length < 2) {
      return { isSignificant: false, confidence: 0, reason: 'Need at least 2 variants' };
    }

    const control = variantStats[0];
    const results = [];

    for (let i = 1; i < variantStats.length; i++) {
      const treatment = variantStats[i];

      // Two-proportion z-test
      const n1 = control.totalUsers;
      const n2 = treatment.totalUsers;
      const p1 = control.conversionRate;
      const p2 = treatment.conversionRate;

      if (n1 === 0 || n2 === 0) {
        results.push({
          variant: treatment.variant,
          vsControl: control.variant,
          isSignificant: false,
          confidence: 0,
          pValue: 1,
          lift: 0,
          reason: 'Insufficient sample size'
        });
        continue;
      }

      // Pooled proportion
      const pooledP = (control.conversions + treatment.conversions) / (n1 + n2);

      // Standard error
      const se = Math.sqrt(pooledP * (1 - pooledP) * (1/n1 + 1/n2));

      if (se === 0) {
        results.push({
          variant: treatment.variant,
          vsControl: control.variant,
          isSignificant: false,
          confidence: 0,
          pValue: 1,
          lift: 0,
          reason: 'No variation in data'
        });
        continue;
      }

      // Z-score
      const z = (p2 - p1) / se;

      // Two-tailed p-value (approximation using standard normal)
      const pValue = 2 * (1 - this.normalCDF(Math.abs(z)));

      // Calculate lift
      const lift = p1 > 0 ? ((p2 - p1) / p1) * 100 : 0;

      // Significance at 95% confidence (p < 0.05)
      const isSignificant = pValue < 0.05;
      const confidence = (1 - pValue) * 100;

      results.push({
        variant: treatment.variant,
        vsControl: control.variant,
        isSignificant,
        confidence: Math.min(99.9, confidence).toFixed(1),
        pValue: pValue.toFixed(4),
        lift: lift.toFixed(1),
        zScore: z.toFixed(2),
        reason: isSignificant
          ? `Statistically significant at 95% confidence level`
          : `Not significant (need more data or larger effect)`
      });
    }

    // Overall significance (any variant significantly better)
    const anySignificant = results.some(r => r.isSignificant);
    const bestResult = results.reduce((best, curr) =>
      parseFloat(curr.lift) > parseFloat(best.lift) ? curr : best
    , results[0]);

    return {
      isSignificant: anySignificant,
      highestConfidence: Math.max(...results.map(r => parseFloat(r.confidence))),
      comparisons: results,
      winner: bestResult.isSignificant && parseFloat(bestResult.lift) > 0
        ? bestResult.variant
        : null
    };
  }

  /**
   * Standard normal CDF approximation
   */
  normalCDF(x) {
    const a1 =  0.254829592;
    const a2 = -0.284496736;
    const a3 =  1.421413741;
    const a4 = -1.453152027;
    const a5 =  1.061405429;
    const p  =  0.3275911;

    const sign = x < 0 ? -1 : 1;
    x = Math.abs(x) / Math.sqrt(2);

    const t = 1.0 / (1.0 + p * x);
    const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

    return 0.5 * (1.0 + sign * y);
  }

  /**
   * Weighted random selection for variant assignment
   */
  weightedRandomSelect(variants) {
    const totalWeight = variants.reduce((sum, v) => sum + (v.weight || 1), 0);
    let random = Math.random() * totalWeight;

    for (const variant of variants) {
      random -= (variant.weight || 1);
      if (random <= 0) {
        return variant;
      }
    }

    return variants[variants.length - 1]; // Fallback
  }

  /**
   * Generate recommendation based on results
   */
  generateRecommendation(variantStats, significance) {
    if (variantStats.length === 0) {
      return 'No data available yet.';
    }

    const totalParticipants = variantStats.reduce((sum, v) => sum + v.totalUsers, 0);

    if (totalParticipants < 30) {
      return `Experiment needs more participants (${totalParticipants}/30 minimum). Continue collecting data.`;
    }

    if (!significance.isSignificant) {
      return `No statistically significant winner yet. Consider: (1) Continue collecting data, (2) The variants may perform similarly, (3) Try a larger effect size in future experiments.`;
    }

    if (significance.winner) {
      const winningVariant = variantStats.find(v => v.variant === significance.winner);
      const controlVariant = variantStats[0];
      const comparison = significance.comparisons.find(c => c.variant === significance.winner);

      return `🎉 Winner: "${significance.winner}" outperforms "${controlVariant.variant}" by ${comparison.lift}% (${comparison.confidence}% confidence). Recommend implementing this variant.`;
    }

    return `Results are inconclusive. Consider extending the experiment or revising the variants.`;
  }

  /**
   * Get all experiments with summary stats
   */
  async getAllExperiments(status = null) {
    let queryStr = `
      SELECT
        e.*,
        COUNT(a.id) as total_assignments,
        COUNT(a.id) FILTER (WHERE a.converted = TRUE) as total_conversions
      FROM ab_experiments e
      LEFT JOIN ab_experiment_assignments a ON e.id = a.experiment_id
    `;

    const params = [];
    if (status) {
      queryStr += ` WHERE e.status = $1`;
      params.push(status);
    }

    queryStr += ` GROUP BY e.id ORDER BY e.created_at DESC`;

    const result = await query(queryStr, params);

    return result.rows.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description,
      status: row.status,
      startDate: row.start_date,
      endDate: row.end_date,
      targetSampleSize: row.target_sample_size,
      successMetric: row.success_metric,
      variants: row.variants,
      totalAssignments: parseInt(row.total_assignments),
      totalConversions: parseInt(row.total_conversions),
      overallConversionRate: row.total_assignments > 0
        ? (row.total_conversions / row.total_assignments * 100).toFixed(1)
        : 0,
      createdAt: row.created_at
    }));
  }

  /**
   * Get user's variant for an experiment
   */
  async getUserVariant(experimentId, userId, userType = 'contractor') {
    const result = await query(`
      SELECT variant FROM ab_experiment_assignments
      WHERE experiment_id = $1 AND user_id = $2 AND user_type = $3
    `, [experimentId, userId, userType]);

    return result.rows[0]?.variant || null;
  }

  /**
   * Delete an experiment (only drafts)
   */
  async deleteExperiment(experimentId) {
    const result = await query(`
      DELETE FROM ab_experiments
      WHERE id = $1 AND status = 'draft'
      RETURNING id
    `, [experimentId]);

    return result.rows.length > 0;
  }
}

module.exports = new ABExperimentService();
