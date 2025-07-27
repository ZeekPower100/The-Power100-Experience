
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Contractor } from "@/entities/Contractor";
import { motion, AnimatePresence } from "framer-motion";

// Import step components
import VerificationStep from "../components/contractor-flow/VerificationStep";
import FocusSelectionStep from "../components/contractor-flow/FocusSelectionStep";
import ProfilingStep from "../components/contractor-flow/ProfilingStep";
import MatchingStep from "../components/contractor-flow/MatchingStep";
import CompletionStep from "../components/contractor-flow/CompletionStep";

export default function ContractorFlow() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [contractorData, setContractorData] = useState({
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
  });
  const [contractorId, setContractorId] = useState(null);

  const steps = [
    { number: 1, title: "Verification", component: VerificationStep },
    { number: 2, title: "Focus Areas", component: FocusSelectionStep },
    { number: 3, title: "Business Profile", component: ProfilingStep },
    { number: 4, title: "Partner Match", component: MatchingStep },
    { number: 5, title: "Complete", component: CompletionStep }
  ];

  const updateContractorData = (newData) => {
    setContractorData(prev => ({ ...prev, ...newData }));
  };

  const handleStepComplete = async (stepData) => {
    updateContractorData(stepData);
    
    try {
      if (contractorId) {
        await Contractor.update(contractorId, { ...contractorData, ...stepData });
      } else {
        const contractor = await Contractor.create({ ...contractorData, ...stepData });
        setContractorId(contractor.id);
      }
      
      if (currentStep < steps.length) {
        setCurrentStep(currentStep + 1);
      }
    } catch (error) {
      console.error("Error saving contractor data:", error);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const CurrentStepComponent = steps[currentStep - 1].component;

  return (
    <div className="min-h-screen bg-[var(--power100-bg-grey)]">
      {/* Progress Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-black">Power100 Experience</h1>
            <div className="text-sm text-[var(--power100-grey)]">
              Step {currentStep} of {steps.length}
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="flex items-center space-x-4">
            {steps.map((step, index) => (
              <div key={step.number} className="flex items-center">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 transition-all duration-300 ${
                  step.number < currentStep 
                    ? 'bg-[var(--power100-red)] border-[var(--power100-red)] text-white' 
                    : step.number === currentStep 
                    ? 'border-[var(--power100-red)] text-[var(--power100-red)] bg-red-50' 
                    : 'border-gray-300 text-gray-400'
                }`}>
                  {step.number < currentStep ? '✓' : step.number}
                </div>
                <span className={`ml-2 text-sm font-medium ${
                  step.number <= currentStep ? 'text-black' : 'text-gray-400'
                }`}>
                  {step.title}
                </span>
                {index < steps.length - 1 && (
                  <div className={`ml-4 w-12 h-0.5 ${
                    step.number < currentStep ? 'bg-[var(--power100-red)]' : 'bg-gray-300'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Step Content */}
      <div className="max-w-4xl mx-auto px-6 py-12">
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
              contractorId={contractorId}
            />
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
