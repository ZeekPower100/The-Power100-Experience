'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  Filter, 
  X, 
  ChevronDown, 
  ChevronUp,
  Users,
  Building2,
  Calendar,
  TrendingUp,
  Star
} from 'lucide-react';
import { contractorApi, partnerApi } from '@/lib/api';

interface SearchFilters {
  query: string;
  stage?: string;
  focusAreas: string[];
  revenueRange: string[];
  verificationStatus?: string;
  teamSizeMin?: number;
  teamSizeMax?: number;
  readinessIndicators: string[];
  contact_type?: string;
  onboarding_source?: string;
  tags: string[];
  isActive?: boolean;
  confidenceScoreMin?: number;
  confidenceScoreMax?: number;
  dateFrom?: string;
  dateTo?: string;
  sortBy: string;
  sortOrder: 'ASC' | 'DESC';
}

interface SearchResult {
  contractors?: any[];
  partners?: any[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
    totalPages: number;
    currentPage: number;
  };
}

interface AdvancedSearchProps {
  searchType: 'contractors' | 'partners';
  onResults: (results: SearchResult) => void;
  onError: (error: string) => void;
}

const FOCUS_AREAS = [
  'Revenue Growth', 'Lead Generation', 'Digital Marketing', 'Operations',
  'Technology', 'Team Building', 'Financial Management', 'Strategic Planning',
  'Customer Service', 'Sales Process', 'Brand Development', 'Market Expansion'
];

// Partner focus areas use different internal values
const PARTNER_FOCUS_AREAS = [
  'controlling_lead_flow', 'hiring_sales_leadership', 'installation_quality', 
  'digital_marketing', 'operational_efficiency', 'recession_proofing',
  'greenfield_growth', 'customer_retention', 'sales_training', 
  'business_development', 'closing_higher_percentage'
];

const REVENUE_RANGES = [
  'Under $100K', '$100K-$500K', '$500K-$1M', '$1M-$5M', '$5M-$10M', 'Over $10M'
];

// Mapping display names to database values
const REVENUE_MAPPING = {
  'Under $100K': 'under_100k',
  '$100K-$500K': '100k_500k', 
  '$500K-$1M': '500k_1m',
  '$1M-$5M': '1m_5m',
  '$5M-$10M': '5m_10m',
  'Over $10M': 'over_10m'
};

const CONTRACTOR_STAGES = [
  'verification', 'focus_selection', 'profiling', 'matching', 'completed'
];

const READINESS_INDICATORS = [
  'increased_tools', 'increased_people', 'increased_activity'
];

const CONTACT_TYPES = [
  'contractor', 'employee', 'admin'
];

const ONBOARDING_SOURCES = [
  'contractor_flow', 'partner_portal', 'admin_import'
];

const COMMON_TAGS = [
  'contractor', 'customer', 'employee', 'new_signup', 'returning_signup', 'verified_employee', 'external_contact', 'imported'
];

const GEOGRAPHIC_REGIONS = [
  'North America', 'South America', 'Europe', 'Asia', 'Africa', 'Australia'
];

export default function AdvancedSearch({ searchType, onResults, onError }: AdvancedSearchProps) {
  const [filters, setFilters] = useState<SearchFilters>({
    query: '',
    focusAreas: [],
    revenueRange: [],
    readinessIndicators: [],
    tags: [],
    sortBy: 'created_at',
    sortOrder: 'DESC'
  });

  const [isExpanded, setIsExpanded] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [limit] = useState(20);

  const handleFilterChange = (key: keyof SearchFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
    setCurrentPage(1); // Reset to first page when filters change
  };

  const handleArrayFilterToggle = (key: keyof SearchFilters, value: string) => {
    setFilters(prev => {
      const currentArray = prev[key] as string[];
      const newArray = currentArray.includes(value)
        ? currentArray.filter(item => item !== value)
        : [...currentArray, value];
      
      return {
        ...prev,
        [key]: newArray
      };
    });
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setFilters({
      query: '',
      focusAreas: [],
      revenueRange: [],
      readinessIndicators: [],
      tags: [],
      sortBy: 'created_at',
      sortOrder: 'DESC'
    });
    setCurrentPage(1);
  };

  const performSearch = async (page: number = 1) => {
    setIsSearching(true);
    try {
      const searchParams = {
        ...filters,
        limit,
        offset: (page - 1) * limit
      };

      // Transform revenue ranges to database values
      if (searchParams.revenueRange && searchParams.revenueRange.length > 0) {
        searchParams.revenueRange = searchParams.revenueRange.map(
          (displayValue: string) => REVENUE_MAPPING[displayValue as keyof typeof REVENUE_MAPPING] || displayValue
        );
      }

      // For partners, fix parameter names to match API
      if (searchType === 'partners') {
        // Partner API expects 'revenueRanges' (plural), not 'revenueRange'
        if (searchParams.revenueRange && searchParams.revenueRange.length > 0) {
          (searchParams as any).revenueRanges = searchParams.revenueRange;
          delete searchParams.revenueRange;
        }
      }

      // Remove empty values
      Object.keys(searchParams).forEach(key => {
        const value = searchParams[key as keyof typeof searchParams];
        if (value === '' || value === undefined || value === null || 
            (Array.isArray(value) && value.length === 0)) {
          delete searchParams[key as keyof typeof searchParams];
        }
      });

      let results: SearchResult;
      if (searchType === 'contractors') {
        results = await contractorApi.search(searchParams) as SearchResult;
      } else {
        results = await partnerApi.search(searchParams) as SearchResult;
      }

      onResults(results);
    } catch (error) {
      console.error('Search error:', error);
      onError(error instanceof Error ? error.message : 'Search failed');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearch = () => {
    setCurrentPage(1);
    performSearch(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    performSearch(page);
  };

  // Auto-search when query changes (debounced)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (filters.query.length >= 2 || filters.query.length === 0) {
        performSearch(currentPage);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [filters.query]);

  const hasActiveFilters = Object.entries(filters).some(([key, value]) => {
    if (key === 'query' || key === 'sortBy' || key === 'sortOrder') return false;
    if (Array.isArray(value)) return value.length > 0;
    return value !== undefined && value !== '';
  });

  return (
    <Card className="w-full">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            Advanced {searchType === 'contractors' ? 'Contractor' : 'Partner'} Search
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            <Filter className="w-4 h-4 mr-2" />
            Filters
            {isExpanded ? <ChevronUp className="w-4 h-4 ml-2" /> : <ChevronDown className="w-4 h-4 ml-2" />}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Main Search Bar */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder={`Search ${searchType}...`}
              value={filters.query}
              onChange={(e) => handleFilterChange('query', e.target.value)}
              className="pl-10"
            />
          </div>
          <Button onClick={handleSearch} disabled={isSearching}>
            {isSearching ? 'Searching...' : 'Search'}
          </Button>
          {hasActiveFilters && (
            <Button variant="outline" onClick={clearFilters}>
              <X className="w-4 h-4 mr-2" />
              Clear
            </Button>
          )}
        </div>

        {/* Active Filters Display */}
        {hasActiveFilters && (
          <div className="flex flex-wrap gap-2">
            {filters.stage && (
              <Badge variant="secondary">
                Stage: {filters.stage}
                <X 
                  className="w-3 h-3 ml-1 cursor-pointer" 
                  onClick={() => handleFilterChange('stage', undefined)}
                />
              </Badge>
            )}
            {filters.focusAreas.map(area => (
              <Badge key={area} variant="secondary">
                Focus: {area}
                <X 
                  className="w-3 h-3 ml-1 cursor-pointer" 
                  onClick={() => handleArrayFilterToggle('focusAreas', area)}
                />
              </Badge>
            ))}
            {filters.revenueRange.map(range => (
              <Badge key={range} variant="secondary">
                Revenue: {range}
                <X 
                  className="w-3 h-3 ml-1 cursor-pointer" 
                  onClick={() => handleArrayFilterToggle('revenueRange', range)}
                />
              </Badge>
            ))}
            {filters.readinessIndicators.map(indicator => (
              <Badge key={indicator} variant="secondary">
                Readiness: {indicator.replace('increased_', '')}
                <X 
                  className="w-3 h-3 ml-1 cursor-pointer" 
                  onClick={() => handleArrayFilterToggle('readinessIndicators', indicator)}
                />
              </Badge>
            ))}
            {filters.contact_type && (
              <Badge variant="secondary">
                Contact Type: {filters.contact_type}
                <X 
                  className="w-3 h-3 ml-1 cursor-pointer" 
                  onClick={() => handleFilterChange('contact_type', undefined)}
                />
              </Badge>
            )}
            {filters.onboarding_source && (
              <Badge variant="secondary">
                Source: {filters.onboarding_source.replace('_', ' ')}
                <X 
                  className="w-3 h-3 ml-1 cursor-pointer" 
                  onClick={() => handleFilterChange('onboarding_source', undefined)}
                />
              </Badge>
            )}
            {filters.tags.map(tag => (
              <Badge key={tag} variant="secondary">
                Tag: {tag}
                <X 
                  className="w-3 h-3 ml-1 cursor-pointer" 
                  onClick={() => handleArrayFilterToggle('tags', tag)}
                />
              </Badge>
            ))}
          </div>
        )}

        {/* Expanded Filters */}
        {isExpanded && (
          <div className="space-y-4 pt-4 border-t">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              
              {/* Contractor-specific filters */}
              {searchType === 'contractors' && (
                <>
                  {/* Stage Filter */}
                  <div>
                    <label className="block text-sm font-medium mb-2">Stage</label>
                    <select
                      value={filters.stage || ''}
                      onChange={(e) => handleFilterChange('stage', e.target.value || undefined)}
                      className="w-full p-2 border rounded-md"
                    >
                      <option value="">All Stages</option>
                      {CONTRACTOR_STAGES.map(stage => (
                        <option key={stage} value={stage}>
                          {stage.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Verification Status */}
                  <div>
                    <label className="block text-sm font-medium mb-2">Verification</label>
                    <select
                      value={filters.verificationStatus || ''}
                      onChange={(e) => handleFilterChange('verificationStatus', e.target.value || undefined)}
                      className="w-full p-2 border rounded-md"
                    >
                      <option value="">All</option>
                      <option value="pending">Pending</option>
                      <option value="verified">Verified</option>
                      <option value="failed">Failed</option>
                    </select>
                  </div>

                  {/* Team Size Range */}
                  <div>
                    <label className="block text-sm font-medium mb-2">Team Size</label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        placeholder="Min"
                        value={filters.teamSizeMin || ''}
                        onChange={(e) => handleFilterChange('teamSizeMin', e.target.value ? Number(e.target.value) : undefined)}
                      />
                      <Input
                        type="number"
                        placeholder="Max"
                        value={filters.teamSizeMax || ''}
                        onChange={(e) => handleFilterChange('teamSizeMax', e.target.value ? Number(e.target.value) : undefined)}
                      />
                    </div>
                  </div>

                  {/* Contact Type */}
                  <div>
                    <label className="block text-sm font-medium mb-2">Contact Type</label>
                    <select
                      value={filters.contact_type || ''}
                      onChange={(e) => handleFilterChange('contact_type', e.target.value || undefined)}
                      className="w-full p-2 border rounded-md"
                    >
                      <option value="">All Types</option>
                      {CONTACT_TYPES.map(type => (
                        <option key={type} value={type}>
                          {type.charAt(0).toUpperCase() + type.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Onboarding Source */}
                  <div>
                    <label className="block text-sm font-medium mb-2">Onboarding Source</label>
                    <select
                      value={filters.onboarding_source || ''}
                      onChange={(e) => handleFilterChange('onboarding_source', e.target.value || undefined)}
                      className="w-full p-2 border rounded-md"
                    >
                      <option value="">All Sources</option>
                      {ONBOARDING_SOURCES.map(source => (
                        <option key={source} value={source}>
                          {source.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Readiness Indicators */}
                  <div className="md:col-span-2 lg:col-span-3">
                    <label className="block text-sm font-medium mb-2">Readiness Indicators</label>
                    <div className="flex flex-wrap gap-2">
                      {READINESS_INDICATORS.map(indicator => (
                        <Button
                          key={indicator}
                          variant={filters.readinessIndicators.includes(indicator) ? "default" : "outline"}
                          size="sm"
                          onClick={() => handleArrayFilterToggle('readinessIndicators', indicator)}
                        >
                          {indicator.replace('increased_', '').replace('_', ' ')}
                        </Button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Partner-specific filters */}
              {searchType === 'partners' && (
                <>
                  {/* Active Status */}
                  <div>
                    <label className="block text-sm font-medium mb-2">Status</label>
                    <select
                      value={filters.isActive === undefined ? '' : filters.isActive.toString()}
                      onChange={(e) => handleFilterChange('isActive', e.target.value === '' ? undefined : e.target.value === 'true')}
                      className="w-full p-2 border rounded-md"
                    >
                      <option value="">All</option>
                      <option value="true">Active</option>
                      <option value="false">Inactive</option>
                    </select>
                  </div>

                  {/* PowerConfidence Score Range */}
                  <div>
                    <label className="block text-sm font-medium mb-2">PowerConfidence Score</label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        placeholder="Min"
                        min="0"
                        max="100"
                        value={filters.confidenceScoreMin || ''}
                        onChange={(e) => handleFilterChange('confidenceScoreMin', e.target.value ? Number(e.target.value) : undefined)}
                      />
                      <Input
                        type="number"
                        placeholder="Max"
                        min="0"
                        max="100"
                        value={filters.confidenceScoreMax || ''}
                        onChange={(e) => handleFilterChange('confidenceScoreMax', e.target.value ? Number(e.target.value) : undefined)}
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Date Range */}
              <div>
                <label className="block text-sm font-medium mb-2">Date Range</label>
                <div className="flex gap-2">
                  <Input
                    type="date"
                    value={filters.dateFrom || ''}
                    onChange={(e) => handleFilterChange('dateFrom', e.target.value || undefined)}
                  />
                  <Input
                    type="date"
                    value={filters.dateTo || ''}
                    onChange={(e) => handleFilterChange('dateTo', e.target.value || undefined)}
                  />
                </div>
              </div>

              {/* Sort Options */}
              <div>
                <label className="block text-sm font-medium mb-2">Sort By</label>
                <div className="flex gap-2">
                  <select
                    value={filters.sortBy}
                    onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                    className="flex-1 p-2 border rounded-md"
                  >
                    <option value="created_at">Created Date</option>
                    <option value="updated_at">Updated Date</option>
                    <option value="name">Name</option>
                    {searchType === 'contractors' && (
                      <>
                        <option value="company_name">Company</option>
                        <option value="current_stage">Stage</option>
                        <option value="team_size">Team Size</option>
                      </>
                    )}
                    {searchType === 'partners' && (
                      <>
                        <option value="company_name">Company</option>
                        <option value="power_confidence_score">PowerConfidence</option>
                        <option value="is_active">Status</option>
                      </>
                    )}
                  </select>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleFilterChange('sortOrder', filters.sortOrder === 'ASC' ? 'DESC' : 'ASC')}
                  >
                    {filters.sortOrder === 'ASC' ? '↑' : '↓'}
                  </Button>
                </div>
              </div>
            </div>

            {/* Focus Areas */}
            <div>
              <label className="block text-sm font-medium mb-2">Focus Areas</label>
              <div className="flex flex-wrap gap-2">
                {(searchType === 'contractors' ? FOCUS_AREAS : PARTNER_FOCUS_AREAS).map(area => (
                  <Button
                    key={area}
                    variant={filters.focusAreas.includes(area) ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleArrayFilterToggle('focusAreas', area)}
                  >
                    {area.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </Button>
                ))}
              </div>
            </div>

            {/* Revenue Ranges */}
            <div>
              <label className="block text-sm font-medium mb-2">Revenue Range</label>
              <div className="flex flex-wrap gap-2">
                {REVENUE_RANGES.map(range => (
                  <Button
                    key={range}
                    variant={filters.revenueRange.includes(range) ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleArrayFilterToggle('revenueRange', range)}
                  >
                    {range}
                  </Button>
                ))}
              </div>
            </div>

            {/* Tags (for contractors) */}
            {searchType === 'contractors' && (
              <div>
                <label className="block text-sm font-medium mb-2">Tags</label>
                <div className="flex flex-wrap gap-2">
                  {COMMON_TAGS.map(tag => (
                    <Button
                      key={tag}
                      variant={filters.tags.includes(tag) ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleArrayFilterToggle('tags', tag)}
                    >
                      {tag.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}