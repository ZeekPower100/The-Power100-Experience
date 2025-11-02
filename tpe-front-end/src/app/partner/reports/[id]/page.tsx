// DATABASE-CHECKED: partner_reports fields verified November 1, 2025
// ================================================================
// VERIFIED FIELD NAMES:
// - delivered_at (NOT deliveredAt)
// - viewed_at (NOT viewedAt)
// - report_data (NOT reportData) - JSONB already parsed
// - report_type (NOT reportType)
// - generation_date (NOT generationDate)
// ================================================================
// VERIFIED DATA TYPES:
// - report_data: JSONB (already parsed object from API)
// - delivered_at: TIMESTAMP (nullable)
// - viewed_at: TIMESTAMP (nullable)
// - status: VARCHAR ('draft', 'generated', 'delivered', 'viewed')
// ================================================================
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  FileText,
  Calendar,
  TrendingUp,
  TrendingDown,
  Minus,
  ArrowLeft,
  Download,
  Mail,
  Eye,
  Users,
  Star,
  MessageSquare
} from 'lucide-react';
import { motion } from 'framer-motion';
import { safeJsonParse, getFromStorage } from '../../../../utils/jsonHelpers';

interface Report {
  id: number;
  partner_id: number;
  quarter: string;
  year: number;
  report_type: string;
  report_data: any;  // JSONB already parsed from API
  status: string;
  generation_date: string;
  delivered_at: string | null;
  viewed_at: string | null;
  total_responses: number;
  avg_satisfaction: number;
  avg_nps: number;
  metric_1_name: string | null;
  metric_1_avg: number | null;
  metric_2_name: string | null;
  metric_2_avg: number | null;
  metric_3_name: string | null;
  metric_3_avg: number | null;
}

interface PageProps {
  params: {
    id: string;
  };
}

export default function PartnerReportDetailPage({ params }: PageProps) {
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();
  const reportId = params.id;

  useEffect(() => {
    loadReport();
  }, [reportId]);

  async function loadReport() {
    try {
      const token = getFromStorage('partnerToken');
      if (!token) {
        router.push('/partner');
        return;
      }

      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

      // Load report
      const response = await fetch(`${API_BASE_URL}/reports/${reportId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to load report');
      }

      const data = await response.json();
      setReport(data.report);

      // Mark as viewed
      await fetch(`${API_BASE_URL}/reports/${reportId}/viewed`, {
        method: 'PATCH'
      });

    } catch (error) {
      console.error('Error loading report:', error);
      setError('Failed to load report. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function getTrendIcon(trend: string) {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-5 w-5 text-green-600" />;
      case 'down':
        return <TrendingDown className="h-5 w-5 text-red-600" />;
      default:
        return <Minus className="h-5 w-5 text-gray-400" />;
    }
  }

  function getTrendColor(trend: string) {
    switch (trend) {
      case 'up':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'down':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-power100-bg-grey flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-power100-red mx-auto mb-4"></div>
          <p className="text-power100-grey">Loading report...</p>
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="min-h-screen bg-power100-bg-grey p-8">
        <div className="max-w-4xl mx-auto">
          <Alert className="border-red-200 bg-red-50">
            <AlertDescription className="text-red-800">
              {error || 'Report not found'}
            </AlertDescription>
          </Alert>
          <Link href="/partner/reports">
            <Button variant="outline" className="mt-4 border-2 border-gray-200">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Reports
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const performanceSummary = report.report_data?.performance_summary;
  const customMetrics = report.report_data?.custom_metrics || [];

  return (
    <div className="min-h-screen bg-power100-bg-grey">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-start">
            <div>
              <Link href="/partner/reports">
                <Button variant="ghost" className="mb-2 -ml-2">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Reports
                </Button>
              </Link>
              <h1 className="text-3xl font-bold text-power100-black flex items-center gap-2">
                {report.quarter} {report.year} Executive Report
              </h1>
              <p className="text-power100-grey mt-1 flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Generated {new Date(report.generation_date).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <Badge variant="outline" className={`${
                report.status === 'viewed' ? 'bg-green-100 text-green-800 border-green-200' :
                report.status === 'delivered' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                'bg-gray-100 text-gray-800 border-gray-200'
              } border text-sm px-3 py-1`}>
                {report.status.charAt(0).toUpperCase() + report.status.slice(1)}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid gap-6">
          {/* Performance Summary */}
          {performanceSummary && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="bg-white shadow-lg">
                <CardHeader>
                  <CardTitle className="text-2xl flex items-center gap-2">
                    <Star className="h-6 w-6 text-power100-red" />
                    Performance Summary
                  </CardTitle>
                  <CardDescription>
                    Overall customer satisfaction metrics for {report.quarter} {report.year}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Overall Satisfaction */}
                    <div className="bg-power100-bg-grey rounded-lg p-6 text-center">
                      <p className="text-sm font-medium text-power100-grey mb-2">Overall Satisfaction</p>
                      <p className="text-5xl font-bold text-power100-black mb-2">
                        {performanceSummary.overall_satisfaction}
                        <span className="text-2xl text-power100-grey">/100</span>
                      </p>
                      {performanceSummary.satisfaction_trend && getTrendIcon(performanceSummary.satisfaction_trend)}
                    </div>

                    {/* NPS Score */}
                    <div className="bg-power100-bg-grey rounded-lg p-6 text-center">
                      <p className="text-sm font-medium text-power100-grey mb-2">Net Promoter Score</p>
                      <p className="text-5xl font-bold text-power100-black mb-2">
                        {performanceSummary.nps_score}
                      </p>
                      {performanceSummary.nps_trend && getTrendIcon(performanceSummary.nps_trend)}
                    </div>

                    {/* Total Feedback */}
                    <div className="bg-power100-bg-grey rounded-lg p-6 text-center">
                      <p className="text-sm font-medium text-power100-grey mb-2">Total Responses</p>
                      <p className="text-5xl font-bold text-power100-black mb-2">
                        {performanceSummary.total_feedback}
                      </p>
                      <div className="flex items-center justify-center gap-1 text-sm text-power100-grey">
                        <Users className="h-4 w-4" />
                        Customers surveyed
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Custom Metrics */}
          {customMetrics.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card className="bg-white shadow-lg">
                <CardHeader>
                  <CardTitle className="text-2xl flex items-center gap-2">
                    <TrendingUp className="h-6 w-6 text-power100-green" />
                    Your Custom Metrics
                  </CardTitle>
                  <CardDescription>
                    Performance across your unique business metrics
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {customMetrics.map((metric: any, index: number) => (
                      <div
                        key={index}
                        className={`rounded-lg border-l-4 p-6 ${
                          metric.trend === 'up' ? 'border-green-500 bg-green-50' :
                          metric.trend === 'down' ? 'border-red-500 bg-red-50' :
                          'border-gray-400 bg-gray-50'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <h3 className="font-semibold text-power100-black">{metric.name}</h3>
                          {getTrendIcon(metric.trend)}
                        </div>
                        <p className="text-3xl font-bold text-power100-black mb-2">
                          {metric.average !== null && metric.average !== undefined ? metric.average : 'N/A'}
                        </p>
                        <p className={`text-sm ${getTrendColor(metric.trend)} px-2 py-1 rounded-md inline-block`}>
                          {metric.trend_description || metric.trend}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Feedback Highlights */}
          {report.report_data?.feedback_highlights && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="bg-white shadow-lg">
                <CardHeader>
                  <CardTitle className="text-2xl flex items-center gap-2">
                    <MessageSquare className="h-6 w-6 text-blue-600" />
                    Customer Feedback Highlights
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {report.report_data.feedback_highlights.positive?.length > 0 && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <h4 className="font-semibold text-green-800 mb-2">✓ Top Strengths</h4>
                        <ul className="list-disc list-inside space-y-1 text-green-700">
                          {report.report_data.feedback_highlights.positive.map((item: string, index: number) => (
                            <li key={index}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {report.report_data.feedback_highlights.improvement?.length > 0 && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <h4 className="font-semibold text-yellow-800 mb-2">⚡ Areas for Improvement</h4>
                        <ul className="list-disc list-inside space-y-1 text-yellow-700">
                          {report.report_data.feedback_highlights.improvement.map((item: string, index: number) => (
                            <li key={index}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Report Metadata */}
          <Card className="bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Report Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-power100-grey">Generated</p>
                  <p className="font-semibold text-power100-black">
                    {new Date(report.generation_date).toLocaleDateString()}
                  </p>
                </div>
                {report.delivered_at && (
                  <div>
                    <p className="text-power100-grey flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      Delivered
                    </p>
                    <p className="font-semibold text-power100-black">
                      {new Date(report.delivered_at).toLocaleDateString()}
                    </p>
                  </div>
                )}
                {report.viewed_at && (
                  <div>
                    <p className="text-power100-grey flex items-center gap-1">
                      <Eye className="h-3 w-3" />
                      First Viewed
                    </p>
                    <p className="font-semibold text-power100-black">
                      {new Date(report.viewed_at).toLocaleDateString()}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-power100-grey">Total Responses</p>
                  <p className="font-semibold text-power100-black">{report.total_responses}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
