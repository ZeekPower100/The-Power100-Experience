'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import FeedbackForm from '@/components/feedback/FeedbackForm';
import { Card, CardContent } from '@/components/ui/card';
import { MessageSquare, AlertCircle, CheckCircle, Target, ThumbsUp } from 'lucide-react';

interface SurveyData {
  id: string;
  partner_id: number;
  contractor_id: number;
  partner_name: string;
  contractor_name: string;
  survey_type: string;
  status: string;
  expires_at: string;
}

const FeedbackSurveyPage: React.FC = () => {
  const searchParams = useSearchParams();
  const [surveyData, setSurveyData] = useState<SurveyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const surveyId = searchParams.get('survey');
  const contractorId = searchParams.get('contractor');
  const partnerId = searchParams.get('partner');

  useEffect(() => {
    const fetchSurveyData = async () => {
      try {
        setLoading(true);
        
        if (!surveyId && (!contractorId || !partnerId)) {
          throw new Error('Invalid survey link. Missing required parameters.');
        }

        // If we have surveyId, fetch the survey details
        if (surveyId) {
          const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://the-power100-experience-production.up.railway.app';
          const response = await fetch(`${apiUrl}/api/feedback/surveys?id=${surveyId}`);
          if (!response.ok) {
            throw new Error('Survey not found or expired');
          }
          const data = await response.json();
          setSurveyData(data.surveys[0]);
        } else {
          // Create mock survey data for direct contractor/partner link
          const mockData: SurveyData = {
            id: `${contractorId}-${partnerId}-${Date.now()}`,
            partner_id: parseInt(partnerId!),
            contractor_id: parseInt(contractorId!),
            partner_name: 'our partner', // Will be fetched or provided by the backend
            contractor_name: 'Contractor',
            survey_type: 'quarterly',
            status: 'pending',
            expires_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
          };
          setSurveyData(mockData);
        }
      } catch (error) {
        console.error('Error fetching survey data:', error);
        setError(error instanceof Error ? error.message : 'Failed to load survey');
      } finally {
        setLoading(false);
      }
    };

    fetchSurveyData();
  }, [surveyId, contractorId, partnerId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading your feedback survey...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Survey Not Available
            </h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <p className="text-sm text-gray-500">
              If you believe this is an error, please contact support.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check if survey is expired
  const isExpired = surveyData && new Date(surveyData.expires_at) < new Date();

  if (isExpired) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Survey Expired
            </h2>
            <p className="text-gray-600 mb-4">
              This feedback survey has expired and is no longer accepting responses.
            </p>
            <p className="text-sm text-gray-500">
              Thank you for your interest in providing feedback.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Progress Steps - Matching Contractor Flow */}
      <div className="w-full bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-center items-center space-x-8">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center mr-2">
                <CheckCircle className="w-5 h-5" />
              </div>
              <span className="text-sm font-medium text-green-600">Survey Started</span>
            </div>
            <div className="flex items-center">
              <div className="w-8 h-8 bg-red-600 text-white rounded-full flex items-center justify-center mr-2">
                <span className="text-sm font-bold">2</span>
              </div>
              <span className="text-sm font-medium text-red-600">Partner Feedback</span>
            </div>
            <div className="flex items-center">
              <div className="w-8 h-8 bg-gray-300 text-white rounded-full flex items-center justify-center mr-2">
                <span className="text-sm font-bold">3</span>
              </div>
              <span className="text-sm text-gray-500">Review & Submit</span>
            </div>
            <div className="flex items-center">
              <div className="w-8 h-8 bg-gray-300 text-white rounded-full flex items-center justify-center mr-2">
                <span className="text-sm font-bold">4</span>
              </div>
              <span className="text-sm text-gray-500">Complete</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="py-12 px-4">
        {/* Feedback Form */}
        {surveyData && (
          <FeedbackForm
            surveyId={surveyData.id}
            contractorId={surveyData.contractor_id.toString()}
            partnerId={surveyData.partner_id.toString()}
            partnerName={surveyData.partner_name}
          />
        )}
      </div>
    </div>
  );
};

// Wrap the component that uses useSearchParams in Suspense
export default function Page() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-power100-red"></div>
      </div>
    }>
      <FeedbackSurveyPage />
    </Suspense>
  );
}