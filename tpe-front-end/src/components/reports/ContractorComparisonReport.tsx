'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, ArrowRight, Users, Target, Award } from 'lucide-react';

interface ContractorReportProps {
  contractorId: string;
  partnerId: string;
}

export default function ContractorComparisonReport({ contractorId, partnerId }: ContractorReportProps) {
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReport();
  }, [contractorId, partnerId]);

  const fetchReport = async () => {
    try {
      const response = await fetch(`/api/reports/contractor/${contractorId}/partner/${partnerId}`);
      const data = await response.json();
      if (data.success) {
        setReport(data.report);
      }
    } catch (error) {
      console.error('Error fetching report:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-power100-red"></div>
      </div>
    );
  }

  if (!report) return null;

  const getVarianceColor = (trend: string, metric: string) => {
    // For cancellation rate, down is good
    if (metric === 'cancellation_rate') {
      return trend === 'down' ? 'text-green-600' : 'text-red-600';
    }
    // For other metrics, up is good
    return trend === 'up' ? 'text-green-600' : 'text-red-600';
  };

  const getTrendIcon = (trend: string) => {
    if (trend === 'up') return <TrendingUp className="h-5 w-5" />;
    if (trend === 'down') return <TrendingDown className="h-5 w-5" />;
    return <ArrowRight className="h-5 w-5" />;
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Quarterly Performance Report</h1>
              <p className="text-gray-600 mt-2">{report.quarter} • {report.contractor.company}</p>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-2">
                <img src="/dm-logo.png" alt="DM" className="h-12 w-12 rounded-full" />
                <div>
                  <p className="font-semibold">{report.partner.name}</p>
                  <Badge className="bg-gold-100 text-gold-800">
                    PCR Score: {report.partner.powerconfidence_score}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Current Tier Performance */}
        <Card className="mb-8 p-6">
          <div className="mb-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Target className="h-5 w-5 text-power100-red" />
              Your Tier Performance: {report.current_tier_performance.tier}
            </h2>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6 mb-6">
            {Object.entries(report.current_tier_performance.metrics).map(([key, data]: [string, any]) => (
              <div key={key} className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-medium text-gray-700">
                    {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </h3>
                  <div className={`flex items-center gap-1 ${getVarianceColor(data.trend, key)}`}>
                    {getTrendIcon(data.trend)}
                    <span className="font-bold text-lg">{data.variance}</span>
                  </div>
                </div>
                <p className="text-sm text-gray-600">{data.comparison}</p>
              </div>
            ))}
          </div>

          {/* Peer Insights */}
          <div className="border-t pt-4">
            <h3 className="font-medium mb-3 flex items-center gap-2">
              <Users className="h-4 w-4" />
              Peer Insights
            </h3>
            <ul className="space-y-2">
              {report.current_tier_performance.peer_insights.map((insight: string, idx: number) => (
                <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                  <span className="text-green-500 mt-1">✓</span>
                  <span>{insight}</span>
                </li>
              ))}
            </ul>
          </div>
        </Card>

        {/* Next Tier Performance */}
        <Card className="mb-8 p-6 border-2 border-blue-100 bg-blue-50/30">
          <div className="mb-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Award className="h-5 w-5 text-blue-600" />
              Next Tier Performance: {report.next_tier_performance.tier}
            </h2>
            <p className="text-sm text-gray-600 mt-1">See what's possible as you grow</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6">
            {Object.entries(report.next_tier_performance.metrics).map(([key, data]: [string, any]) => (
              <div key={key} className="bg-white rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-medium text-gray-700">
                    {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </h3>
                  <div className={`flex items-center gap-1 ${getVarianceColor(data.trend, key)}`}>
                    {getTrendIcon(data.trend)}
                    <span className="font-bold text-lg">{data.variance}</span>
                  </div>
                </div>
                <p className="text-xs text-gray-500">Avg. improvement at this level</p>
              </div>
            ))}
          </div>
        </Card>

        {/* Best Practices */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Recommended Best Practices</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {report.best_practices.map((practice: string, idx: number) => (
              <div key={idx} className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-power100-green/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-power100-green font-semibold text-sm">{idx + 1}</span>
                </div>
                <p className="text-gray-700">{practice}</p>
              </div>
            ))}
          </div>
        </Card>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>This report compares your performance with other contractors in your revenue tier.</p>
          <p>All data represents quarterly variance percentages to maintain confidentiality.</p>
        </div>
      </div>
    </div>
  );
}