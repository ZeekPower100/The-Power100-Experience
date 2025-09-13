// Contractor Content Engagement Model
const { query } = require('../config/database');

class ContractorContentEngagement {
  // Create a new engagement record
  static async create(data) {
    const sql = `
      INSERT INTO contractor_content_engagement (
        contractor_id, content_type, content_id, content_title,
        engagement_type, progress, time_spent, rating, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;
    const values = [
      data.contractor_id,
      data.content_type,
      data.content_id,
      data.content_title || null,
      data.engagement_type || null,
      data.progress || 0,
      data.time_spent || null,
      data.rating || null,
      data.notes || null
    ];
    const result = await query(sql, values);
    return result.rows[0];
  }

  // Get all engagements for a contractor
  static async findByContractorId(contractorId) {
    const sql = `
      SELECT * FROM contractor_content_engagement
      WHERE contractor_id = $1
      ORDER BY updated_at DESC
    `;
    const result = await query(sql, [contractorId]);
    return result.rows;
  }

  // Get engagements by content type
  static async findByContentType(contractorId, contentType) {
    const sql = `
      SELECT * FROM contractor_content_engagement
      WHERE contractor_id = $1 AND content_type = $2
      ORDER BY updated_at DESC
    `;
    const result = await query(sql, [contractorId, contentType]);
    return result.rows;
  }

  // Get a single engagement by ID
  static async findById(id) {
    const sql = 'SELECT * FROM contractor_content_engagement WHERE id = $1';
    const result = await query(sql, [id]);
    return result.rows[0];
  }

  // Find engagement by content
  static async findByContent(contractorId, contentType, contentId) {
    const sql = `
      SELECT * FROM contractor_content_engagement
      WHERE contractor_id = $1 AND content_type = $2 AND content_id = $3
    `;
    const result = await query(sql, [contractorId, contentType, contentId]);
    return result.rows[0];
  }

  // Update engagement
  static async update(id, data) {
    const fields = [];
    const values = [];
    let paramCount = 1;

    Object.keys(data).forEach(key => {
      if (data[key] !== undefined && key !== 'id' && key !== 'contractor_id') {
        fields.push(`${key} = $${paramCount}`);
        values.push(data[key]);
        paramCount++;
      }
    });

    if (fields.length === 0) return null;

    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const sql = `
      UPDATE contractor_content_engagement
      SET ${fields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;
    const result = await query(sql, values);
    return result.rows[0];
  }

  // Update progress
  static async updateProgress(id, progress, timeSpent) {
    const sql = `
      UPDATE contractor_content_engagement
      SET progress = $1,
          time_spent = COALESCE(time_spent, 0) + $2,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *
    `;
    const result = await query(sql, [progress, timeSpent || 0, id]);
    return result.rows[0];
  }

  // Add rating
  static async addRating(id, rating, notes) {
    const sql = `
      UPDATE contractor_content_engagement
      SET rating = $1,
          notes = $2,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *
    `;
    const result = await query(sql, [rating, notes, id]);
    return result.rows[0];
  }

  // Get completed content
  static async findCompleted(contractorId) {
    const sql = `
      SELECT * FROM contractor_content_engagement
      WHERE contractor_id = $1 AND progress >= 100
      ORDER BY updated_at DESC
    `;
    const result = await query(sql, [contractorId]);
    return result.rows;
  }

  // Get in-progress content
  static async findInProgress(contractorId) {
    const sql = `
      SELECT * FROM contractor_content_engagement
      WHERE contractor_id = $1 AND progress > 0 AND progress < 100
      ORDER BY updated_at DESC
    `;
    const result = await query(sql, [contractorId]);
    return result.rows;
  }

  // Get top-rated content
  static async findTopRated(contractorId, limit = 10) {
    const sql = `
      SELECT * FROM contractor_content_engagement
      WHERE contractor_id = $1 AND rating IS NOT NULL
      ORDER BY rating DESC, updated_at DESC
      LIMIT $2
    `;
    const result = await query(sql, [contractorId, limit]);
    return result.rows;
  }

  // Delete engagement
  static async delete(id) {
    const sql = 'DELETE FROM contractor_content_engagement WHERE id = $1 RETURNING *';
    const result = await query(sql, [id]);
    return result.rows[0];
  }

  // Get engagement statistics
  static async getStats(contractorId) {
    const sql = `
      SELECT
        content_type,
        COUNT(*) as total_content,
        COUNT(CASE WHEN progress >= 100 THEN 1 END) as completed,
        AVG(progress) as avg_progress,
        AVG(rating) as avg_rating,
        SUM(time_spent) as total_time_spent
      FROM contractor_content_engagement
      WHERE contractor_id = $1
      GROUP BY content_type
    `;
    const result = await query(sql, [contractorId]);
    return result.rows;
  }
}

module.exports = ContractorContentEngagement;