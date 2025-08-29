// src/components/contractor-flow/FocusSelectionStep.tsx

import React, { useState } from 'react';
import { Contractor, FocusArea } from '@/lib/types/contractor';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Target, ArrowRight, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { contractorApi } from '@/lib/api';

// Define the props interface for type safety
interface StepProps {
  data: Partial<Contractor>;
  onNext: () => void;
  onPrev?: () => void;
  onUpdate: (data: Partial<Contractor>) => void;
}

const focusAreaOptions: { id: FocusArea; title: string; description: string }[] = [
  { id: 'greenfield_growth', title: 'Greenfield Growth', description: 'Expanding into new markets and territories.' },
  { id: 'closing_higher_percentage', title: 'Closing Higher %', description: 'Improving sales conversion rates.' },
  { id: 'controlling_lead_flow', title: 'Controlling Lead Flow', description: 'Managing and optimizing lead generation.' },
  { id: 'installation_quality', title: 'Installation Quality', description: 'Enhancing service delivery standards.' },
  { id: 'hiring_sales_leadership', title: 'Hiring Sales/Leadership', description: 'Building and scaling your team.' },
  { id: 'marketing_automation', title: 'Marketing Automation', description: 'Streamlining marketing processes.' },
  { id: 'customer_retention', title: 'Customer Retention', description: 'Building long-term client relationships.' },
  { id: 'operational_efficiency', title: 'Operational Efficiency', description: 'Optimizing internal processes.' },
  { id: 'technology_integration', title: 'Technology Integration', description: 'Implementing new tech solutions.' },
  { id: 'financial_management', title: 'Financial Management', description: 'Improving cash flow and profitability.' }
];

export default function FocusSelectionStep({ data, onNext, onPrev, onUpdate }: StepProps) {
  const [selectedAreas, setSelectedAreas] = useState<FocusArea[]>(data.focus_areas || []);
  const [readinessIndicators, setReadinessIndicators] = useState({
    increased_tools: data.increased_tools || false,
    increased_people: data.increased_people || false,
    increased_activity: data.increased_activity || false,
  });
  const [error, setError] = useState('');

  const toggleFocusArea = (areaId: FocusArea) => {
    setSelectedAreas(prev => {
      if (prev.includes(areaId)) {
        return prev.filter(id => id !== areaId);
      }
      if (prev.length < 3) {
        return [...prev, areaId];
      }
      // If we are at the limit, do not add more
      setError("You can select a maximum of 3 focus areas.");
      return prev;
    });
  };

  const handleReadinessToggle = (indicator: keyof typeof readinessIndicators) => {
    setReadinessIndicators(prev => ({
      ...prev,
      [indicator]: !prev[indicator],
    }));
  };

  const handleContinue = async () => {
    if (selectedAreas.length === 0) {
      setError('Please select at least one focus area.');
      return;
    }
    
    setError(''); // Clear error on successful continue
    
    const updateData = { 
      focus_areas: selectedAreas, 
      primary_focus_area: selectedAreas[0],
      increased_tools: readinessIndicators.increased_tools,
      increased_people: readinessIndicators.increased_people,
      increased_activity: readinessIndicators.increased_activity,
      current_stage: 'focus_selection'
    };

    try {
      // Persist to database if contractor ID exists
      if (data.id) {
        await contractorApi.updateProfile(data.id, updateData);
      }
      
      onUpdate(updateData);
      onNext();
    } catch (error) {
      console.error('Failed to update focus areas:', error);
      // Still proceed but show warning
      setError('Warning: Changes may not be saved. Please check your connection.');
      onUpdate(updateData);
      onNext();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      <Card className="bg-white/70 border-0 shadow-2xl rounded-xl">
        <CardHeader className="text-center pb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-power100-red to-red-700 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
            <Target className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-3xl font-bold text-power100-black mb-3">
            What Are Your Top Focus Areas?
          </CardTitle>
          <p className="text-lg text-power100-grey">
            Select up to 3 areas to improve over the next 12-18 months.
          </p>
          
          {selectedAreas.length > 0 && (
            <div className="mt-4">
              <Badge variant="outline" className="text-power100-red border-power100-red bg-red-50">
                {selectedAreas.length}/3 selected
              </Badge>
            </div>
          )}
        </CardHeader>
        
        <CardContent className="space-y-6 px-8 pb-8">
          <div className="grid md:grid-cols-2 gap-4">
            {focusAreaOptions.map((area, index) => (
              <motion.div
                key={area.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.05 }}
                // FIXED: Simplified styling and improved state indication
                className={`p-6 rounded-xl border-2 cursor-pointer transition-all duration-300 hover:shadow-lg ${
                  selectedAreas.includes(area.id as FocusArea)
                    ? 'border-power100-red bg-red-50 shadow-md'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
                onClick={() => toggleFocusArea(area.id as FocusArea)}
              >
                <div className="flex items-start space-x-4">
                  <Checkbox
                    checked={selectedAreas.includes(area.id as FocusArea)}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <h3 className="font-semibold text-power100-black mb-2">{area.title}</h3>
                    <p className="text-sm text-power100-grey">{area.description}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {selectedAreas.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="bg-gray-50 border border-gray-200 rounded-lg p-4"
            >
              <h4 className="font-semibold text-gray-800 mb-2">Your Selected Focus Areas:</h4>
              <div className="flex flex-wrap gap-2">
                {selectedAreas.map(areaId => {
                  const area = focusAreaOptions.find(a => a.id === areaId);
                  return (
                    <Badge key={areaId} variant="secondary">
                      {area?.title}
                    </Badge>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* Readiness Indicators Section */}
          {selectedAreas.length > 0 && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
              <h3 className="font-semibold text-gray-800 mb-4">For Your Selected Focus Areas, Have You Recently:</h3>
              <div className="space-y-3">
                {[
                  { key: 'increased_tools', label: 'Increased tools or technology investments' },
                  { key: 'increased_people', label: 'Added new team members or dedicated resources' },
                  { key: 'increased_activity', label: 'Increased activity or initiatives in these areas' }
                ].map((indicator) => (
                  <div 
                    key={indicator.key} 
                    className="flex items-center space-x-3 cursor-pointer" 
                    onClick={() => handleReadinessToggle(indicator.key as keyof typeof readinessIndicators)}
                  >
                    <Checkbox checked={readinessIndicators[indicator.key as keyof typeof readinessIndicators]} />
                    <span className="text-gray-700">{indicator.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-4 pt-6">
            {onPrev && (
              <Button
                variant="outline"
                onClick={onPrev}
                className="flex-1 h-12 text-lg"
              >
                Back
              </Button>
            )}
            <Button
              onClick={handleContinue}
              disabled={selectedAreas.length === 0}
              className="flex-1 bg-power100-green hover:brightness-90 transition-all duration-300 text-white shadow-lg h-12 text-lg font-semibold group"
            >
              Continue
              <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}