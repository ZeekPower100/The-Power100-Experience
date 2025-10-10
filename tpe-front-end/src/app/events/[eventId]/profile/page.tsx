'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, Building2 } from 'lucide-react';
import { Card } from '@/components/ui/card';

// Import contractor flow step components
import FocusSelectionStep from '@/components/contractor-flow/focusselectionstep';
import ProfilingStep from '@/components/contractor-flow/profilingstep';
import TechStackStep from '@/components/contractor-flow/techstackstep';

export default function EventProfileCompletionPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.eventId as string;

  const [loading, setLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState(1);
  const [event, setEvent] = useState<any>(null);
  const [contractor, setContractor] = useState<any>(null);
  const [attendee, setAttendee] = useState<any>(null);
  const [contractorId, setContractorId] = useState<string | null>(null);

  const steps = [
    { number: 1, title: "Focus Areas", component: FocusSelectionStep },
    { number: 2, title: "Business Profile", component: ProfilingStep },
    { number: 3, title: "Tech Stack", component: TechStackStep }
  ];

  useEffect(() => {
    loadData();
  }, [eventId]);

  const loadData = async () => {
    try {
      setLoading(true);

      const urlParams = new URLSearchParams(window.location.search);
      const id = urlParams.get('contractor');

      if (!id) {
        alert('Contractor ID is required');
        return;
      }

      setContractorId(id);

      // Load event details
      const eventResponse = await fetch(`/api/events/${eventId}`);
      if (eventResponse.ok) {
        const eventData = await eventResponse.json();
        setEvent(eventData);
      }

      // Load contractor details
      const contractorResponse = await fetch(`/api/contractors/${id}`);
      if (!contractorResponse.ok) throw new Error('Failed to load contractor');
      const contractorData = await contractorResponse.json();
      setContractor(contractorData.contractor || contractorData);

      // Load attendee record
      const attendeeResponse = await fetch(`/api/event-check-in/attendee?eventId=${eventId}&contractorId=${id}`);
      if (attendeeResponse.ok) {
        const attendeeData = await attendeeResponse.json();
        setAttendee(attendeeData.attendee);

        // If already completed, show message
        if (attendeeData.attendee?.profile_completion_status === 'completed') {
          // Still allow them to update, just show they already completed
        }
      }

    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    } else {
      // Final step - mark as complete and redirect to agenda
      completeProfile();
    }
  };

  const handlePrev = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleUpdate = async (updates: any) => {
    // Update contractor state
    setContractor((prev: any) => ({ ...prev, ...updates }));

    // Save to database immediately (progressive saving)
    try {
      await fetch(`/api/contractors/${contractorId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      console.log('✅ Progress saved:', updates);
    } catch (error) {
      console.error('⚠️ Failed to save progress:', error);
      // Don't block the flow, just log it
    }
  };

  const completeProfile = async () => {
    try {
      // Mark profile as completed in event_attendees
      await fetch(`/api/event-check-in/complete-profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: parseInt(eventId),
          contractorId: parseInt(contractorId!)
        })
      });

      // Redirect to success page
      router.push(`/events/${eventId}/success?contractor=${contractorId}`);
    } catch (error) {
      console.error('Error completing profile:', error);
      // Still redirect even if completion marking fails
      router.push(`/events/${eventId}/success?contractor=${contractorId}`);
    }
  };

  const CurrentStepComponent = steps[currentStep - 1]?.component;

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

  return (
    <div className="min-h-screen bg-power100-bg-grey">
      {/* Header with Event Info & Progress */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-6 py-8">
          {/* Event Info */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="w-12 h-12 bg-power100-red rounded-full flex items-center justify-center">
                <Building2 className="h-6 w-6 text-white" />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-power100-black mb-2">
              Complete Your Event Profile
            </h1>
            <p className="text-xl text-gray-600 mb-2">
              {event?.name || 'Event'}
            </p>
            <p className="text-gray-500">
              Welcome, {contractor?.first_name || contractor?.name}! Help us personalize your event experience.
            </p>
          </div>

          {/* Already Completed Notice */}
          {attendee?.profile_completion_status === 'completed' && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3 mb-6">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="text-green-700">
                Profile completed on {new Date(attendee.profile_completion_time).toLocaleDateString()}. You can update your information below.
              </span>
            </div>
          )}

          {/* Progress Indicator */}
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-lg font-semibold text-power100-black">
              Step {currentStep} of {steps.length}
            </h2>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
            <motion.div
              className="bg-power100-red h-2 rounded-full"
              initial={{ width: "0%" }}
              animate={{ width: `${(currentStep / steps.length) * 100}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>

          {/* Step Indicators */}
          <div className="flex justify-between">
            {steps.map((step) => (
              <div key={step.number} className="flex flex-col items-center">
                <motion.div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                    currentStep > step.number
                      ? "bg-power100-green text-white"
                      : currentStep === step.number
                      ? "bg-power100-red text-white"
                      : "bg-gray-300 text-gray-600"
                  }`}
                  initial={{ scale: 0.8 }}
                  animate={{ scale: currentStep === step.number ? 1.1 : 1 }}
                  transition={{ duration: 0.3 }}
                >
                  {currentStep > step.number ? "✓" : step.number}
                </motion.div>
                <span className="text-xs mt-2 text-center max-w-20">
                  {step.title}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Step Content */}
      <div className="max-w-4xl mx-auto px-6 py-12">
        {CurrentStepComponent && (
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <CurrentStepComponent
                data={contractor || {}}
                onNext={handleNext}
                onPrev={currentStep > 1 ? handlePrev : undefined}
                onUpdate={handleUpdate}
                customButtonText={currentStep === steps.length ? "Complete Profile & View Agenda" : undefined}
              />
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
