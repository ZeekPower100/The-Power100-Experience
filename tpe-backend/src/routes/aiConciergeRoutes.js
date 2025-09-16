const { safeJsonParse, safeJsonStringify } = require('../utils/jsonHelpers');

const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const { flexibleProtect } = require('../middleware/flexibleAuth');
const { AppError } = require('../middleware/errorHandler');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const dataCollectionService = require('../services/dataCollectionService');
const outcomeTrackingService = require('../services/outcomeTrackingService');
const openAIService = require('../services/openAIService');

// Configure multer for memory storage (no permanent files)
const storage = multer.memoryStorage(); // Files stored in memory temporarily

const upload = multer({
  storage,
  limits: {
    fileSize: 25 * 1024 * 1024 // 25MB limit for processing
  },
  fileFilter: (req, file, cb) => {
    // Allow images, audio, and documents
    const allowedMimes = [
      // Images for Vision API
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      // Audio for Whisper API
      'audio/mp3', 'audio/wav', 'audio/wave', 'audio/x-wav', 'audio/ogg', 'audio/mpeg', 'audio/webm',
      'audio/mp4', 'audio/m4a', 'audio/x-m4a',
      // Documents for text extraction
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ];

    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new AppError('File type not supported', 400), false);
    }
  }
});

// Check contractor's AI Concierge access
const checkAIConciergeAccess = async (req, res, next) => {
  try {
    // Get contractor ID from various possible sources
    const contractorId = req.user?.id || req.user?.contractorId || req.contractorId;

    if (!contractorId) {
      return next(new AppError('Contractor not authenticated', 401));
    }

    // Check if contractor completed feedback loop
    const contractorResult = await query(`
      SELECT 
        c.*,
        CASE 
          WHEN c.feedback_completion_status = 'completed' THEN 1
          ELSE 0
        END as has_ai_access
      FROM contractors c 
      WHERE c.id = $1
    `, [contractorId]);

    if (contractorResult.rows.length === 0) {
      return next(new AppError('Contractor not found', 404));
    }

    const contractor = contractorResult.rows[0];
    
    if (!contractor.has_ai_access) {
      return res.status(403).json({
        success: false,
        message: 'AI Concierge access requires completion of feedback loop',
        accessRequired: {
          feedbackCompleted: contractor.feedback_completion_status === 'completed'
        }
      });
    }

    req.contractor = contractor;
    next();
  } catch (error) {
    return next(error);
  }
};

// Get contractor's AI Concierge access status
router.get('/access-status', async (req, res, next) => {
  // Development mode bypass for testing
  if (process.env.NODE_ENV === 'development' && !req.headers.authorization) {
    console.log('🔧 Dev mode: Bypassing auth for AI Concierge testing');
    return res.json({
      success: true,
      contractor: {
        name: 'Test Contractor',
        company: 'Test Construction Co',
        focusAreas: ['Revenue Growth', 'Team Building', 'Operations'],
        completedFeedback: true,
        aiCoachAccess: true
      }
    });
  }

  // Normal flow with authentication
  return flexibleProtect(req, res, async () => {
  try {
    // Get contractor ID from various possible sources
    const contractorId = req.user?.id || req.user?.contractorId || req.contractorId;

    console.log('🔍 AI Concierge access check - contractorId:', contractorId, 'userType:', req.userType);

    if (!contractorId) {
      return res.status(401).json({
        success: false,
        error: 'Contractor authentication required'
      });
    }

    // Get real contractor data from database
    const contractorResult = await query(`
      SELECT
        id,
        name,
        company_name,
        focus_areas,
        feedback_completion_status
      FROM contractors
      WHERE id = $1
    `, [contractorId]);

    if (contractorResult.rows.length === 0) {
      // Mock data as fallback for demo
      const mockContractor = {
        id: contractorId,
        name: 'John Smith',
        company_name: 'Smith Construction',
        focus_areas: '["Revenue Growth","Team Building","Operations"]',
        feedback_completion_status: 'completed'
      };

      const hasAccess = mockContractor.feedback_completion_status === 'completed';

      return res.json({
        success: true,
        contractor: {
          name: mockContractor.name,
          company: mockContractor.company_name,
          focusAreas: safeJsonParse(mockContractor.focus_areas || '[]'),
          completedFeedback: mockContractor.feedback_completion_status === 'completed',
          aiCoachAccess: hasAccess
        }
      });
    }

    const contractor = contractorResult.rows[0];
    const hasAccess = contractor.feedback_completion_status === 'completed';

    res.json({
      success: true,
      contractor: {
        name: contractor.name,
        company: contractor.company_name,
        focusAreas: safeJsonParse(contractor.focus_areas || '[]'),
        completedFeedback: contractor.feedback_completion_status === 'completed',
        aiCoachAccess: hasAccess
      }
    });
  } catch (error) {
    next(error);
  }
  });
});

// Get conversation history
router.get('/conversations', async (req, res, next) => {
  // Development mode bypass for testing
  if (process.env.NODE_ENV === 'development' && !req.headers.authorization) {
    console.log('🔧 Dev mode: Returning mock conversations for AI Concierge');
    return res.json({
      success: true,
      conversations: [],
      total: 0
    });
  }

  // Normal flow with authentication
  return flexibleProtect(req, res, () => checkAIConciergeAccess(req, res, async () => {
  try {
    const contractorId = req.contractor.id;
    const { limit = 50, offset = 0 } = req.query;

    // In real implementation, fetch from ai_concierge_conversations table
    const conversationsResult = await query(`
      SELECT 
        id,
        message_type,
        content,
        media_type,
        media_url,
        created_at
      FROM ai_concierge_conversations 
      WHERE contractor_id = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `, [contractorId, parseInt(limit), parseInt(offset)]);

    // Mock conversation for demo
    const mockConversations = [
      {
        id: 1,
        message_type: 'ai',
        content: `Hello ${req.contractor.name}! 👋 I'm your AI Concierge, powered by insights from your partner network and business intelligence. I'm here to help you grow ${req.contractor.company_name} with personalized recommendations. What would you like to discuss today?`,
        media_type: 'text',
        media_url: null,
        created_at: new Date().toISOString()
      }
    ];

    res.json({
      success: true,
      conversations: conversationsResult.rows.length > 0 ? conversationsResult.rows : mockConversations,
      total: conversationsResult.rows.length || 1
    });
  } catch (error) {
    next(error);
  }
  }));
});

// Send message to AI Concierge
router.post('/message', upload.single('media'), async (req, res, next) => {
  try {
    // Development mode bypass for testing
    if (process.env.NODE_ENV === 'development' && !req.headers.authorization) {
      console.log('🔧 Dev mode: Bypassing auth for AI Concierge message');

      // Mock contractor for development
      req.contractor = {
        id: 'dev-contractor-1',
        name: 'Test Contractor',
        company_name: 'Test Construction Co',
        focus_areas: JSON.stringify(['Revenue Growth', 'Team Building', 'Operations']),
        revenue_tier: '$1M-$3M',
        team_size: '11-20',
        stage: 'growth'
      };
    } else {
      // Normal flow - check authentication first
      // This would normally be handled by middleware but we need the contractor object
      if (!req.contractor) {
        return res.status(403).json({
          success: false,
          message: 'AI Concierge access requires authentication'
        });
      }
    }
    const contractorId = req.contractor.id;
    const { content, mediaType = 'text' } = req.body;
    const conversationId = req.body.conversationId || uuidv4();
    const startTime = Date.now();
    
    if (!content && !req.file) {
      return next(new AppError('Message content or media file required', 400));
    }

    // Process file if uploaded (extract content without saving)
    let processedFileContent = null;
    let fileDescription = null;

    if (req.file) {
      console.log(`📎 Processing ${req.file.mimetype} file (${req.file.size} bytes) in memory`);

      // Process the file based on type
      const fileType = getMediaType(req.file.mimetype);

      if (fileType === 'image') {
        // Process with Vision API
        const visionResult = await openAIService.processImageWithVision(
          req.file.buffer,
          req.file.mimetype
        );
        processedFileContent = visionResult.description;
        fileDescription = `[Image Analysis]: ${visionResult.description}`;
      } else if (fileType === 'audio') {
        // Process with Whisper API
        const whisperResult = await openAIService.transcribeAudioWithWhisper(
          req.file.buffer,
          req.file.originalname
        );
        processedFileContent = whisperResult.transcription;
        fileDescription = `[Audio Transcription]: ${whisperResult.transcription}`;
      } else if (fileType === 'document') {
        // Extract text from document
        processedFileContent = await openAIService.extractTextFromDocument(
          req.file.buffer,
          req.file.mimetype
        );
        fileDescription = `[Document Content]: ${processedFileContent.substring(0, 500)}...`;
      }
    }

    // Save user message with processed content in the content field
    // Combine user's message with the processed file content
    let fullMessageContent = content || '';
    if (fileDescription) {
      fullMessageContent = fullMessageContent ?
        `${fullMessageContent}\n\n${fileDescription}` :
        fileDescription;
    }

    const userMessageResult = await query(`
      INSERT INTO ai_concierge_conversations (
        contractor_id,
        message_type,
        content,
        media_type,
        media_url,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6)
    `, [
      contractorId,
      'user',
      fullMessageContent || 'Shared a file',
      req.file ? getMediaType(req.file.mimetype) : mediaType,
      null, // No file URL since we don't save files
      new Date().toISOString()
    ]);

    // Generate AI response with processed content
    const aiResponse = await generateAIResponse(
      content,
      processedFileContent,
      req.contractor,
      fileDescription
    );
    const responseTime = Date.now() - startTime;
    
    // Track the AI conversation
    const messages = [
      {
        role: 'user',
        content: content || 'Shared a file',
        timestamp: new Date().toISOString(),
        hasMedia: !!req.file,
        mediaType: req.file ? getMediaType(req.file.mimetype) : null
      },
      {
        role: 'assistant',
        content: aiResponse,
        timestamp: new Date().toISOString(),
        model: process.env.AI_MODEL || 'gpt-4',
        responseTime: responseTime
      }
    ];
    
    // Track with outcome service
    await outcomeTrackingService.trackAIInteraction(contractorId, {
      conversationId: conversationId,
      userType: 'contractor',
      messages: messages,
      totalTokens: estimateTokens(content + aiResponse),
      cost: estimateCost(content + aiResponse),
      responseTime: responseTime,
      helpfulRating: null, // Will be updated when user provides feedback
      questionAnswered: true,
      actionTaken: null,
      followUpNeeded: false
    });
    
    // Save AI response
    const aiMessageResult = await query(`
      INSERT INTO ai_concierge_conversations (
        contractor_id, 
        message_type, 
        content, 
        media_type,
        created_at
      ) VALUES ($1, $2, $3, $4, $5)
    `, [
      contractorId,
      'ai',
      aiResponse,
      'text',
      new Date().toISOString()
    ]);

    res.json({
      success: true,
      userMessage: {
        id: userMessageResult.lastID,
        type: 'user',
        content: content || fileDescription || 'Shared a file',
        mediaType: req.file ? getMediaType(req.file.mimetype) : mediaType,
        processedContent: processedFileContent ? processedFileContent.substring(0, 200) + '...' : null,
        timestamp: new Date()
      },
      aiResponse: {
        id: aiMessageResult.lastID,
        type: 'ai',
        content: aiResponse,
        timestamp: new Date()
      }
    });
  } catch (error) {
    next(error);
  }
});

// Generate AI response using OpenAI service
const generateAIResponse = async (userInput, processedFileContent, contractor, fileDescription) => {
  try {
    // Get conversation history for context
    const historyResult = await query(`
      SELECT message_type, content, created_at
      FROM ai_concierge_conversations
      WHERE contractor_id = $1
      ORDER BY created_at DESC
      LIMIT 20
    `, [contractor.id]);

    const conversationHistory = historyResult.rows.reverse(); // Oldest first

    // Fetch matched partners using the matching algorithm
    const matchingService = require('../services/matchingService');
    let partners = [];

    try {
      // Get matched partners for this contractor
      const matches = await matchingService.matchContractorWithPartners(contractor);

      // Extract partner data from matches
      partners = matches.map(match => match.partner);

      console.log(`🤝 Found ${partners.length} matched partners for AI Concierge context`);
    } catch (matchError) {
      console.log('⚠️ Could not fetch matched partners, using fallback:', matchError.message);

      // Fallback: Get top 3 active partners from database
      const partnersResult = await query(`
        SELECT
          id,
          company_name,
          focus_areas_served,
          capabilities,
          powerconfidence_score,
          key_differentiators
        FROM partners
        WHERE is_active = true
        ORDER BY powerconfidence_score DESC NULLS LAST
        LIMIT 3
      `);

      partners = partnersResult.rows;
    }

    // Combine user input with processed file content if available
    let fullContext = userInput || '';

    if (processedFileContent) {
      // Add file context to the user's message
      if (fileDescription) {
        fullContext = `${fullContext}\n\n${fileDescription}`;
      }
    }

    // Generate conversational response with full context
    const response = await openAIService.generateConciergeResponse(
      fullContext,
      contractor,
      conversationHistory,
      partners // Pass the real partners to the AI
    );

    // Return the AI response content
    return response.content || response;

  } catch (error) {
    console.error('Error generating AI response:', error);

    // Check if it's an API key issue
    if (error.message && error.message.includes('API key')) {
      // Return a helpful message for missing API key
      return `I'm currently in setup mode and need an OpenAI API key to provide personalized AI responses.

For now, let me share some general insights based on your profile:

Your focus areas of ${contractor.focus_areas ? safeJsonParse(contractor.focus_areas).join(', ') : 'business growth'} are common challenges for contractors in the ${contractor.revenue_tier || 'growth'} stage.

Key recommendations:
1. **Systematize your operations** - Document your core processes to ensure consistency as you scale
2. **Leverage technology** - Automate repetitive tasks to free up time for strategic work
3. **Build strategic partnerships** - Connect with complementary businesses to expand your capabilities

To enable full AI functionality, please ensure the OPENAI_API_KEY environment variable is set.`;
    }

    // Return a fallback response for other errors
    return `I apologize, but I'm having trouble generating a response right now. Let me provide some general guidance:

Based on your business profile and focus areas, I recommend:
1. Reviewing your current processes for efficiency opportunities
2. Connecting with our partner network for specialized expertise
3. Setting clear 90-day goals aligned with your focus areas

Please try again, or contact support if the issue persists.`;
  }
};

// Helper function to determine media type
const getMediaType = (mimetype) => {
  if (mimetype.startsWith('image/')) return 'image';
  if (mimetype.startsWith('video/')) return 'video';
  if (mimetype.startsWith('audio/')) return 'audio';
  return 'document';
};

// Estimate tokens (rough approximation - 1 token ≈ 4 characters)
const estimateTokens = (text) => {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
};

// Estimate cost (based on GPT-4 pricing)
const estimateCost = (text) => {
  const tokens = estimateTokens(text);
  const costPer1000Tokens = 0.03; // $0.03 per 1K tokens for GPT-4
  return (tokens / 1000) * costPer1000Tokens;
};

// Rate AI response helpfulness
router.post('/feedback/:messageId', async (req, res, next) => {
  try {
    // Development mode bypass
    if (process.env.NODE_ENV === 'development' && !req.headers.authorization) {
      req.contractor = { id: 'dev-contractor-1' };
    } else if (!req.contractor) {
      return res.status(403).json({
        success: false,
        message: 'Authentication required'
      });
    }
    const { messageId } = req.params;
    const { helpful, rating, feedback } = req.body;
    const contractorId = req.contractor.id;
    
    // Track the feedback
    await outcomeTrackingService.trackFeedback(contractorId, 'contractor', {
      messageId: messageId,
      helpful: helpful,
      rating: rating || (helpful ? 5 : 1),
      comments: feedback,
      categories: ['ai_coach'],
      wouldRecommend: helpful,
      surveyVersion: 'ai_feedback_v1',
      collectionPoint: 'ai_concierge_conversation',
      sessionDuration: null
    });
    
    res.json({
      success: true,
      message: 'Thank you for your feedback!'
    });
  } catch (error) {
    next(error);
  }
});

// Clear conversation history
router.delete('/conversations', async (req, res, next) => {
  try {
    // Development mode bypass
    if (process.env.NODE_ENV === 'development' && !req.headers.authorization) {
      req.contractor = { id: 'dev-contractor-1' };
    } else if (!req.contractor) {
      return res.status(403).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const contractorId = req.contractor.id;

    await query(`
      DELETE FROM ai_concierge_conversations 
      WHERE contractor_id = $1
    `, [contractorId]);

    res.json({
      success: true,
      message: 'Conversation history cleared'
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;