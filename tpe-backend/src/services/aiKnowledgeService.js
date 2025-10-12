const { query } = require('../config/database');
const schemaDiscovery = require('./schemaDiscoveryService');
const { safeJsonParse, safeJsonStringify } = require('../utils/jsonHelpers');
const hybridSearch = require('./hybridSearchService');

/**
 * AI Knowledge Service
 * Centralized service for managing AI knowledge base
 * Uses auto-discovered schema to dynamically fetch and cache data
 */
class AIKnowledgeService {
  constructor() {
    this.knowledgeCache = {};
    this.eventKnowledgeCache = {}; // Separate cache for event data
    this.lastCacheTime = {};
    this.lastEventCacheTime = {};

    // Cache durations
    this.DEFAULT_CACHE_EXPIRY = 3600000; // 1 hour for general knowledge
    this.ACTIVE_EVENT_CACHE_EXPIRY = 30000; // 30 seconds during events
    this.PAST_EVENT_CACHE_EXPIRY = 86400000; // 24 hours for past events
  }

  /**
   * Get comprehensive knowledge base for AI Concierge
   * Automatically includes all AI-relevant tables and fields
   * @param {number} contractorId - Optional contractor ID for personalization
   * @param {number} eventId - Optional event ID for event-specific context
   */
  async getComprehensiveKnowledge(contractorId = null, eventId = null) {
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

        // Debug logging for strategic_partners
        if (tableName === 'strategic_partners') {
          console.log(`[AIKnowledge] strategic_partners columns selected: ${columns.substring(0, 200)}...`);
          console.log(`[AIKnowledge] AI columns included:`, Object.keys(tableInfo.columns).filter(col => col.startsWith('ai_')));
        }

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

          // Debug logging for partners
          if (tableName === 'strategic_partners' && result.rows.length > 0) {
            console.log(`[AIKnowledge] Sample partner row keys:`, Object.keys(result.rows[0]).slice(0, 20));
            console.log(`[AIKnowledge] Has ai_summary?`, 'ai_summary' in result.rows[0]);
            console.log(`[AIKnowledge] ai_summary value:`, result.rows[0].ai_summary ? 'Present' : 'NULL/Missing');
          }

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

      // Get events with full details (speakers and sponsors included)
      const eventsWithDetails = await this.getEventsWithDetails();
      if (eventsWithDetails.length > 0) {
        knowledge.eventsWithDetails = {
          data: eventsWithDetails,
          count: eventsWithDetails.length,
          hasAIFields: true,
          aiFields: ['ai_summary', 'ai_tags'],
          includedRelations: ['speakers', 'sponsors']
        };
      }

      // Get aggregated statistics (privacy-safe)
      if (contractorId) {
        knowledge.industryStats = await this.getIndustryStatistics(contractorId);
      }

      // CRITICAL: Add event-specific context if contractor is at an event
      if (eventId) {
        knowledge.currentEvent = await this.getCurrentEventContext(eventId, contractorId);
        console.log('[AIKnowledge] Added live event context for event', eventId);
      } else if (contractorId) {
        // Auto-detect if contractor is currently at an event
        const activeEvent = await this.detectActiveEvent(contractorId);
        if (activeEvent) {
          knowledge.currentEvent = await this.getCurrentEventContext(activeEvent.event_id, contractorId);
          console.log('[AIKnowledge] Auto-detected active event', activeEvent.event_id);
        }
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
   * Get events with their speakers and sponsors
   */
  async getEventsWithDetails() {
    try {
      const eventsQuery = `
        SELECT
          e.id,
          e.name,
          e.date,
          e.location,
          e.description,
          e.expected_attendance,
          e.speaker_profiles,
          e.sponsors,
          e.focus_areas_covered,
          e.ai_summary,
          e.ai_tags,
          -- Get speakers as JSON
          (
            SELECT json_agg(json_build_object(
              'name', es.name,
              'title', es.title,
              'company', es.company,
              'bio', es.bio,
              'session_title', es.session_title
            ))
            FROM event_speakers es
            WHERE es.event_id = e.id
          ) as speakers,
          -- Get sponsors as JSON
          (
            SELECT json_agg(json_build_object(
              'sponsor_name', esp.sponsor_name,
              'partner_id', esp.partner_id,
              'sponsor_tier', esp.sponsor_tier,
              'booth_location', esp.booth_location,
              'partner_name', sp.company_name
            ))
            FROM event_sponsors esp
            LEFT JOIN strategic_partners sp ON esp.partner_id = sp.id
            WHERE esp.event_id = e.id
          ) as sponsor_details,
          -- Get attendee count and registration info
          (
            SELECT COUNT(*)
            FROM event_attendees ea
            WHERE ea.event_id = e.id
          ) as registered_attendees,
          (
            SELECT COUNT(*)
            FROM event_attendees ea
            WHERE ea.event_id = e.id AND ea.check_in_time IS NOT NULL
          ) as checked_in_attendees,
          -- Get notable attendees (first 5 registered contractors)
          (
            SELECT json_agg(json_build_object(
              'name', c.name,
              'company', c.company_name,
              'registered_date', ea.registration_date,
              'checked_in', ea.check_in_time IS NOT NULL
            ) ORDER BY ea.registration_date)
            FROM event_attendees ea
            JOIN contractors c ON ea.contractor_id = c.id
            WHERE ea.event_id = e.id
            LIMIT 5
          ) as notable_attendees
        FROM events e
        WHERE e.is_active = true
        ORDER BY e.date DESC
        LIMIT 50
      `;

      const result = await query(eventsQuery);
      return result.rows;
    } catch (error) {
      console.error('[AIKnowledge] Error fetching events with details:', error);
      return [];
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
    return (Date.now() - this.lastCacheTime[tableName]) < this.DEFAULT_CACHE_EXPIRY;
  }

  /**
   * Check if event cache is still valid (intelligent caching based on event status)
   */
  isEventCacheValid(eventId) {
    if (!this.lastEventCacheTime[eventId]) return false;

    const cacheAge = Date.now() - this.lastEventCacheTime[eventId];
    const cachedEvent = this.eventKnowledgeCache[eventId];

    if (!cachedEvent) return false;

    // Determine appropriate cache duration based on event status
    const now = new Date();
    const eventDate = new Date(cachedEvent.event.date);
    const eventEndDate = cachedEvent.event.end_date
      ? new Date(cachedEvent.event.end_date)
      : new Date(eventDate.getTime() + 24 * 60 * 60 * 1000); // Default 1 day duration

    // DURING EVENT: 30 second cache (real-time updates critical)
    if (now >= eventDate && now <= eventEndDate) {
      return cacheAge < this.ACTIVE_EVENT_CACHE_EXPIRY;
    }

    // PAST EVENT: 24 hour cache (static historical data)
    if (now > eventEndDate) {
      return cacheAge < this.PAST_EVENT_CACHE_EXPIRY;
    }

    // FUTURE EVENT: 1 hour cache (schedule may change but not frequently)
    return cacheAge < this.DEFAULT_CACHE_EXPIRY;
  }

  /**
   * Detect if contractor is currently at an active event
   * Checks if they've checked in to any event today
   */
  async detectActiveEvent(contractorId) {
    try {
      const result = await query(`
        SELECT
          ea.event_id,
          ea.check_in_time,
          e.date,
          e.end_date
        FROM event_attendees ea
        JOIN events e ON ea.event_id = e.id
        WHERE ea.contractor_id = $1
          AND ea.check_in_time IS NOT NULL
          AND e.date <= CURRENT_DATE
          AND (e.end_date >= CURRENT_DATE OR e.end_date IS NULL)
        ORDER BY ea.check_in_time DESC
        LIMIT 1
      `, [contractorId]);

      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      console.error('[AIKnowledge] Error detecting active event:', error);
      return null;
    }
  }

  /**
   * Get complete event context including schedule, agenda, and personalization
   * Uses intelligent caching: 30sec during event, 24hrs after
   */
  async getCurrentEventContext(eventId, contractorId) {
    try {
      // Check cache first
      if (this.isEventCacheValid(eventId)) {
        console.log('[AIKnowledge] Using cached event context for event', eventId);
        return this.eventKnowledgeCache[eventId];
      }

      console.log('[AIKnowledge] Loading fresh event context for event', eventId);

      // Get event details
      const eventResult = await query(`
        SELECT * FROM events WHERE id = $1
      `, [eventId]);

      if (eventResult.rows.length === 0) {
        return null;
      }

      const event = eventResult.rows[0];

      // Get full schedule (all speakers with sessions)
      const speakersResult = await query(`
        SELECT
          id,
          name,
          title,
          company,
          bio,
          session_title,
          session_description,
          session_time,
          session_location,
          focus_areas,
          pcr_score,
          average_rating,
          total_ratings
        FROM event_speakers
        WHERE event_id = $1
        ORDER BY session_time
      `, [eventId]);

      // Get all sponsors with booth info
      const sponsorsResult = await query(`
        SELECT
          es.id,
          es.sponsor_name,
          es.booth_number,
          es.booth_location,
          es.booth_representatives,
          es.focus_areas_served,
          es.special_offers,
          es.pcr_score,
          sp.company_name,
          sp.value_proposition,
          sp.ai_summary
        FROM event_sponsors es
        LEFT JOIN strategic_partners sp ON es.partner_id = sp.id
        WHERE es.event_id = $1
        ORDER BY es.booth_number
      `, [eventId]);

      // Get contractor's personalized agenda (their recommended speakers/sponsors)
      let personalizedAgenda = null;
      if (contractorId) {
        const agendaResult = await query(`
          SELECT
            message_type,
            personalization_data,
            scheduled_time
          FROM event_messages
          WHERE event_id = $1
            AND contractor_id = $2
            AND message_type IN ('speaker_recommendation', 'sponsor_recommendation', 'peer_introduction')
            AND status != 'failed'
          ORDER BY scheduled_time
        `, [eventId, contractorId]);

        personalizedAgenda = agendaResult.rows;
      }

      // Get upcoming scheduled messages (so AI knows what's coming)
      let upcomingMessages = [];
      if (contractorId) {
        const messagesResult = await query(`
          SELECT
            message_type,
            scheduled_time,
            message_content,
            delay_minutes
          FROM event_messages
          WHERE event_id = $1
            AND contractor_id = $2
            AND status = 'scheduled'
            AND scheduled_time > NOW()
          ORDER BY scheduled_time
          LIMIT 10
        `, [eventId, contractorId]);

        upcomingMessages = messagesResult.rows;
      }

      // Get peer match progress (so AI knows about networking connections)
      let peerMatches = [];
      if (contractorId) {
        const peerMatchesResult = await query(`
          SELECT
            pm.id,
            pm.match_type,
            pm.match_criteria,
            pm.match_score,
            pm.match_reason,
            pm.introduction_sent_time,
            pm.contractor1_response,
            pm.contractor2_response,
            pm.connection_made,
            pm.meeting_scheduled,
            pm.meeting_time,
            pm.meeting_location,
            pm.pcr_score,
            -- Get the OTHER contractor's info (not the current one)
            CASE
              WHEN pm.contractor1_id = $2 THEN c2.id
              ELSE c1.id
            END as peer_id,
            CASE
              WHEN pm.contractor1_id = $2 THEN CONCAT(c2.first_name, ' ', c2.last_name)
              ELSE CONCAT(c1.first_name, ' ', c1.last_name)
            END as peer_name,
            CASE
              WHEN pm.contractor1_id = $2 THEN c2.company_name
              ELSE c1.company_name
            END as peer_company,
            CASE
              WHEN pm.contractor1_id = $2 THEN c2.focus_areas
              ELSE c1.focus_areas
            END as peer_focus_areas,
            -- Get my response status
            CASE
              WHEN pm.contractor1_id = $2 THEN pm.contractor1_response
              ELSE pm.contractor2_response
            END as my_response,
            -- Get their response status
            CASE
              WHEN pm.contractor1_id = $2 THEN pm.contractor2_response
              ELSE pm.contractor1_response
            END as their_response
          FROM event_peer_matches pm
          JOIN contractors c1 ON pm.contractor1_id = c1.id
          JOIN contractors c2 ON pm.contractor2_id = c2.id
          WHERE pm.event_id = $1
            AND (pm.contractor1_id = $2 OR pm.contractor2_id = $2)
          ORDER BY pm.introduction_sent_time DESC
        `, [eventId, contractorId]);

        peerMatches = peerMatchesResult.rows;
      }

      // Build complete context
      const eventContext = {
        event,
        name: event.name,  // Add name at top level for easy access
        speakers: speakersResult.rows,  // Also expose as 'speakers' for AI prompt compatibility
        sponsors: sponsorsResult.rows,   // Also expose as 'sponsors' for AI prompt compatibility
        fullSchedule: speakersResult.rows,
        allSponsors: sponsorsResult.rows,
        myPersonalizedAgenda: personalizedAgenda,
        upcomingMessages,
        myPeerMatches: peerMatches,
        eventStatus: this.getEventStatus(event),
        cacheExpiry: this.getEventCacheExpiry(event)
      };

      // Cache it (ONLY if valid)
      this.eventKnowledgeCache[eventId] = eventContext;
      this.lastEventCacheTime[eventId] = Date.now();

      return eventContext;
    } catch (error) {
      console.error('[AIKnowledge] Error loading event context:', error);
      // DO NOT CACHE null/errors - let it retry next time
      return null;
    }
  }

  /**
   * Determine event status (upcoming, active, past)
   */
  getEventStatus(event) {
    const now = new Date();
    const eventDate = new Date(event.date);
    const eventEndDate = event.end_date
      ? new Date(event.end_date)
      : new Date(eventDate.getTime() + 24 * 60 * 60 * 1000);

    if (now < eventDate) return 'upcoming';
    if (now >= eventDate && now <= eventEndDate) return 'active';
    return 'past';
  }

  /**
   * Get appropriate cache expiry based on event status
   */
  getEventCacheExpiry(event) {
    const status = this.getEventStatus(event);

    if (status === 'active') return this.ACTIVE_EVENT_CACHE_EXPIRY;
    if (status === 'past') return this.PAST_EVENT_CACHE_EXPIRY;
    return this.DEFAULT_CACHE_EXPIRY;
  }

  /**
   * Clear all caches - useful when metadata changes
   */
  clearCache() {
    this.knowledgeCache = {};
    this.eventKnowledgeCache = {};
    this.lastCacheTime = {};
    this.lastEventCacheTime = {};
    console.log('[AIKnowledge] All caches cleared');
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

  /**
   * Search knowledge base using hybrid search (BM25 + Vector)
   * This is the RECOMMENDED method for AI Concierge queries
   * Replaces manual filtering with intelligent semantic search
   *
   * @param {string} query - Natural language query
   * @param {object} options - Search options
   * @param {number} options.contractorId - Contractor ID for personalization
   * @param {number} options.limit - Max results (default: 12)
   * @param {string[]} options.entityTypes - Filter by types (default: all)
   * @returns {Promise<object>} - Search results with entities
   */
  async searchKnowledge(query, options = {}) {
    try {
      console.log('[AIKnowledge] Hybrid search query:', query);

      // Perform hybrid search
      const results = await hybridSearch.search(query, options);

      // Group results by entity type for easy AI consumption
      const groupedResults = {
        strategic_partners: [],
        books: [],
        podcasts: [],
        events: [],
        other: []
      };

      results.forEach(result => {
        const entityType = result.entityType;
        if (groupedResults[entityType]) {
          groupedResults[entityType].push({
            id: result.entityId,
            content: result.content,
            metadata: result.metadata,
            scores: result.scores,
            relevanceScore: result.scores.hybrid
          });
        } else {
          groupedResults.other.push(result);
        }
      });

      // Add search metadata
      const response = {
        query,
        results: groupedResults,
        totalResults: results.length,
        searchMethod: 'hybrid_search',
        searchWeights: {
          bm25: hybridSearch.DEFAULT_BM25_WEIGHT,
          vector: hybridSearch.DEFAULT_VECTOR_WEIGHT
        },
        timestamp: new Date().toISOString()
      };

      // Add top recommendation (highest score)
      if (results.length > 0) {
        response.topRecommendation = {
          entityType: results[0].entityType,
          entityId: results[0].entityId,
          name: results[0].metadata?.entity_name,
          score: results[0].scores.hybrid
        };
      }

      console.log(`[AIKnowledge] Found ${results.length} results via hybrid search`);

      return response;
    } catch (error) {
      console.error('[AIKnowledge] Hybrid search error:', error);
      throw error;
    }
  }

  /**
   * Search for strategic partners using hybrid search
   * @param {string} query - Search query
   * @param {object} options - Search options
   * @returns {Promise<Array>}
   */
  async searchPartners(query, options = {}) {
    const results = await hybridSearch.searchPartners(query, options);
    return results.map(r => ({
      partnerId: r.entityId,
      name: r.metadata?.entity_name,
      content: r.content,
      relevanceScore: r.scores.hybrid,
      focusAreas: r.metadata?.focus_areas || [],
      ...r
    }));
  }

  /**
   * Search for books using hybrid search
   * @param {string} query - Search query
   * @param {object} options - Search options
   * @returns {Promise<Array>}
   */
  async searchBooks(query, options = {}) {
    const results = await hybridSearch.searchBooks(query, options);
    return results.map(r => ({
      bookId: r.entityId,
      title: r.metadata?.entity_name,
      author: r.metadata?.author,
      content: r.content,
      relevanceScore: r.scores.hybrid,
      focusAreas: r.metadata?.focus_areas || [],
      ...r
    }));
  }

  /**
   * Search for podcasts using hybrid search
   * @param {string} query - Search query
   * @param {object} options - Search options
   * @returns {Promise<Array>}
   */
  async searchPodcasts(query, options = {}) {
    const results = await hybridSearch.searchPodcasts(query, options);
    return results.map(r => ({
      podcastId: r.entityId,
      title: r.metadata?.entity_name,
      host: r.metadata?.host,
      content: r.content,
      relevanceScore: r.scores.hybrid,
      focusAreas: r.metadata?.focus_areas || [],
      ...r
    }));
  }

  /**
   * Get hybrid search statistics
   * @returns {Promise<object>}
   */
  async getHybridSearchStats() {
    return await hybridSearch.getIndexStats();
  }
}

module.exports = new AIKnowledgeService();