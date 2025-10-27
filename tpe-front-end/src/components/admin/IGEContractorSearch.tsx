'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Search,
  Filter,
  TrendingUp,
  TrendingDown,
  Target,
  MessageSquare,
  User,
  Calendar,
  Phone,
  Mail,
  Building,
  ChevronRight
} from 'lucide-react';

interface Contractor {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  company_name: string;
  revenue_tier: string;
  created_at: string;
  last_activity_at: string;
  trust_score: number;
  active_goals: number;
  completed_goals: number;
  total_actions: number;
  pending_actions: number;
  completed_actions: number;
  messages_sent: number;
  last_message_at: string | null;
}

interface SearchFilters {
  search: string;
  trust_min: number;
  trust_max: number;
  has_active_goals: string;
  has_action_items: string;
  action_status: string;
  sort_by: string;
  sort_order: string;
}

export default function IGEContractorSearch() {
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ total: 0, limit: 20, offset: 0, has_more: false });
  const [showFilters, setShowFilters] = useState(false);

  const [filters, setFilters] = useState<SearchFilters>({
    search: '',
    trust_min: 0,
    trust_max: 100,
    has_active_goals: 'all',
    has_action_items: 'all',
    action_status: 'all',
    sort_by: 'name',
    sort_order: 'ASC'
  });

  const searchContractors = async (offset = 0) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: pagination.limit.toString(),
        offset: offset.toString(),
        sort_by: filters.sort_by,
        sort_order: filters.sort_order
      });

      // Add search term
      if (filters.search.trim()) {
        params.append('search', filters.search.trim());
      }

      // Add trust score range
      if (filters.trust_min > 0) params.append('trust_min', filters.trust_min.toString());
      if (filters.trust_max < 100) params.append('trust_max', filters.trust_max.toString());

      // Add goal filters
      if (filters.has_active_goals !== 'all') {
        params.append('has_active_goals', filters.has_active_goals);
      }

      // Add action filters
      if (filters.has_action_items !== 'all') {
        params.append('has_action_items', filters.has_action_items);
      }

      if (filters.action_status !== 'all') {
        params.append('action_status', filters.action_status);
      }

      const response = await fetch(`/api/ige-monitor/contractors/search?${params}`);
      const data = await response.json();

      if (data.success) {
        setContractors(data.contractors);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error('Error searching contractors:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    searchContractors();
  }, []);

  const handleSearch = () => {
    setPagination(prev => ({ ...prev, offset: 0 }));
    searchContractors(0);
  };

  const handleNextPage = () => {
    const newOffset = pagination.offset + pagination.limit;
    setPagination(prev => ({ ...prev, offset: newOffset }));
    searchContractors(newOffset);
  };

  const handlePrevPage = () => {
    const newOffset = Math.max(0, pagination.offset - pagination.limit);
    setPagination(prev => ({ ...prev, offset: newOffset }));
    searchContractors(newOffset);
  };

  const getTrustScoreColor = (score: number) => {
    if (score >= 70) return 'bg-green-100 text-green-800';
    if (score >= 40) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="space-y-6">
      {/* Search Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Search className="h-5 w-5 mr-2 text-power100-red" />
            Contractor Search
          </CardTitle>
          <CardDescription>
            Search and filter contractors with IGE metrics
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search Bar */}
          <div className="flex gap-4">
            <div className="flex-1">
              <Input
                type="text"
                placeholder="Search by name or email..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="bg-white"
              />
            </div>
            <Button
              onClick={handleSearch}
              className="bg-power100-green hover:bg-green-600 text-white"
              disabled={loading}
            >
              <Search className="h-4 w-4 mr-2" />
              Search
            </Button>
            <Button
              onClick={() => setShowFilters(!showFilters)}
              variant="outline"
              className="bg-white"
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </Button>
          </div>

          {/* Advanced Filters */}
          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Trust Score Range
                </label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={filters.trust_min}
                    onChange={(e) => setFilters({ ...filters, trust_min: parseInt(e.target.value) || 0 })}
                    className="bg-white"
                  />
                  <span>to</span>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={filters.trust_max}
                    onChange={(e) => setFilters({ ...filters, trust_max: parseInt(e.target.value) || 100 })}
                    className="bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Active Goals
                </label>
                <Select value={filters.has_active_goals} onValueChange={(value) => setFilters({ ...filters, has_active_goals: value })}>
                  <SelectTrigger className="bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem value="all">All Contractors</SelectItem>
                    <SelectItem value="true">Has Active Goals</SelectItem>
                    <SelectItem value="false">No Active Goals</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Action Items
                </label>
                <Select value={filters.has_action_items} onValueChange={(value) => setFilters({ ...filters, has_action_items: value })}>
                  <SelectTrigger className="bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem value="all">All Contractors</SelectItem>
                    <SelectItem value="true">Has Action Items</SelectItem>
                    <SelectItem value="false">No Action Items</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Sort By
                </label>
                <Select value={filters.sort_by} onValueChange={(value) => setFilters({ ...filters, sort_by: value })}>
                  <SelectTrigger className="bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem value="name">Name</SelectItem>
                    <SelectItem value="trust_score">Trust Score</SelectItem>
                    <SelectItem value="active_goals">Active Goals</SelectItem>
                    <SelectItem value="total_actions">Action Items</SelectItem>
                    <SelectItem value="last_activity">Last Activity</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Sort Order
                </label>
                <Select value={filters.sort_order} onValueChange={(value) => setFilters({ ...filters, sort_order: value })}>
                  <SelectTrigger className="bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem value="ASC">Ascending</SelectItem>
                    <SelectItem value="DESC">Descending</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Results Count */}
          <div className="text-sm text-gray-600">
            Showing {contractors?.length || 0} of {pagination.total} contractors
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {loading ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-500">Loading contractors...</p>
          </CardContent>
        </Card>
      ) : !contractors || contractors.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Search className="h-12 w-12 mx-auto mb-3 text-gray-400" />
            <p className="text-gray-500">No contractors found</p>
            <p className="text-sm text-gray-400 mt-1">Try adjusting your search or filters</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4">
            {contractors.map((contractor) => (
              <Card key={contractor.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    {/* Left: Contractor Info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-full bg-power100-red flex items-center justify-center text-white font-semibold">
                          {contractor.first_name?.[0] || '?'}{contractor.last_name?.[0] || '?'}
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg">
                            {contractor.first_name} {contractor.last_name}
                          </h3>
                          {contractor.company_name && (
                            <p className="text-sm text-gray-600 flex items-center">
                              <Building className="h-3 w-3 mr-1" />
                              {contractor.company_name}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div className="flex items-center text-gray-600">
                          <Mail className="h-4 w-4 mr-2" />
                          {contractor.email}
                        </div>
                        {contractor.phone && (
                          <div className="flex items-center text-gray-600">
                            <Phone className="h-4 w-4 mr-2" />
                            {contractor.phone}
                          </div>
                        )}
                        <div className="flex items-center text-gray-600">
                          <Calendar className="h-4 w-4 mr-2" />
                          Joined {formatDate(contractor.created_at)}
                        </div>
                      </div>
                    </div>

                    {/* Right: IGE Metrics */}
                    <div className="flex items-start gap-6 ml-6">
                      {/* Trust Score */}
                      <div className="text-center">
                        <div className="text-xs text-gray-500 mb-1">Trust Score</div>
                        <Badge className={`${getTrustScoreColor(contractor.trust_score)} text-lg font-bold px-3 py-1`}>
                          {contractor.trust_score}
                        </Badge>
                      </div>

                      {/* Goals */}
                      <div className="text-center">
                        <div className="text-xs text-gray-500 mb-1">Goals</div>
                        <div className="flex items-center gap-1">
                          <Target className="h-4 w-4 text-blue-600" />
                          <span className="font-semibold">{contractor.active_goals}</span>
                          <span className="text-xs text-gray-400">active</span>
                        </div>
                        {contractor.completed_goals > 0 && (
                          <div className="text-xs text-green-600 mt-1">
                            +{contractor.completed_goals} completed
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="text-center">
                        <div className="text-xs text-gray-500 mb-1">Actions</div>
                        <div className="font-semibold">{contractor.total_actions}</div>
                        {contractor.pending_actions > 0 && (
                          <div className="text-xs text-orange-600 mt-1">
                            {contractor.pending_actions} pending
                          </div>
                        )}
                      </div>

                      {/* Messages */}
                      <div className="text-center">
                        <div className="text-xs text-gray-500 mb-1">Messages</div>
                        <div className="flex items-center gap-1">
                          <MessageSquare className="h-4 w-4 text-purple-600" />
                          <span className="font-semibold">{contractor.messages_sent}</span>
                        </div>
                      </div>

                      {/* View Details */}
                      <Button
                        variant="outline"
                        size="sm"
                        className="bg-white"
                        onClick={() => window.location.href = `/admindashboard/ige-monitor/contractor/${contractor.id}`}
                      >
                        View
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Pagination */}
          {pagination.total > pagination.limit && (
            <Card>
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    Showing {pagination.offset + 1} - {Math.min(pagination.offset + pagination.limit, pagination.total)} of {pagination.total}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={handlePrevPage}
                      disabled={pagination.offset === 0}
                      variant="outline"
                      className="bg-white"
                    >
                      Previous
                    </Button>
                    <Button
                      onClick={handleNextPage}
                      disabled={!pagination.has_more}
                      variant="outline"
                      className="bg-white"
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
