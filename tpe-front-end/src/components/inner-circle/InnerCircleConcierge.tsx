'use client';

// ================================================================
// Inner Circle AI Concierge — Reference Component (Phase 1)
// ================================================================
// Purpose: Chat interface for Inner Circle members to interact with
//          the AI Concierge. Mirrors the contractor AI Concierge
//          but targets /api/inner-circle endpoints.
//
// NOTE: This is a REFERENCE component for Phase 1. The final UI will
//       be embedded in the WordPress Inner Circle portal. This component
//       demonstrates the API contract and interaction pattern.
// ================================================================

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Send,
  Bot,
  User,
  Loader,
  Sparkles,
  Target,
  BookOpen,
  Users,
  ArrowDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

interface Message {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
}

interface MemberProfile {
  id: number;
  name: string;
  onboardingComplete: boolean;
  partnerUnlocked: boolean;
  powerMovesActive: number;
  powerMovesCompleted: number;
  membershipStatus: string;
}

interface InnerCircleConciergeProps {
  memberId: number;
}

export default function InnerCircleConcierge({ memberId }: InnerCircleConciergeProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [profile, setProfile] = useState<MemberProfile | null>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Load profile and conversation history on mount
  useEffect(() => {
    loadProfile();
    loadConversations();
  }, [memberId]);

  // Auto-scroll on new messages
  useEffect(() => {
    if (!showScrollButton) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  async function loadProfile() {
    try {
      const res = await fetch(`${API_BASE}/inner-circle/profile?member_id=${memberId}`);
      const data = await res.json();
      if (data.success) {
        setProfile(data.profile);
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
    }
  }

  async function loadConversations() {
    try {
      const res = await fetch(`${API_BASE}/inner-circle/conversations?member_id=${memberId}&limit=50`);
      const data = await res.json();
      if (data.success && data.conversations.length > 0) {
        setMessages(data.conversations.map((c: any) => ({
          id: String(c.id),
          type: c.message_type === 'ai' ? 'ai' : 'user',
          content: c.content,
          timestamp: new Date(c.created_at)
        })));
      }
    } catch (error) {
      console.error('Failed to load conversations:', error);
    }
  }

  async function sendMessage() {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      type: 'user',
      content: input.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch(`${API_BASE}/inner-circle/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          member_id: memberId,
          message: userMessage.content,
          session_id: sessionId
        })
      });

      const data = await res.json();

      if (data.success) {
        if (data.session_id) setSessionId(data.session_id);

        const aiMessage: Message = {
          id: `ai-${Date.now()}`,
          type: 'ai',
          content: data.aiResponse.content,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, aiMessage]);
      } else {
        setMessages(prev => [...prev, {
          id: `error-${Date.now()}`,
          type: 'ai',
          content: 'Sorry, something went wrong. Please try again.',
          timestamp: new Date()
        }]);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      setMessages(prev => [...prev, {
        id: `error-${Date.now()}`,
        type: 'ai',
        content: 'Unable to connect to the AI Concierge. Please check your connection.',
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  function handleScroll() {
    if (!chatContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
    setShowScrollButton(scrollHeight - scrollTop - clientHeight > 100);
  }

  function scrollToBottom() {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    setShowScrollButton(false);
  }

  // Quick-start prompts for new members
  const quickPrompts = [
    { icon: <Sparkles className="w-4 h-4" />, label: 'Get started', prompt: "Hi! I'm new to the Inner Circle. Help me get set up." },
    { icon: <Target className="w-4 h-4" />, label: 'Create PowerMove', prompt: "I'd like to create my first PowerMove. Can you help me pick a goal?" },
    { icon: <BookOpen className="w-4 h-4" />, label: 'Book recs', prompt: "What books should I read based on where my business is right now?" },
    { icon: <Users className="w-4 h-4" />, label: 'My progress', prompt: "How am I doing? Give me a status check on my goals." }
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Inner Circle Concierge</h2>
            <p className="text-sm text-gray-500">Your personal business coach</p>
          </div>
        </div>

        {profile && (
          <div className="flex items-center gap-2">
            {profile.powerMovesActive > 0 && (
              <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                {profile.powerMovesActive} Active PowerMove{profile.powerMovesActive !== 1 ? 's' : ''}
              </Badge>
            )}
            {profile.partnerUnlocked && (
              <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">
                Partners Unlocked
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* Chat Messages */}
      <div
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto px-6 py-4 space-y-4"
        onScroll={handleScroll}
      >
        {/* Welcome message if no conversations */}
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-6">
            <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-red-600 rounded-2xl flex items-center justify-center shadow-lg">
              <Bot className="w-8 h-8 text-white" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                Welcome to the Inner Circle
              </h3>
              <p className="text-gray-500 max-w-md">
                I'm your personal AI business coach. I'll help you set goals, track progress,
                and connect you with the right resources to grow your business.
              </p>
            </div>

            {/* Quick-start buttons */}
            <div className="grid grid-cols-2 gap-3 max-w-lg w-full">
              {quickPrompts.map((qp, i) => (
                <button
                  key={i}
                  onClick={() => { setInput(qp.prompt); }}
                  className="group flex items-center gap-2 p-3 bg-white rounded-xl border border-gray-200 hover:border-red-300 hover:shadow-md transition-all duration-200 text-left"
                >
                  <div className="w-8 h-8 bg-red-50 rounded-lg flex items-center justify-center text-red-500 group-hover:bg-red-100 transition-colors">
                    {qp.icon}
                  </div>
                  <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">{qp.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Message list */}
        <AnimatePresence>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={`flex gap-3 ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.type === 'ai' && (
                <div className="w-8 h-8 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <Bot className="w-4 h-4 text-white" />
                </div>
              )}

              <div
                className={`max-w-[75%] rounded-2xl px-4 py-3 ${
                  msg.type === 'user'
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}
              >
                {msg.type === 'ai' ? (
                  <div className="prose prose-sm max-w-none prose-p:my-1 prose-li:my-0.5">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {msg.content}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                )}
              </div>

              {msg.type === 'user' && (
                <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <User className="w-4 h-4 text-gray-600" />
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Loading indicator */}
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex gap-3"
          >
            <div className="w-8 h-8 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center flex-shrink-0">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="bg-gray-100 rounded-2xl px-4 py-3 flex items-center gap-2">
              <Loader className="w-4 h-4 animate-spin text-gray-400" />
              <span className="text-sm text-gray-500">Thinking...</span>
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Scroll-to-bottom button */}
      {showScrollButton && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2">
          <button
            onClick={scrollToBottom}
            className="bg-white shadow-lg rounded-full p-2 border border-gray-200 hover:shadow-xl transition-all"
          >
            <ArrowDown className="w-4 h-4 text-gray-600" />
          </button>
        </div>
      )}

      {/* Input area */}
      <div className="px-6 py-4 border-t border-gray-100 bg-white">
        <div className="flex items-end gap-3">
          <div className="flex-1 relative">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask me anything about your business..."
              className="w-full resize-none rounded-xl border border-gray-200 px-4 py-3 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent min-h-[48px] max-h-[120px]"
              rows={1}
            />
          </div>
          <Button
            onClick={sendMessage}
            disabled={!input.trim() || isLoading}
            className="bg-red-500 hover:bg-red-600 text-white rounded-xl h-12 w-12 flex items-center justify-center p-0"
          >
            <Send className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
