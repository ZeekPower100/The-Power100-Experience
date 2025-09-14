const { query } = require('../config/database');
const { safeJsonParse, safeJsonStringify } = require('../utils/jsonHelpers');

class DocumentExtractionJobs {
  static async create(data) {
    try {
      const sql = `
        INSERT INTO document_extraction_jobs (
          document_upload_id, job_type, job_status, processor,
          started_at, completed_at, processing_time_ms,
          retry_count, error_details
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `;
      const values = [
        data.document_upload_id,
        data.job_type,
        data.job_status || 'queued',
        data.processor,
        data.started_at,
        data.completed_at,
        data.processing_time_ms,
        data.retry_count || 0,
        safeJsonStringify(data.error_details)
      ];
      const result = await query(sql, values);
      return this.parseJob(result.rows[0]);
    } catch (error) {
      throw new Error(`Error creating extraction job: ${error.message}`);
    }
  }

  static async findById(id) {
    try {
      const result = await query('SELECT * FROM document_extraction_jobs WHERE id = $1', [id]);
      return result.rows[0] ? this.parseJob(result.rows[0]) : null;
    } catch (error) {
      throw new Error(`Error finding extraction job: ${error.message}`);
    }
  }

  static async findByDocumentUploadId(document_upload_id) {
    try {
      const result = await query(
        'SELECT * FROM document_extraction_jobs WHERE document_upload_id = $1 ORDER BY created_at DESC',
        [document_upload_id]
      );
      return result.rows.map(row => this.parseJob(row));
    } catch (error) {
      throw new Error(`Error finding jobs by document: ${error.message}`);
    }
  }

  static async findByStatus(job_status) {
    try {
      const result = await query(
        'SELECT * FROM document_extraction_jobs WHERE job_status = $1 ORDER BY created_at ASC',
        [job_status]
      );
      return result.rows.map(row => this.parseJob(row));
    } catch (error) {
      throw new Error(`Error finding jobs by status: ${error.message}`);
    }
  }

  static async getNextQueuedJob() {
    try {
      const result = await query(
        `SELECT * FROM document_extraction_jobs
         WHERE job_status = 'queued'
         ORDER BY created_at ASC
         LIMIT 1`
      );
      return result.rows[0] ? this.parseJob(result.rows[0]) : null;
    } catch (error) {
      throw new Error(`Error getting next queued job: ${error.message}`);
    }
  }

  static async update(id, data) {
    try {
      const fields = [];
      const values = [];
      let paramCount = 1;

      const allowedFields = [
        'job_status', 'processor', 'started_at', 'completed_at',
        'processing_time_ms', 'retry_count', 'error_details'
      ];

      Object.keys(data).forEach(key => {
        if (data[key] !== undefined && key !== 'id' && allowedFields.includes(key)) {
          fields.push(`${key} = $${paramCount}`);
          if (key === 'error_details') {
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
        UPDATE document_extraction_jobs
        SET ${fields.join(', ')}
        WHERE id = $${paramCount}
        RETURNING *
      `;
      const result = await query(sql, values);
      return result.rows[0] ? this.parseJob(result.rows[0]) : null;
    } catch (error) {
      throw new Error(`Error updating extraction job: ${error.message}`);
    }
  }

  static async startJob(id, processor) {
    try {
      const sql = `
        UPDATE document_extraction_jobs
        SET job_status = 'processing',
            processor = $1,
            started_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
        RETURNING *
      `;
      const result = await query(sql, [processor, id]);
      return result.rows[0] ? this.parseJob(result.rows[0]) : null;
    } catch (error) {
      throw new Error(`Error starting job: ${error.message}`);
    }
  }

  static async completeJob(id, processing_time_ms) {
    try {
      const sql = `
        UPDATE document_extraction_jobs
        SET job_status = 'completed',
            completed_at = CURRENT_TIMESTAMP,
            processing_time_ms = $1,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
        RETURNING *
      `;
      const result = await query(sql, [processing_time_ms, id]);
      return result.rows[0] ? this.parseJob(result.rows[0]) : null;
    } catch (error) {
      throw new Error(`Error completing job: ${error.message}`);
    }
  }

  static async failJob(id, error_details) {
    try {
      const sql = `
        UPDATE document_extraction_jobs
        SET job_status = 'failed',
            completed_at = CURRENT_TIMESTAMP,
            error_details = $1,
            retry_count = retry_count + 1,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
        RETURNING *
      `;
      const result = await query(sql, [safeJsonStringify(error_details), id]);
      return result.rows[0] ? this.parseJob(result.rows[0]) : null;
    } catch (error) {
      throw new Error(`Error failing job: ${error.message}`);
    }
  }

  static async delete(id) {
    try {
      const result = await query('DELETE FROM document_extraction_jobs WHERE id = $1 RETURNING *', [id]);
      return result.rows[0] ? this.parseJob(result.rows[0]) : null;
    } catch (error) {
      throw new Error(`Error deleting extraction job: ${error.message}`);
    }
  }

  static async getStats() {
    try {
      const result = await query(`
        SELECT
          COUNT(*) as total_jobs,
          COUNT(CASE WHEN job_status = 'queued' THEN 1 END) as queued_count,
          COUNT(CASE WHEN job_status = 'processing' THEN 1 END) as processing_count,
          COUNT(CASE WHEN job_status = 'completed' THEN 1 END) as completed_count,
          COUNT(CASE WHEN job_status = 'failed' THEN 1 END) as failed_count,
          AVG(processing_time_ms) as avg_processing_time_ms
        FROM document_extraction_jobs
      `);
      return result.rows[0];
    } catch (error) {
      throw new Error(`Error fetching job stats: ${error.message}`);
    }
  }

  static parseJob(job) {
    if (!job) return null;
    return {
      ...job,
      error_details: safeJsonParse(job.error_details, null)
    };
  }
}

module.exports = DocumentExtractionJobs;