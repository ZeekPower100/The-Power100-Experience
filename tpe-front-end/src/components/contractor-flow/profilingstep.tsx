// src/components/contractor-flow/ProfilingStep.tsx

import React, { useState } from 'react';
import { Contractor } from '@/lib/types/contractor';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Building2, ArrowRight, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';

// Define the props interface for type safety
interface StepProps {
  data: Partial<Contractor>;
  onComplete: (data: Partial<Contractor>) => void;
  onBack: (() => void) | null;
}

const serviceOptions = [
  "Roofing", "HVAC", "Solar Installation", "Windows & Doors", 
  "Siding", "Flooring", "Kitchen Remodeling", "Bathroom Remodeling",
  "Electrical", "Plumbing", "Landscaping", "Painting", "Insulation"
];

export default function ProfilingStep({ data, onComplete, onBack }: StepProps) {
  // We ensure team_size is a number for the input, but handle it as a string for display
  const [formData, setFormData] = useState({
    service_area: data.service_area || '',
    services_offered: data.services_offered || [],
    annual_revenue: data.annual_revenue || '',
    team_size: data.team_size?.toString() || '',
    readiness_indicators: data.readiness_indicators || {
      increased_tools: false, increased_people: false, increased_activity: false
    },
    opted_in_coaching: data.opted_in_coaching || false,
  });
  const [error, setError] = useState('');

  const handleInputChange = (field: keyof typeof formData, value: string | number | { increased_tools: boolean; increased_people: boolean; increased_activity: boolean }) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError('');
  };

  const handleServiceToggle = (service: string) => {
    setFormData(prev => ({
      ...prev,
      services_offered: prev.services_offered.includes(service)
        ? prev.services_offered.filter(s => s !== service)
        : [...prev.services_offered, service],
    }));
  };

  const handleReadinessToggle = (indicator: keyof typeof formData.readiness_indicators) => {
    setFormData(prev => ({
      ...prev,
      readiness_indicators: {
        ...prev.readiness_indicators,
        [indicator]: !prev.readiness_indicators[indicator],
      },
    }));
  };

  const handleContinue = () => {
    if (!formData.service_area || !formData.annual_revenue || !formData.team_size) {
      setError('Please fill in all required fields.');
      return;
    }
    if (formData.services_offered.length === 0) {
      setError('Please select at least one service you offer.');
      return;
    }
    setError('');
    onComplete({
      ...formData,
      team_size: parseInt(formData.team_size, 10) || 0, // Ensure team_size is a number
    });
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
      <Card className="bg-white/70 border-0 shadow-2xl rounded-xl">
        <CardHeader className="text-center pb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-power100-red-deep to-power100-red rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-3xl font-bold text-power100-black mb-3">
            Tell Us About Your Business
          </CardTitle>
          <p className="text-lg text-power100-grey">
            This helps us find the perfect partner match for your needs.
          </p>
        </CardHeader>
        
        <CardContent className="space-y-8 px-8 pb-8">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="service_area" className="text-sm font-semibold text-gray-700">Service Area *</Label>
              <Input id="service_area" value={formData.service_area} onChange={(e) => handleInputChange('service_area', e.target.value)} className="mt-2 h-12" placeholder="e.g., Dallas-Fort Worth, Texas" />
            </div>
            <div>
              <Label htmlFor="annual_revenue" className="text-sm font-semibold text-gray-700">Annual Revenue Range *</Label>
              <Select value={formData.annual_revenue} onValueChange={(value) => handleInputChange('annual_revenue', value)}>
                <SelectTrigger className="mt-2 h-12"><SelectValue placeholder="Select revenue range" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="under_500k">Under $500K</SelectItem>
                  <SelectItem value="500k_1m">$500K - $1M</SelectItem>
                  <SelectItem value="1m_5m">$1M - $5M</SelectItem>
                  <SelectItem value="5m_10m">$5M - $10M</SelectItem>
                  <SelectItem value="over_10m">Over $10M</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label htmlFor="team_size" className="text-sm font-semibold text-gray-700">Team Size (Total Employees) *</Label>
            <Input id="team_size" type="number" value={formData.team_size} onChange={(e) => handleInputChange('team_size', e.target.value)} className="mt-2 h-12" placeholder="25" min="1" />
          </div>
          <div>
            <Label className="text-sm font-semibold text-gray-700 mb-4 block">Services You Offer *</Label>
            <div className="grid md:grid-cols-3 gap-3">
              {serviceOptions.map((service) => (
                <div key={service} className={`flex items-center space-x-2 p-3 rounded-lg border cursor-pointer transition-all duration-200 ${ formData.services_offered.includes(service) ? 'border-power100-red bg-red-50' : 'border-gray-200 hover:border-gray-300' }`} onClick={() => handleServiceToggle(service)}>
                  <Checkbox checked={formData.services_offered.includes(service)} />
                  <span className="text-sm font-medium text-power100-black">{service}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
            <h3 className="font-semibold text-gray-800 mb-4">For your selected focus areas, have you recently:</h3>
            <div className="space-y-3">
              {[
                { key: 'increased_tools', label: 'Increased tools or technology investments' },
                { key: 'increased_people', label: 'Added new team members or dedicated resources' },
                { key: 'increased_activity', label: 'Increased activity or initiatives in these areas' }
              ].map((indicator) => (
                <div key={indicator.key} className="flex items-center space-x-3 cursor-pointer" onClick={() => handleReadinessToggle(indicator.key as keyof typeof formData.readiness_indicators)}>
                  <Checkbox checked={formData.readiness_indicators[indicator.key as keyof typeof formData.readiness_indicators]} />
                  <span className="text-gray-700">{indicator.label}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <div className="flex items-start space-x-3 cursor-pointer" onClick={() => handleInputChange('opted_in_coaching', !formData.opted_in_coaching)}>
              <Checkbox checked={formData.opted_in_coaching} className="mt-1" />
              <div>
                <h4 className="font-semibold text-red-900">Weekly AI Coaching (Optional)</h4>
                <p className="text-sm text-red-800 mt-1">Get weekly check-ins with our AI Concierge to review wins, challenges, and receive strategic introductions.</p>
              </div>
            </div>
          </div>
          {error && <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertDescription>{error}</AlertDescription></Alert>}
          <div className="flex gap-4 pt-6">
            <Button variant="outline" onClick={onBack!} className="flex-1 h-12 text-lg">Back</Button>
            <Button onClick={handleContinue} className="flex-1 bg-power100-green hover:brightness-90 transition-all duration-300 text-white shadow-lg h-12 text-lg font-semibold group">
              Find My Match
              <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}