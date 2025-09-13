const { query } = require('../config/database');
const { safeJsonParse, safeJsonStringify } = require('../utils/jsonHelpers');

class AiSuccessStory {
  static async create(storyData) {
    const sql = `
      INSERT INTO ai_success_stories (
        contractor_id, story_type, title, description,
        metrics_before, metrics_after, timeframe, roi_percentage,
        related_partners, related_books, related_podcasts,
        related_events, verified, verification_method,
        testimonial_video_url
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *
    `;

    const values = [
      storyData.contractor_id,
      storyData.story_type,
      storyData.title,
      storyData.description,
      safeJsonStringify(storyData.metrics_before || null),
      safeJsonStringify(storyData.metrics_after || null),
      storyData.timeframe,
      storyData.roi_percentage,
      safeJsonStringify(storyData.related_partners || []),
      safeJsonStringify(storyData.related_books || []),
      safeJsonStringify(storyData.related_podcasts || []),
      safeJsonStringify(storyData.related_events || []),
      storyData.verified || false,
      storyData.verification_method || null,
      storyData.testimonial_video_url || null
    ];

    const result = await query(sql, values);
    return this.parseStory(result.rows[0]);
  }

  static async findById(id) {
    const result = await query(
      'SELECT * FROM ai_success_stories WHERE id = $1',
      [id]
    );
    return result.rows[0] ? this.parseStory(result.rows[0]) : null;
  }

  static async findByContractor(contractorId) {
    const result = await query(
      `SELECT * FROM ai_success_stories
       WHERE contractor_id = $1
       ORDER BY created_at DESC`,
      [contractorId]
    );
    return result.rows.map(row => this.parseStory(row));
  }

  static async findByType(storyType) {
    const result = await query(
      `SELECT * FROM ai_success_stories
       WHERE story_type = $1
       ORDER BY roi_percentage DESC NULLS LAST, created_at DESC`,
      [storyType]
    );
    return result.rows.map(row => this.parseStory(row));
  }

  static async update(id, updates) {
    const fields = [];
    const values = [];
    let valueIndex = 1;

    const jsonFields = ['metrics_before', 'metrics_after', 'related_partners',
                        'related_books', 'related_podcasts', 'related_events'];

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
      UPDATE ai_success_stories
      SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${valueIndex}
      RETURNING *
    `;

    const result = await query(sql, values);
    return this.parseStory(result.rows[0]);
  }

  static async verify(id, verificationMethod) {
    const sql = `
      UPDATE ai_success_stories
      SET verified = true,
          verification_method = $2,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;

    const result = await query(sql, [id, verificationMethod]);
    return this.parseStory(result.rows[0]);
  }

  static async getVerifiedStories(limit = 20) {
    const result = await query(
      `SELECT * FROM ai_success_stories
       WHERE verified = true
       ORDER BY roi_percentage DESC NULLS LAST, created_at DESC
       LIMIT $1`,
      [limit]
    );
    return result.rows.map(row => this.parseStory(row));
  }

  static async getTopROIStories(minROI = 100, limit = 10) {
    const result = await query(
      `SELECT * FROM ai_success_stories
       WHERE roi_percentage >= $1
       ORDER BY roi_percentage DESC
       LIMIT $2`,
      [minROI, limit]
    );
    return result.rows.map(row => this.parseStory(row));
  }

  static async getStoriesByTimeframe(timeframe, limit = 20) {
    const result = await query(
      `SELECT * FROM ai_success_stories
       WHERE timeframe = $1
       ORDER BY roi_percentage DESC NULLS LAST, created_at DESC
       LIMIT $2`,
      [timeframe, limit]
    );
    return result.rows.map(row => this.parseStory(row));
  }

  static async getRelatedToPartner(partnerId) {
    const sql = `
      SELECT * FROM ai_success_stories
      WHERE $1::text = ANY(
        SELECT jsonb_array_elements_text(related_partners)
      )
      ORDER BY roi_percentage DESC NULLS LAST, created_at DESC
    `;

    const result = await query(sql, [partnerId.toString()]);
    return result.rows.map(row => this.parseStory(row));
  }

  static async getRelatedToBook(bookId) {
    const sql = `
      SELECT * FROM ai_success_stories
      WHERE $1::text = ANY(
        SELECT jsonb_array_elements_text(related_books)
      )
      ORDER BY roi_percentage DESC NULLS LAST, created_at DESC
    `;

    const result = await query(sql, [bookId.toString()]);
    return result.rows.map(row => this.parseStory(row));
  }

  static async getRelatedToPodcast(podcastId) {
    const sql = `
      SELECT * FROM ai_success_stories
      WHERE $1::text = ANY(
        SELECT jsonb_array_elements_text(related_podcasts)
      )
      ORDER BY roi_percentage DESC NULLS LAST, created_at DESC
    `;

    const result = await query(sql, [podcastId.toString()]);
    return result.rows.map(row => this.parseStory(row));
  }

  static async getRelatedToEvent(eventId) {
    const sql = `
      SELECT * FROM ai_success_stories
      WHERE $1::text = ANY(
        SELECT jsonb_array_elements_text(related_events)
      )
      ORDER BY roi_percentage DESC NULLS LAST, created_at DESC
    `;

    const result = await query(sql, [eventId.toString()]);
    return result.rows.map(row => this.parseStory(row));
  }

  static async getStoriesWithVideo(limit = 20) {
    const result = await query(
      `SELECT * FROM ai_success_stories
       WHERE testimonial_video_url IS NOT NULL
       ORDER BY roi_percentage DESC NULLS LAST, created_at DESC
       LIMIT $1`,
      [limit]
    );
    return result.rows.map(row => this.parseStory(row));
  }

  static async getStoryStats() {
    const sql = `
      SELECT
        story_type,
        COUNT(*) as total_count,
        SUM(CASE WHEN verified = true THEN 1 ELSE 0 END) as verified_count,
        AVG(roi_percentage) as avg_roi,
        MAX(roi_percentage) as max_roi,
        MIN(roi_percentage) as min_roi,
        SUM(CASE WHEN testimonial_video_url IS NOT NULL THEN 1 ELSE 0 END) as with_video
      FROM ai_success_stories
      GROUP BY story_type
    `;

    const result = await query(sql);
    return result.rows;
  }

  static parseStory(story) {
    if (!story) return null;

    return {
      ...story,
      metrics_before: safeJsonParse(story.metrics_before, null),
      metrics_after: safeJsonParse(story.metrics_after, null),
      related_partners: safeJsonParse(story.related_partners, []),
      related_books: safeJsonParse(story.related_books, []),
      related_podcasts: safeJsonParse(story.related_podcasts, []),
      related_events: safeJsonParse(story.related_events, [])
    };
  }
}

module.exports = AiSuccessStory;