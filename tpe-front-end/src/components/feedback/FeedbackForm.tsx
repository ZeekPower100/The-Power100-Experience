'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Star, ThumbsUp, MessageSquare, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';

interface FeedbackFormProps {
  surveyId?: string;
  contractorId?: string;
  partnerId?: string;
  partnerName?: string;
  onSubmit?: (data: FeedbackData) => void;
}

interface FeedbackData {
  surveyId?: string;
  overallSatisfaction: number;
  communicationRating: number;
  serviceQualityRating: number;
  valueForMoneyRating: number;
  likelihoodToRecommend: number;
  positiveFeedback: string;
  improvementAreas: string;
  additionalComments: string;
  wouldUseAgain: boolean | null;
  meetingExpectations: boolean | null;
  responseTimeAcceptable: boolean | null;
}

const StarRating: React.FC<{
  rating: number;
  onRatingChange: (rating: number) => void;
  label: string;
}> = ({ rating, onRatingChange, label }) => {
  return (
    <div className="space-y-4 text-center">
      <Label className="text-lg font-medium text-gray-900 block">{label}</Label>
      <div className="flex justify-center space-x-2">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onRatingChange(star)}
            className={`p-2 transition-all hover:scale-110 ${
              star <= rating
                ? 'text-yellow-400 hover:text-yellow-500'
                : 'text-gray-300 hover:text-gray-400'
            }`}
          >
            <Star 
              className="h-8 w-8" 
              fill={star <= rating ? 'currentColor' : 'none'}
            />
          </button>
        ))}
      </div>
      {rating > 0 && (
        <div className="flex justify-center">
          <div className="bg-gray-100 px-4 py-2 rounded-full">
            <p className="text-sm font-medium text-gray-700">
              {rating}/10 - {rating <= 3 ? 'Poor' : rating <= 5 ? 'Fair' : rating <= 7 ? 'Good' : rating <= 9 ? 'Excellent' : 'Outstanding'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

const FeedbackForm: React.FC<FeedbackFormProps> = ({
  surveyId,
  contractorId,
  partnerId,
  partnerName = 'this partner',
  onSubmit
}) => {
  const [step, setStep] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<FeedbackData>({
    surveyId,
    overallSatisfaction: 0,
    communicationRating: 0,
    serviceQualityRating: 0,
    valueForMoneyRating: 0,
    likelihoodToRecommend: 0,
    positiveFeedback: '',
    improvementAreas: '',
    additionalComments: '',
    wouldUseAgain: null,
    meetingExpectations: null,
    responseTimeAcceptable: null
  });

  const totalSteps = 4;
  const progress = (step / totalSteps) * 100;

  const handleSubmit = async () => {
    try {
      setLoading(true);
      
      if (onSubmit) {
        onSubmit(formData);
      } else {
        // Submit to API
        const response = await fetch('/api/feedback/submit-response', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(formData)
        });

        if (!response.ok) {
          throw new Error('Failed to submit feedback');
        }
      }

      setSubmitted(true);
    } catch (error) {
      console.error('Error submitting feedback:', error);
      // Handle error (show toast, etc.)
    } finally {
      setLoading(false);
    }
  };

  const canProceed = () => {
    switch (step) {
      case 1:
        return formData.overallSatisfaction > 0;
      case 2:
        return formData.communicationRating > 0 && 
               formData.serviceQualityRating > 0 && 
               formData.valueForMoneyRating > 0;
      case 3:
        return formData.likelihoodToRecommend > 0;
      case 4:
        return true; // Optional fields
      default:
        return false;
    }
  };

  if (submitted) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md mx-auto"
      >
        <Card>
          <CardContent className="p-8 text-center">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-6" />
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Thank You!
            </h2>
            <p className="text-gray-600 mb-6">
              Your feedback has been submitted successfully. We appreciate you taking the time to help us improve our services.
            </p>
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-sm text-green-700">
                Your responses help us maintain high PowerConfidence scores and ensure the best partner recommendations for future contractors.
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <motion.div
        key={step}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="bg-white shadow-lg border border-gray-200">
          <CardContent className="p-12">
            {/* Red Circle Icon */}
            <div className="flex justify-center mb-8">
              <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center">
                {step === 1 && <ThumbsUp className="w-8 h-8 text-white" />}
                {step === 2 && <Star className="w-8 h-8 text-white" />}
                {step === 3 && <Target className="w-8 h-8 text-white" />}
                {step === 4 && <MessageSquare className="w-8 h-8 text-white" />}
              </div>
            </div>

            {/* Title and Subtitle */}
            <div className="text-center mb-12">
              <h1 className="text-3xl font-bold text-gray-900 mb-4">
                {step === 1 && 'How Was Your Overall Experience?'}
                {step === 2 && 'Rate Service Quality Areas'}
                {step === 3 && 'Would You Recommend This Partner?'}
                {step === 4 && 'Share Additional Feedback'}
              </h1>
              <p className="text-lg text-gray-600">
                {step === 1 && `Help us understand your experience working with ${partnerName}`}
                {step === 2 && 'Rate specific aspects of the service you received'}
                {step === 3 && 'Let us know about your likelihood to recommend and reuse'}
                {step === 4 && 'Optional: Share what went well and areas for improvement'}
              </p>
            </div>

            {/* Content Area */}
            <div className="space-y-8 mb-12">
            {step === 1 && (
              <div className="space-y-8">
                <div className="max-w-2xl mx-auto">
                  <StarRating
                    rating={formData.overallSatisfaction}
                    onRatingChange={(rating) => setFormData({...formData, overallSatisfaction: rating})}
                    label="Rate your overall experience on a scale of 1-10"
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto mt-12">
                  <div className="text-center p-6 bg-gray-50 rounded-lg border border-gray-200">
                    <ThumbsUp className="h-12 w-12 text-blue-600 mx-auto mb-4" />
                    <h3 className="font-semibold text-gray-900 mb-2">Service Quality</h3>
                    <p className="text-sm text-gray-600">Professional delivery and expertise</p>
                  </div>
                  <div className="text-center p-6 bg-gray-50 rounded-lg border border-gray-200">
                    <MessageSquare className="h-12 w-12 text-green-600 mx-auto mb-4" />
                    <h3 className="font-semibold text-gray-900 mb-2">Communication</h3>
                    <p className="text-sm text-gray-600">Clear and timely responses</p>
                  </div>
                  <div className="text-center p-6 bg-gray-50 rounded-lg border border-gray-200">
                    <Star className="h-12 w-12 text-yellow-600 mx-auto mb-4" />
                    <h3 className="font-semibold text-gray-900 mb-2">Value</h3>
                    <p className="text-sm text-gray-600">Fair pricing for quality delivered</p>
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-10 max-w-2xl mx-auto">
                <StarRating
                  rating={formData.communicationRating}
                  onRatingChange={(rating) => setFormData({...formData, communicationRating: rating})}
                  label="How would you rate their communication?"
                />
                
                <StarRating
                  rating={formData.serviceQualityRating}
                  onRatingChange={(rating) => setFormData({...formData, serviceQualityRating: rating})}
                  label="How would you rate the quality of their service?"
                />
                
                <StarRating
                  rating={formData.valueForMoneyRating}
                  onRatingChange={(rating) => setFormData({...formData, valueForMoneyRating: rating})}
                  label="How would you rate the value for money?"
                />
              </div>
            )}

            {step === 3 && (
              <div className="space-y-10 max-w-2xl mx-auto">
                <StarRating
                  rating={formData.likelihoodToRecommend}
                  onRatingChange={(rating) => setFormData({...formData, likelihoodToRecommend: rating})}
                  label="How likely are you to recommend this partner to other contractors?"
                />

                <div className="space-y-6 bg-gray-50 p-6 rounded-lg border border-gray-200">
                  <h3 className="font-semibold text-gray-900 mb-4">Additional Questions</h3>
                  
                  <div className="flex items-center space-x-3">
                    <Checkbox 
                      id="would-use-again"
                      checked={formData.wouldUseAgain === true}
                      onCheckedChange={(checked) => setFormData({...formData, wouldUseAgain: checked as boolean})}
                      className="w-5 h-5"
                    />
                    <Label htmlFor="would-use-again" className="text-gray-700 font-medium">I would use this partner again in the future</Label>
                  </div>

                  <div className="flex items-center space-x-3">
                    <Checkbox 
                      id="met-expectations"
                      checked={formData.meetingExpectations === true}
                      onCheckedChange={(checked) => setFormData({...formData, meetingExpectations: checked as boolean})}
                      className="w-5 h-5"
                    />
                    <Label htmlFor="met-expectations" className="text-gray-700 font-medium">This partner met or exceeded my expectations</Label>
                  </div>

                  <div className="flex items-center space-x-3">
                    <Checkbox 
                      id="response-time"
                      checked={formData.responseTimeAcceptable === true}
                      onCheckedChange={(checked) => setFormData({...formData, responseTimeAcceptable: checked as boolean})}
                      className="w-5 h-5"
                    />
                    <Label htmlFor="response-time" className="text-gray-700 font-medium">Their response time was acceptable</Label>
                  </div>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-8 max-w-2xl mx-auto">
                <div>
                  <Label htmlFor="positive-feedback" className="text-lg font-medium text-gray-900 mb-3 block">
                    What did you like most about this partner?
                  </Label>
                  <Textarea
                    id="positive-feedback"
                    value={formData.positiveFeedback}
                    onChange={(e) => setFormData({...formData, positiveFeedback: e.target.value})}
                    placeholder="Tell us about the positive aspects of your experience..."
                    rows={4}
                    className="w-full"
                  />
                </div>

                <div>
                  <Label htmlFor="improvement-areas" className="text-lg font-medium text-gray-900 mb-3 block">
                    What areas could they improve?
                  </Label>
                  <Textarea
                    id="improvement-areas"
                    value={formData.improvementAreas}
                    onChange={(e) => setFormData({...formData, improvementAreas: e.target.value})}
                    placeholder="Share any suggestions for improvement..."
                    rows={4}
                    className="w-full"
                  />
                </div>

                <div>
                  <Label htmlFor="additional-comments" className="text-lg font-medium text-gray-900 mb-3 block">
                    Any additional comments?
                  </Label>
                  <Textarea
                    id="additional-comments"
                    value={formData.additionalComments}
                    onChange={(e) => setFormData({...formData, additionalComments: e.target.value})}
                    placeholder="Any other feedback you'd like to share..."
                    rows={4}
                    className="w-full"
                  />
                </div>
              </div>
            )}
            </div>

            {/* Navigation Buttons - Matching Contractor Flow */}
            <div className="flex justify-between pt-8">
              <Button
                variant="outline"
                onClick={() => setStep(step - 1)}
                disabled={step === 1}
                className="px-8 py-3 text-gray-700 border-gray-300 hover:bg-gray-50 font-medium"
                size="lg"
              >
                Back
              </Button>

              {step < totalSteps ? (
                <Button
                  onClick={() => setStep(step + 1)}
                  disabled={!canProceed()}
                  className="px-8 py-3 bg-green-500 hover:bg-green-600 text-white font-medium"
                  size="lg"
                >
                  Continue
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  disabled={loading || !canProceed()}
                  className="px-8 py-3 bg-green-500 hover:bg-green-600 text-white font-medium"
                  size="lg"
                >
                  {loading ? 'Submitting...' : 'Submit Feedback'}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default FeedbackForm;