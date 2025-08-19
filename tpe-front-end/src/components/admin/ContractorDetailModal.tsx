'use client';

import React from 'react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { X, User, Building2, Mail, Phone, Calendar, CheckCircle, Clock } from 'lucide-react';

interface Contractor {
  id: number;
  name: string;
  email: string;
  phone?: string;
  company_name: string;
  company_website?: string;
  service_area?: string;
  focus_areas: string[];
  annual_revenue?: string;
  team_size?: number;
  current_stage: string;
  verification_status: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  tags: string[];
  contact_type: string;
  onboarding_source: string;
  progress_percentage: number;
  stage_display: string;
  is_verified: boolean;
  is_active: boolean;
}

interface ContractorDetailModalProps {
  contractor: Contractor | null;
  isOpen: boolean;
  onClose: () => void;
}

const ContractorDetailModal: React.FC<ContractorDetailModalProps> = ({ contractor, isOpen, onClose }) => {
  if (!isOpen || !contractor) return null;

  const getStatusIcon = (status: string) => {
    return status === 'verified' ? 
      <CheckCircle className="w-4 h-4 text-green-600" /> : 
      <Clock className="w-4 h-4 text-yellow-600" />;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-power100-black">Contractor Details</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-power100-grey" />
                <div>
                  <p className="text-sm text-power100-grey">Full Name</p>
                  <p className="font-medium">{contractor.name}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-power100-grey" />
                <div>
                  <p className="text-sm text-power100-grey">Email</p>
                  <p className="font-medium">{contractor.email}</p>
                </div>
              </div>
              
              {contractor.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-power100-grey" />
                  <div>
                    <p className="text-sm text-power100-grey">Phone</p>
                    <p className="font-medium">{contractor.phone}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-power100-grey" />
                <div>
                  <p className="text-sm text-power100-grey">Company</p>
                  <p className="font-medium">{contractor.company_name}</p>
                </div>
              </div>
              
              {contractor.company_website && (
                <div>
                  <p className="text-sm text-power100-grey">Website</p>
                  <a 
                    href={contractor.company_website} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="font-medium text-power100-red hover:underline"
                  >
                    {contractor.company_website}
                  </a>
                </div>
              )}
              
              {contractor.service_area && (
                <div>
                  <p className="text-sm text-power100-grey">Service Area</p>
                  <p className="font-medium">{contractor.service_area}</p>
                </div>
              )}
            </div>
          </div>

          {/* Status & Progress */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-semibold mb-3">Status & Progress</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-sm text-power100-grey mb-1">Verification Status</p>
                <div className="flex items-center justify-center gap-2">
                  {getStatusIcon(contractor.verification_status)}
                  <Badge className={contractor.verification_status === 'verified' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                    {contractor.verification_status}
                  </Badge>
                </div>
              </div>
              
              <div className="text-center">
                <p className="text-sm text-power100-grey mb-1">Current Stage</p>
                <Badge className="bg-blue-100 text-blue-800">
                  {contractor.stage_display}
                </Badge>
              </div>
              
              <div className="text-center">
                <p className="text-sm text-power100-grey mb-1">Progress</p>
                <div className="w-full bg-gray-200 rounded-full h-2 mb-1">
                  <div 
                    className="bg-power100-green h-2 rounded-full" 
                    style={{ width: `${contractor.progress_percentage}%` }}
                  ></div>
                </div>
                <p className="text-sm font-medium">{contractor.progress_percentage}%</p>
              </div>
            </div>
          </div>

          {/* Business Details */}
          {(contractor.annual_revenue || contractor.team_size) && (
            <div>
              <h3 className="font-semibold mb-3">Business Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {contractor.annual_revenue && (
                  <div>
                    <p className="text-sm text-power100-grey">Annual Revenue</p>
                    <p className="font-medium">{contractor.annual_revenue.replace(/_/g, ' ')}</p>
                  </div>
                )}
                {contractor.team_size && (
                  <div>
                    <p className="text-sm text-power100-grey">Team Size</p>
                    <p className="font-medium">{contractor.team_size} employees</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Focus Areas */}
          {contractor.focus_areas.length > 0 && (
            <div>
              <h3 className="font-semibold mb-3">Focus Areas</h3>
              <div className="flex flex-wrap gap-2">
                {contractor.focus_areas.map((area, index) => (
                  <Badge key={index} variant="secondary">
                    {area.replace(/_/g, ' ')}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Tags */}
          {contractor.tags.length > 0 && (
            <div>
              <h3 className="font-semibold mb-3">Tags</h3>
              <div className="flex flex-wrap gap-2">
                {contractor.tags.map((tag, index) => (
                  <Badge key={index} variant="outline">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Metadata */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-semibold mb-3">System Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-power100-grey">Contact Type</p>
                <p className="font-medium">{contractor.contact_type}</p>
              </div>
              <div>
                <p className="text-power100-grey">Onboarding Source</p>
                <p className="font-medium">{contractor.onboarding_source.replace(/_/g, ' ')}</p>
              </div>
              <div>
                <p className="text-power100-grey">Created</p>
                <p className="font-medium">{new Date(contractor.created_at).toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-power100-grey">Last Updated</p>
                <p className="font-medium">{new Date(contractor.updated_at).toLocaleDateString()}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 p-6 border-t">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button 
            className="bg-power100-red hover:bg-red-700 text-white"
            onClick={() => {
              window.location.href = `/admindashboard/contractors/${contractor.id}/edit`;
            }}
          >
            Edit Contractor
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ContractorDetailModal;