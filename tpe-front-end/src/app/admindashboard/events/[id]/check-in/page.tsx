'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, UserPlus, QrCode, Users, MessageSquare, Send, Clock, AlertCircle, Megaphone, Handshake, UserCheck } from 'lucide-react';
import { eventApi } from '@/lib/api';
import { getFromStorage, handleApiResponse } from '../../../../../utils/jsonHelpers';

interface Attendee {
  id: number;
  event_id: number;
  contractor_id: number;
  contractor_name: string;
  company_name: string;
  contractor_email: string;
  contractor_phone: string;
  registration_date: string;
  check_in_time: string | null;
  check_in_method: string | null;
  profile_completion_status: string;
  sms_opt_in: boolean;
  real_email: string | null;
  real_phone: string | null;
  qr_code_data: string;
}

export default function EventCheckInPage() {
  const params = useParams();
  const router = useRouter();
  const [event, setEvent] = useState<any>(null);
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  // Check-in form state
  const [contractorId, setContractorId] = useState('');
  const [qrCode, setQrCode] = useState('');
  const [checkInLoading, setCheckInLoading] = useState(false);

  // Event Orchestrator state - aligned with database fields
  const [speakers, setSpeakers] = useState<any[]>([]);
  const [sponsors, setSponsors] = useState<any[]>([]);
  const [selectedSpeakerId, setSelectedSpeakerId] = useState('');
  const [selectedSponsorId, setSelectedSponsorId] = useState('');
  const [message_template, setMessageTemplate] = useState('');
  const [target_audience, setTargetAudience] = useState('all');
  const [orchestratorLoading, setOrchestratorLoading] = useState(false);

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    checkedIn: 0,
    pending: 0,
    profilesComplete: 0
  });

  useEffect(() => {
    if (params.id) {
      fetchEventData();
      fetchEventOrchestrationData();
    }
  }, [params.id]);

  const fetchEventData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch event details
      const eventData = await eventApi.get(params.id as string);
      setEvent(eventData);

      // Fetch attendees for this event
      await fetchAttendees();

    } catch (error) {
      console.error('Error fetching event data:', error);
      setError('Failed to load event data');
    } finally {
      setLoading(false);
    }
  };

  const fetchAttendees = async () => {
    try {
      const token = getFromStorage('authToken') || getFromStorage('adminToken');
      const response = await fetch(`/api/event-check-in/event/${params.id}/attendees`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await handleApiResponse(response);
        setAttendees(data.attendees || []);

        // Calculate stats
        const checkedIn = data.attendees.filter((a: Attendee) => a.check_in_time).length;
        const profilesComplete = data.attendees.filter((a: Attendee) =>
          a.profile_completion_status === 'complete'
        ).length;

        setStats({
          total: data.attendees.length,
          checkedIn,
          pending: data.attendees.length - checkedIn,
          profilesComplete
        });
      }
    } catch (error) {
      console.error('Error fetching attendees:', error);
    }
  };

  const handleRegisterAttendee = async () => {
    if (!contractorId) {
      setError('Please enter a contractor ID');
      return;
    }

    setCheckInLoading(true);
    setError(null);

    try {
      const token = getFromStorage('authToken') || getFromStorage('adminToken');
      const response = await fetch('/api/event-check-in/register', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          event_id: params.id,
          contractor_id: parseInt(contractorId),
          pre_filled_data: {}
        })
      });

      if (response.ok) {
        await fetchAttendees();
        setContractorId('');
        setError(null);
      } else {
        const errorData = await handleApiResponse(response);
        setError(errorData.error || 'Failed to register attendee');
      }
    } catch (error) {
      setError('Failed to register attendee');
    } finally {
      setCheckInLoading(false);
    }
  };

  const handleCheckIn = async (attendeeId?: number, qrCodeData?: string) => {
    setCheckInLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/event-check-in/check-in', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          event_id: params.id,
          ...(attendeeId ? { contractor_id: attendeeId } : {}),
          ...(qrCodeData ? { qr_code_data: qrCodeData } : { qr_code_data: qrCode }),
          check_in_method: qrCodeData ? 'manual' : 'qr_code'
        })
      });

      if (response.ok) {
        await fetchAttendees();
        setQrCode('');
        setError(null);
      } else {
        const errorData = await handleApiResponse(response);
        setError(errorData.error || 'Failed to check in attendee');
      }
    } catch (error) {
      setError('Failed to check in attendee');
    } finally {
      setCheckInLoading(false);
    }
  };

  const handleMassCheckIn = async () => {
    if (!confirm('This will check in ALL registered attendees. Continue?')) {
      return;
    }

    setCheckInLoading(true);
    setError(null);

    try {
      const token = getFromStorage('authToken') || getFromStorage('adminToken');
      const response = await fetch('/api/event-check-in/mass-check-in', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          event_id: params.id
        })
      });

      if (response.ok) {
        const data = await handleApiResponse(response);
        await fetchAttendees();
        setError(null);
        alert(`Successfully checked in ${data.checked_in_count} attendees`);
      } else {
        setError('Failed to perform mass check-in');
      }
    } catch (error) {
      setError('Failed to perform mass check-in');
    } finally {
      setCheckInLoading(false);
    }
  };

  // Event Orchestrator Functions
  const fetchEventOrchestrationData = async () => {
    try {
      const token = getFromStorage('authToken') || getFromStorage('adminToken');

      // Fetch speakers
      const speakersResponse = await fetch(`/api/events/${params.id}/speakers`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (speakersResponse.ok) {
        const speakersData = await handleApiResponse(speakersResponse);
        setSpeakers(speakersData);
      }

      // Fetch sponsors
      const sponsorsResponse = await fetch(`/api/events/${params.id}/sponsors`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (sponsorsResponse.ok) {
        const sponsorsData = await handleApiResponse(sponsorsResponse);
        setSponsors(sponsorsData);
      }
    } catch (error) {
      console.error('Error fetching orchestration data:', error);
    }
  };

  const handleSendSpeakerAlert = async () => {
    if (!selectedSpeakerId || !message_template) {
      setError('Please select a speaker and enter a message');
      return;
    }

    setOrchestratorLoading(true);
    setError(null);

    try {
      const token = getFromStorage('authToken') || getFromStorage('adminToken');
      const response = await fetch('/api/event-orchestrator/speaker-alert', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          event_id: parseInt(params.id as string),
          speaker_id: parseInt(selectedSpeakerId),
          message_template,
          target_audience
        })
      });

      if (response.ok) {
        const data = await handleApiResponse(response);
        alert(`Speaker alert sent to ${data.recipients_count} attendees!`);
        setMessageTemplate('');
        setSelectedSpeakerId('');
      } else {
        const errorData = await handleApiResponse(response);
        setError(errorData.error || 'Failed to send speaker alert');
      }
    } catch (error) {
      setError('Failed to send speaker alert');
    } finally {
      setOrchestratorLoading(false);
    }
  };

  const handleSendSponsorEngagement = async () => {
    if (!selectedSponsorId) {
      setError('Please select a sponsor');
      return;
    }

    setOrchestratorLoading(true);
    setError(null);

    try {
      const token = getFromStorage('authToken') || getFromStorage('adminToken');
      const response = await fetch('/api/event-orchestrator/sponsor-engagement', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          event_id: parseInt(params.id as string),
          sponsor_id: parseInt(selectedSponsorId),
          min_revenue: 500000,
          max_matches: 10
        })
      });

      if (response.ok) {
        const data = await handleApiResponse(response);
        alert(`Sponsor engagement messages sent to ${data.matched_contractors.length} contractors!`);
        setSelectedSponsorId('');
      } else {
        const errorData = await handleApiResponse(response);
        setError(errorData.error || 'Failed to send sponsor engagement');
      }
    } catch (error) {
      setError('Failed to send sponsor engagement');
    } finally {
      setOrchestratorLoading(false);
    }
  };

  const handleAutoMatchPeers = async () => {
    if (!confirm('This will analyze all attendees and create peer connections. Continue?')) {
      return;
    }

    setOrchestratorLoading(true);
    setError(null);

    try {
      const token = getFromStorage('authToken') || getFromStorage('adminToken');
      const response = await fetch('/api/event-orchestrator/auto-match-peers', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          event_id: parseInt(params.id as string),
          match_threshold: 70,
          max_matches_per_person: 3
        })
      });

      if (response.ok) {
        const data = await handleApiResponse(response);
        alert(`Created ${data.total_matches} peer connections!`);
      } else {
        const errorData = await handleApiResponse(response);
        setError(errorData.error || 'Failed to match peers');
      }
    } catch (error) {
      setError('Failed to match peers');
    } finally {
      setOrchestratorLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-power100-bg-grey p-8">
        <div className="max-w-7xl mx-auto">
          <p>Loading event check-in system...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-power100-bg-grey p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Button
              onClick={() => router.push(`/admindashboard/events/${params.id}`)}
              variant="outline"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Event
            </Button>
            <div>
              <h1 className="text-2xl font-bold">{event?.name}</h1>
              <p className="text-gray-600">Event Check-In Management</p>
            </div>
          </div>

          <Button
            onClick={handleMassCheckIn}
            disabled={checkInLoading || stats.total === 0}
            className="bg-power100-red hover:bg-red-700 text-white"
          >
            <Users className="mr-2 h-4 w-4" />
            Mass Check-In All
          </Button>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert className="border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-600">{error}</AlertDescription>
          </Alert>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-sm text-gray-600">Total Registered</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-green-600">{stats.checkedIn}</div>
              <p className="text-sm text-gray-600">Checked In</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
              <p className="text-sm text-gray-600">Pending Check-In</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-blue-600">{stats.profilesComplete}</div>
              <p className="text-sm text-gray-600">Profiles Complete</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="register">Register</TabsTrigger>
            <TabsTrigger value="checkin">Check-In</TabsTrigger>
            <TabsTrigger value="orchestrator">Orchestrator</TabsTrigger>
            <TabsTrigger value="messaging">Messaging</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Attendee List</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {attendees.length === 0 ? (
                    <p className="text-gray-500">No attendees registered yet</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left p-2">Name</th>
                            <th className="text-left p-2">Company</th>
                            <th className="text-left p-2">Email</th>
                            <th className="text-left p-2">Phone</th>
                            <th className="text-left p-2">Status</th>
                            <th className="text-left p-2">QR Code</th>
                            <th className="text-left p-2">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {attendees.map((attendee) => (
                            <tr key={attendee.id} className="border-b">
                              <td className="p-2">{attendee.contractor_name}</td>
                              <td className="p-2">{attendee.company_name}</td>
                              <td className="p-2">{attendee.contractor_email}</td>
                              <td className="p-2">{attendee.contractor_phone}</td>
                              <td className="p-2">
                                {attendee.check_in_time ? (
                                  <Badge className="bg-green-100 text-green-800">
                                    Checked In
                                  </Badge>
                                ) : (
                                  <Badge className="bg-yellow-100 text-yellow-800">
                                    Registered
                                  </Badge>
                                )}
                              </td>
                              <td className="p-2">
                                <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">
                                  {attendee.qr_code_data}
                                </code>
                              </td>
                              <td className="p-2">
                                {!attendee.check_in_time && (
                                  <Button
                                    size="sm"
                                    onClick={() => handleCheckIn(attendee.contractor_id, attendee.qr_code_data)}
                                    disabled={checkInLoading}
                                  >
                                    Check In
                                  </Button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="register" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Register New Attendee</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="contractorId">Contractor ID</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      id="contractorId"
                      type="number"
                      value={contractorId}
                      onChange={(e) => setContractorId(e.target.value)}
                      placeholder="Enter contractor ID"
                      className="flex-1"
                    />
                    <Button
                      onClick={handleRegisterAttendee}
                      disabled={checkInLoading || !contractorId}
                      className="bg-power100-green hover:bg-green-700 text-white text-shadow-soft"
                    >
                      <UserPlus className="mr-2 h-4 w-4" />
                      Register
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="checkin" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>QR Code Check-In</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="qrCode">QR Code</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      id="qrCode"
                      value={qrCode}
                      onChange={(e) => setQrCode(e.target.value)}
                      placeholder="Scan or enter QR code"
                      className="flex-1"
                    />
                    <Button
                      onClick={() => handleCheckIn()}
                      disabled={checkInLoading || !qrCode}
                      className="bg-power100-green hover:bg-green-700 text-white text-shadow-soft"
                    >
                      <QrCode className="mr-2 h-4 w-4" />
                      Check In
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="orchestrator" className="space-y-4">
            {/* AI Orchestration Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Megaphone className="h-5 w-5" />
                  🤖 AI Orchestration Monitor
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Alert className="border-green-200 bg-green-50">
                  <AlertCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    <strong>AI is running automatically!</strong> When attendees check in, the AI:
                    <ul className="list-disc pl-5 mt-2">
                      <li>Analyzes their profile and focus areas</li>
                      <li>Matches them with relevant speakers, sponsors, and peers</li>
                      <li>Schedules personalized SMS messages throughout the event</li>
                      <li>Learns from responses to improve future recommendations</li>
                    </ul>
                  </AlertDescription>
                </Alert>

                {/* Real-time Metrics */}
                <div className="grid grid-cols-3 gap-4 mt-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-600">
                      {attendees.filter(a => a.check_in_time).length}
                    </div>
                    <p className="text-sm text-gray-600">AI Activated</p>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-600">--</div>
                    <p className="text-sm text-gray-600">Messages Scheduled</p>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-purple-600">--</div>
                    <p className="text-sm text-gray-600">Messages Sent</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Message Queue Monitor */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Message Queue
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="text-sm text-gray-600">
                    AI-generated messages are automatically scheduled and sent via SMS:
                  </p>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2">
                      <Badge className="bg-blue-100 text-blue-800">Immediate</Badge>
                      Welcome message with personalized agenda
                    </li>
                    <li className="flex items-center gap-2">
                      <Badge className="bg-yellow-100 text-yellow-800">15 min before</Badge>
                      Speaker session alerts
                    </li>
                    <li className="flex items-center gap-2">
                      <Badge className="bg-green-100 text-green-800">30 min after</Badge>
                      Sponsor booth recommendations
                    </li>
                    <li className="flex items-center gap-2">
                      <Badge className="bg-purple-100 text-purple-800">45 min after</Badge>
                      Peer introductions
                    </li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* CEO Override Control */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5" />
                  Event Delay Override (CEO Only)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Use this if the event is running late. All scheduled messages will be delayed.
                  </AlertDescription>
                </Alert>

                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder="Delay in minutes"
                    className="w-40"
                    id="delay-minutes"
                  />
                  <Button
                    onClick={() => {
                      const delayMinutes = (document.getElementById('delay-minutes') as HTMLInputElement)?.value;
                      if (delayMinutes) {
                        fetch(`/api/event-scheduler/delay`, {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${getFromStorage('authToken') || getFromStorage('adminToken')}`
                          },
                          body: JSON.stringify({
                            event_id: params.id,
                            delay_minutes: parseInt(delayMinutes)
                          })
                        }).then(() => {
                          alert(`All messages delayed by ${delayMinutes} minutes`);
                        });
                      }
                    }}
                    className="bg-power100-red hover:bg-red-700 text-white"
                  >
                    Apply Delay
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="messaging" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Event Messaging</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Alert>
                    <MessageSquare className="h-4 w-4" />
                    <AlertDescription>
                      Messaging system integration with n8n/GHL coming soon.
                      Check-in triggers will automatically send welcome SMS.
                    </AlertDescription>
                  </Alert>

                  <div className="space-y-2">
                    <p className="font-semibold">Automated Messages:</p>
                    <ul className="list-disc pl-5 space-y-1 text-sm">
                      <li>Welcome SMS on check-in</li>
                      <li>Session reminders (15 min before)</li>
                      <li>Sponsor booth recommendations</li>
                      <li>Peer matching introductions</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}