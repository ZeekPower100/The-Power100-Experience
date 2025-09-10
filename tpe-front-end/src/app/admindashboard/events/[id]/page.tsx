'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import EventForm from '@/components/admin/EventForm';
import { Calendar, ArrowLeft, Edit, MapPin, Users, DollarSign } from 'lucide-react';
import { eventApi } from '@/lib/api';

export default function EventDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    if (params.id) {
      fetchEvent();
    }
  }, [params.id]);

  const fetchEvent = async () => {
    try {
      const data = await eventApi.get(params.id as string);
      setEvent(data);
    } catch (error) {
      console.error('Error fetching event:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = () => {
    fetchEvent();
    setEditMode(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-power100-bg-grey p-8">
        <div className="max-w-7xl mx-auto">
          <p>Loading event details...</p>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-power100-bg-grey p-8">
        <div className="max-w-7xl mx-auto">
          <p>Event not found</p>
          <Button onClick={() => router.back()} className="mt-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  if (editMode) {
    return (
      <div className="min-h-screen bg-power100-bg-grey p-8">
        <div className="max-w-7xl mx-auto">
          <EventForm 
            event={event} 
            onSuccess={handleUpdate}
            onCancel={() => setEditMode(false)}
          />
        </div>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', { 
      month: 'long', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  return (
    <div className="min-h-screen bg-power100-bg-grey p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <Button onClick={() => router.back()} variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <Button onClick={() => setEditMode(true)} className="bg-power100-green">
            <Edit className="mr-2 h-4 w-4" />
            Edit Event
          </Button>
        </div>

        {/* Main Info Card */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                {event.event_image_url && (
                  <img src={event.event_image_url} alt={event.name} className="w-24 h-24 object-cover rounded" />
                )}
                <div>
                  <CardTitle className="text-2xl">{event.name || event.title}</CardTitle>
                  <p className="text-gray-600">Organized by {event.organizer}</p>
                  <div className="flex gap-2 mt-2">
                    <Badge className={event.status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                      {event.status || 'pending_review'}
                    </Badge>
                    {event.event_type && (
                      <Badge variant="outline">{event.event_type.replace(/_/g, ' ')}</Badge>
                    )}
                    {event.format && (
                      <Badge variant="secondary">{event.format.replace(/_/g, ' ')}</Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {event.description && (
              <div>
                <h3 className="font-semibold mb-2">Description</h3>
                <p className="text-gray-600">{event.description}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              {(event.start_date || event.date) && (
                <div>
                  <h3 className="font-semibold mb-1 flex items-center gap-1">
                    <Calendar className="h-4 w-4" /> Date
                  </h3>
                  <p className="text-gray-600">
                    {formatDate(event.start_date || event.date)}
                    {event.end_date && event.end_date !== event.start_date && ` - ${formatDate(event.end_date)}`}
                  </p>
                </div>
              )}
              {event.location && (
                <div>
                  <h3 className="font-semibold mb-1 flex items-center gap-1">
                    <MapPin className="h-4 w-4" /> Location
                  </h3>
                  <p className="text-gray-600">{event.location}</p>
                </div>
              )}
              {event.expected_attendance > 0 && (
                <div>
                  <h3 className="font-semibold mb-1 flex items-center gap-1">
                    <Users className="h-4 w-4" /> Expected Attendance
                  </h3>
                  <p className="text-gray-600">{event.expected_attendance}</p>
                </div>
              )}
              {event.price_range && (
                <div>
                  <h3 className="font-semibold mb-1 flex items-center gap-1">
                    <DollarSign className="h-4 w-4" /> Price
                  </h3>
                  <p className="text-gray-600">{event.price_range}</p>
                </div>
              )}
            </div>

            {/* Links */}
            <div className="space-y-2">
              {event.website_url && (
                <div>
                  <a href={event.website_url} target="_blank" rel="noopener noreferrer" className="text-power100-red hover:underline">
                    Event Website
                  </a>
                </div>
              )}
              {event.registration_url && (
                <div>
                  <a href={event.registration_url} target="_blank" rel="noopener noreferrer" className="text-power100-green hover:underline">
                    Registration Link
                  </a>
                </div>
              )}
            </div>

            {event.focus_areas && (() => {
              let areas = [];
              try {
                areas = Array.isArray(event.focus_areas) ? event.focus_areas : 
                        typeof event.focus_areas === 'string' ? JSON.parse(event.focus_areas) : [];
              } catch (e) {
                areas = [];
              }
              return areas.length > 0 ? (
                <div>
                  <h3 className="font-semibold mb-2">Focus Areas</h3>
                  <div className="flex flex-wrap gap-2">
                    {areas.map((area: string) => (
                      <Badge key={area} variant="secondary">
                        {area.replace(/_/g, ' ')}
                      </Badge>
                    ))}
                  </div>
                </div>
              ) : null;
            })()}

            {event.speakers && (() => {
              let speakers = [];
              try {
                speakers = Array.isArray(event.speakers) ? event.speakers : 
                           typeof event.speakers === 'string' ? JSON.parse(event.speakers) : [];
              } catch (e) {
                speakers = [];
              }
              return speakers.length > 0 ? (
                <div>
                  <h3 className="font-semibold mb-2">Speakers</h3>
                  <ul className="list-disc list-inside text-gray-600">
                    {speakers.map((speaker: string, index: number) => (
                      <li key={index}>{speaker}</li>
                    ))}
                  </ul>
                </div>
              ) : null;
            })()}
          </CardContent>
        </Card>

        {/* Submitter Info Card */}
        {event.submitter_name && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Submitter Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p><strong>Name:</strong> {event.submitter_name}</p>
              <p><strong>Email:</strong> {event.submitter_email}</p>
              {event.submitter_phone && <p><strong>Phone:</strong> {event.submitter_phone}</p>}
              {event.submitter_company && <p><strong>Company:</strong> {event.submitter_company}</p>}
              <p><strong>Is Organizer:</strong> {event.is_organizer ? 'Yes' : 'No'}</p>
              {event.created_at && (
                <p><strong>Submitted:</strong> {new Date(event.created_at).toLocaleDateString()}</p>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}