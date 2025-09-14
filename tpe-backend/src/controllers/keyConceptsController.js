const KeyConcepts = require('../models/keyConcepts');

const keyConceptsController = {
  async create(req, res) {
    try {
      const concept = await KeyConcepts.create(req.body);
      res.status(201).json({
        success: true,
        data: concept
      });
    } catch (error) {
      console.error('Error creating key concept:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  async getById(req, res) {
    try {
      const concept = await KeyConcepts.findById(req.params.id);
      if (!concept) {
        return res.status(404).json({
          success: false,
          error: 'Key concept not found'
        });
      }
      res.json({
        success: true,
        data: concept
      });
    } catch (error) {
      console.error('Error fetching key concept:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  async getByBookId(req, res) {
    try {
      const concepts = await KeyConcepts.findByBookId(req.params.bookId);
      res.json({
        success: true,
        data: concepts
      });
    } catch (error) {
      console.error('Error fetching concepts by book:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  async getByCategory(req, res) {
    try {
      const { category } = req.params;
      const { bookId } = req.query;
      const concepts = await KeyConcepts.findByCategory(category, bookId);
      res.json({
        success: true,
        data: concepts
      });
    } catch (error) {
      console.error('Error fetching concepts by category:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  async searchByName(req, res) {
    try {
      const { name } = req.query;
      if (!name) {
        return res.status(400).json({
          success: false,
          error: 'Name parameter is required'
        });
      }
      const concepts = await KeyConcepts.findByName(name);
      res.json({
        success: true,
        data: concepts
      });
    } catch (error) {
      console.error('Error searching concepts by name:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  async getTopConcepts(req, res) {
    try {
      const { bookId } = req.params;
      const { limit = 10 } = req.query;
      const concepts = await KeyConcepts.getTopConcepts(bookId, parseInt(limit));
      res.json({
        success: true,
        data: concepts
      });
    } catch (error) {
      console.error('Error fetching top concepts:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  async getRelatedConcepts(req, res) {
    try {
      const concepts = await KeyConcepts.getRelatedConcepts(req.params.id);
      res.json({
        success: true,
        data: concepts
      });
    } catch (error) {
      console.error('Error fetching related concepts:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  async update(req, res) {
    try {
      const concept = await KeyConcepts.update(req.params.id, req.body);
      if (!concept) {
        return res.status(404).json({
          success: false,
          error: 'Key concept not found'
        });
      }
      res.json({
        success: true,
        data: concept
      });
    } catch (error) {
      console.error('Error updating key concept:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  async delete(req, res) {
    try {
      const concept = await KeyConcepts.delete(req.params.id);
      if (!concept) {
        return res.status(404).json({
          success: false,
          error: 'Key concept not found'
        });
      }
      res.json({
        success: true,
        data: concept
      });
    } catch (error) {
      console.error('Error deleting key concept:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  async getStats(req, res) {
    try {
      const { bookId } = req.query;
      const stats = await KeyConcepts.getConceptStats(bookId);
      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Error fetching concept stats:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
};

module.exports = keyConceptsController;