'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import PartnerListEnhanced from '@/components/admin/PartnerListEnhanced';

const EnhancedPartnersPage: React.FC = () => {
  const [selectedPartnerId, setSelectedPartnerId] = useState<number | null>(null);

  const handlePartnerSelect = (partnerId: number) => {
    setSelectedPartnerId(partnerId);
    // TODO: Open partner detail modal in Phase 2
    console.log('Selected partner for detailed view:', partnerId);
  };

  return (
    <div className="min-h-screen bg-power100-bg-grey p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <Link href="/admindashboard">
            <Button variant="outline" size="sm" className="flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-power100-black">
              Enhanced Partner Management
            </h1>
            <p className="text-power100-grey mt-1">
              Manage partners with PowerConfidence scores and performance analytics
            </p>
          </div>
        </div>
        
        {/* Status Banner */}
        <Card className="bg-power100-green/10 border-power100-green/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-power100-green mb-1">
                  🎉 PowerConfidence Enhancement Active
                </h3>
                <p className="text-sm text-power100-black">
                  Now showing enhanced partner data with PowerConfidence scores, trends, and performance metrics.
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

      {/* Enhanced Partner List Component */}
      <PartnerListEnhanced onPartnerSelect={handlePartnerSelect} />

      {/* Development Info */}
      <Card className="mt-8 bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-blue-800">Development Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-green-600">✅</span>
              <span>Enhanced partner list with PowerConfidence scores</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-green-600">✅</span>
              <span>Summary cards showing partner performance metrics</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-green-600">✅</span>
              <span>Trend indicators and priority insights</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-yellow-600">🔄</span>
              <span>Partner detail modal (Phase 2 - Coming Next)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-500">⏳</span>
              <span>Partner self-service portal (Phase 2)</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EnhancedPartnersPage;