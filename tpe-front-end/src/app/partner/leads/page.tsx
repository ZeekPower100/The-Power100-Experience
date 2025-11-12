'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { partnerApi } from '@/lib/api';
import { getFromStorage } from '@/utils/jsonHelpers';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import AddNoteModal from '@/components/partner/AddNoteModal';
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
  const [showAddNoteModal, setShowAddNoteModal] = useState(false);
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

  const handleNoteSuccess = async () => {
    setShowAddNoteModal(false);
    // Refresh the selected lead details to show the new note
    if (selectedLead) {
      const response = await partnerApi.getLeadDetails(selectedLead.id);
      if (response.success) {
        setSelectedLead(response.lead);
      }
    }
    // Refresh the leads list and stats
    await fetchLeads();
    await fetchStats();
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
    <div className="min-h-screen bg-gray-50 py-8 px-6">
      <div className="max-w-7xl mx-auto">
        {/* Header - Modern Design */}
        <div className="text-center mb-12">
          <div className="inline-block bg-red-100 text-red-600 px-4 py-2 rounded-full text-sm font-semibold mb-4">
            Lead Management
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">Lead Pipeline</h1>
          <p className="text-xl text-gray-600">Manage and track your contractor leads</p>
        </div>

        {/* Stats Cards - Modern Gradient Design */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
            <div className="group relative bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-cyan-600 opacity-0 group-hover:opacity-5 rounded-2xl transition-opacity duration-300"></div>
              <div className="relative">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl mb-4">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <div className="text-5xl font-bold bg-gradient-to-r from-blue-500 to-cyan-600 bg-clip-text text-transparent mb-2">
                  {stats.overview.total_leads}
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Total Leads</h3>
              </div>
            </div>

            <div className="group relative bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2">
              <div className="absolute inset-0 bg-gradient-to-br from-green-500 to-emerald-600 opacity-0 group-hover:opacity-5 rounded-2xl transition-opacity duration-300"></div>
              <div className="relative">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl mb-4">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                <div className="text-5xl font-bold bg-gradient-to-r from-green-500 to-emerald-600 bg-clip-text text-transparent mb-2">
                  {stats.overview.active_leads}
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Active Leads</h3>
              </div>
            </div>

            <div className="group relative bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2">
              <div className="absolute inset-0 bg-gradient-to-br from-yellow-500 to-orange-600 opacity-0 group-hover:opacity-5 rounded-2xl transition-opacity duration-300"></div>
              <div className="relative">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-xl mb-4">
                  <Star className="w-6 h-6 text-white" />
                </div>
                <div className="text-5xl font-bold bg-gradient-to-r from-yellow-500 to-orange-600 bg-clip-text text-transparent mb-2">
                  {stats.overview.avg_match_score}%
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Avg Match Score</h3>
              </div>
            </div>

            <div className="group relative bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2">
              <div className="absolute inset-0 bg-gradient-to-br from-orange-500 to-red-600 opacity-0 group-hover:opacity-5 rounded-2xl transition-opacity duration-300"></div>
              <div className="relative">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl mb-4">
                  <Clock className="w-6 h-6 text-white" />
                </div>
                <div className="text-5xl font-bold bg-gradient-to-r from-orange-500 to-red-600 bg-clip-text text-transparent mb-2">
                  {stats.overdue_follow_ups}
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Overdue</h3>
              </div>
            </div>
          </div>
        )}

        {/* Filters - Modern Design */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-12">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by name, company, email..."
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-white text-base transition-all duration-300"
                />
              </div>
            </div>

            {/* Stage Filter */}
            <select
              value={filters.engagement_stage}
              onChange={(e) => setFilters({ ...filters, engagement_stage: e.target.value })}
              className="px-6 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-white text-base font-medium transition-all duration-300"
            >
              <option value="">All Stages</option>
              {LEAD_STAGES.map(stage => (
                <option key={stage.value} value={stage.value}>{stage.label}</option>
              ))}
            </select>

            {/* Primary Only */}
            <label className="flex items-center gap-3 px-6 py-3 border-2 border-gray-200 rounded-xl bg-white cursor-pointer hover:border-red-300 transition-all duration-300">
              <input
                type="checkbox"
                checked={filters.primary_only}
                onChange={(e) => setFilters({ ...filters, primary_only: e.target.checked })}
                className="rounded w-5 h-5 border-gray-300 text-red-600 focus:ring-red-500"
              />
              <span className="text-base font-medium text-gray-700">Primary Matches Only</span>
            </label>
          </div>
        </div>

        {/* Leads List - Modern Design */}
        {leads.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <AlertCircle className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-xl font-semibold text-gray-700 mb-2">No leads found</p>
            <p className="text-base text-gray-500">Try adjusting your filters</p>
          </div>
        ) : (
          <div className="space-y-6">
            {leads.map(lead => {
              const stageInfo = getStageInfo(lead.engagement_stage);
              return (
                <div
                  key={lead.id}
                  className="group bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100"
                >
                  <div className="flex items-start justify-between">
                    {/* Lead Info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-4 mb-4">
                        <h3 className="text-2xl font-bold text-gray-900">
                          {lead.company_name || 'Unknown Company'}
                        </h3>
                        {lead.is_primary_match && (
                          <span className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-yellow-100 to-orange-100 text-yellow-800 text-sm font-semibold rounded-full border-2 border-yellow-200">
                            <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                            Primary Match
                          </span>
                        )}
                        <span className={`px-4 py-2 text-sm font-semibold rounded-full ${stageInfo.color}`}>
                          {stageInfo.label}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                        {lead.email && (
                          <div className="flex items-center gap-3 text-base text-gray-700">
                            <div className="inline-flex items-center justify-center w-10 h-10 bg-blue-100 rounded-lg flex-shrink-0">
                              <Mail className="h-5 w-5 text-blue-600" />
                            </div>
                            <span className="truncate">{lead.email}</span>
                          </div>
                        )}
                        {lead.phone && (
                          <div className="flex items-center gap-3 text-base text-gray-700">
                            <div className="inline-flex items-center justify-center w-10 h-10 bg-green-100 rounded-lg flex-shrink-0">
                              <Phone className="h-5 w-5 text-green-600" />
                            </div>
                            <span>{lead.phone}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-3 text-base text-gray-700">
                          <div className="inline-flex items-center justify-center w-10 h-10 bg-purple-100 rounded-lg flex-shrink-0">
                            <TrendingUp className="h-5 w-5 text-purple-600" />
                          </div>
                          <span className="font-semibold">Match Score: {lead.match_score}%</span>
                        </div>
                      </div>

                      {/* Match Reasons */}
                      {lead.match_reasons && lead.match_reasons.length > 0 && (
                        <div className="flex flex-wrap gap-3 mb-4">
                          {lead.match_reasons.slice(0, 3).map((reason: string, idx: number) => (
                            <span key={idx} className="px-4 py-2 bg-blue-50 text-blue-700 text-sm font-medium rounded-full border border-blue-200">
                              {reason}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Dates */}
                      <div className="flex gap-6 text-sm text-gray-600">
                        {lead.last_contact_date && (
                          <span className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            Last contact: {new Date(lead.last_contact_date).toLocaleDateString()}
                          </span>
                        )}
                        {lead.next_follow_up_date && (
                          <span className="flex items-center gap-2 text-orange-600 font-semibold">
                            <Calendar className="h-4 w-4" />
                            Follow-up: {new Date(lead.next_follow_up_date).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-3 ml-6">
                      <Button
                        onClick={() => handleViewDetails(lead)}
                        className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
                      >
                        View Details
                        <ChevronRight className="h-5 w-5 ml-2" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Details Modal - Modern Design */}
        {showDetailsModal && selectedLead && (
          <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
              <div className="p-8">
                {/* Modal Header */}
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <div className="inline-block bg-red-100 text-red-600 px-3 py-1 rounded-full text-xs font-semibold mb-3">
                      Lead Details
                    </div>
                    <h2 className="text-3xl font-bold text-gray-900">
                      {selectedLead.company_name || 'Lead Details'}
                    </h2>
                  </div>
                  <button
                    onClick={() => setShowDetailsModal(false)}
                    className="w-10 h-10 flex items-center justify-center rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-900 transition-all duration-300"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-6">
                  {/* Contact Info */}
                  <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl p-6 border-2 border-blue-100">
                    <h3 className="text-xl font-bold text-blue-900 mb-4 flex items-center gap-2">
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-lg flex items-center justify-center">
                        <Building2 className="w-4 h-4 text-white" />
                      </div>
                      Contact Information
                    </h3>
                    <div className="space-y-3">
                      {selectedLead.email && (
                        <p className="text-base text-blue-800">
                          <strong className="font-semibold">Email:</strong> {selectedLead.email}
                        </p>
                      )}
                      {selectedLead.phone && (
                        <p className="text-base text-blue-800">
                          <strong className="font-semibold">Phone:</strong> {selectedLead.phone}
                        </p>
                      )}
                      {selectedLead.team_size && (
                        <p className="text-base text-blue-800">
                          <strong className="font-semibold">Team Size:</strong> {selectedLead.team_size}
                        </p>
                      )}
                      {selectedLead.revenue_tier && (
                        <p className="text-base text-blue-800">
                          <strong className="font-semibold">Revenue Tier:</strong> {selectedLead.revenue_tier}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Match Info */}
                  <div className="bg-gradient-to-br from-purple-50 to-violet-50 rounded-2xl p-6 border-2 border-purple-100">
                    <h3 className="text-xl font-bold text-purple-900 mb-4 flex items-center gap-2">
                      <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-violet-600 rounded-lg flex items-center justify-center">
                        <Star className="w-4 h-4 text-white" />
                      </div>
                      Match Information
                    </h3>
                    <p className="text-base text-purple-800 mb-4">
                      <strong className="font-semibold">Score:</strong> {selectedLead.match_score}%
                    </p>
                    {selectedLead.match_reasons && selectedLead.match_reasons.length > 0 && (
                      <div className="flex flex-wrap gap-3">
                        {selectedLead.match_reasons.map((reason: string, idx: number) => (
                          <span key={idx} className="px-4 py-2 bg-purple-100 text-purple-700 text-sm font-medium rounded-full border border-purple-200">
                            {reason}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Focus Areas */}
                  {selectedLead.focus_areas && selectedLead.focus_areas.length > 0 && (
                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6 border-2 border-green-100">
                      <h3 className="text-xl font-bold text-green-900 mb-4 flex items-center gap-2">
                        <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
                          <Target className="w-4 h-4 text-white" />
                        </div>
                        Focus Areas
                      </h3>
                      <div className="flex flex-wrap gap-3">
                        {selectedLead.focus_areas.map((area: string, idx: number) => (
                          <span key={idx} className="px-4 py-2 bg-green-100 text-green-700 text-sm font-medium rounded-full border border-green-200">
                            {area.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Notes */}
                  {selectedLead.notes && selectedLead.notes.length > 0 && (
                    <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-2xl p-6 border-2 border-yellow-100">
                      <h3 className="text-xl font-bold text-yellow-900 mb-4 flex items-center gap-2">
                        <div className="w-8 h-8 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-lg flex items-center justify-center">
                          <MessageSquare className="w-4 h-4 text-white" />
                        </div>
                        Activity Notes
                      </h3>
                      <div className="space-y-3">
                        {selectedLead.notes.map((note: any, idx: number) => (
                          <div key={idx} className="p-4 bg-white rounded-xl border border-yellow-200">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-semibold text-yellow-700">{note.type}</span>
                              <span className="text-sm text-gray-500">
                                {new Date(note.created_at).toLocaleString()}
                              </span>
                            </div>
                            <p className="text-base text-gray-700">{note.content}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Modal Actions */}
                <div className="flex gap-4 mt-8">
                  <Button
                    onClick={() => setShowDetailsModal(false)}
                    variant="outline"
                    className="flex-1 py-3 rounded-xl border-2 border-gray-300 hover:border-gray-400 text-base font-semibold"
                  >
                    Close
                  </Button>
                  <Button
                    onClick={() => {
                      setShowAddNoteModal(true);
                    }}
                    className="flex-1 bg-gradient-to-r from-green-600 to-emerald-700 hover:from-green-700 hover:to-emerald-800 text-white py-3 rounded-xl text-base font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
                  >
                    <MessageSquare className="h-5 w-5 mr-2" />
                    Add Note
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Add Note Modal */}
        {showAddNoteModal && selectedLead && (
          <AddNoteModal
            leadId={selectedLead.id}
            leadName={selectedLead.company_name || 'Lead'}
            onClose={() => setShowAddNoteModal(false)}
            onSuccess={handleNoteSuccess}
          />
        )}
      </div>
    </div>
  );
}
