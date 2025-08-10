'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  MessageCircle, 
  Send, 
  Mic, 
  MicOff, 
  Upload, 
  FileText, 
  Video, 
  Image as ImageIcon,
  Bot,
  User,
  Loader,
  Lock,
  CheckCircle,
  XCircle,
  Search,
  BarChart3,
  Target,
  TrendingUp,
  ChevronDown,
  ChevronRight,
  Plus
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Message {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
  mediaType?: 'text' | 'audio' | 'image' | 'video' | 'document';
  mediaUrl?: string;
  isProcessing?: boolean;
}

interface ContractorProfile {
  name: string;
  company: string;
  focusAreas: string[];
  completedFeedback: boolean;
  aiCoachAccess: boolean;
}

interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  lastActive: Date;
}

export default function AICoachPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [contractorProfile, setContractorProfile] = useState<ContractorProfile | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    checkContractorAccess();
    loadConversationHistory();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const checkContractorAccess = async () => {
    try {
      // Mock contractor data - in real implementation, fetch from API
      const mockProfile: ContractorProfile = {
        name: 'John Smith',
        company: 'Smith Construction',
        focusAreas: ['Revenue Growth', 'Team Building', 'Operations'],
        completedFeedback: true, // Change to false to test access gate
        aiCoachAccess: true
      };

      setContractorProfile(mockProfile);
      setIsLoading(false);

      // Initialize welcome message
      if (mockProfile.aiCoachAccess) {
        const welcomeMessage: Message = {
          id: 'welcome-' + Date.now(),
          type: 'ai',
          content: `Hello ${mockProfile.name}! 👋 I'm your AI Coach, powered by insights from your partner demos and feedback data. I'm here to help you grow ${mockProfile.company} with personalized recommendations based on industry expertise. What would you like to discuss today?`,
          timestamp: new Date()
        };
        setMessages([welcomeMessage]);
      }
    } catch (error) {
      console.error('Failed to check contractor access:', error);
      setIsLoading(false);
    }
  };

  const loadConversationHistory = async () => {
    // Mock conversation history - in real implementation, fetch from API
    const mockConversations: Conversation[] = [
      {
        id: 'conv-1',
        title: 'Revenue Growth Strategies',
        messages: [],
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        lastActive: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
      },
      {
        id: 'conv-2', 
        title: 'Team Building Discussion',
        messages: [],
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
        lastActive: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
      },
      {
        id: 'conv-3',
        title: 'Operations Optimization',
        messages: [],
        createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 1 week ago
        lastActive: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      }
    ];
    setConversations(mockConversations);
  };

  const startNewConversation = () => {
    console.log('Starting new conversation. Current messages:', messages.length, 'Current conversationId:', currentConversationId);
    
    // Save current conversation if it has messages
    if (messages.length > 1 && currentConversationId) {
      console.log('Saving current conversation with ID:', currentConversationId);
      saveCurrentConversation();
    } else if (messages.length > 1) {
      // Create new conversation entry for unsaved conversation
      const conversationTitle = generateConversationTitle();
      const newConversation: Conversation = {
        id: 'conv-' + Date.now(),
        title: conversationTitle,
        messages: messages,
        createdAt: new Date(),
        lastActive: new Date()
      };
      console.log('Creating new conversation for unsaved messages:', conversationTitle);
      setConversations(prev => [newConversation, ...prev]);
    }

    // Reset to welcome screen
    setMessages([]);
    setCurrentConversationId(null);
    
    // Initialize new welcome message
    if (contractorProfile?.aiCoachAccess) {
      const welcomeMessage: Message = {
        id: 'welcome-' + Date.now(),
        type: 'ai',
        content: `Hello ${contractorProfile.name}! 👋 I'm your AI Coach, powered by insights from your partner demos and feedback data. I'm here to help you grow ${contractorProfile.company} with personalized recommendations based on industry expertise. What would you like to discuss today?`,
        timestamp: new Date()
      };
      setMessages([welcomeMessage]);
    }
  };

  const loadConversation = (conversationId: string) => {
    console.log('Loading conversation:', conversationId);
    
    // Save current conversation first if it has changes
    if (messages.length > 1 && currentConversationId && currentConversationId !== conversationId) {
      saveCurrentConversation();
    }

    const conversation = conversations.find(c => c.id === conversationId);
    console.log('Found conversation:', conversation);
    
    if (conversation) {
      // First, set the conversation ID to ensure we're not showing welcome screen
      setCurrentConversationId(conversationId);
      
      // If the conversation has no messages, we need to reconstruct from the mock data
      if (conversation.messages.length === 0) {
        // Create mock messages for the conversation
        const mockMessages: Message[] = [
          {
            id: 'welcome-' + Date.now(),
            type: 'ai',
            content: `Hello ${contractorProfile?.name}! 👋 I'm your AI Coach, powered by insights from your partner demos and feedback data. I'm here to help you grow ${contractorProfile?.company} with personalized recommendations based on industry expertise. What would you like to discuss today?`,
            timestamp: new Date()
          },
          {
            id: 'user-' + Date.now(),
            type: 'user', 
            content: conversation.title.replace('...', ''),
            timestamp: conversation.createdAt
          },
          {
            id: 'ai-' + Date.now(),
            type: 'ai',
            content: `Based on your partner feedback data, I notice several contractors in similar situations have found success by focusing on systematic process improvements. Here are 3 specific strategies that align with your focus areas...`,
            timestamp: conversation.createdAt
          }
        ];
        
        // Force the conversation interface to show by setting messages with more than 1 item
        setMessages(mockMessages);
        
        // Update conversation with these messages
        setConversations(prev => 
          prev.map(c => 
            c.id === conversationId 
              ? { ...c, messages: mockMessages, lastActive: new Date() }
              : c
          )
        );
      } else {
        // Load existing conversation messages
        setMessages(conversation.messages);
      }
      
      // Update last active time
      setConversations(prev => 
        prev.map(c => 
          c.id === conversationId 
            ? { ...c, lastActive: new Date() }
            : c
        )
      );
    } else {
      console.error('Conversation not found:', conversationId);
    }
  };

  const saveCurrentConversation = () => {
    if (!currentConversationId) return;
    
    console.log('Saving conversation:', currentConversationId, 'Messages count:', messages.length);
    
    setConversations(prev => {
      const existingIndex = prev.findIndex(c => c.id === currentConversationId);
      const conversationTitle = generateConversationTitle();
      
      if (existingIndex === -1) {
        // Create new conversation if it doesn't exist
        const newConversation: Conversation = {
          id: currentConversationId,
          title: conversationTitle,
          messages: messages,
          createdAt: new Date(),
          lastActive: new Date()
        };
        console.log('Creating new conversation in saveCurrentConversation:', conversationTitle);
        return [newConversation, ...prev];
      } else {
        // Update existing conversation
        console.log('Updating existing conversation in saveCurrentConversation:', conversationTitle);
        return prev.map(c => 
          c.id === currentConversationId 
            ? { ...c, messages: messages, lastActive: new Date(), title: conversationTitle }
            : c
        );
      }
    });
  };

  const generateConversationTitle = (messagesArray?: Message[]): string => {
    // Use provided messages array or current messages
    const msgArray = messagesArray || messages;
    
    // Generate title from first user message
    const firstUserMessage = msgArray.find(m => m.type === 'user');
    if (firstUserMessage && firstUserMessage.content.trim()) {
      const words = firstUserMessage.content.trim().split(' ').slice(0, 6);
      const title = words.join(' ');
      return title + (firstUserMessage.content.split(' ').length > 6 ? '...' : '');
    }
    return 'New Conversation';
  };

  const sendMessage = async (content: string, mediaType: 'text' | 'audio' | 'image' | 'video' | 'document' = 'text', mediaUrl?: string) => {
    if (!content.trim() && !mediaUrl) return;

    const userMessage: Message = {
      id: 'user-' + Date.now(),
      type: 'user',
      content: content || 'Shared a file',
      timestamp: new Date(),
      mediaType,
      mediaUrl
    };

    // If this is the first real message (after welcome), create new conversation
    if (messages.length <= 1 && !currentConversationId) {
      const newConversationId = 'conv-' + Date.now();
      console.log('Creating new conversation ID:', newConversationId);
      setCurrentConversationId(newConversationId);
    }

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsSending(true);

    // Simulate AI processing
    const processingMessage: Message = {
      id: 'ai-processing-' + Date.now(),
      type: 'ai',
      content: '',
      timestamp: new Date(),
      isProcessing: true
    };

    setMessages(prev => [...prev, processingMessage]);

    try {
      // Mock AI response - in real implementation, call AI service
      await new Promise(resolve => setTimeout(resolve, 2000));

      const aiResponse = generateMockAIResponse(content, mediaType);
      const aiMessage: Message = {
        id: 'ai-' + Date.now(),
        type: 'ai',
        content: aiResponse,
        timestamp: new Date()
      };

      setMessages(prev => prev.filter(m => !m.isProcessing).concat([aiMessage]));
    
    // Auto-save conversation after AI response if we have a current conversation ID
    if (currentConversationId) {
      // Use a timeout to ensure state has updated
      setTimeout(() => {
        setMessages(currentMessages => {
          const finalMessages = currentMessages.filter(m => !m.isProcessing);
          const conversationTitle = generateConversationTitle(finalMessages);
          
          setConversations(prev => {
            const existingIndex = prev.findIndex(c => c.id === currentConversationId);
            const conversationData = {
              id: currentConversationId,
              title: conversationTitle,
              messages: finalMessages,
              createdAt: existingIndex === -1 ? new Date() : prev[existingIndex].createdAt,
              lastActive: new Date()
            };
            
            if (existingIndex === -1) {
              // Create new conversation
              console.log('Creating new conversation:', conversationTitle);
              return [conversationData, ...prev];
            } else {
              // Update existing conversation
              console.log('Updating existing conversation:', conversationTitle);
              return prev.map(c => 
                c.id === currentConversationId 
                  ? { ...c, messages: finalMessages, lastActive: new Date(), title: conversationTitle }
                  : c
              );
            }
          });
          
          return finalMessages; // Return the current messages unchanged
        });
      }, 500); // Give time for all state updates to complete
    }
    } catch (error) {
      console.error('Failed to get AI response:', error);
      const errorMessage: Message = {
        id: 'error-' + Date.now(),
        type: 'ai',
        content: 'I apologize, but I encountered an error processing your request. Please try again.',
        timestamp: new Date()
      };
      setMessages(prev => prev.filter(m => !m.isProcessing).concat([errorMessage]));
    }

    setIsSending(false);
  };

  const generateMockAIResponse = (userInput: string, mediaType: string): string => {
    const responses = [
      "Based on your partner feedback data, I notice several contractors in similar situations have found success by focusing on systematic process improvements. Here are 3 specific strategies that align with your focus areas...",
      "Looking at the demo insights from your matched partners, I can see patterns in what's worked for other contractors. Let me share some actionable recommendations tailored to your business profile...",
      "Your PowerConfidence data suggests strong performance in communication, which is a great foundation. Here's how you can leverage this strength to address the areas you mentioned...",
      "I've analyzed similar contractor profiles and successful partnerships. Based on your specific focus areas and business size, here are my top recommendations..."
    ];

    if (mediaType === 'audio') {
      return "I've processed your audio message. " + responses[Math.floor(Math.random() * responses.length)];
    } else if (mediaType === 'image') {
      return "I can see the image you've shared. Let me provide insights based on what I observe and connect it to relevant partner expertise...";
    } else if (mediaType === 'document') {
      return "I've reviewed your document. Based on the content and my knowledge of industry best practices, here are my recommendations...";
    }

    return responses[Math.floor(Math.random() * responses.length)];
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const mediaType = file.type.startsWith('image/') ? 'image' :
                     file.type.startsWith('video/') ? 'video' :
                     file.type.startsWith('audio/') ? 'audio' : 'document';

    // In real implementation, upload file and get URL
    const mockFileUrl = URL.createObjectURL(file);
    sendMessage(`Uploaded: ${file.name}`, mediaType, mockFileUrl);
  };

  const toggleRecording = () => {
    if (isRecording) {
      // Stop recording
      setIsRecording(false);
      // In real implementation, stop recording and process audio
      sendMessage("Voice message recorded", 'audio');
    } else {
      // Start recording
      setIsRecording(true);
      // In real implementation, start audio recording
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading AI Coach...</p>
        </div>
      </div>
    );
  }

  if (!contractorProfile?.aiCoachAccess || !contractorProfile?.completedFeedback) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <Card className="w-full max-w-md text-center">
          <CardContent className="p-8">
            <Lock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-4">AI Coach Access Required</h2>
            <p className="text-gray-600 mb-6">
              Complete the feedback loop process to unlock access to your personalized AI Coach.
            </p>
            <div className="space-y-3 mb-6">
              <div className="flex items-center justify-center gap-2">
                {contractorProfile?.completedFeedback ? (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-500" />
                )}
                <span className={contractorProfile?.completedFeedback ? 'text-green-600' : 'text-red-600'}>
                  Feedback Loop Completion
                </span>
              </div>
            </div>
            <Button 
              onClick={() => router.push('/feedback/survey')}
              className="w-full bg-red-600 hover:bg-red-700 text-white"
            >
              Complete Feedback Survey
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show welcome screen if no messages or only welcome message (and not loading a specific conversation)
  const showWelcomeScreen = messages.length <= 1 && !currentConversationId;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 flex">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-red-600 to-red-700 rounded-lg flex items-center justify-center">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">AI Coach</h1>
              <p className="text-xs text-gray-500">Power100 Experience</p>
            </div>
          </div>
        </div>

        <div className="flex-1 p-4">
          <div className="space-y-2">
            {/* New Conversation Button */}
            <button 
              onClick={startNewConversation}
              className="w-full flex items-center gap-3 p-3 text-left text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span className="text-sm font-medium">New conversation</span>
            </button>
            
            {/* Chat History Dropdown */}
            <div className="space-y-1">
              <button 
                onClick={() => setIsHistoryOpen(!isHistoryOpen)}
                className="w-full flex items-center justify-between gap-3 p-3 text-left text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <div className="flex items-center gap-3">
                  <FileText className="w-4 h-4" />
                  <span className="text-sm font-medium">Chat history</span>
                </div>
                {isHistoryOpen ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </button>
              
              {/* History List */}
              <AnimatePresence>
                {isHistoryOpen && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="ml-4 space-y-1"
                  >
                    {conversations.length === 0 ? (
                      <div className="p-3 text-xs text-gray-500 italic">
                        No previous conversations
                      </div>
                    ) : (
                      conversations
                        .sort((a, b) => b.lastActive.getTime() - a.lastActive.getTime())
                        .map((conversation) => (
                          <button
                            key={conversation.id}
                            onClick={() => {
                              loadConversation(conversation.id);
                              setIsHistoryOpen(false);
                            }}
                            className={`w-full text-left p-3 rounded-lg transition-colors text-sm ${
                              currentConversationId === conversation.id
                                ? 'bg-red-50 text-red-700 border-l-2 border-red-600'
                                : 'text-gray-600 hover:bg-gray-100'
                            }`}
                          >
                            <div className="font-medium mb-1 line-clamp-2">
                              {conversation.title}
                            </div>
                            <div className="text-xs text-gray-400">
                              {conversation.lastActive.toLocaleDateString()}
                            </div>
                          </button>
                        ))
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span>Active Session</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {showWelcomeScreen ? (
          /* Welcome Screen */
          <div className="flex-1 flex flex-col justify-center items-center p-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center max-w-2xl"
            >
              {/* Brand Icon */}
              <div className="mb-8">
                <div className="w-16 h-16 bg-gradient-to-br from-red-600 to-red-700 rounded-2xl mx-auto flex items-center justify-center mb-4 shadow-lg">
                  <Bot className="w-8 h-8 text-white" />
                </div>
                <h1 className="text-4xl font-bold text-gray-900 mb-3">
                  Welcome to your AI Coach
                </h1>
                <p className="text-xl text-gray-600 leading-relaxed">
                  Your personalized business growth assistant powered by industry expertise and partner insights
                </p>
              </div>

              {/* Contractor Info */}
              {contractorProfile && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="mb-8 p-4 bg-white/60 backdrop-blur-sm rounded-xl border border-white/20 shadow-sm"
                >
                  <p className="text-gray-700">
                    Hi <span className="font-semibold text-red-600">{contractorProfile.name}</span>, 
                    I'm ready to help grow <span className="font-semibold">{contractorProfile.company}</span>
                  </p>
                  <div className="flex flex-wrap gap-2 justify-center mt-3">
                    {contractorProfile.focusAreas.map((area) => (
                      <span 
                        key={area}
                        className="px-3 py-1 bg-red-50 text-red-700 rounded-full text-sm font-medium"
                      >
                        {area}
                      </span>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Quick Start Categories */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
              >
                {[
                  { icon: '💰', title: 'Revenue Growth', prompt: 'Help me increase revenue for my business' },
                  { icon: '👥', title: 'Team Building', prompt: 'How can I build a stronger team?' },
                  { icon: '⚙️', title: 'Operations', prompt: 'Improve my business operations and efficiency' },
                  { icon: '🎯', title: 'Strategy', prompt: 'Develop a strategic plan for growth' }
                ].map((category) => (
                  <button
                    key={category.title}
                    onClick={() => sendMessage(category.prompt)}
                    className="p-4 bg-white hover:bg-gray-50 rounded-xl border border-gray-200 transition-all hover:shadow-md group"
                  >
                    <div className="text-2xl mb-2 group-hover:scale-110 transition-transform">
                      {category.icon}
                    </div>
                    <p className="text-sm font-medium text-gray-900">{category.title}</p>
                  </button>
                ))}
              </motion.div>
            </motion.div>

            {/* Input Area - Welcome Screen */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="w-full max-w-2xl"
            >
              <div className="bg-white rounded-2xl border border-gray-200 shadow-lg">
                <div className="flex items-center p-4">
                  <div className="flex-1 relative">
                    <textarea
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          sendMessage(inputMessage);
                        }
                      }}
                      placeholder="Ask me anything about growing your business..."
                      className="w-full resize-none border-0 outline-none text-gray-900 placeholder-gray-500 text-lg leading-relaxed"
                      rows={1}
                      disabled={isSending}
                    />
                  </div>
                  <div className="flex items-center gap-2 ml-3">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <Upload className="w-5 h-5" />
                    </button>
                    <button
                      onClick={toggleRecording}
                      className={`p-2 rounded-lg transition-colors ${
                        isRecording 
                          ? 'text-red-600 bg-red-50' 
                          : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                    </button>
                    <button
                      onClick={() => sendMessage(inputMessage)}
                      disabled={!inputMessage.trim() || isSending}
                      className="p-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-300 text-white rounded-lg transition-colors disabled:cursor-not-allowed"
                    >
                      <Send className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
              <p className="text-center text-xs text-gray-500 mt-3">
                Powered by industry expertise and partner demo insights
              </p>
            </motion.div>
          </div>
        ) : (
          /* Chat Interface */
          <>
            {/* Messages */}
            <div className="flex-1 overflow-y-auto">
              <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
                <AnimatePresence>
                  {messages.slice(1).map((message, index) => (
                    <motion.div
                      key={message.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className="group"
                    >
                      {message.type === 'user' ? (
                        /* User Message */
                        <div className="flex justify-end mb-6">
                          <div className="max-w-2xl bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-2xl px-6 py-4 shadow-md">
                            <p className="text-base leading-relaxed">{message.content}</p>
                          </div>
                        </div>
                      ) : (
                        /* AI Message */
                        <div className="space-y-4">
                          {/* Thinking indicator for processing */}
                          {message.isProcessing ? (
                            <div className="flex items-center gap-3 text-gray-500 text-sm">
                              <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-full">
                                <div className="flex space-x-1">
                                  <div className="w-2 h-2 bg-red-400 rounded-full animate-bounce"></div>
                                  <div className="w-2 h-2 bg-red-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                                  <div className="w-2 h-2 bg-red-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                                </div>
                                <span>Analyzing your business needs...</span>
                              </div>
                            </div>
                          ) : (
                            <>
                              {/* Thought duration indicator */}
                              {index > 0 && (
                                <div className="text-sm text-gray-500 mb-2">
                                  Analyzed for {Math.floor(Math.random() * 5) + 2} seconds
                                </div>
                              )}
                              
                              {/* Main AI Response */}
                              <div className="space-y-4">
                                {/* Research Cards (if applicable) */}
                                {message.content.includes('Based on') && (
                                  <div className="mb-4">
                                    <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
                                      <div className="w-5 h-5 bg-red-100 rounded-full flex items-center justify-center">
                                        <Search className="w-3 h-3 text-red-600" />
                                      </div>
                                      <span>Searched partner insights and industry data</span>
                                    </div>
                                    
                                    {/* Research Result Cards */}
                                    <div className="space-y-2">
                                      {[
                                        { title: 'Partner Demo Insights', source: 'PowerConfidence Database', results: '15 relevant patterns' },
                                        { title: 'Industry Best Practices', source: 'Contractor Success Stories', results: '8 case studies' },
                                        { title: 'Growth Strategies', source: 'AI Knowledge Base', results: '12 recommendations' }
                                      ].slice(0, Math.floor(Math.random() * 2) + 1).map((research, idx) => (
                                        <div key={idx} className="border border-gray-200 rounded-lg p-3 bg-gray-50 hover:bg-gray-100 transition-colors">
                                          <div className="flex items-start gap-3">
                                            <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center border border-gray-200 mt-0.5">
                                              <BarChart3 className="w-4 h-4 text-gray-600" />
                                            </div>
                                            <div className="flex-1">
                                              <div className="flex items-center justify-between">
                                                <p className="font-medium text-sm text-gray-900">{research.title}</p>
                                                <span className="text-xs text-gray-500">{research.results}</span>
                                              </div>
                                              <p className="text-xs text-gray-500 mt-1">{research.source}</p>
                                            </div>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Main Response Content */}
                                <div className="prose prose-gray max-w-none">
                                  {/* Parse and format the content */}
                                  {message.content.split('\n\n').map((paragraph, pIdx) => {
                                    // Check if it's a header (starts with number or bold text)
                                    if (paragraph.match(/^\d+\.|^[A-Z][^:]+:/)) {
                                      const [header, ...content] = paragraph.split(':');
                                      return (
                                        <div key={pIdx} className="mb-4">
                                          <h3 className="font-semibold text-gray-900 mb-2">{header}:</h3>
                                          <p className="text-gray-700 leading-relaxed">{content.join(':')}</p>
                                        </div>
                                      );
                                    }
                                    
                                    // Check for bullet points
                                    if (paragraph.includes('•') || paragraph.includes('-')) {
                                      const items = paragraph.split(/[•\-]/).filter(item => item.trim());
                                      return (
                                        <ul key={pIdx} className="space-y-2 mb-4">
                                          {items.map((item, iIdx) => (
                                            <li key={iIdx} className="flex items-start gap-2">
                                              <span className="text-red-600 mt-1">•</span>
                                              <span className="text-gray-700">{item.trim()}</span>
                                            </li>
                                          ))}
                                        </ul>
                                      );
                                    }
                                    
                                    // Regular paragraph
                                    return <p key={pIdx} className="text-gray-700 leading-relaxed mb-4">{paragraph}</p>;
                                  })}
                                </div>

                                {/* Action Cards (if recommendations present) */}
                                {message.content.toLowerCase().includes('recommend') && (
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                                    {[
                                      { icon: Target, title: 'Quick Win', desc: 'Implement in 1-2 weeks', color: 'green' },
                                      { icon: TrendingUp, title: 'Growth Driver', desc: 'Focus for next quarter', color: 'blue' }
                                    ].map((action, aIdx) => (
                                      <div key={aIdx} className={`border rounded-lg p-4 bg-${action.color}-50 border-${action.color}-200`}>
                                        <div className="flex items-start gap-3">
                                          <action.icon className={`w-5 h-5 text-${action.color}-600 mt-0.5`} />
                                          <div>
                                            <p className={`font-medium text-${action.color}-900`}>{action.title}</p>
                                            <p className={`text-sm text-${action.color}-700 mt-1`}>{action.desc}</p>
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {/* Comparison Table (if applicable) */}
                                {message.content.toLowerCase().includes('compar') && (
                                  <div className="overflow-x-auto mt-4">
                                    <table className="min-w-full border border-gray-200 rounded-lg overflow-hidden">
                                      <thead className="bg-gray-50">
                                        <tr>
                                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Option</th>
                                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Cost</th>
                                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Timeline</th>
                                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">ROI Potential</th>
                                        </tr>
                                      </thead>
                                      <tbody className="bg-white divide-y divide-gray-200">
                                        <tr>
                                          <td className="px-4 py-3 text-sm text-gray-900">Digital Marketing</td>
                                          <td className="px-4 py-3 text-sm text-gray-600">$2-5k/month</td>
                                          <td className="px-4 py-3 text-sm text-gray-600">3-6 months</td>
                                          <td className="px-4 py-3 text-sm text-green-600 font-medium">High</td>
                                        </tr>
                                        <tr>
                                          <td className="px-4 py-3 text-sm text-gray-900">Sales Training</td>
                                          <td className="px-4 py-3 text-sm text-gray-600">$10-15k total</td>
                                          <td className="px-4 py-3 text-sm text-gray-600">2-3 months</td>
                                          <td className="px-4 py-3 text-sm text-yellow-600 font-medium">Medium</td>
                                        </tr>
                                      </tbody>
                                    </table>
                                  </div>
                                )}

                                {/* Media attachments */}
                                {message.mediaUrl && (
                                  <div className="mt-4">
                                    {message.mediaType === 'image' && (
                                      <img 
                                        src={message.mediaUrl} 
                                        alt="Shared image" 
                                        className="max-w-full h-auto rounded-lg border border-gray-200"
                                      />
                                    )}
                                    {message.mediaType === 'document' && (
                                      <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                                        <FileText className="w-5 h-5 text-gray-600" />
                                        <span className="text-sm text-gray-700">Document analyzed</span>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>
                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Input Area - Chat Mode */}
            <div className="border-t border-gray-200 bg-white p-4">
              <div className="max-w-4xl mx-auto">
                <div className={`rounded-2xl border shadow-lg transition-all duration-300 ${
                  isSending 
                    ? 'bg-gray-50 border-gray-200' 
                    : 'bg-white border-gray-200'
                }`}>
                  <div className="flex items-center p-4">
                    <div className="flex-1 relative">
                      <textarea
                        value={inputMessage}
                        onChange={(e) => setInputMessage(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            sendMessage(inputMessage);
                          }
                        }}
                        placeholder={isSending ? "AI is thinking..." : "Continue the conversation..."}
                        className={`w-full resize-none border-0 outline-none text-lg leading-relaxed transition-all duration-300 ${
                          isSending 
                            ? 'bg-gray-50 text-gray-400 placeholder-gray-400' 
                            : 'bg-white text-gray-900 placeholder-gray-500'
                        }`}
                        rows={1}
                        disabled={isSending}
                      />
                    </div>
                    <div className="flex items-center gap-2 ml-3">
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isSending}
                        className={`p-2 rounded-lg transition-colors ${
                          isSending
                            ? 'text-gray-300 cursor-not-allowed'
                            : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        <Upload className="w-5 h-5" />
                      </button>
                      <button
                        onClick={toggleRecording}
                        disabled={isSending}
                        className={`p-2 rounded-lg transition-colors ${
                          isSending
                            ? 'text-gray-300 cursor-not-allowed'
                            : isRecording 
                              ? 'text-red-600 bg-red-50' 
                              : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                      </button>
                      <button
                        onClick={() => sendMessage(inputMessage)}
                        disabled={!inputMessage.trim() || isSending}
                        className="p-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-300 text-white rounded-lg transition-colors disabled:cursor-not-allowed"
                      >
                        <Send className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt"
        onChange={handleFileUpload}
        className="hidden"
      />
    </div>
  );
}