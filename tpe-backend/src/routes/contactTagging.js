// Contact Tagging API Routes
const express = require('express');
const contactTaggingService = require('../services/contactTaggingService');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Get contacts by tags (for Power Cards campaign creation)
router.get('/contacts', protect, async (req, res) => {
  try {
    const { tags, contact_type, limit = 100 } = req.query;
    
    const tagArray = tags ? tags.split(',').map(tag => tag.trim()) : [];
    const contacts = await contactTaggingService.getContactsByTag(tagArray, contact_type);
    
    res.json({
      success: true,
      contacts: contacts.slice(0, parseInt(limit)),
      total: contacts.length,
      filters: {
        tags: tagArray,
        contact_type
      }
    });
  } catch (error) {
    console.error('Error fetching contacts:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Get contact statistics for admin dashboard
router.get('/stats', protect, async (req, res) => {
  try {
    const stats = await contactTaggingService.getContactStats();
    
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Error fetching contact stats:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Add tags to a contact
router.post('/contacts/:id/tags', protect, async (req, res) => {
  try {
    const { id } = req.params;
    const { tags = [] } = req.body;
    
    if (!Array.isArray(tags)) {
      return res.status(400).json({
        success: false,
        message: 'Tags must be an array'
      });
    }
    
    const result = await contactTaggingService.addTagsToContact(parseInt(id), tags);
    
    if (result.success) {
      res.json({
        success: true,
        message: 'Tags added successfully',
        tags: result.tags
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.error
      });
    }
  } catch (error) {
    console.error('Error adding tags:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Get available tags for filtering
router.get('/tags', protect, async (req, res) => {
  try {
    const stats = await contactTaggingService.getContactStats();
    
    // Extract unique tags from all contacts
    const allTags = new Set();
    stats.byTags.forEach(stat => {
      stat.tags.forEach(tag => allTags.add(tag));
    });
    
    const tagList = Array.from(allTags).sort();
    
    res.json({
      success: true,
      tags: tagList,
      usage: stats.byTags
    });
  } catch (error) {
    console.error('Error fetching tags:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Manually re-tag contacts (admin function)
router.post('/retag', protect, async (req, res) => {
  try {
    const { contact_ids = [], additional_tags = [] } = req.body;
    
    if (!Array.isArray(contact_ids)) {
      return res.status(400).json({
        success: false,
        message: 'contact_ids must be an array'
      });
    }
    
    const results = [];
    
    for (const contactId of contact_ids) {
      const result = await contactTaggingService.addTagsToContact(contactId, additional_tags);
      results.push({
        contact_id: contactId,
        success: result.success,
        tags: result.tags,
        error: result.error
      });
    }
    
    res.json({
      success: true,
      message: 'Retagging completed',
      results
    });
  } catch (error) {
    console.error('Error retagging contacts:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

module.exports = router;