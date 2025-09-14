const DocumentUploads = require('../models/documentUploads');
const DocumentExtractionJobs = require('../models/documentExtractionJobs');
const DocumentProcessingMetrics = require('../models/documentProcessingMetrics');

const documentUploadsController = {
  async create(req, res) {
    try {
      const upload = await DocumentUploads.create(req.body);

      // Create initial extraction job
      if (upload) {
        await DocumentExtractionJobs.create({
          document_upload_id: upload.id,
          job_type: 'text_extraction',
          job_status: 'queued'
        });

        // Create initial metrics record
        await DocumentProcessingMetrics.create({
          document_upload_id: upload.id,
          total_pages: req.body.total_pages || 0,
          processed_pages: 0
        });
      }

      res.status(201).json({
        success: true,
        data: upload
      });
    } catch (error) {
      console.error('Error creating document upload:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  async getById(req, res) {
    try {
      const upload = await DocumentUploads.findById(req.params.id);
      if (!upload) {
        return res.status(404).json({
          success: false,
          error: 'Document upload not found'
        });
      }
      res.json({
        success: true,
        data: upload
      });
    } catch (error) {
      console.error('Error fetching document upload:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  async getByBookId(req, res) {
    try {
      const uploads = await DocumentUploads.findByBookId(req.params.bookId);
      res.json({
        success: true,
        data: uploads
      });
    } catch (error) {
      console.error('Error fetching uploads by book:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  async getByStatus(req, res) {
    try {
      const { status } = req.params;
      const uploads = await DocumentUploads.findByStatus(status);
      res.json({
        success: true,
        data: uploads
      });
    } catch (error) {
      console.error('Error fetching uploads by status:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  async update(req, res) {
    try {
      const upload = await DocumentUploads.update(req.params.id, req.body);
      if (!upload) {
        return res.status(404).json({
          success: false,
          error: 'Document upload not found'
        });
      }
      res.json({
        success: true,
        data: upload
      });
    } catch (error) {
      console.error('Error updating document upload:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  async updateStatus(req, res) {
    try {
      const { status, error_message } = req.body;
      const upload = await DocumentUploads.updateStatus(
        req.params.id,
        status,
        error_message
      );
      if (!upload) {
        return res.status(404).json({
          success: false,
          error: 'Document upload not found'
        });
      }
      res.json({
        success: true,
        data: upload
      });
    } catch (error) {
      console.error('Error updating upload status:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  async delete(req, res) {
    try {
      const upload = await DocumentUploads.delete(req.params.id);
      if (!upload) {
        return res.status(404).json({
          success: false,
          error: 'Document upload not found'
        });
      }
      res.json({
        success: true,
        data: upload
      });
    } catch (error) {
      console.error('Error deleting document upload:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  async getStats(req, res) {
    try {
      const stats = await DocumentUploads.getStats();
      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Error fetching upload stats:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
};

module.exports = documentUploadsController;