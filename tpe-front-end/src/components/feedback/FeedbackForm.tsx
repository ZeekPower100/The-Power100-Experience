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
    <div className="space-y-2">
      <Label className="text-sm font-medium">{label}</Label>
      <div className="flex space-x-1">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onRatingChange(star)}
            className={`p-1 transition-colors ${
              star <= rating
                ? 'text-yellow-400 hover:text-yellow-500'
                : 'text-gray-300 hover:text-gray-400'
            }`}
          >
            <Star 
              className="h-6 w-6" 
              fill={star <= rating ? 'currentColor' : 'none'}
            />
          </button>
        ))}
      </div>
      <p className="text-xs text-gray-500">
        {rating}/10 - {rating <= 3 ? 'Poor' : rating <= 5 ? 'Fair' : rating <= 7 ? 'Good' : rating <= 9 ? 'Excellent' : 'Outstanding'}
      </p>
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
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm text-gray-600">
          <span>Step {step} of {totalSteps}</span>
          <span>{Math.round(progress)}% Complete</span>
        </div>
        <Progress value={progress} className="w-full" />
      </div>

      <motion.div
        key={step}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="text-center">
              {step === 1 && 'Overall Experience'}
              {step === 2 && 'Service Evaluation'}
              {step === 3 && 'Recommendation'}
              {step === 4 && 'Additional Feedback'}
            </CardTitle>
            <p className="text-center text-gray-600">
              Help us understand your experience with {partnerName}
            </p>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            {step === 1 && (
              <div className="space-y-6">
                <StarRating
                  rating={formData.overallSatisfaction}
                  onRatingChange={(rating) => setFormData({...formData, overallSatisfaction: rating})}
                  label="How would you rate your overall experience?"
                />
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <ThumbsUp className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                    <p className="text-sm font-medium">Quality Service</p>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <MessageSquare className="h-8 w-8 text-green-600 mx-auto mb-2" />
                    <p className="text-sm font-medium">Clear Communication</p>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <Star className="h-8 w-8 text-yellow-600 mx-auto mb-2" />
                    <p className="text-sm font-medium">Great Value</p>
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6">
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
              <div className="space-y-6">
                <StarRating
                  rating={formData.likelihoodToRecommend}
                  onRatingChange={(rating) => setFormData({...formData, likelihoodToRecommend: rating})}
                  label="How likely are you to recommend this partner to other contractors?"
                />

                <div className="space-y-4 mt-8">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="would-use-again"
                      checked={formData.wouldUseAgain === true}
                      onCheckedChange={(checked) => setFormData({...formData, wouldUseAgain: checked as boolean})}
                    />
                    <Label htmlFor="would-use-again">I would use this partner again in the future</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="met-expectations"
                      checked={formData.meetingExpectations === true}
                      onCheckedChange={(checked) => setFormData({...formData, meetingExpectations: checked as boolean})}
                    />
                    <Label htmlFor="met-expectations">This partner met or exceeded my expectations</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="response-time"
                      checked={formData.responseTimeAcceptable === true}
                      onCheckedChange={(checked) => setFormData({...formData, responseTimeAcceptable: checked as boolean})}
                    />
                    <Label htmlFor="response-time">Their response time was acceptable</Label>
                  </div>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-6">
                <div>
                  <Label htmlFor="positive-feedback">What did you like most about this partner?</Label>
                  <Textarea
                    id="positive-feedback"
                    value={formData.positiveFeedback}
                    onChange={(e) => setFormData({...formData, positiveFeedback: e.target.value})}
                    placeholder="Tell us about the positive aspects of your experience..."
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="improvement-areas">What areas could they improve?</Label>
                  <Textarea
                    id="improvement-areas"
                    value={formData.improvementAreas}
                    onChange={(e) => setFormData({...formData, improvementAreas: e.target.value})}
                    placeholder="Share any suggestions for improvement..."
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="additional-comments">Any additional comments?</Label>
                  <Textarea
                    id="additional-comments"
                    value={formData.additionalComments}
                    onChange={(e) => setFormData({...formData, additionalComments: e.target.value})}
                    placeholder="Any other feedback you'd like to share..."
                    rows={3}
                  />
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between pt-6 border-t">
              <Button
                variant="outline"
                onClick={() => setStep(step - 1)}
                disabled={step === 1}
              >
                Previous
              </Button>

              {step < totalSteps ? (
                <Button
                  onClick={() => setStep(step + 1)}
                  disabled={!canProceed()}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Next
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  disabled={loading || !canProceed()}
                  className="bg-red-600 hover:bg-red-700"
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