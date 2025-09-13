const AiContentAnalysis = require('../models/aiContentAnalysis');

const aiContentAnalysisController = {
  // Create new content analysis
  async create(req, res) {
    try {
      const analysisData = req.body;
      const analysis = await AiContentAnalysis.create(analysisData);

      res.json({ success: true, data: analysis });
    } catch (error) {
      console.error('Error creating content analysis:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create content analysis'
      });
    }
  },

  // Get analysis by ID
  async getById(req, res) {
    try {
      const { id } = req.params;
      const analysis = await AiContentAnalysis.findById(id);

      if (!analysis) {
        return res.status(404).json({
          success: false,
          error: 'Analysis not found'
        });
      }

      res.json({ success: true, data: analysis });
    } catch (error) {
      console.error('Error fetching analysis:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch analysis'
      });
    }
  },

  // Get analysis for entity
  async getByEntity(req, res) {
    try {
      const { entityType, entityId } = req.params;
      const analyses = await AiContentAnalysis.findByEntity(entityType, entityId);

      res.json({ success: true, data: analyses });
    } catch (error) {
      console.error('Error fetching entity analyses:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch entity analyses'
      });
    }
  },

  // Update processing status
  async updateStatus(req, res) {
    try {
      const { id } = req.params;
      const { status, errorMessage } = req.body;

      const analysis = await AiContentAnalysis.updateProcessingStatus(id, status, errorMessage);

      res.json({ success: true, data: analysis });
    } catch (error) {
      console.error('Error updating status:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update status'
      });
    }
  },

  // Update analysis results
  async updateResults(req, res) {
    try {
      const { id } = req.params;
      const results = req.body;

      const analysis = await AiContentAnalysis.updateAnalysisResults(id, results);

      res.json({ success: true, data: analysis });
    } catch (error) {
      console.error('Error updating analysis results:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update analysis results'
      });
    }
  },

  // Get pending analyses for processing
  async getPending(req, res) {
    try {
      const { limit = 10 } = req.query;
      const analyses = await AiContentAnalysis.getPendingAnalysis(limit);

      res.json({ success: true, data: analyses });
    } catch (error) {
      console.error('Error fetching pending analyses:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch pending analyses'
      });
    }
  },

  // Get high quality content
  async getHighQuality(req, res) {
    try {
      const { minScore = 80, limit = 20 } = req.query;
      const content = await AiContentAnalysis.getHighQualityContent(minScore, limit);

      res.json({ success: true, data: content });
    } catch (error) {
      console.error('Error fetching high quality content:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch high quality content'
      });
    }
  },

  // Get content by topic
  async getByTopic(req, res) {
    try {
      const { topic } = req.params;
      const { limit = 20 } = req.query;

      const content = await AiContentAnalysis.getContentByTopic(topic, limit);

      res.json({ success: true, data: content });
    } catch (error) {
      console.error('Error fetching content by topic:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch content by topic'
      });
    }
  },

  // Get relevant content for focus area
  async getRelevantContent(req, res) {
    try {
      const { focusArea } = req.params;
      const { minScore = 0.7, limit = 20 } = req.query;

      const content = await AiContentAnalysis.getRelevantContent(focusArea, minScore, limit);

      res.json({ success: true, data: content });
    } catch (error) {
      console.error('Error fetching relevant content:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch relevant content'
      });
    }
  },

  // Get content requiring review
  async getRequiringReview(req, res) {
    try {
      const content = await AiContentAnalysis.getRequiringReview();

      res.json({ success: true, data: content });
    } catch (error) {
      console.error('Error fetching content requiring review:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch content requiring review'
      });
    }
  },

  // Get analysis statistics
  async getStats(req, res) {
    try {
      const stats = await AiContentAnalysis.getAnalysisStats();

      res.json({ success: true, data: stats });
    } catch (error) {
      console.error('Error fetching analysis stats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch analysis stats'
      });
    }
  },

  // Trigger AI analysis for content
  async triggerAnalysis(req, res) {
    try {
      const { entityType, entityId, contentUrl, contentType } = req.body;

      // Create pending analysis record
      const analysis = await AiContentAnalysis.create({
        entity_type: entityType,
        entity_id: entityId,
        content_url: contentUrl,
        content_type: contentType,
        processing_status: 'pending'
      });

      // Here you would trigger the actual AI processing
      // For now, we'll just return the created record
      res.json({
        success: true,
        data: analysis,
        message: 'Analysis queued for processing'
      });
    } catch (error) {
      console.error('Error triggering analysis:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to trigger analysis'
      });
    }
  }
};

module.exports = aiContentAnalysisController;