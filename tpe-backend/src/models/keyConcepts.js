const { query } = require('../config/database');
const { safeJsonParse, safeJsonStringify } = require('../utils/jsonHelpers');

class KeyConcepts {
  static async create(data) {
    try {
      const sql = `
        INSERT INTO key_concepts (
          book_id, concept_name, concept_definition, concept_category,
          occurrence_count, chapter_references, related_concepts,
          importance_score, contractor_applications
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `;
      const values = [
        data.book_id,
        data.concept_name,
        data.concept_definition,
        data.concept_category,
        data.occurrence_count,
        safeJsonStringify(data.chapter_references),
        safeJsonStringify(data.related_concepts),
        data.importance_score,
        safeJsonStringify(data.contractor_applications)
      ];
      const result = await query(sql, values);
      return this.parseConcept(result.rows[0]);
    } catch (error) {
      throw new Error(`Error creating key concept: ${error.message}`);
    }
  }

  static async findById(id) {
    try {
      const result = await query('SELECT * FROM key_concepts WHERE id = $1', [id]);
      return result.rows[0] ? this.parseConcept(result.rows[0]) : null;
    } catch (error) {
      throw new Error(`Error finding key concept: ${error.message}`);
    }
  }

  static async findByBookId(book_id) {
    try {
      const result = await query(
        'SELECT * FROM key_concepts WHERE book_id = $1 ORDER BY importance_score DESC, occurrence_count DESC',
        [book_id]
      );
      return result.rows.map(row => this.parseConcept(row));
    } catch (error) {
      throw new Error(`Error finding concepts by book: ${error.message}`);
    }
  }

  static async findByCategory(concept_category, book_id = null) {
    try {
      const sql = book_id
        ? 'SELECT * FROM key_concepts WHERE concept_category = $1 AND book_id = $2 ORDER BY importance_score DESC'
        : 'SELECT * FROM key_concepts WHERE concept_category = $1 ORDER BY importance_score DESC';
      const values = book_id ? [concept_category, book_id] : [concept_category];
      const result = await query(sql, values);
      return result.rows.map(row => this.parseConcept(row));
    } catch (error) {
      throw new Error(`Error finding concepts by category: ${error.message}`);
    }
  }

  static async findByName(concept_name) {
    try {
      const result = await query(
        `SELECT kc.*, b.title as book_title, b.author
         FROM key_concepts kc
         JOIN books b ON kc.book_id = b.id
         WHERE LOWER(kc.concept_name) LIKE LOWER($1)
         ORDER BY kc.importance_score DESC`,
        [`%${concept_name}%`]
      );
      return result.rows.map(row => this.parseConcept(row));
    } catch (error) {
      throw new Error(`Error finding concepts by name: ${error.message}`);
    }
  }

  static async getTopConcepts(book_id, limit = 10) {
    try {
      const result = await query(
        `SELECT * FROM key_concepts
         WHERE book_id = $1
         ORDER BY importance_score DESC, occurrence_count DESC
         LIMIT $2`,
        [book_id, limit]
      );
      return result.rows.map(row => this.parseConcept(row));
    } catch (error) {
      throw new Error(`Error fetching top concepts: ${error.message}`);
    }
  }

  static async getRelatedConcepts(concept_id) {
    try {
      const concept = await this.findById(concept_id);
      if (!concept || !concept.related_concepts || concept.related_concepts.length === 0) {
        return [];
      }

      const result = await query(
        `SELECT * FROM key_concepts
         WHERE id = ANY($1::int[])
         ORDER BY importance_score DESC`,
        [concept.related_concepts]
      );
      return result.rows.map(row => this.parseConcept(row));
    } catch (error) {
      throw new Error(`Error fetching related concepts: ${error.message}`);
    }
  }

  static async update(id, data) {
    try {
      const fields = [];
      const values = [];
      let paramCount = 1;

      const allowedFields = [
        'concept_name', 'concept_definition', 'concept_category', 'occurrence_count',
        'chapter_references', 'related_concepts', 'importance_score', 'contractor_applications'
      ];

      Object.keys(data).forEach(key => {
        if (data[key] !== undefined && key !== 'id' && allowedFields.includes(key)) {
          fields.push(`${key} = $${paramCount}`);
          if (['chapter_references', 'related_concepts', 'contractor_applications'].includes(key)) {
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
        UPDATE key_concepts
        SET ${fields.join(', ')}
        WHERE id = $${paramCount}
        RETURNING *
      `;
      const result = await query(sql, values);
      return result.rows[0] ? this.parseConcept(result.rows[0]) : null;
    } catch (error) {
      throw new Error(`Error updating key concept: ${error.message}`);
    }
  }

  static async delete(id) {
    try {
      const result = await query('DELETE FROM key_concepts WHERE id = $1 RETURNING *', [id]);
      return result.rows[0] ? this.parseConcept(result.rows[0]) : null;
    } catch (error) {
      throw new Error(`Error deleting key concept: ${error.message}`);
    }
  }

  static async getConceptStats(book_id = null) {
    try {
      const sql = book_id
        ? `SELECT
            COUNT(DISTINCT concept_name) as unique_concepts,
            COUNT(DISTINCT concept_category) as categories,
            AVG(importance_score) as avg_importance,
            SUM(occurrence_count) as total_occurrences
           FROM key_concepts
           WHERE book_id = $1`
        : `SELECT
            COUNT(DISTINCT concept_name) as unique_concepts,
            COUNT(DISTINCT concept_category) as categories,
            AVG(importance_score) as avg_importance,
            SUM(occurrence_count) as total_occurrences
           FROM key_concepts`;

      const values = book_id ? [book_id] : [];
      const result = await query(sql, values);
      return result.rows[0];
    } catch (error) {
      throw new Error(`Error fetching concept stats: ${error.message}`);
    }
  }

  static parseConcept(concept) {
    if (!concept) return null;
    return {
      ...concept,
      chapter_references: safeJsonParse(concept.chapter_references, []),
      related_concepts: safeJsonParse(concept.related_concepts, []),
      contractor_applications: safeJsonParse(concept.contractor_applications, {})
    };
  }
}

module.exports = KeyConcepts;