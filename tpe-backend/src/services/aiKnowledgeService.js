const { query } = require('../config/database');
const schemaDiscovery = require('./schemaDiscoveryService');
const { safeJsonParse, safeJsonStringify } = require('../utils/jsonHelpers');

/**
 * AI Knowledge Service
 * Centralized service for managing AI knowledge base
 * Uses auto-discovered schema to dynamically fetch and cache data
 */
class AIKnowledgeService {
  constructor() {
    this.knowledgeCache = {};
    this.cacheExpiry = 3600000; // 1 hour in milliseconds
    this.lastCacheTime = {};
  }

  /**
   * Get comprehensive knowledge base for AI Concierge
   * Automatically includes all AI-relevant tables and fields
   */
  async getComprehensiveKnowledge(contractorId = null) {
    try {
      console.log('[AIKnowledge] Building comprehensive knowledge base...');

      // Get AI-relevant schema
      const relevantSchema = await schemaDiscovery.getAIRelevantSchema();
      const knowledge = {};

      // Fetch data for each relevant table
      for (const [tableName, tableInfo] of Object.entries(relevantSchema)) {
        console.log(`[AIKnowledge] Processing table: ${tableName}, isEntity: ${tableInfo.isEntityTable}, apiName: ${tableInfo.apiPropertyName}`);
        if (!tableInfo.isEntityTable) continue;

        // Build dynamic query based on discovered columns
        const columns = Object.keys(tableInfo.columns)
          .filter(col => !tableInfo.columns[col].isSensitive || tableInfo.columns[col].isAIProcessed)
          .join(', ');

        if (!columns) continue;

        // Use API property name for caching
        const apiKey = tableInfo.apiPropertyName || tableName;

        // Check cache first
        if (this.isCacheValid(apiKey)) {
          knowledge[apiKey] = this.knowledgeCache[apiKey];
          continue;
        }

        try {
          // Build query with active filter if available
          let queryStr = `SELECT ${columns} FROM ${tableName}`;
          const conditions = [];

          // Add common filters
          if (tableInfo.columns.is_active) {
            conditions.push('is_active = true');
          }
          if (tableInfo.columns.status) {
            // Use actual status values from our database
            if (tableName === 'strategic_partners') {
              // Only show approved partners - this is the benefit of approval
              conditions.push("status = 'approved'");
            } else {
              conditions.push("status IN ('published', 'active', 'approved')");
            }
          }

          if (conditions.length > 0) {
            queryStr += ' WHERE ' + conditions.join(' AND ');
          }

          // Add reasonable limits for performance
          queryStr += ' LIMIT 100';

          const result = await query(queryStr);

          knowledge[apiKey] = {
            data: result.rows,
            count: result.rows.length,
            hasAIFields: tableInfo.hasAIFields,
            aiFields: tableInfo.columns ? Object.keys(tableInfo.columns)
              .filter(col => tableInfo.columns[col].isAIProcessed) : [],
            relationships: tableInfo.relatedEntities || []
          };

          // Cache with API key
          this.knowledgeCache[apiKey] = knowledge[apiKey];
          this.lastCacheTime[apiKey] = Date.now();

          console.log(`[AIKnowledge] Loaded ${result.rows.length} ${tableName} as ${apiKey}`);
        } catch (error) {
          console.error(`[AIKnowledge] Error loading ${tableName}:`, error.message);
          knowledge[tableName] = { data: [], error: error.message };
        }
      }

      // Get aggregated statistics (privacy-safe)
      if (contractorId) {
        knowledge.industryStats = await this.getIndustryStatistics(contractorId);
      }

      // Add metadata about the knowledge base
      knowledge._metadata = {
        generatedAt: new Date().toISOString(),
        tablesIncluded: Object.keys(knowledge).filter(k => k !== '_metadata'),
        totalRecords: Object.values(knowledge)
          .filter(k => k.data)
          .reduce((sum, k) => sum + (k.data?.length || 0), 0),
        aiFieldsAvailable: Object.values(knowledge)
          .filter(k => k.aiFields)
          .flatMap(k => k.aiFields),
        schemaVersion: await schemaDiscovery.lastDiscoveryTime
      };

      return knowledge;
    } catch (error) {
      console.error('[AIKnowledge] Error building knowledge base:', error);
      throw error;
    }
  }

  /**
   * Get specific entity data with AI enhancements
   */
  async getEntityKnowledge(entityType, filters = {}) {
    try {
      const relevantSchema = await schemaDiscovery.getAIRelevantSchema();
      const tableInfo = relevantSchema[entityType];

      if (!tableInfo) {
        throw new Error(`Entity type ${entityType} not found in schema`);
      }

      // Build dynamic query
      const columns = Object.keys(tableInfo.columns)
        .filter(col => !tableInfo.columns[col].isSensitive || tableInfo.columns[col].isAIProcessed)
        .join(', ');

      let queryStr = `SELECT ${columns} FROM ${entityType}`;
      const queryParams = [];
      const conditions = [];

      // Add filters
      if (tableInfo.columns.is_active && filters.activeOnly !== false) {
        conditions.push('is_active = true');
      }

      // Add custom filters
      Object.entries(filters).forEach(([key, value]) => {
        if (tableInfo.columns[key] && value !== undefined && key !== 'activeOnly') {
          queryParams.push(value);
          conditions.push(`${key} = $${queryParams.length}`);
        }
      });

      if (conditions.length > 0) {
        queryStr += ' WHERE ' + conditions.join(' AND ');
      }

      // Add ordering for AI fields
      const aiScoreFields = ['ai_confidence_score', 'ai_quality_score', 'powerconfidence_score'];
      const scoreField = aiScoreFields.find(field => tableInfo.columns[field]);
      if (scoreField) {
        queryStr += ` ORDER BY ${scoreField} DESC NULLS LAST`;
      }

      queryStr += ' LIMIT 50';

      const result = await query(queryStr, queryParams);

      return {
        entity: entityType,
        data: result.rows,
        count: result.rows.length,
        aiEnhanced: tableInfo.hasAIFields,
        aiFields: Object.keys(tableInfo.columns)
          .filter(col => tableInfo.columns[col].isAIProcessed)
      };
    } catch (error) {
      console.error(`[AIKnowledge] Error getting ${entityType} knowledge:`, error);
      throw error;
    }
  }

  /**
   * Get cross-entity relationships and insights
   */
  async getCrossEntityInsights(focusAreas = []) {
    try {
      // Debug logging
      console.log('[AIKnowledge] getCrossEntityInsights - focusAreas:', focusAreas, 'Type:', typeof focusAreas, 'IsArray:', Array.isArray(focusAreas));

      const insights = {};

      // Normalize focus areas to snake_case for consistent matching
      const normalizedFocusAreas = (focusAreas || []).map(area => {
        if (typeof area === 'string') {
          // Convert "Operational Efficiency" to "operational_efficiency"
          // Convert "Team Culture & Retention" to "team_culture_retention"
          return area.toLowerCase()
            .replace(/\s+&\s+/g, '_')  // Replace " & " with "_"
            .replace(/\s+/g, '_')       // Replace spaces with underscores
            .replace(/[^\w_]/g, '');   // Remove special chars except underscore
        }
        return area;
      }).filter(Boolean);

      console.log('[AIKnowledge] Normalized focus areas:', normalizedFocusAreas);

      // Get partners matching focus areas
      if (normalizedFocusAreas.length > 0) {
        // Since focus_areas_served is TEXT (JSON string), we need to check if any normalized area matches
        const partnerConditions = normalizedFocusAreas.map((area, index) =>
          `focus_areas_served LIKE $${index + 1}`
        ).join(' OR ');

        const partnerParams = normalizedFocusAreas.map(area => `%"${area}"%`);

        const partnersResult = await query(`
          SELECT
            company_name,
            focus_areas_served,
            key_differentiators,
            powerconfidence_score,
            ai_confidence_score
          FROM strategic_partners
          WHERE is_active = true
          AND (${partnerConditions})
          ORDER BY powerconfidence_score DESC NULLS LAST
          LIMIT 10
        `, partnerParams);
        insights.matchingPartners = partnersResult.rows;
      } else {
        // No focus areas - get top partners by score
        const partnersResult = await query(`
          SELECT
            company_name,
            focus_areas_served,
            key_differentiators,
            powerconfidence_score,
            ai_confidence_score
          FROM strategic_partners
          WHERE is_active = true
          ORDER BY powerconfidence_score DESC NULLS LAST
          LIMIT 10
        `);
        insights.matchingPartners = partnersResult.rows;
      }

      // Get related books
      if (normalizedFocusAreas.length > 0) {
        const bookConditions = normalizedFocusAreas.map((area, index) =>
          `focus_areas_covered LIKE $${index + 1}`
        ).join(' OR ');

        const bookParams = normalizedFocusAreas.map(area => `%"${area}"%`);

        const booksResult = await query(`
          SELECT
            title,
            author,
            focus_areas_covered,
            ai_summary,
            ai_insights
          FROM books
          WHERE status = 'published'
          AND (${bookConditions})
          LIMIT 10
        `, bookParams);
        insights.relevantBooks = booksResult.rows;
      } else {
        const booksResult = await query(`
          SELECT
            title,
            author,
            focus_areas_covered,
            ai_summary,
            ai_insights
          FROM books
          WHERE status = 'published'
          LIMIT 10
        `);
        insights.relevantBooks = booksResult.rows;
      }

      // Get related podcasts
      if (normalizedFocusAreas.length > 0) {
        const podcastConditions = normalizedFocusAreas.map((area, index) =>
          `focus_areas_covered LIKE $${index + 1}`
        ).join(' OR ');

        const podcastParams = normalizedFocusAreas.map(area => `%"${area}"%`);

        const podcastsResult = await query(`
          SELECT
            title,
            host,
            focus_areas_covered,
            ai_summary,
            actionable_insights
          FROM podcasts
          WHERE is_active = true
          AND status = 'published'
          AND (${podcastConditions})
          LIMIT 10
        `, podcastParams);
        insights.relevantPodcasts = podcastsResult.rows;
      } else {
        const podcastsResult = await query(`
          SELECT
            title,
            host,
            focus_areas_covered,
            ai_summary,
            actionable_insights
          FROM podcasts
          WHERE is_active = true
          AND status = 'published'
          LIMIT 10
        `);
        insights.relevantPodcasts = podcastsResult.rows;
      }

      // Get upcoming events
      if (normalizedFocusAreas.length > 0) {
        const eventConditions = normalizedFocusAreas.map((area, index) =>
          `focus_areas_covered LIKE $${index + 1}`
        ).join(' OR ');

        const eventParams = normalizedFocusAreas.map(area => `%"${area}"%`);

        const eventsResult = await query(`
          SELECT
            name,
            date,
            format,
            focus_areas_covered,
            ai_summary
          FROM events
          WHERE status = 'active'
          AND (date >= CURRENT_DATE OR format = 'recurring')
          AND (${eventConditions})
          ORDER BY date ASC
          LIMIT 10
        `, eventParams);
        insights.upcomingEvents = eventsResult.rows;
      } else {
        const eventsResult = await query(`
          SELECT
            name,
            date,
            format,
            focus_areas_covered,
            ai_summary
          FROM events
          WHERE status = 'active'
          AND (date >= CURRENT_DATE OR format = 'recurring')
          ORDER BY date ASC
          LIMIT 10
        `);
        insights.upcomingEvents = eventsResult.rows;
      }

      return insights;
    } catch (error) {
      console.error('[AIKnowledge] Error getting cross-entity insights:', error);
      throw error;
    }
  }

  /**
   * Get industry statistics (privacy-safe aggregates)
   */
  async getIndustryStatistics(excludeContractorId = null) {
    try {
      const stats = {};

      // Contractor statistics
      const contractorStats = await query(`
        SELECT 
          COUNT(DISTINCT id) as total_contractors,
          COUNT(DISTINCT CASE WHEN completed_at IS NOT NULL THEN id END) as completed_flows,
          AVG(CASE WHEN feedback_completion_status = 'completed' THEN 1 ELSE 0 END) * 100 as feedback_rate,
          json_agg(DISTINCT revenue_tier) FILTER (WHERE revenue_tier IS NOT NULL) as revenue_distribution,
          json_agg(DISTINCT team_size) FILTER (WHERE team_size IS NOT NULL) as team_sizes
        FROM contractors
        WHERE ($1::integer IS NULL OR id != $1)
      `, [excludeContractorId]);
      stats.contractors = contractorStats.rows[0];

      // Partner performance
      const partnerStats = await query(`
        SELECT 
          COUNT(*) as total_partners,
          AVG(powerconfidence_score) as avg_confidence,
          AVG(ai_confidence_score) as avg_ai_confidence,
          COUNT(DISTINCT CASE WHEN key_differentiators IS NOT NULL THEN id END) as with_differentiators
        FROM strategic_partners
        WHERE is_active = true
      `);
      stats.partners = partnerStats.rows[0];

      // Content statistics
      const contentStats = await query(`
        SELECT 
          (SELECT COUNT(*) FROM books WHERE status = 'published') as total_books,
          (SELECT COUNT(*) FROM podcasts WHERE is_active = true) as total_podcasts,
          (SELECT COUNT(*) FROM events WHERE status = 'active') as total_events,
          (SELECT COUNT(*) FROM books WHERE ai_summary IS NOT NULL) as books_with_ai,
          (SELECT COUNT(*) FROM podcasts WHERE ai_summary IS NOT NULL) as podcasts_with_ai
      `);
      stats.content = contentStats.rows[0];

      return stats;
    } catch (error) {
      console.error('[AIKnowledge] Error getting industry statistics:', error);
      return {};
    }
  }

  /**
   * Check if cache is still valid
   */
  isCacheValid(tableName) {
    if (!this.lastCacheTime[tableName]) return false;
    return (Date.now() - this.lastCacheTime[tableName]) < this.cacheExpiry;
  }

  /**
   * Clear all caches - useful when metadata changes
   */
  clearCache() {
    this.knowledgeCache = {};
    this.lastCacheTime = {};
    console.log('[AIKnowledge] Cache cleared');
  }

  /**
   * Clear all caches
   */
  clearCache() {
    this.knowledgeCache = {};
    this.lastCacheTime = {};
    console.log('[AIKnowledge] Cache cleared');
  }

  /**
   * Get summary of available knowledge
   */
  async getKnowledgeSummary() {
    const knowledge = await this.getComprehensiveKnowledge();
    return {
      tablesAvailable: knowledge._metadata.tablesIncluded,
      totalRecords: knowledge._metadata.totalRecords,
      aiFieldsAvailable: knowledge._metadata.aiFieldsAvailable.length,
      cacheStatus: Object.keys(this.lastCacheTime).map(table => ({
        table,
        cachedAt: new Date(this.lastCacheTime[table]).toISOString(),
        expiresIn: Math.max(0, this.cacheExpiry - (Date.now() - this.lastCacheTime[table])) / 1000 + ' seconds'
      }))
    };
  }
}

module.exports = new AIKnowledgeService();