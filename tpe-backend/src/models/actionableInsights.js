const { query } = require('../config/database');
const { safeJsonParse, safeJsonStringify } = require('../utils/jsonHelpers');

class ActionableInsights {
  static async create(data) {
    try {
      const sql = `
        INSERT INTO actionable_insights (
          book_id, chapter_analysis_id, insight_type, insight_title,
          insight_description, implementation_steps, required_resources,
          expected_outcomes, difficulty_level, implementation_time,
          roi_potential, contractor_focus_areas, success_metrics
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING *
      `;
      const values = [
        data.book_id,
        data.chapter_analysis_id,
        data.insight_type,
        data.insight_title,
        data.insight_description,
        safeJsonStringify(data.implementation_steps),
        safeJsonStringify(data.required_resources),
        safeJsonStringify(data.expected_outcomes),
        data.difficulty_level,
        data.implementation_time,
        data.roi_potential,
        safeJsonStringify(data.contractor_focus_areas),
        safeJsonStringify(data.success_metrics)
      ];
      const result = await query(sql, values);
      return this.parseInsight(result.rows[0]);
    } catch (error) {
      throw new Error(`Error creating actionable insight: ${error.message}`);
    }
  }

  static async findById(id) {
    try {
      const result = await query('SELECT * FROM actionable_insights WHERE id = $1', [id]);
      return result.rows[0] ? this.parseInsight(result.rows[0]) : null;
    } catch (error) {
      throw new Error(`Error finding actionable insight: ${error.message}`);
    }
  }

  static async findByBookId(book_id) {
    try {
      const result = await query(
        'SELECT * FROM actionable_insights WHERE book_id = $1 ORDER BY created_at DESC',
        [book_id]
      );
      return result.rows.map(row => this.parseInsight(row));
    } catch (error) {
      throw new Error(`Error finding insights by book: ${error.message}`);
    }
  }

  static async findByChapterAnalysisId(chapter_analysis_id) {
    try {
      const result = await query(
        'SELECT * FROM actionable_insights WHERE chapter_analysis_id = $1 ORDER BY created_at DESC',
        [chapter_analysis_id]
      );
      return result.rows.map(row => this.parseInsight(row));
    } catch (error) {
      throw new Error(`Error finding insights by chapter: ${error.message}`);
    }
  }

  static async findByType(insight_type, book_id = null) {
    try {
      const sql = book_id
        ? 'SELECT * FROM actionable_insights WHERE insight_type = $1 AND book_id = $2 ORDER BY created_at DESC'
        : 'SELECT * FROM actionable_insights WHERE insight_type = $1 ORDER BY created_at DESC';
      const values = book_id ? [insight_type, book_id] : [insight_type];
      const result = await query(sql, values);
      return result.rows.map(row => this.parseInsight(row));
    } catch (error) {
      throw new Error(`Error finding insights by type: ${error.message}`);
    }
  }

  static async findByDifficulty(difficulty_level, book_id = null) {
    try {
      const sql = book_id
        ? 'SELECT * FROM actionable_insights WHERE difficulty_level = $1 AND book_id = $2 ORDER BY created_at DESC'
        : 'SELECT * FROM actionable_insights WHERE difficulty_level = $1 ORDER BY created_at DESC';
      const values = book_id ? [difficulty_level, book_id] : [difficulty_level];
      const result = await query(sql, values);
      return result.rows.map(row => this.parseInsight(row));
    } catch (error) {
      throw new Error(`Error finding insights by difficulty: ${error.message}`);
    }
  }

  static async findByROI(roi_potential, book_id = null) {
    try {
      const sql = book_id
        ? 'SELECT * FROM actionable_insights WHERE roi_potential = $1 AND book_id = $2 ORDER BY created_at DESC'
        : 'SELECT * FROM actionable_insights WHERE roi_potential = $1 ORDER BY created_at DESC';
      const values = book_id ? [roi_potential, book_id] : [roi_potential];
      const result = await query(sql, values);
      return result.rows.map(row => this.parseInsight(row));
    } catch (error) {
      throw new Error(`Error finding insights by ROI: ${error.message}`);
    }
  }

  static async findByFocusArea(focus_area) {
    try {
      const result = await query(
        `SELECT ai.*, b.title as book_title, b.author
         FROM actionable_insights ai
         JOIN books b ON ai.book_id = b.id
         WHERE ai.contractor_focus_areas::jsonb ? $1
         ORDER BY ai.created_at DESC`,
        [focus_area]
      );
      return result.rows.map(row => this.parseInsight(row));
    } catch (error) {
      throw new Error(`Error finding insights by focus area: ${error.message}`);
    }
  }

  static async getQuickWins(book_id = null) {
    try {
      const sql = book_id
        ? `SELECT * FROM actionable_insights
           WHERE difficulty_level = 'beginner'
           AND implementation_time IN ('immediate', 'days')
           AND roi_potential IN ('medium', 'high')
           AND book_id = $1
           ORDER BY created_at DESC`
        : `SELECT ai.*, b.title as book_title, b.author
           FROM actionable_insights ai
           JOIN books b ON ai.book_id = b.id
           WHERE ai.difficulty_level = 'beginner'
           AND ai.implementation_time IN ('immediate', 'days')
           AND ai.roi_potential IN ('medium', 'high')
           ORDER BY ai.created_at DESC`;

      const values = book_id ? [book_id] : [];
      const result = await query(sql, values);
      return result.rows.map(row => this.parseInsight(row));
    } catch (error) {
      throw new Error(`Error fetching quick wins: ${error.message}`);
    }
  }

  static async update(id, data) {
    try {
      const fields = [];
      const values = [];
      let paramCount = 1;

      const allowedFields = [
        'insight_type', 'insight_title', 'insight_description', 'implementation_steps',
        'required_resources', 'expected_outcomes', 'difficulty_level', 'implementation_time',
        'roi_potential', 'contractor_focus_areas', 'success_metrics'
      ];

      Object.keys(data).forEach(key => {
        if (data[key] !== undefined && key !== 'id' && allowedFields.includes(key)) {
          fields.push(`${key} = $${paramCount}`);
          if (['implementation_steps', 'required_resources', 'expected_outcomes', 'contractor_focus_areas', 'success_metrics'].includes(key)) {
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
        UPDATE actionable_insights
        SET ${fields.join(', ')}
        WHERE id = $${paramCount}
        RETURNING *
      `;
      const result = await query(sql, values);
      return result.rows[0] ? this.parseInsight(result.rows[0]) : null;
    } catch (error) {
      throw new Error(`Error updating actionable insight: ${error.message}`);
    }
  }

  static async delete(id) {
    try {
      const result = await query('DELETE FROM actionable_insights WHERE id = $1 RETURNING *', [id]);
      return result.rows[0] ? this.parseInsight(result.rows[0]) : null;
    } catch (error) {
      throw new Error(`Error deleting actionable insight: ${error.message}`);
    }
  }

  static async getInsightStats(book_id = null) {
    try {
      const sql = book_id
        ? `SELECT
            COUNT(*) as total_insights,
            COUNT(CASE WHEN insight_type = 'strategy' THEN 1 END) as strategy_count,
            COUNT(CASE WHEN insight_type = 'tactic' THEN 1 END) as tactic_count,
            COUNT(CASE WHEN insight_type = 'tool' THEN 1 END) as tool_count,
            COUNT(CASE WHEN insight_type = 'process' THEN 1 END) as process_count,
            COUNT(CASE WHEN insight_type = 'mindset' THEN 1 END) as mindset_count,
            COUNT(CASE WHEN difficulty_level = 'beginner' THEN 1 END) as beginner_count,
            COUNT(CASE WHEN difficulty_level = 'intermediate' THEN 1 END) as intermediate_count,
            COUNT(CASE WHEN difficulty_level = 'advanced' THEN 1 END) as advanced_count,
            COUNT(CASE WHEN roi_potential = 'high' THEN 1 END) as high_roi_count
           FROM actionable_insights
           WHERE book_id = $1`
        : `SELECT
            COUNT(*) as total_insights,
            COUNT(CASE WHEN insight_type = 'strategy' THEN 1 END) as strategy_count,
            COUNT(CASE WHEN insight_type = 'tactic' THEN 1 END) as tactic_count,
            COUNT(CASE WHEN insight_type = 'tool' THEN 1 END) as tool_count,
            COUNT(CASE WHEN insight_type = 'process' THEN 1 END) as process_count,
            COUNT(CASE WHEN insight_type = 'mindset' THEN 1 END) as mindset_count,
            COUNT(CASE WHEN difficulty_level = 'beginner' THEN 1 END) as beginner_count,
            COUNT(CASE WHEN difficulty_level = 'intermediate' THEN 1 END) as intermediate_count,
            COUNT(CASE WHEN difficulty_level = 'advanced' THEN 1 END) as advanced_count,
            COUNT(CASE WHEN roi_potential = 'high' THEN 1 END) as high_roi_count
           FROM actionable_insights`;

      const values = book_id ? [book_id] : [];
      const result = await query(sql, values);
      return result.rows[0];
    } catch (error) {
      throw new Error(`Error fetching insight stats: ${error.message}`);
    }
  }

  static parseInsight(insight) {
    if (!insight) return null;
    return {
      ...insight,
      implementation_steps: safeJsonParse(insight.implementation_steps, []),
      required_resources: safeJsonParse(insight.required_resources, {}),
      expected_outcomes: safeJsonParse(insight.expected_outcomes, []),
      contractor_focus_areas: safeJsonParse(insight.contractor_focus_areas, []),
      success_metrics: safeJsonParse(insight.success_metrics, [])
    };
  }
}

module.exports = ActionableInsights;