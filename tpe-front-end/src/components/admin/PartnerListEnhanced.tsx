'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Eye, Edit, MessageCircle, TrendingUp, TrendingDown, Minus, Download, FileText, FileSpreadsheet } from 'lucide-react';
import PartnerDetailsEditor from './PartnerDetailsEditor';
import { exportToExcel, exportToCSV, exportToPDF } from '@/utils/exportReports';
import { getApiUrl } from '@/utils/api';
import { safeJsonParse, safeJsonStringify, handleApiResponse, getFromStorage, setToStorage } from '../../utils/jsonHelpers';

interface Partner {
  id: number;
  company_name: string;
  website?: string;
  contact_email: string;
  contact_phone?: string;
  service_categories: string;
  target_revenue_range: string;
  geographic_regions: string;
  is_active: boolean;
  current_powerconfidence_score: number;
  score_trend: 'up' | 'down' | 'stable';
  last_score_update?: string;
  total_contractor_engagements: number;
  avg_contractor_satisfaction: number;
  recent_feedback_count: number;
  highest_priority_insight: number;
  trend_icon: string;
  created_at: string;
  updated_at: string;
}

interface PartnerSummary {
  total_partners: number;
  active_partners: number;
  avg_powerconfidence: number;
  high_performers: number;
}

interface PartnerListEnhancedProps {
  onPartnerSelect?: (partnerId: number) => void;
  onPartnerEdit?: (partner: Partner) => void;
}

const PartnerListEnhanced: React.FC<PartnerListEnhancedProps> = ({ onPartnerSelect, onPartnerEdit }) => {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [summary, setSummary] = useState<PartnerSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('active');
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);

  useEffect(() => {
    fetchEnhancedPartners();
  }, []);

  const fetchEnhancedPartners = async () => {
    try {
      setLoading(true);
      const response = await fetch(getApiUrl('api/partners-enhanced/list'), {
        headers: {
          'Authorization': `Bearer ${getFromStorage('authToken')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch enhanced partner list');
      }

      const data = await handleApiResponse(response);
      setPartners(data.partners);
      setSummary(data.summary);
    } catch (error) {
      console.error('Error fetching enhanced partners:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredPartners = partners.filter(partner => {
    const matchesSearch = partner.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         partner.contact_email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || 
                         (filterStatus === 'active' && partner.is_active) ||
                         (filterStatus === 'inactive' && !partner.is_active);

    return matchesSearch && matchesStatus;
  });

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <TrendingUp className="w-4 h-4 text-power100-green" />;
      case 'down': return <TrendingDown className="w-4 h-4 text-power100-red" />;
      default: return <Minus className="w-4 h-4 text-power100-grey" />;
    }
  };

  const getScoreBadgeColor = (score: number) => {
    if (score >= 90) return 'bg-green-100 text-green-800';
    if (score >= 80) return 'bg-blue-100 text-blue-800';
    if (score >= 70) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const getPriorityBadgeColor = (priority: number) => {
    if (priority >= 3) return 'bg-power100-red text-white';
    if (priority >= 2) return 'bg-yellow-500 text-white';
    return 'bg-green-500 text-white';
  };

  const handleViewDetails = (partner: Partner) => {
    setSelectedPartner(partner);
    setIsModalOpen(true);
    onPartnerSelect?.(partner.id);
  };

  const handleBulkExport = (format: 'excel' | 'csv') => {
    const exportData = filteredPartners.map(partner => ({
      partner,
      // Mock data for bulk export - in real implementation, this would come from API
      scoreHistory: [
        { quarter: 'Q4 2024', score: partner.current_powerconfidence_score, feedback_count: partner.recent_feedback_count }
      ],
      categoryBreakdown: [
        { category: 'Communication', score: Math.floor(Math.random() * 20) + 80, weight: 30 },
        { category: 'Service Quality', score: Math.floor(Math.random() * 20) + 75, weight: 25 }
      ],
      insights: [
        { type: 'info', message: `Performance summary for ${partner.company_name}` }
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

  const formatServiceCategories = (categories: string) => {
    try {
      const parsed = safeJsonParse(categories);
      return Array.isArray(parsed) ? parsed.slice(0, 2).join(', ') + (parsed.length > 2 ? '...' : '') : categories;
    } catch {
      return categories?.substring(0, 30) + (categories?.length > 30 ? '...' : '') || 'N/A';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-power100-red"></div>
            <span className="ml-2">Loading enhanced partner data...</span>
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
              <CardTitle className="text-sm font-medium text-power100-grey">Total Partners</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-power100-black">{summary.total_partners}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-power100-grey">Active Partners</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-power100-green">{summary.active_partners}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-power100-grey">Avg PowerConfidence</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-power100-black">{summary.avg_powerconfidence}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-power100-grey">High Performers (85+)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-power100-red">{summary.high_performers}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Search and Filter Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Enhanced Partner Management</CardTitle>
          <CardDescription>Partners with PowerConfidence scores and performance analytics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <input
              type="text"
              placeholder="Search partners..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-power100-red focus:border-transparent"
            />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as 'all' | 'active' | 'inactive')}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-power100-red focus:border-transparent"
            >
              <option value="all">All Partners</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
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

          {/* Partner List */}
          <div className="space-y-4">
            {filteredPartners.map((partner) => (
              <Card key={partner.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    {/* Partner Info */}
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold text-lg text-power100-black">
                          {partner.company_name}
                        </h3>
                        {!partner.is_active && (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                      </div>
                      
                      <div className="text-sm text-power100-grey">
                        <p><strong>Contact:</strong> {partner.contact_email}</p>
                        <p><strong>Services:</strong> {formatServiceCategories(partner.service_categories)}</p>
                        <p><strong>Target Revenue:</strong> {partner.target_revenue_range}</p>
                      </div>
                    </div>

                    {/* PowerConfidence Score */}
                    <div className="flex flex-col items-center gap-2">
                      <div className="text-center">
                        <div className="text-xs text-power100-grey mb-1">PowerConfidence</div>
                        <div className="flex items-center gap-2">
                          <Badge className={`px-3 py-1 ${getScoreBadgeColor(partner.current_powerconfidence_score)}`}>
                            {partner.current_powerconfidence_score}
                          </Badge>
                          {getTrendIcon(partner.score_trend)}
                        </div>
                      </div>
                    </div>

                    {/* Metrics */}
                    <div className="flex flex-col items-center gap-1 text-center">
                      <div className="text-xs text-power100-grey">Engagements</div>
                      <div className="font-semibold">{partner.total_contractor_engagements}</div>
                      <div className="text-xs text-power100-grey">
                        Satisfaction: {partner.avg_contractor_satisfaction.toFixed(1)}
                      </div>
                    </div>

                    {/* Recent Activity */}
                    <div className="flex flex-col items-center gap-1 text-center">
                      <div className="text-xs text-power100-grey">Recent Feedback</div>
                      <div className="font-semibold">{partner.recent_feedback_count}</div>
                      <Badge 
                        className={`text-xs px-2 ${getPriorityBadgeColor(partner.highest_priority_insight)}`}
                      >
                        Priority {partner.highest_priority_insight}
                      </Badge>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleViewDetails(partner)}
                        className="flex items-center gap-1"
                      >
                        <Eye className="w-4 h-4" />
                        Details
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onPartnerEdit?.(partner)}
                        className="flex items-center gap-1"
                      >
                        <Edit className="w-4 h-4" />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex items-center gap-1"
                      >
                        <MessageCircle className="w-4 h-4" />
                        Message
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredPartners.length === 0 && (
            <div className="text-center py-8 text-power100-grey">
              No partners found matching your criteria.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Partner Details Editor */}
      {selectedPartner && isModalOpen && (
        <PartnerDetailsEditor
          partnerId={selectedPartner.id.toString()}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedPartner(null);
          }}
          onSave={() => {
            setIsModalOpen(false);
            setSelectedPartner(null);
            // Trigger refresh of partner list
            fetchEnhancedPartners();
          }}
        />
      )}
    </div>
  );
};

export default PartnerListEnhanced;