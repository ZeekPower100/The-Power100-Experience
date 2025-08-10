const express = require('express');
const router = express.Router();
const { query } = require('../config/database.sqlite');
const { protect } = require('../middleware/auth');
const { AppError } = require('../middleware/errorHandler');
const multer = require('multer');
const path = require('path');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/ai-coach/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'aicoach-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow images, videos, audio, and documents
    const allowedMimes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'video/mp4', 'video/webm', 'video/ogg',
      'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/mpeg',
      'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ];
    
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new AppError('File type not supported', 400), false);
    }
  }
});

// Check contractor's AI Coach access
const checkAICoachAccess = async (req, res, next) => {
  try {
    const contractorId = req.user?.id;
    
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
      WHERE c.id = ?
    `, [contractorId]);

    if (contractorResult.rows.length === 0) {
      return next(new AppError('Contractor not found', 404));
    }

    const contractor = contractorResult.rows[0];
    
    if (!contractor.has_ai_access) {
      return res.status(403).json({
        success: false,
        message: 'AI Coach access requires completion of feedback loop',
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

// Get contractor's AI Coach access status
router.get('/access-status', protect, async (req, res, next) => {
  try {
    const contractorId = req.user?.id;
    
    // Mock data for demo - in real implementation, check database
    const mockContractor = {
      id: contractorId || 1,
      name: 'John Smith',
      company_name: 'Smith Construction',
      focus_areas: '["Revenue Growth","Team Building","Operations"]',
      feedback_completion_status: 'completed', // Change to 'pending' to test access gate
      ai_coach_access: true
    };

    const hasAccess = mockContractor.feedback_completion_status === 'completed';

    res.json({
      success: true,
      contractor: {
        name: mockContractor.name,
        company: mockContractor.company_name,
        focusAreas: JSON.parse(mockContractor.focus_areas || '[]'),
        completedFeedback: mockContractor.feedback_completion_status === 'completed',
        aiCoachAccess: hasAccess
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get conversation history
router.get('/conversations', protect, checkAICoachAccess, async (req, res, next) => {
  try {
    const contractorId = req.contractor.id;
    const { limit = 50, offset = 0 } = req.query;

    // In real implementation, fetch from ai_coach_conversations table
    const conversationsResult = await query(`
      SELECT 
        id,
        message_type,
        content,
        media_type,
        media_url,
        created_at
      FROM ai_coach_conversations 
      WHERE contractor_id = ?
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `, [contractorId, parseInt(limit), parseInt(offset)]);

    // Mock conversation for demo
    const mockConversations = [
      {
        id: 1,
        message_type: 'ai',
        content: `Hello ${req.contractor.name}! 👋 I'm your AI Coach, powered by insights from your partner demos and feedback data. I'm here to help you grow ${req.contractor.company_name} with personalized recommendations. What would you like to discuss today?`,
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
});

// Send message to AI Coach
router.post('/message', protect, checkAICoachAccess, upload.single('media'), async (req, res, next) => {
  try {
    const contractorId = req.contractor.id;
    const { content, mediaType = 'text' } = req.body;
    
    if (!content && !req.file) {
      return next(new AppError('Message content or media file required', 400));
    }

    // Save user message
    const userMessageResult = await query(`
      INSERT INTO ai_coach_conversations (
        contractor_id, 
        message_type, 
        content, 
        media_type,
        media_url,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?)
    `, [
      contractorId,
      'user',
      content || 'Shared a file',
      req.file ? getMediaType(req.file.mimetype) : mediaType,
      req.file ? `/uploads/ai-coach/${req.file.filename}` : null,
      new Date().toISOString()
    ]);

    // Generate AI response (mock implementation)
    const aiResponse = await generateAIResponse(content, req.file, req.contractor);
    
    // Save AI response
    const aiMessageResult = await query(`
      INSERT INTO ai_coach_conversations (
        contractor_id, 
        message_type, 
        content, 
        media_type,
        created_at
      ) VALUES (?, ?, ?, ?, ?)
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
        content: content || 'Shared a file',
        mediaType: req.file ? getMediaType(req.file.mimetype) : mediaType,
        mediaUrl: req.file ? `/uploads/ai-coach/${req.file.filename}` : null,
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

// Generate AI response (mock implementation)
const generateAIResponse = async (userInput, file, contractor) => {
  // In real implementation, this would call OpenAI/Claude API
  // and incorporate partner demo insights and feedback data
  
  const responses = [
    `Based on your partner feedback data and focus on ${contractor.focus_areas ? JSON.parse(contractor.focus_areas)[0] : 'business growth'}, I notice several contractors in similar situations have found success by implementing systematic process improvements. Here are 3 specific strategies tailored to ${contractor.company_name}...`,
    
    `Looking at the demo insights from your matched partners, I can see patterns in what's worked for other contractors in your revenue range. Your PowerConfidence scores suggest strong performance in communication, which is a great foundation. Let me share some actionable recommendations...`,
    
    `I've analyzed similar contractor profiles from our partner network. Based on your specific focus areas and business size, here are my top recommendations: 1) Implement structured client onboarding processes, 2) Develop systematic follow-up protocols, 3) Create performance dashboards for key metrics...`,
    
    `Your profile indicates expertise in ${contractor.company_name ? contractor.company_name.split(' ')[1] || 'construction' : 'your field'}. Drawing from our partner demo library and successful case studies, I recommend focusing on three key areas that align with your current capabilities while addressing growth opportunities...`
  ];

  if (file) {
    const mediaType = getMediaType(file.mimetype);
    if (mediaType === 'image') {
      return `I can see the image you've shared. Based on what I observe and connecting it to relevant partner expertise from our network, here are my insights and recommendations for ${contractor.company_name}...`;
    } else if (mediaType === 'document') {
      return `I've reviewed your document. Based on the content and my knowledge of industry best practices from our partner network, here are my specific recommendations tailored to your business...`;
    } else if (mediaType === 'audio') {
      return `I've processed your audio message. ` + responses[Math.floor(Math.random() * responses.length)];
    }
  }

  return responses[Math.floor(Math.random() * responses.length)];
};

// Helper function to determine media type
const getMediaType = (mimetype) => {
  if (mimetype.startsWith('image/')) return 'image';
  if (mimetype.startsWith('video/')) return 'video';
  if (mimetype.startsWith('audio/')) return 'audio';
  return 'document';
};

// Clear conversation history
router.delete('/conversations', protect, checkAICoachAccess, async (req, res, next) => {
  try {
    const contractorId = req.contractor.id;

    await query(`
      DELETE FROM ai_coach_conversations 
      WHERE contractor_id = ?
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