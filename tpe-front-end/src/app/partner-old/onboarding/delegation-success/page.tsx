'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle, Mail, Home, Clock, Users, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

export default function DelegationSuccessPage() {
  const router = useRouter();
  const [delegateName, setDelegateName] = useState('your team member');
  const [companyName, setCompanyName] = useState('');

  useEffect(() => {
    // Try to get delegate info from URL params or session storage
    const urlParams = new URLSearchParams(window.location.search);
    const delegateParam = urlParams.get('delegate');
    const companyParam = urlParams.get('company');
    
    if (delegateParam) {
      setDelegateName(delegateParam);
    }
    if (companyParam) {
      setCompanyName(decodeURIComponent(companyParam));
    }
  }, []);

  const handleGoHome = () => {
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-power100-bg-grey flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-2xl"
      >
        <Card className="bg-white shadow-lg border-0">
          <CardContent className="p-8">
            {/* Success Icon */}
            <div className="flex justify-center mb-8">
              <div className="w-20 h-20 bg-power100-green rounded-full flex items-center justify-center">
                <Mail className="h-10 w-10 text-white" />
              </div>
            </div>

            {/* Success Message */}
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-power100-black mb-4">
                Delegation Successful!
              </h2>
              <p className="text-lg text-power100-grey mb-2">
                We've sent the pre-onboarding instructions to {delegateName}.
              </p>
              {companyName && (
                <p className="text-power100-grey">
                  {companyName}'s profile will be activated once pre-onboarding is complete.
                </p>
              )}
            </div>

            {/* What Happens Next */}
            <div className="bg-gray-50 rounded-lg p-6 mb-8">
              <h3 className="text-xl font-semibold text-power100-black mb-4 flex items-center gap-2">
                <Clock className="h-5 w-5 text-power100-red" />
                What Happens Next?
              </h3>
              
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-power100-green rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-white text-xs font-bold">1</span>
                  </div>
                  <div>
                    <p className="font-semibold text-power100-black">Email Sent</p>
                    <p className="text-sm text-power100-grey">
                      Your delegate has received detailed instructions to complete the pre-onboarding section.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-power100-green rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-white text-xs font-bold">2</span>
                  </div>
                  <div>
                    <p className="font-semibold text-power100-black">Pre-Onboarding Completion</p>
                    <p className="text-sm text-power100-grey">
                      They'll upload your company logo, add client demos, and provide references for PowerConfidence scoring.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-power100-green rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-white text-xs font-bold">3</span>
                  </div>
                  <div>
                    <p className="font-semibold text-power100-black">Profile Activation</p>
                    <p className="text-sm text-power100-grey">
                      Once pre-onboarding is complete, your profile goes live in our matching system.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-power100-green rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-white text-xs font-bold">4</span>
                  </div>
                  <div>
                    <p className="font-semibold text-power100-black">Contractor Matching Begins</p>
                    <p className="text-sm text-power100-grey">
                      You'll start receiving qualified contractor matches based on your expertise and their needs.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Why Pre-Onboarding Matters */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8">
              <p className="text-sm font-semibold text-blue-900 mb-2">
                <Users className="h-4 w-4 inline mr-1" />
                Why Pre-Onboarding is Essential
              </p>
              <p className="text-sm text-blue-800">
                The pre-onboarding information powers our AI matching algorithm and establishes your PowerConfidence score. 
                This ensures you receive high-quality, relevant contractor matches that align with your expertise.
              </p>
            </div>

            {/* Important Note */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-8">
              <p className="text-sm font-semibold text-yellow-900 mb-1">
                Important Note:
              </p>
              <p className="text-sm text-yellow-800">
                Your partner profile will remain in "Pending" status until the pre-onboarding section is completed. 
                We'll notify you via email once your profile is fully activated.
              </p>
            </div>

            {/* Action Button */}
            <div className="flex justify-center">
              <Button
                onClick={handleGoHome}
                size="lg"
                className="bg-power100-green hover:bg-green-700 text-white px-8"
              >
                <Home className="h-5 w-5 mr-2" />
                Return to Home Page
              </Button>
            </div>

            {/* Additional Info */}
            <div className="mt-6 text-center">
              <p className="text-sm text-power100-grey">
                Questions? Contact our partner support team at{' '}
                <a href="mailto:partners@power100.io" className="text-power100-red hover:underline">
                  partners@power100.io
                </a>
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}