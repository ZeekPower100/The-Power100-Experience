"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { MultiSelectWithEntry } from '@/components/ui/multi-select-with-entry';
import { DynamicList } from '@/components/ui/dynamic-list';
import { partnerApi } from '@/lib/api';
import { StrategicPartner } from '@/lib/types/strategic_partner';
import { ArrowLeft, Save, Building2, AlertTriangle } from 'lucide-react';
import { safeJsonParse, safeJsonStringify, handleApiResponse, getFromStorage, setToStorage } from '../../utils/jsonHelpers';

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

function PartnerForm({ partner, onSuccess, onCancel }: PartnerFormProps) {
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
      setFormData({
        company_name: partner.company_name || '',
        description: partner.description || '',
        logo_url: partner.logo_url || '',
        website: partner.website || '',
        contact_email: partner.contact_email || '',
        contact_phone: partner.contact_phone || '',
        power100_subdomain: partner.power100_subdomain || '',
        focus_areas_served: Array.isArray(partner.focus_areas_served) ? partner.focus_areas_served : 
          (typeof partner.focus_areas_served === 'string' ? safeJsonParse(partner.focus_areas_served || '[]') : []),
        target_revenue_range: Array.isArray(partner.target_revenue_range) ? partner.target_revenue_range :
          (typeof partner.target_revenue_range === 'string' ? safeJsonParse(partner.target_revenue_range || '[]') : []),
        geographic_regions: Array.isArray(partner.geographic_regions) ? partner.geographic_regions :
          (typeof partner.geographic_regions === 'string' ? safeJsonParse(partner.geographic_regions || '[]') : []),
        power_confidence_score: partner.power_confidence_score || 0,
        pricing_model: partner.pricing_model || '',
        onboarding_process: partner.onboarding_process || '',
        key_differentiators: Array.isArray(partner.key_differentiators) ? partner.key_differentiators :
          (typeof partner.key_differentiators === 'string' ? safeJsonParse(partner.key_differentiators || '[]') : []),
        client_testimonials: Array.isArray(partner.client_testimonials) ? partner.client_testimonials :
          (typeof partner.client_testimonials === 'string' ? safeJsonParse(partner.client_testimonials || '[]') : []),
        is_active: partner.is_active !== undefined ? partner.is_active : true,
        last_quarterly_report: partner.last_quarterly_report || ''
      });
    }
  }, [partner]);

  const handleInputChange = (field: string, value: unknown) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };
  
  const handleMultiSelectChange = (field: string, value: string[], maxLimit?: number) => {
    if (maxLimit && value.length > maxLimit) {
      setError(`You can only select up to ${maxLimit} options for ${field}`);
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

      // Prepare data for API (keep arrays as arrays for backend validation)
      const apiData = {
        ...formData,
        focus_areas_served: formData.focus_areas_served,
        target_revenue_range: formData.target_revenue_range,
        geographic_regions: formData.geographic_regions,
        key_differentiators: formData.key_differentiators,
        client_testimonials: formData.client_testimonials
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
              {partner ? `Update ${partner.company_name} profile` : 'Create a comprehensive strategic partner profile'}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Company Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Company Information
              </CardTitle>
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
                  <Label htmlFor="contact_email">Contact Email *</Label>
                  <Input
                    id="contact_email"
                    type="email"
                    value={formData.contact_email}
                    onChange={(e) => handleInputChange('contact_email', e.target.value)}
                    placeholder="contact@company.com"
                    required
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    value={formData.website}
                    onChange={(e) => handleInputChange('website', e.target.value)}
                    placeholder="https://company.com"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="contact_phone">Contact Phone</Label>
                  <Input
                    id="contact_phone"
                    value={formData.contact_phone}
                    onChange={(e) => handleInputChange('contact_phone', e.target.value)}
                    placeholder="+1 (555) 123-4567"
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="logo_url">Logo URL</Label>
                  <Input
                    id="logo_url"
                    value={formData.logo_url}
                    onChange={(e) => handleInputChange('logo_url', e.target.value)}
                    placeholder="https://company.com/logo.png"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="power100_subdomain">Power100 Subdomain</Label>
                  <Input
                    id="power100_subdomain"
                    value={formData.power100_subdomain}
                    onChange={(e) => handleInputChange('power100_subdomain', e.target.value)}
                    placeholder="company"
                    className="mt-1"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="description">Company Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Describe the company's value proposition and services..."
                  rows={4}
                  className="mt-1"
                />
              </div>
            </CardContent>
          </Card>

          {/* Service Capabilities */}
          <Card>
            <CardHeader>
              <CardTitle>Service Capabilities & Targeting</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label>Focus Areas Served</Label>
                <p className="text-sm text-power100-grey mb-2">
                  Select the focus areas this partner can help contractors with
                </p>
                <MultiSelectWithEntry
                  value={formData.focus_areas_served}
                  onChange={(values) => handleInputChange('focus_areas_served', values)}
                  options={FOCUS_AREA_OPTIONS}
                  placeholder="Select or enter focus areas..."
                />
              </div>

              <div>
                <Label>Target Revenue Range</Label>
                <p className="text-sm text-power100-grey mb-2">
                  Revenue ranges this partner best serves
                </p>
                <MultiSelectWithEntry
                  value={formData.target_revenue_range}
                  onChange={(values) => handleInputChange('target_revenue_range', values)}
                  options={REVENUE_RANGE_OPTIONS}
                  placeholder="Select or enter revenue ranges..."
                />
              </div>

              <div>
                <Label>Geographic Regions</Label>
                <p className="text-sm text-power100-grey mb-2">
                  Geographic areas this partner serves
                </p>
                <MultiSelectWithEntry
                  value={formData.geographic_regions}
                  onChange={(values) => handleInputChange('geographic_regions', values)}
                  options={GEOGRAPHIC_OPTIONS}
                  placeholder="Select or enter geographic regions..."
                />
              </div>

              <div>
                <Label>Key Differentiators</Label>
                <p className="text-sm text-power100-grey mb-2">
                  What makes this partner unique
                </p>
                <MultiSelectWithEntry
                  value={formData.key_differentiators}
                  onChange={(values) => handleInputChange('key_differentiators', values)}
                  options={[]}
                  placeholder="Enter key differentiators..."
                />
              </div>
            </CardContent>
          </Card>

          {/* Business Details */}
          <Card>
            <CardHeader>
              <CardTitle>Business Details & Performance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="power_confidence_score">PowerConfidence Score (0-100)</Label>
                  <Input
                    id="power_confidence_score"
                    type="number"
                    min="0"
                    max="100"
                    value={formData.power_confidence_score}
                    onChange={(e) => handleInputChange('power_confidence_score', parseInt(e.target.value) || 0)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="last_quarterly_report">Last Quarterly Report</Label>
                  <Input
                    id="last_quarterly_report"
                    type="date"
                    value={formData.last_quarterly_report}
                    onChange={(e) => handleInputChange('last_quarterly_report', e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="pricing_model">Pricing Model</Label>
                <Textarea
                  id="pricing_model"
                  value={formData.pricing_model}
                  onChange={(e) => handleInputChange('pricing_model', e.target.value)}
                  placeholder="Describe the pricing structure and model..."
                  rows={3}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="onboarding_process">Onboarding Process</Label>
                <Textarea
                  id="onboarding_process"
                  value={formData.onboarding_process}
                  onChange={(e) => handleInputChange('onboarding_process', e.target.value)}
                  placeholder="Describe the client onboarding process..."
                  rows={3}
                  className="mt-1"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => handleInputChange('is_active', checked)}
                />
                <Label htmlFor="is_active">Partner is currently active</Label>
              </div>
            </CardContent>
          </Card>

          {/* Client Testimonials */}
          <Card>
            <CardHeader>
              <CardTitle>Client Testimonials</CardTitle>
              <p className="text-sm text-power100-grey">
                Add client testimonials with ratings to build social proof
              </p>
            </CardHeader>
            <CardContent>
              <DynamicList
                value={formData.client_testimonials}
                onChange={(testimonials) => handleInputChange('client_testimonials', testimonials)}
                placeholder="Add your first client testimonial..."
              />
            </CardContent>
          </Card>

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

export default PartnerForm;