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
import { SimpleDynamicList } from '@/components/ui/simple-dynamic-list';
import { DynamicListWithUrl } from '@/components/ui/dynamic-list-with-url';
import { ClientReferenceList, type ClientReference } from '@/components/ui/client-reference-list';
import { DemoUploadList, type DemoItem } from '@/components/ui/demo-upload-list';
import VideoManager from '@/components/admin/VideoManager';
import { partnerApi } from '@/lib/api';
import { getApiUrl } from '@/utils/api';
import { StrategicPartner } from '@/lib/types/strategic_partner';
import { ArrowLeft, Save, Building2, AlertTriangle, Users, FileText, Star, Target, PlayCircle, Search, X, Plus, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';

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

// Top 21 Industry Events (same as PartnerOnboardingForm)
const INDUSTRY_EVENTS = [
  'Rilla Masters',
  'Lead Con',
  'International Builders Show (IBS)',
  'International Roofing Expo (IRE)',
  'ServiceTitan Pantheon',
  'D2D Con',
  'Win the Storm',
  'NERCA 2025',
  'QR Top 500 Live',
  'National Hardware Show',
  'Service World Expo',
  'SolarCon',
  'Certified Contractors Network Spring',
  'QR Fast Remodeler Live',
  'Florida Roofing and Sheet Metal Expo',
  'Pro Remodeler Pinnacle Experience',
  'Texas Roofing Conference',
  'Western Roofing Expo',
  'Midwest Roofing Contractors',
  'International Pool, Spa, and Patio Expo',
  'Storm Restoration Conference'
];

function PartnerForm({ partner, onSuccess, onCancel }: PartnerFormProps) {
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
    ownership_type: '',
    
    // Contact Information
    ceo_name: '',
    ceo_email: '',
    ceo_phone: '',
    ceo_title: '',
    cx_name: '',
    cx_email: '',
    cx_phone: '',
    cx_title: '',
    sales_name: '',
    sales_email: '',
    sales_phone: '',
    sales_title: '',
    onboarding_name: '',
    onboarding_email: '',
    onboarding_phone: '',
    onboarding_title: '',
    marketing_name: '',
    marketing_email: '',
    marketing_phone: '',
    marketing_title: '',
    
    // Target Audience - Revenue (limit 3)
    target_revenue_audience: [] as string[],
    
    // Service Areas
    service_areas: [] as string[],
    service_areas_other: '',
    
    // Sponsorships & Media - Updated field names
    sponsored_events: [] as string[],
    other_sponsored_events: [] as Array<{name: string; url?: string}>,
    events_sponsored: [] as string[], // For multi-step form compatibility
    
    // Podcasts - Updated field names
    podcast_appearances: [] as string[],
    other_podcast_appearances: [] as Array<{name: string; url?: string}>,
    
    // Books - Updated field name
    books_read_recommended: '',
    
    // Partnerships - Updated field name
    best_working_partnerships: '',
    
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
    
    // Tech Stack Other fields
    tech_stack_sales_other: '',
    tech_stack_operations_other: '',
    tech_stack_marketing_other: '',
    tech_stack_customer_experience_other: '',
    tech_stack_installation_pm_other: '',
    tech_stack_accounting_finance_other: '',
    
    // Client Demos & References - Updated structure
    client_demos: [] as DemoItem[],
    client_references: [] as ClientReference[],
    employee_references: [] as ClientReference[],
    
    // Landing Page Content
    landing_page_videos: [] as any[],
    
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

  // Partner search effect
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
          const data = await response.json();
          // The API returns an array directly, not wrapped in an object
          setPartnerSearchResults(Array.isArray(data) ? data : []);
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

  const addPartnerRelationship = (partner: any) => {
    if (formData.best_working_partnerships) {
      try {
        const currentPartnerships = typeof formData.best_working_partnerships === 'string'
          ? JSON.parse(formData.best_working_partnerships)
          : formData.best_working_partnerships;
        
        // Check if partner already exists
        if (currentPartnerships.some((p: any) => p.company_name === partner.company_name)) {
          setError('This partner has already been added');
          setTimeout(() => setError(null), 3000);
          return;
        }

        const updatedPartnerships = [...currentPartnerships, partner];
        setFormData(prev => ({
          ...prev,
          best_working_partnerships: JSON.stringify(updatedPartnerships)
        }));
      } catch (e) {
        const newPartnerships = [partner];
        setFormData(prev => ({
          ...prev,
          best_working_partnerships: JSON.stringify(newPartnerships)
        }));
      }
    } else {
      setFormData(prev => ({
        ...prev,
        best_working_partnerships: JSON.stringify([partner])
      }));
    }
    
    // Clear search
    setPartnerSearchQuery('');
    setPartnerSearchResults([]);
  };

  const removePartnerRelationship = (index: number) => {
    if (formData.best_working_partnerships) {
      try {
        const currentPartnerships = typeof formData.best_working_partnerships === 'string'
          ? JSON.parse(formData.best_working_partnerships)
          : formData.best_working_partnerships;
        
        const updatedPartnerships = currentPartnerships.filter((_: any, i: number) => i !== index);
        setFormData(prev => ({
          ...prev,
          best_working_partnerships: updatedPartnerships.length > 0 ? JSON.stringify(updatedPartnerships) : ''
        }));
      } catch (e) {
        console.error('Error removing partner:', e);
      }
    }
  };

  const handleAddNewPartner = () => {
    const newPartner = {
      id: `new-${Date.now()}`,
      company_name: newPartnerData.company_name,
      contact_name: newPartnerData.contact_name,
      contact_email: newPartnerData.contact_email,
      contact_phone: newPartnerData.contact_phone,
      is_new: true
    };
    
    addPartnerRelationship(newPartner);
    
    // Reset modal
    setShowNewPartnerModal(false);
    setNewPartnerData({
      company_name: '',
      contact_name: '',
      contact_email: '',
      contact_phone: ''
    });
  };

  useEffect(() => {
    if (partner) {
      // Initialize form with ALL existing partner data
      setFormData(prev => ({
        ...prev,
        // Company Information
        company_name: partner.company_name || '',
        website: partner.website || '',
        established_year: partner.established_year || '',
        employee_count: partner.employee_count || '',
        ownership_type: partner.ownership_type || '',
        company_description: partner.company_description || '',
        contact_email: partner.contact_email || '',
        power_confidence_score: partner.power_confidence_score || 0,
        is_active: partner.is_active !== undefined ? partner.is_active : true,
        
        // Contact Information - Map from database field names to form field names
        ceo_name: partner.ceo_contact_name || '',
        ceo_email: partner.ceo_contact_email || partner.contact_email || '',
        ceo_phone: partner.ceo_contact_phone || '',
        ceo_title: partner.ceo_contact_title || '',
        
        cx_name: partner.cx_contact_name || '',
        cx_email: partner.cx_contact_email || '',
        cx_phone: partner.cx_contact_phone || '',
        cx_title: partner.cx_contact_title || '',
        
        sales_name: partner.sales_contact_name || '',
        sales_email: partner.sales_contact_email || '',
        sales_phone: partner.sales_contact_phone || '',
        sales_title: partner.sales_contact_title || '',
        
        onboarding_name: partner.onboarding_contact_name || '',
        onboarding_email: partner.onboarding_contact_email || '',
        onboarding_phone: partner.onboarding_contact_phone || '',
        onboarding_title: partner.onboarding_contact_title || '',
        
        marketing_name: partner.marketing_contact_name || '',
        marketing_email: partner.marketing_contact_email || '',
        marketing_phone: partner.marketing_contact_phone || '',
        marketing_title: partner.marketing_contact_title || '',
        
        // Target Audience & Service Areas
        target_revenue_audience: (() => {
          try {
            return JSON.parse(partner.target_revenue_audience || '[]');
          } catch {
            return [];
          }
        })(),
        service_areas: (() => {
          try {
            return JSON.parse(partner.service_areas || '[]');
          } catch {
            return [];
          }
        })(),
        service_areas_other: partner.service_areas_other || '',
        
        // Competitive Analysis
        service_category: partner.service_category || '',
        value_proposition: partner.value_proposition || '',
        why_clients_choose_you: partner.why_clients_choose_you || '',
        why_clients_choose_competitors: partner.why_clients_choose_competitors || '',
        
        // Focus Areas
        focus_areas_12_months: (() => {
          try {
            return JSON.parse(partner.focus_areas_12_months || '[]');
          } catch {
            return [];
          }
        })(),
        
        // Tech Stack
        tech_stack_crm: (() => {
          try {
            return JSON.parse(partner.tech_stack_crm || '[]');
          } catch {
            return [];
          }
        })(),
        tech_stack_project_management: (() => {
          try {
            return JSON.parse(partner.tech_stack_project_management || '[]');
          } catch {
            return [];
          }
        })(),
        tech_stack_communication: (() => {
          try {
            return JSON.parse(partner.tech_stack_communication || '[]');
          } catch {
            return [];
          }
        })(),
        tech_stack_analytics: (() => {
          try {
            return JSON.parse(partner.tech_stack_analytics || '[]');
          } catch {
            return [];
          }
        })(),
        tech_stack_marketing: (() => {
          try {
            return JSON.parse(partner.tech_stack_marketing || '[]');
          } catch {
            return [];
          }
        })(),
        tech_stack_financial: (() => {
          try {
            return JSON.parse(partner.tech_stack_financial || '[]');
          } catch {
            return [];
          }
        })(),
        
        // Sponsorships & Media
        sponsored_events: (() => {
          try {
            return JSON.parse(partner.sponsored_events || '[]');
          } catch {
            return [];
          }
        })(),
        other_sponsored_events: (() => {
          try {
            return JSON.parse(partner.other_sponsored_events || '[]');
          } catch {
            return [];
          }
        })(),
        podcast_appearances: (() => {
          try {
            return JSON.parse(partner.podcast_appearances || '[]');
          } catch {
            return [];
          }
        })(),
        other_podcast_appearances: (() => {
          try {
            return JSON.parse(partner.other_podcast_appearances || '[]');
          } catch {
            return [];
          }
        })(),
        books_read_recommended: partner.books_read_recommended || '',
        best_working_partnerships: partner.best_working_partnerships || '',
        
        // Client Demos & References
        client_demos: (() => {
          try {
            return JSON.parse(partner.client_demos || '[]');
          } catch {
            return [];
          }
        })(),
        client_references: (() => {
          try {
            return JSON.parse(partner.client_references || '[]');
          } catch {
            return [];
          }
        })(),
        employee_references: (() => {
          try {
            return JSON.parse(partner.employee_references || '[]');
          } catch {
            return [];
          }
        })(),
        
        // Landing Page Content
        landing_page_videos: (() => {
          try {
            const videos = partner.landing_page_videos;
            if (typeof videos === 'string') {
              return JSON.parse(videos || '[]');
            }
            return videos || [];
          } catch {
            return [];
          }
        })()
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
    // Skip validation for editing existing partners
    if (partner) return true;
    
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
      case 7: // Partner Relationships
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
      // Skip validation for editing existing partners (admin can save partial updates)
      if (!partner) {
        // Only validate required fields for new partner creation
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
        
        // CEO Contact Information fields
        ceo_contact_name: formData.ceo_name,
        ceo_contact_email: formData.ceo_email,
        ceo_contact_phone: formData.ceo_phone,
        ceo_contact_title: formData.ceo_title,
        
        // Store comprehensive data as JSON in existing flexible fields
        focus_areas_served: formData.service_areas,
        target_revenue_range: formData.target_revenue_audience,
        geographic_regions: [], // Will be expanded in future
        
        power_confidence_score: formData.power_confidence_score,
        pricing_model: formData.pricing_model,
        onboarding_process: formData.onboarding_process,
        
        // Sponsorships & Media - combine predefined and custom entries
        sponsored_events: [
          ...formData.sponsored_events,
          ...(formData.other_sponsored_events || []).map(e => e.name)
        ],
        podcast_appearances: [
          ...formData.podcast_appearances,
          ...(formData.other_podcast_appearances || []).map(p => p.name)
        ],
        books_read_recommended: formData.books_read_recommended,
        
        // Client demos and references - now using proper columns
        client_demos: formData.client_demos.map(demo => ({
          id: demo.id,
          title: demo.title,
          description: demo.description,
          type: demo.type,
          url: demo.url || demo.uploadedUrl || '',
          fileName: demo.fileName
        })),
        client_references: formData.client_references,
        
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
        
        is_active: formData.is_active,
        last_quarterly_report: formData.last_quarterly_report || null
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
      'Key Contact Information', 
      'Client Profile',
      'Sponsorships & Media',
      'Competitive Analysis',
      'Focus Areas for Next 12 Months',
      'Strategic Partners',
      'Pre-Onboarding'
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

  const steps = [
    { number: 1, title: "Company Info", component: null },
    { number: 2, title: "Contacts", component: null },
    { number: 3, title: "Target Market", component: null },
    { number: 4, title: "Media & Events", component: null },
    { number: 5, title: "Positioning", component: null },
    { number: 6, title: "Focus Areas", component: null },
    { number: 7, title: "Partner Relationships", component: null },
    { number: 8, title: "Portfolio", component: null }
  ];

  // Render all form sections for single-page edit view
  const renderAllFormSections = () => {
    return (
      <>
        {/* Section 1: Company Information */}
        <div className="col-span-2">
          <h3 className="text-xl font-semibold text-power100-black mb-4 flex items-center gap-2">
            <Building2 className="h-5 w-5 text-power100-red" />
            Company Information
          </h3>
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

        {/* Section 2: Contact Information */}
        <div className="col-span-2 mt-8">
          <h3 className="text-xl font-semibold text-power100-black mb-4 flex items-center gap-2">
            <Users className="h-5 w-5 text-power100-red" />
            Key Contact Information
          </h3>
          
          {/* CEO Information */}
          <div className="mb-6">
            <h4 className="font-semibold text-lg mb-4">CEO *</h4>
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
          <div className="mb-6">
            <h4 className="font-semibold text-lg mb-4">Customer Experience (CX)</h4>
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
          <div className="mb-6">
            <h4 className="font-semibold text-lg mb-4">Sales</h4>
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
          <div className="mb-6">
            <h4 className="font-semibold text-lg mb-4">Onboarding/Trainer <span className="font-normal text-gray-500">(or equivalent)</span></h4>
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
          <div className="mb-6">
            <h4 className="font-semibold text-lg mb-4">CMO <span className="font-normal text-gray-500">(VP of Marketing, or equivalent)</span></h4>
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

        {/* Section 3: Target Audience & Services */}
        <div className="col-span-2 mt-8">
          <h3 className="text-xl font-semibold text-power100-black mb-4 flex items-center gap-2">
            <Target className="h-5 w-5 text-power100-red" />
            Client Profile
          </h3>
          
          <div className="mb-6">
            <Label>Ideal Client's Revenue Range (Select up to 3) *</Label>
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

          <div className="mb-6">
            <Label>Services Offered By Ideal Client (Select All That Apply) *</Label>
            <div className="mb-3 mt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const allServiceValues = SERVICE_AREAS.map(s => s.value);
                  const allSelected = allServiceValues.every(v => formData.service_areas.includes(v));
                  
                  if (allSelected) {
                    // Deselect all
                    setFormData(prev => ({
                      ...prev,
                      service_areas: []
                    }));
                  } else {
                    // Select all
                    setFormData(prev => ({
                      ...prev,
                      service_areas: allServiceValues
                    }));
                  }
                }}
                className="w-auto"
              >
                {SERVICE_AREAS.every(s => formData.service_areas.includes(s.value)) ? 'Deselect All' : 'Select All'}
              </Button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
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
          </div>
        </div>

        {/* Section 4: Competitive Analysis */}
        <div className="col-span-2 mt-8">
          <h3 className="text-xl font-semibold text-power100-black mb-4 flex items-center gap-2">
            <FileText className="h-5 w-5 text-power100-red" />
            Competitive Analysis
          </h3>
          
          <div className="grid grid-cols-1 gap-6">
            <div>
              <Label htmlFor="value_proposition">Value Proposition *</Label>
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
        </div>

        {/* Section 5: Focus Areas */}
        <div className="col-span-2 mt-8">
          <h3 className="text-xl font-semibold text-power100-black mb-4 flex items-center gap-2">
            <Star className="h-5 w-5 text-power100-red" />
            Focus Areas Next 12 Months
          </h3>
          
          <div className="mb-6">
            <Label>Focus Areas (Select up to 3) *</Label>
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

        {/* Section 6: Sponsorships & Media */}
        <div className="col-span-2 mt-8">
          <h3 className="text-xl font-semibold text-power100-black mb-4 flex items-center gap-2">
            <Star className="h-5 w-5 text-power100-red" />
            Sponsorships & Media
          </h3>
          
          <div className="grid grid-cols-1 gap-6">
            <div>
              <Label>Events your CEO sponsors (check all that apply)</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-2">
                {/* Predefined list of industry events */}
                {INDUSTRY_EVENTS.map(event => (
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
                <p className="text-sm text-power100-grey mb-2">
                  Add any additional events with their URLs
                </p>
                <DynamicListWithUrl
                  items={formData.other_sponsored_events || []}
                  onChange={(items) => handleInputChange('other_sponsored_events', items)}
                  namePlaceholder="Enter additional event name"
                  urlPlaceholder="Enter event URL (optional)"
                  addButtonText="Add Event"
                />
              </div>
            </div>

            <div>
              <Label>Podcasts your CEO has appeared on within the last 2 years</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-2">
                {/* Predefined list of common industry podcasts */}
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
        </div>

        {/* Section 7: Partner Relationships */}
        <div className="col-span-2 mt-8">
          <h3 className="text-xl font-semibold text-power100-black mb-4 flex items-center gap-2">
            <Building2 className="h-5 w-5 text-power100-red" />
            Partner Relationships
          </h3>
          
          <div className="space-y-4">
            {/* Partner Search */}
            <div>
              <Label>Search and add partners</Label>
              <div className="relative mt-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Start typing partner name..."
                    value={partnerSearchQuery}
                    onChange={(e) => setPartnerSearchQuery(e.target.value)}
                    className="pl-10 pr-10"
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
                          onClick={() => addPartnerRelationship({
                            id: partner.id,
                            company_name: partner.company_name,
                            contact_name: '',
                            contact_email: '',
                            contact_phone: ''
                          })}
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

            {/* Current Partner Relationships */}
            <div>
              <Label>Current Partner Relationships</Label>
              <div className="mt-2">
                {(() => {
                  try {
                    const partnerships = formData.best_working_partnerships
                      ? (typeof formData.best_working_partnerships === 'string' 
                        ? JSON.parse(formData.best_working_partnerships)
                        : formData.best_working_partnerships)
                      : [];
                    
                    if (!partnerships || partnerships.length === 0) {
                      return (
                        <div className="p-4 bg-gray-50 rounded-lg">
                          <p className="text-gray-500">No partner relationships added yet.</p>
                        </div>
                      );
                    }
                    
                    return (
                      <div className="space-y-3">
                        {partnerships.map((partner: any, index: number) => (
                          <div key={index} className="p-3 bg-white rounded border flex justify-between items-start">
                            <div>
                              <div className="font-medium">{partner.company_name}</div>
                              {partner.contact_name && (
                                <div className="text-sm text-gray-600 mt-1">
                                  Contact: {partner.contact_name}
                                  {partner.contact_email && ` (${partner.contact_email})`}
                                  {partner.contact_phone && ` - ${partner.contact_phone}`}
                                </div>
                              )}
                              {partner.is_new && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 mt-1">
                                  New Partner
                                </span>
                              )}
                            </div>
                            <button
                              onClick={() => removePartnerRelationship(index)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    );
                  } catch (e) {
                    return (
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <p className="text-gray-500">No partner relationships added yet.</p>
                      </div>
                    );
                  }
                })()}
              </div>
            </div>
          </div>

          {/* New Partner Modal */}
          {showNewPartnerModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">Add New Partner</h3>
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
                  <div>
                    <Label>Company Name</Label>
                    <Input
                      value={newPartnerData.company_name}
                      onChange={(e) => setNewPartnerData(prev => ({ ...prev, company_name: e.target.value }))}
                      placeholder="Enter company name"
                      className="mt-1"
                    />
                  </div>
                  
                  <div>
                    <Label>Contact Name (Optional)</Label>
                    <Input
                      value={newPartnerData.contact_name}
                      onChange={(e) => setNewPartnerData(prev => ({ ...prev, contact_name: e.target.value }))}
                      placeholder="Enter contact name"
                      className="mt-1"
                    />
                  </div>
                  
                  <div>
                    <Label>Contact Email (Optional)</Label>
                    <Input
                      type="email"
                      value={newPartnerData.contact_email}
                      onChange={(e) => setNewPartnerData(prev => ({ ...prev, contact_email: e.target.value }))}
                      placeholder="Enter contact email"
                      className="mt-1"
                    />
                  </div>
                  
                  <div>
                    <Label>Contact Phone (Optional)</Label>
                    <Input
                      type="tel"
                      value={newPartnerData.contact_phone}
                      onChange={(e) => setNewPartnerData(prev => ({ ...prev, contact_phone: e.target.value }))}
                      placeholder="Enter contact phone"
                      className="mt-1"
                    />
                  </div>
                  
                  <div className="flex justify-end gap-2 mt-6">
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
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleAddNewPartner}
                      disabled={!newPartnerData.company_name.trim()}
                      className="bg-power100-green hover:bg-green-700 text-white"
                    >
                      Add Partner
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Section 8: Client Demos & References */}
        <div className="col-span-2 mt-8">
          <h3 className="text-xl font-semibold text-power100-black mb-4 flex items-center gap-2">
            <FileText className="h-5 w-5 text-power100-red" />
            Client Demos & References
          </h3>
          
          <div className="grid grid-cols-1 gap-8">
            <div>
              <Label htmlFor="client_demos">Client Demos (At least 5)</Label>
              <p className="text-sm text-power100-grey mt-1 mb-4">
                Upload recorded demos directly to our platform or provide links to videos (YouTube, Vimeo, etc.) showcasing your work
              </p>
              <DemoUploadList
                items={formData.client_demos}
                onChange={(items) => handleInputChange('client_demos', items)}
                className="mt-1"
                maxItems={10}
              />
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h4 className="font-medium text-yellow-900 mb-2">PowerConfidence Ranking Requirements</h4>
              <p className="text-sm text-yellow-800 mb-2">
                <strong>Important:</strong> To receive your initial PowerConfidence ranking, we require feedback from both clients and employees.
              </p>
              <p className="text-sm text-yellow-800">
                • <strong>Clients:</strong> We'll send PowerCards to verify your work quality and obtain direct feedback
                • <strong>Employees:</strong> We'll send PowerCards to understand your company culture and internal operations
              </p>
              <p className="text-sm text-yellow-700 mt-2">
                <strong>Minimum requirement for ranking:</strong> 5 completed PowerCards from each group
              </p>
            </div>
            
            <div>
              <Label htmlFor="client_references">Client References (At least 5)</Label>
              <p className="text-sm text-power100-grey mt-1 mb-4">
                Provide clients that match your target audience and have given permission to be contacted for PowerCard evaluations
              </p>
              <ClientReferenceList
                items={formData.client_references}
                onChange={(items) => handleInputChange('client_references', items)}
                className="mt-1"
                maxItems={10}
              />
            </div>

            <div>
              <Label htmlFor="employee_references">Employee References (At least 5)</Label>
              <p className="text-sm text-power100-grey mt-1 mb-4">
                Provide employees who can speak to your company culture and will receive PowerCard evaluations
              </p>
              <ClientReferenceList
                items={formData.employee_references}
                onChange={(items) => handleInputChange('employee_references', items)}
                className="mt-1"
                maxItems={10}
              />
            </div>

            {/* Landing Page Videos - Added for Edit Mode */}
            <div>
              <VideoManager
                videos={formData.landing_page_videos || []}
                onChange={(videos) => handleInputChange('landing_page_videos', videos)}
                label="Landing Page Videos"
              />
              <p className="text-sm text-gray-500 mt-2">
                These videos will appear on your public landing page. You can add YouTube links and custom thumbnails.
              </p>
            </div>
          </div>
        </div>
      </>
    );
  };

  // Check if we're editing an existing partner
  const isEditMode = !!partner;
  
  // If editing, render single-page view
  if (isEditMode) {
    return (
      <div className="min-h-screen bg-power100-bg-grey">
        {/* Edit Header - White Background */}
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-6xl mx-auto px-6 py-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-power100-black">
                  Edit Partner
                </h1>
                <p className="text-power100-grey mt-1">
                  Update {formData.company_name || 'partner'} information
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                className="px-6 py-2 rounded-full border-power100-grey text-power100-grey"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>

        {/* Single Page Edit Form */}
        <div className="max-w-6xl mx-auto px-6 py-8">
          <form onSubmit={handleSubmit}>
            <Card className="bg-white shadow-lg border-0">
              <CardContent className="p-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* All form sections in a single scrollable view */}
                  {renderAllFormSections()}
                </div>
                
                {/* Error Display */}
                {error && (
                  <Alert className="mt-6 bg-red-50 border-red-200">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription className="text-red-700">{error}</AlertDescription>
                  </Alert>
                )}
                
                {/* Save Button */}
                <div className="flex justify-center mt-8">
                  <Button
                    type="submit"
                    disabled={loading}
                    className="bg-power100-green hover:bg-green-700 text-white px-12 py-3 rounded-full font-semibold text-lg"
                  >
                    <Save className="h-5 w-5 mr-3" />
                    {loading ? 'Updating...' : 'Update Partner'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </form>
        </div>
      </div>
    );
  }
  
  // Otherwise render multi-step onboarding view
  return (
    <div className="min-h-screen bg-power100-bg-grey">
      {/* Progress Header - White Background */}
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
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Step 3: Client Profile */}
          {currentStep === 3 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {getStepIcon(3)}
                  Client Profile
                </CardTitle>
                <p className="text-sm text-power100-grey">Tell us about your ideal client</p>
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

          {/* Step 4: Sponsorships & Media */}
          {currentStep === 4 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {getStepIcon(4)}
                  Sponsorships & Media
                </CardTitle>
                <p className="text-sm text-power100-grey">Share your industry involvement and media presence</p>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label>Events & Shows Sponsored or Spoke At</Label>
                  <p className="text-sm text-power100-grey mb-2">
                    List events, trade shows, or conferences where you've been a sponsor or speaker
                  </p>
                  <SimpleDynamicList
                    items={formData.events_sponsored || []}
                    onChange={(items) => handleInputChange('events_sponsored', items)}
                    placeholder="Add event or show..."
                    addButtonText="Add Event"
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
                  Competitive Analysis
                </CardTitle>
                <p className="text-sm text-power100-grey">Help us understand your market position</p>
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
                <p className="text-sm text-power100-grey">Select up to 3 areas you plan to focus on</p>
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

          {/* Step 7: Strategic Partners */}
          {currentStep === 7 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {getStepIcon(7)}
                  Strategic Partners
                </CardTitle>
                <p className="text-sm text-power100-grey">List your top 3 strategic partnerships</p>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  {formData.best_working_partnerships ? (
                    <div>
                      <Label>Current Partner Relationships</Label>
                      <div className="mt-2 p-4 bg-gray-50 rounded-lg">
                        {(() => {
                          try {
                            const partnerships = typeof formData.best_working_partnerships === 'string' 
                              ? JSON.parse(formData.best_working_partnerships)
                              : formData.best_working_partnerships;
                            
                            if (!partnerships || partnerships.length === 0) {
                              return <p className="text-gray-500">No partner relationships recorded</p>;
                            }
                            
                            return (
                              <div className="space-y-3">
                                {partnerships.map((partner: any, index: number) => (
                                  <div key={index} className="p-3 bg-white rounded border">
                                    <div className="font-medium">{partner.company_name}</div>
                                    {partner.contact_name && (
                                      <div className="text-sm text-gray-600 mt-1">
                                        Contact: {partner.contact_name}
                                        {partner.contact_email && ` (${partner.contact_email})`}
                                        {partner.contact_phone && ` - ${partner.contact_phone}`}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            );
                          } catch (e) {
                            return <p className="text-gray-500">No partner relationships recorded</p>;
                          }
                        })()}
                      </div>
                      <p className="text-sm text-gray-500 mt-2">
                        Partner relationships are managed through the partner onboarding process.
                      </p>
                    </div>
                  ) : (
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-gray-500">No partner relationships have been added yet.</p>
                      <p className="text-sm text-gray-400 mt-1">
                        Partner relationships are captured during the partner onboarding process.
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 8: Pre-Onboarding */}
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
                      Pre-Onboarding
                    </h2>
                    <p className="text-power100-grey">
                      Final details before we activate your profile
                    </p>
                  </div>
                  
                  {/* Form Fields */}
                  <div className="space-y-8">
                    <div>
                      <Label>Client Demos (At least 5)</Label>
                      <p className="text-sm text-power100-grey mt-1 mb-4">
                        Upload recorded demos directly or provide links to videos (YouTube, Vimeo, etc.) showcasing your work
                      </p>
                      <DemoUploadList
                        items={formData.client_demos}
                        onChange={(items) => handleInputChange('client_demos', items)}
                        maxItems={10}
                      />
                    </div>

                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <h4 className="font-medium text-yellow-900 mb-2">PowerConfidence Ranking Requirements</h4>
                      <p className="text-sm text-yellow-800 mb-2">
                        <strong>Important:</strong> To receive your initial PowerConfidence ranking, we require feedback from both clients and employees.
                      </p>
                      <p className="text-sm text-yellow-800">
                        • <strong>Clients:</strong> We'll send PowerCards to verify your work quality and obtain direct feedback
                        • <strong>Employees:</strong> We'll send PowerCards to understand your company culture and internal operations
                      </p>
                      <p className="text-sm text-yellow-700 mt-2">
                        <strong>Minimum requirement for ranking:</strong> 5 completed PowerCards from each group
                      </p>
                    </div>
                    
                    <div>
                      <Label>Client References (At least 5)</Label>
                      <p className="text-sm text-power100-grey mt-1 mb-4">
                        Provide clients that match your target audience and have given permission to be contacted for PowerCard evaluations
                      </p>
                      <ClientReferenceList
                        items={formData.client_references}
                        onChange={(items) => handleInputChange('client_references', items)}
                        maxItems={10}
                      />
                    </div>

                    <div>
                      <Label>Employee References (At least 5)</Label>
                      <p className="text-sm text-power100-grey mt-1 mb-4">
                        Provide employees who can speak to your company culture and will receive PowerCard evaluations
                      </p>
                      <ClientReferenceList
                        items={formData.employee_references}
                        onChange={(items) => handleInputChange('employee_references', items)}
                        maxItems={10}
                      />
                    </div>

                    {/* Landing Page Videos */}
                    <div className="pt-8 border-t">
                      <VideoManager
                        videos={formData.landing_page_videos || []}
                        onChange={(videos) => handleInputChange('landing_page_videos', videos)}
                        label="Landing Page Videos"
                      />
                      <p className="text-sm text-gray-500 mt-2">
                        These videos will appear on your public landing page. You can add YouTube links and custom thumbnails.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
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
                type="submit"
                disabled={loading || !isStepValid(currentStep)}
                className="bg-power100-green hover:bg-green-700 text-white px-8 py-2 rounded-full font-semibold"
              >
                <Save className="h-4 w-4 mr-2" />
                {loading ? 'Saving...' : (partner ? 'Update Partner' : 'Create Partner')}
              </Button>
            )}
            
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={loading}
              className="px-6 py-2 rounded-full border-power100-grey text-power100-grey"
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default PartnerForm;