const { query } = require('../config/database');
const { safeJsonParse, safeJsonStringify } = require('../utils/jsonHelpers');

class ChapterAnalysis {
  static async create(data) {
    try {
      const sql = `
        INSERT INTO chapter_analysis (
          book_id, extracted_content_id, chapter_number, chapter_title,
          chapter_summary, key_concepts, key_takeaways, action_items,
          contractor_relevance, complexity_score, reading_time_minutes,
          word_count, ai_insights
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING *
      `;
      const values = [
        data.book_id,
        data.extracted_content_id,
        data.chapter_number,
        data.chapter_title,
        data.chapter_summary,
        safeJsonStringify(data.key_concepts),
        safeJsonStringify(data.key_takeaways),
        safeJsonStringify(data.action_items),
        safeJsonStringify(data.contractor_relevance),
        data.complexity_score,
        data.reading_time_minutes,
        data.word_count,
        safeJsonStringify(data.ai_insights)
      ];
      const result = await query(sql, values);
      return this.parseAnalysis(result.rows[0]);
    } catch (error) {
      throw new Error(`Error creating chapter analysis: ${error.message}`);
    }
  }

  static async findById(id) {
    try {
      const result = await query('SELECT * FROM chapter_analysis WHERE id = $1', [id]);
      return result.rows[0] ? this.parseAnalysis(result.rows[0]) : null;
    } catch (error) {
      throw new Error(`Error finding chapter analysis: ${error.message}`);
    }
  }

  static async findByBookId(book_id) {
    try {
      const result = await query(
        'SELECT * FROM chapter_analysis WHERE book_id = $1 ORDER BY chapter_number ASC',
        [book_id]
      );
      return result.rows.map(row => this.parseAnalysis(row));
    } catch (error) {
      throw new Error(`Error finding chapters by book: ${error.message}`);
    }
  }

  static async findByChapterNumber(book_id, chapter_number) {
    try {
      const result = await query(
        'SELECT * FROM chapter_analysis WHERE book_id = $1 AND chapter_number = $2',
        [book_id, chapter_number]
      );
      return result.rows[0] ? this.parseAnalysis(result.rows[0]) : null;
    } catch (error) {
      throw new Error(`Error finding chapter by number: ${error.message}`);
    }
  }

  static async findByComplexity(min_score, max_score) {
    try {
      const result = await query(
        `SELECT ca.*, b.title as book_title, b.author
         FROM chapter_analysis ca
         JOIN books b ON ca.book_id = b.id
         WHERE ca.complexity_score >= $1 AND ca.complexity_score <= $2
         ORDER BY ca.complexity_score ASC`,
        [min_score, max_score]
      );
      return result.rows.map(row => this.parseAnalysis(row));
    } catch (error) {
      throw new Error(`Error finding chapters by complexity: ${error.message}`);
    }
  }

  static async update(id, data) {
    try {
      const fields = [];
      const values = [];
      let paramCount = 1;

      const allowedFields = [
        'chapter_number', 'chapter_title', 'chapter_summary', 'key_concepts',
        'key_takeaways', 'action_items', 'contractor_relevance', 'complexity_score',
        'reading_time_minutes', 'word_count', 'ai_insights'
      ];

      Object.keys(data).forEach(key => {
        if (data[key] !== undefined && key !== 'id' && allowedFields.includes(key)) {
          fields.push(`${key} = $${paramCount}`);
          if (['key_concepts', 'key_takeaways', 'action_items', 'contractor_relevance', 'ai_insights'].includes(key)) {
            values.push(safeJsonStringify(data[key]));
          } else {
            values.push(data[key]);
          }
          paramCount++;
        }
      });

      if (fields.length === 0) return null;

      fields.push(`updated_at = CURRENT_TIMESTAMP`);
      values.push(id);

      const sql = `
        UPDATE chapter_analysis
        SET ${fields.join(', ')}
        WHERE id = $${paramCount}
        RETURNING *
      `;
      const result = await query(sql, values);
      return result.rows[0] ? this.parseAnalysis(result.rows[0]) : null;
    } catch (error) {
      throw new Error(`Error updating chapter analysis: ${error.message}`);
    }
  }

  static async delete(id) {
    try {
      const result = await query('DELETE FROM chapter_analysis WHERE id = $1 RETURNING *', [id]);
      return result.rows[0] ? this.parseAnalysis(result.rows[0]) : null;
    } catch (error) {
      throw new Error(`Error deleting chapter analysis: ${error.message}`);
    }
  }

  static async deleteByBookId(book_id) {
    try {
      const result = await query(
        'DELETE FROM chapter_analysis WHERE book_id = $1 RETURNING *',
        [book_id]
      );
      return result.rows.map(row => this.parseAnalysis(row));
    } catch (error) {
      throw new Error(`Error deleting chapters by book: ${error.message}`);
    }
  }

  static async getBookSummary(book_id) {
    try {
      const result = await query(
        `SELECT
          COUNT(*) as total_chapters,
          SUM(word_count) as total_words,
          AVG(complexity_score) as avg_complexity,
          SUM(reading_time_minutes) as total_reading_time_minutes,
          json_agg(json_build_object(
            'chapter_number', chapter_number,
            'chapter_title', chapter_title,
            'reading_time_minutes', reading_time_minutes
          ) ORDER BY chapter_number) as chapter_list
         FROM chapter_analysis
         WHERE book_id = $1`,
        [book_id]
      );
      return result.rows[0];
    } catch (error) {
      throw new Error(`Error fetching book summary: ${error.message}`);
    }
  }

  static parseAnalysis(analysis) {
    if (!analysis) return null;
    return {
      ...analysis,
      key_concepts: safeJsonParse(analysis.key_concepts, []),
      key_takeaways: safeJsonParse(analysis.key_takeaways, []),
      action_items: safeJsonParse(analysis.action_items, []),
      contractor_relevance: safeJsonParse(analysis.contractor_relevance, {}),
      ai_insights: safeJsonParse(analysis.ai_insights, {})
    };
  }
}

module.exports = ChapterAnalysis;