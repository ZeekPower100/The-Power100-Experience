'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, ArrowRight, ArrowLeft, CheckCircle, AlertCircle, Clock } from 'lucide-react';

interface PowerCardTemplate {
  id: string;
  partner_name: string;
  metric_1_name: string;
  metric_1_question: string;
  metric_1_type: string;
  metric_2_name: string;
  metric_2_question: string;
  metric_2_type: string;
  metric_3_name: string;
  metric_3_question: string;
  metric_3_type: string;
  include_satisfaction_score: boolean;
  include_recommendation_score: boolean;
  include_culture_questions: boolean;
}

interface SurveyResponse {
  metric_1_score?: number;
  metric_1_response?: string;
  metric_2_score?: number;
  metric_2_response?: string;
  metric_3_score?: number;
  metric_3_response?: string;
  satisfaction_score?: number;
  recommendation_score?: number;
  culture_score?: number;
  leadership_score?: number;
  growth_opportunity_score?: number;
  additional_feedback?: string;
  improvement_suggestions?: string;
}

interface PowerCardSurveyProps {
  surveyLink: string;
  onComplete?: () => void;
}

const PowerCardSurvey: React.FC<PowerCardSurveyProps> = ({ surveyLink, onComplete }) => {
  const [template, setTemplate] = useState<PowerCardTemplate | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [responses, setResponses] = useState<SurveyResponse>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [startTime] = useState(Date.now());

  const [steps, setSteps] = useState<string[]>(['partner_metrics', 'feedback']);

  useEffect(() => {
    loadSurveyTemplate();
  }, [surveyLink]);

  const loadSurveyTemplate = async () => {
    try {
      setLoading(true);
      // In a real implementation, we'd extract the template from the survey link
      // For now, we'll use mock data
      const mockTemplate: PowerCardTemplate = {
        id: '1',
        partner_name: 'Buildr CRM',
        metric_1_name: 'Lead Management',
        metric_1_question: 'How effectively has Buildr helped you manage and track your leads?',
        metric_1_type: 'rating',
        metric_2_name: 'Sales Pipeline',
        metric_2_question: 'How much has Buildr improved your sales pipeline visibility?',
        metric_2_type: 'rating',
        metric_3_name: 'Customer Communication',
        metric_3_question: 'How has Buildr enhanced your customer communication process?',
        metric_3_type: 'rating',
        include_satisfaction_score: true,
        include_recommendation_score: true,
        include_culture_questions: false
      };
      
      setTemplate(mockTemplate);
      
      // Build steps array dynamically based on template
      const newSteps = ['partner_metrics'];
      if (mockTemplate.include_satisfaction_score) {
        newSteps.push('satisfaction');
      }
      if (mockTemplate.include_recommendation_score) {
        newSteps.push('recommendation');
      }
      if (mockTemplate.include_culture_questions) {
        newSteps.push('culture');
      }
      newSteps.push('feedback');
      setSteps(newSteps);
      
      // Initialize default values for required fields
      setResponses(prev => ({
        ...prev,
        metric_1_score: 5,
        metric_2_score: 5,
        metric_3_score: 5,
        satisfaction_score: 5,
        recommendation_score: 5,
        culture_score: 5,
        leadership_score: 5,
        growth_opportunity_score: 5
      }));
    } catch (err) {
      setError('Failed to load survey. Please check your link and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleScoreChange = (field: keyof SurveyResponse, value: number) => {
    setResponses(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleTextChange = (field: keyof SurveyResponse, value: string) => {
    setResponses(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const getRatingDescription = (score: number): string => {
    if (score >= 9) return 'Excellent';
    if (score >= 7) return 'Good';
    if (score >= 5) return 'Fair';
    if (score >= 3) return 'Poor';
    return 'Very Poor';
  };

  const getNPSDescription = (score: number): string => {
    if (score >= 9) return 'Promoter';
    if (score >= 7) return 'Passive';
    return 'Detractor';
  };

  const isStepComplete = (step: number): boolean => {
    if (!template) return false;
    
    switch (steps[step]) {
      case 'partner_metrics':
        return !!(responses.metric_1_score && responses.metric_2_score && responses.metric_3_score);
      case 'satisfaction':
        return !template.include_satisfaction_score || !!responses.satisfaction_score;
      case 'recommendation':
        return !template.include_recommendation_score || !!responses.recommendation_score;
      case 'culture':
        return !template.include_culture_questions || 
               !!(responses.culture_score && responses.leadership_score && responses.growth_opportunity_score);
      case 'feedback':
        return true; // Optional step
      default:
        return true;
    }
  };

  const canProceed = (): boolean => {
    return isStepComplete(currentStep);
  };

  const nextStep = () => {
    if (currentStep < steps.length - 1 && canProceed()) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const submitSurvey = async () => {
    if (!template) return;
    
    try {
      setSubmitting(true);
      
      const timeToComplete = Math.round((Date.now() - startTime) / 1000);
      
      const submissionData = {
        ...responses,
        time_to_complete: timeToComplete
      };

      const response = await fetch(`http://localhost:5000/api/power-cards/survey/${surveyLink}/response`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submissionData)
      });

      if (!response.ok) {
        throw new Error('Failed to submit survey');
      }

      onComplete?.();
    } catch (err) {
      setError('Failed to submit survey. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const renderRatingSlider = (
    field: keyof SurveyResponse,
    label: string,
    question: string,
    isNPS: boolean = false
  ) => {
    const value = responses[field] as number || (isNPS ? 5 : 5);
    const max = isNPS ? 10 : 10;
    const min = isNPS ? 0 : 1;
    
    return (
      <div className="space-y-4">
        <div>
          <h3 className="font-semibold text-lg text-power100-black">{label}</h3>
          <p className="text-power100-grey mt-1">{question}</p>
        </div>
        
        <div className="space-y-4">
          <div className="flex justify-center">
            <div className="text-center">
              <div className="text-4xl font-bold text-power100-red mb-2">{value}</div>
              <Badge 
                variant="secondary"
                className={`${
                  isNPS 
                    ? value >= 9 ? 'bg-green-100 text-green-800' :
                      value >= 7 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    : value >= 8 ? 'bg-green-100 text-green-800' :
                      value >= 6 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                }`}
              >
                {isNPS ? getNPSDescription(value) : getRatingDescription(value)}
              </Badge>
            </div>
          </div>
          
          <div className="px-4">
            <Slider
              value={[value]}
              onValueChange={([newValue]) => handleScoreChange(field, newValue)}
              max={max}
              min={min}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-sm text-power100-grey mt-2">
              <span>{isNPS ? 'Not at all likely' : 'Very Poor'}</span>
              <span>{isNPS ? 'Extremely likely' : 'Excellent'}</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-power100-bg-grey flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-power100-red mx-auto mb-4"></div>
            <p className="text-power100-grey">Loading your survey...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-power100-bg-grey flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-12 w-12 text-power100-red mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-power100-black mb-2">Survey Error</h2>
            <p className="text-power100-grey mb-4">{error}</p>
            <Button onClick={() => window.location.reload()}>
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!template) return null;

  return (
    <div className="min-h-screen bg-power100-bg-grey">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-power100-black mb-2">
            Power Card Survey
          </h1>
          <p className="text-power100-grey mb-4">
            Help us improve by sharing your experience with {template.partner_name}
          </p>
          
          {/* Progress Bar */}
          <div className="w-full max-w-md mx-auto bg-power100-white rounded-full h-2 mb-4">
            <div 
              className="bg-power100-red h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
            />
          </div>
          <p className="text-sm text-power100-grey">
            Step {currentStep + 1} of {steps.length}
          </p>
        </div>

        {/* Survey Content */}
        <div className="max-w-2xl mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {/* Contractor Flow Style Card */}
              <div className="bg-white rounded-2xl shadow-lg p-8">
                {/* Red Icon at top center */}
                <div className="flex justify-center mb-6">
                  <div className="w-12 h-12 bg-power100-red rounded-full flex items-center justify-center">
                    <Star className="h-6 w-6 text-white" />
                  </div>
                </div>

                {/* Time Estimate */}
                <div className="flex items-center justify-center mb-6 text-sm text-power100-grey">
                  <Clock className="h-4 w-4 mr-2" />
                  Est. time remaining: {Math.max(1, 5 - currentStep)} min
                </div>
                  
                  {/* Partner Metrics Step */}
                  {steps[currentStep] === 'partner_metrics' && (
                    <div className="space-y-8">
                      <div className="text-center mb-6">
                        <h2 className="text-2xl font-bold text-power100-black mb-2">
                          {template.partner_name} Performance
                        </h2>
                        <p className="text-power100-grey">
                          Rate your experience with {template.partner_name} in these key areas
                        </p>
                      </div>

                      {renderRatingSlider('metric_1_score', template.metric_1_name, template.metric_1_question)}
                      {renderRatingSlider('metric_2_score', template.metric_2_name, template.metric_2_question)}
                      {renderRatingSlider('metric_3_score', template.metric_3_name, template.metric_3_question)}
                    </div>
                  )}

                  {/* Satisfaction Step */}
                  {steps[currentStep] === 'satisfaction' && template.include_satisfaction_score && (
                    <div className="space-y-6">
                      <div className="text-center mb-6">
                        <h2 className="text-2xl font-bold text-power100-black mb-2">
                          Overall Satisfaction
                        </h2>
                        <p className="text-power100-grey">
                          How satisfied are you with {template.partner_name} overall?
                        </p>
                      </div>

                      {renderRatingSlider(
                        'satisfaction_score',
                        'Overall Satisfaction',
                        `Rate your overall satisfaction with ${template.partner_name}'s service and support`
                      )}
                    </div>
                  )}

                  {/* Recommendation Step */}
                  {steps[currentStep] === 'recommendation' && template.include_recommendation_score && (
                    <div className="space-y-6">
                      <div className="text-center mb-6">
                        <h2 className="text-2xl font-bold text-power100-black mb-2">
                          Net Promoter Score
                        </h2>
                        <p className="text-power100-grey">
                          How likely are you to recommend {template.partner_name} to a colleague?
                        </p>
                      </div>

                      {renderRatingSlider(
                        'recommendation_score',
                        'Likelihood to Recommend',
                        `On a scale of 0-10, how likely are you to recommend ${template.partner_name} to another contractor?`,
                        true
                      )}
                    </div>
                  )}

                  {/* Culture Step (for employee surveys) */}
                  {steps[currentStep] === 'culture' && template.include_culture_questions && (
                    <div className="space-y-8">
                      <div className="text-center mb-6">
                        <h2 className="text-2xl font-bold text-power100-black mb-2">
                          Company Culture
                        </h2>
                        <p className="text-power100-grey">
                          Help us understand the workplace culture at {template.partner_name}
                        </p>
                      </div>

                      {renderRatingSlider('culture_score', 'Company Culture', 'How would you rate the overall company culture?')}
                      {renderRatingSlider('leadership_score', 'Leadership Quality', 'How effective is the leadership team?')}
                      {renderRatingSlider('growth_opportunity_score', 'Growth Opportunities', 'How satisfied are you with growth and development opportunities?')}
                    </div>
                  )}

                  {/* Feedback Step */}
                  {steps[currentStep] === 'feedback' && (
                    <div className="space-y-6">
                      <div className="text-center mb-6">
                        <h2 className="text-2xl font-bold text-power100-black mb-2">
                          Additional Feedback
                        </h2>
                        <p className="text-power100-grey">
                          Share any additional thoughts or suggestions (optional)
                        </p>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-power100-black mb-2">
                            What do you like most about working with {template.partner_name}?
                          </label>
                          <Textarea
                            placeholder="Share positive feedback..."
                            value={responses.additional_feedback || ''}
                            onChange={(e) => handleTextChange('additional_feedback', e.target.value)}
                            rows={3}
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-power100-black mb-2">
                            What could {template.partner_name} improve?
                          </label>
                          <Textarea
                            placeholder="Share suggestions for improvement..."
                            value={responses.improvement_suggestions || ''}
                            onChange={(e) => handleTextChange('improvement_suggestions', e.target.value)}
                            rows={3}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                {/* Navigation Buttons - Contractor Flow Style */}
                <div className="flex gap-4 mt-8">
                  {currentStep > 0 && (
                    <Button
                      variant="outline"
                      onClick={prevStep}
                      className="flex-1 bg-white border-2 border-gray-200 text-power100-black hover:bg-gray-50"
                    >
                      Back
                    </Button>
                  )}
                  
                  {currentStep < steps.length - 1 ? (
                    <Button
                      onClick={nextStep}
                      disabled={!canProceed()}
                      className={`flex-1 text-white font-semibold ${
                        canProceed() 
                          ? 'bg-power100-green hover:bg-green-600' 
                          : 'bg-gray-300 cursor-not-allowed'
                      }`}
                    >
                      Continue
                    </Button>
                  ) : (
                    <Button
                      onClick={submitSurvey}
                      disabled={submitting}
                      className="flex-1 bg-power100-green hover:bg-green-600 text-white font-semibold"
                    >
                      {submitting ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Submitting...
                        </>
                      ) : (
                        'Submit Survey'
                      )}
                    </Button>
                  )}
                </div>

                {/* Progress Dots */}
                <div className="flex items-center justify-center gap-2 mt-6">
                  {steps.map((_, index) => (
                    <div
                      key={index}
                      className={`w-3 h-3 rounded-full ${
                        index === currentStep
                          ? 'bg-power100-red'
                          : index < currentStep
                          ? 'bg-power100-green'
                          : 'bg-power100-grey opacity-30'
                      }`}
                    />
                  ))}
                </div>

              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default PowerCardSurvey;