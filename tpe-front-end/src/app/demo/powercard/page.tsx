'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  TrendingUp, 
  ArrowRight, 
  ArrowLeft, 
  CheckCircle, 
  XCircle,
  Target,
  Users,
  Star,
  MessageSquare,
  Award,
  BarChart3
} from 'lucide-react';

export default function PowerCardDemo() {
  const [currentStep, setCurrentStep] = useState(0);
  const [responses, setResponses] = useState<any>({
    // Actual numbers
    closing_percentage: 78,
    cancellation_rate: 12,
    customer_experience: 8.5,
    
    // Influence ratings (1-5 scale as per Greg)
    closing_influence: 4,
    cancellation_influence: 5,
    experience_influence: 4,
    
    // Without DM questions
    closing_without_dm: 'no',
    cancellation_without_dm: 'no',
    experience_without_dm: 'no',
    
    // Standard questions
    satisfaction_score: 4,
    recommendation_score: 9,
    additional_feedback: ''
  });

  // DM's 3 key metrics per Greg's requirements
  const metrics = [
    {
      id: 'closing',
      name: 'Closing Percentage',
      currentValue: '78%',
      lastQuarter: '72%',
      icon: TrendingUp,
      color: 'bg-green-500',
      questions: [
        {
          type: 'number',
          field: 'closing_percentage',
          question: 'What is your current closing percentage?',
          format: '%'
        },
        {
          type: 'scale',
          field: 'closing_influence',
          question: 'How much has Destination Motivation influenced your closing percentage?',
          scale: '1-5'
        },
        {
          type: 'yesno',
          field: 'closing_without_dm',
          question: 'Do you think your closing percentage would be this high without DM services?'
        }
      ]
    },
    {
      id: 'cancellation',
      name: 'Cancellation Rate',
      currentValue: '12%',
      lastQuarter: '18%',
      icon: XCircle,
      color: 'bg-red-500',
      questions: [
        {
          type: 'number',
          field: 'cancellation_rate',
          question: 'What is your current cancellation rate?',
          format: '%'
        },
        {
          type: 'scale',
          field: 'cancellation_influence',
          question: 'How much has DM helped reduce your cancellation rate?',
          scale: '1-5'
        },
        {
          type: 'yesno',
          field: 'cancellation_without_dm',
          question: 'Do you think your cancellation rate would be this low without DM services?'
        }
      ]
    },
    {
      id: 'experience',
      name: 'Customer Experience',
      currentValue: '8.5/10',
      lastQuarter: '7.8/10',
      icon: Star,
      color: 'bg-purple-500',
      questions: [
        {
          type: 'number',
          field: 'customer_experience',
          question: 'What is your current customer experience score?',
          format: '/10'
        },
        {
          type: 'scale',
          field: 'experience_influence',
          question: 'How much has DM improved your customer experience metrics?',
          scale: '1-5'
        },
        {
          type: 'yesno',
          field: 'experience_without_dm',
          question: 'Do you think your customer experience would be this high without DM services?'
        }
      ]
    }
  ];

  // Calculate total steps (3 metrics × 3 questions each + welcome + satisfaction + recommendation + feedback + complete)
  const steps = [
    'welcome',
    ...metrics.flatMap(m => m.questions.map((_, i) => `${m.id}_q${i + 1}`)),
    'satisfaction',
    'recommendation',
    'feedback',
    'complete'
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleScoreChange = (field: string, value: number[]) => {
    setResponses({ ...responses, [field]: value[0] });
  };

  const handleRadioChange = (field: string, value: string) => {
    setResponses({ ...responses, [field]: value });
  };

  const renderStep = () => {
    const currentStepName = steps[currentStep];
    
    // Parse metric questions
    if (currentStepName.includes('_q')) {
      const [metricId, questionNum] = currentStepName.split('_q');
      const metric = metrics.find(m => m.id === metricId);
      const questionIndex = parseInt(questionNum) - 1;
      const question = metric?.questions[questionIndex];
      
      if (!metric || !question) return null;
      
      const Icon = metric.icon;
      
      // Render based on question type
      if (question.type === 'number') {
        return (
          <div className="space-y-6">
            <div className={`w-16 h-16 ${metric.color} rounded-full flex items-center justify-center mx-auto`}>
              <Icon className="h-8 w-8 text-white" />
            </div>
            <div className="text-center">
              <h3 className="text-xl font-semibold mb-2">{metric.name}</h3>
              <p className="text-gray-600">{question.question}</p>
            </div>
            <div className="max-w-xs mx-auto">
              <div className="text-center mb-4">
                <span className="text-5xl font-bold text-power100-red">
                  {responses[question.field]}{question.format}
                </span>
              </div>
              <p className="text-sm text-gray-500 text-center">
                Last Quarter: {metric.lastQuarter}
              </p>
            </div>
          </div>
        );
      }
      
      if (question.type === 'scale') {
        return (
          <div className="space-y-6">
            <div className={`w-16 h-16 ${metric.color} rounded-full flex items-center justify-center mx-auto`}>
              <Icon className="h-8 w-8 text-white" />
            </div>
            <div className="text-center">
              <h3 className="text-xl font-semibold mb-2">{metric.name} - Impact</h3>
              <p className="text-gray-600">{question.question}</p>
            </div>
            <div className="space-y-4">
              <div className="flex justify-between text-sm text-gray-500">
                <span>No Impact</span>
                <span>Major Impact</span>
              </div>
              <Slider
                value={[responses[question.field] || 3]}
                onValueChange={(value) => handleScoreChange(question.field, value)}
                min={1}
                max={5}
                step={1}
                className="w-full"
              />
              <div className="flex justify-center space-x-4">
                {[1, 2, 3, 4, 5].map(num => (
                  <div
                    key={num}
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all ${
                      responses[question.field] === num
                        ? 'bg-power100-red text-white scale-125'
                        : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {num}
                  </div>
                ))}
              </div>
              <p className="text-center text-sm text-gray-600">
                Scale: 1 (No Impact) to 5 (Major Impact)
              </p>
            </div>
          </div>
        );
      }
      
      if (question.type === 'yesno') {
        return (
          <div className="space-y-6">
            <div className={`w-16 h-16 ${metric.color} rounded-full flex items-center justify-center mx-auto`}>
              <Icon className="h-8 w-8 text-white" />
            </div>
            <div className="text-center">
              <h3 className="text-xl font-semibold mb-2">{metric.name} - Attribution</h3>
              <p className="text-gray-600">{question.question}</p>
            </div>
            <RadioGroup
              value={responses[question.field]}
              onValueChange={(value) => handleRadioChange(question.field, value)}
              className="max-w-xs mx-auto space-y-4"
            >
              <div className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
                <RadioGroupItem value="yes" id="yes" />
                <Label htmlFor="yes" className="cursor-pointer flex-1">
                  <div className="font-semibold">Yes</div>
                  <div className="text-sm text-gray-500">I could achieve this without DM</div>
                </Label>
              </div>
              <div className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
                <RadioGroupItem value="no" id="no" />
                <Label htmlFor="no" className="cursor-pointer flex-1">
                  <div className="font-semibold">No</div>
                  <div className="text-sm text-gray-500">DM is critical to this result</div>
                </Label>
              </div>
            </RadioGroup>
          </div>
        );
      }
    }
    
    // Standard steps
    switch (currentStepName) {
      case 'welcome':
        return (
          <div className="text-center space-y-6">
            <div className="w-20 h-20 bg-power100-red rounded-full flex items-center justify-center mx-auto">
              <Award className="h-10 w-10 text-white" />
            </div>
            <h2 className="text-3xl font-bold">Destination Motivation PowerCard</h2>
            <p className="text-gray-600 max-w-md mx-auto">
              Your quarterly feedback on three key business metrics that matter most to your success.
            </p>
            <div className="grid grid-cols-3 gap-4 max-w-md mx-auto">
              {metrics.map(metric => {
                const Icon = metric.icon;
                return (
                  <div key={metric.id} className="text-center">
                    <div className={`w-12 h-12 ${metric.color} rounded-full flex items-center justify-center mx-auto mb-2`}>
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                    <p className="text-sm font-semibold">{metric.name}</p>
                  </div>
                );
              })}
            </div>
            <Badge className="bg-gold-100 text-gold-800">Q1 2025 Assessment - 15 Questions Total</Badge>
          </div>
        );

      case 'satisfaction':
        return (
          <div className="space-y-6">
            <div className="w-16 h-16 bg-yellow-500 rounded-full flex items-center justify-center mx-auto">
              <Star className="h-8 w-8 text-white" />
            </div>
            <div className="text-center">
              <h3 className="text-xl font-semibold mb-2">Overall Satisfaction</h3>
              <p className="text-gray-600">How satisfied are you with Destination Motivation overall?</p>
            </div>
            <div className="space-y-4">
              <div className="flex justify-between text-sm text-gray-500">
                <span>Very Unsatisfied</span>
                <span>Very Satisfied</span>
              </div>
              <Slider
                value={[responses.satisfaction_score || 3]}
                onValueChange={(value) => handleScoreChange('satisfaction_score', value)}
                min={1}
                max={5}
                step={1}
                className="w-full"
              />
              <div className="flex justify-center space-x-4">
                {[1, 2, 3, 4, 5].map(num => (
                  <div
                    key={num}
                    className={`w-12 h-12 rounded-full flex items-center justify-center font-bold transition-all ${
                      responses.satisfaction_score === num
                        ? 'bg-yellow-500 text-white scale-125'
                        : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {num}
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 'recommendation':
        return (
          <div className="space-y-6">
            <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="h-8 w-8 text-white" />
            </div>
            <div className="text-center">
              <h3 className="text-xl font-semibold mb-2">Would You Recommend?</h3>
              <p className="text-gray-600">
                How likely are you to recommend Destination Motivation to another contractor?
              </p>
            </div>
            <div className="space-y-4">
              <div className="flex justify-between text-sm text-gray-500">
                <span>Not Likely</span>
                <span>Very Likely</span>
              </div>
              <Slider
                value={[responses.recommendation_score || 5]}
                onValueChange={(value) => handleScoreChange('recommendation_score', value)}
                min={0}
                max={10}
                step={1}
                className="w-full"
              />
              <div className="text-center">
                <span className="text-4xl font-bold text-green-500">
                  {responses.recommendation_score || 5}
                </span>
                <span className="text-gray-500">/10</span>
              </div>
            </div>
          </div>
        );

      case 'feedback':
        return (
          <div className="space-y-6">
            <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto">
              <MessageSquare className="h-8 w-8 text-white" />
            </div>
            <div className="text-center">
              <h3 className="text-xl font-semibold mb-2">Additional Feedback</h3>
              <p className="text-gray-600">
                Any suggestions or comments for Destination Motivation? (Optional)
              </p>
            </div>
            <Textarea
              placeholder="Share your thoughts..."
              value={responses.additional_feedback}
              onChange={(e) => setResponses({ ...responses, additional_feedback: e.target.value })}
              className="min-h-[120px]"
            />
          </div>
        );

      case 'complete':
        return (
          <div className="text-center space-y-6">
            <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="h-10 w-10 text-white" />
            </div>
            <h2 className="text-3xl font-bold">Thank You!</h2>
            <p className="text-gray-600 max-w-md mx-auto">
              Your feedback helps Destination Motivation continue delivering exceptional value.
            </p>
            
            {/* Summary of responses */}
            <div className="bg-gray-50 rounded-lg p-6 max-w-md mx-auto">
              <h3 className="font-semibold mb-4">Your Q1 2025 Summary</h3>
              <div className="space-y-3 text-left">
                <div className="flex justify-between">
                  <span className="text-gray-600">Closing Percentage:</span>
                  <span className="font-bold text-green-600">78% (+6%)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Cancellation Rate:</span>
                  <span className="font-bold text-green-600">12% (-6%)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Customer Experience:</span>
                  <span className="font-bold text-green-600">8.5/10 (+0.7)</span>
                </div>
                <div className="border-t pt-3 mt-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">DM Impact Score:</span>
                    <span className="font-bold text-power100-red">4.3/5</span>
                  </div>
                </div>
              </div>
            </div>
            
            <Badge className="bg-gold-100 text-gold-800">
              PowerConfidence Score Contributing to 99
            </Badge>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-2xl mx-auto px-4">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-600">
              Question {currentStep + 1} of {steps.length}
            </span>
            <span className="text-sm text-gray-600">
              {Math.round((currentStep / (steps.length - 1)) * 100)}% Complete
            </span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-power100-green transition-all duration-300"
              style={{ width: `${(currentStep / (steps.length - 1)) * 100}%` }}
            />
          </div>
        </div>

        {/* Main Card */}
        <Card className="p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {renderStep()}
            </motion.div>
          </AnimatePresence>

          {/* Navigation Buttons */}
          <div className="flex gap-4 mt-8">
            {currentStep > 0 && currentStep < steps.length - 1 && (
              <Button
                variant="outline"
                onClick={handleBack}
                className="flex-1"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            )}
            
            {currentStep < steps.length - 1 && (
              <Button
                onClick={handleNext}
                className="flex-1 bg-power100-green hover:bg-green-600"
              >
                {currentStep === 0 ? 'Start Survey' : 'Continue'}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            )}
            
            {currentStep === steps.length - 1 && (
              <Button
                onClick={() => window.location.href = '/demo/dm-reports'}
                className="flex-1 bg-power100-red hover:bg-red-700"
              >
                View Reports Dashboard
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            )}
          </div>
        </Card>

        {/* Demo Info */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>Demo Mode - Destination Motivation PowerCard Survey</p>
          <p>15 Questions Total: 3 metrics × 5 questions each (per Greg's requirements)</p>
        </div>
      </div>
    </div>
  );
}
