const ExtractedContent = require('../models/extractedContent');

const extractedContentController = {
  async create(req, res) {
    try {
      const content = await ExtractedContent.create(req.body);
      res.status(201).json({
        success: true,
        data: content
      });
    } catch (error) {
      console.error('Error creating extracted content:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  async getById(req, res) {
    try {
      const content = await ExtractedContent.findById(req.params.id);
      if (!content) {
        return res.status(404).json({
          success: false,
          error: 'Extracted content not found'
        });
      }
      res.json({
        success: true,
        data: content
      });
    } catch (error) {
      console.error('Error fetching extracted content:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  async getByDocumentUploadId(req, res) {
    try {
      const contents = await ExtractedContent.findByDocumentUploadId(
        req.params.documentUploadId
      );
      res.json({
        success: true,
        data: contents
      });
    } catch (error) {
      console.error('Error fetching content by document:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  async getByJobId(req, res) {
    try {
      const contents = await ExtractedContent.findByJobId(req.params.jobId);
      res.json({
        success: true,
        data: contents
      });
    } catch (error) {
      console.error('Error fetching content by job:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  async getByContentType(req, res) {
    try {
      const { documentUploadId, contentType } = req.params;
      const contents = await ExtractedContent.findByContentType(
        documentUploadId,
        contentType
      );
      res.json({
        success: true,
        data: contents
      });
    } catch (error) {
      console.error('Error fetching content by type:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  async getFullText(req, res) {
    try {
      const fullText = await ExtractedContent.getFullText(
        req.params.documentUploadId
      );
      res.json({
        success: true,
        data: fullText
      });
    } catch (error) {
      console.error('Error fetching full text:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  async update(req, res) {
    try {
      const content = await ExtractedContent.update(req.params.id, req.body);
      if (!content) {
        return res.status(404).json({
          success: false,
          error: 'Extracted content not found'
        });
      }
      res.json({
        success: true,
        data: content
      });
    } catch (error) {
      console.error('Error updating extracted content:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  async delete(req, res) {
    try {
      const content = await ExtractedContent.delete(req.params.id);
      if (!content) {
        return res.status(404).json({
          success: false,
          error: 'Extracted content not found'
        });
      }
      res.json({
        success: true,
        data: content
      });
    } catch (error) {
      console.error('Error deleting extracted content:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  async deleteByDocumentUploadId(req, res) {
    try {
      const contents = await ExtractedContent.deleteByDocumentUploadId(
        req.params.documentUploadId
      );
      res.json({
        success: true,
        data: contents
      });
    } catch (error) {
      console.error('Error deleting content by document:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  async getStats(req, res) {
    try {
      const { documentUploadId } = req.query;
      const stats = await ExtractedContent.getStats(documentUploadId);
      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Error fetching content stats:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
};

module.exports = extractedContentController;