'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import PowerCardSurvey from '@/components/powerCards/PowerCardSurvey';
import SurveyComplete from '@/components/powerCards/SurveyComplete';

export default function PowerCardSurveyPage() {
  const params = useParams();
  const surveyLink = params.surveyLink as string;
  const [isComplete, setIsComplete] = useState(false);

  if (isComplete) {
    return <SurveyComplete />;
  }

  return (
    <PowerCardSurvey
      surveyLink={surveyLink}
      onComplete={() => setIsComplete(true)}
    />
  );
}
