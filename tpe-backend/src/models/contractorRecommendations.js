// Contractor Recommendations Model
const { query } = require('../config/database');

class ContractorRecommendations {
  // Create a new recommendation
  static async create(data) {
    const sql = `
      INSERT INTO contractor_recommendations (
        contractor_id, entity_type, entity_id, entity_name,
        reason, confidence_score, engagement, feedback, outcome
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;
    const values = [
      data.contractor_id,
      data.entity_type,
      data.entity_id || null,
      data.entity_name || null,
      data.reason,
      data.confidence_score || 50,
      data.engagement || 'pending',
      data.feedback || null,
      data.outcome || null
    ];
    const result = await query(sql, values);
    return result.rows[0];
  }

  // Get all recommendations for a contractor
  static async findByContractorId(contractorId) {
    const sql = `
      SELECT * FROM contractor_recommendations
      WHERE contractor_id = $1
      ORDER BY created_at DESC
    `;
    const result = await query(sql, [contractorId]);
    return result.rows;
  }

  // Get recommendations by entity type
  static async findByEntityType(contractorId, entityType) {
    const sql = `
      SELECT * FROM contractor_recommendations
      WHERE contractor_id = $1 AND entity_type = $2
      ORDER BY confidence_score DESC, created_at DESC
    `;
    const result = await query(sql, [contractorId, entityType]);
    return result.rows;
  }

  // Get a single recommendation by ID
  static async findById(id) {
    const sql = 'SELECT * FROM contractor_recommendations WHERE id = $1';
    const result = await query(sql, [id]);
    return result.rows[0];
  }

  // Update recommendation
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

    values.push(id);

    const sql = `
      UPDATE contractor_recommendations
      SET ${fields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;
    const result = await query(sql, values);
    return result.rows[0];
  }

  // Update engagement status
  static async updateEngagement(id, engagement) {
    const sql = `
      UPDATE contractor_recommendations
      SET engagement = $1,
          engaged_at = CASE WHEN $1 != 'pending' THEN CURRENT_TIMESTAMP ELSE engaged_at END
      WHERE id = $2
      RETURNING *
    `;
    const result = await query(sql, [engagement, id]);
    return result.rows[0];
  }

  // Add feedback
  static async addFeedback(id, feedback, outcome) {
    const sql = `
      UPDATE contractor_recommendations
      SET feedback = $1,
          outcome = $2
      WHERE id = $3
      RETURNING *
    `;
    const result = await query(sql, [feedback, outcome || null, id]);
    return result.rows[0];
  }

  // Get pending recommendations
  static async findPending(contractorId) {
    const sql = `
      SELECT * FROM contractor_recommendations
      WHERE contractor_id = $1 AND engagement = 'pending'
      ORDER BY confidence_score DESC, created_at DESC
    `;
    const result = await query(sql, [contractorId]);
    return result.rows;
  }

  // Get engaged recommendations
  static async findEngaged(contractorId) {
    const sql = `
      SELECT * FROM contractor_recommendations
      WHERE contractor_id = $1 AND engagement IN ('viewed', 'clicked', 'completed')
      ORDER BY engaged_at DESC
    `;
    const result = await query(sql, [contractorId]);
    return result.rows;
  }

  // Get high-confidence recommendations
  static async findHighConfidence(contractorId, threshold = 75) {
    const sql = `
      SELECT * FROM contractor_recommendations
      WHERE contractor_id = $1
        AND confidence_score >= $2
        AND engagement = 'pending'
      ORDER BY confidence_score DESC, created_at DESC
    `;
    const result = await query(sql, [contractorId, threshold]);
    return result.rows;
  }

  // Get successful recommendations
  static async findSuccessful(contractorId) {
    const sql = `
      SELECT * FROM contractor_recommendations
      WHERE contractor_id = $1
        AND engagement = 'completed'
        AND outcome IS NOT NULL
      ORDER BY engaged_at DESC
    `;
    const result = await query(sql, [contractorId]);
    return result.rows;
  }

  // Batch create recommendations
  static async createBatch(recommendations) {
    const values = [];
    const placeholders = [];
    let paramCount = 1;

    recommendations.forEach(rec => {
      placeholders.push(`($${paramCount}, $${paramCount+1}, $${paramCount+2}, $${paramCount+3}, $${paramCount+4}, $${paramCount+5}, $${paramCount+6}, $${paramCount+7}, $${paramCount+8})`);
      values.push(
        rec.contractor_id,
        rec.entity_type,
        rec.entity_id || null,
        rec.entity_name || null,
        rec.reason,
        rec.confidence_score || 50,
        rec.engagement || 'pending',
        rec.feedback || null,
        rec.outcome || null
      );
      paramCount += 9;
    });

    const sql = `
      INSERT INTO contractor_recommendations (
        contractor_id, entity_type, entity_id, entity_name,
        reason, confidence_score, engagement, feedback, outcome
      ) VALUES ${placeholders.join(', ')}
      RETURNING *
    `;
    const result = await query(sql, values);
    return result.rows;
  }

  // Get recommendation statistics
  static async getStats(contractorId) {
    const sql = `
      SELECT
        entity_type,
        COUNT(*) as total,
        COUNT(CASE WHEN engagement = 'pending' THEN 1 END) as pending,
        COUNT(CASE WHEN engagement = 'viewed' THEN 1 END) as viewed,
        COUNT(CASE WHEN engagement = 'clicked' THEN 1 END) as clicked,
        COUNT(CASE WHEN engagement = 'completed' THEN 1 END) as completed,
        COUNT(CASE WHEN engagement = 'ignored' THEN 1 END) as ignored,
        AVG(confidence_score) as avg_confidence
      FROM contractor_recommendations
      WHERE contractor_id = $1
      GROUP BY entity_type
    `;
    const result = await query(sql, [contractorId]);
    return result.rows;
  }

  // Delete a recommendation
  static async delete(id) {
    const sql = 'DELETE FROM contractor_recommendations WHERE id = $1 RETURNING *';
    const result = await query(sql, [id]);
    return result.rows[0];
  }

  // Get conversion rate
  static async getConversionRate(contractorId) {
    const sql = `
      SELECT
        COUNT(*) as total_recommendations,
        COUNT(CASE WHEN engagement = 'completed' THEN 1 END) as completed,
        ROUND(
          COUNT(CASE WHEN engagement = 'completed' THEN 1 END)::numeric /
          NULLIF(COUNT(*), 0) * 100, 2
        ) as conversion_rate
      FROM contractor_recommendations
      WHERE contractor_id = $1
    `;
    const result = await query(sql, [contractorId]);
    return result.rows[0];
  }
}

module.exports = ContractorRecommendations;