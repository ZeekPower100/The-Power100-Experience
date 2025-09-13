// src/components/contractor-flow/TechStackStep.tsx

import React, { useState, useEffect } from 'react';
import { Contractor } from '@/lib/types/contractor';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Laptop, Settings, ArrowRight, Info } from 'lucide-react';
import { motion } from 'framer-motion';
import { safeJsonParse, safeJsonStringify, handleApiResponse, getFromStorage, setToStorage } from '../../utils/jsonHelpers';

// Tech stack categories from partner onboarding form
const TECH_STACK_CATEGORIES = {
  sales: {
    label: 'Sales & CRM',
    icon: '📊',
    options: ['HubSpot', 'Salesforce', 'Pipedrive', 'CompanyCam', 'Other']
  },
  operations: {
    label: 'Operations Management',
    icon: '⚙️',
    options: ['JobNimbus', 'JobProgress', 'Buildertrend', 'Contractor Foreman', 'Other']
  },
  marketing: {
    label: 'Marketing & Lead Generation',
    icon: '📢',
    options: ['Google Ads', 'Facebook Ads', 'Angi', 'Home Advisor', 'Other']
  },
  customer_experience: {
    label: 'Customer Experience',
    icon: '😊',
    options: ['Podium', 'ServiceTitan', 'Birdeye', 'ReviewBuzz', 'Other']
  },
  project_management: {
    label: 'Project Management',
    icon: '📋',
    options: ['Buildertrend', 'CoConstruct', 'BuilderCloud', 'Procore', 'Other']
  },
  accounting_finance: {
    label: 'Accounting & Finance',
    icon: '💰',
    options: ['QuickBooks', 'Sage', 'Xero', 'FreshBooks', 'Other']
  }
};

interface StepProps {
  data: Partial<Contractor>;
  onNext: () => void;
  onPrev?: () => void;
  onUpdate: (data: Partial<Contractor>) => void;
}

export default function TechStackStep({ data, onNext, onPrev, onUpdate }: StepProps) {
  const [techStack, setTechStack] = useState<Record<string, string[]>>({
    sales: [],
    operations: [],
    marketing: [],
    customer_experience: [],
    project_management: [],
    accounting_finance: []
  });

  const [otherFields, setOtherFields] = useState<Record<string, string>>({
    sales: '',
    operations: '',
    marketing: '',
    customer_experience: '',
    project_management: '',
    accounting_finance: ''
  });

  const [loading, setLoading] = useState(false);

  // Initialize from existing data
  useEffect(() => {
    if (data) {
      const categories = Object.keys(TECH_STACK_CATEGORIES);
      const newTechStack: Record<string, string[]> = {};
      const newOtherFields: Record<string, string> = {};

      categories.forEach(category => {
        // Parse tech stack arrays
        const fieldName = `tech_stack_${category}` as keyof Contractor;
        const otherFieldName = `tech_stack_${category}_other` as keyof Contractor;
        
        let stackArray = data[fieldName] as string[] | string;
        if (typeof stackArray === 'string') {
          try {
            stackArray = safeJsonParse(stackArray);
          } catch {
            stackArray = [];
          }
        }
        newTechStack[category] = Array.isArray(stackArray) ? stackArray : [];
        
        newOtherFields[category] = (data[otherFieldName] as string) || '';
      });

      setTechStack(newTechStack);
      setOtherFields(newOtherFields);
    }
  }, [data]);

  const handleTechStackChange = (category: string, option: string, checked: boolean) => {
    setTechStack(prev => ({
      ...prev,
      [category]: checked 
        ? [...prev[category], option]
        : prev[category].filter(item => item !== option)
    }));
  };

  const handleOtherChange = (category: string, value: string) => {
    setOtherFields(prev => ({
      ...prev,
      [category]: value
    }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    
    try {
      // Prepare tech stack data for submission
      const techStackData: Partial<Contractor> = {};
      
      Object.keys(TECH_STACK_CATEGORIES).forEach(category => {
        const fieldName = `tech_stack_${category}` as keyof Contractor;
        const otherFieldName = `tech_stack_${category}_other` as keyof Contractor;
        
        techStackData[fieldName] = techStack[category] as any;
        techStackData[otherFieldName] = otherFields[category] as any;
      });

      // Update the contractor data
      onUpdate(techStackData);
      
      // Move to next step
      onNext();
    } catch (error) {
      console.error('Error saving tech stack:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate completion percentage
  const totalCategories = Object.keys(TECH_STACK_CATEGORIES).length;
  const completedCategories = Object.values(techStack).filter(stack => stack.length > 0).length;
  const completionPercentage = Math.round((completedCategories / totalCategories) * 100);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }} 
      animate={{ opacity: 1, y: 0 }} 
      transition={{ duration: 0.6 }}
    >
      <Card className="bg-white/70 border-0 shadow-2xl rounded-xl">
        <CardHeader className="text-center pb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
            <Laptop className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-3xl font-bold text-power100-black mb-3">
            Current Technology Stack
          </CardTitle>
          <p className="text-lg text-power100-grey">
            Help us understand what tools you're currently using so we can recommend solutions that integrate well or avoid conflicts.
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
            <div className="flex items-center gap-2 mb-2">
              <Info className="w-4 h-4 text-blue-600" />
              <span className="text-blue-800 font-medium">Why This Matters</span>
            </div>
            <p className="text-blue-700 text-sm">
              We'll use this information to ensure our partner recommendations complement your existing workflow rather than creating conflicts or redundancies.
            </p>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-8 px-8 pb-8">
          {/* Progress indicator */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>Technology Categories Completed</span>
              <span>{completedCategories}/{totalCategories} ({completionPercentage}%)</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <motion.div 
                className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full" 
                initial={{ width: "0%" }} 
                animate={{ width: `${completionPercentage}%` }} 
                transition={{ duration: 0.5 }} 
              />
            </div>
          </div>

          {/* Tech stack categories */}
          <div className="grid gap-6">
            {Object.entries(TECH_STACK_CATEGORIES).map(([category, config]) => (
              <motion.div
                key={category}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: Object.keys(TECH_STACK_CATEGORIES).indexOf(category) * 0.1 }}
                className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm"
              >
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-2xl">{config.icon}</span>
                  <h3 className="text-xl font-semibold text-power100-black">{config.label}</h3>
                  {techStack[category].length > 0 && (
                    <Badge className="bg-green-100 text-green-700">
                      {techStack[category].length} selected
                    </Badge>
                  )}
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
                  {config.options.map(option => (
                    <div key={option} className="flex items-center space-x-2">
                      <Checkbox
                        id={`${category}-${option}`}
                        checked={techStack[category].includes(option)}
                        onCheckedChange={(checked) => 
                          handleTechStackChange(category, option, checked as boolean)
                        }
                      />
                      <Label 
                        htmlFor={`${category}-${option}`}
                        className="text-sm font-medium cursor-pointer"
                      >
                        {option}
                      </Label>
                    </div>
                  ))}
                </div>

                {techStack[category].includes('Other') && (
                  <div className="mt-4">
                    <Label htmlFor={`${category}-other`} className="text-sm font-medium text-gray-700">
                      Please specify other {config.label.toLowerCase()} tools:
                    </Label>
                    <Input
                      id={`${category}-other`}
                      placeholder={`Other ${config.label.toLowerCase()} tools`}
                      value={otherFields[category]}
                      onChange={(e) => handleOtherChange(category, e.target.value)}
                      className="mt-1"
                    />
                  </div>
                )}
              </motion.div>
            ))}
          </div>

          {/* Action buttons */}
          <div className="flex justify-between pt-6">
            {onPrev && (
              <Button variant="outline" onClick={onPrev} className="px-8">
                Back
              </Button>
            )}
            <div className="flex-1" />
            <Button 
              onClick={handleSubmit}
              disabled={loading}
              className="bg-power100-red hover:bg-red-600 text-white px-8 flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  Continue to Matching
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}