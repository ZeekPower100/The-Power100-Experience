const { query } = require('../config/database');
const { safeJsonParse, safeJsonStringify } = require('../utils/jsonHelpers');

class EpisodeTopics {
  static async create(data) {
    try {
      const sql = `
        INSERT INTO episode_topics (
          episode_id, topic_id, duration_seconds, depth_score,
          timestamps, key_points
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `;
      const values = [
        data.episode_id,
        data.topic_id,
        data.duration_seconds,
        data.depth_score,
        safeJsonStringify(data.timestamps || {}),
        safeJsonStringify(data.key_points || [])
      ];
      const result = await query(sql, values);
      return this.parseEpisodeTopic(result.rows[0]);
    } catch (error) {
      throw new Error(`Error creating episode topic: ${error.message}`);
    }
  }

  static async findById(id) {
    try {
      const result = await query('SELECT * FROM episode_topics WHERE id = $1', [id]);
      return result.rows[0] ? this.parseEpisodeTopic(result.rows[0]) : null;
    } catch (error) {
      throw new Error(`Error finding episode topic: ${error.message}`);
    }
  }

  static async getByEpisodeId(episodeId) {
    try {
      const result = await query(
        `SELECT et.*, pt.topic_name, pt.topic_category, pt.description
         FROM episode_topics et
         JOIN podcast_topics pt ON et.topic_id = pt.id
         WHERE et.episode_id = $1
         ORDER BY et.depth_score DESC`,
        [episodeId]
      );
      return result.rows.map(row => this.parseEpisodeTopic(row));
    } catch (error) {
      throw new Error(`Error fetching topics by episode: ${error.message}`);
    }
  }

  static async getByTopicId(topicId) {
    try {
      const result = await query(
        `SELECT et.*, pe.title as episode_title, pe.episode_number,
                ps.title as show_title
         FROM episode_topics et
         JOIN podcast_episodes pe ON et.episode_id = pe.id
         JOIN podcast_shows ps ON pe.show_id = ps.id
         WHERE et.topic_id = $1
         ORDER BY et.depth_score DESC`,
        [topicId]
      );
      return result.rows.map(row => this.parseEpisodeTopic(row));
    } catch (error) {
      throw new Error(`Error fetching episodes by topic: ${error.message}`);
    }
  }

  static async findByDepthScore(minScore = 0.7) {
    try {
      const result = await query(
        `SELECT et.*, pt.topic_name, pe.title as episode_title
         FROM episode_topics et
         JOIN podcast_topics pt ON et.topic_id = pt.id
         JOIN podcast_episodes pe ON et.episode_id = pe.id
         WHERE et.depth_score >= $1
         ORDER BY et.depth_score DESC`,
        [minScore]
      );
      return result.rows.map(row => this.parseEpisodeTopic(row));
    } catch (error) {
      throw new Error(`Error finding topics by depth score: ${error.message}`);
    }
  }

  static async update(id, data) {
    try {
      const fields = [];
      const values = [];
      let paramCount = 1;

      // Define allowed fields based on actual database columns
      const allowedFields = [
        'episode_id', 'topic_id', 'duration_seconds', 'depth_score',
        'timestamps', 'key_points'
      ];

      Object.keys(data).forEach(key => {
        if (data[key] !== undefined && key !== 'id' && allowedFields.includes(key)) {
          if (['timestamps', 'key_points'].includes(key)) {
            fields.push(`${key} = $${paramCount}`);
            values.push(safeJsonStringify(data[key]));
          } else {
            fields.push(`${key} = $${paramCount}`);
            values.push(data[key]);
          }
          paramCount++;
        }
      });

      if (fields.length === 0) return null;

      values.push(id);

      const sql = `
        UPDATE episode_topics
        SET ${fields.join(', ')}
        WHERE id = $${paramCount}
        RETURNING *
      `;
      const result = await query(sql, values);
      return result.rows[0] ? this.parseEpisodeTopic(result.rows[0]) : null;
    } catch (error) {
      throw new Error(`Error updating episode topic: ${error.message}`);
    }
  }

  static async delete(id) {
    try {
      const result = await query('DELETE FROM episode_topics WHERE id = $1 RETURNING *', [id]);
      return result.rows[0] ? this.parseEpisodeTopic(result.rows[0]) : null;
    } catch (error) {
      throw new Error(`Error deleting episode topic: ${error.message}`);
    }
  }

  static async getEpisodeTopicStats(episodeId) {
    try {
      const result = await query(`
        SELECT
          COUNT(*) as total_topics,
          AVG(depth_score) as avg_depth_score,
          SUM(duration_seconds) as total_duration
        FROM episode_topics
        WHERE episode_id = $1
      `, [episodeId]);
      return result.rows[0];
    } catch (error) {
      throw new Error(`Error fetching episode topic stats: ${error.message}`);
    }
  }

  static parseEpisodeTopic(episodeTopic) {
    if (!episodeTopic) return null;
    return {
      ...episodeTopic,
      timestamps: safeJsonParse(episodeTopic.timestamps, {}),
      key_points: safeJsonParse(episodeTopic.key_points, [])
    };
  }
}

module.exports = EpisodeTopics;