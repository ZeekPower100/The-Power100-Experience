const { query } = require('../config/database');

class EpisodeHighlights {
  static async create(data) {
    try {
      const sql = `
        INSERT INTO episode_highlights (
          episode_id, highlight_type, timestamp_start, timestamp_end,
          speaker, content, context, importance_score
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `;
      const values = [
        data.episode_id,
        data.highlight_type,
        data.timestamp_start,
        data.timestamp_end,
        data.speaker,
        data.content,
        data.context,
        data.importance_score
      ];
      const result = await query(sql, values);
      return result.rows[0];
    } catch (error) {
      throw new Error(`Error creating episode highlight: ${error.message}`);
    }
  }

  static async findById(id) {
    try {
      const result = await query('SELECT * FROM episode_highlights WHERE id = $1', [id]);
      return result.rows[0] || null;
    } catch (error) {
      throw new Error(`Error finding episode highlight: ${error.message}`);
    }
  }

  static async getByEpisodeId(episodeId, limit = 50) {
    try {
      const result = await query(
        `SELECT * FROM episode_highlights
         WHERE episode_id = $1
         ORDER BY timestamp_start ASC
         LIMIT $2`,
        [episodeId, limit]
      );
      return result.rows;
    } catch (error) {
      throw new Error(`Error fetching highlights by episode: ${error.message}`);
    }
  }

  static async findByType(episodeId, highlightType) {
    try {
      const result = await query(
        `SELECT * FROM episode_highlights
         WHERE episode_id = $1 AND highlight_type = $2
         ORDER BY importance_score DESC, timestamp_start ASC`,
        [episodeId, highlightType]
      );
      return result.rows;
    } catch (error) {
      throw new Error(`Error finding highlights by type: ${error.message}`);
    }
  }

  static async getTopHighlights(episodeId, minScore = 7, limit = 10) {
    try {
      const result = await query(
        `SELECT * FROM episode_highlights
         WHERE episode_id = $1 AND importance_score >= $2
         ORDER BY importance_score DESC
         LIMIT $3`,
        [episodeId, minScore, limit]
      );
      return result.rows;
    } catch (error) {
      throw new Error(`Error fetching top highlights: ${error.message}`);
    }
  }

  static async update(id, data) {
    try {
      const fields = [];
      const values = [];
      let paramCount = 1;

      // Define allowed fields based on actual database columns
      const allowedFields = [
        'episode_id', 'highlight_type', 'timestamp_start', 'timestamp_end',
        'speaker', 'content', 'context', 'importance_score'
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
        UPDATE episode_highlights
        SET ${fields.join(', ')}
        WHERE id = $${paramCount}
        RETURNING *
      `;
      const result = await query(sql, values);
      return result.rows[0] || null;
    } catch (error) {
      throw new Error(`Error updating episode highlight: ${error.message}`);
    }
  }

  static async delete(id) {
    try {
      const result = await query('DELETE FROM episode_highlights WHERE id = $1 RETURNING *', [id]);
      return result.rows[0] || null;
    } catch (error) {
      throw new Error(`Error deleting episode highlight: ${error.message}`);
    }
  }


  static async getHighlightTimeRange(episodeId, startSeconds, endSeconds) {
    try {
      const result = await query(
        `SELECT * FROM episode_highlights
         WHERE episode_id = $1
           AND timestamp_start >= $2
           AND timestamp_end <= $3
         ORDER BY timestamp_start ASC`,
        [episodeId, startSeconds, endSeconds]
      );
      return result.rows;
    } catch (error) {
      throw new Error(`Error fetching highlights by time range: ${error.message}`);
    }
  }

  static async searchHighlights(searchTerm, limit = 20) {
    try {
      const result = await query(
        `SELECT * FROM episode_highlights
         WHERE (content ILIKE $1 OR context ILIKE $1)
         ORDER BY importance_score DESC
         LIMIT $2`,
        [`%${searchTerm}%`, limit]
      );
      return result.rows;
    } catch (error) {
      throw new Error(`Error searching highlights: ${error.message}`);
    }
  }
}

module.exports = EpisodeHighlights;