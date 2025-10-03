'use client';

import React, { useState, useEffect } from 'react';
import { ArrowLeft, Radio, Calendar, Users, MessageSquare, Clock, Send } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { adminControlsApi } from '@/lib/api';

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
}

// DATABASE-CHECKED: admin_sms_commands columns verified on 2025-10-03
interface SMSCommand {
  id: number;
  admin_phone: string;
  event_code: string;
  command_type: string;
  command_text: string;
  executed: boolean;
  success: boolean;
  response_message: string;
  created_at: string;
}

// For message stats from event_messages table
interface EventStats {
  event_id: number;
  pending_count: number;
  sent_count: number;
  delivered_count: number;
  failed_count: number;
}

export default function EventControlCenter() {
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [eventStats, setEventStats] = useState<Map<number, EventStats>>(new Map());
  const [recentCommands, setRecentCommands] = useState<SMSCommand[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      // Fetch active events
      const eventsResponse: any = await adminControlsApi.getActiveEvents();
      if (eventsResponse && eventsResponse.success && eventsResponse.events) {
        setEvents(eventsResponse.events);
      }

      // Fetch event message stats
      const statsResponse: any = await adminControlsApi.getEventMessageStats();
      if (statsResponse && statsResponse.success && statsResponse.stats) {
        const statsMap = new Map<number, EventStats>();
        statsResponse.stats.forEach((stat: EventStats) => {
          statsMap.set(stat.event_id, stat);
        });
        setEventStats(statsMap);
      }

      // Fetch recent SMS commands
      const commandsResponse: any = await adminControlsApi.getRecentSMSCommands(20);
      if (commandsResponse && commandsResponse.success && commandsResponse.commands) {
        setRecentCommands(commandsResponse.commands);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
      toast.error('Failed to load event data');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-power100-bg-grey p-8">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => router.push('/admindashboard')}
          className="flex items-center gap-2 text-power100-black hover:text-power100-red mb-4"
        >
          <ArrowLeft className="h-5 w-5" />
          Back to Dashboard
        </button>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-power100-red rounded-full flex items-center justify-center">
            <Radio className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-power100-black">Event Control Center</h1>
            <p className="text-power100-grey">Manage live events via SMS commands</p>
          </div>
        </div>
      </div>

      {/* SMS Command Help Section */}
      <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
        <h2 className="text-xl font-bold text-power100-black mb-4">📱 SMS Command Reference</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* HELP Command */}
          <div className="border-l-4 border-power100-red pl-4">
            <div className="font-semibold text-power100-black mb-2">HELP Command</div>
            <div className="text-sm text-power100-grey mb-2">
              <code className="bg-gray-100 px-2 py-1 rounded">[EVENT_CODE] HELP</code>
            </div>
            <p className="text-sm text-power100-grey">Get list of available commands</p>
            <p className="text-xs text-power100-grey mt-1">Example: <code>CGE2024 HELP</code></p>
          </div>

          {/* STATUS Command */}
          <div className="border-l-4 border-power100-green pl-4">
            <div className="font-semibold text-power100-black mb-2">STATUS Command</div>
            <div className="text-sm text-power100-grey mb-2">
              <code className="bg-gray-100 px-2 py-1 rounded">[EVENT_CODE] STATUS</code>
            </div>
            <p className="text-sm text-power100-grey">Get event message statistics</p>
            <p className="text-xs text-power100-grey mt-1">Example: <code>CGE2024 STATUS</code></p>
          </div>

          {/* DELAY Command */}
          <div className="border-l-4 border-yellow-500 pl-4">
            <div className="font-semibold text-power100-black mb-2">DELAY Command</div>
            <div className="text-sm text-power100-grey mb-2">
              <code className="bg-gray-100 px-2 py-1 rounded">[EVENT_CODE] DELAY [MINUTES]</code>
            </div>
            <p className="text-sm text-power100-grey">Delay all pending messages</p>
            <p className="text-xs text-power100-grey mt-1">Example: <code>CGE2024 DELAY 15</code></p>
          </div>

          {/* MSG Command */}
          <div className="border-l-4 border-blue-500 pl-4">
            <div className="font-semibold text-power100-black mb-2">MSG Command</div>
            <div className="text-sm text-power100-grey mb-2">
              <code className="bg-gray-100 px-2 py-1 rounded">[EVENT_CODE] MSG [AUDIENCE] [MESSAGE]</code>
            </div>
            <p className="text-sm text-power100-grey">Send custom message to audience</p>
            <p className="text-xs text-power100-grey mt-1">
              Example: <code>CGE2024 MSG all Welcome everyone!</code>
            </p>
            <p className="text-xs text-power100-grey mt-1">
              Audiences: <span className="font-semibold">all</span>, <span className="font-semibold">checkedin</span>, <span className="font-semibold">pending</span>
            </p>
          </div>
        </div>

        {/* Quick Tips */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h3 className="font-semibold text-power100-black mb-2">💡 Quick Tips</h3>
          <ul className="text-sm text-power100-grey space-y-1">
            <li>• Event codes are case-insensitive (CGE2024 = cge2024)</li>
            <li>• Commands are logged automatically for audit trail</li>
            <li>• You'll receive SMS confirmation for each command</li>
            <li>• Only authorized admin phone numbers can execute commands</li>
          </ul>
        </div>
      </div>

      {/* Active Events */}
      <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
        <h2 className="text-xl font-bold text-power100-black mb-4">🎯 Active Events</h2>
        {loading ? (
          <div className="text-center py-8 text-power100-grey">Loading events...</div>
        ) : events.length === 0 ? (
          <div className="text-center py-8 text-power100-grey">No active events</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {events.map((event) => {
              const stats = eventStats.get(event.id);
              return (
                <div
                  key={event.id}
                  onClick={() => router.push(`/admindashboard/event-control-center/${event.id}`)}
                  className="border border-gray-200 rounded-xl p-4 hover:shadow-lg hover:border-power100-red transition-all cursor-pointer"
                >
                  {/* Event Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-power100-black">{event.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <code className="text-sm bg-power100-red text-white px-2 py-1 rounded">
                          {event.sms_event_code}
                        </code>
                        {event.is_active && (
                          <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                            Live
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Event Stats */}
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-power100-grey">
                      <Calendar className="h-4 w-4" />
                      <span>{new Date(event.date).toLocaleDateString()}</span>
                    </div>
                    {event.location && (
                      <div className="flex items-center gap-2 text-power100-grey">
                        <MessageSquare className="h-4 w-4" />
                        <span>{event.location}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-power100-grey">
                      <Users className="h-4 w-4" />
                      <span>{event.expected_attendance || 0} expected</span>
                    </div>
                    {stats && (
                      <>
                        <div className="flex items-center gap-2 text-power100-grey">
                          <Clock className="h-4 w-4" />
                          <span>{stats.pending_count} pending messages</span>
                        </div>
                        <div className="flex items-center gap-2 text-power100-grey">
                          <Send className="h-4 w-4" />
                          <span>{stats.sent_count} sent</span>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Quick Actions */}
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <p className="text-xs text-power100-grey">
                      Click for details • Text: <span className="font-semibold">+1 (810) 893-4075</span>
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Recent SMS Commands */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <h2 className="text-xl font-bold text-power100-black mb-4">📜 Recent SMS Commands</h2>
        {recentCommands.length === 0 ? (
          <div className="text-center py-8 text-power100-grey">
            No recent commands. Text a command to see it here!
          </div>
        ) : (
          <div className="space-y-3">
            {recentCommands.map((cmd) => (
              <div
                key={cmd.id}
                className="flex items-start gap-4 p-4 border border-gray-200 rounded-lg"
              >
                <div className={`w-2 h-2 rounded-full mt-2 ${cmd.success ? 'bg-green-500' : 'bg-red-500'}`} />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <code className="text-sm font-semibold">{cmd.event_code}</code>
                    <span className="text-sm text-power100-grey">{cmd.command_type.toUpperCase()}</span>
                    <span className="text-xs text-power100-grey ml-auto">
                      {new Date(cmd.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm text-power100-grey mb-2">{cmd.command_text}</p>
                  {cmd.response_message && (
                    <p className="text-sm bg-gray-50 p-2 rounded">{cmd.response_message}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
