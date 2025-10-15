// DATABASE-CHECKED: ai_concierge_sessions, contractors, contractor_event_registrations verified October 13, 2025
// ================================================================
// VERIFIED DATABASE FIELDS:
// - ai_concierge_sessions.contractor_id (NOT contractorId)
// - ai_concierge_sessions.session_id (character varying)
// - ai_concierge_sessions.session_type (NO CHECK constraint - can use 'standard' or 'event')
// - ai_concierge_sessions.session_status (NO CHECK constraint)
// - contractor_event_registrations.contractor_id, event_id, event_status
// - contractors.focus_areas (TEXT type - JSON string), business_goals (JSONB type)
// ================================================================

const AIConcierge = require('../models/aiConcierge');
const openAIService = require('../services/openAIService');
const { query } = require('../config/database');
const { safeJsonParse, safeJsonStringify } = require('../utils/jsonHelpers');
const { v4: uuidv4 } = require('uuid');

// PHASE 2: Import LangGraph agents
const { createStandardAgent, getContractorContext: getStandardContext } = require('../services/agents/aiConciergeStandardAgent');
const { createEventAgent, getContractorContext: getEventContext } = require('../services/agents/aiConciergeEventAgent');

// PHASE 3: Import OpenAI Tracer for token usage tracking
const OpenAITracer = require('../services/openai/openaiTracer');

// PHASE 4: Import State Machine Manager
const stateMachineManager = require('../services/conciergeStateMachineManager');

// Initialize agents (reusable across requests)
let standardAgent = null;
let eventAgent = null;

function getOrCreateStandardAgent() {
  if (!standardAgent) {
    standardAgent = createStandardAgent();
    console.log('[AI Concierge Controller] Standard Agent initialized');
  }
  return standardAgent;
}

function getOrCreateEventAgent() {
  if (!eventAgent) {
    eventAgent = createEventAgent();
    console.log('[AI Concierge Controller] Event Agent initialized');
  }
  return eventAgent;
}

/**
 * PHASE 4: Agent Routing Logic with State Machine
 * Uses XState state machine to determine which agent to use
 * Uses DATABASE VERIFIED field names
 */
async function routeToAgent(contractorId, sessionId) {
  try {
    // DATABASE VERIFIED FIELD NAMES: contractor_event_registrations.event_id, event_status, contractor_id
    // DATABASE VERIFIED FIELD NAMES: events.name, date
    // Check if contractor is currently registered for an active event
    const eventCheckQuery = `
      SELECT
        cer.event_id,           -- DATABASE VERIFIED
        cer.event_status,       -- DATABASE VERIFIED (NO CHECK constraint)
        cer.event_name,         -- DATABASE VERIFIED (exists at table level)
        cer.event_date,         -- DATABASE VERIFIED (exists at table level)
        e.name as event_name_from_events
      FROM contractor_event_registrations cer
      JOIN events e ON e.id = cer.event_id
      WHERE cer.contractor_id = $1       -- DATABASE VERIFIED
        AND cer.event_status IN ('registered', 'checked_in', 'attending')
        AND e.date >= CURRENT_DATE - INTERVAL '1 day'
        AND e.date <= CURRENT_DATE + INTERVAL '1 day'
      ORDER BY e.date DESC
      LIMIT 1
    `;

    const result = await query(eventCheckQuery, [contractorId]);

    // Prepare event context for state machine
    const eventContext = result.rows.length > 0 ? {
      eventId: result.rows[0].event_id,
      eventName: result.rows[0].event_name || result.rows[0].event_name_from_events,
      eventDate: result.rows[0].event_date,
      eventStatus: result.rows[0].event_status
    } : null;

    // Update state machine context
    await stateMachineManager.updateEventContext(contractorId, sessionId, eventContext);

    // Send MESSAGE_RECEIVED event to state machine
    await stateMachineManager.sendEvent(contractorId, sessionId, 'MESSAGE_RECEIVED', { eventContext });

    // Get current agent from state machine
    const agentType = await stateMachineManager.getCurrentAgent(contractorId, sessionId);

    // Get current state for logging
    const currentState = await stateMachineManager.getCurrentState(contractorId, sessionId);

    console.log(`[AI Concierge Controller] 🤖 State Machine in state: ${currentState}`);
    console.log(`[AI Concierge Controller] 🎯 Routed to: ${agentType} agent`);

    return {
      agentType: agentType || 'standard',
      agent: agentType === 'event' ? getOrCreateEventAgent() : getOrCreateStandardAgent(),
      eventId: eventContext?.eventId || null,
      sessionType: agentType || 'standard',
      context: eventContext
    };
  } catch (error) {
    console.error('[AI Concierge Controller] Error in state machine routing:', error);
    // Fallback to Standard Agent on error
    return {
      agentType: 'standard',
      agent: getOrCreateStandardAgent(),
      eventId: null,
      sessionType: 'standard',
      context: null
    };
  }
}

const aiConciergeController = {
  /**
   * Check if contractor has access to AI Concierge
   */
  async checkAccess(req, res, next) {
    try {
      // Development mode bypass for testing
      if (process.env.NODE_ENV === 'development' && !req.headers.authorization) {
        console.log('🔧 Dev mode: Bypassing auth check for AI Concierge access');
        return res.json({
          success: true,
          hasAccess: true,
          accessLevel: 'full',
          remainingCredits: 'unlimited',
          contractor: {
            id: 1,
            name: 'Test User',
            company: 'Test Company'
          }
        });
      }

      const contractorId = req.contractor?.id || req.query.contractor_id;

      if (!contractorId) {
        return res.status(400).json({
          success: false,
          error: 'Contractor ID is required'
        });
      }

      // Check contractor's access status
      const contractorResult = await query(
        'SELECT id, CONCAT(first_name, \' \', last_name) as name, company_name, feedback_completion_status, current_stage, completed_at FROM contractors WHERE id = $1',
        [contractorId]
      );

      if (contractorResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Contractor not found'
        });
      }

      const contractor = contractorResult.rows[0];
      // Grant access if they completed EITHER the contractor flow OR feedback survey
      const hasCompletedFlow = contractor.completed_at !== null || contractor.current_stage === 'completed';
      const hasCompletedFeedback = contractor.feedback_completion_status === 'completed';
      const hasAccess = hasCompletedFlow || hasCompletedFeedback;

      res.json({
        success: true,
        hasAccess,
        accessLevel: hasAccess ? 'full' : 'none',
        remainingCredits: hasAccess ? 'unlimited' : 0,
        contractor: {
          id: contractor.id,
          name: contractor.name,
          company: contractor.company_name
        }
      });
    } catch (error) {
      console.error('Error checking AI Concierge access:', error);
      next(error);
    }
  },

  /**
   * Get conversation history for a contractor
   */
  async getConversations(req, res, next) {
    try {
      // Development mode bypass for testing
      if (process.env.NODE_ENV === 'development' && !req.headers.authorization) {
        console.log('🔧 Dev mode: Getting conversations for test contractor');

        const devContractorId = '1';
        const { limit = 50, offset = 0 } = req.query;

        // Get REAL conversations from database
        const conversations = await AIConcierge.getConversations(
          devContractorId,
          parseInt(limit),
          parseInt(offset)
        );

        const total = await AIConcierge.getConversationCount(devContractorId);

        // Return welcome message if no conversations
        if (conversations.length === 0 && offset === 0) {
          const mockConversation = {
            id: 0,
            message_type: 'ai',
            content: `Hello! 👋 I'm your AI Concierge, here to help you grow your business. What would you like to discuss today?`,
            media_type: 'text',
            media_url: null,
            created_at: new Date().toISOString()
          };

          return res.json({
            success: true,
            conversations: [mockConversation],
            total: 1,
            hasMore: false
          });
        }

        return res.json({
          success: true,
          conversations,
          total,
          hasMore: (parseInt(offset) + conversations.length) < total
        });
      }

      const contractorId = req.contractor?.id;
      const { limit = 50, offset = 0 } = req.query;

      if (!contractorId) {
        return res.status(400).json({
          success: false,
          error: 'Authentication required'
        });
      }

      // Use exact database column name
      const conversations = await AIConcierge.getConversations(
        contractorId,
        parseInt(limit),
        parseInt(offset)
      );

      const total = await AIConcierge.getConversationCount(contractorId);

      // Return mock welcome message if no conversations
      if (conversations.length === 0 && offset === 0) {
        const mockConversation = {
          id: 0,
          message_type: 'ai',
          content: `Hello! 👋 I'm your AI Concierge, here to help you grow your business with personalized recommendations from our partner network. What would you like to discuss today?`,
          media_type: 'text',
          media_url: null,
          created_at: new Date().toISOString()
        };

        return res.json({
          success: true,
          conversations: [mockConversation],
          total: 1,
          hasMore: false
        });
      }

      res.json({
        success: true,
        conversations,
        total,
        hasMore: (parseInt(offset) + conversations.length) < total
      });
    } catch (error) {
      console.error('Error fetching conversations:', error);
      next(error);
    }
  },

  /**
   * Send a message to AI Concierge
   */
  async sendMessage(req, res, next) {
    try {
      // Development mode bypass for testing - use real AI but without auth
      if (process.env.NODE_ENV === 'development' && !req.headers.authorization) {
        console.log('🔧 Dev mode: Processing message without auth');

        const { message, session_id } = req.body;
        const file = req.file;

        // Use dev contractor ID
        const devContractorId = '1';

        // Process any uploaded media
        let processedFileContent = null;
        let media_type = null;
        let media_url = null;

        if (file) {
          const fileType = aiConciergeController.getFileType(file.mimetype);
          media_type = fileType;

          if (fileType === 'image') {
            const result = await openAIService.processImageWithVision(
              file.buffer,
              file.mimetype
            );
            processedFileContent = result.description || result;
          } else if (fileType === 'audio') {
            const result = await openAIService.transcribeAudioWithWhisper(
              file.buffer,
              file.originalname
            );
            processedFileContent = result.transcription || result;
          } else if (fileType === 'document') {
            processedFileContent = await openAIService.extractTextFromDocument(
              file.buffer,
              file.mimetype
            );
          }
        }

        // PHASE 4: Create or get session FIRST (needed for state machine)
        let sessionId = session_id;
        if (!sessionId) {
          sessionId = 'dev-' + uuidv4();
          console.log(`[Dev Mode] Creating new session for state machine`);
          await AIConcierge.createSession({
            contractor_id: devContractorId,
            session_id: sessionId,
            session_type: 'standard',  // Will be updated by state machine
            session_status: 'active',
            started_at: new Date()
          });
        }

        // PHASE 4: Route to appropriate agent using State Machine
        const routing = await routeToAgent(devContractorId, sessionId);
        console.log(`[Dev Mode] State Machine routed to: ${routing.agentType} agent`);
        console.log(`[Dev Mode] Session Type: ${routing.sessionType}`);

        // Save user message
        const userMessage = await AIConcierge.createConversationMessage({
          contractor_id: devContractorId,
          message_type: 'user',
          content: message || `[${media_type} file uploaded]`,
          media_type,
          media_url,
          created_at: new Date()
        });

        // Get contractor context for agent
        const contractorContext = routing.agentType === 'event'
          ? await getEventContext(devContractorId, routing.eventId)
          : await getStandardContext(devContractorId);

        // Prepare message for agent
        const fullContext = processedFileContent
          ? `User message: ${message || ''}\n\nFile content: ${processedFileContent}`
          : message;

        // PHASE 3 DAY 2: Wrap agent invocation with OpenAI Tracer
        const agentResponse = await OpenAITracer.traceCall(
          devContractorId,
          `ai_concierge_${routing.agentType}`,
          message || '[media file]',
          async () => routing.agent.invoke(
            {
              messages: [
                {
                  role: 'system',
                  content: JSON.stringify({
                    contractor: contractorContext,
                    eventContext: routing.context
                  })
                },
                {
                  role: 'user',
                  content: fullContext
                }
              ]
            },
            {
              configurable: { thread_id: sessionId }
            }
          )
        );

        // Extract AI response from agent messages
        const aiResponse = agentResponse.messages[agentResponse.messages.length - 1].content;

        // Save AI response - extract just the content field if it's an object
        const aiContent = typeof aiResponse === 'object' && aiResponse.content
          ? aiResponse.content
          : aiResponse;

        const aiMessage = await AIConcierge.createConversationMessage({
          contractor_id: devContractorId,
          message_type: 'ai',
          content: aiContent,
          media_type: 'text',
          created_at: new Date()
        });

        return res.json({
          success: true,
          userMessage: {
            id: userMessage.id,
            content: userMessage.content,
            media_type: userMessage.media_type
          },
          aiResponse: {
            id: aiMessage.id,
            content: aiMessage.content
          },
          session_id: sessionId
        });
      }

      // Allow admins to specify a contractorId for testing
      let contractorId = req.contractor?.id;
      const { message, session_id, contractorId: adminSpecifiedContractorId } = req.body;
      const file = req.file;

      // If user is admin and provides a contractorId, use it for testing
      if (req.user?.userType === 'admin' && adminSpecifiedContractorId) {
        console.log(`🔑 Admin override: Testing as contractor ${adminSpecifiedContractorId}`);
        contractorId = adminSpecifiedContractorId;
      }

      if (!contractorId) {
        return res.status(400).json({
          success: false,
          error: 'Authentication required'
        });
      }

      if (!message && !file) {
        return res.status(400).json({
          success: false,
          error: 'Message or media file is required'
        });
      }

      // Process any uploaded media
      let processedFileContent = null;
      let media_type = null;
      let media_url = null;

      if (file) {
        const fileType = aiConciergeController.getFileType(file.mimetype);
        media_type = fileType;

        if (fileType === 'image') {
          const result = await openAIService.processImageWithVision(
            file.buffer,
            file.mimetype
          );
          processedFileContent = result.description || result;
        } else if (fileType === 'audio') {
          const result = await openAIService.transcribeAudioWithWhisper(
            file.buffer,
            file.originalname
          );
          processedFileContent = result.transcription || result;
        } else if (fileType === 'document') {
          processedFileContent = await openAIService.extractTextFromDocument(
            file.buffer,
            file.mimetype
          );
        }
      }

      // PHASE 4: Create or get session FIRST (needed for state machine)
      let sessionId = session_id;
      if (!sessionId) {
        sessionId = uuidv4();
        await AIConcierge.createSession({
          contractor_id: contractorId,
          session_id: sessionId,
          session_type: 'standard',  // Will be updated by state machine
          session_status: 'active',
          started_at: new Date()
        });
      }

      // PHASE 4: Route to appropriate agent using State Machine
      const routing = await routeToAgent(contractorId, sessionId);
      console.log(`[Production Mode] State Machine routed to: ${routing.agentType} agent for contractor ${contractorId}`);

      // Save user message using exact database column names
      const userMessage = await AIConcierge.createConversationMessage({
        contractor_id: contractorId,
        message_type: 'user',
        content: message || `[${media_type} file uploaded]`,
        media_type,
        media_url,
        created_at: new Date()
      });

      // Get contractor context for agent
      const contractorContext = routing.agentType === 'event'
        ? await getEventContext(contractorId, routing.eventId)
        : await getStandardContext(contractorId);

      // Prepare message for agent
      const fullContext = processedFileContent
        ? `User message: ${message || ''}\n\nFile content: ${processedFileContent}`
        : message;

      // PHASE 3 DAY 2: Wrap agent invocation with OpenAI Tracer
      const agentResponse = await OpenAITracer.traceCall(
        contractorId,
        `ai_concierge_${routing.agentType}`,
        message || '[media file]',
        async () => routing.agent.invoke(
          {
            messages: [
              {
                role: 'system',
                content: JSON.stringify({
                  contractor: contractorContext,
                  eventContext: routing.context
                })
              },
              {
                role: 'user',
                content: fullContext
              }
            ]
          },
          {
            configurable: { thread_id: sessionId }
          }
        )
      );

      // Extract AI response from agent messages
      const aiResponse = agentResponse.messages[agentResponse.messages.length - 1].content;

      // Save AI response - extract just the content field if it's an object
      const aiContent = typeof aiResponse === 'object' && aiResponse.content
        ? aiResponse.content
        : aiResponse;

      // Save AI response using exact database column names
      const aiMessage = await AIConcierge.createConversationMessage({
        contractor_id: contractorId,
        message_type: 'ai',
        content: aiContent,
        media_type: 'text',
        created_at: new Date()
      });

      res.json({
        success: true,
        userMessage: {
          id: userMessage.id,
          content: userMessage.content,
          media_type: userMessage.media_type
        },
        aiResponse: {
          id: aiMessage.id,
          content: aiMessage.content
        },
        session_id: sessionId
      });
    } catch (error) {
      console.error('Error processing message:', error);
      next(error);
    }
  },

  /**
   * Clear conversation history for a contractor
   */
  async clearConversations(req, res, next) {
    try {
      const contractorId = req.contractor?.id;

      if (!contractorId) {
        return res.status(400).json({
          success: false,
          error: 'Authentication required'
        });
      }

      // Use exact database column name
      const deleted = await AIConcierge.deleteConversations(contractorId);

      res.json({
        success: true,
        message: 'Conversation history cleared',
        deletedCount: deleted.length
      });
    } catch (error) {
      console.error('Error clearing conversations:', error);
      next(error);
    }
  },

  /**
   * Get a session (read-only)
   * PHASE 2: Sessions are ONLY created in sendMessage with proper agent routing
   */
  async getSession(req, res, next) {
    try {
      const contractorId = req.contractor?.id;
      const { session_id } = req.params;

      if (!contractorId) {
        return res.status(400).json({
          success: false,
          error: 'Authentication required'
        });
      }

      let session;
      if (session_id) {
        // Use exact database column name
        session = await AIConcierge.getSessionById(session_id);
      } else {
        // Get most recent active session
        const sessions = await AIConcierge.getSessionsByContractor(contractorId, 1);
        session = sessions.length > 0 && sessions[0].session_status === 'active'
          ? sessions[0]
          : null;
      }

      // PHASE 2: Do NOT create sessions here - only in sendMessage with routing
      if (!session) {
        return res.json({
          success: true,
          session: null,
          message: 'No active session found. Send a message to create a new session.'
        });
      }

      res.json({
        success: true,
        session
      });
    } catch (error) {
      console.error('Error retrieving session:', error);
      next(error);
    }
  },

  /**
   * End a session
   */
  async endSession(req, res, next) {
    try {
      const { session_id } = req.params;

      if (!session_id) {
        return res.status(400).json({
          success: false,
          error: 'Session ID is required'
        });
      }

      // Use exact database column name
      const session = await AIConcierge.endSession(session_id);

      if (!session) {
        return res.status(404).json({
          success: false,
          error: 'Session not found'
        });
      }

      res.json({
        success: true,
        message: 'Session ended',
        session
      });
    } catch (error) {
      console.error('Error ending session:', error);
      next(error);
    }
  },

  // Helper methods
  getFileType(mimetype) {
    if (mimetype.startsWith('image/')) return 'image';
    if (mimetype.startsWith('audio/')) return 'audio';
    if (mimetype.includes('pdf') || mimetype.includes('document')) return 'document';
    return 'unknown';
  },

  async testKnowledgeBase(req, res) {
    try {
      // Fetch books
      const booksResult = await query(
        `SELECT title, author, focus_areas_covered FROM books WHERE status IN ('published', 'active') LIMIT 5`
      );

      // Fetch podcasts
      const podcastsResult = await query(
        `SELECT title, host, focus_areas_covered FROM podcasts WHERE is_active = true AND status = 'published' LIMIT 5`
      );

      // Fetch partners
      const partnersResult = await query(
        `SELECT company_name, powerconfidence_score FROM strategic_partners WHERE is_active = true LIMIT 5`
      );

      res.json({
        success: true,
        data: {
          booksLoaded: booksResult.rows.length,
          books: booksResult.rows,
          podcastsLoaded: podcastsResult.rows.length,
          podcasts: podcastsResult.rows,
          partnersLoaded: partnersResult.rows.length,
          partners: partnersResult.rows
        }
      });
    } catch (error) {
      console.error('Test knowledge error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  /**
   * Map database table names to API property names
   * Uses metadata from ai_metadata table to ensure correct naming
   */
  async mapKnowledgeBaseToApiProperties(knowledgeBase) {
    try {
      const { query } = require('../config/database');

      // Get API property mappings from database
      const result = await query(`
        SELECT table_name, api_property_name
        FROM ai_metadata
        WHERE is_entity_table = true
        AND include_in_knowledge_base = true
      `);

      const mappedKnowledge = { ...knowledgeBase };

      // Map each table to its API property name
      result.rows.forEach(({ table_name, api_property_name }) => {
        if (knowledgeBase[table_name]?.data) {
          console.log(`[AIConcierg] Mapping ${table_name} to ${api_property_name} with ${knowledgeBase[table_name].data.length} records`);
          mappedKnowledge[api_property_name] = knowledgeBase[table_name].data;
        } else if (knowledgeBase[table_name]) {
          console.log(`[AIConcierg] Table ${table_name} has no data property`);
        }
      });

      // Ensure critical properties exist
      mappedKnowledge.videos = mappedKnowledge.videos || knowledgeBase.video_content?.data || [];
      mappedKnowledge.books = mappedKnowledge.books || knowledgeBase.books?.data || [];
      mappedKnowledge.podcasts = mappedKnowledge.podcasts || knowledgeBase.podcasts?.data || [];
      mappedKnowledge.events = mappedKnowledge.events || knowledgeBase.events?.data || [];
      mappedKnowledge.partners = mappedKnowledge.partners || knowledgeBase.strategic_partners?.data || [];

      return mappedKnowledge;
    } catch (error) {
      console.error('[AIConcierg] Error mapping knowledge base:', error);

      // Fallback to manual mapping if database query fails
      return {
        ...knowledgeBase,
        videos: knowledgeBase.video_content?.data || [],
        books: knowledgeBase.books?.data || [],
        podcasts: knowledgeBase.podcasts?.data || [],
        events: knowledgeBase.events?.data || [],
        partners: knowledgeBase.strategic_partners?.data || []
      };
    }
  },

  async generateAIResponse(userInput, contractor, contractorId, eventContext = null) {
    try {
      // Get recent conversation history
      const conversationHistory = await AIConcierge.getConversations(
        contractorId || '1',
        10,  // Get last 10 messages
        0
      );

      // PHASE 1: Get real-time event context from materialized views
      const contextAssembler = require('../services/contextAssembler');
      let eventContextFromViews = null;

      try {
        const assembledContext = await contextAssembler.getEventContext(contractorId || 1);

        if (assembledContext.total_active_sessions > 0 || assembledContext.total_upcoming_sessions > 0) {
          // Format for AI consumption
          eventContextFromViews = contextAssembler.formatForAI(assembledContext);
          console.log('[AIConcierg] ✅ Event context from materialized views loaded');
          console.log('[AIConcierg] Active sessions:', assembledContext.total_active_sessions);
          console.log('[AIConcierg] Upcoming sessions:', assembledContext.total_upcoming_sessions);
        } else {
          console.log('[AIConcierg] No active or upcoming sessions for contractor');
        }
      } catch (error) {
        console.error('[AIConcierg] Error loading event context from views:', error);
        // Continue without event context - not critical
      }

      // Use the new AI Knowledge Service for dynamic data retrieval
      const aiKnowledgeService = require('../services/aiKnowledgeService');

      // Force refresh in development for testing (req is not available in this context)
      const forceRefresh = false; // Can be passed as parameter if needed

      // Get comprehensive knowledge base with all AI-enhanced fields
      const knowledgeBase = await aiKnowledgeService.getComprehensiveKnowledge(contractorId);

      // Get cross-entity insights based on contractor's focus areas
      // Parse focus_areas in case it's a JSON string from the database
      const focusAreas = safeJsonParse(contractor?.focus_areas, []);
      const crossEntityInsights = await aiKnowledgeService.getCrossEntityInsights(focusAreas);

      // Build comprehensive context for AI
      const enhancedKnowledge = {
        ...knowledgeBase,
        crossEntityInsights,
        conversationHistory,
        ...(eventContext && { currentEvent: eventContext }),  // Add legacy event context if provided
        ...(eventContextFromViews && { eventContextFromViews })  // Add Phase 1 event context from materialized views
      };

      // Debug log if event context provided
      if (eventContext) {
        console.log('[AIConcierg] ✅ Legacy event context passed to AI:', eventContext.name, 'with', eventContext.speakers?.length || 0, 'speakers');
      }

      // Debug log for Phase 1 event context from materialized views
      if (eventContextFromViews) {
        console.log('[AIConcierg] ✅ Phase 1 event context from materialized views loaded');
        console.log('[AIConcierg] Event context length:', eventContextFromViews.length, 'characters');
      }

      // Debug logging
      console.log('📚 Knowledge base loaded:', {
        tables: knowledgeBase._metadata?.tablesIncluded || [],
        totalRecords: knowledgeBase._metadata?.totalRecords || 0,
        aiFields: (knowledgeBase._metadata?.aiFieldsAvailable || []).length
      });

      // Debug check for partner 93
      if (knowledgeBase.partners && knowledgeBase.partners.data) {
        const partner93 = knowledgeBase.partners.data.find(p => p.id === 93);
        if (partner93) {
          console.log('🔍 Partner 93 found in knowledge base');
          console.log('🔍 Partner 93 has ai_summary?', !!partner93.ai_summary);
          console.log('🔍 Partner 93 ai_summary length:', partner93.ai_summary ? partner93.ai_summary.length : 0);
        } else {
          console.log('🔍 Partner 93 NOT found in knowledge base');
        }
      }

      // LEGACY CODE KEPT FOR FALLBACK - Remove after testing
      if (!knowledgeBase || Object.keys(knowledgeBase).length === 0) {
        console.log('[AIConcierg] Falling back to legacy queries...');

        // 1. STRATEGIC PARTNERS - Complete Swiss Army Knife Data
        const partnersResult = await query(
        `SELECT
          sp.company_name,
          sp.focus_areas_served,
          sp.powerconfidence_score,
          sp.service_category,
          sp.value_proposition,
          sp.testimonials,
          sp.average_satisfaction,
          sp.total_contractor_engagements,
          sp.success_stories,
          sp.unique_value,
          sp.ideal_customer,
          sp.key_differentiators,
          sp.total_feedback_responses,
          sp.feedback_trend,
          sp.ai_summary,
          sp.ai_insights,
          sp.positive_outcomes,
          sp.engagement_rate,
          sp.time_to_value,
          sp.website,
          sp.contact_email,
          sp.contact_phone,
          sp.pricing_model,
          sp.onboarding_process,
          sp.integration_requirements,
          sp.support_options,
          sp.contract_terms,
          sp.geographic_regions,
          sp.why_clients_choose_you,
          sp.why_clients_choose_competitors,
          sp.company_description,
          sp.revenue_tiers,
          sp.implementation_difficulty,
          COUNT(DISTINCT db.id) as total_bookings,
          COUNT(DISTINCT cpm.id) as total_matches,
          AVG(cpm.match_score) as avg_match_score,
          MAX(ph.score) as highest_historical_score,
          MIN(ph.score) as lowest_historical_score
         FROM strategic_partners sp
         LEFT JOIN demo_bookings db ON db.partner_id = sp.id
         LEFT JOIN contractor_partner_matches cpm ON cpm.partner_id = sp.id
         LEFT JOIN powerconfidence_history ph ON ph.partner_id = sp.id
         WHERE sp.is_active = true
         GROUP BY sp.id, sp.company_name, sp.focus_areas_served,
                  sp.powerconfidence_score, sp.service_category,
                  sp.value_proposition, sp.testimonials,
                  sp.average_satisfaction, sp.total_contractor_engagements,
                  sp.success_stories, sp.unique_value, sp.ideal_customer,
                  sp.key_differentiators, sp.total_feedback_responses,
                  sp.feedback_trend, sp.ai_summary, sp.ai_insights,
                  sp.positive_outcomes, sp.engagement_rate, sp.time_to_value,
                  sp.website, sp.contact_email, sp.contact_phone,
                  sp.pricing_model, sp.onboarding_process, sp.integration_requirements,
                  sp.support_options, sp.contract_terms, sp.geographic_regions,
                  sp.why_clients_choose_you, sp.why_clients_choose_competitors,
                  sp.company_description, sp.revenue_tiers, sp.implementation_difficulty
         LIMIT 30`
      );
      const partners = partnersResult.rows;

      // 2. AGGREGATED CONTRACTOR STATISTICS (privacy-safe)
      const contractorStatsResult = await query(
        `SELECT
          COUNT(DISTINCT id) as total_contractors,
          COUNT(DISTINCT CASE WHEN completed_at IS NOT NULL THEN id END) as completed_flows,
          json_agg(DISTINCT focus_areas) as all_focus_areas,
          json_agg(DISTINCT revenue_tier) as revenue_distribution,
          json_agg(DISTINCT team_size) as team_sizes,
          AVG(CASE WHEN feedback_completion_status = 'completed' THEN 1 ELSE 0 END) * 100 as feedback_rate
         FROM contractors
         WHERE id != $1`,
        [contractorId]
      );
      const industryStats = contractorStatsResult.rows[0];

      // 3. BOOKS - Complete Resource Information
      const booksResult = await query(
        `SELECT
          b.title,
          b.author,
          b.description,
          b.topics,
          b.focus_areas_covered,
          b.target_audience,
          b.key_takeaways,
          b.ai_summary,
          b.reading_time,
          b.difficulty_level,
          b.amazon_url,
          b.sample_chapter_link,
          b.table_of_contents,
          b.author_linkedin_url,
          b.author_website,
          b.intended_solutions,
          b.book_goals,
          b.author_availability,
          b.implementation_guides,
          b.companion_resources,
          b.testimonials,
          b.publication_year,
          COUNT(DISTINCT ca.id) as total_chapters,
          AVG(ca.complexity_score) as avg_complexity,
          SUM(ca.reading_time_minutes) as total_reading_minutes,
          json_agg(DISTINCT ca.key_concepts) as all_key_concepts,
          json_agg(DISTINCT ca.action_items) as all_action_items
         FROM books b
         LEFT JOIN chapter_analysis ca ON ca.book_id = b.id
         WHERE b.status IN ('published', 'active')
         GROUP BY b.id, b.title, b.author, b.description, b.topics,
                  b.focus_areas_covered, b.target_audience, b.key_takeaways,
                  b.ai_summary, b.reading_time, b.difficulty_level,
                  b.amazon_url, b.sample_chapter_link, b.table_of_contents,
                  b.author_linkedin_url, b.author_website, b.intended_solutions,
                  b.book_goals, b.author_availability, b.implementation_guides,
                  b.companion_resources, b.testimonials, b.publication_year
`
      );
      const books = booksResult.rows;

      // 4. PODCASTS - Complete Listening Experience
      const podcastsResult = await query(
        `SELECT DISTINCT
          p.title as podcast_title,
          p.host,
          p.topics,
          p.focus_areas_covered,
          p.description,
          p.notable_guests,
          p.ai_summary,
          p.actionable_insights,
          p.spotify_url,
          p.apple_podcasts_url,
          p.youtube_url,
          p.website,
          p.frequency,
          p.format,
          p.booking_link,
          p.subscriber_count,
          p.download_average,
          p.testimonials,
          p.host_bio,
          p.target_audience,
          p.created_at,
          ps.name as show_name,
          ps.category as show_category,
          ps.total_episodes,
          ps.rss_feed_url,
          pe.title as latest_episode_title,
          pe.guest_names as latest_episode_guests,
          pe.description as latest_episode_description,
          pe.audio_url as latest_episode_url,
          pe.duration_seconds as latest_episode_duration
         FROM podcasts p
         LEFT JOIN podcast_shows ps ON ps.is_active = true
         LEFT JOIN podcast_episodes pe ON pe.show_id = ps.id
         WHERE p.is_active = true
         AND p.status = 'published'
         ORDER BY p.created_at DESC`
      );
      const podcasts = podcastsResult.rows;
      console.log('🎙️ Raw podcasts from DB:', podcasts.length, podcasts.length > 0 ? podcasts[0].podcast_title : 'No podcasts');

      // 5. EVENTS with comprehensive details for AI Concierge assistance
      const eventsResult = await query(
        `SELECT
          e.name,
          e.event_type,
          e.topics,
          e.target_audience,
          e.description,
          e.date,
          e.end_date,
          e.registration_deadline,
          e.location,
          e.format,
          e.duration,
          e.focus_areas_covered,
          e.ai_summary,
          e.speaker_profiles,
          e.agenda_highlights,
          e.past_attendee_testimonials,
          e.networking_opportunities,
          e.networking_quality_score,
          e.success_metrics,
          e.price_range,
          e.registration_url,
          e.website,
          e.hotel_block_url,
          e.sponsors,
          e.expected_attendance,
          e.organizer_name,
          e.organizer_email,
          e.organizer_company,
          e.session_recordings,
          e.follow_up_resources,
          e.post_event_support,
          e.implementation_support,
          e.roi_tracking,
          COUNT(DISTINCT aee.contractor_id) as total_past_attendees,
          AVG(aee.engagement_score) as avg_engagement_score,
          AVG(CASE WHEN aee.would_recommend = true THEN 1.0 ELSE 0.0 END) * 100 as recommendation_rate
         FROM events e
         LEFT JOIN ai_event_experiences aee ON aee.event_id = e.id
         WHERE e.status IN ('published', 'active')
         AND (e.date >= CURRENT_DATE OR e.format = 'recurring' OR e.date IS NULL)
         GROUP BY e.id, e.name, e.event_type, e.topics, e.target_audience,
                  e.description, e.date, e.end_date, e.registration_deadline,
                  e.location, e.format, e.duration, e.focus_areas_covered,
                  e.ai_summary, e.speaker_profiles, e.agenda_highlights,
                  e.past_attendee_testimonials, e.networking_opportunities,
                  e.networking_quality_score, e.success_metrics, e.price_range,
                  e.registration_url, e.website, e.hotel_block_url, e.sponsors,
                  e.expected_attendance, e.organizer_name, e.organizer_email,
                  e.organizer_company, e.session_recordings, e.follow_up_resources,
                  e.post_event_support, e.implementation_support, e.roi_tracking
         ORDER BY e.date ASC
         LIMIT 10`
      );
      const events = eventsResult.rows;

      // 6. VIDEOS - Complete Visual Learning Library
      const videosResult = await query(
        `SELECT
          vc.title,
          vc.description,
          vc.video_type,
          vc.duration_seconds,
          vc.file_url,
          vc.thumbnail_url,
          va.transcript,
          va.key_talking_points,
          va.unique_value_props,
          va.competitive_advantages,
          va.use_cases_mentioned,
          va.pain_points_addressed,
          va.specific_metrics_mentioned,
          va.demo_structure_score,
          va.value_prop_clarity,
          va.presenter_confidence,
          va.authenticity_score,
          va.recommendation_strength,
          va.viewer_retention_estimate,
          va.persuasiveness_score,
          vp.views_count,
          vp.engagement_rate,
          vp.avg_watch_time_seconds,
          vp.conversions_attributed,
          vp.demo_requests_generated,
          vp.feedback_positive
         FROM video_content vc
         LEFT JOIN video_analysis va ON va.video_id = vc.id
         LEFT JOIN video_performance vp ON vp.video_id = vc.id
         WHERE vc.is_active = true
         ORDER BY vc.created_at DESC
         LIMIT 15`
      );
      const videos = videosResult.rows;

      // 7. FEEDBACK INSIGHTS (from feedback_responses table)
      const feedbackInsightsResult = await query(
        `SELECT
          COUNT(*) as total_responses,
          AVG(CAST(rating AS FLOAT)) as avg_rating,
          MAX(rating) as highest_rating,
          MIN(rating) as lowest_rating
         FROM feedback_responses
         WHERE rating IS NOT NULL`
      );
      const feedbackInsights = feedbackInsightsResult.rows;

      // Build comprehensive knowledge base
      const knowledgeBase = {
        partners,
        industryStats,
        books,
        podcasts,
        events,
        videos,
        feedbackInsights
      };

      // Debug logging
      console.log('📚 Books loaded:', books.length);
      if (books.length > 0) {
        console.log('Sample book:', books[0].title, 'by', books[0].author);
      }
      console.log('🎙️ Podcasts loaded:', podcasts.length);
      if (podcasts.length > 0) {
        console.log('Sample podcast:', podcasts[0].podcast_title || podcasts[0].title, 'hosted by', podcasts[0].host);
      }
      console.log('🎯 Partners loaded:', partners.length);
      console.log('📹 Videos loaded:', videos.length);
      console.log('🎪 Events loaded:', events.length);
      if (events.length > 0) {
        console.log('Sample event:', events[0].name);
      }
      } // End of legacy fallback block

      // Use dynamic knowledge if available (already has API property names)
      const finalKnowledge = enhancedKnowledge && enhancedKnowledge._metadata
        ? enhancedKnowledge
        : knowledgeBase;

      // Debug what partners we're passing
      // Use the full partners data (now mapped from strategic_partners)
      const partnersToPass = enhancedKnowledge.partners?.data ||
                            finalKnowledge.partners?.data ||
                            crossEntityInsights?.matchingPartners ||
                            partners || [];
      console.log('[AIConcierg] Passing partners to OpenAI:', partnersToPass?.length || 0, 'partners');
      if (partnersToPass && partnersToPass.length > 0) {
        console.log('[AIConcierg] First partner:', JSON.stringify(partnersToPass[0]));
      }

      // CRITICAL: Verify event context is in finalKnowledge before passing to OpenAI
      if (finalKnowledge.currentEvent) {
        console.log('[AIConcierg] ✅ Legacy currentEvent CONFIRMED in finalKnowledge:', finalKnowledge.currentEvent.name);
        console.log('[AIConcierg] ✅ currentEvent speakers field:', !!finalKnowledge.currentEvent.speakers);
        console.log('[AIConcierg] ✅ currentEvent fullSchedule field:', !!finalKnowledge.currentEvent.fullSchedule);
        console.log('[AIConcierg] ✅ currentEvent speakers count:', finalKnowledge.currentEvent.speakers?.length || 0);
        console.log('[AIConcierg] ✅ currentEvent fullSchedule count:', finalKnowledge.currentEvent.fullSchedule?.length || 0);
      } else {
        console.log('[AIConcierg] ℹ️ No legacy currentEvent in finalKnowledge');
      }

      // Verify Phase 1 event context from materialized views
      if (finalKnowledge.eventContextFromViews) {
        console.log('[AIConcierg] ✅ Phase 1 eventContextFromViews CONFIRMED in finalKnowledge');
        console.log('[AIConcierg] ✅ Event context length:', finalKnowledge.eventContextFromViews.length, 'characters');
      } else {
        console.log('[AIConcierg] ℹ️ No Phase 1 event context from views');
      }

      const response = await openAIService.generateConciergeResponse(
        userInput,
        contractor,
        conversationHistory,
        partnersToPass,
        finalKnowledge  // Pass the full knowledge base
      );

      // Extract just the content from the response object
      return response.content || response;
    } catch (error) {
      if (error.message?.includes('API key')) {
        return `I'm currently in setup mode. Once configured, I'll be able to provide personalized recommendations for ${contractor.company_name}.`;
      }
      throw error;
    }
  }
};

module.exports = aiConciergeController;