const DocumentProcessingMetrics = require('../models/documentProcessingMetrics');

const documentProcessingMetricsController = {
  async create(req, res) {
    try {
      const metrics = await DocumentProcessingMetrics.create(req.body);
      res.status(201).json({
        success: true,
        data: metrics
      });
    } catch (error) {
      console.error('Error creating processing metrics:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  async getById(req, res) {
    try {
      const metrics = await DocumentProcessingMetrics.findById(req.params.id);
      if (!metrics) {
        return res.status(404).json({
          success: false,
          error: 'Processing metrics not found'
        });
      }
      res.json({
        success: true,
        data: metrics
      });
    } catch (error) {
      console.error('Error fetching processing metrics:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  async getByDocumentUploadId(req, res) {
    try {
      const metrics = await DocumentProcessingMetrics.findByDocumentUploadId(
        req.params.documentUploadId
      );
      if (!metrics) {
        return res.status(404).json({
          success: false,
          error: 'Processing metrics not found for this document'
        });
      }
      res.json({
        success: true,
        data: metrics
      });
    } catch (error) {
      console.error('Error fetching metrics by document:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  async getNeedingReview(req, res) {
    try {
      const documents = await DocumentProcessingMetrics.findNeedingReview();
      res.json({
        success: true,
        data: documents
      });
    } catch (error) {
      console.error('Error fetching documents needing review:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  async getHighQuality(req, res) {
    try {
      const { minScore = 0.8 } = req.query;
      const documents = await DocumentProcessingMetrics.findHighQuality(
        parseFloat(minScore)
      );
      res.json({
        success: true,
        data: documents
      });
    } catch (error) {
      console.error('Error fetching high quality documents:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  async update(req, res) {
    try {
      const metrics = await DocumentProcessingMetrics.update(
        req.params.id,
        req.body
      );
      if (!metrics) {
        return res.status(404).json({
          success: false,
          error: 'Processing metrics not found'
        });
      }
      res.json({
        success: true,
        data: metrics
      });
    } catch (error) {
      console.error('Error updating processing metrics:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  async updateProgress(req, res) {
    try {
      const { documentUploadId } = req.params;
      const { processedPages } = req.body;
      const metrics = await DocumentProcessingMetrics.updateProgress(
        documentUploadId,
        processedPages
      );
      if (!metrics) {
        return res.status(404).json({
          success: false,
          error: 'Processing metrics not found for this document'
        });
      }
      res.json({
        success: true,
        data: metrics
      });
    } catch (error) {
      console.error('Error updating processing progress:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  async completeProcessing(req, res) {
    try {
      const { documentUploadId } = req.params;
      const metrics = await DocumentProcessingMetrics.completeProcessing(
        documentUploadId,
        req.body
      );
      if (!metrics) {
        return res.status(404).json({
          success: false,
          error: 'Processing metrics not found for this document'
        });
      }
      res.json({
        success: true,
        data: metrics
      });
    } catch (error) {
      console.error('Error completing processing metrics:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  async flagForReview(req, res) {
    try {
      const { documentUploadId } = req.params;
      const { reviewNotes } = req.body;
      const metrics = await DocumentProcessingMetrics.flagForReview(
        documentUploadId,
        reviewNotes
      );
      if (!metrics) {
        return res.status(404).json({
          success: false,
          error: 'Processing metrics not found for this document'
        });
      }
      res.json({
        success: true,
        data: metrics
      });
    } catch (error) {
      console.error('Error flagging for review:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  async delete(req, res) {
    try {
      const metrics = await DocumentProcessingMetrics.delete(req.params.id);
      if (!metrics) {
        return res.status(404).json({
          success: false,
          error: 'Processing metrics not found'
        });
      }
      res.json({
        success: true,
        data: metrics
      });
    } catch (error) {
      console.error('Error deleting processing metrics:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  async getAverageMetrics(req, res) {
    try {
      const averages = await DocumentProcessingMetrics.getAverageMetrics();
      res.json({
        success: true,
        data: averages
      });
    } catch (error) {
      console.error('Error fetching average metrics:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  async getProcessingStats(req, res) {
    try {
      const stats = await DocumentProcessingMetrics.getProcessingStats();
      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Error fetching processing stats:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
};

module.exports = documentProcessingMetricsController;