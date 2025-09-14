const { query } = require('../config/database');

class DocumentUploads {
  static async create(data) {
    try {
      const sql = `
        INSERT INTO document_uploads (
          book_id, file_name, file_type, file_size, file_url,
          upload_status, uploaded_by, processing_started_at,
          processing_completed_at, error_message
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
      `;
      const values = [
        data.book_id,
        data.file_name,
        data.file_type,
        data.file_size,
        data.file_url,
        data.upload_status || 'pending',
        data.uploaded_by,
        data.processing_started_at,
        data.processing_completed_at,
        data.error_message
      ];
      const result = await query(sql, values);
      return result.rows[0];
    } catch (error) {
      throw new Error(`Error creating document upload: ${error.message}`);
    }
  }

  static async findById(id) {
    try {
      const result = await query('SELECT * FROM document_uploads WHERE id = $1', [id]);
      return result.rows[0] || null;
    } catch (error) {
      throw new Error(`Error finding document upload: ${error.message}`);
    }
  }

  static async findByBookId(book_id) {
    try {
      const result = await query(
        'SELECT * FROM document_uploads WHERE book_id = $1 ORDER BY created_at DESC',
        [book_id]
      );
      return result.rows;
    } catch (error) {
      throw new Error(`Error finding uploads by book: ${error.message}`);
    }
  }

  static async findByStatus(upload_status) {
    try {
      const result = await query(
        'SELECT * FROM document_uploads WHERE upload_status = $1 ORDER BY created_at DESC',
        [upload_status]
      );
      return result.rows;
    } catch (error) {
      throw new Error(`Error finding uploads by status: ${error.message}`);
    }
  }

  static async update(id, data) {
    try {
      const fields = [];
      const values = [];
      let paramCount = 1;

      const allowedFields = [
        'file_name', 'file_type', 'file_size', 'file_url', 'upload_status',
        'uploaded_by', 'processing_started_at', 'processing_completed_at', 'error_message'
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
        UPDATE document_uploads
        SET ${fields.join(', ')}
        WHERE id = $${paramCount}
        RETURNING *
      `;
      const result = await query(sql, values);
      return result.rows[0] || null;
    } catch (error) {
      throw new Error(`Error updating document upload: ${error.message}`);
    }
  }

  static async updateStatus(id, status, errorMessage = null) {
    try {
      const sql = `
        UPDATE document_uploads
        SET upload_status = $1,
            error_message = $2,
            processing_completed_at = CASE WHEN $1 IN ('completed', 'failed') THEN CURRENT_TIMESTAMP ELSE processing_completed_at END,
            processing_started_at = CASE WHEN $1 = 'processing' THEN CURRENT_TIMESTAMP ELSE processing_started_at END,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $3
        RETURNING *
      `;
      const result = await query(sql, [status, errorMessage, id]);
      return result.rows[0] || null;
    } catch (error) {
      throw new Error(`Error updating upload status: ${error.message}`);
    }
  }

  static async delete(id) {
    try {
      const result = await query('DELETE FROM document_uploads WHERE id = $1 RETURNING *', [id]);
      return result.rows[0] || null;
    } catch (error) {
      throw new Error(`Error deleting document upload: ${error.message}`);
    }
  }

  static async getStats() {
    try {
      const result = await query(`
        SELECT
          COUNT(*) as total_uploads,
          COUNT(CASE WHEN upload_status = 'pending' THEN 1 END) as pending_count,
          COUNT(CASE WHEN upload_status = 'processing' THEN 1 END) as processing_count,
          COUNT(CASE WHEN upload_status = 'completed' THEN 1 END) as completed_count,
          COUNT(CASE WHEN upload_status = 'failed' THEN 1 END) as failed_count
        FROM document_uploads
      `);
      return result.rows[0];
    } catch (error) {
      throw new Error(`Error fetching upload stats: ${error.message}`);
    }
  }
}

module.exports = DocumentUploads;