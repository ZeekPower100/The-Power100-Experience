const { query } = require('../config/database');
const { safeJsonParse, safeJsonStringify } = require('../utils/jsonHelpers');

class VideoPerformance {
  static async create(data) {
    try {
      const sql = `
        INSERT INTO video_performance (
          video_id, views_count, engagement_rate, avg_watch_time_seconds,
          drop_off_points, conversions_attributed, demo_requests_generated,
          feedback_positive, feedback_negative, last_viewed
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
      `;
      const values = [
        data.video_id,
        data.views_count || 0,
        data.engagement_rate,
        data.avg_watch_time_seconds,
        safeJsonStringify(data.drop_off_points),
        data.conversions_attributed || 0,
        data.demo_requests_generated || 0,
        data.feedback_positive || 0,
        data.feedback_negative || 0,
        data.last_viewed
      ];
      const result = await query(sql, values);
      return this.parsePerformance(result.rows[0]);
    } catch (error) {
      throw new Error(`Error creating video performance: ${error.message}`);
    }
  }

  static async findById(id) {
    try {
      const result = await query('SELECT * FROM video_performance WHERE id = $1', [id]);
      return result.rows[0] ? this.parsePerformance(result.rows[0]) : null;
    } catch (error) {
      throw new Error(`Error finding video performance: ${error.message}`);
    }
  }

  static async findByVideoId(video_id) {
    try {
      const result = await query(
        'SELECT * FROM video_performance WHERE video_id = $1',
        [video_id]
      );
      return result.rows[0] ? this.parsePerformance(result.rows[0]) : null;
    } catch (error) {
      throw new Error(`Error finding performance by video: ${error.message}`);
    }
  }

  static async findOrCreate(video_id) {
    try {
      // First try to find existing
      let result = await query(
        'SELECT * FROM video_performance WHERE video_id = $1',
        [video_id]
      );

      if (result.rows[0]) {
        return this.parsePerformance(result.rows[0]);
      }

      // If not found, create new
      const createSql = `
        INSERT INTO video_performance (video_id, views_count)
        VALUES ($1, 0)
        RETURNING *
      `;
      result = await query(createSql, [video_id]);
      return this.parsePerformance(result.rows[0]);
    } catch (error) {
      throw new Error(`Error finding or creating video performance: ${error.message}`);
    }
  }

  static async update(id, data) {
    try {
      const fields = [];
      const values = [];
      let paramCount = 1;

      // Define allowed fields based on actual database columns
      const allowedFields = [
        'video_id', 'views_count', 'engagement_rate', 'avg_watch_time_seconds',
        'drop_off_points', 'conversions_attributed', 'demo_requests_generated',
        'feedback_positive', 'feedback_negative', 'last_viewed'
      ];

      Object.keys(data).forEach(key => {
        if (data[key] !== undefined && key !== 'id' && allowedFields.includes(key)) {
          fields.push(`${key} = $${paramCount}`);
          if (key === 'drop_off_points') {
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
        UPDATE video_performance
        SET ${fields.join(', ')}
        WHERE id = $${paramCount}
        RETURNING *
      `;
      const result = await query(sql, values);
      return result.rows[0] ? this.parsePerformance(result.rows[0]) : null;
    } catch (error) {
      throw new Error(`Error updating video performance: ${error.message}`);
    }
  }

  static async incrementView(video_id) {
    try {
      const sql = `
        UPDATE video_performance
        SET views_count = views_count + 1,
            last_viewed = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE video_id = $1
        RETURNING *
      `;
      const result = await query(sql, [video_id]);
      return result.rows[0] ? this.parsePerformance(result.rows[0]) : null;
    } catch (error) {
      throw new Error(`Error incrementing view count: ${error.message}`);
    }
  }

  static async incrementFeedback(video_id, isPositive) {
    try {
      const field = isPositive ? 'feedback_positive' : 'feedback_negative';
      const sql = `
        UPDATE video_performance
        SET ${field} = ${field} + 1,
            updated_at = CURRENT_TIMESTAMP
        WHERE video_id = $1
        RETURNING *
      `;
      const result = await query(sql, [video_id]);
      return result.rows[0] ? this.parsePerformance(result.rows[0]) : null;
    } catch (error) {
      throw new Error(`Error incrementing feedback: ${error.message}`);
    }
  }

  static async incrementConversion(video_id) {
    try {
      const sql = `
        UPDATE video_performance
        SET conversions_attributed = conversions_attributed + 1,
            updated_at = CURRENT_TIMESTAMP
        WHERE video_id = $1
        RETURNING *
      `;
      const result = await query(sql, [video_id]);
      return result.rows[0] ? this.parsePerformance(result.rows[0]) : null;
    } catch (error) {
      throw new Error(`Error incrementing conversion: ${error.message}`);
    }
  }

  static async incrementDemoRequest(video_id) {
    try {
      const sql = `
        UPDATE video_performance
        SET demo_requests_generated = demo_requests_generated + 1,
            updated_at = CURRENT_TIMESTAMP
        WHERE video_id = $1
        RETURNING *
      `;
      const result = await query(sql, [video_id]);
      return result.rows[0] ? this.parsePerformance(result.rows[0]) : null;
    } catch (error) {
      throw new Error(`Error incrementing demo request: ${error.message}`);
    }
  }

  static async delete(id) {
    try {
      const result = await query('DELETE FROM video_performance WHERE id = $1 RETURNING *', [id]);
      return result.rows[0] ? this.parsePerformance(result.rows[0]) : null;
    } catch (error) {
      throw new Error(`Error deleting video performance: ${error.message}`);
    }
  }

  static async getTopPerformers(limit = 10) {
    try {
      const result = await query(
        `SELECT vp.*, vc.title, vc.video_type
         FROM video_performance vp
         JOIN video_content vc ON vp.video_id = vc.id
         ORDER BY vp.views_count DESC, vp.engagement_rate DESC
         LIMIT $1`,
        [limit]
      );
      return result.rows.map(row => this.parsePerformance(row));
    } catch (error) {
      throw new Error(`Error fetching top performers: ${error.message}`);
    }
  }

  static async getHighEngagement(min_rate = 0.7) {
    try {
      const result = await query(
        `SELECT vp.*, vc.title, vc.video_type
         FROM video_performance vp
         JOIN video_content vc ON vp.video_id = vc.id
         WHERE vp.engagement_rate >= $1
         ORDER BY vp.engagement_rate DESC`,
        [min_rate]
      );
      return result.rows.map(row => this.parsePerformance(row));
    } catch (error) {
      throw new Error(`Error fetching high engagement videos: ${error.message}`);
    }
  }

  static async getPerformanceStats() {
    try {
      const result = await query(`
        SELECT
          COUNT(*) as total_videos,
          SUM(views_count) as total_views,
          AVG(views_count) as avg_views,
          AVG(engagement_rate) as avg_engagement,
          AVG(avg_watch_time_seconds) as avg_watch_time,
          SUM(conversions_attributed) as total_conversions,
          SUM(demo_requests_generated) as total_demo_requests,
          SUM(feedback_positive) as total_positive_feedback,
          SUM(feedback_negative) as total_negative_feedback
        FROM video_performance
      `);
      return result.rows[0];
    } catch (error) {
      throw new Error(`Error fetching performance stats: ${error.message}`);
    }
  }

  static parsePerformance(performance) {
    if (!performance) return null;
    return {
      ...performance,
      drop_off_points: safeJsonParse(performance.drop_off_points, [])
    };
  }
}

module.exports = VideoPerformance;