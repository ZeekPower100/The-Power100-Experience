// Contractor Challenges Model
const { query } = require('../config/database');

class ContractorChallenges {
  // Create a new challenge
  static async create(data) {
    const sql = `
      INSERT INTO contractor_challenges (
        contractor_id, challenge, severity, attempted_solutions,
        open_to_solutions, resolved
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    const values = [
      data.contractor_id,
      data.challenge,
      data.severity || 'medium',
      data.attempted_solutions || [],
      data.open_to_solutions !== false,
      data.resolved || false
    ];
    const result = await query(sql, values);
    return result.rows[0];
  }

  // Get all challenges for a contractor
  static async findByContractorId(contractorId) {
    const sql = `
      SELECT * FROM contractor_challenges
      WHERE contractor_id = $1
      ORDER BY
        CASE severity
          WHEN 'critical' THEN 1
          WHEN 'high' THEN 2
          WHEN 'medium' THEN 3
          WHEN 'low' THEN 4
        END,
        created_at DESC
    `;
    const result = await query(sql, [contractorId]);
    return result.rows;
  }

  // Get a single challenge by ID
  static async findById(id) {
    const sql = 'SELECT * FROM contractor_challenges WHERE id = $1';
    const result = await query(sql, [id]);
    return result.rows[0];
  }

  // Update a challenge
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
      UPDATE contractor_challenges
      SET ${fields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;
    const result = await query(sql, values);
    return result.rows[0];
  }

  // Mark as resolved
  static async resolve(id) {
    const sql = `
      UPDATE contractor_challenges
      SET resolved = true,
          resolved_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;
    const result = await query(sql, [id]);
    return result.rows[0];
  }

  // Delete a challenge
  static async delete(id) {
    const sql = 'DELETE FROM contractor_challenges WHERE id = $1 RETURNING *';
    const result = await query(sql, [id]);
    return result.rows[0];
  }

  // Get unresolved challenges
  static async findUnresolved(contractorId) {
    const sql = `
      SELECT * FROM contractor_challenges
      WHERE contractor_id = $1 AND resolved = false
      ORDER BY
        CASE severity
          WHEN 'critical' THEN 1
          WHEN 'high' THEN 2
          WHEN 'medium' THEN 3
          WHEN 'low' THEN 4
        END
    `;
    const result = await query(sql, [contractorId]);
    return result.rows;
  }

  // Get challenges by severity
  static async findBySeverity(contractorId, severity) {
    const sql = `
      SELECT * FROM contractor_challenges
      WHERE contractor_id = $1 AND severity = $2
      ORDER BY created_at DESC
    `;
    const result = await query(sql, [contractorId, severity]);
    return result.rows;
  }

  // Add attempted solution
  static async addAttemptedSolution(id, solution) {
    const sql = `
      UPDATE contractor_challenges
      SET attempted_solutions = array_append(attempted_solutions, $1),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `;
    const result = await query(sql, [solution, id]);
    return result.rows[0];
  }
}

module.exports = ContractorChallenges;