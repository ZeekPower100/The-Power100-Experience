const ChapterAnalysis = require('../models/chapterAnalysis');

const chapterAnalysisController = {
  async create(req, res) {
    try {
      const analysis = await ChapterAnalysis.create(req.body);
      res.status(201).json({
        success: true,
        data: analysis
      });
    } catch (error) {
      console.error('Error creating chapter analysis:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  async getById(req, res) {
    try {
      const analysis = await ChapterAnalysis.findById(req.params.id);
      if (!analysis) {
        return res.status(404).json({
          success: false,
          error: 'Chapter analysis not found'
        });
      }
      res.json({
        success: true,
        data: analysis
      });
    } catch (error) {
      console.error('Error fetching chapter analysis:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  async getByBookId(req, res) {
    try {
      const chapters = await ChapterAnalysis.findByBookId(req.params.bookId);
      res.json({
        success: true,
        data: chapters
      });
    } catch (error) {
      console.error('Error fetching chapters by book:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  async getByChapterNumber(req, res) {
    try {
      const { bookId, chapterNumber } = req.params;
      const chapter = await ChapterAnalysis.findByChapterNumber(bookId, chapterNumber);
      if (!chapter) {
        return res.status(404).json({
          success: false,
          error: 'Chapter not found'
        });
      }
      res.json({
        success: true,
        data: chapter
      });
    } catch (error) {
      console.error('Error fetching chapter by number:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  async getByComplexity(req, res) {
    try {
      const { minScore = 0, maxScore = 1 } = req.query;
      const chapters = await ChapterAnalysis.findByComplexity(
        parseFloat(minScore),
        parseFloat(maxScore)
      );
      res.json({
        success: true,
        data: chapters
      });
    } catch (error) {
      console.error('Error fetching chapters by complexity:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  async update(req, res) {
    try {
      const analysis = await ChapterAnalysis.update(req.params.id, req.body);
      if (!analysis) {
        return res.status(404).json({
          success: false,
          error: 'Chapter analysis not found'
        });
      }
      res.json({
        success: true,
        data: analysis
      });
    } catch (error) {
      console.error('Error updating chapter analysis:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  async delete(req, res) {
    try {
      const analysis = await ChapterAnalysis.delete(req.params.id);
      if (!analysis) {
        return res.status(404).json({
          success: false,
          error: 'Chapter analysis not found'
        });
      }
      res.json({
        success: true,
        data: analysis
      });
    } catch (error) {
      console.error('Error deleting chapter analysis:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  async deleteByBookId(req, res) {
    try {
      const chapters = await ChapterAnalysis.deleteByBookId(req.params.bookId);
      res.json({
        success: true,
        data: chapters
      });
    } catch (error) {
      console.error('Error deleting chapters by book:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  async getBookSummary(req, res) {
    try {
      const summary = await ChapterAnalysis.getBookSummary(req.params.bookId);
      res.json({
        success: true,
        data: summary
      });
    } catch (error) {
      console.error('Error fetching book summary:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
};

module.exports = chapterAnalysisController;