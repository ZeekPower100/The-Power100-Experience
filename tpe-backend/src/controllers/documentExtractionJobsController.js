const DocumentExtractionJobs = require('../models/documentExtractionJobs');
const ExtractedContent = require('../models/extractedContent');
const DocumentUploads = require('../models/documentUploads');

const documentExtractionJobsController = {
  async create(req, res) {
    try {
      const job = await DocumentExtractionJobs.create(req.body);
      res.status(201).json({
        success: true,
        data: job
      });
    } catch (error) {
      console.error('Error creating extraction job:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  async getById(req, res) {
    try {
      const job = await DocumentExtractionJobs.findById(req.params.id);
      if (!job) {
        return res.status(404).json({
          success: false,
          error: 'Extraction job not found'
        });
      }
      res.json({
        success: true,
        data: job
      });
    } catch (error) {
      console.error('Error fetching extraction job:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  async getByDocumentUploadId(req, res) {
    try {
      const jobs = await DocumentExtractionJobs.findByDocumentUploadId(
        req.params.documentUploadId
      );
      res.json({
        success: true,
        data: jobs
      });
    } catch (error) {
      console.error('Error fetching jobs by document:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  async getByStatus(req, res) {
    try {
      const { status } = req.params;
      const jobs = await DocumentExtractionJobs.findByStatus(status);
      res.json({
        success: true,
        data: jobs
      });
    } catch (error) {
      console.error('Error fetching jobs by status:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  async getNextQueued(req, res) {
    try {
      const job = await DocumentExtractionJobs.getNextQueuedJob();
      res.json({
        success: true,
        data: job
      });
    } catch (error) {
      console.error('Error fetching next queued job:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  async startJob(req, res) {
    try {
      const { processor } = req.body;
      const job = await DocumentExtractionJobs.startJob(req.params.id, processor);
      if (!job) {
        return res.status(404).json({
          success: false,
          error: 'Extraction job not found'
        });
      }

      // Update document upload status
      await DocumentUploads.updateStatus(job.document_upload_id, 'processing');

      res.json({
        success: true,
        data: job
      });
    } catch (error) {
      console.error('Error starting job:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  async completeJob(req, res) {
    try {
      const { processing_time_ms } = req.body;
      const job = await DocumentExtractionJobs.completeJob(
        req.params.id,
        processing_time_ms
      );
      if (!job) {
        return res.status(404).json({
          success: false,
          error: 'Extraction job not found'
        });
      }

      // Check if all jobs for this document are complete
      const allJobs = await DocumentExtractionJobs.findByDocumentUploadId(
        job.document_upload_id
      );
      const allComplete = allJobs.every(j => j.job_status === 'completed');

      if (allComplete) {
        await DocumentUploads.updateStatus(job.document_upload_id, 'completed');
      }

      res.json({
        success: true,
        data: job
      });
    } catch (error) {
      console.error('Error completing job:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  async failJob(req, res) {
    try {
      const { error_details } = req.body;
      const job = await DocumentExtractionJobs.failJob(req.params.id, error_details);
      if (!job) {
        return res.status(404).json({
          success: false,
          error: 'Extraction job not found'
        });
      }

      // Update document upload status
      await DocumentUploads.updateStatus(
        job.document_upload_id,
        'failed',
        error_details.message || 'Extraction job failed'
      );

      res.json({
        success: true,
        data: job
      });
    } catch (error) {
      console.error('Error failing job:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  async update(req, res) {
    try {
      const job = await DocumentExtractionJobs.update(req.params.id, req.body);
      if (!job) {
        return res.status(404).json({
          success: false,
          error: 'Extraction job not found'
        });
      }
      res.json({
        success: true,
        data: job
      });
    } catch (error) {
      console.error('Error updating extraction job:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  async delete(req, res) {
    try {
      const job = await DocumentExtractionJobs.delete(req.params.id);
      if (!job) {
        return res.status(404).json({
          success: false,
          error: 'Extraction job not found'
        });
      }
      res.json({
        success: true,
        data: job
      });
    } catch (error) {
      console.error('Error deleting extraction job:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  async getStats(req, res) {
    try {
      const stats = await DocumentExtractionJobs.getStats();
      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Error fetching job stats:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
};

module.exports = documentExtractionJobsController;