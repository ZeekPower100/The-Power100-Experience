const { query } = require('../config/database');
const { safeJsonParse, safeJsonStringify } = require('../utils/jsonHelpers');

class PodcastEpisodes {
  static async create(data) {
    try {
      const sql = `
        INSERT INTO podcast_episodes (
          show_id, episode_number, title, description, audio_url,
          duration_seconds, publish_date, guest_names, transcript_status, file_size_mb
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
      `;
      const values = [
        data.show_id,
        data.episode_number,
        data.title,
        data.description,
        data.audio_url,
        data.duration_seconds,
        data.publish_date,
        data.guest_names || [],
        data.transcript_status || 'pending',
        data.file_size_mb
      ];
      const result = await query(sql, values);
      return result.rows[0];
    } catch (error) {
      throw new Error(`Error creating podcast episode: ${error.message}`);
    }
  }

  static async findById(id) {
    try {
      const result = await query('SELECT * FROM podcast_episodes WHERE id = $1', [id]);
      return result.rows[0] || null;
    } catch (error) {
      throw new Error(`Error finding podcast episode: ${error.message}`);
    }
  }

  static async getByShowId(showId, limit = 100) {
    try {
      const result = await query(
        `SELECT * FROM podcast_episodes
         WHERE show_id = $1
         ORDER BY episode_number DESC
         LIMIT $2`,
        [showId, limit]
      );
      return result.rows;
    } catch (error) {
      throw new Error(`Error fetching episodes by show: ${error.message}`);
    }
  }

  static async findByEpisodeNumber(showId, episodeNumber) {
    try {
      const result = await query(
        'SELECT * FROM podcast_episodes WHERE show_id = $1 AND episode_number = $2',
        [showId, episodeNumber]
      );
      return result.rows[0] || null;
    } catch (error) {
      throw new Error(`Error finding episode by number: ${error.message}`);
    }
  }

  static async findByGuest(guestName) {
    try {
      const result = await query(
        'SELECT * FROM podcast_episodes WHERE $1 = ANY(guest_names) ORDER BY publish_date DESC',
        [guestName]
      );
      return result.rows;
    } catch (error) {
      throw new Error(`Error finding episodes by guest: ${error.message}`);
    }
  }

  static async update(id, data) {
    try {
      const fields = [];
      const values = [];
      let paramCount = 1;

      Object.keys(data).forEach(key => {
        if (data[key] !== undefined && key !== 'id') {
          fields.push(`${key} = $${paramCount}`);
          values.push(data[key]);
          paramCount++;
        }
      });

      if (fields.length === 0) return null;

      values.push(id);

      const sql = `
        UPDATE podcast_episodes
        SET ${fields.join(', ')}
        WHERE id = $${paramCount}
        RETURNING *
      `;
      const result = await query(sql, values);
      return result.rows[0] || null;
    } catch (error) {
      throw new Error(`Error updating podcast episode: ${error.message}`);
    }
  }

  static async delete(id) {
    try {
      const result = await query('DELETE FROM podcast_episodes WHERE id = $1 RETURNING *', [id]);
      return result.rows[0] || null;
    } catch (error) {
      throw new Error(`Error deleting podcast episode: ${error.message}`);
    }
  }

  static async getRecentEpisodes(limit = 20) {
    try {
      const result = await query(
        `SELECT pe.*, ps.name as show_title
         FROM podcast_episodes pe
         LEFT JOIN podcast_shows ps ON pe.show_id = ps.id
         ORDER BY pe.publish_date DESC
         LIMIT $1`,
        [limit]
      );
      return result.rows;
    } catch (error) {
      throw new Error(`Error fetching recent episodes: ${error.message}`);
    }
  }

  // Alias methods for controller compatibility
  static async findRecent(limit = 20) {
    return this.getRecentEpisodes(limit);
  }

  static async findByShowId(showId) {
    return this.getByShowId(showId);
  }
}

module.exports = PodcastEpisodes;