'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Star, Users, Target, TrendingUp, Heart, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function DMEmployeePowerCard() {
  const [currentStep, setCurrentStep] = useState(0);
  const [responses, setResponses] = useState<Record<string, any>>({});
  
  const sections = [
    {
      title: "Company Culture & Leadership",
      icon: <Users className="h-6 w-6 text-white" />,
      color: "bg-power100-red",
      questions: [
        {
          id: 'leadership_effectiveness',
          text: 'How effective is our leadership team in communicating company vision and goals?',
          type: 'rating',
          scale: 5
        },
        {
          id: 'culture_alignment',
          text: 'How well does our company culture align with our stated values?',
          type: 'rating',
          scale: 5
        },
        {
          id: 'team_collaboration',
          text: 'Rate the level of collaboration between different departments',
          type: 'rating',
          scale: 5
        }
      ]
    },
    {
      title: "Employee Experience & Growth",
      icon: <TrendingUp className="h-6 w-6 text-white" />,
      color: "bg-power100-green",
      questions: [
        {
          id: 'growth_opportunities',
          text: 'Are there adequate opportunities for professional growth and development?',
          type: 'rating',
          scale: 5
        },
        {
          id: 'work_life_balance',
          text: 'How would you rate your work-life balance?',
          type: 'rating',
          scale: 5
        },
        {
          id: 'recognition',
          text: 'Do you feel recognized and valued for your contributions?',
          type: 'rating',
          scale: 5
        }
      ]
    },
    {
      title: "Client Service Excellence",
      icon: <Target className="h-6 w-6 text-white" />,
      color: "bg-blue-600",
      questions: [
        {
          id: 'client_focus',
          text: 'How well do we prioritize client success and satisfaction?',
          type: 'rating',
          scale: 5
        },
        {
          id: 'service_quality',
          text: 'Rate the quality of service we provide to our contractor clients',
          type: 'rating',
          scale: 5
        },
        {
          id: 'innovation',
          text: 'How innovative are we in developing solutions for our clients?',
          type: 'rating',
          scale: 5
        }
      ]
    },
    {
      title: "Overall Satisfaction",
      icon: <Heart className="h-6 w-6 text-white" />,
      color: "bg-purple-600",
      questions: [
        {
          id: 'recommend_employer',
          text: 'Would you recommend Destination Motivation as a great place to work?',
          type: 'rating',
          scale: 10
        },
        {
          id: 'proud_to_work',
          text: 'How proud are you to work at Destination Motivation?',
          type: 'rating',
          scale: 10
        },
        {
          id: 'improvement_areas',
          text: 'What is the ONE thing we could improve to make DM even better?',
          type: 'text'
        }
      ]
    }
  ];

  const handleResponse = (questionId: string, value: any) => {
    setResponses(prev => ({
      ...prev,
      [questionId]: value
    }));
  };

  const handleNext = () => {
    if (currentStep < sections.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = () => {
    console.log('Submitting employee responses:', responses);
    setCurrentStep(sections.length); // Go to thank you screen
  };

  const currentSection = sections[currentStep];
  const isLastSection = currentStep === sections.length - 1;
  const isComplete = currentStep === sections.length;

  if (isComplete) {
    return (
      <div className="min-h-screen bg-power100-bg-grey flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-2xl"
        >
          <Card className="bg-white rounded-2xl shadow-lg p-8">
            <div className="text-center">
              <div className="flex justify-center mb-6">
                <div className="w-20 h-20 bg-power100-green rounded-full flex items-center justify-center">
                  <CheckCircle className="h-10 w-10 text-white" />
                </div>
              </div>
              <h2 className="text-3xl font-bold text-power100-black mb-4">Thank You!</h2>
              <p className="text-lg text-gray-600 mb-6">
                Your feedback helps make Destination Motivation an even better place to work and serve our clients.
              </p>
              <div className="bg-gray-50 rounded-lg p-6 mb-6">
                <p className="text-gray-700">
                  Your responses will be reviewed by leadership and used to improve our workplace culture and client service.
                </p>
              </div>
              <Button 
                className="bg-power100-red hover:bg-red-600 text-white"
                onClick={() => window.close()}
              >
                Close Survey
              </Button>
            </div>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-power100-bg-grey flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Header with DM Logo */}
        <div className="text-center mb-6">
          <img 
            src="https://tpe-assets-production-492267598792.s3.us-east-1.amazonaws.com/logos/Destination+Motivation+logo+1.webp" 
            alt="Destination Motivation" 
            className="h-16 mx-auto mb-4"
          />
          <h1 className="text-2xl font-bold text-power100-black">Employee PowerCard Survey</h1>
          <p className="text-gray-600 mt-2">Q1 2025 - Internal Culture Assessment</p>
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-between mb-2">
            {sections.map((_, idx) => (
              <div
                key={idx}
                className={`flex-1 h-2 mx-1 rounded-full transition-colors ${
                  idx <= currentStep ? 'bg-power100-red' : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
          <p className="text-sm text-gray-600 text-center">
            Section {currentStep + 1} of {sections.length}
          </p>
        </div>

        {/* Question Card */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="bg-white rounded-2xl shadow-lg p-8">
              {/* Section Header */}
              <div className="flex items-center mb-6">
                <div className={`w-12 h-12 ${currentSection.color} rounded-full flex items-center justify-center mr-4`}>
                  {currentSection.icon}
                </div>
                <h2 className="text-xl font-bold text-power100-black">{currentSection.title}</h2>
              </div>

              {/* Questions */}
              <div className="space-y-6">
                {currentSection.questions.map((question) => (
                  <div key={question.id} className="space-y-3">
                    <label className="block text-gray-700 font-medium">
                      {question.text}
                    </label>
                    
                    {question.type === 'rating' && (
                      <div className="flex justify-center space-x-2">
                        {Array.from({ length: question.scale }, (_, i) => i + 1).map((value) => (
                          <button
                            key={value}
                            onClick={() => handleResponse(question.id, value)}
                            className={`w-12 h-12 rounded-lg border-2 transition-all ${
                              responses[question.id] === value
                                ? 'bg-power100-red text-white border-power100-red'
                                : 'bg-white text-gray-600 border-gray-300 hover:border-power100-red'
                            }`}
                          >
                            {value}
                          </button>
                        ))}
                      </div>
                    )}
                    
                    {question.type === 'text' && (
                      <textarea
                        className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-power100-red focus:outline-none"
                        rows={3}
                        placeholder="Share your thoughts..."
                        value={responses[question.id] || ''}
                        onChange={(e) => handleResponse(question.id, e.target.value)}
                      />
                    )}
                    
                    {question.scale && (
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>Not at all</span>
                        <span>Extremely</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Navigation */}
              <div className="flex gap-4 mt-8">
                <Button
                  variant="outline"
                  onClick={handlePrevious}
                  disabled={currentStep === 0}
                  className="flex-1 bg-white border-2 border-gray-200 text-power100-black hover:bg-gray-50"
                >
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  Previous
                </Button>
                
                {isLastSection ? (
                  <Button
                    onClick={handleSubmit}
                    className="flex-1 bg-power100-green hover:bg-green-600 text-white font-semibold"
                  >
                    Submit Survey
                    <CheckCircle className="h-4 w-4 ml-2" />
                  </Button>
                ) : (
                  <Button
                    onClick={handleNext}
                    className="flex-1 bg-power100-red hover:bg-red-600 text-white font-semibold"
                  >
                    Next Section
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                )}
              </div>
            </Card>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}