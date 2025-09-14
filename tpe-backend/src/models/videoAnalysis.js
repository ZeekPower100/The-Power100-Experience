const { query } = require('../config/database');
const { safeJsonParse, safeJsonStringify } = require('../utils/jsonHelpers');

class VideoAnalysis {
  static async create(data) {
    try {
      const sql = `
        INSERT INTO video_analysis (
          video_id, analysis_type, transcript, transcript_confidence,
          language_detected, visual_quality_score, lighting_score,
          audio_quality_score, background_professional, demo_structure_score,
          value_prop_clarity, feature_coverage, presenter_confidence,
          slide_quality_score, demo_flow_score, call_to_action_clear,
          technical_competence, question_handling, authenticity_score,
          satisfaction_level, specific_metrics_mentioned, pain_points_addressed,
          recommendation_strength, key_talking_points, unique_value_props,
          competitive_advantages, use_cases_mentioned, pace_score,
          energy_level, viewer_retention_estimate, persuasiveness_score,
          frames_analyzed, processing_time_seconds, ai_models_used,
          total_tokens_used, processing_cost_usd, analysis_date, analysis_version
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
          $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
          $21, $22, $23, $24, $25, $26, $27, $28, $29, $30,
          $31, $32, $33, $34, $35, $36, $37, $38
        )
        RETURNING *
      `;
      const values = [
        data.video_id,
        data.analysis_type,
        data.transcript,
        data.transcript_confidence,
        data.language_detected,
        data.visual_quality_score,
        data.lighting_score,
        data.audio_quality_score,
        data.background_professional,
        data.demo_structure_score,
        data.value_prop_clarity,
        data.feature_coverage,
        data.presenter_confidence,
        data.slide_quality_score,
        data.demo_flow_score,
        data.call_to_action_clear,
        data.technical_competence,
        data.question_handling,
        data.authenticity_score,
        data.satisfaction_level,
        safeJsonStringify(data.specific_metrics_mentioned),
        safeJsonStringify(data.pain_points_addressed),
        data.recommendation_strength,
        safeJsonStringify(data.key_talking_points),
        safeJsonStringify(data.unique_value_props),
        safeJsonStringify(data.competitive_advantages),
        safeJsonStringify(data.use_cases_mentioned),
        data.pace_score,
        data.energy_level,
        data.viewer_retention_estimate,
        data.persuasiveness_score,
        data.frames_analyzed,
        data.processing_time_seconds,
        safeJsonStringify(data.ai_models_used),
        data.total_tokens_used,
        data.processing_cost_usd,
        data.analysis_date || new Date(),
        data.analysis_version || 'v1.0'
      ];
      const result = await query(sql, values);
      return this.parseAnalysis(result.rows[0]);
    } catch (error) {
      throw new Error(`Error creating video analysis: ${error.message}`);
    }
  }

  static async findById(id) {
    try {
      const result = await query('SELECT * FROM video_analysis WHERE id = $1', [id]);
      return result.rows[0] ? this.parseAnalysis(result.rows[0]) : null;
    } catch (error) {
      throw new Error(`Error finding video analysis: ${error.message}`);
    }
  }

  static async findByVideoId(video_id) {
    try {
      const result = await query(
        'SELECT * FROM video_analysis WHERE video_id = $1 ORDER BY created_at DESC',
        [video_id]
      );
      return result.rows.map(row => this.parseAnalysis(row));
    } catch (error) {
      throw new Error(`Error finding analysis by video: ${error.message}`);
    }
  }

  static async findByType(analysis_type) {
    try {
      const result = await query(
        'SELECT * FROM video_analysis WHERE analysis_type = $1 ORDER BY created_at DESC',
        [analysis_type]
      );
      return result.rows.map(row => this.parseAnalysis(row));
    } catch (error) {
      throw new Error(`Error finding analysis by type: ${error.message}`);
    }
  }

  static async update(id, data) {
    try {
      const fields = [];
      const values = [];
      let paramCount = 1;

      // Define allowed fields based on actual database columns
      const allowedFields = [
        'video_id', 'analysis_type', 'transcript', 'transcript_confidence',
        'language_detected', 'visual_quality_score', 'lighting_score',
        'audio_quality_score', 'background_professional', 'demo_structure_score',
        'value_prop_clarity', 'feature_coverage', 'presenter_confidence',
        'slide_quality_score', 'demo_flow_score', 'call_to_action_clear',
        'technical_competence', 'question_handling', 'authenticity_score',
        'satisfaction_level', 'specific_metrics_mentioned', 'pain_points_addressed',
        'recommendation_strength', 'key_talking_points', 'unique_value_props',
        'competitive_advantages', 'use_cases_mentioned', 'pace_score',
        'energy_level', 'viewer_retention_estimate', 'persuasiveness_score',
        'frames_analyzed', 'processing_time_seconds', 'ai_models_used',
        'total_tokens_used', 'processing_cost_usd', 'analysis_date', 'analysis_version'
      ];

      // JSON fields that need stringification
      const jsonFields = [
        'specific_metrics_mentioned', 'pain_points_addressed', 'key_talking_points',
        'unique_value_props', 'competitive_advantages', 'use_cases_mentioned', 'ai_models_used'
      ];

      Object.keys(data).forEach(key => {
        if (data[key] !== undefined && key !== 'id' && allowedFields.includes(key)) {
          fields.push(`${key} = $${paramCount}`);
          if (jsonFields.includes(key)) {
            values.push(safeJsonStringify(data[key]));
          } else {
            values.push(data[key]);
          }
          paramCount++;
        }
      });

      if (fields.length === 0) return null;

      fields.push(`updated_at = CURRENT_TIMESTAMP`);
      values.push(id);

      const sql = `
        UPDATE video_analysis
        SET ${fields.join(', ')}
        WHERE id = $${paramCount}
        RETURNING *
      `;
      const result = await query(sql, values);
      return result.rows[0] ? this.parseAnalysis(result.rows[0]) : null;
    } catch (error) {
      throw new Error(`Error updating video analysis: ${error.message}`);
    }
  }

  static async delete(id) {
    try {
      const result = await query('DELETE FROM video_analysis WHERE id = $1 RETURNING *', [id]);
      return result.rows[0] ? this.parseAnalysis(result.rows[0]) : null;
    } catch (error) {
      throw new Error(`Error deleting video analysis: ${error.message}`);
    }
  }

  static async getHighQualityDemos(min_score = 0.8) {
    try {
      const result = await query(
        `SELECT * FROM video_analysis
         WHERE analysis_type = 'demo_analysis'
         AND demo_structure_score >= $1
         ORDER BY demo_structure_score DESC`,
        [min_score]
      );
      return result.rows.map(row => this.parseAnalysis(row));
    } catch (error) {
      throw new Error(`Error fetching high quality demos: ${error.message}`);
    }
  }

  static async getAuthenticTestimonials(min_score = 0.8) {
    try {
      const result = await query(
        `SELECT * FROM video_analysis
         WHERE analysis_type = 'testimonial_analysis'
         AND authenticity_score >= $1
         ORDER BY authenticity_score DESC`,
        [min_score]
      );
      return result.rows.map(row => this.parseAnalysis(row));
    } catch (error) {
      throw new Error(`Error fetching authentic testimonials: ${error.message}`);
    }
  }

  static async getAnalysisStats() {
    try {
      const result = await query(`
        SELECT
          COUNT(*) as total_analyses,
          COUNT(CASE WHEN analysis_type = 'demo_analysis' THEN 1 END) as demo_analyses,
          COUNT(CASE WHEN analysis_type = 'testimonial_analysis' THEN 1 END) as testimonial_analyses,
          AVG(demo_structure_score) as avg_demo_score,
          AVG(authenticity_score) as avg_authenticity_score,
          AVG(visual_quality_score) as avg_visual_quality,
          AVG(audio_quality_score) as avg_audio_quality,
          SUM(total_tokens_used) as total_tokens,
          SUM(processing_cost_usd) as total_cost
        FROM video_analysis
      `);
      return result.rows[0];
    } catch (error) {
      throw new Error(`Error fetching analysis stats: ${error.message}`);
    }
  }

  static parseAnalysis(analysis) {
    if (!analysis) return null;
    return {
      ...analysis,
      specific_metrics_mentioned: safeJsonParse(analysis.specific_metrics_mentioned, []),
      pain_points_addressed: safeJsonParse(analysis.pain_points_addressed, []),
      key_talking_points: safeJsonParse(analysis.key_talking_points, []),
      unique_value_props: safeJsonParse(analysis.unique_value_props, []),
      competitive_advantages: safeJsonParse(analysis.competitive_advantages, []),
      use_cases_mentioned: safeJsonParse(analysis.use_cases_mentioned, []),
      ai_models_used: safeJsonParse(analysis.ai_models_used, [])
    };
  }
}

module.exports = VideoAnalysis;