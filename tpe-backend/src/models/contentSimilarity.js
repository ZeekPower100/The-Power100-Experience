const db = require('../config/database');

class ContentSimilarity {
  constructor(data) {
    this.id = data.id;
    this.source_type = data.source_type;
    this.source_id = data.source_id;
    this.target_type = data.target_type;
    this.target_id = data.target_id;
    this.similarity_score = data.similarity_score;
    this.calculation_method = data.calculation_method;
    this.last_calculated = data.last_calculated;
  }

  static async findSimilar(entity_type, entity_id, limit = 10) {
    try {
      const result = await db.query(
        `SELECT * FROM content_similarity
         WHERE source_type = $1 AND source_id = $2
         ORDER BY similarity_score DESC
         LIMIT $3`,
        [entity_type, entity_id, limit]
      );
      return result.rows.map(row => new ContentSimilarity(row));
    } catch (error) {
      console.error('Error finding similar content:', error);
      throw error;
    }
  }

  static async create(data) {
    try {
      const result = await db.query(
        `INSERT INTO content_similarity (
          source_type, source_id, target_type, target_id,
          similarity_score, calculation_method
        ) VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (source_type, source_id, target_type, target_id)
        DO UPDATE SET
          similarity_score = EXCLUDED.similarity_score,
          calculation_method = EXCLUDED.calculation_method,
          last_calculated = CURRENT_TIMESTAMP
        RETURNING *`,
        [
          data.source_type,
          data.source_id,
          data.target_type,
          data.target_id,
          data.similarity_score,
          data.calculation_method || 'focus_area_overlap'
        ]
      );
      return new ContentSimilarity(result.rows[0]);
    } catch (error) {
      console.error('Error creating content similarity:', error);
      throw error;
    }
  }

  static async bulkCreate(similarities) {
    try {
      const values = [];
      const placeholders = [];
      let paramCount = 1;

      similarities.forEach(sim => {
        placeholders.push(
          `($${paramCount}, $${paramCount+1}, $${paramCount+2}, $${paramCount+3}, $${paramCount+4}, $${paramCount+5})`
        );
        values.push(
          sim.source_type,
          sim.source_id,
          sim.target_type,
          sim.target_id,
          sim.similarity_score,
          sim.calculation_method || 'focus_area_overlap'
        );
        paramCount += 6;
      });

      const result = await db.query(
        `INSERT INTO content_similarity (
          source_type, source_id, target_type, target_id,
          similarity_score, calculation_method
        ) VALUES ${placeholders.join(', ')}
        ON CONFLICT (source_type, source_id, target_type, target_id)
        DO UPDATE SET
          similarity_score = EXCLUDED.similarity_score,
          calculation_method = EXCLUDED.calculation_method,
          last_calculated = CURRENT_TIMESTAMP
        RETURNING *`,
        values
      );
      return result.rows.map(row => new ContentSimilarity(row));
    } catch (error) {
      console.error('Error bulk creating content similarities:', error);
      throw error;
    }
  }

  static async calculateSimilarity(source, target) {
    // Simple focus area overlap calculation
    // This can be enhanced with more sophisticated algorithms
    try {
      const sourceFocusAreas = source.focus_areas || [];
      const targetFocusAreas = target.focus_areas || [];

      if (sourceFocusAreas.length === 0 || targetFocusAreas.length === 0) {
        return 0;
      }

      const intersection = sourceFocusAreas.filter(area =>
        targetFocusAreas.includes(area)
      ).length;

      const union = new Set([...sourceFocusAreas, ...targetFocusAreas]).size;

      return union > 0 ? (intersection / union).toFixed(2) : 0;
    } catch (error) {
      console.error('Error calculating similarity:', error);
      return 0;
    }
  }

  static async deleteOld(days = 30) {
    try {
      const result = await db.query(
        `DELETE FROM content_similarity
         WHERE last_calculated < NOW() - INTERVAL '${days} days'
         RETURNING id`
      );
      return result.rowCount;
    } catch (error) {
      console.error('Error deleting old similarities:', error);
      throw error;
    }
  }
}

module.exports = ContentSimilarity;