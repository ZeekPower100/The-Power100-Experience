const db = require('../config/database');

class TrendingContent {
  constructor(data) {
    this.id = data.id;
    this.entity_type = data.entity_type;
    this.entity_id = data.entity_id;
    this.time_window = data.time_window;
    this.engagement_count = data.engagement_count;
    this.unique_viewers = data.unique_viewers;
    this.average_rating = data.average_rating;
    this.trending_score = data.trending_score;
    this.period_start = data.period_start;
    this.period_end = data.period_end;
    this.created_at = data.created_at;
  }

  static async findTrending(entity_type, time_window = 'weekly', limit = 10) {
    try {
      const result = await db.query(
        `SELECT * FROM trending_content
         WHERE entity_type = $1 AND time_window = $2
         AND period_end >= CURRENT_DATE
         ORDER BY trending_score DESC
         LIMIT $3`,
        [entity_type, time_window, limit]
      );
      return result.rows.map(row => new TrendingContent(row));
    } catch (error) {
      console.error('Error finding trending content:', error);
      throw error;
    }
  }

  static async findAllTrending(time_window = 'weekly', limit = 20) {
    try {
      const result = await db.query(
        `SELECT * FROM trending_content
         WHERE time_window = $1
         AND period_end >= CURRENT_DATE
         ORDER BY trending_score DESC
         LIMIT $2`,
        [time_window, limit]
      );
      return result.rows.map(row => new TrendingContent(row));
    } catch (error) {
      console.error('Error finding all trending content:', error);
      throw error;
    }
  }

  static async create(data) {
    try {
      const result = await db.query(
        `INSERT INTO trending_content (
          entity_type, entity_id, time_window,
          engagement_count, unique_viewers, average_rating,
          trending_score, period_start, period_end
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (entity_type, entity_id, time_window, period_start)
        DO UPDATE SET
          engagement_count = EXCLUDED.engagement_count,
          unique_viewers = EXCLUDED.unique_viewers,
          average_rating = EXCLUDED.average_rating,
          trending_score = EXCLUDED.trending_score,
          period_end = EXCLUDED.period_end
        RETURNING *`,
        [
          data.entity_type,
          data.entity_id,
          data.time_window || 'weekly',
          data.engagement_count || 0,
          data.unique_viewers || 0,
          data.average_rating,
          data.trending_score,
          data.period_start,
          data.period_end
        ]
      );
      return new TrendingContent(result.rows[0]);
    } catch (error) {
      console.error('Error creating trending content:', error);
      throw error;
    }
  }

  static async calculateTrendingScore(entity_type, entity_id, time_window = 'weekly') {
    try {
      // Calculate engagement metrics for the time period
      const period_start = this.getPeriodStart(time_window);
      const period_end = this.getPeriodEnd(time_window);

      const result = await db.query(
        `SELECT
          COUNT(DISTINCT contractor_id) as unique_viewers,
          COUNT(*) as engagement_count,
          AVG(CASE WHEN rating IS NOT NULL THEN rating ELSE NULL END) as average_rating,
          COUNT(CASE WHEN action = 'completed' THEN 1 END) as completions,
          COUNT(CASE WHEN action = 'shared' THEN 1 END) as shares
         FROM contractor_content_engagement
         WHERE content_type = $1 AND content_id = $2
         AND created_at >= $3 AND created_at <= $4`,
        [entity_type, entity_id, period_start, period_end]
      );

      const metrics = result.rows[0];

      // Calculate trending score (weighted formula)
      // Can be customized based on business needs
      const trending_score = (
        (metrics.unique_viewers * 1.0) +
        (metrics.engagement_count * 0.5) +
        (metrics.completions * 2.0) +
        (metrics.shares * 3.0) +
        ((metrics.average_rating || 0) * metrics.unique_viewers * 0.5)
      ).toFixed(2);

      return {
        entity_type,
        entity_id,
        time_window,
        engagement_count: metrics.engagement_count,
        unique_viewers: metrics.unique_viewers,
        average_rating: metrics.average_rating,
        trending_score,
        period_start,
        period_end
      };
    } catch (error) {
      console.error('Error calculating trending score:', error);
      throw error;
    }
  }

  static getPeriodStart(time_window) {
    const now = new Date();
    switch (time_window) {
      case 'daily':
        now.setHours(0, 0, 0, 0);
        return now;
      case 'weekly':
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay());
        weekStart.setHours(0, 0, 0, 0);
        return weekStart;
      case 'monthly':
        return new Date(now.getFullYear(), now.getMonth(), 1);
      default:
        const defaultStart = new Date(now);
        defaultStart.setDate(now.getDate() - 7);
        return defaultStart;
    }
  }

  static getPeriodEnd(time_window) {
    const now = new Date();
    switch (time_window) {
      case 'daily':
        now.setHours(23, 59, 59, 999);
        return now;
      case 'weekly':
        const weekEnd = new Date(now);
        weekEnd.setDate(now.getDate() + (6 - now.getDay()));
        weekEnd.setHours(23, 59, 59, 999);
        return weekEnd;
      case 'monthly':
        return new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      default:
        return now;
    }
  }

  static async updateAllTrending(time_window = 'weekly') {
    try {
      // Get all unique content items with recent engagement
      const result = await db.query(
        `SELECT DISTINCT content_type as entity_type, content_id as entity_id
         FROM contractor_content_engagement
         WHERE created_at >= NOW() - INTERVAL '30 days'`
      );

      const updates = [];
      for (const item of result.rows) {
        const trendingData = await this.calculateTrendingScore(
          item.entity_type,
          item.entity_id,
          time_window
        );
        updates.push(await this.create(trendingData));
      }

      return updates;
    } catch (error) {
      console.error('Error updating all trending content:', error);
      throw error;
    }
  }

  static async cleanOldPeriods(days = 30) {
    try {
      const result = await db.query(
        `DELETE FROM trending_content
         WHERE period_end < NOW() - INTERVAL '${days} days'
         RETURNING id`
      );
      return result.rowCount;
    } catch (error) {
      console.error('Error cleaning old trending periods:', error);
      throw error;
    }
  }
}

module.exports = TrendingContent;