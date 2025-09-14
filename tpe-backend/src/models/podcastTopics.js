const { query } = require('../config/database');

class PodcastTopics {
  static async create(data) {
    try {
      const sql = `
        INSERT INTO podcast_topics (
          topic_name, topic_category, description, episode_count,
          total_duration_minutes, average_depth_score, trending_score
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `;
      const values = [
        data.topic_name,
        data.topic_category,
        data.description,
        data.episode_count || 0,
        data.total_duration_minutes || 0,
        data.average_depth_score,
        data.trending_score
      ];
      const result = await query(sql, values);
      return result.rows[0];
    } catch (error) {
      throw new Error(`Error creating podcast topic: ${error.message}`);
    }
  }

  static async findById(id) {
    try {
      const result = await query('SELECT * FROM podcast_topics WHERE id = $1', [id]);
      return result.rows[0] || null;
    } catch (error) {
      throw new Error(`Error finding podcast topic: ${error.message}`);
    }
  }

  static async findAll() {
    try {
      const result = await query(
        'SELECT * FROM podcast_topics ORDER BY topic_name'
      );
      return result.rows;
    } catch (error) {
      throw new Error(`Error fetching all podcast topics: ${error.message}`);
    }
  }

  static async findByCategory(category) {
    try {
      const result = await query(
        'SELECT * FROM podcast_topics WHERE topic_category = $1 ORDER BY topic_name',
        [category]
      );
      return result.rows;
    } catch (error) {
      throw new Error(`Error finding topics by category: ${error.message}`);
    }
  }

  static async findByName(topicName) {
    try {
      const result = await query('SELECT * FROM podcast_topics WHERE topic_name = $1', [topicName]);
      return result.rows[0] || null;
    } catch (error) {
      throw new Error(`Error finding topic by name: ${error.message}`);
    }
  }

  static async update(id, data) {
    try {
      const fields = [];
      const values = [];
      let paramCount = 1;

      // Define allowed fields based on actual database columns
      const allowedFields = [
        'topic_name', 'topic_category', 'description', 'episode_count',
        'total_duration_minutes', 'average_depth_score', 'trending_score'
      ];

      Object.keys(data).forEach(key => {
        if (data[key] !== undefined && key !== 'id' && allowedFields.includes(key)) {
          fields.push(`${key} = $${paramCount}`);
          values.push(data[key]);
          paramCount++;
        }
      });

      if (fields.length === 0) return null;

      fields.push(`updated_at = CURRENT_TIMESTAMP`);
      values.push(id);

      const sql = `
        UPDATE podcast_topics
        SET ${fields.join(', ')}
        WHERE id = $${paramCount}
        RETURNING *
      `;
      const result = await query(sql, values);
      return result.rows[0] || null;
    } catch (error) {
      throw new Error(`Error updating podcast topic: ${error.message}`);
    }
  }

  static async delete(id) {
    try {
      const result = await query('DELETE FROM podcast_topics WHERE id = $1 RETURNING *', [id]);
      return result.rows[0] || null;
    } catch (error) {
      throw new Error(`Error deleting podcast topic: ${error.message}`);
    }
  }

  static async getTopicsByTrending(limit = 10) {
    try {
      const result = await query(
        'SELECT * FROM podcast_topics ORDER BY trending_score DESC NULLS LAST LIMIT $1',
        [limit]
      );
      return result.rows;
    } catch (error) {
      throw new Error(`Error fetching trending topics: ${error.message}`);
    }
  }

  static async getTopicsByEpisodeCount(limit = 10) {
    try {
      const result = await query(
        'SELECT * FROM podcast_topics ORDER BY episode_count DESC LIMIT $1',
        [limit]
      );
      return result.rows;
    } catch (error) {
      throw new Error(`Error fetching topics by episode count: ${error.message}`);
    }
  }
}

module.exports = PodcastTopics;