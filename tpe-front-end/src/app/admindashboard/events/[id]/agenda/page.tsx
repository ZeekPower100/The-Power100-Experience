'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  ArrowLeft, Plus, Trash2, Edit, Save, Clock, MapPin,
  Users, Calendar, CheckCircle, AlertCircle, Copy
} from 'lucide-react';
import { getFromStorage, handleApiResponse, safeJsonStringify } from '../../../../../utils/jsonHelpers';

interface AgendaItem {
  id?: number;
  event_id: number;
  start_time: string;
  end_time?: string;
  item_type: string;
  title: string;
  synopsis?: string;
  key_takeaways?: string[];
  speaker_id?: number;
  sponsor_id?: number;
  description?: string;
  location?: string;
  track?: string;
  capacity?: number;
  focus_areas?: string[];
  target_audience?: string[];
  skill_level?: string;
  is_mandatory?: boolean;
  requires_registration?: boolean;
  status?: string;
  speaker_confirmed?: boolean;
  speaker_name?: string;
}

export default function EventAgendaPage() {
  const params = useParams();
  const router = useRouter();
  const [event, setEvent] = useState<any>(null);
  const [agendaItems, setAgendaItems] = useState<AgendaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingItem, setEditingItem] = useState<AgendaItem | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [speakers, setSpeakers] = useState<any[]>([]);
  const [sponsors, setSponsors] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [eventDates, setEventDates] = useState<string[]>([]);
  const [isMultiDay, setIsMultiDay] = useState(false);
  const [canGoBack, setCanGoBack] = useState(false);

  // Form state for new/edit item (using exact DB field names)
  const [formData, setFormData] = useState<AgendaItem>({
    event_id: Number(params.id),
    start_time: '',
    end_time: '',
    item_type: 'session',
    title: '',
    synopsis: '',
    location: '',
    speaker_id: undefined,
    status: 'tentative'
  });

  // Helper function to generate date range between two dates
  const generateDateRange = (startDate: string, endDate: string): string[] => {
    const dates: string[] = [];
    const start = new Date(startDate);
    const end = new Date(endDate);

    for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
      dates.push(date.toISOString().split('T')[0]);
    }

    return dates;
  };

  // Helper function to format date for display
  const formatDateForDisplay = (dateString: string): string => {
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  useEffect(() => {
    if (params.id) {
      fetchAgenda();
      fetchSpeakers();
      fetchSponsors();
    }
    // Check if we have browser history to go back to
    setCanGoBack(window.history.length > 1);
  }, [params.id]);

  const fetchAgenda = async () => {
    try {
      const token = getFromStorage('authToken') || getFromStorage('adminToken');
      const response = await fetch(`/api/event-agenda/event/${params.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await handleApiResponse(response);
        setEvent(data.event);
        setAgendaItems(data.agenda_items || []);

        // Set up event dates
        if (data.event?.date) {
          if (data.event?.end_date) {
            // Multi-day event
            setIsMultiDay(true);
            const dates = generateDateRange(data.event.date, data.event.end_date);
            setEventDates(dates);
            setSelectedDate(dates[0]); // Default to first day
          } else {
            // Single day event
            setIsMultiDay(false);
            setEventDates([data.event.date]);
            setSelectedDate(data.event.date);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching agenda:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSpeakers = async () => {
    try {
      const token = getFromStorage('authToken') || getFromStorage('adminToken');
      const response = await fetch(`/api/events/${params.id}/speakers`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await handleApiResponse(response);
        setSpeakers(data);
      }
    } catch (error) {
      console.error('Error fetching speakers:', error);
    }
  };

  const fetchSponsors = async () => {
    try {
      const token = getFromStorage('authToken') || getFromStorage('adminToken');
      const response = await fetch(`/api/events/${params.id}/sponsors`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await handleApiResponse(response);
        setSponsors(data);
      }
    } catch (error) {
      console.error('Error fetching sponsors:', error);
    }
  };

  const handleSaveItem = async () => {
    try {
      const token = getFromStorage('authToken') || getFromStorage('adminToken');

      const endpoint = editingItem?.id
        ? `/api/event-agenda/item/${editingItem.id}`
        : '/api/event-agenda/item';

      const method = editingItem?.id ? 'PUT' : 'POST';

      const response = await fetch(endpoint, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: safeJsonStringify(formData)
      });

      if (response.ok) {
        await fetchAgenda();
        setEditingItem(null);
        setIsCreating(false);
        resetForm();
      }
    } catch (error) {
      console.error('Error saving agenda item:', error);
    }
  };

  const handleDeleteItem = async (id: number) => {
    if (!confirm('Are you sure you want to delete this agenda item?')) return;

    try {
      const token = getFromStorage('authToken') || getFromStorage('adminToken');
      const response = await fetch(`/api/event-agenda/item/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        await fetchAgenda();
      }
    } catch (error) {
      console.error('Error deleting agenda item:', error);
    }
  };

  const handleConfirmAgenda = async () => {
    if (!confirm('Confirm the entire agenda? This marks it as final.')) return;

    try {
      const token = getFromStorage('authToken') || getFromStorage('adminToken');
      const response = await fetch(`/api/event-agenda/confirm/${params.id}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        await fetchAgenda();
        alert('Agenda confirmed successfully!');
      }
    } catch (error) {
      console.error('Error confirming agenda:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      event_id: Number(params.id),
      start_time: '',
      end_time: '',
      item_type: 'session',
      title: '',
      synopsis: '',
      location: '',
      speaker_id: undefined,
      status: 'tentative'
    });
    // Reset to first date if multi-day
    if (eventDates.length > 0) {
      setSelectedDate(eventDates[0]);
    }
  };

  // Helper function to combine date and time
  const combineDateTime = (date: string, time: string): string => {
    if (!date || !time) return '';
    return `${date}T${time}:00`;
  };

  // Helper function to extract time from datetime
  const extractTime = (datetime: string): string => {
    if (!datetime) return '';
    const time = datetime.split('T')[1];
    return time ? time.substring(0, 5) : '';
  };

  // Helper function to extract date from datetime
  const extractDate = (datetime: string): string => {
    if (!datetime) return '';
    return datetime.split('T')[0];
  };

  const formatTime = (timestamp: string) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (timestamp: string) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toISOString().slice(0, 16); // Format for datetime-local input
  };

  const getItemTypeColor = (type: string) => {
    const colors: any = {
      'keynote': 'bg-purple-100 text-purple-800',
      'session': 'bg-blue-100 text-blue-800',
      'panel': 'bg-green-100 text-green-800',
      'break': 'bg-yellow-100 text-yellow-800',
      'lunch': 'bg-orange-100 text-orange-800',
      'networking': 'bg-pink-100 text-pink-800',
      'registration': 'bg-gray-100 text-gray-800',
      'closing': 'bg-red-100 text-red-800'
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  const getStatusBadge = (status: string) => {
    if (status === 'confirmed') {
      return <Badge className="bg-green-100 text-green-800">Confirmed</Badge>;
    } else if (status === 'tentative') {
      return <Badge className="bg-yellow-100 text-yellow-800">Tentative</Badge>;
    } else if (status === 'cancelled') {
      return <Badge className="bg-red-100 text-red-800">Cancelled</Badge>;
    }
    return <Badge>{status}</Badge>;
  };

  const handleBack = () => {
    // If we have history and it seems like we came from within the app, use browser back
    if (canGoBack && document.referrer && document.referrer.includes(window.location.host)) {
      router.back();
    } else {
      // Otherwise, go to the logical parent (event details)
      router.push(`/admindashboard/events/${params.id}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-power100-bg-grey p-8">
        <div className="max-w-7xl mx-auto">
          <p>Loading agenda...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-power100-bg-grey p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <Button
              onClick={handleBack}
              variant="outline"
              className="mb-4"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <h1 className="text-3xl font-bold">{event?.name} - Agenda Management</h1>
            <div className="text-gray-600 flex items-center gap-2">
              <span>Agenda Status:</span>
              <Badge>{event?.agenda_status || 'not_started'}</Badge>
            </div>
          </div>

          <div className="space-x-2">
            <Button
              onClick={() => setIsCreating(true)}
              className="bg-power100-green hover:bg-green-600 text-white"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Item
            </Button>
            {agendaItems.length > 0 && event?.agenda_status !== 'confirmed' && (
              <Button
                onClick={handleConfirmAgenda}
                className="bg-power100-red hover:bg-red-700 text-white"
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                Confirm Agenda
              </Button>
            )}
          </div>
        </div>

        {/* Alert for timing */}
        <Alert className="border-blue-200 bg-blue-50">
          <AlertCircle className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            <strong>Recommended Timeline:</strong> Add agenda 2 weeks before event, confirm 2 days before.
            The AI Orchestrator will use this agenda to schedule personalized messages for attendees.
          </AlertDescription>
        </Alert>

        {/* Create/Edit Form */}
        {(isCreating || editingItem) && (
          <Card>
            <CardHeader>
              <CardTitle>{editingItem ? 'Edit Agenda Item' : 'Add New Agenda Item'}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Date selection for multi-day events */}
              {isMultiDay && (
                <div>
                  <Label>Date*</Label>
                  <div className="flex gap-2 mt-2">
                    {eventDates.map((date) => (
                      <Button
                        key={date}
                        type="button"
                        variant={selectedDate === date ? 'default' : 'outline'}
                        onClick={() => setSelectedDate(date)}
                        className={
                          selectedDate === date
                            ? 'bg-power100-green hover:bg-green-600 text-white'
                            : 'bg-white hover:bg-gray-50'
                        }
                      >
                        {formatDateForDisplay(date)}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {/* Time selection */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="start_time">Start Time*</Label>
                  <Input
                    id="start_time"
                    type="time"
                    value={extractTime(formData.start_time)}
                    onChange={(e) => {
                      const datetime = combineDateTime(selectedDate, e.target.value);
                      setFormData({...formData, start_time: datetime});
                    }}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="end_time">End Time</Label>
                  <Input
                    id="end_time"
                    type="time"
                    value={extractTime(formData.end_time)}
                    onChange={(e) => {
                      const datetime = combineDateTime(selectedDate, e.target.value);
                      setFormData({...formData, end_time: datetime});
                    }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="item_type">Type*</Label>
                  <Select value={formData.item_type} onValueChange={(value) => setFormData({...formData, item_type: value})}>
                    <SelectTrigger className="bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      <SelectItem value="registration">Registration</SelectItem>
                      <SelectItem value="keynote">Keynote</SelectItem>
                      <SelectItem value="session">Session</SelectItem>
                      <SelectItem value="panel">Panel</SelectItem>
                      <SelectItem value="break">Break</SelectItem>
                      <SelectItem value="networking">Networking</SelectItem>
                      <SelectItem value="lunch">Lunch</SelectItem>
                      <SelectItem value="closing">Closing</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => setFormData({...formData, location: e.target.value})}
                    placeholder="Main Stage, Room A, etc."
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="title">Title*</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  placeholder="Session title"
                  required
                />
              </div>

              <div>
                <Label htmlFor="synopsis">Synopsis/Description</Label>
                <Textarea
                  id="synopsis"
                  value={formData.synopsis}
                  onChange={(e) => setFormData({...formData, synopsis: e.target.value})}
                  placeholder="Detailed description of the session..."
                  className="min-h-[100px]"
                />
              </div>

              {(formData.item_type === 'session' || formData.item_type === 'keynote' || formData.item_type === 'panel') && (
                <div>
                  <Label htmlFor="speaker_id">Speaker (Optional)</Label>
                  <Select
                    value={formData.speaker_id?.toString() || 'none'}
                    onValueChange={(value) => setFormData({...formData, speaker_id: value === 'none' ? undefined : parseInt(value)})}
                  >
                    <SelectTrigger className="bg-white">
                      <SelectValue placeholder="Select a speaker (if known)" />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      <SelectItem value="none">No Speaker / TBD</SelectItem>
                      {speakers.map(speaker => (
                        <SelectItem key={speaker.id} value={speaker.id.toString()}>
                          {speaker.name} - {speaker.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsCreating(false);
                    setEditingItem(null);
                    resetForm();
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveItem}
                  className="bg-power100-green hover:bg-green-600 text-white"
                >
                  <Save className="mr-2 h-4 w-4" />
                  Save Item
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Agenda Timeline */}
        <Card>
          <CardHeader>
            <CardTitle>Event Agenda</CardTitle>
            {agendaItems.length === 0 && (
              <p className="text-gray-500">No agenda items yet. Click "Add Item" to start building the agenda.</p>
            )}
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {agendaItems.map((item) => (
                <div key={item.id} className="border rounded-lg p-4 hover:bg-gray-50 transition">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Clock className="h-4 w-4 text-gray-500" />
                        <span className="font-semibold">
                          {formatTime(item.start_time)}
                          {item.end_time && ` - ${formatTime(item.end_time)}`}
                        </span>
                        <Badge className={getItemTypeColor(item.item_type)}>
                          {item.item_type}
                        </Badge>
                        {item.status && getStatusBadge(item.status)}
                      </div>

                      <h3 className="text-lg font-semibold mb-1">{item.title}</h3>

                      {item.synopsis && (
                        <p className="text-gray-600 text-sm mb-2">{item.synopsis}</p>
                      )}

                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        {item.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {item.location}
                          </span>
                        )}
                        {item.speaker_name && (
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {item.speaker_name}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2 ml-4">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditingItem(item);
                          // Set the date from the item's start_time
                          if (item.start_time) {
                            const itemDate = extractDate(item.start_time);
                            setSelectedDate(itemDate);
                          }
                          setFormData(item);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeleteItem(item.id!)}
                        className="text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}