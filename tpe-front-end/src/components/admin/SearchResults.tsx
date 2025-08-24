'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  Building2, 
  Mail, 
  Phone, 
  Calendar,
  TrendingUp,
  Star,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Eye,
  Edit,
  Trash2
} from 'lucide-react';

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

interface SearchResultsProps {
  results: SearchResult | null;
  searchType: 'contractors' | 'partners';
  onPageChange: (page: number) => void;
  onViewDetail: (id: string) => void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  isLoading?: boolean;
}

export default function SearchResults({ 
  results, 
  searchType, 
  onPageChange, 
  onViewDetail,
  onEdit,
  onDelete,
  isLoading = false 
}: SearchResultsProps) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Searching...</p>
        </CardContent>
      </Card>
    );
  }

  if (!results) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-gray-500">
          <p>Use the search filters above to find {searchType}</p>
        </CardContent>
      </Card>
    );
  }

  const items = searchType === 'contractors' ? results.contractors : results.partners;
  const { pagination } = results;

  if (!items || items.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-gray-500">
          <p>No {searchType} found matching your criteria</p>
        </CardContent>
      </Card>
    );
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStageColor = (stage: string) => {
    const colors = {
      verification: 'bg-yellow-100 text-yellow-800',
      focus_selection: 'bg-blue-100 text-blue-800',
      profiling: 'bg-purple-100 text-purple-800',
      matching: 'bg-orange-100 text-orange-800',
      completed: 'bg-green-100 text-green-800'
    };
    return colors[stage as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const renderContractorCard = (contractor: any) => (
    <Card key={contractor.id} className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <h3 className="font-semibold text-lg">{contractor.name}</h3>
            <p className="text-gray-600">{contractor.company_name}</p>
            <div className="flex items-center gap-2 mt-2">
              <Mail className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-600">{contractor.email}</span>
            </div>
            {contractor.phone && (
              <div className="flex items-center gap-2 mt-1">
                <Phone className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-600">{contractor.phone}</span>
              </div>
            )}
          </div>
          <div className="flex flex-col items-end gap-2">
            <Badge className={getStageColor(contractor.current_stage)}>
              {contractor.current_stage?.replace('_', ' ')}
            </Badge>
            {contractor.verification_status && (
              <Badge variant={contractor.verification_status === 'verified' ? 'default' : 'secondary'}>
                {contractor.verification_status}
              </Badge>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm">
          {contractor.service_area && (
            <div>
              <span className="text-gray-500">Service Area:</span>
              <p className="font-medium">{contractor.service_area}</p>
            </div>
          )}
          {contractor.annual_revenue && (
            <div>
              <span className="text-gray-500">Revenue:</span>
              <p className="font-medium">{contractor.annual_revenue}</p>
            </div>
          )}
          {contractor.team_size && (
            <div>
              <span className="text-gray-500">Team Size:</span>
              <p className="font-medium">{contractor.team_size}</p>
            </div>
          )}
          <div>
            <span className="text-gray-500">Created:</span>
            <p className="font-medium">{formatDate(contractor.created_at)}</p>
          </div>
        </div>

        {(() => {
          // Parse focus_areas safely
          // TODO: Replace with parseJsonArray utility from @/utils/jsonUtils
          let focusAreas: string[] = [];
          try {
            if (contractor.focus_areas) {
              if (typeof contractor.focus_areas === 'string') {
                focusAreas = JSON.parse(contractor.focus_areas);
              } else if (Array.isArray(contractor.focus_areas)) {
                focusAreas = contractor.focus_areas;
              }
            }
          } catch (e) {
            focusAreas = [];
          }
          
          return focusAreas.length > 0 && (
            <div className="mb-4">
              <span className="text-gray-500 text-sm">Focus Areas:</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {focusAreas.map((area: string, index: number) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {area}
                  </Badge>
                ))}
              </div>
            </div>
          );
        })()}

        <div className="flex justify-between items-center">
          <div className="flex gap-2">
            {contractor.increased_tools && (
              <Badge variant="secondary" className="text-xs">Tools ↑</Badge>
            )}
            {contractor.increased_people && (
              <Badge variant="secondary" className="text-xs">People ↑</Badge>
            )}
            {contractor.increased_activity && (
              <Badge variant="secondary" className="text-xs">Activity ↑</Badge>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                console.log('🔍 Viewing contractor with ID:', contractor.id, 'Type:', typeof contractor.id);
                console.log('🔍 Full contractor object:', contractor);
                onViewDetail(contractor.id);
              }}
            >
              <Eye className="w-4 h-4 mr-1" />
              View
            </Button>
            {onEdit && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onEdit(contractor.id)}
              >
                <Edit className="w-4 h-4 mr-1" />
                Edit
              </Button>
            )}
            {onDelete && (
              <Button
                size="sm"
                variant="outline"
                className="text-red-600 hover:text-red-700"
                onClick={() => onDelete(contractor.id)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderPartnerCard = (partner: any) => (
    <Card key={partner.id} className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <h3 className="font-semibold text-lg">{partner.company_name}</h3>
            <p className="text-gray-600 text-sm mt-1">{partner.description}</p>
            <div className="flex items-center gap-2 mt-2">
              <Mail className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-600">{partner.contact_email}</span>
            </div>
            {partner.website && (
              <div className="flex items-center gap-2 mt-1">
                <ExternalLink className="w-4 h-4 text-gray-400" />
                <a 
                  href={partner.website} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:underline"
                >
                  {partner.website}
                </a>
              </div>
            )}
          </div>
          <div className="flex flex-col items-end gap-2">
            <Badge variant={partner.is_active ? 'default' : 'secondary'}>
              {partner.is_active ? 'Active' : 'Inactive'}
            </Badge>
            {partner.power_confidence_score && (
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4 text-yellow-500" />
                <span className="text-sm font-medium">{partner.power_confidence_score}</span>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 text-sm">
          {partner.pricing_model && (
            <div>
              <span className="text-gray-500">Pricing:</span>
              <p className="font-medium">{partner.pricing_model}</p>
            </div>
          )}
          {partner.power100_subdomain && (
            <div>
              <span className="text-gray-500">Subdomain:</span>
              <p className="font-medium">{partner.power100_subdomain}</p>
            </div>
          )}
          <div>
            <span className="text-gray-500">Created:</span>
            <p className="font-medium">{formatDate(partner.created_at)}</p>
          </div>
        </div>

        {(() => {
          // Parse focus_areas_served safely
          let focusAreasServed: string[] = [];
          try {
            if (partner.focus_areas_served) {
              if (typeof partner.focus_areas_served === 'string') {
                focusAreasServed = JSON.parse(partner.focus_areas_served);
              } else if (Array.isArray(partner.focus_areas_served)) {
                focusAreasServed = partner.focus_areas_served;
              }
            }
          } catch (e) {
            focusAreasServed = [];
          }
          
          return focusAreasServed.length > 0 && (
            <div className="mb-4">
              <span className="text-gray-500 text-sm">Focus Areas Served:</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {focusAreasServed.map((area: string, index: number) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {area}
                  </Badge>
                ))}
              </div>
            </div>
          );
        })()}

        {(() => {
          // Parse target_revenue_range safely
          let targetRevenueRange: string[] = [];
          try {
            if (partner.target_revenue_range) {
              if (typeof partner.target_revenue_range === 'string') {
                targetRevenueRange = JSON.parse(partner.target_revenue_range);
              } else if (Array.isArray(partner.target_revenue_range)) {
                targetRevenueRange = partner.target_revenue_range;
              }
            }
          } catch (e) {
            targetRevenueRange = [];
          }
          
          return targetRevenueRange.length > 0 && (
            <div className="mb-4">
              <span className="text-gray-500 text-sm">Target Revenue:</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {targetRevenueRange.map((range: string, index: number) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {range}
                  </Badge>
                ))}
              </div>
            </div>
          );
        })()}

        <div className="flex justify-end gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onViewDetail(partner.id)}
          >
            <Eye className="w-4 h-4 mr-1" />
            View
          </Button>
          {onEdit && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onEdit(partner.id)}
            >
              <Edit className="w-4 h-4 mr-1" />
              Edit
            </Button>
          )}
          {onDelete && (
            <Button
              size="sm"
              variant="outline"
              className="text-red-600 hover:text-red-700"
              onClick={() => onDelete(partner.id)}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-4">
      {/* Results Header */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              {searchType === 'contractors' ? (
                <Users className="w-5 h-5" />
              ) : (
                <Building2 className="w-5 h-5" />
              )}
              Search Results
            </CardTitle>
            <div className="text-sm text-gray-600">
              Showing {pagination.offset + 1}-{Math.min(pagination.offset + pagination.limit, pagination.total)} of {pagination.total} results
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Results Grid */}
      <div className="grid gap-4">
        {items.map(item => 
          searchType === 'contractors' 
            ? renderContractorCard(item)
            : renderPartnerCard(item)
        )}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex justify-between items-center">
              <div className="text-sm text-gray-600">
                Page {pagination.currentPage} of {pagination.totalPages}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.currentPage === 1}
                  onClick={() => onPageChange(pagination.currentPage - 1)}
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Previous
                </Button>
                
                {/* Page Numbers */}
                {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                  const pageNum = Math.max(1, pagination.currentPage - 2) + i;
                  if (pageNum > pagination.totalPages) return null;
                  
                  return (
                    <Button
                      key={pageNum}
                      variant={pageNum === pagination.currentPage ? "default" : "outline"}
                      size="sm"
                      onClick={() => onPageChange(pageNum)}
                    >
                      {pageNum}
                    </Button>
                  );
                })}
                
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!pagination.hasMore}
                  onClick={() => onPageChange(pagination.currentPage + 1)}
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}