// Contractor Metrics History Model
const { query } = require('../config/database');

class ContractorMetricsHistory {
  // Create a new metrics record
  static async create(data) {
    const sql = `
      INSERT INTO contractor_metrics_history (
        contractor_id, engagement_score, churn_risk, growth_potential,
        lifecycle_stage, factors
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    const values = [
      data.contractor_id,
      data.engagement_score || null,
      data.churn_risk || null,
      data.growth_potential || null,
      data.lifecycle_stage || null,
      data.factors || {}
    ];
    const result = await query(sql, values);
    return result.rows[0];
  }

  // Get all metrics for a contractor
  static async findByContractorId(contractorId) {
    const sql = `
      SELECT * FROM contractor_metrics_history
      WHERE contractor_id = $1
      ORDER BY calculated_at DESC
    `;
    const result = await query(sql, [contractorId]);
    return result.rows;
  }

  // Get latest metrics for a contractor
  static async findLatest(contractorId) {
    const sql = `
      SELECT * FROM contractor_metrics_history
      WHERE contractor_id = $1
      ORDER BY calculated_at DESC
      LIMIT 1
    `;
    const result = await query(sql, [contractorId]);
    return result.rows[0];
  }

  // Get a single metric record by ID
  static async findById(id) {
    const sql = 'SELECT * FROM contractor_metrics_history WHERE id = $1';
    const result = await query(sql, [id]);
    return result.rows[0];
  }

  // Get metrics within time range
  static async findByTimeRange(contractorId, startDate, endDate) {
    const sql = `
      SELECT * FROM contractor_metrics_history
      WHERE contractor_id = $1
        AND calculated_at >= $2
        AND calculated_at <= $3
      ORDER BY calculated_at DESC
    `;
    const result = await query(sql, [contractorId, startDate, endDate]);
    return result.rows;
  }

  // Get metrics trend
  static async getTrend(contractorId, limit = 30) {
    const sql = `
      SELECT * FROM contractor_metrics_history
      WHERE contractor_id = $1
      ORDER BY calculated_at DESC
      LIMIT $2
    `;
    const result = await query(sql, [contractorId, limit]);
    return result.rows;
  }

  // Get contractors at risk
  static async findAtRisk(threshold = 70) {
    const sql = `
      SELECT DISTINCT ON (contractor_id)
        contractor_id, churn_risk, engagement_score,
        growth_potential, lifecycle_stage, calculated_at
      FROM contractor_metrics_history
      WHERE churn_risk >= $1
      ORDER BY contractor_id, calculated_at DESC
    `;
    const result = await query(sql, [threshold]);
    return result.rows;
  }

  // Get high performers
  static async findHighPerformers(threshold = 80) {
    const sql = `
      SELECT DISTINCT ON (contractor_id)
        contractor_id, engagement_score, growth_potential,
        lifecycle_stage, calculated_at
      FROM contractor_metrics_history
      WHERE engagement_score >= $1 OR growth_potential >= $1
      ORDER BY contractor_id, calculated_at DESC
    `;
    const result = await query(sql, [threshold]);
    return result.rows;
  }

  // Get contractors by lifecycle stage
  static async findByLifecycleStage(stage) {
    const sql = `
      SELECT DISTINCT ON (contractor_id)
        contractor_id, engagement_score, churn_risk,
        growth_potential, lifecycle_stage, calculated_at
      FROM contractor_metrics_history
      WHERE lifecycle_stage = $1
      ORDER BY contractor_id, calculated_at DESC
    `;
    const result = await query(sql, [stage]);
    return result.rows;
  }

  // Calculate average metrics
  static async getAverageMetrics(contractorId, days = 30) {
    const sql = `
      SELECT
        AVG(engagement_score) as avg_engagement_score,
        AVG(churn_risk) as avg_churn_risk,
        AVG(growth_potential) as avg_growth_potential,
        COUNT(*) as data_points
      FROM contractor_metrics_history
      WHERE contractor_id = $1
        AND calculated_at >= CURRENT_DATE - INTERVAL '${days} days'
    `;
    const result = await query(sql, [contractorId]);
    return result.rows[0];
  }

  // Get metric changes
  static async getMetricChanges(contractorId) {
    const sql = `
      WITH ranked_metrics AS (
        SELECT
          *,
          LAG(engagement_score) OVER (ORDER BY calculated_at) as prev_engagement,
          LAG(churn_risk) OVER (ORDER BY calculated_at) as prev_churn,
          LAG(growth_potential) OVER (ORDER BY calculated_at) as prev_growth
        FROM contractor_metrics_history
        WHERE contractor_id = $1
        ORDER BY calculated_at DESC
        LIMIT 2
      )
      SELECT
        engagement_score - prev_engagement as engagement_change,
        churn_risk - prev_churn as churn_change,
        growth_potential - prev_growth as growth_change
      FROM ranked_metrics
      WHERE prev_engagement IS NOT NULL
      LIMIT 1
    `;
    const result = await query(sql, [contractorId]);
    return result.rows[0];
  }

  // Batch create metrics for multiple contractors
  static async createBatch(metricsArray) {
    const values = [];
    const placeholders = [];
    let paramCount = 1;

    metricsArray.forEach(metrics => {
      placeholders.push(`($${paramCount}, $${paramCount+1}, $${paramCount+2}, $${paramCount+3}, $${paramCount+4}, $${paramCount+5})`);
      values.push(
        metrics.contractor_id,
        metrics.engagement_score || null,
        metrics.churn_risk || null,
        metrics.growth_potential || null,
        metrics.lifecycle_stage || null,
        metrics.factors || {}
      );
      paramCount += 6;
    });

    const sql = `
      INSERT INTO contractor_metrics_history (
        contractor_id, engagement_score, churn_risk, growth_potential,
        lifecycle_stage, factors
      ) VALUES ${placeholders.join(', ')}
      RETURNING *
    `;
    const result = await query(sql, values);
    return result.rows;
  }

  // Delete old metrics (for cleanup)
  static async deleteOldMetrics(daysToKeep = 365) {
    const sql = `
      DELETE FROM contractor_metrics_history
      WHERE calculated_at < CURRENT_DATE - INTERVAL '${daysToKeep} days'
      RETURNING COUNT(*) as deleted_count
    `;
    const result = await query(sql);
    return result.rows[0];
  }
}

module.exports = ContractorMetricsHistory;