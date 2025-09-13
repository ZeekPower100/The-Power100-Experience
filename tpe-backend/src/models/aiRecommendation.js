const { query } = require('../config/database');
const { safeJsonParse, safeJsonStringify } = require('../utils/jsonHelpers');

class AiRecommendation {
  static async create(recommendationData) {
    const sql = `
      INSERT INTO ai_recommendations (
        contractor_id, entity_type, entity_id, recommendation_reason,
        ai_confidence_score, trigger_event, business_context,
        engagement_status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;

    const values = [
      recommendationData.contractor_id,
      recommendationData.entity_type,
      recommendationData.entity_id,
      recommendationData.recommendation_reason,
      recommendationData.ai_confidence_score,
      recommendationData.trigger_event,
      safeJsonStringify(recommendationData.business_context || {}),
      recommendationData.engagement_status || 'presented'
    ];

    const result = await query(sql, values);
    return this.parseRecommendation(result.rows[0]);
  }

  static async findById(id) {
    const result = await query(
      'SELECT * FROM ai_recommendations WHERE id = $1',
      [id]
    );
    return result.rows[0] ? this.parseRecommendation(result.rows[0]) : null;
  }

  static async findByContractor(contractorId, limit = 10) {
    const result = await query(
      `SELECT * FROM ai_recommendations
       WHERE contractor_id = $1
       ORDER BY presented_at DESC
       LIMIT $2`,
      [contractorId, limit]
    );
    return result.rows.map(row => this.parseRecommendation(row));
  }

  static async findByEntity(entityType, entityId) {
    const result = await query(
      `SELECT * FROM ai_recommendations
       WHERE entity_type = $1 AND entity_id = $2
       ORDER BY presented_at DESC`,
      [entityType, entityId]
    );
    return result.rows.map(row => this.parseRecommendation(row));
  }

  static async updateEngagement(id, status, feedback = null) {
    const sql = feedback
      ? `UPDATE ai_recommendations
         SET engagement_status = $2,
             engaged_at = CURRENT_TIMESTAMP,
             feedback_rating = $3,
             feedback_text = $4,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1
         RETURNING *`
      : `UPDATE ai_recommendations
         SET engagement_status = $2,
             engaged_at = CURRENT_TIMESTAMP,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1
         RETURNING *`;

    const values = feedback
      ? [id, status, feedback.rating, feedback.text]
      : [id, status];

    const result = await query(sql, values);
    return this.parseRecommendation(result.rows[0]);
  }

  static async recordOutcome(id, outcome, revenueImpact = null) {
    const sql = `
      UPDATE ai_recommendations
      SET outcome = $2,
          revenue_impact = $3,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;

    const result = await query(sql, [id, outcome, revenueImpact]);
    return this.parseRecommendation(result.rows[0]);
  }

  static async getEngagementStats(contractorId = null) {
    const whereClause = contractorId ? 'WHERE contractor_id = $1' : '';
    const params = contractorId ? [contractorId] : [];

    const sql = `
      SELECT
        engagement_status,
        COUNT(*) as count,
        AVG(ai_confidence_score) as avg_confidence,
        AVG(feedback_rating) as avg_rating
      FROM ai_recommendations
      ${whereClause}
      GROUP BY engagement_status
    `;

    const result = await query(sql, params);
    return result.rows;
  }

  static async getTopPerformingRecommendations(limit = 10) {
    const sql = `
      SELECT
        entity_type,
        entity_id,
        COUNT(*) as recommendation_count,
        AVG(ai_confidence_score) as avg_confidence,
        AVG(feedback_rating) as avg_rating,
        SUM(CASE WHEN engagement_status = 'completed' THEN 1 ELSE 0 END) as completions,
        SUM(revenue_impact) as total_revenue_impact
      FROM ai_recommendations
      WHERE feedback_rating IS NOT NULL
      GROUP BY entity_type, entity_id
      ORDER BY avg_rating DESC, completions DESC
      LIMIT $1
    `;

    const result = await query(sql, [limit]);
    return result.rows;
  }

  static async getRecentRecommendations(limit = 20) {
    const result = await query(
      `SELECT * FROM ai_recommendations
       ORDER BY presented_at DESC
       LIMIT $1`,
      [limit]
    );
    return result.rows.map(row => this.parseRecommendation(row));
  }

  static async getByStatus(status, limit = 100) {
    const result = await query(
      `SELECT * FROM ai_recommendations
       WHERE engagement_status = $1
       ORDER BY presented_at DESC
       LIMIT $2`,
      [status, limit]
    );
    return result.rows.map(row => this.parseRecommendation(row));
  }

  static parseRecommendation(recommendation) {
    if (!recommendation) return null;

    return {
      ...recommendation,
      business_context: safeJsonParse(recommendation.business_context, {})
    };
  }
}

module.exports = AiRecommendation;