'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import FeedbackForm from '@/components/feedback/FeedbackForm';
import { Card, CardContent } from '@/components/ui/card';
import { MessageSquare, AlertCircle } from 'lucide-react';

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
          const response = await fetch(`/api/feedback/surveys?id=${surveyId}`);
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
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      {/* Header */}
      <div className="max-w-2xl mx-auto mb-8 text-center">
        <div className="flex items-center justify-center mb-4">
          <MessageSquare className="h-8 w-8 text-red-600 mr-3" />
          <h1 className="text-2xl font-bold text-gray-900">Power100 Feedback Survey</h1>
        </div>
        <p className="text-gray-600">
          Your feedback helps us maintain high standards and improve our partner network
        </p>
      </div>

      {/* Feedback Form */}
      {surveyData && (
        <FeedbackForm
          surveyId={surveyData.id}
          contractorId={surveyData.contractor_id.toString()}
          partnerId={surveyData.partner_id.toString()}
          partnerName={surveyData.partner_name}
        />
      )}

      {/* Footer */}
      <div className="max-w-2xl mx-auto mt-8 text-center">
        <p className="text-sm text-gray-500">
          © 2025 Power100 Experience. Your responses help us maintain our PowerConfidence scoring system.
        </p>
      </div>
    </div>
  );
};

export default FeedbackSurveyPage;