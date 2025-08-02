// src/app/contractor-flow/page.tsx

"use client";

import React, { useState } from "react";
// FIXED: Use the correct router from Next.js
// import { useRouter } from "next/navigation"; // Will be used for future navigation 
// FIXED: Use the correct import path for our data types
import { Contractor } from "@/lib/types/contractor"; 
import { motion, AnimatePresence } from "framer-motion";

// FIXED: Use correct alias paths for all component imports
import VerificationStep from "@/components/contractor-flow/verificationstep";
import FocusSelectionStep from "@/components/contractor-flow/focusselectionstep";
import ProfilingStep from "@/components/contractor-flow/profilingstep";
import MatchingStep from "@/components/contractor-flow/matchingstep";
import CompletionStep from "@/components/contractor-flow/completionstep";

// This is a default, empty state for our Contractor type
const initialContractorData: Contractor = {
  id: "",
  name: "",
  email: "",
  phone: "",
  company_name: "",
  company_website: "",
  service_area: "",
  services_offered: [],
  focus_areas: [],
  primary_focus_area: "",
  annual_revenue: "",
  team_size: 0,
  readiness_indicators: {
    increased_tools: false,
    increased_people: false,
    increased_activity: false
  },
  opted_in_coaching: false,
  verification_status: "pending"
};

export default function ContractorFlow() {
  // FIXED: Renamed 'navigate' to 'router' to match Next.js conventions
  // const router = useRouter(); // Commented out - will be used for future navigation 
  const [currentStep, setCurrentStep] = useState(1);
  const [contractorData, setContractorData] = useState<Contractor>(initialContractorData);

  const steps = [
    { number: 1, title: "Verification", component: VerificationStep },
    { number: 2, title: "Focus Areas", component: FocusSelectionStep },
    { number: 3, title: "Business Profile", component: ProfilingStep },
    { number: 4, title: "Partner Match", component: MatchingStep },
    { number: 5, title: "Complete", component: CompletionStep }
  ];

  const updateContractorData = (newData: Partial<Contractor>) => {
    setContractorData(prev => ({ ...prev, ...newData }));
  };

  // --- MAJOR FIX: Data Handling Logic ---
  // This function now simulates making an API call to a future backend.
  // It no longer tries to call database methods directly.
  const handleStepComplete = async (stepData: Partial<Contractor>) => {
    const updatedData = { ...contractorData, ...stepData };
    updateContractorData(updatedData);
    
    console.log("Saving data for Step " + currentStep, updatedData);
    // In the future, this is where you would make an API call:
    // try {
    //   const response = await fetch('/api/contractor', {
    //     method: 'POST',
    //     headers: { 'Content-Type': 'application/json' },
    //     body: JSON.stringify(updatedData),
    //   });
    //   const savedContractor = await response.json();
    //   setContractorData(savedContractor); // Update state with data from backend (including ID)
    // } catch (error) {
    //   console.error("Error saving contractor data:", error);
    //   // Here you would show an error message to the user
    //   return; // Stop the flow if saving fails
    // }
    
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    } else {
      // If this is the last step, maybe navigate to a "thank you" page
      // router.push('/thank-you');
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const CurrentStepComponent = steps[currentStep - 1].component;

  return (
    <div className="min-h-screen bg-power100-bg-grey">
      {/* Progress Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-power100-black">Power100 Experience</h1>
            <div className="text-sm text-power100-grey">
              Step {currentStep} of {steps.length}
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="flex items-center space-x-4">
            {steps.map((step, index) => (
              <div key={step.number} className="flex items-center">
                {/* FIXED: Replaced CSS variables with Tailwind utility classes */}
                <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 transition-all duration-300 ${
                  step.number < currentStep 
                    ? 'bg-power100-red border-power100-red text-white' 
                    : step.number === currentStep 
                    ? 'border-power100-red text-power100-red bg-red-50' 
                    : 'border-gray-300 text-gray-400'
                }`}>
                  {step.number < currentStep ? '✓' : step.number}
                </div>
                <span className={`ml-2 text-sm font-medium ${
                  step.number <= currentStep ? 'text-power100-black' : 'text-gray-400'
                }`}>
                  {step.title}
                </span>
                {index < steps.length - 1 && (
                  <div className={`ml-4 w-12 h-0.5 ${
                    step.number < currentStep ? 'bg-power100-red' : 'bg-gray-300'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Step Content */}
      <div className="max-w-4xl mx-a uto px-6 py-12">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.4 }}
          >
            <CurrentStepComponent
              data={contractorData}
              onComplete={handleStepComplete}
              onBack={currentStep > 1 ? handleBack : null}
            />
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}