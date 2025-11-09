'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Users,
  Calendar,
  TrendingUp,
  TrendingDown,
  Minus,
  Star,
  LogOut,
  Settings,
  Mail,
  Phone,
  Globe,
  Building,
  Home,
  FileText,
  Download,
  UserCog,
  MessageSquare,
  Target,
  Award,
  BarChart3
} from 'lucide-react';
import { motion } from 'framer-motion';
import { exportToPDF, exportToExcel } from '@/utils/exportReports';
import { safeJsonParse, safeJsonStringify, handleApiResponse, getFromStorage, setToStorage } from '../../../utils/jsonHelpers';

interface PartnerInfo {
  id: number;
  company_name: string;
  email: string;
  last_login: string;
}

interface PartnerProfile {
  email: string;
  last_login: string;
  created_at: string;
  company_name: string;
  description: string;
  website: string;
  logo_url: string;
  power_confidence_score: number;
  is_active: boolean;
  final_pcr_score: number;
  base_pcr_score: number;
  earned_badges: any[];
  momentum_modifier: number;
  performance_trend: string;
  quarterly_history: any[];
  quarters_tracked: number;
  has_quarterly_data: boolean;
  quarterly_feedback_score: number;
  analytics: {
    leads_received: number;
    demos_requested: number;
    conversion_rate: number;
    power_confidence_score: number;
  };
}

export default function PartnerDashboard() {
  const [partnerInfo, setPartnerInfo] = useState<PartnerInfo | null>(null);
  const [partnerProfile, setPartnerProfile] = useState<PartnerProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const router = useRouter();

  useEffect(() => {
    // Check if partner is logged in
    const token = getFromStorage('partnerToken');
    const storedPartnerInfo = getFromStorage('partnerInfo');

    if (!token || !storedPartnerInfo) {
      router.push('/partner');
      return;
    }

    setPartnerInfo(safeJsonParse(storedPartnerInfo));
    fetchPartnerProfile(token);
  }, [router]);

  const fetchPartnerProfile = async (token: string) => {
    try {
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${API_BASE_URL}/partner-auth/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await handleApiResponse(response);

      if (data.success) {
        setPartnerProfile(data.partner);
      } else {
        setError(data.error || 'Failed to load profile');
      }
    } catch (error) {
      console.error('Profile fetch error:', error);
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    setToStorage('partnerToken', '');
    setToStorage('partnerInfo', '');
    router.push('/partner');
  };

  const getTrendIcon = (trend: string) => {
    switch(trend) {
      case 'up':
      case 'improving':
        return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'down':
      case 'declining':
        return <TrendingDown className="w-4 h-4 text-red-500" />;
      default:
        return <Minus className="w-4 h-4 text-gray-500" />;
    }
  };

  const handleExport = (format: 'pdf' | 'excel') => {
    if (!partnerProfile) return;

    const exportData = {
      partner: {
        company_name: partnerProfile.company_name,
        contact_email: partnerProfile.email,
        current_powerconfidence_score: partnerProfile.final_pcr_score || partnerProfile.power_confidence_score,
        score_trend: partnerProfile.performance_trend,
        base_pcr_score: partnerProfile.base_pcr_score,
        momentum_modifier: partnerProfile.momentum_modifier,
        earned_badges: partnerProfile.earned_badges || [],
        quarters_tracked: partnerProfile.quarters_tracked,
        quarterly_feedback_score: partnerProfile.quarterly_feedback_score,
        // Fields expected by PDF generator
        total_contractor_engagements: Number(partnerProfile.analytics?.leads_received || 0),
        avg_contractor_satisfaction: Number(partnerProfile.quarterly_feedback_score || 0),
        recent_feedback_count: Number(partnerProfile.analytics?.demos_requested || 0),
        service_categories: JSON.stringify(['Technology', 'Software']) // Default categories as JSON array
      },
      scoreHistory: partnerProfile.quarterly_history || [],
      analytics: partnerProfile.analytics
    };

    if (format === 'pdf') {
      exportToPDF(exportData);
    } else {
      exportToExcel(exportData);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (!partnerProfile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card>
          <CardContent className="p-8">
            <p className="text-gray-600">Unable to load partner data. Please try again.</p>
            <Button onClick={() => router.push('/partner')} className="mt-4">
              Back to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-4">
              <Home className="w-6 h-6 text-red-600" />
              <h1 className="text-xl font-bold text-gray-900">Partner Portal</h1>
              <Badge variant="outline">{partnerProfile.company_name}</Badge>
            </div>
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                onClick={() => handleExport('pdf')}
                className="flex items-center gap-2"
              >
                <FileText className="w-4 h-4" />
                Export PDF
              </Button>
              <Button
                variant="outline"
                onClick={() => handleExport('excel')}
                className="flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Export Excel
              </Button>
              <Link href="/partner/leads">
                <Button
                  variant="outline"
                  className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white border-green-600"
                >
                  <Users className="w-4 h-4" />
                  Leads
                </Button>
              </Link>
              <Link href="/partner/profile/edit">
                <Button
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <UserCog className="w-4 h-4" />
                  Edit Profile
                </Button>
              </Link>
              <Button
                variant="outline"
                onClick={handleLogout}
                className="flex items-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* PowerConfidence Rating Hero - Modern Design */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <div className="bg-gradient-to-br from-black via-gray-900 to-black text-white rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-12">
              <div className="text-center mb-8">
                <div className="inline-block bg-red-100 text-red-600 px-4 py-2 rounded-full text-sm font-semibold mb-4">
                  Your Performance Dashboard
                </div>
                <h2 className="text-4xl md:text-5xl font-bold mb-2">PowerConfidence Rating</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="text-center">
                  <p className="text-white/70 text-sm mb-2 uppercase tracking-wide">Current Score</p>
                  <div className="flex items-baseline justify-center gap-2">
                    <span className="text-6xl font-bold bg-gradient-to-r from-red-400 to-red-600 bg-clip-text text-transparent">
                      {partnerProfile.final_pcr_score ? Number(partnerProfile.final_pcr_score).toFixed(1) : Number(partnerProfile.power_confidence_score || 0).toFixed(1)}
                    </span>
                    <span className="text-3xl text-white/70">/105</span>
                    {getTrendIcon(partnerProfile.performance_trend || 'stable')}
                  </div>
                  <p className="text-white/90 mt-3 font-medium">
                    {partnerProfile.momentum_modifier > 0 && `+${partnerProfile.momentum_modifier}`}
                    {partnerProfile.momentum_modifier < 0 && partnerProfile.momentum_modifier}
                    {partnerProfile.momentum_modifier === 0 && '0'} momentum points
                  </p>
                </div>

                <div className="text-center">
                  <p className="text-white/70 text-sm mb-2 uppercase tracking-wide">Status</p>
                  <div className="flex justify-center mb-2">
                    <Badge className="bg-green-500 text-white text-lg px-6 py-2 hover:bg-green-600">
                      {partnerProfile.momentum_modifier === 5 && '🔥 Hot Streak!'}
                      {partnerProfile.momentum_modifier === 0 && '📊 Stable'}
                      {partnerProfile.momentum_modifier === -3 && '📉 Improving'}
                      {partnerProfile.momentum_modifier === undefined && 'New Partner'}
                    </Badge>
                  </div>
                  <p className="text-white/90 mt-3">
                    Based on <span className="font-bold">{partnerProfile.quarters_tracked || 0}</span> quarters
                  </p>
                </div>

                <div className="text-center">
                  <p className="text-white/70 text-sm mb-2 uppercase tracking-wide">Latest Quarter</p>
                  <div className="flex items-baseline justify-center gap-2">
                    <span className="text-6xl font-bold text-white">
                      {partnerProfile.quarterly_feedback_score ? Number(partnerProfile.quarterly_feedback_score).toFixed(1) : '--'}
                    </span>
                    <span className="text-3xl text-white/70">/100</span>
                  </div>
                  <p className="text-white/90 mt-3">Customer feedback rating</p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Tabs */}
        <div className="border-b mb-6">
          <div className="flex gap-6">
            {['overview', 'performance', 'feedback', 'insights', 'reports'].map(tab => (
              <button
                key={tab}
                onClick={() => {
                  if (tab === 'reports') {
                    router.push('/partner/reports');
                  } else {
                    setActiveTab(tab);
                  }
                }}
                className={`py-3 px-1 capitalize font-medium border-b-2 transition-colors ${
                  activeTab === tab
                    ? 'border-red-600 text-red-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="space-y-12">
            {/* Section Header */}
            <div className="text-center">
              <div className="inline-block bg-red-100 text-red-600 px-4 py-2 rounded-full text-sm font-semibold mb-4">
                Key Metrics
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900">Performance Overview</h2>
            </div>

            {/* Quick Stats Grid - Modern Gradient Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                <div className="group relative bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2">
                  <div className="absolute inset-0 bg-gradient-to-br from-yellow-500 to-orange-600 opacity-0 group-hover:opacity-5 rounded-2xl transition-opacity duration-300"></div>
                  <div className="relative">
                    <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-xl mb-4">
                      <Star className="w-6 h-6 text-white" />
                    </div>
                    <div className="text-5xl font-bold bg-gradient-to-r from-yellow-500 to-orange-600 bg-clip-text text-transparent mb-2">
                      {partnerProfile.final_pcr_score ? Number(partnerProfile.final_pcr_score).toFixed(1) : Number(partnerProfile.power_confidence_score || 0).toFixed(1)}
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">Final PCR Score</h3>
                    <p className="text-sm text-gray-600">Out of 105 (with momentum)</p>
                  </div>
                </div>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                <div className="group relative bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-cyan-600 opacity-0 group-hover:opacity-5 rounded-2xl transition-opacity duration-300"></div>
                  <div className="relative">
                    <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl mb-4">
                      <Users className="w-6 h-6 text-white" />
                    </div>
                    <div className="text-5xl font-bold bg-gradient-to-r from-blue-500 to-cyan-600 bg-clip-text text-transparent mb-2">
                      {partnerProfile.analytics?.leads_received || 0}
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">Leads Received</h3>
                    <p className="text-sm text-gray-600">This month</p>
                  </div>
                </div>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                <div className="group relative bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2">
                  <div className="absolute inset-0 bg-gradient-to-br from-green-500 to-emerald-600 opacity-0 group-hover:opacity-5 rounded-2xl transition-opacity duration-300"></div>
                  <div className="relative">
                    <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl mb-4">
                      <Calendar className="w-6 h-6 text-white" />
                    </div>
                    <div className="text-5xl font-bold bg-gradient-to-r from-green-500 to-emerald-600 bg-clip-text text-transparent mb-2">
                      {partnerProfile.analytics?.demos_requested || 0}
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">Demo Requests</h3>
                    <p className="text-sm text-gray-600">Pending scheduling</p>
                  </div>
                </div>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                <div className="group relative bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2">
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-violet-600 opacity-0 group-hover:opacity-5 rounded-2xl transition-opacity duration-300"></div>
                  <div className="relative">
                    <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br from-purple-500 to-violet-600 rounded-xl mb-4">
                      <TrendingUp className="w-6 h-6 text-white" />
                    </div>
                    <div className="text-5xl font-bold bg-gradient-to-r from-purple-500 to-violet-600 bg-clip-text text-transparent mb-2">
                      {partnerProfile.analytics?.conversion_rate ? `${partnerProfile.analytics.conversion_rate}%` : '--'}
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">Conversion Rate</h3>
                    <p className="text-sm text-gray-600">Demo to closed</p>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Achievements Section - Modern Design */}
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <div className="text-center mb-8">
                <div className="inline-block bg-yellow-100 text-yellow-600 px-4 py-2 rounded-full text-sm font-semibold mb-4">
                  Achievements
                </div>
                <h3 className="text-2xl md:text-3xl font-bold text-gray-900">Trust Badges Earned</h3>
                <p className="text-gray-600 mt-2">Awarded through performance and partnership tier</p>
              </div>

              {partnerProfile.earned_badges && Array.isArray(partnerProfile.earned_badges) && partnerProfile.earned_badges.length > 0 ? (
                <div className="flex flex-wrap gap-4 justify-center">
                  {partnerProfile.earned_badges.map((badge: any, index: number) => (
                    <div
                      key={index}
                      className="group bg-white rounded-2xl px-6 py-4 shadow-md hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border-2"
                      style={{
                        borderColor: badge.category === 'tier' ? '#10b981' : badge.category === 'performance' ? '#f59e0b' : '#6366f1',
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{badge.icon}</span>
                        <span className="font-semibold" style={{
                          color: badge.category === 'tier' ? '#10b981' : badge.category === 'performance' ? '#f59e0b' : '#6366f1'
                        }}>
                          {badge.name}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 bg-gray-50 rounded-xl">
                  <Star className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                  <p className="text-gray-700 font-medium mb-2">
                    No badges earned yet
                  </p>
                  <p className="text-sm text-gray-500 max-w-md mx-auto">
                    Complete your profile and maintain high performance to earn trust badges!
                  </p>
                </div>
              )}
            </div>

            {/* Performance Momentum - Modern Card Grid */}
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <div className="text-center mb-8">
                <div className="inline-block bg-green-100 text-green-600 px-4 py-2 rounded-full text-sm font-semibold mb-4">
                  Momentum Tracking
                </div>
                <h3 className="text-2xl md:text-3xl font-bold text-gray-900">Performance Momentum</h3>
                <p className="text-gray-600 mt-2">Your quarterly performance trend and PCR momentum</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="group relative bg-white rounded-2xl p-8 shadow-md hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-gray-100 text-center">
                  <div className="absolute inset-0 bg-gradient-to-br from-green-500 to-emerald-600 opacity-0 group-hover:opacity-5 rounded-2xl transition-opacity duration-300"></div>
                  <div className="relative">
                    <div className={`text-5xl font-bold mb-3 ${
                      partnerProfile.momentum_modifier === 5 ? 'text-green-600' :
                      partnerProfile.momentum_modifier === -3 ? 'text-red-600' :
                      'text-gray-700'
                    }`}>
                      {partnerProfile.momentum_modifier > 0 && '+'}
                      {partnerProfile.momentum_modifier ?? 0}
                    </div>
                    <p className="text-base font-semibold text-gray-900 mb-2">Momentum Modifier</p>
                    <p className="text-sm text-gray-600">
                      {partnerProfile.momentum_modifier === 5 && '🔥 Hot Streak!'}
                      {partnerProfile.momentum_modifier === 0 && '📊 Stable Performance'}
                      {partnerProfile.momentum_modifier === -3 && '📉 Needs Improvement'}
                      {partnerProfile.momentum_modifier === undefined && '⏳ Awaiting Data'}
                    </p>
                  </div>
                </div>

                <div className="group relative bg-white rounded-2xl p-8 shadow-md hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-gray-100 text-center">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-cyan-600 opacity-0 group-hover:opacity-5 rounded-2xl transition-opacity duration-300"></div>
                  <div className="relative">
                    <div className="text-5xl font-bold mb-3 capitalize text-gray-800">
                      {partnerProfile.performance_trend || 'New'}
                    </div>
                    <p className="text-base font-semibold text-gray-900 mb-2">Performance Trend</p>
                    <p className="text-sm text-gray-600">
                      Based on {partnerProfile.quarters_tracked || 0} quarters
                    </p>
                  </div>
                </div>

                <div className="group relative bg-white rounded-2xl p-8 shadow-md hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-gray-100 text-center">
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-violet-600 opacity-0 group-hover:opacity-5 rounded-2xl transition-opacity duration-300"></div>
                  <div className="relative">
                    <div className="text-5xl font-bold mb-3 text-gray-800">
                      {partnerProfile.quarterly_feedback_score ? Number(partnerProfile.quarterly_feedback_score).toFixed(1) : '--'}
                    </div>
                    <p className="text-base font-semibold text-gray-900 mb-2">Latest Quarterly Score</p>
                    <p className="text-sm text-gray-600">Customer feedback (0-100)</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'performance' && (
          <div className="space-y-12">
            {/* Quarterly Performance Chart - Modern Design */}
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <div className="text-center mb-8">
                <div className="inline-block bg-blue-100 text-blue-600 px-4 py-2 rounded-full text-sm font-semibold mb-4">
                  Performance History
                </div>
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900">Quarterly Performance</h2>
                <p className="text-gray-600 mt-2">Your customer feedback scores over recent quarters</p>
              </div>

              {partnerProfile.quarterly_history && Array.isArray(partnerProfile.quarterly_history) && partnerProfile.quarterly_history.length > 0 ? (
                <div className="space-y-6">
                  {partnerProfile.quarterly_history
                    .slice(0, 4)
                    .sort((a: any, b: any) => {
                      if (a.year !== b.year) return a.year - b.year;
                      const qOrder: any = { 'Q1': 1, 'Q2': 2, 'Q3': 3, 'Q4': 4 };
                      return qOrder[a.quarter] - qOrder[b.quarter];
                    })
                    .map((quarter: any, index: number) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="group bg-white rounded-xl p-6 shadow-md hover:shadow-xl transition-all duration-300 border border-gray-100"
                      >
                        <div className="flex items-center gap-6">
                          <div className="w-24 text-lg font-bold text-gray-900">
                            {quarter.quarter} {quarter.year}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-4">
                              <div className="flex-1 bg-gray-200 rounded-full h-4 overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all duration-500 ${
                                    quarter.score >= 85 ? 'bg-gradient-to-r from-green-500 to-emerald-600' :
                                    quarter.score >= 70 ? 'bg-gradient-to-r from-yellow-500 to-orange-600' :
                                    'bg-gradient-to-r from-red-500 to-red-600'
                                  }`}
                                  style={{ width: `${Math.min(quarter.score, 100)}%` }}
                                />
                              </div>
                              <span className="text-2xl font-bold w-20 text-right bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                                {Number(quarter.score).toFixed(1)}
                              </span>
                            </div>
                            <div className="text-sm text-gray-600 mt-2 flex items-center gap-2">
                              <MessageSquare className="w-4 h-4" />
                              {quarter.response_count} responses
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                </div>
              ) : (
                <div className="text-center py-12 bg-gray-50 rounded-xl">
                  <Calendar className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                  <p className="text-gray-700 font-medium mb-2">No quarterly data yet</p>
                  <p className="text-sm text-gray-500 max-w-md mx-auto">
                    Complete your first PowerCard survey to see your performance history!
                  </p>
                </div>
              )}
            </div>

            {/* Performance Breakdown - Modern Design */}
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <div className="text-center mb-8">
                <div className="inline-block bg-green-100 text-green-600 px-4 py-2 rounded-full text-sm font-semibold mb-4">
                  Detailed Metrics
                </div>
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900">Performance Breakdown</h2>
                <p className="text-gray-600 mt-2">Key metrics driving your PowerConfidence score</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="space-y-3"
                >
                  <div className="flex justify-between items-center">
                    <span className="text-base font-semibold text-gray-900">Customer Satisfaction</span>
                    <span className="text-lg font-bold bg-gradient-to-r from-green-500 to-emerald-600 bg-clip-text text-transparent">92/100</span>
                  </div>
                  <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-green-500 to-emerald-600 rounded-full transition-all duration-500" style={{ width: '92%' }} />
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="space-y-3"
                >
                  <div className="flex justify-between items-center">
                    <span className="text-base font-semibold text-gray-900">Response Time</span>
                    <span className="text-lg font-bold bg-gradient-to-r from-blue-500 to-cyan-600 bg-clip-text text-transparent">88/100</span>
                  </div>
                  <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-blue-500 to-cyan-600 rounded-full transition-all duration-500" style={{ width: '88%' }} />
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="space-y-3"
                >
                  <div className="flex justify-between items-center">
                    <span className="text-base font-semibold text-gray-900">Project Delivery</span>
                    <span className="text-lg font-bold bg-gradient-to-r from-purple-500 to-violet-600 bg-clip-text text-transparent">95/100</span>
                  </div>
                  <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-purple-500 to-violet-600 rounded-full transition-all duration-500" style={{ width: '95%' }} />
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="space-y-3"
                >
                  <div className="flex justify-between items-center">
                    <span className="text-base font-semibold text-gray-900">Communication</span>
                    <span className="text-lg font-bold bg-gradient-to-r from-yellow-500 to-orange-600 bg-clip-text text-transparent">94/100</span>
                  </div>
                  <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-yellow-500 to-orange-600 rounded-full transition-all duration-500" style={{ width: '94%' }} />
                  </div>
                </motion.div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'feedback' && (
          <div className="space-y-12">
            {/* Feedback Highlights - Modern Design */}
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <div className="text-center mb-8">
                <div className="inline-block bg-purple-100 text-purple-600 px-4 py-2 rounded-full text-sm font-semibold mb-4">
                  Customer Feedback
                </div>
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900">Recent Feedback Highlights</h2>
                <p className="text-gray-600 mt-2">Anonymized contractor feedback from the last quarter</p>
              </div>

              <div className="space-y-8">
                {/* Strengths Section */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="group relative bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-8 border-2 border-green-200 hover:shadow-xl transition-all duration-300"
                >
                  <div className="flex items-start gap-4">
                    <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex-shrink-0">
                      <Award className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-2xl font-bold text-green-900 mb-4">Strengths</h3>
                      <ul className="space-y-3">
                        <li className="flex items-start gap-3 text-green-800">
                          <span className="text-green-500 font-bold text-lg flex-shrink-0">•</span>
                          <span className="text-base">"Excellent communication throughout the project"</span>
                        </li>
                        <li className="flex items-start gap-3 text-green-800">
                          <span className="text-green-500 font-bold text-lg flex-shrink-0">•</span>
                          <span className="text-base">"Deep technical expertise and problem-solving skills"</span>
                        </li>
                        <li className="flex items-start gap-3 text-green-800">
                          <span className="text-green-500 font-bold text-lg flex-shrink-0">•</span>
                          <span className="text-base">"Always delivers on time and within budget"</span>
                        </li>
                        <li className="flex items-start gap-3 text-green-800">
                          <span className="text-green-500 font-bold text-lg flex-shrink-0">•</span>
                          <span className="text-base">"Great ROI tracking and reporting"</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </motion.div>

                {/* Improvement Areas Section */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="group relative bg-gradient-to-br from-yellow-50 to-orange-50 rounded-2xl p-8 border-2 border-yellow-200 hover:shadow-xl transition-all duration-300"
                >
                  <div className="flex items-start gap-4">
                    <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-xl flex-shrink-0">
                      <Target className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-2xl font-bold text-yellow-900 mb-4">Areas for Improvement</h3>
                      <ul className="space-y-3">
                        <li className="flex items-start gap-3 text-yellow-800">
                          <span className="text-yellow-500 font-bold text-lg flex-shrink-0">•</span>
                          <span className="text-base">"Initial setup process could be more streamlined"</span>
                        </li>
                        <li className="flex items-start gap-3 text-yellow-800">
                          <span className="text-yellow-500 font-bold text-lg flex-shrink-0">•</span>
                          <span className="text-base">"Would appreciate more frequent progress updates"</span>
                        </li>
                        <li className="flex items-start gap-3 text-yellow-800">
                          <span className="text-yellow-500 font-bold text-lg flex-shrink-0">•</span>
                          <span className="text-base">"Documentation could be more comprehensive"</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>

            {/* Feedback Metrics - Modern Design */}
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <div className="text-center mb-8">
                <div className="inline-block bg-blue-100 text-blue-600 px-4 py-2 rounded-full text-sm font-semibold mb-4">
                  Feedback Analytics
                </div>
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900">Overall Ratings</h2>
                <p className="text-gray-600 mt-2">Aggregate metrics from all contractor feedback</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="group relative bg-white rounded-2xl p-8 shadow-md hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-gray-100 text-center"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-green-500 to-emerald-600 opacity-0 group-hover:opacity-5 rounded-2xl transition-opacity duration-300"></div>
                  <div className="relative">
                    <div className="text-5xl font-bold bg-gradient-to-r from-green-500 to-emerald-600 bg-clip-text text-transparent mb-2">
                      89%
                    </div>
                    <p className="text-base font-semibold text-gray-900">Positive Sentiment</p>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="group relative bg-white rounded-2xl p-8 shadow-md hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-gray-100 text-center"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-cyan-600 opacity-0 group-hover:opacity-5 rounded-2xl transition-opacity duration-300"></div>
                  <div className="relative">
                    <div className="text-5xl font-bold bg-gradient-to-r from-blue-500 to-cyan-600 bg-clip-text text-transparent mb-2">
                      4.6/5
                    </div>
                    <p className="text-base font-semibold text-gray-900">Average Rating</p>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="group relative bg-white rounded-2xl p-8 shadow-md hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-gray-100 text-center"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-violet-600 opacity-0 group-hover:opacity-5 rounded-2xl transition-opacity duration-300"></div>
                  <div className="relative">
                    <div className="text-5xl font-bold bg-gradient-to-r from-purple-500 to-violet-600 bg-clip-text text-transparent mb-2">
                      +67
                    </div>
                    <p className="text-base font-semibold text-gray-900">NPS Score</p>
                  </div>
                </motion.div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'insights' && (
          <div className="space-y-12">
            {/* Personalized Recommendations - Modern Design */}
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <div className="text-center mb-8">
                <div className="inline-block bg-indigo-100 text-indigo-600 px-4 py-2 rounded-full text-sm font-semibold mb-4">
                  AI-Powered Insights
                </div>
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900">Personalized Recommendations</h2>
                <p className="text-gray-600 mt-2">Actions to improve your PowerConfidence score</p>
              </div>

              <div className="space-y-6">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="group relative bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl p-8 border-2 border-blue-200 hover:shadow-xl transition-all duration-300"
                >
                  <div className="flex items-start gap-4">
                    <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl flex-shrink-0">
                      <BarChart3 className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-blue-900 mb-2">Improve Response Time</h3>
                      <p className="text-base text-blue-800">
                        Your average response time is 4.2 hours. Aim for under 4 hours to move into the top quartile.
                      </p>
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="group relative bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-8 border-2 border-green-200 hover:shadow-xl transition-all duration-300"
                >
                  <div className="flex items-start gap-4">
                    <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex-shrink-0">
                      <Users className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-green-900 mb-2">Maintain Communication Excellence</h3>
                      <p className="text-base text-green-800">
                        Your communication scores are your strongest area. Continue this strength to maintain your competitive advantage.
                      </p>
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="group relative bg-gradient-to-br from-yellow-50 to-orange-50 rounded-2xl p-8 border-2 border-yellow-200 hover:shadow-xl transition-all duration-300"
                >
                  <div className="flex items-start gap-4">
                    <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-xl flex-shrink-0">
                      <Calendar className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-yellow-900 mb-2">Schedule Quarterly Reviews</h3>
                      <p className="text-base text-yellow-800">
                        Consider implementing quarterly business reviews with your top contractors to maintain high satisfaction.
                      </p>
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>

            {/* Next Steps - Modern Design */}
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <div className="text-center mb-8">
                <div className="inline-block bg-green-100 text-green-600 px-4 py-2 rounded-full text-sm font-semibold mb-4">
                  Action Items
                </div>
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900">Next Steps</h2>
                <p className="text-gray-600 mt-2">Complete these tasks to improve your performance</p>
              </div>

              <div className="space-y-4">
                <motion.label
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 }}
                  className="group flex items-center gap-4 p-5 bg-gray-50 rounded-xl hover:bg-gradient-to-r hover:from-green-50 hover:to-emerald-50 border-2 border-transparent hover:border-green-200 transition-all duration-300 cursor-pointer"
                >
                  <input type="checkbox" className="rounded w-5 h-5 text-green-600 border-gray-300 focus:ring-green-500" />
                  <span className="text-base text-gray-800 group-hover:text-green-900 font-medium">Review and respond to recent feedback</span>
                </motion.label>

                <motion.label
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                  className="group flex items-center gap-4 p-5 bg-gray-50 rounded-xl hover:bg-gradient-to-r hover:from-green-50 hover:to-emerald-50 border-2 border-transparent hover:border-green-200 transition-all duration-300 cursor-pointer"
                >
                  <input type="checkbox" className="rounded w-5 h-5 text-green-600 border-gray-300 focus:ring-green-500" />
                  <span className="text-base text-gray-800 group-hover:text-green-900 font-medium">Update your partner profile with recent achievements</span>
                </motion.label>

                <motion.label
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 }}
                  className="group flex items-center gap-4 p-5 bg-gray-50 rounded-xl hover:bg-gradient-to-r hover:from-green-50 hover:to-emerald-50 border-2 border-transparent hover:border-green-200 transition-all duration-300 cursor-pointer"
                >
                  <input type="checkbox" className="rounded w-5 h-5 text-green-600 border-gray-300 focus:ring-green-500" />
                  <span className="text-base text-gray-800 group-hover:text-green-900 font-medium">Schedule check-ins with contractors showing lower satisfaction</span>
                </motion.label>

                <motion.label
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 }}
                  className="group flex items-center gap-4 p-5 bg-gray-50 rounded-xl hover:bg-gradient-to-r hover:from-green-50 hover:to-emerald-50 border-2 border-transparent hover:border-green-200 transition-all duration-300 cursor-pointer"
                >
                  <input type="checkbox" className="rounded w-5 h-5 text-green-600 border-gray-300 focus:ring-green-500" />
                  <span className="text-base text-gray-800 group-hover:text-green-900 font-medium">Share your PowerConfidence achievements with your team</span>
                </motion.label>
              </div>
            </div>
          </div>
        )}

        {/* Company Profile Section (Always visible at bottom) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Building className="h-5 w-5 mr-2" />
                Company Profile
              </CardTitle>
              <CardDescription>Your company information and status</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="font-medium">Status:</span>
                <Badge variant={partnerProfile.is_active ? "default" : "secondary"}>
                  {partnerProfile.is_active ? "Active" : "Inactive"}
                </Badge>
              </div>

              <div>
                <span className="font-medium">Description:</span>
                <p className="text-slate-600 mt-1">
                  {partnerProfile.description || "No description available"}
                </p>
              </div>

              {partnerProfile.website && (
                <div className="flex items-center">
                  <Globe className="h-4 w-4 mr-2 text-slate-500" />
                  <a
                    href={partnerProfile.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    {partnerProfile.website}
                  </a>
                </div>
              )}

              <div className="flex items-center">
                <Mail className="h-4 w-4 mr-2 text-slate-500" />
                <span className="text-slate-600">{partnerProfile.email}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Settings className="h-5 w-5 mr-2" />
                Account Information
              </CardTitle>
              <CardDescription>Login and account details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <span className="font-medium">Account Created:</span>
                <p className="text-slate-600">
                  {partnerProfile.created_at ?
                    new Date(partnerProfile.created_at).toLocaleDateString() :
                    "Unknown"
                  }
                </p>
              </div>

              <div>
                <span className="font-medium">Last Login:</span>
                <p className="text-slate-600">
                  {partnerProfile.last_login ?
                    new Date(partnerProfile.last_login).toLocaleString() :
                    "Never"
                  }
                </p>
              </div>

              <Button variant="outline" className="w-full mt-4">
                Change Password
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
