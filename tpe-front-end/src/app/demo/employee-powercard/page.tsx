'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Star, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function EmployeePowerCard() {
  const [currentQuestion, setCurrentQuestion] = useState(-1);
  const [responses, setResponses] = useState<Record<number, number>>({});
  const [isComplete, setIsComplete] = useState(false);

  const questions = [
    {
      category: "Workplace Culture",
      question: "How would you rate your overall satisfaction with your workplace culture?",
      type: "rating"
    },
    {
      category: "Leadership",
      question: "How effectively does leadership communicate company goals and vision?",
      type: "rating"
    },
    {
      category: "Growth Opportunities",
      question: "Are you satisfied with the professional development opportunities available?",
      type: "rating"
    },
    {
      category: "Work-Life Balance",
      question: "How well does your company support work-life balance?",
      type: "rating"
    },
    {
      category: "Team Collaboration",
      question: "How would you rate collaboration within your team?",
      type: "rating"
    }
  ];

  const handleResponse = (value: number) => {
    setResponses(prev => ({
      ...prev,
      [currentQuestion]: value
    }));
  };

  const handleContinue = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    }
  };

  const handleBack = () => {
    setCurrentQuestion(Math.max(-1, currentQuestion - 1));
  };

  const handleSubmit = () => {
    console.log('Survey responses:', responses);
    setIsComplete(true);
  };

  // Completion Screen
  if (isComplete) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-2xl mx-auto p-8">
          <div className="text-center space-y-6">
            <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="h-10 w-10 text-white" />
            </div>
            <h2 className="text-3xl font-bold">Thank You for Your Feedback!</h2>
            <p className="text-gray-600 max-w-md mx-auto">
              Your responses help create a better workplace for everyone. Your company and partners 
              like Destination Motivation use this data to drive meaningful improvements.
            </p>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 max-w-md mx-auto">
              <p className="text-sm text-blue-900 font-semibold">
                What happens next?
              </p>
              <p className="text-sm text-blue-700 mt-2">
                Your anonymous responses will be compiled with your colleagues' feedback and shared 
                with leadership quarterly to drive positive workplace changes.
              </p>
            </div>

            <div className="flex justify-center">
              <Button 
                className="bg-red-600 hover:bg-red-700 text-white px-8 py-3 font-semibold"
                onClick={() => window.close()}
              >
                Close Survey
              </Button>
            </div>
          </div>
        </Card>
        
        <div className="fixed bottom-4 left-4 text-sm text-gray-500">
          Powered by Power100 Experience
        </div>
      </div>
    );
  }

  // Welcome Screen
  if (currentQuestion === -1) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-2xl mx-auto p-8">
          <div className="text-center space-y-6">
            <div className="w-20 h-20 bg-red-600 rounded-full flex items-center justify-center mx-auto">
              <Star className="h-10 w-10 text-white" />
            </div>
            <h2 className="text-3xl font-bold">Employee PowerCard Survey</h2>
            <p className="text-gray-600 max-w-md mx-auto">
              Your voice matters! This quarterly survey helps your company and partners like Destination Motivation 
              understand how to better support you.
            </p>
            <Badge className="bg-gradient-to-r from-purple-100 to-pink-100 text-purple-800">
              100% Anonymous & Confidential
            </Badge>
            <div className="bg-blue-50 rounded-lg p-4 text-sm text-blue-800">
              <p className="font-semibold mb-1">🎯 Your feedback directly impacts:</p>
              <ul className="text-left space-y-1">
                <li>• Company culture initiatives</li>
                <li>• Leadership development</li>
                <li>• Workplace improvements</li>
                <li>• Partnership improvements</li>
              </ul>
            </div>
            
            <div className="flex justify-center">
              <Button 
                className="bg-red-600 hover:bg-red-700 text-white px-8 py-3 font-semibold text-lg"
                onClick={() => setCurrentQuestion(0)}
              >
                Start Survey
              </Button>
            </div>
          </div>
        </Card>
        
        <div className="fixed bottom-4 left-4 text-sm text-gray-500">
          Anonymous quarterly feedback from partner employees
        </div>
      </div>
    );
  }

  // Question Screen
  const currentQ = questions[currentQuestion];
  const progress = ((currentQuestion + 1) / questions.length) * 100;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Question {currentQuestion + 1} of {questions.length}</span>
            <span>{Math.round(progress)}% Complete</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-red-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={currentQuestion}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="p-8">
              <div className="text-center mb-8">
                <Badge className="mb-4 bg-red-100 text-red-800">
                  {currentQ.category}
                </Badge>
                <h3 className="text-xl font-semibold text-gray-900">
                  {currentQ.question}
                </h3>
              </div>

              <div className="space-y-4">
                <div className="flex justify-center space-x-2">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <button
                      key={value}
                      onClick={() => handleResponse(value)}
                      className={`w-14 h-14 rounded-lg border-2 transition-all font-semibold ${
                        responses[currentQuestion] === value
                          ? 'bg-red-600 text-white border-red-600'
                          : 'bg-white text-gray-700 border-gray-300 hover:border-red-600'
                      }`}
                    >
                      {value}
                    </button>
                  ))}
                </div>
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Strongly Disagree</span>
                  <span>Strongly Agree</span>
                </div>
              </div>

              {/* Navigation Buttons */}
              <div className="flex justify-between mt-8">
                <Button
                  variant="outline"
                  onClick={handleBack}
                  disabled={currentQuestion === 0}
                  className="px-6"
                >
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
                
                {currentQuestion === questions.length - 1 ? (
                  <Button
                    className="bg-green-600 hover:bg-green-700 text-white px-6"
                    onClick={handleSubmit}
                    disabled={!responses[currentQuestion]}
                  >
                    Submit Feedback
                    <CheckCircle className="h-4 w-4 ml-2" />
                  </Button>
                ) : (
                  <Button
                    className="bg-red-600 hover:bg-red-700 text-white px-6"
                    onClick={handleContinue}
                    disabled={!responses[currentQuestion]}
                  >
                    Continue
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                )}
              </div>
            </Card>
          </motion.div>
        </AnimatePresence>
      </div>
      
      <div className="fixed bottom-4 left-4 text-sm text-gray-500">
        Powered by Power100 Experience
      </div>
    </div>
  );
}