'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, MapPin, Users, Clock } from 'lucide-react';

interface Event {
  id: number;
  name: string;
  date: string;
  location: string;
  description?: string;
  status: string;
  expected_attendance?: number;
  event_type?: string;
}

export default function EventsPage() {
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      setLoading(true);

      // Backend API base URL
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const response = await fetch(`${API_BASE}/api/events`);

      if (!response.ok) {
        throw new Error('Failed to fetch events');
      }

      const data = await response.json();
      setEvents(data.events || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return 'bg-green-500';
      case 'upcoming':
        return 'bg-blue-500';
      case 'completed':
        return 'bg-gray-500';
      default:
        return 'bg-gray-400';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-power100-bg-grey flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-power100-red mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading events...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-power100-bg-grey flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600">Error Loading Events</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={fetchEvents} className="w-full bg-power100-green hover:bg-green-600 text-white">
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-power100-bg-grey py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-power100-black mb-2">Power100 Events</h1>
          <p className="text-gray-600">Browse and register for upcoming events</p>
        </div>

        {/* Events Grid */}
        {events.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No events available at this time</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((event) => (
              <Card
                key={event.id}
                className="hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => router.push(`/events/${event.id}/agenda`)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between mb-2">
                    <CardTitle className="text-xl flex-1">{event.name}</CardTitle>
                    <Badge className={`${getStatusColor(event.status)} text-white`}>
                      {event.status}
                    </Badge>
                  </div>
                  {event.event_type && (
                    <Badge variant="outline" className="w-fit">
                      {event.event_type}
                    </Badge>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {/* Date */}
                    <div className="flex items-start">
                      <Calendar className="h-5 w-5 text-power100-red mr-3 mt-0.5 flex-shrink-0" />
                      <div className="text-sm">
                        {formatDate(event.date)}
                      </div>
                    </div>

                    {/* Location */}
                    {event.location && (
                      <div className="flex items-start">
                        <MapPin className="h-5 w-5 text-power100-red mr-3 mt-0.5 flex-shrink-0" />
                        <div className="text-sm">{event.location}</div>
                      </div>
                    )}

                    {/* Expected Attendance */}
                    {event.expected_attendance && (
                      <div className="flex items-center">
                        <Users className="h-5 w-5 text-power100-red mr-3 flex-shrink-0" />
                        <div className="text-sm">
                          {event.expected_attendance} expected attendees
                        </div>
                      </div>
                    )}

                    {/* Description */}
                    {event.description && (
                      <p className="text-sm text-gray-600 line-clamp-2 mt-3">
                        {event.description}
                      </p>
                    )}

                    {/* View Details Button */}
                    <Button
                      className="w-full mt-4 bg-power100-green hover:bg-green-600 text-white"
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/events/${event.id}/agenda`);
                      }}
                    >
                      View Details
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
