// DATABASE-CHECKED: ai_interactions, ai_concierge_sessions verified October 14, 2025
// ================================================================
// OpenAI Tracer - Phase 3 Day 2
// ================================================================
// Purpose: Track all OpenAI API calls with token usage and performance metrics
// Logs to: ai_interactions table for analytics and monitoring
// ================================================================
// VERIFIED FIELD NAMES:
// - contractor_id (NOT contractorId)
// - interaction_type (NOT interactionType) - NO CHECK constraint
// - interaction_data (NOT interactionData) - JSONB type
// - user_message (NOT userMessage) - TEXT type
// - ai_response (NOT aiResponse) - TEXT type
// - created_at (NOT createdAt) - TIMESTAMP type
// ================================================================
// VERIFIED DATA TYPES:
// - interaction_data: JSONB (pass object directly, driver handles it)
// - user_message: TEXT
// - ai_response: TEXT
// - created_at: TIMESTAMP (use NOW())
// ================================================================
// INTERACTION TYPES FOR DAY 2:
// - 'ai_concierge_standard' - Standard agent invocation
// - 'ai_concierge_event' - Event agent invocation
// ================================================================
// FOREIGN KEY:
// - contractor_id REFERENCES contractors(id) ON DELETE CASCADE
// ================================================================

const { query } = require('../../config/database');

/**
 * OpenAI Tracer
 * Wraps OpenAI calls with comprehensive logging and metrics tracking
 *
 * Features:
 * - Token usage tracking (prompt, completion, total)
 * - Duration/latency measurement
 * - Error logging
 * - Database persistence to ai_interactions table
 * - Links to LangSmith traces via shared metadata
 */
class OpenAITracer {
  /**
   * Trace an OpenAI agent invocation
   *
   * @param {number} contractorId - Contractor ID (required for FK)
   * @param {string} interactionType - Type of interaction ('ai_concierge_standard' or 'ai_concierge_event')
   * @param {string} userMessage - User's input message
   * @param {Function} callFn - Async function that invokes the agent
   * @returns {Promise<object>} - Agent response with metadata
   */
  static async traceCall(contractorId, interactionType, userMessage, callFn) {
    const startTime = Date.now();

    try {
      console.log(`[OpenAI Tracer] 📊 Starting trace for ${interactionType}`);

      // Execute the agent invocation
      const result = await callFn();

      const duration = Date.now() - startTime;

      // Extract AI response from LangGraph result
      const aiResponse = this._extractResponse(result);

      // Extract token usage if available from OpenAI metadata
      const tokenUsage = this._extractTokenUsage(result);

      // Prepare interaction data (JSONB field)
      const interactionData = {
        duration_ms: duration,
        status: 'success',
        prompt_tokens: tokenUsage.prompt_tokens || null,
        completion_tokens: tokenUsage.completion_tokens || null,
        total_tokens: tokenUsage.total_tokens || null,
        model: 'gpt-4',
        timestamp: new Date().toISOString()
      };

      // Log to database (ai_interactions table)
      await this._logToDatabase(
        contractorId,
        interactionType,
        interactionData,
        userMessage,
        aiResponse
      );

      console.log(`[OpenAI Tracer] ✅ Trace complete - ${duration}ms, ${tokenUsage.total_tokens || 0} tokens`);

      return result;

    } catch (error) {
      const duration = Date.now() - startTime;

      console.error(`[OpenAI Tracer] ❌ Error during trace:`, error.message);

      // Log error to database
      const errorData = {
        duration_ms: duration,
        status: 'error',
        error_message: error.message,
        error_stack: error.stack,
        timestamp: new Date().toISOString()
      };

      await this._logToDatabase(
        contractorId,
        interactionType,
        errorData,
        userMessage,
        null
      );

      // Re-throw error to maintain normal error flow
      throw error;
    }
  }

  /**
   * Extract AI response from LangGraph result
   * @private
   */
  static _extractResponse(result) {
    if (!result || !result.messages) {
      return null;
    }

    // Get last message (AI response)
    const lastMessage = result.messages[result.messages.length - 1];
    return lastMessage?.content || null;
  }

  /**
   * Extract token usage from OpenAI response metadata
   * @private
   */
  static _extractTokenUsage(result) {
    // LangGraph response structure: result.messages[last].usage_metadata
    // Also check result.usage_metadata and result.metadata.usage
    let usage = {};

    // Check last message for usage_metadata (most reliable with streamUsage: true)
    if (result?.messages && result.messages.length > 0) {
      const lastMessage = result.messages[result.messages.length - 1];
      usage = lastMessage?.usage_metadata || lastMessage?.metadata?.usage || {};
    }

    // Fallback to top-level usage metadata
    if (Object.keys(usage).length === 0) {
      usage = result?.usage_metadata || result?.metadata?.usage || {};
    }

    const tokenData = {
      prompt_tokens: usage.input_tokens || usage.prompt_tokens || null,
      completion_tokens: usage.output_tokens || usage.completion_tokens || null,
      total_tokens: usage.total_tokens || null
    };

    // Log token extraction for debugging
    if (tokenData.total_tokens) {
      console.log(`[OpenAI Tracer] 📊 Tokens extracted: ${tokenData.total_tokens} (${tokenData.prompt_tokens} in + ${tokenData.completion_tokens} out)`);
    } else {
      console.log('[OpenAI Tracer] ⚠️  No tokens found in response metadata');
    }

    return tokenData;
  }

  /**
   * Log interaction to ai_interactions table
   * @private
   */
  static async _logToDatabase(contractorId, interactionType, interactionData, userMessage, aiResponse) {
    try {
      const insertQuery = `
        INSERT INTO ai_interactions (
          contractor_id,
          interaction_type,
          interaction_data,
          user_message,
          ai_response,
          created_at
        ) VALUES ($1, $2, $3, $4, $5, NOW())
        RETURNING id
      `;

      const result = await query(insertQuery, [
        contractorId,
        interactionType,
        interactionData, // JSONB - driver handles object-to-json conversion
        userMessage,
        aiResponse
      ]);

      console.log(`[OpenAI Tracer] 💾 Logged to ai_interactions: ID ${result.rows[0].id}`);

    } catch (error) {
      // Log database error but don't fail the trace
      console.error('[OpenAI Tracer] ⚠️  Failed to log to database:', error.message);
    }
  }
}

module.exports = OpenAITracer;
