const { query } = require('../config/database');
const { safeJsonParse, safeJsonStringify } = require('../utils/jsonHelpers');

class ExtractedContent {
  static async create(data) {
    try {
      const sql = `
        INSERT INTO extracted_content (
          document_upload_id, extraction_job_id, content_type,
          content_order, raw_text, cleaned_text, metadata,
          extraction_confidence, language, word_count, character_count
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *
      `;
      const values = [
        data.document_upload_id,
        data.extraction_job_id,
        data.content_type,
        data.content_order,
        data.raw_text,
        data.cleaned_text,
        safeJsonStringify(data.metadata),
        data.extraction_confidence,
        data.language || 'en',
        data.word_count,
        data.character_count
      ];
      const result = await query(sql, values);
      return this.parseContent(result.rows[0]);
    } catch (error) {
      throw new Error(`Error creating extracted content: ${error.message}`);
    }
  }

  static async findById(id) {
    try {
      const result = await query('SELECT * FROM extracted_content WHERE id = $1', [id]);
      return result.rows[0] ? this.parseContent(result.rows[0]) : null;
    } catch (error) {
      throw new Error(`Error finding extracted content: ${error.message}`);
    }
  }

  static async findByDocumentUploadId(document_upload_id) {
    try {
      const result = await query(
        'SELECT * FROM extracted_content WHERE document_upload_id = $1 ORDER BY content_order ASC',
        [document_upload_id]
      );
      return result.rows.map(row => this.parseContent(row));
    } catch (error) {
      throw new Error(`Error finding content by document: ${error.message}`);
    }
  }

  static async findByJobId(extraction_job_id) {
    try {
      const result = await query(
        'SELECT * FROM extracted_content WHERE extraction_job_id = $1 ORDER BY content_order ASC',
        [extraction_job_id]
      );
      return result.rows.map(row => this.parseContent(row));
    } catch (error) {
      throw new Error(`Error finding content by job: ${error.message}`);
    }
  }

  static async findByContentType(document_upload_id, content_type) {
    try {
      const result = await query(
        'SELECT * FROM extracted_content WHERE document_upload_id = $1 AND content_type = $2 ORDER BY content_order ASC',
        [document_upload_id, content_type]
      );
      return result.rows.map(row => this.parseContent(row));
    } catch (error) {
      throw new Error(`Error finding content by type: ${error.message}`);
    }
  }

  static async getFullText(document_upload_id) {
    try {
      const result = await query(
        `SELECT cleaned_text FROM extracted_content
         WHERE document_upload_id = $1
         ORDER BY content_order ASC`,
        [document_upload_id]
      );
      return result.rows.map(row => row.cleaned_text).join('\n\n');
    } catch (error) {
      throw new Error(`Error getting full text: ${error.message}`);
    }
  }

  static async update(id, data) {
    try {
      const fields = [];
      const values = [];
      let paramCount = 1;

      const allowedFields = [
        'content_type', 'content_order', 'raw_text', 'cleaned_text',
        'metadata', 'extraction_confidence', 'language', 'word_count', 'character_count'
      ];

      Object.keys(data).forEach(key => {
        if (data[key] !== undefined && key !== 'id' && allowedFields.includes(key)) {
          fields.push(`${key} = $${paramCount}`);
          if (key === 'metadata') {
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
        UPDATE extracted_content
        SET ${fields.join(', ')}
        WHERE id = $${paramCount}
        RETURNING *
      `;
      const result = await query(sql, values);
      return result.rows[0] ? this.parseContent(result.rows[0]) : null;
    } catch (error) {
      throw new Error(`Error updating extracted content: ${error.message}`);
    }
  }

  static async delete(id) {
    try {
      const result = await query('DELETE FROM extracted_content WHERE id = $1 RETURNING *', [id]);
      return result.rows[0] ? this.parseContent(result.rows[0]) : null;
    } catch (error) {
      throw new Error(`Error deleting extracted content: ${error.message}`);
    }
  }

  static async deleteByDocumentUploadId(document_upload_id) {
    try {
      const result = await query(
        'DELETE FROM extracted_content WHERE document_upload_id = $1 RETURNING *',
        [document_upload_id]
      );
      return result.rows.map(row => this.parseContent(row));
    } catch (error) {
      throw new Error(`Error deleting content by document: ${error.message}`);
    }
  }

  static async getStats(document_upload_id) {
    try {
      const sql = document_upload_id
        ? `SELECT
            COUNT(*) as total_content_pieces,
            SUM(word_count) as total_words,
            SUM(character_count) as total_characters,
            AVG(extraction_confidence) as avg_confidence
           FROM extracted_content
           WHERE document_upload_id = $1`
        : `SELECT
            COUNT(*) as total_content_pieces,
            SUM(word_count) as total_words,
            SUM(character_count) as total_characters,
            AVG(extraction_confidence) as avg_confidence
           FROM extracted_content`;

      const values = document_upload_id ? [document_upload_id] : [];
      const result = await query(sql, values);
      return result.rows[0];
    } catch (error) {
      throw new Error(`Error fetching content stats: ${error.message}`);
    }
  }

  static parseContent(content) {
    if (!content) return null;
    return {
      ...content,
      metadata: safeJsonParse(content.metadata, {})
    };
  }
}

module.exports = ExtractedContent;