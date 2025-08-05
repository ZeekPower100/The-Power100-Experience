// @ts-nocheck
"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { MultiSelectWithEntry } from '@/components/ui/multi-select-with-entry';
import { DynamicList } from '@/components/ui/dynamic-list';
import { partnerApi } from '@/lib/api';
import { StrategicPartner } from '@/lib/types/strategic_partner';
import { ArrowLeft, Save, Building2, AlertTriangle } from 'lucide-react';

interface PartnerFormProps {
  partner?: StrategicPartner | null;
  onSuccess: () => void;
  onCancel: () => void;
}

// Predefined options based on your requirements
const FOCUS_AREA_OPTIONS = [
  { value: 'greenfield_growth', label: 'Greenfield Growth' },
  { value: 'controlling_lead_flow', label: 'Controlling Lead Flow' },
  { value: 'closing_higher_percentage', label: 'Closing Higher Percentage' },
  { value: 'installation_quality', label: 'Installation Quality' },
  { value: 'hiring_sales_leadership', label: 'Hiring Sales Leadership' },
  { value: 'customer_retention', label: 'Customer Retention' },
  { value: 'operational_efficiency', label: 'Operational Efficiency' },
  { value: 'digital_marketing', label: 'Digital Marketing' },
  { value: 'sales_training', label: 'Sales Training' },
  { value: 'business_development', label: 'Business Development' }
];

const REVENUE_RANGE_OPTIONS = [
  { value: 'under_100k', label: 'Under $100K' },
  { value: '100k_500k', label: '$100K - $500K' },
  { value: '500k_1m', label: '$500K - $1M' },
  { value: '1m_5m', label: '$1M - $5M' },
  { value: '5m_10m', label: '$5M - $10M' },
  { value: 'over_10m', label: 'Over $10M' }
];

const GEOGRAPHIC_OPTIONS = [
  { value: 'north_america', label: 'North America' },
  { value: 'united_states', label: 'United States' },
  { value: 'northeast', label: 'Northeast US' },
  { value: 'southeast', label: 'Southeast US' },
  { value: 'midwest', label: 'Midwest US' },
  { value: 'southwest', label: 'Southwest US' },
  { value: 'west_coast', label: 'West Coast US' },
  { value: 'canada', label: 'Canada' },
  { value: 'international', label: 'International' }
];

function PartnerForm({ partner, onSuccess, onCancel }: PartnerFormProps) {
  const [formData, setFormData] = useState({
    company_name: '',
    description: '',
    logo_url: '',
    website: '',
    contact_email: '',
    contact_phone: '',
    power100_subdomain: '',
    focus_areas_served: [] as string[],
    target_revenue_range: [] as string[],
    geographic_regions: [] as string[],
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
          (typeof partner.focus_areas_served === 'string' ? JSON.parse(partner.focus_areas_served || '[]') : []),
        target_revenue_range: Array.isArray(partner.target_revenue_range) ? partner.target_revenue_range :
          (typeof partner.target_revenue_range === 'string' ? JSON.parse(partner.target_revenue_range || '[]') : []),
        geographic_regions: Array.isArray(partner.geographic_regions) ? partner.geographic_regions :
          (typeof partner.geographic_regions === 'string' ? JSON.parse(partner.geographic_regions || '[]') : []),
        power_confidence_score: partner.power_confidence_score || 0,
        pricing_model: partner.pricing_model || '',
        onboarding_process: partner.onboarding_process || '',
        key_differentiators: Array.isArray(partner.key_differentiators) ? partner.key_differentiators :
          (typeof partner.key_differentiators === 'string' ? JSON.parse(partner.key_differentiators || '[]') : []),
        client_testimonials: Array.isArray(partner.client_testimonials) ? partner.client_testimonials :
          (typeof partner.client_testimonials === 'string' ? JSON.parse(partner.client_testimonials || '[]') : []),
        is_active: partner.is_active !== undefined ? partner.is_active : true,
        last_quarterly_report: partner.last_quarterly_report || ''
      });
    }
  }, [partner]);

  const handleInputChange = (field: string, value: unknown) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Validate required fields
      if (!formData.company_name.trim()) {
        throw new Error('Company name is required');
      }
      if (!formData.contact_email.trim()) {
        throw new Error('Contact email is required');
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

          {/* Form Actions */}
          <div className="flex gap-4 pt-6">
            <Button
              type="submit"
              disabled={loading}
              className="bg-power100-red hover:bg-red-700 text-white flex-1 md:flex-none"
            >
              <Save className="h-4 w-4 mr-2" />
              {loading ? 'Saving...' : (partner ? 'Update Partner' : 'Create Partner')}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={loading}
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