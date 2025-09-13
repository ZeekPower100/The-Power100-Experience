// Contractor Communications Model
const { query } = require('../config/database');

class ContractorCommunications {
  // Create a new communication record
  static async create(data) {
    const sql = `
      INSERT INTO contractor_communications (
        contractor_id, channel, direction, subject, content,
        status, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    const values = [
      data.contractor_id,
      data.channel,
      data.direction,
      data.subject || null,
      data.content || null,
      data.status || 'sent',
      data.metadata || {}
    ];
    const result = await query(sql, values);
    return result.rows[0];
  }

  // Get all communications for a contractor
  static async findByContractorId(contractorId) {
    const sql = `
      SELECT * FROM contractor_communications
      WHERE contractor_id = $1
      ORDER BY created_at DESC
    `;
    const result = await query(sql, [contractorId]);
    return result.rows;
  }

  // Get communications by channel
  static async findByChannel(contractorId, channel) {
    const sql = `
      SELECT * FROM contractor_communications
      WHERE contractor_id = $1 AND channel = $2
      ORDER BY created_at DESC
    `;
    const result = await query(sql, [contractorId, channel]);
    return result.rows;
  }

  // Get a single communication by ID
  static async findById(id) {
    const sql = 'SELECT * FROM contractor_communications WHERE id = $1';
    const result = await query(sql, [id]);
    return result.rows[0];
  }

  // Update communication status
  static async updateStatus(id, status, timestamp) {
    let sql = `UPDATE contractor_communications SET status = $1`;
    const values = [status];

    // Add appropriate timestamp based on status
    if (status === 'delivered') {
      sql += ', delivered_at = CURRENT_TIMESTAMP';
    } else if (status === 'opened') {
      sql += ', opened_at = CURRENT_TIMESTAMP';
    } else if (status === 'clicked') {
      sql += ', clicked_at = CURRENT_TIMESTAMP';
    } else if (status === 'replied') {
      sql += ', replied_at = CURRENT_TIMESTAMP';
    }

    values.push(id);
    sql += ` WHERE id = $2 RETURNING *`;

    const result = await query(sql, values);
    return result.rows[0];
  }

  // Get recent communications
  static async findRecent(contractorId, limit = 10) {
    const sql = `
      SELECT * FROM contractor_communications
      WHERE contractor_id = $1
      ORDER BY created_at DESC
      LIMIT $2
    `;
    const result = await query(sql, [contractorId, limit]);
    return result.rows;
  }

  // Get unread communications
  static async findUnread(contractorId) {
    const sql = `
      SELECT * FROM contractor_communications
      WHERE contractor_id = $1
        AND direction = 'inbound'
        AND opened_at IS NULL
      ORDER BY created_at DESC
    `;
    const result = await query(sql, [contractorId]);
    return result.rows;
  }

  // Update metadata
  static async updateMetadata(id, metadata) {
    const sql = `
      UPDATE contractor_communications
      SET metadata = metadata || $1
      WHERE id = $2
      RETURNING *
    `;
    const result = await query(sql, [metadata, id]);
    return result.rows[0];
  }

  // Delete a communication
  static async delete(id) {
    const sql = 'DELETE FROM contractor_communications WHERE id = $1 RETURNING *';
    const result = await query(sql, [id]);
    return result.rows[0];
  }

  // Get communication stats
  static async getStats(contractorId) {
    const sql = `
      SELECT
        channel,
        direction,
        COUNT(*) as count,
        COUNT(CASE WHEN opened_at IS NOT NULL THEN 1 END) as opened,
        COUNT(CASE WHEN clicked_at IS NOT NULL THEN 1 END) as clicked,
        COUNT(CASE WHEN replied_at IS NOT NULL THEN 1 END) as replied
      FROM contractor_communications
      WHERE contractor_id = $1
      GROUP BY channel, direction
    `;
    const result = await query(sql, [contractorId]);
    return result.rows;
  }
}

module.exports = ContractorCommunications;