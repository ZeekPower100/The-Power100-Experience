const { query } = require('../config/database');
const { safeJsonParse, safeJsonStringify } = require('../utils/jsonHelpers');

/**
 * Recommendation Algorithm v1 Service
 * Core recommendation engine for Phase 3: Basic AI Concierge
 * IMPORTANT: All field names match database columns exactly (no camelCase)
 */

class RecommendationService {
  /**
   * Generate recommendations for a contractor
   */
  async generateRecommendations(contractor_id, options = {}) {
    try {
      const {
        limit = 10,
        entity_type = null,  // Match database column name exactly
        force_refresh = false
      } = options;

      // Get contractor profile and preferences
      const contractor = await this.getContractorProfile(contractor_id);
      if (!contractor) {
        throw new Error(`Contractor ${contractor_id} not found`);
      }
      console.log('DEBUG: Contractor', contractor_id, 'focus areas:', contractor.focus_areas);

      // Get or create contractor preferences
      const preferences = await this.getOrCreatePreferences(contractor_id, contractor);

      // Get recommendation config
      const config = await this.getRecommendationConfig('content_recommendations');

      // Determine which entity types to generate recommendations for
      const types_to_process = entity_type ? [entity_type] : ['book', 'podcast', 'event', 'partner'];

      // Generate recommendations for each entity type
      const recommendations = [];

      for (const type of types_to_process) {
        const entityRecs = await this.generateEntityRecommendations(
          contractor,
          preferences,
          type,
          config,
          Math.ceil(limit / types_to_process.length)
        );
        recommendations.push(...entityRecs);
      }

      // Score and rank all recommendations
      const scored = await this.scoreRecommendations(recommendations, contractor, preferences, config);

      // Sort by total score and limit
      const sorted = scored.sort((a, b) => b.total_score - a.total_score).slice(0, limit);

      // Save to ai_recommendations table
      const saved = await this.saveRecommendations(contractor_id, sorted);

      return saved;
    } catch (error) {
      console.error('Error generating recommendations:', error);
      throw error;
    }
  }

  /**
   * Get contractor profile with exact database field names
   */
  async getContractorProfile(contractor_id) {
    const sql = `
      SELECT
        id, first_name, last_name, email, company_name,
        revenue_tier, team_size, focus_areas, readiness_indicators,
        services_offered, service_area,
        is_verified, created_at
      FROM contractors
      WHERE id = $1
    `;
    const result = await query(sql, [contractor_id]);

    if (result.rows[0]) {
      const contractor = result.rows[0];
      // Parse JSON fields
      contractor.focus_areas = safeJsonParse(contractor.focus_areas, []);
      contractor.readiness_indicators = safeJsonParse(contractor.readiness_indicators, []);
      contractor.services_offered = safeJsonParse(contractor.services_offered, []);
      return contractor;
    }
    return null;
  }

  /**
   * Get or create contractor preferences
   */
  async getOrCreatePreferences(contractor_id, contractor) {
    // Check if preferences exist
    let result = await query(
      'SELECT * FROM contractor_preferences WHERE contractor_id = $1',
      [contractor_id]
    );

    if (result.rows[0]) {
      const prefs = result.rows[0];
      prefs.content_preferences = safeJsonParse(prefs.content_preferences, {});
      prefs.topic_preferences = safeJsonParse(prefs.topic_preferences, {});
      prefs.communication_preferences = safeJsonParse(prefs.communication_preferences, {});
      return prefs;
    }

    // Create default preferences based on contractor profile
    const topic_preferences = {};
    if (contractor.focus_areas && contractor.focus_areas.length > 0) {
      contractor.focus_areas.forEach(area => {
        topic_preferences[area] = 0.8; // High preference for their focus areas
      });
    }

    const insertSql = `
      INSERT INTO contractor_preferences (
        contractor_id,
        content_preferences,
        topic_preferences,
        communication_preferences
      ) VALUES ($1, $2, $3, $4)
      RETURNING *
    `;

    const defaultPrefs = {
      video: 0.5,
      audio: 0.5,
      text: 0.5
    };

    const defaultComm = {
      email: true,
      sms: false,
      in_app: true
    };

    result = await query(insertSql, [
      contractor_id,
      safeJsonStringify(defaultPrefs),
      safeJsonStringify(topic_preferences),
      safeJsonStringify(defaultComm)
    ]);

    const prefs = result.rows[0];
    prefs.content_preferences = safeJsonParse(prefs.content_preferences, {});
    prefs.topic_preferences = safeJsonParse(prefs.topic_preferences, {});
    prefs.communication_preferences = safeJsonParse(prefs.communication_preferences, {});
    return prefs;
  }

  /**
   * Get recommendation configuration
   */
  async getRecommendationConfig(config_name) {
    const result = await query(
      'SELECT * FROM recommendation_config WHERE config_name = $1 AND is_active = true',
      [config_name]
    );

    if (result.rows[0]) {
      const config = result.rows[0];
      config.weights = safeJsonParse(config.weights, {
        relevance: 0.35,
        recency: 0.20,
        popularity: 0.20,
        personalization: 0.25
      });
      return config;
    }

    // Return default if not found
    return {
      weights: {
        relevance: 0.35,
        recency: 0.20,
        popularity: 0.20,
        personalization: 0.25
      },
      min_confidence_score: 0.60,
      max_recommendations: 10
    };
  }

  /**
   * Generate recommendations for a specific entity type
   */
  async generateEntityRecommendations(contractor, preferences, entity_type, config, limit) {
    const recommendations = [];

    console.log('DEBUG: generateEntityRecommendations called with entity_type:', entity_type);

    switch (entity_type) {
      case 'book':
        recommendations.push(...await this.recommendBooks(contractor, preferences, limit));
        break;
      case 'podcast':
        recommendations.push(...await this.recommendPodcasts(contractor, preferences, limit));
        break;
      case 'event':
        recommendations.push(...await this.recommendEvents(contractor, preferences, limit));
        break;
      case 'partner':
        recommendations.push(...await this.recommendPartners(contractor, preferences, limit));
        break;
    }

    return recommendations;
  }

  /**
   * Recommend books based on focus areas and preferences
   */
  async recommendBooks(contractor, preferences, limit) {
    const focus_areas = contractor.focus_areas || [];
    if (focus_areas.length === 0) return [];

    // Build query to find relevant books
    const sql = `
      SELECT
        id, title, author, description,
        focus_areas_covered, topics, key_takeaways,
        difficulty_level, reading_time, ai_insights,
        created_at
      FROM books
      WHERE is_active = true
      AND (
        focus_areas_covered::text ILIKE ANY($1)
        OR topics::text ILIKE ANY($1)
      )
      ORDER BY created_at DESC
      LIMIT $2
    `;

    // Create search patterns for each focus area
    const searchPatterns = focus_areas.map(area => `%${area}%`);

    const result = await query(sql, [searchPatterns, limit]);

    return result.rows.map(book => ({
      entity_type: 'book',
      entity_id: book.id,
      entity_name: book.title,
      reason: `Matches your focus on ${focus_areas.join(', ')}`,
      metadata: {
        author: book.author,
        difficulty_level: book.difficulty_level,
        reading_time: book.reading_time
      }
    }));
  }

  /**
   * Recommend podcasts based on focus areas
   */
  async recommendPodcasts(contractor, preferences, limit) {
    const focus_areas = contractor.focus_areas || [];
    if (focus_areas.length === 0) return [];

    const sql = `
      SELECT
        id, title, host, description,
        focus_areas_covered, topics,
        frequency, average_episode_length,
        created_at
      FROM podcasts
      WHERE is_active = true
      AND (
        focus_areas_covered::text ILIKE ANY($1)
        OR topics::text ILIKE ANY($1)
      )
      ORDER BY created_at DESC
      LIMIT $2
    `;

    const searchPatterns = focus_areas.map(area => `%${area}%`);
    const result = await query(sql, [searchPatterns, limit]);

    return result.rows.map(podcast => ({
      entity_type: 'podcast',
      entity_id: podcast.id,
      entity_name: podcast.title,
      reason: `Relevant podcast for ${focus_areas.join(', ')}`,
      metadata: {
        host: podcast.host,
        frequency: podcast.frequency,
        episode_length: podcast.average_episode_length
      }
    }));
  }

  /**
   * Recommend events based on timing and focus areas
   */
  async recommendEvents(contractor, preferences, limit) {
    const focus_areas = contractor.focus_areas || [];

    const sql = `
      SELECT
        id, name, date, registration_deadline,
        focus_areas_covered, location, format,
        created_at
      FROM events
      WHERE is_active = true
      AND date > CURRENT_DATE
      AND (
        $1::text[] IS NULL
        OR focus_areas_covered::text ILIKE ANY($1)
      )
      ORDER BY date ASC
      LIMIT $2
    `;

    const searchPatterns = focus_areas.length > 0 ? focus_areas.map(area => `%${area}%`) : null;
    const result = await query(sql, [searchPatterns, limit]);

    return result.rows.map(event => ({
      entity_type: 'event',
      entity_id: event.id,
      entity_name: event.name,
      reason: `Upcoming event on ${event.date}`,
      metadata: {
        date: event.date,
        location: event.location,
        format: event.format,
        registration_deadline: event.registration_deadline
      }
    }));
  }

  /**
   * Recommend partners based on focus areas and revenue tier
   */
  async recommendPartners(contractor, preferences, limit) {
    const focus_areas = contractor.focus_areas || [];
    const revenue_tier = contractor.revenue_tier;
    const services_offered = contractor.services_offered || [];

    console.log('DEBUG: recommendPartners - focus_areas:', focus_areas, 'revenue_tier:', revenue_tier, 'services:', services_offered);

    // Build WHERE conditions dynamically
    const whereClauses = ['sp.is_active = true'];
    const params = [];
    let paramCounter = 1;

    // Add focus areas condition using mapping table
    if (focus_areas.length > 0) {
      // First check if we have mappings, otherwise fall back to direct ILIKE matching
      const mappingCheckSql = `
        SELECT DISTINCT partner_focus_area
        FROM focus_area_mappings
        WHERE contractor_focus_area = ANY($1)
      `;
      const mappingResult = await query(mappingCheckSql, [focus_areas]);

      if (mappingResult.rows.length > 0) {
        // Use mapped focus areas
        const mappedAreas = mappingResult.rows.map(r => r.partner_focus_area);
        console.log('DEBUG: Using mapped focus areas:', mappedAreas);

        const focusConditions = mappedAreas.map(() => {
          params.push(`%${mappedAreas[params.length]}%`);
          return `sp.focus_areas_served::text ILIKE $${paramCounter++}`;
        });
        whereClauses.push(`(${focusConditions.join(' OR ')})`);
      } else {
        // Fallback to original ILIKE matching
        console.log('DEBUG: No mappings found, using direct ILIKE matching');
        const focusConditions = focus_areas.map(() => {
          params.push(`%${focus_areas[params.length]}%`);
          return `sp.focus_areas_served::text ILIKE $${paramCounter++}`;
        });
        whereClauses.push(`(${focusConditions.join(' OR ')})`);
      }
    }

    // Add revenue tier condition if provided
    if (revenue_tier) {
      params.push(`%${revenue_tier}%`);
      whereClauses.push(`sp.revenue_tiers::text ILIKE $${paramCounter++}`);
    }

    // Add services matching condition - match contractor's services with partner's ideal client services
    if (services_offered.length > 0) {
      console.log('DEBUG: Matching contractor services:', services_offered);

      // Match ANY of the contractor's services with partner's service_areas
      // This ensures partners who work with contractors offering these services
      const serviceConditions = services_offered.map((service) => {
        // Handle both formats: "Windows & Doors" and "windows_doors"
        const servicePattern = service.toLowerCase()
          .replace(/&/g, '')
          .replace(/\s+/g, '_')
          .replace(/__+/g, '_');

        params.push(`%${servicePattern}%`);
        return `sp.service_areas::text ILIKE $${paramCounter++}`;
      });

      if (serviceConditions.length > 0) {
        whereClauses.push(`(${serviceConditions.join(' OR ')})`);
      }
    }

    // Add limit parameter
    params.push(limit);
    const limitParam = `$${paramCounter}`;

    const sql = `
      SELECT
        sp.id, sp.company_name, sp.description,
        sp.focus_areas_served, sp.revenue_tiers,
        sp.powerconfidence_score, sp.client_count,
        sp.geographic_regions, sp.service_category
      FROM strategic_partners sp
      WHERE ${whereClauses.join(' AND ')}
      ORDER BY sp.powerconfidence_score DESC NULLS LAST
      LIMIT ${limitParam}
    `;

    console.log('DEBUG: SQL query:', sql);
    console.log('DEBUG: SQL params:', params);

    const result = await query(sql, params);

    console.log('DEBUG: Partner query returned', result.rows.length, 'partners');

    return result.rows.map(partner => {
      const reasons = [];

      if (focus_areas.length > 0) {
        reasons.push(`Addresses ${focus_areas.join(', ')}`);
      }

      if (services_offered.length > 0) {
        const serviceNames = services_offered.slice(0, 2).join(', ');
        const more = services_offered.length > 2 ? ` +${services_offered.length - 2} more` : '';
        reasons.push(`Works with ${serviceNames}${more} contractors`);
      }

      if (revenue_tier) {
        reasons.push(`Serves ${revenue_tier} businesses`);
      }

      return {
        entity_type: 'partner',
        entity_id: partner.id,
        entity_name: partner.company_name,
        reason: reasons.join(' • '),
        metadata: {
          powerconfidence_score: partner.powerconfidence_score,
          client_count: partner.client_count,
          geographic_regions: safeJsonParse(partner.geographic_regions, []),
          service_category: partner.service_category
        }
      };
    });
  }

  /**
   * Score recommendations based on multiple factors
   */
  async scoreRecommendations(recommendations, contractor, preferences, config) {
    const weights = config.weights;
    const scored = [];

    for (const rec of recommendations) {
      // Calculate individual scores
      const relevance_score = await this.calculateRelevanceScore(rec, contractor);
      const recency_score = await this.calculateRecencyScore(rec);
      const popularity_score = await this.calculatePopularityScore(rec);
      const personalization_score = await this.calculatePersonalizationScore(rec, preferences);

      // Calculate weighted total
      const total_score =
        (relevance_score * weights.relevance) +
        (recency_score * weights.recency) +
        (popularity_score * weights.popularity) +
        (personalization_score * weights.personalization);

      scored.push({
        ...rec,
        relevance_score,
        recency_score,
        popularity_score,
        personalization_score,
        total_score,
        confidence_score: total_score // For now, confidence equals total score
      });
    }

    return scored;
  }

  /**
   * Calculate relevance score based on focus area matching
   */
  async calculateRelevanceScore(recommendation, contractor) {
    // Simple relevance based on whether recommendation was found
    // In v2, we'll use more sophisticated matching
    return 0.8; // High relevance since we filtered by focus areas
  }

  /**
   * Calculate recency score
   */
  async calculateRecencyScore(recommendation) {
    // For v1, give higher scores to newer content
    // Could enhance this by checking creation dates
    return 0.7;
  }

  /**
   * Calculate popularity score based on engagement
   */
  async calculatePopularityScore(recommendation) {
    // Check trending_content table
    const sql = `
      SELECT trending_score
      FROM trending_content
      WHERE entity_type = $1
      AND entity_id = $2
      AND time_window = 'weekly'
      ORDER BY period_end DESC
      LIMIT 1
    `;

    const result = await query(sql, [recommendation.entity_type, recommendation.entity_id]);

    if (result.rows[0] && result.rows[0].trending_score) {
      return Math.min(result.rows[0].trending_score / 100, 1); // Normalize to 0-1
    }

    return 0.5; // Default middle score
  }

  /**
   * Calculate personalization score based on preferences
   */
  async calculatePersonalizationScore(recommendation, preferences) {
    // For v1, simple scoring based on content type preference
    const content_prefs = preferences.content_preferences || {};

    // Map entity types to content types
    const contentTypeMap = {
      'book': 'text',
      'podcast': 'audio',
      'event': 'video', // Events often have video components
      'partner': 'text'
    };

    const contentType = contentTypeMap[recommendation.entity_type];
    const score = content_prefs[contentType] || 0.5;

    return score;
  }

  /**
   * Save recommendations to database
   */
  async saveRecommendations(contractor_id, recommendations) {
    const saved = [];

    for (const rec of recommendations) {
      const sql = `
        INSERT INTO ai_recommendations (
          contractor_id, entity_type, entity_id,
          recommendation_reason, ai_confidence_score,
          relevance_score, personalization_score,
          urgency_level, business_context,
          created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING *
      `;

      const values = [
        contractor_id,
        rec.entity_type,
        rec.entity_id,
        rec.reason,
        rec.confidence_score,
        rec.relevance_score,
        rec.personalization_score,
        'medium', // Default urgency
        safeJsonStringify(rec.metadata || {})
      ];

      const result = await query(sql, values);
      saved.push(result.rows[0]);
    }

    return saved;
  }

  /**
   * Get trending content
   */
  async getTrendingContent(entity_type, time_window = 'weekly', limit = 10) {
    const sql = `
      SELECT
        tc.*,
        CASE
          WHEN tc.entity_type = 'book' THEN b.title
          WHEN tc.entity_type = 'podcast' THEN p.title
          WHEN tc.entity_type = 'event' THEN e.name
          WHEN tc.entity_type = 'partner' THEN sp.company_name
        END as entity_name
      FROM trending_content tc
      LEFT JOIN books b ON tc.entity_type = 'book' AND tc.entity_id = b.id
      LEFT JOIN podcasts p ON tc.entity_type = 'podcast' AND tc.entity_id = p.id
      LEFT JOIN events e ON tc.entity_type = 'event' AND tc.entity_id = e.id
      LEFT JOIN strategic_partners sp ON tc.entity_type = 'partner' AND tc.entity_id = sp.id
      WHERE tc.entity_type = $1
      AND tc.time_window = $2
      AND tc.period_end >= CURRENT_DATE - INTERVAL '7 days'
      ORDER BY tc.trending_score DESC
      LIMIT $3
    `;

    const result = await query(sql, [entity_type, time_window, limit]);
    return result.rows;
  }

  /**
   * Track engagement with a recommendation
   */
  async trackEngagement(recommendation_id, contractor_id, action, metadata = {}) {
    // Update ai_recommendations
    await query(
      `UPDATE ai_recommendations
       SET engagement_status = $1, engaged_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [action, recommendation_id]
    );

    // Record in engagement_metrics
    const sql = `
      INSERT INTO engagement_metrics (
        contractor_id, entity_type, entity_id,
        action, timestamp, metadata
      ) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, $5)
    `;

    const rec = await query(
      'SELECT entity_type, entity_id FROM ai_recommendations WHERE id = $1',
      [recommendation_id]
    );

    if (rec.rows[0]) {
      await query(sql, [
        contractor_id,
        rec.rows[0].entity_type,
        rec.rows[0].entity_id,
        action,
        safeJsonStringify(metadata)
      ]);
    }
  }

  /**
   * Update trending scores
   */
  async updateTrendingScores(entity_type, time_window = 'weekly') {
    const periodStart = new Date();
    periodStart.setDate(periodStart.getDate() - (time_window === 'daily' ? 1 : 7));

    const sql = `
      INSERT INTO trending_content (
        entity_type, entity_id, time_window,
        engagement_count, unique_viewers,
        trending_score, period_start, period_end
      )
      SELECT
        entity_type,
        entity_id,
        $1 as time_window,
        COUNT(*) as engagement_count,
        COUNT(DISTINCT contractor_id) as unique_viewers,
        COUNT(*) * 1.0 + COUNT(DISTINCT contractor_id) * 2.0 as trending_score,
        $2::date as period_start,
        CURRENT_DATE as period_end
      FROM engagement_metrics
      WHERE entity_type = $3
      AND timestamp >= $2
      GROUP BY entity_type, entity_id
      ON CONFLICT (entity_type, entity_id, time_window, period_start)
      DO UPDATE SET
        engagement_count = EXCLUDED.engagement_count,
        unique_viewers = EXCLUDED.unique_viewers,
        trending_score = EXCLUDED.trending_score,
        period_end = EXCLUDED.period_end
    `;

    await query(sql, [time_window, periodStart, entity_type]);
  }
}

module.exports = new RecommendationService();