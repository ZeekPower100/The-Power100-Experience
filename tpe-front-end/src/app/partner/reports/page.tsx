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
  Mail,
  TrendingUp,
  Download,
  Filter,
  Search
} from 'lucide-react';
import { motion } from 'framer-motion';
import { safeJsonParse, getFromStorage } from '../../../utils/jsonHelpers';

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

export default function PartnerReportsPage() {
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
      const token = getFromStorage('partnerToken');
      const partnerInfoStr = getFromStorage('partnerInfo');

      if (!token || !partnerInfoStr) {
        router.push('/partner');
        return;
      }

      const partnerInfo = safeJsonParse(partnerInfoStr);
      const partnerId = partnerInfo?.id;

      if (!partnerId) {
        setError('Partner ID not found');
        setLoading(false);
        return;
      }

      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
      const response = await fetch(
        `${API_BASE_URL}/reports/partner/${partnerId}/all`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (!response.ok) {
        throw new Error('Failed to load reports');
      }

      const data = await response.json();
      // report_data is already parsed from JSONB in API response
      setReports(data.reports || []);
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

  async function markReportViewed(reportId: number) {
    try {
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
      await fetch(`${API_BASE_URL}/reports/${reportId}/viewed`, {
        method: 'PATCH'
      });
    } catch (error) {
      console.error('Error marking report as viewed:', error);
    }
  }

  function viewReport(report: Report) {
    markReportViewed(report.id);
    router.push(`/partner/reports/${report.id}`);
  }

  function getStatusBadgeColor(status: string) {
    switch (status) {
      case 'viewed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'delivered':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'generated':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'draft':
        return 'bg-gray-100 text-gray-800 border-gray-200';
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
                <FileText className="h-8 w-8 text-power100-red" />
                Quarterly Performance Reports
              </h1>
              <p className="text-power100-grey mt-1">
                View your executive performance reports and customer feedback analytics
              </p>
            </div>
            <Link href="/partner/dashboard">
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
                  ? 'Reports are generated after each quarterly feedback cycle completes.'
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
                  className="bg-white hover:shadow-lg transition-all cursor-pointer border-2 hover:border-power100-red"
                  onClick={() => viewReport(report)}
                >
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-power100-red rounded-full flex items-center justify-center">
                          <FileText className="h-6 w-6 text-white" />
                        </div>
                        <div>
                          <CardTitle className="text-xl text-power100-black">
                            {report.quarter} {report.year} Executive Report
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
                    {/* Performance Summary (if report_data available) */}
                    {report.report_data?.performance_summary && (
                      <div className="bg-power100-bg-grey rounded-lg p-4 mb-4">
                        <h4 className="font-semibold text-power100-black mb-3">Performance Summary</h4>
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <p className="text-sm text-power100-grey">Overall Satisfaction</p>
                            <p className="text-2xl font-bold text-power100-black">
                              {report.report_data.performance_summary.overall_satisfaction}/100
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-power100-grey">NPS Score</p>
                            <p className="text-2xl font-bold text-power100-black">
                              {report.report_data.performance_summary.nps_score}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-power100-grey">Total Feedback</p>
                            <p className="text-2xl font-bold text-power100-black">
                              {report.report_data.performance_summary.total_feedback}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Delivery Status */}
                    <div className="flex flex-wrap gap-4 text-sm text-power100-grey">
                      {report.delivered_at && (
                        <div className="flex items-center gap-1">
                          <Mail className="h-4 w-4 text-green-600" />
                          Delivered: {new Date(report.delivered_at).toLocaleDateString()}
                        </div>
                      )}
                      {report.viewed_at && (
                        <div className="flex items-center gap-1">
                          <Eye className="h-4 w-4 text-blue-600" />
                          Viewed: {new Date(report.viewed_at).toLocaleDateString()}
                        </div>
                      )}
                      {!report.delivered_at && report.status === 'generated' && (
                        <div className="flex items-center gap-1 text-purple-600">
                          <TrendingUp className="h-4 w-4" />
                          Ready to send
                        </div>
                      )}
                    </div>

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
                        View Full Report
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
