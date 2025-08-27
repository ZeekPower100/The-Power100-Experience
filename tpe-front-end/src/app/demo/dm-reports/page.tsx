'use client';

import React, { useState } from 'react';
import ContractorComparisonReport from '@/components/reports/ContractorComparisonReport';
import ExecutiveReport from '@/components/reports/ExecutiveReport';
import PublicPCRLanding from '@/components/reports/PublicPCRLanding';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { FileText, Lock, Globe, ChevronRight } from 'lucide-react';

export default function DMReportsDemo() {
  const [activeReport, setActiveReport] = useState<'contractor' | 'executive' | 'public'>('public');

  const reports = [
    {
      id: 'public',
      title: 'Public PCR Landing Page',
      description: 'What contractors see when researching Destination Motivation',
      icon: Globe,
      color: 'bg-blue-500'
    },
    {
      id: 'contractor',
      title: 'Contractor Comparison Report',
      description: 'Quarterly variance report showing peer performance',
      icon: FileText,
      color: 'bg-green-500'
    },
    {
      id: 'executive',
      title: 'Executive Report',
      description: 'Confidential metrics and coaching recommendations',
      icon: Lock,
      color: 'bg-red-500'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Report Selector */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="mb-4">
            <h1 className="text-2xl font-bold text-gray-900">Destination Motivation - Report Demo</h1>
            <p className="text-gray-600">View all three report types generated from PowerCard data</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-4">
            {reports.map((report) => {
              const Icon = report.icon;
              const isActive = activeReport === report.id;
              
              return (
                <Card 
                  key={report.id}
                  className={`cursor-pointer transition-all ${
                    isActive ? 'ring-2 ring-power100-red shadow-lg' : 'hover:shadow-md'
                  }`}
                  onClick={() => setActiveReport(report.id as any)}
                >
                  <div className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-lg ${report.color} flex items-center justify-center flex-shrink-0`}>
                        <Icon className="h-5 w-5 text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">{report.title}</h3>
                        <p className="text-sm text-gray-600 mt-1">{report.description}</p>
                      </div>
                      {isActive && (
                        <ChevronRight className="h-5 w-5 text-power100-red flex-shrink-0" />
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      </div>

      {/* Report Display */}
      <div className="relative">
        {activeReport === 'contractor' && (
          <ContractorComparisonReport contractorId="1" partnerId="4" />
        )}
        
        {activeReport === 'executive' && (
          <ExecutiveReport partnerId="4" />
        )}
        
        {activeReport === 'public' && (
          <PublicPCRLanding partnerId="4" />
        )}
      </div>

      {/* Demo Info Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-black/90 text-white p-4 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-sm">DEMO MODE - Destination Motivation Reports</span>
          </div>
          <div className="flex gap-2">
            <Button 
              size="sm" 
              variant="outline" 
              className="text-white border-white hover:bg-white/10"
              onClick={() => window.location.href = '/contractorflow'}
            >
              Start Contractor Flow
            </Button>
            <Button 
              size="sm" 
              className="bg-power100-green hover:bg-green-600"
              onClick={() => window.location.href = '/admindashboard'}
            >
              Admin Dashboard
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}