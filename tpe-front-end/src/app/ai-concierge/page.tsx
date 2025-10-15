'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { aiConciergeApi, contractorApi } from '@/lib/api';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { handleApiResponse, getFromStorage, safeJsonStringify } from '@/utils/jsonHelpers';
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
  Plus,
  PanelLeftClose,
  PanelLeft,
  ArrowDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

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
  aiConciergeAccess: boolean;
}

interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  lastActive: Date;
}

export default function AIConciergePage() {
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
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [hasUserScrolled, setHasUserScrolled] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const isAutoScrolling = useRef(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    checkContractorAccess();
    loadConversationHistory();

    // Force a re-render after mount to ensure refs are ready
    const timer = setTimeout(() => {
      // This will trigger the MutationObserver setup if it failed initially
      setMessages(prev => [...prev]);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  // Use MutationObserver to detect first user message and scroll to it
  useEffect(() => {
    // Add a small delay to ensure the DOM is ready
    const setupObserver = () => {
      if (!chatContainerRef.current) {
        // If ref not ready, try again shortly
        setTimeout(setupObserver, 100);
        return;
      }

      const observer = new MutationObserver((mutations) => {
      // Look for the first user message being added
      const userMessages = document.querySelectorAll('.user-message-container');

      // If this is the first user message (after welcome), force scroll
      if (userMessages.length === 1 && messages.length <= 3) {
        console.log('First user message detected by MutationObserver, forcing scroll');

        // Use multiple methods to ensure scroll works
        const container = chatContainerRef.current;
        if (container) {
          // Method 1: Direct scroll to top
          container.scrollTop = 0;

          // Method 2: Use scrollTo
          container.scrollTo({ top: 0, behavior: 'instant' });

          // Method 3: Use scrollIntoView on the message
          const firstUserMsg = userMessages[0] as HTMLElement;
          if (firstUserMsg) {
            // Get container's current scroll position
            const containerRect = container.getBoundingClientRect();
            const messageRect = firstUserMsg.getBoundingClientRect();

            // Calculate exact position
            const scrollTarget = firstUserMsg.offsetTop - container.offsetTop;
            container.scrollTop = Math.max(0, scrollTarget - 20); // 20px padding from top
          }

          // Method 4: Force reflow and try again
          requestAnimationFrame(() => {
            container.scrollTop = 0;
            if (firstUserMsg) {
              firstUserMsg.scrollIntoView({ block: 'start', behavior: 'instant' });
            }
          });
        }
      }
      });

      // Observe the chat container for changes
      observer.observe(chatContainerRef.current, {
        childList: true,
        subtree: true
      });

      // Store cleanup function
      return () => observer.disconnect();
    };

    // Start the setup process
    const cleanup = setupObserver();

    // Return cleanup if it exists
    return () => {
      if (typeof cleanup === 'function') cleanup();
    };
  }, [messages.length]);

  // Detect manual scrolling and show/hide scroll button
  useEffect(() => {
    const handleScroll = () => {
      // Only detect manual scroll if we're not auto-scrolling
      if (!isAutoScrolling.current && chatContainerRef.current) {
        const container = chatContainerRef.current;
        const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;

        // Show scroll button if not near bottom and there are messages
        const shouldShowButton = !isNearBottom && messages.length > 1;
        setShowScrollButton(shouldShowButton);

        // If user scrolled away from bottom, mark as manual scroll
        if (!isNearBottom && messages.length > 1) {
          setHasUserScrolled(true);
        } else if (isNearBottom) {
          setHasUserScrolled(false);
        }
      }
    };

    const container = chatContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      // Trigger initial check
      handleScroll();
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, [messages.length]);

  useEffect(() => {
    // Handle scrolling based on message state - but respect manual scroll
    if (messages.length > 0 && !hasUserScrolled && chatContainerRef.current) {
      const lastMessage = messages[messages.length - 1];
      const secondLastMessage = messages.length > 1 ? messages[messages.length - 2] : null;

      // When user sends a message (we'll see both user message and thinking animation)
      if (lastMessage.type === 'ai' && lastMessage.isProcessing) {
        const userMessageIndex = messages.length - 2;
        if (userMessageIndex >= 0 && messages[userMessageIndex].type === 'user') {
          // Always scroll to top for initial messages or find the user message
          setTimeout(() => {
            if (chatContainerRef.current) {
              isAutoScrolling.current = true;

              // Count actual visible messages (excluding welcome)
              const visibleMessages = messages.slice(1);

              // If this is one of the first interactions, force scroll to top
              if (visibleMessages.length <= 2) {
                // Multiple methods to ensure scroll works (account for sticky)
                chatContainerRef.current.scrollTop = -50;
                chatContainerRef.current.scrollTo(0, -50);
                // Also try 0
                chatContainerRef.current.scrollTop = 0;

                // Also try after a micro-task
                Promise.resolve().then(() => {
                  if (chatContainerRef.current) {
                    chatContainerRef.current.scrollTop = -50;
                    chatContainerRef.current.scrollTop = 0;
                  }
                });

                // And after next frame
                requestAnimationFrame(() => {
                  if (chatContainerRef.current) {
                    // Try negative offset first, then 0
                    chatContainerRef.current.scrollTop = -100;
                    chatContainerRef.current.scrollTop = 0;
                    const firstMsg = document.querySelector('.user-message-container');
                    if (firstMsg) {
                      // Scroll with offset for sticky elements
                      const rect = firstMsg.getBoundingClientRect();
                      const scrollTop = chatContainerRef.current.scrollTop;
                      const targetTop = rect.top + scrollTop - 150; // 150px offset for sticky
                      chatContainerRef.current.scrollTop = Math.max(0, targetTop);
                    }
                  }
                });
              } else {
                // For later messages, find and scroll to user message
                const userMessages = document.querySelectorAll('.user-message-container');
                if (userMessages.length > 0) {
                  const lastUserMessage = userMessages[userMessages.length - 1] as HTMLElement;
                  lastUserMessage.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
              }

              setTimeout(() => { isAutoScrolling.current = false; }, 500);
            }
          }, 200); // Give DOM time to render
        }
      }
      // When AI finishes responding - scroll to top of AI response
      else if (lastMessage.type === 'ai' && !lastMessage.isProcessing && secondLastMessage?.type === 'ai') {
        // This means we just replaced the processing message with actual response
        setTimeout(() => {
          if (chatContainerRef.current) {
            isAutoScrolling.current = true;
            const aiMessages = document.querySelectorAll('.ai-message-container');
            if (aiMessages.length > 0) {
              const lastAiMessage = aiMessages[aiMessages.length - 1] as HTMLElement;
              // Scroll to top of AI response so user can start reading
              lastAiMessage.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
            setTimeout(() => { isAutoScrolling.current = false; }, 500);
          }
        }, 100);
      }
    }
  }, [messages, hasUserScrolled]);

  const scrollToShowUserMessage = () => {
    // Scroll to show the user message with space for thinking animation
    const chatContainer = document.querySelector('.overflow-y-auto');
    const userMessages = document.querySelectorAll('.user-message-container');
    if (userMessages.length > 0 && chatContainer) {
      const lastUserMessage = userMessages[userMessages.length - 1] as HTMLElement;
      // Calculate position to show user message with room for thinking below
      const messageTop = lastUserMessage.offsetTop;
      const targetScroll = messageTop - 100; // Leave 100px from top
      chatContainer.scrollTo({
        top: targetScroll,
        behavior: 'smooth'
      });
    }
  };

  const scrollToShowThinking = () => {
    // Scroll to show both user message and thinking animation
    const chatContainer = document.querySelector('.overflow-y-auto');
    if (chatContainer) {
      // Scroll to near bottom to show both messages
      chatContainer.scrollTo({
        top: chatContainer.scrollHeight - chatContainer.clientHeight + 50,
        behavior: 'smooth'
      });
    }
  };

  const scrollToBottom = () => {
    if (chatContainerRef.current) {
      isAutoScrolling.current = true;
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
      setHasUserScrolled(false);
      setTimeout(() => { isAutoScrolling.current = false; }, 500);
    }
  };

  const scrollToUserMessage = () => {
    // Scroll to show the conversation properly
    const chatContainer = document.querySelector('.overflow-y-auto');
    const userMessages = document.querySelectorAll('.user-message-container');
    if (userMessages.length > 0 && chatContainer) {
      const lastUserMessage = userMessages[userMessages.length - 1] as HTMLElement;
      // Position user message in upper third of view
      const messageTop = lastUserMessage.offsetTop;
      const containerHeight = chatContainer.clientHeight;
      const targetScroll = messageTop - (containerHeight * 0.3);
      chatContainer.scrollTo({
        top: Math.max(0, targetScroll),
        behavior: 'smooth'
      });
    }
  };

  const checkContractorAccess = async () => {
    try {
      // In development, use fetch directly without token to trigger dev bypass
      const isDevelopment = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
      if (isDevelopment) {
        const response = await fetch('http://localhost:5000/api/ai-concierge/access-status');
        const accessResponse = await handleApiResponse(response);

        const profile: ContractorProfile = {
          name: accessResponse.contractor?.name || 'Test User',
          company: accessResponse.contractor?.company || 'Test Company',
          focusAreas: accessResponse.contractor?.focusAreas || [],
          completedFeedback: true, // In dev mode, always true
          aiConciergeAccess: accessResponse.hasAccess || true // Use hasAccess from response
        };

        setContractorProfile(profile);
        setIsLoading(false);

        // Initialize welcome message if access granted (always true in dev)
        if (profile.aiConciergeAccess) {
          const welcomeMessage: Message = {
            id: 'welcome-' + Date.now(),
            type: 'ai',
            content: `Hello ${profile.name}! 👋 I'm your AI Concierge, your always-available business advisor powered by insights from our partner network and business intelligence. I'm here to help you grow ${profile.company} with personalized recommendations tailored to your specific needs. What challenges can I help you solve today?`,
            timestamp: new Date()
          };
          setMessages([welcomeMessage]);
        }
        return; // Always return in dev mode
      }

      // Production flow - use normal API with auth
      const accessResponse = await aiConciergeApi.checkAccess();

      if (accessResponse.success && accessResponse.contractor) {
        const profile: ContractorProfile = {
          name: accessResponse.contractor.name,
          company: accessResponse.contractor.company,
          focusAreas: accessResponse.contractor.focusAreas || [],
          completedFeedback: accessResponse.contractor.completedFeedback,
          aiConciergeAccess: accessResponse.contractor.aiCoachAccess // Note: API still uses aiCoachAccess
        };

        setContractorProfile(profile);
        setIsLoading(false);

        // Initialize welcome message if access granted
        if (profile.aiConciergeAccess && profile.completedFeedback) {
          const welcomeMessage: Message = {
            id: 'welcome-' + Date.now(),
            type: 'ai',
            content: `Hello ${profile.name}! 👋 I'm your AI Concierge, your always-available business advisor powered by insights from our partner network and business intelligence. I'm here to help you grow ${profile.company} with personalized recommendations tailored to your specific needs. What challenges can I help you solve today?`,
            timestamp: new Date()
          };
          setMessages([welcomeMessage]);
        }
      } else {
        // Default profile for error cases
        setContractorProfile(null);
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Failed to check contractor access:', error);
      setContractorProfile(null);
      setIsLoading(false);
    }
  };

  const loadConversationHistory = async () => {
    try {
      // In development, use fetch directly without token to trigger dev bypass
      const isDevelopment = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
      if (isDevelopment) {
        const response = await fetch('http://localhost:5000/api/ai-concierge/conversations');
        const data = await handleApiResponse(response);

        if (data.success) {
          setConversations(data.conversations || []);
        }
        return;
      }

      // Production flow - use normal API with auth
      const response = await aiConciergeApi.getConversations();

      if (response.success && response.conversations) {
        // Convert API response to Conversation format
        const formattedConversations: Conversation[] = response.conversations.map((conv: any) => {
          // Generate title from first message or use default
          let title = 'New Conversation';
          if (conv.content) {
            const words = conv.content.split(' ').slice(0, 6);
            title = words.join(' ') + (conv.content.split(' ').length > 6 ? '...' : '');
          }

          return {
            id: conv.id || 'conv-' + Date.now(),
            title: title,
            messages: [], // Messages are loaded separately when conversation is selected
            createdAt: new Date(conv.created_at),
            lastActive: new Date(conv.created_at)
          };
        });

        setConversations(formattedConversations);
      }
    } catch (error) {
      console.error('Failed to load conversation history:', error);
      // Set empty conversations on error
      setConversations([]);
    }
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
    if (contractorProfile?.aiConciergeAccess) {
      const welcomeMessage: Message = {
        id: 'welcome-' + Date.now(),
        type: 'ai',
        content: `Hello ${contractorProfile.name}! 👋 I'm your AI Concierge, your always-available business advisor powered by insights from our partner network and business intelligence. I'm here to help you grow ${contractorProfile.company} with personalized recommendations tailored to your specific needs. What challenges can I help you solve today?`,
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
            content: `Hello ${contractorProfile?.name}! 👋 I'm your AI Concierge, your always-available business advisor powered by insights from our partner network and business intelligence. I'm here to help you grow ${contractorProfile?.company} with personalized recommendations tailored to your specific needs. What challenges can I help you solve today?`,
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

    // Reset manual scroll flag when sending new message
    setHasUserScrolled(false);

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

    // Add both user message and processing indicator together for immediate display
    const processingMessage: Message = {
      id: 'ai-processing-' + Date.now(),
      type: 'ai',
      content: '',
      timestamp: new Date(),
      isProcessing: true
    };

    // Check if this is the first user message BEFORE updating state
    const isFirstUserMessage = messages.length <= 1;

    setMessages(prev => [...prev, userMessage, processingMessage]);
    setInputMessage('');
    setIsSending(true);

    // Force scroll for first message - simplified
    if (isFirstUserMessage) {
      console.log('Initial message, will be scrolled by MutationObserver');
      // Reset manual scroll flag for initial message
      setHasUserScrolled(false);

      // Also add a fallback scroll after a delay
      setTimeout(() => {
        if (chatContainerRef.current) {
          const userMessages = document.querySelectorAll('.user-message-container');
          if (userMessages.length > 0) {
            // Scroll container to absolute top
            chatContainerRef.current.scrollTop = 0;
            console.log('Fallback scroll executed');
          }
        }
      }, 500);
    }

    try {
      // In development, use fetch directly without token to trigger dev bypass
      let response;
      const isDevelopment = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
      if (isDevelopment) {
        const res = await fetch('http://localhost:5000/api/ai-concierge/message', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: safeJsonStringify({
            message: content,  // Changed from 'content' to 'message' to match backend
            session_id: currentConversationId || undefined
          })
        });
        response = await handleApiResponse(res);
      } else {
        // Production - use normal API with auth
        response = await aiConciergeApi.sendMessage(content, currentConversationId || undefined);
      }

      if (response.success) {
        // Handle the response - it might be in different formats
        let aiContent = '';

        if (response.aiResponse) {
          aiContent = response.aiResponse.content || response.aiResponse;
        } else if (response.response) {
          aiContent = response.response;
        } else if (response.message) {
          aiContent = response.message;
        } else if (typeof response === 'string') {
          aiContent = response;
        }

        // Only fall back to mock if we truly have no content
        if (!aiContent) {
          console.warn('No AI content in response, using mock:', response);
          aiContent = generateMockAIResponse(content, mediaType);
        }

        const aiMessage: Message = {
          id: 'ai-' + Date.now(),
          type: 'ai',
          content: aiContent,
          timestamp: new Date()
        };

        setMessages(prev => prev.filter(m => !m.isProcessing).concat([aiMessage]));
      } else {
        // API explicitly failed
        throw new Error('API returned success: false');
      }

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

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Reset manual scroll flag when uploading file
    setHasUserScrolled(false);

    const mediaType = file.type.startsWith('image/') ? 'image' :
                     file.type.startsWith('video/') ? 'video' :
                     file.type.startsWith('audio/') ? 'audio' : 'document';

    // Create a proper object URL for the file
    const objectUrl = URL.createObjectURL(file);

    // Show user message and processing indicator immediately
    const userMessage: Message = {
      id: 'user-' + Date.now(),
      type: 'user',
      content: `Analyzing: ${file.name}`,
      timestamp: new Date(),
      mediaType,
      mediaUrl: objectUrl
    };

    const processingMessage: Message = {
      id: 'ai-processing-' + Date.now(),
      type: 'ai',
      content: '',
      timestamp: new Date(),
      isProcessing: true
    };

    setMessages(prev => [...prev, userMessage, processingMessage]);
    setIsSending(true);

    try {
      let response;

      // Send the actual file to backend using FormData
      if (process.env.NODE_ENV === 'development') {
        const formData = new FormData();
        formData.append('media', file);
        formData.append('content', `Please analyze this ${mediaType}`);
        formData.append('mediaType', mediaType);
        if (currentConversationId) {
          formData.append('conversationId', currentConversationId);
        }

        const baseUrl = window.location.hostname === 'localhost' ? 'http://localhost:5000' : '';
        const res = await fetch(`${baseUrl}/api/ai-concierge/message`, {
          method: 'POST',
          body: formData
        });
        response = await handleApiResponse(res);
      } else {
        // For production, send FormData with auth
        const formData = new FormData();
        formData.append('media', file);
        formData.append('content', `Please analyze this ${mediaType}`);
        formData.append('mediaType', mediaType);
        if (currentConversationId) {
          formData.append('conversationId', currentConversationId);
        }

        const res = await fetch('/api/ai-concierge/message', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${getFromStorage('accessToken', '')}`
          },
          body: formData
        });
        response = await handleApiResponse(res);
      }

      if (response.success) {
        // Handle the response - it might be in different formats
        let aiContent = '';

        if (response.aiResponse) {
          aiContent = response.aiResponse.content || response.aiResponse;
        } else if (response.response) {
          aiContent = response.response;
        } else if (response.message) {
          aiContent = response.message;
        }

        if (!aiContent) {
          throw new Error('No AI content in response');
        }

        const aiMessage: Message = {
          id: 'ai-' + Date.now(),
          type: 'ai',
          content: aiContent,
          timestamp: new Date()
        };

        setMessages(prev => prev.filter(m => !m.isProcessing).concat([aiMessage]));
      } else {
        // Provide fallback response if API doesn't return success
        const fallbackMessage: Message = {
          id: 'ai-' + Date.now(),
          type: 'ai',
          content: `I've received your ${mediaType}. While I'm currently unable to analyze the actual content, I'm here to help with any questions about your business growth. What would you like to discuss?`,
          timestamp: new Date()
        };
        setMessages(prev => prev.filter(m => !m.isProcessing).concat([fallbackMessage]));
      }
    } catch (error) {
      console.error('Failed to process file upload:', error);
      const errorMessage: Message = {
        id: 'error-' + Date.now(),
        type: 'ai',
        content: 'I apologize, but I encountered an error processing your file. Please try again.',
        timestamp: new Date()
      };
      setMessages(prev => prev.filter(m => !m.isProcessing).concat([errorMessage]));
    }

    setIsSending(false);
  };

  const toggleRecording = async () => {
    if (isRecording) {
      // Stop recording
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
        setIsRecording(false);
      }
    } else {
      // Start recording
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

        // Try to use a compatible audio format
        let options = {};
        if (MediaRecorder.isTypeSupported('audio/webm')) {
          options = { mimeType: 'audio/webm' };
        } else if (MediaRecorder.isTypeSupported('audio/ogg')) {
          options = { mimeType: 'audio/ogg' };
        }

        const mediaRecorder = new MediaRecorder(stream, options);
        console.log('MediaRecorder created with mimeType:', mediaRecorder.mimeType);

        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        mediaRecorder.onstop = async () => {
          console.log('Recording stopped, chunks:', audioChunksRef.current.length);

          // Create audio blob with fallback mime types
          const audioBlob = new Blob(audioChunksRef.current, {
            type: mediaRecorder.mimeType || 'audio/webm;codecs=opus'
          });

          console.log('Audio blob created, size:', audioBlob.size);
          const audioUrl = URL.createObjectURL(audioBlob);
          console.log('Audio URL created:', audioUrl);

          // Stop all tracks to release the microphone
          stream.getTracks().forEach(track => track.stop());

          // Reset manual scroll for voice messages
          setHasUserScrolled(false);

          // Create user message with audio
          const userMessage: Message = {
            id: 'user-' + Date.now(),
            type: 'user',
            content: 'Voice message',
            timestamp: new Date(),
            mediaType: 'audio',
            mediaUrl: audioUrl
          };

          // Add user message and processing indicator
          const processingMessage: Message = {
            id: 'ai-processing-' + Date.now(),
            type: 'ai',
            content: '',
            timestamp: new Date(),
            isProcessing: true
          };

          setMessages(prev => [...prev, userMessage, processingMessage]);
          setIsSending(true);

          // Send the audio file to backend for transcription
          try {
            let response;

            // Send audio as FormData
            if (process.env.NODE_ENV === 'development') {
              const formData = new FormData();
              formData.append('media', audioBlob, 'voice-recording.webm');
              formData.append('content', 'Voice message');
              formData.append('mediaType', 'audio');
              if (currentConversationId) {
                formData.append('conversationId', currentConversationId);
              }

              const baseUrl = window.location.hostname === 'localhost' ? 'http://localhost:5000' : '';
              const res = await fetch(`${baseUrl}/api/ai-concierge/message`, {
                method: 'POST',
                body: formData
              });
              response = await handleApiResponse(res);
            } else {
              // For production
              const formData = new FormData();
              formData.append('media', audioBlob, 'voice-recording.webm');
              formData.append('content', 'Voice message');
              formData.append('mediaType', 'audio');
              if (currentConversationId) {
                formData.append('conversationId', currentConversationId);
              }

              const res = await fetch('/api/ai-concierge/message', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${getFromStorage('accessToken', '')}`
                },
                body: formData
              });
              response = await handleApiResponse(res);
            }

            if (response.success) {
              let aiContent = '';
              if (response.aiResponse) {
                aiContent = response.aiResponse.content || response.aiResponse;
              } else if (response.response) {
                aiContent = response.response;
              } else if (response.message) {
                aiContent = response.message;
              }

              if (!aiContent) {
                aiContent = "I'm ready to help with your business growth questions. What would you like to discuss?";
              }

              const aiMessage: Message = {
                id: 'ai-' + Date.now(),
                type: 'ai',
                content: aiContent,
                timestamp: new Date()
              };

              setMessages(prev => prev.filter(m => !m.isProcessing).concat([aiMessage]));
            } else {
              // If response is not successful, still remove processing and show message
              const fallbackMessage: Message = {
                id: 'ai-' + Date.now(),
                type: 'ai',
                content: "I've received your voice message. I'm here to help with your business growth questions. What specific challenges are you facing?",
                timestamp: new Date()
              };
              setMessages(prev => prev.filter(m => !m.isProcessing).concat([fallbackMessage]));
            }
          } catch (error) {
            console.error('Error processing voice message:', error);
            const errorMessage: Message = {
              id: 'error-' + Date.now(),
              type: 'ai',
              content: 'I apologize, but I encountered an error processing your voice message. Please try typing your question instead.',
              timestamp: new Date()
            };
            setMessages(prev => prev.filter(m => !m.isProcessing).concat([errorMessage]));
          } finally {
            // Always stop sending and clean up
            setIsSending(false);
            audioChunksRef.current = [];
          }
        };

        mediaRecorder.start();
        setIsRecording(true);
      } catch (error) {
        console.error('Error accessing microphone:', error);
        alert('Unable to access microphone. Please ensure you have granted microphone permissions.');
      }
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading AI Concierge...</p>
        </div>
      </div>
    );
  }

  if (!contractorProfile?.aiConciergeAccess || !contractorProfile?.completedFeedback) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <Card className="w-full max-w-md text-center">
          <CardContent className="p-8">
            <Lock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Personalize Your AI Concierge</h2>
            <p className="text-gray-600 mb-6">
              The value our platform brings is tailored specifically to your unique business needs.
              Before gaining access to your AI Concierge, tell us a bit about yourself so we can
              customize your experience to provide maximum value.
            </p>
            <p className="text-sm text-gray-500 mb-6">
              Your AI Concierge will use this information to provide personalized recommendations,
              connect you with the right partners, and anticipate your business growth needs.
            </p>
            <Button
              onClick={() => router.push('/contractorflow')}
              className="w-full bg-power100-green hover:bg-green-600 text-white font-semibold"
            >
              Tell Us A Bit About Yourself
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
      {/* Collapsible Sidebar */}
      <AnimatePresence mode="wait">
        {isSidebarOpen && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 256, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="bg-white border-r border-gray-200 flex flex-col overflow-hidden"
          >
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-br from-red-600 to-red-700 rounded-lg flex items-center justify-center">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-semibold text-gray-900">AI Concierge</h1>
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
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex-1 flex flex-col relative">
        {/* Sidebar Toggle Button */}
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="absolute left-4 top-4 z-20 p-2 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow"
        >
          {isSidebarOpen ? <PanelLeftClose className="w-5 h-5" /> : <PanelLeft className="w-5 h-5" />}
        </button>
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
                  Welcome to your AI Concierge
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
          <div className="flex-1 flex flex-col relative">
            {/* Messages */}
            <div ref={chatContainerRef} className="flex-1 overflow-y-auto" style={{ paddingBottom: '140px' }}>
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
                        <div className="flex justify-end mb-6 user-message-container">
                          <div className="max-w-2xl bg-gradient-to-r from-red-600 to-red-700 text-white rounded-2xl px-6 py-4 shadow-md">
                            <p className="text-base leading-relaxed">{typeof message.content === 'string' ? message.content : safeJsonStringify(message.content)}</p>
                            {/* Media attachments for user messages */}
                            {message.mediaUrl && (
                              <div className="mt-3">
                                {message.mediaType === 'audio' && (
                                  <audio controls className="w-full">
                                    <source src={message.mediaUrl} type="audio/webm" />
                                    Your browser does not support the audio element.
                                  </audio>
                                )}
                                {message.mediaType === 'image' && (
                                  <img
                                    src={message.mediaUrl}
                                    alt="Uploaded image"
                                    className="max-w-full h-auto rounded-lg mt-2"
                                  />
                                )}
                                {message.mediaType === 'video' && (
                                  <video controls className="max-w-full h-auto rounded-lg mt-2">
                                    <source src={message.mediaUrl} />
                                    Your browser does not support the video element.
                                  </video>
                                )}
                                {message.mediaType === 'document' && (
                                  <div className="flex items-center gap-2 mt-2 bg-white/10 rounded-lg p-2">
                                    <FileText className="w-4 h-4" />
                                    <span className="text-sm">Document attached</span>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        /* AI Message */
                        <div className="space-y-4 ai-message-container">
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
                                {typeof message.content === 'string' && message.content.includes('Based on') && (
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
                                <div className="prose prose-gray max-w-none ai-response-content">
                                  <ReactMarkdown
                                    remarkPlugins={[remarkGfm]}
                                    components={{
                                      // Custom rendering for different markdown elements
                                      h1: ({children}) => <h1 className="text-2xl font-bold text-gray-900 mb-4">{children}</h1>,
                                      h2: ({children}) => <h2 className="text-xl font-bold text-gray-900 mb-3">{children}</h2>,
                                      h3: ({children}) => <h3 className="text-lg font-semibold text-gray-900 mb-2">{children}</h3>,
                                      p: ({children}) => <p className="text-gray-700 leading-relaxed mb-4">{children}</p>,
                                      strong: ({children}) => <strong className="font-semibold text-gray-900">{children}</strong>,
                                      ul: ({children}) => <ul className="space-y-2 mb-4">{children}</ul>,
                                      ol: ({children}) => <ol className="space-y-2 mb-4 list-decimal list-inside">{children}</ol>,
                                      li: ({children}) => (
                                        <li className="flex items-start gap-2">
                                          <span className="text-red-600 mt-1">•</span>
                                          <span className="text-gray-700 flex-1">{children}</span>
                                        </li>
                                      ),
                                      blockquote: ({children}) => (
                                        <blockquote className="border-l-4 border-red-600 pl-4 italic text-gray-600 my-4">
                                          {children}
                                        </blockquote>
                                      ),
                                      code: ({inline, children}) =>
                                        inline ? (
                                          <code className="bg-gray-100 px-1 py-0.5 rounded text-sm">{children}</code>
                                        ) : (
                                          <pre className="bg-gray-100 p-3 rounded-lg overflow-x-auto mb-4">
                                            <code>{children}</code>
                                          </pre>
                                        )
                                    }}
                                  >
                                    {typeof message.content === 'string' ? message.content : safeJsonStringify(message.content)}
                                  </ReactMarkdown>
                                </div>

                                {/* Removed confusing action cards */}

                                {/* Comparison Table (if applicable) */}
                                {typeof message.content === 'string' && message.content.toLowerCase().includes('compar') && (
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

            {/* Scroll to Bottom Button */}
            <AnimatePresence>
              {showScrollButton && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  className="absolute bottom-32 left-1/2 transform -translate-x-1/2 z-10"
                >
                  <button
                    onClick={scrollToBottom}
                    className="bg-white hover:bg-gray-50 border border-gray-300 rounded-full p-3 shadow-lg hover:shadow-xl transition-all duration-200 group"
                    aria-label="Scroll to bottom"
                  >
                    <ArrowDown className="w-5 h-5 text-gray-700 group-hover:text-gray-900" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Input Area - Chat Mode (sticky at bottom) */}
            <div className="sticky bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-gray-50 to-transparent">
              <div className="max-w-4xl mx-auto">
                <div className={`rounded-2xl border shadow-lg transition-all duration-300 ${
                  isSending
                    ? 'bg-gray-50 border-gray-300'
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
                        className={`w-full resize-none border-0 outline-none text-lg leading-relaxed transition-all duration-300 bg-transparent ${
                          isSending
                            ? 'text-gray-500 placeholder-gray-400'
                            : 'text-gray-900 placeholder-gray-500'
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
                            ? 'text-gray-400 cursor-not-allowed'
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
                        className="p-2 bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white rounded-lg transition-colors disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <Send className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
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