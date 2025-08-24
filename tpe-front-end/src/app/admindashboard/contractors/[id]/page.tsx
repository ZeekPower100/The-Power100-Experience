'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  User, 
  Building, 
  Mail, 
  Phone, 
  Calendar,
  Target,
  Users,
  DollarSign,
  Edit,
  ArrowLeft,
  MapPin,
  Briefcase,
  Activity,
  CheckCircle,
  Star,
  Shield,
  Package,
  Hash
} from 'lucide-react';
import { contractorApi } from '@/lib/api';

interface ContractorDetails {
  // Basic Information
  id: number;
  name: string;
  email: string;
  phone: string;
  company_name: string;
  company_website?: string;
  
  // Location & Services
  service_area?: string;
  services_offered?: string[];
  
  // Business Focus
  focus_areas?: string[];
  primary_focus_area?: string;
  
  // Business Profile
  annual_revenue?: string;
  team_size?: number;
  
  // Readiness Indicators
  increased_tools?: boolean;
  increased_people?: boolean;
  increased_activity?: boolean;
  
  // Technology Stack
  tech_stack_sales?: string[];
  tech_stack_operations?: string[];
  tech_stack_marketing?: string[];
  tech_stack_customer_experience?: string[];
  tech_stack_project_management?: string[];
  tech_stack_accounting_finance?: string[];
  
  tech_stack_sales_other?: string;
  tech_stack_operations_other?: string;
  tech_stack_marketing_other?: string;
  tech_stack_customer_experience_other?: string;
  tech_stack_project_management_other?: string;
  tech_stack_accounting_finance_other?: string;
  
  // Contact Tagging
  contact_type?: string;
  onboarding_source?: string;
  associated_partner_id?: number;
  email_domain?: string;
  tags?: string[];
  
  // Verification & Flow
  opted_in_coaching?: boolean;
  verification_status?: string;
  verification_code?: string;
  verification_expires_at?: string;
  current_stage?: string;
  
  // PowerConfidence & Feedback
  feedback_completion_status?: string;
  
  // Timestamps
  created_at: string;
  updated_at: string;
  completed_at?: string;
}

export default function ContractorViewPage() {
  const params = useParams();
  const router = useRouter();
  const [contractor, setContractor] = useState<ContractorDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadContractor();
  }, [params.id]);

  const loadContractor = async () => {
    try {
      setLoading(true);
      const data = await contractorApi.getById(params.id as string);
      setContractor(data.contractor);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load contractor');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    router.push(`/admindashboard/contractors/${params.id}/edit`);
  };

  const handleBack = () => {
    router.back();
  };

  const parseJSON = (data: any) => {
    if (!data) return [];
    if (typeof data === 'string') {
      try {
        return JSON.parse(data);
      } catch {
        return [];
      }
    }
    return Array.isArray(data) ? data : [];
  };

  const getStageColor = (stage?: string) => {
    const colors: Record<string, string> = {
      verification: 'bg-yellow-100 text-yellow-800',
      focus_selection: 'bg-blue-100 text-blue-800',
      profiling: 'bg-purple-100 text-purple-800',
      matching: 'bg-orange-100 text-orange-800',
      completed: 'bg-green-100 text-green-800'
    };
    return colors[stage || ''] || 'bg-gray-100 text-gray-800';
  };

  const getRevenueDisplay = (revenue?: string) => {
    const revenueMap: Record<string, string> = {
      'under_100k': 'Under $100K',
      '100k_500k': '$100K - $500K',
      '500k_1m': '$500K - $1M',
      '1m_5m': '$1M - $5M',
      '5m_10m': '$5M - $10M',
      'over_10m': 'Over $10M'
    };
    return revenueMap[revenue || ''] || revenue || 'N/A';
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

  if (error || !contractor) {
    return (
      <div className="container mx-auto p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error || 'Contractor not found'}
        </div>
      </div>
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
          <h1 className="text-3xl font-bold text-gray-900">{contractor.name}</h1>
          <Badge className={getStageColor(contractor.current_stage)}>
            {contractor.current_stage?.replace(/_/g, ' ')}
          </Badge>
        </div>
        <Button onClick={handleEdit} className="bg-power100-green hover:bg-green-600">
          <Edit className="w-4 h-4 mr-2" />
          Edit Contractor
        </Button>
      </div>

      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5 text-power100-red" />
            Basic Information
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-500">Name</label>
            <p className="text-lg">{contractor.name}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Email</label>
            <p className="text-lg">
              <a href={`mailto:${contractor.email}`} className="text-blue-600 hover:underline">
                {contractor.email}
              </a>
            </p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Phone</label>
            <p className="text-lg">{contractor.phone}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Company Name</label>
            <p className="text-lg">{contractor.company_name}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Company Website</label>
            <p className="text-lg">
              {contractor.company_website ? (
                <a href={contractor.company_website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                  {contractor.company_website}
                </a>
              ) : 'N/A'}
            </p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Service Area</label>
            <p className="text-lg">{contractor.service_area || 'N/A'}</p>
          </div>
        </CardContent>
      </Card>

      {/* Business Profile */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="w-5 h-5 text-power100-red" />
            Business Profile
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-500">Annual Revenue</label>
            <p className="text-lg font-semibold">{getRevenueDisplay(contractor.annual_revenue)}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Team Size</label>
            <p className="text-lg font-semibold">{contractor.team_size ? `${contractor.team_size} employees` : 'N/A'}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Primary Focus Area</label>
            <p className="text-lg">{contractor.primary_focus_area || 'N/A'}</p>
          </div>
          
          {/* Services Offered */}
          {contractor.services_offered && parseJSON(contractor.services_offered).length > 0 && (
            <div className="col-span-full">
              <label className="text-sm font-medium text-gray-500">Services Offered</label>
              <div className="flex flex-wrap gap-2 mt-2">
                {parseJSON(contractor.services_offered).map((service: string, idx: number) => (
                  <Badge key={idx} variant="outline">{service}</Badge>
                ))}
              </div>
            </div>
          )}
          
          {/* Focus Areas */}
          {contractor.focus_areas && parseJSON(contractor.focus_areas).length > 0 && (
            <div className="col-span-full">
              <label className="text-sm font-medium text-gray-500">Business Focus Areas</label>
              <div className="flex flex-wrap gap-2 mt-2">
                {parseJSON(contractor.focus_areas).map((area: string, idx: number) => (
                  <Badge key={idx} variant="default" className="bg-power100-green">
                    {area}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Growth Readiness Indicators */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-power100-red" />
            Growth Readiness Indicators
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
              <div className={`p-2 rounded-full ${contractor.increased_tools ? 'bg-green-100' : 'bg-gray-200'}`}>
                <Package className={`w-6 h-6 ${contractor.increased_tools ? 'text-green-600' : 'text-gray-400'}`} />
              </div>
              <div>
                <p className="font-medium">Increased Tools</p>
                <p className="text-sm text-gray-600">{contractor.increased_tools ? 'Yes' : 'No'}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
              <div className={`p-2 rounded-full ${contractor.increased_people ? 'bg-green-100' : 'bg-gray-200'}`}>
                <Users className={`w-6 h-6 ${contractor.increased_people ? 'text-green-600' : 'text-gray-400'}`} />
              </div>
              <div>
                <p className="font-medium">Increased People</p>
                <p className="text-sm text-gray-600">{contractor.increased_people ? 'Yes' : 'No'}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
              <div className={`p-2 rounded-full ${contractor.increased_activity ? 'bg-green-100' : 'bg-gray-200'}`}>
                <Activity className={`w-6 h-6 ${contractor.increased_activity ? 'text-green-600' : 'text-gray-400'}`} />
              </div>
              <div>
                <p className="font-medium">Increased Activity</p>
                <p className="text-sm text-gray-600">{contractor.increased_activity ? 'Yes' : 'No'}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Technology Stack */}
      {(contractor.tech_stack_sales || contractor.tech_stack_operations || contractor.tech_stack_marketing ||
        contractor.tech_stack_customer_experience || contractor.tech_stack_project_management || contractor.tech_stack_accounting_finance) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-power100-red" />
              Technology Stack
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {contractor.tech_stack_sales && parseJSON(contractor.tech_stack_sales).length > 0 && (
              <div>
                <label className="text-sm font-medium text-gray-500">Sales & CRM</label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {parseJSON(contractor.tech_stack_sales).map((tech: string, idx: number) => (
                    <Badge key={idx} variant="secondary">{tech}</Badge>
                  ))}
                  {contractor.tech_stack_sales_other && (
                    <Badge variant="outline">{contractor.tech_stack_sales_other}</Badge>
                  )}
                </div>
              </div>
            )}
            
            {contractor.tech_stack_operations && parseJSON(contractor.tech_stack_operations).length > 0 && (
              <div>
                <label className="text-sm font-medium text-gray-500">Operations</label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {parseJSON(contractor.tech_stack_operations).map((tech: string, idx: number) => (
                    <Badge key={idx} variant="secondary">{tech}</Badge>
                  ))}
                  {contractor.tech_stack_operations_other && (
                    <Badge variant="outline">{contractor.tech_stack_operations_other}</Badge>
                  )}
                </div>
              </div>
            )}
            
            {contractor.tech_stack_marketing && parseJSON(contractor.tech_stack_marketing).length > 0 && (
              <div>
                <label className="text-sm font-medium text-gray-500">Marketing</label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {parseJSON(contractor.tech_stack_marketing).map((tech: string, idx: number) => (
                    <Badge key={idx} variant="secondary">{tech}</Badge>
                  ))}
                  {contractor.tech_stack_marketing_other && (
                    <Badge variant="outline">{contractor.tech_stack_marketing_other}</Badge>
                  )}
                </div>
              </div>
            )}
            
            {contractor.tech_stack_customer_experience && parseJSON(contractor.tech_stack_customer_experience).length > 0 && (
              <div>
                <label className="text-sm font-medium text-gray-500">Customer Experience</label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {parseJSON(contractor.tech_stack_customer_experience).map((tech: string, idx: number) => (
                    <Badge key={idx} variant="secondary">{tech}</Badge>
                  ))}
                  {contractor.tech_stack_customer_experience_other && (
                    <Badge variant="outline">{contractor.tech_stack_customer_experience_other}</Badge>
                  )}
                </div>
              </div>
            )}
            
            {contractor.tech_stack_project_management && parseJSON(contractor.tech_stack_project_management).length > 0 && (
              <div>
                <label className="text-sm font-medium text-gray-500">Project Management</label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {parseJSON(contractor.tech_stack_project_management).map((tech: string, idx: number) => (
                    <Badge key={idx} variant="secondary">{tech}</Badge>
                  ))}
                  {contractor.tech_stack_project_management_other && (
                    <Badge variant="outline">{contractor.tech_stack_project_management_other}</Badge>
                  )}
                </div>
              </div>
            )}
            
            {contractor.tech_stack_accounting_finance && parseJSON(contractor.tech_stack_accounting_finance).length > 0 && (
              <div>
                <label className="text-sm font-medium text-gray-500">Accounting & Finance</label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {parseJSON(contractor.tech_stack_accounting_finance).map((tech: string, idx: number) => (
                    <Badge key={idx} variant="secondary">{tech}</Badge>
                  ))}
                  {contractor.tech_stack_accounting_finance_other && (
                    <Badge variant="outline">{contractor.tech_stack_accounting_finance_other}</Badge>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Contact Tagging & Tracking */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Hash className="w-5 h-5 text-power100-red" />
            Contact Tagging & Tracking
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-500">Contact Type</label>
            <Badge variant="outline">{contractor.contact_type || 'contractor'}</Badge>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Onboarding Source</label>
            <p className="text-lg">{contractor.onboarding_source || 'contractor_flow'}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Email Domain</label>
            <p className="text-lg">{contractor.email_domain || 'N/A'}</p>
          </div>
          
          {contractor.tags && parseJSON(contractor.tags).length > 0 && (
            <div className="col-span-full">
              <label className="text-sm font-medium text-gray-500">Tags</label>
              <div className="flex flex-wrap gap-2 mt-2">
                {parseJSON(contractor.tags).map((tag: string, idx: number) => (
                  <Badge key={idx} variant="secondary">#{tag}</Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Verification & Flow Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-power100-red" />
            Verification & Flow Status
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-500">Verification Status</label>
            <Badge variant={contractor.verification_status === 'verified' ? 'success' : 'secondary'}>
              {contractor.verification_status || 'pending'}
            </Badge>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Current Stage</label>
            <Badge className={getStageColor(contractor.current_stage)}>
              {contractor.current_stage?.replace(/_/g, ' ')}
            </Badge>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Opted in for AI Coaching</label>
            <Badge variant={contractor.opted_in_coaching ? 'success' : 'secondary'}>
              {contractor.opted_in_coaching ? 'Yes' : 'No'}
            </Badge>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Feedback Status</label>
            <p className="text-lg">{contractor.feedback_completion_status || 'pending'}</p>
          </div>
        </CardContent>
      </Card>

      {/* Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-power100-red" />
            Timeline
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-500">Created</label>
            <p className="text-lg">{new Date(contractor.created_at).toLocaleDateString()}</p>
            <p className="text-sm text-gray-600">{new Date(contractor.created_at).toLocaleTimeString()}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Last Updated</label>
            <p className="text-lg">{new Date(contractor.updated_at).toLocaleDateString()}</p>
            <p className="text-sm text-gray-600">{new Date(contractor.updated_at).toLocaleTimeString()}</p>
          </div>
          {contractor.completed_at && (
            <div>
              <label className="text-sm font-medium text-gray-500">Completed</label>
              <p className="text-lg">{new Date(contractor.completed_at).toLocaleDateString()}</p>
              <p className="text-sm text-gray-600">{new Date(contractor.completed_at).toLocaleTimeString()}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}