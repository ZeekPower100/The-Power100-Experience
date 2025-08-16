// src/app/contractor-flow/page.tsx

"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ContractorFlowProvider, useContractorFlow } from "@/contexts/ContractorFlowContext";

// FIXED: Use correct alias paths for all component imports
import VerificationStep from "@/components/contractor-flow/verificationstep";
import FocusSelectionStep from "@/components/contractor-flow/focusselectionstep";
import ProfilingStep from "@/components/contractor-flow/profilingstep";
import TechStackStep from "@/components/contractor-flow/techstackstep";
import MatchingStep from "@/components/contractor-flow/matchingstep";
import CompletionStep from "@/components/contractor-flow/completionstep";

function ContractorFlowContent() {
  const { state, dispatch } = useContractorFlow();
  const { currentStep, contractor, isLoading, error } = state;

  const steps = [
    { number: 1, title: "Verification", component: VerificationStep },
    { number: 2, title: "Focus Areas", component: FocusSelectionStep },
    { number: 3, title: "Business Profile", component: ProfilingStep },
    { number: 4, title: "Technology Stack", component: TechStackStep },
    { number: 5, title: "Partner Match", component: MatchingStep },
    { number: 6, title: "Complete", component: CompletionStep }
  ];

  const nextStep = () => {
    if (currentStep < steps.length) {
      dispatch({ type: 'SET_STEP', payload: currentStep + 1 });
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      dispatch({ type: 'SET_STEP', payload: currentStep - 1 });
    }
  };

  const CurrentStepComponent = steps[currentStep - 1]?.component;

  return (
    <div className="min-h-screen bg-power100-bg-grey">
      {/* Progress Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-power100-black">
              The Power100 Experience
            </h1>
            <div className="text-sm text-power100-grey">
              Step {currentStep} of {steps.length}
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
            <motion.div
              className="bg-power100-red h-2 rounded-full"
              initial={{ width: "0%" }}
              animate={{ width: `${(currentStep / steps.length) * 100}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>

          {/* Step Indicators */}
          <div className="flex justify-between">
            {steps.map((step) => (
              <div key={step.number} className="flex flex-col items-center">
                <motion.div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                    currentStep > step.number
                      ? "bg-power100-green text-white"
                      : currentStep === step.number
                      ? "bg-power100-red text-white"
                      : "bg-gray-300 text-gray-600"
                  }`}
                  initial={{ scale: 0.8 }}
                  animate={{ scale: currentStep === step.number ? 1.1 : 1 }}
                  transition={{ duration: 0.3 }}
                >
                  {currentStep > step.number ? "✓" : step.number}
                </motion.div>
                <span className="text-xs mt-2 text-center max-w-20">
                  {step.title}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Step Content */}
      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Loading State */}
        {isLoading && (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-power100-red"></div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Step Component */}
        {!isLoading && CurrentStepComponent && (
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <CurrentStepComponent
                data={contractor || {}}
                onNext={nextStep}
                onPrev={prevStep}
                onUpdate={(updates) => dispatch({ type: 'UPDATE_CONTRACTOR', payload: updates })}
              />
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}

// Main component with provider
export default function ContractorFlow() {
  return (
    <ContractorFlowProvider>
      <ContractorFlowContent />
    </ContractorFlowProvider>
  );
}