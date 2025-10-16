// DATABASE-CHECKED: contractors, contractor_event_registrations, events verified October 16, 2025
// ================================================================
// POSTGRESQL VERSION:
// - Local: PostgreSQL 16.10 (Windows)
// - Production: PostgreSQL 15.12 (AWS RDS Linux)
// ================================================================
// CACHE STRATEGY:
// - Redis TTL: 300 seconds (5 minutes) for contractor bundles
// - Redis TTL: 60 seconds (1 minute) for event context (changes frequently)
// - Redis TTL: No expiry for state machine states (until session ends)
// - Cache keys: contractor:{id}, event:{contractorId}, state:{sessionId}
// ================================================================
// VERIFIED FIELD NAMES (contractors table - 69 fields total):
// Core: id, email, name, first_name, last_name, company_name, phone
// Business: focus_areas, revenue_tier, team_size, annual_revenue
// AI Fields: ai_summary, ai_insights, ai_tags, ai_quality_score
// Engagement: engagement_score, churn_risk, growth_potential, next_best_action
// Goals: business_goals, current_challenges
// Preferences: communication_preferences, learning_preferences
// Tech Stack: tech_stack_sales, tech_stack_operations, tech_stack_marketing,
//             tech_stack_customer_experience, tech_stack_project_management,
//             tech_stack_accounting_finance
// ================================================================
// VERIFIED FIELD NAMES (contractor_event_registrations table):
// - contractor_id, event_id, event_date, event_name, event_status
// - registration_date, created_at, updated_at
// ================================================================
// VERIFIED FIELD NAMES (events table - 53 fields total):
// Core: id, name, date, end_date, location, format, description
// AI Fields: ai_summary, ai_tags
// Details: focus_areas_covered, target_audience, topics, agenda_highlights
// ================================================================
// VERIFIED DATA TYPES:
// - ai_summary: TEXT (cacheable, large field)
// - ai_insights: JSONB (cacheable, parsed)
// - ai_tags: JSONB (cacheable, parsed)
// - business_goals: JSONB (cacheable, parsed)
// - current_challenges: JSONB (cacheable, parsed)
// - communication_preferences: JSONB (cacheable, parsed)
// - learning_preferences: JSONB (cacheable, parsed)
// ================================================================
// CACHED FIELDS (Contractor Bundle):
// - Core: id, email, name, company_name, phone
// - Business: focus_areas, revenue_tier, team_size, annual_revenue
// - AI: ai_summary, ai_insights, ai_tags, ai_quality_score
// - Engagement: engagement_score, churn_risk, growth_potential, next_best_action
// - Goals: business_goals, current_challenges
// - Preferences: communication_preferences, learning_preferences
// ================================================================
// CACHED FIELDS (Event Context):
// - From contractor_event_registrations: event_id, event_date, event_name, event_status
// - From events: name, date, ai_summary, ai_tags, focus_areas_covered
// ================================================================

const Redis = require('ioredis');

/**
 * Redis Caching Service for AI Concierge
 * Caches contractor context, event data, and state machine states
 * Phase 5 Day 3: Caching Strategy Implementation
 */
class CacheService {
  constructor() {
    // Initialize Redis connection
    // In production, use REDIS_URL env var
    // In development, fallback to localhost
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      lazyConnect: true
    });

    this.redis.on('error', (err) => {
      console.error('[Cache Service] Redis connection error:', err.message);
    });

    this.redis.on('connect', () => {
      console.log('[Cache Service] Redis connected successfully');
    });

    // Track cache statistics
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0
    };
  }

  /**
   * Connect to Redis (call this on server startup)
   */
  async connect() {
    try {
      await this.redis.connect();
      console.log('[Cache Service] Redis connection established');
    } catch (error) {
      console.error('[Cache Service] Failed to connect to Redis:', error.message);
      // Continue without caching - graceful degradation
    }
  }

  /**
   * Cache contractor context bundle
   * TTL: 5 minutes (300 seconds)
   * @param {number} contractorId
   * @param {object} bundle - Contractor data bundle with verified fields
   */
  async cacheContractorBundle(contractorId, bundle) {
    try {
      const key = `contractor:${contractorId}`;
      await this.redis.set(key, JSON.stringify(bundle), 'EX', 300);
      this.stats.sets++;
      console.log(`[Cache Service] Cached contractor bundle for ID ${contractorId}`);
    } catch (error) {
      console.error('[Cache Service] Error caching contractor bundle:', error.message);
    }
  }

  /**
   * Get contractor context bundle from cache
   * @param {number} contractorId
   * @returns {Promise<object|null>}
   */
  async getContractorBundle(contractorId) {
    try {
      const key = `contractor:${contractorId}`;
      const cached = await this.redis.get(key);

      if (cached) {
        this.stats.hits++;
        console.log(`[Cache Service] Cache HIT for contractor ${contractorId}`);
        return JSON.parse(cached);
      } else {
        this.stats.misses++;
        console.log(`[Cache Service] Cache MISS for contractor ${contractorId}`);
        return null;
      }
    } catch (error) {
      console.error('[Cache Service] Error getting contractor bundle:', error.message);
      this.stats.misses++;
      return null;
    }
  }

  /**
   * Cache event context
   * TTL: 1 minute (60 seconds) - event data changes frequently
   * @param {number} contractorId
   * @param {object} eventContext - Event context data
   */
  async cacheEventContext(contractorId, eventContext) {
    try {
      const key = `event:${contractorId}`;
      await this.redis.set(key, JSON.stringify(eventContext), 'EX', 60);
      this.stats.sets++;
      console.log(`[Cache Service] Cached event context for contractor ${contractorId}`);
    } catch (error) {
      console.error('[Cache Service] Error caching event context:', error.message);
    }
  }

  /**
   * Get event context from cache
   * @param {number} contractorId
   * @returns {Promise<object|null>}
   */
  async getEventContext(contractorId) {
    try {
      const key = `event:${contractorId}`;
      const cached = await this.redis.get(key);

      if (cached) {
        this.stats.hits++;
        console.log(`[Cache Service] Cache HIT for event context ${contractorId}`);
        return JSON.parse(cached);
      } else {
        this.stats.misses++;
        console.log(`[Cache Service] Cache MISS for event context ${contractorId}`);
        return null;
      }
    } catch (error) {
      console.error('[Cache Service] Error getting event context:', error.message);
      this.stats.misses++;
      return null;
    }
  }

  /**
   * Cache state machine state
   * TTL: No expiry (persists until session ends)
   * @param {string} sessionId
   * @param {object} state - State machine state
   */
  async cacheStateMachineState(sessionId, state) {
    try {
      const key = `state:${sessionId}`;
      await this.redis.set(key, JSON.stringify(state));
      this.stats.sets++;
      console.log(`[Cache Service] Cached state machine state for session ${sessionId}`);
    } catch (error) {
      console.error('[Cache Service] Error caching state machine state:', error.message);
    }
  }

  /**
   * Get state machine state from cache
   * @param {string} sessionId
   * @returns {Promise<object|null>}
   */
  async getStateMachineState(sessionId) {
    try {
      const key = `state:${sessionId}`;
      const cached = await this.redis.get(key);

      if (cached) {
        this.stats.hits++;
        console.log(`[Cache Service] Cache HIT for state machine ${sessionId}`);
        return JSON.parse(cached);
      } else {
        this.stats.misses++;
        console.log(`[Cache Service] Cache MISS for state machine ${sessionId}`);
        return null;
      }
    } catch (error) {
      console.error('[Cache Service] Error getting state machine state:', error.message);
      this.stats.misses++;
      return null;
    }
  }

  /**
   * Invalidate contractor cache when data changes
   * @param {number} contractorId
   */
  async invalidateContractor(contractorId) {
    try {
      const deleted = await this.redis.del(`contractor:${contractorId}`, `event:${contractorId}`);
      this.stats.deletes += deleted;
      console.log(`[Cache Service] Invalidated cache for contractor ${contractorId} (${deleted} keys deleted)`);
    } catch (error) {
      console.error('[Cache Service] Error invalidating contractor cache:', error.message);
    }
  }

  /**
   * Invalidate event cache when event data changes
   * @param {number} contractorId
   */
  async invalidateEvent(contractorId) {
    try {
      const deleted = await this.redis.del(`event:${contractorId}`);
      this.stats.deletes += deleted;
      console.log(`[Cache Service] Invalidated event cache for contractor ${contractorId}`);
    } catch (error) {
      console.error('[Cache Service] Error invalidating event cache:', error.message);
    }
  }

  /**
   * Clear all state machine states (use sparingly)
   * Use case: System maintenance, clearing stuck states
   */
  async clearAllStates() {
    try {
      const keys = await this.redis.keys('state:*');
      if (keys.length > 0) {
        const deleted = await this.redis.del(...keys);
        this.stats.deletes += deleted;
        console.log(`[Cache Service] Cleared ${deleted} state machine states`);
        return deleted;
      }
      return 0;
    } catch (error) {
      console.error('[Cache Service] Error clearing all states:', error.message);
      return 0;
    }
  }

  /**
   * Get cache statistics
   * @returns {Promise<object>}
   */
  async getCacheStats() {
    try {
      const info = await this.redis.info('stats');
      const keyspace = await this.redis.info('keyspace');

      // Calculate hit rate
      const totalRequests = this.stats.hits + this.stats.misses;
      const hitRate = totalRequests > 0
        ? ((this.stats.hits / totalRequests) * 100).toFixed(2)
        : 0;

      return {
        application: {
          ...this.stats,
          hitRate: `${hitRate}%`,
          totalRequests
        },
        redis: {
          info: info.split('\r\n').reduce((acc, line) => {
            const [key, value] = line.split(':');
            if (key && value) acc[key] = value;
            return acc;
          }, {}),
          keyspace: keyspace
        }
      };
    } catch (error) {
      console.error('[Cache Service] Error getting cache stats:', error.message);
      return {
        application: this.stats,
        error: error.message
      };
    }
  }

  /**
   * Reset cache statistics (for testing/monitoring)
   */
  resetStats() {
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0
    };
    console.log('[Cache Service] Statistics reset');
  }

  /**
   * Disconnect from Redis (call on server shutdown)
   */
  async disconnect() {
    try {
      await this.redis.quit();
      console.log('[Cache Service] Redis connection closed');
    } catch (error) {
      console.error('[Cache Service] Error disconnecting from Redis:', error.message);
    }
  }

  /**
   * Check if Redis is connected
   * @returns {boolean}
   */
  isConnected() {
    return this.redis.status === 'ready';
  }
}

// Export singleton instance
module.exports = new CacheService();
