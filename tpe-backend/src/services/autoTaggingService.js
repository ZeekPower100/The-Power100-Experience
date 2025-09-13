const { safeJsonParse, safeJsonStringify } = require('../utils/jsonHelpers');

/**
 * Auto-Tagging Service
 * Core service for automatic content tagging using AI and rule-based systems
 */

const pool = require('../config/database');
const openAIService = require('./openAIService');

class AutoTaggingService {
  /**
   * Tag a single entity with AI-generated tags
   */
  async tagEntity(entityType, entityId, content, metadata = {}) {
    try {
      console.log(`🏷️ Starting auto-tagging for ${entityType} #${entityId}`);
      
      // Check if OpenAI is configured
      if (!openAIService.isReady()) {
        console.warn('⚠️ OpenAI not configured, using rule-based tagging only');
        return await this.applyRuleBasedTags(entityType, entityId, content, metadata);
      }

      // Generate AI tags
      const aiResults = await openAIService.generateTags(
        content, 
        entityType, 
        metadata.revenueRange
      );

      // Get existing tags from database
      const existingTags = await this.getExistingTags();
      
      // Match AI-generated tags with database tags
      const matchedTags = await this.matchTags(aiResults.tags, existingTags);
      
      // Apply tags to entity
      const appliedTags = await this.applyTags(
        entityType, 
        entityId, 
        matchedTags, 
        metadata
      );

      // Also apply rule-based tags
      const ruleTags = await this.applyRuleBasedTags(
        entityType, 
        entityId, 
        content, 
        metadata
      );

      return {
        success: true,
        aiTags: appliedTags,
        ruleTags: ruleTags,
        insights: aiResults.insights,
        processingTime: aiResults.processingTime
      };

    } catch (error) {
      console.error(`Error tagging ${entityType} #${entityId}:`, error);
      return {
        success: false,
        error: error.message,
        aiTags: [],
        ruleTags: []
      };
    }
  }

  /**
   * Get all existing tags from database
   */
  async getExistingTags() {
    const result = await pool.query(`
      SELECT id, tag_name, tag_category, description
      FROM content_tags
      WHERE is_active = true
      ORDER BY tag_category, tag_name
    `);
    return result.rows;
  }

  /**
   * Match AI-generated tags with existing database tags
   */
  async matchTags(aiTags, existingTags) {
    const matched = [];
    
    console.log(`🔍 Matching ${aiTags.length} AI tags with ${existingTags.length} database tags`);
    
    for (const aiTag of aiTags) {
      console.log(`  Looking for: "${aiTag.name}" (${aiTag.category})`);
      
      // Try exact match first
      let dbTag = existingTags.find(t => 
        t.tag_name.toLowerCase() === aiTag.name.toLowerCase()
      );
      
      // Try synonym match if no exact match
      if (!dbTag) {
        const synonymResult = await pool.query(`
          SELECT ct.* FROM content_tags ct
          JOIN tag_synonyms ts ON ct.id = ts.tag_id
          WHERE LOWER(ts.synonym) = LOWER($1)
          AND ct.is_active = true
          LIMIT 1
        `, [aiTag.name]);
        
        if (synonymResult.rows.length > 0) {
          dbTag = synonymResult.rows[0];
        }
      }
      
      // Create new tag if no match found
      if (!dbTag) {
        const insertResult = await pool.query(`
          INSERT INTO content_tags (tag_name, tag_category, description)
          VALUES ($1, $2, $3)
          RETURNING *
        `, [aiTag.name, aiTag.category || 'custom', aiTag.reasoning || null]);
        
        dbTag = insertResult.rows[0];
      }
      
      console.log(`    ✅ Matched with database tag ID ${dbTag.id}: "${dbTag.tag_name}"`);
      
      matched.push({
        tagId: dbTag.id,
        tagName: dbTag.tag_name,
        category: dbTag.tag_category,
        confidence: aiTag.confidence || 0.8
      });
    }
    
    return matched;
  }

  /**
   * Apply tags to an entity
   */
  async applyTags(entityType, entityId, tags, metadata = {}) {
    const appliedTags = [];
    
    for (const tag of tags) {
      try {
        await pool.query(`
          INSERT INTO tagged_content 
          (entity_type, entity_id, tag_id, confidence_score, tagged_by, 
           revenue_ranges, metadata, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
          ON CONFLICT (entity_type, entity_id, tag_id) 
          DO UPDATE SET 
            confidence_score = EXCLUDED.confidence_score,
            metadata = EXCLUDED.metadata
        `, [
          entityType,
          entityId,
          tag.tagId,
          tag.confidence,
          'ai',
          metadata.revenueRanges || null,
          safeJsonStringify(metadata),
        ]);
        
        appliedTags.push(tag);
      } catch (error) {
        console.error(`Error applying tag ${tag.tagName}:`, error.message);
        console.error('Full error:', error);
        // Still add the tag to the list to show it was attempted
        appliedTags.push({
          ...tag,
          error: error.message
        });
      }
    }
    
    return appliedTags;
  }

  /**
   * Apply rule-based tags based on keywords and patterns
   */
  async applyRuleBasedTags(entityType, entityId, content, metadata = {}) {
    // Get active rules for this entity type
    const rulesResult = await pool.query(`
      SELECT * FROM tag_rules
      WHERE is_active = true
      AND ($1 = ANY(entity_types) OR entity_types IS NULL)
      ORDER BY priority DESC
    `, [entityType]);
    
    const appliedTags = [];
    
    for (const rule of rulesResult.rows) {
      const conditions = rule.conditions || {};
      const actions = rule.actions || {};
      
      // Check if rule conditions are met
      if (this.checkRuleConditions(content, conditions, metadata)) {
        // Apply the tags specified in actions
        for (const tagId of (actions.apply_tags || [])) {
          try {
            await pool.query(`
              INSERT INTO tagged_content 
              (entity_type, entity_id, tag_id, confidence_score, tagged_by, 
               revenue_ranges, metadata, created_at)
              VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
              ON CONFLICT (entity_type, entity_id, tag_id) DO NOTHING
            `, [
              entityType,
              entityId,
              tagId,
              actions.confidence || 0.7,
              'rule',
              metadata.revenueRanges || null,
              safeJsonStringify({ rule_id: rule.id, rule_name: rule.rule_name })
            ]);
            
            appliedTags.push({
              tagId: tagId,
              ruleName: rule.rule_name,
              confidence: actions.confidence || 0.7
            });
          } catch (error) {
            console.error(`Error applying rule-based tag:`, error);
          }
        }
      }
    }
    
    return appliedTags;
  }

  /**
   * Check if rule conditions are met
   */
  checkRuleConditions(content, conditions, metadata) {
    const contentLower = content.toLowerCase();
    
    // Check keyword conditions
    if (conditions.keywords) {
      const keywordMatch = conditions.keywords.some(keyword => 
        contentLower.includes(keyword.toLowerCase())
      );
      if (!keywordMatch) return false;
    }
    
    // Check pattern conditions (regex)
    if (conditions.patterns) {
      const patternMatch = conditions.patterns.some(pattern => {
        try {
          const regex = new RegExp(pattern, 'i');
          return regex.test(content);
        } catch (error) {
          console.error(`Invalid regex pattern: ${pattern}`);
          return false;
        }
      });
      if (!patternMatch) return false;
    }
    
    // Check revenue range conditions
    if (conditions.revenue_ranges && metadata.revenueRange) {
      if (!conditions.revenue_ranges.includes(metadata.revenueRange)) {
        return false;
      }
    }
    
    // Check minimum content length
    if (conditions.min_length && content.length < conditions.min_length) {
      return false;
    }
    
    return true;
  }

  /**
   * Get tags for an entity
   */
  async getEntityTags(entityType, entityId) {
    const result = await pool.query(`
      SELECT 
        tc.*,
        ct.tag_name,
        ct.tag_category,
        ct.description
      FROM tagged_content tc
      JOIN content_tags ct ON tc.tag_id = ct.id
      WHERE tc.entity_type = $1 AND tc.entity_id = $2
      ORDER BY tc.confidence_score DESC
    `, [entityType, entityId]);
    
    return result.rows;
  }

  /**
   * Remove tags from an entity
   */
  async removeEntityTags(entityType, entityId, tagIds = null) {
    if (tagIds && tagIds.length > 0) {
      // Remove specific tags
      await pool.query(`
        DELETE FROM tagged_content
        WHERE entity_type = $1 AND entity_id = $2 AND tag_id = ANY($3)
      `, [entityType, entityId, tagIds]);
    } else {
      // Remove all tags
      await pool.query(`
        DELETE FROM tagged_content
        WHERE entity_type = $1 AND entity_id = $2
      `, [entityType, entityId]);
    }
  }

  /**
   * Batch tag multiple entities
   */
  async batchTagEntities(entities) {
    const results = [];
    
    for (const entity of entities) {
      const result = await this.tagEntity(
        entity.type,
        entity.id,
        entity.content,
        entity.metadata
      );
      results.push({
        entityId: entity.id,
        entityType: entity.type,
        ...result
      });
    }
    
    return results;
  }

  /**
   * Get tag statistics
   */
  async getTagStatistics() {
    const result = await pool.query(`
      SELECT 
        ct.tag_name,
        ct.tag_category,
        ct.usage_count,
        COUNT(DISTINCT tc.entity_id) as unique_entities,
        AVG(tc.confidence_score) as avg_confidence,
        COUNT(CASE WHEN tc.tagged_by = 'ai' THEN 1 END) as ai_tagged,
        COUNT(CASE WHEN tc.tagged_by = 'rule' THEN 1 END) as rule_tagged,
        COUNT(CASE WHEN tc.tagged_by = 'manual' THEN 1 END) as manual_tagged
      FROM content_tags ct
      LEFT JOIN tagged_content tc ON ct.id = tc.tag_id
      GROUP BY ct.id, ct.tag_name, ct.tag_category, ct.usage_count
      ORDER BY ct.usage_count DESC
    `);
    
    return result.rows;
  }

  /**
   * Search entities by tags
   */
  async searchByTags(tagIds, entityType = null) {
    let query = `
      SELECT 
        tc.entity_type,
        tc.entity_id,
        COUNT(DISTINCT tc.tag_id) as matching_tags,
        AVG(tc.confidence_score) as avg_confidence,
        array_agg(ct.tag_name) as tag_names
      FROM tagged_content tc
      JOIN content_tags ct ON tc.tag_id = ct.id
      WHERE tc.tag_id = ANY($1)
    `;
    
    const params = [tagIds];
    
    if (entityType) {
      query += ` AND tc.entity_type = $2`;
      params.push(entityType);
    }
    
    query += `
      GROUP BY tc.entity_type, tc.entity_id
      ORDER BY matching_tags DESC, avg_confidence DESC
    `;
    
    const result = await pool.query(query, params);
    return result.rows;
  }

  /**
   * Get recommended tags based on content
   */
  async getRecommendedTags(content, limit = 10) {
    // This would typically use more sophisticated ML models
    // For now, use keyword matching
    const keywords = content.toLowerCase().split(/\s+/);
    
    const result = await pool.query(`
      SELECT DISTINCT ct.*
      FROM content_tags ct
      WHERE ct.is_active = true
      AND (
        LOWER(ct.tag_name) = ANY($1)
        OR EXISTS (
          SELECT 1 FROM tag_synonyms ts
          WHERE ts.tag_id = ct.id
          AND LOWER(ts.synonym) = ANY($1)
        )
      )
      LIMIT $2
    `, [keywords, limit]);
    
    return result.rows;
  }
}

// Export singleton instance
module.exports = new AutoTaggingService();