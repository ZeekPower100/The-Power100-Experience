const db = require('../config/database');
const { safeJsonParse } = require('../utils/jsonHelpers');

class RecommendationConfig {
  constructor(data) {
    this.id = data.id;
    this.config_name = data.config_name;
    this.algorithm_version = data.algorithm_version;
    this.weights = data.weights;
    this.min_confidence_score = data.min_confidence_score;
    this.max_recommendations = data.max_recommendations;
    this.is_active = data.is_active;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  static parseConfig(row) {
    if (!row) return null;
    return {
      ...row,
      weights: safeJsonParse(row.weights, {
        relevance: 0.35,
        recency: 0.20,
        popularity: 0.20,
        personalization: 0.25
      })
    };
  }

  static async findByName(config_name) {
    try {
      const result = await db.query(
        'SELECT * FROM recommendation_config WHERE config_name = $1 AND is_active = true',
        [config_name]
      );
      return result.rows[0] ? new RecommendationConfig(this.parseConfig(result.rows[0])) : null;
    } catch (error) {
      console.error('Error finding recommendation config:', error);
      throw error;
    }
  }

  static async findAll() {
    try {
      const result = await db.query(
        'SELECT * FROM recommendation_config ORDER BY config_name'
      );
      return result.rows.map(row => new RecommendationConfig(this.parseConfig(row)));
    } catch (error) {
      console.error('Error finding all recommendation configs:', error);
      throw error;
    }
  }

  static async create(data) {
    try {
      const result = await db.query(
        `INSERT INTO recommendation_config (
          config_name, algorithm_version, weights,
          min_confidence_score, max_recommendations, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *`,
        [
          data.config_name,
          data.algorithm_version || 'v1.0',
          JSON.stringify(data.weights || {
            relevance: 0.35,
            recency: 0.20,
            popularity: 0.20,
            personalization: 0.25
          }),
          data.min_confidence_score || 0.60,
          data.max_recommendations || 10,
          data.is_active !== false
        ]
      );
      return new RecommendationConfig(this.parseConfig(result.rows[0]));
    } catch (error) {
      console.error('Error creating recommendation config:', error);
      throw error;
    }
  }

  static async update(config_name, updates) {
    try {
      const fields = [];
      const values = [];
      let paramCount = 1;

      Object.keys(updates).forEach(key => {
        if (key !== 'id' && key !== 'config_name' && key !== 'created_at') {
          fields.push(`${key} = $${paramCount}`);
          if (key === 'weights') {
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
      values.push(config_name);

      const result = await db.query(
        `UPDATE recommendation_config SET ${fields.join(', ')}
         WHERE config_name = $${paramCount} RETURNING *`,
        values
      );

      return result.rows[0] ? new RecommendationConfig(this.parseConfig(result.rows[0])) : null;
    } catch (error) {
      console.error('Error updating recommendation config:', error);
      throw error;
    }
  }

  static async getActiveConfig(config_name) {
    try {
      const config = await this.findByName(config_name);

      // Return default config if none found
      if (!config) {
        return new RecommendationConfig({
          config_name: config_name,
          algorithm_version: 'v1.0',
          weights: {
            relevance: 0.35,
            recency: 0.20,
            popularity: 0.20,
            personalization: 0.25
          },
          min_confidence_score: 0.60,
          max_recommendations: 10,
          is_active: true
        });
      }

      return config;
    } catch (error) {
      console.error('Error getting active config:', error);
      // Return default config on error
      return new RecommendationConfig({
        config_name: config_name,
        algorithm_version: 'v1.0',
        weights: {
          relevance: 0.35,
          recency: 0.20,
          popularity: 0.20,
          personalization: 0.25
        },
        min_confidence_score: 0.60,
        max_recommendations: 10,
        is_active: true
      });
    }
  }

  static async toggle(config_name, is_active) {
    try {
      const result = await db.query(
        `UPDATE recommendation_config
         SET is_active = $1, updated_at = CURRENT_TIMESTAMP
         WHERE config_name = $2
         RETURNING *`,
        [is_active, config_name]
      );
      return result.rows[0] ? new RecommendationConfig(this.parseConfig(result.rows[0])) : null;
    } catch (error) {
      console.error('Error toggling recommendation config:', error);
      throw error;
    }
  }
}

module.exports = RecommendationConfig;