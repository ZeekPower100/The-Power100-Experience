const { query } = require('../config/database');
const { safeJsonParse, safeJsonStringify } = require('../utils/jsonHelpers');

class DemoSegments {
  static async create(data) {
    try {
      const sql = `
        INSERT INTO demo_segments (
          video_id, segment_type, start_time_seconds, end_time_seconds,
          segment_score, key_points, improvement_suggestions
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `;
      const values = [
        data.video_id,
        data.segment_type,
        data.start_time_seconds,
        data.end_time_seconds,
        data.segment_score,
        safeJsonStringify(data.key_points),
        data.improvement_suggestions
      ];
      const result = await query(sql, values);
      return this.parseSegment(result.rows[0]);
    } catch (error) {
      throw new Error(`Error creating demo segment: ${error.message}`);
    }
  }

  static async findById(id) {
    try {
      const result = await query('SELECT * FROM demo_segments WHERE id = $1', [id]);
      return result.rows[0] ? this.parseSegment(result.rows[0]) : null;
    } catch (error) {
      throw new Error(`Error finding demo segment: ${error.message}`);
    }
  }

  static async findByVideoId(video_id) {
    try {
      const result = await query(
        'SELECT * FROM demo_segments WHERE video_id = $1 ORDER BY start_time_seconds',
        [video_id]
      );
      return result.rows.map(row => this.parseSegment(row));
    } catch (error) {
      throw new Error(`Error finding segments by video: ${error.message}`);
    }
  }

  static async findByType(segment_type) {
    try {
      const result = await query(
        'SELECT * FROM demo_segments WHERE segment_type = $1 ORDER BY created_at DESC',
        [segment_type]
      );
      return result.rows.map(row => this.parseSegment(row));
    } catch (error) {
      throw new Error(`Error finding segments by type: ${error.message}`);
    }
  }

  static async update(id, data) {
    try {
      const fields = [];
      const values = [];
      let paramCount = 1;

      // Define allowed fields based on actual database columns
      const allowedFields = [
        'video_id', 'segment_type', 'start_time_seconds', 'end_time_seconds',
        'segment_score', 'key_points', 'improvement_suggestions'
      ];

      Object.keys(data).forEach(key => {
        if (data[key] !== undefined && key !== 'id' && allowedFields.includes(key)) {
          fields.push(`${key} = $${paramCount}`);
          if (key === 'key_points') {
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
        UPDATE demo_segments
        SET ${fields.join(', ')}
        WHERE id = $${paramCount}
        RETURNING *
      `;
      const result = await query(sql, values);
      return result.rows[0] ? this.parseSegment(result.rows[0]) : null;
    } catch (error) {
      throw new Error(`Error updating demo segment: ${error.message}`);
    }
  }

  static async delete(id) {
    try {
      const result = await query('DELETE FROM demo_segments WHERE id = $1 RETURNING *', [id]);
      return result.rows[0] ? this.parseSegment(result.rows[0]) : null;
    } catch (error) {
      throw new Error(`Error deleting demo segment: ${error.message}`);
    }
  }

  static async deleteByVideoId(video_id) {
    try {
      const result = await query(
        'DELETE FROM demo_segments WHERE video_id = $1 RETURNING *',
        [video_id]
      );
      return result.rows.map(row => this.parseSegment(row));
    } catch (error) {
      throw new Error(`Error deleting segments by video: ${error.message}`);
    }
  }

  static async getHighScoringSegments(min_score = 0.8) {
    try {
      const result = await query(
        `SELECT ds.*, vc.title as video_title
         FROM demo_segments ds
         JOIN video_content vc ON ds.video_id = vc.id
         WHERE ds.segment_score >= $1
         ORDER BY ds.segment_score DESC`,
        [min_score]
      );
      return result.rows.map(row => this.parseSegment(row));
    } catch (error) {
      throw new Error(`Error fetching high scoring segments: ${error.message}`);
    }
  }

  static async getSegmentsByImprovement() {
    try {
      const result = await query(
        `SELECT ds.*, vc.title as video_title
         FROM demo_segments ds
         JOIN video_content vc ON ds.video_id = vc.id
         WHERE ds.improvement_suggestions IS NOT NULL
         AND ds.improvement_suggestions != ''
         ORDER BY ds.segment_score ASC`
      );
      return result.rows.map(row => this.parseSegment(row));
    } catch (error) {
      throw new Error(`Error fetching segments needing improvement: ${error.message}`);
    }
  }

  static async getSegmentStats(video_id) {
    try {
      const result = await query(`
        SELECT
          COUNT(*) as total_segments,
          AVG(segment_score) as avg_score,
          MIN(segment_score) as min_score,
          MAX(segment_score) as max_score,
          SUM(end_time_seconds - start_time_seconds) as total_duration
        FROM demo_segments
        WHERE video_id = $1
      `, [video_id]);
      return result.rows[0];
    } catch (error) {
      throw new Error(`Error fetching segment stats: ${error.message}`);
    }
  }

  static parseSegment(segment) {
    if (!segment) return null;
    return {
      ...segment,
      key_points: safeJsonParse(segment.key_points, [])
    };
  }
}

module.exports = DemoSegments;