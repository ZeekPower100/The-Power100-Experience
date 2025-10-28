'use client';

import { useState, useEffect, Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { CheckCircle, Sparkles, Mail, MessageSquare, Calendar } from 'lucide-react';
import { Card } from '@/components/ui/card';

function ProfileCompletionSuccessPageContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const eventId = params.eventId as string;
  const contractorId = searchParams.get('contractor');

  const [event, setEvent] = useState<any>(null);
  const [contractor, setContractor] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, [eventId, contractorId]);

  const loadData = async () => {
    try {
      // Load event details
      const eventResponse = await fetch(`/api/events/${eventId}`);
      if (eventResponse.ok) {
        const eventData = await eventResponse.json();
        setEvent(eventData);
      }

      // Load contractor details
      if (contractorId) {
        const contractorResponse = await fetch(`/api/contractors/${contractorId}`);
        if (contractorResponse.ok) {
          const contractorData = await contractorResponse.json();
          setContractor(contractorData.contractor || contractorData);
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  return (
    <div className="min-h-screen bg-power100-bg-grey flex items-center justify-center">
      <div className="w-full max-w-2xl mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="bg-white rounded-2xl shadow-lg p-8">
            {/* Success Icon */}
            <div className="flex justify-center mb-6">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                className="w-20 h-20 bg-power100-green rounded-full flex items-center justify-center"
              >
                <CheckCircle className="h-12 w-12 text-white" />
              </motion.div>
            </div>

            {/* Main Message */}
            <div className="text-center mb-8">
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-3xl font-bold text-power100-black mb-3"
              >
                You're All Set, {contractor?.first_name || 'there'}!
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-lg text-gray-600"
              >
                Thank you for completing your event profile for <span className="font-semibold text-power100-black">{event?.name || 'the event'}</span>.
              </motion.p>
            </div>

            {/* AI Curation Status */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-6 mb-6"
            >
              <div className="flex items-start gap-4">
                {/* Animated Processing Icon */}
                <div className="relative">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                    className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-md"
                  >
                    <Sparkles className="h-6 w-6 text-purple-600" />
                  </motion.div>
                  {/* Pulsing Ring */}
                  <motion.div
                    animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="absolute inset-0 border-2 border-purple-400 rounded-full"
                  />
                </div>

                {/* Status Text */}
                <div className="flex-1">
                  <h3 className="font-bold text-lg text-gray-900 mb-2">
                    Your Personalized Agenda is Being Curated
                  </h3>
                  <p className="text-gray-700 text-sm leading-relaxed">
                    Our AI is analyzing your profile to create a customized event experience just for you.
                    We're matching you with the best speakers, sponsors, and networking opportunities based on your business goals.
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Next Steps */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="space-y-4 mb-8"
            >
              <h3 className="font-bold text-lg text-power100-black text-center mb-4">
                What Happens Next?
              </h3>

              {/* Step 1: Email */}
              <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="w-10 h-10 bg-power100-red rounded-full flex items-center justify-center flex-shrink-0">
                  <Mail className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h4 className="font-semibold text-power100-black mb-1">We'll Email You</h4>
                  <p className="text-sm text-gray-600">
                    Once your personalized agenda is ready, we'll send you an email with a link to view all your recommendations.
                  </p>
                </div>
              </div>

              {/* Step 2: SMS */}
              <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="w-10 h-10 bg-power100-red rounded-full flex items-center justify-center flex-shrink-0">
                  <MessageSquare className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h4 className="font-semibold text-power100-black mb-1">Text Notification</h4>
                  <p className="text-sm text-gray-600">
                    You'll also receive a text message with quick access to your agenda and event updates.
                  </p>
                </div>
              </div>

              {/* Step 3: Event Day */}
              <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="w-10 h-10 bg-power100-green rounded-full flex items-center justify-center flex-shrink-0">
                  <Calendar className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h4 className="font-semibold text-power100-black mb-1">Enjoy the Event</h4>
                  <p className="text-sm text-gray-600">
                    Show up ready to connect! We'll guide you throughout the event with timely recommendations.
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Footer Message */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="text-center pt-6 border-t border-gray-200"
            >
              <p className="text-sm text-gray-500">
                Questions? Contact us at{' '}
                <a href="mailto:events@power100.io" className="text-power100-red hover:underline font-semibold">
                  events@power100.io
                </a>
              </p>
            </motion.div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}

// Main page component with Suspense boundary
export default function ProfileCompletionSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-power100-bg-grey flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-power100-red mx-auto mb-4"></div>
          <p className="text-power100-grey">Loading...</p>
        </div>
      </div>
    }>
      <ProfileCompletionSuccessPageContent />
    </Suspense>
  );
}
