'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  User, 
  Save,
  X,
  ArrowLeft,
  Plus,
  Trash2,
  Building,
  Mail,
  Phone,
  Target,
  Users,
  DollarSign,
  MapPin,
  Briefcase,
  Activity,
  Package,
  Hash,
  Shield
} from 'lucide-react';
import { contractorApi } from '@/lib/api';
import { getApiUrl } from '@/utils/api';

interface ContractorEditData {
  // Basic Information
  name: string;
  email: string;
  phone: string;
  company_name: string;
  company_website: string;
  
  // Location & Services
  service_area: string;
  services_offered: string[];
  
  // Business Focus
  focus_areas: string[];
  primary_focus_area: string;
  
  // Business Profile
  annual_revenue: string;
  team_size: string;
  
  // Readiness Indicators
  increased_tools: boolean;
  increased_people: boolean;
  increased_activity: boolean;
  
  // Technology Stack
  tech_stack_sales: string[];
  tech_stack_operations: string[];
  tech_stack_marketing: string[];
  tech_stack_customer_experience: string[];
  tech_stack_project_management: string[];
  tech_stack_accounting_finance: string[];
  
  tech_stack_sales_other: string;
  tech_stack_operations_other: string;
  tech_stack_marketing_other: string;
  tech_stack_customer_experience_other: string;
  tech_stack_project_management_other: string;
  tech_stack_accounting_finance_other: string;
  
  // Contact Tagging
  contact_type: string;
  onboarding_source: string;
  associated_partner_id: string;
  email_domain: string;
  tags: string[];
  
  // Verification & Flow
  opted_in_coaching: boolean;
  verification_status: string;
  current_stage: string;
  
  // PowerConfidence & Feedback
  feedback_completion_status: string;
}

const focusAreaOptions = [
  'Sales & Business Development',
  'Marketing & Lead Generation', 
  'Operations & Efficiency',
  'Financial Management',
  'Technology & Innovation',
  'Customer Experience',
  'Team & Leadership',
  'Strategic Planning'
];

const revenueRanges = [
  'under_1m',
  '1m_5m',
  '5m_10m',
  '10m_25m',
  '25m_50m',
  '50m_plus'
];

const teamSizeOptions = [
  '1-5',
  '6-15',
  '16-50',
  '51-100',
  '100+'
];

const techStackOptions = {
  sales: ['HubSpot', 'Salesforce', 'Pipedrive', 'Zoom', 'Monday.com'],
  operations: ['Microsoft 365', 'Google Workspace', 'Slack', 'Asana', 'Trello'],
  marketing: ['Mailchimp', 'Constant Contact', 'Facebook Ads', 'Google Ads', 'Canva'],
  customer_experience: ['Zendesk', 'Freshdesk', 'Intercom', 'Calendly', 'Survey Monkey'],
  project_management: ['Monday.com', 'Asana', 'Trello', 'Jira', 'Basecamp'],
  accounting_finance: ['QuickBooks', 'Xero', 'FreshBooks', 'Wave', 'Sage']
};

export default function ContractorEditPage() {
  const params = useParams();
  const router = useRouter();
  const [returnUrl, setReturnUrl] = useState<string>('/admindashboard/contractors-enhanced');
  const [contractor, setContractor] = useState<ContractorEditData>({
    // Basic Information
    name: '',
    email: '',
    phone: '',
    company_name: '',
    company_website: '',
    
    // Location & Services
    service_area: '',
    services_offered: [],
    
    // Business Focus
    focus_areas: [],
    primary_focus_area: '',
    
    // Business Profile
    annual_revenue: '',
    team_size: '',
    
    // Readiness Indicators
    increased_tools: false,
    increased_people: false,
    increased_activity: false,
    
    // Technology Stack
    tech_stack_sales: [],
    tech_stack_operations: [],
    tech_stack_marketing: [],
    tech_stack_customer_experience: [],
    tech_stack_project_management: [],
    tech_stack_accounting_finance: [],
    
    tech_stack_sales_other: '',
    tech_stack_operations_other: '',
    tech_stack_marketing_other: '',
    tech_stack_customer_experience_other: '',
    tech_stack_project_management_other: '',
    tech_stack_accounting_finance_other: '',
    
    // Contact Tagging
    contact_type: '',
    onboarding_source: '',
    associated_partner_id: '',
    email_domain: '',
    tags: [],
    
    // Verification & Flow
    opted_in_coaching: false,
    verification_status: '',
    current_stage: '',
    
    // PowerConfidence & Feedback
    feedback_completion_status: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const contractorId = params.id as string;

  // Load contractor data
  const loadContractor = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Use contractors-enhanced endpoint that works reliably
      const response = await fetch(getApiUrl(`api/contractors-enhanced/${contractorId}/view`), {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch contractor details');
      }

      const responseData = await response.json();
      console.log('🔍 Full response from contractors-enhanced:', responseData);
      
      const contractorData = responseData.contractor;
      console.log('🔍 Extracted contractor data:', contractorData);
      
      // Parse JSON fields safely
      const parseJsonField = (field: any) => {
        if (typeof field === 'string') {
          try {
            return JSON.parse(field);
          } catch {
            return [];
          }
        }
        return Array.isArray(field) ? field : [];
      };

      // Map the loaded data to edit format
      setContractor({
        // Basic Information
        name: contractorData.name || '',
        email: contractorData.email || '',
        phone: contractorData.phone || '',
        company_name: contractorData.company_name || '',
        company_website: contractorData.company_website || '',
        
        // Location & Services
        service_area: contractorData.service_area || '',
        services_offered: parseJsonField(contractorData.services_offered),
        
        // Business Focus
        focus_areas: parseJsonField(contractorData.focus_areas),
        primary_focus_area: contractorData.primary_focus_area || '',
        
        // Business Profile
        annual_revenue: contractorData.annual_revenue || '',
        team_size: contractorData.team_size ? contractorData.team_size.toString() : '',
        
        // Readiness Indicators
        increased_tools: !!contractorData.increased_tools,
        increased_people: !!contractorData.increased_people,
        increased_activity: !!contractorData.increased_activity,
        
        // Technology Stack
        tech_stack_sales: parseJsonField(contractorData.tech_stack_sales),
        tech_stack_operations: parseJsonField(contractorData.tech_stack_operations),
        tech_stack_marketing: parseJsonField(contractorData.tech_stack_marketing),
        tech_stack_customer_experience: parseJsonField(contractorData.tech_stack_customer_experience),
        tech_stack_project_management: parseJsonField(contractorData.tech_stack_project_management),
        tech_stack_accounting_finance: parseJsonField(contractorData.tech_stack_accounting_finance),
        
        tech_stack_sales_other: contractorData.tech_stack_sales_other || '',
        tech_stack_operations_other: contractorData.tech_stack_operations_other || '',
        tech_stack_marketing_other: contractorData.tech_stack_marketing_other || '',
        tech_stack_customer_experience_other: contractorData.tech_stack_customer_experience_other || '',
        tech_stack_project_management_other: contractorData.tech_stack_project_management_other || '',
        tech_stack_accounting_finance_other: contractorData.tech_stack_accounting_finance_other || '',
        
        // Contact Tagging
        contact_type: contractorData.contact_type || '',
        onboarding_source: contractorData.onboarding_source || '',
        associated_partner_id: contractorData.associated_partner_id?.toString() || '',
        email_domain: contractorData.email_domain || '',
        tags: parseJsonField(contractorData.tags),
        
        // Verification & Flow
        opted_in_coaching: !!contractorData.opted_in_coaching,
        verification_status: contractorData.verification_status || '',
        current_stage: contractorData.current_stage || '',
        
        // PowerConfidence & Feedback
        feedback_completion_status: contractorData.feedback_completion_status || ''
      });
    } catch (error: any) {
      console.error('❌ Error loading contractor:', error);
      console.error('❌ Error details:', {
        message: error.message,
        contractorId: contractorId,
        endpoint: `contractors-enhanced/${contractorId}/view`
      });
      setError(error.message || 'Failed to load contractor data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Determine where we came from based on referrer or default to enhanced page
    if (typeof window !== 'undefined') {
      const referrer = document.referrer;
      if (referrer.includes('/search')) {
        setReturnUrl('/admindashboard/search');
      } else if (referrer.includes('/contractors-enhanced')) {
        setReturnUrl('/admindashboard/contractors-enhanced');
      } else if (referrer.includes('/admindashboard')) {
        // Default to contractors-enhanced for any admin dashboard page
        setReturnUrl('/admindashboard/contractors-enhanced');
      }
    }
    
    if (contractorId) {
      loadContractor();
    }
  }, [contractorId]);

  // Handle form submission
  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);

      // Prepare data for API
      const updateData = {
        // Basic Information
        name: contractor.name,
        email: contractor.email,
        phone: contractor.phone,
        company_name: contractor.company_name,
        company_website: contractor.company_website,
        
        // Location & Services
        service_area: contractor.service_area,
        services_offered: JSON.stringify(contractor.services_offered),
        
        // Business Focus
        focus_areas: JSON.stringify(contractor.focus_areas),
        primary_focus_area: contractor.primary_focus_area,
        
        // Business Profile
        annual_revenue: contractor.annual_revenue,
        team_size: contractor.team_size ? parseInt(contractor.team_size) : null,
        
        // Readiness Indicators
        increased_tools: contractor.increased_tools,
        increased_people: contractor.increased_people,
        increased_activity: contractor.increased_activity,
        
        // Technology Stack
        tech_stack_sales: JSON.stringify(contractor.tech_stack_sales),
        tech_stack_operations: JSON.stringify(contractor.tech_stack_operations),
        tech_stack_marketing: JSON.stringify(contractor.tech_stack_marketing),
        tech_stack_customer_experience: JSON.stringify(contractor.tech_stack_customer_experience),
        tech_stack_project_management: JSON.stringify(contractor.tech_stack_project_management),
        tech_stack_accounting_finance: JSON.stringify(contractor.tech_stack_accounting_finance),
        
        tech_stack_sales_other: contractor.tech_stack_sales_other,
        tech_stack_operations_other: contractor.tech_stack_operations_other,
        tech_stack_marketing_other: contractor.tech_stack_marketing_other,
        tech_stack_customer_experience_other: contractor.tech_stack_customer_experience_other,
        tech_stack_project_management_other: contractor.tech_stack_project_management_other,
        tech_stack_accounting_finance_other: contractor.tech_stack_accounting_finance_other,
        
        // Contact Tagging
        contact_type: contractor.contact_type,
        onboarding_source: contractor.onboarding_source,
        associated_partner_id: contractor.associated_partner_id ? parseInt(contractor.associated_partner_id) : null,
        email_domain: contractor.email_domain,
        tags: JSON.stringify(contractor.tags),
        
        // Verification & Flow
        opted_in_coaching: contractor.opted_in_coaching,
        verification_status: contractor.verification_status,
        current_stage: contractor.current_stage,
        
        // PowerConfidence & Feedback
        feedback_completion_status: contractor.feedback_completion_status
      };

      await contractorApi.update(contractorId, updateData);
      
      // Redirect back to where we came from
      router.push(returnUrl);
    } catch (error) {
      console.error('Error saving contractor:', error);
      setError('Failed to save contractor data');
    } finally {
      setSaving(false);
    }
  };

  // Multi-select handlers
  const handleArrayUpdate = (field: keyof ContractorEditData, value: string, checked: boolean) => {
    setContractor(prev => {
      const currentArray = prev[field] as string[];
      if (checked) {
        return { ...prev, [field]: [...currentArray, value] };
      } else {
        return { ...prev, [field]: currentArray.filter(item => item !== value) };
      }
    });
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading contractor data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => router.push(returnUrl)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Edit Contractor</h1>
            <p className="text-gray-600 mt-1">Update contractor information and settings</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => router.push(returnUrl)}
          >
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-red-600 hover:bg-red-700"
          >
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      <div className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Basic Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Name</label>
                <Input
                  value={contractor.name}
                  onChange={(e) => setContractor(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Full name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Email</label>
                <Input
                  type="email"
                  value={contractor.email}
                  onChange={(e) => setContractor(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="email@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Phone</label>
                <Input
                  value={contractor.phone}
                  onChange={(e) => setContractor(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="(555) 123-4567"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Company Name</label>
                <Input
                  value={contractor.company_name}
                  onChange={(e) => setContractor(prev => ({ ...prev, company_name: e.target.value }))}
                  placeholder="Company name"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Company Website</label>
              <Input
                value={contractor.company_website}
                onChange={(e) => setContractor(prev => ({ ...prev, company_website: e.target.value }))}
                placeholder="https://example.com"
              />
            </div>
          </CardContent>
        </Card>

        {/* Business Profile */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5" />
              Business Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Annual Revenue</label>
                <Select 
                  value={contractor.annual_revenue} 
                  onValueChange={(value) => setContractor(prev => ({ ...prev, annual_revenue: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select revenue range" />
                  </SelectTrigger>
                  <SelectContent>
                    {revenueRanges.map(range => (
                      <SelectItem key={range} value={range}>
                        {range === 'under_1m' ? 'Under $1M' :
                         range === '1m_5m' ? '$1M - $5M' :
                         range === '5m_10m' ? '$5M - $10M' :
                         range === '10m_25m' ? '$10M - $25M' :
                         range === '25m_50m' ? '$25M - $50M' :
                         range === '50m_plus' ? '$50M+' : range}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Team Size</label>
                <Input
                  type="number"
                  value={contractor.team_size}
                  onChange={(e) => setContractor(prev => ({ ...prev, team_size: e.target.value }))}
                  placeholder="Enter team size (e.g., 34)"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Service Area</label>
              <Input
                value={contractor.service_area}
                onChange={(e) => setContractor(prev => ({ ...prev, service_area: e.target.value }))}
                placeholder="Geographic service area"
              />
            </div>
          </CardContent>
        </Card>

        {/* Focus Areas */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Business Focus Areas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Primary Focus Area</label>
              <Select 
                value={contractor.primary_focus_area} 
                onValueChange={(value) => setContractor(prev => ({ ...prev, primary_focus_area: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select primary focus" />
                </SelectTrigger>
                <SelectContent>
                  {focusAreaOptions.map(area => (
                    <SelectItem key={area} value={area}>{area}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">All Focus Areas</label>
              <div className="grid grid-cols-2 gap-2">
                {focusAreaOptions.map(area => (
                  <div key={area} className="flex items-center space-x-2">
                    <Checkbox
                      checked={contractor.focus_areas.includes(area)}
                      onCheckedChange={(checked) => handleArrayUpdate('focus_areas', area, !!checked)}
                    />
                    <label className="text-sm">{area}</label>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Readiness Indicators */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Readiness Indicators
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={contractor.increased_tools}
                  onCheckedChange={(checked) => setContractor(prev => ({ ...prev, increased_tools: !!checked }))}
                />
                <label className="text-sm">Ready to increase tools and technology</label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={contractor.increased_people}
                  onCheckedChange={(checked) => setContractor(prev => ({ ...prev, increased_people: !!checked }))}
                />
                <label className="text-sm">Ready to increase people and hiring</label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={contractor.increased_activity}
                  onCheckedChange={(checked) => setContractor(prev => ({ ...prev, increased_activity: !!checked }))}
                />
                <label className="text-sm">Ready to increase activity and growth</label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* System Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              System Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Verification Status</label>
                <Select 
                  value={contractor.verification_status} 
                  onValueChange={(value) => setContractor(prev => ({ ...prev, verification_status: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="verified">Verified</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Current Stage</label>
                <Select 
                  value={contractor.current_stage} 
                  onValueChange={(value) => setContractor(prev => ({ ...prev, current_stage: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select stage" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="verification">Verification</SelectItem>
                    <SelectItem value="focus_areas">Focus Areas</SelectItem>
                    <SelectItem value="business_profile">Business Profile</SelectItem>
                    <SelectItem value="tech_stack">Technology Stack</SelectItem>
                    <SelectItem value="matching">Partner Matching</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                checked={contractor.opted_in_coaching}
                onCheckedChange={(checked) => setContractor(prev => ({ ...prev, opted_in_coaching: !!checked }))}
              />
              <label className="text-sm">Opted in for AI coaching</label>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Save Button (Bottom) */}
      <div className="flex justify-end mt-8 pt-6 border-t">
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => router.push(returnUrl)}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-red-600 hover:bg-red-700"
          >
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </div>
  );
}