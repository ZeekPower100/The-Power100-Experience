'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Shield, ShieldAlert, Activity, TrendingUp, Users, AlertTriangle } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface GuardStats {
  totalChecks: number;
  checksPassed: number;
  checksBlocked: number;
  uniqueContractors: number;
  avgOperationsPerContractor: number;
  timeWindow: string;
}

interface Violation {
  id: number;
  contractorId: number;
  contractorName: string;
  email: string;
  companyName: string;
  guardType: string;
  reason: string;
  currentCount: number | null;
  limit: number | null;
  retryAfter: number | null;
  timestamp: string;
}

interface ActivityData {
  hour: string;
  totalChecks: number;
  checksPassed: number;
  checksBlocked: number;
}

interface TopViolator {
  contractorId: number;
  contractorName: string;
  email: string;
  companyName: string;
  violationCount: number;
  lastViolation: string;
}

interface GuardTypeBreakdown {
  guardType: string;
  totalChecks: number;
  checksPassed: number;
  checksBlocked: number;
  blockRate: string;
}

export default function GuardMonitoringDashboard() {
  const [stats, setStats] = useState<GuardStats | null>(null);
  const [violations, setViolations] = useState<Violation[]>([]);
  const [activity, setActivity] = useState<ActivityData[]>([]);
  const [topViolators, setTopViolators] = useState<TopViolator[]>([]);
  const [typeBreakdown, setTypeBreakdown] = useState<GuardTypeBreakdown[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeWindow, setTimeWindow] = useState<number>(24); // hours

  useEffect(() => {
    fetchAllData();
  }, [timeWindow]);

  const fetchAllData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch all data in parallel (no auth headers needed - follows tokenAnalytics pattern)
      const [statsRes, violationsRes, activityRes, violatorsRes, breakdownRes] = await Promise.all([
        fetch(`/api/analytics/guards/stats?hours=${timeWindow}`),
        fetch(`/api/analytics/guards/violations?hours=${timeWindow}&limit=50`),
        fetch(`/api/analytics/guards/activity-over-time?hours=${timeWindow}`),
        fetch(`/api/analytics/guards/top-violators?hours=${timeWindow}&limit=10`),
        fetch(`/api/analytics/guards/type-breakdown?hours=${timeWindow}`)
      ]);

      if (!statsRes.ok || !violationsRes.ok || !activityRes.ok || !violatorsRes.ok || !breakdownRes.ok) {
        throw new Error('Failed to fetch guard analytics data');
      }

      const [statsData, violationsData, activityData, violatorsData, breakdownData] = await Promise.all([
        statsRes.json(),
        violationsRes.json(),
        activityRes.json(),
        violatorsRes.json(),
        breakdownRes.json()
      ]);

      setStats(statsData.data);
      setViolations(violationsData.data);
      setActivity(activityData.data);
      setTopViolators(violatorsData.data);
      setTypeBreakdown(breakdownData.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load guard analytics');
      console.error('Error fetching guard analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-power100-red mx-auto mb-4"></div>
          <p className="text-gray-600">Loading guard analytics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600">Error Loading Dashboard</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={() => fetchAllData()}
              className="bg-power100-red text-white px-4 py-2 rounded hover:bg-red-700"
            >
              Retry
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-power100-bg-grey p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-power100-black">Guard Monitoring Dashboard</h1>
            <p className="text-gray-600">Real-time AI action guard analytics and violation tracking</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setTimeWindow(24)}
              className={`px-4 py-2 rounded ${timeWindow === 24 ? 'bg-power100-red text-white' : 'bg-white text-gray-700'}`}
            >
              24 Hours
            </button>
            <button
              onClick={() => setTimeWindow(168)}
              className={`px-4 py-2 rounded ${timeWindow === 168 ? 'bg-power100-red text-white' : 'bg-white text-gray-700'}`}
            >
              7 Days
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Checks</CardTitle>
                <Shield className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalChecks.toLocaleString()}</div>
                <p className="text-xs text-gray-600 mt-1">Last {stats.timeWindow}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Checks Passed</CardTitle>
                <Activity className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{stats.checksPassed.toLocaleString()}</div>
                <p className="text-xs text-gray-600 mt-1">
                  {stats.totalChecks > 0 ? ((stats.checksPassed / stats.totalChecks) * 100).toFixed(1) : 0}% pass rate
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Checks Blocked</CardTitle>
                <ShieldAlert className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{stats.checksBlocked.toLocaleString()}</div>
                <p className="text-xs text-gray-600 mt-1">
                  {stats.totalChecks > 0 ? ((stats.checksBlocked / stats.totalChecks) * 100).toFixed(1) : 0}% block rate
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Unique Contractors</CardTitle>
                <Users className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.uniqueContractors.toLocaleString()}</div>
                <p className="text-xs text-gray-600 mt-1">
                  {stats.avgOperationsPerContractor.toFixed(1)} avg checks/contractor
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Tabs */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="bg-white">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="violations">Violations</TabsTrigger>
            <TabsTrigger value="violators">Top Violators</TabsTrigger>
            <TabsTrigger value="types">Guard Types</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Guard Activity Over Time</CardTitle>
                <CardDescription>Hourly breakdown of guard checks</CardDescription>
              </CardHeader>
              <CardContent>
                {activity.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={activity}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="hour"
                        tickFormatter={(value) => new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      />
                      <YAxis />
                      <Tooltip
                        labelFormatter={(value) => new Date(value).toLocaleString()}
                      />
                      <Legend />
                      <Line type="monotone" dataKey="totalChecks" stroke="#3b82f6" name="Total Checks" />
                      <Line type="monotone" dataKey="checksPassed" stroke="#10b981" name="Passed" />
                      <Line type="monotone" dataKey="checksBlocked" stroke="#ef4444" name="Blocked" />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-center text-gray-500 py-8">No activity data available</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Violations Tab */}
          <TabsContent value="violations" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Recent Violations</CardTitle>
                <CardDescription>Last 50 blocked guard checks</CardDescription>
              </CardHeader>
              <CardContent>
                {violations.length > 0 ? (
                  <div className="space-y-4">
                    {violations.map((violation) => (
                      <div key={violation.id} className="border-b pb-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-semibold">{violation.contractorName}</p>
                            <p className="text-sm text-gray-600">{violation.email}</p>
                            <p className="text-xs text-gray-500">{violation.companyName}</p>
                          </div>
                          <Badge variant="destructive">{violation.guardType}</Badge>
                        </div>
                        <p className="text-sm mt-2 text-gray-700">{violation.reason}</p>
                        {violation.currentCount !== null && violation.limit !== null && (
                          <p className="text-xs text-gray-600 mt-1">
                            Usage: {violation.currentCount}/{violation.limit}
                            {violation.retryAfter && ` • Retry in ${Math.ceil(violation.retryAfter / 60)} min`}
                          </p>
                        )}
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(violation.timestamp).toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-gray-500 py-8">No violations in the selected time window</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Top Violators Tab */}
          <TabsContent value="violators" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Top Violators</CardTitle>
                <CardDescription>Contractors with most blocked checks</CardDescription>
              </CardHeader>
              <CardContent>
                {topViolators.length > 0 ? (
                  <div className="space-y-4">
                    {topViolators.map((violator, index) => (
                      <div key={violator.contractorId} className="flex items-center gap-4 border-b pb-4">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-red-100 text-red-600 flex items-center justify-center font-bold">
                          {index + 1}
                        </div>
                        <div className="flex-grow">
                          <p className="font-semibold">{violator.contractorName}</p>
                          <p className="text-sm text-gray-600">{violator.email}</p>
                          <p className="text-xs text-gray-500">{violator.companyName}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-red-600">{violator.violationCount}</p>
                          <p className="text-xs text-gray-500">violations</p>
                          <p className="text-xs text-gray-500 mt-1">
                            Last: {new Date(violator.lastViolation).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-gray-500 py-8">No violations in the selected time window</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Guard Types Tab */}
          <TabsContent value="types" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Guard Type Breakdown</CardTitle>
                <CardDescription>Performance by guard type</CardDescription>
              </CardHeader>
              <CardContent>
                {typeBreakdown.length > 0 ? (
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={typeBreakdown}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="guardType" angle={-45} textAnchor="end" height={100} />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="checksPassed" fill="#10b981" name="Passed" />
                      <Bar dataKey="checksBlocked" fill="#ef4444" name="Blocked" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-center text-gray-500 py-8">No guard type data available</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
