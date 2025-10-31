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

        {/* PowerConfidence Score Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Card className="bg-gradient-to-r from-red-600 to-red-700 text-white">
            <CardContent className="p-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div>
                  <p className="text-red-100 text-sm mb-2">Your PowerConfidence Score</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-5xl font-bold">
                      {partnerProfile.final_pcr_score ? Number(partnerProfile.final_pcr_score).toFixed(1) : Number(partnerProfile.power_confidence_score || 0).toFixed(1)}
                    </span>
                    <span className="text-2xl">/105</span>
                    {getTrendIcon(partnerProfile.performance_trend || 'stable')}
                  </div>
                  <p className="text-red-100 mt-2">
                    {partnerProfile.momentum_modifier > 0 && `+${partnerProfile.momentum_modifier}`}
                    {partnerProfile.momentum_modifier < 0 && partnerProfile.momentum_modifier}
                    {partnerProfile.momentum_modifier === 0 && '0'} momentum points
                  </p>
                </div>

                <div>
                  <p className="text-red-100 text-sm mb-2">Performance Status</p>
                  <div className="flex items-baseline gap-2">
                    <Badge className="bg-white text-red-600 text-lg px-4 py-2">
                      {partnerProfile.momentum_modifier === 5 && '🔥 Hot Streak!'}
                      {partnerProfile.momentum_modifier === 0 && '📊 Stable'}
                      {partnerProfile.momentum_modifier === -3 && '📉 Improving'}
                      {partnerProfile.momentum_modifier === undefined && 'New Partner'}
                    </Badge>
                  </div>
                  <p className="text-red-100 mt-2">
                    Based on {partnerProfile.quarters_tracked || 0} quarters of data
                  </p>
                </div>

                <div>
                  <p className="text-red-100 text-sm mb-2">Latest Quarterly Score</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold">
                      {partnerProfile.quarterly_feedback_score ? Number(partnerProfile.quarterly_feedback_score).toFixed(1) : '--'}
                    </span>
                    <span className="text-lg">/100</span>
                  </div>
                  <p className="text-red-100 mt-2">Customer feedback rating</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Tabs */}
        <div className="border-b mb-6">
          <div className="flex gap-6">
            {['overview', 'performance', 'feedback', 'insights'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
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
          <div className="space-y-8">
            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Final PCR Score</CardTitle>
                    <Star className="h-4 w-4 text-yellow-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {partnerProfile.final_pcr_score ? Number(partnerProfile.final_pcr_score).toFixed(1) : Number(partnerProfile.power_confidence_score || 0).toFixed(1)}
                    </div>
                    <p className="text-xs text-slate-600">Out of 105 (with momentum)</p>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Leads Received</CardTitle>
                    <Users className="h-4 w-4 text-blue-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{partnerProfile.analytics?.leads_received || 0}</div>
                    <p className="text-xs text-slate-600">This month</p>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Demo Requests</CardTitle>
                    <Calendar className="h-4 w-4 text-green-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{partnerProfile.analytics?.demos_requested || 0}</div>
                    <p className="text-xs text-slate-600">Pending scheduling</p>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
                    <TrendingUp className="h-4 w-4 text-purple-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {partnerProfile.analytics?.conversion_rate ? `${partnerProfile.analytics.conversion_rate}%` : '--'}
                    </div>
                    <p className="text-xs text-slate-600">Demo to closed</p>
                  </CardContent>
                </Card>
              </motion.div>
            </div>

            {/* Phase 3: Badge Showcase */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Star className="h-5 w-5 mr-2 text-yellow-500" />
                  Your Achievements
                </CardTitle>
                <CardDescription>Trust badges earned through performance and partnership tier</CardDescription>
              </CardHeader>
              <CardContent>
                {partnerProfile.earned_badges && Array.isArray(partnerProfile.earned_badges) && partnerProfile.earned_badges.length > 0 ? (
                  <div className="flex flex-wrap gap-3">
                    {partnerProfile.earned_badges.map((badge: any, index: number) => (
                      <Badge
                        key={index}
                        variant="outline"
                        className="px-4 py-2 text-sm font-medium flex items-center gap-2 border-2"
                        style={{
                          borderColor: badge.category === 'tier' ? '#10b981' : badge.category === 'performance' ? '#f59e0b' : '#6366f1',
                          color: badge.category === 'tier' ? '#10b981' : badge.category === 'performance' ? '#f59e0b' : '#6366f1'
                        }}
                      >
                        <span className="text-lg">{badge.icon}</span>
                        <span>{badge.name}</span>
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <p className="text-slate-600 mb-2">
                      No badges earned yet. Complete your profile and maintain high performance to earn trust badges!
                    </p>
                    <p className="text-sm text-slate-500">
                      Badges are awarded based on profile completion, subscription tier, and quarterly performance.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Phase 3: Momentum & Performance */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TrendingUp className="h-5 w-5 mr-2 text-green-500" />
                  Performance Momentum
                </CardTitle>
                <CardDescription>Your quarterly performance trend and PCR momentum</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center p-4 border border-slate-200 rounded-lg">
                    <div className={`text-3xl font-bold mb-1 ${
                      partnerProfile.momentum_modifier === 5 ? 'text-green-600' :
                      partnerProfile.momentum_modifier === -3 ? 'text-red-600' :
                      'text-slate-600'
                    }`}>
                      {partnerProfile.momentum_modifier > 0 && '+'}
                      {partnerProfile.momentum_modifier ?? 0}
                    </div>
                    <p className="text-sm text-slate-600 font-medium">Momentum Modifier</p>
                    <p className="text-xs text-slate-500 mt-1">
                      {partnerProfile.momentum_modifier === 5 && '🔥 Hot Streak!'}
                      {partnerProfile.momentum_modifier === 0 && '📊 Stable Performance'}
                      {partnerProfile.momentum_modifier === -3 && '📉 Needs Improvement'}
                      {partnerProfile.momentum_modifier === undefined && '⏳ Awaiting Data'}
                    </p>
                  </div>

                  <div className="text-center p-4 border border-slate-200 rounded-lg">
                    <div className="text-3xl font-bold mb-1 capitalize text-slate-800">
                      {partnerProfile.performance_trend || 'New'}
                    </div>
                    <p className="text-sm text-slate-600 font-medium">Performance Trend</p>
                    <p className="text-xs text-slate-500 mt-1">
                      Based on {partnerProfile.quarters_tracked || 0} quarters
                    </p>
                  </div>

                  <div className="text-center p-4 border border-slate-200 rounded-lg">
                    <div className="text-3xl font-bold mb-1 text-slate-800">
                      {partnerProfile.quarterly_feedback_score ? Number(partnerProfile.quarterly_feedback_score).toFixed(1) : '--'}
                    </div>
                    <p className="text-sm text-slate-600 font-medium">Latest Quarterly Score</p>
                    <p className="text-xs text-slate-500 mt-1">Customer feedback (0-100)</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'performance' && (
          <div className="space-y-6">
            {/* Phase 3: Quarterly Performance Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Quarterly Performance History</CardTitle>
                <CardDescription>Your customer feedback scores over recent quarters</CardDescription>
              </CardHeader>
              <CardContent>
                {partnerProfile.quarterly_history && Array.isArray(partnerProfile.quarterly_history) && partnerProfile.quarterly_history.length > 0 ? (
                  <div className="space-y-4">
                    {partnerProfile.quarterly_history
                      .slice(0, 4)
                      .sort((a: any, b: any) => {
                        if (a.year !== b.year) return a.year - b.year;
                        const qOrder: any = { 'Q1': 1, 'Q2': 2, 'Q3': 3, 'Q4': 4 };
                        return qOrder[a.quarter] - qOrder[b.quarter];
                      })
                      .map((quarter: any, index: number) => (
                        <div key={index} className="flex items-center gap-4">
                          <div className="w-24 text-sm font-medium text-slate-700">
                            {quarter.quarter} {quarter.year}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 bg-slate-200 rounded-full h-3 overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all ${
                                    quarter.score >= 85 ? 'bg-green-500' :
                                    quarter.score >= 70 ? 'bg-yellow-500' : 'bg-red-500'
                                  }`}
                                  style={{ width: `${Math.min(quarter.score, 100)}%` }}
                                />
                              </div>
                              <span className="text-sm font-semibold w-16 text-right text-slate-700">
                                {Number(quarter.score).toFixed(1)}
                              </span>
                            </div>
                            <div className="text-xs text-slate-500 mt-1">
                              {quarter.response_count} responses
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-600">
                    <Calendar className="h-12 w-12 mx-auto mb-3 text-slate-400" />
                    <p className="font-medium mb-1">No quarterly data yet</p>
                    <p className="text-sm text-slate-500">
                      Complete your first PowerCard survey to see your performance history!
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Performance Insights */}
            <Card>
              <CardHeader>
                <CardTitle>Performance Breakdown</CardTitle>
                <CardDescription>Key metrics driving your PowerConfidence score</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-medium">Customer Satisfaction</span>
                      <span className="text-sm text-gray-600">92/100</span>
                    </div>
                    <Progress value={92} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-medium">Response Time</span>
                      <span className="text-sm text-gray-600">88/100</span>
                    </div>
                    <Progress value={88} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-medium">Project Delivery</span>
                      <span className="text-sm text-gray-600">95/100</span>
                    </div>
                    <Progress value={95} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-medium">Communication</span>
                      <span className="text-sm text-gray-600">94/100</span>
                    </div>
                    <Progress value={94} className="h-2" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'feedback' && (
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Recent Feedback Highlights</CardTitle>
                <CardDescription>Anonymized contractor feedback from the last quarter</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 bg-green-50 border border-green-200 rounded">
                    <div className="flex items-start gap-2">
                      <Award className="w-5 h-5 text-green-600 mt-0.5" />
                      <div>
                        <p className="font-medium text-green-900">Strengths</p>
                        <ul className="mt-2 space-y-1 text-sm text-green-800">
                          <li>• "Excellent communication throughout the project"</li>
                          <li>• "Deep technical expertise and problem-solving skills"</li>
                          <li>• "Always delivers on time and within budget"</li>
                          <li>• "Great ROI tracking and reporting"</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded">
                    <div className="flex items-start gap-2">
                      <Target className="w-5 h-5 text-yellow-600 mt-0.5" />
                      <div>
                        <p className="font-medium text-yellow-900">Areas for Improvement</p>
                        <ul className="mt-2 space-y-1 text-sm text-yellow-800">
                          <li>• "Initial setup process could be more streamlined"</li>
                          <li>• "Would appreciate more frequent progress updates"</li>
                          <li>• "Documentation could be more comprehensive"</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                    <div className="text-center p-4 bg-gray-50 rounded">
                      <p className="text-2xl font-bold text-gray-900">89%</p>
                      <p className="text-sm text-gray-600">Positive Sentiment</p>
                    </div>
                    <div className="text-center p-4 bg-gray-50 rounded">
                      <p className="text-2xl font-bold text-gray-900">4.6/5</p>
                      <p className="text-sm text-gray-600">Average Rating</p>
                    </div>
                    <div className="text-center p-4 bg-gray-50 rounded">
                      <p className="text-2xl font-bold text-gray-900">+67</p>
                      <p className="text-sm text-gray-600">NPS Score</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'insights' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Personalized Recommendations</CardTitle>
                <CardDescription>Actions to improve your PowerConfidence score</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-start gap-3 p-4 bg-blue-50 rounded">
                    <div className="bg-blue-600 text-white rounded-full p-1">
                      <BarChart3 className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-medium">Improve Response Time</p>
                      <p className="text-sm text-gray-600 mt-1">
                        Your average response time is 4.2 hours. Aim for under 4 hours to move into the top quartile.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-4 bg-green-50 rounded">
                    <div className="bg-green-600 text-white rounded-full p-1">
                      <Users className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-medium">Maintain Communication Excellence</p>
                      <p className="text-sm text-gray-600 mt-1">
                        Your communication scores are your strongest area. Continue this strength to maintain your competitive advantage.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-4 bg-yellow-50 rounded">
                    <div className="bg-yellow-600 text-white rounded-full p-1">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-medium">Schedule Quarterly Reviews</p>
                      <p className="text-sm text-gray-600 mt-1">
                        Consider implementing quarterly business reviews with your top contractors to maintain high satisfaction.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Next Steps</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <label className="flex items-center gap-3">
                    <input type="checkbox" className="rounded" />
                    <span>Review and respond to recent feedback</span>
                  </label>
                  <label className="flex items-center gap-3">
                    <input type="checkbox" className="rounded" />
                    <span>Update your partner profile with recent achievements</span>
                  </label>
                  <label className="flex items-center gap-3">
                    <input type="checkbox" className="rounded" />
                    <span>Schedule check-ins with contractors showing lower satisfaction</span>
                  </label>
                  <label className="flex items-center gap-3">
                    <input type="checkbox" className="rounded" />
                    <span>Share your PowerConfidence achievements with your team</span>
                  </label>
                </div>
              </CardContent>
            </Card>
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
