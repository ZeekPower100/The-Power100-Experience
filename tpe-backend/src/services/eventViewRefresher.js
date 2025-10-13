/**
 * Event View Refresher Service
 *
 * Purpose: Listen for PostgreSQL NOTIFY events and refresh materialized views
 *
 * This service maintains real-time accuracy of materialized views by:
 * - Listening to PostgreSQL NOTIFY events from triggers
 * - Refreshing materialized views when event data changes
 * - Providing manual refresh capabilities
 * - Tracking refresh metrics and performance
 *
 * Key Features:
 * - LISTEN/NOTIFY pattern for instant updates
 * - Debounced refresh to prevent excessive refreshes
 * - Metrics tracking (last refresh time, refresh count)
 * - Graceful error handling and reconnection
 *
 * Phase 1: Event Truth Management
 * Date: October 13, 2025
 */

const { Pool } = require('pg');

class EventViewRefresher {
  constructor() {
    this.pool = null;
    this.notifyClient = null;
    this.isListening = false;
    this.refreshTimeout = null;
    this.debounceMs = 5000; // Wait 5 seconds before refreshing after changes
    this.metrics = {
      lastRefresh: null,
      totalRefreshes: 0,
      errors: 0,
      lastError: null
    };
  }

  /**
   * Initialize the refresher service
   */
  async initialize() {
    try {
      // Create connection pool for refreshing
      this.pool = new Pool({
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        database: process.env.DB_NAME || 'tpedb',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD,
        ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
      });

      // Create dedicated client for LISTEN/NOTIFY
      this.notifyClient = await this.pool.connect();

      // Set up LISTEN
      await this.notifyClient.query('LISTEN event_refresh');
      this.isListening = true;

      // Set up notification handler
      this.notifyClient.on('notification', (msg) => {
        if (msg.channel === 'event_refresh') {
          const eventId = msg.payload;
          console.log(`📢 Received event_refresh notification for event_id: ${eventId}`);
          this.scheduleRefresh();
        }
      });

      // Handle connection errors
      this.notifyClient.on('error', (err) => {
        console.error('❌ PostgreSQL NOTIFY client error:', err);
        this.metrics.errors++;
        this.metrics.lastError = err.message;
        this.reconnect();
      });

      console.log('✅ Event View Refresher initialized and listening for notifications');
    } catch (error) {
      console.error('❌ Error initializing Event View Refresher:', error);
      throw error;
    }
  }

  /**
   * Schedule a refresh (debounced to prevent excessive refreshes)
   */
  scheduleRefresh() {
    // Clear existing timeout
    if (this.refreshTimeout) {
      clearTimeout(this.refreshTimeout);
    }

    // Schedule new refresh
    this.refreshTimeout = setTimeout(() => {
      this.refreshViews();
    }, this.debounceMs);

    console.log(`⏱️  View refresh scheduled in ${this.debounceMs}ms`);
  }

  /**
   * Refresh both materialized views
   */
  async refreshViews() {
    try {
      console.log('🔄 Refreshing materialized views...');
      const startTime = Date.now();

      // Refresh both views in parallel
      await Promise.all([
        this.pool.query('REFRESH MATERIALIZED VIEW mv_sessions_now'),
        this.pool.query('REFRESH MATERIALIZED VIEW mv_sessions_next_60')
      ]);

      const duration = Date.now() - startTime;

      // Update metrics
      this.metrics.lastRefresh = new Date().toISOString();
      this.metrics.totalRefreshes++;

      console.log(`✅ Materialized views refreshed in ${duration}ms`);
      console.log(`   Total refreshes: ${this.metrics.totalRefreshes}`);

      return {
        success: true,
        duration,
        timestamp: this.metrics.lastRefresh
      };
    } catch (error) {
      console.error('❌ Error refreshing views:', error);
      this.metrics.errors++;
      this.metrics.lastError = error.message;
      throw error;
    }
  }

  /**
   * Manually trigger a view refresh (for testing or admin operations)
   */
  async manualRefresh() {
    console.log('🔧 Manual refresh triggered');
    return await this.refreshViews();
  }

  /**
   * Get refresher metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      isListening: this.isListening,
      debounceMs: this.debounceMs
    };
  }

  /**
   * Reconnect to PostgreSQL NOTIFY
   */
  async reconnect() {
    console.log('🔄 Attempting to reconnect to PostgreSQL NOTIFY...');
    this.isListening = false;

    try {
      // Release old client if it exists
      if (this.notifyClient) {
        try {
          this.notifyClient.release();
        } catch (err) {
          // Ignore release errors
        }
      }

      // Wait a bit before reconnecting
      await new Promise(resolve => setTimeout(resolve, 5000));

      // Reconnect
      await this.initialize();
    } catch (error) {
      console.error('❌ Failed to reconnect:', error);
      // Try again after delay
      setTimeout(() => this.reconnect(), 10000);
    }
  }

  /**
   * Graceful shutdown
   */
  async shutdown() {
    console.log('🛑 Shutting down Event View Refresher...');
    this.isListening = false;

    // Clear any pending refresh
    if (this.refreshTimeout) {
      clearTimeout(this.refreshTimeout);
    }

    // Unlisten and release client
    try {
      if (this.notifyClient) {
        await this.notifyClient.query('UNLISTEN event_refresh');
        this.notifyClient.release();
      }

      if (this.pool) {
        await this.pool.end();
      }

      console.log('✅ Event View Refresher shut down gracefully');
    } catch (error) {
      console.error('❌ Error during shutdown:', error);
    }
  }

  /**
   * Check if views need refresh (based on data staleness)
   * Useful for periodic health checks
   */
  async checkViewFreshness() {
    try {
      // Get the latest session time from event_speakers
      const latestSessionQuery = `
        SELECT MAX(GREATEST(created_at, updated_at)) as latest_change
        FROM event_speakers
        WHERE session_time IS NOT NULL;
      `;

      const result = await this.pool.query(latestSessionQuery);
      const latestChange = result.rows[0]?.latest_change;

      if (!latestChange) {
        return { needsRefresh: false, reason: 'No sessions in database' };
      }

      if (!this.metrics.lastRefresh) {
        return { needsRefresh: true, reason: 'Views never refreshed' };
      }

      const lastRefreshTime = new Date(this.metrics.lastRefresh);
      const latestChangeTime = new Date(latestChange);

      if (latestChangeTime > lastRefreshTime) {
        return {
          needsRefresh: true,
          reason: 'Data changed after last refresh',
          latestChange: latestChangeTime.toISOString(),
          lastRefresh: lastRefreshTime.toISOString()
        };
      }

      return { needsRefresh: false, reason: 'Views are fresh' };
    } catch (error) {
      console.error('❌ Error checking view freshness:', error);
      throw error;
    }
  }
}

// Create singleton instance
const refresher = new EventViewRefresher();

// Export both the instance and the class
module.exports = refresher;
module.exports.EventViewRefresher = EventViewRefresher;
