'use client';

import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import PowerConfidenceDashboard from '@/components/admin/PowerConfidenceDashboard';
import SmsCampaignManager from '@/components/admin/SmsCampaignManager';

const PowerConfidencePage: React.FC = () => {
  return (
    <div className="container mx-auto p-6">
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">PowerConfidence System</h1>
          <p className="text-gray-600 mt-2">
            Manage quarterly feedback collection, SMS campaigns, and partner satisfaction tracking
          </p>
        </div>

        <Tabs defaultValue="dashboard" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="dashboard">Analytics Dashboard</TabsTrigger>
            <TabsTrigger value="campaigns">SMS Campaigns</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-4">
            <PowerConfidenceDashboard />
          </TabsContent>

          <TabsContent value="campaigns" className="space-y-4">
            <SmsCampaignManager />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default PowerConfidencePage;