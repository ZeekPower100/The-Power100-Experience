const { query } = require('../config/database');

class DocumentProcessingMetrics {
  static async create(data) {
    try {
      const sql = `
        INSERT INTO document_processing_metrics (
          document_upload_id, total_pages, processed_pages,
          extraction_accuracy, processing_duration_seconds,
          content_quality_score, concepts_extracted, insights_generated,
          chapters_analyzed, ai_enrichment_completed, manual_review_needed,
          review_notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *
      `;
      const values = [
        data.document_upload_id,
        data.total_pages,
        data.processed_pages,
        data.extraction_accuracy,
        data.processing_duration_seconds,
        data.content_quality_score,
        data.concepts_extracted,
        data.insights_generated,
        data.chapters_analyzed,
        data.ai_enrichment_completed || false,
        data.manual_review_needed || false,
        data.review_notes
      ];
      const result = await query(sql, values);
      return result.rows[0];
    } catch (error) {
      throw new Error(`Error creating processing metrics: ${error.message}`);
    }
  }

  static async findById(id) {
    try {
      const result = await query('SELECT * FROM document_processing_metrics WHERE id = $1', [id]);
      return result.rows[0] || null;
    } catch (error) {
      throw new Error(`Error finding processing metrics: ${error.message}`);
    }
  }

  static async findByDocumentUploadId(document_upload_id) {
    try {
      const result = await query(
        'SELECT * FROM document_processing_metrics WHERE document_upload_id = $1',
        [document_upload_id]
      );
      return result.rows[0] || null;
    } catch (error) {
      throw new Error(`Error finding metrics by document: ${error.message}`);
    }
  }

  static async findNeedingReview() {
    try {
      const result = await query(
        `SELECT dpm.*, du.file_name, du.book_id
         FROM document_processing_metrics dpm
         JOIN document_uploads du ON dpm.document_upload_id = du.id
         WHERE dpm.manual_review_needed = true
         ORDER BY dpm.created_at DESC`
      );
      return result.rows;
    } catch (error) {
      throw new Error(`Error finding documents needing review: ${error.message}`);
    }
  }

  static async findHighQuality(min_score = 0.8) {
    try {
      const result = await query(
        `SELECT dpm.*, du.file_name, du.book_id
         FROM document_processing_metrics dpm
         JOIN document_uploads du ON dpm.document_upload_id = du.id
         WHERE dpm.content_quality_score >= $1
         AND dpm.extraction_accuracy >= $1
         ORDER BY dpm.content_quality_score DESC`,
        [min_score]
      );
      return result.rows;
    } catch (error) {
      throw new Error(`Error finding high quality documents: ${error.message}`);
    }
  }

  static async update(id, data) {
    try {
      const fields = [];
      const values = [];
      let paramCount = 1;

      const allowedFields = [
        'total_pages', 'processed_pages', 'extraction_accuracy',
        'processing_duration_seconds', 'content_quality_score',
        'concepts_extracted', 'insights_generated', 'chapters_analyzed',
        'ai_enrichment_completed', 'manual_review_needed', 'review_notes'
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
        UPDATE document_processing_metrics
        SET ${fields.join(', ')}
        WHERE id = $${paramCount}
        RETURNING *
      `;
      const result = await query(sql, values);
      return result.rows[0] || null;
    } catch (error) {
      throw new Error(`Error updating processing metrics: ${error.message}`);
    }
  }

  static async updateProgress(document_upload_id, processed_pages) {
    try {
      const sql = `
        UPDATE document_processing_metrics
        SET processed_pages = $1,
            updated_at = CURRENT_TIMESTAMP
        WHERE document_upload_id = $2
        RETURNING *
      `;
      const result = await query(sql, [processed_pages, document_upload_id]);
      return result.rows[0] || null;
    } catch (error) {
      throw new Error(`Error updating processing progress: ${error.message}`);
    }
  }

  static async completeProcessing(document_upload_id, metrics) {
    try {
      const sql = `
        UPDATE document_processing_metrics
        SET processed_pages = total_pages,
            extraction_accuracy = $1,
            content_quality_score = $2,
            concepts_extracted = $3,
            insights_generated = $4,
            chapters_analyzed = $5,
            ai_enrichment_completed = $6,
            processing_duration_seconds = $7,
            updated_at = CURRENT_TIMESTAMP
        WHERE document_upload_id = $8
        RETURNING *
      `;
      const values = [
        metrics.extraction_accuracy,
        metrics.content_quality_score,
        metrics.concepts_extracted,
        metrics.insights_generated,
        metrics.chapters_analyzed,
        metrics.ai_enrichment_completed || true,
        metrics.processing_duration_seconds,
        document_upload_id
      ];
      const result = await query(sql, values);
      return result.rows[0] || null;
    } catch (error) {
      throw new Error(`Error completing processing metrics: ${error.message}`);
    }
  }

  static async flagForReview(document_upload_id, review_notes) {
    try {
      const sql = `
        UPDATE document_processing_metrics
        SET manual_review_needed = true,
            review_notes = $1,
            updated_at = CURRENT_TIMESTAMP
        WHERE document_upload_id = $2
        RETURNING *
      `;
      const result = await query(sql, [review_notes, document_upload_id]);
      return result.rows[0] || null;
    } catch (error) {
      throw new Error(`Error flagging for review: ${error.message}`);
    }
  }

  static async delete(id) {
    try {
      const result = await query('DELETE FROM document_processing_metrics WHERE id = $1 RETURNING *', [id]);
      return result.rows[0] || null;
    } catch (error) {
      throw new Error(`Error deleting processing metrics: ${error.message}`);
    }
  }

  static async getAverageMetrics() {
    try {
      const result = await query(`
        SELECT
          COUNT(*) as total_documents_processed,
          AVG(extraction_accuracy) as avg_extraction_accuracy,
          AVG(content_quality_score) as avg_content_quality,
          AVG(processing_duration_seconds) as avg_processing_time_seconds,
          AVG(concepts_extracted) as avg_concepts_per_document,
          AVG(insights_generated) as avg_insights_per_document,
          AVG(chapters_analyzed) as avg_chapters_per_document,
          COUNT(CASE WHEN ai_enrichment_completed = true THEN 1 END) as ai_enriched_count,
          COUNT(CASE WHEN manual_review_needed = true THEN 1 END) as review_needed_count
        FROM document_processing_metrics
      `);
      return result.rows[0];
    } catch (error) {
      throw new Error(`Error fetching average metrics: ${error.message}`);
    }
  }

  static async getProcessingStats() {
    try {
      const result = await query(`
        SELECT
          COUNT(DISTINCT document_upload_id) as total_documents,
          SUM(total_pages) as total_pages_to_process,
          SUM(processed_pages) as total_pages_processed,
          CASE
            WHEN SUM(total_pages) > 0
            THEN ROUND((SUM(processed_pages)::numeric / SUM(total_pages)::numeric * 100), 2)
            ELSE 0
          END as overall_progress_percentage,
          SUM(concepts_extracted) as total_concepts_extracted,
          SUM(insights_generated) as total_insights_generated,
          SUM(chapters_analyzed) as total_chapters_analyzed
        FROM document_processing_metrics
      `);
      return result.rows[0];
    } catch (error) {
      throw new Error(`Error fetching processing stats: ${error.message}`);
    }
  }
}

module.exports = DocumentProcessingMetrics;