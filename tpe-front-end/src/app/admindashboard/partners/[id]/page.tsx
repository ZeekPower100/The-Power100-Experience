'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import PartnerForm from '@/components/admin/PartnerForm';
import { 
  Building2, 
  Globe, 
  Mail, 
  Phone, 
  Calendar,
  Star,
  TrendingUp,
  Users,
  DollarSign,
  Edit,
  ArrowLeft,
  MapPin,
  Briefcase,
  Target,
  Award,
  ChevronRight
} from 'lucide-react';
import { partnerApi } from '@/lib/api';
import { safeJsonParse, safeJsonStringify, handleApiResponse, getFromStorage, setToStorage } from '../../../../utils/jsonHelpers';

interface PartnerDetails {
  // Basic Information
  id: number;
  company_name: string;
  description: string;
  logo_url?: string;
  website?: string;
  contact_email: string;
  contact_phone?: string;
  power100_subdomain?: string;
  
  // Business Details
  established_year?: string;
  employee_count?: string;
  ownership_type?: string;
  company_description?: string;
  
  // Service Information
  focus_areas_served?: string[];
  target_revenue_range?: string[];
  geographic_regions?: string[];
  service_areas?: string[];
  service_areas_other?: string;
  service_category?: string;
  
  // Value Proposition
  value_proposition?: string;
  why_clients_choose_you?: string;
  why_clients_choose_competitors?: string;
  key_differentiators?: string[];
  pricing_model?: string;
  
  // Performance Metrics
  power_confidence_score?: number;
  previous_powerconfidence_score?: number;
  score_trend?: string;
  industry_rank?: number;
  category_rank?: number;
  
  // Feedback & Reviews
  last_feedback_update?: string;
  total_feedback_responses?: number;
  average_satisfaction?: number;
  feedback_trend?: string;
  next_quarterly_review?: string;
  avg_contractor_satisfaction?: number;
  total_contractor_engagements?: number;
  
  // Contact Information
  ceo_contact_name?: string;
  ceo_contact_email?: string;
  ceo_contact_phone?: string;
  ceo_contact_title?: string;
  
  cx_contact_name?: string;
  cx_contact_email?: string;
  cx_contact_phone?: string;
  cx_contact_title?: string;
  
  sales_contact_name?: string;
  sales_contact_email?: string;
  sales_contact_phone?: string;
  sales_contact_title?: string;
  
  onboarding_contact_name?: string;
  onboarding_contact_email?: string;
  onboarding_contact_phone?: string;
  onboarding_contact_title?: string;
  
  marketing_contact_name?: string;
  marketing_contact_email?: string;
  marketing_contact_phone?: string;
  marketing_contact_title?: string;
  
  // Technology Stack
  tech_stack_crm?: string[];
  tech_stack_project_management?: string[];
  tech_stack_communication?: string[];
  tech_stack_analytics?: string[];
  tech_stack_marketing?: string[];
  tech_stack_financial?: string[];
  
  // Marketing & Partnerships
  sponsored_events?: string[];
  podcast_appearances?: string[];
  books_read_recommended?: string;
  best_working_partnerships?: string;
  
  // Client Information
  client_demos?: string[];
  client_references?: string[];
  client_testimonials?: string[];
  
  // Administrative
  is_active: boolean;
  dashboard_access_enabled?: boolean;
  last_dashboard_login?: string;
  onboarding_url?: string;
  demo_booking_url?: string;
  onboarding_process?: string;
  
  // Dates
  created_at: string;
  updated_at: string;
}

export default function PartnerViewPage() {
  const params = useParams();
  const router = useRouter();
  const [partner, setPartner] = useState<PartnerDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [referrer, setReferrer] = useState<string>('');

  useEffect(() => {
    loadPartner();
    // Store the referrer URL or default to search page
    if (typeof window !== 'undefined') {
      const ref = document.referrer;
      if (ref && ref.includes('/admindashboard')) {
        setReferrer(ref);
      } else {
        // Default to search page if no valid referrer
        setReferrer('/admindashboard/search');
      }
    }
  }, [params.id]);

  const loadPartner = async () => {
    try {
      setLoading(true);
      const data = await partnerApi.getById(params.id as string);
      setPartner(data.partner);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load partner');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleEditSuccess = () => {
    setIsEditing(false);
    loadPartner(); // Reload partner data after successful edit
  };

  const handleEditCancel = () => {
    setIsEditing(false);
  };

  const handleBack = () => {
    // Try to use the stored referrer, or use router.back() as fallback
    if (referrer) {
      // Parse the referrer URL to get the pathname
      try {
        const url = new URL(referrer);
        router.push(url.pathname + url.search);
      } catch {
        // If URL parsing fails, try direct navigation
        if (referrer.startsWith('/')) {
          router.push(referrer);
        } else {
          router.back();
        }
      }
    } else {
      // Fallback to router.back() or default to search page
      if (window.history.length > 1) {
        router.back();
      } else {
        router.push('/admindashboard/search');
      }
    }
  };

  const parseJSON = (data: any) => {
    if (!data) return [];
    if (typeof data === 'string') {
      try {
        return safeJsonParse(data);
      } catch {
        return [];
      }
    }
    return Array.isArray(data) ? data : [];
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

  if (error || !partner) {
    return (
      <div className="container mx-auto p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error || 'Partner not found'}
        </div>
      </div>
    );
  }

  // Show PartnerForm when editing
  if (isEditing) {
    return (
      <PartnerForm 
        partner={partner}
        onSuccess={handleEditSuccess}
        onCancel={handleEditCancel}
      />
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={handleBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <h1 className="text-3xl font-bold text-gray-900">{partner.company_name}</h1>
          <Badge variant={partner.is_active ? "success" : "secondary"}>
            {partner.is_active ? 'Active' : 'Inactive'}
          </Badge>
        </div>
        <Button onClick={handleEdit} className="bg-power100-green hover:bg-green-600">
          <Edit className="w-4 h-4 mr-2" />
          Edit Partner
        </Button>
      </div>

      {/* Company Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-power100-red" />
            Company Information
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-500">Company Name</label>
            <p className="text-lg">{partner.company_name}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Year Established</label>
            <p className="text-lg">{partner.established_year || 'N/A'}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Employee Count</label>
            <p className="text-lg">{partner.employee_count || 'N/A'}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Ownership Type</label>
            <p className="text-lg">{partner.ownership_type || 'N/A'}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Website</label>
            <p className="text-lg">
              {partner.website ? (
                <a href={partner.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                  {partner.website}
                </a>
              ) : 'N/A'}
            </p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Power100 Subdomain</label>
            <p className="text-lg">{partner.power100_subdomain || 'N/A'}</p>
          </div>
          <div className="col-span-full">
            <label className="text-sm font-medium text-gray-500">Description</label>
            <p className="text-lg">{partner.description || 'N/A'}</p>
          </div>
          {partner.company_description && (
            <div className="col-span-full">
              <label className="text-sm font-medium text-gray-500">Detailed Description</label>
              <p className="text-lg">{partner.company_description}</p>
            </div>
          )}
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
        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-500">Current Score</label>
            <p className="text-2xl font-bold text-power100-green">{partner.power_confidence_score || 0}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Previous Score</label>
            <p className="text-2xl">{partner.previous_powerconfidence_score || 'N/A'}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Score Trend</label>
            <Badge variant={partner.score_trend === 'up' ? 'success' : partner.score_trend === 'down' ? 'destructive' : 'secondary'}>
              {partner.score_trend || 'stable'}
            </Badge>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Industry Rank</label>
            <p className="text-2xl">#{partner.industry_rank || 'N/A'}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Average Satisfaction</label>
            <p className="text-lg">{partner.average_satisfaction ? `${partner.average_satisfaction}/10` : 'N/A'}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Total Responses</label>
            <p className="text-lg">{partner.total_feedback_responses || 0}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Feedback Trend</label>
            <p className="text-lg">{partner.feedback_trend || 'N/A'}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Next Review</label>
            <p className="text-lg">{partner.next_quarterly_review ? new Date(partner.next_quarterly_review).toLocaleDateString() : 'N/A'}</p>
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
            <label className="text-sm font-medium text-gray-500">Service Category</label>
            <p className="text-lg">{partner.service_category || 'N/A'}</p>
          </div>
          
          <div>
            <label className="text-sm font-medium text-gray-500">Focus Areas Served</label>
            <div className="flex flex-wrap gap-2 mt-1">
              {parseJSON(partner.focus_areas_served).length > 0 ? (
                parseJSON(partner.focus_areas_served).map((area: string, idx: number) => (
                  <Badge key={idx} variant="outline">{area}</Badge>
                ))
              ) : (
                <span className="text-gray-500">None specified</span>
              )}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-500">Target Revenue Range</label>
            <div className="flex flex-wrap gap-2 mt-1">
              {parseJSON(partner.target_revenue_range).length > 0 ? (
                parseJSON(partner.target_revenue_range).map((range: string, idx: number) => (
                  <Badge key={idx} variant="outline">{range}</Badge>
                ))
              ) : (
                <span className="text-gray-500">None specified</span>
              )}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-500">Geographic Regions</label>
            <div className="flex flex-wrap gap-2 mt-1">
              {parseJSON(partner.geographic_regions).length > 0 ? (
                parseJSON(partner.geographic_regions).map((region: string, idx: number) => (
                  <Badge key={idx} variant="outline">{region}</Badge>
                ))
              ) : (
                <span className="text-gray-500">None specified</span>
              )}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-500">Pricing Model</label>
            <p className="text-lg">{partner.pricing_model || 'N/A'}</p>
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
            <label className="text-sm font-medium text-gray-500">Value Proposition</label>
            <p className="text-lg">{partner.value_proposition || 'N/A'}</p>
          </div>
          
          <div>
            <label className="text-sm font-medium text-gray-500">Why Clients Choose You</label>
            <p className="text-lg">{partner.why_clients_choose_you || 'N/A'}</p>
          </div>
          
          <div>
            <label className="text-sm font-medium text-gray-500">Why Clients Choose Competitors</label>
            <p className="text-lg">{partner.why_clients_choose_competitors || 'N/A'}</p>
          </div>
          
          <div>
            <label className="text-sm font-medium text-gray-500">Key Differentiators</label>
            <div className="flex flex-wrap gap-2 mt-1">
              {parseJSON(partner.key_differentiators).length > 0 ? (
                parseJSON(partner.key_differentiators).map((diff: string, idx: number) => (
                  <Badge key={idx} variant="outline">{diff}</Badge>
                ))
              ) : (
                <span className="text-gray-500">None specified</span>
              )}
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
            {partner.ceo_contact_name && (
              <div className="border rounded-lg p-4">
                <h4 className="font-semibold mb-2">CEO</h4>
                <p className="text-sm"><strong>{partner.ceo_contact_name}</strong></p>
                {partner.ceo_contact_title && <p className="text-sm text-gray-600">{partner.ceo_contact_title}</p>}
                {partner.ceo_contact_email && (
                  <p className="text-sm">
                    <Mail className="inline w-3 h-3 mr-1" />
                    <a href={`mailto:${partner.ceo_contact_email}`} className="text-blue-600 hover:underline">
                      {partner.ceo_contact_email}
                    </a>
                  </p>
                )}
                {partner.ceo_contact_phone && (
                  <p className="text-sm">
                    <Phone className="inline w-3 h-3 mr-1" />
                    {partner.ceo_contact_phone}
                  </p>
                )}
              </div>
            )}

            {/* CX Contact */}
            {partner.cx_contact_name && (
              <div className="border rounded-lg p-4">
                <h4 className="font-semibold mb-2">Customer Experience</h4>
                <p className="text-sm"><strong>{partner.cx_contact_name}</strong></p>
                {partner.cx_contact_title && <p className="text-sm text-gray-600">{partner.cx_contact_title}</p>}
                {partner.cx_contact_email && (
                  <p className="text-sm">
                    <Mail className="inline w-3 h-3 mr-1" />
                    <a href={`mailto:${partner.cx_contact_email}`} className="text-blue-600 hover:underline">
                      {partner.cx_contact_email}
                    </a>
                  </p>
                )}
                {partner.cx_contact_phone && (
                  <p className="text-sm">
                    <Phone className="inline w-3 h-3 mr-1" />
                    {partner.cx_contact_phone}
                  </p>
                )}
              </div>
            )}

            {/* Sales Contact */}
            {partner.sales_contact_name && (
              <div className="border rounded-lg p-4">
                <h4 className="font-semibold mb-2">Sales</h4>
                <p className="text-sm"><strong>{partner.sales_contact_name}</strong></p>
                {partner.sales_contact_title && <p className="text-sm text-gray-600">{partner.sales_contact_title}</p>}
                {partner.sales_contact_email && (
                  <p className="text-sm">
                    <Mail className="inline w-3 h-3 mr-1" />
                    <a href={`mailto:${partner.sales_contact_email}`} className="text-blue-600 hover:underline">
                      {partner.sales_contact_email}
                    </a>
                  </p>
                )}
                {partner.sales_contact_phone && (
                  <p className="text-sm">
                    <Phone className="inline w-3 h-3 mr-1" />
                    {partner.sales_contact_phone}
                  </p>
                )}
              </div>
            )}

            {/* Onboarding Contact */}
            {partner.onboarding_contact_name && (
              <div className="border rounded-lg p-4">
                <h4 className="font-semibold mb-2">Onboarding</h4>
                <p className="text-sm"><strong>{partner.onboarding_contact_name}</strong></p>
                {partner.onboarding_contact_title && <p className="text-sm text-gray-600">{partner.onboarding_contact_title}</p>}
                {partner.onboarding_contact_email && (
                  <p className="text-sm">
                    <Mail className="inline w-3 h-3 mr-1" />
                    <a href={`mailto:${partner.onboarding_contact_email}`} className="text-blue-600 hover:underline">
                      {partner.onboarding_contact_email}
                    </a>
                  </p>
                )}
                {partner.onboarding_contact_phone && (
                  <p className="text-sm">
                    <Phone className="inline w-3 h-3 mr-1" />
                    {partner.onboarding_contact_phone}
                  </p>
                )}
              </div>
            )}

            {/* Marketing Contact */}
            {partner.marketing_contact_name && (
              <div className="border rounded-lg p-4">
                <h4 className="font-semibold mb-2">Marketing</h4>
                <p className="text-sm"><strong>{partner.marketing_contact_name}</strong></p>
                {partner.marketing_contact_title && <p className="text-sm text-gray-600">{partner.marketing_contact_title}</p>}
                {partner.marketing_contact_email && (
                  <p className="text-sm">
                    <Mail className="inline w-3 h-3 mr-1" />
                    <a href={`mailto:${partner.marketing_contact_email}`} className="text-blue-600 hover:underline">
                      {partner.marketing_contact_email}
                    </a>
                  </p>
                )}
                {partner.marketing_contact_phone && (
                  <p className="text-sm">
                    <Phone className="inline w-3 h-3 mr-1" />
                    {partner.marketing_contact_phone}
                  </p>
                )}
              </div>
            )}

            {/* Main Contact (fallback) */}
            <div className="border rounded-lg p-4">
              <h4 className="font-semibold mb-2">Main Contact</h4>
              <p className="text-sm">
                <Mail className="inline w-3 h-3 mr-1" />
                <a href={`mailto:${partner.contact_email}`} className="text-blue-600 hover:underline">
                  {partner.contact_email}
                </a>
              </p>
              {partner.contact_phone && (
                <p className="text-sm">
                  <Phone className="inline w-3 h-3 mr-1" />
                  {partner.contact_phone}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Technology Stack */}
      {(partner.tech_stack_crm || partner.tech_stack_project_management || partner.tech_stack_communication) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-power100-red" />
              Technology Stack
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {partner.tech_stack_crm && parseJSON(partner.tech_stack_crm).length > 0 && (
              <div>
                <label className="text-sm font-medium text-gray-500">CRM Systems</label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {parseJSON(partner.tech_stack_crm).map((tech: string, idx: number) => (
                    <Badge key={idx} variant="secondary">{tech}</Badge>
                  ))}
                </div>
              </div>
            )}
            
            {partner.tech_stack_project_management && parseJSON(partner.tech_stack_project_management).length > 0 && (
              <div>
                <label className="text-sm font-medium text-gray-500">Project Management</label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {parseJSON(partner.tech_stack_project_management).map((tech: string, idx: number) => (
                    <Badge key={idx} variant="secondary">{tech}</Badge>
                  ))}
                </div>
              </div>
            )}
            
            {partner.tech_stack_communication && parseJSON(partner.tech_stack_communication).length > 0 && (
              <div>
                <label className="text-sm font-medium text-gray-500">Communication</label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {parseJSON(partner.tech_stack_communication).map((tech: string, idx: number) => (
                    <Badge key={idx} variant="secondary">{tech}</Badge>
                  ))}
                </div>
              </div>
            )}
            
            {partner.tech_stack_analytics && parseJSON(partner.tech_stack_analytics).length > 0 && (
              <div>
                <label className="text-sm font-medium text-gray-500">Analytics</label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {parseJSON(partner.tech_stack_analytics).map((tech: string, idx: number) => (
                    <Badge key={idx} variant="secondary">{tech}</Badge>
                  ))}
                </div>
              </div>
            )}
            
            {partner.tech_stack_marketing && parseJSON(partner.tech_stack_marketing).length > 0 && (
              <div>
                <label className="text-sm font-medium text-gray-500">Marketing</label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {parseJSON(partner.tech_stack_marketing).map((tech: string, idx: number) => (
                    <Badge key={idx} variant="secondary">{tech}</Badge>
                  ))}
                </div>
              </div>
            )}
            
            {partner.tech_stack_financial && parseJSON(partner.tech_stack_financial).length > 0 && (
              <div>
                <label className="text-sm font-medium text-gray-500">Financial</label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {parseJSON(partner.tech_stack_financial).map((tech: string, idx: number) => (
                    <Badge key={idx} variant="secondary">{tech}</Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Marketing & Partnerships */}
      {(partner.sponsored_events || partner.podcast_appearances || partner.books_read_recommended || partner.best_working_partnerships) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-power100-red" />
              Marketing & Partnerships
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {partner.sponsored_events && parseJSON(partner.sponsored_events).length > 0 && (
              <div>
                <label className="text-sm font-medium text-gray-500">Sponsored Events</label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {parseJSON(partner.sponsored_events).map((event: string, idx: number) => (
                    <Badge key={idx} variant="outline">{event}</Badge>
                  ))}
                </div>
              </div>
            )}
            
            {partner.podcast_appearances && parseJSON(partner.podcast_appearances).length > 0 && (
              <div>
                <label className="text-sm font-medium text-gray-500">Podcast Appearances</label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {parseJSON(partner.podcast_appearances).map((podcast: string, idx: number) => (
                    <Badge key={idx} variant="outline">{podcast}</Badge>
                  ))}
                </div>
              </div>
            )}
            
            {partner.books_read_recommended && (
              <div>
                <label className="text-sm font-medium text-gray-500">Recommended Books</label>
                <p className="text-lg">{partner.books_read_recommended}</p>
              </div>
            )}
            
            {partner.best_working_partnerships && (
              <div>
                <label className="text-sm font-medium text-gray-500">Best Working Partnerships</label>
                <p className="text-lg">{partner.best_working_partnerships}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Client Testimonials */}
      {partner.client_testimonials && parseJSON(partner.client_testimonials).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="w-5 h-5 text-power100-red" />
              Client Testimonials
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {parseJSON(partner.client_testimonials).map((testimonial: string, idx: number) => (
                <div key={idx} className="border-l-4 border-power100-green pl-4">
                  <p className="italic">"{testimonial}"</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Administrative Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-power100-red" />
            Administrative Details
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-500">Status</label>
            <Badge variant={partner.is_active ? "success" : "secondary"}>
              {partner.is_active ? 'Active' : 'Inactive'}
            </Badge>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Dashboard Access</label>
            <Badge variant={partner.dashboard_access_enabled ? "success" : "secondary"}>
              {partner.dashboard_access_enabled ? 'Enabled' : 'Disabled'}
            </Badge>
          </div>
          {partner.last_dashboard_login && (
            <div>
              <label className="text-sm font-medium text-gray-500">Last Dashboard Login</label>
              <p className="text-lg">{new Date(partner.last_dashboard_login).toLocaleDateString()}</p>
            </div>
          )}
          <div>
            <label className="text-sm font-medium text-gray-500">Created</label>
            <p className="text-lg">{new Date(partner.created_at).toLocaleDateString()}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Last Updated</label>
            <p className="text-lg">{new Date(partner.updated_at).toLocaleDateString()}</p>
          </div>
          {partner.last_feedback_update && (
            <div>
              <label className="text-sm font-medium text-gray-500">Last Feedback Update</label>
              <p className="text-lg">{new Date(partner.last_feedback_update).toLocaleDateString()}</p>
            </div>
          )}
          {partner.onboarding_url && (
            <div className="col-span-full">
              <label className="text-sm font-medium text-gray-500">Onboarding URL</label>
              <p className="text-lg">
                <a href={partner.onboarding_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                  {partner.onboarding_url}
                </a>
              </p>
            </div>
          )}
          {partner.demo_booking_url && (
            <div className="col-span-full">
              <label className="text-sm font-medium text-gray-500">Demo Booking URL</label>
              <p className="text-lg">
                <a href={partner.demo_booking_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                  {partner.demo_booking_url}
                </a>
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}