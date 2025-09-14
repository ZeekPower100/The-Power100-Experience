const recommendationService = require('../services/recommendationService');
const ContractorPreferences = require('../models/contractorPreferences');
const RecommendationConfig = require('../models/recommendationConfig');
const TrendingContent = require('../models/trendingContent');
const ContentSimilarity = require('../models/contentSimilarity');

// Generate recommendations for a contractor
exports.generateRecommendations = async (req, res) => {
  try {
    const { contractor_id } = req.params;
    const { type, limit, include_reasons } = req.query;

    const options = {
      limit: parseInt(limit) || 10,
      include_reasons: include_reasons === 'true'
    };

    // Use entity_type to match database column name exactly
    if (type && type !== 'all') {
      options.entity_type = type;  // Singular to match database
    }

    const recommendations = await recommendationService.generateRecommendations(
      contractor_id,
      options
    );

    res.json({
      success: true,
      data: recommendations,
      message: 'Recommendations generated successfully'
    });
  } catch (error) {
    console.error('Error generating recommendations:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Get or create contractor preferences
exports.getPreferences = async (req, res) => {
  try {
    const { contractor_id } = req.params;

    let preferences = await ContractorPreferences.findByContractorId(contractor_id);

    // Create default preferences if none exist
    if (!preferences) {
      preferences = await ContractorPreferences.create({ contractor_id });
    }

    res.json({
      success: true,
      data: preferences,
      message: 'Preferences retrieved successfully'
    });
  } catch (error) {
    console.error('Error getting preferences:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Update contractor preferences
exports.updatePreferences = async (req, res) => {
  try {
    const { contractor_id } = req.params;
    const updates = req.body;

    const preferences = await ContractorPreferences.upsert({
      contractor_id,
      ...updates
    });

    res.json({
      success: true,
      data: preferences,
      message: 'Preferences updated successfully'
    });
  } catch (error) {
    console.error('Error updating preferences:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Get trending content
exports.getTrending = async (req, res) => {
  try {
    const { entity_type, time_window, limit } = req.query;

    let trending;
    if (entity_type) {
      trending = await TrendingContent.findTrending(
        entity_type,
        time_window || 'weekly',
        parseInt(limit) || 10
      );
    } else {
      trending = await TrendingContent.findAllTrending(
        time_window || 'weekly',
        parseInt(limit) || 20
      );
    }

    res.json({
      success: true,
      data: trending,
      message: 'Trending content retrieved successfully'
    });
  } catch (error) {
    console.error('Error getting trending content:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Get similar content
exports.getSimilarContent = async (req, res) => {
  try {
    const { entity_type, entity_id } = req.params;
    const { limit } = req.query;

    const similar = await ContentSimilarity.findSimilar(
      entity_type,
      entity_id,
      parseInt(limit) || 10
    );

    res.json({
      success: true,
      data: similar,
      message: 'Similar content retrieved successfully'
    });
  } catch (error) {
    console.error('Error getting similar content:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Track recommendation interaction
exports.trackInteraction = async (req, res) => {
  try {
    const { recommendation_id } = req.params;
    const { action, contractor_id, metadata } = req.body;

    const result = await recommendationService.trackRecommendationInteraction(
      recommendation_id,
      contractor_id,
      action,
      metadata
    );

    res.json({
      success: true,
      data: result,
      message: 'Interaction tracked successfully'
    });
  } catch (error) {
    console.error('Error tracking interaction:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Get recommendation config
exports.getConfig = async (req, res) => {
  try {
    const { config_name } = req.params;

    let config;
    if (config_name) {
      config = await RecommendationConfig.findByName(config_name);
    } else {
      config = await RecommendationConfig.findAll();
    }

    res.json({
      success: true,
      data: config,
      message: 'Configuration retrieved successfully'
    });
  } catch (error) {
    console.error('Error getting config:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Update recommendation config
exports.updateConfig = async (req, res) => {
  try {
    const { config_name } = req.params;
    const updates = req.body;

    const config = await RecommendationConfig.update(config_name, updates);

    res.json({
      success: true,
      data: config,
      message: 'Configuration updated successfully'
    });
  } catch (error) {
    console.error('Error updating config:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Calculate content similarities
exports.calculateSimilarities = async (req, res) => {
  try {
    const { entity_type, entity_id } = req.body;

    // This would typically be a background job
    // For now, just return a success message
    const message = `Similarity calculation initiated for ${entity_type}:${entity_id}`;

    // In production, you'd queue this as a background job
    // await similarityCalculationQueue.add({ entity_type, entity_id });

    res.json({
      success: true,
      data: { message },
      message: 'Similarity calculation started'
    });
  } catch (error) {
    console.error('Error calculating similarities:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Update trending scores
exports.updateTrending = async (req, res) => {
  try {
    const { time_window } = req.body;

    // This would typically be a background job
    const updated = await TrendingContent.updateAllTrending(time_window || 'weekly');

    res.json({
      success: true,
      data: { count: updated.length },
      message: 'Trending scores updated successfully'
    });
  } catch (error) {
    console.error('Error updating trending:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Get recommendation performance metrics
exports.getPerformanceMetrics = async (req, res) => {
  try {
    const { start_date, end_date } = req.query;

    const metrics = await recommendationService.getPerformanceMetrics(
      start_date,
      end_date
    );

    res.json({
      success: true,
      data: metrics,
      message: 'Performance metrics retrieved successfully'
    });
  } catch (error) {
    console.error('Error getting performance metrics:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};