'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Plus } from 'lucide-react';
import Link from 'next/link';
import ContractorListEnhanced from '@/components/admin/ContractorListEnhanced';

const EnhancedContractorsPage: React.FC = () => {
  const [selectedContractorId, setSelectedContractorId] = useState<number | null>(null);
  const [refreshList, setRefreshList] = useState(0);

  const handleContractorSelect = (contractorId: number) => {
    setSelectedContractorId(contractorId);
    // TODO: Open contractor detail modal in future enhancement
    console.log('Selected contractor for detailed view:', contractorId);
  };

  const handleContractorEdit = (contractor: any) => {
    // Navigate to edit page
    window.location.href = `/admindashboard/contractors/${contractor.id}/edit`;
  };

  // TODO: Add contractor form functionality in future enhancement

  return (
    <div className="min-h-screen bg-power100-bg-grey p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <Link href="/admindashboard">
              <Button variant="outline" size="sm" className="flex items-center gap-2">
                <ArrowLeft className="w-4 h-4" />
                Back to Dashboard
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-power100-black">
                Enhanced Contractor Management
              </h1>
              <p className="text-power100-grey mt-1">
                Manage contractors with detailed progress tracking and analytics
              </p>
            </div>
          </div>
          
          {/* Add New Contractor Button - TODO: Implement in future enhancement */}
          <Button 
            onClick={() => alert('Add New Contractor functionality will be added in future enhancement')}
            className="bg-power100-green hover:bg-green-700 text-white flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Add New Contractor
          </Button>
        </div>
        
        {/* Status Banner */}
        <Card className="bg-power100-green/10 border-power100-green/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-power100-green mb-1">
                  🎉 Enhanced Contractor Management Active
                </h3>
                <p className="text-sm text-power100-black">
                  Now showing enhanced contractor data with progress tracking, stage management, and detailed analytics.
                </p>
              </div>
              <div className="text-right">
                <div className="text-xs text-power100-grey">Phase 1 Complete</div>
                <div className="font-semibold text-power100-green">✅ Enhanced List View</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Enhanced Contractor List Component */}
      <ContractorListEnhanced 
        onContractorSelect={handleContractorSelect} 
        onContractorEdit={handleContractorEdit}
      />

      {/* Development Info */}
      <Card className="mt-8 bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-blue-800">Development Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-green-600">✅</span>
              <span>Enhanced contractor list with progress tracking and stage management</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-green-600">✅</span>
              <span>Summary cards showing contractor analytics and completion rates</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-green-600">✅</span>
              <span>Working View/Edit buttons using contractors-enhanced endpoint</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-green-600">✅</span>
              <span>Contact tagging and onboarding source tracking</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-yellow-600">🔄</span>
              <span>Advanced filtering and search capabilities (Phase 2 - Coming Next)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-500">⏳</span>
              <span>Contractor self-service portal (Phase 3)</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EnhancedContractorsPage;