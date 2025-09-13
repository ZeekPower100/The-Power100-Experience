'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Eye, Edit, Users, TrendingUp, Calendar, CheckCircle, XCircle, Clock, Download, FileText, FileSpreadsheet } from 'lucide-react';
import ContractorDetailModal from './ContractorDetailModal';
import { exportToExcel, exportToCSV } from '@/utils/exportReports';
import { getApiUrl } from '@/utils/api';
import { safeJsonParse, safeJsonStringify, handleApiResponse, getFromStorage, setToStorage } from '../../utils/jsonHelpers';

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
  
  // Enhanced display fields
  progress_percentage: number;
  stage_display: string;
  focus_areas_display: string;
  tags_display: string;
  is_verified: boolean;
  is_active: boolean;
}

interface ContractorSummary {
  total_contractors: number;
  active_contractors: number;
  completed_flow: number;
  in_progress: number;
  pending_verification: number;
  verified_contractors: number;
}

interface ContractorListEnhancedProps {
  onContractorSelect?: (contractorId: number) => void;
  onContractorEdit?: (contractor: Contractor) => void;
}

const ContractorListEnhanced: React.FC<ContractorListEnhancedProps> = ({ onContractorSelect, onContractorEdit }) => {
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [summary, setSummary] = useState<ContractorSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'completed' | 'verification'>('active');
  const [selectedContractor, setSelectedContractor] = useState<Contractor | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);

  useEffect(() => {
    fetchEnhancedContractors();
  }, []);

  const fetchEnhancedContractors = async () => {
    try {
      setLoading(true);
      const response = await fetch(getApiUrl('api/contractors-enhanced/list'), {
        headers: {
          'Authorization': `Bearer ${getFromStorage('authToken')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch enhanced contractor list');
      }

      const data = await handleApiResponse(response);
      setContractors(data.contractors);
      setSummary(data.summary);
    } catch (error) {
      console.error('Error fetching enhanced contractors:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredContractors = contractors.filter(contractor => {
    const matchesSearch = contractor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         contractor.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         contractor.company_name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || 
                         (filterStatus === 'active' && contractor.is_active) ||
                         (filterStatus === 'completed' && contractor.current_stage === 'completed') ||
                         (filterStatus === 'verification' && contractor.verification_status === 'pending');

    return matchesSearch && matchesStatus;
  });

  const getProgressIcon = (stage: string) => {
    switch (stage) {
      case 'completed': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'verification': return <Clock className="w-4 h-4 text-yellow-600" />;
      case 'focus_selection':
      case 'profiling':
      case 'matching': return <TrendingUp className="w-4 h-4 text-blue-600" />;
      default: return <XCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'verified': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStageBadgeColor = (stage: string) => {
    switch (stage) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'matching': return 'bg-blue-100 text-blue-800';
      case 'profiling': return 'bg-purple-100 text-purple-800';
      case 'focus_selection': return 'bg-orange-100 text-orange-800';
      case 'verification': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleViewDetails = (contractor: Contractor) => {
    setSelectedContractor(contractor);
    setIsModalOpen(true);
    onContractorSelect?.(contractor.id);
  };

  const handleBulkExport = (format: 'excel' | 'csv') => {
    const exportData = filteredContractors.map(contractor => ({
      contractor,
      // Mock data for bulk export - in real implementation, this would come from API
      progressHistory: [
        { stage: contractor.current_stage, date: contractor.updated_at, progress: contractor.progress_percentage }
      ],
      focusAreas: contractor.focus_areas,
      insights: [
        { type: 'info', message: `Contractor profile for ${contractor.company_name}` }
      ]
    }));

    switch(format) {
      case 'excel':
        exportToExcel(exportData);
        break;
      case 'csv':
        exportToCSV(exportData);
        break;
    }
    setExportMenuOpen(false);
  };

  const formatFocusAreas = (areas: string[]) => {
    if (!areas || areas.length === 0) return 'None selected';
    return areas.slice(0, 2).join(', ') + (areas.length > 2 ? '...' : '');
  };

  const formatTags = (tags: string[]) => {
    if (!tags || tags.length === 0) return '';
    return tags.slice(0, 2).join(', ') + (tags.length > 2 ? '...' : '');
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-power100-red"></div>
            <span className="ml-2">Loading enhanced contractor data...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-power100-grey">Total Contractors</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-power100-black">{summary.total_contractors}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-power100-grey">Active Contractors</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-power100-green">{summary.active_contractors}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-power100-grey">Completed Flow</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-power100-black">{summary.completed_flow}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-power100-grey">Verified</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-power100-red">{summary.verified_contractors}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Search and Filter Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Enhanced Contractor Management</CardTitle>
          <CardDescription>Contractors with progress tracking and detailed analytics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <input
              type="text"
              placeholder="Search contractors..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-power100-red focus:border-transparent"
            />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as 'all' | 'active' | 'completed' | 'verification')}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-power100-red focus:border-transparent"
            >
              <option value="all">All Contractors</option>
              <option value="active">Active Only</option>
              <option value="completed">Completed Only</option>
              <option value="verification">Pending Verification</option>
            </select>
            
            {/* Bulk Export Button */}
            <div className="relative">
              <Button
                onClick={() => setExportMenuOpen(!exportMenuOpen)}
                className="bg-power100-red hover:bg-red-700 text-white"
              >
                <Download className="w-4 h-4 mr-2" />
                Export All
              </Button>
              
              {exportMenuOpen && (
                <div className="absolute top-full right-0 mt-2 bg-white border rounded-lg shadow-lg z-10 min-w-[150px]">
                  <div className="p-2">
                    <button
                      onClick={() => handleBulkExport('excel')}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 rounded"
                    >
                      <FileSpreadsheet className="w-4 h-4" />
                      Export as Excel
                    </button>
                    <button
                      onClick={() => handleBulkExport('csv')}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 rounded"
                    >
                      <FileSpreadsheet className="w-4 h-4" />
                      Export as CSV
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Contractor List */}
          <div className="space-y-4">
            {filteredContractors.map((contractor) => (
              <Card key={contractor.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    {/* Contractor Info */}
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold text-lg text-power100-black">
                          {contractor.name}
                        </h3>
                        <Badge className={`text-xs ${getStatusBadgeColor(contractor.verification_status)}`}>
                          {contractor.verification_status}
                        </Badge>
                      </div>
                      
                      <div className="text-sm text-power100-grey">
                        <p><strong>Email:</strong> {contractor.email}</p>
                        <p><strong>Company:</strong> {contractor.company_name}</p>
                        <p><strong>Focus Areas:</strong> {formatFocusAreas(contractor.focus_areas)}</p>
                        {contractor.tags.length > 0 && (
                          <p><strong>Tags:</strong> {formatTags(contractor.tags)}</p>
                        )}
                      </div>
                    </div>

                    {/* Progress */}
                    <div className="flex flex-col items-center gap-2">
                      <div className="text-center">
                        <div className="text-xs text-power100-grey mb-1">Progress</div>
                        <div className="flex items-center gap-2">
                          <Badge className={`px-3 py-1 ${getStageBadgeColor(contractor.current_stage)}`}>
                            {contractor.stage_display}
                          </Badge>
                          {getProgressIcon(contractor.current_stage)}
                        </div>
                      </div>
                      <div className="w-20 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-power100-green h-2 rounded-full" 
                          style={{ width: `${contractor.progress_percentage}%` }}
                        ></div>
                      </div>
                      <div className="text-xs text-power100-grey">{contractor.progress_percentage}%</div>
                    </div>

                    {/* Contact Info */}
                    <div className="flex flex-col items-center gap-1 text-center">
                      <div className="text-xs text-power100-grey">Contact Type</div>
                      <div className="font-semibold">{contractor.contact_type}</div>
                      <div className="text-xs text-power100-grey">
                        Source: {contractor.onboarding_source?.replace('_', ' ')}
                      </div>
                    </div>

                    {/* Revenue & Team */}
                    <div className="flex flex-col items-center gap-1 text-center">
                      <div className="text-xs text-power100-grey">Revenue</div>
                      <div className="font-semibold">{contractor.annual_revenue || 'N/A'}</div>
                      <div className="text-xs text-power100-grey">
                        Team: {contractor.team_size || 'N/A'}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleViewDetails(contractor)}
                        className="flex items-center gap-1"
                      >
                        <Eye className="w-4 h-4" />
                        Details
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onContractorEdit?.(contractor)}
                        className="flex items-center gap-1"
                      >
                        <Edit className="w-4 h-4" />
                        Edit
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredContractors.length === 0 && (
            <div className="text-center py-8 text-power100-grey">
              No contractors found matching your criteria.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Contractor Detail Modal */}
      <ContractorDetailModal
        contractor={selectedContractor}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
};

export default ContractorListEnhanced;