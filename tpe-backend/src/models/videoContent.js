const { query } = require('../config/database');

class VideoContent {
  static async create(data) {
    try {
      const sql = `
        INSERT INTO video_content (
          entity_type, entity_id, video_type, title, description,
          duration_seconds, file_url, thumbnail_url, file_size_mb,
          format, resolution, upload_date, processed_status, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING *
      `;
      const values = [
        data.entity_type,
        data.entity_id,
        data.video_type,
        data.title,
        data.description,
        data.duration_seconds,
        data.file_url,
        data.thumbnail_url,
        data.file_size_mb,
        data.format,
        data.resolution,
        data.upload_date || new Date(),
        data.processed_status || 'pending',
        data.is_active !== undefined ? data.is_active : true
      ];
      const result = await query(sql, values);
      return result.rows[0];
    } catch (error) {
      throw new Error(`Error creating video content: ${error.message}`);
    }
  }

  static async findById(id) {
    try {
      const result = await query('SELECT * FROM video_content WHERE id = $1', [id]);
      return result.rows[0] || null;
    } catch (error) {
      throw new Error(`Error finding video content: ${error.message}`);
    }
  }

  static async findAll(limit = 100) {
    try {
      const result = await query(
        'SELECT * FROM video_content ORDER BY created_at DESC LIMIT $1',
        [limit]
      );
      return result.rows;
    } catch (error) {
      throw new Error(`Error fetching all video content: ${error.message}`);
    }
  }

  static async findByEntity(entity_type, entity_id) {
    try {
      const result = await query(
        'SELECT * FROM video_content WHERE entity_type = $1 AND entity_id = $2 ORDER BY created_at DESC',
        [entity_type, entity_id]
      );
      return result.rows;
    } catch (error) {
      throw new Error(`Error finding videos by entity: ${error.message}`);
    }
  }

  static async findByType(video_type) {
    try {
      const result = await query(
        'SELECT * FROM video_content WHERE video_type = $1 ORDER BY created_at DESC',
        [video_type]
      );
      return result.rows;
    } catch (error) {
      throw new Error(`Error finding videos by type: ${error.message}`);
    }
  }

  static async findByStatus(processed_status) {
    try {
      const result = await query(
        'SELECT * FROM video_content WHERE processed_status = $1 ORDER BY created_at DESC',
        [processed_status]
      );
      return result.rows;
    } catch (error) {
      throw new Error(`Error finding videos by status: ${error.message}`);
    }
  }

  static async update(id, data) {
    try {
      const fields = [];
      const values = [];
      let paramCount = 1;

      // Define allowed fields based on actual database columns
      const allowedFields = [
        'entity_type', 'entity_id', 'video_type', 'title', 'description',
        'duration_seconds', 'file_url', 'thumbnail_url', 'file_size_mb',
        'format', 'resolution', 'upload_date', 'processed_status', 'is_active'
      ];

      Object.keys(data).forEach(key => {
        if (data[key] !== undefined && key !== 'id' && allowedFields.includes(key)) {
          fields.push(`${key} = $${paramCount}`);
          values.push(data[key]);
          paramCount++;
        }
      });

      if (fields.length === 0) return null;

      fields.push(`updated_at = CURRENT_TIMESTAMP`);
      values.push(id);

      const sql = `
        UPDATE video_content
        SET ${fields.join(', ')}
        WHERE id = $${paramCount}
        RETURNING *
      `;
      const result = await query(sql, values);
      return result.rows[0] || null;
    } catch (error) {
      throw new Error(`Error updating video content: ${error.message}`);
    }
  }

  static async updateStatus(id, processed_status) {
    try {
      const sql = `
        UPDATE video_content
        SET processed_status = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
        RETURNING *
      `;
      const result = await query(sql, [processed_status, id]);
      return result.rows[0] || null;
    } catch (error) {
      throw new Error(`Error updating video status: ${error.message}`);
    }
  }

  static async delete(id) {
    try {
      const result = await query('DELETE FROM video_content WHERE id = $1 RETURNING *', [id]);
      return result.rows[0] || null;
    } catch (error) {
      throw new Error(`Error deleting video content: ${error.message}`);
    }
  }

  static async getActiveVideos() {
    try {
      const result = await query(
        'SELECT * FROM video_content WHERE is_active = true ORDER BY created_at DESC'
      );
      return result.rows;
    } catch (error) {
      throw new Error(`Error fetching active videos: ${error.message}`);
    }
  }

  static async getPendingVideos() {
    try {
      const result = await query(
        `SELECT * FROM video_content
         WHERE processed_status = 'pending'
         ORDER BY created_at ASC`
      );
      return result.rows;
    } catch (error) {
      throw new Error(`Error fetching pending videos: ${error.message}`);
    }
  }

  static async getVideoStats() {
    try {
      const result = await query(`
        SELECT
          COUNT(*) as total_videos,
          COUNT(CASE WHEN processed_status = 'completed' THEN 1 END) as completed,
          COUNT(CASE WHEN processed_status = 'pending' THEN 1 END) as pending,
          COUNT(CASE WHEN processed_status = 'processing' THEN 1 END) as processing,
          COUNT(CASE WHEN processed_status = 'failed' THEN 1 END) as failed,
          AVG(duration_seconds) as avg_duration,
          AVG(file_size_mb) as avg_file_size
        FROM video_content
      `);
      return result.rows[0];
    } catch (error) {
      throw new Error(`Error fetching video stats: ${error.message}`);
    }
  }
}

module.exports = VideoContent;