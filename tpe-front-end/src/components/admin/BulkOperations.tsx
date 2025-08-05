'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CheckSquare,
  Square,
  Settings,
  Trash2,
  Download,
  Upload,
  Users,
  Building2,
  AlertTriangle,
  CheckCircle,
  X
} from 'lucide-react';
import { bulkApi } from '@/lib/api';

interface BulkOperationsProps {
  searchType: 'contractors' | 'partners';
  items: any[];
  onRefresh: () => void;
  onError: (error: string) => void;
  onSuccess: (message: string) => void;
}

interface BulkUpdateFields {
  // Contractor fields
  current_stage?: string;
  verification_status?: string;
  annual_revenue?: string;
  increased_tools?: boolean;
  increased_people?: boolean;
  increased_activity?: boolean;
  
  // Partner fields
  is_active?: boolean;
  power_confidence_score?: number;
  pricing_model?: string;
  description?: string;
  contact_email?: string;
  contact_phone?: string;
}

export default function BulkOperations({ 
  searchType, 
  items, 
  onRefresh, 
  onError, 
  onSuccess 
}: BulkOperationsProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeOperation, setActiveOperation] = useState<'update' | 'delete' | 'export' | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [updateFields, setUpdateFields] = useState<BulkUpdateFields>({});

  // Selection handlers
  const toggleSelectAll = () => {
    if (selectedIds.length === items.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(items.map(item => item.id.toString()));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) 
        ? prev.filter(i => i !== id)
        : [...prev, id]
    );
  };

  const clearSelection = () => {
    setSelectedIds([]);
    setActiveOperation(null);
    setUpdateFields({});
  };

  // Bulk operations
  const handleBulkUpdate = async () => {
    if (selectedIds.length === 0) {
      onError('Please select items to update');
      return;
    }

    if (Object.keys(updateFields).length === 0) {
      onError('Please specify fields to update');
      return;
    }

    setIsProcessing(true);
    try {
      let result;
      if (searchType === 'contractors') {
        result = await bulkApi.updateContractors(selectedIds, updateFields);
      } else {
        result = await bulkApi.updatePartners(selectedIds, updateFields);
      }

      onSuccess(`Successfully updated ${result.updated_count} ${searchType}`);
      clearSelection();
      onRefresh();
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Bulk update failed');
    } finally {
      setIsProcessing(false);
      setActiveOperation(null);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) {
      onError('Please select items to delete');
      return;
    }

    if (!confirm(`Are you sure you want to delete ${selectedIds.length} ${searchType}? This action cannot be undone.`)) {
      return;
    }

    setIsProcessing(true);
    try {
      let result;
      if (searchType === 'contractors') {
        result = await bulkApi.deleteContractors(selectedIds);
      } else {
        // Partners don't have bulk delete - use toggle status instead
        result = await bulkApi.togglePartnerStatus(selectedIds);
      }

      const actionWord = searchType === 'contractors' ? 'deleted' : 'status toggled for';
      onSuccess(`Successfully ${actionWord} ${result.updated_count || result.deleted_count} ${searchType}`);
      clearSelection();
      onRefresh();
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Bulk operation failed');
    } finally {
      setIsProcessing(false);
      setActiveOperation(null);
    }
  };

  const handleBulkExport = async (format: 'csv' | 'json' = 'csv') => {
    setIsProcessing(true);
    try {
      let result;
      const exportParams = {
        format,
        ...(selectedIds.length > 0 ? { 
          [searchType === 'contractors' ? 'contractor_ids' : 'partner_ids']: selectedIds 
        } : {})
      };

      if (searchType === 'contractors') {
        result = await bulkApi.exportContractors(exportParams);
      } else {
        result = await bulkApi.exportPartners(exportParams);
      }

      if (format === 'csv') {
        // CSV export returns a blob/text response
        const blob = new Blob([result as string], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${searchType}_export_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } else {
        // JSON export
        const jsonStr = JSON.stringify(result, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${searchType}_export_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }

      const itemCount = selectedIds.length > 0 ? selectedIds.length : items.length;
      onSuccess(`Successfully exported ${itemCount} ${searchType} as ${format.toUpperCase()}`);
      
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Export failed');
    } finally {
      setIsProcessing(false);
      setActiveOperation(null);
    }
  };

  const renderUpdateFields = () => {
    if (searchType === 'contractors') {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Stage</label>
            <select
              value={updateFields.current_stage || ''}
              onChange={(e) => setUpdateFields(prev => ({ 
                ...prev, 
                current_stage: e.target.value || undefined 
              }))}
              className="w-full p-2 border rounded-md"
            >
              <option value="">No change</option>
              <option value="verification">Verification</option>
              <option value="focus_selection">Focus Selection</option>
              <option value="profiling">Profiling</option>
              <option value="matching">Matching</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Verification Status</label>
            <select
              value={updateFields.verification_status || ''}
              onChange={(e) => setUpdateFields(prev => ({ 
                ...prev, 
                verification_status: e.target.value || undefined 
              }))}
              className="w-full p-2 border rounded-md"
            >
              <option value="">No change</option>
              <option value="pending">Pending</option>
              <option value="verified">Verified</option>
              <option value="failed">Failed</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Revenue Range</label>
            <select
              value={updateFields.annual_revenue || ''}
              onChange={(e) => setUpdateFields(prev => ({ 
                ...prev, 
                annual_revenue: e.target.value || undefined 
              }))}
              className="w-full p-2 border rounded-md"
            >
              <option value="">No change</option>
              <option value="under_100k">Under $100K</option>
              <option value="100k_500k">$100K-$500K</option>
              <option value="500k_1m">$500K-$1M</option>
              <option value="1m_5m">$1M-$5M</option>
              <option value="5m_10m">$5M-$10M</option>
              <option value="over_10m">Over $10M</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-2">Readiness Indicators</label>
            <div className="flex gap-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={updateFields.increased_tools === true}
                  onChange={(e) => setUpdateFields(prev => ({ 
                    ...prev, 
                    increased_tools: e.target.checked ? true : undefined 
                  }))}
                  className="mr-2"
                />
                Increased Tools
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={updateFields.increased_people === true}
                  onChange={(e) => setUpdateFields(prev => ({ 
                    ...prev, 
                    increased_people: e.target.checked ? true : undefined 
                  }))}
                  className="mr-2"
                />
                Increased People
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={updateFields.increased_activity === true}
                  onChange={(e) => setUpdateFields(prev => ({ 
                    ...prev, 
                    increased_activity: e.target.checked ? true : undefined 
                  }))}
                  className="mr-2"
                />
                Increased Activity
              </label>
            </div>
          </div>
        </div>
      );
    } else {
      // Partner fields
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Status</label>
            <select
              value={updateFields.is_active === undefined ? '' : updateFields.is_active.toString()}
              onChange={(e) => setUpdateFields(prev => ({ 
                ...prev, 
                is_active: e.target.value === '' ? undefined : e.target.value === 'true'
              }))}
              className="w-full p-2 border rounded-md"
            >
              <option value="">No change</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">PowerConfidence Score</label>
            <Input
              type="number"
              min="0"
              max="100"
              placeholder="Enter score (0-100)"
              value={updateFields.power_confidence_score || ''}
              onChange={(e) => setUpdateFields(prev => ({ 
                ...prev, 
                power_confidence_score: e.target.value ? Number(e.target.value) : undefined 
              }))}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Pricing Model</label>
            <Input
              placeholder="Enter pricing model"
              value={updateFields.pricing_model || ''}
              onChange={(e) => setUpdateFields(prev => ({ 
                ...prev, 
                pricing_model: e.target.value || undefined 
              }))}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Contact Email</label>
            <Input
              type="email"
              placeholder="Enter contact email"
              value={updateFields.contact_email || ''}
              onChange={(e) => setUpdateFields(prev => ({ 
                ...prev, 
                contact_email: e.target.value || undefined 
              }))}
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-2">Description</label>
            <Input
              placeholder="Enter description"
              value={updateFields.description || ''}
              onChange={(e) => setUpdateFields(prev => ({ 
                ...prev, 
                description: e.target.value || undefined 
              }))}
            />
          </div>
        </div>
      );
    }
  };

  if (items.length === 0) {
    return null;
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            {searchType === 'contractors' ? (
              <Users className="w-5 h-5" />
            ) : (
              <Building2 className="w-5 h-5" />
            )}
            Bulk Operations
            {selectedIds.length > 0 && (
              <Badge variant="secondary">
                {selectedIds.length} selected
              </Badge>
            )}
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            <Settings className="w-4 h-4 mr-2" />
            {isExpanded ? 'Hide' : 'Show'} Tools
          </Button>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-4">
          {/* Selection Controls */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={toggleSelectAll}
              >
                {selectedIds.length === items.length ? (
                  <CheckSquare className="w-4 h-4 mr-2" />
                ) : (
                  <Square className="w-4 h-4 mr-2" />
                )}
                {selectedIds.length === items.length ? 'Deselect All' : 'Select All'}
              </Button>
              
              {selectedIds.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearSelection}
                >
                  <X className="w-4 h-4 mr-2" />
                  Clear Selection
                </Button>
              )}
            </div>
            
            <div className="text-sm text-gray-600">
              {selectedIds.length} of {items.length} selected
            </div>
          </div>

          {/* Selection Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-40 overflow-y-auto border rounded-lg p-2">
            {items.map((item) => (
              <button
                key={item.id}
                onClick={() => toggleSelect(item.id.toString())}
                className={`flex items-center gap-2 p-2 rounded text-left text-sm transition-colors ${
                  selectedIds.includes(item.id.toString())
                    ? 'bg-blue-100 text-blue-800'
                    : 'hover:bg-gray-100'
                }`}
              >
                {selectedIds.includes(item.id.toString()) ? (
                  <CheckSquare className="w-4 h-4" />
                ) : (
                  <Square className="w-4 h-4" />
                )}
                <span className="truncate">
                  {searchType === 'contractors' ? item.name : item.company_name}
                </span>
              </button>
            ))}
          </div>

          {/* Operation Buttons */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => setActiveOperation('update')}
              disabled={isProcessing || selectedIds.length === 0}
            >
              <Settings className="w-4 h-4 mr-2" />
              Bulk Update ({selectedIds.length})
            </Button>

            <Button
              variant="outline"
              onClick={() => setActiveOperation('delete')}
              disabled={isProcessing || selectedIds.length === 0}
              className="text-red-600 hover:text-red-700"
            >
              {searchType === 'contractors' ? (
                <Trash2 className="w-4 h-4 mr-2" />
              ) : (
                <Settings className="w-4 h-4 mr-2" />
              )}
              {searchType === 'contractors' ? 'Delete' : 'Toggle Status'} ({selectedIds.length})
            </Button>

            <Button
              variant="outline"
              onClick={() => handleBulkExport('csv')}
              disabled={isProcessing}
            >
              <Download className="w-4 h-4 mr-2" />
              Export CSV {selectedIds.length > 0 ? `(${selectedIds.length})` : '(All)'}
            </Button>

            <Button
              variant="outline"
              onClick={() => handleBulkExport('json')}
              disabled={isProcessing}
            >
              <Download className="w-4 h-4 mr-2" />
              Export JSON {selectedIds.length > 0 ? `(${selectedIds.length})` : '(All)'}
            </Button>
          </div>

          {/* Update Form */}
          {activeOperation === 'update' && (
            <div className="border rounded-lg p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">Update Fields</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setActiveOperation(null)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              
              {renderUpdateFields()}
              
              <div className="flex gap-2 pt-4">
                <Button
                  onClick={handleBulkUpdate}
                  disabled={isProcessing}
                >
                  {isProcessing ? 'Updating...' : `Update ${selectedIds.length} Items`}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setActiveOperation(null)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Delete Confirmation */}
          {activeOperation === 'delete' && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-4">
                  <p>
                    {searchType === 'contractors' 
                      ? `Are you sure you want to delete ${selectedIds.length} contractors? This action cannot be undone.`
                      : `This will toggle the active status for ${selectedIds.length} partners.`
                    }
                  </p>
                  <div className="flex gap-2">
                    <Button
                      onClick={handleBulkDelete}
                      disabled={isProcessing}
                      variant={searchType === 'contractors' ? 'destructive' : 'default'}
                    >
                      {isProcessing ? 'Processing...' : 
                        searchType === 'contractors' ? 'Delete Items' : 'Toggle Status'
                      }
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setActiveOperation(null)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      )}
    </Card>
  );
}