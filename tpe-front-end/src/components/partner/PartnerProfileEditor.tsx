'use client';
// DATABASE-CHECKED: strategic_partners columns verified on 2025-11-11

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import VideoManager from '../admin/VideoManager';
import LogoManager from '../admin/LogoManager';
import {
  Building2,
  Save,
  X,
  Globe,
  Mail,
  Phone,
  Star,
  Users,
  Trophy,
  Target,
  MapPin,
  DollarSign,
  Calendar,
  CheckCircle,
  Lock
} from 'lucide-react';
import { partnerPortalApi } from '@/lib/api';
import { safeJsonParse, safeJsonStringify } from '../../utils/jsonHelpers';

interface PartnerProfileEditorProps {
  onClose?: () => void;
  onSave?: () => void;
}

export default function PartnerProfileEditor({ onClose, onSave }: PartnerProfileEditorProps) {
  const [partner, setPartner] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');
  const [alert, setAlert] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  useEffect(() => {
    fetchPartner();
  }, []);

  const fetchPartner = async () => {
    try {
      // Check if partner is logged in
      const token = localStorage.getItem('partnerToken');
      if (!token) {
        setAlert({ type: 'error', message: 'Not authenticated. Please log in.' });
        setLoading(false);
        return;
      }

      // Use partner portal API to get own profile
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${API_BASE_URL}/partner-portal/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (data.success && data.profile) {
        setPartner(data.profile);
      } else {
        setAlert({ type: 'error', message: data.message || 'Failed to load profile' });
      }
    } catch (error) {
      console.error('Error fetching partner profile:', error);
      setAlert({ type: 'error', message: 'Failed to load profile. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setAlert(null);
    try {
      const response = await partnerPortalApi.updateProfile(partner);
      if (response.success) {
        setAlert({ type: 'success', message: 'Profile updated successfully' });
        if (onSave) {
          setTimeout(() => {
            onSave();
          }, 1500);
        }
      } else {
        setAlert({ type: 'error', message: response.message || 'Failed to update profile' });
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      setAlert({ type: 'error', message: 'Failed to save changes' });
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field: string, value: any) => {
    setPartner((prev: any) => ({
      ...prev,
      [field]: value
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-power100-red mx-auto mb-4"></div>
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!partner) {
    return (
      <div className="text-center p-8">
        <p className="text-gray-600">Failed to load profile</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Modern Header with Gradient */}
      <div className="relative overflow-hidden bg-gradient-to-br from-red-50 to-white rounded-2xl shadow-lg border border-red-100 p-8">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-power100-red opacity-5 rounded-full -mr-32 -mt-32"></div>
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-power100-red to-red-600 rounded-2xl flex items-center justify-center shadow-xl transform transition-transform hover:scale-105">
              <Building2 className="h-8 w-8 text-white" />
            </div>
            <div>
              <div className="inline-block bg-red-100 text-power100-red px-4 py-1 rounded-full text-xs font-semibold mb-2">
                PARTNER PROFILE
              </div>
              <h2 className="text-3xl font-bold text-gray-900">Edit Your Profile</h2>
              <p className="text-gray-600 mt-1">Manage your company information and public landing page</p>
            </div>
          </div>
          {onClose && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="hover:bg-red-100 hover:text-power100-red transition-colors"
            >
              <X className="h-5 w-5" />
            </Button>
          )}
        </div>
      </div>

      {/* Alert with Modern Styling */}
      {alert && (
        <Alert className={`${
          alert.type === 'success'
            ? 'border-green-200 bg-gradient-to-r from-green-50 to-emerald-50'
            : 'border-red-200 bg-gradient-to-r from-red-50 to-rose-50'
        } shadow-md rounded-xl`}>
          <AlertDescription className={`${
            alert.type === 'success' ? 'text-green-800' : 'text-red-800'
          } font-medium`}>
            {alert.message}
          </AlertDescription>
        </Alert>
      )}

      {/* Modern Editor Card */}
      <Card className="p-8 shadow-2xl rounded-2xl border border-gray-100 bg-white hover:shadow-3xl transition-shadow duration-300">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5 bg-gradient-to-r from-gray-50 to-gray-100 p-2 rounded-xl shadow-inner border border-gray-200">
            <TabsTrigger
              value="basic"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-power100-red data-[state=active]:to-red-600 data-[state=active]:text-white data-[state=active]:shadow-lg rounded-lg transition-all duration-300 font-semibold"
            >
              Basic Info
            </TabsTrigger>
            <TabsTrigger
              value="landing"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-power100-red data-[state=active]:to-red-600 data-[state=active]:text-white data-[state=active]:shadow-lg rounded-lg transition-all duration-300 font-semibold"
            >
              Landing Page
            </TabsTrigger>
            <TabsTrigger
              value="videos"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-power100-red data-[state=active]:to-red-600 data-[state=active]:text-white data-[state=active]:shadow-lg rounded-lg transition-all duration-300 font-semibold"
            >
              Videos
            </TabsTrigger>
            <TabsTrigger
              value="capabilities"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-power100-red data-[state=active]:to-red-600 data-[state=active]:text-white data-[state=active]:shadow-lg rounded-lg transition-all duration-300 font-semibold"
            >
              Capabilities
            </TabsTrigger>
            <TabsTrigger
              value="testimonials"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-power100-red data-[state=active]:to-red-600 data-[state=active]:text-white data-[state=active]:shadow-lg rounded-lg transition-all duration-300 font-semibold"
            >
              Testimonials
            </TabsTrigger>
          </TabsList>

          {/* Basic Info Tab */}
          <TabsContent value="basic" className="space-y-6 mt-6">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <Label htmlFor="company_name">Company Name</Label>
                <Input
                  id="company_name"
                  value={partner.company_name || ''}
                  onChange={(e) => updateField('company_name', e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="ceo_contact_name">CEO/Primary Contact</Label>
                <Input
                  id="ceo_contact_name"
                  value={partner.ceo_contact_name || ''}
                  onChange={(e) => updateField('ceo_contact_name', e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="contact_email">Contact Email</Label>
                <Input
                  id="contact_email"
                  type="email"
                  value={partner.contact_email || partner.ceo_contact_email || ''}
                  onChange={(e) => updateField('contact_email', e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="contact_phone">Contact Phone</Label>
                <Input
                  id="contact_phone"
                  value={partner.contact_phone || partner.ceo_contact_phone || ''}
                  onChange={(e) => updateField('contact_phone', e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  value={partner.website || ''}
                  onChange={(e) => updateField('website', e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="power_confidence_score" className="flex items-center gap-2">
                  PowerConfidence Rating
                  <Lock className="h-4 w-4 text-gray-400" />
                </Label>
                <Input
                  id="power_confidence_score"
                  type="number"
                  value={partner.power_confidence_score || partner.final_pcr_score || ''}
                  disabled
                  className="mt-1 bg-gray-50 cursor-not-allowed"
                  title="Calculated automatically by the system"
                />
                <p className="text-xs text-gray-500 mt-1">Automatically calculated based on feedback and performance</p>
              </div>
            </div>

            <div>
              <Label htmlFor="value_proposition">Value Proposition / Tagline</Label>
              <Textarea
                id="value_proposition"
                value={partner.value_proposition || ''}
                onChange={(e) => updateField('value_proposition', e.target.value)}
                className="mt-1"
                rows={3}
                placeholder="A brief, compelling statement of what makes your company unique"
              />
            </div>

            <div>
              <Label htmlFor="description">Full Description</Label>
              <Textarea
                id="description"
                value={partner.description || ''}
                onChange={(e) => updateField('description', e.target.value)}
                className="mt-1"
                rows={6}
                placeholder="Detailed description of your company, services, and what you offer to contractors"
              />
            </div>

            <div>
              <LogoManager
                logoUrl={partner.logo_url || null}
                onChange={(url) => updateField('logo_url', url)}
                label="Company Logo"
              />
            </div>
          </TabsContent>

          {/* Landing Page Tab */}
          <TabsContent value="landing" className="space-y-6 mt-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <Globe className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-blue-900">Public Landing Page</h4>
                  <p className="text-sm text-blue-700 mt-1">
                    These fields control what appears on your public landing page at{' '}
                    <span className="font-mono">/pcr/{partner.public_url || 'your-slug'}</span>
                  </p>
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="tagline">Landing Page Headline</Label>
              <Input
                id="tagline"
                value={partner.tagline || ''}
                onChange={(e) => updateField('tagline', e.target.value)}
                className="mt-1"
                placeholder="Catchy headline for your landing page"
              />
            </div>

            <div>
              <Label htmlFor="company_description">Subheadline</Label>
              <Textarea
                id="company_description"
                value={partner.company_description || ''}
                onChange={(e) => updateField('company_description', e.target.value)}
                className="mt-1"
                rows={2}
                placeholder="Supporting text that appears under the headline"
              />
            </div>

            <div>
              <Label htmlFor="key_differentiators">Key Differentiators</Label>
              <Textarea
                id="key_differentiators"
                value={partner.key_differentiators || ''}
                onChange={(e) => updateField('key_differentiators', e.target.value)}
                className="mt-1"
                rows={4}
                placeholder="What sets you apart from competitors? (One per line)"
              />
              <p className="text-xs text-gray-500 mt-1">Enter one differentiator per line</p>
            </div>
          </TabsContent>

          {/* Videos Tab */}
          <TabsContent value="videos" className="mt-6">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <Trophy className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-yellow-900">Demo Videos</h4>
                  <p className="text-sm text-yellow-700 mt-1">
                    Upload 5 client demo videos to showcase your work. These appear on your landing page.
                  </p>
                </div>
              </div>
            </div>

            <VideoManager
              videos={safeJsonParse(partner.landing_page_videos, [])}
              onChange={(videos) => updateField('landing_page_videos', safeJsonStringify(videos))}
            />
          </TabsContent>

          {/* Capabilities Tab */}
          <TabsContent value="capabilities" className="space-y-6 mt-6">
            <div>
              <Label htmlFor="services_offered">Service Capabilities</Label>
              <Textarea
                id="services_offered"
                value={Array.isArray(partner.services_offered) ? partner.services_offered.join('\n') : (partner.services_offered || '')}
                onChange={(e) => updateField('services_offered', e.target.value.split('\n').filter(s => s.trim()))}
                className="mt-1"
                rows={4}
                placeholder="What services do you offer? (One per line)"
              />
              <p className="text-xs text-gray-500 mt-1">Enter one service per line</p>
            </div>

            <div>
              <Label htmlFor="focus_areas_served">Focus Areas Served</Label>
              <Textarea
                id="focus_areas_served"
                value={partner.focus_areas_served || ''}
                onChange={(e) => updateField('focus_areas_served', e.target.value)}
                className="mt-1"
                rows={4}
                placeholder="What contractor focus areas do you serve? (One per line)"
              />
              <p className="text-xs text-gray-500 mt-1">Examples: Marketing, Sales, Operations, Finance, etc.</p>
            </div>

            <div>
              <Label htmlFor="geographic_regions">Geographic Regions</Label>
              <Textarea
                id="geographic_regions"
                value={partner.geographic_regions || ''}
                onChange={(e) => updateField('geographic_regions', e.target.value)}
                className="mt-1"
                rows={3}
                placeholder="What regions do you serve? (One per line)"
              />
              <p className="text-xs text-gray-500 mt-1">Examples: Midwest, National, Texas, etc.</p>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <Label htmlFor="revenue_tiers">Revenue Tiers Served</Label>
                <Input
                  id="revenue_tiers"
                  value={partner.revenue_tiers || ''}
                  onChange={(e) => updateField('revenue_tiers', e.target.value)}
                  className="mt-1"
                  placeholder="e.g., $1M-$5M, $5M-$10M"
                />
              </div>
              <div>
                <Label htmlFor="employee_count">Your Team Size</Label>
                <Input
                  id="employee_count"
                  value={partner.employee_count || ''}
                  onChange={(e) => updateField('employee_count', e.target.value)}
                  className="mt-1"
                  placeholder="e.g., 10-50 employees"
                />
              </div>
            </div>
          </TabsContent>

          {/* Testimonials Tab */}
          <TabsContent value="testimonials" className="space-y-6 mt-6">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <Star className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-green-900">Customer Testimonials</h4>
                  <p className="text-sm text-green-700 mt-1">
                    While most testimonials come from PowerCard feedback, you can add featured testimonials here.
                  </p>
                </div>
              </div>
            </div>

            <div>
              <Label>Featured Testimonials</Label>
              <p className="text-sm text-gray-600 mb-4">
                Add your best customer testimonials to showcase on your landing page.
              </p>

              <div className="space-y-4">
                {[1, 2, 3].map((num) => (
                  <div key={num} className="border border-gray-200 rounded-lg p-4">
                    <Label htmlFor={`testimonial_${num}_text`} className="text-sm">
                      Testimonial {num}
                    </Label>
                    <Textarea
                      id={`testimonial_${num}_text`}
                      placeholder="Customer testimonial text..."
                      className="mt-2"
                      rows={3}
                    />
                    <div className="grid grid-cols-2 gap-3 mt-3">
                      <Input
                        placeholder="Customer Name"
                      />
                      <Input
                        placeholder="Company/Title"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Modern Action Buttons */}
        <div className="flex justify-end gap-4 mt-10 pt-8 border-t-2 border-gray-100">
          {onClose && (
            <Button
              variant="outline"
              onClick={onClose}
              disabled={saving}
              className="px-8 py-6 rounded-full border-2 border-gray-300 hover:border-gray-400 hover:bg-gray-50 font-semibold transition-all duration-300 shadow-md hover:shadow-lg"
            >
              Cancel
            </Button>
          )}
          <Button
            onClick={handleSave}
            disabled={saving}
            className="group bg-gradient-to-r from-power100-green to-green-600 hover:from-green-600 hover:to-green-700 text-white px-10 py-6 rounded-full font-semibold shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 flex items-center gap-2"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Saving...
              </>
            ) : (
              <>
                <Save className="h-5 w-5" />
                Save Changes
                <CheckCircle className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </Button>
        </div>
      </Card>
    </div>
  );
}
