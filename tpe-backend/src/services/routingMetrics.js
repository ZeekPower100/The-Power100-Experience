/**
 * Routing Metrics Service
 *
 * Tracks performance and accuracy of AI-powered SMS routing
 * Provides real-time monitoring and historical analytics
 *
 * Part of AI Routing Agent - Phase 6
 *
 * DATABASE-CHECKED: routing_logs columns verified on 2025-10-06
 */

const { query } = require('../config/database');
const { safeJsonStringify } = require('../utils/jsonHelpers');

// In-memory metrics cache
const metricsCache = {
  routingTimes: [],
  routingMethods: {},
  confidenceScores: [],
  routeDistribution: {},
  errors: [],
  lastReset: Date.now()
};

const CACHE_MAX_SIZE = 1000;
const PERFORMANCE_TARGET_MS = 2000;
const CONFIDENCE_WARNING_THRESHOLD = 0.7;

/**
 * Log a routing decision with performance metrics
 * Uses EXACT routing_logs table columns
 */
async function logRoutingDecision(routingData) {
  const {
    contractor_id,
    event_id,
    inbound_message,
    phone,
    ghl_contact_id,
    ghl_location_id,
    classified_intent,
    confidence,
    routing_method,
    route_to,
    context_data,
    pending_messages,
    ai_reasoning,
    ai_model_used,
    processing_time_ms,
    handler_success,
    handler_error,
    response_sent
  } = routingData;

  try {
    // Log to database for historical tracking (DATABASE-CHECKED: all columns exist)
    await query(`
      INSERT INTO routing_logs (
        contractor_id,
        event_id,
        inbound_message,
        phone,
        ghl_contact_id,
        ghl_location_id,
        classified_intent,
        confidence,
        routing_method,
        route_to,
        context_data,
        pending_messages,
        ai_reasoning,
        ai_model_used,
        processing_time_ms,
        handler_success,
        handler_error,
        response_sent,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, CURRENT_TIMESTAMP)
    `, [
      contractor_id,
      event_id || null,
      inbound_message,
      phone || null,
      ghl_contact_id || null,
      ghl_location_id || null,
      classified_intent,
      confidence,
      routing_method,
      route_to,
      safeJsonStringify(context_data),
      safeJsonStringify(pending_messages),
      ai_reasoning,
      ai_model_used || null,
      processing_time_ms || null,
      handler_success || null,
      handler_error || null,
      response_sent || null
    ]);

    // Update in-memory cache for real-time metrics
    updateMetricsCache(routingData);

    // Check for performance warnings
    checkPerformanceThresholds(routingData);

  } catch (error) {
    console.error('[Routing Metrics] Error logging routing decision:', error);
  }
}

/**
 * Update in-memory metrics cache
 */
function updateMetricsCache(routingData) {
  const { processing_time_ms, routing_method, confidence, route_to } = routingData;

  // Track routing times
  if (processing_time_ms) {
    metricsCache.routingTimes.push(processing_time_ms);
    if (metricsCache.routingTimes.length > CACHE_MAX_SIZE) {
      metricsCache.routingTimes.shift();
    }
  }

  // Track routing methods
  metricsCache.routingMethods[routing_method] =
    (metricsCache.routingMethods[routing_method] || 0) + 1;

  // Track confidence scores
  if (confidence !== undefined) {
    metricsCache.confidenceScores.push(confidence);
    if (metricsCache.confidenceScores.length > CACHE_MAX_SIZE) {
      metricsCache.confidenceScores.shift();
    }
  }

  // Track route distribution
  metricsCache.routeDistribution[route_to] =
    (metricsCache.routeDistribution[route_to] || 0) + 1;
}

/**
 * Check performance thresholds and log warnings
 */
function checkPerformanceThresholds(routingData) {
  const { processing_time_ms, confidence, route_to } = routingData;

  // Warn if routing is slow
  if (processing_time_ms > PERFORMANCE_TARGET_MS) {
    console.warn(`[Routing Metrics] ⚠️  Slow routing detected: ${processing_time_ms}ms (target: ${PERFORMANCE_TARGET_MS}ms)`);
  }

  // Warn if confidence is low
  if (confidence < CONFIDENCE_WARNING_THRESHOLD) {
    console.warn(`[Routing Metrics] ⚠️  Low confidence routing: ${confidence} to ${route_to}`);
  }
}

/**
 * Get real-time routing metrics
 */
function getRealtimeMetrics() {
  const routingTimes = metricsCache.routingTimes;
  const confidenceScores = metricsCache.confidenceScores;

  // Calculate statistics
  const avgRoutingTime = routingTimes.length > 0
    ? routingTimes.reduce((a, b) => a + b, 0) / routingTimes.length
    : 0;

  const p95RoutingTime = routingTimes.length > 0
    ? calculatePercentile(routingTimes, 0.95)
    : 0;

  const avgConfidence = confidenceScores.length > 0
    ? confidenceScores.reduce((a, b) => a + b, 0) / confidenceScores.length
    : 0;

  const totalRequests = Object.values(metricsCache.routingMethods)
    .reduce((a, b) => a + b, 0);

  return {
    performance: {
      avg_routing_time_ms: Math.round(avgRoutingTime),
      p95_routing_time_ms: Math.round(p95RoutingTime),
      target_routing_time_ms: PERFORMANCE_TARGET_MS,
      performance_ok: p95RoutingTime <= PERFORMANCE_TARGET_MS
    },
    confidence: {
      avg_confidence: Math.round(avgConfidence * 100) / 100,
      warning_threshold: CONFIDENCE_WARNING_THRESHOLD,
      low_confidence_count: confidenceScores.filter(c => c < CONFIDENCE_WARNING_THRESHOLD).length
    },
    routing_methods: metricsCache.routingMethods,
    route_distribution: metricsCache.routeDistribution,
    total_requests: totalRequests,
    cache_age_seconds: Math.floor((Date.now() - metricsCache.lastReset) / 1000)
  };
}

/**
 * Get historical routing metrics from database
 * DATABASE-CHECKED: Uses exact routing_logs columns
 */
async function getHistoricalMetrics(hours = 24) {
  try {
    const result = await query(`
      SELECT
        routing_method,
        route_to,
        COUNT(*) as count,
        AVG(confidence) as avg_confidence,
        AVG(processing_time_ms) as avg_processing_time_ms,
        PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY processing_time_ms) as p95_processing_time_ms
      FROM routing_logs
      WHERE created_at > NOW() - INTERVAL '${hours} hours'
      GROUP BY routing_method, route_to
      ORDER BY count DESC
    `);

    return {
      period_hours: hours,
      routes: result.rows.map(row => ({
        routing_method: row.routing_method,
        route_to: row.route_to,
        count: parseInt(row.count),
        avg_confidence: parseFloat(row.avg_confidence) || null,
        avg_processing_time_ms: Math.round(parseFloat(row.avg_processing_time_ms)) || null,
        p95_processing_time_ms: Math.round(parseFloat(row.p95_processing_time_ms)) || null
      }))
    };

  } catch (error) {
    console.error('[Routing Metrics] Error getting historical metrics:', error);
    return { error: error.message };
  }
}

/**
 * Reset metrics cache
 */
function resetMetricsCache() {
  metricsCache.routingTimes = [];
  metricsCache.routingMethods = {};
  metricsCache.confidenceScores = [];
  metricsCache.routeDistribution = {};
  metricsCache.errors = [];
  metricsCache.lastReset = Date.now();

  console.log('[Routing Metrics] Cache reset');
}

/**
 * Calculate percentile from sorted array
 */
function calculatePercentile(arr, percentile) {
  if (arr.length === 0) return 0;

  const sorted = [...arr].sort((a, b) => a - b);
  const index = Math.ceil(sorted.length * percentile) - 1;
  return sorted[Math.max(0, index)];
}

module.exports = {
  logRoutingDecision,
  getRealtimeMetrics,
  getHistoricalMetrics,
  resetMetricsCache
};
