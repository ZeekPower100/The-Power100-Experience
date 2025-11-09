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
  Target,
  Calendar,
  TrendingUp,
  TrendingDown,
  Minus,
  ArrowLeft,
  Eye,
  Users,
  Trophy,
  BarChart3,
  Download
} from 'lucide-react';
import { motion } from 'framer-motion';
import { getApiUrl } from '@/utils/api';
import { getFromStorage, handleApiResponse } from '../../../../utils/jsonHelpers';

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
}

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function ContractorReportDetailPage({ params }: PageProps) {
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
      const token = getFromStorage('contractorToken');
      if (!token) {
        router.push('/contractor/login');
        return;
      }

      // Load report
      const response = await fetch(getApiUrl(`api/reports/${reportId}`), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to load report');
      }

      const data = await handleApiResponse(response);
      setReport(data.report);

      // Mark as viewed
      await fetch(getApiUrl(`api/reports/${reportId}/viewed`), {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        }
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

  function getVarianceColor(variance: string) {
    if (variance.startsWith('+')) {
      return 'text-green-600 bg-green-50 border-green-200';
    } else if (variance.startsWith('-')) {
      return 'text-red-600 bg-red-50 border-red-200';
    }
    return 'text-gray-600 bg-gray-50 border-gray-200';
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
          <Link href="/contractor/reports">
            <Button variant="outline" className="mt-4 border-2 border-gray-200">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Reports
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const tierPerformance = report.report_data?.current_tier_performance;
  const tierName = tierPerformance?.tier || 'Your Tier';

  return (
    <div className="min-h-screen bg-power100-bg-grey">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-start">
            <div>
              <Link href="/contractor/reports">
                <Button variant="ghost" className="mb-2 -ml-2">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Reports
                </Button>
              </Link>
              <h1 className="text-3xl font-bold text-power100-black flex items-center gap-2">
                {report.quarter} {report.year} Performance Report
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
              <Button
                onClick={async () => {
                  try {
                    const token = getFromStorage('contractorToken');
                    const API_BASE_URL = getApiUrl();
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
                className="bg-power100-green hover:bg-green-600 text-white font-semibold"
              >
                <Download className="h-4 w-4 mr-2" />
                Download PDF
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid gap-6">
          {/* Tier Performance Comparison */}
          {tierPerformance && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="bg-white shadow-lg border-2 border-power100-green">
                <CardHeader>
                  <CardTitle className="text-2xl flex items-center gap-2">
                    <Trophy className="h-6 w-6 text-power100-green" />
                    Your Performance vs. {tierName} Peers
                  </CardTitle>
                  <CardDescription>
                    See how you compare to other contractors in your revenue tier
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(tierPerformance.metrics || {}).map(([metricName, metricData]: [string, any]) => {
                      if (!metricData) return null;
                      return (
                        <div
                          key={metricName}
                          className={`rounded-lg border-2 p-6 ${
                            metricData.trend === 'up' ? 'border-green-500 bg-green-50' :
                            metricData.trend === 'down' ? 'border-red-500 bg-red-50' :
                            'border-gray-400 bg-gray-50'
                          }`}
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <h3 className="font-semibold text-power100-black text-lg">{metricName}</h3>
                              <p className="text-sm text-power100-grey mt-1">
                                {metricData.comparison || 'vs. peer average'}
                              </p>
                            </div>
                            {getTrendIcon(metricData.trend)}
                          </div>
                          <div className={`inline-block px-4 py-2 rounded-lg border-2 ${getVarianceColor(metricData.variance)}`}>
                            <p className="text-3xl font-bold">
                              {metricData.variance}
                            </p>
                          </div>
                          {metricData.insight && (
                            <p className="text-sm text-power100-grey mt-3 italic">
                              {metricData.insight}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Tier Averages */}
          {tierPerformance?.tier_averages && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card className="bg-white shadow-lg">
                <CardHeader>
                  <CardTitle className="text-2xl flex items-center gap-2">
                    <BarChart3 className="h-6 w-6 text-blue-600" />
                    {tierName} Benchmarks
                  </CardTitle>
                  <CardDescription>
                    Industry standards for your revenue tier
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {Object.entries(tierPerformance.tier_averages || {}).map(([metricName, avgValue]: [string, any]) => (
                      <div key={metricName} className="bg-power100-bg-grey rounded-lg p-4">
                        <p className="text-sm text-power100-grey mb-1">{metricName}</p>
                        <p className="text-2xl font-bold text-power100-black">
                          {avgValue}
                        </p>
                        <p className="text-xs text-power100-grey mt-1">Tier average</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Key Insights */}
          {report.report_data?.insights && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="bg-white shadow-lg">
                <CardHeader>
                  <CardTitle className="text-2xl flex items-center gap-2">
                    <Target className="h-6 w-6 text-power100-red" />
                    Key Insights
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {report.report_data.insights.strengths?.length > 0 && (
                      <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
                        <h4 className="font-semibold text-green-800 mb-2 flex items-center gap-2">
                          <Trophy className="h-5 w-5" />
                          Your Strengths
                        </h4>
                        <ul className="list-disc list-inside space-y-1 text-green-700">
                          {report.report_data.insights.strengths.map((item: string, index: number) => (
                            <li key={index}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {report.report_data.insights.opportunities?.length > 0 && (
                      <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4">
                        <h4 className="font-semibold text-yellow-800 mb-2 flex items-center gap-2">
                          <TrendingUp className="h-5 w-5" />
                          Growth Opportunities
                        </h4>
                        <ul className="list-disc list-inside space-y-1 text-yellow-700">
                          {report.report_data.insights.opportunities.map((item: string, index: number) => (
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
                      <Eye className="h-3 w-3" />
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
                  <p className="text-power100-grey">Responses</p>
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
