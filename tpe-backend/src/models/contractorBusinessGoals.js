// Contractor Business Goals Model
const { query } = require('../config/database');

class ContractorBusinessGoals {
  // Create a new business goal
  static async create(data) {
    const sql = `
      INSERT INTO contractor_business_goals (
        contractor_id, goal, timeline, priority, current_progress
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    const values = [
      data.contractor_id,
      data.goal,
      data.timeline || null,
      data.priority || 3,
      data.current_progress || 0
    ];
    const result = await query(sql, values);
    return result.rows[0];
  }

  // Get all goals for a contractor
  static async findByContractorId(contractorId) {
    const sql = `
      SELECT * FROM contractor_business_goals
      WHERE contractor_id = $1
      ORDER BY priority ASC, created_at DESC
    `;
    const result = await query(sql, [contractorId]);
    return result.rows;
  }

  // Get a single goal by ID
  static async findById(id) {
    const sql = 'SELECT * FROM contractor_business_goals WHERE id = $1';
    const result = await query(sql, [id]);
    return result.rows[0];
  }

  // Update a goal
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
      UPDATE contractor_business_goals
      SET ${fields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;
    const result = await query(sql, values);
    return result.rows[0];
  }

  // Update progress
  static async updateProgress(id, progress) {
    const sql = `
      UPDATE contractor_business_goals
      SET current_progress = $1,
          updated_at = CURRENT_TIMESTAMP,
          completed_at = CASE WHEN $1 >= 100 THEN CURRENT_TIMESTAMP ELSE completed_at END
      WHERE id = $2
      RETURNING *
    `;
    const result = await query(sql, [progress, id]);
    return result.rows[0];
  }

  // Delete a goal
  static async delete(id) {
    const sql = 'DELETE FROM contractor_business_goals WHERE id = $1 RETURNING *';
    const result = await query(sql, [id]);
    return result.rows[0];
  }

  // Get goals by priority
  static async findByPriority(contractorId, priority) {
    const sql = `
      SELECT * FROM contractor_business_goals
      WHERE contractor_id = $1 AND priority = $2
      ORDER BY created_at DESC
    `;
    const result = await query(sql, [contractorId, priority]);
    return result.rows;
  }

  // Get incomplete goals
  static async findIncomplete(contractorId) {
    const sql = `
      SELECT * FROM contractor_business_goals
      WHERE contractor_id = $1 AND current_progress < 100
      ORDER BY priority ASC, created_at DESC
    `;
    const result = await query(sql, [contractorId]);
    return result.rows;
  }
}

module.exports = ContractorBusinessGoals;