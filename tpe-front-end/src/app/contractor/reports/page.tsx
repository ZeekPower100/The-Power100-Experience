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
  Eye,
  TrendingUp,
  TrendingDown,
  Minus,
  Filter,
  Target
} from 'lucide-react';
import { motion } from 'framer-motion';
import { getApiUrl } from '@/utils/api';
import { getFromStorage, handleApiResponse } from '../../../utils/jsonHelpers';

interface Report {
  id: number;
  quarter: string;
  year: number;
  report_type: string;
  report_data: any;  // JSONB already parsed from API
  status: string;
  generation_date: string;
  delivered_at: string | null;
  viewed_at: string | null;
}

export default function ContractorReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [filteredReports, setFilteredReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedQuarter, setSelectedQuarter] = useState<string>('all');
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const router = useRouter();

  useEffect(() => {
    loadReports();
  }, []);

  useEffect(() => {
    filterReports();
  }, [reports, selectedQuarter, selectedYear]);

  async function loadReports() {
    try {
      const token = getFromStorage('contractorToken');

      if (!token) {
        router.push('/contractor/login');
        return;
      }

      // Get contractor info from profile
      const profileResponse = await fetch(getApiUrl('api/contractor-auth/profile'), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!profileResponse.ok) {
        if (profileResponse.status === 401) {
          router.push('/contractor/login');
          return;
        }
        throw new Error('Failed to fetch profile');
      }

      const profileData = await handleApiResponse(profileResponse);
      const contractorId = profileData.profile?.contractorId;

      if (!contractorId) {
        setError('Contractor ID not found');
        setLoading(false);
        return;
      }

      // Fetch contractor reports
      const reportsResponse = await fetch(
        getApiUrl(`api/reports/contractor/${contractorId}/all`),
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!reportsResponse.ok) {
        throw new Error('Failed to load reports');
      }

      const reportsData = await handleApiResponse(reportsResponse);
      // report_data is already parsed from JSONB in API response
      setReports(reportsData.reports || []);
    } catch (error) {
      console.error('Error loading reports:', error);
      setError('Failed to load reports. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function filterReports() {
    let filtered = [...reports];

    if (selectedQuarter !== 'all') {
      filtered = filtered.filter(r => r.quarter === selectedQuarter);
    }

    if (selectedYear !== 'all') {
      filtered = filtered.filter(r => r.year.toString() === selectedYear);
    }

    setFilteredReports(filtered);
  }

  async function markReportViewed(reportId: number, contractorId: number) {
    try {
      await fetch(getApiUrl(`api/reports/${reportId}/viewed`), {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ contractor_id: contractorId })
      });
    } catch (error) {
      console.error('Error marking report as viewed:', error);
    }
  }

  function viewReport(report: Report) {
    // Get contractor ID from profile (stored in session)
    const contractorInfoStr = getFromStorage('contractorInfo');
    if (contractorInfoStr) {
      const contractorInfo = JSON.parse(contractorInfoStr);
      markReportViewed(report.id, contractorInfo.contractorId);
    }
    router.push(`/contractor/reports/${report.id}`);
  }

  function getVarianceIcon(variance: string) {
    if (variance.startsWith('+')) {
      return <TrendingUp className="h-4 w-4 text-green-600" />;
    } else if (variance.startsWith('-')) {
      return <TrendingDown className="h-4 w-4 text-red-600" />;
    }
    return <Minus className="h-4 w-4 text-gray-400" />;
  }

  function getStatusBadgeColor(status: string) {
    switch (status) {
      case 'viewed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'delivered':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'generated':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  }

  const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];
  const years = [...new Set(reports.map(r => r.year))].sort((a, b) => b - a);

  if (loading) {
    return (
      <div className="min-h-screen bg-power100-bg-grey flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-power100-red mx-auto mb-4"></div>
          <p className="text-power100-grey">Loading your reports...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-power100-bg-grey">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-power100-black flex items-center gap-2">
                <Target className="h-8 w-8 text-power100-red" />
                Your Performance Reports
              </h1>
              <p className="text-power100-grey mt-1">
                See how you're performing compared to peers in your revenue tier
              </p>
            </div>
            <Link href="/contractor/dashboard">
              <Button variant="outline" className="border-2 border-gray-200">
                Back to Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <Alert className="mb-6 border-red-200 bg-red-50">
            <AlertDescription className="text-red-800">{error}</AlertDescription>
          </Alert>
        )}

        {/* Filters */}
        {reports.length > 0 && (
          <Card className="mb-6 bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Filter className="h-5 w-5 text-power100-red" />
                Filter Reports
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-power100-grey">Quarter</label>
                  <select
                    value={selectedQuarter}
                    onChange={(e) => setSelectedQuarter(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-power100-red"
                  >
                    <option value="all">All Quarters</option>
                    {quarters.map(q => (
                      <option key={q} value={q}>{q}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-power100-grey">Year</label>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-power100-red"
                  >
                    <option value="all">All Years</option>
                    {years.map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>

                {(selectedQuarter !== 'all' || selectedYear !== 'all') && (
                  <div className="flex items-end">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSelectedQuarter('all');
                        setSelectedYear('all');
                      }}
                      className="border-2 border-gray-200"
                    >
                      Clear Filters
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Reports List */}
        {filteredReports.length === 0 ? (
          <Card className="bg-white shadow-sm">
            <CardContent className="p-12 text-center">
              <FileText className="h-16 w-16 text-power100-grey mx-auto mb-4 opacity-50" />
              <h3 className="text-xl font-semibold text-power100-black mb-2">
                {reports.length === 0 ? 'No reports available yet' : 'No reports match your filters'}
              </h3>
              <p className="text-power100-grey">
                {reports.length === 0
                  ? 'Your performance reports will appear here after you complete quarterly feedback surveys.'
                  : 'Try adjusting your filters to see more reports.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6">
            {filteredReports.map((report, index) => (
              <motion.div
                key={report.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card
                  className="bg-white hover:shadow-lg transition-all cursor-pointer border-2 hover:border-power100-green"
                  onClick={() => viewReport(report)}
                >
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-power100-green rounded-full flex items-center justify-center">
                          <Target className="h-6 w-6 text-white" />
                        </div>
                        <div>
                          <CardTitle className="text-xl text-power100-black">
                            {report.quarter} {report.year} Performance Report
                          </CardTitle>
                          <CardDescription className="flex items-center gap-2 mt-1">
                            <Calendar className="h-4 w-4" />
                            Generated: {new Date(report.generation_date).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </CardDescription>
                        </div>
                      </div>
                      <Badge variant="outline" className={`${getStatusBadgeColor(report.status)} border`}>
                        {report.status.charAt(0).toUpperCase() + report.status.slice(1)}
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent>
                    {/* Tier Performance Preview (if available) */}
                    {report.report_data?.current_tier_performance && (
                      <div className="bg-power100-bg-grey rounded-lg p-4 mb-4">
                        <h4 className="font-semibold text-power100-black mb-2">
                          Performance vs. {report.report_data.current_tier_performance.tier} Peers
                        </h4>
                        <div className="grid grid-cols-2 gap-3">
                          {Object.entries(report.report_data.current_tier_performance.metrics || {}).slice(0, 4).map(([metricName, metricData]: [string, any]) => (
                            <div key={metricName} className="flex items-center justify-between">
                              <span className="text-sm text-power100-grey">{metricName}</span>
                              <div className="flex items-center gap-1">
                                <span className={`font-semibold ${
                                  metricData.trend === 'up' ? 'text-green-600' :
                                  metricData.trend === 'down' ? 'text-red-600' :
                                  'text-gray-600'
                                }`}>
                                  {metricData.variance}
                                </span>
                                {getVarianceIcon(metricData.variance)}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* View Report Button */}
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <Button
                        className="w-full bg-power100-green hover:bg-green-600 text-white font-semibold"
                        onClick={(e) => {
                          e.stopPropagation();
                          viewReport(report);
                        }}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View Detailed Report
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
