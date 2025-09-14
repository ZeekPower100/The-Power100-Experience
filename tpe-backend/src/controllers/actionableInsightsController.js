const ActionableInsights = require('../models/actionableInsights');

const actionableInsightsController = {
  async create(req, res) {
    try {
      const insight = await ActionableInsights.create(req.body);
      res.status(201).json({
        success: true,
        data: insight
      });
    } catch (error) {
      console.error('Error creating actionable insight:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  async getById(req, res) {
    try {
      const insight = await ActionableInsights.findById(req.params.id);
      if (!insight) {
        return res.status(404).json({
          success: false,
          error: 'Actionable insight not found'
        });
      }
      res.json({
        success: true,
        data: insight
      });
    } catch (error) {
      console.error('Error fetching actionable insight:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  async getByBookId(req, res) {
    try {
      const insights = await ActionableInsights.findByBookId(req.params.bookId);
      res.json({
        success: true,
        data: insights
      });
    } catch (error) {
      console.error('Error fetching insights by book:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  async getByChapterAnalysisId(req, res) {
    try {
      const insights = await ActionableInsights.findByChapterAnalysisId(
        req.params.chapterAnalysisId
      );
      res.json({
        success: true,
        data: insights
      });
    } catch (error) {
      console.error('Error fetching insights by chapter:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  async getByType(req, res) {
    try {
      const { type } = req.params;
      const { bookId } = req.query;
      const insights = await ActionableInsights.findByType(type, bookId);
      res.json({
        success: true,
        data: insights
      });
    } catch (error) {
      console.error('Error fetching insights by type:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  async getByDifficulty(req, res) {
    try {
      const { difficulty } = req.params;
      const { bookId } = req.query;
      const insights = await ActionableInsights.findByDifficulty(difficulty, bookId);
      res.json({
        success: true,
        data: insights
      });
    } catch (error) {
      console.error('Error fetching insights by difficulty:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  async getByROI(req, res) {
    try {
      const { roi } = req.params;
      const { bookId } = req.query;
      const insights = await ActionableInsights.findByROI(roi, bookId);
      res.json({
        success: true,
        data: insights
      });
    } catch (error) {
      console.error('Error fetching insights by ROI:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  async getByFocusArea(req, res) {
    try {
      const { focusArea } = req.params;
      const insights = await ActionableInsights.findByFocusArea(focusArea);
      res.json({
        success: true,
        data: insights
      });
    } catch (error) {
      console.error('Error fetching insights by focus area:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  async getQuickWins(req, res) {
    try {
      const { bookId } = req.query;
      const insights = await ActionableInsights.getQuickWins(bookId);
      res.json({
        success: true,
        data: insights
      });
    } catch (error) {
      console.error('Error fetching quick wins:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  async update(req, res) {
    try {
      const insight = await ActionableInsights.update(req.params.id, req.body);
      if (!insight) {
        return res.status(404).json({
          success: false,
          error: 'Actionable insight not found'
        });
      }
      res.json({
        success: true,
        data: insight
      });
    } catch (error) {
      console.error('Error updating actionable insight:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  async delete(req, res) {
    try {
      const insight = await ActionableInsights.delete(req.params.id);
      if (!insight) {
        return res.status(404).json({
          success: false,
          error: 'Actionable insight not found'
        });
      }
      res.json({
        success: true,
        data: insight
      });
    } catch (error) {
      console.error('Error deleting actionable insight:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  async getStats(req, res) {
    try {
      const { bookId } = req.query;
      const stats = await ActionableInsights.getInsightStats(bookId);
      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Error fetching insight stats:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
};

module.exports = actionableInsightsController;