'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Search,
  Users,
  Building2,
  Download,
  Filter,
  BarChart3
} from 'lucide-react';

import AdvancedSearch from '@/components/admin/AdvancedSearch';
import SearchResults from '@/components/admin/SearchResults';
import BulkOperations from '@/components/admin/BulkOperations';
import ContractorDetailModal from '@/components/admin/ContractorDetailModal';
import PartnerDetailModal from '@/components/admin/PartnerDetailModal';
import PartnerForm from '@/components/admin/PartnerForm';

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

export default function AdminSearchPage() {
  const [activeTab, setActiveTab] = useState<'contractors' | 'partners'>('contractors');
  const [contractorResults, setContractorResults] = useState<SearchResult | null>(null);
  const [partnerResults, setPartnerResults] = useState<SearchResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // Modal states for enhanced view functionality
  const [selectedContractor, setSelectedContractor] = useState<any>(null);
  const [selectedPartner, setSelectedPartner] = useState<any>(null);
  const [isContractorModalOpen, setIsContractorModalOpen] = useState(false);
  const [isPartnerModalOpen, setIsPartnerModalOpen] = useState(false);
  
  // Partner editing state (matching Enhanced Partners pattern)
  const [editPartner, setEditPartner] = useState<any>(null);

  const handleContractorResults = (results: SearchResult) => {
    setContractorResults(results);
    setError(null);
  };

  const handlePartnerResults = (results: SearchResult) => {
    setPartnerResults(results);
    setError(null);
  };

  const handleError = (errorMessage: string) => {
    setError(errorMessage);
    setSuccessMessage(null);
  };

  const handleSuccess = (message: string) => {
    setSuccessMessage(message);
    setError(null);
    // Auto-clear success message after 5 seconds
    setTimeout(() => setSuccessMessage(null), 5000);
  };

  const handleEditPartnerSuccess = () => {
    setEditPartner(null); // Close the PartnerForm
    handleSuccess('Partner updated successfully');
    // Refresh search results if needed
    if (activeTab === 'partners') {
      handleRefresh();
    }
  };

  const handleRefresh = async () => {
    // Trigger a refresh by clearing current results
    // The search components will need to re-run their last search
    if (activeTab === 'contractors') {
      // This would ideally trigger the AdvancedSearch component to re-run its last search
      console.log('Refreshing contractor results...');
    } else {
      console.log('Refreshing partner results...');
    }
  };

  const handleViewContractorDetail = async (id: string) => {
    try {
      // Use the contractors-enhanced endpoint that works
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000/api';
      const response = await fetch(`${apiUrl}/contractors-enhanced/${id}/view`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch contractor details');
      }

      const data = await response.json();
      setSelectedContractor(data.contractor);
      setIsContractorModalOpen(true);
    } catch (error) {
      console.error('Error fetching contractor details:', error);
      setError('Failed to load contractor details');
    }
  };

  const handleViewPartnerDetail = async (id: string) => {
    try {
      // For now, use the existing enhanced partner functionality pattern
      // First get all partners and find the specific one (batch approach that works)
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000/api';
      const response = await fetch(`${apiUrl}/partners-enhanced/list`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch partner details');
      }

      const data = await response.json();
      const partner = data.partners.find((p: any) => p.id.toString() === id.toString());
      
      if (partner) {
        setSelectedPartner(partner);
        setIsPartnerModalOpen(true);
      } else {
        setError('Partner not found');
      }
    } catch (error) {
      console.error('Error fetching partner details:', error);
      setError('Failed to load partner details');
    }
  };

  const handleEditContractor = (id: string) => {
    // Navigate to contractor edit page
    window.location.href = `/admindashboard/contractors/${id}/edit`;
  };

  const handleEditPartner = async (id: string) => {
    try {
      // Get full partner data for editing (using enhanced approach)
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000/api';
      const response = await fetch(`${apiUrl}/partners-enhanced/list`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch partner details');
      }

      const data = await response.json();
      const partner = data.partners.find((p: any) => p.id.toString() === id.toString());
      
      if (partner) {
        setEditPartner(partner); // This will show the PartnerForm component
      } else {
        setError('Partner not found');
      }
    } catch (error) {
      console.error('Error fetching partner for editing:', error);
      setError('Failed to load partner for editing');
    }
  };

  const handleDeleteContractor = (id: string) => {
    if (confirm('Are you sure you want to delete this contractor?')) {
      // Handle delete logic
      console.log('Delete contractor:', id);
      // Refresh results after deletion
    }
  };

  const handleDeletePartner = (id: string) => {
    if (confirm('Are you sure you want to delete this partner?')) {
      // Handle delete logic
      console.log('Delete partner:', id);
      // Refresh results after deletion
    }
  };

  const handleExportResults = () => {
    const results = activeTab === 'contractors' ? contractorResults : partnerResults;
    if (!results) return;

    // Create CSV export logic
    const items = activeTab === 'contractors' ? results.contractors : results.partners;
    if (!items || items.length === 0) return;

    // Basic CSV generation
    const headers = activeTab === 'contractors' 
      ? ['Name', 'Email', 'Company', 'Stage', 'Phone', 'Service Area', 'Revenue']
      : ['Company Name', 'Email', 'Website', 'Status', 'PowerConfidence Score', 'Pricing Model'];

    const csvContent = [
      headers.join(','),
      ...items.map(item => {
        if (activeTab === 'contractors') {
          return [
            `"${item.name || ''}"`,
            `"${item.email || ''}"`,
            `"${item.company_name || ''}"`,
            `"${item.current_stage || ''}"`,
            `"${item.phone || ''}"`,
            `"${item.service_area || ''}"`,
            `"${item.annual_revenue || ''}"`
          ].join(',');
        } else {
          return [
            `"${item.company_name || ''}"`,
            `"${item.contact_email || ''}"`,
            `"${item.website || ''}"`,
            `"${item.is_active ? 'Active' : 'Inactive'}"`,
            `"${item.power_confidence_score || ''}"`,
            `"${item.pricing_model || ''}"`
          ].join(',');
        }
      })
    ].join('\n');

    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${activeTab}_search_results_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getResultCount = () => {
    const results = activeTab === 'contractors' ? contractorResults : partnerResults;
    return results?.pagination.total || 0;
  };

  // Show PartnerForm when editing a partner (matching Enhanced Partners pattern)
  if (editPartner) {
    return (
      <PartnerForm 
        partner={editPartner}
        onSuccess={handleEditPartnerSuccess}
        onCancel={() => setEditPartner(null)}
      />
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Advanced Search</h1>
          <p className="text-gray-600 mt-2">
            Search and filter contractors and strategic partners with advanced criteria
          </p>
        </div>
        <div className="flex gap-2">
          {getResultCount() > 0 && (
            <Button onClick={handleExportResults} variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Export Results ({getResultCount()})
            </Button>
          )}
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Success Alert */}
      {successMessage && (
        <Alert>
          <AlertDescription className="text-green-800">{successMessage}</AlertDescription>
        </Alert>
      )}

      {/* Search Tabs */}
      <Tabs 
        value={activeTab} 
        onValueChange={(value: string) => setActiveTab(value as 'contractors' | 'partners')}
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="contractors" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Contractors
            {contractorResults && (
              <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full ml-2">
                {contractorResults.pagination.total}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="partners" className="flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            Partners
            {partnerResults && (
              <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full ml-2">
                {partnerResults.pagination.total}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Contractor Search Tab */}
        <TabsContent value="contractors" className="space-y-6">
          <AdvancedSearch
            searchType="contractors"
            onResults={handleContractorResults}
            onError={handleError}
          />

          {/* Bulk Operations for Contractors */}
          {contractorResults?.contractors && contractorResults.contractors.length > 0 && (
            <BulkOperations
              searchType="contractors"
              items={contractorResults.contractors}
              onRefresh={handleRefresh}
              onError={handleError}
              onSuccess={handleSuccess}
            />
          )}
          
          <SearchResults
            results={contractorResults}
            searchType="contractors"
            onPageChange={(page) => {
              // This will be handled by the AdvancedSearch component
              console.log('Page change:', page);
            }}
            onViewDetail={handleViewContractorDetail}
            onEdit={handleEditContractor}
            onDelete={handleDeleteContractor}
            isLoading={isLoading}
          />
        </TabsContent>

        {/* Partner Search Tab */}
        <TabsContent value="partners" className="space-y-6">
          <AdvancedSearch
            searchType="partners"
            onResults={handlePartnerResults}
            onError={handleError}
          />

          {/* Bulk Operations for Partners */}
          {partnerResults?.partners && partnerResults.partners.length > 0 && (
            <BulkOperations
              searchType="partners"
              items={partnerResults.partners}
              onRefresh={handleRefresh}
              onError={handleError}
              onSuccess={handleSuccess}
            />
          )}
          
          <SearchResults
            results={partnerResults}
            searchType="partners"
            onPageChange={(page) => {
              // This will be handled by the AdvancedSearch component
              console.log('Page change:', page);
            }}
            onViewDetail={handleViewPartnerDetail}
            onEdit={handleEditPartner}
            onDelete={handleDeletePartner}
            isLoading={isLoading}
          />
        </TabsContent>
      </Tabs>

      {/* Quick Stats */}
      {(contractorResults || partnerResults) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Search Statistics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {contractorResults && (
                <>
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {contractorResults.pagination.total}
                    </div>
                    <div className="text-sm text-blue-600">Total Contractors</div>
                  </div>
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {contractorResults.pagination.totalPages}
                    </div>
                    <div className="text-sm text-blue-600">Pages</div>
                  </div>
                </>
              )}
              {partnerResults && (
                <>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {partnerResults.pagination.total}
                    </div>
                    <div className="text-sm text-green-600">Total Partners</div>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {partnerResults.pagination.totalPages}
                    </div>
                    <div className="text-sm text-green-600">Pages</div>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Enhanced View Modals */}
      <ContractorDetailModal
        contractor={selectedContractor}
        isOpen={isContractorModalOpen}
        onClose={() => setIsContractorModalOpen(false)}
      />

      <PartnerDetailModal
        partner={selectedPartner}
        isOpen={isPartnerModalOpen}
        onClose={() => setIsPartnerModalOpen(false)}
      />
    </div>
  );
}