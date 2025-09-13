'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import VideoManager from './VideoManager';
import LogoManager from './LogoManager';
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
  CheckCircle
} from 'lucide-react';
import { partnerApi } from '@/lib/api';
import { safeJsonParse, safeJsonStringify, handleApiResponse, getFromStorage, setToStorage } from '../../utils/jsonHelpers';

interface PartnerDetailsEditorProps {
  partnerId: string;
  onClose: () => void;
  onSave: () => void;
}

export default function PartnerDetailsEditor({ partnerId, onClose, onSave }: PartnerDetailsEditorProps) {
  const [partner, setPartner] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');
  const [alert, setAlert] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  useEffect(() => {
    fetchPartner();
  }, [partnerId]);

  const fetchPartner = async () => {
    try {
      const response = await partnerApi.getById(partnerId);
      if (response.success) {
        setPartner(response.partner);
      }
    } catch (error) {
      console.error('Error fetching partner:', error);
      setAlert({ type: 'error', message: 'Failed to load partner details' });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setAlert(null);
    try {
      const response = await partnerApi.update(partnerId, partner);
      if (response.success) {
        setAlert({ type: 'success', message: 'Partner updated successfully' });
        setTimeout(() => {
          onSave();
        }, 1500);
      } else {
        setAlert({ type: 'error', message: 'Failed to update partner' });
      }
    } catch (error) {
      console.error('Error saving partner:', error);
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

  const updateNestedField = (parent: string, field: string, value: any) => {
    setPartner((prev: any) => ({
      ...prev,
      [parent]: {
        ...prev[parent],
        [field]: value
      }
    }));
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <Card className="p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-power100-red mx-auto"></div>
        </Card>
      </div>
    );
  }

  if (!partner) return null;

  return (
    <div className="fixed inset-0 bg-black/50 overflow-y-auto z-50">
      <div className="min-h-screen py-8 px-4">
        <div className="max-w-6xl mx-auto">
          <Card className="bg-white">
            {/* Header */}
            <div className="border-b px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Building2 className="h-6 w-6 text-power100-red" />
                  <h2 className="text-2xl font-bold">Edit Partner: {partner.company_name}</h2>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={handleSave}
                    disabled={saving}
                    className="bg-power100-green hover:bg-green-600 text-white"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {saving ? 'Saving...' : 'Save Changes'}
                  </Button>
                  <Button
                    onClick={onClose}
                    variant="outline"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Close
                  </Button>
                </div>
              </div>
            </div>

            {/* Alert */}
            {alert && (
              <div className="px-6 pt-4">
                <Alert className={alert.type === 'error' ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}>
                  <AlertDescription className={alert.type === 'error' ? 'text-red-800' : 'text-green-800'}>
                    {alert.message}
                  </AlertDescription>
                </Alert>
              </div>
            )}

            {/* Content */}
            <div className="p-6">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid grid-cols-6 w-full">
                  <TabsTrigger value="basic">Basic Info</TabsTrigger>
                  <TabsTrigger value="landing">Landing Page</TabsTrigger>
                  <TabsTrigger value="videos">Videos</TabsTrigger>
                  <TabsTrigger value="capabilities">Capabilities</TabsTrigger>
                  <TabsTrigger value="testimonials">Testimonials</TabsTrigger>
                  <TabsTrigger value="analytics">Analytics</TabsTrigger>
                </TabsList>

                {/* Basic Information Tab */}
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
                      <Label htmlFor="power_confidence_score">PowerConfidence Score</Label>
                      <Input
                        id="power_confidence_score"
                        type="number"
                        min="0"
                        max="100"
                        value={partner.power_confidence_score || ''}
                        onChange={(e) => updateField('power_confidence_score', parseInt(e.target.value))}
                        className="mt-1"
                      />
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
                  <div className="space-y-6">
                    <h3 className="text-lg font-semibold">Landing Page Content</h3>
                    
                    <div>
                      <Label>Hero Section Background Color</Label>
                      <div className="flex gap-2 mt-1">
                        <Input
                          value={partner.landing_hero_bg || '#FB0401'}
                          onChange={(e) => updateField('landing_hero_bg', e.target.value)}
                          placeholder="#FB0401"
                        />
                        <div 
                          className="w-12 h-10 rounded border"
                          style={{ backgroundColor: partner.landing_hero_bg || '#FB0401' }}
                        />
                      </div>
                    </div>

                    <div>
                      <Label>Trust Badges</Label>
                      <Textarea
                        value={partner.trust_badges ? safeJsonStringify(partner.trust_badges) : '[]'}
                        onChange={(e) => {
                          try {
                            const badges = safeJsonParse(e.target.value);
                            updateField('trust_badges', badges);
                          } catch (err) {
                            // Invalid JSON, don't update
                          }
                        }}
                        className="mt-1 font-mono text-sm"
                        rows={3}
                        placeholder='["Verified Partner", "Top Rated", "500+ Contractors"]'
                      />
                      <p className="text-xs text-gray-500 mt-1">JSON array of badge strings</p>
                    </div>

                    <div>
                      <Label>Key Metrics</Label>
                      <Textarea
                        value={partner.key_metrics ? safeJsonStringify(partner.key_metrics, null, 2) : '[]'}
                        onChange={(e) => {
                          try {
                            const metrics = safeJsonParse(e.target.value);
                            updateField('key_metrics', metrics);
                          } catch (err) {
                            // Invalid JSON, don't update
                          }
                        }}
                        className="mt-1 font-mono text-sm"
                        rows={8}
                        placeholder='[{"metric": "+12%", "label": "Avg. Closing Rate Increase"}]'
                      />
                      <p className="text-xs text-gray-500 mt-1">JSON array of metric objects</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Primary CTA Text</Label>
                        <Input
                          value={partner.cta_primary_text || 'Schedule Introduction'}
                          onChange={(e) => updateField('cta_primary_text', e.target.value)}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label>Secondary CTA Text</Label>
                        <Input
                          value={partner.cta_secondary_text || 'Download Report'}
                          onChange={(e) => updateField('cta_secondary_text', e.target.value)}
                          className="mt-1"
                        />
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* Videos Tab */}
                <TabsContent value="videos" className="mt-6">
                  <VideoManager
                    videos={partner.landing_page_videos || []}
                    onChange={(videos) => updateField('landing_page_videos', videos)}
                    label="Landing Page Videos"
                  />
                  
                  <div className="mt-8 p-4 bg-blue-50 rounded-lg">
                    <h4 className="font-semibold text-blue-900 mb-2">Video Management Tips</h4>
                    <ul className="text-sm text-blue-800 space-y-1">
                      <li>• Videos will appear in the order shown here</li>
                      <li>• Custom thumbnails override YouTube thumbnails</li>
                      <li>• Use S3 URLs for custom thumbnails (e.g., https://tpe-assets-production.s3.amazonaws.com/...)</li>
                      <li>• Supports YouTube URLs, short URLs (youtu.be), or just the video ID</li>
                    </ul>
                  </div>
                </TabsContent>

                {/* Capabilities Tab */}
                <TabsContent value="capabilities" className="space-y-6 mt-6">
                  <div>
                    <Label>Service Areas</Label>
                    <Textarea
                      value={partner.service_areas ? safeJsonStringify(partner.service_areas) : '[]'}
                      onChange={(e) => {
                        try {
                          const areas = safeJsonParse(e.target.value);
                          updateField('service_areas', areas);
                        } catch (err) {
                          // Invalid JSON
                        }
                      }}
                      className="mt-1 font-mono text-sm"
                      rows={4}
                      placeholder='["Leadership Training", "Team Building", "Culture Development"]'
                    />
                  </div>

                  <div>
                    <Label>Focus Areas Served</Label>
                    <Textarea
                      value={partner.focus_areas_served ? safeJsonStringify(partner.focus_areas_served) : '[]'}
                      onChange={(e) => {
                        try {
                          const areas = safeJsonParse(e.target.value);
                          updateField('focus_areas_served', areas);
                        } catch (err) {
                          // Invalid JSON
                        }
                      }}
                      className="mt-1 font-mono text-sm"
                      rows={4}
                      placeholder='["Employee Retention", "Sales Team", "Operations"]'
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Target Revenue Range</Label>
                      <Textarea
                        value={partner.target_revenue_range ? safeJsonStringify(partner.target_revenue_range) : '[]'}
                        onChange={(e) => {
                          try {
                            const ranges = safeJsonParse(e.target.value);
                            updateField('target_revenue_range', ranges);
                          } catch (err) {
                            // Invalid JSON
                          }
                        }}
                        className="mt-1 font-mono text-sm"
                        rows={3}
                        placeholder='["1-10M", "11-30M", "31-50M"]'
                      />
                    </div>
                    <div>
                      <Label>Geographic Regions</Label>
                      <Textarea
                        value={partner.geographic_regions ? safeJsonStringify(partner.geographic_regions) : '[]'}
                        onChange={(e) => {
                          try {
                            const regions = safeJsonParse(e.target.value);
                            updateField('geographic_regions', regions);
                          } catch (err) {
                            // Invalid JSON
                          }
                        }}
                        className="mt-1 font-mono text-sm"
                        rows={3}
                        placeholder='["Northeast", "Southeast", "Midwest"]'
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Partner Relationships</Label>
                    <Textarea
                      value={partner.best_working_partnerships || ''}
                      onChange={(e) => updateField('best_working_partnerships', e.target.value)}
                      className="mt-1 font-mono text-sm"
                      rows={4}
                      placeholder='Partner relationships data from onboarding'
                      readOnly
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      Strategic partners selected during onboarding
                    </p>
                  </div>
                </TabsContent>

                {/* Testimonials Tab */}
                <TabsContent value="testimonials" className="space-y-6 mt-6">
                  <div>
                    <Label>Client Testimonials</Label>
                    <Textarea
                      value={partner.client_testimonials ? safeJsonStringify(partner.client_testimonials, null, 2) : '[]'}
                      onChange={(e) => {
                        try {
                          const testimonials = safeJsonParse(e.target.value);
                          updateField('client_testimonials', testimonials);
                        } catch (err) {
                          // Invalid JSON
                        }
                      }}
                      className="mt-1 font-mono text-sm"
                      rows={12}
                      placeholder='[
  {
    "quote": "Amazing results!",
    "author": "John Smith",
    "company": "ABC Corp",
    "revenue_tier": "11-30M"
  }
]'
                    />
                    <p className="text-xs text-gray-500 mt-1">JSON array of testimonial objects</p>
                  </div>

                  <div>
                    <Label>Case Studies</Label>
                    <Textarea
                      value={partner.case_studies ? safeJsonStringify(partner.case_studies, null, 2) : '[]'}
                      onChange={(e) => {
                        try {
                          const studies = safeJsonParse(e.target.value);
                          updateField('case_studies', studies);
                        } catch (err) {
                          // Invalid JSON
                        }
                      }}
                      className="mt-1 font-mono text-sm"
                      rows={12}
                      placeholder='[
  {
    "title": "Construction Co Success",
    "client_type": "$50M Contractor",
    "results": ["40% reduction in turnover"],
    "cta": "Read Full Case Study"
  }
]'
                    />
                  </div>

                  <div className="border-t pt-6">
                    <h3 className="text-lg font-semibold mb-4 text-red-600">PowerConfidence References (Minimum 5 Each)</h3>
                    
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <Label>Client References (At least 5 for PowerConfidence)</Label>
                        <Textarea
                          value={partner.client_references ? safeJsonStringify(partner.client_references, null, 2) : '[]'}
                          onChange={(e) => {
                            try {
                              const references = safeJsonParse(e.target.value);
                              updateField('client_references', references);
                            } catch (err) {
                              // Invalid JSON
                            }
                          }}
                          className="mt-1 font-mono text-sm"
                          rows={10}
                          placeholder='[
  {
    "name": "John Smith",
    "email": "john@example.com",
    "phone": "555-0100",
    "website": "www.example.com"
  }
]'
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          {(() => {
                            try {
                              const refs = safeJsonParse(partner.client_references || '[]');
                              return `${Array.isArray(refs) ? refs.length : 0} / 5 minimum clients`;
                            } catch {
                              return '0 / 5 minimum clients';
                            }
                          })()}
                        </p>
                      </div>

                      <div>
                        <Label>Employee References (At least 5 for PowerConfidence)</Label>
                        <Textarea
                          value={partner.employee_references ? safeJsonStringify(partner.employee_references, null, 2) : '[]'}
                          onChange={(e) => {
                            try {
                              const references = safeJsonParse(e.target.value);
                              updateField('employee_references', references);
                            } catch (err) {
                              // Invalid JSON
                            }
                          }}
                          className="mt-1 font-mono text-sm"
                          rows={10}
                          placeholder='[
  {
    "name": "Jane Doe",
    "email": "jane@example.com",
    "phone": "555-0200",
    "website": "www.example.com"
  }
]'
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          {(() => {
                            try {
                              const emps = safeJsonParse(partner.employee_references || '[]');
                              return `${Array.isArray(emps) ? emps.length : 0} / 5 minimum employees`;
                            } catch {
                              return '0 / 5 minimum employees';
                            }
                          })()}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-sm text-yellow-800">
                        <strong>PowerConfidence Requirement:</strong> We need at least 5 client references and 5 employee references 
                        to generate the initial PowerConfidence ranking. PowerCards will be sent to these contacts for evaluation.
                      </p>
                    </div>
                  </div>
                </TabsContent>

                {/* Analytics Tab */}
                <TabsContent value="analytics" className="space-y-6 mt-6">
                  <div className="grid grid-cols-3 gap-4">
                    <Card className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Users className="h-5 w-5 text-power100-red" />
                        <span className="font-semibold">Total Matches</span>
                      </div>
                      <p className="text-2xl font-bold">{partner.total_matches || 0}</p>
                    </Card>
                    
                    <Card className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Calendar className="h-5 w-5 text-power100-green" />
                        <span className="font-semibold">Demos Booked</span>
                      </div>
                      <p className="text-2xl font-bold">{partner.demos_booked || 0}</p>
                    </Card>
                    
                    <Card className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Trophy className="h-5 w-5 text-yellow-500" />
                        <span className="font-semibold">Conversion Rate</span>
                      </div>
                      <p className="text-2xl font-bold">
                        {partner.total_matches > 0 
                          ? `${Math.round((partner.demos_booked / partner.total_matches) * 100)}%`
                          : '0%'
                        }
                      </p>
                    </Card>
                  </div>

                  <div>
                    <Label>Match History</Label>
                    <div className="mt-2 border rounded-lg overflow-hidden">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Date</th>
                            <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Contractor</th>
                            <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Score</th>
                            <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          <tr>
                            <td className="px-4 py-3 text-sm text-gray-600" colSpan={4}>
                              No match history available
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}