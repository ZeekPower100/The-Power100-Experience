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

import { useState, useEffect, use } from 'react';
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
  params: Promise<{
    id: string;
  }>;
}

export default function PartnerReportDetailPage({ params }: PageProps) {
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();
  const resolvedParams = use(params);
  const reportId = resolvedParams.id;

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
    <div className="min-h-screen bg-white">
      {/* Header - Clean with Purple Accent */}
      <div className="bg-white border-b-2 border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-between items-start">
            <div>
              <Link href="/partner/reports">
                <Button variant="ghost" className="mb-4 -ml-2 hover:bg-gray-100">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Reports
                </Button>
              </Link>
              <div className="inline-block bg-red-100 text-red-600 px-4 py-2 rounded-full text-sm font-semibold mb-4">
                Quarterly Report
              </div>
              <h1 className="text-4xl md:text-5xl font-bold text-black mb-3 flex items-center gap-3">
                <div className="w-14 h-14 bg-purple-600 rounded-2xl flex items-center justify-center flex-shrink-0">
                  <FileText className="h-7 w-7 text-white" />
                </div>
                {report.quarter} {report.year} Executive Report
              </h1>
              <p className="text-gray-600 text-lg flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Generated {new Date(report.generation_date).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <span className={`${
                report.status === 'viewed' ? 'bg-green-100 text-green-800 border-green-200' :
                report.status === 'delivered' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                'bg-gray-100 text-gray-800 border-gray-200'
              } border-2 text-sm px-4 py-2 rounded-full font-semibold`}>
                {report.status.charAt(0).toUpperCase() + report.status.slice(1)}
              </span>
              <Button
                onClick={async () => {
                  try {
                    const token = getFromStorage('partnerToken');
                    const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
                    const response = await fetch(`${API_BASE_URL}/reports/${reportId}/pdf/download`, {
                      headers: { 'Authorization': `Bearer ${token}` }
                    });
                    const data = await response.json();
                    if (data.success) {
                      window.open(data.downloadUrl, '_blank');
                    } else {
                      alert('Failed to generate download link');
                    }
                  } catch (error) {
                    console.error('Error downloading PDF:', error);
                    alert('Failed to download PDF');
                  }
                }}
                className="bg-black hover:bg-gray-900 text-white font-semibold px-6 py-3 rounded-xl shadow-lg"
              >
                <Download className="h-4 w-4 mr-2" />
                Download PDF
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid gap-12">
          {/* Performance Summary - Modern Design with Effects */}
          {performanceSummary && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="group bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-gray-100 overflow-hidden">
                <div className="p-10">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 bg-purple-600 rounded-full"></div>
                    <h2 className="text-3xl font-bold text-black">Performance Summary</h2>
                  </div>
                  <p className="text-gray-600 mb-10 text-lg">
                    Overall customer satisfaction metrics for {report.quarter} {report.year}
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Overall Satisfaction */}
                    <div className="group/card relative bg-white rounded-2xl p-8 text-center shadow-md hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-gray-100">
                      <div className="absolute inset-0 bg-gradient-to-br from-green-500 to-emerald-600 opacity-0 group-hover/card:opacity-5 rounded-2xl transition-opacity duration-300"></div>
                      <div className="relative">
                        <p className="text-xs font-semibold text-gray-600 mb-3 uppercase tracking-wide">Overall Satisfaction</p>
                        <p className="text-5xl font-bold text-black mb-3">
                          {performanceSummary.overall_satisfaction}
                          <span className="text-2xl text-gray-400">/100</span>
                        </p>
                        {performanceSummary.satisfaction_trend && (
                          <div className="flex justify-center">
                            {getTrendIcon(performanceSummary.satisfaction_trend)}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* NPS Score */}
                    <div className="group/card relative bg-white rounded-2xl p-8 text-center shadow-md hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-gray-100">
                      <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-cyan-600 opacity-0 group-hover/card:opacity-5 rounded-2xl transition-opacity duration-300"></div>
                      <div className="relative">
                        <p className="text-xs font-semibold text-gray-600 mb-3 uppercase tracking-wide">Net Promoter Score</p>
                        <p className="text-5xl font-bold text-black mb-3">
                          {performanceSummary.nps_score}
                        </p>
                        {performanceSummary.nps_trend && (
                          <div className="flex justify-center">
                            {getTrendIcon(performanceSummary.nps_trend)}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Total Feedback */}
                    <div className="group/card relative bg-white rounded-2xl p-8 text-center shadow-md hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-gray-100">
                      <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-violet-600 opacity-0 group-hover/card:opacity-5 rounded-2xl transition-opacity duration-300"></div>
                      <div className="relative">
                        <p className="text-xs font-semibold text-gray-600 mb-3 uppercase tracking-wide">Total Responses</p>
                        <p className="text-5xl font-bold text-black mb-3">
                          {performanceSummary.total_feedback}
                        </p>
                        <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
                          <Users className="h-4 w-4" />
                          Customers surveyed
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Custom Metrics - Modern Design with Effects */}
          {customMetrics.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <div className="group bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-gray-100 overflow-hidden">
                <div className="p-10">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 bg-purple-600 rounded-full"></div>
                    <h2 className="text-3xl font-bold text-black">Your Custom Metrics</h2>
                  </div>
                  <p className="text-gray-600 mb-10 text-lg">
                    Performance across your unique business metrics
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {customMetrics.map((metric: any, index: number) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 + index * 0.1 }}
                        className={`group/metric rounded-2xl border-l-4 p-8 shadow-md hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 ${
                          metric.trend === 'up' ? 'border-green-500 bg-green-50' :
                          metric.trend === 'down' ? 'border-red-500 bg-red-50' :
                          'border-gray-400 bg-gray-50'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-4">
                          <h3 className="font-bold text-black text-lg">{metric.name}</h3>
                          {getTrendIcon(metric.trend)}
                        </div>
                        <p className="text-5xl font-bold text-black mb-4">
                          {metric.average !== null && metric.average !== undefined ? metric.average : 'N/A'}
                        </p>
                        <p className={`text-sm ${getTrendColor(metric.trend)} px-4 py-2 rounded-full inline-block font-semibold`}>
                          {metric.trend_description || metric.trend}
                        </p>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Feedback Highlights - Modern Design with Effects */}
          {report.report_data?.feedback_highlights && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <div className="group bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-gray-100 overflow-hidden">
                <div className="p-10">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 bg-purple-600 rounded-full"></div>
                    <h2 className="text-3xl font-bold text-black">Customer Feedback Highlights</h2>
                  </div>
                  <p className="text-gray-600 mb-10 text-lg">Key insights from customer responses</p>

                  <div className="space-y-8">
                    {report.report_data.feedback_highlights.positive?.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 }}
                        className="group/feedback bg-green-50 border-2 border-green-200 rounded-2xl p-8 hover:shadow-xl transition-all duration-300"
                      >
                        <h4 className="font-bold text-green-900 mb-6 text-xl flex items-center gap-2">
                          ✓ Top Strengths
                        </h4>
                        <ul className="space-y-4">
                          {report.report_data.feedback_highlights.positive.map((item: string, index: number) => (
                            <li key={index} className="flex items-start gap-3 text-green-800 text-base">
                              <span className="text-green-500 font-bold flex-shrink-0 text-lg">•</span>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </motion.div>
                    )}

                    {report.report_data.feedback_highlights.improvement?.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.4 }}
                        className="group/feedback bg-yellow-50 border-2 border-yellow-200 rounded-2xl p-8 hover:shadow-xl transition-all duration-300"
                      >
                        <h4 className="font-bold text-yellow-900 mb-6 text-xl flex items-center gap-2">
                          ⚡ Areas for Improvement
                        </h4>
                        <ul className="space-y-4">
                          {report.report_data.feedback_highlights.improvement.map((item: string, index: number) => (
                            <li key={index} className="flex items-start gap-3 text-yellow-800 text-base">
                              <span className="text-yellow-500 font-bold flex-shrink-0 text-lg">•</span>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </motion.div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Report Metadata - Modern Design with Effects */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-gray-50 border-2 border-gray-200 rounded-2xl p-10 shadow-md hover:shadow-lg transition-all duration-300"
          >
            <h3 className="text-xl font-bold text-black mb-8 flex items-center gap-2">
              <div className="w-2 h-2 bg-purple-600 rounded-full"></div>
              Report Information
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              <div>
                <p className="text-xs font-semibold text-gray-600 mb-3 uppercase tracking-wide">Generated</p>
                <p className="font-bold text-black text-lg">
                  {new Date(report.generation_date).toLocaleDateString()}
                </p>
              </div>
              {report.delivered_at && (
                <div>
                  <p className="text-xs font-semibold text-gray-600 mb-3 uppercase tracking-wide flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    Delivered
                  </p>
                  <p className="font-bold text-black text-lg">
                    {new Date(report.delivered_at).toLocaleDateString()}
                  </p>
                </div>
              )}
              {report.viewed_at && (
                <div>
                  <p className="text-xs font-semibold text-gray-600 mb-3 uppercase tracking-wide flex items-center gap-1">
                    <Eye className="h-3 w-3" />
                    First Viewed
                  </p>
                  <p className="font-bold text-black text-lg">
                    {new Date(report.viewed_at).toLocaleDateString()}
                  </p>
                </div>
              )}
              <div>
                <p className="text-xs font-semibold text-gray-600 mb-3 uppercase tracking-wide">Total Responses</p>
                <p className="font-bold text-black text-lg">{report.total_responses}</p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
