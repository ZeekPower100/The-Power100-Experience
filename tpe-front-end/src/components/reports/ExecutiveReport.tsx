'use client';
import { getApiUrl } from '@/utils/api';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  AlertCircle, 
  CheckCircle, 
  Target,
  Users,
  BarChart3,
  Lightbulb,
  AlertTriangle
} from 'lucide-react';
import { safeJsonParse, safeJsonStringify, handleApiResponse, getFromStorage, setToStorage } from '../../utils/jsonHelpers';

interface ExecutiveReportProps {
  partnerId: string;
}

export default function ExecutiveReport({ partnerId }: ExecutiveReportProps) {
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReport();
  }, [partnerId]);

  const fetchReport = async () => {
    try {
      const response = await fetch(getApiUrl(`api/reports/executive/partner/${partnerId}`));
      const data = await handleApiResponse(response);
      if (data.success) {
        setReport(data.report);
      }
    } catch (error) {
      console.error('Error fetching executive report:', error);
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

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <Badge className="mb-2 bg-red-100 text-red-800">CONFIDENTIAL - EXECUTIVE ONLY</Badge>
          <h1 className="text-3xl font-bold text-gray-900">Executive Performance Report</h1>
          <p className="text-gray-600 mt-2">{report.partner_name} • Q1 2025</p>
        </div>

        {/* Executive Summary */}
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <Card className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-600">PowerConfidence</p>
                <p className="text-3xl font-bold text-power100-red">{report.executive_summary.powerconfidence_score}</p>
                <p className="text-sm text-green-600">{report.executive_summary.score_change} from Q4</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Clients</p>
                <p className="text-3xl font-bold">{report.executive_summary.active_clients}</p>
                <p className="text-sm text-gray-500">of {report.executive_summary.total_clients_served} total</p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-600">Avg Satisfaction</p>
                <p className="text-3xl font-bold">{report.executive_summary.avg_client_satisfaction}</p>
                <p className="text-sm text-gray-500">out of 10</p>
              </div>
              <BarChart3 className="h-8 w-8 text-purple-500" />
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-600">NPS Score</p>
                <p className="text-3xl font-bold">{report.executive_summary.nps_score}</p>
                <p className="text-sm text-green-600">Excellent</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </Card>
        </div>

        {/* Performance by Revenue Tier */}
        <Card className="mb-8 p-6">
          <h2 className="text-xl font-semibold mb-4">Performance by Revenue Tier</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Revenue Tier</th>
                  <th className="text-center py-2">Clients</th>
                  <th className="text-center py-2">Closing %</th>
                  <th className="text-center py-2">Cancel Rate</th>
                  <th className="text-center py-2">Customer Exp</th>
                  <th className="text-center py-2">Satisfaction</th>
                </tr>
              </thead>
              <tbody>
                {report.performance_by_tier?.map((tier: any, idx: number) => (
                  <tr key={idx} className="border-b">
                    <td className="py-3 font-medium">{tier.revenue_tier}</td>
                    <td className="text-center">{tier.clients}</td>
                    <td className="text-center">
                      <span className="font-semibold">{tier.metrics.closing_percentage.current}%</span>
                      <span className="text-sm text-green-600 ml-2">{tier.metrics.closing_percentage.difference}</span>
                    </td>
                    <td className="text-center">
                      <span className="font-semibold">{tier.metrics.cancellation_rate.current}%</span>
                      <span className="text-sm text-green-600 ml-2">{tier.metrics.cancellation_rate.difference}</span>
                    </td>
                    <td className="text-center">
                      <span className="font-semibold">{tier.metrics.customer_experience.current}</span>
                      <span className="text-sm text-green-600 ml-2">{tier.metrics.customer_experience.difference}</span>
                    </td>
                    <td className="text-center">{tier.satisfaction}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Strengths & Opportunities */}
        <div className="grid md:grid-cols-2 gap-8 mb-8">
          {/* Strengths */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Key Strengths
            </h2>
            <div className="space-y-4">
              {report.analysis?.strengths?.map((strength: any, idx: number) => (
                <div key={idx} className="border-l-4 border-green-500 pl-4">
                  <h3 className="font-semibold">{strength.area}</h3>
                  <Badge className="mb-2" variant="outline">{strength.performance}</Badge>
                  <p className="text-sm text-gray-600">{strength.details}</p>
                  <p className="text-sm text-blue-600 mt-1">→ {strength.recommendation}</p>
                </div>
              ))}
            </div>
          </Card>

          {/* Opportunities */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-yellow-500" />
              Growth Opportunities
            </h2>
            <div className="space-y-4">
              {report.analysis?.opportunities?.map((opp: any, idx: number) => (
                <div key={idx} className="border-l-4 border-yellow-500 pl-4">
                  <h3 className="font-semibold">{opp.area}</h3>
                  <p className="text-sm text-gray-600">Current: {opp.current_performance}</p>
                  <p className="text-sm text-gray-600">Target: {opp.target}</p>
                  <p className="text-sm text-blue-600 mt-1">→ {opp.action_plan}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Start/Stop/Keep */}
        <Card className="p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Start / Stop / Keep Framework</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <h3 className="font-semibold text-green-600 mb-3 flex items-center gap-2">
                <Target className="h-4 w-4" />
                START
              </h3>
              <ul className="space-y-2">
                {report.recommendations?.start?.map((item: string, idx: number) => (
                  <li key={idx} className="flex items-start gap-2 text-sm">
                    <span className="text-green-500 mt-1">+</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-red-600 mb-3 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                STOP
              </h3>
              <ul className="space-y-2">
                {report.recommendations?.stop?.map((item: string, idx: number) => (
                  <li key={idx} className="flex items-start gap-2 text-sm">
                    <span className="text-red-500 mt-1">-</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-blue-600 mb-3 flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                KEEP
              </h3>
              <ul className="space-y-2">
                {report.recommendations?.keep?.map((item: string, idx: number) => (
                  <li key={idx} className="flex items-start gap-2 text-sm">
                    <span className="text-blue-500 mt-1">✓</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Card>

        {/* Footer */}
        <div className="text-center text-sm text-gray-500">
          <p>This confidential report contains actual performance metrics and strategic recommendations.</p>
          <p>Distribution limited to executive team only.</p>
        </div>
      </div>
    </div>
  );
}
