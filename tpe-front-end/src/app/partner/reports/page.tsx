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
    <div className="min-h-screen bg-white">
      {/* Header - Clean Black/White with Red Accent */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center mb-6">
            <div className="inline-block bg-red-100 text-red-600 px-4 py-2 rounded-full text-sm font-semibold mb-4">
              Quarterly Reports
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-black mb-4">
              Performance Reports
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              View your executive performance reports and customer feedback analytics
            </p>
          </div>
          <div className="flex justify-center">
            <Link href="/partner/dashboard">
              <Button variant="outline" className="border-2 border-gray-900 hover:bg-gray-50 rounded-xl px-6 py-3 font-semibold text-black">
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

        {/* Filters - Clean with Subtle Purple Accent */}
        {reports.length > 0 && (
          <div className="bg-gray-50 rounded-2xl p-8 mb-12 border border-gray-200">
            <div className="flex items-center gap-3 mb-6">
              <Filter className="h-5 w-5 text-gray-700" />
              <h2 className="text-xl font-bold text-black">Filter Reports</h2>
            </div>

            <div className="flex flex-wrap gap-6">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-black uppercase tracking-wide">Quarter</label>
                <select
                  value={selectedQuarter}
                  onChange={(e) => setSelectedQuarter(e.target.value)}
                  className="px-6 py-3 border-2 border-gray-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 font-medium text-base transition-all duration-300"
                >
                  <option value="all">All Quarters</option>
                  {quarters.map(q => (
                    <option key={q} value={q}>{q}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-black uppercase tracking-wide">Year</label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="px-6 py-3 border-2 border-gray-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 font-medium text-base transition-all duration-300"
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
                    className="border-2 border-gray-900 hover:bg-gray-50 rounded-xl px-6 py-3 font-semibold transition-all duration-300"
                  >
                    Clear Filters
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Reports List - Modern Design */}
        {filteredReports.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <FileText className="h-20 w-20 text-gray-300 mx-auto mb-6" />
            <h3 className="text-2xl font-bold text-gray-900 mb-3">
              {reports.length === 0 ? 'No reports available yet' : 'No reports match your filters'}
            </h3>
            <p className="text-lg text-gray-600 max-w-md mx-auto">
              {reports.length === 0
                ? 'Reports are generated after each quarterly feedback cycle completes.'
                : 'Try adjusting your filters to see more reports.'}
            </p>
          </div>
        ) : (
          <div className="grid gap-8">
            {filteredReports.map((report, index) => (
              <motion.div
                key={report.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <div
                  className="group bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer border-2 border-gray-200 overflow-hidden"
                  onClick={() => viewReport(report)}
                >
                  {/* Card Header */}
                  <div className="p-8 border-b-2 border-gray-100">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-purple-600 rounded-2xl flex items-center justify-center flex-shrink-0">
                          <FileText className="h-8 w-8 text-white" />
                        </div>
                        <div>
                          <h3 className="text-2xl font-bold text-black mb-2">
                            {report.quarter} {report.year} Executive Report
                          </h3>
                          <div className="flex items-center gap-2 text-gray-600">
                            <Calendar className="h-4 w-4" />
                            <span className="text-base">
                              Generated: {new Date(report.generation_date).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              })}
                            </span>
                          </div>
                        </div>
                      </div>
                      <span className={`px-4 py-2 text-sm font-semibold rounded-full border-2 ${getStatusBadgeColor(report.status)}`}>
                        {report.status.charAt(0).toUpperCase() + report.status.slice(1)}
                      </span>
                    </div>
                  </div>

                  {/* Card Content */}
                  <div className="p-8 bg-gray-50">
                    {/* Performance Summary (if report_data available) */}
                    {report.report_data?.performance_summary && (
                      <div className="bg-white rounded-2xl p-6 mb-6 border-2 border-gray-200">
                        <h4 className="text-lg font-bold text-black mb-6 flex items-center gap-2">
                          <div className="w-2 h-2 bg-purple-600 rounded-full"></div>
                          Performance Summary
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <div className="text-center">
                            <p className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">Overall Satisfaction</p>
                            <p className="text-4xl font-bold text-black">
                              {report.report_data.performance_summary.overall_satisfaction}<span className="text-2xl text-gray-400">/100</span>
                            </p>
                          </div>
                          <div className="text-center">
                            <p className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">NPS Score</p>
                            <p className="text-4xl font-bold text-black">
                              {report.report_data.performance_summary.nps_score}
                            </p>
                          </div>
                          <div className="text-center">
                            <p className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">Total Feedback</p>
                            <p className="text-4xl font-bold text-black">
                              {report.report_data.performance_summary.total_feedback}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Delivery Status */}
                    <div className="flex flex-wrap gap-6 text-base text-gray-700 mb-6">
                      {report.delivered_at && (
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-gray-600" />
                          <span>Delivered: {new Date(report.delivered_at).toLocaleDateString()}</span>
                        </div>
                      )}
                      {report.viewed_at && (
                        <div className="flex items-center gap-2">
                          <Eye className="h-4 w-4 text-gray-600" />
                          <span>Viewed: {new Date(report.viewed_at).toLocaleDateString()}</span>
                        </div>
                      )}
                      {!report.delivered_at && report.status === 'generated' && (
                        <div className="flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-gray-600" />
                          <span className="font-semibold">Ready to send</span>
                        </div>
                      )}
                    </div>

                    {/* View Report Button - Black */}
                    <Button
                      className="w-full bg-black hover:bg-gray-900 text-white font-semibold py-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 text-lg"
                      onClick={(e) => {
                        e.stopPropagation();
                        viewReport(report);
                      }}
                    >
                      <Eye className="h-5 w-5 mr-2" />
                      View Full Report
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
