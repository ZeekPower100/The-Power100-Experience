'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { CheckCircle, Target, Users, TrendingUp, BarChart3, ArrowRight } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getApiUrl } from '@/utils/api';
import { handleApiResponse } from '@/utils/jsonHelpers';

export default function PartnerProfileSuccessPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const partnerId = searchParams.get('partner');
  const eventId = searchParams.get('event');

  const [partner, setPartner] = useState<any>(null);
  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [partnerId, eventId]);

  const loadData = async () => {
    try {
      // Load partner details
      if (partnerId) {
        const partnerResponse = await fetch(getApiUrl(`api/partners/${partnerId}`));
        const partnerData = await handleApiResponse(partnerResponse);
        setPartner(partnerData);
      }

      // Load event details
      if (eventId) {
        const eventResponse = await fetch(getApiUrl(`api/events/${eventId}`));
        const eventData = await handleApiResponse(eventResponse);
        setEvent(eventData);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error loading data:', error);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-power100-bg-grey flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-power100-red mx-auto mb-4"></div>
          <p className="text-power100-grey">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-power100-bg-grey flex items-center justify-center">
      <div className="w-full max-w-2xl mx-auto px-4 py-12">
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
                Profile Complete, {partner?.company_name || 'Partner'}!
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-lg text-gray-600"
              >
                Thank you for completing your partner profile
                {event && (
                  <> for <span className="font-semibold text-power100-black">{event.name}</span></>
                )}. You're now set up to maximize your ROI.
              </motion.p>
            </div>

            {/* Matching Status */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-gradient-to-br from-green-50 to-blue-50 rounded-xl p-6 mb-6"
            >
              <div className="flex items-start gap-4">
                {/* Animated Icon */}
                <div className="relative">
                  <motion.div
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-md"
                  >
                    <Target className="h-6 w-6 text-power100-green" />
                  </motion.div>
                  {/* Pulsing Ring */}
                  <motion.div
                    animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="absolute inset-0 border-2 border-power100-green rounded-full"
                  />
                </div>

                {/* Status Text */}
                <div className="flex-1">
                  <h3 className="font-bold text-lg text-gray-900 mb-2">
                    Your Matching Profile is Active
                  </h3>
                  <p className="text-gray-700 text-sm leading-relaxed">
                    Our algorithm is now matching you with contractors who align with your ideal customer profile.
                    The more complete your profile, the better our matching performs.
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Benefits Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="space-y-4 mb-8"
            >
              <h3 className="font-bold text-lg text-power100-black text-center mb-4">
                What You Can Expect
              </h3>

              {event && (
                <>
                  {/* Event-Specific Benefits */}
                  <div className="mb-4">
                    <p className="text-sm font-semibold text-power100-grey mb-3 text-center">
                      FOR {event.name?.toUpperCase() || 'THE EVENT'}:
                    </p>

                    {/* Targeted Leads */}
                    <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg mb-3">
                      <div className="w-10 h-10 bg-power100-red rounded-full flex items-center justify-center flex-shrink-0">
                        <Users className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-power100-black mb-1">Qualified Booth Traffic</h4>
                        <p className="text-sm text-gray-600">
                          We'll direct contractors to your booth who match your ideal customer profile based on their pre-expressed business goals.
                        </p>
                      </div>
                    </div>

                    {/* Pre-Qualified Conversations */}
                    <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg mb-3">
                      <div className="w-10 h-10 bg-power100-red rounded-full flex items-center justify-center flex-shrink-0">
                        <TrendingUp className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-power100-black mb-1">Pre-Qualified Conversations</h4>
                        <p className="text-sm text-gray-600">
                          Contractors come to you already knowing their needs align with your solutions. No more cold conversations.
                        </p>
                      </div>
                    </div>

                    {/* Real-time Insights */}
                    <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
                      <div className="w-10 h-10 bg-power100-red rounded-full flex items-center justify-center flex-shrink-0">
                        <BarChart3 className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-power100-black mb-1">Real-Time Insights</h4>
                        <p className="text-sm text-gray-600">
                          Access engagement analytics during the event to see which contractors are interested in your solutions.
                        </p>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* TPX Platform Benefits */}
              <div className="pt-4 border-t border-gray-200">
                <p className="text-sm font-semibold text-power100-grey mb-3 text-center">
                  TPX PLATFORM BENEFITS:
                </p>

                {/* Ongoing Leads */}
                <div className="flex items-start gap-4 p-4 bg-blue-50 rounded-lg mb-3">
                  <div className="w-10 h-10 bg-power100-green rounded-full flex items-center justify-center flex-shrink-0">
                    <Target className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-power100-black mb-1">Continuous Lead Matching</h4>
                    <p className="text-sm text-gray-600">
                      Beyond events, you'll receive ongoing introductions to contractors in our ecosystem who match your profile.
                    </p>
                  </div>
                </div>

                {/* PowerConfidence Score */}
                <div className="flex items-start gap-4 p-4 bg-blue-50 rounded-lg mb-3">
                  <div className="w-10 h-10 bg-power100-green rounded-full flex items-center justify-center flex-shrink-0">
                    <TrendingUp className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-power100-black mb-1">PowerConfidence Score</h4>
                    <p className="text-sm text-gray-600">
                      Build your reputation through verified customer ratings and testimonials from contractors who work with you.
                    </p>
                  </div>
                </div>

                {/* Long-term Partnerships */}
                <div className="flex items-start gap-4 p-4 bg-blue-50 rounded-lg">
                  <div className="w-10 h-10 bg-power100-green rounded-full flex items-center justify-center flex-shrink-0">
                    <Users className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-power100-black mb-1">Long-Term Partnerships</h4>
                    <p className="text-sm text-gray-600">
                      Access opportunities beyond single events through our growing network of contractors seeking strategic partners.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="flex flex-col sm:flex-row gap-4 mt-8"
            >
              {event && (
                <Button
                  onClick={() => router.push(`/events/${eventId}`)}
                  variant="outline"
                  className="flex-1 border-2 border-gray-300 text-power100-black hover:bg-gray-50"
                >
                  View Event Details
                </Button>
              )}
              <Button
                onClick={() => router.push('/partner-portal')}
                className="flex-1 bg-power100-green hover:bg-green-700 text-white font-semibold"
              >
                Go to Partner Portal
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </motion.div>

            {/* Footer Message */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="text-center pt-6 mt-6 border-t border-gray-200"
            >
              <p className="text-sm text-gray-500">
                Questions? Contact your Power100 representative or email{' '}
                <a href="mailto:partners@power100.io" className="text-power100-red hover:underline font-semibold">
                  partners@power100.io
                </a>
              </p>
            </motion.div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
