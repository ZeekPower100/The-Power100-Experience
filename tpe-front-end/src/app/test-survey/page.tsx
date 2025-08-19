'use client';

import React, { useState } from 'react';
import PowerCardSurvey from '@/components/powerCards/PowerCardSurvey';
import SurveyComplete from '@/components/powerCards/SurveyComplete';

export default function TestSurveyPage() {
  const [isComplete, setIsComplete] = useState(false);
  
  // Mock survey link for testing
  const testSurveyLink = 'power-card-1-1-abc123def456';

  const handleSurveyComplete = () => {
    setIsComplete(true);
  };

  const handleClose = () => {
    // Reset for testing
    setIsComplete(false);
  };

  if (isComplete) {
    return <SurveyComplete onClose={handleClose} partnerName="Buildr CRM" />;
  }

  return (
    <div>
      <PowerCardSurvey 
        surveyLink={testSurveyLink}
        onComplete={handleSurveyComplete}
      />
    </div>
  );
}