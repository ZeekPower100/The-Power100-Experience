'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Star, 
  ArrowRight, 
  ArrowLeft, 
  CheckCircle, 
  Heart,
  Briefcase,
  Home,
  Users,
  TrendingUp,
  MessageSquare,
  Award,
  Sparkles,
  UserCheck
} from 'lucide-react';

export default function EmployeePowerCardDemo() {
  const [currentStep, setCurrentStep] = useState(0);
  const [responses, setResponses] = useState<any>({
    metric_1_score: 7,
    metric_2_score: 6,
    metric_3_score: 8,
    culture_score: 7,
    leadership_score: 8,
    growth_opportunity_score: 6,
    satisfaction_score: 7,
    recommendation_score: 8,
    additional_feedback: ''
  });

  // Employee-specific metrics (standardized across all companies)
  const metrics = [
    {
      name: 'Recognition & Appreciation',
      question: 'How well does your company recognize and appreciate your contributions?',
      icon: Award,
      color: 'bg-purple-500'
    },
    {
      name: 'Career Growth',
      question: 'How satisfied are you with career development opportunities at your company?',
      icon: TrendingUp,
      color: 'bg-blue-500'
    },
    {
      name: 'Work-Life Balance',
      question: 'How would you rate your current work-life balance?',
      icon: Home,
      color: 'bg-green-500'
    }
  ];

  // Culture questions specific to employees
  const cultureQuestions = [
    {
      name: 'Company Culture',
      question: 'How would you rate your company\'s overall culture and work environment?',
      field: 'culture_score',
      icon: Users,
      color: 'bg-orange-500'
    },
    {
      name: 'Leadership Quality',
      question: 'How effective is your company\'s leadership in supporting and guiding the team?',
      field: 'leadership_score',
      icon: UserCheck,
      color: 'bg-indigo-500'
    },
    {
      name: 'Growth Opportunities',
      question: 'How satisfied are you with opportunities for professional growth and advancement?',
      field: 'growth_opportunity_score',
      icon: Briefcase,
      color: 'bg-pink-500'
    }
  ];

  const steps = [
    'welcome',
    'metric_1',
    'metric_2', 
    'metric_3',
    'culture',
    'leadership',
    'growth',
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

  const renderStep = () => {
    switch (steps[currentStep]) {
      case 'welcome':
        return (
          <div className="text-center space-y-6">
            <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto">
              <Sparkles className="h-10 w-10 text-white" />
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
                <li>• Professional development programs</li>
                <li>• Work-life balance policies</li>
              </ul>
            </div>
          </div>
        );

      case 'metric_1':
      case 'metric_2':
      case 'metric_3':
        const metricIndex = parseInt(steps[currentStep].split('_')[1]) - 1;
        const metric = metrics[metricIndex];
        const scoreField = `metric_${metricIndex + 1}_score`;
        const Icon = metric.icon;
        
        return (
          <div className="space-y-6">
            <div className={`w-16 h-16 ${metric.color} rounded-full flex items-center justify-center mx-auto`}>
              <Icon className="h-8 w-8 text-white" />
            </div>
            <div className="text-center">
              <h3 className="text-xl font-semibold mb-2">{metric.name}</h3>
              <p className="text-gray-600">{metric.question}</p>
            </div>
            <div className="space-y-4">
              <div className="flex justify-between text-sm text-gray-500">
                <span>Needs Improvement</span>
                <span>Excellent</span>
              </div>
              <Slider
                value={[responses[scoreField] || 5]}
                onValueChange={(value) => handleScoreChange(scoreField, value)}
                min={1}
                max={10}
                step={1}
                className="w-full"
              />
              <div className="text-center">
                <span className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                  {responses[scoreField] || 5}
                </span>
                <span className="text-gray-500">/10</span>
              </div>
              <div className="flex justify-center space-x-1">
                {[...Array(10)].map((_, i) => (
                  <div
                    key={i}
                    className={`h-2 w-6 rounded-full transition-all ${
                      i < (responses[scoreField] || 5)
                        ? 'bg-gradient-to-r from-purple-400 to-pink-400'
                        : 'bg-gray-200'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        );

      case 'culture':
      case 'leadership':
      case 'growth':
        const cultureIndex = steps[currentStep] === 'culture' ? 0 : 
                           steps[currentStep] === 'leadership' ? 1 : 2;
        const cultureQ = cultureQuestions[cultureIndex];
        const CultureIcon = cultureQ.icon;
        
        return (
          <div className="space-y-6">
            <div className={`w-16 h-16 ${cultureQ.color} rounded-full flex items-center justify-center mx-auto`}>
              <CultureIcon className="h-8 w-8 text-white" />
            </div>
            <div className="text-center">
              <h3 className="text-xl font-semibold mb-2">{cultureQ.name}</h3>
              <p className="text-gray-600">{cultureQ.question}</p>
            </div>
            <div className="space-y-4">
              <div className="flex justify-between text-sm text-gray-500">
                <span>Poor</span>
                <span>Outstanding</span>
              </div>
              <Slider
                value={[responses[cultureQ.field] || 5]}
                onValueChange={(value) => handleScoreChange(cultureQ.field, value)}
                min={1}
                max={10}
                step={1}
                className="w-full"
              />
              <div className="text-center">
                <span className="text-4xl font-bold text-gray-800">
                  {responses[cultureQ.field] || 5}
                </span>
                <span className="text-gray-500">/10</span>
              </div>
            </div>
          </div>
        );

      case 'satisfaction':
        return (
          <div className="space-y-6">
            <div className="w-16 h-16 bg-yellow-500 rounded-full flex items-center justify-center mx-auto">
              <Star className="h-8 w-8 text-white" />
            </div>
            <div className="text-center">
              <h3 className="text-xl font-semibold mb-2">Overall Job Satisfaction</h3>
              <p className="text-gray-600">How satisfied are you with your current job overall?</p>
            </div>
            <div className="space-y-4">
              <div className="flex justify-between text-sm text-gray-500">
                <span>Very Unsatisfied</span>
                <span>Very Satisfied</span>
              </div>
              <Slider
                value={[responses.satisfaction_score || 5]}
                onValueChange={(value) => handleScoreChange('satisfaction_score', value)}
                min={1}
                max={10}
                step={1}
                className="w-full"
              />
              <div className="text-center">
                <span className="text-4xl font-bold text-yellow-500">
                  {responses.satisfaction_score || 5}
                </span>
                <span className="text-gray-500">/10</span>
              </div>
              <div className="grid grid-cols-5 gap-2 mt-4">
                {['😞', '😕', '😐', '🙂', '😊'].map((emoji, i) => (
                  <div
                    key={i}
                    className={`text-2xl text-center transition-all ${
                      Math.floor((responses.satisfaction_score - 1) / 2) === i
                        ? 'scale-125'
                        : 'opacity-30'
                    }`}
                  >
                    {emoji}
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
              <Heart className="h-8 w-8 text-white" />
            </div>
            <div className="text-center">
              <h3 className="text-xl font-semibold mb-2">Would You Recommend?</h3>
              <p className="text-gray-600">
                How likely are you to recommend your company as a great place to work?
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
              <div className="bg-green-50 rounded-lg p-3 text-sm">
                <p className="text-green-800">
                  {responses.recommendation_score >= 9 ? '🎉 You\'re a promoter!' :
                   responses.recommendation_score >= 7 ? '👍 You\'re satisfied!' :
                   '💭 We hear you and want to improve!'}
                </p>
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
              <h3 className="text-xl font-semibold mb-2">Your Voice Matters</h3>
              <p className="text-gray-600">
                What's one thing that would make your work experience better? (Optional)
              </p>
            </div>
            <Textarea
              placeholder="Share your ideas, concerns, or suggestions..."
              value={responses.additional_feedback}
              onChange={(e) => setResponses({ ...responses, additional_feedback: e.target.value })}
              className="min-h-[150px]"
            />
            <div className="bg-blue-50 rounded-lg p-4 text-sm text-blue-800">
              <p className="font-semibold mb-1">💡 Common themes from your peers:</p>
              <ul className="space-y-1">
                <li>• More flexible work arrangements</li>
                <li>• Additional training opportunities</li>
                <li>• Better recognition programs</li>
                <li>• Team building activities</li>
              </ul>
            </div>
          </div>
        );

      case 'complete':
        return (
          <div className="text-center space-y-6">
            <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-blue-500 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="h-10 w-10 text-white" />
            </div>
            <h2 className="text-3xl font-bold">Thank You for Your Feedback!</h2>
            <p className="text-gray-600 max-w-md mx-auto">
              Your responses help create a better workplace for everyone. Your company and partners 
              like Destination Motivation use this data to drive meaningful improvements.
            </p>
            
            <div className="grid md:grid-cols-2 gap-4 mt-6">
              <div className="bg-purple-50 rounded-lg p-4">
                <p className="text-sm text-purple-600 font-semibold">Your Team's Culture Score</p>
                <p className="text-3xl font-bold text-purple-700">72</p>
                <p className="text-xs text-purple-600">Industry Avg: 68</p>
              </div>
              <div className="bg-green-50 rounded-lg p-4">
                <p className="text-sm text-green-600 font-semibold">Participation Rate</p>
                <p className="text-3xl font-bold text-green-700">87%</p>
                <p className="text-xs text-green-600">Great engagement!</p>
              </div>
            </div>
            
            <div className="bg-gradient-to-r from-purple-100 to-pink-100 rounded-lg p-4">
              <p className="text-purple-800 font-semibold mb-2">🎯 Next Steps:</p>
              <ul className="text-sm text-purple-700 space-y-1 text-left">
                <li>✓ Your feedback will be reviewed (anonymously)</li>
                <li>✓ Results shared with leadership next week</li>
                <li>✓ Action plan to be announced within 30 days</li>
                <li>✓ Next survey in Q2 2025</li>
              </ul>
            </div>
            
            <Badge className="bg-gold-100 text-gold-800">
              You're helping build a better workplace!
            </Badge>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 py-12">
      <div className="max-w-2xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-6">
          <Badge className="bg-white/80 text-purple-600 mb-2">
            Employee Experience Survey
          </Badge>
          <p className="text-sm text-gray-600">
            Powered by Destination Motivation's PowerCard System
          </p>
        </div>

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
          <div className="h-3 bg-white rounded-full overflow-hidden shadow-inner">
            <div 
              className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-300"
              style={{ width: `${(currentStep / (steps.length - 1)) * 100}%` }}
            />
          </div>
        </div>

        {/* Main Card */}
        <Card className="p-8 bg-white/95 backdrop-blur shadow-xl">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
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
                className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
              >
                {currentStep === 0 ? 'Start Survey' : 'Continue'}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            )}
            
            {currentStep === steps.length - 1 && (
              <div className="w-full space-y-3">
                <Button
                  onClick={() => window.location.href = '/demo/powercard'}
                  variant="outline"
                  className="w-full"
                >
                  View Contractor Survey
                </Button>
                <Button
                  onClick={() => window.location.href = '/demo/dm-reports'}
                  className="w-full bg-power100-red hover:bg-red-700"
                >
                  Return to Reports Dashboard
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            )}
          </div>
        </Card>

        {/* Demo Info */}
        <div className="mt-8 text-center text-sm text-purple-700/60">
          <p>Demo Mode - Employee PowerCard Survey</p>
          <p>Anonymous quarterly feedback from contractor employees</p>
        </div>
      </div>
    </div>
  );
}
