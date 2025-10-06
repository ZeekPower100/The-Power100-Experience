// DATABASE-CHECKED: event_messages.actual_send_time, personalization_data verified on 2025-10-04
// DATABASE-CHECKED: routing_logs, event_messages, contractors columns verified on 2025-10-04
const { query } = require('../config/database');
const openAIService = require('./openAIService');
const aiKnowledgeService = require('./aiKnowledgeService');
const { safeJsonParse, safeJsonStringify } = require('../utils/jsonHelpers');
const { buildConversationContext } = require('./conversationContext');
const { classifyWithContext } = require('./aiRoutingClassifier');

/**
 * AI Router Service
 * Intelligent SMS routing using AI Concierge brain
 * Routes inbound messages to appropriate handlers based on context and intent
 */
class AIRouter {
  constructor() {
    this.routeHandlers = new Map();
    this.defaultConfidenceThreshold = 0.7;
  }

  /**
   * Classify intent using AI with full contractor context
   * @param {string} inboundMessage - The SMS message received
   * @param {object} contractorContext - Contractor info and conversation history
   * @param {object} eventContext - Current event details if applicable
   * @returns {object} Classification result with intent, confidence, route, and reasoning
   */
  async classifyIntent(inboundMessage, contractorContext, eventContext = null) {
    const startTime = Date.now();

    try {
      console.log('[AIRouter] Classifying intent for message:', inboundMessage);

      // LAYER 1: Database-driven routing (highest confidence)
      const databaseRoute = await this.checkDatabaseContext(inboundMessage, contractorContext);
      if (databaseRoute.route) {
        console.log('[AIRouter] Database routing found:', databaseRoute.route, 'confidence:', databaseRoute.confidence);
        return {
          classified_intent: databaseRoute.intent,
          confidence: databaseRoute.confidence,
          routing_method: 'database',
          route_to: databaseRoute.route,
          ai_reasoning: databaseRoute.reasoning,
          context_data: {
            contractor: contractorContext,
            event: eventContext,
            pending_messages: databaseRoute.pendingMessages
          },
          processing_time_ms: Date.now() - startTime
        };
      }

      // LAYER 2: AI-powered intent classification
      const aiRoute = await this.classifyWithAI(inboundMessage, contractorContext, eventContext);
      if (aiRoute.confidence >= this.defaultConfidenceThreshold) {
        console.log('[AIRouter] AI routing found:', aiRoute.route, 'confidence:', aiRoute.confidence);
        return {
          classified_intent: aiRoute.intent,
          confidence: aiRoute.confidence,
          routing_method: 'ai',
          route_to: aiRoute.route,
          ai_reasoning: aiRoute.reasoning,
          ai_model_used: aiRoute.model,
          context_data: {
            contractor: contractorContext,
            event: eventContext
          },
          processing_time_ms: Date.now() - startTime
        };
      }

      // LAYER 3: Keyword fallback (medium confidence)
      const keywordRoute = this.classifyByKeywords(inboundMessage);
      if (keywordRoute.route) {
        console.log('[AIRouter] Keyword routing found:', keywordRoute.route, 'confidence:', keywordRoute.confidence);
        return {
          classified_intent: keywordRoute.intent,
          confidence: keywordRoute.confidence,
          routing_method: 'keyword',
          route_to: keywordRoute.route,
          ai_reasoning: keywordRoute.reasoning,
          context_data: {
            contractor: contractorContext,
            event: eventContext
          },
          processing_time_ms: Date.now() - startTime
        };
      }

      // LAYER 4: Fallback - clarification needed
      console.log('[AIRouter] No confident route found, requesting clarification');
      return {
        classified_intent: 'unclear',
        confidence: 0.3,
        routing_method: 'fallback',
        route_to: 'clarification_needed',
        ai_reasoning: 'No clear intent detected from message or context',
        context_data: {
          contractor: contractorContext,
          event: eventContext
        },
        processing_time_ms: Date.now() - startTime
      };

    } catch (error) {
      console.error('[AIRouter] Error classifying intent:', error);
      return {
        classified_intent: 'error',
        confidence: 0,
        routing_method: 'fallback',
        route_to: 'error_handler',
        ai_reasoning: `Classification error: ${error.message}`,
        context_data: {},
        processing_time_ms: Date.now() - startTime
      };
    }
  }

  /**
   * Check database context for routing hints
   * Looks at recent outbound messages to determine conversation context
   */
  async checkDatabaseContext(inboundMessage, contractorContext) {
    try {
      console.log('[AIRouter] Checking database context for contractor:', contractorContext.id);

      // Get recent outbound messages (last 24 hours)
      const result = await query(`
        SELECT
          id,
          message_type,
          personalization_data,
          actual_send_time,
          EXTRACT(EPOCH FROM (NOW() - actual_send_time))/3600 as hours_since_sent
        FROM event_messages
        WHERE contractor_id = $1
          AND direction = 'outbound'
          AND actual_send_time > NOW() - INTERVAL '24 hours'
        ORDER BY actual_send_time DESC
        LIMIT 5
      `, [contractorContext.id]);

      const pendingMessages = result.rows;
      console.log('[AIRouter] Found', pendingMessages.length, 'pending messages');
      console.log('[AIRouter] Message types:', pendingMessages.map(m => m.message_type).join(', '));

      if (pendingMessages.length === 0) {
        console.log('[AIRouter] No pending messages found, returning null route');
        return { route: null };
      }

      // Check most recent message for context
      const recentMessage = pendingMessages[0];
      const messageData = safeJsonParse(recentMessage.personalization_data);

      // Also check if there's a recent speaker_recommendation in pending messages
      // (user might be replying to an earlier recommendation after getting details)
      const recentSpeakerRec = pendingMessages.find(m => m.message_type === 'speaker_recommendation');

      // Numeric response pattern (1-10)
      const isNumeric = /^[0-9]{1,2}$/.test(inboundMessage.trim());

      // Route based on message type and response pattern
      switch (recentMessage.message_type) {
        case 'speaker_details_response':
          // If user just got speaker details and replies with another number,
          // they want details for a different speaker from the same recommendation
          if ((isNumeric || /speaker\s+[1-3]/i.test(inboundMessage)) && recentSpeakerRec) {
            return {
              route: 'speaker_details',
              intent: 'speaker_session_details',
              confidence: 0.95,
              reasoning: `Follow-up request for different speaker after viewing details`,
              pendingMessages
            };
          }
          break;

        case 'speaker_recommendation':
          if (isNumeric) {
            const num = parseInt(inboundMessage.trim());
            if (num >= 1 && num <= 3) {
              return {
                route: 'speaker_details',
                intent: 'speaker_session_details',
                confidence: 0.95,
                reasoning: `Reply "${inboundMessage}" to speaker recommendation indicates interest in speaker ${num}`,
                pendingMessages
              };
            } else if (num >= 1 && num <= 10) {
              return {
                route: 'speaker_feedback',
                intent: 'speaker_rating',
                confidence: 0.90,
                reasoning: `Reply "${inboundMessage}" to speaker recommendation interpreted as rating (1-10 scale)`,
                pendingMessages
              };
            }
          }
          break;

        case 'sponsor_recommendation':
          if (isNumeric) {
            const num = parseInt(inboundMessage.trim());
            if (num >= 1 && num <= 3) {
              return {
                route: 'sponsor_details',
                intent: 'sponsor_booth_details',
                confidence: 0.95,
                reasoning: `Reply "${inboundMessage}" to sponsor recommendation indicates interest in sponsor ${num}`,
                pendingMessages
              };
            }
          }
          break;

        case 'pcr_request':
          if (isNumeric) {
            const num = parseInt(inboundMessage.trim());
            if (num >= 1 && num <= 5) {
              return {
                route: 'pcr_response',
                intent: 'pcr_rating',
                confidence: 0.95,
                reasoning: `Reply "${inboundMessage}" to PCR request is a rating (1-5 scale)`,
                pendingMessages
              };
            }
          }
          break;

        case 'peer_matching_introduction':
          // Check for affirmative responses
          const affirmative = /^(yes|yeah|sure|ok|okay|y|sounds good|interested|👍)$/i.test(inboundMessage.trim());
          if (affirmative) {
            return {
              route: 'peer_match_response',
              intent: 'peer_match_acceptance',
              confidence: 0.90,
              reasoning: 'Affirmative response to peer matching introduction',
              pendingMessages
            };
          }
          break;
      }

      return { route: null };

    } catch (error) {
      console.error('[AIRouter] Error checking database context:', error);
      return { route: null };
    }
  }

  /**
   * Classify intent using AI with full conversation context
   * Uses new context-aware AI classifier (Phase 3)
   */
  async classifyWithAI(inboundMessage, contractorContext, eventContext) {
    try {
      // Build full conversation context
      const conversationContext = await buildConversationContext(
        contractorContext.id,
        eventContext?.event_id || null
      );

      // Use new context-aware AI classifier
      const classification = await classifyWithContext(inboundMessage, conversationContext);

      return {
        intent: classification.intent || 'unclear',
        route: classification.route || null,
        confidence: classification.confidence || 0.5,
        reasoning: classification.reasoning || 'AI classification',
        model: 'gpt-4-turbo',
        classification_time_ms: classification.classification_time_ms
      };

    } catch (error) {
      console.error('[AIRouter] Error in AI classification:', error);
      return {
        intent: 'error',
        route: null,
        confidence: 0,
        reasoning: `AI error: ${error.message}`,
        model: 'gpt-4'
      };
    }
  }

  /**
   * Simple keyword-based classification (fallback)
   */
  classifyByKeywords(inboundMessage) {
    const message = inboundMessage.toLowerCase().trim();

    // PCR rating pattern
    if (/^[1-5]$/.test(message)) {
      return {
        route: 'pcr_response',
        intent: 'pcr_rating',
        confidence: 0.6,
        reasoning: 'Single digit 1-5 interpreted as PCR rating'
      };
    }

    // Speaker keywords
    if (message.includes('speaker') || message.includes('session') || message.includes('talk')) {
      return {
        route: 'speaker_details',
        intent: 'speaker_inquiry',
        confidence: 0.65,
        reasoning: 'Keywords indicate speaker interest'
      };
    }

    // Sponsor keywords
    if (message.includes('sponsor') || message.includes('booth') || message.includes('vendor')) {
      return {
        route: 'sponsor_details',
        intent: 'sponsor_inquiry',
        confidence: 0.65,
        reasoning: 'Keywords indicate sponsor interest'
      };
    }

    // Check-in keywords
    if (message.includes('check') || message.includes('here') || message.includes('arrived')) {
      return {
        route: 'event_checkin',
        intent: 'checkin_request',
        confidence: 0.60,
        reasoning: 'Keywords indicate check-in intent'
      };
    }

    return { route: null };
  }

  /**
   * Log routing decision to database
   */
  async logRoutingDecision(classification, contractorId, eventId, phone, ghlContactId, ghlLocationId, inboundMessage) {
    try {
      await query(`
        INSERT INTO routing_logs (
          contractor_id, event_id, inbound_message, phone,
          ghl_contact_id, ghl_location_id, classified_intent,
          confidence, routing_method, route_to, context_data,
          pending_messages, ai_reasoning, ai_model_used,
          processing_time_ms
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      `, [
        contractorId,
        eventId,
        inboundMessage,
        phone,
        ghlContactId,
        ghlLocationId,
        classification.classified_intent,
        classification.confidence,
        classification.routing_method,
        classification.route_to,
        safeJsonStringify(classification.context_data || {}),
        safeJsonStringify(classification.context_data?.pending_messages || []),
        classification.ai_reasoning,
        classification.ai_model_used || null,
        classification.processing_time_ms
      ]);

      console.log('[AIRouter] Routing decision logged to database');
    } catch (error) {
      console.error('[AIRouter] Error logging routing decision:', error);
    }
  }

  /**
   * Route to appropriate handler based on classification
   */
  async route(classification, smsData) {
    const handler = this.routeHandlers.get(classification.route_to);

    if (!handler) {
      console.warn(`[AIRouter] No handler registered for route: ${classification.route_to}`);
      return {
        success: false,
        error: `No handler for route: ${classification.route_to}`
      };
    }

    try {
      const result = await handler(smsData, classification);

      // Update routing log with handler result
      await this.updateRoutingLog(classification, result);

      return result;
    } catch (error) {
      console.error(`[AIRouter] Handler error for route ${classification.route_to}:`, error);

      // Update routing log with error
      await this.updateRoutingLog(classification, {
        success: false,
        error: error.message
      });

      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Update routing log with handler outcome
   */
  async updateRoutingLog(classification, handlerResult) {
    try {
      // Find most recent routing log for this classification
      await query(`
        UPDATE routing_logs
        SET
          handler_success = $1,
          handler_error = $2,
          response_sent = $3,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = (
          SELECT id FROM routing_logs
          WHERE classified_intent = $4
            AND routing_method = $5
          ORDER BY created_at DESC
          LIMIT 1
        )
      `, [
        handlerResult.success || false,
        handlerResult.error || null,
        handlerResult.response_sent || false,
        classification.classified_intent,
        classification.routing_method
      ]);
    } catch (error) {
      console.error('[AIRouter] Error updating routing log:', error);
    }
  }

  /**
   * Register a route handler
   */
  registerHandler(route, handler) {
    this.routeHandlers.set(route, handler);
    console.log(`[AIRouter] Registered handler for route: ${route}`);
  }
}

module.exports = new AIRouter();
