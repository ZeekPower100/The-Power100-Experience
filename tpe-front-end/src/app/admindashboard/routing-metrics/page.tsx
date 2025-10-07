"use client";

/**
 * Routing Metrics Dashboard
 *
 * Displays real-time and historical AI routing performance metrics
 *
 * DATABASE-CHECKED: routing_logs columns verified on 2025-10-06
 * All metrics are pulled from routing_logs table with exact column names
 */

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { adminApi } from "@/lib/api";
import {
  Activity,
  Clock,
  TrendingUp,
  Brain,
  Zap,
  AlertTriangle,
  CheckCircle,
  BarChart3,
  RefreshCw,
  ArrowLeft
} from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";

interface RealtimeMetrics {
  performance: {
    avg_routing_time_ms: number;
    p95_routing_time_ms: number;
    target_routing_time_ms: number;
    performance_ok: boolean;
  };
  confidence: {
    avg_confidence: number;
    warning_threshold: number;
    low_confidence_count: number;
  };
  routing_methods: Record<string, number>;
  route_distribution: Record<string, number>;
  total_requests: number;
  cache_age_seconds: number;
}

interface HistoricalRoute {
  routing_method: string;
  route_to: string;
  count: number;
  avg_confidence: number;
  avg_processing_time_ms: number;
  p95_processing_time_ms: number;
}

interface HistoricalMetrics {
  period_hours: number;
  routes: HistoricalRoute[];
}

export default function RoutingMetricsDashboard() {
  const [realtimeMetrics, setRealtimeMetrics] = useState<RealtimeMetrics | null>(null);
  const [historicalMetrics, setHistoricalMetrics] = useState<HistoricalMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState(24);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchMetrics = async () => {
    try {
      setError(null);

      const [realtimeResponse, historicalResponse] = await Promise.all([
        adminApi.getRoutingMetricsRealtime(),
        adminApi.getRoutingMetricsHistorical(timeRange)
      ]);

      if (realtimeResponse.success) {
        setRealtimeMetrics(realtimeResponse.data);
      }

      if (historicalResponse.success) {
        setHistoricalMetrics(historicalResponse.data);
      }

      setLoading(false);
    } catch (err: any) {
      console.error('Error fetching routing metrics:', err);
      setError(err.message || 'Failed to load metrics');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();

    // Auto-refresh every 30 seconds if enabled
    let interval: NodeJS.Timeout;
    if (autoRefresh) {
      interval = setInterval(fetchMetrics, 30000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timeRange, autoRefresh]);

  const handleResetCache = async () => {
    try {
      await adminApi.resetRoutingMetrics();
      fetchMetrics();
    } catch (err: any) {
      setError(err.message || 'Failed to reset metrics');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-power100-bg-grey p-8">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <RefreshCw className="h-12 w-12 text-power100-red animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Loading routing metrics...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-power100-bg-grey p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link href="/admindashboard">
            <Button variant="outline" className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>

          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-power100-black">AI Routing Metrics</h1>
              <p className="text-gray-600 mt-2">Real-time performance monitoring for SMS routing decisions</p>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={autoRefresh ? 'border-power100-green' : ''}
              >
                <Activity className={`h-4 w-4 mr-2 ${autoRefresh ? 'animate-pulse' : ''}`} />
                {autoRefresh ? 'Auto-Refresh ON' : 'Auto-Refresh OFF'}
              </Button>

              <Button onClick={fetchMetrics} variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh Now
              </Button>

              <Button onClick={handleResetCache} variant="outline" className="text-red-600">
                Reset Cache
              </Button>
            </div>
          </div>
        </div>

        {error && (
          <Alert className="mb-6 bg-red-50 border-red-200">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">{error}</AlertDescription>
          </Alert>
        )}

        {/* Real-time Performance Cards */}
        {realtimeMetrics && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
          >
            {/* Average Routing Time */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
                  <Clock className="h-4 w-4 mr-2 text-power100-red" />
                  Avg Routing Time
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-power100-black">
                  {realtimeMetrics.performance.avg_routing_time_ms}ms
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  Target: {realtimeMetrics.performance.target_routing_time_ms}ms
                </p>
              </CardContent>
            </Card>

            {/* P95 Performance */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
                  <TrendingUp className="h-4 w-4 mr-2 text-power100-red" />
                  P95 Routing Time
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-power100-black">
                  {realtimeMetrics.performance.p95_routing_time_ms}ms
                </div>
                {realtimeMetrics.performance.performance_ok ? (
                  <Badge className="mt-2 bg-power100-green text-white">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    On Target
                  </Badge>
                ) : (
                  <Badge className="mt-2 bg-red-500 text-white">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    Slow
                  </Badge>
                )}
              </CardContent>
            </Card>

            {/* Average Confidence */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
                  <Brain className="h-4 w-4 mr-2 text-power100-red" />
                  Avg Confidence
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-power100-black">
                  {(realtimeMetrics.confidence.avg_confidence * 100).toFixed(0)}%
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  {realtimeMetrics.confidence.low_confidence_count} low confidence
                </p>
              </CardContent>
            </Card>

            {/* Total Requests */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
                  <Zap className="h-4 w-4 mr-2 text-power100-red" />
                  Total Requests
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-power100-black">
                  {realtimeMetrics.total_requests}
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  Cache age: {Math.floor(realtimeMetrics.cache_age_seconds / 60)}m
                </p>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Routing Methods Breakdown */}
        {realtimeMetrics && Object.keys(realtimeMetrics.routing_methods).length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-8"
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart3 className="h-5 w-5 mr-2 text-power100-red" />
                  Routing Methods Distribution (Real-time)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {Object.entries(realtimeMetrics.routing_methods).map(([method, count]) => (
                    <div key={method} className="text-center p-4 bg-gray-50 rounded-lg">
                      <div className="text-2xl font-bold text-power100-black">{count}</div>
                      <div className="text-sm text-gray-600 capitalize mt-1">{method}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Historical Metrics */}
        {historicalMetrics && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Historical Performance (Last {timeRange} Hours)</CardTitle>
                  <div className="flex gap-2">
                    <Button
                      variant={timeRange === 1 ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setTimeRange(1)}
                    >
                      1h
                    </Button>
                    <Button
                      variant={timeRange === 6 ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setTimeRange(6)}
                    >
                      6h
                    </Button>
                    <Button
                      variant={timeRange === 24 ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setTimeRange(24)}
                    >
                      24h
                    </Button>
                    <Button
                      variant={timeRange === 168 ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setTimeRange(168)}
                    >
                      7d
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {historicalMetrics.routes.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No routing data available for this time period
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-3 px-4 font-semibold text-gray-700">Method</th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-700">Route</th>
                          <th className="text-right py-3 px-4 font-semibold text-gray-700">Count</th>
                          <th className="text-right py-3 px-4 font-semibold text-gray-700">Avg Confidence</th>
                          <th className="text-right py-3 px-4 font-semibold text-gray-700">Avg Time</th>
                          <th className="text-right py-3 px-4 font-semibold text-gray-700">P95 Time</th>
                        </tr>
                      </thead>
                      <tbody>
                        {historicalMetrics.routes.map((route, index) => (
                          <tr key={index} className="border-b hover:bg-gray-50">
                            <td className="py-3 px-4">
                              <Badge variant="outline" className="capitalize">
                                {route.routing_method}
                              </Badge>
                            </td>
                            <td className="py-3 px-4 text-sm">{route.route_to}</td>
                            <td className="py-3 px-4 text-right font-semibold">{route.count}</td>
                            <td className="py-3 px-4 text-right">
                              {route.avg_confidence !== null
                                ? `${(route.avg_confidence * 100).toFixed(0)}%`
                                : 'N/A'}
                            </td>
                            <td className="py-3 px-4 text-right">
                              {route.avg_processing_time_ms !== null
                                ? `${route.avg_processing_time_ms}ms`
                                : 'N/A'}
                            </td>
                            <td className="py-3 px-4 text-right">
                              {route.p95_processing_time_ms !== null
                                ? `${route.p95_processing_time_ms}ms`
                                : 'N/A'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  );
}
