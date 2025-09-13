/**
 * Auto-Tagging API Routes
 * Endpoints for content tagging and tag management
 */

const express = require('express');
const router = express.Router();
const autoTaggingService = require('../services/autoTaggingService');
const { protect: authenticateToken } = require('../middleware/auth');

/**
 * POST /api/tagging/tag-entity
 * Tag a single entity with AI and rule-based tags
 */
router.post('/tag-entity', authenticateToken, async (req, res) => {
  try {
    const { entityType, entityId, content, metadata } = req.body;
    
    if (!entityType || !entityId || !content) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: entityType, entityId, content'
      });
    }
    
    const result = await autoTaggingService.tagEntity(
      entityType,
      entityId,
      content,
      metadata || {}
    );
    
    res.json(result);
  } catch (error) {
    console.error('Error tagging entity:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/tagging/batch-tag
 * Tag multiple entities in batch
 */
router.post('/batch-tag', authenticateToken, async (req, res) => {
  try {
    const { entities } = req.body;
    
    if (!Array.isArray(entities) || entities.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Entities array is required'
      });
    }
    
    const results = await autoTaggingService.batchTagEntities(entities);
    
    res.json({
      success: true,
      results,
      summary: {
        total: results.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length
      }
    });
  } catch (error) {
    console.error('Error batch tagging:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/tagging/entity-tags/:entityType/:entityId
 * Get all tags for a specific entity
 */
router.get('/entity-tags/:entityType/:entityId', async (req, res) => {
  try {
    const { entityType, entityId } = req.params;
    
    const tags = await autoTaggingService.getEntityTags(entityType, entityId);
    
    res.json({
      success: true,
      tags,
      count: tags.length
    });
  } catch (error) {
    console.error('Error getting entity tags:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * DELETE /api/tagging/entity-tags/:entityType/:entityId
 * Remove tags from an entity
 */
router.delete('/entity-tags/:entityType/:entityId', authenticateToken, async (req, res) => {
  try {
    const { entityType, entityId } = req.params;
    const { tagIds } = req.body;
    
    await autoTaggingService.removeEntityTags(entityType, entityId, tagIds);
    
    res.json({
      success: true,
      message: tagIds ? `Removed ${tagIds.length} tags` : 'Removed all tags'
    });
  } catch (error) {
    console.error('Error removing tags:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/tagging/search-by-tags
 * Search entities by tag IDs
 */
router.post('/search-by-tags', async (req, res) => {
  try {
    const { tagIds, entityType } = req.body;
    
    if (!Array.isArray(tagIds) || tagIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'tagIds array is required'
      });
    }
    
    const results = await autoTaggingService.searchByTags(tagIds, entityType);
    
    res.json({
      success: true,
      results,
      count: results.length
    });
  } catch (error) {
    console.error('Error searching by tags:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/tagging/statistics
 * Get tag usage statistics
 */
router.get('/statistics', async (req, res) => {
  try {
    const stats = await autoTaggingService.getTagStatistics();
    
    res.json({
      success: true,
      statistics: stats,
      summary: {
        totalTags: stats.length,
        mostUsed: stats[0],
        categories: [...new Set(stats.map(s => s.tag_category))]
      }
    });
  } catch (error) {
    console.error('Error getting tag statistics:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/tagging/tags
 * Get all available tags
 */
router.get('/tags', async (req, res) => {
  try {
    const tags = await autoTaggingService.getExistingTags();
    
    res.json({
      success: true,
      tags,
      count: tags.length
    });
  } catch (error) {
    console.error('Error getting tags:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/tagging/recommend-tags
 * Get recommended tags for content
 */
router.post('/recommend-tags', async (req, res) => {
  try {
    const { content, limit = 10 } = req.body;
    
    if (!content) {
      return res.status(400).json({
        success: false,
        error: 'Content is required'
      });
    }
    
    const recommendations = await autoTaggingService.getRecommendedTags(content, limit);
    
    res.json({
      success: true,
      recommendations,
      count: recommendations.length
    });
  } catch (error) {
    console.error('Error getting tag recommendations:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/tagging/auto-tag-partner/:id
 * Auto-tag a partner based on their profile
 */
router.post('/auto-tag-partner/:id', authenticateToken, async (req, res) => {
  try {
    const partnerId = req.params.id;
    
    // Get partner data (would normally fetch from database)
    // For now, use provided data
    const { partnerData } = req.body;
    
    if (!partnerData) {
      return res.status(400).json({
        success: false,
        error: 'Partner data is required'
      });
    }
    
    // Combine partner fields into content for tagging
    const content = `
      Company: ${partnerData.company_name || ''}
      Services: ${partnerData.service_capabilities || ''}
      Value Proposition: ${partnerData.value_proposition || ''}
      Target Market: ${partnerData.target_market || ''}
      Success Stories: ${partnerData.success_stories || ''}
      Focus Areas: ${partnerData.focus_areas || ''}
    `;
    
    const result = await autoTaggingService.tagEntity(
      'partner',
      partnerId,
      content,
      {
        revenueRange: partnerData.target_revenue_range,
        focusAreas: partnerData.focus_areas
      }
    );
    
    res.json(result);
  } catch (error) {
    console.error('Error auto-tagging partner:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;