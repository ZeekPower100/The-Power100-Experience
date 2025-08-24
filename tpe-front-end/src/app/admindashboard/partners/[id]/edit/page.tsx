'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  Building2, 
  Save,
  X,
  ArrowLeft,
  Plus,
  Trash2,
  Users,
  Target,
  Award,
  Briefcase,
  TrendingUp,
  Calendar,
  Star
} from 'lucide-react';
import { partnerApi } from '@/lib/api';

interface PartnerEditData {
  // Basic Information - All fields from database
  company_name: string;
  description: string;
  logo_url: string;
  website: string;
  contact_email: string;
  contact_phone: string;
  power100_subdomain: string;
  
  // Business Details
  established_year: string;
  employee_count: string;
  ownership_type: string;
  company_description: string;
  
  // Service Information
  focus_areas_served: string[];
  target_revenue_range: string[];
  geographic_regions: string[];
  service_areas: string[];
  service_areas_other: string;
  service_category: string;
  target_revenue_audience: string[];
  focus_areas_12_months: string[];
  
  // Value Proposition
  value_proposition: string;
  why_clients_choose_you: string;
  why_clients_choose_competitors: string;
  key_differentiators: string[];
  pricing_model: string;
  
  // Performance Metrics
  power_confidence_score: number;
  previous_powerconfidence_score: number;
  score_trend: string;
  industry_rank: number;
  category_rank: number;
  
  // Feedback & Reviews
  last_feedback_update: string;
  total_feedback_responses: number;
  average_satisfaction: number;
  feedback_trend: string;
  next_quarterly_review: string;
  avg_contractor_satisfaction: number;
  total_contractor_engagements: number;
  
  // Contact Information
  ceo_contact_name: string;
  ceo_contact_email: string;
  ceo_contact_phone: string;
  ceo_contact_title: string;
  
  cx_contact_name: string;
  cx_contact_email: string;
  cx_contact_phone: string;
  cx_contact_title: string;
  
  sales_contact_name: string;
  sales_contact_email: string;
  sales_contact_phone: string;
  sales_contact_title: string;
  
  onboarding_contact_name: string;
  onboarding_contact_email: string;
  onboarding_contact_phone: string;
  onboarding_contact_title: string;
  
  marketing_contact_name: string;
  marketing_contact_email: string;
  marketing_contact_phone: string;
  marketing_contact_title: string;
  
  // Technology Stack
  tech_stack_crm: string[];
  tech_stack_project_management: string[];
  tech_stack_communication: string[];
  tech_stack_analytics: string[];
  tech_stack_marketing: string[];
  tech_stack_financial: string[];
  
  // Marketing & Partnerships
  sponsored_events: string[];
  podcast_appearances: string[];
  books_read_recommended: string;
  best_working_partnerships: string;
  
  // Client Information
  client_demos: string[];
  client_references: string[];
  client_testimonials: string[];
  
  // Administrative
  is_active: boolean;
  dashboard_access_enabled: boolean;
  last_dashboard_login: string;
  onboarding_url: string;
  demo_booking_url: string;
  onboarding_process: string;
  last_quarterly_report: string;
}

const FOCUS_AREAS_OPTIONS = [
  'controlling_lead_flow',
  'hiring_sales_leadership',
  'installation_quality',
  'digital_marketing',
  'operational_efficiency',
  'recession_proofing',
  'greenfield_growth',
  'customer_retention',
  'sales_training',
  'business_development',
  'closing_higher_percentage'
];

const REVENUE_RANGES = [
  'under_100k',
  '100k_500k',
  '500k_1m',
  '1m_5m',
  '5m_10m',
  'over_10m'
];

const OWNERSHIP_TYPES = [
  'Private',
  'Public',
  'Partnership',
  'LLC',
  'Corporation',
  'Sole Proprietorship'
];

const GEOGRAPHIC_REGIONS = [
  'North America',
  'South America',
  'Europe',
  'Asia',
  'Africa',
  'Australia',
  'Middle East'
];

export default function PartnerEditPage() {
  const params = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<PartnerEditData>({
    company_name: '',
    description: '',
    logo_url: '',
    website: '',
    contact_email: '',
    contact_phone: '',
    power100_subdomain: '',
    established_year: '',
    employee_count: '',
    ownership_type: '',
    company_description: '',
    focus_areas_served: [],
    target_revenue_range: [],
    geographic_regions: [],
    service_areas: [],
    service_areas_other: '',
    service_category: '',
    target_revenue_audience: [],
    focus_areas_12_months: [],
    value_proposition: '',
    why_clients_choose_you: '',
    why_clients_choose_competitors: '',
    key_differentiators: [],
    pricing_model: '',
    power_confidence_score: 0,
    previous_powerconfidence_score: 0,
    score_trend: 'stable',
    industry_rank: 0,
    category_rank: 0,
    last_feedback_update: '',
    total_feedback_responses: 0,
    average_satisfaction: 0,
    feedback_trend: 'stable',
    next_quarterly_review: '',
    avg_contractor_satisfaction: 0,
    total_contractor_engagements: 0,
    ceo_contact_name: '',
    ceo_contact_email: '',
    ceo_contact_phone: '',
    ceo_contact_title: '',
    cx_contact_name: '',
    cx_contact_email: '',
    cx_contact_phone: '',
    cx_contact_title: '',
    sales_contact_name: '',
    sales_contact_email: '',
    sales_contact_phone: '',
    sales_contact_title: '',
    onboarding_contact_name: '',
    onboarding_contact_email: '',
    onboarding_contact_phone: '',
    onboarding_contact_title: '',
    marketing_contact_name: '',
    marketing_contact_email: '',
    marketing_contact_phone: '',
    marketing_contact_title: '',
    tech_stack_crm: [],
    tech_stack_project_management: [],
    tech_stack_communication: [],
    tech_stack_analytics: [],
    tech_stack_marketing: [],
    tech_stack_financial: [],
    sponsored_events: [],
    podcast_appearances: [],
    books_read_recommended: '',
    best_working_partnerships: '',
    client_demos: [],
    client_references: [],
    client_testimonials: [],
    is_active: true,
    dashboard_access_enabled: false,
    last_dashboard_login: '',
    onboarding_url: '',
    demo_booking_url: '',
    onboarding_process: '',
    last_quarterly_report: ''
  });

  useEffect(() => {
    loadPartner();
  }, [params.id]);

  const parseJSON = (data: any, defaultValue: any = []) => {
    if (!data) return defaultValue;
    if (typeof data === 'string') {
      try {
        return JSON.parse(data);
      } catch {
        return defaultValue;
      }
    }
    return Array.isArray(data) ? data : defaultValue;
  };

  const loadPartner = async () => {
    try {
      setLoading(true);
      const response = await partnerApi.getById(params.id as string);
      const partner = response.partner;
      
      setFormData({
        company_name: partner.company_name || '',
        description: partner.description || '',
        logo_url: partner.logo_url || '',
        website: partner.website || '',
        contact_email: partner.contact_email || '',
        contact_phone: partner.contact_phone || '',
        power100_subdomain: partner.power100_subdomain || '',
        established_year: partner.established_year || '',
        employee_count: partner.employee_count || '',
        ownership_type: partner.ownership_type || '',
        company_description: partner.company_description || '',
        focus_areas_served: parseJSON(partner.focus_areas_served),
        target_revenue_range: parseJSON(partner.target_revenue_range),
        geographic_regions: parseJSON(partner.geographic_regions),
        service_areas: parseJSON(partner.service_areas),
        service_areas_other: partner.service_areas_other || '',
        service_category: partner.service_category || '',
        target_revenue_audience: parseJSON(partner.target_revenue_audience),
        focus_areas_12_months: parseJSON(partner.focus_areas_12_months),
        value_proposition: partner.value_proposition || '',
        why_clients_choose_you: partner.why_clients_choose_you || '',
        why_clients_choose_competitors: partner.why_clients_choose_competitors || '',
        key_differentiators: parseJSON(partner.key_differentiators),
        pricing_model: partner.pricing_model || '',
        power_confidence_score: partner.power_confidence_score || 0,
        previous_powerconfidence_score: partner.previous_powerconfidence_score || 0,
        score_trend: partner.score_trend || 'stable',
        industry_rank: partner.industry_rank || 0,
        category_rank: partner.category_rank || 0,
        last_feedback_update: partner.last_feedback_update || '',
        total_feedback_responses: partner.total_feedback_responses || 0,
        average_satisfaction: partner.average_satisfaction || 0,
        feedback_trend: partner.feedback_trend || 'stable',
        next_quarterly_review: partner.next_quarterly_review || '',
        avg_contractor_satisfaction: partner.avg_contractor_satisfaction || 0,
        total_contractor_engagements: partner.total_contractor_engagements || 0,
        ceo_contact_name: partner.ceo_contact_name || '',
        ceo_contact_email: partner.ceo_contact_email || '',
        ceo_contact_phone: partner.ceo_contact_phone || '',
        ceo_contact_title: partner.ceo_contact_title || '',
        cx_contact_name: partner.cx_contact_name || '',
        cx_contact_email: partner.cx_contact_email || '',
        cx_contact_phone: partner.cx_contact_phone || '',
        cx_contact_title: partner.cx_contact_title || '',
        sales_contact_name: partner.sales_contact_name || '',
        sales_contact_email: partner.sales_contact_email || '',
        sales_contact_phone: partner.sales_contact_phone || '',
        sales_contact_title: partner.sales_contact_title || '',
        onboarding_contact_name: partner.onboarding_contact_name || '',
        onboarding_contact_email: partner.onboarding_contact_email || '',
        onboarding_contact_phone: partner.onboarding_contact_phone || '',
        onboarding_contact_title: partner.onboarding_contact_title || '',
        marketing_contact_name: partner.marketing_contact_name || '',
        marketing_contact_email: partner.marketing_contact_email || '',
        marketing_contact_phone: partner.marketing_contact_phone || '',
        marketing_contact_title: partner.marketing_contact_title || '',
        tech_stack_crm: parseJSON(partner.tech_stack_crm),
        tech_stack_project_management: parseJSON(partner.tech_stack_project_management),
        tech_stack_communication: parseJSON(partner.tech_stack_communication),
        tech_stack_analytics: parseJSON(partner.tech_stack_analytics),
        tech_stack_marketing: parseJSON(partner.tech_stack_marketing),
        tech_stack_financial: parseJSON(partner.tech_stack_financial),
        sponsored_events: parseJSON(partner.sponsored_events),
        podcast_appearances: parseJSON(partner.podcast_appearances),
        books_read_recommended: partner.books_read_recommended || '',
        best_working_partnerships: partner.best_working_partnerships || '',
        client_demos: parseJSON(partner.client_demos),
        client_references: parseJSON(partner.client_references),
        client_testimonials: parseJSON(partner.client_testimonials),
        is_active: partner.is_active ?? true,
        dashboard_access_enabled: partner.dashboard_access_enabled ?? false,
        last_dashboard_login: partner.last_dashboard_login || '',
        onboarding_url: partner.onboarding_url || '',
        demo_booking_url: partner.demo_booking_url || '',
        onboarding_process: partner.onboarding_process || '',
        last_quarterly_report: partner.last_quarterly_report || ''
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load partner');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof PartnerEditData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleArrayItemAdd = (field: keyof PartnerEditData, value: string) => {
    if (value.trim()) {
      setFormData(prev => ({
        ...prev,
        [field]: [...(prev[field] as string[]), value.trim()]
      }));
    }
  };

  const handleArrayItemRemove = (field: keyof PartnerEditData, index: number) => {
    setFormData(prev => ({
      ...prev,
      [field]: (prev[field] as string[]).filter((_, i) => i !== index)
    }));
  };

  const handleMultiSelectToggle = (field: keyof PartnerEditData, value: string) => {
    setFormData(prev => {
      const currentValues = prev[field] as string[];
      if (currentValues.includes(value)) {
        return {
          ...prev,
          [field]: currentValues.filter(v => v !== value)
        };
      }
      return {
        ...prev,
        [field]: [...currentValues, value]
      };
    });
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      
      // Prepare data for API
      const dataToSend = {
        ...formData,
        // Ensure arrays are properly formatted
        focus_areas_served: formData.focus_areas_served,
        target_revenue_range: formData.target_revenue_range,
        geographic_regions: formData.geographic_regions,
        key_differentiators: formData.key_differentiators,
        service_areas: formData.service_areas,
        target_revenue_audience: formData.target_revenue_audience,
        focus_areas_12_months: formData.focus_areas_12_months,
        tech_stack_crm: formData.tech_stack_crm,
        tech_stack_project_management: formData.tech_stack_project_management,
        tech_stack_communication: formData.tech_stack_communication,
        tech_stack_analytics: formData.tech_stack_analytics,
        tech_stack_marketing: formData.tech_stack_marketing,
        tech_stack_financial: formData.tech_stack_financial,
        sponsored_events: formData.sponsored_events,
        podcast_appearances: formData.podcast_appearances,
        client_demos: formData.client_demos,
        client_references: formData.client_references,
        client_testimonials: formData.client_testimonials
      };
      
      await partnerApi.update(params.id as string, dataToSend);
      router.push(`/admindashboard/partners/${params.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save partner');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    router.push(`/admindashboard/partners/${params.id}`);
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error && !formData.company_name) {
    return (
      <div className="container mx-auto p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={handleCancel}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Cancel
          </Button>
          <h1 className="text-3xl font-bold text-gray-900">Edit Partner</h1>
          <p className="text-gray-600">Update {formData.company_name} information</p>
        </div>
        <Button 
          onClick={handleSave} 
          disabled={saving}
          className="bg-power100-green hover:bg-green-600"
        >
          <Save className="w-4 h-4 mr-2" />
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Company Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-power100-red" />
            Company Information
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Company Name *</label>
            <Input
              value={formData.company_name}
              onChange={(e) => handleInputChange('company_name', e.target.value)}
              placeholder="Enter company name"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Year Established</label>
            <Input
              value={formData.established_year}
              onChange={(e) => handleInputChange('established_year', e.target.value)}
              placeholder="YYYY"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Employee Count</label>
            <Input
              value={formData.employee_count}
              onChange={(e) => handleInputChange('employee_count', e.target.value)}
              placeholder="Number of employees"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Ownership Type</label>
            <select
              value={formData.ownership_type}
              onChange={(e) => handleInputChange('ownership_type', e.target.value)}
              className="w-full p-2 border rounded-md"
            >
              <option value="">Select ownership type</option>
              {OWNERSHIP_TYPES.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Website</label>
            <Input
              value={formData.website}
              onChange={(e) => handleInputChange('website', e.target.value)}
              placeholder="https://company.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Power100 Subdomain</label>
            <Input
              value={formData.power100_subdomain}
              onChange={(e) => handleInputChange('power100_subdomain', e.target.value)}
              placeholder="company.power100.io"
            />
          </div>
          <div className="col-span-full">
            <label className="block text-sm font-medium mb-2">Description</label>
            <Textarea
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Brief company description"
              rows={3}
            />
          </div>
          <div className="col-span-full">
            <label className="block text-sm font-medium mb-2">Detailed Company Description</label>
            <Textarea
              value={formData.company_description}
              onChange={(e) => handleInputChange('company_description', e.target.value)}
              placeholder="Detailed company description"
              rows={4}
            />
          </div>
        </CardContent>
      </Card>

      {/* PowerConfidence Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="w-5 h-5 text-power100-red" />
            PowerConfidence Metrics
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Current Score</label>
            <Input
              type="number"
              min="0"
              max="100"
              value={formData.power_confidence_score}
              onChange={(e) => handleInputChange('power_confidence_score', parseInt(e.target.value) || 0)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Previous Score</label>
            <Input
              type="number"
              min="0"
              max="100"
              value={formData.previous_powerconfidence_score}
              onChange={(e) => handleInputChange('previous_powerconfidence_score', parseInt(e.target.value) || 0)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Score Trend</label>
            <select
              value={formData.score_trend}
              onChange={(e) => handleInputChange('score_trend', e.target.value)}
              className="w-full p-2 border rounded-md"
            >
              <option value="stable">Stable</option>
              <option value="up">Up</option>
              <option value="down">Down</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Industry Rank</label>
            <Input
              type="number"
              min="0"
              value={formData.industry_rank}
              onChange={(e) => handleInputChange('industry_rank', parseInt(e.target.value) || 0)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Average Satisfaction</label>
            <Input
              type="number"
              min="0"
              max="10"
              step="0.1"
              value={formData.average_satisfaction}
              onChange={(e) => handleInputChange('average_satisfaction', parseFloat(e.target.value) || 0)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Total Feedback Responses</label>
            <Input
              type="number"
              min="0"
              value={formData.total_feedback_responses}
              onChange={(e) => handleInputChange('total_feedback_responses', parseInt(e.target.value) || 0)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Feedback Trend</label>
            <select
              value={formData.feedback_trend}
              onChange={(e) => handleInputChange('feedback_trend', e.target.value)}
              className="w-full p-2 border rounded-md"
            >
              <option value="stable">Stable</option>
              <option value="improving">Improving</option>
              <option value="declining">Declining</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Next Quarterly Review</label>
            <Input
              type="date"
              value={formData.next_quarterly_review ? formData.next_quarterly_review.split('T')[0] : ''}
              onChange={(e) => handleInputChange('next_quarterly_review', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Total Contractor Engagements</label>
            <Input
              type="number"
              min="0"
              value={formData.total_contractor_engagements}
              onChange={(e) => handleInputChange('total_contractor_engagements', parseInt(e.target.value) || 0)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Service Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-power100-red" />
            Service Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Service Category</label>
            <Input
              value={formData.service_category}
              onChange={(e) => handleInputChange('service_category', e.target.value)}
              placeholder="Enter service category"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Focus Areas Served</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {FOCUS_AREAS_OPTIONS.map(area => (
                <Badge
                  key={area}
                  variant={formData.focus_areas_served.includes(area) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => handleMultiSelectToggle('focus_areas_served', area)}
                >
                  {area.replace(/_/g, ' ')}
                </Badge>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Target Revenue Range</label>
            <div className="flex flex-wrap gap-2">
              {REVENUE_RANGES.map(range => (
                <Badge
                  key={range}
                  variant={formData.target_revenue_range.includes(range) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => handleMultiSelectToggle('target_revenue_range', range)}
                >
                  {range.replace(/_/g, ' ')}
                </Badge>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Geographic Regions</label>
            <div className="flex flex-wrap gap-2">
              {GEOGRAPHIC_REGIONS.map(region => (
                <Badge
                  key={region}
                  variant={formData.geographic_regions.includes(region) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => handleMultiSelectToggle('geographic_regions', region)}
                >
                  {region}
                </Badge>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Pricing Model</label>
            <Input
              value={formData.pricing_model}
              onChange={(e) => handleInputChange('pricing_model', e.target.value)}
              placeholder="Enter pricing model"
            />
          </div>
        </CardContent>
      </Card>

      {/* Value Proposition */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="w-5 h-5 text-power100-red" />
            Value Proposition
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Value Proposition</label>
            <Textarea
              value={formData.value_proposition}
              onChange={(e) => handleInputChange('value_proposition', e.target.value)}
              placeholder="Enter value proposition"
              rows={3}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Why Clients Choose You</label>
            <Textarea
              value={formData.why_clients_choose_you}
              onChange={(e) => handleInputChange('why_clients_choose_you', e.target.value)}
              placeholder="Enter reasons clients choose you"
              rows={3}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Why Clients Choose Competitors</label>
            <Textarea
              value={formData.why_clients_choose_competitors}
              onChange={(e) => handleInputChange('why_clients_choose_competitors', e.target.value)}
              placeholder="Enter reasons clients choose competitors"
              rows={3}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Key Differentiators</label>
            <div className="space-y-2">
              {formData.key_differentiators.map((diff, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={diff}
                    onChange={(e) => {
                      const newDiffs = [...formData.key_differentiators];
                      newDiffs[index] = e.target.value;
                      handleInputChange('key_differentiators', newDiffs);
                    }}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleArrayItemRemove('key_differentiators', index)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleArrayItemAdd('key_differentiators', '')}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Differentiator
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Contacts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-power100-red" />
            Key Contacts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* CEO Contact */}
            <div className="border rounded-lg p-4">
              <h4 className="font-semibold mb-3">CEO Information</h4>
              <div className="space-y-2">
                <Input
                  placeholder="Name"
                  value={formData.ceo_contact_name}
                  onChange={(e) => handleInputChange('ceo_contact_name', e.target.value)}
                />
                <Input
                  placeholder="Title"
                  value={formData.ceo_contact_title}
                  onChange={(e) => handleInputChange('ceo_contact_title', e.target.value)}
                />
                <Input
                  placeholder="Email"
                  type="email"
                  value={formData.ceo_contact_email}
                  onChange={(e) => handleInputChange('ceo_contact_email', e.target.value)}
                />
                <Input
                  placeholder="Phone"
                  value={formData.ceo_contact_phone}
                  onChange={(e) => handleInputChange('ceo_contact_phone', e.target.value)}
                />
              </div>
            </div>

            {/* CX Contact */}
            <div className="border rounded-lg p-4">
              <h4 className="font-semibold mb-3">Customer Experience (CX)</h4>
              <div className="space-y-2">
                <Input
                  placeholder="Name"
                  value={formData.cx_contact_name}
                  onChange={(e) => handleInputChange('cx_contact_name', e.target.value)}
                />
                <Input
                  placeholder="Title"
                  value={formData.cx_contact_title}
                  onChange={(e) => handleInputChange('cx_contact_title', e.target.value)}
                />
                <Input
                  placeholder="Email"
                  type="email"
                  value={formData.cx_contact_email}
                  onChange={(e) => handleInputChange('cx_contact_email', e.target.value)}
                />
                <Input
                  placeholder="Phone"
                  value={formData.cx_contact_phone}
                  onChange={(e) => handleInputChange('cx_contact_phone', e.target.value)}
                />
              </div>
            </div>

            {/* Sales Contact */}
            <div className="border rounded-lg p-4">
              <h4 className="font-semibold mb-3">Sales</h4>
              <div className="space-y-2">
                <Input
                  placeholder="Name"
                  value={formData.sales_contact_name}
                  onChange={(e) => handleInputChange('sales_contact_name', e.target.value)}
                />
                <Input
                  placeholder="Title"
                  value={formData.sales_contact_title}
                  onChange={(e) => handleInputChange('sales_contact_title', e.target.value)}
                />
                <Input
                  placeholder="Email"
                  type="email"
                  value={formData.sales_contact_email}
                  onChange={(e) => handleInputChange('sales_contact_email', e.target.value)}
                />
                <Input
                  placeholder="Phone"
                  value={formData.sales_contact_phone}
                  onChange={(e) => handleInputChange('sales_contact_phone', e.target.value)}
                />
              </div>
            </div>

            {/* Onboarding Contact */}
            <div className="border rounded-lg p-4">
              <h4 className="font-semibold mb-3">Onboarding</h4>
              <div className="space-y-2">
                <Input
                  placeholder="Name"
                  value={formData.onboarding_contact_name}
                  onChange={(e) => handleInputChange('onboarding_contact_name', e.target.value)}
                />
                <Input
                  placeholder="Title"
                  value={formData.onboarding_contact_title}
                  onChange={(e) => handleInputChange('onboarding_contact_title', e.target.value)}
                />
                <Input
                  placeholder="Email"
                  type="email"
                  value={formData.onboarding_contact_email}
                  onChange={(e) => handleInputChange('onboarding_contact_email', e.target.value)}
                />
                <Input
                  placeholder="Phone"
                  value={formData.onboarding_contact_phone}
                  onChange={(e) => handleInputChange('onboarding_contact_phone', e.target.value)}
                />
              </div>
            </div>

            {/* Marketing Contact */}
            <div className="border rounded-lg p-4">
              <h4 className="font-semibold mb-3">Marketing</h4>
              <div className="space-y-2">
                <Input
                  placeholder="Name"
                  value={formData.marketing_contact_name}
                  onChange={(e) => handleInputChange('marketing_contact_name', e.target.value)}
                />
                <Input
                  placeholder="Title"
                  value={formData.marketing_contact_title}
                  onChange={(e) => handleInputChange('marketing_contact_title', e.target.value)}
                />
                <Input
                  placeholder="Email"
                  type="email"
                  value={formData.marketing_contact_email}
                  onChange={(e) => handleInputChange('marketing_contact_email', e.target.value)}
                />
                <Input
                  placeholder="Phone"
                  value={formData.marketing_contact_phone}
                  onChange={(e) => handleInputChange('marketing_contact_phone', e.target.value)}
                />
              </div>
            </div>

            {/* Main Contact */}
            <div className="border rounded-lg p-4">
              <h4 className="font-semibold mb-3">Main Contact *</h4>
              <div className="space-y-2">
                <Input
                  placeholder="Email"
                  type="email"
                  value={formData.contact_email}
                  onChange={(e) => handleInputChange('contact_email', e.target.value)}
                  required
                />
                <Input
                  placeholder="Phone"
                  value={formData.contact_phone}
                  onChange={(e) => handleInputChange('contact_phone', e.target.value)}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Administrative Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-power100-red" />
            Administrative Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium">Partner Status</label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => handleInputChange('is_active', e.target.checked)}
                />
                <span>Active</span>
              </label>
            </div>
            
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium">Dashboard Access</label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.dashboard_access_enabled}
                  onChange={(e) => handleInputChange('dashboard_access_enabled', e.target.checked)}
                />
                <span>Enabled</span>
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Onboarding URL</label>
              <Input
                value={formData.onboarding_url}
                onChange={(e) => handleInputChange('onboarding_url', e.target.value)}
                placeholder="https://onboarding.url"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Demo Booking URL</label>
              <Input
                value={formData.demo_booking_url}
                onChange={(e) => handleInputChange('demo_booking_url', e.target.value)}
                placeholder="https://demo.url"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Onboarding Process</label>
            <Textarea
              value={formData.onboarding_process}
              onChange={(e) => handleInputChange('onboarding_process', e.target.value)}
              placeholder="Describe the onboarding process"
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-end gap-4 sticky bottom-4 bg-white p-4 rounded-lg shadow-lg">
        <Button variant="outline" onClick={handleCancel}>
          <X className="w-4 h-4 mr-2" />
          Cancel
        </Button>
        <Button 
          onClick={handleSave} 
          disabled={saving}
          className="bg-power100-green hover:bg-green-600"
        >
          <Save className="w-4 h-4 mr-2" />
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </div>
  );
}