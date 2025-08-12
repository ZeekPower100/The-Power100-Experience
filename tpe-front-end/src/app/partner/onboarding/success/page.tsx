'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function OnboardingSuccessPage() {
  return (
    <div className="min-h-screen bg-power100-bg-grey flex items-center justify-center px-6">
      <Card className="max-w-2xl w-full bg-white shadow-lg border-0">
        <CardContent className="p-8 text-center">
          {/* Success Icon */}
          <div className="flex justify-center mb-8">
            <div className="w-20 h-20 bg-power100-green rounded-full flex items-center justify-center">
              <CheckCircle className="h-12 w-12 text-white" />
            </div>
          </div>
          
          {/* Success Message */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-power100-black mb-4">
              Application Submitted Successfully!
            </h1>
            <p className="text-power100-grey text-lg leading-relaxed">
              Thank you for completing the Power100 Experience partner onboarding process. 
              Your application has been received and is now under review.
            </p>
          </div>

          {/* What's Next Section */}
          <div className="bg-power100-bg-grey rounded-lg p-6 mb-8">
            <h2 className="text-xl font-semibold text-power100-black mb-4">
              What happens next?
            </h2>
            <div className="text-left space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-power100-red rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-white text-sm font-bold">1</span>
                </div>
                <p className="text-power100-grey">
                  <strong>Review Process:</strong> Our team will review your application and verify the information provided.
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-power100-red rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-white text-sm font-bold">2</span>
                </div>
                <p className="text-power100-grey">
                  <strong>Client Verification:</strong> We may contact your provided references to verify your service quality.
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-power100-red rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-white text-sm font-bold">3</span>
                </div>
                <p className="text-power100-grey">
                  <strong>Approval Notification:</strong> You'll receive an email notification once your application is approved.
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-power100-red rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-white text-sm font-bold">4</span>
                </div>
                <p className="text-power100-grey">
                  <strong>Partner Portal Access:</strong> Access your partner dashboard to manage your profile and track leads.
                </p>
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="border-t border-gray-200 pt-6 mb-8">
            <p className="text-power100-grey">
              Questions about your application? Contact us at{' '}
              <a href="mailto:partners@power100.io" className="text-power100-red hover:underline">
                partners@power100.io
              </a>
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/partner/login">
              <Button className="bg-power100-green hover:bg-green-700 text-white px-6 py-2 rounded-full font-semibold">
                Access Partner Portal
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
            <Link href="/">
              <Button variant="outline" className="px-6 py-2 rounded-full border-power100-grey text-power100-grey">
                Return to Home
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}