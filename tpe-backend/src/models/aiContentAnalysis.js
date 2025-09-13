const { query } = require('../config/database');
const { safeJsonParse, safeJsonStringify } = require('../utils/jsonHelpers');

class AiContentAnalysis {
  static async create(analysisData) {
    const sql = `
      INSERT INTO ai_content_analysis (
        entity_type, entity_id, content_type, content_url,
        ai_summary, ai_tags, ai_insights, ai_quality_score,
        relevance_scores, mentioned_entities, key_topics,
        sentiment_analysis, implementation_difficulty,
        time_to_value, investment_required, processing_status,
        processing_model, processing_time_ms, error_message,
        requires_human_review
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
      RETURNING *
    `;

    const values = [
      analysisData.entity_type,
      analysisData.entity_id,
      analysisData.content_type,
      analysisData.content_url,
      analysisData.ai_summary,
      safeJsonStringify(analysisData.ai_tags || []),
      safeJsonStringify(analysisData.ai_insights || []),
      analysisData.ai_quality_score,
      safeJsonStringify(analysisData.relevance_scores || {}),
      safeJsonStringify(analysisData.mentioned_entities || []),
      safeJsonStringify(analysisData.key_topics || []),
      safeJsonStringify(analysisData.sentiment_analysis || {}),
      analysisData.implementation_difficulty,
      analysisData.time_to_value,
      safeJsonStringify(analysisData.investment_required || null),
      analysisData.processing_status || 'pending',
      analysisData.processing_model,
      analysisData.processing_time_ms,
      analysisData.error_message,
      analysisData.requires_human_review || false
    ];

    const result = await query(sql, values);
    return this.parseAnalysis(result.rows[0]);
  }

  static async findById(id) {
    const result = await query(
      'SELECT * FROM ai_content_analysis WHERE id = $1',
      [id]
    );
    return result.rows[0] ? this.parseAnalysis(result.rows[0]) : null;
  }

  static async findByEntity(entityType, entityId) {
    const result = await query(
      `SELECT * FROM ai_content_analysis
       WHERE entity_type = $1 AND entity_id = $2
       ORDER BY created_at DESC`,
      [entityType, entityId]
    );
    return result.rows.map(row => this.parseAnalysis(row));
  }

  static async updateProcessingStatus(id, status, errorMessage = null) {
    const sql = `
      UPDATE ai_content_analysis
      SET processing_status = $2,
          error_message = $3,
          updated_at = CURRENT_TIMESTAMP,
          last_ai_analysis = CASE WHEN $2 = 'completed' THEN CURRENT_TIMESTAMP ELSE last_ai_analysis END
      WHERE id = $1
      RETURNING *
    `;

    const result = await query(sql, [id, status, errorMessage]);
    return this.parseAnalysis(result.rows[0]);
  }

  static async updateAnalysisResults(id, results) {
    const sql = `
      UPDATE ai_content_analysis
      SET ai_summary = COALESCE($2, ai_summary),
          ai_tags = COALESCE($3, ai_tags),
          ai_insights = COALESCE($4, ai_insights),
          ai_quality_score = COALESCE($5, ai_quality_score),
          relevance_scores = COALESCE($6, relevance_scores),
          mentioned_entities = COALESCE($7, mentioned_entities),
          key_topics = COALESCE($8, key_topics),
          sentiment_analysis = COALESCE($9, sentiment_analysis),
          implementation_difficulty = COALESCE($10, implementation_difficulty),
          time_to_value = COALESCE($11, time_to_value),
          investment_required = COALESCE($12, investment_required),
          processing_status = 'completed',
          processing_time_ms = $13,
          processing_model = $14,
          last_ai_analysis = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;

    const values = [
      id,
      results.ai_summary,
      safeJsonStringify(results.ai_tags),
      safeJsonStringify(results.ai_insights),
      results.ai_quality_score,
      safeJsonStringify(results.relevance_scores),
      safeJsonStringify(results.mentioned_entities),
      safeJsonStringify(results.key_topics),
      safeJsonStringify(results.sentiment_analysis),
      results.implementation_difficulty,
      results.time_to_value,
      safeJsonStringify(results.investment_required),
      results.processing_time_ms,
      results.processing_model
    ];

    const result = await query(sql, values);
    return this.parseAnalysis(result.rows[0]);
  }

  static async getPendingAnalysis(limit = 10) {
    const result = await query(
      `SELECT * FROM ai_content_analysis
       WHERE processing_status = 'pending'
       ORDER BY created_at ASC
       LIMIT $1`,
      [limit]
    );
    return result.rows.map(row => this.parseAnalysis(row));
  }

  static async getHighQualityContent(minScore = 80, limit = 20) {
    const result = await query(
      `SELECT * FROM ai_content_analysis
       WHERE ai_quality_score >= $1 AND processing_status = 'completed'
       ORDER BY ai_quality_score DESC, created_at DESC
       LIMIT $2`,
      [minScore, limit]
    );
    return result.rows.map(row => this.parseAnalysis(row));
  }

  static async getContentByTopic(topic, limit = 20) {
    const result = await query(
      `SELECT * FROM ai_content_analysis
       WHERE $1 = ANY(key_topics::text[]) AND processing_status = 'completed'
       ORDER BY ai_quality_score DESC
       LIMIT $2`,
      [topic, limit]
    );
    return result.rows.map(row => this.parseAnalysis(row));
  }

  static async getRelevantContent(focusArea, minRelevanceScore = 0.7, limit = 20) {
    const sql = `
      SELECT * FROM ai_content_analysis
      WHERE processing_status = 'completed'
        AND (relevance_scores->$1)::numeric >= $2
      ORDER BY (relevance_scores->$1)::numeric DESC, ai_quality_score DESC
      LIMIT $3
    `;

    const result = await query(sql, [focusArea, minRelevanceScore, limit]);
    return result.rows.map(row => this.parseAnalysis(row));
  }

  static async getRequiringReview() {
    const result = await query(
      `SELECT * FROM ai_content_analysis
       WHERE requires_human_review = true AND processing_status = 'completed'
       ORDER BY created_at DESC`
    );
    return result.rows.map(row => this.parseAnalysis(row));
  }

  static async getAnalysisStats() {
    const sql = `
      SELECT
        entity_type,
        processing_status,
        COUNT(*) as count,
        AVG(ai_quality_score) as avg_quality_score,
        AVG(processing_time_ms) as avg_processing_time,
        SUM(CASE WHEN requires_human_review THEN 1 ELSE 0 END) as requiring_review
      FROM ai_content_analysis
      GROUP BY entity_type, processing_status
    `;

    const result = await query(sql);
    return result.rows;
  }

  static parseAnalysis(analysis) {
    if (!analysis) return null;

    return {
      ...analysis,
      ai_tags: safeJsonParse(analysis.ai_tags, []),
      ai_insights: safeJsonParse(analysis.ai_insights, []),
      relevance_scores: safeJsonParse(analysis.relevance_scores, {}),
      mentioned_entities: safeJsonParse(analysis.mentioned_entities, []),
      key_topics: safeJsonParse(analysis.key_topics, []),
      sentiment_analysis: safeJsonParse(analysis.sentiment_analysis, {}),
      investment_required: safeJsonParse(analysis.investment_required, null)
    };
  }
}

module.exports = AiContentAnalysis;