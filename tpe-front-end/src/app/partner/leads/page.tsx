'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { partnerApi } from '@/lib/api';
import { getFromStorage } from '@/utils/jsonHelpers';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Users, TrendingUp, Star, Clock, Search, Filter,
  Mail, Phone, Building2, Calendar, MessageSquare,
  ChevronRight, AlertCircle
} from 'lucide-react';

// Lead stages with display names
const LEAD_STAGES = [
  { value: 'new', label: 'New', color: 'bg-blue-100 text-blue-800' },
  { value: 'contacted', label: 'Contacted', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'meeting_scheduled', label: 'Meeting Scheduled', color: 'bg-purple-100 text-purple-800' },
  { value: 'proposal_sent', label: 'Proposal Sent', color: 'bg-orange-100 text-orange-800' },
  { value: 'negotiating', label: 'Negotiating', color: 'bg-pink-100 text-pink-800' },
  { value: 'won', label: 'Won', color: 'bg-green-100 text-green-800' },
  { value: 'lost', label: 'Lost', color: 'bg-red-100 text-red-800' },
  { value: 'nurturing', label: 'Nurturing', color: 'bg-gray-100 text-gray-800' },
];

export default function PartnerLeadsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [leads, setLeads] = useState<any[]>([]);
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [filters, setFilters] = useState({
    search: '',
    engagement_stage: '',
    primary_only: false
  });

  useEffect(() => {
    checkAuthAndFetchData();
  }, [filters]);

  const checkAuthAndFetchData = async () => {
    const token = getFromStorage('partnerToken');
    if (!token) {
      router.push('/partner/login');
      return;
    }

    await Promise.all([
      fetchStats(),
      fetchLeads()
    ]);
  };

  const fetchStats = async () => {
    try {
      const response = await partnerApi.getLeadStats();
      if (response.success) {
        setStats(response.stats);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchLeads = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (filters.search) params.search = filters.search;
      if (filters.engagement_stage) params.engagement_stage = filters.engagement_stage;
      if (filters.primary_only) params.primary_only = true;

      const response = await partnerApi.getLeads(params);
      if (response.success) {
        setLeads(response.leads || []);
      }
    } catch (error) {
      console.error('Error fetching leads:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStageInfo = (stage: string) => {
    return LEAD_STAGES.find(s => s.value === stage) || LEAD_STAGES[0];
  };

  const handleViewDetails = async (lead: any) => {
    try {
      const response = await partnerApi.getLeadDetails(lead.id);
      if (response.success) {
        setSelectedLead(response.lead);
        setShowDetailsModal(true);
      }
    } catch (error) {
      console.error('Error fetching lead details:', error);
    }
  };

  const handleUpdateStage = async (leadId: number, newStage: string) => {
    try {
      await partnerApi.updateLeadStatus(leadId, { engagement_stage: newStage });
      await fetchLeads();
      await fetchStats();
    } catch (error) {
      console.error('Error updating stage:', error);
    }
  };

  if (loading && leads.length === 0) {
    return (
      <div className="min-h-screen bg-power100-bg-grey flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-power100-red mx-auto mb-4"></div>
          <p className="text-gray-600">Loading leads...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-power100-bg-grey p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-power100-black mb-2">Lead Pipeline</h1>
          <p className="text-gray-600">Manage and track your contractor leads</p>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Leads</p>
                    <p className="text-2xl font-bold text-power100-black">
                      {stats.overview.total_leads}
                    </p>
                  </div>
                  <Users className="h-8 w-8 text-power100-red" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Active Leads</p>
                    <p className="text-2xl font-bold text-power100-green">
                      {stats.overview.active_leads}
                    </p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-power100-green" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Avg Match Score</p>
                    <p className="text-2xl font-bold text-power100-black">
                      {stats.overview.avg_match_score}%
                    </p>
                  </div>
                  <Star className="h-8 w-8 text-yellow-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Overdue</p>
                    <p className="text-2xl font-bold text-orange-600">
                      {stats.overdue_follow_ups}
                    </p>
                  </div>
                  <Clock className="h-8 w-8 text-orange-600" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search */}
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by name, company, email..."
                    value={filters.search}
                    onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-power100-red focus:border-transparent bg-white"
                  />
                </div>
              </div>

              {/* Stage Filter */}
              <select
                value={filters.engagement_stage}
                onChange={(e) => setFilters({ ...filters, engagement_stage: e.target.value })}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-power100-red focus:border-transparent bg-white"
              >
                <option value="">All Stages</option>
                {LEAD_STAGES.map(stage => (
                  <option key={stage.value} value={stage.value}>{stage.label}</option>
                ))}
              </select>

              {/* Primary Only */}
              <label className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg bg-white cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.primary_only}
                  onChange={(e) => setFilters({ ...filters, primary_only: e.target.checked })}
                  className="rounded border-gray-300 text-power100-red focus:ring-power100-red"
                />
                <span className="text-sm text-gray-700">Primary Matches Only</span>
              </label>
            </div>
          </CardContent>
        </Card>

        {/* Leads List */}
        {leads.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-2">No leads found</p>
              <p className="text-sm text-gray-500">Try adjusting your filters</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {leads.map(lead => {
              const stageInfo = getStageInfo(lead.engagement_stage);
              return (
                <Card key={lead.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      {/* Lead Info */}
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <h3 className="text-lg font-semibold text-power100-black">
                            {lead.company_name || 'Unknown Company'}
                          </h3>
                          {lead.is_primary_match && (
                            <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded">
                              <Star className="inline h-3 w-3 mr-1" />
                              Primary Match
                            </span>
                          )}
                          <span className={`px-3 py-1 text-xs font-medium rounded ${stageInfo.color}`}>
                            {stageInfo.label}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                          {lead.email && (
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Mail className="h-4 w-4" />
                              {lead.email}
                            </div>
                          )}
                          {lead.phone && (
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Phone className="h-4 w-4" />
                              {lead.phone}
                            </div>
                          )}
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <TrendingUp className="h-4 w-4" />
                            Match Score: {lead.match_score}%
                          </div>
                        </div>

                        {/* Match Reasons */}
                        {lead.match_reasons && lead.match_reasons.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-3">
                            {lead.match_reasons.slice(0, 3).map((reason: string, idx: number) => (
                              <span key={idx} className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded">
                                {reason}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Dates */}
                        <div className="flex gap-4 text-xs text-gray-500">
                          {lead.last_contact_date && (
                            <span>Last contact: {new Date(lead.last_contact_date).toLocaleDateString()}</span>
                          )}
                          {lead.next_follow_up_date && (
                            <span className="text-orange-600 font-medium">
                              Follow-up: {new Date(lead.next_follow_up_date).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-col gap-2 ml-4">
                        <Button
                          onClick={() => handleViewDetails(lead)}
                          className="bg-power100-red hover:bg-red-700 text-white"
                          size="sm"
                        >
                          View Details
                          <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Simple Details Modal */}
        {showDetailsModal && selectedLead && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold text-power100-black">
                    {selectedLead.company_name || 'Lead Details'}
                  </h2>
                  <button
                    onClick={() => setShowDetailsModal(false)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-4">
                  {/* Contact Info */}
                  <div>
                    <h3 className="font-semibold text-gray-700 mb-2">Contact Information</h3>
                    <div className="space-y-2 text-sm">
                      {selectedLead.email && <p><strong>Email:</strong> {selectedLead.email}</p>}
                      {selectedLead.phone && <p><strong>Phone:</strong> {selectedLead.phone}</p>}
                      {selectedLead.team_size && <p><strong>Team Size:</strong> {selectedLead.team_size}</p>}
                      {selectedLead.revenue_tier && <p><strong>Revenue Tier:</strong> {selectedLead.revenue_tier}</p>}
                    </div>
                  </div>

                  {/* Match Info */}
                  <div>
                    <h3 className="font-semibold text-gray-700 mb-2">Match Information</h3>
                    <p className="text-sm mb-2"><strong>Score:</strong> {selectedLead.match_score}%</p>
                    {selectedLead.match_reasons && selectedLead.match_reasons.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {selectedLead.match_reasons.map((reason: string, idx: number) => (
                          <span key={idx} className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded">
                            {reason}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Focus Areas */}
                  {selectedLead.focus_areas && selectedLead.focus_areas.length > 0 && (
                    <div>
                      <h3 className="font-semibold text-gray-700 mb-2">Focus Areas</h3>
                      <div className="flex flex-wrap gap-2">
                        {selectedLead.focus_areas.map((area: string, idx: number) => (
                          <span key={idx} className="px-2 py-1 bg-green-50 text-green-700 text-xs rounded">
                            {area.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Notes */}
                  {selectedLead.notes && selectedLead.notes.length > 0 && (
                    <div>
                      <h3 className="font-semibold text-gray-700 mb-2">Activity Notes</h3>
                      <div className="space-y-2">
                        {selectedLead.notes.map((note: any, idx: number) => (
                          <div key={idx} className="p-3 bg-gray-50 rounded">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-medium text-gray-600">{note.type}</span>
                              <span className="text-xs text-gray-500">
                                {new Date(note.created_at).toLocaleString()}
                              </span>
                            </div>
                            <p className="text-sm text-gray-700">{note.content}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-3 mt-6">
                  <Button
                    onClick={() => setShowDetailsModal(false)}
                    variant="outline"
                    className="flex-1"
                  >
                    Close
                  </Button>
                  <Button
                    onClick={() => {
                      setShowDetailsModal(false);
                      // Future: Open add note modal
                    }}
                    className="flex-1 bg-power100-green hover:bg-green-600 text-white"
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Add Note
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
