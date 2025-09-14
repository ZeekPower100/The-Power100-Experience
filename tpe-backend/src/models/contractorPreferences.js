const db = require('../config/database');
const { safeJsonParse } = require('../utils/jsonHelpers');

class ContractorPreferences {
  constructor(data) {
    this.id = data.id;
    this.contractor_id = data.contractor_id;
    this.content_preferences = data.content_preferences;
    this.topic_preferences = data.topic_preferences;
    this.communication_preferences = data.communication_preferences;
    this.best_engagement_time = data.best_engagement_time;
    this.preferred_content_length = data.preferred_content_length;
    this.learning_style = data.learning_style;
    this.notification_frequency = data.notification_frequency;
    this.timezone = data.timezone;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  static parsePreferences(row) {
    if (!row) return null;
    return {
      ...row,
      content_preferences: safeJsonParse(row.content_preferences, { video: 0.5, audio: 0.5, text: 0.5 }),
      topic_preferences: safeJsonParse(row.topic_preferences, null),
      communication_preferences: safeJsonParse(row.communication_preferences, { email: true, sms: false, in_app: true })
    };
  }

  static async findByContractorId(contractor_id) {
    try {
      const result = await db.query(
        'SELECT * FROM contractor_preferences WHERE contractor_id = $1',
        [contractor_id]
      );
      return result.rows[0] ? new ContractorPreferences(this.parsePreferences(result.rows[0])) : null;
    } catch (error) {
      console.error('Error finding contractor preferences:', error);
      throw error;
    }
  }

  static async create(data) {
    try {
      const result = await db.query(
        `INSERT INTO contractor_preferences (
          contractor_id, content_preferences, topic_preferences,
          communication_preferences, best_engagement_time, preferred_content_length,
          learning_style, notification_frequency, timezone
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *`,
        [
          data.contractor_id,
          JSON.stringify(data.content_preferences || { video: 0.5, audio: 0.5, text: 0.5 }),
          JSON.stringify(data.topic_preferences || null),
          JSON.stringify(data.communication_preferences || { email: true, sms: false, in_app: true }),
          data.best_engagement_time || 'morning',
          data.preferred_content_length || 'medium',
          data.learning_style || 'mixed',
          data.notification_frequency || 'weekly',
          data.timezone || 'America/New_York'
        ]
      );
      return new ContractorPreferences(this.parsePreferences(result.rows[0]));
    } catch (error) {
      console.error('Error creating contractor preferences:', error);
      throw error;
    }
  }

  static async update(contractor_id, updates) {
    try {
      const fields = [];
      const values = [];
      let paramCount = 1;

      Object.keys(updates).forEach(key => {
        if (key !== 'id' && key !== 'contractor_id' && key !== 'created_at') {
          fields.push(`${key} = $${paramCount}`);
          if (['content_preferences', 'topic_preferences', 'communication_preferences'].includes(key)) {
            values.push(JSON.stringify(updates[key]));
          } else {
            values.push(updates[key]);
          }
          paramCount++;
        }
      });

      if (fields.length === 0) {
        throw new Error('No valid fields to update');
      }

      fields.push(`updated_at = CURRENT_TIMESTAMP`);
      values.push(contractor_id);

      const result = await db.query(
        `UPDATE contractor_preferences SET ${fields.join(', ')}
         WHERE contractor_id = $${paramCount} RETURNING *`,
        values
      );

      return result.rows[0] ? new ContractorPreferences(this.parsePreferences(result.rows[0])) : null;
    } catch (error) {
      console.error('Error updating contractor preferences:', error);
      throw error;
    }
  }

  static async upsert(data) {
    try {
      const existing = await this.findByContractorId(data.contractor_id);
      if (existing) {
        return await this.update(data.contractor_id, data);
      } else {
        return await this.create(data);
      }
    } catch (error) {
      console.error('Error upserting contractor preferences:', error);
      throw error;
    }
  }
}

module.exports = ContractorPreferences;