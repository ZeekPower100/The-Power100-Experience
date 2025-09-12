'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Eye,
  ArrowLeft,
  MapPin,
  Users
} from 'lucide-react';
import EventForm from '@/components/admin/EventForm';
import { Event } from '@/lib/types/event';

export default function EventsPage() {
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | undefined>(undefined);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      // Get the auth token from localStorage (use authToken or adminToken)
      const token = localStorage.getItem('authToken') || localStorage.getItem('adminToken');
      
      const response = await fetch('/api/events', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Fetched events data:', data);
        if (data.length > 0) {
          console.log('First event date fields:', {
            date: data[0].date,
            end_date: data[0].end_date,
            registration_deadline: data[0].registration_deadline
          });
        }
        setEvents(data);
      } else {
        console.error('Failed to fetch events:', response.status);
      }
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this event?')) return;

    try {
      const token = localStorage.getItem('authToken') || localStorage.getItem('adminToken');
      
      const response = await fetch(`/api/events/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        await fetchEvents();
      }
    } catch (error) {
      console.error('Error deleting event:', error);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'TBD';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const filteredEvents = events.filter(event => 
    event.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    event.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    event.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (showForm) {
    return (
      <EventForm
        event={selectedEvent}
        onSuccess={() => {
          setShowForm(false);
          setSelectedEvent(undefined);
          fetchEvents();
        }}
        onCancel={() => {
          setShowForm(false);
          setSelectedEvent(undefined);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-power100-bg-grey p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => router.push('/admindashboard')}
              className="hover:bg-white"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
            <h1 className="text-3xl font-bold text-power100-black">Events Management</h1>
          </div>
          <Button
            onClick={() => setShowForm(true)}
            className="bg-power100-green hover:bg-green-600 text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add New Event
          </Button>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              type="text"
              placeholder="Search events by name, location, or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-white"
            />
          </div>
        </div>

        {/* Events Grid */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-power100-green"></div>
            <p className="mt-4 text-power100-grey">Loading events...</p>
          </div>
        ) : filteredEvents.length === 0 ? (
          <Card className="bg-white">
            <CardContent className="text-center py-12">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-4">
                {searchTerm ? 'No events found matching your search.' : 'No events added yet.'}
              </p>
              <Button
                onClick={() => setShowForm(true)}
                className="bg-power100-green hover:bg-green-600 text-white"
              >
                Add First Event
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEvents.map(event => (
              <Card key={event.id} className="bg-white hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <CardTitle className="text-lg line-clamp-2">{event.name || 'Untitled Event'}</CardTitle>
                      <div className="flex items-center gap-2 mt-2">
                        <Calendar className="h-3 w-3 text-power100-grey" />
                        <p className="text-sm text-power100-grey">{formatDate(event.date || '')}</p>
                      </div>
                    </div>
                    <Badge 
                      variant={
                        event.status === 'draft' 
                          ? 'outline' 
                          : event.is_active 
                            ? 'default' 
                            : 'secondary'
                      }
                    >
                      {event.status === 'draft' 
                        ? 'Draft' 
                        : event.is_active 
                          ? 'Active' 
                          : 'Inactive'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 mb-4">
                    {event.location && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-3 w-3 text-power100-grey" />
                        <p className="text-sm text-gray-600">{event.location}</p>
                      </div>
                    )}
                    {event.expected_attendance && (
                      <div className="flex items-center gap-2">
                        <Users className="h-3 w-3 text-power100-grey" />
                        <p className="text-sm text-gray-600">{event.expected_attendance} attendees</p>
                      </div>
                    )}
                    {event.format && (
                      <Badge variant="outline" className="text-xs">
                        {event.format}
                      </Badge>
                    )}
                  </div>

                  {event.description && (
                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">{event.description}</p>
                  )}
                  
                  {event.focus_areas_covered && (
                    <div className="mb-4">
                      <p className="text-xs font-semibold text-gray-700 mb-2">Focus Areas:</p>
                      <div className="flex flex-wrap gap-1">
                        {event.focus_areas_covered.split(',').slice(0, 3).map((area, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {area.trim()}
                          </Badge>
                        ))}
                        {event.focus_areas_covered.split(',').length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{event.focus_areas_covered.split(',').length - 3} more
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex justify-between items-center pt-4 border-t">
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedEvent(event);
                          setShowForm(true);
                        }}
                      >
                        <Edit className="h-3 w-3 mr-1" />
                        Edit
                      </Button>
                      {event.website && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.open(event.website, '_blank')}
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          View
                        </Button>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => event.id && handleDelete(event.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-3 w-3" />
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