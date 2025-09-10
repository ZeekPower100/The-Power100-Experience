'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Clock, AlertCircle, Eye, Trash2, Calendar, MapPin } from 'lucide-react';
import { eventApi } from '@/lib/api';
import { useRouter } from 'next/navigation';

interface PendingEvent {
  id: number;
  name: string;
  organizer: string;
  submitter_name?: string;
  submitter_email?: string;
  status: string;
  created_at: string;
  is_organizer: boolean;
  description?: string;
  focus_areas?: string[];
  event_type?: string;
  format?: string;
  start_date?: string;
  end_date?: string;
  location?: string;
  expected_attendance?: number;
}

export default function PendingEvents() {
  const [events, setEvents] = useState<PendingEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetchPendingEvents();
  }, []);

  const fetchPendingEvents = async () => {
    try {
      const data = await eventApi.getPending();
      setEvents(data.events || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const approveEvent = async (eventId: number) => {
    if (!confirm('Are you sure you want to approve this event?')) {
      return;
    }

    try {
      await eventApi.approve(eventId.toString());
      
      // Refresh the list
      await fetchPendingEvents();
      alert('Event approved successfully!');
    } catch (err: any) {
      alert(`Error approving event: ${err.message}`);
    }
  };

  const deleteEvent = async (eventId: number, eventName: string) => {
    if (!confirm(`Are you sure you want to permanently delete "${eventName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await eventApi.delete(eventId.toString());
      
      // Refresh the list
      await fetchPendingEvents();
      alert('Event deleted successfully!');
    } catch (err: any) {
      alert(`Error deleting event: ${err.message}`);
    }
  };

  const viewEvent = (eventId: number) => {
    router.push(`/admindashboard/events/${eventId}`);
  };

  const getSubmitterInfo = (event: PendingEvent) => {
    if (event.is_organizer) {
      return <span className="text-xs text-green-600">Submitted by Organizer</span>;
    }
    return <span className="text-xs text-gray-600">Submitted by: {event.submitter_name || 'Unknown'}</span>;
  };

  const getEventTypeBadge = (type?: string) => {
    if (!type) return null;
    const labels: Record<string, string> = {
      conference: 'Conference',
      workshop: 'Workshop',
      seminar: 'Seminar',
      webinar: 'Webinar',
      networking: 'Networking',
      training: 'Training',
      summit: 'Summit',
      retreat: 'Retreat',
      other: 'Other'
    };
    return (
      <Badge variant="outline" className="text-xs">
        {labels[type] || type}
      </Badge>
    );
  };

  const getFormatBadge = (format?: string) => {
    if (!format) return null;
    const labels: Record<string, string> = {
      in_person: 'In-Person',
      virtual: 'Virtual',
      hybrid: 'Hybrid'
    };
    const colors: Record<string, string> = {
      in_person: 'bg-green-100 text-green-800',
      virtual: 'bg-blue-100 text-blue-800',
      hybrid: 'bg-purple-100 text-purple-800'
    };
    return (
      <Badge className={`text-xs ${colors[format] || 'bg-gray-100 text-gray-800'}`}>
        {labels[format] || format}
      </Badge>
    );
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Pending Events
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">Loading pending events...</div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Pending Events
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-red-600">Error loading events: {error}</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Pending Events
          {events.length > 0 && (
            <Badge className="ml-2">{events.length}</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No pending events at this time
          </div>
        ) : (
          <div className="space-y-4">
            {events.map((event) => (
              <div
                key={event.id}
                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-power100-black">
                        {event.name}
                      </h3>
                      <Badge className="bg-blue-100 text-blue-800">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        Pending Review
                      </Badge>
                      {getEventTypeBadge(event.event_type)}
                      {getFormatBadge(event.format)}
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-1">
                      Organized by {event.organizer}
                    </p>
                    
                    {getSubmitterInfo(event)}
                    
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                      {event.start_date && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate(event.start_date)}
                          {event.end_date && event.end_date !== event.start_date && ` - ${formatDate(event.end_date)}`}
                        </span>
                      )}
                      {event.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {event.location}
                        </span>
                      )}
                      {event.expected_attendance && (
                        <span>{event.expected_attendance} attendees expected</span>
                      )}
                    </div>
                    
                    {event.description && (
                      <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                        {event.description}
                      </p>
                    )}
                    
                    {event.focus_areas && event.focus_areas.length > 0 && (
                      <div className="flex gap-1 mt-2 flex-wrap">
                        {event.focus_areas.slice(0, 3).map((area) => (
                          <Badge key={area} variant="secondary" className="text-xs">
                            {area.replace(/_/g, ' ')}
                          </Badge>
                        ))}
                        {event.focus_areas.length > 3 && (
                          <Badge variant="secondary" className="text-xs">
                            +{event.focus_areas.length - 3} more
                          </Badge>
                        )}
                      </div>
                    )}
                    
                    <p className="text-xs text-gray-500 mt-2">
                      Submitted: {new Date(event.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  
                  <div className="flex gap-2 ml-4">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => viewEvent(event.id)}
                      className="flex items-center gap-1"
                    >
                      <Eye className="h-4 w-4" />
                      View
                    </Button>
                    <Button
                      size="sm"
                      className="bg-power100-green hover:bg-green-700 text-white flex items-center gap-1"
                      onClick={() => approveEvent(event.id)}
                    >
                      <CheckCircle className="h-4 w-4" />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => deleteEvent(event.id, event.name)}
                      className="flex items-center gap-1"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}