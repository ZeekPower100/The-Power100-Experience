// ================================================================
// Token Analytics Dashboard - Phase 3 Day 2
// ================================================================
// Purpose: Admin dashboard for monitoring OpenAI token usage and costs
// Location: /admin/token-analytics
// API: /api/analytics/tokens/*
// ================================================================

'use client';

import React, { useState, useEffect } from 'react';
import { RefreshCw, TrendingUp, DollarSign, Activity, Users, MessageSquare } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// ================================================================
// Types
// ================================================================

interface SystemUsage {
  unique_contractors: number;
  total_interactions: number;
  total_prompt_tokens: number;
  total_completion_tokens: number;
  total_tokens: number;
  avg_duration_ms: number;
  estimated_cost_usd: number;
}

interface ContractorUsage {
  contractor_id: number;
  interaction_count: number;
  total_prompt_tokens: number;
  total_completion_tokens: number;
  total_tokens: number;
  avg_duration_ms: number;
  estimated_cost_usd: number;
  first_interaction: string | null;
  last_interaction: string | null;
}

interface TrendData {
  date: string;
  interaction_count: number;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  avg_duration_ms: number;
}

interface Summary {
  contractor: ContractorUsage;
  system: SystemUsage;
  recent_trends: TrendData[];
  contractor_percentage: number;
}

// ================================================================
// Main Component
// ================================================================

export default function TokenAnalyticsDashboard() {
  // State
  const [systemUsage, setSystemUsage] = useState<SystemUsage | null>(null);
  const [contractorUsage, setContractorUsage] = useState<ContractorUsage | null>(null);
  const [trends, setTrends] = useState<TrendData[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<string>('30');
  const [selectedContractor, setSelectedContractor] = useState<string>('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<string>('');

  // API Base URL
  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

  // ================================================================
  // Data Fetching
  // ================================================================

  const fetchSystemUsage = async () => {
    try {
      const response = await fetch(`${API_BASE}/analytics/tokens/system?days=${selectedPeriod}`);
      if (!response.ok) throw new Error('Failed to fetch system usage');
      const data = await response.json();
      setSystemUsage(data.data);
    } catch (err) {
      console.error('[Token Analytics] Error fetching system usage:', err);
      throw err;
    }
  };

  const fetchContractorUsage = async (contractorId: string) => {
    try {
      const response = await fetch(`${API_BASE}/analytics/tokens/contractor/${contractorId}?days=${selectedPeriod}`);
      if (!response.ok) throw new Error('Failed to fetch contractor usage');
      const data = await response.json();
      setContractorUsage(data.data);
    } catch (err) {
      console.error('[Token Analytics] Error fetching contractor usage:', err);
      throw err;
    }
  };

  const fetchTrends = async () => {
    try {
      const url = selectedContractor && selectedContractor !== 'all'
        ? `${API_BASE}/analytics/tokens/trends?contractorId=${selectedContractor}&days=7`
        : `${API_BASE}/analytics/tokens/trends?days=7`;

      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch trends');
      const data = await response.json();
      setTrends(data.data);
    } catch (err) {
      console.error('[Token Analytics] Error fetching trends:', err);
      throw err;
    }
  };

  const refreshData = async () => {
    setLoading(true);
    setError(null);

    try {
      await fetchSystemUsage();
      await fetchTrends();

      if (selectedContractor && selectedContractor !== 'all') {
        await fetchContractorUsage(selectedContractor);
      } else {
        setContractorUsage(null);
      }

      setLastRefresh(new Date().toLocaleTimeString());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  // ================================================================
  // Effects
  // ================================================================

  useEffect(() => {
    // Only run on client side
    if (typeof window !== 'undefined') {
      refreshData();
    }
  }, [selectedPeriod, selectedContractor]);

  // ================================================================
  // Render Helpers
  // ================================================================

  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 4,
      maximumFractionDigits: 4,
    }).format(amount);
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatDuration = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`;
    const seconds = (ms / 1000).toFixed(2);
    return `${seconds}s`;
  };

  // ================================================================
  // Render
  // ================================================================

  return (
    <div className="min-h-screen bg-power100-bg-grey p-8">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-power100-black">Token Analytics Dashboard</h1>
            <p className="text-gray-600 mt-2">
              Monitor OpenAI API usage, costs, and performance metrics
            </p>
          </div>

          <Button
            onClick={refreshData}
            disabled={loading}
            className="bg-power100-green hover:bg-green-600 text-white"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Controls */}
        <Card className="p-6 bg-white">
          <div className="flex gap-4 items-center">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Time Period
              </label>
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder="Select period" />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="7">Last 7 Days</SelectItem>
                  <SelectItem value="14">Last 14 Days</SelectItem>
                  <SelectItem value="30">Last 30 Days</SelectItem>
                  <SelectItem value="60">Last 60 Days</SelectItem>
                  <SelectItem value="90">Last 90 Days</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Contractor (Optional)
              </label>
              <Select value={selectedContractor} onValueChange={setSelectedContractor}>
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder="All contractors" />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="all">All Contractors</SelectItem>
                  <SelectItem value="1">Contractor ID: 1</SelectItem>
                  <SelectItem value="2">Contractor ID: 2</SelectItem>
                  <SelectItem value="3">Contractor ID: 3</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1 flex items-end">
              <div className="text-sm text-gray-600">
                {lastRefresh && `Last refreshed: ${lastRefresh}`}
              </div>
            </div>
          </div>
        </Card>

        {/* Error Display */}
        {error && (
          <Card className="p-6 bg-red-50 border-red-200">
            <p className="text-red-800 font-medium">Error: {error}</p>
          </Card>
        )}

        {/* System-Wide Statistics */}
        {systemUsage && (
          <>
            <h2 className="text-2xl font-bold text-power100-black mt-8">
              System-Wide Statistics
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Total Interactions */}
              <Card className="p-6 bg-white">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-power100-red rounded-full flex items-center justify-center">
                    <MessageSquare className="h-6 w-6 text-white" />
                  </div>
                </div>
                <div>
                  <p className="text-gray-600 text-sm">Total Interactions</p>
                  <p className="text-3xl font-bold text-power100-black mt-2">
                    {formatNumber(systemUsage.total_interactions)}
                  </p>
                </div>
              </Card>

              {/* Unique Contractors */}
              <Card className="p-6 bg-white">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-power100-green rounded-full flex items-center justify-center">
                    <Users className="h-6 w-6 text-white" />
                  </div>
                </div>
                <div>
                  <p className="text-gray-600 text-sm">Unique Contractors</p>
                  <p className="text-3xl font-bold text-power100-black mt-2">
                    {formatNumber(systemUsage.unique_contractors)}
                  </p>
                </div>
              </Card>

              {/* Total Tokens */}
              <Card className="p-6 bg-white">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
                    <Activity className="h-6 w-6 text-white" />
                  </div>
                </div>
                <div>
                  <p className="text-gray-600 text-sm">Total Tokens</p>
                  <p className="text-3xl font-bold text-power100-black mt-2">
                    {formatNumber(systemUsage.total_tokens)}
                  </p>
                  <div className="flex gap-4 mt-2 text-sm text-gray-600">
                    <span>Prompt: {formatNumber(systemUsage.total_prompt_tokens)}</span>
                    <span>Completion: {formatNumber(systemUsage.total_completion_tokens)}</span>
                  </div>
                </div>
              </Card>

              {/* Estimated Cost */}
              <Card className="p-6 bg-white">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-yellow-500 rounded-full flex items-center justify-center">
                    <DollarSign className="h-6 w-6 text-white" />
                  </div>
                </div>
                <div>
                  <p className="text-gray-600 text-sm">Estimated Cost</p>
                  <p className="text-3xl font-bold text-power100-black mt-2">
                    {formatCurrency(systemUsage.estimated_cost_usd)}
                  </p>
                  <p className="text-sm text-gray-600 mt-2">
                    Avg duration: {formatDuration(systemUsage.avg_duration_ms)}
                  </p>
                </div>
              </Card>
            </div>
          </>
        )}

        {/* Contractor-Specific Statistics */}
        {contractorUsage && selectedContractor && selectedContractor !== 'all' && (
          <>
            <h2 className="text-2xl font-bold text-power100-black mt-8">
              Contractor #{contractorUsage.contractor_id} Statistics
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Interactions */}
              <Card className="p-6 bg-white">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center">
                    <MessageSquare className="h-6 w-6 text-white" />
                  </div>
                </div>
                <div>
                  <p className="text-gray-600 text-sm">Interactions</p>
                  <p className="text-3xl font-bold text-power100-black mt-2">
                    {formatNumber(contractorUsage.interaction_count)}
                  </p>
                  {contractorUsage.first_interaction && (
                    <p className="text-sm text-gray-600 mt-2">
                      First: {formatDate(contractorUsage.first_interaction)}
                    </p>
                  )}
                </div>
              </Card>

              {/* Tokens Used */}
              <Card className="p-6 bg-white">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-indigo-500 rounded-full flex items-center justify-center">
                    <TrendingUp className="h-6 w-6 text-white" />
                  </div>
                </div>
                <div>
                  <p className="text-gray-600 text-sm">Tokens Used</p>
                  <p className="text-3xl font-bold text-power100-black mt-2">
                    {formatNumber(contractorUsage.total_tokens)}
                  </p>
                  <div className="flex gap-4 mt-2 text-sm text-gray-600">
                    <span>In: {formatNumber(contractorUsage.total_prompt_tokens)}</span>
                    <span>Out: {formatNumber(contractorUsage.total_completion_tokens)}</span>
                  </div>
                </div>
              </Card>

              {/* Cost */}
              <Card className="p-6 bg-white">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                    <DollarSign className="h-6 w-6 text-white" />
                  </div>
                </div>
                <div>
                  <p className="text-gray-600 text-sm">Estimated Cost</p>
                  <p className="text-3xl font-bold text-power100-black mt-2">
                    {formatCurrency(contractorUsage.estimated_cost_usd)}
                  </p>
                  <p className="text-sm text-gray-600 mt-2">
                    Avg: {formatDuration(contractorUsage.avg_duration_ms)}
                  </p>
                </div>
              </Card>
            </div>
          </>
        )}

        {/* Usage Trends */}
        {trends.length > 0 && (
          <>
            <h2 className="text-2xl font-bold text-power100-black mt-8">
              Usage Trends (Last 7 Days)
            </h2>

            <Card className="p-6 bg-white">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Date</th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-700">Interactions</th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-700">Total Tokens</th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-700">Prompt Tokens</th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-700">Completion Tokens</th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-700">Avg Duration</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trends.map((trend, index) => (
                      <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4 text-gray-900">{formatDate(trend.date)}</td>
                        <td className="py-3 px-4 text-right text-gray-900">
                          {formatNumber(trend.interaction_count)}
                        </td>
                        <td className="py-3 px-4 text-right text-gray-900">
                          {formatNumber(trend.total_tokens)}
                        </td>
                        <td className="py-3 px-4 text-right text-gray-600">
                          {formatNumber(trend.prompt_tokens)}
                        </td>
                        <td className="py-3 px-4 text-right text-gray-600">
                          {formatNumber(trend.completion_tokens)}
                        </td>
                        <td className="py-3 px-4 text-right text-gray-600">
                          {formatDuration(trend.avg_duration_ms)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center items-center py-12">
            <RefreshCw className="h-8 w-8 animate-spin text-power100-green" />
          </div>
        )}

        {/* Empty State */}
        {!loading && !systemUsage && !error && (
          <Card className="p-12 bg-white text-center">
            <Activity className="h-16 w-16 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-600 text-lg">No analytics data available yet</p>
            <p className="text-gray-500 text-sm mt-2">
              Token usage will appear here once contractors interact with the AI Concierge
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}
