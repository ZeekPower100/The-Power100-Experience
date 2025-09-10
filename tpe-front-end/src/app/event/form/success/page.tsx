'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, ArrowRight, Calendar } from 'lucide-react';
import Link from 'next/link';

export default function EventSubmissionSuccessPage() {
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
              Event Submitted Successfully!
            </h1>
            <p className="text-power100-grey text-lg leading-relaxed">
              Thank you for submitting your event to The Power100 Experience. 
              Your submission has been received and is now under review.
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
                  <strong>Review Process:</strong> Our team will review your event to ensure it aligns with our contractor community's needs.
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-power100-red rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-white text-sm font-bold">2</span>
                </div>
                <p className="text-power100-grey">
                  <strong>Event Verification:</strong> We'll verify event details and may contact you for additional information.
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-power100-red rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-white text-sm font-bold">3</span>
                </div>
                <p className="text-power100-grey">
                  <strong>Approval Notification:</strong> You'll receive an email notification once your event is approved for inclusion.
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-power100-red rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-white text-sm font-bold">4</span>
                </div>
                <p className="text-power100-grey">
                  <strong>Contractor Promotion:</strong> Approved events will be promoted to relevant contractors based on their business focus.
                </p>
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="border-t border-gray-200 pt-6 mb-8">
            <p className="text-power100-grey">
              Questions about your submission? Contact us at{' '}
              <a href="mailto:events@power100.io" className="text-power100-red hover:underline">
                events@power100.io
              </a>
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/event/form">
              <Button className="bg-power100-green hover:bg-green-700 text-white px-6 py-2 rounded-full font-semibold flex items-center">
                <Calendar className="h-4 w-4 mr-2" />
                Submit Another Event
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