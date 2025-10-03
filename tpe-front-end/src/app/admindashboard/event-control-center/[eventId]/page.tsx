'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Clock, Send, CheckCircle, XCircle, AlertCircle, Radio, Calendar, MapPin, Users, Activity, ChevronLeft, ChevronRight, PlayCircle, MessageCircle, Info } from 'lucide-react';
import { toast } from 'sonner';
import { adminControlsApi } from '@/lib/api';
import { Button } from '@/components/ui/button';

// DATABASE-CHECKED: events columns verified on 2025-10-03
interface Event {
  id: number;
  name: string;
  sms_event_code: string;
  date: string;
  event_type: string;
  is_active: boolean;
  expected_attendance?: number;
  location?: string;
  status?: string;
  description?: string;
}

// DATABASE-CHECKED: event_messages columns verified on 2025-10-03
interface EventStats {
  pending_count: string;
  sent_count: string;
  delivered_count: string;
  failed_count: string;
  next_scheduled?: string;
  last_activity?: string;
}

interface Message {
  id: number;
  message_type: string;
  message_category: string;
  message_content: string;
  scheduled_time: string;
  actual_send_time?: string;
  status: string;
  error_message?: string;
}

interface SMSCommand {
  id: number;
  admin_phone: string;
  command_type: string;
  command_text: string;
  executed: boolean;
  success: boolean;
  response_message: string;
  created_at: string;
}

export default function EventDetailPage() {
  const router = useRouter();
  const params = useParams();
  const eventId = params.eventId as string;

  const [event, setEvent] = useState<Event | null>(null);
  const [stats, setStats] = useState<EventStats | null>(null);
  const [recentCommands, setRecentCommands] = useState<SMSCommand[]>([]);
  const [messageHistory, setMessageHistory] = useState<Message[]>([]);
  const [upcomingMessages, setUpcomingMessages] = useState<Message[]>([]);
  const [failedMessages, setFailedMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAutoRefreshing, setIsAutoRefreshing] = useState(false);
  const [lastActivityTime, setLastActivityTime] = useState<string | null>(null);
  const [historyPage, setHistoryPage] = useState(1);
  const [messagesPerPage] = useState(10);

  // Quick action states
  const [showDelayModal, setShowDelayModal] = useState(false);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [delayMinutes, setDelayMinutes] = useState('15');
  const [customMessage, setCustomMessage] = useState('');
  const [messageAudience, setMessageAudience] = useState('all');
  const [actionLoading, setActionLoading] = useState(false);

  const autoRefreshInterval = useRef<NodeJS.Timeout | null>(null);
  const autoRefreshTimeout = useRef<NodeJS.Timeout | null>(null);

  // Load all data
  const loadData = async () => {
    try {
      setLoading(true);

      // Get comprehensive event details
      const detailsResponse: any = await adminControlsApi.getEventDetails(parseInt(eventId));
      if (detailsResponse && detailsResponse.success) {
        setEvent(detailsResponse.event);
        setStats(detailsResponse.stats);
        setRecentCommands(detailsResponse.recent_commands || []);

        // Check if there was recent activity to trigger auto-refresh
        const lastActivity = detailsResponse.last_activity;
        if (lastActivity) {
          const activityTime = new Date(lastActivity).getTime();
          const now = new Date().getTime();
          const tenMinutesAgo = now - (10 * 60 * 1000);

          // If last activity was within 10 minutes, start auto-refresh
          if (activityTime > tenMinutesAgo) {
            startAutoRefresh(lastActivity);
          }
        }
      }

      // Get message history
      const historyResponse: any = await adminControlsApi.getEventMessageHistory(parseInt(eventId), 20);
      if (historyResponse && historyResponse.success) {
        setMessageHistory(historyResponse.messages || []);
      }

      // Get upcoming messages
      const upcomingResponse: any = await adminControlsApi.getUpcomingMessages(parseInt(eventId), 10);
      if (upcomingResponse && upcomingResponse.success) {
        setUpcomingMessages(upcomingResponse.upcoming || []);
      }

      // Get failed messages
      const failedResponse: any = await adminControlsApi.getFailedMessages(parseInt(eventId));
      if (failedResponse && failedResponse.success) {
        setFailedMessages(failedResponse.failed || []);
      }
    } catch (error) {
      console.error('Failed to load event details:', error);
      toast.error('Failed to load event details');
    } finally {
      setLoading(false);
    }
  };

  // Smart auto-refresh: Only refresh for 10 minutes after activity
  const startAutoRefresh = (activityTime: string) => {
    setLastActivityTime(activityTime);
    setIsAutoRefreshing(true);

    // Clear any existing intervals/timeouts
    if (autoRefreshInterval.current) clearInterval(autoRefreshInterval.current);
    if (autoRefreshTimeout.current) clearTimeout(autoRefreshTimeout.current);

    // Refresh every 10 seconds
    autoRefreshInterval.current = setInterval(() => {
      loadData();
    }, 10000);

    // Stop auto-refresh after 10 minutes
    autoRefreshTimeout.current = setTimeout(() => {
      if (autoRefreshInterval.current) clearInterval(autoRefreshInterval.current);
      setIsAutoRefreshing(false);
      toast.info('Auto-refresh stopped. Click refresh to update manually.');
    }, 10 * 60 * 1000); // 10 minutes
  };

  // Cleanup intervals on unmount
  useEffect(() => {
    return () => {
      if (autoRefreshInterval.current) clearInterval(autoRefreshInterval.current);
      if (autoRefreshTimeout.current) clearTimeout(autoRefreshTimeout.current);
    };
  }, []);

  useEffect(() => {
    loadData();
  }, [eventId]);

  // Handle DELAY command
  const handleDelay = async () => {
    if (!delayMinutes || parseInt(delayMinutes) <= 0) {
      toast.error('Please enter valid delay minutes');
      return;
    }

    try {
      setActionLoading(true);
      const baseUrl = process.env.NODE_ENV === 'production'
        ? 'https://tpx.power100.io'
        : 'http://localhost:5000';
      const response: any = await fetch(`${baseUrl}/api/admin-controls/sms-command`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          admin_phone: '+1 (000) 000-0000', // Web UI execution
          event_code: event?.sms_event_code,
          command_type: 'delay',
          command_text: `${event?.sms_event_code} DELAY ${delayMinutes}`,
          parsed_params: {
            delay_minutes: parseInt(delayMinutes)
          }
        })
      });

      const data = await response.json();
      if (data.success) {
        toast.success(data.sms_reply || `Successfully delayed messages by ${delayMinutes} minutes`);
        setShowDelayModal(false);
        setDelayMinutes('15');
        loadData(); // Refresh data
        startAutoRefresh(new Date().toISOString()); // Start auto-refresh
      } else {
        toast.error(data.sms_reply || 'Failed to delay messages');
      }
    } catch (error) {
      console.error('Error delaying messages:', error);
      toast.error('Failed to delay messages');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle custom message send
  const handleSendMessage = async () => {
    if (!customMessage.trim()) {
      toast.error('Please enter a message');
      return;
    }

    try {
      setActionLoading(true);
      const baseUrl = process.env.NODE_ENV === 'production'
        ? 'https://tpx.power100.io'
        : 'http://localhost:5000';
      const response: any = await fetch(`${baseUrl}/api/admin-controls/sms-command`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          admin_phone: '+1 (000) 000-0000', // Web UI execution
          event_code: event?.sms_event_code,
          command_type: 'msg',
          command_text: `${event?.sms_event_code} MSG ${messageAudience} ${customMessage}`,
          parsed_params: {
            target_audience: messageAudience,
            message_content: customMessage
          }
        })
      });

      const data = await response.json();
      if (data.success) {
        toast.success(data.sms_reply || 'Message queued successfully');
        setShowMessageModal(false);
        setCustomMessage('');
        setMessageAudience('all');
        loadData(); // Refresh data
        startAutoRefresh(new Date().toISOString()); // Start auto-refresh
      } else {
        toast.error(data.sms_reply || 'Failed to send message');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle STATUS refresh
  const handleStatusRefresh = async () => {
    toast.info('Refreshing event status...');
    await loadData();
    toast.success('Status updated!');
  };

  if (loading || !event) {
    return (
      <div className="min-h-screen bg-power100-bg-grey flex items-center justify-center">
        <div className="text-center">
          <Radio className="h-12 w-12 text-power100-red mx-auto animate-pulse mb-4" />
          <p className="text-power100-grey">Loading event details...</p>
        </div>
      </div>
    );
  }

  const pendingCount = parseInt(stats?.pending_count || '0');
  const sentCount = parseInt(stats?.sent_count || '0');
  const deliveredCount = parseInt(stats?.delivered_count || '0');
  const failedCount = parseInt(stats?.failed_count || '0');
  const totalMessages = pendingCount + sentCount + deliveredCount + failedCount;
  const deliveryRate = deliveredCount > 0 && (deliveredCount + failedCount) > 0
    ? ((deliveredCount / (deliveredCount + failedCount)) * 100).toFixed(1)
    : '0';

  return (
    <div className="min-h-screen bg-power100-bg-grey p-8">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => router.push('/admindashboard/event-control-center')}
          className="flex items-center gap-2 text-power100-black hover:text-power100-red mb-4"
        >
          <ArrowLeft className="h-5 w-5" />
          Back to Event Control Center
        </button>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-power100-red rounded-full flex items-center justify-center">
              <Radio className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-power100-black">{event.name}</h1>
              <div className="flex items-center gap-3 mt-1">
                <code className="text-sm bg-power100-red text-white px-3 py-1 rounded">
                  {event.sms_event_code}
                </code>
                {event.is_active && (
                  <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded flex items-center gap-1">
                    <Activity className="h-3 w-3" />
                    Live
                  </span>
                )}
                {isAutoRefreshing && (
                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded flex items-center gap-1">
                    <Clock className="h-3 w-3 animate-spin" />
                    Auto-updating...
                  </span>
                )}
              </div>
            </div>
          </div>
          <Button
            onClick={loadData}
            variant="outline"
            className="bg-white border-2 border-gray-200 text-power100-black hover:bg-gray-50"
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Event Info Bar */}
      <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="flex items-center gap-3">
            <Calendar className="h-5 w-5 text-power100-grey" />
            <div>
              <p className="text-xs text-power100-grey">Date</p>
              <p className="font-semibold text-power100-black">
                {new Date(event.date).toLocaleDateString()}
              </p>
            </div>
          </div>
          {event.location && (
            <div className="flex items-center gap-3">
              <MapPin className="h-5 w-5 text-power100-grey" />
              <div>
                <p className="text-xs text-power100-grey">Location</p>
                <p className="font-semibold text-power100-black">{event.location}</p>
              </div>
            </div>
          )}
          <div className="flex items-center gap-3">
            <Users className="h-5 w-5 text-power100-grey" />
            <div>
              <p className="text-xs text-power100-grey">Expected</p>
              <p className="font-semibold text-power100-black">{event.expected_attendance || 0}</p>
            </div>
          </div>
          {event.event_type && (
            <div className="flex items-center gap-3">
              <Radio className="h-5 w-5 text-power100-grey" />
              <div>
                <p className="text-xs text-power100-grey">Type</p>
                <p className="font-semibold text-power100-black">{event.event_type}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Message Statistics */}
      <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
        <h2 className="text-xl font-bold text-power100-black mb-6">📊 Message Statistics</h2>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <Clock className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-power100-black">{pendingCount}</p>
            <p className="text-sm text-power100-grey">Pending</p>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <Send className="h-8 w-8 text-blue-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-power100-black">{sentCount}</p>
            <p className="text-sm text-power100-grey">Sent</p>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-power100-black">{deliveredCount}</p>
            <p className="text-sm text-power100-grey">Delivered</p>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <XCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-power100-black">{failedCount}</p>
            <p className="text-sm text-power100-grey">Failed</p>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <AlertCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-green-600">{deliveryRate}%</p>
            <p className="text-sm text-power100-grey">Delivery Rate</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Upcoming Messages */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-power100-black mb-4">⏰ Upcoming Messages ({upcomingMessages.length})</h2>
          {upcomingMessages.length === 0 ? (
            <p className="text-center py-8 text-power100-grey">No upcoming scheduled messages</p>
          ) : (
            <div className="space-y-3">
              {upcomingMessages.map((msg) => (
                <div key={msg.id} className="border border-gray-200 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-power100-red">{msg.message_type}</span>
                    <span className="text-xs text-power100-grey">
                      {new Date(msg.scheduled_time).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm text-power100-black">{msg.message_content}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent SMS Commands */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-power100-black mb-4">📱 Recent SMS Commands ({recentCommands.length})</h2>
          {recentCommands.length === 0 ? (
            <p className="text-center py-8 text-power100-grey">No commands executed yet</p>
          ) : (
            <div className="space-y-3">
              {recentCommands.map((cmd) => (
                <div key={cmd.id} className="flex items-start gap-3 border border-gray-200 rounded-lg p-3">
                  <div className={`w-2 h-2 rounded-full mt-2 ${cmd.success ? 'bg-green-500' : 'bg-red-500'}`} />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-power100-black">{cmd.command_type.toUpperCase()}</span>
                      <span className="text-xs text-power100-grey ml-auto">
                        {new Date(cmd.created_at).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm text-power100-grey mb-1">{cmd.command_text}</p>
                    {cmd.response_message && (
                      <p className="text-xs bg-gray-50 p-2 rounded">{cmd.response_message}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Message History */}
      <div className="bg-white rounded-2xl shadow-lg p-6 mt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-power100-black">📜 Message History ({messageHistory.length})</h2>
          {messageHistory.length > messagesPerPage && (
            <div className="flex items-center gap-2 text-sm text-power100-grey">
              <span>Page {historyPage} of {Math.ceil(messageHistory.length / messagesPerPage)}</span>
            </div>
          )}
        </div>
        {messageHistory.length === 0 ? (
          <p className="text-center py-8 text-power100-grey">No messages sent yet</p>
        ) : (
          <>
            <div className="space-y-3">
              {messageHistory
                .slice((historyPage - 1) * messagesPerPage, historyPage * messagesPerPage)
                .map((msg) => (
                  <div key={msg.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-semibold text-power100-red">{msg.message_type}</span>
                        <span className={`text-xs px-2 py-1 rounded ${
                          msg.status === 'delivered' ? 'bg-green-100 text-green-800' :
                          msg.status === 'sent' ? 'bg-blue-100 text-blue-800' :
                          msg.status === 'failed' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {msg.status}
                        </span>
                      </div>
                      <span className="text-xs text-power100-grey">
                        {msg.actual_send_time ? new Date(msg.actual_send_time).toLocaleString() :
                         new Date(msg.scheduled_time).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm text-power100-black">{msg.message_content}</p>
                    {msg.error_message && (
                      <p className="text-xs text-red-600 mt-2">Error: {msg.error_message}</p>
                    )}
                  </div>
                ))}
            </div>
            {messageHistory.length > messagesPerPage && (
              <div className="flex items-center justify-center gap-4 mt-6 pt-6 border-t border-gray-200">
                <Button
                  onClick={() => setHistoryPage(prev => Math.max(1, prev - 1))}
                  disabled={historyPage === 1}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <span className="text-sm text-power100-grey">
                  Showing {((historyPage - 1) * messagesPerPage) + 1}-{Math.min(historyPage * messagesPerPage, messageHistory.length)} of {messageHistory.length}
                </span>
                <Button
                  onClick={() => setHistoryPage(prev => Math.min(Math.ceil(messageHistory.length / messagesPerPage), prev + 1))}
                  disabled={historyPage >= Math.ceil(messageHistory.length / messagesPerPage)}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Failed Messages (if any) */}
      {failedMessages.length > 0 && (
        <div className="bg-white rounded-2xl shadow-lg p-6 mt-8">
          <h2 className="text-xl font-bold text-power100-black mb-4">❌ Failed Messages ({failedMessages.length})</h2>
          <div className="space-y-2">
            {failedMessages.slice(0, 10).map((msg: any) => (
              <div key={msg.id} className="flex items-center justify-between border border-red-200 rounded-lg p-3 bg-red-50">
                <div className="flex-1">
                  <p className="text-sm text-power100-black">{msg.phone}</p>
                  <p className="text-xs text-red-600">{msg.error_message || 'Unknown error'}</p>
                </div>
                <span className="text-xs text-power100-grey">
                  {new Date(msg.actual_send_time || msg.created_at).toLocaleString()}
                </span>
              </div>
            ))}
            {failedMessages.length > 10 && (
              <p className="text-center text-sm text-power100-grey pt-2">
                ... and {failedMessages.length - 10} more
              </p>
            )}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="bg-white rounded-2xl shadow-lg p-6 mt-8">
        <h2 className="text-xl font-bold text-power100-black mb-4">⚡ Quick Actions</h2>
        <p className="text-sm text-power100-grey mb-6">
          Execute commands directly from the dashboard or text to: <span className="font-semibold">+1 (810) 893-4075</span>
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Delay Messages Button */}
          <Button
            onClick={() => setShowDelayModal(true)}
            className="h-24 bg-yellow-500 hover:bg-yellow-600 text-white flex flex-col items-center justify-center gap-2"
          >
            <Clock className="h-8 w-8" />
            <span className="font-semibold">Delay Messages</span>
          </Button>

          {/* Refresh Status Button */}
          <Button
            onClick={handleStatusRefresh}
            className="h-24 bg-blue-500 hover:bg-blue-600 text-white flex flex-col items-center justify-center gap-2"
          >
            <Info className="h-8 w-8" />
            <span className="font-semibold">Refresh Status</span>
          </Button>

          {/* Send Custom Message Button */}
          <Button
            onClick={() => setShowMessageModal(true)}
            className="h-24 bg-power100-green hover:bg-green-600 text-white flex flex-col items-center justify-center gap-2"
          >
            <MessageCircle className="h-8 w-8" />
            <span className="font-semibold">Send Message</span>
          </Button>
        </div>
      </div>

      {/* Delay Modal */}
      {showDelayModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4">
            <h3 className="text-2xl font-bold text-power100-black mb-4">⏰ Delay Messages</h3>
            <p className="text-sm text-power100-grey mb-6">
              Delay all pending messages for this event by a specified number of minutes.
            </p>
            <div className="mb-6">
              <label className="block text-sm font-semibold text-power100-black mb-2">
                Delay Minutes
              </label>
              <input
                type="number"
                value={delayMinutes}
                onChange={(e) => setDelayMinutes(e.target.value)}
                className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-power100-red focus:outline-none"
                placeholder="15"
                min="1"
              />
              <p className="text-xs text-power100-grey mt-2">
                Current pending: {pendingCount} messages
              </p>
            </div>
            <div className="flex gap-4">
              <Button
                onClick={() => {
                  setShowDelayModal(false);
                  setDelayMinutes('15');
                }}
                variant="outline"
                className="flex-1"
                disabled={actionLoading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleDelay}
                className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-white"
                disabled={actionLoading}
              >
                {actionLoading ? 'Delaying...' : `Delay ${delayMinutes}m`}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Send Message Modal */}
      {showMessageModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4">
            <h3 className="text-2xl font-bold text-power100-black mb-4">💬 Send Custom Message</h3>
            <p className="text-sm text-power100-grey mb-6">
              Send a custom message to a specific audience for this event.
            </p>
            <div className="mb-4">
              <label className="block text-sm font-semibold text-power100-black mb-2">
                Audience
              </label>
              <select
                value={messageAudience}
                onChange={(e) => setMessageAudience(e.target.value)}
                className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-power100-red focus:outline-none bg-white"
              >
                <option value="all">All Attendees</option>
                <option value="checkedin">Checked-In Only</option>
                <option value="pending">Pending Check-In</option>
              </select>
            </div>
            <div className="mb-6">
              <label className="block text-sm font-semibold text-power100-black mb-2">
                Message
              </label>
              <textarea
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-power100-red focus:outline-none"
                placeholder="Enter your message..."
                rows={4}
              />
            </div>
            <div className="flex gap-4">
              <Button
                onClick={() => {
                  setShowMessageModal(false);
                  setCustomMessage('');
                  setMessageAudience('all');
                }}
                variant="outline"
                className="flex-1"
                disabled={actionLoading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSendMessage}
                className="flex-1 bg-power100-green hover:bg-green-600 text-white"
                disabled={actionLoading}
              >
                {actionLoading ? 'Sending...' : 'Send Message'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
