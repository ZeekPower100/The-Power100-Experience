const { query } = require('../config/database');

class PodcastGuests {
  static async create(data) {
    try {
      const sql = `
        INSERT INTO podcast_guests (
          name, title, company, expertise_areas, episode_appearances,
          total_insights_provided, average_quality_score, linkedin_url, website
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `;
      const values = [
        data.name,
        data.title,
        data.company,
        data.expertise_areas || [],
        data.episode_appearances || 1,
        data.total_insights_provided,
        data.average_quality_score,
        data.linkedin_url,
        data.website
      ];
      const result = await query(sql, values);
      return result.rows[0];
    } catch (error) {
      throw new Error(`Error creating podcast guest: ${error.message}`);
    }
  }

  static async findById(id) {
    try {
      const result = await query('SELECT * FROM podcast_guests WHERE id = $1', [id]);
      return result.rows[0] || null;
    } catch (error) {
      throw new Error(`Error finding podcast guest: ${error.message}`);
    }
  }

  static async findAll(limit = 100) {
    try {
      const result = await query(
        'SELECT * FROM podcast_guests ORDER BY name LIMIT $1',
        [limit]
      );
      return result.rows;
    } catch (error) {
      throw new Error(`Error fetching all podcast guests: ${error.message}`);
    }
  }

  static async findByName(name) {
    try {
      const result = await query(
        'SELECT * FROM podcast_guests WHERE name ILIKE $1',
        [`%${name}%`]
      );
      return result.rows;
    } catch (error) {
      throw new Error(`Error finding guest by name: ${error.message}`);
    }
  }

  static async findByExpertise(expertiseArea) {
    try {
      const result = await query(
        'SELECT * FROM podcast_guests WHERE $1 = ANY(expertise_areas) ORDER BY episode_appearances DESC',
        [expertiseArea]
      );
      return result.rows;
    } catch (error) {
      throw new Error(`Error finding guests by expertise: ${error.message}`);
    }
  }

  static async findByCompany(company) {
    try {
      const result = await query(
        'SELECT * FROM podcast_guests WHERE company ILIKE $1',
        [`%${company}%`]
      );
      return result.rows;
    } catch (error) {
      throw new Error(`Error finding guests by company: ${error.message}`);
    }
  }

  static async update(id, data) {
    try {
      const fields = [];
      const values = [];
      let paramCount = 1;

      // Define allowed fields based on actual database columns
      const allowedFields = [
        'name', 'title', 'company', 'expertise_areas', 'episode_appearances',
        'total_insights_provided', 'average_quality_score', 'linkedin_url', 'website'
      ];

      Object.keys(data).forEach(key => {
        if (data[key] !== undefined && key !== 'id' && allowedFields.includes(key)) {
          fields.push(`${key} = $${paramCount}`);
          values.push(data[key]);
          paramCount++;
        }
      });

      if (fields.length === 0) return null;

      values.push(id);

      const sql = `
        UPDATE podcast_guests
        SET ${fields.join(', ')}
        WHERE id = $${paramCount}
        RETURNING *
      `;
      const result = await query(sql, values);
      return result.rows[0] || null;
    } catch (error) {
      throw new Error(`Error updating podcast guest: ${error.message}`);
    }
  }

  static async delete(id) {
    try {
      const result = await query('DELETE FROM podcast_guests WHERE id = $1 RETURNING *', [id]);
      return result.rows[0] || null;
    } catch (error) {
      throw new Error(`Error deleting podcast guest: ${error.message}`);
    }
  }

  static async getTopGuests(limit = 10) {
    try {
      const result = await query(
        'SELECT * FROM podcast_guests ORDER BY episode_appearances DESC, average_quality_score DESC NULLS LAST LIMIT $1',
        [limit]
      );
      return result.rows;
    } catch (error) {
      throw new Error(`Error fetching top guests: ${error.message}`);
    }
  }

  static async updateAppearanceStats(id) {
    try {
      const sql = `
        UPDATE podcast_guests
        SET episode_appearances = episode_appearances + 1
        WHERE id = $1
        RETURNING *
      `;
      const result = await query(sql, [id]);
      return result.rows[0] || null;
    } catch (error) {
      throw new Error(`Error updating guest appearance stats: ${error.message}`);
    }
  }

  static async getGuestStats() {
    try {
      const result = await query(`
        SELECT
          COUNT(*) as total_guests,
          AVG(episode_appearances) as avg_appearances,
          MAX(episode_appearances) as max_appearances,
          AVG(average_quality_score) as avg_quality_score,
          AVG(total_insights_provided) as avg_insights
        FROM podcast_guests
      `);
      return result.rows[0];
    } catch (error) {
      throw new Error(`Error fetching guest stats: ${error.message}`);
    }
  }

  static async searchGuests(searchTerm, limit = 20) {
    try {
      const result = await query(
        `SELECT * FROM podcast_guests
         WHERE name ILIKE $1
            OR company ILIKE $1
            OR title ILIKE $1
         ORDER BY episode_appearances DESC
         LIMIT $2`,
        [`%${searchTerm}%`, limit]
      );
      return result.rows;
    } catch (error) {
      throw new Error(`Error searching guests: ${error.message}`);
    }
  }
}

module.exports = PodcastGuests;