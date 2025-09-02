"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { SimpleDynamicList } from '@/components/ui/simple-dynamic-list';
import { ClientReferenceList, type ClientReference } from '@/components/ui/client-reference-list';
import { DemoUploadList, type DemoItem } from '@/components/ui/demo-upload-list';
import LogoManager from '@/components/admin/LogoManager';
import { partnerApi } from '@/lib/api';
import { getApiUrl } from '@/utils/api';
import { Building2, AlertTriangle, Users, FileText, Star, Target, CheckCircle, Plus, X, Search, UserPlus } from 'lucide-react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';

// Constants for form options
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

const OWNERSHIP_TYPES = [
  { value: 'private_independent', label: 'Private/Independent' },
  { value: 'public', label: 'Public' },
  { value: 'big_box', label: 'Big Box' },
  { value: 'franchise', label: 'Franchise' },
  { value: 'pe_funding', label: 'PE Funding' }
];

const FOCUS_AREAS_12_MONTHS = [
  { value: 'revenue_growth', label: 'Revenue Growth' },
  { value: 'team_building', label: 'Team Building' },
  { value: 'operations', label: 'Operations' },
  { value: 'customer_experience', label: 'Customer Experience' },
  { value: 'technology', label: 'Technology' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'sales', label: 'Sales' },
  { value: 'financing', label: 'Financing' }
];

export default function PartnerOnboardingForm() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 8;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Partner search state
  const [partnerSearchQuery, setPartnerSearchQuery] = useState('');
  const [partnerSearchResults, setPartnerSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showNewPartnerModal, setShowNewPartnerModal] = useState(false);
  const [newPartnerData, setNewPartnerData] = useState({
    company_name: '',
    contact_name: '',
    contact_email: '',
    contact_phone: ''
  });

  const [formData, setFormData] = useState({
    // Company Information
    company_name: '',
    established_year: '',
    employee_count: '',
    client_count: '',
    website: '',
    logo_url: null as string | null,
    ownership_type: '',
    
    // Contact Information
    ceo_name: '',
    ceo_email: '',
    ceo_phone: '',
    cx_name: '',
    cx_email: '',
    cx_phone: '',
    sales_name: '',
    sales_email: '',
    sales_phone: '',
    onboarding_name: '',
    onboarding_email: '',
    onboarding_phone: '',
    marketing_name: '',
    marketing_email: '',
    marketing_phone: '',
    
    // Target Audience - Revenue (limit 3)
    target_revenue_audience: [] as string[],
    
    // Service Areas
    service_areas: [] as string[],
    service_areas_other: '',
    
    // Sponsorships & Media
    sponsored_events: [] as string[],
    other_sponsored_events: [] as string[],
    podcast_appearances: [] as string[],
    other_podcast_appearances: [] as string[],
    books_read_recommended: '',
    
    // Competitive Analysis
    service_category: '',
    value_proposition: '',
    why_clients_choose_you: '',
    why_clients_choose_competitors: '',
    
    // Focus Areas for next 12 months (select 3)
    focus_areas_12_months: [] as string[],
    
    // Strategic Partners (top 3)
    strategic_partners: [] as Array<{
      id?: string;
      company_name: string;
      is_new?: boolean;
      contact_name?: string;
      contact_email?: string;
      contact_phone?: string;
    }>,
    
    // Client Demos & References
    client_demos: [] as DemoItem[],
    client_references: [] as ClientReference[],
    
    // Default values
    is_active: true
  });

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Search partners when query changes
  useEffect(() => {
    const searchPartners = async () => {
      if (partnerSearchQuery.trim().length < 2) {
        setPartnerSearchResults([]);
        return;
      }

      setIsSearching(true);
      try {
        const response = await fetch(
          `${getApiUrl('api/partners/public/search')}?q=${encodeURIComponent(partnerSearchQuery)}`
        );
        if (response.ok) {
          const results = await response.json();
          setPartnerSearchResults(results);
        }
      } catch (error) {
        console.error('Error searching partners:', error);
      } finally {
        setIsSearching(false);
      }
    };

    const debounceTimer = setTimeout(searchPartners, 300);
    return () => clearTimeout(debounceTimer);
  }, [partnerSearchQuery]);

  const addPartner = (partner: any) => {
    if (formData.strategic_partners.length >= 3) {
      setError('You can only add up to 3 strategic partners');
      return;
    }

    const partnerData = partner.id 
      ? { id: partner.id, company_name: partner.company_name }
      : { ...partner, is_new: true };

    setFormData(prev => ({
      ...prev,
      strategic_partners: [...prev.strategic_partners, partnerData]
    }));
    
    setPartnerSearchQuery('');
    setPartnerSearchResults([]);
  };

  const removePartner = (index: number) => {
    setFormData(prev => ({
      ...prev,
      strategic_partners: prev.strategic_partners.filter((_, i) => i !== index)
    }));
  };

  const addNewPartner = () => {
    // No validation required - all fields are optional
    addPartner(newPartnerData);
    setNewPartnerData({
      company_name: '',
      contact_name: '',
      contact_email: '',
      contact_phone: ''
    });
    setShowNewPartnerModal(false);
  };

  const isStepValid = (step: number): boolean => {
    switch (step) {
      case 1: // Company Information
        return !!(formData.company_name && formData.established_year && formData.website);
      case 2: // Contact Information
        return !!(formData.ceo_name && formData.ceo_email);
      case 3: // Target Audience
        return formData.target_revenue_audience.length > 0 && formData.service_areas.length > 0;
      case 4: // Sponsorships & Media
        return true; // Optional step
      case 5: // Competitive Analysis
        return !!(formData.value_proposition && formData.why_clients_choose_you);
      case 6: // Focus Areas
        return formData.focus_areas_12_months.length > 0;
      case 7: // Partners
        return formData.strategic_partners.length > 0; // At least one partner required
      case 8: // Client Demos
        return true; // Optional step
      default:
        return true;
    }
  };
  
  const nextStep = () => {
    if (isStepValid(currentStep) && currentStep < totalSteps) {
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

  const handleSubmit = async (e?: React.FormEvent | React.MouseEvent) => {
    if (e) {
      e.preventDefault();
    }
    
    // Only allow submission on Step 8
    if (currentStep !== 8) {
      return;
    }
    
    setLoading(true);
    setError(null);

    try {
      // Validate required fields
      if (!formData.company_name.trim()) {
        throw new Error('Company name is required');
      }
      if (!formData.established_year) {
        throw new Error('Established year is required');
      }
      if (!formData.ceo_name || !formData.ceo_email) {
        throw new Error('CEO contact information is required');
      }
      if (formData.target_revenue_audience.length === 0) {
        throw new Error('At least one target revenue range is required');
      }
      if (formData.target_revenue_audience.length > 3) {
        throw new Error('Maximum 3 target revenue ranges allowed');
      }
      if (formData.service_areas.length === 0) {
        throw new Error('At least one service area is required');
      }
      if (formData.focus_areas_12_months.length === 0) {
        throw new Error('At least one focus area for next 12 months is required');
      }
      if (formData.focus_areas_12_months.length > 3) {
        throw new Error('Maximum 3 focus areas for next 12 months allowed');
      }

      // Prepare data for API - Using comprehensive onboarding field names
      const apiData = {
        // Basic Info
        company_name: formData.company_name,
        description: formData.value_proposition || '',
        website: formData.website,
        logo_url: formData.logo_url,
        primary_email: formData.ceo_email,
        contact_phone: formData.ceo_phone,
        
        // Legacy fields for backward compatibility
        focus_areas_served: formData.service_areas,
        target_revenue_range: formData.target_revenue_audience,
        geographic_regions: [],
        powerconfidence_score: 0,
        pricing_model: '',
        onboarding_process: '',
        key_differentiators: [],
        client_testimonials: [],
        is_active: formData.is_active,
        last_quarterly_report: '',
        
        // Comprehensive Onboarding Fields - Step 1: Company Information
        established_year: formData.established_year,
        employee_count: formData.employee_count,
        ownership_type: formData.ownership_type,
        company_description: formData.company_description,
        
        // Step 2: Contact Information (5 contact types)
        ceo_contact_name: formData.ceo_name,
        ceo_primary_email: formData.ceo_email,
        ceo_contact_phone: formData.ceo_phone,
        ceo_contact_title: formData.ceo_title,
        cx_contact_name: formData.cx_name,
        cx_primary_email: formData.cx_email,
        cx_contact_phone: formData.cx_phone,
        cx_contact_title: formData.cx_title,
        sales_contact_name: formData.sales_name,
        sales_primary_email: formData.sales_email,
        sales_contact_phone: formData.sales_phone,
        sales_contact_title: formData.sales_title,
        onboarding_contact_name: formData.onboarding_name,
        onboarding_primary_email: formData.onboarding_email,
        onboarding_contact_phone: formData.onboarding_phone,
        onboarding_contact_title: formData.onboarding_title,
        marketing_contact_name: formData.marketing_name,
        marketing_primary_email: formData.marketing_email,
        marketing_contact_phone: formData.marketing_phone,
        marketing_contact_title: formData.marketing_title,
        
        // Step 3: Target Audience
        target_revenue_audience: formData.target_revenue_audience,
        service_areas: formData.service_areas,
        service_areas_other: formData.service_areas_other,
        
        // Step 4: Competitive Analysis
        service_category: formData.service_category,
        value_proposition: formData.value_proposition,
        why_clients_choose_you: formData.why_clients_choose_you,
        why_clients_choose_competitors: formData.why_clients_choose_competitors,
        
        // Step 5: Business Focus
        focus_areas_12_months: formData.focus_areas_12_months,
        
        // Step 6: Marketing & Sponsorships
        sponsored_events: formData.sponsored_events,
        podcast_appearances: formData.podcast_appearances,
        books_read_recommended: formData.books_read_recommended,
        
        // Step 7: Strategic Partners
        strategic_partners: formData.strategic_partners,
        
        // Step 8: Client Demos & References
        client_demos: formData.client_demos,
        client_references: formData.client_references
      };

      // Submit to API
      // Use public endpoint for submissions
      const response = await fetch(getApiUrl('api/partners/public/apply'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(apiData)
      });
      const result = await response.json();
      if (!result.success) throw new Error(result.error);
      
      // Redirect to success page
      router.push('/partner/onboarding/success');

    } catch (err: any) {
      console.error('Onboarding submission error:', err);
      setError(err.message || 'Failed to submit partner application. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    { number: 1, title: "Company Info", component: null },
    { number: 2, title: "Contacts", component: null },
    { number: 3, title: "Target Market", component: null },
    { number: 4, title: "Media & Events", component: null },
    { number: 5, title: "Positioning", component: null },
    { number: 6, title: "Focus Areas", component: null },
    { number: 7, title: "Partners", component: null },
    { number: 8, title: "Portfolio", component: null }
  ];

  return (
    <div className="min-h-screen bg-power100-bg-grey">
      {/* Progress Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-power100-black">
                Partner Onboarding
              </h1>
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

      {/* Step Content - Centered Card Layout */}
      <div className="max-w-2xl mx-auto px-6 py-12">
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Step 1: Company Information */}
          {currentStep === 1 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="max-w-2xl mx-auto"
            >
              <Card className="w-full bg-white shadow-lg border-0">
                <CardContent className="p-8">
                  {/* Red circular icon at top */}
                  <div className="flex justify-center mb-8">
                    <div className="w-16 h-16 bg-power100-red rounded-full flex items-center justify-center">
                      <Building2 className="h-8 w-8 text-white" />
                    </div>
                  </div>
                  
                  {/* Title */}
                  <div className="text-center mb-8">
                    <h2 className="text-2xl font-bold text-power100-black mb-2">
                      Company Information
                    </h2>
                    <p className="text-power100-grey">
                      Basic information about your company
                    </p>
                  </div>
                  
                  {/* Form Fields */}
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <Label htmlFor="company_name">Company Name *</Label>
                        <Input
                          id="company_name"
                          value={formData.company_name}
                          onChange={(e) => handleInputChange('company_name', e.target.value)}
                          placeholder="Enter company name"
                          required
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="established_year">Year Established *</Label>
                        <Input
                          id="established_year"
                          type="number"
                          min="1900"
                          max={new Date().getFullYear()}
                          value={formData.established_year}
                          onChange={(e) => handleInputChange('established_year', e.target.value)}
                          placeholder="YYYY"
                          required
                          className="mt-1"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <Label htmlFor="employee_count">Employee Count</Label>
                        <Input
                          id="employee_count"
                          type="number"
                          value={formData.employee_count}
                          onChange={(e) => handleInputChange('employee_count', e.target.value)}
                          placeholder="Number of employees"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="client_count">Client Count</Label>
                        <Input
                          id="client_count"
                          type="number"
                          value={formData.client_count}
                          onChange={(e) => handleInputChange('client_count', e.target.value)}
                          placeholder="Number of clients"
                          className="mt-1"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <Label htmlFor="website">Company Website *</Label>
                        <Input
                          id="website"
                          value={formData.website}
                          onChange={(e) => handleInputChange('website', e.target.value)}
                          placeholder="https://company.com"
                          required
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label>Ownership Type</Label>
                        <select
                          value={formData.ownership_type}
                          onChange={(e) => handleInputChange('ownership_type', e.target.value)}
                          className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-power100-red"
                        >
                          <option value="">Select ownership type</option>
                          {OWNERSHIP_TYPES.map(type => (
                            <option key={type.value} value={type.value}>{type.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Step 2: Contact Information */}
          {currentStep === 2 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="max-w-2xl mx-auto"
            >
              <Card className="w-full bg-white shadow-lg border-0">
                <CardContent className="p-8">
                  {/* Red circular icon at top */}
                  <div className="flex justify-center mb-8">
                    <div className="w-16 h-16 bg-power100-red rounded-full flex items-center justify-center">
                      <Users className="h-8 w-8 text-white" />
                    </div>
                  </div>
                  
                  {/* Title */}
                  <div className="text-center mb-8">
                    <h2 className="text-2xl font-bold text-power100-black mb-2">
                      Key Contact Information
                    </h2>
                    <p className="text-power100-grey">
                      Provide contact details for key personnel
                    </p>
                  </div>
                  
                  {/* Form Fields */}
                  <div className="space-y-8">
                    {/* CEO Information */}
                    <div>
                      <h3 className="font-semibold text-lg mb-4">CEO Information *</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <Label htmlFor="ceo_name">Name</Label>
                          <Input
                            id="ceo_name"
                            value={formData.ceo_name}
                            onChange={(e) => handleInputChange('ceo_name', e.target.value)}
                            placeholder="CEO Name"
                            required
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label htmlFor="ceo_email">Email</Label>
                          <Input
                            id="ceo_email"
                            type="email"
                            value={formData.ceo_email}
                            onChange={(e) => handleInputChange('ceo_email', e.target.value)}
                            placeholder="ceo@company.com"
                            required
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label htmlFor="ceo_phone">Phone</Label>
                          <Input
                            id="ceo_phone"
                            value={formData.ceo_phone}
                            onChange={(e) => handleInputChange('ceo_phone', e.target.value)}
                            placeholder="Phone number"
                            className="mt-1"
                          />
                        </div>
                      </div>
                    </div>

                    {/* CX Information */}
                    <div>
                      <h3 className="font-semibold text-lg mb-4">Customer Experience (CX) Information</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <Label htmlFor="cx_name">Name</Label>
                          <Input
                            id="cx_name"
                            value={formData.cx_name}
                            onChange={(e) => handleInputChange('cx_name', e.target.value)}
                            placeholder="CX Name"
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label htmlFor="cx_email">Email</Label>
                          <Input
                            id="cx_email"
                            type="email"
                            value={formData.cx_email}
                            onChange={(e) => handleInputChange('cx_email', e.target.value)}
                            placeholder="cx@company.com"
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label htmlFor="cx_phone">Phone</Label>
                          <Input
                            id="cx_phone"
                            value={formData.cx_phone}
                            onChange={(e) => handleInputChange('cx_phone', e.target.value)}
                            placeholder="Phone number"
                            className="mt-1"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Sales Information */}
                    <div>
                      <h3 className="font-semibold text-lg mb-4">Sales Information</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <Label htmlFor="sales_name">Name</Label>
                          <Input
                            id="sales_name"
                            value={formData.sales_name}
                            onChange={(e) => handleInputChange('sales_name', e.target.value)}
                            placeholder="Sales Name"
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label htmlFor="sales_email">Email</Label>
                          <Input
                            id="sales_email"
                            type="email"
                            value={formData.sales_email}
                            onChange={(e) => handleInputChange('sales_email', e.target.value)}
                            placeholder="sales@company.com"
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label htmlFor="sales_phone">Phone</Label>
                          <Input
                            id="sales_phone"
                            value={formData.sales_phone}
                            onChange={(e) => handleInputChange('sales_phone', e.target.value)}
                            placeholder="Phone number"
                            className="mt-1"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Onboarding Information */}
                    <div>
                      <h3 className="font-semibold text-lg mb-4">Onboarding Information</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <Label htmlFor="onboarding_name">Name</Label>
                          <Input
                            id="onboarding_name"
                            value={formData.onboarding_name}
                            onChange={(e) => handleInputChange('onboarding_name', e.target.value)}
                            placeholder="Onboarding Name"
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label htmlFor="onboarding_email">Email</Label>
                          <Input
                            id="onboarding_email"
                            type="email"
                            value={formData.onboarding_email}
                            onChange={(e) => handleInputChange('onboarding_email', e.target.value)}
                            placeholder="onboarding@company.com"
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label htmlFor="onboarding_phone">Phone</Label>
                          <Input
                            id="onboarding_phone"
                            value={formData.onboarding_phone}
                            onChange={(e) => handleInputChange('onboarding_phone', e.target.value)}
                            placeholder="Phone number"
                            className="mt-1"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Marketing Information */}
                    <div>
                      <h3 className="font-semibold text-lg mb-4">Marketing Information</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <Label htmlFor="marketing_name">Name</Label>
                          <Input
                            id="marketing_name"
                            value={formData.marketing_name}
                            onChange={(e) => handleInputChange('marketing_name', e.target.value)}
                            placeholder="Marketing Name"
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label htmlFor="marketing_email">Email</Label>
                          <Input
                            id="marketing_email"
                            type="email"
                            value={formData.marketing_email}
                            onChange={(e) => handleInputChange('marketing_email', e.target.value)}
                            placeholder="marketing@company.com"
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label htmlFor="marketing_phone">Phone</Label>
                          <Input
                            id="marketing_phone"
                            value={formData.marketing_phone}
                            onChange={(e) => handleInputChange('marketing_phone', e.target.value)}
                            placeholder="Phone number"
                            className="mt-1"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Step 3: Target Audience & Service Areas */}
          {currentStep === 3 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="max-w-2xl mx-auto"
            >
              <Card className="w-full bg-white shadow-lg border-0">
                <CardContent className="p-8">
                  {/* Red circular icon at top */}
                  <div className="flex justify-center mb-8">
                    <div className="w-16 h-16 bg-power100-red rounded-full flex items-center justify-center">
                      <Target className="h-8 w-8 text-white" />
                    </div>
                  </div>
                  
                  {/* Title */}
                  <div className="text-center mb-8">
                    <h2 className="text-2xl font-bold text-power100-black mb-2">
                      Target Audience & Service Areas
                    </h2>
                    <p className="text-power100-grey">
                      Define your target market and service offerings
                    </p>
                  </div>
                  
                  {/* Form Fields */}
                  <div className="space-y-8">
                    <div>
                      <Label>Target Revenue Audience (Select up to 3) *</Label>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-2">
                        {TARGET_REVENUE_OPTIONS.map(option => (
                          <div key={option.value} className="flex items-center space-x-2">
                            <Checkbox
                              id={`revenue-${option.value}`}
                              checked={formData.target_revenue_audience.includes(option.value)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  if (formData.target_revenue_audience.length < 3) {
                                    setFormData(prev => ({
                                      ...prev,
                                      target_revenue_audience: [...prev.target_revenue_audience, option.value]
                                    }));
                                  }
                                } else {
                                  setFormData(prev => ({
                                    ...prev,
                                    target_revenue_audience: prev.target_revenue_audience.filter(r => r !== option.value)
                                  }));
                                }
                              }}
                              disabled={!formData.target_revenue_audience.includes(option.value) && formData.target_revenue_audience.length >= 3}
                            />
                            <Label htmlFor={`revenue-${option.value}`} className="text-sm cursor-pointer">
                              {option.label}
                            </Label>
                          </div>
                        ))}
                      </div>
                      <p className="text-sm text-power100-grey mt-2">
                        Selected: {formData.target_revenue_audience.length}/3
                      </p>
                    </div>

                    <div>
                      <Label>Service Areas *</Label>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-2">
                        {SERVICE_AREAS.map(service => (
                          <div key={service.value} className="flex items-center space-x-2">
                            <Checkbox
                              id={`service-${service.value}`}
                              checked={formData.service_areas.includes(service.value)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setFormData(prev => ({
                                    ...prev,
                                    service_areas: [...prev.service_areas, service.value]
                                  }));
                                } else {
                                  setFormData(prev => ({
                                    ...prev,
                                    service_areas: prev.service_areas.filter(s => s !== service.value)
                                  }));
                                }
                              }}
                            />
                            <Label htmlFor={`service-${service.value}`} className="text-sm cursor-pointer">
                              {service.label}
                            </Label>
                          </div>
                        ))}
                      </div>
                      {formData.service_areas.includes('other') && (
                        <div className="mt-4">
                          <Label htmlFor="service_areas_other">Other Service Areas</Label>
                          <Input
                            id="service_areas_other"
                            value={formData.service_areas_other}
                            onChange={(e) => handleInputChange('service_areas_other', e.target.value)}
                            placeholder="Please specify other service areas"
                            className="mt-1"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Step 4: Sponsorships & Media */}
          {currentStep === 4 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="max-w-2xl mx-auto"
            >
              <Card className="w-full bg-white shadow-lg border-0">
                <CardContent className="p-8">
                  {/* Red circular icon at top */}
                  <div className="flex justify-center mb-8">
                    <div className="w-16 h-16 bg-power100-red rounded-full flex items-center justify-center">
                      <Star className="h-8 w-8 text-white" />
                    </div>
                  </div>
                  
                  {/* Title */}
                  <div className="text-center mb-8">
                    <h2 className="text-2xl font-bold text-power100-black mb-2">
                      Sponsorships & Media
                    </h2>
                    <p className="text-power100-grey">
                      Share your industry involvement and media presence
                    </p>
                  </div>
                  
                  {/* Form Fields */}
                  <div className="space-y-6">
                    <div>
                      <Label>Events you sponsor (check all that apply)</Label>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-2">
                        {[
                          'Power 100',
                          'GuildQuality Summit',
                          'Remodeling Show',
                          'Home & Garden Show',
                          'Builder Show',
                          'Local Chamber Events',
                          'Industry Trade Shows',
                          'Charity Events'
                        ].map(event => (
                          <div key={event} className="flex items-center space-x-2">
                            <Checkbox
                              id={`event-${event.replace(/\s+/g, '-').toLowerCase()}`}
                              checked={(formData.sponsored_events || []).includes(event)}
                              onCheckedChange={(checked) => {
                                const currentEvents = formData.sponsored_events || [];
                                if (checked) {
                                  setFormData(prev => ({
                                    ...prev,
                                    sponsored_events: [...currentEvents, event]
                                  }));
                                } else {
                                  setFormData(prev => ({
                                    ...prev,
                                    sponsored_events: currentEvents.filter(e => e !== event)
                                  }));
                                }
                              }}
                            />
                            <Label htmlFor={`event-${event.replace(/\s+/g, '-').toLowerCase()}`} className="text-sm cursor-pointer">
                              {event}
                            </Label>
                          </div>
                        ))}
                      </div>
                      <div className="mt-4">
                        <Label htmlFor="other_sponsored_events">Other events not listed above</Label>
                        <SimpleDynamicList
                          items={formData.other_sponsored_events || []}
                          onChange={(items) => handleInputChange('other_sponsored_events', items)}
                          placeholder="Enter additional event name"
                          className="mt-1"
                          addButtonText="Add Event"
                        />
                      </div>
                    </div>

                    <div>
                      <Label>Podcasts you have appeared on within the last 2 years</Label>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-2">
                        {[
                          'Contractor Secrets',
                          'The Successful Contractor',
                          'Remodeling Mastery',
                          'Builder Funnel Radio',
                          'The Home Pro Show',
                          'Contractor Evolution',
                          'Business of Contracting'
                        ].map(podcast => (
                          <div key={podcast} className="flex items-center space-x-2">
                            <Checkbox
                              id={`podcast-${podcast.replace(/\s+/g, '-').toLowerCase()}`}
                              checked={formData.podcast_appearances?.includes(podcast) || false}
                              onCheckedChange={(checked) => {
                                const currentPodcasts = formData.podcast_appearances || [];
                                if (checked) {
                                  setFormData(prev => ({
                                    ...prev,
                                    podcast_appearances: [...currentPodcasts, podcast]
                                  }));
                                } else {
                                  setFormData(prev => ({
                                    ...prev,
                                    podcast_appearances: currentPodcasts.filter(p => p !== podcast)
                                  }));
                                }
                              }}
                            />
                            <Label htmlFor={`podcast-${podcast.replace(/\s+/g, '-').toLowerCase()}`} className="text-sm cursor-pointer">
                              {podcast}
                            </Label>
                          </div>
                        ))}
                      </div>
                      <div className="mt-4">
                        <Label htmlFor="other_podcast_appearances">Other podcasts not listed above</Label>
                        <SimpleDynamicList
                          items={formData.other_podcast_appearances || []}
                          onChange={(items) => handleInputChange('other_podcast_appearances', items)}
                          placeholder="Enter additional podcast name"
                          className="mt-1"
                          addButtonText="Add Podcast"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="books_read_recommended">Books Read/Recommended</Label>
                      <Textarea
                        id="books_read_recommended"
                        value={formData.books_read_recommended || ''}
                        onChange={(e) => handleInputChange('books_read_recommended', e.target.value)}
                        placeholder="List books you've read and would recommend to other contractors or business owners..."
                        className="mt-1"
                        rows={4}
                      />
                      <p className="text-sm text-power100-grey mt-2">
                        Share books that have influenced your business or personal development
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Step 5: Competitive Analysis */}
          {currentStep === 5 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="max-w-2xl mx-auto"
            >
              <Card className="w-full bg-white shadow-lg border-0">
                <CardContent className="p-8">
                  {/* Red circular icon at top */}
                  <div className="flex justify-center mb-8">
                    <div className="w-16 h-16 bg-power100-red rounded-full flex items-center justify-center">
                      <FileText className="h-8 w-8 text-white" />
                    </div>
                  </div>
                  
                  {/* Title */}
                  <div className="text-center mb-8">
                    <h2 className="text-2xl font-bold text-power100-black mb-2">
                      Competitive Analysis
                    </h2>
                    <p className="text-power100-grey">
                      Help us understand your unique value proposition
                    </p>
                  </div>
                  
                  {/* Form Fields */}
                  <div className="space-y-6">
                    <div>
                      <Label htmlFor="service_category">Service Category</Label>
                      <Input
                        id="service_category"
                        value={formData.service_category}
                        onChange={(e) => handleInputChange('service_category', e.target.value)}
                        placeholder="Primary service category"
                        className="mt-1"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="value_proposition">What is your value proposition? *</Label>
                      <Textarea
                        id="value_proposition"
                        value={formData.value_proposition}
                        onChange={(e) => handleInputChange('value_proposition', e.target.value)}
                        placeholder="Describe your unique value proposition..."
                        required
                        className="mt-1"
                        rows={3}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="why_clients_choose_you">Why do clients choose you over competitors? *</Label>
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
                      <Label htmlFor="why_clients_choose_competitors">Why do clients choose competitors over you?</Label>
                      <Textarea
                        id="why_clients_choose_competitors"
                        value={formData.why_clients_choose_competitors}
                        onChange={(e) => handleInputChange('why_clients_choose_competitors', e.target.value)}
                        placeholder="What advantages do your competitors have?"
                        className="mt-1"
                        rows={3}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Step 6: Focus Areas */}
          {currentStep === 6 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="max-w-2xl mx-auto"
            >
              <Card className="w-full bg-white shadow-lg border-0">
                <CardContent className="p-8">
                  {/* Red circular icon at top */}
                  <div className="flex justify-center mb-8">
                    <div className="w-16 h-16 bg-power100-red rounded-full flex items-center justify-center">
                      <Target className="h-8 w-8 text-white" />
                    </div>
                  </div>
                  
                  {/* Title */}
                  <div className="text-center mb-8">
                    <h2 className="text-2xl font-bold text-power100-black mb-2">
                      Focus Areas for Next 12 Months
                    </h2>
                    <p className="text-power100-grey">
                      What are your top 3 focus areas for the next 12 months?
                    </p>
                  </div>
                  
                  {/* Form Fields */}
                  <div className="space-y-6">
                    <div>
                      <Label>Select up to 3 focus areas *</Label>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2">
                        {FOCUS_AREAS_12_MONTHS.map(area => (
                          <div key={area.value} className="flex items-center space-x-2">
                            <Checkbox
                              id={`focus-${area.value}`}
                              checked={formData.focus_areas_12_months.includes(area.value)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  if (formData.focus_areas_12_months.length < 3) {
                                    setFormData(prev => ({
                                      ...prev,
                                      focus_areas_12_months: [...prev.focus_areas_12_months, area.value]
                                    }));
                                  }
                                } else {
                                  setFormData(prev => ({
                                    ...prev,
                                    focus_areas_12_months: prev.focus_areas_12_months.filter(f => f !== area.value)
                                  }));
                                }
                              }}
                              disabled={!formData.focus_areas_12_months.includes(area.value) && formData.focus_areas_12_months.length >= 3}
                            />
                            <Label htmlFor={`focus-${area.value}`} className="text-sm cursor-pointer">
                              {area.label}
                            </Label>
                          </div>
                        ))}
                      </div>
                      <p className="text-sm text-power100-grey mt-2">
                        Selected: {formData.focus_areas_12_months.length}/3
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Step 7: Partners */}
          {currentStep === 7 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="max-w-2xl mx-auto"
            >
              <Card className="w-full bg-white shadow-lg border-0">
                <CardContent className="p-8">
                  {/* Red circular icon at top */}
                  <div className="flex justify-center mb-8">
                    <div className="w-16 h-16 bg-power100-red rounded-full flex items-center justify-center">
                      <Users className="h-8 w-8 text-white" />
                    </div>
                  </div>
                  
                  {/* Title */}
                  <div className="text-center mb-8">
                    <h2 className="text-2xl font-bold text-power100-black mb-2">
                      Strategic Partners
                    </h2>
                    <p className="text-power100-grey">
                      Who are your top 3 strategic partners for business collaborations and API integrations?
                    </p>
                  </div>
                  
                  {/* Partner Search */}
                  <div className="space-y-6">
                    <div>
                      <Label>Search and add partners (up to 3) *</Label>
                      <div className="relative mt-2">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <Input
                            type="text"
                            placeholder="Start typing partner name..."
                            value={partnerSearchQuery}
                            onChange={(e) => setPartnerSearchQuery(e.target.value)}
                            className="pl-10 pr-10"
                            disabled={formData.strategic_partners.length >= 3}
                          />
                          {partnerSearchQuery && (
                            <button
                              onClick={() => {
                                setPartnerSearchQuery('');
                                setPartnerSearchResults([]);
                              }}
                              className="absolute right-3 top-1/2 transform -translate-y-1/2"
                            >
                              <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                            </button>
                          )}
                        </div>
                        
                        {/* Search Results Dropdown */}
                        {(partnerSearchResults.length > 0 || (partnerSearchQuery.length >= 2 && !isSearching)) && (
                          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto">
                            {isSearching ? (
                              <div className="p-3 text-center text-gray-500">Searching...</div>
                            ) : partnerSearchResults.length > 0 ? (
                              partnerSearchResults.map((partner) => (
                                <button
                                  key={partner.id}
                                  onClick={() => addPartner(partner)}
                                  className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                                >
                                  <div className="font-medium">{partner.company_name}</div>
                                  {partner.description && (
                                    <div className="text-sm text-gray-500 truncate">{partner.description}</div>
                                  )}
                                </button>
                              ))
                            ) : (
                              <button
                                onClick={() => {
                                  setNewPartnerData(prev => ({
                                    ...prev,
                                    company_name: partnerSearchQuery
                                  }));
                                  setShowNewPartnerModal(true);
                                }}
                                className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center gap-2"
                              >
                                <Plus className="h-4 w-4 text-power100-green" />
                                <span>Add "{partnerSearchQuery}" as new partner</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Selected Partners */}
                    {formData.strategic_partners.length > 0 && (
                      <div>
                        <Label>Selected Partners ({formData.strategic_partners.length}/3)</Label>
                        <div className="space-y-2 mt-2">
                          {formData.strategic_partners.map((partner, index) => (
                            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                              <div className="flex items-center gap-2">
                                <Building2 className="h-4 w-4 text-gray-400" />
                                <span className="font-medium">{partner.company_name}</span>
                                {partner.is_new && (
                                  <span className="text-xs bg-power100-green text-white px-2 py-0.5 rounded">NEW</span>
                                )}
                              </div>
                              <button
                                onClick={() => removePartner(index)}
                                className="text-red-500 hover:text-red-700"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
          
          {/* New Partner Modal */}
          {showNewPartnerModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-white rounded-lg p-6 max-w-md w-full mx-4"
              >
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold">Add New Partner</h3>
                    <p className="text-sm text-gray-600 mt-1">{newPartnerData.company_name}</p>
                  </div>
                  <button
                    onClick={() => {
                      setShowNewPartnerModal(false);
                      setNewPartnerData({
                        company_name: '',
                        contact_name: '',
                        contact_email: '',
                        contact_phone: ''
                      });
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                
                <div className="space-y-4">
                  <p className="text-sm text-gray-500">Optionally add contact information for this partner:</p>
                  
                  <div>
                    <Label>Contact Name</Label>
                    <Input
                      value={newPartnerData.contact_name}
                      onChange={(e) => setNewPartnerData(prev => ({ ...prev, contact_name: e.target.value }))}
                      placeholder="Contact person's name (optional)"
                    />
                  </div>
                  
                  <div>
                    <Label>Contact Email</Label>
                    <Input
                      type="email"
                      value={newPartnerData.contact_email}
                      onChange={(e) => setNewPartnerData(prev => ({ ...prev, contact_email: e.target.value }))}
                      placeholder="contact@example.com (optional)"
                    />
                  </div>
                  
                  <div>
                    <Label>Contact Phone</Label>
                    <Input
                      type="tel"
                      value={newPartnerData.contact_phone}
                      onChange={(e) => setNewPartnerData(prev => ({ ...prev, contact_phone: e.target.value }))}
                      placeholder="(555) 123-4567 (optional)"
                    />
                  </div>
                </div>
                
                <div className="flex gap-3 mt-6">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowNewPartnerModal(false);
                      setNewPartnerData({
                        company_name: '',
                        contact_name: '',
                        contact_email: '',
                        contact_phone: ''
                      });
                    }}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={addNewPartner}
                    className="flex-1 bg-power100-green hover:bg-green-600 text-white"
                  >
                    Add Partner
                  </Button>
                </div>
              </motion.div>
            </div>
          )}

          {/* Step 8: Client Demos & References */}
          {currentStep === 8 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="max-w-2xl mx-auto"
            >
              <Card className="w-full bg-white shadow-lg border-0">
                <CardContent className="p-8">
                  {/* Red circular icon at top */}
                  <div className="flex justify-center mb-8">
                    <div className="w-16 h-16 bg-power100-red rounded-full flex items-center justify-center">
                      <FileText className="h-8 w-8 text-white" />
                    </div>
                  </div>
                  
                  {/* Title */}
                  <div className="text-center mb-8">
                    <h2 className="text-2xl font-bold text-power100-black mb-2">
                      Portfolio & Branding
                    </h2>
                    <p className="text-power100-grey">
                      Upload your company logo and provide demos and references
                    </p>
                  </div>
                  
                  {/* Form Fields */}
                  <div className="space-y-8">
                    {/* Company Logo */}
                    <div>
                      <LogoManager
                        logoUrl={formData.logo_url}
                        onChange={(url) => handleInputChange('logo_url', url)}
                        label="Company Logo"
                      />
                      <p className="text-sm text-power100-grey mt-2">
                        Your logo will be displayed on your partner profile and in marketing materials
                      </p>
                    </div>

                    <div>
                      <Label>Client Demos (Up to 5)</Label>
                      <p className="text-sm text-power100-grey mt-1 mb-4">
                        Upload recorded demos directly or provide links to videos (YouTube, Vimeo, etc.) showcasing your work
                      </p>
                      <div onClick={(e) => e.stopPropagation()}>
                        <DemoUploadList
                          items={formData.client_demos}
                          onChange={(items) => {
                            handleInputChange('client_demos', items);
                          }}
                          maxItems={5}
                        />
                      </div>
                    </div>

                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <h4 className="font-medium text-yellow-900 mb-2">About Client References</h4>
                      <p className="text-sm text-yellow-800 mb-2">
                        <strong>Why we need this:</strong> We will contact these clients to verify your work quality and obtain direct feedback about your services. This helps us ensure our partners maintain the highest standards.
                      </p>
                      <p className="text-sm text-yellow-800">
                        Please provide up to 5 clients that match your target audience and have given you permission to be contacted.
                      </p>
                    </div>
                    
                    <div>
                      <Label>Client References (Up to 5)</Label>
                      <div onClick={(e) => e.stopPropagation()}>
                        <ClientReferenceList
                          items={formData.client_references}
                          onChange={(items) => {
                            handleInputChange('client_references', items);
                          }}
                          maxItems={5}
                        />
                      </div>
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

          {/* Navigation & Form Actions - Centered Layout */}
          <div className="flex justify-center items-center gap-4 pt-8">
            {currentStep > 1 && (
              <Button
                type="button"
                variant="outline"
                onClick={prevStep}
                disabled={loading}
                className="px-6 py-2 rounded-full border-power100-grey"
              >
                Back
              </Button>
            )}
            
            {currentStep < totalSteps ? (
              <Button
                type="button"
                onClick={nextStep}
                disabled={!isStepValid(currentStep) || loading}
                className="bg-power100-green hover:bg-green-700 text-white px-8 py-2 rounded-full font-semibold"
              >
                Continue
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={loading || !isStepValid(currentStep)}
                className="bg-power100-green hover:bg-green-700 text-white px-8 py-2 rounded-full font-semibold"
              >
                {loading ? 'Submitting...' : 'Submit Application'}
              </Button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}