const { query } = require('../config/database');
const { safeJsonParse, safeJsonStringify } = require('../utils/jsonHelpers');

class ContractorAiProfile {
  static async create(profileData) {
    const sql = `
      INSERT INTO contractor_ai_profiles (
        contractor_id, preferred_channels, communication_frequency,
        best_contact_times, timezone, content_types, session_length,
        learning_depth, business_goals, current_challenges,
        engagement_score, churn_risk, growth_potential, lifecycle_stage,
        next_best_action, last_interaction, total_interactions,
        successful_recommendations, total_recommendations
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
      RETURNING *
    `;

    const values = [
      profileData.contractor_id,
      safeJsonStringify(profileData.preferred_channels || ['email', 'sms']),
      profileData.communication_frequency || 'weekly',
      safeJsonStringify(profileData.best_contact_times || ['morning', 'afternoon']),
      profileData.timezone || 'America/New_York',
      safeJsonStringify(profileData.content_types || ['video', 'text']),
      profileData.session_length || 'short',
      profileData.learning_depth || 'detailed',
      safeJsonStringify(profileData.business_goals || []),
      safeJsonStringify(profileData.current_challenges || []),
      profileData.engagement_score || 50.00,
      profileData.churn_risk || 50.00,
      profileData.growth_potential || 50.00,
      profileData.lifecycle_stage || 'onboarding',
      profileData.next_best_action || null,
      profileData.last_interaction || null,
      profileData.total_interactions || 0,
      profileData.successful_recommendations || 0,
      profileData.total_recommendations || 0
    ];

    const result = await query(sql, values);
    return this.parseProfile(result.rows[0]);
  }

  static async findByContractorId(contractorId) {
    const result = await query(
      'SELECT * FROM contractor_ai_profiles WHERE contractor_id = $1',
      [contractorId]
    );
    return result.rows[0] ? this.parseProfile(result.rows[0]) : null;
  }

  static async findById(id) {
    const result = await query(
      'SELECT * FROM contractor_ai_profiles WHERE id = $1',
      [id]
    );
    return result.rows[0] ? this.parseProfile(result.rows[0]) : null;
  }

  static async update(id, updates) {
    const fields = [];
    const values = [];
    let valueIndex = 1;

    const jsonFields = ['preferred_channels', 'best_contact_times', 'content_types', 'business_goals', 'current_challenges'];

    Object.keys(updates).forEach(key => {
      if (updates[key] !== undefined) {
        fields.push(`${key} = $${valueIndex}`);
        if (jsonFields.includes(key)) {
          values.push(safeJsonStringify(updates[key]));
        } else {
          values.push(updates[key]);
        }
        valueIndex++;
      }
    });

    if (fields.length === 0) {
      throw new Error('No fields to update');
    }

    values.push(id);
    const sql = `
      UPDATE contractor_ai_profiles
      SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${valueIndex}
      RETURNING *
    `;

    const result = await query(sql, values);
    return this.parseProfile(result.rows[0]);
  }

  static async updateMetrics(contractorId, metrics) {
    const sql = `
      UPDATE contractor_ai_profiles
      SET engagement_score = $2,
          churn_risk = $3,
          growth_potential = $4,
          lifecycle_stage = $5,
          next_best_action = $6,
          last_interaction = CURRENT_TIMESTAMP,
          total_interactions = total_interactions + 1,
          updated_at = CURRENT_TIMESTAMP
      WHERE contractor_id = $1
      RETURNING *
    `;

    const values = [
      contractorId,
      metrics.engagement_score,
      metrics.churn_risk,
      metrics.growth_potential,
      metrics.lifecycle_stage,
      metrics.next_best_action
    ];

    const result = await query(sql, values);
    return this.parseProfile(result.rows[0]);
  }

  static async incrementRecommendations(contractorId, wasSuccessful = false) {
    const sql = wasSuccessful
      ? `UPDATE contractor_ai_profiles
         SET total_recommendations = total_recommendations + 1,
             successful_recommendations = successful_recommendations + 1,
             updated_at = CURRENT_TIMESTAMP
         WHERE contractor_id = $1 RETURNING *`
      : `UPDATE contractor_ai_profiles
         SET total_recommendations = total_recommendations + 1,
             updated_at = CURRENT_TIMESTAMP
         WHERE contractor_id = $1 RETURNING *`;

    const result = await query(sql, [contractorId]);
    return this.parseProfile(result.rows[0]);
  }

  static async getAll(limit = 100, offset = 0) {
    const result = await query(
      'SELECT * FROM contractor_ai_profiles ORDER BY created_at DESC LIMIT $1 OFFSET $2',
      [limit, offset]
    );
    return result.rows.map(row => this.parseProfile(row));
  }

  static async getByLifecycleStage(stage) {
    const result = await query(
      'SELECT * FROM contractor_ai_profiles WHERE lifecycle_stage = $1',
      [stage]
    );
    return result.rows.map(row => this.parseProfile(row));
  }

  static async getAtRiskContractors(riskThreshold = 70) {
    const result = await query(
      'SELECT * FROM contractor_ai_profiles WHERE churn_risk >= $1 ORDER BY churn_risk DESC',
      [riskThreshold]
    );
    return result.rows.map(row => this.parseProfile(row));
  }

  static parseProfile(profile) {
    if (!profile) return null;

    return {
      ...profile,
      preferred_channels: safeJsonParse(profile.preferred_channels, ['email', 'sms']),
      best_contact_times: safeJsonParse(profile.best_contact_times, ['morning', 'afternoon']),
      content_types: safeJsonParse(profile.content_types, ['video', 'text']),
      business_goals: safeJsonParse(profile.business_goals, []),
      current_challenges: safeJsonParse(profile.current_challenges, [])
    };
  }
}

module.exports = ContractorAiProfile;