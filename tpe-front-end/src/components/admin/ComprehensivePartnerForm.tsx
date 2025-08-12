"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { DynamicList } from '@/components/ui/dynamic-list';
import { partnerApi } from '@/lib/api';
import { StrategicPartner } from '@/lib/types/strategic_partner';
import { ArrowLeft, Save, Building2, AlertTriangle, Users, FileText, Star, Target } from 'lucide-react';

interface PartnerFormProps {
  partner?: StrategicPartner | null;
  onSuccess: () => void;
  onCancel: () => void;
}

// Partner onboarding options based on requirements document
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

const TECH_STACK_CATEGORIES = {
  sales: ['HubSpot', 'Salesforce', 'Pipedrive', 'CompanyCam', 'Other'],
  operations: ['JobNimbus', 'JobProgress', 'Buildertrend', 'Contractor Foreman', 'Other'],
  marketing: ['Google Ads', 'Facebook Ads', 'Angi', 'Home Advisor', 'Other'],
  customer_experience: ['Podium', 'ServiceTitan', 'Birdeye', 'ReviewBuzz', 'Other'],
  installation_pm: ['Buildertrend', 'CoConstruct', 'BuilderCloud', 'Procore', 'Other'],
  accounting_finance: ['QuickBooks', 'Sage', 'Xero', 'FreshBooks', 'Other']
};

function ComprehensivePartnerForm({ partner, onSuccess, onCancel }: PartnerFormProps) {
  const [formData, setFormData] = useState({
    // Company Information
    company_name: '',
    established_year: '',
    employee_count: '',
    client_count: '',
    website: '',
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
    
    // Sponsorships & Speaking
    events_sponsored: [] as string[],
    
    // Podcasts
    podcasts_appeared: [] as Array<{name: string; link: string}>,
    
    // Books
    books_recommended: '',
    
    // Partnerships
    referral_partnerships: '',
    
    // Category of Service & Value Proposition
    service_category: '',
    value_proposition: '',
    why_clients_choose_you: '',
    why_clients_choose_competitors: '',
    
    // Focus Areas for next 12 months (select 3)
    focus_areas_12_months: [] as string[],
    
    // Tech Stack by Category
    tech_stack_sales: [] as string[],
    tech_stack_operations: [] as string[],
    tech_stack_marketing: [] as string[],
    tech_stack_customer_experience: [] as string[],
    tech_stack_installation_pm: [] as string[],
    tech_stack_accounting_finance: [] as string[],
    
    // Client Demos & References
    demo_links: [] as Array<{title: string; url: string}>,
    client_references: [] as Array<{company: string; website: string; poc_name: string; poc_email: string; poc_phone: string}>,
    
    // Legacy fields for backward compatibility
    description: '',
    logo_url: '',
    contact_email: '',
    contact_phone: '',
    power100_subdomain: '',
    power_confidence_score: 0,
    pricing_model: '',
    onboarding_process: '',
    key_differentiators: [] as string[],
    client_testimonials: [] as Array<{client_name: string; testimonial: string; rating?: number}>,
    is_active: true,
    last_quarterly_report: ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 8;

  useEffect(() => {
    if (partner) {
      // Initialize form with existing partner data
      setFormData(prev => ({
        ...prev,
        company_name: partner.company_name || '',
        website: partner.website || '',
        contact_email: partner.contact_email || '',
        power_confidence_score: partner.power_confidence_score || 0,
        is_active: partner.is_active !== undefined ? partner.is_active : true,
        // Set CEO email as primary contact for backward compatibility
        ceo_email: partner.contact_email || '',
        // Initialize other fields as empty - partner will fill them during update
      }));
    }
  }, [partner]);

  const handleInputChange = (field: string, value: unknown) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };
  
  const handleMultiSelectChange = (field: string, value: string[], maxLimit?: number) => {
    if (maxLimit && value.length > maxLimit) {
      setError(`You can only select up to ${maxLimit} options for ${field.replace('_', ' ')}`);
      return;
    }
    setError(null);
    handleInputChange(field, value);
  };
  
  const isStepValid = (step: number): boolean => {
    switch (step) {
      case 1: // Company Info
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
      case 7: // Tech Stack
        return true; // Optional step
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Validate required fields across all steps
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

      // Prepare data for API - maintain compatibility with existing schema
      const apiData = {
        // Map new comprehensive fields to existing schema
        company_name: formData.company_name,
        description: formData.value_proposition || formData.description,
        website: formData.website,
        contact_email: formData.ceo_email || formData.contact_email,
        contact_phone: formData.ceo_phone || formData.contact_phone,
        power100_subdomain: formData.power100_subdomain,
        
        // Store comprehensive data as JSON in existing flexible fields
        focus_areas_served: formData.service_areas,
        target_revenue_range: formData.target_revenue_audience,
        geographic_regions: [], // Will be expanded in future
        
        power_confidence_score: formData.power_confidence_score,
        pricing_model: formData.pricing_model,
        onboarding_process: formData.onboarding_process,
        
        // Store additional comprehensive data in key_differentiators as JSON
        key_differentiators: [
          `Service Category: ${formData.service_category}`,
          `Why Clients Choose Us: ${formData.why_clients_choose_you}`,
          `Why Clients Choose Competitors: ${formData.why_clients_choose_competitors}`,
          `Focus Areas 12 Months: ${formData.focus_areas_12_months.join(', ')}`,
          `Ownership Type: ${formData.ownership_type}`,
          `Established: ${formData.established_year}`,
          `Employee Count: ${formData.employee_count}`,
          `Client Count: ${formData.client_count}`
        ].filter(item => !item.includes(': undefined') && !item.includes(': ')),
        
        client_testimonials: formData.client_testimonials,
        is_active: formData.is_active,
        last_quarterly_report: formData.last_quarterly_report || ''
      };

      if (partner) {
        await partnerApi.update(partner.id, apiData);
      } else {
        await partnerApi.create(apiData);
      }

      onSuccess();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save partner');
    } finally {
      setLoading(false);
    }
  };

  const getStepTitle = (step: number) => {
    const titles = [
      '', // 0-index adjustment
      'Company Information',
      'Contact Information', 
      'Target Audience & Services',
      'Sponsorships & Media',
      'Competitive Analysis',
      'Focus Areas',
      'Tech Stack',
      'Client Demos & References'
    ];
    return titles[step] || 'Unknown Step';
  };

  const getStepIcon = (step: number) => {
    const icons = [
      null, // 0-index adjustment
      Building2,
      Users,
      Target,
      Star,
      FileText,
      Target,
      Building2,
      FileText
    ];
    const IconComponent = icons[step];
    return IconComponent ? <IconComponent className="h-5 w-5" /> : null;
  };

  return (
    <div className="min-h-screen bg-power100-bg-grey p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="outline"
            onClick={onCancel}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Partners
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-power100-black">
              {partner ? 'Edit Partner' : 'Add New Partner'}
            </h1>
            <p className="text-power100-grey mt-1">
              {partner ? `Update ${partner.company_name} profile` : 'Complete comprehensive partner onboarding'}
            </p>
          </div>
        </div>

        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-power100-black">
              Step {currentStep} of {totalSteps}: {getStepTitle(currentStep)}
            </h2>
            <div className="text-sm text-power100-grey">
              {Math.round((currentStep / totalSteps) * 100)}% Complete
            </div>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-power100-red h-2 rounded-full transition-all duration-300"
              style={{ width: `${(currentStep / totalSteps) * 100}%` }}
            />
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Step 1: Company Information */}
          {currentStep === 1 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {getStepIcon(1)}
                  Company Information
                </CardTitle>
                <p className="text-sm text-power100-grey">Basic information about your company</p>
              </CardHeader>
              <CardContent className="space-y-6">
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
              </CardContent>
            </Card>
          )}

          {/* Step 2: Contact Information */}
          {currentStep === 2 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {getStepIcon(2)}
                  Key Contact Information
                </CardTitle>
                <p className="text-sm text-power100-grey">Provide contact details for key personnel</p>
              </CardHeader>
              <CardContent className="space-y-8">
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

                {/* Customer Experience Contact */}
                <div>
                  <h3 className="font-semibold text-lg mb-4">Customer Experience Contact</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="cx_name">Name</Label>
                      <Input
                        id="cx_name"
                        value={formData.cx_name}
                        onChange={(e) => handleInputChange('cx_name', e.target.value)}
                        placeholder="CX Contact Name"
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

                {/* Sales Intake Contact */}
                <div>
                  <h3 className="font-semibold text-lg mb-4">Sales Intake Contact</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="sales_name">Name</Label>
                      <Input
                        id="sales_name"
                        value={formData.sales_name}
                        onChange={(e) => handleInputChange('sales_name', e.target.value)}
                        placeholder="Sales Contact Name"
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

                {/* Onboarding Contact */}
                <div>
                  <h3 className="font-semibold text-lg mb-4">Onboarding Contact</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="onboarding_name">Name</Label>
                      <Input
                        id="onboarding_name"
                        value={formData.onboarding_name}
                        onChange={(e) => handleInputChange('onboarding_name', e.target.value)}
                        placeholder="Onboarding Contact Name"
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

                {/* Marketing Contact */}
                <div>
                  <h3 className="font-semibold text-lg mb-4">Marketing Contact</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="marketing_name">Name</Label>
                      <Input
                        id="marketing_name"
                        value={formData.marketing_name}
                        onChange={(e) => handleInputChange('marketing_name', e.target.value)}
                        placeholder="Marketing Contact Name"
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
              </CardContent>
            </Card>
          )}

          {/* Step 3: Target Audience & Service Areas */}
          {currentStep === 3 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {getStepIcon(3)}
                  Target Audience & Service Areas
                </CardTitle>
                <p className="text-sm text-power100-grey">Define your target market and service capabilities</p>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label>Target Audience by Revenue (Select up to 3) *</Label>
                  <p className="text-sm text-power100-grey mb-2">
                    Choose the revenue ranges that best fit your target audience. Limited to 3 selections.
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-2">
                    {TARGET_REVENUE_OPTIONS.map(option => (
                      <label key={option.value} className="flex items-center space-x-2 cursor-pointer">
                        <Checkbox
                          checked={formData.target_revenue_audience.includes(option.value)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              if (formData.target_revenue_audience.length < 3) {
                                handleMultiSelectChange('target_revenue_audience', [...formData.target_revenue_audience, option.value], 3);
                              } else {
                                setError('You can only select up to 3 revenue ranges');
                              }
                            } else {
                              handleMultiSelectChange('target_revenue_audience', formData.target_revenue_audience.filter(item => item !== option.value), 3);
                            }
                          }}
                          disabled={!formData.target_revenue_audience.includes(option.value) && formData.target_revenue_audience.length >= 3}
                        />
                        <span className={`text-sm ${
                          !formData.target_revenue_audience.includes(option.value) && formData.target_revenue_audience.length >= 3 
                            ? 'text-gray-400' 
                            : 'text-gray-700'
                        }`}>
                          {option.label}
                        </span>
                      </label>
                    ))}
                  </div>
                  <p className="text-xs text-power100-grey mt-1">
                    Selected: {formData.target_revenue_audience.length}/3
                  </p>
                </div>

                <div>
                  <Label>Service Areas *</Label>
                  <p className="text-sm text-power100-grey mb-2">
                    Select all service areas that apply to your business
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-2">
                    {SERVICE_AREAS.map(area => (
                      <label key={area.value} className="flex items-center space-x-2 cursor-pointer">
                        <Checkbox
                          checked={formData.service_areas.includes(area.value)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              handleInputChange('service_areas', [...formData.service_areas, area.value]);
                            } else {
                              handleInputChange('service_areas', formData.service_areas.filter(item => item !== area.value));
                            }
                          }}
                        />
                        <span className="text-sm text-gray-700">{area.label}</span>
                      </label>
                    ))}
                  </div>
                  
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
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 4: Sponsorships & Media Presence */}
          {currentStep === 4 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {getStepIcon(4)}
                  Sponsorships & Media Presence
                </CardTitle>
                <p className="text-sm text-power100-grey">Optional: Information about your industry involvement</p>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label>Events & Shows Sponsored or Spoke At</Label>
                  <p className="text-sm text-power100-grey mb-2">
                    List events, trade shows, or conferences where you've been a sponsor or speaker
                  </p>
                  <DynamicList
                    value={formData.events_sponsored.map(event => ({ text: event }))}
                    onChange={(items) => handleInputChange('events_sponsored', items.map(item => item.text))}
                    placeholder="Add event or show..."
                  />
                </div>

                <div>
                  <Label>Podcast Appearances (Past 2 Years)</Label>
                  <p className="text-sm text-power100-grey mb-2">
                    Podcasts you've appeared on with published links if available
                  </p>
                  <DynamicList
                    value={formData.podcasts_appeared}
                    onChange={(podcasts) => handleInputChange('podcasts_appeared', podcasts)}
                    placeholder="Add podcast name and link..."
                  />
                </div>

                <div>
                  <Label htmlFor="books_recommended">Books Read/Recommended</Label>
                  <p className="text-sm text-power100-grey mb-2">
                    Books you recommend or have found valuable
                  </p>
                  <Textarea
                    id="books_recommended"
                    value={formData.books_recommended}
                    onChange={(e) => handleInputChange('books_recommended', e.target.value)}
                    placeholder="List books you recommend, separated by commas or new lines"
                    rows={3}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="referral_partnerships">Best Working/Referral Partnerships</Label>
                  <p className="text-sm text-power100-grey mb-2">
                    Your most successful partnership relationships
                  </p>
                  <Textarea
                    id="referral_partnerships"
                    value={formData.referral_partnerships}
                    onChange={(e) => handleInputChange('referral_partnerships', e.target.value)}
                    placeholder="Describe your key partnerships and referral relationships"
                    rows={3}
                    className="mt-1"
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 5: Competitive Analysis */}
          {currentStep === 5 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {getStepIcon(5)}
                  Competitive Analysis & Value Proposition
                </CardTitle>
                <p className="text-sm text-power100-grey">Help us understand your competitive position</p>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label htmlFor="service_category">Category of Service</Label>
                  <Input
                    id="service_category"
                    value={formData.service_category}
                    onChange={(e) => handleInputChange('service_category', e.target.value)}
                    placeholder="e.g., Digital Marketing, CRM, Financial Services"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="value_proposition">What is your value proposition? *</Label>
                  <Textarea
                    id="value_proposition"
                    value={formData.value_proposition}
                    onChange={(e) => handleInputChange('value_proposition', e.target.value)}
                    placeholder="Describe what unique value you bring to your clients"
                    rows={3}
                    required
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="why_clients_choose_you">Why do clients choose you over competitors? *</Label>
                  <Textarea
                    id="why_clients_choose_you"
                    value={formData.why_clients_choose_you}
                    onChange={(e) => handleInputChange('why_clients_choose_you', e.target.value)}
                    placeholder="What specific advantages do you offer that competitors don't?"
                    rows={3}
                    required
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="why_clients_choose_competitors">Why do clients choose competitors over you?</Label>
                  <p className="text-sm text-power100-grey mb-2">
                    Understanding this helps us position you better
                  </p>
                  <Textarea
                    id="why_clients_choose_competitors"
                    value={formData.why_clients_choose_competitors}
                    onChange={(e) => handleInputChange('why_clients_choose_competitors', e.target.value)}
                    placeholder="Be honest about where competitors might have advantages"
                    rows={3}
                    className="mt-1"
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 6: Focus Areas */}
          {currentStep === 6 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {getStepIcon(6)}
                  Focus Areas for Next 12 Months
                </CardTitle>
                <p className="text-sm text-power100-grey">Select your top 3 priorities (maximum 3)</p>
              </CardHeader>
              <CardContent>
                <div>
                  <Label>Top 3 Focus Areas *</Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-2">
                    {FOCUS_AREAS_12_MONTHS.map(area => (
                      <label key={area.value} className="flex items-center space-x-2 cursor-pointer">
                        <Checkbox
                          checked={formData.focus_areas_12_months.includes(area.value)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              if (formData.focus_areas_12_months.length < 3) {
                                handleMultiSelectChange('focus_areas_12_months', [...formData.focus_areas_12_months, area.value], 3);
                              } else {
                                setError('You can only select up to 3 focus areas');
                              }
                            } else {
                              handleMultiSelectChange('focus_areas_12_months', formData.focus_areas_12_months.filter(item => item !== area.value), 3);
                            }
                          }}
                          disabled={!formData.focus_areas_12_months.includes(area.value) && formData.focus_areas_12_months.length >= 3}
                        />
                        <span className={`text-sm ${
                          !formData.focus_areas_12_months.includes(area.value) && formData.focus_areas_12_months.length >= 3 
                            ? 'text-gray-400' 
                            : 'text-gray-700'
                        }`}>
                          {area.label}
                        </span>
                      </label>
                    ))}
                  </div>
                  <p className="text-xs text-power100-grey mt-1">
                    Selected: {formData.focus_areas_12_months.length}/3
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 7: Tech Stack */}
          {currentStep === 7 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {getStepIcon(7)}
                  Current Tech Stack
                </CardTitle>
                <p className="text-sm text-power100-grey">What tools and platforms are you currently using?</p>
              </CardHeader>
              <CardContent className="space-y-6">
                {Object.entries(TECH_STACK_CATEGORIES).map(([category, options]) => {
                  const displayName = category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                  const fieldName = `tech_stack_${category}` as keyof typeof formData;
                  
                  return (
                    <div key={category}>
                      <Label>{displayName}</Label>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                        {options.map(option => (
                          <label key={option} className="flex items-center space-x-2 cursor-pointer">
                            <Checkbox
                              checked={(formData[fieldName] as string[]).includes(option)}
                              onCheckedChange={(checked) => {
                                const currentValues = formData[fieldName] as string[];
                                if (checked) {
                                  handleInputChange(fieldName, [...currentValues, option]);
                                } else {
                                  handleInputChange(fieldName, currentValues.filter(item => item !== option));
                                }
                              }}
                            />
                            <span className="text-sm text-gray-700">{option}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {/* Step 8: Client Demos & References */}
          {currentStep === 8 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {getStepIcon(8)}
                  Client Demos & References
                </CardTitle>
                <p className="text-sm text-power100-grey">
                  Provide recorded demos and client references that fit your target audience
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-medium text-blue-900 mb-2">About Demo Uploads</h4>
                  <p className="text-sm text-blue-800">
                    We use these recorded demos to showcase your expertise to potential contractor matches. 
                    Please provide 5 demos that best represent your work with clients that fit your target audience. 
                    This helps us demonstrate your value proposition to contractors before they engage with you.
                  </p>
                </div>

                <div>
                  <Label>Recorded Demos (Upload 5)</Label>
                  <p className="text-sm text-power100-grey mb-2">
                    Provide links to recorded demos or presentations
                  </p>
                  <DynamicList
                    value={formData.demo_links}
                    onChange={(demos) => handleInputChange('demo_links', demos)}
                    placeholder="Add demo title and URL..."
                  />
                </div>

                <div>
                  <Label>Client References (5 clients that fit your target audience)</Label>
                  <p className="text-sm text-power100-grey mb-2">
                    Provide contact information for clients we can potentially reach out to
                  </p>
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                    <h4 className="font-medium text-yellow-900 mb-2">Why We Need This Information</h4>
                    <p className="text-sm text-yellow-800">
                      We use these client references to:<br/>
                      • Validate your PowerConfidence score through direct feedback<br/>
                      • Gather testimonials and case studies<br/>
                      • Build trust with new contractor prospects<br/>
                      • Create success stories for marketing purposes
                    </p>
                  </div>
                  <DynamicList
                    value={formData.client_references}
                    onChange={(references) => handleInputChange('client_references', references)}
                    placeholder="Add client reference..."
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Navigation & Form Actions */}
          <div className="flex justify-between items-center pt-6">
            <div className="flex gap-2">
              {currentStep > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={prevStep}
                  disabled={loading}
                >
                  Previous
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={loading}
              >
                Cancel
              </Button>
            </div>
            
            <div className="flex gap-2">
              {currentStep < totalSteps ? (
                <Button
                  type="button"
                  onClick={nextStep}
                  disabled={!isStepValid(currentStep) || loading}
                  className="bg-power100-red hover:bg-red-700 text-white"
                >
                  Next Step
                </Button>
              ) : (
                <Button
                  type="submit"
                  disabled={loading || !isStepValid(currentStep)}
                  className="bg-power100-red hover:bg-red-700 text-white"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {loading ? 'Saving...' : (partner ? 'Update Partner' : 'Create Partner')}
                </Button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ComprehensivePartnerForm;