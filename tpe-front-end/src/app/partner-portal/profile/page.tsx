"use client";

import React, { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Building2, Target, FileText, CheckCircle, AlertTriangle, Check } from 'lucide-react';
import { motion } from 'framer-motion';
import { getApiUrl } from '@/utils/api';
import { safeJsonParse, safeJsonStringify, handleApiResponse } from '@/utils/jsonHelpers';

// Constants
const SERVICE_AREAS = [
  { value: 'windows_doors', label: 'Windows & Doors' },
  { value: 'roofing', label: 'Roofing' },
  { value: 'siding', label: 'Siding' },
  { value: 'gutters', label: 'Gutters' },
  { value: 'bath', label: 'Bath' },
  { value: 'hvac', label: 'HVAC' },
  { value: 'plumbing', label: 'Plumbing' },
  { value: 'kitchens', label: 'Kitchens' },
  { value: 'pools', label: 'Pools' },
  { value: 'concrete_coatings', label: 'Concrete/Coatings' },
  { value: 'cleaning_service', label: 'Cleaning/Service Based' },
  { value: 'solar', label: 'Solar' }
];

const TARGET_REVENUE_OPTIONS = [
  { value: '0_5_million', label: '0-5 Million' },
  { value: '5_10_million', label: '5-10 Million' },
  { value: '11_20_million', label: '11-20 Million' },
  { value: '21_30_million', label: '21-30 Million' },
  { value: '31_50_million', label: '31-50 Million' },
  { value: '51_75_million', label: '51-75 Million' },
  { value: '76_150_million', label: '76-150 Million' },
  { value: '151_300_million', label: '151-300 Million' },
  { value: '300_plus_million', label: '300+ Million' }
];

const FOCUS_AREAS_OPTIONS = [
  { value: 'greenfield_growth', label: 'Market Expansion', description: 'Helping contractors expand into new markets' },
  { value: 'closing_higher_percentage', label: 'Sales Conversion', description: 'Improving close rates and sales effectiveness' },
  { value: 'controlling_lead_flow', label: 'Lead Generation', description: 'Managing and optimizing lead flow systems' },
  { value: 'installation_quality', label: 'Service Delivery', description: 'Enhancing installation and service quality' },
  { value: 'hiring_sales_leadership', label: 'Talent Acquisition', description: 'Recruiting sales teams and leadership' },
  { value: 'marketing_automation', label: 'Marketing Systems', description: 'Automating marketing processes' },
  { value: 'customer_retention', label: 'Customer Success', description: 'Building long-term client relationships' },
  { value: 'operational_efficiency', label: 'Operations', description: 'Streamlining internal processes' },
  { value: 'technology_integration', label: 'Technology', description: 'Implementing tech platforms' },
  { value: 'financial_management', label: 'Financial Performance', description: 'Improving profitability and financial systems' }
];

export default function PartnerProfileCompletionPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const partnerId = searchParams.get('partner');
  const eventId = searchParams.get('event');

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [partner, setPartner] = useState<any>(null);
  const [event, setEvent] = useState<any>(null);
  const [missingFields, setMissingFields] = useState<string[]>([]);

  const [formData, setFormData] = useState({
    company_name: '',
    company_description: '',
    primary_contact: '',
    primary_email: '',
    primary_phone: '',
    value_proposition: '',
    focus_areas: [] as string[],
    service_areas: [] as string[],
    target_revenue_audience: [] as string[], // Array to match existing partner forms (limit 3)
    why_clients_choose_you: '', // Competitive analysis (required)
    why_clients_choose_competitors: '' // Competitive analysis (optional)
  });

  // Fetch partner and event data
  useEffect(() => {
    const fetchData = async () => {
      if (!partnerId) {
        setError('Partner ID is required');
        setLoading(false);
        return;
      }

      try {
        // Fetch partner data
        const partnerResponse = await fetch(getApiUrl(`api/partners/${partnerId}`));
        const partnerData = await handleApiResponse(partnerResponse);

        setPartner(partnerData);

        // Fetch event data if eventId provided
        if (eventId) {
          const eventResponse = await fetch(getApiUrl(`api/events/${eventId}`));
          const eventData = await handleApiResponse(eventResponse);
          setEvent(eventData);
        }

        // Pre-populate form data
        const parsedFocusAreas = partnerData.focus_areas
          ? (typeof partnerData.focus_areas === 'string' ? safeJsonParse(partnerData.focus_areas) : partnerData.focus_areas)
          : [];

        const parsedServiceAreas = partnerData.service_areas
          ? (typeof partnerData.service_areas === 'string' ? safeJsonParse(partnerData.service_areas) : partnerData.service_areas)
          : [];

        const parsedTargetRevenue = partnerData.target_revenue_audience
          ? (typeof partnerData.target_revenue_audience === 'string' ? safeJsonParse(partnerData.target_revenue_audience) : partnerData.target_revenue_audience)
          : [];

        setFormData({
          company_name: partnerData.company_name || '',
          company_description: partnerData.company_description || '',
          primary_contact: partnerData.primary_contact || '',
          primary_email: partnerData.primary_email || '',
          primary_phone: partnerData.primary_phone || partnerData.contact_phone || '',
          value_proposition: partnerData.value_proposition || '',
          focus_areas: Array.isArray(parsedFocusAreas) ? parsedFocusAreas : [],
          service_areas: Array.isArray(parsedServiceAreas) ? parsedServiceAreas : [],
          target_revenue_audience: Array.isArray(parsedTargetRevenue) ? parsedTargetRevenue : [],
          why_clients_choose_you: partnerData.why_clients_choose_you || '',
          why_clients_choose_competitors: partnerData.why_clients_choose_competitors || ''
        });

        // Determine missing fields
        const missing: string[] = [];
        if (!partnerData.company_description) missing.push('company_description');
        if (!partnerData.primary_contact) missing.push('primary_contact');
        if (!partnerData.primary_email) missing.push('primary_email');
        if (!partnerData.primary_phone && !partnerData.contact_phone) missing.push('primary_phone');
        if (!partnerData.value_proposition) missing.push('value_proposition');
        if (!parsedFocusAreas || parsedFocusAreas.length === 0) missing.push('focus_areas');
        if (!parsedServiceAreas || parsedServiceAreas.length === 0) missing.push('service_areas');
        if (!parsedTargetRevenue || parsedTargetRevenue.length === 0) missing.push('target_revenue_audience');
        if (!partnerData.why_clients_choose_you) missing.push('why_clients_choose_you');
        // why_clients_choose_competitors is optional, so not checked

        setMissingFields(missing);
        setLoading(false);
      } catch (err: any) {
        console.error('Error fetching data:', err);
        setError(err.message || 'Failed to load profile data');
        setLoading(false);
      }
    };

    fetchData();
  }, [partnerId, eventId]);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const isStepValid = (step: number): boolean => {
    switch (step) {
      case 1: // Company Info
        return !!(formData.company_description && formData.primary_contact && formData.primary_email && formData.primary_phone);
      case 2: // Business Profile
        return !!(formData.value_proposition && formData.target_revenue_audience.length > 0);
      case 3: // Service Areas & Competitive Analysis
        return formData.service_areas.length > 0 && formData.focus_areas.length > 0 && !!formData.why_clients_choose_you;
      default:
        return true;
    }
  };

  const nextStep = () => {
    if (isStepValid(currentStep) && currentStep < 3) {
      setCurrentStep(prev => prev + 1);
      setError(null);
    } else {
      setError('Please complete all required fields before proceeding.');
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
      setError(null);
    }
  };

  const handleSubmit = async () => {
    if (!isStepValid(currentStep)) {
      setError('Please complete all required fields.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const updateData = {
        company_description: formData.company_description,
        primary_contact: formData.primary_contact,
        primary_email: formData.primary_email,
        primary_phone: formData.primary_phone,
        value_proposition: formData.value_proposition,
        focus_areas: formData.focus_areas,
        service_areas: formData.service_areas,
        target_revenue_audience: formData.target_revenue_audience,
        why_clients_choose_you: formData.why_clients_choose_you,
        why_clients_choose_competitors: formData.why_clients_choose_competitors
      };

      const response = await fetch(getApiUrl(`api/partners/${partnerId}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: safeJsonStringify(updateData)
      });

      const result = await handleApiResponse(response);

      if (!result.success && !result.id) {
        throw new Error(result.error || 'Failed to update profile');
      }

      // Redirect to success page
      router.push(`/partner-portal/profile/success?partner=${partnerId}&event=${eventId || ''}`);
    } catch (err: any) {
      console.error('Error updating profile:', err);
      setError(err.message || 'Failed to update profile. Please try again.');
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-power100-bg-grey flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-power100-red mx-auto mb-4"></div>
          <p className="text-power100-grey">Loading your profile...</p>
        </div>
      </div>
    );
  }

  if (error && !partner) {
    return (
      <div className="min-h-screen bg-power100-bg-grey flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Error Loading Profile</h2>
            <p className="text-power100-grey mb-4">{error}</p>
            <Button onClick={() => router.push('/partner-portal')}>
              Go to Partner Portal
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalSteps = 3;
  const steps = [
    { number: 1, title: "Company Info" },
    { number: 2, title: "Business Profile" },
    { number: 3, title: "Services" }
  ];

  return (
    <div className="min-h-screen bg-power100-bg-grey">
      {/* Progress Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-power100-black">
                Complete Your Profile
              </h1>
              {event && (
                <p className="text-power100-grey mt-2">
                  for <strong>{event.name}</strong>
                </p>
              )}
            </div>
            <div className="text-sm text-power100-grey">
              Step {currentStep} of {totalSteps}
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-gray-300 rounded-full h-2 mb-4">
            <motion.div
              className="bg-power100-red h-2 rounded-full"
              initial={{ width: "0%" }}
              animate={{ width: `${(currentStep / totalSteps) * 100}%` }}
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
                      : "bg-gray-400 text-white"
                  }`}
                  initial={{ scale: 0.8 }}
                  animate={{ scale: currentStep === step.number ? 1.1 : 1 }}
                  transition={{ duration: 0.3 }}
                >
                  {currentStep > step.number ? "✓" : step.number}
                </motion.div>
                <span className="text-xs mt-2 text-center max-w-20 text-power100-black">
                  {step.title}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Step Content */}
      <div className="max-w-2xl mx-auto px-6 py-12">
        <form onSubmit={(e) => e.preventDefault()} className="space-y-8">

          {/* Step 1: Company Info */}
          {currentStep === 1 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Card className="w-full bg-white shadow-lg border-0">
                <CardContent className="p-8">
                  <div className="flex justify-center mb-8">
                    <div className="w-16 h-16 bg-power100-red rounded-full flex items-center justify-center">
                      <Building2 className="h-8 w-8 text-white" />
                    </div>
                  </div>

                  <div className="text-center mb-8">
                    <h2 className="text-2xl font-bold text-power100-black mb-2">
                      Company Information
                    </h2>
                    <p className="text-power100-grey">
                      Help us know more about {formData.company_name}
                    </p>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <Label htmlFor="company_description">Company Description *</Label>
                      <Textarea
                        id="company_description"
                        value={formData.company_description}
                        onChange={(e) => handleInputChange('company_description', e.target.value)}
                        placeholder="Briefly describe what your company does..."
                        required
                        className="mt-1"
                        rows={4}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="primary_contact">Contact Name *</Label>
                        <Input
                          id="primary_contact"
                          value={formData.primary_contact}
                          onChange={(e) => handleInputChange('primary_contact', e.target.value)}
                          placeholder="John Smith"
                          required
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="primary_email">Email *</Label>
                        <Input
                          id="primary_email"
                          type="email"
                          value={formData.primary_email}
                          onChange={(e) => handleInputChange('primary_email', e.target.value)}
                          placeholder="john@company.com"
                          required
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="primary_phone">Phone *</Label>
                        <Input
                          id="primary_phone"
                          type="tel"
                          value={formData.primary_phone}
                          onChange={(e) => handleInputChange('primary_phone', e.target.value)}
                          placeholder="(555) 123-4567"
                          required
                          className="mt-1"
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Step 2: Business Profile */}
          {currentStep === 2 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Card className="w-full bg-white shadow-lg border-0">
                <CardContent className="p-8">
                  <div className="flex justify-center mb-8">
                    <div className="w-16 h-16 bg-power100-red rounded-full flex items-center justify-center">
                      <Target className="h-8 w-8 text-white" />
                    </div>
                  </div>

                  <div className="text-center mb-8">
                    <h2 className="text-2xl font-bold text-power100-black mb-2">
                      Business Profile
                    </h2>
                    <p className="text-power100-grey">
                      Tell us about your value and target market
                    </p>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <Label htmlFor="value_proposition">Value Proposition *</Label>
                      <Textarea
                        id="value_proposition"
                        value={formData.value_proposition}
                        onChange={(e) => handleInputChange('value_proposition', e.target.value)}
                        placeholder="What unique value do you provide to contractors?"
                        required
                        className="mt-1"
                        rows={3}
                      />
                    </div>

                    <div>
                      <Label className="font-semibold text-base">Target Client Revenue Range (Select Up To 3) *</Label>
                      <p className="text-sm text-power100-grey mb-3">
                        What is the revenue range of your ideal client?
                      </p>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {TARGET_REVENUE_OPTIONS.map(option => (
                          <div
                            key={option.value}
                            className="flex items-center space-x-2 cursor-pointer"
                            onClick={() => {
                              if (formData.target_revenue_audience.includes(option.value)) {
                                setFormData(prev => ({
                                  ...prev,
                                  target_revenue_audience: prev.target_revenue_audience.filter(r => r !== option.value)
                                }));
                              } else if (formData.target_revenue_audience.length < 3) {
                                setFormData(prev => ({
                                  ...prev,
                                  target_revenue_audience: [...prev.target_revenue_audience, option.value]
                                }));
                              }
                            }}
                          >
                            <div
                              className={`
                                h-4 w-4 shrink-0 rounded-sm border flex items-center justify-center
                                ${formData.target_revenue_audience.includes(option.value)
                                  ? 'bg-black border-black'
                                  : 'border-gray-300 bg-white'
                                }
                                ${!formData.target_revenue_audience.includes(option.value) && formData.target_revenue_audience.length >= 3
                                  ? 'opacity-50 cursor-not-allowed'
                                  : ''
                                }
                              `}
                            >
                              {formData.target_revenue_audience.includes(option.value) && (
                                <Check className="h-3 w-3 text-white" />
                              )}
                            </div>
                            <Label htmlFor={`revenue-${option.value}`} className="text-sm cursor-pointer select-none">
                              {option.label}
                            </Label>
                          </div>
                        ))}
                      </div>
                      <p className="text-sm text-power100-grey mt-2">
                        Selected: {formData.target_revenue_audience.length}/3
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Step 3: Services & Focus Areas */}
          {currentStep === 3 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Card className="w-full bg-white shadow-lg border-0">
                <CardContent className="p-8">
                  <div className="flex justify-center mb-8">
                    <div className="w-16 h-16 bg-power100-red rounded-full flex items-center justify-center">
                      <FileText className="h-8 w-8 text-white" />
                    </div>
                  </div>

                  <div className="text-center mb-8">
                    <h2 className="text-2xl font-bold text-power100-black mb-2">
                      Services & Expertise
                    </h2>
                    <p className="text-power100-grey">
                      Help us match you with the right contractors
                    </p>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <Label className="font-semibold text-base">Service Areas Your Clients Offer *</Label>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-2">
                        {SERVICE_AREAS.map(service => (
                          <div
                            key={service.value}
                            className="flex items-center space-x-2 cursor-pointer"
                            onClick={() => {
                              if (formData.service_areas.includes(service.value)) {
                                handleInputChange('service_areas', formData.service_areas.filter(s => s !== service.value));
                              } else {
                                handleInputChange('service_areas', [...formData.service_areas, service.value]);
                              }
                            }}
                          >
                            <div
                              className={`h-4 w-4 shrink-0 rounded-sm border flex items-center justify-center ${
                                formData.service_areas.includes(service.value)
                                  ? 'bg-black border-black'
                                  : 'border-gray-300 bg-white'
                              }`}
                            >
                              {formData.service_areas.includes(service.value) && (
                                <Check className="h-3 w-3 text-white" />
                              )}
                            </div>
                            <Label className="text-sm cursor-pointer select-none">
                              {service.label}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <Label className="font-semibold text-base">Focus Areas You Address *</Label>
                      <p className="text-sm text-power100-grey mb-3">
                        Select all contractor pain points your solutions address
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {FOCUS_AREAS_OPTIONS.map(area => (
                          <div
                            key={area.value}
                            className={`p-4 rounded-lg border-2 transition-colors cursor-pointer ${
                              formData.focus_areas.includes(area.value)
                                ? 'border-power100-red bg-red-50'
                                : 'border-gray-200 hover:border-power100-red'
                            }`}
                            onClick={() => {
                              if (formData.focus_areas.includes(area.value)) {
                                handleInputChange('focus_areas', formData.focus_areas.filter(a => a !== area.value));
                              } else {
                                handleInputChange('focus_areas', [...formData.focus_areas, area.value]);
                              }
                            }}
                          >
                            <div className="flex items-start space-x-3">
                              <div
                                className={`mt-1 h-4 w-4 shrink-0 rounded-sm border flex items-center justify-center ${
                                  formData.focus_areas.includes(area.value)
                                    ? 'bg-black border-black'
                                    : 'border-gray-300 bg-white'
                                }`}
                              >
                                {formData.focus_areas.includes(area.value) && (
                                  <Check className="h-3 w-3 text-white" />
                                )}
                              </div>
                              <div className="flex-1">
                                <Label className="font-semibold cursor-pointer">{area.label}</Label>
                                <p className="text-sm text-power100-grey mt-1">{area.description}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="why_clients_choose_you">The #1 reason why clients choose you over your competitors *</Label>
                      <Textarea
                        id="why_clients_choose_you"
                        value={formData.why_clients_choose_you}
                        onChange={(e) => handleInputChange('why_clients_choose_you', e.target.value)}
                        placeholder="What makes you stand out from competitors?"
                        required
                        className="mt-1"
                        rows={3}
                      />
                    </div>

                    <div>
                      <Label htmlFor="why_clients_choose_competitors">The #1 reason clients choose competitors over you</Label>
                      <Textarea
                        id="why_clients_choose_competitors"
                        value={formData.why_clients_choose_competitors}
                        onChange={(e) => handleInputChange('why_clients_choose_competitors', e.target.value)}
                        placeholder="What advantages do your competitors have?"
                        className="mt-1"
                        rows={3}
                      />
                      <p className="text-xs text-power100-grey mt-1">Optional</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Error Display */}
          {error && (
            <Alert className="bg-red-50 border-red-200">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-red-700">{error}</AlertDescription>
            </Alert>
          )}

          {/* Navigation */}
          <div className="flex justify-center items-center gap-4 pt-8">
            {currentStep > 1 && (
              <Button
                type="button"
                variant="outline"
                onClick={prevStep}
                disabled={submitting}
                className="px-6 py-2 rounded-full border-power100-grey"
              >
                Back
              </Button>
            )}

            {currentStep === totalSteps ? (
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={submitting || !isStepValid(currentStep)}
                className="bg-power100-green hover:bg-green-700 text-white px-8 py-2 rounded-full font-semibold"
              >
                {submitting ? 'Updating Profile...' : 'Complete Profile'}
              </Button>
            ) : (
              <Button
                type="button"
                onClick={nextStep}
                disabled={!isStepValid(currentStep) || submitting}
                className="bg-power100-green hover:bg-green-700 text-white px-8 py-2 rounded-full font-semibold"
              >
                Continue
              </Button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
