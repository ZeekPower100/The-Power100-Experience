'use client';

import { useState, useEffect, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { CheckCircle, Calendar, MapPin, Clock, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

function EventCheckInPageContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const eventId = params.eventId as string;
  const contractorId = searchParams.get('contractor');

  const [loading, setLoading] = useState(true);
  const [checkingIn, setCheckingIn] = useState(false);
  const [event, setEvent] = useState<any>(null);
  const [contractor, setContractor] = useState<any>(null);
  const [attendee, setAttendee] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!contractorId) {
      setError('Contractor ID is required');
      setLoading(false);
      return;
    }
    loadData();
  }, [eventId, contractorId]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load event details
      const eventResponse = await fetch(`/api/events/${eventId}`);
      if (!eventResponse.ok) throw new Error('Failed to load event');
      const eventData = await eventResponse.json();
      setEvent(eventData);

      // Load contractor details
      const contractorResponse = await fetch(`/api/contractors/${contractorId}`);
      if (!contractorResponse.ok) throw new Error('Failed to load contractor');
      const contractorData = await contractorResponse.json();
      setContractor(contractorData.contractor || contractorData);

      // Load attendee record to check if already checked in
      const attendeeResponse = await fetch(`/api/event-check-in/attendee?eventId=${eventId}&contractorId=${contractorId}`);
      if (attendeeResponse.ok) {
        const attendeeData = await attendeeResponse.json();
        setAttendee(attendeeData.attendee);
      } else {
        // Not registered yet - need to register first
        setError('You are not registered for this event. Please contact the event organizer.');
      }

    } catch (error: any) {
      console.error('Error loading data:', error);
      setError(error.message || 'Failed to load event information');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async () => {
    try {
      setCheckingIn(true);
      setError(null);

      const response = await fetch('/api/event-check-in/check-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_id: parseInt(eventId),
          contractor_id: parseInt(contractorId!),
          check_in_method: 'self_service'
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Check-in failed');
      }

      const data = await response.json();

      // Success! Redirect to agenda
      // Profile is guaranteed to be complete at this point (checked above)
      router.push(`/events/${eventId}/agenda?contractor=${contractorId}`);

    } catch (error: any) {
      console.error('Check-in error:', error);
      setError(error.message || 'Failed to check in');
    } finally {
      setCheckingIn(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-power100-bg-grey flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-power100-red mx-auto mb-4"></div>
          <p className="text-gray-600">Loading event information...</p>
        </div>
      </div>
    );
  }

  if (error && !attendee) {
    return (
      <div className="min-h-screen bg-power100-bg-grey flex items-center justify-center">
        <Card className="max-w-md w-full mx-4 p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">⚠️</span>
          </div>
          <h2 className="text-2xl font-bold text-power100-black mb-3">Unable to Check In</h2>
          <p className="text-gray-600 mb-6">{error}</p>
        </Card>
      </div>
    );
  }

  // Already checked in
  if (attendee?.check_in_time) {
    const checkInDate = new Date(attendee.check_in_time);
    return (
      <div className="min-h-screen bg-power100-bg-grey flex items-center justify-center">
        <Card className="max-w-md w-full mx-4 p-8 text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200 }}
            className="w-20 h-20 bg-power100-green rounded-full flex items-center justify-center mx-auto mb-6"
          >
            <CheckCircle className="h-12 w-12 text-white" />
          </motion.div>
          <h2 className="text-2xl font-bold text-power100-black mb-3">
            You're Already Checked In!
          </h2>
          <p className="text-gray-600 mb-4">
            Checked in on {checkInDate.toLocaleDateString()} at {checkInDate.toLocaleTimeString()}
          </p>
          <div className="space-y-3">
            <Button
              onClick={() => router.push(`/events/${eventId}/agenda?contractor=${contractorId}`)}
              className="w-full bg-power100-green hover:bg-green-600 text-white font-semibold"
            >
              View Your Agenda
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // Profile not completed - block check-in
  if (attendee?.profile_completion_status !== 'completed') {
    return (
      <div className="min-h-screen bg-power100-bg-grey flex items-center justify-center">
        <Card className="max-w-md w-full mx-4 p-8 text-center">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">📋</span>
          </div>
          <h2 className="text-2xl font-bold text-power100-black mb-3">
            Profile Required
          </h2>
          <p className="text-gray-600 mb-6">
            Please complete your profile before checking in. This ensures you get personalized recommendations and the best event experience.
          </p>
          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6">
            <p className="text-blue-900 text-sm">
              💡 <strong>Why complete your profile?</strong><br />
              Our AI will create a personalized agenda with speaker recommendations, sponsor matches, and networking opportunities tailored just for you!
            </p>
          </div>
          <Button
            onClick={() => router.push(`/events/${eventId}/profile?contractor=${contractorId}`)}
            className="w-full bg-power100-green hover:bg-green-600 text-white font-semibold text-lg py-6"
          >
            Complete Profile Now
          </Button>
        </Card>
      </div>
    );
  }

  // Not checked in yet - show check-in button
  const eventDate = event?.date ? new Date(event.date) : null;

  return (
    <div className="min-h-screen bg-power100-bg-grey flex items-center justify-center">
      <div className="w-full max-w-2xl mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="bg-white rounded-2xl shadow-lg p-8">
            {/* Event Icon */}
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 bg-power100-red rounded-full flex items-center justify-center">
                <Calendar className="h-8 w-8 text-white" />
              </div>
            </div>

            {/* Event Info */}
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-power100-black mb-2">
                Check In to Event
              </h1>
              <p className="text-2xl text-power100-red font-semibold mb-4">
                {event?.name || 'Event'}
              </p>

              {/* Event Details */}
              <div className="space-y-2 text-gray-600">
                {eventDate && (
                  <div className="flex items-center justify-center gap-2">
                    <Clock className="h-4 w-4" />
                    <span>{eventDate.toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}</span>
                  </div>
                )}
                {event?.location && (
                  <div className="flex items-center justify-center gap-2">
                    <MapPin className="h-4 w-4" />
                    <span>{event.location}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Welcome Message */}
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6">
              <p className="text-blue-900">
                Welcome, <strong>{contractor?.first_name || contractor?.name}</strong>!
                Ready to check in and start your personalized event experience?
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
                <p className="text-red-900">{error}</p>
              </div>
            )}

            {/* Check-In Button */}
            <Button
              onClick={handleCheckIn}
              disabled={checkingIn}
              className="w-full bg-power100-green hover:bg-green-600 text-white font-semibold text-lg py-6"
            >
              {checkingIn ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Checking In...
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-5 w-5" />
                  Check In Now
                </>
              )}
            </Button>

            {/* Footer Note */}
            <p className="text-center text-sm text-gray-500 mt-6">
              After checking in, you'll be guided to complete your profile and view your personalized agenda.
            </p>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}

// Main page component with Suspense boundary
export default function EventCheckInPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-power100-bg-grey flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-power100-red mx-auto mb-4"></div>
          <p className="text-power100-grey">Loading...</p>
        </div>
      </div>
    }>
      <EventCheckInPageContent />
    </Suspense>
  );
}
