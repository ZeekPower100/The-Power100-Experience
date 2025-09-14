const DemoSegments = require('../models/demoSegments');

const demoSegmentsController = {
  // Create new demo segment
  async create(req, res) {
    try {
      const segment = await DemoSegments.create(req.body);
      res.status(201).json({
        success: true,
        data: segment
      });
    } catch (error) {
      console.error('Error creating demo segment:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  // Get segment by ID
  async getById(req, res) {
    try {
      const segment = await DemoSegments.findById(req.params.id);
      if (!segment) {
        return res.status(404).json({
          success: false,
          error: 'Segment not found'
        });
      }
      res.json({
        success: true,
        data: segment
      });
    } catch (error) {
      console.error('Error fetching segment:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  // Get segments by video ID
  async getByVideoId(req, res) {
    try {
      const segments = await DemoSegments.findByVideoId(req.params.videoId);
      res.json({
        success: true,
        data: segments,
        count: segments.length
      });
    } catch (error) {
      console.error('Error fetching segments by video:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  // Get segments by type
  async getByType(req, res) {
    try {
      const segments = await DemoSegments.findByType(req.params.type);
      res.json({
        success: true,
        data: segments,
        count: segments.length
      });
    } catch (error) {
      console.error('Error fetching segments by type:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  // Update segment
  async update(req, res) {
    try {
      const segment = await DemoSegments.update(req.params.id, req.body);
      if (!segment) {
        return res.status(404).json({
          success: false,
          error: 'Segment not found'
        });
      }
      res.json({
        success: true,
        data: segment
      });
    } catch (error) {
      console.error('Error updating segment:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  // Delete segment
  async delete(req, res) {
    try {
      const segment = await DemoSegments.delete(req.params.id);
      if (!segment) {
        return res.status(404).json({
          success: false,
          error: 'Segment not found'
        });
      }
      res.json({
        success: true,
        data: segment,
        message: 'Segment deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting segment:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  // Delete all segments for a video
  async deleteByVideoId(req, res) {
    try {
      const segments = await DemoSegments.deleteByVideoId(req.params.videoId);
      res.json({
        success: true,
        data: segments,
        count: segments.length,
        message: `${segments.length} segments deleted successfully`
      });
    } catch (error) {
      console.error('Error deleting segments by video:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  // Get high scoring segments
  async getHighScoring(req, res) {
    try {
      const minScore = parseFloat(req.query.min_score) || 0.8;
      const segments = await DemoSegments.getHighScoringSegments(minScore);
      res.json({
        success: true,
        data: segments,
        count: segments.length,
        min_score: minScore
      });
    } catch (error) {
      console.error('Error fetching high scoring segments:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  // Get segments needing improvement
  async getNeedingImprovement(req, res) {
    try {
      const segments = await DemoSegments.getSegmentsByImprovement();
      res.json({
        success: true,
        data: segments,
        count: segments.length
      });
    } catch (error) {
      console.error('Error fetching segments needing improvement:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  // Get segment statistics for a video
  async getStats(req, res) {
    try {
      const stats = await DemoSegments.getSegmentStats(req.params.videoId);
      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Error fetching segment stats:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  // Create multiple segments at once
  async createBatch(req, res) {
    try {
      const { segments } = req.body;
      if (!Array.isArray(segments)) {
        return res.status(400).json({
          success: false,
          error: 'Segments must be an array'
        });
      }

      const createdSegments = [];
      for (const segmentData of segments) {
        const segment = await DemoSegments.create(segmentData);
        createdSegments.push(segment);
      }

      res.status(201).json({
        success: true,
        data: createdSegments,
        count: createdSegments.length
      });
    } catch (error) {
      console.error('Error creating batch segments:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
};

module.exports = demoSegmentsController;