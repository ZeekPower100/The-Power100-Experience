"use client";

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw, ArrowRight, CheckCircle, Eye, X } from 'lucide-react';
import { Contractor } from '@/lib/types/contractor';

interface SessionDetectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onResume: () => void;
  onStartFresh: () => void;
  contractor: Partial<Contractor> | null;
  currentStep: number;
  isLoading?: boolean;
}

export default function SessionDetectionModal({
  isOpen,
  onClose,
  onResume,
  onStartFresh,
  contractor,
  currentStep,
  isLoading = false
}: SessionDetectionModalProps) {
  
  // Determine the button text and action based on progress
  const getResumeButtonProps = () => {
    const isCompleted = contractor?.current_stage === 'completed' || 
                       contractor?.current_stage === 'demo_booked' || 
                       currentStep >= 5;
    
    if (isCompleted) {
      return {
        text: 'See Your Results',
        icon: <Eye className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />,
        description: 'View your partner matches and results'
      };
    } else {
      return {
        text: 'Resume Your Experience',
        icon: <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />,
        description: 'Continue where you left off'
      };
    }
  };

  const resumeProps = getResumeButtonProps();

  const getProgressText = () => {
    if (!contractor || !currentStep) return 'We found your previous session';
    
    const stepNames = {
      1: 'verification',
      2: 'focus selection', 
      3: 'business profiling',
      4: 'tech stack selection',
      5: 'partner matching',
      6: 'completion'
    };
    
    const stepName = stepNames[currentStep as keyof typeof stepNames] || 'in progress';
    
    if (currentStep >= 5) {
      return `You completed your matching process and have results waiting`;
    } else {
      return `You left off at ${stepName}`;
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.3 }}
          className="w-full max-w-4xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="grid md:grid-cols-2 gap-6">
            
            {/* Continue Session Card */}
            <Card className="bg-white border-0 shadow-2xl rounded-xl">
              <CardHeader className="text-center pb-6 relative">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="absolute top-4 right-4 p-1 w-8 h-8"
                >
                  <X className="w-4 h-4" />
                </Button>
                
                <div className="w-16 h-16 bg-gradient-to-br from-power100-green to-green-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                  {currentStep >= 5 ? (
                    <Eye className="w-8 h-8 text-white" />
                  ) : (
                    <RefreshCw className="w-8 h-8 text-white" />
                  )}
                </div>
                <CardTitle className="text-2xl font-bold text-power100-black">
                  Welcome Back{contractor?.name ? `, ${contractor.name}` : ''}!
                </CardTitle>
                <p className="text-power100-grey">
                  {getProgressText()}
                </p>
              </CardHeader>
              
              <CardContent className="space-y-6 px-6 pb-6">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <div className="flex-1">
                      <span className="text-green-800 font-medium block">
                        Session found
                      </span>
                      <span className="text-green-700 text-sm">
                        {resumeProps.description}
                      </span>
                    </div>
                  </div>
                </div>

                {contractor && (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <div className="text-sm text-gray-600 space-y-1">
                      <div><strong>Company:</strong> {contractor.company_name}</div>
                      <div><strong>Email:</strong> {contractor.email}</div>
                      {contractor.service_area && (
                        <div><strong>Service Area:</strong> {contractor.service_area}</div>
                      )}
                    </div>
                  </div>
                )}

                <Button 
                  onClick={onResume}
                  disabled={isLoading}
                  className="w-full bg-power100-green hover:brightness-90 text-white h-12 text-lg font-semibold group"
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    <>
                      {resumeProps.text}
                      {resumeProps.icon}
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Start Fresh Card */}
            <Card className="bg-white border-0 shadow-2xl rounded-xl">
              <CardHeader className="text-center pb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-gray-500 to-gray-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <ArrowRight className="w-8 h-8 text-white" />
                </div>
                <CardTitle className="text-2xl font-bold text-power100-black">
                  Start Fresh
                </CardTitle>
                <p className="text-power100-grey">
                  Begin a new Power100 Experience
                </p>
              </CardHeader>
              
              <CardContent className="space-y-6 px-6 pb-6">
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <p className="text-gray-700 text-sm">
                    Starting fresh will clear your current session and begin the experience from step 1. 
                    Your previous progress will not be saved.
                  </p>
                </div>

                <Button 
                  onClick={onStartFresh}
                  variant="outline"
                  className="w-full border-gray-300 text-gray-700 hover:bg-gray-50 h-12 text-lg font-semibold group"
                >
                  Start New Experience
                  <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </CardContent>
            </Card>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}