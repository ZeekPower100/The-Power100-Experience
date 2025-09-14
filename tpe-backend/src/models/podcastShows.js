const { query } = require('../config/database');

class PodcastShows {
  static async create(data) {
    try {
      const sql = `
        INSERT INTO podcast_shows (
          name, host, description, logo_url, website,
          rss_feed_url, category, frequency, average_episode_length,
          total_episodes, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *
      `;
      const values = [
        data.name,
        data.host,
        data.description,
        data.logo_url,
        data.website,
        data.rss_feed_url,
        data.category,
        data.frequency,
        data.average_episode_length,
        data.total_episodes || 0,
        data.is_active !== undefined ? data.is_active : true
      ];
      const result = await query(sql, values);
      return result.rows[0];
    } catch (error) {
      throw new Error(`Error creating podcast show: ${error.message}`);
    }
  }

  static async findById(id) {
    try {
      const sql = 'SELECT * FROM podcast_shows WHERE id = $1';
      const result = await query(sql, [id]);
      return result.rows[0];
    } catch (error) {
      throw new Error(`Error finding podcast show: ${error.message}`);
    }
  }

  static async findAll() {
    try {
      const sql = 'SELECT * FROM podcast_shows ORDER BY created_at DESC';
      const result = await query(sql);
      return result.rows;
    } catch (error) {
      throw new Error(`Error fetching podcast shows: ${error.message}`);
    }
  }

  static async findByCategory(category) {
    try {
      const sql = 'SELECT * FROM podcast_shows WHERE category = $1 ORDER BY created_at DESC';
      const result = await query(sql, [category]);
      return result.rows;
    } catch (error) {
      throw new Error(`Error fetching podcast shows by category: ${error.message}`);
    }
  }

  static async update(id, data) {
    try {
      const fields = [];
      const values = [];
      let paramCount = 1;

      const allowedFields = [
        'name', 'host', 'description', 'logo_url', 'website',
        'rss_feed_url', 'category', 'frequency', 'average_episode_length',
        'total_episodes', 'is_active'
      ];

      for (const field of allowedFields) {
        if (data[field] !== undefined) {
          fields.push(`${field} = $${paramCount}`);
          values.push(data[field]);
          paramCount++;
        }
      }

      if (fields.length === 0) {
        throw new Error('No valid fields to update');
      }

      fields.push(`updated_at = CURRENT_TIMESTAMP`);
      values.push(id);

      const sql = `
        UPDATE podcast_shows
        SET ${fields.join(', ')}
        WHERE id = $${paramCount}
        RETURNING *
      `;

      const result = await query(sql, values);
      return result.rows[0];
    } catch (error) {
      throw new Error(`Error updating podcast show: ${error.message}`);
    }
  }

  static async delete(id) {
    try {
      const sql = 'DELETE FROM podcast_shows WHERE id = $1 RETURNING *';
      const result = await query(sql, [id]);
      return result.rows[0];
    } catch (error) {
      throw new Error(`Error deleting podcast show: ${error.message}`);
    }
  }

  static async getActive() {
    try {
      const sql = 'SELECT * FROM podcast_shows WHERE is_active = true ORDER BY name';
      const result = await query(sql);
      return result.rows;
    } catch (error) {
      throw new Error(`Error fetching active podcast shows: ${error.message}`);
    }
  }

  static async toggleActive(id) {
    try {
      const sql = `
        UPDATE podcast_shows
        SET is_active = NOT is_active, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING *
      `;
      const result = await query(sql, [id]);
      return result.rows[0];
    } catch (error) {
      throw new Error(`Error toggling podcast show status: ${error.message}`);
    }
  }
}

module.exports = PodcastShows;