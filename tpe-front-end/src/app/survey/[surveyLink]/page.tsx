'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import PowerCardSurvey from '@/components/powerCards/PowerCardSurvey';
import SurveyComplete from '@/components/powerCards/SurveyComplete';

export default function SurveyPage() {
  const params = useParams();
  const surveyLink = params.surveyLink as string;
  const [isComplete, setIsComplete] = useState(false);

  const handleSurveyComplete = () => {
    setIsComplete(true);
  };

  const handleClose = () => {
    // In a real implementation, this might redirect to a thank you page
    // or close the window if opened in a popup
    window.close();
  };

  if (isComplete) {
    return <SurveyComplete onClose={handleClose} />;
  }

  return (
    <PowerCardSurvey 
      surveyLink={surveyLink}
      onComplete={handleSurveyComplete}
    />
  );
}